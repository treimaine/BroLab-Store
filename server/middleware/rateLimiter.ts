import { NextFunction, Request, Response } from "express";
// import { supabaseAdmin } from '../lib/supabaseAdmin'; // Removed - using Convex for data

interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Maximum requests per window
  keyGenerator?: (req: Request) => string; // Custom key generator
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
}

interface RateLimitRecord {
  user_id: number;
  action: string;
  request_count: number;
  window_start: string;
  created_at: string;
  updated_at: string;
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
      if (!req.isAuthenticated()) {
        return next();
      }

      const userId = req.user!.id;
      const key = this.config.keyGenerator
        ? this.config.keyGenerator(req)
        : `${userId}:${this.action}`;
      const now = new Date();
      const windowStart = new Date(now.getTime() - this.config.windowMs);

      // TODO: Implement with Convex
      // // Get or create rate limit record
      // const { data: existing, error: fetchError } = await supabaseAdmin
      //   .from('rate_limits')
      //   .select('*')
      //   .eq('user_id', userId)
      //   .eq('action', this.action)
      //   .gte('window_start', windowStart.toISOString())
      //   .single();

      // if (fetchError && fetchError.code !== 'PGRST116') {
      //   console.error('Rate limiter error:', fetchError);
      //   return next();
      // }

      // let currentCount = 0;
      // let recordId: string | null = null;

      // if (existing) {
      //   currentCount = existing.request_count;
      //   recordId = existing.id;

      //   // Check if limit exceeded
      //   if (currentCount >= this.config.maxRequests) {
      //     const resetTime = new Date(existing.window_start);
      //     resetTime.setTime(resetTime.getTime() + this.config.windowMs);

      //     return res.status(429).json({
      //       error: 'Rate limit exceeded',
      //       message: `Too many ${this.action} requests. Try again after ${resetTime.toISOString()}`,
      //       retryAfter: Math.ceil((resetTime.getTime() - now.getTime()) / 1000)
      //     });
      //   }
      // }

      // Placeholder implementation
      let currentCount = 0;
      let recordId: string | null = null;

      // Store original end function to track success/failure
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

          if (shouldCount) {
            // Update rate limit counter asynchronously
            self
              .updateCounter(userId, recordId, currentCount + 1, windowStart)
              .catch(console.error);
          }
        }

        return originalEnd.call(this, chunk, encoding);
      };

      next();
    } catch (error) {
      console.error("Rate limiter middleware error:", error);
      next();
    }
  }

  private async updateCounter(
    userId: number,
    recordId: string | null,
    newCount: number,
    windowStart: Date
  ) {
    try {
      // TODO: Implement with Convex
      // if (recordId) {
      //   // Update existing record
      //   await supabaseAdmin
      //     .from('rate_limits')
      //     .update({
      //       request_count: newCount,
      //       updated_at: new Date().toISOString()
      //     })
      //     .eq('id', recordId);
      // } else {
      //   // Create new record
      //   await supabaseAdmin
      //     .from('rate_limits')
      //     .insert({
      //       user_id: userId,
      //       action: this.action,
      //       request_count: 1,
      //       window_start: windowStart.toISOString()
      //     });
      // }
    } catch (error) {
      console.error("Failed to update rate limit counter:", error);
    }
  }

  // Static method to create middleware
  static create(action: string, config: RateLimitConfig) {
    const limiter = new RateLimiter(action, config);
    return limiter.middleware.bind(limiter);
  }
}

// Predefined rate limiters
export const uploadRateLimit = RateLimiter.create("file_upload", {
  windowMs: 60 * 60 * 1000, // 1 hour
  maxRequests: 20, // 20 uploads per hour
});

export const downloadRateLimit = RateLimiter.create("file_download", {
  windowMs: 60 * 60 * 1000, // 1 hour
  maxRequests: 100, // 100 downloads per hour
});

export const apiRateLimit = RateLimiter.create("api_request", {
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 500, // 500 API calls per 15 minutes
});

export const emailRateLimit = RateLimiter.create("email_send", {
  windowMs: 24 * 60 * 60 * 1000, // 24 hours
  maxRequests: 10, // 10 emails per day
});

export default RateLimiter;
