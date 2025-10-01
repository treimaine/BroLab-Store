import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { NextFunction, Request, Response } from "express";
import RateLimiter from "../server/middleware/rateLimiter";

// Mock the rate limiter
jest.mock(_"../shared/utils/rate-limiter", _() => ({
  rateLimiter: {
    checkLimit: jest.fn(),
  },
}));

describe(_"RateLimiter Middleware", _() => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;
  let rateLimiter: RateLimiter;

  beforeEach_(() => {
    mockReq = {
      isAuthenticated: jest.fn().mockReturnValue(true),
      user: { id: 123 },
      ip: "192.168.1.1",
      get: jest.fn().mockReturnValue("test-user-agent"),
    };

    mockRes = {
      set: jest.fn(),
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      end: jest.fn(),
    };

    mockNext = jest.fn();

    rateLimiter = new RateLimiter("test_action", {
      windowMs: 60000,
      maxRequests: 10,
    });
  });

  describe(_"middleware creation", _() => {
    it(_"should create middleware instance", _() => {
      expect(rateLimiter).toBeInstanceOf(RateLimiter);
    });

    it(_"should have correct configuration", _() => {
      expect(rateLimiter["config"]).toEqual({
        windowMs: 60000,
        maxRequests: 10,
        skipSuccessfulRequests: false,
        skipFailedRequests: false,
      });
    });
  });

  describe(_"static create method", _() => {
    it(_"should create middleware function", _() => {
      const middleware = RateLimiter.create("test", { windowMs: 60000, maxRequests: 5 });
      expect(typeof middleware).toBe("function");
    });
  });

  describe(_"predefined rate limiters", _() => {
    it(_"should export predefined rate limiters", _() => {
      const {
        uploadRateLimit,
        downloadRateLimit,
        apiRateLimit,
        emailRateLimit,
      } = require("../server/middleware/rateLimiter");

      expect(typeof uploadRateLimit).toBe("function");
      expect(typeof downloadRateLimit).toBe("function");
      expect(typeof apiRateLimit).toBe("function");
      expect(typeof emailRateLimit).toBe("function");
    });
  });

  describe(_"helper methods", _() => {
    it(_"should check if unauthenticated requests should be checked", _() => {
      const shouldCheck = rateLimiter["shouldCheckUnauthenticated"](mockReq as Request);
      expect(typeof shouldCheck).toBe("boolean");
    });

    it(_"should get client IP", _() => {
      const ip = rateLimiter["getClientIP"](mockReq as Request);
      expect(typeof ip).toBe("string");
    });

    it(_"should handle decrement counter", _async () => {
      // Should not throw
      await expect(rateLimiter["decrementCounter"]("test:key")).resolves.toBeUndefined();
    });
  });

  describe(_"rate limiter stats methods", _() => {
    it(_"should get stats", _async () => {
      const stats = await rateLimiter.getStats("test:key");
      expect(stats).toBeNull(); // Returns null when Convex is not available
    });

    it(_"should reset limit", _async () => {
      const result = await rateLimiter.resetLimit("test:key");
      expect(result).toBe(false); // Returns false when Convex is not available
    });
  });
});
