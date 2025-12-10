import { config } from "dotenv";
import express, { NextFunction, Response, type Request } from "express";
import { app } from "./app";
import { choosePort } from "./lib/cliPort";
import { enforcePaymentSecrets, env } from "./lib/env";
import { parsePortFlags } from "./lib/findFreePort";
import { logger } from "./lib/logger";
// RLS Security removed - using Convex for security
import { log, serveStatic, setupVite } from "./vite";

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

// Security middleware removed - using Convex for security
// Rate limiting only for API routes, not for static assets/frontend
app.use("/api", (req, res, next): void => {
  // Simple rate limiting - 1000 requests per 15 minutes for API only
  const clientIp = req.ip || req.connection.remoteAddress;
  const now = Date.now();
  const windowMs = 15 * 60 * 1000; // 15 minutes
  const maxRequests = 1000;

  // Simple in-memory rate limiting (for development)
  interface GlobalWithRateLimit {
    rateLimitStore?: Map<string, number>;
  }

  const globalWithRateLimit = globalThis as typeof globalThis & GlobalWithRateLimit;

  if (!globalWithRateLimit.rateLimitStore) {
    globalWithRateLimit.rateLimitStore = new Map();
  }

  const key = `${clientIp}-${Math.floor(now / windowMs)}`;
  const currentCount = globalWithRateLimit.rateLimitStore.get(key) || 0;

  if (currentCount >= maxRequests) {
    res.status(429).json({ error: "Too many requests" });
    return;
  }

  globalWithRateLimit.rateLimitStore.set(key, currentCount + 1);
  next();
});

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

export { app }; // <-- exporter l'app configurée

// Démarrage du serveur uniquement si ce fichier est exécuté directement (compatible ESM)
if (import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  (async () => {
    const { createServer } = await import("http");
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
          `\n❌ Port ${port} déjà utilisé (race condition). Un autre serveur est peut-être déjà lancé.`
        );
        process.exit(1);
      } else {
        throw err;
      }
    });
  })();
}
