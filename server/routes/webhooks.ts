import { Request, Response, Router } from "express";
import { randomUUID } from "node:crypto";
import { logger } from "../lib/logger";
import { paymentService } from "../services/PaymentService";
import {
  PaymentError,
  PaymentErrorCode,
  createErrorResponse,
  sanitizeErrorMessage,
} from "../utils/errorHandling";

const router = Router();

/**
 * Stripe webhook endpoint
 * Handles payment events from Stripe with signature verification
 * Requirements: 1.1, 8.1, 8.2
 */
router.post("/stripe", async (req: Request, res: Response): Promise<void> => {
  // Generate request ID for tracking
  const requestId = randomUUID();

  try {
    const signature = req.headers["stripe-signature"];

    logger.info("Processing Stripe webhook", { requestId });

    if (!signature || typeof signature !== "string") {
      logger.warn("Missing Stripe signature", { requestId });
      const errorResponse = createErrorResponse(
        "Missing signature",
        PaymentErrorCode.STRIPE_MISSING_SIGNATURE,
        "Stripe signature header is required for webhook verification",
        requestId
      );
      res.status(400).json(errorResponse);
      return;
    }

    // Get raw body (Buffer from express.raw() middleware)
    const payload = req.body as Buffer;

    // Handle webhook with retry logic
    const result = await paymentService.retryWebhookProcessing(
      () => paymentService.handleStripeWebhook(payload, signature),
      3 // 3 attempts with exponential backoff
    );

    if (result.success) {
      logger.info("Stripe webhook processed", {
        requestId,
        message: result.message,
        orderId: result.orderId,
      });
      res.status(200).json({
        received: true,
        message: result.message,
        requestId,
        orderId: result.orderId,
        reservationIds: result.reservationIds,
        timestamp: new Date().toISOString(),
      });
    } else {
      logger.error("Stripe webhook failed", { requestId, message: result.message });
      const errorResponse = createErrorResponse(
        result.message,
        PaymentErrorCode.WEBHOOK_PROCESSING_ERROR,
        "Failed to process Stripe webhook event",
        requestId
      );
      res.status(400).json(errorResponse);
    }
  } catch (error) {
    logger.error("Error processing Stripe webhook", { requestId, error });

    // Handle PaymentError with proper error code
    if (error instanceof PaymentError) {
      const errorResponse = error.toErrorResponse(requestId);
      const statusCode = error.code === PaymentErrorCode.STRIPE_INVALID_SIGNATURE ? 400 : 500;
      res.status(statusCode).json(errorResponse);
      return;
    }

    // Handle generic errors
    const errorObj = error instanceof Error ? error : new Error(String(error));
    const errorResponse = createErrorResponse(
      "Webhook processing failed",
      PaymentErrorCode.WEBHOOK_PROCESSING_ERROR,
      sanitizeErrorMessage(errorObj),
      requestId,
      { stack: errorObj.stack }
    );
    res.status(500).json(errorResponse);
  }
});

/**
 * PayPal webhook endpoint
 * Handles payment events from PayPal with signature verification
 * Requirements: 2.1, 8.1, 8.2
 */
router.post("/paypal", async (req: Request, res: Response): Promise<void> => {
  // Generate request ID for tracking
  const requestId = randomUUID();

  try {
    // Get raw body (Buffer from express.raw() middleware) and headers
    const payload = req.body as Buffer;
    const headers: Record<string, string> = {};

    // Extract PayPal headers
    const relevantHeaders = [
      "paypal-transmission-id",
      "paypal-transmission-time",
      "paypal-transmission-sig",
      "paypal-cert-url",
      "paypal-auth-algo",
    ];

    for (const header of relevantHeaders) {
      const value = req.headers[header];
      if (value && typeof value === "string") {
        headers[header] = value;
      }
    }

    logger.info("Processing PayPal webhook", { requestId });

    // Validate required headers
    const missingHeaders = relevantHeaders.filter(h => !headers[h]);
    if (missingHeaders.length > 0) {
      logger.warn("Missing PayPal headers", { requestId, missingHeaders });
      const errorResponse = createErrorResponse(
        "Missing required headers",
        PaymentErrorCode.PAYPAL_MISSING_HEADERS,
        `PayPal webhook requires headers: ${missingHeaders.join(", ")}`,
        requestId,
        { missingHeaders }
      );
      res.status(400).json(errorResponse);
      return;
    }

    // Handle webhook with retry logic
    const result = await paymentService.retryWebhookProcessing(
      () => paymentService.handlePayPalWebhook(payload, headers),
      3 // 3 attempts with exponential backoff
    );

    if (result.success) {
      logger.info("PayPal webhook processed", {
        requestId,
        message: result.message,
        orderId: result.orderId,
      });
      res.status(200).json({
        received: true,
        message: result.message,
        requestId,
        orderId: result.orderId,
        reservationIds: result.reservationIds,
        timestamp: new Date().toISOString(),
      });
    } else {
      logger.error("PayPal webhook failed", { requestId, message: result.message });
      const errorResponse = createErrorResponse(
        result.message,
        PaymentErrorCode.WEBHOOK_PROCESSING_ERROR,
        "Failed to process PayPal webhook event",
        requestId
      );
      res.status(400).json(errorResponse);
    }
  } catch (error) {
    logger.error("Error processing PayPal webhook", { requestId, error });

    // Handle PaymentError with proper error code
    if (error instanceof PaymentError) {
      const errorResponse = error.toErrorResponse(requestId);
      const statusCode = error.code === PaymentErrorCode.PAYPAL_INVALID_SIGNATURE ? 400 : 500;
      res.status(statusCode).json(errorResponse);
      return;
    }

    // Handle generic errors
    const errorObj = error instanceof Error ? error : new Error(String(error));
    const errorResponse = createErrorResponse(
      "Webhook processing failed",
      PaymentErrorCode.WEBHOOK_PROCESSING_ERROR,
      sanitizeErrorMessage(errorObj),
      requestId,
      { stack: errorObj.stack }
    );
    res.status(500).json(errorResponse);
  }
});

/**
 * Health check endpoint
 * Enhanced with service status and configuration validation
 * Requirements: 8.1, 8.2
 */
router.get("/health", (_req: Request, res: Response): void => {
  const requestId = randomUUID();

  try {
    // Check environment configuration
    const stripeConfigured = !!process.env.STRIPE_SECRET_KEY && !!process.env.STRIPE_WEBHOOK_SECRET;
    const paypalConfigured =
      !!process.env.PAYPAL_CLIENT_ID &&
      !!process.env.PAYPAL_CLIENT_SECRET &&
      !!process.env.PAYPAL_WEBHOOK_ID;
    const convexConfigured = !!process.env.VITE_CONVEX_URL;

    const allConfigured = stripeConfigured && paypalConfigured && convexConfigured;

    const healthStatus = {
      status: allConfigured ? "healthy" : "degraded",
      requestId,
      timestamp: new Date().toISOString(),
      webhooks: {
        stripe: {
          endpoint: "/api/webhooks/stripe",
          configured: stripeConfigured,
          events: [
            "payment_intent.succeeded",
            "payment_intent.payment_failed",
            "checkout.session.completed",
            "charge.refunded",
          ],
        },
        paypal: {
          endpoint: "/api/webhooks/paypal",
          configured: paypalConfigured,
          events: [
            "PAYMENT.CAPTURE.COMPLETED",
            "PAYMENT.CAPTURE.DENIED",
            "PAYMENT.CAPTURE.REFUNDED",
          ],
        },
      },
      services: {
        convex: {
          configured: convexConfigured,
          url: convexConfigured ? process.env.VITE_CONVEX_URL : "not configured",
        },
        paymentService: {
          status: "operational",
          features: ["stripe", "paypal", "reservations", "invoices"],
        },
      },
      version: process.env.npm_package_version || "unknown",
    };

    const statusCode = allConfigured ? 200 : 503;

    logger.info("Health check completed", { requestId, status: healthStatus.status });

    res.status(statusCode).json(healthStatus);
  } catch (error) {
    logger.error("Health check error", { requestId, error });
    const errorResponse = createErrorResponse(
      "Health check failed",
      "HEALTH_CHECK_ERROR",
      error instanceof Error ? error.message : "Unknown error occurred",
      requestId
    );
    res.status(500).json(errorResponse);
  }
});

export default router;
