/**
 * RateLimitService - Convex-based distributed rate limiting
 *
 * Replaces in-memory Map rate limiting with persistent Convex storage.
 * Supports multi-instance deployments and provides analytics.
 */

import { ConvexHttpClient } from "convex/browser";
import { logger } from "../lib/logger";

// ============================================================================
// TYPES
// ============================================================================

export interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  keyPrefix?: string;
  skipFailOpen?: boolean; // If true, allow requests when Convex is unavailable
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetTime: number;
  totalRequests: number;
  retryAfter?: number;
}

export interface RateLimitMetadata {
  userId?: string;
  action?: string;
  ip?: string;
  userAgent?: string;
}

// Convex API type for rate limits (avoids deep type instantiation)
interface ConvexRateLimitsApi {
  checkRateLimit: unknown;
  resetRateLimit: unknown;
  getRateLimitStats: unknown;
  cleanupExpiredRateLimits: unknown;
}

// Default configurations for different rate limit tiers
export const RATE_LIMIT_CONFIGS = {
  // Global API rate limit (per IP)
  global: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 1000,
    keyPrefix: "global",
    skipFailOpen: true,
  },
  // Strict rate limit for sensitive endpoints (auth, payments)
  strict: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 100,
    keyPrefix: "strict",
    skipFailOpen: false,
  },
  // Payment endpoints
  payment: {
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 50,
    keyPrefix: "payment",
    skipFailOpen: false,
  },
  // File upload endpoints
  upload: {
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 100,
    keyPrefix: "upload",
    skipFailOpen: false,
  },
  // Auth endpoints (login, register)
  auth: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 20,
    keyPrefix: "auth",
    skipFailOpen: false,
  },
} as const;

// ============================================================================
// HELPER FUNCTION
// ============================================================================

/**
 * Get Convex rate limits API with type safety workaround
 * Avoids deep type instantiation issues with Convex generated types
 */
function getConvexRateLimitsApi(): ConvexRateLimitsApi {
  // Use require to avoid TypeScript deep type instantiation issues with dynamic import
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const convexModule = require("../../convex/_generated/api");
  return convexModule.api.rateLimits as ConvexRateLimitsApi;
}

// ============================================================================
// SERVICE CLASS
// ============================================================================

export class RateLimitService {
  private static instance: RateLimitService;
  private convexClient: ConvexHttpClient | null = null;
  private initializationError: Error | null = null;
  private isInitialized = false;

  private constructor() {
    this.initializeClient();
  }

  static getInstance(): RateLimitService {
    if (!RateLimitService.instance) {
      RateLimitService.instance = new RateLimitService();
    }
    return RateLimitService.instance;
  }

  private initializeClient(): void {
    if (this.isInitialized) return;

    // Skip in test environment
    if (process.env.NODE_ENV === "test") {
      this.isInitialized = true;
      return;
    }

    const convexUrl = process.env.VITE_CONVEX_URL;
    if (!convexUrl) {
      this.initializationError = new Error(
        "VITE_CONVEX_URL not configured - rate limiting will use fallback"
      );
      logger.warn("RateLimitService: Convex URL not configured, using fallback mode");
      this.isInitialized = true;
      return;
    }

    try {
      this.convexClient = new ConvexHttpClient(convexUrl);
      this.isInitialized = true;
      logger.info("RateLimitService: Initialized with Convex backend");
    } catch (error) {
      this.initializationError =
        error instanceof Error ? error : new Error("Failed to initialize Convex client");
      logger.error("RateLimitService: Failed to initialize", {
        error: this.initializationError.message,
      });
      this.isInitialized = true;
    }
  }

  /**
   * Check rate limit and record request
   */
  async checkRateLimit(
    key: string,
    config: RateLimitConfig,
    metadata?: RateLimitMetadata
  ): Promise<RateLimitResult> {
    const fullKey = config.keyPrefix ? `${config.keyPrefix}:${key}` : key;

    // If Convex is not available, use fallback behavior
    if (!this.convexClient) {
      if (config.skipFailOpen) {
        return this.createAllowedResult(config);
      }
      logger.warn("RateLimitService: Convex unavailable, denying request for strict endpoint", {
        key: fullKey,
      });
      return this.createDeniedResult(config);
    }

    try {
      const rateLimitsApi = getConvexRateLimitsApi();

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = (await this.convexClient.mutation(rateLimitsApi.checkRateLimit as any, {
        key: fullKey,
        windowMs: config.windowMs,
        maxRequests: config.maxRequests,
        metadata: metadata
          ? {
              userId: metadata.userId,
              action: metadata.action,
              ip: metadata.ip,
              userAgent: metadata.userAgent,
            }
          : undefined,
      })) as RateLimitResult & { retryAfter?: number };

      return {
        allowed: result.allowed,
        remaining: result.remaining,
        resetTime: result.resetTime,
        totalRequests: result.totalRequests,
        retryAfter: result.retryAfter,
      };
    } catch (error) {
      logger.error("RateLimitService: Convex check failed", {
        key: fullKey,
        error: error instanceof Error ? error.message : String(error),
      });

      if (config.skipFailOpen) {
        return this.createAllowedResult(config);
      }
      return this.createDeniedResult(config);
    }
  }

  /**
   * Reset rate limit for a specific key
   */
  async resetRateLimit(key: string, keyPrefix?: string): Promise<boolean> {
    const fullKey = keyPrefix ? `${keyPrefix}:${key}` : key;

    if (!this.convexClient) {
      logger.warn("RateLimitService: Cannot reset - Convex unavailable");
      return false;
    }

    try {
      const rateLimitsApi = getConvexRateLimitsApi();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await this.convexClient.mutation(rateLimitsApi.resetRateLimit as any, { key: fullKey });
      logger.info("RateLimitService: Rate limit reset", { key: fullKey });
      return true;
    } catch (error) {
      logger.error("RateLimitService: Reset failed", {
        key: fullKey,
        error: error instanceof Error ? error.message : String(error),
      });
      return false;
    }
  }

  /**
   * Get rate limit statistics for a key
   */
  async getRateLimitStats(key: string, keyPrefix?: string): Promise<RateLimitResult | null> {
    const fullKey = keyPrefix ? `${keyPrefix}:${key}` : key;

    if (!this.convexClient) {
      return null;
    }

    try {
      const rateLimitsApi = getConvexRateLimitsApi();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const stats = (await this.convexClient.query(rateLimitsApi.getRateLimitStats as any, {
        key: fullKey,
      })) as { remaining: number; resetTime: number; requests: number } | null;

      if (!stats) return null;

      return {
        allowed: stats.remaining > 0,
        remaining: stats.remaining,
        resetTime: stats.resetTime,
        totalRequests: stats.requests,
      };
    } catch (error) {
      logger.error("RateLimitService: Get stats failed", {
        key: fullKey,
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    }
  }

  /**
   * Cleanup expired rate limit records
   */
  async cleanupExpired(olderThanMs?: number): Promise<number> {
    if (!this.convexClient) {
      return 0;
    }

    try {
      const rateLimitsApi = getConvexRateLimitsApi();
      /* eslint-disable @typescript-eslint/no-explicit-any */
      const result = (await this.convexClient.mutation(
        rateLimitsApi.cleanupExpiredRateLimits as any,
        { olderThanMs }
      )) as { deletedCount: number };
      /* eslint-enable @typescript-eslint/no-explicit-any */
      logger.info("RateLimitService: Cleanup completed", { deletedCount: result.deletedCount });
      return result.deletedCount;
    } catch (error) {
      logger.error("RateLimitService: Cleanup failed", {
        error: error instanceof Error ? error.message : String(error),
      });
      return 0;
    }
  }

  /**
   * Check if service is healthy
   */
  isHealthy(): boolean {
    return this.convexClient !== null && this.initializationError === null;
  }

  /**
   * Get initialization error if any
   */
  getInitializationError(): Error | null {
    return this.initializationError;
  }

  // Helper methods
  private createAllowedResult(config: RateLimitConfig): RateLimitResult {
    return {
      allowed: true,
      remaining: config.maxRequests,
      resetTime: Date.now() + config.windowMs,
      totalRequests: 0,
    };
  }

  private createDeniedResult(config: RateLimitConfig): RateLimitResult {
    return {
      allowed: false,
      remaining: 0,
      resetTime: Date.now() + config.windowMs,
      totalRequests: config.maxRequests,
      retryAfter: Math.ceil(config.windowMs / 1000),
    };
  }
}

// Export singleton instance
export const rateLimitService = RateLimitService.getInstance();
