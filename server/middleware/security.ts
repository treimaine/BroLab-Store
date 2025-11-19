import compression from "compression";
import { RequestHandler } from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";

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
      ],
      styleSrc: [
        "'self'",
        "'unsafe-inline'",
        "https://fonts.googleapis.com",
        "https://*.clerk.accounts.dev",
        "https://*.clerk.com",
      ],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: [
        "'self'",
        "data:",
        "https:",
        "blob:",
        "https://*.clerk.accounts.dev",
        "https://*.clerk.com",
      ],
      connectSrc: [
        "'self'",
        "https:",
        "wss:",
        "https://*.clerk.accounts.dev",
        "https://*.clerk.com",
        "https://api.clerk.com",
        "https://api.clerk.dev",
      ],
      mediaSrc: ["'self'", "https:", "blob:"],
      objectSrc: ["'none'"],
      frameSrc: ["'self'", "https:", "https://*.clerk.accounts.dev", "https://*.clerk.com"],
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
  skip: req => {
    // Skip rate limiting for health checks and monitoring
    return req.path === "/api/monitoring/health" || req.path === "/api/monitoring/status";
  },
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
});
