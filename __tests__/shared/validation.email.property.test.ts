/**
 * Property-Based Tests for Email Validation Consistency
 *
 * **Feature: codebase-duplication-audit, Property 2: Email Validation Round-Trip**
 * **Validates: Requirements 1.5, 9.5**
 *
 * Tests that:
 * - For any valid email string, validateEmail returns true
 * - For any invalid email string, validateEmail returns false
 * - All import paths (shared/validation, convex/lib/validation, server/lib/validation)
 *   return identical results for the same input
 */

import { describe, expect, it } from "@jest/globals";
import * as fc from "fast-check";

// Import validateEmail from all three locations to verify consistency
import { validateEmail as validateEmailConvex } from "../../convex/lib/validation";
import { validateEmail as validateEmailServer } from "../../server/lib/validation";
import { validateEmail as validateEmailShared } from "../../shared/validation";

// ============================================================================
// Helper Functions for Arbitraries
// ============================================================================

/**
 * Helper to create a string arbitrary from an array of characters
 */
function stringFromChars(chars: string[], minLen: number, maxLen: number): fc.Arbitrary<string> {
  return fc
    .array(fc.constantFrom(...chars), { minLength: minLen, maxLength: maxLen })
    .map(arr => arr.join(""));
}

// ============================================================================
// Email Arbitraries
// ============================================================================

// Character sets for email generation
const LOCAL_PART_CHARS = "abcdefghijklmnopqrstuvwxyz0123456789._+-".split("");
const DOMAIN_CHARS = "abcdefghijklmnopqrstuvwxyz0123456789-".split("");
const ALPHANUMERIC_CHARS = "abcdefghijklmnopqrstuvwxyz0123456789".split("");

/**
 * Arbitrary for generating valid email local parts
 * Local part can contain: letters, digits, dots, hyphens, underscores, plus signs
 */
const validLocalPartArb = stringFromChars(LOCAL_PART_CHARS, 1, 64).map(local => {
  // Ensure it doesn't start or end with a dot
  let result = local.replace(/^\.+|\.+$/g, "");
  // Ensure no consecutive dots
  result = result.replace(/\.{2,}/g, ".");
  // Ensure minimum length
  return result.length > 0 ? result : "user";
});

/**
 * Arbitrary for generating valid domain names
 */
const validDomainArb = fc
  .tuple(
    stringFromChars(DOMAIN_CHARS, 1, 63),
    fc.constantFrom("com", "org", "net", "io", "co.uk", "edu", "gov", "info")
  )
  .map(([subdomain, tld]) => {
    // Ensure subdomain doesn't start or end with hyphen
    let cleanSubdomain = subdomain.replace(/^-+|-+$/g, "");
    cleanSubdomain = cleanSubdomain.length > 0 ? cleanSubdomain : "example";
    return `${cleanSubdomain}.${tld}`;
  });

/**
 * Arbitrary for generating structurally valid emails
 * These should pass validation
 */
const validEmailArb = fc
  .tuple(validLocalPartArb, validDomainArb)
  .map(([local, domain]) => `${local}@${domain}`)
  .filter(email => email.length <= 254); // RFC 5321 limit

/**
 * Arbitrary for generating invalid emails - missing @
 */
const emailMissingAtArb = stringFromChars(ALPHANUMERIC_CHARS, 5, 50).filter(s => !s.includes("@"));

/**
 * Arbitrary for generating invalid emails - empty local part
 */
const emailEmptyLocalArb = validDomainArb.map(domain => `@${domain}`);

/**
 * Arbitrary for generating invalid emails - empty domain
 */
const emailEmptyDomainArb = validLocalPartArb.map(local => `${local}@`);

/**
 * Arbitrary for generating invalid emails - too long (> 254 chars)
 * Generates emails that are guaranteed to be over 254 characters
 * 250 chars local + "@example.com" (12 chars) = 262 chars minimum
 */
const emailTooLongArb = stringFromChars(ALPHANUMERIC_CHARS, 250, 260).map(
  local => `${local}@example.com`
);

/**
 * Arbitrary for generating invalid emails - invalid domain (no TLD)
 */
const emailInvalidDomainArb = validLocalPartArb.map(local => `${local}@localhost`);

/**
 * Arbitrary for generating empty or whitespace-only strings
 */
const emptyOrWhitespaceArb = fc.constantFrom("", " ", "  ", "\t", "\n");

// ============================================================================
// Test Helper Functions
// ============================================================================

/**
 * Verifies that all three validateEmail implementations return the same result
 */
function verifyConsistencyAcrossModules(email: string): void {
  const sharedResult = validateEmailShared(email);
  const convexResult = validateEmailConvex(email);
  const serverResult = validateEmailServer(email);

  expect(sharedResult).toBe(convexResult);
  expect(sharedResult).toBe(serverResult);
  expect(convexResult).toBe(serverResult);
}

/**
 * Verifies that an invalid email returns false from all modules
 */
function verifyInvalidEmailRejected(email: string): void {
  verifyConsistencyAcrossModules(email);
  expect(validateEmailShared(email)).toBe(false);
}

// ============================================================================
// Test Suites
// ============================================================================

describe("Email Validation Property Tests", () => {
  describe("Property 2: Email Validation Consistency Across Modules", () => {
    /**
     * Feature: codebase-duplication-audit, Property 2: Email Validation Round-Trip
     * Validates: Requirements 1.5, 9.5
     *
     * For any string input, all three validateEmail implementations
     * (shared, convex, server) must return identical results.
     */
    it("should return identical results from all module imports for any string", () => {
      fc.assert(
        fc.property(fc.string({ minLength: 0, maxLength: 300 }), (email: string) => {
          verifyConsistencyAcrossModules(email);
        }),
        { numRuns: 100 }
      );
    });

    /**
     * Feature: codebase-duplication-audit, Property 2: Email Validation Round-Trip
     * Validates: Requirements 1.5, 9.5
     *
     * For any structurally valid email, all modules should return consistent results.
     */
    it("should return consistent results for structurally valid emails", () => {
      fc.assert(
        fc.property(validEmailArb, (email: string) => {
          verifyConsistencyAcrossModules(email);
        }),
        { numRuns: 100 }
      );
    });

    /**
     * Feature: codebase-duplication-audit, Property 2: Email Validation Round-Trip
     * Validates: Requirements 1.5, 9.5
     *
     * For any email missing the @ symbol, all modules should reject it.
     */
    it("should reject emails missing @ symbol consistently", () => {
      fc.assert(
        fc.property(emailMissingAtArb, (email: string) => {
          verifyInvalidEmailRejected(email);
        }),
        { numRuns: 100 }
      );
    });

    /**
     * Feature: codebase-duplication-audit, Property 2: Email Validation Round-Trip
     * Validates: Requirements 1.5, 9.5
     *
     * For any email with empty local part, all modules should reject it.
     */
    it("should reject emails with empty local part consistently", () => {
      fc.assert(
        fc.property(emailEmptyLocalArb, (email: string) => {
          verifyInvalidEmailRejected(email);
        }),
        { numRuns: 100 }
      );
    });

    /**
     * Feature: codebase-duplication-audit, Property 2: Email Validation Round-Trip
     * Validates: Requirements 1.5, 9.5
     *
     * For any email with empty domain, all modules should reject it.
     */
    it("should reject emails with empty domain consistently", () => {
      fc.assert(
        fc.property(emailEmptyDomainArb, (email: string) => {
          verifyInvalidEmailRejected(email);
        }),
        { numRuns: 100 }
      );
    });

    /**
     * Feature: codebase-duplication-audit, Property 2: Email Validation Round-Trip
     * Validates: Requirements 1.5, 9.5
     *
     * For any email exceeding 254 characters, all modules should reject it.
     */
    it("should reject emails exceeding 254 characters consistently", () => {
      fc.assert(
        fc.property(emailTooLongArb, (email: string) => {
          verifyInvalidEmailRejected(email);
        }),
        { numRuns: 100 }
      );
    });

    /**
     * Feature: codebase-duplication-audit, Property 2: Email Validation Round-Trip
     * Validates: Requirements 1.5, 9.5
     *
     * For empty or whitespace-only strings, all modules should reject them.
     */
    it("should reject empty or whitespace-only strings consistently", () => {
      fc.assert(
        fc.property(emptyOrWhitespaceArb, (email: string) => {
          verifyInvalidEmailRejected(email);
        }),
        { numRuns: 100 }
      );
    });

    /**
     * Feature: codebase-duplication-audit, Property 2: Email Validation Round-Trip
     * Validates: Requirements 1.5, 9.5
     *
     * For emails with invalid domain (no TLD), all modules should reject them.
     */
    it("should reject emails with invalid domain consistently", () => {
      fc.assert(
        fc.property(emailInvalidDomainArb, (email: string) => {
          verifyInvalidEmailRejected(email);
        }),
        { numRuns: 100 }
      );
    });
  });

  describe("Email Validation Known Examples", () => {
    /**
     * Verify known valid emails are accepted consistently
     */
    it("should accept known valid emails consistently", () => {
      const validEmails = [
        "user@example.com",
        "test.email+tag@domain.co.uk",
        "user123@test-domain.org",
        "a@b.co",
        "user_name@domain.com",
        "first.last@subdomain.domain.org",
      ];

      for (const email of validEmails) {
        verifyConsistencyAcrossModules(email);
        expect(validateEmailShared(email)).toBe(true);
      }
    });

    /**
     * Verify known invalid emails are rejected consistently
     */
    it("should reject known invalid emails consistently", () => {
      const invalidEmails = [
        "invalid.email",
        "@domain.com",
        "user@",
        "user@domain",
        "",
        "   ",
        "user@@domain.com",
        ".user@domain.com",
        "user.@domain.com",
        "user@.domain.com",
        "user@domain..com",
      ];

      for (const email of invalidEmails) {
        verifyConsistencyAcrossModules(email);
        expect(validateEmailShared(email)).toBe(false);
      }
    });
  });
});
