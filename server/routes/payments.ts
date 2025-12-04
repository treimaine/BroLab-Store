import { ConvexHttpClient } from "convex/browser";
import { Request, Response, Router } from "express";
import type { Id } from "../../convex/_generated/dataModel";
import type {
  CreatePaymentSessionResponse,
  PaymentWebhookRequest,
} from "../../shared/types/apiEndpoints";
import { CreatePaymentIntentSchema, validateBody } from "../../shared/validation/index";
import { urls } from "../config/urls";
import type { CreatePaymentSessionHandler } from "../types/ApiTypes";
import { handleRouteError } from "../types/routes";

const router = Router();

/**
 * Handle subscription webhook events from Clerk Billing
 * Events: subscription.created, subscription.updated, subscription.deleted
 */
async function handleSubscriptionWebhook(
  eventType: string,
  payload: PaymentWebhookRequest,
  convexUrl: string
): Promise<void> {
  console.log(`📦 Processing subscription webhook: ${eventType}`);

  const convex = new ConvexHttpClient(convexUrl);
  const webhookData = payload.data as Record<string, unknown> | undefined;

  if (!webhookData) {
    throw new Error("Missing webhook data");
  }

  const subscriptionId = (webhookData.id as string) || "";
  const userId = (webhookData.user_id as string) || (webhookData.userId as string) || "";
  const planId = (webhookData.plan_id as string) || (webhookData.planId as string) || "basic";
  const status = (webhookData.status as string) || "active";
  const currentPeriodStart =
    (webhookData.current_period_start as number) ||
    (webhookData.currentPeriodStart as number) ||
    Date.now();
  const currentPeriodEnd =
    (webhookData.current_period_end as number) ||
    (webhookData.currentPeriodEnd as number) ||
    Date.now() + 30 * 24 * 60 * 60 * 1000;

  // Map plan to download quota - Synced with Clerk Billing Dashboard
  const quotaMap: Record<string, number> = {
    free_user: 1,
    basic: 5,
    artist: 20,
    ultimate_pass: 999999,
    ultimate: 999999, // Legacy alias
  };
  const downloadQuota = quotaMap[planId] || 5;

  try {
    // Find user by Clerk ID
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const users = await (convex as any).query("users:getUserByClerkId", { clerkId: userId });
    if (!users) {
      console.warn(`⚠️ User not found for Clerk ID: ${userId}`);
      return;
    }

    const userDoc = users as { _id: Id<"users"> };

    // Check if subscription already exists
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const existingSubscriptions = await (convex as any).query("subscriptions:getByClerkId", {
      clerkSubscriptionId: subscriptionId,
    });

    if (eventType === "subscription.created" || !existingSubscriptions) {
      // Create new subscription
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (convex as any).mutation("subscriptions:create", {
        userId: userDoc._id,
        clerkSubscriptionId: subscriptionId,
        planId,
        status,
        currentPeriodStart,
        currentPeriodEnd,
        downloadQuota,
        downloadUsed: 0,
        features: [],
      });
      console.log(`✅ Subscription created: ${subscriptionId}`);
    } else if (eventType === "subscription.updated") {
      // Update existing subscription
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (convex as any).mutation("subscriptions:update", {
        clerkSubscriptionId: subscriptionId,
        status,
        currentPeriodStart,
        currentPeriodEnd,
        downloadQuota,
      });
      console.log(`✅ Subscription updated: ${subscriptionId}`);
    } else if (eventType === "subscription.deleted") {
      // Cancel subscription
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (convex as any).mutation("subscriptions:cancel", {
        clerkSubscriptionId: subscriptionId,
      });
      console.log(`✅ Subscription cancelled: ${subscriptionId}`);
    }
  } catch (error) {
    console.error(`❌ Error processing subscription webhook:`, error);
    throw error;
  }
}

/**
 * Handle invoice webhook events from Clerk Billing
 * Events: invoice.created, invoice.paid, invoice.payment_failed
 */
async function handleInvoiceWebhook(
  eventType: string,
  payload: PaymentWebhookRequest,
  convexUrl: string
): Promise<void> {
  console.log(`📄 Processing invoice webhook: ${eventType}`);

  const convex = new ConvexHttpClient(convexUrl);
  const webhookData = payload.data as Record<string, unknown> | undefined;

  if (!webhookData) {
    throw new Error("Missing webhook data");
  }

  const invoiceId = (webhookData.id as string) || "";
  const subscriptionId =
    (webhookData.subscription_id as string) || (webhookData.subscriptionId as string) || "";
  const amount = (webhookData.amount as number) || 0;
  const currency = (webhookData.currency as string) || "USD";
  const status = (webhookData.status as string) || "open";
  const dueDate = (webhookData.due_date as number) || (webhookData.dueDate as number) || Date.now();

  try {
    // Find subscription by Clerk ID
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const subscription = await (convex as any).query("subscriptions:getByClerkId", {
      clerkSubscriptionId: subscriptionId,
    });

    if (!subscription) {
      console.warn(`⚠️ Subscription not found for invoice: ${subscriptionId}`);
      return;
    }

    const subscriptionDoc = subscription as { _id: Id<"subscriptions"> };

    // Check if invoice already exists
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const existingInvoice = await (convex as any).query("invoices:getByClerkId", {
      clerkInvoiceId: invoiceId,
    });

    if (eventType === "invoice.created" || !existingInvoice) {
      // Create new invoice
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (convex as any).mutation("invoices:create", {
        subscriptionId: subscriptionDoc._id,
        clerkInvoiceId: invoiceId,
        amount,
        currency,
        status,
        dueDate,
      });
      console.log(`✅ Invoice created: ${invoiceId}`);
    } else if (eventType === "invoice.paid") {
      // Mark invoice as paid
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (convex as any).mutation("invoices:markPaid", {
        clerkInvoiceId: invoiceId,
        paidAt: Date.now(),
      });
      console.log(`✅ Invoice paid: ${invoiceId}`);
    } else if (eventType === "invoice.payment_failed") {
      // Mark invoice as failed
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (convex as any).mutation("invoices:markFailed", {
        clerkInvoiceId: invoiceId,
      });
      console.log(`⚠️ Invoice payment failed: ${invoiceId}`);
    }
  } catch (error) {
    console.error(`❌ Error processing invoice webhook:`, error);
    throw error;
  }
}

/**
 * Handle order webhook events (one-time purchases)
 * Updates order status and confirms payment
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
  console.log("💳 Processing order webhook with data:", {
    email: normalized.email,
    sessionId: normalized.sessionId,
    paymentId: normalized.paymentId,
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
    console.warn(`⚠️ Order not found for session/payment ID`);
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
    console.log(`✅ Order payment confirmed: ${orderId}`);
  }
}

// Create payment session
const createPaymentSession: CreatePaymentSessionHandler = async (req, res) => {
  try {
    const { reservationId, amount, currency, description, metadata } = req.body; // Already validated

    // Verify user authentication
    if (!req.user?.id) {
      const requestId = (req as { requestId?: string }).requestId || `req_${Date.now()}`;
      res.status(401).json({
        error: "Authentication required",
        message: "Please log in to continue",
        requestId,
      });
      return;
    }

    // Create payment URL - Clerk Billing integration pending
    const paymentUrl = urls.genericCheckout(reservationId, amount, currency);

    const response: CreatePaymentSessionResponse = {
      success: true,
      checkoutUrl: paymentUrl,
      sessionId: `session_${Date.now()}`,
      amount,
      currency,
      description,
      metadata,
    };

    res.json(response);
  } catch (error: unknown) {
    handleRouteError(error, res, "Failed to create payment session");
  }
};

router.post(
  "/create-payment-session",
  validateBody(CreatePaymentIntentSchema),
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
 * Get verified webhook payload
 */
async function getWebhookPayload(
  req: Request,
  res: Response
): Promise<PaymentWebhookRequest | null> {
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;
  const isProd = process.env.NODE_ENV === "production";

  if (!WEBHOOK_SECRET) {
    if (isProd) {
      console.error("CLERK_WEBHOOK_SECRET not set in production");
      res.status(500).json({ error: "Webhook secret not configured" });
      return null;
    }
    console.warn("⚠️ Missing CLERK_WEBHOOK_SECRET; using raw body in dev.");
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
      console.error("Webhook signature verification failed:", errorMessage);
      res.status(400).json({ error: "invalid_signature" });
      return null;
    }
    console.warn("⚠️ Svix not available or verification failed; using raw body in dev.");
    return req.body;
  }
}

/**
 * Handle Clerk Billing events (subscriptions/invoices)
 */
async function handleClerkBillingEvent(
  eventType: string,
  payload: PaymentWebhookRequest,
  convexUrl: string,
  res: Response
): Promise<boolean> {
  if (eventType.startsWith("subscription.")) {
    await handleSubscriptionWebhook(eventType, payload, convexUrl);
    res.json({ received: true, synced: true, handled: "subscription" });
    return true;
  }

  if (eventType.startsWith("invoice.")) {
    await handleInvoiceWebhook(eventType, payload, convexUrl);
    res.json({ received: true, synced: true, handled: "invoice" });
    return true;
  }

  return false;
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

// Payment webhook handler
const paymentWebhook = async (req: Request, res: Response) => {
  try {
    const payload = await getWebhookPayload(req, res);
    if (!payload) return;

    console.log("Payment webhook received:", payload?.type || "unknown", payload);

    const convexUrl = process.env.VITE_CONVEX_URL;
    if (!convexUrl) {
      console.warn("VITE_CONVEX_URL not set; skipping Convex sync for webhook");
      res.json({ received: true, synced: false });
      return;
    }

    const eventType: string = (payload?.type || "").toString();

    try {
      const handled = await handleClerkBillingEvent(eventType, payload, convexUrl, res);
      if (handled) return;
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      console.error("❌ Failed to sync subscription/invoice webhook:", errorMessage);
    }

    try {
      await handleOrderPaymentWebhook(payload, convexUrl, res);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      console.error("Failed to sync webhook to Convex:", errorMessage);
      res.status(500).json({ received: true, synced: false, error: errorMessage });
    }
  } catch (error: unknown) {
    handleRouteError(error, res, "Failed to process payment webhook");
  }
};

router.post("/webhook", paymentWebhook);

export default router;
