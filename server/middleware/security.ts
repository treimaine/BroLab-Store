import compression from "compression";
import { Request, RequestHandler } from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";

/**
 * Custom key generator for rate limiting behind proxies (Vercel, etc.)
 * Uses X-Forwarded-For header when available, falls back to req.ip
 */
function getClientIp(req: Request): string {
  // X-Forwarded-For can contain multiple IPs: client, proxy1, proxy2
  // The first one is the original client IP
  const forwardedFor = req.headers["x-forwarded-for"];
  if (forwardedFor) {
    const ips = Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor.split(",")[0];
    return ips.trim();
  }
  // Fallback to req.ip (works when trust proxy is set)
  return req.ip || req.socket.remoteAddress || "unknown";
}

/**
 * Security middleware configuration
 * Implements helmet, compression, body-size limits, and rate limiting
 */

// Helmet configuration for security headers
export const helmetMiddleware = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: [
        "'self'",
        "'unsafe-inline'",
        "'unsafe-eval'",
        "https://cdn.jsdelivr.net",
        "https://*.clerk.accounts.dev",
        "https://*.clerk.com",
        "https://replit.com",
        "https://*.replit.com",
        "https://*.replit.app",
        "https://*.repl.co",
      ],
      styleSrc: [
        "'self'",
        "'unsafe-inline'",
        "https://fonts.googleapis.com",
        "https://*.clerk.accounts.dev",
        "https://*.clerk.com",
        "https://*.replit.com",
        "https://*.replit.app",
      ],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: [
        "'self'",
        "data:",
        "https:",
        "blob:",
        "https://*.clerk.accounts.dev",
        "https://*.clerk.com",
        "https://*.replit.com",
        "https://*.replit.app",
      ],
      connectSrc: [
        "'self'",
        "https:",
        "wss:",
        "https://*.clerk.accounts.dev",
        "https://*.clerk.com",
        "https://api.clerk.com",
        "https://api.clerk.dev",
        "https://*.replit.com",
        "https://*.replit.app",
        "wss://*.replit.com",
        "wss://*.replit.app",
      ],
      mediaSrc: ["'self'", "https:", "blob:"],
      objectSrc: ["'none'"],
      frameSrc: [
        "'self'",
        "https:",
        "https://*.clerk.accounts.dev",
        "https://*.clerk.com",
        "https://*.replit.com",
        "https://*.replit.app",
      ],
      upgradeInsecureRequests: [],
    },
  },
  crossOriginEmbedderPolicy: false, // Allow embedding for audio/video
  crossOriginResourcePolicy: { policy: "cross-origin" }, // Allow cross-origin resources
});

// Compression middleware for response optimization
export const compressionMiddleware = compression({
  filter: (req, res) => {
    if (req.headers["x-no-compression"]) {
      return false;
    }
    return compression.filter(req, res);
  },
  level: 6, // Balance between speed and compression ratio
  threshold: 1024, // Only compress responses larger than 1KB
});

// Body size limits middleware
export const bodySizeLimits: RequestHandler = (req, res, next) => {
  // JSON body size limit (10MB for file uploads metadata)
  if (req.is("application/json")) {
    const contentLength = Number.parseInt(req.headers["content-length"] || "0", 10);
    if (contentLength > 10 * 1024 * 1024) {
      res.status(413).json({
        error: "Request body too large",
        code: "BODY_TOO_LARGE",
        maxSize: "10MB",
      });
      return;
    }
  }
  next();
};

// Rate limiting for API endpoints
export const apiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Limit each IP to 1000 requests per windowMs
  message: {
    error: "Too many requests from this IP, please try again later",
    code: "RATE_LIMIT_EXCEEDED",
  },
  standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false, // Disable `X-RateLimit-*` headers
  keyGenerator: getClientIp, // Custom key generator for proxy environments
  skip: req => {
    // Skip rate limiting for health checks and monitoring
    return req.path === "/api/monitoring/health" || req.path === "/api/monitoring/status";
  },
  validate: { trustProxy: false }, // Disable validation warning for Forwarded header
});

// Stricter rate limiting for authentication endpoints
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // Limit each IP to 20 auth requests per windowMs
  message: {
    error: "Too many authentication attempts, please try again later",
    code: "AUTH_RATE_LIMIT_EXCEEDED",
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: getClientIp,
  validate: { trustProxy: false },
});

// Stricter rate limiting for payment endpoints
export const paymentRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // Limit each IP to 50 payment requests per windowMs
  message: {
    error: "Too many payment requests, please try again later",
    code: "PAYMENT_RATE_LIMIT_EXCEEDED",
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: getClientIp,
  validate: { trustProxy: false },
});

// Stricter rate limiting for download endpoints
export const downloadRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 100, // Limit each IP to 100 downloads per hour
  message: {
    error: "Too many download requests, please try again later",
    code: "DOWNLOAD_RATE_LIMIT_EXCEEDED",
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: getClientIp,
  validate: { trustProxy: false },
});
