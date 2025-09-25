import { ConvexHttpClient } from "convex/browser";
import {
  RateLimiter as IRateLimiter,
  RateLimit,
  RateLimitResult,
  RateLimitStats,
} from "../types/core";

// In-memory rate limiting implementation for type safety
class InMemoryRateLimitStore {
  private limits: Map<string, { count: number; resetTime: number; blocked: number }> = new Map();

  checkLimit(key: string, windowMs: number, maxRequests: number): RateLimitResult {
    const now = Date.now();
    const existing = this.limits.get(key);

    if (!existing || now > existing.resetTime) {
      // Create new window
      this.limits.set(key, { count: 1, resetTime: now + windowMs, blocked: 0 });
      return {
        allowed: true,
        remaining: maxRequests - 1,
        resetTime: now + windowMs,
        totalRequests: 1,
      };
    }

    existing.count++;

    if (existing.count > maxRequests) {
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
      remaining: maxRequests - existing.count,
      resetTime: existing.resetTime,
      totalRequests: existing.count,
    };
  }

  resetLimit(key: string): void {
    this.limits.delete(key);
  }

  getStats(key: string): RateLimitStats {
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
      windowStart: existing.resetTime - 60000, // Assume 1 minute window
      blocked: existing.blocked,
    };
  }

  getAllStats(): Record<string, RateLimitStats> {
    const stats: Record<string, RateLimitStats> = {};
    Array.from(this.limits.keys()).forEach(key => {
      stats[key] = this.getStats(key);
    });
    return stats;
  }

  getMetrics() {
    const allStats = this.getAllStats();
    const totalKeys = Object.keys(allStats).length;
    const totalRequests = Object.values(allStats).reduce((sum, stat) => sum + stat.requests, 0);
    const totalBlocked = Object.values(allStats).reduce((sum, stat) => sum + stat.blocked, 0);
    const activeWindows = Object.values(allStats).filter(stat => stat.requests > 0).length;

    return {
      totalKeys,
      totalRequests,
      totalBlocked,
      activeWindows,
    };
  }

  cleanupExpired(): { deletedCount: number } {
    const now = Date.now();
    let deletedCount = 0;

    Array.from(this.limits.entries()).forEach(([key, data]) => {
      if (now > data.resetTime) {
        this.limits.delete(key);
        deletedCount++;
      }
    });

    return { deletedCount };
  }
}

const store = new InMemoryRateLimitStore();

// Convex-based rate limiter implementation
export class ConvexRateLimiterImpl implements IRateLimiter {
  private convexClient: ConvexHttpClient;

  constructor(convexClient: ConvexHttpClient) {
    this.convexClient = convexClient;
  }

  async checkLimit(key: string, limit: RateLimit): Promise<RateLimitResult> {
    try {
      // Use direct function call to avoid type inference issues
      const result = (await this.convexClient.mutation("rateLimits:checkRateLimit" as any, {
        key,
        windowMs: limit.windowMs,
        maxRequests: limit.maxRequests,
        metadata: {
          action: key.split(":").pop(),
        },
      })) as RateLimitResult;

      // Call onLimitReached callback if limit is exceeded
      if (!result.allowed && limit.onLimitReached) {
        limit.onLimitReached(key);
      }

      return result;
    } catch (error) {
      console.error("Rate limit check failed:", error);

      // Fail open - allow request if rate limiter fails
      return {
        allowed: true,
        remaining: limit.maxRequests,
        resetTime: Date.now() + limit.windowMs,
        totalRequests: 0,
      };
    }
  }

  async resetLimit(key: string): Promise<void> {
    try {
      await this.convexClient.mutation("rateLimits:resetRateLimit" as any, { key });
    } catch (error) {
      console.error("Failed to reset rate limit:", error);
    }
  }

  async getStats(key: string): Promise<RateLimitStats> {
    try {
      const stats = (await this.convexClient.query("rateLimits:getRateLimitStats" as any, {
        key,
      })) as RateLimitStats | null;

      if (!stats) {
        return {
          key,
          requests: 0,
          remaining: 0,
          resetTime: Date.now(),
          windowStart: Date.now(),
          blocked: 0,
        };
      }

      return stats;
    } catch (error) {
      console.error("Failed to get rate limit stats:", error);

      return {
        key,
        requests: 0,
        remaining: 0,
        resetTime: Date.now(),
        windowStart: Date.now(),
        blocked: 0,
      };
    }
  }

  async incrementCounter(key: string): Promise<number> {
    try {
      const result = (await this.convexClient.mutation("rateLimits:incrementRateLimit" as any, {
        key,
        windowMs: 60 * 60 * 1000, // 1 hour
        maxRequests: 1000,
        metadata: {
          action: key.split(":").pop(),
        },
      })) as number;
      return result;
    } catch (error) {
      console.error("Failed to increment rate limit counter:", error);
      return 0;
    }
  }

  async getGlobalStats(): Promise<Record<string, RateLimitStats>> {
    try {
      return (await this.convexClient.query(
        "rateLimits:getAllRateLimitStats" as any,
        {}
      )) as Record<string, RateLimitStats>;
    } catch (error) {
      console.error("Failed to get global rate limit stats:", error);
      return {};
    }
  }

  async getUserStats(userId: string): Promise<Record<string, RateLimitStats>> {
    try {
      return (await this.convexClient.query("rateLimits:getUserRateLimits" as any, {
        userId,
      })) as Record<string, RateLimitStats>;
    } catch (error) {
      console.error("Failed to get user rate limit stats:", error);
      return {};
    }
  }

  async getMetrics(_timeRange?: { start: number; end: number }) {
    try {
      const result = (await (this.convexClient.query as any)("rateLimits:getRateLimitMetrics", {
        timeRange: _timeRange,
      })) as {
        totalKeys: number;
        totalRequests: number;
        totalBlocked: number;
        activeWindows: number;
        byAction: Record<string, { requests: number; blocked: number; keys: number }>;
      };

      // Transform byAction to match the interface
      const transformedByAction: Record<string, number> = {};
      Object.entries(result.byAction).forEach(([key, value]) => {
        transformedByAction[key] = value.requests;
      });

      return {
        totalKeys: result.totalKeys || 0,
        totalRequests: result.totalRequests || 0,
        totalBlocked: result.totalBlocked || 0,
        activeWindows: result.activeWindows || 0,
        byAction: transformedByAction,
      };
    } catch (error) {
      console.error("Failed to get rate limit metrics:", error);

      return {
        totalKeys: 0,
        totalRequests: 0,
        totalBlocked: 0,
        activeWindows: 0,
        byAction: {},
      };
    }
  }

  async cleanupExpired(_olderThanMs?: number): Promise<{ deletedCount: number }> {
    try {
      return (await this.convexClient.mutation("rateLimits:cleanupExpiredRateLimits" as any, {
        olderThanMs: _olderThanMs,
      })) as { deletedCount: number };
    } catch (error) {
      console.error("Failed to cleanup expired rate limits:", error);
      return { deletedCount: 0 };
    }
  }

  // Helper method to generate rate limit keys
  static generateKey(identifier: string, action: string): string {
    return `${identifier}:${action}`;
  }

  // Helper method to create common rate limit configurations
  static createConfig(
    windowMs: number,
    maxRequests: number,
    options?: Partial<RateLimit>
  ): RateLimit {
    return {
      windowMs,
      maxRequests,
      skipSuccessfulRequests: false,
      skipFailedRequests: false,
      ...options,
    };
  }
}

// In-memory implementation for fallback
export class RateLimiterImpl implements IRateLimiter {
  async checkLimit(key: string, limit: RateLimit): Promise<RateLimitResult> {
    try {
      const result = store.checkLimit(key, limit.windowMs, limit.maxRequests);

      // Call onLimitReached callback if limit is exceeded
      if (!result.allowed && limit.onLimitReached) {
        limit.onLimitReached(key);
      }

      return result;
    } catch (error) {
      console.error("Rate limit check failed:", error);

      // Fail open - allow request if rate limiter fails
      return {
        allowed: true,
        remaining: limit.maxRequests,
        resetTime: Date.now() + limit.windowMs,
        totalRequests: 0,
      };
    }
  }

  async resetLimit(key: string): Promise<void> {
    try {
      store.resetLimit(key);
    } catch (error) {
      console.error("Failed to reset rate limit:", error);
    }
  }

  async getStats(key: string): Promise<RateLimitStats> {
    try {
      return store.getStats(key);
    } catch (error) {
      console.error("Failed to get rate limit stats:", error);

      return {
        key,
        requests: 0,
        remaining: 0,
        resetTime: Date.now(),
        windowStart: Date.now(),
        blocked: 0,
      };
    }
  }

  async incrementCounter(key: string): Promise<number> {
    try {
      // Use a default configuration for increment operations
      const result = store.checkLimit(key, 60 * 60 * 1000, 1000); // 1 hour, 1000 limit
      return result.totalRequests;
    } catch (error) {
      console.error("Failed to increment rate limit counter:", error);
      return 0;
    }
  }

  async getGlobalStats(): Promise<Record<string, RateLimitStats>> {
    try {
      return store.getAllStats();
    } catch (error) {
      console.error("Failed to get global rate limit stats:", error);
      return {};
    }
  }

  async getUserStats(userId: string): Promise<Record<string, RateLimitStats>> {
    try {
      const allStats = store.getAllStats();
      const userStats: Record<string, RateLimitStats> = {};

      // Filter stats for this user (assuming keys contain user ID)
      for (const [key, stats] of Object.entries(allStats)) {
        if (key.includes(userId)) {
          userStats[key] = stats;
        }
      }

      return userStats;
    } catch (error) {
      console.error("Failed to get user rate limit stats:", error);
      return {};
    }
  }

  async getMetrics(_timeRange?: { start: number; end: number }) {
    try {
      // _timeRange is ignored in this in-memory implementation
      return store.getMetrics();
    } catch (error) {
      console.error("Failed to get rate limit metrics:", error);

      return {
        totalKeys: 0,
        totalRequests: 0,
        totalBlocked: 0,
        activeWindows: 0,
        byAction: {},
      };
    }
  }

  async cleanupExpired(_olderThanMs?: number): Promise<{ deletedCount: number }> {
    try {
      // _olderThanMs is ignored in this in-memory implementation
      return store.cleanupExpired();
    } catch (error) {
      console.error("Failed to cleanup expired rate limits:", error);
      return { deletedCount: 0 };
    }
  }

  // Helper method to generate rate limit keys
  static generateKey(identifier: string, action: string): string {
    return `${identifier}:${action}`;
  }

  // Helper method to create common rate limit configurations
  static createConfig(
    windowMs: number,
    maxRequests: number,
    options?: Partial<RateLimit>
  ): RateLimit {
    return {
      windowMs,
      maxRequests,
      skipSuccessfulRequests: false,
      skipFailedRequests: false,
      ...options,
    };
  }
}

// Export singleton instance (in-memory fallback)
export const rateLimiter = new RateLimiterImpl();

// Factory function to create Convex-based rate limiter
export function createConvexRateLimiter(convexClient: ConvexHttpClient): ConvexRateLimiterImpl {
  return new ConvexRateLimiterImpl(convexClient);
}

// Export common rate limit configurations
export const RateLimitConfigs = {
  // API rate limits
  API_STRICT: RateLimiterImpl.createConfig(15 * 60 * 1000, 100), // 100 requests per 15 minutes
  API_MODERATE: RateLimiterImpl.createConfig(15 * 60 * 1000, 500), // 500 requests per 15 minutes
  API_LENIENT: RateLimiterImpl.createConfig(15 * 60 * 1000, 1000), // 1000 requests per 15 minutes

  // File operations
  FILE_UPLOAD: RateLimiterImpl.createConfig(60 * 60 * 1000, 20), // 20 uploads per hour
  FILE_DOWNLOAD: RateLimiterImpl.createConfig(60 * 60 * 1000, 100), // 100 downloads per hour

  // Authentication
  LOGIN_ATTEMPTS: RateLimiterImpl.createConfig(15 * 60 * 1000, 5), // 5 attempts per 15 minutes
  PASSWORD_RESET: RateLimiterImpl.createConfig(60 * 60 * 1000, 3), // 3 resets per hour

  // Email operations
  EMAIL_SEND: RateLimiterImpl.createConfig(24 * 60 * 60 * 1000, 10), // 10 emails per day
  EMAIL_VERIFICATION: RateLimiterImpl.createConfig(60 * 60 * 1000, 5), // 5 verifications per hour

  // Search and queries
  SEARCH_QUERIES: RateLimiterImpl.createConfig(60 * 1000, 30), // 30 searches per minute
  DATABASE_QUERIES: RateLimiterImpl.createConfig(60 * 1000, 100), // 100 queries per minute
};

export default RateLimiterImpl;
