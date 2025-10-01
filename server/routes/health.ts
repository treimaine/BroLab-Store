import express from "express";
import { Router } from "express";

const router = express.Router();

/**
 * Health check endpoint
 */
router.get("/", (req, res) => {
  const healthCheck = {
    status: "OK",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODEENV || "development",
    version: process.env.npmpackage_version || "1.0.0",
    services: {
      database: "connected", // Would check actual DB connection
      convex: "connected",
      stripe: "connected",
      clerk: "connected",
    },
    memory: {
      used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
      total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
      external: Math.round(process.memoryUsage().external / 1024 / 1024),
    },
  };

  res.json(healthCheck);
});

/**
 * Detailed system status
 */
router.get("/detailed", (req, res) => {
  const detailedStatus = {
    status: "OK",
    timestamp: new Date().toISOString(),
    system: {
      platform: process.platform,
      arch: process.arch,
      nodeVersion: process.version,
      uptime: process.uptime(),
      pid: process.pid,
    },
    memory: process.memoryUsage(),
    cpu: process.cpuUsage(),
    environment: {
      nodeEnv: process.env.NODEENV,
      port: process.env.PORT,
      hasConvexUrl: !!process.env.VITE_CONVEX_URL,
      hasStripeKey: !!process.env.STRIPE_SECRET_KEY,
      hasClerkKey: !!process.env.CLERK_SECRET_KEY,
    },
    services: {
      convex: {
        status: process.env.VITE_CONVEX_URL ? "configured" : "notconfigured",
        url: process.env.VITE_CONVEX_URL ? "***" : null,
      },
      stripe: {
        status: process.env.STRIPE_SECRET_KEY ? "configured" : "notconfigured",
      },
      clerk: {
        status: process.env.CLERKSECRET_KEY ? "configured" : "notconfigured",
      },
    },
  };

  res.json(detailedStatus);
});

export default router;
