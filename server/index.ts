import { config } from "dotenv";
import express, { NextFunction, type Request, Response } from "express";
import { app } from "./app";
import { choosePort } from "./lib/cliPort";
import { env } from "./lib/env";
import { parsePortFlags } from "./lib/findFreePort";
import { logger } from "./lib/logger";
// RLS Security removed - using Convex for security
import { log, serveStatic, setupVite } from "./vite";

// Load environment variables from .env file
config();

// Use the configured app from app.ts

// Security middleware removed - using Convex for security
// Rate limiting only for API routes, not for static assets/frontend
app.use("/api", (req, res, next) => {
  // Simple rate limiting - 1000 requests per 15 minutes for API only
  const clientIp = req.ip || req.connection.remoteAddress;
  const now = Date.now();
  const windowMs = 15 * 60 * 1000; // 15 minutes
  const maxRequests = 1000;

  // Simple in-memory rate limiting (for development)
  if (!(global as any).rateLimitStore) {
    (global as any).rateLimitStore = new Map();
  }

  const key = `${clientIp}-${Math.floor(now / windowMs)}`;
  const currentCount = (global as any).rateLimitStore.get(key) || 0;

  if (currentCount >= maxRequests) {
    return res.status(429).json({ error: "Too many requests" });
  }

  (global as any).rateLimitStore.set(key, currentCount + 1);
  next();
});

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Serve attached assets
app.use("/attached_assets", express.static("attached_assets"));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

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

    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";
      res.status(status).json({ message });
      throw err;
    });

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

    const serverInstance = server.listen(port, () => {
      logger.info("API running", { port, basePort, url: `http://localhost:${port}` });
    });
    serverInstance.on("error", (err: any) => {
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
