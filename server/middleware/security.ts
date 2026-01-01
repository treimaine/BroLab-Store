import { getAuth } from "@clerk/express";
import compression from "compression";
import { NextFunction, Request, RequestHandler, Response } from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import { logger } from "../lib/logger";
import { generateCspNonce } from "../utils/cspNonce";

/**
 * Environment detection for CSP configuration
 * Development mode includes Replit domains for local development
 */
const isDevelopment = process.env.NODE_ENV === "development";

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
 * Smart key generator for rate limiting
 * Prioritizes user ID for authenticated users, falls back to IP for anonymous
 * This provides better UX for authenticated users sharing IPs (NAT, VPN, corporate)
 */
function getSmartRateLimitKey(req: Request): string {
  try {
    const auth = getAuth(req);
    if (auth?.userId) {
      return `user:${auth.userId}`;
    }
  } catch {
    // getAuth may throw if Clerk middleware hasn't run yet - fall back to IP
  }
  return `ip:${getClientIp(req)}`;
}

/**
 * Check if the current request is from an authenticated user
 */
function isAuthenticatedRequest(req: Request): boolean {
  try {
    const auth = getAuth(req);
    return !!auth?.userId;
  } catch {
    return false;
  }
}

/**
 * Configuration for smart rate limiter with differentiated limits
 */
interface SmartRateLimitConfig {
  name: string;
  windowMs: number;
  maxAuthenticated: number;
  maxAnonymous: number;
  message: string;
  code: string;
}

/**
 * Log rate limit exceeded event with key type information
 */
function logRateLimitExceeded(
  req: Request,
  config: SmartRateLimitConfig,
  key: string,
  limit: number
): void {
  const keyType = key.startsWith("user:") ? "USER" : "IP";
  const identifier = key.startsWith("user:") ? key.substring(5) : key.substring(3);

  logger.warn(`[RATE_LIMIT] ${config.name} exceeded`, {
    keyType,
    identifier,
    limit,
    path: req.path,
    method: req.method,
    userAgent: req.headers["user-agent"],
  });
}

/**
 * Create a smart rate limiter with differentiated limits for authenticated vs anonymous users
 * Authenticated users get higher limits for better UX
 * Anonymous users are rate limited by IP
 */
function createSmartRateLimiter(config: SmartRateLimitConfig): RequestHandler {
  // Create two rate limiters: one for authenticated, one for anonymous
  const authenticatedLimiter = rateLimit({
    windowMs: config.windowMs,
    max: config.maxAuthenticated,
    message: {
      error: config.message,
      code: config.code,
      limit: config.maxAuthenticated,
      type: "authenticated",
    },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: getSmartRateLimitKey,
    skip: req => shouldSkipRateLimit(req.path) || !isAuthenticatedRequest(req),
    handler: (req, res) => {
      const key = getSmartRateLimitKey(req);
      logRateLimitExceeded(req, config, key, config.maxAuthenticated);
      res.status(429).json({
        error: config.message,
        code: config.code,
        limit: config.maxAuthenticated,
        type: "authenticated",
      });
    },
    validate: {
      xForwardedForHeader: false,
      trustProxy: false,
      default: true,
    },
  });

  const anonymousLimiter = rateLimit({
    windowMs: config.windowMs,
    max: config.maxAnonymous,
    message: {
      error: config.message,
      code: config.code,
      limit: config.maxAnonymous,
      type: "anonymous",
    },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: getSmartRateLimitKey,
    skip: req => shouldSkipRateLimit(req.path) || isAuthenticatedRequest(req),
    handler: (req, res) => {
      const key = getSmartRateLimitKey(req);
      logRateLimitExceeded(req, config, key, config.maxAnonymous);
      res.status(429).json({
        error: config.message,
        code: config.code,
        limit: config.maxAnonymous,
        type: "anonymous",
      });
    },
    validate: {
      xForwardedForHeader: false,
      trustProxy: false,
      default: true,
    },
  });

  // Return a combined middleware that applies both limiters
  return (req: Request, res: Response, next: NextFunction) => {
    // Apply authenticated limiter first (will skip if not authenticated)
    authenticatedLimiter(req, res, (err?: unknown) => {
      if (err) return next(err);
      // Then apply anonymous limiter (will skip if authenticated)
      anonymousLimiter(req, res, next);
    });
  };
}

/**
 * Security middleware configuration
 * Implements helmet with CSP nonces, compression, body-size limits, and rate limiting
 */

// =============================================================================
// REPLIT DOMAINS (Development Only)
// =============================================================================
// These domains are only included in development mode for Replit compatibility
// In production, they are excluded to minimize attack surface

const REPLIT_SCRIPT_SOURCES = isDevelopment
  ? ["https://replit.com", "https://*.replit.com", "https://*.replit.app", "https://*.repl.co"]
  : [];

const REPLIT_STYLE_SOURCES = isDevelopment ? ["https://*.replit.com", "https://*.replit.app"] : [];

const REPLIT_IMG_SOURCES = isDevelopment ? ["https://*.replit.com", "https://*.replit.app"] : [];

const REPLIT_CONNECT_SOURCES = isDevelopment
  ? ["https://*.replit.com", "https://*.replit.app", "wss://*.replit.com", "wss://*.replit.app"]
  : [];

const REPLIT_FRAME_SOURCES = isDevelopment ? ["https://*.replit.com", "https://*.replit.app"] : [];

// =============================================================================
// CORE TRUSTED SOURCES (Always Included)
// =============================================================================

/**
 * Trusted script sources for CSP.
 * These external domains are allowed to load scripts.
 */
const TRUSTED_SCRIPT_SOURCES = [
  "https://cdn.jsdelivr.net",
  "https://*.clerk.accounts.dev",
  "https://*.clerk.com",
  "https://js.stripe.com",
  "https://challenges.cloudflare.com",
  ...REPLIT_SCRIPT_SOURCES,
];

/**
 * Trusted style sources for CSP.
 */
const TRUSTED_STYLE_SOURCES = [
  "https://fonts.googleapis.com",
  "https://*.clerk.accounts.dev",
  "https://*.clerk.com",
  ...REPLIT_STYLE_SOURCES,
];

/**
 * WordPress/WooCommerce API domain for backend integration
 */
const WORDPRESS_SOURCES = ["https://wp.brolabentertainment.com"];

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
          // IMPORTANT: Do NOT use nonce for styles because:
          // - React inline styles (style={{...}}) cannot receive nonce attributes
          // - Modern browsers ignore 'unsafe-inline' when nonce is present
          // - This breaks 100+ components using dynamic inline styles
          // Keep 'unsafe-inline' for:
          // - Vite HMR in development (injects styles dynamically)
          // - Third-party libraries (Radix UI, Framer Motion, Recharts)
          // - React inline styles for dynamic values (progress bars, colors, dimensions)
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
          ...REPLIT_IMG_SOURCES,
        ],
        connectSrc: [
          "'self'",
          "https:",
          "wss:",
          // Clerk authentication
          "https://*.clerk.accounts.dev",
          "https://*.clerk.com",
          "https://api.clerk.com",
          "https://api.clerk.dev",
          // Convex real-time database
          "https://*.convex.cloud",
          "wss://*.convex.cloud",
          // WordPress/WooCommerce API
          ...WORDPRESS_SOURCES,
          // Replit (development only)
          ...REPLIT_CONNECT_SOURCES,
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
          "https://js.stripe.com",
          "https://challenges.cloudflare.com",
          ...REPLIT_FRAME_SOURCES,
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

// Rate limiting for API endpoints - Smart rate limiting with user-based keys
// Authenticated users: 2000 requests per 15 minutes
// Anonymous users: 1000 requests per 15 minutes
export const apiRateLimiter = createSmartRateLimiter({
  name: "API",
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxAuthenticated: 2000,
  maxAnonymous: 1000,
  message: "Too many requests, please try again later",
  code: "RATE_LIMIT_EXCEEDED",
});

// Stricter rate limiting for authentication endpoints
// Authenticated users: 40 requests per 15 minutes
// Anonymous users: 20 requests per 15 minutes
export const authRateLimiter = createSmartRateLimiter({
  name: "AUTH",
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxAuthenticated: 40,
  maxAnonymous: 20,
  message: "Too many authentication attempts, please try again later",
  code: "AUTH_RATE_LIMIT_EXCEEDED",
});

// Stricter rate limiting for payment endpoints
// Authenticated users: 100 requests per 15 minutes
// Anonymous users: 50 requests per 15 minutes
export const paymentRateLimiter = createSmartRateLimiter({
  name: "PAYMENT",
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxAuthenticated: 100,
  maxAnonymous: 50,
  message: "Too many payment requests, please try again later",
  code: "PAYMENT_RATE_LIMIT_EXCEEDED",
});

// Stricter rate limiting for download endpoints
// Authenticated users: 200 downloads per hour
// Anonymous users: 100 downloads per hour
export const downloadRateLimiter = createSmartRateLimiter({
  name: "DOWNLOAD",
  windowMs: 60 * 60 * 1000, // 1 hour
  maxAuthenticated: 200,
  maxAnonymous: 100,
  message: "Too many download requests, please try again later",
  code: "DOWNLOAD_RATE_LIMIT_EXCEEDED",
});
