import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { NextFunction, Request, Response } from "express";
import RateLimiter from "../server/middleware/rateLimiter";

// Mock the rate limiter
jest.mock("../shared/utils/rate-limiter", () => ({
  rateLimiter: {
    checkLimit: jest.fn(),
  },
}));

describe("RateLimiter Middleware", () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;
  let rateLimiter: RateLimiter;

  beforeEach(() => {
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

  describe("middleware creation", () => {
    it("should create middleware instance", () => {
      expect(rateLimiter).toBeInstanceOf(RateLimiter);
    });

    it("should have correct configuration", () => {
      expect(rateLimiter["config"]).toEqual({
        windowMs: 60000,
        maxRequests: 10,
        skipSuccessfulRequests: false,
        skipFailedRequests: false,
      });
    });
  });

  describe("static create method", () => {
    it("should create middleware function", () => {
      const middleware = RateLimiter.create("test", { windowMs: 60000, maxRequests: 5 });
      expect(typeof middleware).toBe("function");
    });
  });

  describe("predefined rate limiters", () => {
    it("should export predefined rate limiters", () => {
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

  describe("helper methods", () => {
    it("should check if unauthenticated requests should be checked", () => {
      const shouldCheck = rateLimiter["shouldCheckUnauthenticated"](mockReq as Request);
      expect(typeof shouldCheck).toBe("boolean");
    });

    it("should get client IP", () => {
      const ip = rateLimiter["getClientIP"](mockReq as Request);
      expect(typeof ip).toBe("string");
    });

    it("should handle decrement counter", async () => {
      // Should not throw
      await expect(rateLimiter["decrementCounter"]("test:key")).resolves.toBeUndefined();
    });
  });

  describe("rate limiter stats methods", () => {
    it("should get stats", async () => {
      const stats = await rateLimiter.getStats("test:key");
      expect(stats).toBeDefined(); // Returns default stats object when available
      if (stats) {
        expect(stats.key).toBe("test:key");
        expect(typeof stats.requests).toBe("number");
        expect(typeof stats.remaining).toBe("number");
      }
    });

    it("should reset limit", async () => {
      const result = await rateLimiter.resetLimit("test:key");
      expect(typeof result).toBe("boolean"); // Returns boolean indicating success/failure
    });
  });
});
