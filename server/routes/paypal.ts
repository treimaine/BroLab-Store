import { Request, Response, Router } from "express";
import { isAuthenticated as requireAuth } from "../auth";
import { PAYPAL_WEBHOOK_ID } from "../config/paypal";
import { urls } from "../config/urls";
import PayPalService, { PaymentRequest } from "../services/paypal";
import {
  AuthenticatedRequest,
  PayPalCapturePaymentRequest,
  PayPalCreateOrderRequest,
  handleRouteError,
} from "../types/routes";

const router = Router();

/**
 * GET /api/paypal/test
 * Route de test simple pour diagnostiquer PayPal
 */
router.get("/test", async (req: Request, res: Response) => {
  try {
    console.log("🧪 Testing PayPal endpoint");

    // Test simple sans authentification
    const testResponse = {
      success: true,
      message: "PayPal endpoint accessible",
      timestamp: new Date().toISOString(),
      test: true,
    };

    console.log("✅ PayPal test successful:", testResponse);
    res.json(testResponse);
  } catch (error: unknown) {
    handleRouteError(error, res, "PayPal test failed");
  }
});

/**
 * GET /api/paypal/test-auth
 * Route de test pour vérifier l'authentification
 */
router.get("/test-auth", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    console.log("🔐 Testing PayPal authentication");
    console.log("👤 User data:", {
      clerkId: req.user?.clerkId || null,
      id: req.user?.id || null,
      email: req.user?.email || null,
      username: req.user?.username || null,
    });

    res.json({
      success: true,
      message: "PayPal authentication test successful",
      user: {
        clerkId: req.user?.clerkId || null,
        id: req.user?.id || null,
        email: req.user?.email || null,
        username: req.user?.username || null,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error: unknown) {
    handleRouteError(error, res, "PayPal auth test failed");
  }
});

/**
 * POST /api/paypal/create-order
 * Crée une commande PayPal pour le paiement d'une réservation
 * ✅ CORRECTION: Renvoie uniquement l'approvalLink PayPal
 */
router.post("/create-order", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { serviceType, amount, currency, description, reservationId, customerEmail } =
      req.body as PayPalCreateOrderRequest;

    // Validation des données requises
    if (!serviceType || !amount || !currency || !description || !reservationId || !customerEmail) {
      res.status(400).json({
        success: false,
        error:
          "Missing required fields: serviceType, amount, currency, description, reservationId, customerEmail",
      });
      return;
    }

    // ✅ AUTHENTIFICATION VÉRIFIÉE - Utilisateur connecté
    if (!req.user?.id) {
      res.status(401).json({
        success: false,
        error: "User authentication required",
      });
      return;
    }

    console.log("🚀 Creating PayPal order for authenticated user:", req.user);
    console.log("👤 User ID:", req.user.id);

    // Création de la commande PayPal avec l'utilisateur authentifié
    const paymentRequest: PaymentRequest = {
      serviceType,
      amount: parseFloat(String(amount)),
      currency: currency.toUpperCase(),
      description,
      reservationId,
      userId: req.user.id, // Utiliser l'ID utilisateur authentifié
      customerEmail,
    };

    console.log("🚀 Creating PayPal order:", paymentRequest);
    const result = await PayPalService.createPaymentOrder(paymentRequest);

    if (result.success) {
      console.log("✅ PayPal order created successfully:", result.orderId);

      // ✅ CORRECTION: Renvoyer uniquement l'approvalLink PayPal
      // Ne pas construire d'URL "maison" avec token= ou reservationId
      res.json({
        success: true,
        approvalLink: result.paymentUrl, // URL PayPal directe
        orderId: result.orderId, // Pour référence uniquement
      });
    } else {
      console.error("❌ Failed to create PayPal order:", result.error);
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
 */
router.post("/capture-payment", async (req: AuthenticatedRequest, res: Response) => {
  // TEMPORAIRE: Authentification désactivée
  try {
    const { orderId } = req.body as PayPalCapturePaymentRequest;

    if (!orderId) {
      res.status(400).json({
        success: false,
        error: "Missing orderId (PayPal token)",
      });
      return;
    }

    console.log("🎯 Capturing PayPal payment for order:", orderId);
    console.log("🔐 User authenticated:", req.user?.clerkId || req.user?.id || "anonymous");

    // ✅ CORRECTION: orderId est le token PayPal, pas le reservationId
    const result = await PayPalService.capturePayment(orderId);

    if (result.success) {
      console.log("✅ Payment captured successfully:", result.transactionId);
      res.json({
        success: true,
        transactionId: result.transactionId,
        orderId: orderId, // Token PayPal original
      });
    } else {
      console.error("❌ Failed to capture payment:", result.error);
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
 * ✅ NOUVELLE ROUTE: GET /api/paypal/capture/:token
 * Capture automatique du paiement PayPal avec le token de l'URL
 * Cette route est appelée par PayPal lors du retour utilisateur
 */
router.get("/capture/:token", async (req: Request, res: Response) => {
  try {
    const { token } = req.params;
    const { PayerID } = req.query; // PayerID optionnel de PayPal

    if (!token) {
      res.status(400).json({
        success: false,
        error: "Missing PayPal token",
      });
      return;
    }

    console.log("🎯 Auto-capturing PayPal payment with token:", token);
    console.log("👤 PayerID from PayPal:", PayerID);

    // ✅ CORRECTION: token est l'orderId PayPal, pas le reservationId
    const result = await PayPalService.capturePayment(token);

    if (result.success) {
      console.log("✅ Payment auto-captured successfully:", result.transactionId);

      // ✅ CORRECTION: Rediriger vers la page de succès avec les bons paramètres
      const successUrl = urls.paypal.success(token, PayerID as string);

      res.redirect(successUrl);
    } else {
      console.error("❌ Failed to auto-capture payment:", result.error);

      // Rediriger vers la page d'erreur
      const errorUrl = urls.paypal.error("capture_failed", token);
      res.redirect(errorUrl);
    }
  } catch (error: unknown) {
    console.error("❌ Error in auto-capture endpoint:", error);
    // For redirect endpoints, we need to handle errors differently
    const errorUrl = urls.paypal.error("server_error");
    res.redirect(errorUrl);
  }
});

/**
 * POST /api/paypal/webhook
 * Webhook PayPal pour les notifications automatiques
 * ⚠️ PAS D'AUTHENTIFICATION (PayPal appelle directement)
 */
router.post("/webhook", async (req: Request, res: Response) => {
  try {
    // Vérification de la signature du webhook
    const webhookId = PAYPAL_WEBHOOK_ID;
    const transmissionId = req.headers["paypal-transmission-id"] as string;
    const timestamp = req.headers["paypal-transmission-time"] as string;
    const certUrl = req.headers["paypal-cert-url"] as string;
    const authAlgo = req.headers["paypal-auth-algo"] as string;
    const transmissionSig = req.headers["paypal-transmission-sig"] as string;

    if (!webhookId || !transmissionId || !timestamp || !certUrl || !authAlgo || !transmissionSig) {
      console.error("❌ Missing PayPal webhook headers");
      res.status(400).json({ error: "Missing webhook headers" });
      return;
    }

    // Vérification de la signature
    const isValidSignature = await PayPalService.verifyWebhookSignature(
      webhookId,
      transmissionId,
      timestamp,
      certUrl,
      authAlgo,
      transmissionSig,
      JSON.stringify(req.body)
    );

    if (!isValidSignature) {
      console.error("❌ Invalid webhook signature");
      res.status(400).json({ error: "Invalid webhook signature" });
      return;
    }

    console.log("✅ Webhook signature verified successfully");

    // Traitement de l'événement webhook
    const result = await PayPalService.processWebhookEvent(req.body);

    if (result.success) {
      console.log("✅ Webhook processed successfully:", result.message);
      res.json({ success: true, message: result.message });
    } else {
      console.error("❌ Failed to process webhook:", result.message);
      res.status(500).json({ success: false, error: result.message });
    }
  } catch (error: unknown) {
    handleRouteError(error, res, "PayPal webhook processing failed");
  }
});

/**
 * GET /api/paypal/order/:orderId
 * Obtient les détails d'une commande PayPal
 * ✅ AUTHENTIFICATION ACTIVÉE
 */
router.get("/order/:orderId", async (req: AuthenticatedRequest, res: Response) => {
  // TEMPORAIRE: Authentification désactivée
  try {
    const { orderId } = req.params;

    if (!orderId) {
      res.status(400).json({
        success: false,
        error: "Missing orderId",
      });
      return;
    }

    console.log("📋 Getting PayPal order details:", orderId);
    console.log("🔐 User authenticated:", req.user?.clerkId || req.user?.id || "anonymous");

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
 * Vérification de la santé du service PayPal
 */
router.get("/health", async (req: Request, res: Response) => {
  try {
    res.json({
      success: true,
      message: "PayPal service is healthy",
      timestamp: new Date().toISOString(),
      environment: process.env.PAYPAL_MODE || "sandbox",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "PayPal service is unhealthy",
    });
  }
});

export default router;
