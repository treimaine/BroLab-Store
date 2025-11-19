import { Router } from "express";
import { ErrorMessages } from "../../shared/constants/ErrorMessages";
import monitoring from "../lib/monitoring";
import { apiRateLimit } from "../middleware/rateLimiter";
import { handleRouteError } from "../types/routes";

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

// System metrics endpoint (admin only)
router.get("/metrics", apiRateLimit, async (req, res): Promise<void> => {
  try {
    if (!req.isAuthenticated()) {
      res.status(401).json({ error: ErrorMessages.AUTH.UNAUTHORIZED });
      return;
    }

    // Simple admin check - in production, use proper role-based access
    const user = req.user!;
    const isAdmin = user.email === "admin@brolabentertainment.com" || user.username === "admin";

    if (!isAdmin) {
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
    const isAdmin = user.email === "admin@brolabentertainment.com" || user.username === "admin";

    if (!isAdmin) {
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
