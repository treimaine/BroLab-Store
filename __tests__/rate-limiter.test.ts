import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { RateLimit } from "../shared/types/system-optimization";
import { ConvexRateLimiterImpl, RateLimitConfigs } from "../shared/utils/rate-limiter";

// Mock Convex client
const mockConvexClient = {
  mutation: jest.fn(),
  query: jest.fn(),
};

jest.mock(_"convex/browser", _() => ({
  ConvexHttpClient: jest.fn().mockImplementation_(() => mockConvexClient),
}));

// Mock performance monitor
jest.mock(_"../shared/utils/system-manager", _() => ({
  performanceMonitor: {
    startTimer: jest.fn().mockReturnValue({
      stop: jest.fn().mockReturnValue(100),
    }),
    trackMetric: jest.fn(),
  },
}));

interface MockConvexClient {
  query: jest.Mock;
  mutation: jest.Mock;
}

describe(_"ConvexRateLimiterImpl", _() => {
  let rateLimiter: ConvexRateLimiterImpl;
  let mockConvex: MockConvexClient;

  beforeEach_(() => {
    // Reset all mocks
    jest.clearAllMocks();
    mockConvexClient.mutation.mockReset();
    mockConvexClient.query.mockReset();

    // Use the mocked convex client directly
    rateLimiter = new ConvexRateLimiterImpl(mockConvexClient as any);
  });

  describe(_"checkLimit", _() => {
    it(_"should allow requests within limit", _async () => {
      const mockResult = {
        allowed: true,
        remaining: 9,
        resetTime: Date.now() + 60000,
        totalRequests: 1,
      };

      mockConvexClient.mutation.mockResolvedValue(mockResult);

      const limit: RateLimit = {
        windowMs: 60000,
        maxRequests: 10,
      };

      const result = await rateLimiter.checkLimit("user:123:api", limit);

      expect(result).toEqual(mockResult);
      expect(mockConvexClient.mutation).toHaveBeenCalledWith(
        "rateLimits:checkRateLimit",
        expect.objectContaining({
          key: "user:123:api",
          windowMs: 60000,
          maxRequests: 10,
          metadata: {
            action: "api",
          },
        })
      );
    });

    it(_"should block requests when limit exceeded", _async () => {
      const mockResult = {
        allowed: false,
        remaining: 0,
        resetTime: Date.now() + 60000,
        totalRequests: 10,
        retryAfter: 60,
      };

      mockConvexClient.mutation.mockResolvedValue(mockResult);

      const onLimitReached = jest.fn();
      const limit: RateLimit = {
        windowMs: 60000,
        maxRequests: 10,
        onLimitReached,
      };

      const result = await rateLimiter.checkLimit("user:123:api", limit);

      expect(result).toEqual(mockResult);
      expect(onLimitReached).toHaveBeenCalledWith("user:123:api");
    });

    it(_"should fail open when Convex call fails", _async () => {
      mockConvexClient.mutation.mockRejectedValue(new Error("Network error"));

      const limit: RateLimit = {
        windowMs: 60000,
        maxRequests: 10,
      };

      const result = await rateLimiter.checkLimit("user:123:api", limit);

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(10);
    });
  });

  describe(_"resetLimit", _() => {
    it(_"should reset rate limit successfully", _async () => {
      mockConvexClient.mutation.mockResolvedValue(true);

      await rateLimiter.resetLimit("user:123:api");

      expect(mockConvexClient.mutation).toHaveBeenCalledWith("rateLimits:resetRateLimit", {
        key: "user:123:api",
      });
    });

    it(_"should handle reset errors gracefully", _async () => {
      mockConvexClient.mutation.mockRejectedValue(new Error("Database error"));

      // Should not throw
      await expect(rateLimiter.resetLimit("user:123:api")).resolves.toBeUndefined();
    });
  });

  describe(_"getStats", _() => {
    it(_"should return rate limit stats", _async () => {
      const mockStats = {
        key: "user:123:api",
        requests: 5,
        remaining: 5,
        resetTime: Date.now() + 60000,
        windowStart: Date.now() - 30000,
        blocked: 2,
      };

      mockConvexClient.query.mockResolvedValue(mockStats);

      const result = await rateLimiter.getStats("user:123:api");

      expect(result).toEqual(mockStats);
      expect(mockConvexClient.query).toHaveBeenCalledWith("rateLimits:getRateLimitStats", {
        key: "user:123:api",
      });
    });

    it(_"should return default stats when key not found", _async () => {
      mockConvexClient.query.mockResolvedValue(null);

      const result = await rateLimiter.getStats("user:123:api");

      expect(result.key).toBe("user:123:api");
      expect(result.requests).toBe(0);
      expect(result.remaining).toBe(0);
      expect(result.blocked).toBe(0);
    });
  });

  describe(_"incrementCounter", _() => {
    it(_"should increment counter and return new count", _async () => {
      mockConvexClient.mutation.mockResolvedValue(5);

      const result = await rateLimiter.incrementCounter("user:123:api");

      expect(result).toBe(5);
      expect(mockConvexClient.mutation).toHaveBeenCalledWith(
        "rateLimits:incrementRateLimit",
        expect.objectContaining({
          key: "user:123:api",
          windowMs: 60 * 60 * 1000,
          maxRequests: 1000,
          metadata: {
            action: "api",
          },
        })
      );
    });
  });

  describe(_"getGlobalStats", _() => {
    it(_"should return global rate limit stats", _async () => {
      const mockGlobalStats = {
        "user:123:api": {
          key: "user:123:api",
          requests: 5,
          remaining: 5,
          resetTime: Date.now() + 60000,
          windowStart: Date.now() - 30000,
          blocked: 0,
        },
        "user:456:upload": {
          key: "user:456:upload",
          requests: 2,
          remaining: 18,
          resetTime: Date.now() + 120000,
          windowStart: Date.now() - 60000,
          blocked: 1,
        },
      };

      mockConvexClient.query.mockResolvedValue(mockGlobalStats);

      const result = await rateLimiter.getGlobalStats();

      expect(result).toEqual(mockGlobalStats);
      expect(mockConvexClient.query).toHaveBeenCalledWith("rateLimits:getAllRateLimitStats", {});
    });
  });

  describe(_"getUserStats", _() => {
    it(_"should return user-specific rate limit stats", _async () => {
      const mockUserStats = {
        "user:123:api": {
          key: "user:123:api",
          requests: 5,
          remaining: 5,
          resetTime: Date.now() + 60000,
          windowStart: Date.now() - 30000,
          blocked: 0,
          action: "api",
        },
      };

      mockConvexClient.query.mockResolvedValue(mockUserStats);

      const result = await rateLimiter.getUserStats("123");

      expect(result).toEqual(mockUserStats);
      expect(mockConvexClient.query).toHaveBeenCalledWith("rateLimits:getUserRateLimits", {
        userId: "123",
      });
    });
  });

  describe(_"getMetrics", _() => {
    it(_"should return rate limit metrics", _async () => {
      const mockMetrics = {
        totalKeys: 10,
        totalRequests: 150,
        totalBlocked: 5,
        activeWindows: 8,
        byAction: {
          api: { requests: 100, blocked: 2, keys: 5 },
          upload: { requests: 50, blocked: 3, keys: 5 },
        },
      };

      mockConvexClient.query.mockResolvedValue(mockMetrics);

      const result = await rateLimiter.getMetrics();

      expect(result).toEqual(mockMetrics);
      expect(mockConvexClient.query).toHaveBeenCalledWith("rateLimits:getRateLimitMetrics", {
        timeRange: undefined,
      });
    });

    it(_"should accept time range parameter", _async () => {
      const timeRange = {
        start: Date.now() - 60000,
        end: Date.now(),
      };

      mockConvexClient.query.mockResolvedValue({
        totalKeys: 5,
        totalRequests: 50,
        totalBlocked: 1,
        activeWindows: 3,
        byAction: {},
      });

      await rateLimiter.getMetrics(timeRange);

      expect(mockConvexClient.query).toHaveBeenCalledWith("rateLimits:getRateLimitMetrics", {
        timeRange,
      });
    });
  });

  describe(_"cleanupExpired", _() => {
    it(_"should cleanup expired rate limits", _async () => {
      const mockResult = { deletedCount: 5, cutoff: Date.now() - 86400000 };
      mockConvexClient.mutation.mockResolvedValue(mockResult);

      const result = await rateLimiter.cleanupExpired(86400000);

      expect(result).toEqual(mockResult);
      expect(mockConvexClient.mutation).toHaveBeenCalledWith(
        "rateLimits:cleanupExpiredRateLimits",
        {
          olderThanMs: 86400000,
        }
      );
    });
  });

  describe(_"static helper methods", _() => {
    it(_"should generate correct rate limit keys", _() => {
      const key = ConvexRateLimiterImpl.generateKey("user:123", "api_request");
      expect(key).toBe("user:123:api_request");
    });

    it(_"should create rate limit config with defaults", _() => {
      const config = ConvexRateLimiterImpl.createConfig(60000, 100);

      expect(config).toEqual({
        windowMs: 60000,
        maxRequests: 100,
        skipSuccessfulRequests: false,
        skipFailedRequests: false,
      });
    });

    it(_"should create rate limit config with custom options", _() => {
      const config = ConvexRateLimiterImpl.createConfig(60000, 100, {
        skipSuccessfulRequests: true,
        message: "Custom message",
      });

      expect(config).toEqual({
        windowMs: 60000,
        maxRequests: 100,
        skipSuccessfulRequests: true,
        skipFailedRequests: false,
        message: "Custom message",
      });
    });
  });

  describe(_"RateLimitConfigs", _() => {
    it(_"should provide predefined configurations", _() => {
      expect(RateLimitConfigs.API_STRICT).toEqual({
        windowMs: 15 * 60 * 1000,
        maxRequests: 100,
        skipSuccessfulRequests: false,
        skipFailedRequests: false,
      });

      expect(RateLimitConfigs.FILE_UPLOAD).toEqual({
        windowMs: 60 * 60 * 1000,
        maxRequests: 20,
        skipSuccessfulRequests: false,
        skipFailedRequests: false,
      });

      expect(RateLimitConfigs.LOGIN_ATTEMPTS).toEqual({
        windowMs: 15 * 60 * 1000,
        maxRequests: 5,
        skipSuccessfulRequests: false,
        skipFailedRequests: false,
      });
    });
  });
});
