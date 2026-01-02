/**
 * Rate Limit Middleware - Express middleware using Convex-based rate limiting
 *
 * Provides distributed rate limiting that works across multiple server instances.
 * Replaces the in-memory Map implementation with persistent Convex storage.
 */

import { NextFunction, Request, Response } from "express";
import { logger } from "../lib/logger";
import {
  RATE_LIMIT_CONFIGS,
  RateLimitConfig,
  RateLimitMetadata,
  rateLimitService,
} from "../services/RateLimitService";

// ============================================================================
// TYPES
// ============================================================================

export interface RateLimitMiddlewareOptions {
  config?: RateLimitConfig;
  keyGenerator?: (req: Request) => string;
  skip?: (req: Request) => boolean;
  onRateLimited?: (req: Request, res: Response) => void;
  includeHeaders?: boolean;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Extract client IP from request
 */
function getClientIp(req: Request): string {
  // Check for forwarded IP (behind proxy/load balancer)
  const forwarded = req.headers["x-forwarded-for"];
  if (forwarded) {
    const ips = Array.isArray(forwarded) ? forwarded[0] : forwarded.split(",")[0];
    return ips.trim();
  }

  // Check for real IP header (nginx)
  const realIp = req.headers["x-real-ip"];
  if (realIp) {
    return Array.isArray(realIp) ? realIp[0] : realIp;
  }

  // Fallback to socket address
  return req.ip || req.socket.remoteAddress || "unknown";
}

/**
 * Extract user ID from request (if authenticated)
 */
function getUserId(req: Request): string | undefined {
  // Check for Clerk auth
  const auth = (req as Request & { auth?: { userId?: string } }).auth;
  if (auth?.userId) {
    return auth.userId;
  }

  // Check for user object
  const user = (req as Request & { user?: { id?: string; clerkId?: string } }).user;
  return user?.id || user?.clerkId;
}

/**
 * Default key generator - uses IP + user ID if available
 */
function defaultKeyGenerator(req: Request): string {
  const ip = getClientIp(req);
  const userId = getUserId(req);

  if (userId) {
    return `user:${userId}`;
  }
  return `ip:${ip}`;
}

/**
 * Set rate limit headers on response
 */
function setRateLimitHeaders(
  res: Response,
  remaining: number,
  resetTime: number,
  limit: number
): void {
  res.setHeader("X-RateLimit-Limit", limit);
  res.setHeader("X-RateLimit-Remaining", Math.max(0, remaining));
  res.setHeader("X-RateLimit-Reset", Math.ceil(resetTime / 1000));
}

/**
 * Default rate limited response handler
 */
function defaultOnRateLimited(req: Request, res: Response, retryAfter?: number): void {
  const response = {
    error: "Too many requests",
    message: "You have exceeded the rate limit. Please try again later.",
    retryAfter: retryAfter || 60,
  };

  if (retryAfter) {
    res.setHeader("Retry-After", retryAfter);
  }

  res.status(429).json(response);
}

// ============================================================================
// MIDDLEWARE FACTORY
// ============================================================================

/**
 * Create rate limit middleware with custom options
 */
export function createRateLimitMiddleware(
  options: RateLimitMiddlewareOptions = {}
): (req: Request, res: Response, next: NextFunction) => Promise<void> {
  const {
    config = RATE_LIMIT_CONFIGS.global,
    keyGenerator = defaultKeyGenerator,
    skip,
    onRateLimited,
    includeHeaders = true,
  } = options;

  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    // Skip if configured
    if (skip?.(req)) {
      next();
      return;
    }

    const key = keyGenerator(req);
    const metadata: RateLimitMetadata = {
      ip: getClientIp(req),
      userId: getUserId(req),
      action: `${req.method}:${req.path}`,
      userAgent: req.headers["user-agent"],
    };

    try {
      const result = await rateLimitService.checkRateLimit(key, config, metadata);

      // Set headers if enabled
      if (includeHeaders) {
        setRateLimitHeaders(res, result.remaining, result.resetTime, config.maxRequests);
      }

      if (!result.allowed) {
        logger.warn("Rate limit exceeded", {
          key,
          ip: metadata.ip,
          userId: metadata.userId,
          path: req.path,
          method: req.method,
        });

        if (onRateLimited) {
          onRateLimited(req, res);
        } else {
          defaultOnRateLimited(req, res, result.retryAfter);
        }
        return;
      }

      next();
    } catch (error) {
      logger.error("Rate limit middleware error", {
        key,
        error: error instanceof Error ? error.message : String(error),
      });

      // Fail open for global config, fail closed for strict configs
      if (config.skipFailOpen) {
        next();
      } else {
        defaultOnRateLimited(req, res, 60);
      }
    }
  };
}

// ============================================================================
// PRE-CONFIGURED MIDDLEWARES
// ============================================================================

/**
 * Global API rate limiter - 1000 requests per 15 minutes per IP
 * Fails open if Convex is unavailable
 */
export const globalRateLimiter = createRateLimitMiddleware({
  config: RATE_LIMIT_CONFIGS.global,
});

/**
 * Strict rate limiter - 100 requests per 15 minutes
 * For sensitive endpoints, fails closed if Convex is unavailable
 */
export const strictRateLimiter = createRateLimitMiddleware({
  config: RATE_LIMIT_CONFIGS.strict,
});

/**
 * Payment rate limiter - 50 requests per hour
 * For payment endpoints (Stripe, PayPal)
 */
export const paymentRateLimiter = createRateLimitMiddleware({
  config: RATE_LIMIT_CONFIGS.payment,
});

/**
 * Upload rate limiter - 100 uploads per hour
 * For file upload endpoints
 */
export const uploadRateLimiter = createRateLimitMiddleware({
  config: RATE_LIMIT_CONFIGS.upload,
});

/**
 * Auth rate limiter - 20 requests per 15 minutes
 * For authentication endpoints (login, register, password reset)
 */
export const authRateLimiter = createRateLimitMiddleware({
  config: RATE_LIMIT_CONFIGS.auth,
});

/**
 * Create endpoint-specific rate limiter
 */
export function createEndpointRateLimiter(
  endpoint: string,
  maxRequests: number,
  windowMs: number = 15 * 60 * 1000
): (req: Request, res: Response, next: NextFunction) => Promise<void> {
  return createRateLimitMiddleware({
    config: {
      windowMs,
      maxRequests,
      keyPrefix: `endpoint:${endpoint}`,
      skipFailOpen: false,
    },
  });
}
