/**
 * Secure Logger Tests
 *
 * Tests for the centralized log sanitization utility
 */

import { createRequestLogger, sanitize, secureLogger } from "../../server/lib/secureLogger";

describe("SecureLogger", () => {
  let consoleLogSpy: jest.SpyInstance;
  let consoleErrorSpy: jest.SpyInstance;
  let consoleWarnSpy: jest.SpyInstance;

  beforeEach(() => {
    consoleLogSpy = jest.spyOn(console, "log").mockImplementation();
    consoleErrorSpy = jest.spyOn(console, "error").mockImplementation();
    consoleWarnSpy = jest.spyOn(console, "warn").mockImplementation();
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    consoleWarnSpy.mockRestore();
  });

  describe("Sensitive Data Sanitization", () => {
    it("should redact password fields", () => {
      secureLogger.info("User login", { password: "secret123", username: "testuser" });

      expect(consoleLogSpy).toHaveBeenCalled();
      const logOutput = consoleLogSpy.mock.calls[0][0];
      expect(logOutput).toContain("[REDACTED]");
      expect(logOutput).not.toContain("secret123");
    });

    it("should redact API keys", () => {
      secureLogger.info("API call", { api_key: "sk_test_123456", apiKey: "pk_live_789" });

      expect(consoleLogSpy).toHaveBeenCalled();
      const logOutput = consoleLogSpy.mock.calls[0][0];
      expect(logOutput).toContain("[REDACTED]");
      expect(logOutput).not.toContain("sk_test_123456");
      expect(logOutput).not.toContain("pk_live_789");
    });

    it("should redact tokens", () => {
      secureLogger.info("Auth check", {
        token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9",
        authToken: "bearer_token",
      });

      expect(consoleLogSpy).toHaveBeenCalled();
      const logOutput = consoleLogSpy.mock.calls[0][0];
      expect(logOutput).toContain("[REDACTED]");
      expect(logOutput).not.toContain("eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9");
    });

    it("should redact secrets", () => {
      secureLogger.info("Config loaded", {
        secret: "my-secret-value",
        client_secret: "oauth-secret",
      });

      expect(consoleLogSpy).toHaveBeenCalled();
      const logOutput = consoleLogSpy.mock.calls[0][0];
      expect(logOutput).toContain("[REDACTED]");
      expect(logOutput).not.toContain("my-secret-value");
      expect(logOutput).not.toContain("oauth-secret");
    });

    it("should redact credentials", () => {
      secureLogger.info("Database connection", {
        credentials: "user:pass@host",
        privateKey: "-----BEGIN",
      });

      expect(consoleLogSpy).toHaveBeenCalled();
      const logOutput = consoleLogSpy.mock.calls[0][0];
      expect(logOutput).toContain("[REDACTED]");
      expect(logOutput).not.toContain("user:pass@host");
    });
  });

  describe("PII Sanitization", () => {
    it("should hash email addresses", () => {
      secureLogger.info("User registration", { email: "user@example.com", name: "John Doe" });

      expect(consoleLogSpy).toHaveBeenCalled();
      const logOutput = consoleLogSpy.mock.calls[0][0];
      expect(logOutput).toContain("[HASHED:");
      expect(logOutput).not.toContain("user@example.com");
    });

    it("should sanitize email format for non-email fields", () => {
      secureLogger.info("Contact", { contactInfo: "user@example.com", name: "John Doe" });

      expect(consoleLogSpy).toHaveBeenCalled();
      const logOutput = consoleLogSpy.mock.calls[0][0];
      expect(logOutput).toContain("[EMAIL:***@example.com]");
      expect(logOutput).not.toContain("user@example.com");
    });

    it("should hash phone numbers", () => {
      secureLogger.info("Contact info", { phone: "+1234567890", phoneNumber: "555-1234" });

      expect(consoleLogSpy).toHaveBeenCalled();
      const logOutput = consoleLogSpy.mock.calls[0][0];
      expect(logOutput).toContain("[HASHED:");
      expect(logOutput).not.toContain("+1234567890");
      expect(logOutput).not.toContain("555-1234");
    });

    it("should hash addresses", () => {
      secureLogger.info("Shipping", { address: "123 Main St", postalCode: "12345" });

      expect(consoleLogSpy).toHaveBeenCalled();
      const logOutput = consoleLogSpy.mock.calls[0][0];
      expect(logOutput).toContain("[HASHED:");
      expect(logOutput).not.toContain("123 Main St");
    });

    it("should hash credit card numbers", () => {
      secureLogger.info("Payment", {
        creditCard: "4111111111111111",
        cardNumber: "5555555555554444",
      });

      expect(consoleLogSpy).toHaveBeenCalled();
      const logOutput = consoleLogSpy.mock.calls[0][0];
      expect(logOutput).toContain("[HASHED:");
      expect(logOutput).not.toContain("4111111111111111");
      expect(logOutput).not.toContain("5555555555554444");
    });
  });

  describe("ID Sanitization", () => {
    it("should truncate Clerk IDs", () => {
      secureLogger.info("User action", { clerkId: "user_2abcdefghijklmnopqrstuvwxyz" });

      expect(consoleLogSpy).toHaveBeenCalled();
      const logOutput = consoleLogSpy.mock.calls[0][0];
      expect(logOutput).toContain("user_2abcdef...");
      expect(logOutput).not.toContain("user_2abcdefghijklmnopqrstuvwxyz");
    });

    it("should truncate long IDs", () => {
      secureLogger.info("Database query", {
        id: "very_long_identifier_that_should_be_truncated_12345",
      });

      expect(consoleLogSpy).toHaveBeenCalled();
      const logOutput = consoleLogSpy.mock.calls[0][0];
      expect(logOutput).toContain("very_lon...");
      expect(logOutput).not.toContain("very_long_identifier_that_should_be_truncated_12345");
    });

    it("should keep short IDs intact", () => {
      secureLogger.info("Record found", { id: "123" });

      expect(consoleLogSpy).toHaveBeenCalled();
      const logOutput = consoleLogSpy.mock.calls[0][0];
      expect(logOutput).toContain("123");
    });
  });

  describe("Nested Object Sanitization", () => {
    it("should sanitize nested objects", () => {
      secureLogger.info("Complex data", {
        user: {
          email: "user@example.com",
          password: "secret",
          profile: {
            phone: "555-1234",
          },
        },
      });

      expect(consoleLogSpy).toHaveBeenCalled();
      const logOutput = consoleLogSpy.mock.calls[0][0];
      expect(logOutput).toContain("[REDACTED]");
      expect(logOutput).toContain("[HASHED:");
      expect(logOutput).not.toContain("secret");
      expect(logOutput).not.toContain("user@example.com");
      expect(logOutput).not.toContain("555-1234");
    });

    it("should sanitize arrays of objects", () => {
      secureLogger.info("User list", {
        users: [
          { email: "user1@example.com", password: "pass1" },
          { email: "user2@example.com", password: "pass2" },
        ],
      });

      expect(consoleLogSpy).toHaveBeenCalled();
      const logOutput = consoleLogSpy.mock.calls[0][0];
      expect(logOutput).toContain("[REDACTED]");
      expect(logOutput).toContain("[HASHED:");
      expect(logOutput).not.toContain("user1@example.com");
      expect(logOutput).not.toContain("user2@example.com");
      expect(logOutput).not.toContain("pass1");
      expect(logOutput).not.toContain("pass2");
    });
  });

  describe("Log Levels", () => {
    it("should log info messages", () => {
      secureLogger.info("Info message", { data: "test" });

      expect(consoleLogSpy).toHaveBeenCalled();
      const logOutput = consoleLogSpy.mock.calls[0][0];
      expect(logOutput).toContain("Info message");
    });

    it("should log warning messages", () => {
      secureLogger.warn("Warning message", { issue: "minor" });

      expect(consoleWarnSpy).toHaveBeenCalled();
      const logOutput = consoleWarnSpy.mock.calls[0][0];
      expect(logOutput).toContain("Warning message");
    });

    it("should log error messages with error objects", () => {
      const error = new Error("Test error");
      secureLogger.error("Error occurred", error, { context: "test" });

      expect(consoleErrorSpy).toHaveBeenCalled();
      const logOutput = consoleErrorSpy.mock.calls[0][0];
      expect(logOutput).toContain("Error occurred");
      expect(logOutput).toContain("Test error");
    });

    it("should log debug messages in development", () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = "development";

      secureLogger.debug("Debug message", { debug: "info" });

      expect(consoleLogSpy).toHaveBeenCalled();
      const logOutput = consoleLogSpy.mock.calls[0][0];
      expect(logOutput).toContain("Debug message");

      process.env.NODE_ENV = originalEnv;
    });
  });

  describe("Request Logger", () => {
    it("should create logger with request ID", () => {
      const requestLogger = createRequestLogger("req-123");
      requestLogger.info("Request processed");

      expect(consoleLogSpy).toHaveBeenCalled();
      const logOutput = consoleLogSpy.mock.calls[0][0];
      expect(logOutput).toContain("req-123");
    });

    it("should include request ID in all logs", () => {
      const requestLogger = createRequestLogger("req-456");
      requestLogger.info("Step 1");
      requestLogger.warn("Step 2");
      requestLogger.error("Step 3", new Error("Failed"));

      expect(consoleLogSpy).toHaveBeenCalledTimes(1);
      expect(consoleWarnSpy).toHaveBeenCalledTimes(1);
      expect(consoleErrorSpy).toHaveBeenCalledTimes(1);

      const infoLog = consoleLogSpy.mock.calls[0][0];
      const warnLog = consoleWarnSpy.mock.calls[0][0];
      const errorLog = consoleErrorSpy.mock.calls[0][0];

      expect(infoLog).toContain("req-456");
      expect(warnLog).toContain("req-456");
      expect(errorLog).toContain("req-456");
    });
  });

  describe("Sanitize Utility", () => {
    it("should sanitize data manually", () => {
      const data = {
        username: "testuser",
        password: "secret123",
        email: "user@example.com",
        apiKey: "sk_test_key",
      };

      const sanitized = sanitize(data);

      expect(sanitized.username).toBe("testuser");
      expect(sanitized.password).toBe("[REDACTED]");
      expect(sanitized.email).toContain("[HASHED:");
      expect(sanitized.apiKey).toBe("[REDACTED]");
    });

    it("should handle null and undefined values", () => {
      const data = {
        value1: null,
        value2: undefined,
        value3: "test",
      };

      const sanitized = sanitize(data);

      expect(sanitized.value1).toBeNull();
      expect(sanitized.value2).toBeUndefined();
      expect(sanitized.value3).toBe("test");
    });
  });

  describe("Production vs Development", () => {
    it("should use JSON format in production", () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = "production";

      secureLogger.info("Production log", { data: "test" });

      expect(consoleLogSpy).toHaveBeenCalled();
      const logOutput = consoleLogSpy.mock.calls[0][0];

      // Should be valid JSON
      expect(() => JSON.parse(logOutput)).not.toThrow();
      const parsed = JSON.parse(logOutput);
      expect(parsed.level).toBe("info");
      expect(parsed.message).toBe("Production log");

      process.env.NODE_ENV = originalEnv;
    });

    it("should use human-readable format in development", () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = "development";

      secureLogger.info("Development log", { data: "test" });

      expect(consoleLogSpy).toHaveBeenCalled();
      const logOutput = consoleLogSpy.mock.calls[0][0];

      // Should contain emoji and human-readable format
      expect(logOutput).toContain("ℹ️");
      expect(logOutput).toContain("[INFO]");
      expect(logOutput).toContain("Development log");

      process.env.NODE_ENV = originalEnv;
    });

    it("should not log debug messages in production", () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = "production";

      secureLogger.debug("Debug message");

      expect(consoleLogSpy).not.toHaveBeenCalled();

      process.env.NODE_ENV = originalEnv;
    });
  });

  describe("Error Stack Traces", () => {
    it("should include stack traces in development", () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = "development";

      const error = new Error("Test error");
      secureLogger.error("Error with stack", error);

      expect(consoleErrorSpy).toHaveBeenCalled();
      const logOutput = consoleErrorSpy.mock.calls[0][0];
      expect(logOutput).toContain("stack");

      process.env.NODE_ENV = originalEnv;
    });

    it("should exclude stack traces in production", () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = "production";

      const error = new Error("Test error");
      secureLogger.error("Error without stack", error);

      expect(consoleErrorSpy).toHaveBeenCalled();
      const logOutput = consoleErrorSpy.mock.calls[0][0];
      const parsed = JSON.parse(logOutput);
      expect(parsed.context.error.stack).toBeUndefined();

      process.env.NODE_ENV = originalEnv;
    });
  });
});
