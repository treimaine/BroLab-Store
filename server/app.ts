import express from "express";
import { registerAuthRoutes, setupAuth } from "./auth";
import { env } from "./lib/env";
import { logger } from "./lib/logger";
import { requestIdMiddleware } from "./middleware/requestId";
import {
  apiRateLimiter,
  authRateLimiter,
  bodySizeLimits,
  compressionMiddleware,
  downloadRateLimiter,
  helmetMiddleware,
  paymentRateLimiter,
} from "./middleware/security";
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

// Security middleware - helmet, compression, body-size limits
app.use(helmetMiddleware);
app.use(compressionMiddleware);
app.use(bodySizeLimits);
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: false, limit: "10mb" }));

// Server startup log (no sensitive data)
logger.info("Server starting", {
  nodeEnv: env.NODE_ENV,
  clerkConfigured: Boolean(env.VITE_CLERK_PUBLISHABLE_KEY) && Boolean(env.CLERK_SECRET_KEY),
});

// Request ID middleware - generates cryptographically secure UUIDs
app.use(requestIdMiddleware);

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

// API Routes with rate limiting
app.use("/api/activity", apiRateLimiter, activityRouter);
app.use("/api/avatar", apiRateLimiter, avatarRouter);
app.use("/api/downloads", downloadRateLimiter, downloadsRouter);
app.use("/api/email", authRateLimiter, emailRouter);
app.use("/api/monitoring", monitoringRouter); // No rate limit for monitoring
app.use("/api/opengraph", apiRateLimiter, openGraphRouter);
app.use("/api/orders", apiRateLimiter, ordersRouter);
app.use("/api/payment/paypal", paymentRateLimiter, paypalRouter);
app.use("/api/payment/stripe", paymentRateLimiter, stripeRouter);
app.use("/api/clerk", apiRateLimiter, clerkRouter); // Use general API limiter (1000/15min) for Clerk
app.use("/api/payments", paymentRateLimiter, paymentsRouter);

// Clerk Billing webhook - handles subscription and invoice events (no rate limit for webhooks)
app.use("/api/webhooks/clerk-billing", clerkBillingRouter);

app.use("/api/schema", apiRateLimiter, schemaRouter);
app.use("/api/security", apiRateLimiter, securityRouter);
app.use("/api/service-orders", apiRateLimiter, serviceOrdersRouter);
app.use("/api/storage", apiRateLimiter, storageRouter);
app.use("/api/uploads", apiRateLimiter, uploadsRouter);
app.use("/api/wishlist", apiRateLimiter, wishlistRouter);
app.use("/api/wp", apiRateLimiter, wpRouter);
app.use("/api/sync", apiRateLimiter, syncRouter);
app.use("/api/categories", apiRateLimiter, categoriesRouter);
app.use("/api/reservations", apiRateLimiter, reservationsRouter);

// WooCommerce routes - canonical path: /api/woocommerce
app.use("/api/woocommerce", apiRateLimiter, wooRouter);

// Sitemap and other routes
app.use("/", sitemapRouter);

// Load TestSprite compatibility endpoints in development/test environments
if (env.NODE_ENV === "development" || env.NODE_ENV === "test") {
  const testSpriteModule = await import("./routes/testSprite");
  app.use(testSpriteModule.default);
  logger.info("TestSprite compatibility endpoints loaded");
}

export { app };
