/**
 * PayPal Routes
 *
 * This file contains PayPal order creation, capture, and details routes.
 *
 * NOTE: PayPal webhook handling is NOT in this file.
 * All webhook events are processed through server/routes/webhooks.ts
 * at POST /api/webhooks/paypal with centralized payment processing logic.
 */

import { Request, Response, Router } from "express";
import { paypalCreateOrderSchema } from "../../shared/validation/index";
import { isAuthenticated as requireAuth } from "../auth";
import { urls } from "../config/urls";
import { secureLogger } from "../lib/secureLogger";
import PayPalService, { PaymentRequest } from "../services/paypal";
import {
  AuthenticatedRequest,
  PayPalCapturePaymentRequest,
  handleRouteError,
} from "../types/routes";

const router = Router();

// 🔒 SECURITY: Test endpoints only registered in development - never mounted in production
if (process.env.NODE_ENV !== "production") {
  /**
   * GET /api/paypal/test
   * Route de test simple pour diagnostiquer PayPal
   * 🔒 SECURITY: Development only - NOT mounted in production builds
   */
  router.get("/test", async (req: Request, res: Response) => {
    try {
      const testResponse = {
        success: true,
        message: "PayPal endpoint accessible",
        timestamp: new Date().toISOString(),
        test: true,
      };

      res.json(testResponse);
    } catch (error: unknown) {
      handleRouteError(error, res, "PayPal test failed");
    }
  });

  /**
   * GET /api/paypal/test-auth
   * Route de test pour vérifier l'authentification
   * 🔒 SECURITY: Development only - NOT mounted in production builds
   */
  router.get("/test-auth", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      res.json({
        success: true,
        message: "PayPal authentication test successful",
        user: {
          id: req.user?.id || null,
          email: req.user?.email || null,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error: unknown) {
      handleRouteError(error, res, "PayPal auth test failed");
    }
  });
}

/**
 * POST /api/paypal/create-order
 * Crée une commande PayPal pour le paiement d'une réservation
 * ✅ CORRECTION: Renvoie uniquement l'approvalLink PayPal
 * 🔒 SECURITY: Zod schema validation for amount, currency, and required fields
 */
router.post("/create-order", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    // 🔒 SECURITY: Validate input with Zod schema before processing
    const body = req.body as Record<string, unknown>;
    const parseResult = paypalCreateOrderSchema.safeParse({
      ...body,
      // Normalize amount to number and currency to uppercase before validation
      amount: Number(body.amount),
      currency: typeof body.currency === "string" ? body.currency.toUpperCase() : body.currency,
    });

    if (!parseResult.success) {
      const fieldErrors = parseResult.error.flatten().fieldErrors;
      res.status(400).json({
        success: false,
        error: "Validation failed",
        details: fieldErrors,
      });
      return;
    }

    const { serviceType, amount, currency, description, reservationId, customerEmail } =
      parseResult.data;

    // ✅ AUTHENTIFICATION VÉRIFIÉE - Utilisateur connecté
    if (!req.user?.id) {
      res.status(401).json({
        success: false,
        error: "User authentication required",
      });
      return;
    }

    // Création de la commande PayPal avec les données validées
    const paymentRequest: PaymentRequest = {
      serviceType,
      amount,
      currency,
      description,
      reservationId,
      userId: req.user.id,
      customerEmail,
    };

    // SECURITY: Log only non-sensitive data via secureLogger
    secureLogger.info("Creating PayPal order", {
      userId: req.user.id,
      serviceType,
      reservationId,
    });
    const result = await PayPalService.createPaymentOrder(paymentRequest);

    if (result.success) {
      secureLogger.info("PayPal order created successfully", {
        orderId: result.orderId,
      });

      // ✅ CORRECTION: Renvoyer uniquement l'approvalLink PayPal
      // Ne pas construire d'URL "maison" avec token= ou reservationId
      res.json({
        success: true,
        approvalLink: result.paymentUrl, // URL PayPal directe
        orderId: result.orderId, // Pour référence uniquement
      });
    } else {
      secureLogger.error("Failed to create PayPal order", undefined, {
        error: result.error,
      });
      res.status(500).json({
        success: false,
        error: result.error || "Failed to create PayPal order",
      });
    }
  } catch (error: unknown) {
    handleRouteError(error, res, "Failed to create PayPal order");
  }
});

/**
 * POST /api/paypal/capture-payment
 * Capture un paiement PayPal après approbation
 * ✅ CORRECTION: Utilise le token PayPal (orderId) pour la capture
 * 🔒 SECURITY: Authentication required
 */
router.post("/capture-payment", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { orderId } = req.body as PayPalCapturePaymentRequest;

    if (!orderId) {
      res.status(400).json({
        success: false,
        error: "Missing orderId (PayPal token)",
      });
      return;
    }

    // SECURITY: Log only non-sensitive data via secureLogger
    secureLogger.info("Capturing PayPal payment", {
      userId: req.user?.id,
      orderId,
    });

    // ✅ CORRECTION: orderId est le token PayPal, pas le reservationId
    const result = await PayPalService.capturePayment(orderId);

    if (result.success) {
      secureLogger.info("PayPal payment captured successfully", {
        transactionId: result.transactionId,
        orderId,
      });
      res.json({
        success: true,
        transactionId: result.transactionId,
        orderId: orderId, // Token PayPal original
      });
    } else {
      secureLogger.error("Failed to capture PayPal payment", undefined, {
        error: result.error,
        orderId,
      });
      res.status(500).json({
        success: false,
        error: result.error || "Failed to capture payment",
      });
    }
  } catch (error: unknown) {
    handleRouteError(error, res, "Failed to capture PayPal payment");
  }
});

/**
 * ✅ GET /api/paypal/capture/:token
 * Capture automatique du paiement PayPal avec le token de l'URL
 * Cette route est appelée par PayPal lors du retour utilisateur
 *
 * 🔒 SECURITY: No session auth required - validates via PayPal token verification
 * PayPal redirects may lose session cookies (cross-domain), so we validate
 * the payment by verifying the token directly with PayPal API instead.
 * The webhook (PAYMENT.CAPTURE.COMPLETED) serves as backup confirmation.
 */
router.get("/capture/:token", async (req: Request, res: Response) => {
  const { token } = req.params;

  try {
    const { PayerID } = req.query; // PayerID optionnel de PayPal

    if (!token) {
      const errorUrl = urls.paypal.error("missing_token");
      res.redirect(errorUrl);
      return;
    }

    // SECURITY: Log capture attempt
    secureLogger.info("Auto-capturing PayPal payment via token validation", {
      token,
    });

    // 🔒 SECURITY: Validate token by fetching order details from PayPal API
    // This confirms the token is legitimate and the order exists
    let orderDetails: { status?: string; id?: string };
    try {
      orderDetails = (await PayPalService.getOrderDetails(token)) as {
        status?: string;
        id?: string;
      };
    } catch (orderError) {
      secureLogger.error(
        "Failed to validate PayPal token",
        orderError instanceof Error ? orderError : undefined,
        {
          token,
        }
      );
      const errorUrl = urls.paypal.error("invalid_token", token);
      res.redirect(errorUrl);
      return;
    }

    // 🔒 SECURITY: Verify order status is APPROVED (user completed PayPal checkout)
    if (orderDetails.status !== "APPROVED") {
      secureLogger.warn("PayPal order not in APPROVED status", {
        token,
        status: orderDetails.status,
      });

      // If already captured, redirect to success
      if (orderDetails.status === "COMPLETED") {
        const successUrl = urls.paypal.success(token, PayerID as string);
        res.redirect(successUrl);
        return;
      }

      const errorUrl = urls.paypal.error("order_not_approved", token);
      res.redirect(errorUrl);
      return;
    }

    // ✅ Token validated - proceed with capture
    const result = await PayPalService.capturePayment(token);

    if (result.success) {
      secureLogger.info("PayPal payment auto-captured successfully", {
        transactionId: result.transactionId,
        token,
      });

      const successUrl = urls.paypal.success(token, PayerID as string);
      res.redirect(successUrl);
    } else {
      secureLogger.error("Failed to auto-capture PayPal payment", undefined, {
        error: result.error,
        token,
      });

      const errorUrl = urls.paypal.error("capture_failed", token);
      res.redirect(errorUrl);
    }
  } catch (error: unknown) {
    secureLogger.error(
      "Error in PayPal auto-capture endpoint",
      error instanceof Error ? error : undefined,
      { token }
    );
    const errorUrl = urls.paypal.error("server_error");
    res.redirect(errorUrl);
  }
});

/**
 * NOTE: PayPal webhook handling is centralized in server/routes/webhooks.ts
 * All PayPal webhook events (PAYMENT.CAPTURE.COMPLETED, PAYMENT.CAPTURE.DENIED, etc.)
 * are processed through POST /api/webhooks/paypal with proper signature verification
 * and unified payment processing logic.
 */

/**
 * GET /api/paypal/order/:orderId
 * Obtient les détails d'une commande PayPal
 * 🔒 SECURITY: Authentication required
 */
router.get("/order/:orderId", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { orderId } = req.params;

    if (!orderId) {
      res.status(400).json({
        success: false,
        error: "Missing orderId",
      });
      return;
    }

    // SECURITY: Log only non-sensitive data via secureLogger
    secureLogger.info("Getting PayPal order details", {
      userId: req.user?.id,
      orderId,
    });

    const orderDetails = await PayPalService.getOrderDetails(orderId);

    res.json({
      success: true,
      order: orderDetails,
    });
  } catch (error: unknown) {
    handleRouteError(error, res, "Failed to get PayPal order details");
  }
});

/**
 * GET /api/paypal/health
 * Vérification de la santé du service PayPal avec ping API réel
 * Valide les credentials OAuth et la connectivité avant checkout
 */
router.get("/health", async (req: Request, res: Response) => {
  try {
    const healthResult = await PayPalService.healthCheck();

    if (healthResult.healthy) {
      res.json({
        success: true,
        message: "PayPal service is healthy",
        timestamp: new Date().toISOString(),
        environment: process.env.PAYPAL_MODE || "sandbox",
        latencyMs: healthResult.latencyMs,
        apiConnectivity: true,
      });
    } else {
      res.status(503).json({
        success: false,
        message: "PayPal service is unhealthy",
        timestamp: new Date().toISOString(),
        environment: process.env.PAYPAL_MODE || "sandbox",
        latencyMs: healthResult.latencyMs,
        apiConnectivity: false,
        error: healthResult.error,
      });
    }
  } catch (error: unknown) {
    handleRouteError(error, res, "PayPal health check failed");
  }
});

export default router;
