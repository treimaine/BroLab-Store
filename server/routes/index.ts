import { Express } from "express";
import { registerAuthRoutes, setupAuth } from "../auth";
import activityRouter from "./activity";
import avatarRouter from "./avatar";
import downloadsRouter from "./downloads";
import emailRouter from "./email";
import monitoringRouter from "./monitoring";
import openGraphRouter from "./openGraph";
import ordersRouter from "./orders";
import paypalRouter from "./paypal";
import reservationsRouter from "./reservations";
import schemaRouter from "./schema";
import securityRouter from "./security";
import serviceOrdersRouter from "./serviceOrders";
import sitemapRouter from "./sitemap";
import storageRouter from "./storage";
import uploadsRouter from "./uploads";
import wishlistRouter from "./wishlist";
import wooRouter from "./woo";
import wpRouter from "./wp";
// import subscriptionRouter from './subscription'; // Removed - using Clerk for billing

export async function registerRoutes(app: Express) {
  // Setup authentication
  setupAuth(app);
  registerAuthRoutes(app);

  // Register API routes
  // app.use('/api/subscription', subscriptionRouter); // Removed - using Clerk for billing
  app.use("/api/downloads", downloadsRouter);
  app.use("/api/service-orders", serviceOrdersRouter);
  app.use("/api/orders", ordersRouter);
  app.use("/api/activity", activityRouter);
  app.use("/api/opengraph", openGraphRouter);
  app.use("/api/reservations", reservationsRouter);
  app.use("/api/avatar", avatarRouter);
  app.use("/api/schema", schemaRouter);
  app.use("/api/email", emailRouter);
  app.use("/api/monitoring", monitoringRouter);
  app.use("/api/payment/paypal", paypalRouter);
  app.use("/api/security", securityRouter);
  app.use("/api/storage", storageRouter);
  // app.use('/api/stripe/webhook', stripeWebhookRouter); // Removed - using Clerk for billing
  app.use("/api/uploads", uploadsRouter);
  app.use("/api/wishlist", wishlistRouter);
  app.use("/api/woo", wooRouter);
  app.use("/api/wp", wpRouter);

  // WordPress and WooCommerce routes
  app.use("/api/products", wooRouter);
  app.use("/api/woocommerce", wooRouter);

  // Sitemap and other routes
  app.use("/", sitemapRouter);
}
