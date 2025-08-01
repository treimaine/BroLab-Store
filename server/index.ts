import { config } from 'dotenv';
import express, { NextFunction, type Request, Response } from "express";
import { choosePort } from './lib/cliPort';
import { parsePortFlags } from './lib/findFreePort';
import { registerRoutes } from "./routes";
import { log, serveStatic, setupVite } from "./vite";
import { initializeRLSSecurity, securityHeaders, rateLimit } from "./lib/rlsSecurity";


// Load environment variables from .env file
config();

const app = express();

// Initialize RLS Security on startup
const rlsInitialized = initializeRLSSecurity();
if (rlsInitialized) {
  console.log('✅ RLS Security initialized successfully');
} else {
  console.warn('⚠️ RLS Security not initialized - missing Supabase credentials');
}

// Apply security middleware
app.use(securityHeaders);
// Rate limiting only for API routes, not for static assets/frontend
app.use('/api', rateLimit(1000, 15)); // 1000 requests per 15 minutes for API only

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Serve attached assets
app.use('/attached_assets', express.static('attached_assets'));

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
    const server = await registerRoutes(app);

    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";
      res.status(status).json({ message });
      throw err;
    });

    if (app.get("env") === "development") {
      await setupVite(app, server);
    } else {
      serveStatic(app);
    }

    const { port: flagPort, auto, maxTries } = parsePortFlags();
    const envPort = process.env.PORT ? Number(process.env.PORT) : undefined;
    const basePort = flagPort || envPort || 5000;
    const port = await choosePort({
      base: basePort,
      maxTries: maxTries || 10,
      auto: !!auto,
      argv: process.argv,
      isTTY: !!process.stdin.isTTY,
      envPort
    });
    const serverInstance = app.listen(port, () => {
      if (port === basePort) {
        console.log(`API running at http://localhost:${port}`);
      } else {
        console.log(`Port ${basePort} in use, fallback to ${port} — API running at http://localhost:${port}`);
      }
    });
    serverInstance.on('error', (err: any) => {
      if (err.code === 'EADDRINUSE') {
        console.error(`\n❌ Port ${port} déjà utilisé (race condition). Un autre serveur est peut-être déjà lancé.`);
        process.exit(1);
      } else {
        throw err;
      }
    });
  })();
}
