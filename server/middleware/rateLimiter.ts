import { NextFunction, Request, Response } from "express";
import { rateLimiter } from "../../shared/utils/rate-limiter";

interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Maximum requests per window
  keyGenerator?: (req: Request) => string; // Custom key generator
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

  async middleware(req: Request, res: Response, next: NextFunction) {
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
        skipSuccessfulRequests: this.config.skipSuccessfulRequests,
        skipFailedRequests: this.config.skipFailedRequests,
        message: this.config.message,
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
      const originalEnd = res.end;
      let requestCompleted = false;
      const self = this;

      res.end = function (chunk?: any, encoding?: any) {
        if (!requestCompleted) {
          requestCompleted = true;

          const shouldCount = !(
            (res.statusCode >= 200 && res.statusCode < 300 && self.config.skipSuccessfulRequests) ||
            (res.statusCode >= 400 && self.config.skipFailedRequests)
          );

          // If we should skip this request, we need to decrement the counter
          if (!shouldCount) {
            self.decrementCounter(key).catch(console.error);
          }
        }

        return originalEnd.call(this, chunk, encoding);
      };

      next();
    } catch (error) {
      console.error("Rate limiter middleware error:", error);

      // Fail open - allow request to proceed if rate limiter fails
      next();
    }
  }

  private shouldCheckUnauthenticated(req: Request): boolean {
    // Check unauthenticated requests for certain actions like API calls
    const checkUnauthenticatedActions = ["api_request", "file_download"];
    return checkUnauthenticatedActions.includes(this.action);
  }

  private getClientIP(req: Request): string {
    return (
      req.ip ||
      req.connection.remoteAddress ||
      req.socket.remoteAddress ||
      (req.connection as any)?.socket?.remoteAddress ||
      "unknown"
    );
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
      return await rateLimiter.getStats(key);
    } catch (error) {
      console.error("Failed to get rate limit stats:", error);
      return null;
    }
  }

  // Method to reset rate limit
  async resetLimit(key: string): Promise<boolean> {
    try {
      await rateLimiter.resetLimit(key);
      return true;
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
