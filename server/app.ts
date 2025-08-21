import express from "express";
import { registerAuthRoutes, setupAuth } from "./auth";
import activityRouter from "./routes/activity";
import avatarRouter from "./routes/avatar";
// Clerk router removed - using native components
import clerkRouter from "./routes/clerk";
import downloadsRouter from "./routes/downloads";
import emailRouter from "./routes/email";
import monitoringRouter from "./routes/monitoring";
import openGraphRouter from "./routes/openGraph";
import ordersRouter from "./routes/orders";
import paymentsRouter from "./routes/payments";
import paypalRouter from "./routes/paypal";
import reservationsRouter from "./routes/reservations";
import schemaRouter from "./routes/schema";
import securityRouter from "./routes/security";
import serviceOrdersRouter from "./routes/serviceOrders";
import sitemapRouter from "./routes/sitemap";
import storageRouter from "./routes/storage";
import stripeRouter from "./routes/stripe";
// import stripeWebhookRouter from "./routes/stripeWebhook"; // Removed - using Clerk for billing
// import subscriptionRouter from "./routes/subscription"; // Removed - using Clerk for billing
import syncRouter from "./routes/sync";
import uploadsRouter from "./routes/uploads";
import wishlistRouter from "./routes/wishlist";
import wooRouter from "./routes/woo";
import wpRouter from "./routes/wp";

const app = express();
app.use(express.json());

// Debug: Vérifier les variables d'environnement Clerk
console.log("🔧 Clerk Configuration:");
console.log(
  "  - VITE_CLERK_PUBLISHABLE_KEY:",
  process.env.VITE_CLERK_PUBLISHABLE_KEY ? "✅ Configuré" : "❌ Manquant"
);
console.log("  - CLERK_SECRET_KEY:", process.env.CLERK_SECRET_KEY ? "✅ Configuré" : "❌ Manquant");
console.log("  - NODE_ENV:", process.env.NODE_ENV);

// Configuration de l'authentification (inclut le middleware Clerk)
setupAuth(app); // Middleware Clerk réactivé
registerAuthRoutes(app);

// API Routes
app.use("/api/activity", activityRouter);
app.use("/api/avatar", avatarRouter);
// app.use("/api/clerk", clerkRouter); // Removed - using native Clerk components
app.use("/api/downloads", downloadsRouter);
app.use("/api/email", emailRouter);
app.use("/api/monitoring", monitoringRouter);
app.use("/api/opengraph", openGraphRouter);
app.use("/api/orders", ordersRouter);
app.use("/api/payment/paypal", paypalRouter);
app.use("/api/payment/stripe", stripeRouter);
app.use("/api/clerk", clerkRouter);
app.use("/api/payments", paymentsRouter);
app.use("/api/reservations", reservationsRouter);
app.use("/api/schema", schemaRouter);
app.use("/api/security", securityRouter);
app.use("/api/service-orders", serviceOrdersRouter);
app.use("/api/storage", storageRouter);
// app.use("/api/stripe/webhook", stripeWebhookRouter); // Removed - using Clerk for billing
// app.use("/api/subscription", subscriptionRouter); // Removed - using Clerk for billing
app.use("/api/uploads", uploadsRouter);
app.use("/api/wishlist", wishlistRouter);
app.use("/api/woo", wooRouter);
app.use("/api/wp", wpRouter);
app.use("/api/sync", syncRouter);

// WordPress and WooCommerce routes
app.use("/api/products", wooRouter);
app.use("/api/woo", wooRouter);
app.use("/api/woocommerce", wooRouter);

// Sitemap and other routes
app.use("/", sitemapRouter);

// Test endpoint pour diagnostiquer l'authentification
app.get("/api/test-auth", (req: any, res) => {
  console.log("🔍 Test auth endpoint called");
  console.log("🔍 req.auth:", req.auth);
  console.log("🔍 req.user:", req.user);
  console.log("🔍 req.headers.authorization:", req.headers.authorization);

  res.json({
    auth: req.auth,
    user: req.user,
    headers: {
      authorization: req.headers.authorization,
      "x-clerk-auth-status": req.headers["x-clerk-auth-status"],
      "x-clerk-auth-reason": req.headers["x-clerk-auth-reason"],
    },
  });
});

// Test endpoint PayPal direct sans middleware
app.post("/api/paypal-test/create-order", (req: any, res) => {
  try {
    console.log("🧪 PayPal test endpoint called directly");
    console.log("🧪 Request body:", req.body);

    const { serviceType, amount, currency, description, reservationId, customerEmail } = req.body;

    // Validation simple
    if (!serviceType || !amount || !currency || !description || !reservationId || !customerEmail) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields",
      });
    }

    // Simulation PayPal
    const orderId = `PAYPAL_TEST_${Date.now()}`;
    const paymentUrl = `https://www.sandbox.paypal.com/checkoutnow?token=${orderId}`;

    console.log("✅ PayPal test order created:", orderId);

    res.json({
      success: true,
      paymentUrl,
      orderId,
      test: true,
    });
  } catch (error) {
    console.error("❌ PayPal test failed:", error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Test failed",
    });
  }
});

// 🚀 NOUVEAU: Endpoint PayPal de test complètement séparé
app.post("/api/paypal-direct/create-order", (req: any, res) => {
  try {
    console.log("🚀 PayPal direct endpoint called - NO MIDDLEWARE");
    console.log("📦 Request body:", req.body);

    const { serviceType, amount, currency, description, reservationId, customerEmail } = req.body;

    // Validation simple
    if (!serviceType || !amount || !currency || !description || !reservationId || !customerEmail) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields",
      });
    }

    console.log("✅ Validation passed, creating PayPal order...");

    // Simulation PayPal avec plus de détails
    const orderId = `PAYPAL_DIRECT_${Date.now()}`;
    const paymentUrl = `https://www.sandbox.paypal.com/checkoutnow?token=${orderId}`;

    const response = {
      success: true,
      paymentUrl,
      orderId,
      amount: parseFloat(amount),
      currency: currency.toUpperCase(),
      serviceType,
      reservationId,
      customerEmail,
      timestamp: new Date().toISOString(),
      test: true,
      message: "PayPal order created successfully via direct endpoint",
    };

    console.log("🎯 PayPal direct order created:", response);

    res.json(response);
  } catch (error) {
    console.error("❌ PayPal direct endpoint failed:", error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Direct endpoint failed",
    });
  }
});

export { app };
