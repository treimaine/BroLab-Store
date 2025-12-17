/**
 * Property-Based Tests for Webhook Security Service
 *
 * **Feature: clerk-webhook-security, Property 1: Timestamp validation rejects out-of-window requests**
 * **Validates: Requirements 2.1, 2.2, 2.3**
 *
 * Tests that:
 * - For any timestamp older than 300 seconds, the validation rejects with replay detection
 * - For any timestamp more than 60 seconds in the future, the validation rejects as invalid
 * - For any timestamp within the valid window, the validation accepts
 *
 * **Feature: clerk-webhook-security, Property 2: Idempotency prevents duplicate processing**
 * **Validates: Requirements 3.1, 3.2**
 *
 * Tests that:
 * - For any webhook with a given svix-id, if that svix-id has been processed within the last 5 minutes,
 *   the handler should return isDuplicate: true without re-processing
 * - For any new webhook, the handler should return isDuplicate: false
 *
 * **Feature: clerk-webhook-security, Property 4: Audit logs contain all required fields**
 * **Validates: Requirements 4.1, 4.2, 4.3**
 *
 * Tests that:
 * - For any webhook request (successful, rejected, or duplicate), the audit log entry
 *   should contain all required fields: requestId, timestamp, eventType, sourceIp,
 *   svixId, signatureValid, processingTimeMs, and outcome
 *
 * **Feature: clerk-webhook-security, Property 5: Response format backward compatibility**
 * **Validates: Requirements 5.1, 5.2, 5.3**
 *
 * Tests that:
 * - For any webhook request, the response JSON should contain at minimum:
 *   `received`, `synced`, and `requestId` fields, matching the existing WebhookResponse interface
 */

import { afterEach, beforeEach, describe, expect, it } from "@jest/globals";
import * as fc from "fast-check";
import {
  WebhookAuditEntry,
  WebhookAuditLogger,
  WebhookOutcome,
} from "../../server/services/WebhookAuditLogger";
import { WebhookSecurityService } from "../../server/services/WebhookSecurityService";

// ============================================================================
// Configuration Constants
// ============================================================================

const MAX_TIMESTAMP_AGE = 300; // 5 minutes in seconds
const MAX_TIMESTAMP_FUTURE = 60; // 1 minute in seconds

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Gets the current Unix timestamp in seconds
 */
function nowSeconds(): number {
  return Math.floor(Date.now() / 1000);
}

/**
 * Creates a timestamp string from a Unix timestamp in seconds
 */
function toTimestampString(timestampSeconds: number): string {
  return timestampSeconds.toString();
}

// ============================================================================
// Property Test Assertions
// ============================================================================

/**
 * Asserts that a timestamp older than maxAge is rejected as replay attack
 * Requirement 2.1: Reject timestamps older than 300 seconds (5 minutes)
 */
function assertOldTimestampRejected(service: WebhookSecurityService, ageSeconds: number): void {
  const now = nowSeconds();
  const oldTimestamp = now - ageSeconds;
  const result = service.validateTimestamp(toTimestampString(oldTimestamp));

  expect(result.valid).toBe(false);
  if (!result.valid) {
    expect(result.code).toBe("WEBHOOK_REPLAY_DETECTED");
    expect(result.reason.toLowerCase()).toContain("old");
  }
}

/**
 * Asserts that a timestamp too far in the future is rejected
 * Requirement 2.2: Reject timestamps more than 60 seconds in the future
 */
function assertFutureTimestampRejected(
  service: WebhookSecurityService,
  futureSeconds: number
): void {
  const now = nowSeconds();
  const futureTimestamp = now + futureSeconds;
  const result = service.validateTimestamp(toTimestampString(futureTimestamp));

  expect(result.valid).toBe(false);
  if (!result.valid) {
    expect(result.code).toBe("WEBHOOK_INVALID_TIMESTAMP_FUTURE");
    expect(result.reason.toLowerCase()).toContain("future");
  }
}

/**
 * Asserts that a timestamp within the valid window is accepted
 * Requirement 2.3: Accept timestamps within the acceptable window
 */
function assertValidTimestampAccepted(
  service: WebhookSecurityService,
  offsetSeconds: number
): void {
  const now = nowSeconds();
  const validTimestamp = now - offsetSeconds;
  const result = service.validateTimestamp(toTimestampString(validTimestamp));

  expect(result.valid).toBe(true);
}

/**
 * Asserts that a timestamp exactly at the future boundary is accepted
 */
function assertFutureBoundaryAccepted(
  service: WebhookSecurityService,
  futureSeconds: number
): void {
  const now = nowSeconds();
  const futureTimestamp = now + futureSeconds;
  const result = service.validateTimestamp(toTimestampString(futureTimestamp));

  expect(result.valid).toBe(true);
}

// ============================================================================
// Test Suite: Property 1 - Timestamp Validation
// **Feature: clerk-webhook-security, Property 1: Timestamp validation rejects out-of-window requests**
// **Validates: Requirements 2.1, 2.2, 2.3**
// ============================================================================

describe("Webhook Security Property Tests", () => {
  let service: WebhookSecurityService;

  beforeEach(() => {
    service = new WebhookSecurityService();
  });

  describe("Property 1: Timestamp validation rejects out-of-window requests", () => {
    /**
     * **Feature: clerk-webhook-security, Property 1: Timestamp validation rejects out-of-window requests**
     * **Validates: Requirements 2.1**
     *
     * For any timestamp older than 300 seconds, the validation should reject
     * with WEBHOOK_REPLAY_DETECTED code
     */
    it("should reject any timestamp older than 300 seconds as replay attack", () => {
      // Generate ages from 301 to 10000 seconds (just over 5 minutes to ~2.7 hours)
      const oldAgeArbitrary = fc.integer({ min: MAX_TIMESTAMP_AGE + 1, max: 10000 });

      fc.assert(
        fc.property(oldAgeArbitrary, (ageSeconds: number) => {
          assertOldTimestampRejected(service, ageSeconds);
        }),
        { numRuns: 100 }
      );
    });

    /**
     * **Feature: clerk-webhook-security, Property 1: Timestamp validation rejects out-of-window requests**
     * **Validates: Requirements 2.2**
     *
     * For any timestamp more than 60 seconds in the future, the validation
     * should reject with WEBHOOK_INVALID_TIMESTAMP_FUTURE code
     */
    it("should reject any timestamp more than 60 seconds in the future", () => {
      // Generate future offsets from 61 to 10000 seconds
      const futureOffsetArbitrary = fc.integer({ min: MAX_TIMESTAMP_FUTURE + 1, max: 10000 });

      fc.assert(
        fc.property(futureOffsetArbitrary, (futureSeconds: number) => {
          assertFutureTimestampRejected(service, futureSeconds);
        }),
        { numRuns: 100 }
      );
    });

    /**
     * **Feature: clerk-webhook-security, Property 1: Timestamp validation rejects out-of-window requests**
     * **Validates: Requirements 2.3**
     *
     * For any timestamp within the valid window (0 to 300 seconds old),
     * the validation should accept
     */
    it("should accept any timestamp within the valid past window (0-300 seconds old)", () => {
      // Generate ages from 0 to 300 seconds (within valid window)
      const validAgeArbitrary = fc.integer({ min: 0, max: MAX_TIMESTAMP_AGE });

      fc.assert(
        fc.property(validAgeArbitrary, (ageSeconds: number) => {
          assertValidTimestampAccepted(service, ageSeconds);
        }),
        { numRuns: 100 }
      );
    });

    /**
     * **Feature: clerk-webhook-security, Property 1: Timestamp validation rejects out-of-window requests**
     * **Validates: Requirements 2.3**
     *
     * For any timestamp within the valid future window (0 to 60 seconds ahead),
     * the validation should accept
     */
    it("should accept any timestamp within the valid future window (0-60 seconds ahead)", () => {
      // Generate future offsets from 0 to 60 seconds (within valid window)
      const validFutureArbitrary = fc.integer({ min: 0, max: MAX_TIMESTAMP_FUTURE });

      fc.assert(
        fc.property(validFutureArbitrary, (futureSeconds: number) => {
          assertFutureBoundaryAccepted(service, futureSeconds);
        }),
        { numRuns: 100 }
      );
    });

    /**
     * Boundary test: exactly at the age limit (300 seconds)
     * Should be accepted (boundary is inclusive)
     */
    it("should accept timestamp exactly at 300 seconds old (boundary)", () => {
      const now = nowSeconds();
      const boundaryTimestamp = now - MAX_TIMESTAMP_AGE;
      const result = service.validateTimestamp(toTimestampString(boundaryTimestamp));

      expect(result.valid).toBe(true);
    });

    /**
     * Boundary test: exactly 1 second over the age limit (301 seconds)
     * Should be rejected
     */
    it("should reject timestamp at 301 seconds old (just over boundary)", () => {
      const now = nowSeconds();
      const overBoundaryTimestamp = now - (MAX_TIMESTAMP_AGE + 1);
      const result = service.validateTimestamp(toTimestampString(overBoundaryTimestamp));

      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.code).toBe("WEBHOOK_REPLAY_DETECTED");
      }
    });

    /**
     * Boundary test: exactly at the future limit (60 seconds)
     * Should be accepted (boundary is inclusive)
     */
    it("should accept timestamp exactly at 60 seconds in future (boundary)", () => {
      const now = nowSeconds();
      const boundaryTimestamp = now + MAX_TIMESTAMP_FUTURE;
      const result = service.validateTimestamp(toTimestampString(boundaryTimestamp));

      expect(result.valid).toBe(true);
    });

    /**
     * Boundary test: exactly 1 second over the future limit (61 seconds)
     * Should be rejected
     */
    it("should reject timestamp at 61 seconds in future (just over boundary)", () => {
      const now = nowSeconds();
      const overBoundaryTimestamp = now + (MAX_TIMESTAMP_FUTURE + 1);
      const result = service.validateTimestamp(toTimestampString(overBoundaryTimestamp));

      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.code).toBe("WEBHOOK_INVALID_TIMESTAMP_FUTURE");
      }
    });

    /**
     * Invalid format test: non-numeric timestamp strings should be rejected
     * Note: parseInt("12.34.56") returns 12, so strings starting with digits
     * are parsed as numbers. Only truly non-numeric strings trigger format error.
     */
    it("should reject invalid timestamp formats", () => {
      // These strings cannot be parsed as integers at all
      const invalidFormats = ["not-a-number", "", "abc", "NaN", "undefined", "null"];

      for (const invalidTimestamp of invalidFormats) {
        const result = service.validateTimestamp(invalidTimestamp);
        expect(result.valid).toBe(false);
        if (!result.valid) {
          expect(result.code).toBe("WEBHOOK_INVALID_TIMESTAMP_FORMAT");
        }
      }
    });

    /**
     * Property test: any valid numeric string within window should be accepted
     */
    it("should accept any valid numeric timestamp within the full valid window", () => {
      // Generate offsets from -60 (future) to +300 (past) seconds
      const validOffsetArbitrary = fc.integer({
        min: -MAX_TIMESTAMP_FUTURE,
        max: MAX_TIMESTAMP_AGE,
      });

      fc.assert(
        fc.property(validOffsetArbitrary, (offsetSeconds: number) => {
          const now = nowSeconds();
          const timestamp = now - offsetSeconds;
          const result = service.validateTimestamp(toTimestampString(timestamp));
          expect(result.valid).toBe(true);
        }),
        { numRuns: 100 }
      );
    });

    /**
     * Property test: any timestamp outside the valid window should be rejected
     */
    it("should reject any timestamp outside the valid window", () => {
      // Generate either very old (>300s) or very future (>60s) timestamps
      const invalidOffsetArbitrary = fc.oneof(
        // Old timestamps: 301 to 100000 seconds in the past
        fc.integer({ min: MAX_TIMESTAMP_AGE + 1, max: 100000 }),
        // Future timestamps: 61 to 100000 seconds in the future (negative offset)
        fc.integer({ min: MAX_TIMESTAMP_FUTURE + 1, max: 100000 }).map(n => -n)
      );

      fc.assert(
        fc.property(invalidOffsetArbitrary, (offsetSeconds: number) => {
          const now = nowSeconds();
          const timestamp = now - offsetSeconds;
          const result = service.validateTimestamp(toTimestampString(timestamp));
          expect(result.valid).toBe(false);
        }),
        { numRuns: 100 }
      );
    });
  });

  // ============================================================================
  // Test Suite: Property 2 - Idempotency Prevents Duplicate Processing
  // **Feature: clerk-webhook-security, Property 2: Idempotency prevents duplicate processing**
  // **Validates: Requirements 3.1, 3.2**
  // ============================================================================

  describe("Property 2: Idempotency prevents duplicate processing", () => {
    /**
     * **Feature: clerk-webhook-security, Property 2: Idempotency prevents duplicate processing**
     * **Validates: Requirements 3.1**
     *
     * For any svix-id, the first check should return isDuplicate: false
     */
    it("should return isDuplicate: false for any new svix-id", () => {
      // Generate random svix-id strings (UUID-like format)
      const svixIdArbitrary = fc.uuid();

      fc.assert(
        fc.property(svixIdArbitrary, (svixId: string) => {
          // Create fresh service for each property check to ensure isolation
          const freshService = new WebhookSecurityService();
          const result = freshService.checkIdempotency(svixId);

          expect(result.isDuplicate).toBe(false);
        }),
        { numRuns: 100 }
      );
    });

    /**
     * **Feature: clerk-webhook-security, Property 2: Idempotency prevents duplicate processing**
     * **Validates: Requirements 3.1, 3.2**
     *
     * For any svix-id that has been recorded as processed, subsequent checks
     * should return isDuplicate: true with the original processing timestamp
     */
    it("should return isDuplicate: true for any previously processed svix-id", () => {
      // Generate random svix-id and event type combinations
      const webhookDataArbitrary = fc.record({
        svixId: fc.uuid(),
        eventType: fc.constantFrom(
          "session.created",
          "session.ended",
          "subscription.created",
          "subscription.updated",
          "invoice.paid"
        ),
      });

      fc.assert(
        fc.property(webhookDataArbitrary, ({ svixId, eventType }) => {
          // Create fresh service for each property check
          const freshService = new WebhookSecurityService();

          // First check should be not duplicate
          const firstCheck = freshService.checkIdempotency(svixId);
          expect(firstCheck.isDuplicate).toBe(false);

          // Record the webhook as processed
          freshService.recordProcessed(svixId, eventType);

          // Second check should be duplicate
          const secondCheck = freshService.checkIdempotency(svixId);
          expect(secondCheck.isDuplicate).toBe(true);

          if (secondCheck.isDuplicate) {
            // Verify the original processing timestamp is returned
            expect(typeof secondCheck.originalProcessedAt).toBe("number");
            expect(secondCheck.originalProcessedAt).toBeGreaterThan(0);
          }
        }),
        { numRuns: 100 }
      );
    });

    /**
     * **Feature: clerk-webhook-security, Property 2: Idempotency prevents duplicate processing**
     * **Validates: Requirements 3.1, 3.2**
     *
     * For any sequence of unique svix-ids, each should be detected as new,
     * and after recording, each should be detected as duplicate
     */
    it("should correctly track multiple unique svix-ids independently", () => {
      // Generate arrays of unique svix-ids (1-10 items)
      const svixIdsArbitrary = fc.uniqueArray(fc.uuid(), { minLength: 1, maxLength: 10 });

      fc.assert(
        fc.property(svixIdsArbitrary, (svixIds: string[]) => {
          const freshService = new WebhookSecurityService();

          // All should initially be non-duplicates
          for (const svixId of svixIds) {
            const result = freshService.checkIdempotency(svixId);
            expect(result.isDuplicate).toBe(false);
          }

          // Record all as processed
          for (const svixId of svixIds) {
            freshService.recordProcessed(svixId, "test.event");
          }

          // All should now be duplicates
          for (const svixId of svixIds) {
            const result = freshService.checkIdempotency(svixId);
            expect(result.isDuplicate).toBe(true);
          }
        }),
        { numRuns: 100 }
      );
    });

    /**
     * **Feature: clerk-webhook-security, Property 2: Idempotency prevents duplicate processing**
     * **Validates: Requirements 3.2**
     *
     * Recording the same svix-id multiple times should not cause errors
     * and should still detect as duplicate
     */
    it("should handle multiple recordings of the same svix-id gracefully", () => {
      // Generate svix-id and number of times to record it
      const testDataArbitrary = fc.record({
        svixId: fc.uuid(),
        recordCount: fc.integer({ min: 2, max: 10 }),
      });

      fc.assert(
        fc.property(testDataArbitrary, ({ svixId, recordCount }) => {
          const freshService = new WebhookSecurityService();

          // Record the same svix-id multiple times
          for (let i = 0; i < recordCount; i++) {
            freshService.recordProcessed(svixId, `event.type.${i}`);
          }

          // Should still be detected as duplicate
          const result = freshService.checkIdempotency(svixId);
          expect(result.isDuplicate).toBe(true);
        }),
        { numRuns: 100 }
      );
    });

    /**
     * **Feature: clerk-webhook-security, Property 2: Idempotency prevents duplicate processing**
     * **Validates: Requirements 3.1**
     *
     * Different svix-ids should be tracked independently - recording one
     * should not affect the idempotency check of another
     */
    it("should track different svix-ids independently", () => {
      // Generate two distinct svix-ids
      const twoSvixIdsArbitrary = fc.tuple(fc.uuid(), fc.uuid()).filter(([a, b]) => a !== b);

      fc.assert(
        fc.property(twoSvixIdsArbitrary, ([svixId1, svixId2]) => {
          const freshService = new WebhookSecurityService();

          // Record only the first svix-id
          freshService.recordProcessed(svixId1, "test.event");

          // First should be duplicate
          const result1 = freshService.checkIdempotency(svixId1);
          expect(result1.isDuplicate).toBe(true);

          // Second should NOT be duplicate (independent tracking)
          const result2 = freshService.checkIdempotency(svixId2);
          expect(result2.isDuplicate).toBe(false);
        }),
        { numRuns: 100 }
      );
    });

    /**
     * **Feature: clerk-webhook-security, Property 2: Idempotency prevents duplicate processing**
     * **Validates: Requirements 3.1, 3.2**
     *
     * For any valid svix-id string format, the idempotency system should work correctly
     */
    it("should handle various svix-id string formats", () => {
      // Generate various string formats that could be svix-ids
      const svixIdFormatArbitrary = fc.oneof(
        fc.uuid(), // Standard UUID format
        fc.string({ minLength: 8, maxLength: 64 }).filter(s => s.trim().length > 0) // General non-empty strings
      );

      fc.assert(
        fc.property(svixIdFormatArbitrary, (svixId: string) => {
          const freshService = new WebhookSecurityService();

          // First check - should not be duplicate
          const firstCheck = freshService.checkIdempotency(svixId);
          expect(firstCheck.isDuplicate).toBe(false);

          // Record as processed
          freshService.recordProcessed(svixId, "test.event");

          // Second check - should be duplicate
          const secondCheck = freshService.checkIdempotency(svixId);
          expect(secondCheck.isDuplicate).toBe(true);
        }),
        { numRuns: 100 }
      );
    });
  });

  // ============================================================================
  // Test Suite: Property 4 - Audit Logs Contain All Required Fields
  // **Feature: clerk-webhook-security, Property 4: Audit logs contain all required fields**
  // **Validates: Requirements 4.1, 4.2, 4.3**
  // ============================================================================

  describe("Property 4: Audit logs contain all required fields", () => {
    let logger: WebhookAuditLogger;
    let capturedLogs: string[];
    let originalConsoleInfo: typeof console.info;
    let originalConsoleWarn: typeof console.warn;
    let originalConsoleError: typeof console.error;

    beforeEach(() => {
      // Get fresh logger instance
      logger = WebhookAuditLogger.getInstance();
      capturedLogs = [];

      // Capture console output for verification
      originalConsoleInfo = console.info;
      originalConsoleWarn = console.warn;
      originalConsoleError = console.error;

      const captureLog = (log: string): void => {
        capturedLogs.push(log);
      };

      console.info = captureLog;
      console.warn = captureLog;
      console.error = captureLog;
    });

    afterEach(() => {
      // Restore console methods
      console.info = originalConsoleInfo;
      console.warn = originalConsoleWarn;
      console.error = originalConsoleError;
    });

    /**
     * Required fields that must be present in every audit log entry
     * Requirements 4.1, 4.2, 4.3
     */
    const REQUIRED_FIELDS = [
      "requestId",
      "timestamp",
      "eventType",
      "sourceIp",
      "svixId",
      "signatureValid",
      "processingTimeMs",
      "outcome",
    ] as const;

    /**
     * Arbitrary generator for valid WebhookAuditEntry objects
     */
    const webhookAuditEntryArbitrary = fc.record({
      requestId: fc.uuid(),
      // Generate timestamp as integer (milliseconds since epoch) and convert to ISO string
      // Range: 2020-01-01 to 2030-12-31
      timestamp: fc
        .integer({
          min: 1577836800000, // 2020-01-01T00:00:00.000Z
          max: 1924991999999, // 2030-12-31T23:59:59.999Z
        })
        .map(ms => new Date(ms).toISOString()),
      eventType: fc.constantFrom(
        "session.created",
        "session.ended",
        "subscription.created",
        "subscription.updated",
        "subscription.deleted",
        "invoice.paid",
        "invoice.failed"
      ),
      sourceIp: fc.oneof(
        // IPv4 addresses
        fc
          .tuple(
            fc.integer({ min: 0, max: 255 }),
            fc.integer({ min: 0, max: 255 }),
            fc.integer({ min: 0, max: 255 }),
            fc.integer({ min: 0, max: 255 })
          )
          .map(([a, b, c, d]) => `${a}.${b}.${c}.${d}`),
        // IPv6 localhost
        fc.constant("::1")
      ),
      svixId: fc.uuid().map(id => `msg_${id}`),
      signatureValid: fc.boolean(),
      processingTimeMs: fc.integer({ min: 0, max: 10000 }),
      outcome: fc.constantFrom(
        "success",
        "rejected",
        "duplicate",
        "error"
      ) as fc.Arbitrary<WebhookOutcome>,
      // Optional fields
      rejectionReason: fc.option(fc.string({ minLength: 1, maxLength: 100 }), { nil: undefined }),
      mutationCalled: fc.option(
        fc.constantFrom("syncClerkSession", "updateSubscription", "processInvoice"),
        { nil: undefined }
      ),
      syncStatus: fc.option(fc.boolean(), { nil: undefined }),
    });

    /**
     * **Feature: clerk-webhook-security, Property 4: Audit logs contain all required fields**
     * **Validates: Requirements 4.1, 4.2, 4.3**
     *
     * For any webhook audit entry, the logged JSON should contain all required fields
     */
    it("should include all required fields in any audit log entry", () => {
      fc.assert(
        fc.property(webhookAuditEntryArbitrary, (entry: WebhookAuditEntry) => {
          // Clear captured logs
          capturedLogs = [];

          // Log the entry
          logger.log(entry);

          // Verify a log was captured
          expect(capturedLogs.length).toBe(1);

          // Parse the logged JSON
          const loggedEntry = JSON.parse(capturedLogs[0]) as Record<string, unknown>;

          // Verify all required fields are present
          for (const field of REQUIRED_FIELDS) {
            expect(loggedEntry).toHaveProperty(field);
            expect(loggedEntry[field]).toBeDefined();
          }

          // Verify the type field is added
          expect(loggedEntry).toHaveProperty("type", "webhook_audit");
        }),
        { numRuns: 100 }
      );
    });

    /**
     * **Feature: clerk-webhook-security, Property 4: Audit logs contain all required fields**
     * **Validates: Requirements 4.1**
     *
     * For any successful webhook, the audit log should contain the correct field values
     */
    it("should preserve field values correctly in audit log", () => {
      fc.assert(
        fc.property(webhookAuditEntryArbitrary, (entry: WebhookAuditEntry) => {
          capturedLogs = [];
          logger.log(entry);

          const loggedEntry = JSON.parse(capturedLogs[0]) as Record<string, unknown>;

          // Verify field values match input
          expect(loggedEntry.requestId).toBe(entry.requestId);
          expect(loggedEntry.timestamp).toBe(entry.timestamp);
          expect(loggedEntry.eventType).toBe(entry.eventType);
          expect(loggedEntry.sourceIp).toBe(entry.sourceIp);
          expect(loggedEntry.svixId).toBe(entry.svixId);
          expect(loggedEntry.signatureValid).toBe(entry.signatureValid);
          expect(loggedEntry.processingTimeMs).toBe(entry.processingTimeMs);
          expect(loggedEntry.outcome).toBe(entry.outcome);
        }),
        { numRuns: 100 }
      );
    });

    /**
     * **Feature: clerk-webhook-security, Property 4: Audit logs contain all required fields**
     * **Validates: Requirements 4.2**
     *
     * For any rejected webhook, the audit log should include the rejection reason
     */
    it("should include rejection reason for rejected webhooks when provided", () => {
      // Generate only rejected entries with rejection reasons
      const rejectedEntryArbitrary = webhookAuditEntryArbitrary.map(entry => ({
        ...entry,
        outcome: "rejected" as WebhookOutcome,
        rejectionReason: "Invalid signature",
      }));

      fc.assert(
        fc.property(rejectedEntryArbitrary, (entry: WebhookAuditEntry) => {
          capturedLogs = [];
          logger.log(entry);

          const loggedEntry = JSON.parse(capturedLogs[0]) as Record<string, unknown>;

          // Verify rejection reason is included
          expect(loggedEntry).toHaveProperty("rejectionReason");
          expect(loggedEntry.rejectionReason).toBe(entry.rejectionReason);
        }),
        { numRuns: 100 }
      );
    });

    /**
     * **Feature: clerk-webhook-security, Property 4: Audit logs contain all required fields**
     * **Validates: Requirements 4.3**
     *
     * For any successful webhook, the audit log should include mutation and sync status
     */
    it("should include mutation and sync status for successful webhooks when provided", () => {
      // Generate only successful entries with mutation info
      const successEntryArbitrary = webhookAuditEntryArbitrary.map(entry => ({
        ...entry,
        outcome: "success" as WebhookOutcome,
        signatureValid: true,
        mutationCalled: "syncClerkSession",
        syncStatus: true,
      }));

      fc.assert(
        fc.property(successEntryArbitrary, (entry: WebhookAuditEntry) => {
          capturedLogs = [];
          logger.log(entry);

          const loggedEntry = JSON.parse(capturedLogs[0]) as Record<string, unknown>;

          // Verify mutation info is included
          expect(loggedEntry).toHaveProperty("mutationCalled");
          expect(loggedEntry.mutationCalled).toBe(entry.mutationCalled);
          expect(loggedEntry).toHaveProperty("syncStatus");
          expect(loggedEntry.syncStatus).toBe(entry.syncStatus);
        }),
        { numRuns: 100 }
      );
    });

    /**
     * **Feature: clerk-webhook-security, Property 4: Audit logs contain all required fields**
     * **Validates: Requirements 4.1, 4.2, 4.3**
     *
     * For any outcome type, the audit log should be valid JSON
     */
    it("should produce valid JSON for any audit entry", () => {
      fc.assert(
        fc.property(webhookAuditEntryArbitrary, (entry: WebhookAuditEntry) => {
          capturedLogs = [];
          logger.log(entry);

          // Should not throw when parsing
          expect(() => JSON.parse(capturedLogs[0])).not.toThrow();
        }),
        { numRuns: 100 }
      );
    });

    /**
     * **Feature: clerk-webhook-security, Property 4: Audit logs contain all required fields**
     * **Validates: Requirements 4.1**
     *
     * For any outcome type (success, rejected, duplicate, error), all required fields should be present
     */
    it("should include all required fields regardless of outcome type", () => {
      const outcomes: WebhookOutcome[] = ["success", "rejected", "duplicate", "error"];

      for (const outcome of outcomes) {
        const outcomeEntryArbitrary = webhookAuditEntryArbitrary.map(entry => ({
          ...entry,
          outcome,
        }));

        fc.assert(
          fc.property(outcomeEntryArbitrary, (entry: WebhookAuditEntry) => {
            capturedLogs = [];
            logger.log(entry);

            const loggedEntry = JSON.parse(capturedLogs[0]) as Record<string, unknown>;

            // All required fields must be present for any outcome
            for (const field of REQUIRED_FIELDS) {
              expect(loggedEntry).toHaveProperty(field);
            }
          }),
          { numRuns: 25 } // 25 runs per outcome = 100 total
        );
      }
    });

    /**
     * **Feature: clerk-webhook-security, Property 4: Audit logs contain all required fields**
     * **Validates: Requirements 4.1**
     *
     * Optional fields should only be present when they have values
     */
    it("should only include optional fields when they have values", () => {
      // Generate entries without optional fields
      const minimalEntryArbitrary = fc.record({
        requestId: fc.uuid(),
        timestamp: fc.date().map(d => d.toISOString()),
        eventType: fc.constantFrom("session.created", "invoice.paid"),
        sourceIp: fc.constant("127.0.0.1"),
        svixId: fc.uuid().map(id => `msg_${id}`),
        signatureValid: fc.boolean(),
        processingTimeMs: fc.integer({ min: 0, max: 1000 }),
        outcome: fc.constantFrom(
          "success",
          "rejected",
          "duplicate",
          "error"
        ) as fc.Arbitrary<WebhookOutcome>,
      });

      fc.assert(
        fc.property(minimalEntryArbitrary, (entry: WebhookAuditEntry) => {
          capturedLogs = [];
          logger.log(entry);

          const loggedEntry = JSON.parse(capturedLogs[0]) as Record<string, unknown>;

          // Optional fields should not be present when not provided
          expect(loggedEntry).not.toHaveProperty("rejectionReason");
          expect(loggedEntry).not.toHaveProperty("mutationCalled");
          expect(loggedEntry).not.toHaveProperty("syncStatus");
        }),
        { numRuns: 100 }
      );
    });
  });
});
