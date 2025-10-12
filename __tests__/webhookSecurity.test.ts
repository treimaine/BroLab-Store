import express from "express";
import request from "supertest";
import { webhookValidator } from "../server/lib/webhookValidator";
import {
  createWebhookSecurityStack,
  requireWebhookValidation,
  webhookIdempotency,
  webhookRateLimit,
  webhookSecurity,
  webhookSecurityHeaders,
} from "../server/middleware/webhookSecurity";

describe("Webhook Security Middleware", () => {
  let app: express.Application;
  const testSecret = "test_webhook_secret_123";
  const testPayload = JSON.stringify({
    id: "evt_test_123",
    object: "event",
    type: "test.event",
    data: { object: { id: "test_123" } },
    created: Math.floor(Date.now() / 1000),
    livemode: false,
    pending_webhooks: 1,
    request: { id: null, idempotency_key: null },
  });

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use(express.raw({ type: "application/json" }));

    // Register test provider
    webhookValidator.registerProvider("test", testSecret);
  });

  afterEach(() => {
    webhookValidator.removeProvider("test");
  });

  describe("webhookSecurity middleware", () => {
    it("should validate correct webhook signature", async () => {
      const signature = webhookValidator.generateSignature(testPayload, testSecret);

      app.post("/webhook", webhookSecurity({ provider: "test" }), (req, res) => {
        expect(req.webhookValidation?.isValid).toBe(true);
        expect(req.webhookValidation?.payload).toBeDefined();
        res.json({ success: true });
      });

      await request(app)
        .post("/webhook")
        .set("test-signature", signature)
        .set("Content-Type", "application/json")
        .send(testPayload)
        .expect(200);
    });

    it("should reject invalid webhook signature", async () => {
      const invalidSignature = "invalid_signature_123";

      app.post("/webhook", webhookSecurity({ provider: "test", skipInTest: false }), (req, res) => {
        res.json({ success: true });
      });

      await request(app)
        .post("/webhook")
        .set("test-signature", invalidSignature)
        .set("Content-Type", "application/json")
        .send(testPayload)
        .expect(400)
        .expect(res => {
          expect(res.body.error).toBe("Webhook validation failed");
          expect(res.body.details).toContain("Invalid signature");
        });
    });

    it("should skip validation in test environment when configured", async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = "test";

      app.post(
        "/webhook",
        webhookSecurity({
          provider: "test",
          skipInTest: true,
        }),
        (req, res) => {
          expect(req.webhookValidation?.isValid).toBe(true);
          res.json({ success: true });
        }
      );

      await request(app)
        .post("/webhook")
        .set("Content-Type", "application/json")
        .send(testPayload)
        .expect(200);

      process.env.NODE_ENV = originalEnv;
    });

    it("should handle missing signature when not required", async () => {
      app.post(
        "/webhook",
        webhookSecurity({
          provider: "test",
          required: false,
        }),
        (req, res) => {
          expect(req.webhookValidation?.isValid).toBe(true);
          res.json({ success: true });
        }
      );

      await request(app)
        .post("/webhook")
        .set("Content-Type", "application/json")
        .send(testPayload)
        .expect(200);
    });

    it("should run custom validation when provided", async () => {
      const signature = webhookValidator.generateSignature(testPayload, testSecret);
      const customValidation = jest.fn().mockResolvedValue({
        valid: false,
        errors: ["Custom validation failed"],
      });

      app.post(
        "/webhook",
        webhookSecurity({
          provider: "test",
          skipInTest: false,
          customValidation,
        }),
        (req, res) => {
          res.json({ success: true });
        }
      );

      await request(app)
        .post("/webhook")
        .set("test-signature", signature)
        .set("Content-Type", "application/json")
        .send(testPayload)
        .expect(400)
        .expect(res => {
          expect(res.body.details).toContain("Custom validation failed");
        });

      expect(customValidation).toHaveBeenCalled();
    });

    it("should handle provider configuration not found", async () => {
      app.post(
        "/webhook",
        webhookSecurity({ provider: "nonexistent", skipInTest: false }),
        (req, res) => {
          res.json({ success: true });
        }
      );

      await request(app)
        .post("/webhook")
        .set("Content-Type", "application/json")
        .send(testPayload)
        .expect(500)
        .expect(res => {
          expect(res.body.error).toBe("Webhook configuration not found");
        });
    });
  });

  describe("requireWebhookValidation middleware", () => {
    it("should pass when webhook validation is present and valid", async () => {
      app.post(
        "/webhook",
        (req, _res, next) => {
          req.webhookValidation = {
            provider: "test",
            payload: JSON.parse(testPayload),
            isValid: true,
            errors: [],
          };
          next();
        },
        requireWebhookValidation,
        (req, res) => {
          res.json({ success: true });
        }
      );

      await request(app).post("/webhook").send(testPayload).expect(200);
    });

    it("should fail when webhook validation is not present", async () => {
      app.post("/webhook", requireWebhookValidation, (req, res) => {
        res.json({ success: true });
      });

      await request(app)
        .post("/webhook")
        .send(testPayload)
        .expect(500)
        .expect(res => {
          expect(res.body.error).toBe("Webhook validation middleware not configured");
        });
    });

    it("should fail when webhook validation is invalid", async () => {
      app.post(
        "/webhook",
        (req, _res, next) => {
          req.webhookValidation = {
            provider: "test",
            payload: JSON.parse(testPayload),
            isValid: false,
            errors: ["Validation failed"],
          };
          next();
        },
        requireWebhookValidation,
        (req, res) => {
          res.json({ success: true });
        }
      );

      await request(app)
        .post("/webhook")
        .send(testPayload)
        .expect(400)
        .expect(res => {
          expect(res.body.error).toBe("Webhook validation failed");
          expect(res.body.details).toContain("Validation failed");
        });
    });
  });

  describe("webhookRateLimit middleware", () => {
    it("should allow requests within rate limit", async () => {
      app.post("/webhook", webhookRateLimit({ maxRequests: 5, windowMs: 1000 }), (req, res) => {
        res.json({ success: true });
      });

      // Make 3 requests (within limit)
      for (let i = 0; i < 3; i++) {
        await request(app).post("/webhook").send(testPayload).expect(200);
      }
    });

    it("should block requests exceeding rate limit", async () => {
      app.post("/webhook", webhookRateLimit({ maxRequests: 2, windowMs: 1000 }), (req, res) => {
        res.json({ success: true });
      });

      // Make 2 requests (at limit)
      await request(app).post("/webhook").send(testPayload).expect(200);
      await request(app).post("/webhook").send(testPayload).expect(200);

      // Third request should be blocked
      await request(app)
        .post("/webhook")
        .send(testPayload)
        .expect(429)
        .expect(res => {
          expect(res.body.error).toBe("Rate limit exceeded");
          expect(res.body.retryAfter).toBeDefined();
        });
    });

    it("should set rate limit headers", async () => {
      app.post("/webhook", webhookRateLimit({ maxRequests: 5, windowMs: 1000 }), (req, res) => {
        res.json({ success: true });
      });

      await request(app)
        .post("/webhook")
        .send(testPayload)
        .expect(200)
        .expect(res => {
          expect(res.headers["x-ratelimit-limit"]).toBe("5");
          expect(res.headers["x-ratelimit-remaining"]).toBe("4");
          expect(res.headers["x-ratelimit-reset"]).toBeDefined();
        });
    });

    it("should use custom key generator", async () => {
      const keyGenerator = jest.fn().mockReturnValue("custom-key");

      app.post(
        "/webhook",
        webhookRateLimit({
          maxRequests: 1,
          windowMs: 1000,
          keyGenerator,
        }),
        (req, res) => {
          res.json({ success: true });
        }
      );

      await request(app).post("/webhook").send(testPayload).expect(200);
      await request(app).post("/webhook").send(testPayload).expect(429);

      expect(keyGenerator).toHaveBeenCalled();
    });
  });

  describe("webhookIdempotency middleware", () => {
    it("should allow first request and cache response", async () => {
      const keyExtractor = jest.fn().mockReturnValue("test-key-123");

      app.post("/webhook", webhookIdempotency({ keyExtractor }), (req, res) => {
        res.json({ success: true, timestamp: Date.now() });
      });

      const response1 = await request(app).post("/webhook").send(testPayload).expect(200);

      expect(keyExtractor).toHaveBeenCalled();
      expect(response1.body.success).toBe(true);
    });

    it("should return cached response for duplicate requests", async () => {
      const keyExtractor = jest.fn().mockReturnValue("test-key-456");
      let callCount = 0;

      app.post("/webhook", webhookIdempotency({ keyExtractor }), (req, res) => {
        callCount++;
        res.json({ success: true, callCount });
      });

      // First request
      const response1 = await request(app).post("/webhook").send(testPayload).expect(200);

      // Second request (should return cached response)
      const response2 = await request(app).post("/webhook").send(testPayload).expect(200);

      expect(response1.body.callCount).toBe(1);
      expect(response2.body.callCount).toBe(1); // Same as first response
      expect(callCount).toBe(1); // Handler only called once
    });

    it("should skip idempotency when no key is provided", async () => {
      const keyExtractor = jest.fn().mockReturnValue(null);
      let callCount = 0;

      app.post("/webhook", webhookIdempotency({ keyExtractor }), (req, res) => {
        callCount++;
        res.json({ success: true, callCount });
      });

      await request(app).post("/webhook").send(testPayload).expect(200);
      await request(app).post("/webhook").send(testPayload).expect(200);

      expect(callCount).toBe(2); // Both requests processed
    });
  });

  describe("webhookSecurityHeaders middleware", () => {
    it("should set security headers", async () => {
      app.post("/webhook", webhookSecurityHeaders, (req, res) => {
        res.json({ success: true });
      });

      await request(app)
        .post("/webhook")
        .send(testPayload)
        .expect(200)
        .expect(res => {
          expect(res.headers["x-content-type-options"]).toBe("nosniff");
          expect(res.headers["x-frame-options"]).toBe("DENY");
          expect(res.headers["x-xss-protection"]).toBe("1; mode=block");
          expect(res.headers["strict-transport-security"]).toBe(
            "max-age=31536000; includeSubDomains"
          );
          expect(res.headers["cache-control"]).toBe("no-cache, no-store, must-revalidate");
        });
    });
  });

  describe("createWebhookSecurityStack", () => {
    it("should create comprehensive security middleware stack", async () => {
      const signature = webhookValidator.generateSignature(testPayload, testSecret);
      const middlewares = createWebhookSecurityStack("test", {
        required: true,
        rateLimit: { maxRequests: 10, windowMs: 1000 },
        idempotencyKeyExtractor: req => (req.headers["idempotency-key"] as string) || null,
      });

      app.post("/webhook", ...middlewares, (req, res) => {
        expect(req.webhookValidation?.isValid).toBe(true);
        res.json({ success: true });
      });

      await request(app)
        .post("/webhook")
        .set("test-signature", signature)
        .set("idempotency-key", "test-123")
        .set("Content-Type", "application/json")
        .send(testPayload)
        .expect(200)
        .expect(res => {
          // Check security headers are set
          expect(res.headers["x-content-type-options"]).toBe("nosniff");
          // Check rate limit headers are set
          expect(res.headers["x-ratelimit-limit"]).toBe("10");
        });
    });

    it("should handle custom validation in security stack", async () => {
      const signature = webhookValidator.generateSignature(testPayload, testSecret);
      const customValidation = jest.fn().mockResolvedValue({
        valid: true,
        errors: [],
      });

      const middlewares = createWebhookSecurityStack("test", {
        skipInTest: false,
        customValidation,
      });

      app.post("/webhook", ...middlewares, (req, res) => {
        res.json({ success: true });
      });

      await request(app)
        .post("/webhook")
        .set("test-signature", signature)
        .set("Content-Type", "application/json")
        .send(testPayload)
        .expect(200);

      expect(customValidation).toHaveBeenCalled();
    });
  });

  describe("Integration with real webhook scenarios", () => {
    it("should handle Stripe webhook format", async () => {
      const stripeSecret = "whsec_test_stripe_secret";
      webhookValidator.registerProvider("stripe", stripeSecret);

      const timestamp = Math.floor(Date.now() / 1000);
      const signature = webhookValidator.generateSignature(
        testPayload,
        stripeSecret,
        "sha256",
        timestamp
      );

      app.post(
        "/stripe-webhook",
        webhookSecurity({ provider: "stripe", skipInTest: false }),
        (req, res) => {
          expect(req.webhookValidation?.isValid).toBe(true);
          expect(req.webhookValidation?.timestamp).toBe(timestamp);
          res.json({ received: true });
        }
      );

      await request(app)
        .post("/stripe-webhook")
        .set("stripe-signature", signature)
        .set("Content-Type", "application/json")
        .send(testPayload)
        .expect(200);

      webhookValidator.removeProvider("stripe");
    });

    it("should handle concurrent webhook requests safely", async () => {
      const signature = webhookValidator.generateSignature(testPayload, testSecret);
      let processedCount = 0;

      app.post("/webhook", webhookSecurity({ provider: "test" }), (req, res) => {
        processedCount++;
        // Use immediate response instead of setTimeout to avoid async cleanup issues
        res.json({ success: true, count: processedCount });
      });

      // Send multiple concurrent requests
      const promises = Array.from({ length: 5 }, () =>
        request(app)
          .post("/webhook")
          .set("test-signature", signature)
          .set("Content-Type", "application/json")
          .send(testPayload)
      );

      const responses = await Promise.all(promises);

      // All should succeed
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });

      expect(processedCount).toBe(5);
    });
  });
});
