import { ConvexHttpClient } from "convex/browser";
import { Request, Response, Router } from "express";
import Stripe from "stripe";
import type { Id } from "../../convex/_generated/dataModel";
import type {
  CreatePaymentSessionResponse,
  PaymentWebhookRequest,
} from "../../shared/types/apiEndpoints";
import { centsToDollars } from "../../shared/utils/currency";
import { createPaymentSessionRequestSchema, validateBody } from "../../shared/validation/index";
import { logger } from "../lib/logger";
import PayPalService from "../services/paypal";
import type { CreatePaymentSessionHandler } from "../types/ApiTypes";
import { handleRouteError } from "../types/routes";
import { generateSecureRequestId } from "../utils/requestId";

const router = Router();

// NOTE: Clerk Billing webhooks (subscription.*, invoice.*) are handled by
// server/routes/clerk-billing.ts which provides:
// - Svix signature verification
// - Replay attack protection
// - Idempotency checking
// - Structured audit logging
// This file only handles order payment webhooks.

/**
 * Handle order webhook events (one-time purchases)
 * Updates order status and confirms payment
 *
 * NOTE: This handler is for order payments only.
 * Clerk Billing webhooks (subscriptions/invoices) are handled by clerk-billing.ts
 */
async function handleOrderWebhook(
  normalized: {
    email: string | undefined;
    sessionId: string | undefined;
    paymentId: string | undefined;
    status: string | undefined;
  },
  mapped: { status: string; paymentStatus: string },
  convexUrl: string
): Promise<void> {
  logger.info("Processing order webhook", {
    sessionId: normalized.sessionId,
    status: mapped.status,
    paymentStatus: mapped.paymentStatus,
  });

  const convex = new ConvexHttpClient(convexUrl);

  // Find order by session ID or payment ID
  let orderId: Id<"orders"> | null = null;

  if (normalized.sessionId) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const orders = await (convex as any).query("orders:listOrdersAdmin", {
      limit: 1,
    });
    const ordersList = Array.isArray(orders) ? orders : [];
    const order = ordersList.find(
      (o: { checkoutSessionId?: string; _id: Id<"orders"> }) =>
        o.checkoutSessionId === normalized.sessionId
    );
    if (order && "_id" in order) {
      orderId = order._id;
    }
  }

  if (!orderId && normalized.paymentId) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const orders = await (convex as any).query("orders:listOrdersAdmin", {
      limit: 1,
    });
    const ordersList = Array.isArray(orders) ? orders : [];
    const order = ordersList.find(
      (o: { paymentIntentId?: string; _id: Id<"orders"> }) =>
        o.paymentIntentId === normalized.paymentId
    );
    if (order && "_id" in order) {
      orderId = order._id;
    }
  }

  if (!orderId) {
    logger.warn("Order not found for session/payment ID", { sessionId: normalized.sessionId });
    return;
  }

  // Record payment
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (convex as any).mutation("orders:recordPayment", {
    orderId,
    provider: "stripe",
    status: mapped.paymentStatus,
    amount: 0, // Amount should come from webhook data
    currency: "usd",
    stripeEventId: normalized.sessionId || normalized.paymentId || "",
    stripePaymentIntentId: normalized.paymentId,
  });

  // Confirm payment if succeeded
  if (mapped.paymentStatus === "succeeded") {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (convex as any).mutation("orders:confirmPayment:confirmPayment", {
      orderId,
      paymentIntentId: normalized.paymentId || normalized.sessionId || "",
      status: "succeeded",
      provider: "stripe",
    });
    logger.info("Order payment confirmed", { orderId });
  }
}

// Initialize Stripe client
const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
let stripeClient: Stripe | null = null;

if (stripeSecretKey) {
  stripeClient = new Stripe(stripeSecretKey, {
    apiVersion: "2025-08-27.basil",
  });
}

/**
 * Create real payment session with Stripe or PayPal
 * Replaces the mock URL generation with actual payment provider integration
 */
const createPaymentSession: CreatePaymentSessionHandler = async (req, res) => {
  try {
    const { reservationId, amount, currency, description, metadata } = req.body;

    // Verify user authentication
    if (!req.user?.id) {
      const requestId = (req as { requestId?: string }).requestId || generateSecureRequestId();
      res.status(401).json({
        error: "Authentication required",
        message: "Please log in to continue",
        requestId,
      });
      return;
    }

    const userId = String(req.user.id);
    const userEmail = req.user.email || "";

    // Determine payment provider from metadata or default to Stripe
    const paymentProvider = (metadata?.paymentProvider as string) || "stripe";

    logger.info("Creating payment session", { provider: paymentProvider, reservationId });

    if (paymentProvider === "paypal") {
      // Create PayPal order
      const paypalResult = await PayPalService.createPaymentOrder({
        serviceType: (metadata?.serviceType as string) || "service",
        amount: centsToDollars(amount), // PayPal expects amount in dollars, not cents
        currency: currency.toUpperCase(),
        description,
        reservationId,
        userId,
        customerEmail: userEmail,
      });

      if (!paypalResult.success || !paypalResult.paymentUrl) {
        res.status(500).json({
          error: "Failed to create PayPal payment session",
          message: paypalResult.error || "Unknown error",
        });
        return;
      }

      const response: CreatePaymentSessionResponse = {
        success: true,
        checkoutUrl: paypalResult.paymentUrl,
        sessionId: paypalResult.orderId || `paypal_${Date.now()}`,
        amount,
        currency,
        description,
        metadata: { ...metadata, provider: "paypal" },
      };

      logger.info("PayPal payment session created", { sessionId: paypalResult.orderId });
      res.json(response);
      return;
    }

    // Default: Create Stripe checkout session
    if (!stripeClient) {
      logger.error("Stripe client not initialized", { reason: "STRIPE_SECRET_KEY missing" });
      res.status(500).json({
        error: "Payment service unavailable",
        message: "Stripe is not configured. Please contact support.",
      });
      return;
    }

    // Build success and cancel URLs
    const baseUrl = process.env.CLIENT_URL || "https://brolabentertainment.com";
    const successUrl = `${baseUrl}/payment/success?session_id={CHECKOUT_SESSION_ID}&reservation_id=${reservationId}`;
    const cancelUrl = `${baseUrl}/payment/cancel?reservation_id=${reservationId}`;

    // Create Stripe checkout session
    const session = await stripeClient.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: currency.toLowerCase(),
            product_data: {
              name: description || "Service Payment",
              description: `Reservation: ${reservationId}`,
            },
            unit_amount: amount, // Amount in cents
          },
          quantity: 1,
        },
      ],
      success_url: successUrl,
      cancel_url: cancelUrl,
      customer_email: userEmail || undefined,
      metadata: {
        reservationId,
        userId,
        type: "reservation_payment",
        ...(metadata as Record<string, string> | undefined),
      },
      expires_at: Math.floor(Date.now() / 1000) + 30 * 60, // 30 minutes expiration
    });

    if (!session.url) {
      res.status(500).json({
        error: "Failed to create Stripe checkout session",
        message: "No checkout URL returned from Stripe",
      });
      return;
    }

    const response: CreatePaymentSessionResponse = {
      success: true,
      checkoutUrl: session.url,
      sessionId: session.id,
      amount,
      currency,
      description,
      metadata: { ...metadata, provider: "stripe" },
    };

    logger.info("Stripe checkout session created", { sessionId: session.id });
    res.json(response);
  } catch (error: unknown) {
    logger.error("Error creating payment session", { error });
    handleRouteError(error, res, "Failed to create payment session");
  }
};

router.post(
  "/create-payment-session",
  validateBody(createPaymentSessionRequestSchema),
  createPaymentSession as never
);

/**
 * Verify webhook signature using Svix
 */
async function verifyWebhookSignature(
  body: unknown,
  headers: Record<string, string>,
  secret: string
): Promise<PaymentWebhookRequest> {
  const { Webhook } = await import("svix");
  if (!Webhook) throw new Error("Svix Webhook class not found");
  const svix = new Webhook(secret);
  return svix.verify(JSON.stringify(body), headers) as PaymentWebhookRequest;
}

/**
 * Get verified webhook payload for order payments
 * NOTE: Clerk Billing webhooks use clerk-billing.ts with enhanced security
 */
async function getWebhookPayload(
  req: Request,
  res: Response
): Promise<PaymentWebhookRequest | null> {
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;
  const isProd = process.env.NODE_ENV === "production";

  if (!WEBHOOK_SECRET) {
    if (isProd) {
      logger.error("CLERK_WEBHOOK_SECRET not set in production");
      res.status(500).json({ error: "Webhook secret not configured" });
      return null;
    }
    logger.warn("Missing CLERK_WEBHOOK_SECRET; using raw body in dev");
    return req.body;
  }

  try {
    return await verifyWebhookSignature(
      req.body,
      req.headers as Record<string, string>,
      WEBHOOK_SECRET
    );
  } catch (err: unknown) {
    if (isProd) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      logger.error("Webhook signature verification failed", { error: errorMessage });
      res.status(400).json({ error: "invalid_signature" });
      return null;
    }
    logger.warn("Svix not available or verification failed; using raw body in dev");
    return req.body;
  }
}

/**
 * Extract normalized data from webhook payload
 */
function extractWebhookData(webhookData: Record<string, unknown> | undefined) {
  const email: string | undefined =
    (webhookData?.customer_email as string) ||
    (webhookData?.customerEmail as string) ||
    (webhookData?.email as string);
  const sessionId: string | undefined =
    (webhookData?.id as string) || (webhookData?.session_id as string) || undefined;
  const paymentId: string | undefined =
    (webhookData?.payment_intent as string) || (webhookData?.payment_id as string) || undefined;
  const statusRaw: string | undefined = (webhookData?.status as string) || undefined;

  return {
    email,
    sessionId,
    paymentId,
    status: statusRaw && typeof statusRaw === "string" ? statusRaw.toLowerCase() : undefined,
  } as const;
}

/**
 * Map webhook status to order status
 */
function mapWebhookStatus(status: string | undefined): { status: string; paymentStatus: string } {
  const statusMap: Record<string, { status: string; paymentStatus: string }> = {
    completed: { status: "completed", paymentStatus: "succeeded" },
    paid: { status: "completed", paymentStatus: "succeeded" },
    succeeded: { status: "completed", paymentStatus: "succeeded" },
    processing: { status: "processing", paymentStatus: "processing" },
    requires_payment_method: { status: "pending", paymentStatus: "requires_payment_method" },
    failed: { status: "cancelled", paymentStatus: "failed" },
    canceled: { status: "cancelled", paymentStatus: "canceled" },
  };

  return statusMap[status || ""] || { status: "completed", paymentStatus: "succeeded" };
}

/**
 * Handle order payment webhook
 * NOTE: Clerk Billing events (subscription.*, invoice.*) are handled by clerk-billing.ts
 */
async function handleOrderPaymentWebhook(
  payload: PaymentWebhookRequest,
  convexUrl: string,
  res: Response
): Promise<void> {
  const webhookData = payload?.data;
  const normalized = extractWebhookData(webhookData);
  const mapped = mapWebhookStatus(normalized.status);

  await handleOrderWebhook(normalized, mapped, convexUrl);
  res.json({
    received: true,
    synced: true,
    handled: "order",
    result: { status: mapped.status },
  });
}

/**
 * Check if event type is a Clerk Billing event (handled by clerk-billing.ts)
 */
function isClerkBillingEvent(eventType: string): boolean {
  return eventType.startsWith("subscription.") || eventType.startsWith("invoice.");
}

// Payment webhook handler - handles order payments only
// Clerk Billing webhooks (subscriptions/invoices) are routed to /api/webhooks/clerk-billing
const paymentWebhook = async (req: Request, res: Response) => {
  try {
    const payload = await getWebhookPayload(req, res);
    if (!payload) return;

    const eventType: string = (payload?.type || "").toString();
    logger.info("Payment webhook received", { eventType });

    // Skip Clerk Billing events - they should be sent to /api/webhooks/clerk-billing
    if (isClerkBillingEvent(eventType)) {
      logger.info("Clerk Billing event received on wrong endpoint", {
        eventType,
        correctEndpoint: "/api/webhooks/clerk-billing",
      });
      res.json({
        received: true,
        synced: false,
        message: `Event ${eventType} should be sent to /api/webhooks/clerk-billing`,
      });
      return;
    }

    const convexUrl = process.env.VITE_CONVEX_URL;
    if (!convexUrl) {
      logger.warn("VITE_CONVEX_URL not set; skipping Convex sync for webhook");
      res.json({ received: true, synced: false });
      return;
    }

    try {
      await handleOrderPaymentWebhook(payload, convexUrl, res);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      logger.error("Failed to sync webhook to Convex", { error: errorMessage });
      res.status(500).json({ received: true, synced: false, error: errorMessage });
    }
  } catch (error: unknown) {
    handleRouteError(error, res, "Failed to process payment webhook");
  }
};

router.post("/webhook", paymentWebhook);

export default router;
