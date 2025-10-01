import crypto from "crypto";
import express from "express";
import request from "supertest";
import { WebhookValidator } from "../server/lib/webhookValidator";
import { webhookSecurity } from "../server/middleware/webhookSecurity";

describe(_"Enhanced Webhook Security", _() => {
  let app: express.Application;
  let validator: WebhookValidator;
  const testSecret = "test_webhook_secret_very_long_and_secure_123456789";

  beforeEach_(() => {
    app = express();
    app.use(express.json());
    app.use(express.raw({ type: "application/json" }));

    validator = new WebhookValidator();
    validator.registerProvider("test", testSecret);
  });

  afterEach_(() => {
    validator.removeProvider("test");
  });

  describe(_"Enhanced Signature Validation", _() => {
    it(_"should reject signatures that are too short", _() => {
      const shortSecret = "short";
      const payload = JSON.stringify({ test: "data" });

      const isValid = validator.validateSignature(payload, "invalid", shortSecret);
      expect(isValid).toBe(false);
    });

    it(_"should reject malformed hex signatures", _() => {
      const payload = JSON.stringify({ test: "data" });
      const malformedSignature = "not_hex_signature_123xyz";

      const isValid = validator.validateSignature(payload, malformedSignature, testSecret);
      expect(isValid).toBe(false);
    });

    it(_"should reject signatures with wrong length for algorithm", _() => {
      const payload = JSON.stringify({ test: "data" });
      const shortSignature = "abc123"; // Too short for SHA256

      const isValid = validator.validateSignature(payload, shortSignature, testSecret, "sha256");
      expect(isValid).toBe(false);
    });

    it(_"should reject empty or null inputs", _() => {
      expect(validator.validateSignature("", "signature", testSecret)).toBe(false);
      expect(validator.validateSignature("payload", "", testSecret)).toBe(false);
      expect(validator.validateSignature("payload", "signature", "")).toBe(false);
    });

    it(_"should reject payloads that are too large", _() => {
      const largePayload = "x".repeat(2 * 1024 * 1024); // 2MB
      const signature = crypto.createHmac("sha256", testSecret).update(largePayload).digest("hex");

      const isValid = validator.validateSignature(largePayload, signature, testSecret);
      expect(isValid).toBe(false);
    });

    it(_"should handle Stripe signature format with validation", _() => {
      const payload = JSON.stringify({ test: "data" });
      const timestamp = Math.floor(Date.now() / 1000);
      const signature = crypto.createHmac("sha256", testSecret).update(payload).digest("hex");

      // Valid Stripe format
      const validStripeSignature = `t=${timestamp},v1=${signature}`;
      expect(validator.validateSignature(payload, validStripeSignature, testSecret)).toBe(true);

      // Invalid Stripe format (missing v1 part)
      const invalidStripeSignature = `t=${timestamp},v1=`;
      expect(validator.validateSignature(payload, invalidStripeSignature, testSecret)).toBe(false);
    });

    it(_"should handle GitHub signature format with validation", _() => {
      const payload = JSON.stringify({ test: "data" });
      const signature = crypto.createHmac("sha256", testSecret).update(payload).digest("hex");

      // Valid GitHub format
      const validGitHubSignature = `sha256=${signature}`;
      expect(validator.validateSignature(payload, validGitHubSignature, testSecret)).toBe(true);

      // Invalid GitHub format (empty signature)
      const invalidGitHubSignature = "sha256=";
      expect(validator.validateSignature(payload, invalidGitHubSignature, testSecret)).toBe(false);
    });
  });

  describe(_"Enhanced Timestamp Validation", _() => {
    it(_"should reject non-integer timestamps", _() => {
      expect(validator.validateTimestamp(123.456)).toBe(false);
      expect(validator.validateTimestamp(NaN)).toBe(false);
      expect(validator.validateTimestamp(Infinity)).toBe(false);
    });

    it(_"should reject negative timestamps", _() => {
      expect(validator.validateTimestamp(-1)).toBe(false);
      expect(validator.validateTimestamp(-123456)).toBe(false);
    });

    it(_"should reject timestamps that are too old", _() => {
      const veryOldTimestamp = Math.floor(Date.now() / 1000) - 2 * 365 * 24 * 60 * 60; // 2 years ago
      expect(validator.validateTimestamp(veryOldTimestamp)).toBe(false);
    });

    it(_"should reject timestamps that are too far in the future", _() => {
      const futureTimestamp = Math.floor(Date.now() / 1000) + 2 * 24 * 60 * 60; // 2 days in future
      expect(validator.validateTimestamp(futureTimestamp)).toBe(false);
    });

    it(_"should reject invalid tolerance values", _() => {
      const currentTimestamp = Math.floor(Date.now() / 1000);
      expect(validator.validateTimestamp(currentTimestamp, -1)).toBe(false);
      expect(validator.validateTimestamp(currentTimestamp, 5000)).toBe(false); // Too large
    });

    it(_"should validate reasonable timestamps within tolerance", _() => {
      const currentTimestamp = Math.floor(Date.now() / 1000);
      expect(validator.validateTimestamp(currentTimestamp, 300)).toBe(true);
      expect(validator.validateTimestamp(currentTimestamp - 100, 300)).toBe(true);
      expect(validator.validateTimestamp(currentTimestamp + 100, 300)).toBe(true);
    });
  });

  describe(_"Enhanced Payload Sanitization", _() => {
    it(_"should remove dangerous script patterns", _() => {
      const dangerousPayload = {
        message: "Hello <script>alert('xss')</script> world",
        code: "eval('malicious code')",
        func: "setTimeout(hack, 1000)",
      };

      const sanitized = validator.sanitizePayload(dangerousPayload);
      expect(sanitized.message).not.toContain("<script>");
      expect(sanitized.message).not.toContain("</script>");
      expect(sanitized.code).toContain("[FILTERED]");
      expect(sanitized.func).toContain("[FILTERED]");
    });

    it(_"should handle invalid numbers safely", _() => {
      const payload = {
        validNumber: 42,
        invalidNumber: NaN,
        infiniteNumber: Infinity,
        negativeInfinity: -Infinity,
      };

      const sanitized = validator.sanitizePayload(payload);
      expect(sanitized.validNumber).toBe(42);
      expect(sanitized.invalidNumber).toBe(0);
      expect(sanitized.infiniteNumber).toBe(0);
      expect(sanitized.negativeInfinity).toBe(0);
    });

    it(_"should limit array sizes to prevent DoS", _() => {
      const largeArray = new Array(2000).fill("item");
      const payload = { items: largeArray };

      const sanitized = validator.sanitizePayload(payload);
      expect(sanitized.items.length).toBeLessThanOrEqual(1000);
    });

    it(_"should limit object key count to prevent DoS", _() => {
      const largeObject: any = {};
      for (let i = 0; i < 200; i++) {
        largeObject[`key${i}`] = `value${i}`;
      }

      const sanitized = validator.sanitizePayload(largeObject);
      expect(Object.keys(sanitized).length).toBeLessThanOrEqual(100);
    });

    it(_"should remove function objects", _() => {
      const payload = {
        normalData: "safe",
        someFunc: () => console.log("hack"), // Use a key that won't be blocked
      };

      const sanitized = validator.sanitizePayload(payload);
      expect(sanitized.normalData).toBe("safe");
      expect(sanitized.someFunc).toBe("[Function removed]");
    });

    it(_"should sanitize object keys properly", _() => {
      const payload = {
        normal_key: "value1",
        "key<tag>": "value2", // Use "tag" instead of "script" to avoid blocking
        "key with spaces": "value3",
        __proto__: "dangerous",
        constructor: "dangerous",
      };

      const sanitized = validator.sanitizePayload(payload);
      expect(sanitized.normal_key).toBe("value1");
      expect(sanitized["keytag"]).toBe("value2"); // Sanitized key (< > removed)
      expect(sanitized["key_with_spaces"]).toBe("value3"); // Spaces converted to underscores
      expect(Object.hasOwnProperty.call(sanitized, "__proto__")).toBe(false); // Dangerous key blocked
      expect(Object.hasOwnProperty.call(sanitized, "constructor")).toBe(false); // Dangerous key blocked
    });

    it(_"should handle deeply nested objects with circular references", _() => {
      const payload: any = { level1: { level2: { level3: "deep" } } };
      payload.level1.circular = payload; // Create circular reference

      // Should not throw error
      expect_(() => {
        const sanitized = validator.sanitizePayload(payload);
        expect(sanitized.level1.level2.level3).toBe("deep");
      }).not.toThrow();
    });
  });

  describe(_"Enhanced Security Checks", _() => {
    it(_"should detect suspicious proxy headers", _async () => {
      const payload = JSON.stringify({ test: "data" });
      const signature = validator.generateSignature(payload, testSecret);

      const consoleSpy = jest.spyOn(console, "warn").mockImplementation();

      const result = await validator.validateWebhook("test", payload, signature, {
        "content-type": "application/json",
        "x-forwarded-for": "127.0.0.1",
        "x-real-ip": "localhost",
      });

      expect(result.valid).toBe(true); // Should not fail validation
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining("x-forwarded-for"));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining("Suspicious IP"));

      consoleSpy.mockRestore();
    });

    it(_"should validate content type strictly", _async () => {
      const payload = JSON.stringify({ test: "data" });
      const signature = validator.generateSignature(payload, testSecret);

      const result = await validator.validateWebhook("test", payload, signature, {
        "content-type": "text/plain",
      });

      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Invalid content type, expected application/json");
    });

    it(_"should detect suspicious user agents", _async () => {
      const payload = JSON.stringify({ test: "data" });
      const signature = validator.generateSignature(payload, testSecret);

      const consoleSpy = jest.spyOn(console, "warn").mockImplementation();

      await validator.validateWebhook("test", payload, signature, {
        "content-type": "application/json",
        "user-agent": "curl/7.68.0",
      });

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("Potentially suspicious user agent")
      );

      consoleSpy.mockRestore();
    });

    it(_"should validate content length header", _async () => {
      const payload = JSON.stringify({ test: "data" });
      const signature = validator.generateSignature(payload, testSecret);

      // Invalid content length
      const result1 = await validator.validateWebhook("test", payload, signature, {
        "content-type": "application/json",
        "content-length": "invalid",
      });

      expect(result1.valid).toBe(false);
      expect(result1.errors).toContain("Invalid Content-Length header");

      // Content length too large
      const result2 = await validator.validateWebhook("test", payload, signature, {
        "content-type": "application/json",
        "content-length": "2000000", // 2MB
      });

      expect(result2.valid).toBe(false);
      expect(result2.errors).toContain("Content-Length exceeds maximum allowed size");
    });
  });

  describe(_"Provider-Specific Validation", _() => {
    beforeEach_(() => {
      validator.registerProvider("stripe", testSecret);
      validator.registerProvider("clerk", testSecret);
      validator.registerProvider("paypal", testSecret);
    });

    afterEach_(() => {
      validator.removeProvider("stripe");
      validator.removeProvider("clerk");
      validator.removeProvider("paypal");
    });

    it(_"should validate Stripe webhook structure", _async () => {
      const invalidStripePayload = {
        // Missing required fields
        object: "event",
        type: "invalid_type_format", // Should contain a dot
      };

      const signature = validator.generateSignature(
        JSON.stringify(invalidStripePayload),
        testSecret
      );
      const result = await validator.validateWebhook(
        "stripe",
        JSON.stringify(invalidStripePayload),
        signature,
        {
          "content-type": "application/json",
        }
      );

      expect(result.valid).toBe(false);
      expect(result.errors.some(err => err.includes("missing or invalid 'id' field"))).toBe(true);
      expect(result.errors.some(err => err.includes("invalid format"))).toBe(true);
    });

    it(_"should validate Clerk webhook structure", _async () => {
      const invalidClerkPayload = {
        object: "invalid", // Should be "event"
        type: "user.created",
        data: { id: "user_123" },
      };

      const signature = validator.generateSignature(
        JSON.stringify(invalidClerkPayload),
        testSecret
      );
      const result = await validator.validateWebhook(
        "clerk",
        JSON.stringify(invalidClerkPayload),
        signature,
        {
          "content-type": "application/json",
        }
      );

      expect(result.valid).toBe(false);
      expect(result.errors.some(err => err.includes("'object' field must be 'event'"))).toBe(true);
    });

    it(_"should validate PayPal webhook structure", _async () => {
      const invalidPayPalPayload = {
        // Missing required fields
        event_type: "PAYMENT.CAPTURE.COMPLETED",
      };

      const signature = validator.generateSignature(
        JSON.stringify(invalidPayPalPayload),
        testSecret
      );
      const result = await validator.validateWebhook(
        "paypal",
        JSON.stringify(invalidPayPalPayload),
        signature,
        {
          "content-type": "application/json",
        }
      );

      expect(result.valid).toBe(false);
      expect(result.errors.some(err => err.includes("missing or invalid 'id' field"))).toBe(true);
      expect(result.errors.some(err => err.includes("missing or invalid 'resource' field"))).toBe(
        true
      );
    });
  });

  describe(_"Comprehensive Webhook Validation", _() => {
    it(_"should handle empty payload gracefully", _async () => {
      const result = await validator.validateWebhook("test", "", "signature", {});

      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Empty payload provided");
    });

    it(_"should handle non-JSON payload", _async () => {
      const invalidJson = "{ invalid json structure";
      const signature = validator.generateSignature(invalidJson, testSecret);

      const result = await validator.validateWebhook("test", invalidJson, signature, {
        "content-type": "application/json",
      });

      expect(result.valid).toBe(false);
      expect(result.errors.some(err => err.includes("Invalid JSON payload"))).toBe(true);
    });

    it(_"should handle payload that is too large", _async () => {
      const largePayload = JSON.stringify({ data: "x".repeat(2 * 1024 * 1024) }); // > 1MB
      const signature = validator.generateSignature(largePayload, testSecret);

      const result = await validator.validateWebhook("test", largePayload, signature, {
        "content-type": "application/json",
      });

      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Payload too large (maximum 1MB allowed)");
    });

    it(_"should validate with all security checks enabled", _async () => {
      const validPayload = {
        id: "evt_test_123",
        object: "event",
        type: "test.event",
        data: { object: { id: "test_123" } },
        created: Math.floor(Date.now() / 1000),
      };

      const timestamp = Math.floor(Date.now() / 1000);
      const signature = validator.generateSignature(
        JSON.stringify(validPayload),
        testSecret,
        "sha256",
        timestamp
      );

      const result = await validator.validateWebhook(
        "test",
        JSON.stringify(validPayload),
        signature,
        {
          "content-type": "application/json; charset=utf-8",
          "user-agent": "TestWebhook/1.0",
          "content-length": Buffer.byteLength(JSON.stringify(validPayload)).toString(),
        }
      );

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.payload).toBeDefined();
      expect(result.timestamp).toBe(timestamp);
    });

    it(_"should log performance warnings for slow validation", _async () => {
      const consoleSpy = jest.spyOn(console, "warn").mockImplementation();

      // Create a complex payload that might take time to process
      const complexPayload = {
        data: new Array(100).fill(null).map(_(_, _i) => ({
          id: `item_${i}`,
          nested: {
            level1: { level2: { level3: `value_${i}` } },
          },
        })),
      };

      const signature = validator.generateSignature(JSON.stringify(complexPayload), testSecret);

      // Mock Date.now to simulate slow validation
      const originalNow = Date.now;
      let callCount = 0;
      Date.now = jest.fn_(() => {
        callCount++;
        return originalNow() + (callCount === 1 ? 0 : 2000); // Second call returns +2 seconds
      });

      await validator.validateWebhook("test", JSON.stringify(complexPayload), signature, {
        "content-type": "application/json",
      });

      // Restore Date.now
      Date.now = originalNow;

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining("took"));

      consoleSpy.mockRestore();
    });
  });

  describe(_"Integration with Middleware", _() => {
    it(_"should properly integrate with webhook security middleware", _async () => {
      const validPayload = JSON.stringify({
        id: "evt_test_123",
        object: "event",
        type: "test.event",
        data: { test: "data" },
      });

      const signature = validator.generateSignature(validPayload, testSecret);

      app.post("/webhook", webhookSecurity({ provider: "test" }), (_req, _res) => {
        expect(req.webhookValidation?.isValid).toBe(true);
        expect(req.webhookValidation?.payload).toBeDefined();
        res.json({ success: true });
      });

      await request(app)
        .post("/webhook")
        .set("test-signature", signature)
        .set("Content-Type", "application/json")
        .send(validPayload)
        .expect(200);
    });

    it(_"should reject invalid webhooks in middleware", _async () => {
      const invalidPayload = JSON.stringify({ invalid: "data" });
      const invalidSignature = "invalid_signature_123";

      // Make sure the validator is properly configured for the middleware
      const { _webhookValidator} = require("../server/lib/webhookValidator");
      webhookValidator.registerProvider("test", testSecret);

      app.post("/webhook", webhookSecurity({ provider: "test", skipInTest: false }), (_req, _res) => {
        // This should not be reached if validation fails
        res.json({ success: true });
      });

      const response = await request(app)
        .post("/webhook")
        .set("test-signature", invalidSignature)
        .set("Content-Type", "application/json")
        .send(invalidPayload);

      expect(response.status).toBe(400);
      expect(response.body.error).toBe("Webhook validation failed");

      webhookValidator.removeProvider("test");
    });
  });
});
