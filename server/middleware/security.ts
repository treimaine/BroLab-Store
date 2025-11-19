/**
 * Security Hardening Middleware
 *
 * Implements comprehensive security measures:
 * - Helmet for HTTP headers security
 * - Compression for response optimization
 * - Rate limiting for API protection
 * - Body size limits to prevent oversized payloads
 */

import compression from "compression";
import express, { Application, NextFunction, Request, Response } from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import { logger } from "../lib/logger";

/**
 * Configure Helmet with secure defaults
 * Protects against common web vulnerabilities
 */
export function setupHelmet(app: Application): void {
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://cdn.jsdelivr.net"],
          styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
          fontSrc: ["'self'", "https://fonts.gstatic.com"],
          imgSrc: ["'self'", "data:", "https:", "blob:"],
          connectSrc: ["'self'", "https:", "wss:"],
          mediaSrc: ["'self'", "https:", "blob:"],
          objectSrc: ["'none'"],
          frameSrc: ["'self'", "https://js.stripe.com", "https://hooks.stripe.com"],
          baseUri: ["'self'"],
          formAction: ["'self'"],
          frameAncestors: ["'none'"],
          upgradeInsecureRequests: [],
        },
      },
      crossOriginEmbedderPolicy: false, // Allow embedding for Stripe, PayPal
      crossOriginResourcePolicy: { policy: "cross-origin" }, // Allow cross-origin resources
      hsts: {
        maxAge: 31536000, // 1 year
        includeSubDomains: true,
        preload: true,
      },
      noSniff: true,
      referrerPolicy: { policy: "strict-origin-when-cross-origin" },
      xssFilter: true,
    })
  );

  logger.info("Helmet security headers configured");
}

/**
 * Configure compression for response optimization
 * Reduces bandwidth and improves performance
 */
export function setupCompression(app: Application): void {
  app.use(
    compression({
      filter: (req: Request, res: Response) => {
        // Don't compress responses with this request header
        if (req.headers["x-no-compression"]) {
          return false;
        }

        // Fallback to standard filter function
        return compression.filter(req, res);
      },
      level: 6, // Balanced compression level (0-9)
      threshold: 1024, // Only compress responses larger than 1KB
    })
  );

  logger.info("Response compression configured");
}

/**
 * Configure rate limiting for API protection
 * Prevents abuse and DDoS attacks
 */
export function setupRateLimiting(app: Application): void {
  // Global rate limiter - applies to all API routes
  const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1000, // Limit each IP to 1000 requests per windowMs
    message: {
      error: "Too many requests from this IP, please try again later.",
      code: "RATE_LIMIT_EXCEEDED",
    },
    standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
    legacyHeaders: false, // Disable `X-RateLimit-*` headers
    skip: (req: Request) => {
      // Skip rate limiting for static assets
      return (
        req.path.startsWith("/assets") ||
        req.path.startsWith("/attached_assets") ||
        req.path.endsWith(".js") ||
        req.path.endsWith(".css") ||
        req.path.endsWith(".png") ||
        req.path.endsWith(".jpg") ||
        req.path.endsWith(".svg")
      );
    },
  });

  // Strict rate limiter for authentication endpoints
  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 20, // Limit each IP to 20 requests per windowMs
    message: {
      error: "Too many authentication attempts, please try again later.",
      code: "AUTH_RATE_LIMIT_EXCEEDED",
    },
    standardHeaders: true,
    legacyHeaders: false,
  });

  // Strict rate limiter for payment endpoints
  const paymentLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 50, // Limit each IP to 50 requests per windowMs
    message: {
      error: "Too many payment requests, please try again later.",
      code: "PAYMENT_RATE_LIMIT_EXCEEDED",
    },
    standardHeaders: true,
    legacyHeaders: false,
  });

  // Apply global rate limiter to all API routes
  app.use("/api", globalLimiter);

  // Apply strict rate limiters to specific routes
  app.use("/api/email/forgot-password", authLimiter);
  app.use("/api/email/verify", authLimiter);
  app.use("/api/payment", paymentLimiter);
  app.use("/api/orders", paymentLimiter);
  app.use("/api/checkout", paymentLimiter);

  logger.info("Rate limiting configured for API routes");
}

/**
 * Configure body size limits to prevent oversized payloads
 * Protects against memory exhaustion attacks
 */
export function setupBodyLimits(app: Application): void {
  // JSON body parser with size limit
  app.use(
    express.json({
      limit: "10mb", // Limit JSON payloads to 10MB
      verify: (req: Request, _res: Response, buf: Buffer, _encoding: string) => {
        // Store raw body for webhook signature verification
        if (req.path.includes("/webhook")) {
          (req as Request & { rawBody?: Buffer }).rawBody = buf;
        }
      },
    })
  );

  // URL-encoded body parser with size limit
  app.use(
    express.urlencoded({
      extended: true,
      limit: "10mb", // Limit URL-encoded payloads to 10MB
    })
  );

  logger.info("Body size limits configured");
}

/**
 * Setup all security middleware
 * Call this function in server/app.ts before route registration
 */
export function setupSecurityMiddleware(app: Application): void {
  setupHelmet(app);
  setupCompression(app);
  setupBodyLimits(app);
  setupRateLimiting(app);

  logger.info("All security middleware configured successfully");
}

/**
 * Error handler for rate limiting
 * Provides consistent error responses
 */
export function rateLimitErrorHandler(
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  if (err.message.includes("rate limit")) {
    res.status(429).json({
      error: "Too many requests",
      code: "RATE_LIMIT_EXCEEDED",
      retryAfter: res.getHeader("Retry-After"),
    });
    return;
  }

  next(err);
}
