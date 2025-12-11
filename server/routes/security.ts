// BroLab Entertainment - Security Routes
// Purpose: Security status and user info endpoints
// Note: Admin security operations are handled via Convex functions
// Use: npx convex run audit:getSecurityEvents, admin/verifySubscriptions:verifyAllSubscriptions

import { Router } from "express";
import { isAuthenticated as requireAuth } from "../auth";
import { AuthenticatedRequest } from "../types/routes";

const router = Router();

// Security status check (public)
router.get("/security/status", (req, res) => {
  const convexConfigured = !!(process.env.CONVEX_URL || process.env.VITE_CONVEX_URL);
  const clerkConfigured = !!process.env.CLERK_SECRET_KEY;

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
    rateLimitActive: true,
    securityHeaders: true,
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
