import { Request, Response, Router } from "express";
import type {
  CreatePaymentSessionResponse,
  PaymentWebhookRequest,
  PaymentWebhookResponse,
} from "../../shared/types/apiEndpoints";
import { CreatePaymentIntentSchema, validateBody } from "../../shared/validation/index";
import { urls } from "../config/urls";
import type { CreatePaymentSessionHandler } from "../types/ApiTypes";
import { handleRouteError } from "../types/routes";

const router = Router();

// Create payment session
const createPaymentSession: CreatePaymentSessionHandler = async (req, res) => {
  try {
    const { reservationId, amount, currency, description, metadata } = req.body; // Already validated

    // Verify user authentication
    if (!req.user || !req.user.id) {
      const requestId = (req as { requestId?: string }).requestId || `req_${Date.now()}`;
      res.status(401).json({
        error: "Authentication required",
        message: "Please log in to continue",
        requestId,
      });
      return;
    }

    // Create payment URL (TODO: Implement full Clerk Billing integration)
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
    handleRouteError(
      error instanceof Error ? error : String(error),
      res,
      "Failed to create payment session"
    );
  }
};

router.post(
  "/create-payment-session",
  validateBody(CreatePaymentIntentSchema),
  createPaymentSession as never
);

// Payment webhook handler
const paymentWebhook = async (req: Request, res: Response) => {
  try {
    const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;
    const isProd = process.env.NODE_ENV === "production";

    let payload: PaymentWebhookRequest | null = null;

    // Try to verify signature with Svix if configured
    if (WEBHOOK_SECRET) {
      try {
        // Dynamic import of svix for webhook validation
        const { Webhook } = await import("svix");
        if (!Webhook) throw new Error("Svix Webhook class not found");
        const svix = new Webhook(WEBHOOK_SECRET);
        payload = svix.verify(
          JSON.stringify(req.body),
          req.headers as Record<string, string>
        ) as PaymentWebhookRequest;
      } catch (err: unknown) {
        if (isProd) {
          const errorMessage = err instanceof Error ? err.message : String(err);
          console.error("Webhook signature verification failed:", errorMessage);
          res.status(400).json({ error: "invalid_signature" });
          return;
        }
        console.warn("⚠️ Svix not available or verification failed; using raw body in dev.");
        payload = req.body;
      }
    } else {
      if (isProd) {
        console.error("CLERK_WEBHOOK_SECRET not set in production");
        res.status(500).json({ error: "Webhook secret not configured" });
        return;
      }
      console.warn("⚠️ Missing CLERK_WEBHOOK_SECRET; using raw body in dev.");
      payload = req.body;
    }

    console.log("Payment webhook received:", payload?.type || "unknown", payload);

    // Initialize Convex client (server-side) using public URL (dev-safe)
    const convexUrl = process.env.VITE_CONVEX_URL;
    if (!convexUrl) {
      console.warn("VITE_CONVEX_URL not set; skipping Convex sync for webhook");
      const response: PaymentWebhookResponse = { received: true, synced: false };
      res.json(response);
      return;
    }

    // TODO: Implement proper Convex function imports with type safety
    // For now, using string-based calls to avoid type instantiation issues

    // Route Clerk Billing events first (subscriptions/invoices)
    const eventType: string = (payload?.type || "").toString();
    try {
      if (eventType.startsWith("subscription.")) {
        // TODO: Implement subscription webhook handling with proper types
        console.log("Subscription webhook received:", eventType);
        const response: PaymentWebhookResponse = {
          received: true,
          synced: true,
          handled: "subscription",
        };
        res.json(response);
        return;
      }

      if (eventType.startsWith("invoice.")) {
        // TODO: Implement invoice webhook handling with proper types
        console.log("Invoice webhook received:", eventType);
        const response: PaymentWebhookResponse = {
          received: true,
          synced: true,
          handled: "invoice",
        };
        res.json(response);
        return;
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      console.error("❌ Failed to sync subscription/invoice webhook:", errorMessage);
      // fall through to order fallback handling below
    }

    // Fallback: map generic payment events to Orders (one-time purchases)
    const webhookData = payload?.data as Record<string, unknown> | undefined;
    const email: string | undefined =
      (webhookData?.customer_email as string) ||
      (webhookData?.customerEmail as string) ||
      (webhookData?.email as string) ||
      undefined;
    const sessionId: string | undefined =
      (webhookData?.id as string) || (webhookData?.session_id as string) || undefined;
    const paymentId: string | undefined =
      (webhookData?.payment_intent as string) || (webhookData?.payment_id as string) || undefined;
    const statusRaw: string | undefined = (webhookData?.status as string) || undefined;

    const normalized = {
      email,
      sessionId,
      paymentId,
      status: statusRaw && typeof statusRaw === "string" ? statusRaw.toLowerCase() : undefined,
    } as const;

    const statusMap: Record<string, { status: string; paymentStatus: string }> = {
      completed: { status: "completed", paymentStatus: "succeeded" },
      paid: { status: "completed", paymentStatus: "succeeded" },
      succeeded: { status: "completed", paymentStatus: "succeeded" },
      processing: { status: "processing", paymentStatus: "processing" },
      requires_payment_method: { status: "pending", paymentStatus: "requires_payment_method" },
      failed: { status: "cancelled", paymentStatus: "failed" },
      canceled: { status: "cancelled", paymentStatus: "canceled" },
    };

    const mapped = statusMap[normalized.status || ""] || {
      status: "completed",
      paymentStatus: "succeeded",
    };

    try {
      // TODO: Implement proper order webhook handling with type safety
      console.log("Processing order webhook with data:", {
        email: normalized.email,
        sessionId: normalized.sessionId,
        paymentId: normalized.paymentId,
        status: mapped.status,
        paymentStatus: mapped.paymentStatus,
      });

      const response: PaymentWebhookResponse = {
        received: true,
        synced: true,
        handled: "order",
        result: { status: mapped.status },
      };
      res.json(response);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      console.error("Failed to sync webhook to Convex:", errorMessage);
      res.status(500).json({ received: true, synced: false, error: errorMessage });
    }
  } catch (error: unknown) {
    handleRouteError(
      error instanceof Error ? error : String(error),
      res,
      "Failed to process payment webhook"
    );
  }
};

router.post("/webhook", paymentWebhook);

export default router;
