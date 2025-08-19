import { Router } from "express";

// Use real Stripe API with your configured keys
let stripe: any = null;

// Since package installation failed, we'll use curl/fetch to call Stripe API directly
const createStripePaymentIntent = async (params: any) => {
  const response = await fetch('https://api.stripe.com/v1/payment_intents', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.STRIPE_SECRET_KEY}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      amount: params.amount.toString(),
      currency: params.currency,
      'automatic_payment_methods[enabled]': 'true',
      ...(params.metadata && Object.keys(params.metadata).reduce((acc, key) => {
        acc[`metadata[${key}]`] = params.metadata[key];
        return acc;
      }, {} as any))
    }).toString()
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Stripe API Error: ${error.error?.message || 'Unknown error'}`);
  }

  return await response.json();
};

const retrieveStripePaymentIntent = async (id: string) => {
  const response = await fetch(`https://api.stripe.com/v1/payment_intents/${id}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${process.env.STRIPE_SECRET_KEY}`,
    }
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Stripe API Error: ${error.error?.message || 'Unknown error'}`);
  }

  return await response.json();
};

// Initialize Stripe service object with direct API calls
if (process.env.STRIPE_SECRET_KEY) {
  stripe = {
    paymentIntents: {
      create: createStripePaymentIntent,
      retrieve: retrieveStripePaymentIntent
    }
  };
  console.log("✅ Real Stripe API initialized with direct HTTP calls");
} else {
  console.error('❌ Missing required Stripe secret: STRIPE_SECRET_KEY');
  throw new Error('STRIPE_SECRET_KEY environment variable is required');
}

// Stripe instance is created above

const router = Router();

// Health check route
router.get("/health", (req, res) => {
  res.json({ 
    status: "ok", 
    stripe: stripe ? "initialized" : "mock",
    timestamp: new Date().toISOString()
  });
});

// Create payment intent for one-time purchases
router.post("/create-payment-intent", async (req, res) => {
  try {
    console.log("🎯 Stripe route hit - creating payment intent");
    
    if (!stripe) {
      console.error("❌ Stripe not initialized");
      return res.status(500).json({ 
        error: "Payment system not available",
        message: "Stripe not properly configured" 
      });
    }

    const { amount, currency = "usd", metadata = {} } = req.body;
    console.log("📊 Payment data:", { amount, currency, metadata });

    if (!amount || amount <= 0) {
      return res.status(400).json({ error: "Valid amount is required" });
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Convert to cents
      currency,
      metadata,
      automatic_payment_methods: {
        enabled: true,
      },
    });

    console.log("✅ Payment intent created:", paymentIntent.id);
    res.json({ 
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id
    });
  } catch (error: any) {
    console.error("❌ Error creating payment intent:", error);
    res.status(500).json({ 
      error: "Error creating payment intent", 
      message: error.message 
    });
  }
});

// Confirm payment and handle success
router.post("/confirm-payment", async (req, res) => {
  try {
    const { paymentIntentId } = req.body;

    if (!paymentIntentId) {
      return res.status(400).json({ error: "Payment intent ID is required" });
    }

    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    if (paymentIntent.status === "succeeded") {
      // Here you can handle post-payment logic like:
      // - Update order status in database
      // - Send confirmation emails
      // - Grant access to purchased content
      // - etc.

      res.json({ 
        success: true, 
        status: paymentIntent.status,
        metadata: paymentIntent.metadata
      });
    } else {
      res.json({ 
        success: false, 
        status: paymentIntent.status 
      });
    }
  } catch (error: any) {
    console.error("Error confirming payment:", error);
    res.status(500).json({ 
      error: "Error confirming payment", 
      message: error.message 
    });
  }
});

// Get payment intent status
router.get("/payment-intent/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const paymentIntent = await stripe.paymentIntents.retrieve(id);
    
    res.json({
      status: paymentIntent.status,
      amount: paymentIntent.amount,
      currency: paymentIntent.currency,
      metadata: paymentIntent.metadata
    });
  } catch (error: any) {
    console.error("Error retrieving payment intent:", error);
    res.status(500).json({ 
      error: "Error retrieving payment intent", 
      message: error.message 
    });
  }
});

export default router;