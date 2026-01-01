/**
 * Route Parameter Validation Tests
 *
 * Tests for CommonParams validation schemas used across server routes.
 * Ensures that route parameters are properly validated before processing.
 */

import { describe, expect, test } from "@jest/globals";
import { CommonParams } from "../../../shared/validation/index";

describe("CommonParams Validation", () => {
  describe("CommonParams.id (generic string ID)", () => {
    test("should accept valid string IDs", () => {
      const validIds = [
        "123",
        "abc",
        "user_123",
        "cs_test_abc123",
        "pi_abc123xyz",
        "reservation-uuid-here",
      ];

      for (const id of validIds) {
        const result = CommonParams.id.safeParse({ id });
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.id).toBe(id);
        }
      }
    });

    test("should reject empty string ID", () => {
      const result = CommonParams.id.safeParse({ id: "" });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toBe("ID is required");
      }
    });

    test("should reject missing ID", () => {
      const result = CommonParams.id.safeParse({});
      expect(result.success).toBe(false);
    });
  });

  describe("CommonParams.numericId (WooCommerce/Beat IDs)", () => {
    test("should accept valid numeric string IDs", () => {
      const validIds = ["1", "123", "999999", "0"];

      for (const id of validIds) {
        const result = CommonParams.numericId.safeParse({ id });
        expect(result.success).toBe(true);
        if (result.success) {
          // Should transform to number
          expect(typeof result.data.id).toBe("number");
          expect(result.data.id).toBe(Number(id));
        }
      }
    });

    test("should reject non-numeric IDs", () => {
      const invalidIds = ["abc", "12a", "a12", "12.5", "-1", "1e5", " 123", "123 "];

      for (const id of invalidIds) {
        const result = CommonParams.numericId.safeParse({ id });
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.errors[0].message).toBe("ID must be numeric");
        }
      }
    });

    test("should reject empty string", () => {
      const result = CommonParams.numericId.safeParse({ id: "" });
      expect(result.success).toBe(false);
    });

    test("should transform valid numeric string to number", () => {
      const result = CommonParams.numericId.safeParse({ id: "42" });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.id).toBe(42);
      }
    });
  });

  describe("CommonParams.stripePaymentIntentId", () => {
    test("should accept valid Stripe payment intent IDs", () => {
      const validIds = ["pi_1234567890abcdef", "pi_abc123XYZ", "pi_A1b2C3d4E5f6G7h8I9j0"];

      for (const id of validIds) {
        const result = CommonParams.stripePaymentIntentId.safeParse({ id });
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.id).toBe(id);
        }
      }
    });

    test("should reject invalid Stripe payment intent IDs", () => {
      const invalidIds = [
        "1234567890", // Missing pi_ prefix
        "pi_", // Empty after prefix
        "PI_abc123", // Wrong case prefix
        "cs_abc123", // Wrong prefix (checkout session)
        "pi-abc123", // Wrong separator
        "pi_abc!@#", // Invalid characters
        "", // Empty
      ];

      for (const id of invalidIds) {
        const result = CommonParams.stripePaymentIntentId.safeParse({ id });
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.errors[0].message).toBe("Invalid Stripe payment intent ID");
        }
      }
    });
  });

  describe("CommonParams.stripeSessionId", () => {
    test("should accept valid Stripe checkout session IDs", () => {
      const validIds = [
        "cs_abc123XYZ",
        "cs_test_abc123XYZ",
        "cs_1234567890abcdef",
        "cs_test_1234567890abcdef",
      ];

      for (const id of validIds) {
        const result = CommonParams.stripeSessionId.safeParse({ id });
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.id).toBe(id);
        }
      }
    });

    test("should reject invalid Stripe checkout session IDs", () => {
      const invalidIds = [
        "1234567890", // Missing cs_ prefix
        "cs_", // Empty after prefix
        "CS_abc123", // Wrong case prefix
        "pi_abc123", // Wrong prefix (payment intent)
        "cs-abc123", // Wrong separator
        "cs_abc!@#", // Invalid characters
        "cs_test_", // Empty after test_ prefix
        "", // Empty
      ];

      for (const id of invalidIds) {
        const result = CommonParams.stripeSessionId.safeParse({ id });
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.errors[0].message).toBe("Invalid Stripe checkout session ID");
        }
      }
    });
  });

  describe("CommonParams.slug", () => {
    test("should accept valid slugs", () => {
      const validSlugs = ["beat-name", "hip-hop", "trap-beat-2024", "a", "123"];

      for (const slug of validSlugs) {
        const result = CommonParams.slug.safeParse({ slug });
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.slug).toBe(slug);
        }
      }
    });

    test("should reject invalid slugs", () => {
      const invalidSlugs = [
        "Beat-Name", // Uppercase
        "beat_name", // Underscore
        "beat name", // Space
        "beat.name", // Dot
        "", // Empty
      ];

      for (const slug of invalidSlugs) {
        const result = CommonParams.slug.safeParse({ slug });
        expect(result.success).toBe(false);
      }
    });
  });
});

describe("Route Parameter Security", () => {
  test("should prevent SQL injection in numeric IDs", () => {
    const maliciousInputs = ["1; DROP TABLE users;", "1 OR 1=1", "1' OR '1'='1", "1--", "1/**/"];

    for (const input of maliciousInputs) {
      const result = CommonParams.numericId.safeParse({ id: input });
      expect(result.success).toBe(false);
    }
  });

  test("should prevent path traversal in string IDs", () => {
    const maliciousInputs = [
      "../../../etc/passwd",
      String.raw`..\..\..\\windows\\system32`,
      "%2e%2e%2f",
    ];

    // These should be accepted by CommonParams.id (it's just a string validator)
    // but the actual route handlers should sanitize paths if needed
    for (const input of maliciousInputs) {
      const result = CommonParams.id.safeParse({ id: input });
      // CommonParams.id accepts any non-empty string
      expect(result.success).toBe(true);
    }
  });

  test("should handle XSS attempts in IDs", () => {
    const xssInputs = [
      "<script>alert('xss')</script>",
      "javascript:alert(1)",
      "<img src=x onerror=alert(1)>",
    ];

    // numericId should reject these
    for (const input of xssInputs) {
      const numericResult = CommonParams.numericId.safeParse({ id: input });
      expect(numericResult.success).toBe(false);
    }

    // stripePaymentIntentId should reject these
    for (const input of xssInputs) {
      const stripeResult = CommonParams.stripePaymentIntentId.safeParse({ id: input });
      expect(stripeResult.success).toBe(false);
    }
  });
});
