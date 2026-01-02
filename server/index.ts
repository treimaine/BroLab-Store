import { config } from "dotenv";
import express, { NextFunction, Response, type Request } from "express";
import { choosePort } from "./lib/cliPort";
import { enforcePaymentSecrets, env } from "./lib/env";
import { parsePortFlags } from "./lib/findFreePort";
import { logger } from "./lib/logger";
// RLS Security removed - using Convex for security
import { log, serveStatic, setupVite } from "./vite";

// Re-export app using export...from syntax (SonarQube S7763)
export { app } from "./app";
// Import for local usage
import { app } from "./app";

// Load environment variables from .env file
config();

// Validate payment configuration early (fail fast in production)
try {
  enforcePaymentSecrets();
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}

// Use the configured app from app.ts

// Convex-based distributed rate limiting for API routes
// Replaces in-memory Map with persistent storage that works across instances
import { globalRateLimiter } from "./middleware/rateLimitMiddleware";

app.use("/api", globalRateLimiter);

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Serve attached assets
app.use("/attached_assets", express.static("attached_assets"));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, unknown> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

// Server startup only when this file is executed directly (ESM compatible)
if (import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  const { createServer } = await import("node:http");
  const server = createServer(app);

  // Routes are already registered in app.ts

  app.use(
    (
      err: Error & { status?: number; statusCode?: number },
      _req: Request,
      res: Response,
      _next: NextFunction
    ) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";
      res.status(status).json({ message });
      throw err;
    }
  );

  const { port: flagPort, auto, maxTries } = parsePortFlags();
  const envPort = env.PORT ? Number(env.PORT) : undefined;
  const basePort = flagPort || envPort || 5000;
  const port = await choosePort({
    base: basePort,
    maxTries: maxTries || 10,
    auto: !!auto,
    argv: process.argv,
    isTTY: !!process.stdin.isTTY,
    envPort,
  });

  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const serverInstance = server.listen(port, async () => {
    logger.info("API running", { port, basePort, url: `http://localhost:${port}` });

    // Warm cache on server startup
    try {
      // Import cache warming service dynamically to avoid circular dependencies
      const { warmingUtils } = await import("./services/cacheWarmingService");
      await warmingUtils.warmOnStartup();
      logger.info("Cache warming completed on startup");
    } catch (error) {
      logger.warn("Cache warming failed on startup", {
        error: error instanceof Error ? error.message : error,
      });
    }
  });

  serverInstance.on("error", (err: Error & { code?: string }) => {
    if (err.code === "EADDRINUSE") {
      console.error(
        `\n❌ Port ${port} already in use (race condition). Another server may already be running.`
      );
      process.exit(1);
    } else {
      throw err;
    }
  });
}
