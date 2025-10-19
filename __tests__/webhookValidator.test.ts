import crypto from "crypto";
import { WEBHOOK_CONFIGS, WebhookValidator } from "../server/lib/webhookValidator";

describe("WebhookValidator", () => {
  let validator: WebhookValidator;
  const testSecret = "test_webhook_secret_key_12345";
  const testPayload = JSON.stringify({
    id: "evt_test_123",
    object: "event",
    type: "payment_intent.succeeded",
    data: { object: { id: "pi_test_123", object: "payment_intent" } },
    created: Math.floor(Date.now() / 1000),
    livemode: false,
    pending_webhooks: 1,
    request: { id: null, idempotency_key: null },
  });

  beforeEach(() => {
    validator = new WebhookValidator();
    validator.registerProvider("stripe", testSecret);
  });

  describe("Signature Validation", () => {
    it("should validate correct HMAC signature", () => {
      const signature = crypto.createHmac("sha256", testSecret).update(testPayload).digest("hex");

      const isValid = validator.validateSignature(testPayload, signature, testSecret);
      expect(isValid).toBe(true);
    });

    it("should reject invalid signature", () => {
      const invalidSignature = "invalid_signature_123";
      const isValid = validator.validateSignature(testPayload, invalidSignature, testSecret);
      expect(isValid).toBe(false);
    });

    it("should handle Stripe signature format with timestamp", () => {
      const timestamp = Math.floor(Date.now() / 1000);
      const signature = crypto.createHmac("sha256", testSecret).update(testPayload).digest("hex");
      const stripeSignature = `t=${timestamp},v1=${signature}`;

      const isValid = validator.validateSignature(testPayload, stripeSignature, testSecret);
      expect(isValid).toBe(true);
    });

    it("should handle GitHub signature format", () => {
      const signature = crypto.createHmac("sha256", testSecret).update(testPayload).digest("hex");
      const githubSignature = `sha256=${signature}`;

      const isValid = validator.validateSignature(testPayload, githubSignature, testSecret);
      expect(isValid).toBe(true);
    });

    it("should handle Clerk/Svix multiple signatures", () => {
      const signature1 = crypto.createHmac("sha256", testSecret).update(testPayload).digest("hex");
      const signature2 = crypto
        .createHmac("sha256", "wrong_secret")
        .update(testPayload)
        .digest("hex");
      const svixSignature = `v1,${signature1} v1,${signature2}`;

      const isValid = validator.validateSignature(testPayload, svixSignature, testSecret);
      expect(isValid).toBe(true);
    });

    it("should use constant time comparison to prevent timing attacks", () => {
      const correctSignature = crypto
        .createHmac("sha256", testSecret)
        .update(testPayload)
        .digest("hex");

      // Create signature with same length but different content
      const wrongSignature = correctSignature.replace(/a/g, "b").replace(/1/g, "2");

      const startTime = process.hrtime.bigint();
      const isValid1 = validator.validateSignature(testPayload, wrongSignature, testSecret);
      const time1 = process.hrtime.bigint() - startTime;

      const startTime2 = process.hrtime.bigint();
      const isValid2 = validator.validateSignature(testPayload, correctSignature, testSecret);
      const time2 = process.hrtime.bigint() - startTime2;

      expect(isValid1).toBe(false);
      expect(isValid2).toBe(true);

      // Times should be similar (within reasonable variance)
      const timeDiff = Number(time1 - time2) / 1000000; // Convert to milliseconds
      expect(Math.abs(timeDiff)).toBeLessThan(10); // Less than 10ms difference
    });
  });

  describe("Timestamp Validation", () => {
    it("should validate current timestamp", () => {
      const currentTimestamp = Math.floor(Date.now() / 1000);
      const isValid = validator.validateTimestamp(currentTimestamp, 300);
      expect(isValid).toBe(true);
    });

    it("should reject old timestamp outside tolerance", () => {
      const oldTimestamp = Math.floor(Date.now() / 1000) - 600; // 10 minutes ago
      const isValid = validator.validateTimestamp(oldTimestamp, 300); // 5 minute tolerance
      expect(isValid).toBe(false);
    });

    it("should reject future timestamp outside tolerance", () => {
      const futureTimestamp = Math.floor(Date.now() / 1000) + 600; // 10 minutes in future
      const isValid = validator.validateTimestamp(futureTimestamp, 300); // 5 minute tolerance
      expect(isValid).toBe(false);
    });

    it("should extract timestamp from Stripe signature", () => {
      const timestamp = Math.floor(Date.now() / 1000);
      const signature = `t=${timestamp},v1=test_signature`;
      const extracted = validator.extractTimestamp(signature);
      expect(extracted).toBe(timestamp);
    });

    it("should return null for signature without timestamp", () => {
      const signature = "v1=test_signature";
      const extracted = validator.extractTimestamp(signature);
      expect(extracted).toBeNull();
    });
  });

  describe("Payload Sanitization", () => {
    it("should sanitize dangerous characters from strings", () => {
      const dangerousPayload = {
        message: '<script>alert("xss")</script>',
        description: 'Normal text & some "quotes"',
      };

      const sanitized = validator.sanitizePayload(dangerousPayload);
      expect(sanitized.message).not.toContain("<script>");
      expect(sanitized.message).not.toContain("</script>");
      expect(sanitized.description).toBeDefined();
      expect(sanitized.description).not.toContain("&");
      expect(sanitized.description).not.toContain('"');
    });

    it("should block dangerous object keys", () => {
      const dangerousPayload = {
        __proto__: { admin: true },
        constructor: { name: "hack" },
        prototype: { value: "evil" },
        normalKey: "safe value",
      };

      const sanitized = validator.sanitizePayload(dangerousPayload);
      // Check that dangerous keys are not copied from the original object
      expect(Object.hasOwnProperty.call(sanitized, "__proto__")).toBe(false);
      expect(Object.hasOwnProperty.call(sanitized, "constructor")).toBe(false);
      expect(Object.hasOwnProperty.call(sanitized, "prototype")).toBe(false);
      expect(sanitized.normalKey).toBe("safe value");
    });

    it("should truncate long strings", () => {
      const longString = "a".repeat(20000);
      const payload = { longField: longString };

      const sanitized = validator.sanitizePayload(payload);
      expect(sanitized.longField.length).toBeLessThan(longString.length);
      expect(sanitized.longField).toContain("[Truncated]");
    });

    it("should handle nested objects within depth limit", () => {
      const deepPayload = {
        level1: {
          level2: {
            level3: {
              level4: {
                level5: "deep value",
              },
            },
          },
        },
      };

      const sanitized = validator.sanitizePayload(deepPayload);
      expect(sanitized.level1.level2.level3.level4.level5).toBe("deep value");
    });

    it("should prevent infinite recursion with max depth", () => {
      const validator = new WebhookValidator({ maxDepth: 3 });
      const deepPayload: Record<string, unknown> = {};
      let current = deepPayload;

      // Create object deeper than max depth
      for (let i = 0; i < 10; i++) {
        current.next = {};
        current = current.next;
      }
      current.value = "too deep";

      const sanitized = validator.sanitizePayload(deepPayload);
      expect(JSON.stringify(sanitized)).toContain("[Max depth exceeded]");
    });

    it("should preserve arrays and primitive types", () => {
      const payload = {
        numbers: [1, 2, 3],
        booleans: [true, false],
        nullValue: null,
        undefinedValue: undefined,
        string: "test",
      };

      const sanitized = validator.sanitizePayload(payload);
      expect(sanitized.numbers).toEqual([1, 2, 3]);
      expect(sanitized.booleans).toEqual([true, false]);
      expect(sanitized.nullValue).toBeNull();
      expect(sanitized.undefinedValue).toBeUndefined();
      expect(sanitized.string).toBe("test");
    });
  });

  describe("Schema Validation", () => {
    it("should validate correct Stripe webhook payload", () => {
      const stripePayload = {
        id: "evt_test_123",
        object: "event",
        type: "payment_intent.succeeded",
        data: { object: { id: "pi_test_123", object: "payment_intent" } },
        created: Math.floor(Date.now() / 1000),
        livemode: false,
        pending_webhooks: 1,
        request: { id: null, idempotency_key: null },
      };

      const result = validator.validatePayloadSchema(stripePayload, "stripe");
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("should reject invalid Stripe webhook payload", () => {
      const invalidPayload = {
        id: "evt_test_123",
        object: "invalid_object", // Should be 'event'
        type: "payment_intent.succeeded",
        // Missing required fields
      };

      const result = validator.validatePayloadSchema(invalidPayload, "stripe");
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it("should validate correct Clerk webhook payload", () => {
      const clerkPayload = {
        type: "user.created",
        object: "event",
        data: { id: "user_123", email: "test@example.com" },
      };

      const result = validator.validatePayloadSchema(clerkPayload, "clerk");
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("should handle unknown provider schema", () => {
      const payload = { test: "data" };
      const result = validator.validatePayloadSchema(payload, "unknown" as any);
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain("No schema defined for provider");
    });
  });

  describe("Comprehensive Webhook Validation", () => {
    it("should validate complete webhook with all checks", async () => {
      const timestamp = Math.floor(Date.now() / 1000);
      const signature = validator.generateSignature(testPayload, testSecret, "sha256", timestamp);
      const headers = {
        "content-type": "application/json",
        "user-agent": "Stripe/1.0",
      };

      const result = await validator.validateWebhook("stripe", testPayload, signature, headers);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.timestamp).toBe(timestamp);
      expect(result.payload).toBeDefined();
    });

    it("should fail validation with invalid signature", async () => {
      const invalidSignature = "invalid_signature";
      const headers = { "content-type": "application/json" };

      const result = await validator.validateWebhook(
        "stripe",
        testPayload,
        invalidSignature,
        headers
      );

      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Invalid signature");
    });

    it("should fail validation with old timestamp", async () => {
      const oldTimestamp = Math.floor(Date.now() / 1000) - 600; // 10 minutes ago
      const signature = validator.generateSignature(
        testPayload,
        testSecret,
        "sha256",
        oldTimestamp
      );
      const headers = { "content-type": "application/json" };

      const result = await validator.validateWebhook("stripe", testPayload, signature, headers);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Timestamp outside tolerance window");
    });

    it("should fail validation with invalid JSON", async () => {
      const invalidJson = "{ invalid json }";
      const signature = validator.generateSignature(invalidJson, testSecret);
      const headers = { "content-type": "application/json" };

      const result = await validator.validateWebhook("stripe", invalidJson, signature, headers);

      expect(result.valid).toBe(false);
      expect(result.errors.some(err => err.includes("Invalid JSON payload"))).toBe(true);
    });

    it("should fail validation for unknown provider", async () => {
      const signature = validator.generateSignature(testPayload, testSecret);
      const headers = { "content-type": "application/json" };

      const result = await validator.validateWebhook(
        "unknown_provider",
        testPayload,
        signature,
        headers
      );

      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain("No configuration found for provider");
    });

    it("should warn about suspicious headers", async () => {
      const signature = validator.generateSignature(testPayload, testSecret);
      const headers = {
        "content-type": "application/json",
        "x-forwarded-for": "192.168.1.1",
        "x-real-ip": "10.0.0.1",
      };

      const consoleSpy = jest.spyOn(console, "warn").mockImplementation();

      const result = await validator.validateWebhook("stripe", testPayload, signature, headers);

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining("x-forwarded-for"));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining("x-real-ip"));

      consoleSpy.mockRestore();
    });

    it("should validate content type", async () => {
      const signature = validator.generateSignature(testPayload, testSecret);
      const headers = { "content-type": "text/plain" };

      const result = await validator.validateWebhook("stripe", testPayload, signature, headers);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Invalid content type, expected application/json");
    });
  });

  describe("Provider Management", () => {
    it("should register and retrieve provider configuration", () => {
      const config = validator.getConfig("stripe");
      expect(config).toBeDefined();
      expect(config?.secret).toBe(testSecret);
    });

    it("should list all registered providers", () => {
      validator.registerProvider("clerk", "clerk_secret");
      validator.registerProvider("paypal", "paypal_secret");

      const providers = validator.getProviders();
      expect(providers).toContain("stripe");
      expect(providers).toContain("clerk");
      expect(providers).toContain("paypal");
    });

    it("should remove provider configuration", () => {
      validator.registerProvider("test_provider", "test_secret");
      expect(validator.getConfig("test_provider")).toBeDefined();

      const removed = validator.removeProvider("test_provider");
      expect(removed).toBe(true);
      expect(validator.getConfig("test_provider")).toBeUndefined();
    });

    it("should return false when removing non-existent provider", () => {
      const removed = validator.removeProvider("non_existent");
      expect(removed).toBe(false);
    });
  });

  describe("Signature Generation for Testing", () => {
    it("should generate valid signature for testing", () => {
      const signature = validator.generateSignature(testPayload, testSecret);
      const isValid = validator.validateSignature(testPayload, signature, testSecret);
      expect(isValid).toBe(true);
    });

    it("should generate Stripe-format signature with timestamp", () => {
      const timestamp = Math.floor(Date.now() / 1000);
      const signature = validator.generateSignature(testPayload, testSecret, "sha256", timestamp);

      expect(signature).toContain(`t=${timestamp}`);
      expect(signature).toContain("v1=");

      const isValid = validator.validateSignature(testPayload, signature, testSecret);
      expect(isValid).toBe(true);
    });
  });

  describe("Security Edge Cases", () => {
    it("should handle empty payload", async () => {
      const emptyPayload = "";
      const signature = validator.generateSignature(emptyPayload, testSecret);
      const headers = { "content-type": "application/json" };

      const result = await validator.validateWebhook("stripe", emptyPayload, signature, headers);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Empty payload provided");
    });

    it("should handle null bytes in payload", () => {
      const payloadWithNull = "test\x00payload";
      const sanitized = validator.sanitizePayload(payloadWithNull);
      expect(sanitized).not.toContain("\x00");
    });

    it("should handle unicode characters safely", () => {
      const unicodePayload = { message: "🚀 Test with émojis and àccénts" };
      const sanitized = validator.sanitizePayload(unicodePayload);
      expect(sanitized.message).toContain("🚀");
      expect(sanitized.message).toContain("émojis");
      expect(sanitized.message).toContain("àccénts");
    });

    it("should handle circular references", () => {
      const circularPayload: Record<string, unknown> = { name: "test" };
      circularPayload.self = circularPayload;

      // Should not throw error, should handle gracefully
      expect(() => {
        validator.sanitizePayload(circularPayload);
      }).not.toThrow();
    });
  });

  describe("Default Configuration", () => {
    it("should have correct default configurations", () => {
      expect(WEBHOOK_CONFIGS.stripe.algorithm).toBe("sha256");
      expect(WEBHOOK_CONFIGS.stripe.headerName).toBe("stripe-signature");
      expect(WEBHOOK_CONFIGS.clerk.headerName).toBe("svix-signature");
      expect(WEBHOOK_CONFIGS.paypal.headerName).toBe("paypal-transmission-sig");
      expect(WEBHOOK_CONFIGS.github.headerName).toBe("x-hub-signature-256");
    });
  });
});

describe("Singleton WebhookValidator", () => {
  it("should initialize with environment variables", () => {
    // Mock environment variables
    const originalEnv = process.env;
    process.env = {
      ...originalEnv,
      STRIPE_WEBHOOK_SECRET: "stripe_test_secret",
      CLERK_WEBHOOK_SECRET: "clerk_test_secret",
    };

    // Re-import to trigger initialization
    jest.resetModules();
    const { webhookValidator: newValidator } = require("../server/lib/webhookValidator");

    expect(newValidator.getConfig("stripe")).toBeDefined();
    expect(newValidator.getConfig("clerk")).toBeDefined();

    // Restore environment
    process.env = originalEnv;
  });
});
