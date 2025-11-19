import express, { Request } from "express";
import { registerAuthRoutes, setupAuth } from "./auth";
import { env } from "./lib/env";
import { logger } from "./lib/logger";
import { setupSecurityMiddleware } from "./middleware/security";
import activityRouter from "./routes/activity";
import avatarRouter from "./routes/avatar";
import categoriesRouter from "./routes/categories";
import clerkRouter from "./routes/clerk";
import clerkBillingRouter from "./routes/clerk-billing";
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
import syncRouter from "./routes/sync";
import uploadsRouter from "./routes/uploads";
import wishlistRouter from "./routes/wishlist";
import wooRouter from "./routes/woo";
import wpRouter from "./routes/wp";

const app = express();

// Security middleware - MUST be first (helmet, compression, rate limiting, body limits)
setupSecurityMiddleware(app);

// Debug structured env log (without secrets)
logger.info("Server starting", {
  nodeEnv: env.NODE_ENV,
  convexUrl: env.VITE_CONVEX_URL,
  clerkConfigured: Boolean(env.VITE_CLERK_PUBLISHABLE_KEY) && Boolean(env.CLERK_SECRET_KEY),
  flags: env.flags,
});

// Request ID middleware
app.use((req: Request & { requestId?: string }, _res, next) => {
  req.requestId = (req.headers["x-request-id"] as string) || `req_${Date.now()}`;
  next();
});

// Authentication configuration (includes Clerk middleware)
setupAuth(app);
registerAuthRoutes(app);

// Cache monitoring middleware
app.use((_req, res, next) => {
  res.on("finish", () => {
    // Cache metrics monitoring can be added here if needed
  });

  next();
});

// API Routes
app.use("/api/activity", activityRouter);
app.use("/api/avatar", avatarRouter);
app.use("/api/downloads", downloadsRouter);
app.use("/api/email", emailRouter);
app.use("/api/monitoring", monitoringRouter);
app.use("/api/opengraph", openGraphRouter);
app.use("/api/orders", ordersRouter);
app.use("/api/payment/paypal", paypalRouter);
app.use("/api/payment/stripe", stripeRouter);
app.use("/api/clerk", clerkRouter);
app.use("/api/payments", paymentsRouter);

// Clerk Billing webhook - handles subscription and invoice events
app.use("/api/webhooks/clerk-billing", clerkBillingRouter);

app.use("/api/schema", schemaRouter);
app.use("/api/security", securityRouter);
app.use("/api/service-orders", serviceOrdersRouter);
app.use("/api/storage", storageRouter);
app.use("/api/uploads", uploadsRouter);
app.use("/api/wishlist", wishlistRouter);
app.use("/api/woo", wooRouter);
app.use("/api/wp", wpRouter);
app.use("/api/sync", syncRouter);
app.use("/api/categories", categoriesRouter);
app.use("/api/reservations", reservationsRouter);

// WordPress and WooCommerce routes - consolidated to single canonical path
// Primary route: /api/woocommerce (canonical)
app.use("/api/woocommerce", wooRouter);

// Legacy redirects for backward compatibility
app.use("/api/woo", (req, res) => {
  const newPath = req.path.replace(/^\//, "/api/woocommerce/");
  res.redirect(301, newPath + (req.url.includes("?") ? req.url.slice(req.url.indexOf("?")) : ""));
});
app.use("/api/products", (req, res) => {
  const newPath = req.path.replace(/^\//, "/api/woocommerce/");
  res.redirect(301, newPath + (req.url.includes("?") ? req.url.slice(req.url.indexOf("?")) : ""));
});

// Sitemap and other routes
app.use("/", sitemapRouter);

// Load TestSprite compatibility endpoints in development/test environments
if (env.NODE_ENV === "development" || env.NODE_ENV === "test") {
  const testSpriteModule = await import("./routes/testSprite");
  app.use(testSpriteModule.default);
  logger.info("TestSprite compatibility endpoints loaded");
}

export { app };
