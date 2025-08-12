import { ClerkExpressWithAuth } from "@clerk/clerk-sdk-node";
import express from "express";
import { registerAuthRoutes, setupAuth } from "./auth";
import activityRouter from "./routes/activity";
import avatarRouter from "./routes/avatar";
import downloadsRouter from "./routes/downloads";
import emailRouter from "./routes/email";
import monitoringRouter from "./routes/monitoring";
import openGraphRouter from "./routes/openGraph";
import ordersRouter from "./routes/orders";
import paypalRouter from "./routes/paypal";
import reservationsRouter from "./routes/reservations";
import schemaRouter from "./routes/schema";
import securityRouter from "./routes/security";
import serviceOrdersRouter from "./routes/serviceOrders";
import sitemapRouter from "./routes/sitemap";
import storageRouter from "./routes/storage";
// import stripeWebhookRouter from "./routes/stripeWebhook"; // Removed - using Clerk for billing
// import subscriptionRouter from "./routes/subscription"; // Removed - using Clerk for billing
import syncRouter from "./routes/sync";
import uploadsRouter from "./routes/uploads";
import wishlistRouter from "./routes/wishlist";
import wooRouter from "./routes/woo";
import wpRouter from "./routes/wp";

const app = express();
app.use(express.json());

// Appliquer le middleware Clerk globalement AVANT les routes
app.use(ClerkExpressWithAuth());

setupAuth(app);
registerAuthRoutes(app);

// API Routes
app.use("/api/activity", activityRouter);
app.use("/api/avatar", avatarRouter);
app.use("/api/downloads", downloadsRouter);
app.use("/api/email", emailRouter);
app.use("/api/monitoring", monitoringRouter);
app.use("/api/opengraph", openGraphRouter);
app.use("/api/orders", ordersRouter);
app.use("/api/payment/paypal", paypalRouter);
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

export { app };
