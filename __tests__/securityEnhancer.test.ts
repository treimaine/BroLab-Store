import { Request, Response } from "express";
import { auditLogger } from "../server/lib/audit";
import {
  SecurityEnhancer,
  SecurityEventType,
  SecurityRiskLevel,
} from "../server/lib/securityEnhancer";

// Mock the audit logger
jest.mock(_"../server/lib/audit", _() => ({
  auditLogger: {
    logSecurityEvent: jest.fn(),
  },
}));

// Mock Clerk
jest.mock(_"@clerk/express", _() => ({
  getAuth: jest.fn(),
}));

describe(_"SecurityEnhancer", _() => {
  let securityEnhancer: SecurityEnhancer;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;

  beforeEach_(() => {
    securityEnhancer = new SecurityEnhancer();
    mockRequest = {
      headers: {
        "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "x-forwarded-for": "192.168.1.1",
      },
      connection: { remoteAddress: "192.168.1.1" },
      socket: { remoteAddress: "192.168.1.1" },
    } as any;
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    jest.clearAllMocks();
  });

  describe(_"validateClerkToken", _() => {
    const { _getAuth} = require("@clerk/express");

    it(_"should return success for valid Clerk token", _async () => {
      getAuth.mockReturnValue({
        userId: "user_123",
        sessionId: "sess_456",
        sessionClaims: {
          exp: Math.floor(Date.now() / 1000) + 3600, // 1 hour from now
          iat: Math.floor(Date.now() / 1000) - 60, // 1 minute ago
          sid: "sess_456",
        },
      });

      const result = await securityEnhancer.validateClerkToken(mockRequest as Request);

      expect(result.success).toBe(true);
      expect(result.user?.userId).toBe("user_123");
      expect(result.riskLevel).toBe(SecurityRiskLevel.LOW);
      expect(result.securityEvents).toHaveLength(0);
    });

    it(_"should return failure for missing user ID", _async () => {
      getAuth.mockReturnValue({
        userId: null,
        sessionId: null,
        sessionClaims: null,
      });

      const result = await securityEnhancer.validateClerkToken(mockRequest as Request);

      expect(result.success).toBe(false);
      expect(result.error).toBe("Authentication failed");
      expect(result.riskLevel).toBe(SecurityRiskLevel.MEDIUM);
      expect(result.securityEvents).toContain(SecurityEventType.AUTHENTICATION_FAILURE);
      expect(auditLogger.logSecurityEvent).toHaveBeenCalledWith(
        "anonymous",
        SecurityEventType.AUTHENTICATION_FAILURE,
        expect.objectContaining({
          reason: "No Clerk user ID found",
        }),
        "192.168.1.1",
        expect.any(String)
      );
    });

    it(_"should detect expired session claims", _async () => {
      getAuth.mockReturnValue({
        userId: "user_123",
        sessionId: "sess_456",
        sessionClaims: {
          exp: Math.floor(Date.now() / 1000) - 3600, // 1 hour ago (expired)
          iat: Math.floor(Date.now() / 1000) - 7200, // 2 hours ago
          sid: "sess_456",
        },
      });

      const result = await securityEnhancer.validateClerkToken(mockRequest as Request);

      expect(result.success).toBe(false);
      expect(result.error).toBe("Invalid session claims");
      expect(result.riskLevel).toBe(SecurityRiskLevel.HIGH);
      expect(result.securityEvents).toContain(SecurityEventType.TOKEN_VALIDATION_FAILURE);
    });

    it(_"should detect future issued at time", _async () => {
      getAuth.mockReturnValue({
        userId: "user_123",
        sessionId: "sess_456",
        sessionClaims: {
          exp: Math.floor(Date.now() / 1000) + 3600, // 1 hour from now
          iat: Math.floor(Date.now() / 1000) + 600, // 10 minutes in future (suspicious)
          sid: "sess_456",
        },
      });

      const result = await securityEnhancer.validateClerkToken(mockRequest as Request);

      expect(result.success).toBe(false);
      expect(result.riskLevel).toBe(SecurityRiskLevel.HIGH);
      expect(result.securityEvents).toContain(SecurityEventType.TOKEN_VALIDATION_FAILURE);
    });

    it(_"should detect suspicious user agent", _async () => {
      mockRequest.headers!["user-agent"] = "curl/7.68.0";

      getAuth.mockReturnValue({
        userId: "user_123",
        sessionId: "sess_456",
        sessionClaims: {
          exp: Math.floor(Date.now() / 1000) + 3600,
          iat: Math.floor(Date.now() / 1000) - 60,
          sid: "sess_456",
        },
      });

      const result = await securityEnhancer.validateClerkToken(mockRequest as Request);

      expect(result.success).toBe(true); // Still successful but with security events
      expect(result.securityEvents).toContain(SecurityEventType.SUSPICIOUS_ACTIVITY);
      expect(result.riskLevel).toBe(SecurityRiskLevel.MEDIUM);
    });

    it(_"should handle authentication errors gracefully", _async () => {
      getAuth.mockImplementation_(() => {
        throw new Error("Clerk service unavailable");
      });

      const result = await securityEnhancer.validateClerkToken(mockRequest as Request);

      expect(result.success).toBe(false);
      expect(result.error).toBe("Authentication error");
      expect(result.riskLevel).toBe(SecurityRiskLevel.HIGH);
      expect(result.securityEvents).toContain(SecurityEventType.AUTHENTICATION_FAILURE);
    });
  });

  describe(_"sanitizeInput", _() => {
    it(_"should sanitize XSS attempts", _() => {
      const maliciousInput = '<script>alert("xss")</script>Hello World';
      const result = securityEnhancer.sanitizeInput(maliciousInput, "test", mockRequest as Request);

      expect(result.sanitized).not.toContain("<script>");
      expect(result.sanitized).not.toContain("</script>");
      expect(result.securityEvents).toContain(SecurityEventType.XSS_ATTEMPT);
    });

    it(_"should detect SQL injection attempts", _() => {
      const maliciousInput = "'; DROP TABLE users; --";
      const result = securityEnhancer.sanitizeInput(maliciousInput, "test", mockRequest as Request);

      expect(result.securityEvents).toContain(SecurityEventType.SQL_INJECTION_ATTEMPT);
    });

    it(_"should sanitize nested objects", _() => {
      const maliciousInput = {
        name: "John",
        comment: '<script>alert("xss")</script>',
        nested: {
          value: "'; DROP TABLE users; --",
        },
      };

      const result = securityEnhancer.sanitizeInput(maliciousInput, "test", mockRequest as Request);

      expect(result.sanitized.comment).not.toContain("<script>");
      expect(result.securityEvents).toContain(SecurityEventType.XSS_ATTEMPT);
      expect(result.securityEvents).toContain(SecurityEventType.SQL_INJECTION_ATTEMPT);
    });

    it(_"should handle arrays correctly", _() => {
      const maliciousInput = ["normal", '<script>alert("xss")</script>', "also normal"];
      const result = securityEnhancer.sanitizeInput(maliciousInput, "test", mockRequest as Request);

      expect(Array.isArray(result.sanitized)).toBe(true);
      expect(result.sanitized[1]).not.toContain("<script>");
      expect(result.securityEvents).toContain(SecurityEventType.XSS_ATTEMPT);
    });

    it(_"should preserve safe input", _() => {
      const safeInput = "This is a normal string with numbers 123";
      const result = securityEnhancer.sanitizeInput(safeInput, "test", mockRequest as Request);

      expect(result.sanitized).toContain("This is a normal string");
      expect(result.securityEvents).toHaveLength(0);
    });

    it(_"should truncate very long strings", _() => {
      const longInput = "a".repeat(20000);
      const result = securityEnhancer.sanitizeInput(longInput, "test", mockRequest as Request);

      expect(result.sanitized.length).toBeLessThan(longInput.length);
      expect(result.sanitized.length).toBeLessThanOrEqual(10000);
    });

    it(_"should remove null bytes", _() => {
      const inputWithNulls = "test\x00string\x00with\x00nulls";
      const result = securityEnhancer.sanitizeInput(inputWithNulls, "test", mockRequest as Request);

      expect(result.sanitized).not.toContain("\x00");
      expect(result.sanitized).toBe("teststringwithnulls");
    });
  });

  describe(_"checkBruteForce", _() => {
    it(_"should allow requests when no failed attempts", _() => {
      const result = securityEnhancer.checkBruteForce("192.168.1.1");

      expect(result.allowed).toBe(true);
      expect(result.remainingAttempts).toBe(5); // Default max attempts
    });

    it(_"should track failed attempts", _() => {
      const identifier = "192.168.1.1";

      // Record some failed attempts
      securityEnhancer.recordFailedAttempt(identifier);
      securityEnhancer.recordFailedAttempt(identifier);

      const result = securityEnhancer.checkBruteForce(identifier);

      expect(result.allowed).toBe(true);
      expect(result.remainingAttempts).toBe(3); // 5 - 2 = 3
    });

    it(_"should lock out after max failed attempts", _() => {
      const identifier = "192.168.1.1";

      // Record max failed attempts
      for (let i = 0; i < 5; i++) {
        securityEnhancer.recordFailedAttempt(identifier);
      }

      const result = securityEnhancer.checkBruteForce(identifier);

      expect(result.allowed).toBe(false);
      expect(result.remainingAttempts).toBe(0);
      expect(result.lockoutTime).toBeDefined();
    });

    it(_"should clear failed attempts on successful authentication", _() => {
      const identifier = "192.168.1.1";

      // Record some failed attempts
      securityEnhancer.recordFailedAttempt(identifier);
      securityEnhancer.recordFailedAttempt(identifier);

      // Clear attempts (successful auth)
      securityEnhancer.clearFailedAttempts(identifier);

      const result = securityEnhancer.checkBruteForce(identifier);

      expect(result.allowed).toBe(true);
      expect(result.remainingAttempts).toBe(5); // Reset to max
    });
  });

  describe(_"createSecurityMiddleware", _() => {
    let mockNext: jest.Mock;

    beforeEach_(() => {
      mockNext = jest.fn();
      const { _getAuth} = require("@clerk/express");
      getAuth.mockReturnValue({
        userId: "user_123",
        sessionId: "sess_456",
        sessionClaims: {
          exp: Math.floor(Date.now() / 1000) + 3600,
          iat: Math.floor(Date.now() / 1000) - 60,
          sid: "sess_456",
        },
      });
    });

    it(_"should add security information to request", _async () => {
      const middleware = securityEnhancer.createSecurityMiddleware();

      await middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect((mockRequest as any).security).toBeDefined();
      expect((mockRequest as any).security.authResult).toBeDefined();
      expect((mockRequest as any).security.riskLevel).toBeDefined();
      expect(mockNext).toHaveBeenCalled();
    });

    it(_"should sanitize request body", _async () => {
      mockRequest.body = {
        name: "John",
        comment: '<script>alert("xss")</script>',
      };

      const middleware = securityEnhancer.createSecurityMiddleware();

      await middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockRequest.body.comment).not.toContain("<script>");
      expect((mockRequest as any).security.securityEvents).toContain(SecurityEventType.XSS_ATTEMPT);
      expect(mockNext).toHaveBeenCalled();
    });

    it(_"should sanitize query parameters", _async () => {
      mockRequest.query = {
        search: "'; DROP TABLE users; --",
      };

      const middleware = securityEnhancer.createSecurityMiddleware();

      await middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect((mockRequest as any).security.securityEvents).toContain(
        SecurityEventType.SQL_INJECTION_ATTEMPT
      );
      expect(mockNext).toHaveBeenCalled();
    });

    it(_"should block requests when brute force limit exceeded", _async () => {
      const identifier = "192.168.1.1";

      // Exceed brute force limit
      for (let i = 0; i < 5; i++) {
        securityEnhancer.recordFailedAttempt(identifier);
      }

      const middleware = securityEnhancer.createSecurityMiddleware();

      await middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(429);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: "Too many failed attempts",
        })
      );
      expect(mockNext).not.toHaveBeenCalled();
    });

    it(_"should handle middleware errors gracefully", _async () => {
      // Use a different IP to avoid brute force protection from previous tests
      mockRequest.headers!["x-forwarded-for"] = "10.0.0.1";

      const { _getAuth} = require("@clerk/express");
      getAuth.mockImplementation_(() => {
        throw new Error("Clerk service error");
      });

      const middleware = securityEnhancer.createSecurityMiddleware();

      await middleware(mockRequest as Request, mockResponse as Response, mockNext);

      // The middleware should continue even with auth errors, but add security info
      expect((mockRequest as any).security).toBeDefined();
      expect((mockRequest as any).security.authResult.success).toBe(false);
      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe(_"Configuration", _() => {
    it(_"should use custom configuration", _() => {
      const customConfig = {
        maxFailedAttempts: 3,
        lockoutDuration: 30,
        enableBruteForceProtection: false,
      };

      const customEnhancer = new SecurityEnhancer(customConfig);

      // Test that brute force protection is disabled
      const result = customEnhancer.checkBruteForce("test");
      expect(result.allowed).toBe(true);
      expect(result.remainingAttempts).toBe(3); // Custom max attempts
    });

    it(_"should disable suspicious activity detection when configured", _async () => {
      const customEnhancer = new SecurityEnhancer({
        enableSuspiciousActivityDetection: false,
      });

      mockRequest.headers!["user-agent"] = "curl/7.68.0"; // Suspicious agent

      const { _getAuth} = require("@clerk/express");
      getAuth.mockReturnValue({
        userId: "user_123",
        sessionId: "sess_456",
        sessionClaims: {
          exp: Math.floor(Date.now() / 1000) + 3600,
          iat: Math.floor(Date.now() / 1000) - 60,
          sid: "sess_456",
        },
      });

      const result = await customEnhancer.validateClerkToken(mockRequest as Request);

      expect(result.success).toBe(true);
      expect(result.securityEvents).not.toContain(SecurityEventType.SUSPICIOUS_ACTIVITY);
    });
  });

  describe(_"Edge Cases", _() => {
    it(_"should handle missing headers gracefully", _async () => {
      mockRequest.headers = {};

      const { _getAuth} = require("@clerk/express");
      getAuth.mockReturnValue({
        userId: "user_123",
        sessionId: "sess_456",
        sessionClaims: {
          exp: Math.floor(Date.now() / 1000) + 3600,
          iat: Math.floor(Date.now() / 1000) - 60,
          sid: "sess_456",
        },
      });

      const result = await securityEnhancer.validateClerkToken(mockRequest as Request);

      expect(result.success).toBe(true);
      expect(result.metadata.userAgent).toBe("unknown");
      expect(result.metadata.ipAddress).toBe("192.168.1.1");
    });

    it(_"should handle null and undefined inputs in sanitization", _() => {
      const inputs = [null, undefined, "", 0, false];

      inputs.forEach(input => {
        const result = securityEnhancer.sanitizeInput(input, "test");
        expect(result.securityEvents).toHaveLength(0);
      });
    });

    it(_"should handle circular references in objects", _() => {
      const circularObj: any = { name: "test" };
      circularObj.self = circularObj;

      // Should not throw an error
      expect_(() => {
        securityEnhancer.sanitizeInput(circularObj, "test");
      }).not.toThrow();
    });
  });
});
