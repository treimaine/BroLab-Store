import { NextFunction, Request, Response } from "express";

// In-memory rate limiter implementation
class InMemoryRateLimiter {
  private limits: Map<string, { count: number; resetTime: number; blocked: number }> = new Map();

  async checkLimit(
    key: string,
    config: { windowMs: number; maxRequests: number }
  ): Promise<{
    allowed: boolean;
    remaining: number;
    resetTime: number;
    totalRequests: number;
    retryAfter?: number;
  }> {
    const now = Date.now();
    const existing = this.limits.get(key);

    if (!existing || now > existing.resetTime) {
      // Create new window
      this.limits.set(key, { count: 1, resetTime: now + config.windowMs, blocked: 0 });
      return {
        allowed: true,
        remaining: config.maxRequests - 1,
        resetTime: now + config.windowMs,
        totalRequests: 1,
      };
    }

    existing.count++;

    if (existing.count > config.maxRequests) {
      existing.blocked++;
      return {
        allowed: false,
        remaining: 0,
        resetTime: existing.resetTime,
        totalRequests: existing.count,
        retryAfter: Math.ceil((existing.resetTime - now) / 1000),
      };
    }

    return {
      allowed: true,
      remaining: config.maxRequests - existing.count,
      resetTime: existing.resetTime,
      totalRequests: existing.count,
    };
  }

  async resetLimit(key: string): Promise<void> {
    this.limits.delete(key);
  }

  async getStats(key: string) {
    const existing = this.limits.get(key);
    const now = Date.now();

    if (!existing || now > existing.resetTime) {
      return {
        key,
        requests: 0,
        remaining: 0,
        resetTime: now,
        windowStart: now,
        blocked: 0,
      };
    }

    return {
      key,
      requests: existing.count,
      remaining: Math.max(0, existing.count),
      resetTime: existing.resetTime,
      windowStart: existing.resetTime - 60000,
      blocked: existing.blocked,
    };
  }
}

const rateLimiter = new InMemoryRateLimiter();

// Type for accessing socket properties safely
interface SocketConnection {
  remoteAddress?: string;
  socket?: {
    remoteAddress?: string;
  };
}

// Extended request type for IP extraction
type ExtendedRequest = Request & {
  socket?: {
    remoteAddress?: string;
  };
};

interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Maximum requests per window
  keyGenerator?: (req: ExtendedRequest) => string; // Custom key generator
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
  message?: string; // Custom error message
}

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetTime: number;
  totalRequests: number;
  retryAfter?: number;
}

export class RateLimiter {
  private config: RateLimitConfig;
  private action: string;
  constructor(action: string, config: RateLimitConfig) {
    this.action = action;
    const defaults = {
      windowMs: 60 * 60 * 1000, // 1 hour default
      maxRequests: 10,
      skipSuccessfulRequests: false,
      skipFailedRequests: false,
    };
    this.config = { ...defaults, ...config };
  }

  async middleware(req: ExtendedRequest, res: Response, next: NextFunction) {
    try {
      // Allow unauthenticated requests to pass through for some actions
      if (!req.isAuthenticated() && !this.shouldCheckUnauthenticated(req)) {
        return next();
      }

      const userId = req.isAuthenticated() ? req.user!.id.toString() : null;
      const ip = this.getClientIP(req);

      const key = this.config.keyGenerator
        ? this.config.keyGenerator(req)
        : userId
          ? `${userId}:${this.action}`
          : `${ip}:${this.action}`;

      // Check rate limit using the shared rate limiter
      const result: RateLimitResult = await rateLimiter.checkLimit(key, {
        windowMs: this.config.windowMs,
        maxRequests: this.config.maxRequests,
      });

      if (!result.allowed) {
        // Set rate limit headers
        res.set({
          "X-RateLimit-Limit": this.config.maxRequests.toString(),
          "X-RateLimit-Remaining": result.remaining.toString(),
          "X-RateLimit-Reset": new Date(result.resetTime).toISOString(),
          "Retry-After": result.retryAfter?.toString() || "60",
        });

        return res.status(429).json({
          error: "Rate limit exceeded",
          message: this.config.message || `Too many ${this.action} requests. Try again later.`,
          retryAfter: result.retryAfter,
          resetTime: new Date(result.resetTime).toISOString(),
        });
      }

      // Set rate limit headers for successful requests
      res.set({
        "X-RateLimit-Limit": this.config.maxRequests.toString(),
        "X-RateLimit-Remaining": result.remaining.toString(),
        "X-RateLimit-Reset": new Date(result.resetTime).toISOString(),
      });

      // Store original end function to track success/failure for conditional counting
      const originalEnd = res.end.bind(res);
      let requestCompleted = false;
      const config = this.config;
      const decrementCounter = this.decrementCounter.bind(this);

      // Override res.end to track request completion
      res.end = ((chunk?: unknown, encoding?: BufferEncoding | (() => void), cb?: () => void) => {
        if (!requestCompleted) {
          requestCompleted = true;

          const shouldCount = !(
            (res.statusCode >= 200 && res.statusCode < 300 && config.skipSuccessfulRequests) ||
            (res.statusCode >= 400 && config.skipFailedRequests)
          );

          // If we should skip this request, we need to decrement the counter
          if (!shouldCount) {
            decrementCounter(key).catch(console.error);
          }
        }

        // Handle different overloads of res.end properly
        if (typeof chunk === "undefined") {
          return originalEnd();
        } else if (typeof encoding === "function") {
          // encoding is actually a callback
          return originalEnd(chunk, encoding);
        } else if (typeof encoding === "string" && typeof cb === "function") {
          // encoding is BufferEncoding, cb is callback
          return originalEnd(chunk, encoding, cb);
        } else if (typeof encoding === "string") {
          // encoding is BufferEncoding, no callback
          return originalEnd(chunk, encoding);
        } else {
          // chunk only, no encoding or callback
          return originalEnd(chunk);
        }
      }) as Response["end"];

      next();
    } catch (error) {
      console.error("Rate limiter middleware error:", error);

      // Fail open - allow request to proceed if rate limiter fails
      next();
    }
  }

  private shouldCheckUnauthenticated(_req: ExtendedRequest): boolean {
    // Check unauthenticated requests for certain actions like API calls
    const checkUnauthenticatedActions = ["api_request", "file_download"];
    return checkUnauthenticatedActions.includes(this.action);
  }

  private getClientIP(req: ExtendedRequest): string {
    // Get client IP from various sources
    if (req.ip) return req.ip;
    if (req.socket?.remoteAddress) return req.socket.remoteAddress;

    // Handle deprecated connection property safely
    const connection = req.connection as unknown as SocketConnection | undefined;
    if (connection?.remoteAddress) return connection.remoteAddress;
    if (connection?.socket?.remoteAddress) return connection.socket.remoteAddress;

    return "unknown";
  }

  private async decrementCounter(key: string): Promise<void> {
    try {
      // This would ideally decrement the counter, but for simplicity
      // we'll just log it. In a production system, you might want to
      // implement a more sophisticated approach
      console.log(`Would decrement counter for key: ${key}`);
    } catch (error) {
      console.error("Failed to decrement rate limit counter:", error);
    }
  }

  // Static method to create middleware
  static create(action: string, config: RateLimitConfig) {
    const limiter = new RateLimiter(action, config);
    return limiter.middleware.bind(limiter);
  }

  // Method to get rate limit stats
  async getStats(key: string) {
    try {
      // Ensure the method exists and is callable
      if (rateLimiter && typeof rateLimiter.getStats === "function") {
        return await rateLimiter.getStats(key);
      } else {
        console.warn("getStats method not available on rate limiter instance");
        // Return a default stats object
        return {
          key,
          requests: 0,
          remaining: 0,
          resetTime: Date.now(),
          windowStart: Date.now(),
          blocked: 0,
        };
      }
    } catch (error) {
      console.error("Failed to get rate limit stats:", error);
      return null;
    }
  }

  // Method to reset rate limit
  async resetLimit(key: string): Promise<boolean> {
    try {
      // Ensure the method exists and is callable
      if (rateLimiter && typeof rateLimiter.resetLimit === "function") {
        await rateLimiter.resetLimit(key);
        return true;
      } else {
        console.warn("resetLimit method not available on rate limiter instance");
        return false;
      }
    } catch (error) {
      console.error("Failed to reset rate limit:", error);
      return false;
    }
  }
}

// Predefined rate limiters
export const uploadRateLimit = RateLimiter.create("file_upload", {
  windowMs: 60 * 60 * 1000, // 1 hour
  maxRequests: 20, // 20 uploads per hour
  message: "Too many file uploads. Please wait before uploading more files.",
});

export const downloadRateLimit = RateLimiter.create("file_download", {
  windowMs: 60 * 60 * 1000, // 1 hour
  maxRequests: 100, // 100 downloads per hour
  message: "Download limit exceeded. Please wait before downloading more files.",
});

export const apiRateLimit = RateLimiter.create("api_request", {
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 500, // 500 API calls per 15 minutes
  message: "API rate limit exceeded. Please slow down your requests.",
});

export const emailRateLimit = RateLimiter.create("email_send", {
  windowMs: 24 * 60 * 60 * 1000, // 24 hours
  maxRequests: 10, // 10 emails per day
  message: "Email sending limit exceeded. Please wait before sending more emails.",
});

export default RateLimiter;
