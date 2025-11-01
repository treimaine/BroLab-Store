import { ConvexHttpClient } from "convex/browser";
import { Request, Response, Router } from "express";
import Stripe from "stripe";
import { Id } from "../../convex/_generated/dataModel";
import type {
  CreatePaymentIntentRequest,
  CreatePaymentIntentResponse,
} from "../../shared/types/apiEndpoints";
import { handleRouteError } from "../types/routes";

/**
 * Stripe Routes - Checkout and Payment Intent Creation Only
 *
 * NOTE: All Stripe webhook handling has been moved to server/routes/webhooks.ts
 * Webhook events (checkout.session.completed, payment_intent.succeeded, etc.)
 * are now processed through the unified PaymentService.
 *
 * This file only contains:
 * - POST /api/stripe/checkout - Create checkout session for beat purchases
 * - POST /api/stripe/create-payment-intent - Create payment intent for services
 * - GET /api/stripe/payment-intent/:id - Get payment intent status
 * - GET /api/stripe/health - Health check endpoint
 */

// Types for Stripe API responses
interface StripePaymentIntentResponse {
  id: string;
  client_secret: string;
  status: string;
  amount: number;
  currency: string;
  metadata?: Record<string, string>;
}

interface StripeCheckoutSessionParams {
  orderId: string;
  successUrl: string;
  cancelUrl: string;
}

interface StripePaymentIntentParams {
  amount: number;
  currency: string;
  metadata?: Record<string, string>;
}

// Helper function to create Stripe payment intent
const createStripePaymentIntent = async (
  params: StripePaymentIntentParams
): Promise<StripePaymentIntentResponse> => {
  const response = await fetch("https://api.stripe.com/v1/payment_intents", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      amount: params.amount.toString(),
      currency: params.currency,
      "automatic_payment_methods[enabled]": "true",
      ...(params.metadata &&
        Object.keys(params.metadata).reduce(
          (acc, key) => {
            acc[`metadata[${key}]`] = params.metadata![key];
            return acc;
          },
          {} as Record<string, string>
        )),
    }).toString(),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Stripe API Error: ${error.error?.message || "Unknown error"}`);
  }

  return await response.json();
};

// Initialize official Stripe client
if (!process.env.STRIPE_SECRET_KEY) {
  console.error("❌ Missing required Stripe secret: STRIPE_SECRET_KEY");
  throw new Error("STRIPE_SECRET_KEY environment variable is required");
}
const stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY, {
  // Using default API version for compatibility
});

const router = Router();

// Health check route
router.get("/health", (req, res): void => {
  res.json({
    status: "ok",
    stripe: stripeClient ? "initialized" : "mock",
    timestamp: new Date().toISOString(),
  });
});

/**
 * Create checkout session for an existing order
 * This route creates a Stripe checkout session for beat purchases
 */
router.post("/checkout", async (req, res): Promise<void> => {
  try {
    const { orderId, successUrl, cancelUrl } = req.body as StripeCheckoutSessionParams;
    if (!orderId || !successUrl || !cancelUrl) {
      res.status(400).json({ error: "orderId, successUrl, cancelUrl required" });
      return;
    }

    const convex = new ConvexHttpClient(process.env.VITE_CONVEX_URL!);

    // Validate orderId format before using it
    if (!orderId || typeof orderId !== "string") {
      res.status(400).json({ error: "Invalid orderId format" });
      return;
    }

    // Validate and convert orderId to Convex Id type
    if (typeof orderId !== "string") {
      res.status(400).json({ error: "Invalid orderId format" });
      return;
    }
    const convexOrderId = orderId as Id<"orders">;

    // Use proper Convex API with type safety
    const orderData = (await (
      convex.query as (api: string, args: Record<string, unknown>) => Promise<unknown>
    )("orders:getOrderWithRelations", {
      orderId: convexOrderId,
    })) as {
      order?: { currency?: string; [key: string]: unknown };
      items?: Array<{
        title?: string;
        unitPrice?: number;
        totalPrice?: number;
        qty?: number;
        [key: string]: unknown;
      }>;
    };

    if (!orderData?.order) {
      res.status(404).json({ error: "Order not found" });
      return;
    }

    const { order, items } = orderData;

    const lineItems = (items || []).map(it => ({
      price_data: {
        currency: (order.currency || "usd").toLowerCase(),
        product_data: { name: it.title || "Unknown Item" },
        unit_amount: Number(it.unitPrice || it.totalPrice || 0) || 0,
      },
      quantity: Number(it.qty || 1),
    }));

    const session = await stripeClient.checkout.sessions.create(
      {
        mode: "payment",
        line_items: lineItems,
        success_url: successUrl.replace("{CHECKOUT_SESSION_ID}", "{CHECKOUT_SESSION_ID}"),
        cancel_url: cancelUrl,
        metadata: { orderId },
      },
      {
        idempotencyKey: `checkout_${orderId}`,
      }
    );

    const saveCheckoutSession = async (
      orderId: Id<"orders">,
      checkoutSessionId: string,
      paymentIntentId?: string
    ): Promise<unknown> => {
      return await (
        convex.mutation as (api: string, args: Record<string, unknown>) => Promise<unknown>
      )("orders:saveStripeCheckoutSession", {
        orderId,
        checkoutSessionId,
        paymentIntentId,
      });
    };
    await saveCheckoutSession(
      convexOrderId,
      session.id,
      typeof session.payment_intent === "string" ? session.payment_intent : undefined
    );

    res.json({ url: session.url, id: session.id });
  } catch (error: unknown) {
    handleRouteError(error, res, "Error creating checkout session");
  }
});

/**
 * Create payment intent for services (reservations, custom orders)
 * This route creates a Stripe payment intent that can be used with Stripe Elements
 */
const createPaymentIntent = async (req: Request, res: Response) => {
  try {
    const { amount, currency = "USD", metadata = {} } = req.body as CreatePaymentIntentRequest;

    if (!amount || amount <= 0) {
      res.status(400).json({ error: "Amount is required and must be greater than 0" });
      return;
    }

    // Create payment intent using the existing function
    const paymentIntent = await createStripePaymentIntent({
      amount: Math.round(amount * 100), // Convert to cents
      currency: currency.toLowerCase(),
      metadata: metadata as Record<string, string>,
    });

    const response: CreatePaymentIntentResponse = {
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
    };

    res.json(response);
  } catch (error: unknown) {
    handleRouteError(error, res, "Error creating payment intent");
  }
};

router.post("/create-payment-intent", createPaymentIntent);

/**
 * Get payment intent status
 * This route retrieves the current status of a payment intent
 */
router.get("/payment-intent/:id", async (req, res): Promise<void> => {
  try {
    const { id } = req.params;
    const paymentIntent = await stripeClient.paymentIntents.retrieve(id);

    res.json({
      status: paymentIntent.status,
      amount: paymentIntent.amount,
      currency: paymentIntent.currency,
      metadata: paymentIntent.metadata,
    });
  } catch (error: unknown) {
    handleRouteError(error, res, "Error retrieving payment intent");
  }
});

export default router;
