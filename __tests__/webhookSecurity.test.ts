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

describe(_"Webhook Security Middleware", _() => {
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

  beforeEach_(() => {
    app = express();
    app.use(express.json());
    app.use(express.raw({ type: "application/json" }));

    // Register test provider
    webhookValidator.registerProvider("test", testSecret);
  });

  afterEach_(() => {
    webhookValidator.removeProvider("test");
  });

  describe(_"webhookSecurity middleware", _() => {
    it(_"should validate correct webhook signature", _async () => {
      const signature = webhookValidator.generateSignature(testPayload, testSecret);

      app.post("/webhook", webhookSecurity({ provider: "test" }), (_req, _res) => {
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

    it(_"should reject invalid webhook signature", _async () => {
      const invalidSignature = "invalid_signature_123";

      app.post("/webhook", webhookSecurity({ provider: "test", skipInTest: false }), (_req, _res) => {
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

    it(_"should skip validation in test environment when configured", _async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = "test";

      app.post(
        "/webhook",
        webhookSecurity({
          provider: "test",
          skipInTest: true,
        }),
        (_req, _res) => {
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

    it(_"should handle missing signature when not required", _async () => {
      app.post(
        "/webhook",
        webhookSecurity({
          provider: "test",
          required: false,
        }),
        (_req, _res) => {
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

    it(_"should run custom validation when provided", _async () => {
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
        (_req, _res) => {
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

    it(_"should handle provider configuration not found", _async () => {
      app.post(
        "/webhook",
        webhookSecurity({ provider: "nonexistent", skipInTest: false }),
        (_req, _res) => {
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

  describe(_"requireWebhookValidation middleware", _() => {
    it(_"should pass when webhook validation is present and valid", _async () => {
      app.post(
        "/webhook",
        (_req, _res, _next) => {
          req.webhookValidation = {
            provider: "test",
            payload: JSON.parse(testPayload),
            isValid: true,
            errors: [],
          };
          next();
        },
        requireWebhookValidation,
        (_req, _res) => {
          res.json({ success: true });
        }
      );

      await request(app).post("/webhook").send(testPayload).expect(200);
    });

    it(_"should fail when webhook validation is not present", _async () => {
      app.post(_"/webhook", _requireWebhookValidation, _(req, _res) => {
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

    it(_"should fail when webhook validation is invalid", _async () => {
      app.post(
        "/webhook",
        (_req, _res, _next) => {
          req.webhookValidation = {
            provider: "test",
            payload: JSON.parse(testPayload),
            isValid: false,
            errors: ["Validation failed"],
          };
          next();
        },
        requireWebhookValidation,
        (_req, _res) => {
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

  describe(_"webhookRateLimit middleware", _() => {
    it(_"should allow requests within rate limit", _async () => {
      app.post("/webhook", webhookRateLimit({ maxRequests: 5, windowMs: 1000 }), (_req, _res) => {
        res.json({ success: true });
      });

      // Make 3 requests (within limit)
      for (let i = 0; i < 3; i++) {
        await request(app).post("/webhook").send(testPayload).expect(200);
      }
    });

    it(_"should block requests exceeding rate limit", _async () => {
      app.post("/webhook", webhookRateLimit({ maxRequests: 2, windowMs: 1000 }), (_req, _res) => {
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

    it(_"should set rate limit headers", _async () => {
      app.post("/webhook", webhookRateLimit({ maxRequests: 5, windowMs: 1000 }), (_req, _res) => {
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

    it(_"should use custom key generator", _async () => {
      const keyGenerator = jest.fn().mockReturnValue("custom-key");

      app.post(
        "/webhook",
        webhookRateLimit({
          maxRequests: 1,
          windowMs: 1000,
          keyGenerator,
        }),
        (_req, _res) => {
          res.json({ success: true });
        }
      );

      await request(app).post("/webhook").send(testPayload).expect(200);
      await request(app).post("/webhook").send(testPayload).expect(429);

      expect(keyGenerator).toHaveBeenCalled();
    });
  });

  describe(_"webhookIdempotency middleware", _() => {
    it(_"should allow first request and cache response", _async () => {
      const keyExtractor = jest.fn().mockReturnValue("test-key-123");

      app.post("/webhook", webhookIdempotency({ keyExtractor }), (_req, _res) => {
        res.json({ success: true, timestamp: Date.now() });
      });

      const response1 = await request(app).post("/webhook").send(testPayload).expect(200);

      expect(keyExtractor).toHaveBeenCalled();
      expect(response1.body.success).toBe(true);
    });

    it(_"should return cached response for duplicate requests", _async () => {
      const keyExtractor = jest.fn().mockReturnValue("test-key-456");
      let callCount = 0;

      app.post("/webhook", webhookIdempotency({ keyExtractor }), (_req, _res) => {
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

    it(_"should skip idempotency when no key is provided", _async () => {
      const keyExtractor = jest.fn().mockReturnValue(null);
      let callCount = 0;

      app.post("/webhook", webhookIdempotency({ keyExtractor }), (_req, _res) => {
        callCount++;
        res.json({ success: true, callCount });
      });

      await request(app).post("/webhook").send(testPayload).expect(200);
      await request(app).post("/webhook").send(testPayload).expect(200);

      expect(callCount).toBe(2); // Both requests processed
    });
  });

  describe(_"webhookSecurityHeaders middleware", _() => {
    it(_"should set security headers", _async () => {
      app.post(_"/webhook", _webhookSecurityHeaders, _(req, _res) => {
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

  describe(_"createWebhookSecurityStack", _() => {
    it(_"should create comprehensive security middleware stack", _async () => {
      const signature = webhookValidator.generateSignature(testPayload, testSecret);
      const middlewares = createWebhookSecurityStack("test", {
        required: true,
        rateLimit: { maxRequests: 10, windowMs: 1000 },
        idempotencyKeyExtractor: req => (req.headers["idempotency-key"] as string) || null,
      });

      app.post(_"/webhook", _...middlewares, _(req, _res) => {
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

    it(_"should handle custom validation in security stack", _async () => {
      const signature = webhookValidator.generateSignature(testPayload, testSecret);
      const customValidation = jest.fn().mockResolvedValue({
        valid: true,
        errors: [],
      });

      const middlewares = createWebhookSecurityStack("test", {
        skipInTest: false,
        customValidation,
      });

      app.post(_"/webhook", _...middlewares, _(req, _res) => {
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

  describe(_"Integration with real webhook scenarios", _() => {
    it(_"should handle Stripe webhook format", _async () => {
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
        (_req, _res) => {
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

    it(_"should handle concurrent webhook requests safely", _async () => {
      const signature = webhookValidator.generateSignature(testPayload, testSecret);
      let processedCount = 0;

      app.post("/webhook", webhookSecurity({ provider: "test" }), (_req, _res) => {
        processedCount++;
        // Use immediate response instead of setTimeout to avoid async cleanup issues
        res.json({ success: true, count: processedCount });
      });

      // Send multiple concurrent requests
      const promises = Array.from(_{ length: 5 }, _() =>
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
