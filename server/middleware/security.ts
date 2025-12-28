import compression from "compression";
import { NextFunction, Request, RequestHandler, Response } from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import { generateCspNonce } from "../utils/cspNonce";

/**
 * Custom key generator for rate limiting behind proxies (Vercel, etc.)
 * Uses X-Forwarded-For header when available, falls back to req.ip
 * Handles IPv6 addresses properly by normalizing them
 */
function getClientIp(req: Request): string {
  // X-Forwarded-For can contain multiple IPs: client, proxy1, proxy2
  // The first one is the original client IP
  const forwardedFor = req.headers["x-forwarded-for"];
  if (forwardedFor) {
    const ips = Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor.split(",")[0];
    return normalizeIp(ips.trim());
  }
  // Fallback to req.ip (works when trust proxy is set)
  const ip = req.ip || req.socket.remoteAddress || "unknown";
  return normalizeIp(ip);
}

/**
 * Normalize IP address to handle IPv6 mapped IPv4 addresses
 * e.g., ::ffff:127.0.0.1 -> 127.0.0.1
 */
function normalizeIp(ip: string): string {
  // Handle IPv6 mapped IPv4 addresses
  if (ip.startsWith("::ffff:")) {
    return ip.substring(7);
  }
  return ip;
}

/**
 * Security middleware configuration
 * Implements helmet with CSP nonces, compression, body-size limits, and rate limiting
 */

/**
 * Trusted script sources for CSP.
 * These external domains are allowed to load scripts.
 */
const TRUSTED_SCRIPT_SOURCES = [
  "https://cdn.jsdelivr.net",
  "https://*.clerk.accounts.dev",
  "https://*.clerk.com",
  "https://replit.com",
  "https://*.replit.com",
  "https://*.replit.app",
  "https://*.repl.co",
  "https://js.stripe.com",
  "https://challenges.cloudflare.com",
];

/**
 * Trusted style sources for CSP.
 * Note: 'unsafe-inline' is required for Tailwind CSS and React inline styles.
 * This is a known limitation - style nonces would require build-time integration.
 */
const TRUSTED_STYLE_SOURCES = [
  "https://fonts.googleapis.com",
  "https://*.clerk.accounts.dev",
  "https://*.clerk.com",
  "https://*.replit.com",
  "https://*.replit.app",
];

/**
 * SHA-256 hashes for known inline scripts that cannot use nonces.
 * These are scripts embedded in index.html or injected by third parties.
 *
 * To generate a hash: echo -n "script content" | openssl dgst -sha256 -binary | base64
 */
const SCRIPT_HASHES: string[] = [
  // Add hashes for any inline scripts that cannot be modified to use nonces
  // Example: "'sha256-abc123...'"
];

/**
 * CSP Nonce Middleware
 *
 * Generates a unique cryptographic nonce for each request and configures
 * Content Security Policy headers dynamically. This replaces 'unsafe-inline'
 * and 'unsafe-eval' with nonce-based script allowlisting.
 *
 * The nonce is stored in res.locals.cspNonce for use in HTML templates.
 *
 * @param req - Express request object
 * @param res - Express response object
 * @param next - Express next function
 */
export const helmetMiddleware: RequestHandler = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // Generate unique nonce for this request
  const nonce = generateCspNonce();
  res.locals.cspNonce = nonce;

  // Configure helmet with dynamic CSP using the nonce
  const helmetConfig = helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: [
          "'self'",
          `'nonce-${nonce}'`,
          // Include strict-dynamic for modern browsers - allows nonce-approved scripts
          // to load additional scripts without explicit CSP entries
          "'strict-dynamic'",
          // Hashes for known inline scripts
          ...SCRIPT_HASHES,
          // Trusted external sources
          ...TRUSTED_SCRIPT_SOURCES,
        ],
        scriptSrcAttr: ["'none'"], // Block inline event handlers (onclick, etc.)
        styleSrc: [
          "'self'",
          // Note: 'unsafe-inline' is still required for Tailwind CSS and React
          // Style nonces require build-time CSS extraction which is complex with Vite
          "'unsafe-inline'",
          ...TRUSTED_STYLE_SOURCES,
        ],
        fontSrc: ["'self'", "https://fonts.gstatic.com", "data:"],
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
          "https://*.convex.cloud",
          "wss://*.convex.cloud",
          "https://*.replit.com",
          "https://*.replit.app",
          "wss://*.replit.com",
          "wss://*.replit.app",
        ],
        mediaSrc: ["'self'", "https:", "blob:"],
        objectSrc: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'"],
        frameAncestors: ["'self'"],
        frameSrc: [
          "'self'",
          "https:",
          "https://*.clerk.accounts.dev",
          "https://*.clerk.com",
          "https://*.replit.com",
          "https://*.replit.app",
          "https://js.stripe.com",
          "https://challenges.cloudflare.com",
        ],
        workerSrc: ["'self'", "blob:"],
        childSrc: ["'self'", "blob:"],
        upgradeInsecureRequests: [],
      },
    },
    crossOriginEmbedderPolicy: false, // Allow embedding for audio/video
    crossOriginResourcePolicy: { policy: "cross-origin" }, // Allow cross-origin resources
    // Additional security headers
    referrerPolicy: { policy: "strict-origin-when-cross-origin" },
    hsts: {
      maxAge: 31536000, // 1 year
      includeSubDomains: true,
      preload: true,
    },
    noSniff: true,
    xssFilter: true,
    hidePoweredBy: true,
  });

  // Apply helmet middleware
  helmetConfig(req, res, next);
};

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

// Body size limits configuration by content type
const BODY_SIZE_LIMITS: Record<string, number> = {
  json: 10 * 1024 * 1024, // 10MB - file uploads metadata
  urlencoded: 1 * 1024 * 1024, // 1MB - form submissions
  multipart: 50 * 1024 * 1024, // 50MB - file uploads (audio files)
  text: 1 * 1024 * 1024, // 1MB - plain text
  xml: 5 * 1024 * 1024, // 5MB - XML payloads
  default: 1 * 1024 * 1024, // 1MB - fallback for unknown types
};

/**
 * Determine the appropriate size limit based on content type
 */
function getContentTypeLimit(req: Request): { limit: number; type: string } {
  if (req.is("application/json")) {
    return { limit: BODY_SIZE_LIMITS.json, type: "json" };
  }
  if (req.is("application/x-www-form-urlencoded")) {
    return { limit: BODY_SIZE_LIMITS.urlencoded, type: "urlencoded" };
  }
  if (req.is("multipart/form-data")) {
    return { limit: BODY_SIZE_LIMITS.multipart, type: "multipart" };
  }
  if (req.is("text/plain")) {
    return { limit: BODY_SIZE_LIMITS.text, type: "text" };
  }
  if (req.is("application/xml") || req.is("text/xml")) {
    return { limit: BODY_SIZE_LIMITS.xml, type: "xml" };
  }
  return { limit: BODY_SIZE_LIMITS.default, type: "default" };
}

/**
 * Format bytes to human-readable string
 */
function formatBytes(bytes: number): string {
  if (bytes >= 1024 * 1024) {
    return `${Math.round(bytes / (1024 * 1024))}MB`;
  }
  if (bytes >= 1024) {
    return `${Math.round(bytes / 1024)}KB`;
  }
  return `${bytes}B`;
}

// Body size limits middleware - enforces limits for all content types
export const bodySizeLimits: RequestHandler = (req, res, next) => {
  const contentLength = Number.parseInt(req.headers["content-length"] || "0", 10);

  // Skip if no content-length header or empty body
  if (contentLength === 0) {
    next();
    return;
  }

  const { limit, type } = getContentTypeLimit(req);

  if (contentLength > limit) {
    res.status(413).json({
      error: "Request body too large",
      code: "BODY_TOO_LARGE",
      contentType: type,
      maxSize: formatBytes(limit),
      receivedSize: formatBytes(contentLength),
    });
    return;
  }

  next();
};

/**
 * Routes exemptées du rate limiting (monitoring, health checks)
 * Utilise un matching par préfixe pour inclure toutes les routes imbriquées
 */
const RATE_LIMIT_SKIP_PREFIXES = [
  "/api/monitoring", // Toutes les routes de monitoring (/health, /status, /metrics, etc.)
  "/health", // Health checks alternatifs à la racine
];

/**
 * Vérifie si une route doit être exemptée du rate limiting
 * Utilise un matching par préfixe pour supporter les routes imbriquées
 */
function shouldSkipRateLimit(path: string): boolean {
  return RATE_LIMIT_SKIP_PREFIXES.some(prefix => path.startsWith(prefix));
}

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
  skip: req => shouldSkipRateLimit(req.path),
  // Disable validation for proxy environments (Replit, Vercel, etc.)
  // We handle IP extraction and IPv6 normalization ourselves via getClientIp
  validate: {
    xForwardedForHeader: false,
    trustProxy: false,
    default: true,
    keyGeneratorIpFallback: false,
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
  keyGenerator: getClientIp,
  validate: {
    xForwardedForHeader: false,
    trustProxy: false,
    default: true,
    keyGeneratorIpFallback: false,
  },
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
  validate: {
    xForwardedForHeader: false,
    trustProxy: false,
    default: true,
    keyGeneratorIpFallback: false,
  },
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
  validate: {
    xForwardedForHeader: false,
    trustProxy: false,
    default: true,
    keyGeneratorIpFallback: false,
  },
});
