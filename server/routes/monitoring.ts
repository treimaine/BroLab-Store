import { getAuth } from "@clerk/express";
import { Router } from "express";
import { ErrorMessages } from "../../shared/constants/ErrorMessages";
import monitoring from "../lib/monitoring";
import { apiRateLimit } from "../middleware/rateLimiter";
import { handleRouteError } from "../types/routes";
import { isAdmin } from "../utils/authz";

const router = Router();

// Health check endpoint
router.get("/health", apiRateLimit, async (req, res): Promise<void> => {
  try {
    const healthChecks = await monitoring.performHealthCheck();
    const allHealthy = healthChecks.every(check => check.status === "healthy");

    res.status(allHealthy ? 200 : 503).json({
      status: allHealthy ? "healthy" : "degraded",
      checks: healthChecks,
      timestamp: new Date().toISOString(),
    });
  } catch (error: unknown) {
    handleRouteError(error, res, "Health check failed");
  }
});

// Auth diagnostic endpoint - helps debug Clerk authentication issues
router.get("/auth-check", async (req, res): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    const hasAuthHeader = !!authHeader;
    const hasBearerToken = authHeader?.startsWith("Bearer ") ?? false;

    // Check Clerk auth
    let clerkAuth = null;
    try {
      clerkAuth = getAuth(req);
    } catch (e) {
      clerkAuth = { error: e instanceof Error ? e.message : "Unknown error" };
    }

    // Environment check (no secrets exposed)
    const envCheck = {
      NODE_ENV: process.env.NODE_ENV,
      hasClerkSecretKey: !!process.env.CLERK_SECRET_KEY,
      clerkSecretKeyPrefix: process.env.CLERK_SECRET_KEY?.substring(0, 8) || "not set",
      hasClerkPublishableKey: !!process.env.VITE_CLERK_PUBLISHABLE_KEY,
      clerkPublishableKeyPrefix:
        process.env.VITE_CLERK_PUBLISHABLE_KEY?.substring(0, 8) || "not set",
      hasConvexUrl: !!process.env.VITE_CONVEX_URL,
    };

    res.json({
      timestamp: new Date().toISOString(),
      request: {
        hasAuthHeader,
        hasBearerToken,
        tokenLength: hasBearerToken ? authHeader!.length - 7 : 0,
      },
      clerkAuth: {
        userId: clerkAuth?.userId || null,
        sessionId: clerkAuth?.sessionId || null,
        hasSessionClaims: !!clerkAuth?.sessionClaims,
        error: (clerkAuth as { error?: string })?.error || null,
      },
      environment: envCheck,
    });
  } catch (error: unknown) {
    handleRouteError(error, res, "Auth check failed");
  }
});

// System metrics endpoint (admin only)
router.get("/metrics", apiRateLimit, async (req, res): Promise<void> => {
  try {
    if (!req.isAuthenticated()) {
      res.status(401).json({ error: ErrorMessages.AUTH.UNAUTHORIZED });
      return;
    }

    // Simple admin check - in production, use proper role-based access
    const user = req.user!;

    if (!isAdmin(user)) {
      res.status(403).json({ error: ErrorMessages.AUTH.FORBIDDEN });
      return;
    }

    const { metrics, healthChecks } = await monitoring.collectPerformanceMetrics();

    res.json({
      system: metrics,
      services: healthChecks,
      timestamp: new Date().toISOString(),
    });
  } catch (error: unknown) {
    handleRouteError(error, res, "Failed to collect metrics");
  }
});

// Quick status endpoint (lightweight)
router.get("/status", async (req, res): Promise<void> => {
  try {
    const metrics = monitoring.getSystemMetrics();

    res.json({
      status: "online",
      uptime: metrics.uptime,
      memory: {
        used: Math.round(metrics.memoryUsage.heapUsed / 1024 / 1024),
        total: Math.round(metrics.memoryUsage.rss / 1024 / 1024),
      },
      requestsPerMinute: metrics.requestsPerMinute,
      errorRate: Math.round(metrics.errorRate * 100) / 100,
      timestamp: new Date().toISOString(),
    });
  } catch (error: unknown) {
    handleRouteError(error, res, "Failed to get system status");
  }
});

// Manual health check trigger (admin only)
router.post("/health/check", apiRateLimit, async (req, res): Promise<void> => {
  try {
    if (!req.isAuthenticated()) {
      res.status(401).json({ error: ErrorMessages.AUTH.UNAUTHORIZED });
      return;
    }

    const user = req.user!;

    if (!isAdmin(user)) {
      res.status(403).json({ error: ErrorMessages.AUTH.FORBIDDEN });
      return;
    }

    const healthChecks = await monitoring.performHealthCheck();

    await monitoring.logSystemEvent({
      type: "info",
      service: "monitoring",
      message: "Manual health check triggered",
      details: {
        triggeredBy: user.username,
        results: healthChecks,
      },
    });

    res.json({
      message: "Health check completed",
      results: healthChecks,
      timestamp: new Date().toISOString(),
    });
  } catch (error: unknown) {
    handleRouteError(error, res, "Manual health check failed");
  }
});

export default router;
