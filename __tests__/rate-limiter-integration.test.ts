import { describe, expect, it } from "@jest/globals";
import { RateLimitConfigs, RateLimiterImpl } from "../shared/utils/rate-limiter";

describe("RateLimiter Integration Tests", () => {
  describe("RateLimitConfigs", () => {
    it("should provide API rate limit configurations", () => {
      expect(RateLimitConfigs.API_STRICT).toEqual({
        windowMs: 15 * 60 * 1000, // 15 minutes
        maxRequests: 100,
        skipSuccessfulRequests: false,
        skipFailedRequests: false,
      });

      expect(RateLimitConfigs.API_MODERATE).toEqual({
        windowMs: 15 * 60 * 1000, // 15 minutes
        maxRequests: 500,
        skipSuccessfulRequests: false,
        skipFailedRequests: false,
      });

      expect(RateLimitConfigs.API_LENIENT).toEqual({
        windowMs: 15 * 60 * 1000, // 15 minutes
        maxRequests: 1000,
        skipSuccessfulRequests: false,
        skipFailedRequests: false,
      });
    });

    it("should provide file operation rate limit configurations", () => {
      expect(RateLimitConfigs.FILE_UPLOAD).toEqual({
        windowMs: 60 * 60 * 1000, // 1 hour
        maxRequests: 20,
        skipSuccessfulRequests: false,
        skipFailedRequests: false,
      });

      expect(RateLimitConfigs.FILE_DOWNLOAD).toEqual({
        windowMs: 60 * 60 * 1000, // 1 hour
        maxRequests: 100,
        skipSuccessfulRequests: false,
        skipFailedRequests: false,
      });
    });

    it("should provide authentication rate limit configurations", () => {
      expect(RateLimitConfigs.LOGIN_ATTEMPTS).toEqual({
        windowMs: 15 * 60 * 1000, // 15 minutes
        maxRequests: 5,
        skipSuccessfulRequests: false,
        skipFailedRequests: false,
      });

      expect(RateLimitConfigs.PASSWORD_RESET).toEqual({
        windowMs: 60 * 60 * 1000, // 1 hour
        maxRequests: 3,
        skipSuccessfulRequests: false,
        skipFailedRequests: false,
      });
    });

    it("should provide email operation rate limit configurations", () => {
      expect(RateLimitConfigs.EMAIL_SEND).toEqual({
        windowMs: 24 * 60 * 60 * 1000, // 24 hours
        maxRequests: 10,
        skipSuccessfulRequests: false,
        skipFailedRequests: false,
      });

      expect(RateLimitConfigs.EMAIL_VERIFICATION).toEqual({
        windowMs: 60 * 60 * 1000, // 1 hour
        maxRequests: 5,
        skipSuccessfulRequests: false,
        skipFailedRequests: false,
      });
    });

    it("should provide search and query rate limit configurations", () => {
      expect(RateLimitConfigs.SEARCH_QUERIES).toEqual({
        windowMs: 60 * 1000, // 1 minute
        maxRequests: 30,
        skipSuccessfulRequests: false,
        skipFailedRequests: false,
      });

      expect(RateLimitConfigs.DATABASE_QUERIES).toEqual({
        windowMs: 60 * 1000, // 1 minute
        maxRequests: 100,
        skipSuccessfulRequests: false,
        skipFailedRequests: false,
      });
    });
  });

  describe("RateLimiterImpl static methods", () => {
    it("should generate correct rate limit keys", () => {
      expect(RateLimiterImpl.generateKey("user:123", "api_request")).toBe("user:123:api_request");
      expect(RateLimiterImpl.generateKey("192.168.1.1", "file_upload")).toBe(
        "192.168.1.1:file_upload"
      );
      expect(RateLimiterImpl.generateKey("session:abc123", "search")).toBe("session:abc123:search");
    });

    it("should create rate limit config with defaults", () => {
      const config = RateLimiterImpl.createConfig(60000, 100);

      expect(config).toEqual({
        windowMs: 60000,
        maxRequests: 100,
        skipSuccessfulRequests: false,
        skipFailedRequests: false,
      });
    });

    it("should create rate limit config with custom options", () => {
      const onLimitReached = jest.fn();
      const keyGenerator = (_id: string) => `custom:${id}`;

      const config = RateLimiterImpl.createConfig(60000, 100, {
        skipSuccessfulRequests: true,
        skipFailedRequests: true,
        message: "Custom rate limit message",
        onLimitReached,
        keyGenerator,
      });

      expect(config).toEqual({
        windowMs: 60000,
        maxRequests: 100,
        skipSuccessfulRequests: true,
        skipFailedRequests: true,
        message: "Custom rate limit message",
        onLimitReached,
        keyGenerator,
      });
    });
  });

  describe("RateLimiterImpl instance", () => {
    it("should create instance without errors", () => {
      expect(() => new RateLimiterImpl()).not.toThrow();
    });

    it("should have all required methods", () => {
      const rateLimiter = new RateLimiterImpl();

      expect(typeof rateLimiter.checkLimit).toBe("function");
      expect(typeof rateLimiter.resetLimit).toBe("function");
      expect(typeof rateLimiter.getStats).toBe("function");
      expect(typeof rateLimiter.incrementCounter).toBe("function");
      expect(typeof rateLimiter.getGlobalStats).toBe("function");
      expect(typeof rateLimiter.getUserStats).toBe("function");
      expect(typeof rateLimiter.getMetrics).toBe("function");
      expect(typeof rateLimiter.cleanupExpired).toBe("function");
    });
  });

  describe("Rate limit configurations validation", () => {
    it("should have reasonable time windows", () => {
      // Short-term limits (seconds to minutes)
      expect(RateLimitConfigs.SEARCH_QUERIES.windowMs).toBe(60 * 1000); // 1 minute
      expect(RateLimitConfigs.DATABASE_QUERIES.windowMs).toBe(60 * 1000); // 1 minute
      expect(RateLimitConfigs.LOGIN_ATTEMPTS.windowMs).toBe(15 * 60 * 1000); // 15 minutes
      expect(RateLimitConfigs.API_STRICT.windowMs).toBe(15 * 60 * 1000); // 15 minutes

      // Medium-term limits (hours)
      expect(RateLimitConfigs.FILE_UPLOAD.windowMs).toBe(60 * 60 * 1000); // 1 hour
      expect(RateLimitConfigs.FILE_DOWNLOAD.windowMs).toBe(60 * 60 * 1000); // 1 hour
      expect(RateLimitConfigs.PASSWORD_RESET.windowMs).toBe(60 * 60 * 1000); // 1 hour
      expect(RateLimitConfigs.EMAIL_VERIFICATION.windowMs).toBe(60 * 60 * 1000); // 1 hour

      // Long-term limits (days)
      expect(RateLimitConfigs.EMAIL_SEND.windowMs).toBe(24 * 60 * 60 * 1000); // 24 hours
    });

    it("should have appropriate request limits", () => {
      // Strict limits for security-sensitive operations
      expect(RateLimitConfigs.LOGIN_ATTEMPTS.maxRequests).toBe(5);
      expect(RateLimitConfigs.PASSWORD_RESET.maxRequests).toBe(3);
      expect(RateLimitConfigs.EMAIL_VERIFICATION.maxRequests).toBe(5);
      expect(RateLimitConfigs.EMAIL_SEND.maxRequests).toBe(10);

      // Moderate limits for resource-intensive operations
      expect(RateLimitConfigs.FILE_UPLOAD.maxRequests).toBe(20);
      expect(RateLimitConfigs.SEARCH_QUERIES.maxRequests).toBe(30);

      // Higher limits for common operations
      expect(RateLimitConfigs.API_STRICT.maxRequests).toBe(100);
      expect(RateLimitConfigs.FILE_DOWNLOAD.maxRequests).toBe(100);
      expect(RateLimitConfigs.DATABASE_QUERIES.maxRequests).toBe(100);

      // Very high limits for lenient operations
      expect(RateLimitConfigs.API_MODERATE.maxRequests).toBe(500);
      expect(RateLimitConfigs.API_LENIENT.maxRequests).toBe(1000);
    });

    it("should have consistent default options", () => {
      const configs = Object.values(RateLimitConfigs);

      configs.forEach(config => {
        expect(config.skipSuccessfulRequests).toBe(false);
        expect(config.skipFailedRequests).toBe(false);
        expect(config.windowMs).toBeGreaterThan(0);
        expect(config.maxRequests).toBeGreaterThan(0);
      });
    });
  });
});
