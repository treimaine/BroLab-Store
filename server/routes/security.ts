// BroLab Entertainment - Security Routes
// Purpose: Security status and user info endpoints
// Note: Admin security operations are handled via Convex functions
// Use: npx convex run audit:getSecurityEvents, admin/verifySubscriptions:verifyAllSubscriptions

import { Router } from "express";
import { isAuthenticated as requireAuth } from "../auth";
import { getWebhookSecurityService } from "../services/WebhookSecurityService";
import { AuthenticatedRequest } from "../types/routes";

const router = Router();

/**
 * Rate limiter configurations (mirrors middleware/security.ts)
 * These values reflect the actual middleware configuration
 */
const RATE_LIMIT_CONFIG = {
  api: { windowMs: 15 * 60 * 1000, maxRequests: 1000 },
  auth: { windowMs: 15 * 60 * 1000, maxRequests: 20 },
  payment: { windowMs: 15 * 60 * 1000, maxRequests: 50 },
  download: { windowMs: 60 * 60 * 1000, maxRequests: 100 },
  upload: { windowMs: 60 * 60 * 1000, maxRequests: 20 },
} as const;

// Security status check (public)
router.get("/security/status", (req, res) => {
  const convexConfigured = !!(process.env.CONVEX_URL || process.env.VITE_CONVEX_URL);
  const clerkConfigured = !!process.env.CLERK_SECRET_KEY;

  // Get real-time webhook security stats
  const webhookSecurityService = getWebhookSecurityService();
  const cacheStats = webhookSecurityService.getCacheStats();
  const securityConfig = webhookSecurityService.getConfig();

  const status = {
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development",
    database: {
      provider: "convex",
      configured: convexConfigured,
      userIsolation: true, // All Convex queries filter by userId/clerkId
    },
    authentication: {
      provider: "clerk",
      enabled: clerkConfigured,
      sessionBased: true,
    },
    rateLimit: {
      active: true,
      configuration: RATE_LIMIT_CONFIG,
      description: "express-rate-limit middleware active on all API endpoints",
    },
    securityHeaders: {
      helmet: true,
      csp: true,
      compression: true,
      bodySizeLimits: true,
      corsConfigured: true,
    },
    webhookSecurity: {
      idempotencyCacheSize: cacheStats.idempotencyCacheSize,
      ipFailureCacheSize: cacheStats.ipFailureCacheSize,
      maxTimestampAge: securityConfig.maxTimestampAge,
      failureThreshold: securityConfig.failureThreshold,
      failureTrackingWindowMs: securityConfig.failureTrackingWindow,
    },
  };

  res.json(status);
});

// User security info (authenticated users only)
// 🔒 SECURITY: Authentication required
router.get("/security/user-info", requireAuth, async (req: AuthenticatedRequest, res) => {
  const userInfo = {
    userId: req.user?.id,
    username: req.user?.username,
    email: req.user?.email,
    permissions: {
      canAccessDashboard: true,
      canDownloadBeats: true,
      canCreateOrders: true,
    },
    securityLevel: "authenticated",
  };

  res.json(userInfo);
});

export default router;
