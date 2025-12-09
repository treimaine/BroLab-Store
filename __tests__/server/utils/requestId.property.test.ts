/**
 * Property-Based Tests for Secure Request ID Generation
 *
 * **Feature: secure-request-id, Property 1: UUID v4 Format Compliance**
 * **Validates: Requirements 1.1, 3.2**
 *
 * Tests that:
 * - For any generated request ID, the UUID portion (after "req_" prefix)
 *   matches the UUID v4 format pattern (8-4-4-4-12 hexadecimal characters with hyphens)
 */

import { describe, expect, it } from "@jest/globals";
import * as fc from "fast-check";
import { generateSecureRequestId, isValidRequestId } from "../../../server/utils/requestId";

/**
 * UUID v4 format regex: 8-4-4-4-12 hexadecimal characters with hyphens
 * Example: 550e8400-e29b-41d4-a716-446655440000
 */
const UUID_V4_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Full request ID format: req_ prefix followed by UUID v4
 * Example: req_550e8400-e29b-41d4-a716-446655440000
 */
const REQUEST_ID_WITH_UUID_REGEX =
  /^req_[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// Valid characters for request ID suffix: alphanumeric, hyphens, underscores
const VALID_CHARS = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_-".split("");
const ALPHANUMERIC_CHARS = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789".split(
  ""
);
const LOWERCASE_ALPHANUMERIC = "abcdefghijklmnopqrstuvwxyz0123456789".split("");

/**
 * Extracts the UUID portion from a request ID (removes "req_" prefix)
 */
function extractUuidFromRequestId(requestId: string): string {
  return requestId.slice(4); // Remove "req_" prefix
}

/**
 * Validates that a UUID matches the v4 format specification
 */
function isValidUuidV4(uuid: string): boolean {
  return UUID_V4_REGEX.test(uuid);
}

/**
 * Helper to create a string arbitrary from an array of characters
 */
function stringFromChars(chars: string[], minLen: number, maxLen: number): fc.Arbitrary<string> {
  return fc
    .array(fc.constantFrom(...chars), { minLength: minLen, maxLength: maxLen })
    .map(arr => arr.join(""));
}

// ============================================================================
// Property Test Assertions - Extracted to reduce nesting depth
// ============================================================================

/**
 * Asserts that a request ID matches the full format req_<uuid-v4>
 */
function assertFullFormatCompliance(): void {
  const requestId = generateSecureRequestId();
  expect(REQUEST_ID_WITH_UUID_REGEX.test(requestId)).toBe(true);
}

/**
 * Asserts that a request ID has correct UUID v4 format structure
 */
function assertUuidV4Structure(): void {
  const requestId = generateSecureRequestId();
  const uuid = extractUuidFromRequestId(requestId);

  // Verify UUID v4 format
  expect(isValidUuidV4(uuid)).toBe(true);

  // Verify structure: 8-4-4-4-12 segments
  const segments = uuid.split("-");
  expect(segments.length).toBe(5);
  expect(segments[0].length).toBe(8);
  expect(segments[1].length).toBe(4);
  expect(segments[2].length).toBe(4);
  expect(segments[3].length).toBe(4);
  expect(segments[4].length).toBe(12);
}

/**
 * Asserts that a UUID has version 4 marker in correct position
 */
function assertVersion4Marker(): void {
  const requestId = generateSecureRequestId();
  const uuid = extractUuidFromRequestId(requestId);

  // Version 4 marker: 13th character (index 14 in full UUID with hyphens)
  // Format: xxxxxxxx-xxxx-4xxx-xxxx-xxxxxxxxxxxx
  //                      ^ position 14
  expect(uuid[14]).toBe("4");
}

/**
 * Asserts that a UUID has valid variant marker (8, 9, a, or b)
 * Format: xxxxxxxx-xxxx-4xxx-Vxxx-xxxxxxxxxxxx where V is the variant
 */
function assertVariantMarker(): void {
  const requestId = generateSecureRequestId();
  const uuid = extractUuidFromRequestId(requestId);

  // Variant marker: 17th character (index 19 in full UUID with hyphens)
  const variantChar = uuid[19].toLowerCase();
  expect(["8", "9", "a", "b"]).toContain(variantChar);
}

/**
 * Asserts that a UUID contains only valid hexadecimal characters and hyphens
 */
function assertValidHexCharacters(): void {
  const requestId = generateSecureRequestId();
  const uuid = extractUuidFromRequestId(requestId);

  // All characters should be hex digits or hyphens
  const validChars = /^[0-9a-f-]+$/i;
  expect(validChars.test(uuid)).toBe(true);

  // Should have exactly 4 hyphens
  const hyphenCount = (uuid.match(/-/g) || []).length;
  expect(hyphenCount).toBe(4);

  // Total length should be 36 (32 hex chars + 4 hyphens)
  expect(uuid.length).toBe(36);
}

/**
 * Asserts that a suffix with req_ prefix is valid
 */
function assertValidSuffix(suffix: string): void {
  const validId = `req_${suffix}`;
  expect(isValidRequestId(validId)).toBe(true);
}

/**
 * Asserts that generated secure request IDs are valid
 */
function assertGeneratedIdIsValid(): void {
  const requestId = generateSecureRequestId();
  expect(isValidRequestId(requestId)).toBe(true);
}

/**
 * Asserts that a legacy timestamp-based request ID is valid
 */
function assertLegacyTimestampValid(timestamp: number): void {
  const legacyId = `req_${timestamp}`;
  expect(isValidRequestId(legacyId)).toBe(true);
}

/**
 * Asserts that a legacy timestamp with random suffix is valid
 */
function assertLegacyTimestampWithSuffixValid(timestamp: number, randomSuffix: string): void {
  const legacyId = `req_${timestamp}_${randomSuffix}`;
  expect(isValidRequestId(legacyId)).toBe(true);
}

/**
 * Asserts that non-string values are rejected
 */
function assertNonStringRejected(value: unknown): void {
  expect(isValidRequestId(value as string)).toBe(false);
}

/**
 * Asserts that strings without req_ prefix are rejected
 */
function assertMissingPrefixRejected(suffix: string): void {
  expect(isValidRequestId(suffix)).toBe(false);
}

/**
 * Asserts that strings with wrong prefix are rejected
 */
function assertWrongPrefixRejected(prefix: string, suffix: string): void {
  const invalidId = `${prefix}${suffix}`;
  expect(isValidRequestId(invalidId)).toBe(false);
}

/**
 * Asserts that strings with invalid characters in suffix are rejected
 */
function assertInvalidCharRejected(before: string, invalidChar: string, after: string): void {
  const invalidSuffix = `${before}${invalidChar}${after}`;
  const invalidId = `req_${invalidSuffix}`;
  expect(isValidRequestId(invalidId)).toBe(false);
}

/**
 * Asserts that strings with whitespace are rejected
 */
function assertWhitespaceRejected(whitespace: string, validPart: string): void {
  // Whitespace before prefix
  expect(isValidRequestId(`${whitespace}req_${validPart}`)).toBe(false);
  // Whitespace after prefix
  expect(isValidRequestId(`req_${whitespace}${validPart}`)).toBe(false);
  // Whitespace in suffix
  expect(isValidRequestId(`req_${validPart}${whitespace}`)).toBe(false);
}

/**
 * Asserts that strings with special characters are rejected
 */
function assertSpecialCharRejected(specialChar: string, validPart: string): void {
  const invalidId = `req_${validPart}${specialChar}${validPart}`;
  expect(isValidRequestId(invalidId)).toBe(false);
}

// Pattern for valid request IDs
const VALID_REQUEST_ID_PATTERN = /^req_[a-zA-Z0-9_-]+$/;

/**
 * Joins parts with separators to create a mixed separator string
 */
function joinPartsWithSeparators(parts: string[], separators: string[]): string {
  let result = parts[0];
  for (let i = 1; i < parts.length; i++) {
    result += separators[i - 1] + parts[i];
  }
  return result;
}

/**
 * Creates an arbitrary for strings with mixed hyphens and underscores
 */
function createMixedSeparatorArbitrary(): fc.Arbitrary<string> {
  const partArbitrary = stringFromChars(LOWERCASE_ALPHANUMERIC, 1, 8);
  const separatorArbitrary = fc.constantFrom("-", "_");

  return fc.array(partArbitrary, { minLength: 2, maxLength: 4 }).chain(parts => {
    const separatorCount = parts.length - 1;
    return fc
      .array(separatorArbitrary, { minLength: separatorCount, maxLength: separatorCount })
      .map(separators => joinPartsWithSeparators(parts, separators));
  });
}

/**
 * Asserts that strings with unicode characters are rejected
 */
function assertUnicodeRejected(unicodeChar: string, validPart: string): void {
  const invalidId = `req_${validPart}${unicodeChar}`;
  expect(isValidRequestId(invalidId)).toBe(false);
}

// ============================================================================
// Property 2 Helper Functions - Uniqueness Under Concurrent Generation
// ============================================================================

/**
 * Generates N request IDs and checks that all are unique
 * @param count Number of IDs to generate
 * @returns true if all IDs are unique, false otherwise
 */
function generateAndCheckUniqueness(count: number): boolean {
  const ids = new Set<string>();
  for (let i = 0; i < count; i++) {
    const id = generateSecureRequestId();
    if (ids.has(id)) {
      return false; // Duplicate found
    }
    ids.add(id);
  }
  return ids.size === count;
}

/**
 * Generates N request IDs concurrently using Promise.all and checks uniqueness
 * @param count Number of IDs to generate concurrently
 * @returns Promise resolving to true if all IDs are unique
 */
async function generateConcurrentlyAndCheckUniqueness(count: number): Promise<boolean> {
  const promises = Array.from({ length: count }, () => Promise.resolve(generateSecureRequestId()));
  const ids = await Promise.all(promises);
  const uniqueIds = new Set(ids);
  return uniqueIds.size === count;
}

/**
 * Asserts that N generated IDs are all unique (synchronous batch)
 */
function assertBatchUniqueness(batchSize: number): void {
  expect(generateAndCheckUniqueness(batchSize)).toBe(true);
}

// ============================================================================
// Property 3 Helper Functions - Consistent Prefix Format
// ============================================================================

/**
 * The required prefix for all generated request IDs
 */
const REQUIRED_PREFIX = "req_";

/**
 * Asserts that a generated request ID starts with the required prefix "req_"
 */
function assertPrefixFormat(): void {
  const requestId = generateSecureRequestId();
  expect(requestId.startsWith(REQUIRED_PREFIX)).toBe(true);
}

/**
 * Asserts that a generated request ID has content after the prefix
 */
function assertPrefixWithContent(): void {
  const requestId = generateSecureRequestId();
  expect(requestId.startsWith(REQUIRED_PREFIX)).toBe(true);
  expect(requestId.length).toBeGreaterThan(REQUIRED_PREFIX.length);
}

/**
 * Asserts that the prefix is exactly "req_" (case-sensitive)
 */
function assertExactPrefixCase(): void {
  const requestId = generateSecureRequestId();
  const prefix = requestId.slice(0, 4);
  expect(prefix).toBe("req_");
}

// ============================================================================
// Test Suite: Property 1 - UUID v4 Format Compliance
// ============================================================================

describe("Secure Request ID Property Tests", () => {
  // ============================================================================
  // Test Suite: Property 3 - Consistent Prefix Format
  // **Feature: secure-request-id, Property 3: Consistent Prefix Format**
  // **Validates: Requirements 1.3**
  // ============================================================================

  describe("Property 3: Consistent Prefix Format", () => {
    it("should generate request IDs that always start with 'req_' prefix", () => {
      fc.assert(fc.property(fc.constant(null), assertPrefixFormat), { numRuns: 100 });
    });

    it("should generate request IDs with content after the prefix", () => {
      fc.assert(fc.property(fc.constant(null), assertPrefixWithContent), { numRuns: 100 });
    });

    it("should use exact case-sensitive prefix 'req_'", () => {
      fc.assert(fc.property(fc.constant(null), assertExactPrefixCase), { numRuns: 100 });
    });

    it("should maintain consistent prefix across many generations", () => {
      // Generate many IDs and verify all have the correct prefix
      fc.assert(
        fc.property(fc.integer({ min: 10, max: 100 }), (count: number) => {
          for (let i = 0; i < count; i++) {
            const requestId = generateSecureRequestId();
            expect(requestId.startsWith(REQUIRED_PREFIX)).toBe(true);
          }
        }),
        { numRuns: 50 }
      );
    });

    it("should never generate IDs with alternative prefixes", () => {
      // Generate many IDs and verify none have alternative prefixes
      const alternativePrefixes = ["REQ_", "Req_", "request_", "id_", "r_", "re_"];
      fc.assert(
        fc.property(fc.constant(null), () => {
          const requestId = generateSecureRequestId();
          for (const altPrefix of alternativePrefixes) {
            expect(requestId.startsWith(altPrefix)).toBe(false);
          }
        }),
        { numRuns: 100 }
      );
    });
  });

  // ============================================================================
  // Test Suite: Property 2 - Uniqueness Under Concurrent Generation
  // **Feature: secure-request-id, Property 2: Uniqueness Under Concurrent Generation**
  // **Validates: Requirements 1.2**
  // ============================================================================

  describe("Property 2: Uniqueness Under Concurrent Generation", () => {
    it("should generate unique IDs for any batch size up to 1000", () => {
      // Test with various batch sizes from 10 to 1000
      const batchSizeArbitrary = fc.integer({ min: 10, max: 1000 });
      fc.assert(fc.property(batchSizeArbitrary, assertBatchUniqueness), { numRuns: 100 });
    });

    it("should generate 10000 unique IDs without collisions", () => {
      // Direct test for the upper bound specified in the property
      expect(generateAndCheckUniqueness(10000)).toBe(true);
    });

    it("should generate unique IDs under simulated concurrent generation", async () => {
      // Test concurrent generation with various batch sizes
      const batchSizes = [100, 500, 1000];
      for (const size of batchSizes) {
        const result = await generateConcurrentlyAndCheckUniqueness(size);
        expect(result).toBe(true);
      }
    });

    it("should maintain uniqueness across multiple rapid sequential batches", () => {
      // Generate multiple batches rapidly and ensure no collisions across batches
      const allIds = new Set<string>();
      const batchCount = 10;
      const batchSize = 1000;

      for (let batch = 0; batch < batchCount; batch++) {
        for (let i = 0; i < batchSize; i++) {
          const id = generateSecureRequestId();
          expect(allIds.has(id)).toBe(false);
          allIds.add(id);
        }
      }

      expect(allIds.size).toBe(batchCount * batchSize);
    });

    it("should generate unique IDs even when called in tight loops", () => {
      // Property test: for any number of iterations, all IDs should be unique
      fc.assert(
        fc.property(fc.integer({ min: 100, max: 500 }), (iterations: number) => {
          const ids: string[] = [];
          for (let i = 0; i < iterations; i++) {
            ids.push(generateSecureRequestId());
          }
          const uniqueIds = new Set(ids);
          expect(uniqueIds.size).toBe(iterations);
        }),
        { numRuns: 50 }
      );
    });
  });

  describe("Property 1: UUID v4 Format Compliance", () => {
    it("should generate request IDs matching the full format req_<uuid-v4>", () => {
      fc.assert(fc.property(fc.constant(null), assertFullFormatCompliance), { numRuns: 100 });
    });

    it("should generate UUIDs with correct v4 format structure", () => {
      fc.assert(fc.property(fc.constant(null), assertUuidV4Structure), { numRuns: 100 });
    });

    it("should generate UUIDs with version 4 marker in correct position", () => {
      fc.assert(fc.property(fc.constant(null), assertVersion4Marker), { numRuns: 100 });
    });

    it("should generate UUIDs with valid variant marker", () => {
      fc.assert(fc.property(fc.constant(null), assertVariantMarker), { numRuns: 100 });
    });

    it("should generate UUIDs containing only valid hexadecimal characters and hyphens", () => {
      fc.assert(fc.property(fc.constant(null), assertValidHexCharacters), { numRuns: 100 });
    });
  });

  // ============================================================================
  // Test Suite: Property 4 - Validation Accepts Valid Formats
  // ============================================================================

  describe("Property 4: Validation Accepts Valid Formats", () => {
    it("should accept any string matching pattern req_[a-zA-Z0-9_-]+", () => {
      const validSuffixArbitrary = stringFromChars(VALID_CHARS, 1, 100);
      fc.assert(fc.property(validSuffixArbitrary, assertValidSuffix), { numRuns: 100 });
    });

    it("should accept generated secure request IDs", () => {
      fc.assert(fc.property(fc.constant(null), assertGeneratedIdIsValid), { numRuns: 100 });
    });

    it("should accept legacy timestamp-based request IDs", () => {
      const timestampArbitrary = fc.integer({ min: 1000000000000, max: 9999999999999 });
      fc.assert(fc.property(timestampArbitrary, assertLegacyTimestampValid), { numRuns: 100 });
    });

    it("should accept legacy timestamp with random suffix request IDs", () => {
      const timestampArbitrary = fc.integer({ min: 1000000000000, max: 9999999999999 });
      const randomSuffixArbitrary = stringFromChars(LOWERCASE_ALPHANUMERIC, 1, 20);
      fc.assert(
        fc.property(
          timestampArbitrary,
          randomSuffixArbitrary,
          assertLegacyTimestampWithSuffixValid
        ),
        { numRuns: 100 }
      );
    });

    it("should accept request IDs with only alphanumeric suffixes", () => {
      const alphanumericArbitrary = stringFromChars(ALPHANUMERIC_CHARS, 1, 50);
      fc.assert(fc.property(alphanumericArbitrary, assertValidSuffix), { numRuns: 100 });
    });

    it("should accept request IDs with hyphens in suffix", () => {
      const partArbitrary = stringFromChars(LOWERCASE_ALPHANUMERIC, 1, 10);
      const hyphenatedArbitrary = fc
        .array(partArbitrary, { minLength: 2, maxLength: 5 })
        .map(parts => parts.join("-"));
      fc.assert(fc.property(hyphenatedArbitrary, assertValidSuffix), { numRuns: 100 });
    });

    it("should accept request IDs with underscores in suffix", () => {
      const partArbitrary = stringFromChars(LOWERCASE_ALPHANUMERIC, 1, 10);
      const underscoredArbitrary = fc
        .array(partArbitrary, { minLength: 2, maxLength: 5 })
        .map(parts => parts.join("_"));
      fc.assert(fc.property(underscoredArbitrary, assertValidSuffix), { numRuns: 100 });
    });

    it("should accept request IDs with mixed hyphens and underscores", () => {
      const mixedArbitrary = createMixedSeparatorArbitrary();
      fc.assert(fc.property(mixedArbitrary, assertValidSuffix), { numRuns: 100 });
    });
  });

  // ============================================================================
  // Test Suite: Property 5 - Validation Rejects Invalid Formats
  // ============================================================================

  describe("Property 5: Validation Rejects Invalid Formats", () => {
    it("should reject empty strings", () => {
      expect(isValidRequestId("")).toBe(false);
    });

    it("should reject null and undefined values", () => {
      expect(isValidRequestId(null as unknown as string)).toBe(false);
      expect(isValidRequestId(undefined as unknown as string)).toBe(false);
    });

    it("should reject non-string values", () => {
      const nonStringArbitrary = fc.oneof(
        fc.integer(),
        fc.boolean(),
        fc.object(),
        fc.array(fc.anything())
      );
      fc.assert(fc.property(nonStringArbitrary, assertNonStringRejected), { numRuns: 100 });
    });

    it("should reject strings without req_ prefix", () => {
      const validSuffixArbitrary = stringFromChars(VALID_CHARS, 1, 50);
      fc.assert(fc.property(validSuffixArbitrary, assertMissingPrefixRejected), { numRuns: 100 });
    });

    it("should reject strings with wrong prefix", () => {
      // cspell:disable-next-line
      const wrongPrefixes = ["request_", "id_", "r_", "re_", "requ_", "REQ_", "Req_", ""];
      const validSuffixArbitrary = stringFromChars(VALID_CHARS, 1, 30);
      fc.assert(
        fc.property(
          fc.constantFrom(...wrongPrefixes),
          validSuffixArbitrary,
          assertWrongPrefixRejected
        ),
        { numRuns: 100 }
      );
    });

    it("should reject req_ prefix with empty suffix", () => {
      expect(isValidRequestId("req_")).toBe(false);
    });

    it("should reject strings with invalid characters in suffix", () => {
      const invalidChars = "!@#$%^&*()+=[]{}|;':\",./<>?`~ \t\n\r".split("");
      const validSuffixChars = "abcdefghijklmnopqrstuvwxyz0123456789".split("");
      const validPartArbitrary = stringFromChars(validSuffixChars, 0, 10);
      fc.assert(
        fc.property(
          validPartArbitrary,
          fc.constantFrom(...invalidChars),
          validPartArbitrary,
          assertInvalidCharRejected
        ),
        { numRuns: 100 }
      );
    });

    it("should reject strings with whitespace anywhere", () => {
      const whitespaceChars = [" ", "\t", "\n", "\r", "\f", "\v"];
      const validSuffixChars = "abcdefghijklmnopqrstuvwxyz0123456789".split("");
      const validPartArbitrary = stringFromChars(validSuffixChars, 1, 10);
      fc.assert(
        fc.property(
          fc.constantFrom(...whitespaceChars),
          validPartArbitrary,
          assertWhitespaceRejected
        ),
        { numRuns: 100 }
      );
    });

    it("should reject strings with special characters", () => {
      const specialChars = ["!", "@", "#", "$", "%", "^", "&", "*", "(", ")", "+", "=", ".", ","];
      const validSuffixChars = "abcdefghijklmnopqrstuvwxyz0123456789".split("");
      const validPartArbitrary = stringFromChars(validSuffixChars, 1, 10);
      fc.assert(
        fc.property(
          fc.constantFrom(...specialChars),
          validPartArbitrary,
          assertSpecialCharRejected
        ),
        { numRuns: 100 }
      );
    });

    it("should reject completely random strings that do not match pattern", () => {
      const randomStringArbitrary = fc
        .string({ minLength: 0, maxLength: 100 })
        .filter(str => !VALID_REQUEST_ID_PATTERN.test(str));
      fc.assert(
        fc.property(randomStringArbitrary, randomStr => {
          expect(isValidRequestId(randomStr)).toBe(false);
        }),
        { numRuns: 100 }
      );
    });

    it("should reject strings with unicode characters in suffix", () => {
      const unicodeChars = ["é", "ñ", "ü", "中", "日", "한", "🎵", "→", "∞", "©"];
      const validSuffixChars = "abcdefghijklmnopqrstuvwxyz0123456789".split("");
      const validPartArbitrary = stringFromChars(validSuffixChars, 1, 10);
      fc.assert(
        fc.property(fc.constantFrom(...unicodeChars), validPartArbitrary, assertUnicodeRejected),
        { numRuns: 100 }
      );
    });

    it("should reject strings that look similar but have subtle differences", () => {
      // Edge cases that might slip through naive validation
      const subtlyInvalidIds = [
        "req-abc123", // hyphen instead of underscore after req
        "req abc123", // space instead of underscore
        "req_", // empty suffix
        " req_abc123", // leading space
        "req_abc123 ", // trailing space
        "req_abc 123", // space in middle
        "REQ_abc123", // uppercase prefix
        "Req_abc123", // mixed case prefix
      ];

      for (const invalidId of subtlyInvalidIds) {
        expect(isValidRequestId(invalidId)).toBe(false);
      }
    });
  });
});
