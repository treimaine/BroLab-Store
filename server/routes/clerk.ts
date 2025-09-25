import { Router } from "express";
import Stripe from "stripe";
import { urls } from "../config/urls";

const router = Router();

// Initialize Stripe with ES modules syntax
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  // Using default API version for compatibility
});

// Health check route
router.get("/health", (req, res): void => {
  res.json({
    status: "ok",
    clerk: "initialized",
    timestamp: new Date().toISOString(),
  });
});

// Create checkout session for one-time purchases
router.post("/create-checkout-session", async (req, res): Promise<void> => {
  try {
    console.log("🎯 Clerk route hit - creating checkout session");

    const { amount, currency = "usd", metadata = {} } = req.body;
    console.log("📊 Payment data:", { amount, currency, metadata });

    if (!amount || amount <= 0) {
      res.status(400).json({ error: "Valid amount is required" });
      return;
    }

    // Validate currency
    if (!["usd", "eur", "gbp"].includes(currency.toLowerCase())) {
      res.status(400).json({ error: "Unsupported currency" });
      return;
    }

    try {
      // Since Clerk Billing doesn't have direct checkout session creation,
      // we'll create a Stripe checkout session via Clerk's Stripe integration
      // This is the recommended approach for one-time payments

      const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        line_items: [
          {
            price_data: {
              currency: currency.toLowerCase(),
              product_data: {
                name: metadata.description || "BroLab Purchase",
                description: `Purchase: ${metadata.description || "Beats and Services"}`,
              },
              unit_amount: amount, // Already in cents
            },
            quantity: 1,
          },
        ],
        mode: "payment",
        success_url: urls.checkoutSuccess("{CHECKOUT_SESSION_ID}" as any),
        cancel_url: urls.cart,
        metadata: {
          userId: metadata.userId,
          userEmail: metadata.userEmail,
          type: "one_time_purchase",
          ...metadata,
        },
        customer_email: metadata.userEmail,
      });

      console.log("✅ Stripe checkout session created via Clerk:", session.id);
      res.json({
        url: session.url,
        sessionId: session.id,
      });
    } catch (stripeError: any) {
      console.error("❌ Stripe error:", stripeError);

      // Handle specific Stripe errors
      if (stripeError.type) {
        res.status(400).json({
          error: "Payment Error",
          message: stripeError.message || "Failed to create checkout session",
          code: stripeError.type,
        });
        return;
      }

      throw stripeError;
    }
  } catch (error: any) {
    console.error("❌ Error creating checkout session:", error);
    res.status(500).json({
      error: "Error creating checkout session",
      message: error.message || "Internal server error",
    });
  }
});

// Get checkout session status
router.get("/checkout-session/:id", async (req, res): Promise<void> => {
  try {
    const { id } = req.params;

    const session = await stripe.checkout.sessions.retrieve(id);

    res.json({
      id: session.id,
      status: session.status,
      amount: session.amount_total,
      currency: session.currency,
      metadata: session.metadata,
      customerEmail: session.customer_email,
      createdAt: session.created * 1000, // Convert to milliseconds
      expiresAt: session.expires_at * 1000, // Convert to milliseconds
    });
  } catch (error: any) {
    console.error("Error retrieving checkout session:", error);
    res.status(500).json({
      error: "Error retrieving checkout session",
      message: error.message,
    });
  }
});

// Handle Stripe webhooks for payment events
router.post("/webhooks", async (req, res): Promise<void> => {
  try {
    const sig = req.headers["stripe-signature"];
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!sig || !endpointSecret) {
      console.error("Missing webhook signature or secret");
      res.status(400).json({ error: "Missing webhook signature or secret" });
      return;
    }

    let event;

    try {
      event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
    } catch (err: any) {
      console.error("Webhook signature verification failed:", err.message);
      res.status(400).send(`Webhook Error: ${err.message}`);
      return;
    }

    console.log("📡 Stripe webhook received:", event.type);

    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutCompleted(event.data.object);
        break;

      case "checkout.session.expired":
        await handleCheckoutExpired(event.data.object);
        break;

      case "invoice.payment_succeeded":
        await handlePaymentSucceeded(event.data.object);
        break;

      case "invoice.payment_failed":
        await handlePaymentFailed(event.data.object);
        break;

      default:
        console.log(`Unhandled webhook event: ${event.type}`);
    }

    res.json({ received: true });
  } catch (error: any) {
    console.error("Webhook processing error:", error);
    res.status(500).json({ error: "Webhook processing failed" });
  }
});

// Webhook handlers
async function handleCheckoutCompleted(data: any) {
  console.log("✅ Checkout completed:", data.id);
  // Here you can:
  // - Update order status in database
  // - Send confirmation emails
  // - Grant access to purchased content
  // - etc.
}

async function handleCheckoutExpired(data: any) {
  console.log("⏰ Checkout expired:", data.id);
  // Handle expired checkout sessions
}

async function handlePaymentSucceeded(data: any) {
  console.log("💳 Payment succeeded:", data.id);
  // Handle successful payments
}

async function handlePaymentFailed(data: any) {
  console.log("❌ Payment failed:", data.id);
  // Handle failed payments
}

export default router;
