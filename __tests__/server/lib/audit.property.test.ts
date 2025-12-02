/**
 * Property-Based Tests for Audit Logger
 *
 * **Feature: convex-integration-pending, Property 1: Audit Log Persistence**
 * **Feature: convex-integration-pending, Property 2: Audit Log Ordering**
 * **Feature: convex-integration-pending, Property 3: Security Event Filtering**
 * **Feature: convex-integration-pending, Property 4: Audit Error Graceful Degradation**
 * **Validates: Requirements 1.1, 1.2, 1.3, 1.4**
 *
 * Tests that:
 * - Audit log entries are persisted with matching fields
 * - User audit logs are returned in descending timestamp order
 * - Security events are filtered to only include security-related actions
 * - Convex failures are handled gracefully without throwing
 */

import { afterEach, beforeEach, describe, expect, it } from "@jest/globals";
import * as fc from "fast-check";

// Security event action types as defined in the Convex audit.ts
const SECURITY_EVENT_ACTIONS = ["login_failed", "security_event", "rate_limit_exceeded"] as const;
type SecurityEventAction = (typeof SECURITY_EVENT_ACTIONS)[number];

// All possible audit actions in the system
const ALL_AUDIT_ACTIONS = [
  "user_registered",
  "user_login",
  "login_failed",
  "subscription_created",
  "subscription_updated",
  "subscription_cancelled",
  "payment_processed",
  "payment_failed",
  "profile_updated",
  "security_event",
  "rate_limit_exceeded",
] as const;
type _AuditAction = (typeof ALL_AUDIT_ACTIONS)[number];

// Resource types in the system
const RESOURCE_TYPES = ["users", "subscriptions", "payments", "security", "api"] as const;
type _ResourceType = (typeof RESOURCE_TYPES)[number];

/**
 * Interface for audit log entry matching the AuditLogger interface
 */
interface AuditLogEntry {
  userId?: string;
  action: string;
  resource: string;
  details?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  timestamp?: number;
}

/**
 * Interface for stored audit log (with timestamp always present)
 */
interface StoredAuditLog extends AuditLogEntry {
  timestamp: number;
  clerkId?: string;
}

/**
 * Simulates the audit log storage behavior.
 * This mirrors the Convex mutation's core logic for storing audit entries.
 */
class MockAuditStorage {
  private logs: StoredAuditLog[] = [];

  /**
   * Store an audit log entry (simulates logAuditEvent mutation)
   */
  store(entry: AuditLogEntry): StoredAuditLog {
    const storedLog: StoredAuditLog = {
      ...entry,
      clerkId: entry.userId,
      timestamp: entry.timestamp ?? Date.now(),
    };
    this.logs.push(storedLog);
    return storedLog;
  }

  /**
   * Get all logs for a specific user, ordered by timestamp descending
   * (simulates getUserAuditLogs query)
   */
  getUserLogs(clerkId: string, limit = 50): StoredAuditLog[] {
    return this.logs
      .filter(log => log.clerkId === clerkId)
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);
  }

  /**
   * Get security events only (simulates getSecurityEvents query)
   */
  getSecurityEvents(limit = 100): StoredAuditLog[] {
    return this.logs
      .filter(log => SECURITY_EVENT_ACTIONS.includes(log.action as SecurityEventAction))
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);
  }

  /**
   * Get all stored logs (for testing purposes)
   */
  getAllLogs(): StoredAuditLog[] {
    return [...this.logs];
  }

  /**
   * Clear all logs (for test isolation)
   */
  clear(): void {
    this.logs = [];
  }
}

/**
 * Simulates the AuditLogger class behavior with graceful degradation
 */
class MockAuditLogger {
  private storage: MockAuditStorage;
  private shouldFail: boolean = false;
  private errorLogs: string[] = [];

  constructor(storage: MockAuditStorage) {
    this.storage = storage;
  }

  /**
   * Configure whether Convex calls should fail (for testing graceful degradation)
   */
  setFailureMode(shouldFail: boolean): void {
    this.shouldFail = shouldFail;
  }

  /**
   * Get captured error logs (for verifying graceful degradation)
   */
  getErrorLogs(): string[] {
    return [...this.errorLogs];
  }

  /**
   * Clear error logs
   */
  clearErrorLogs(): void {
    this.errorLogs = [];
  }

  /**
   * Log an audit entry with graceful degradation
   * Requirements: 1.1, 1.4
   */
  async log(entry: AuditLogEntry): Promise<void> {
    try {
      if (this.shouldFail) {
        throw new Error("Simulated Convex failure");
      }
      this.storage.store(entry);
    } catch (error) {
      // Graceful degradation: log error and continue without throwing
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      this.errorLogs.push(`Failed to log audit entry to Convex: ${errorMessage}`);
      // Note: In real implementation, this would also console.log the entry as fallback
    }
  }

  /**
   * Get user audit logs
   * Requirements: 1.2
   */
  async getUserAuditLogs(clerkId: string, limit = 50): Promise<AuditLogEntry[]> {
    try {
      if (this.shouldFail) {
        throw new Error("Simulated Convex failure");
      }
      return this.storage.getUserLogs(clerkId, limit);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      this.errorLogs.push(`Failed to get user audit logs from Convex: ${errorMessage}`);
      return [];
    }
  }

  /**
   * Get security events
   * Requirements: 1.3
   */
  async getSecurityEvents(limit = 100): Promise<AuditLogEntry[]> {
    try {
      if (this.shouldFail) {
        throw new Error("Simulated Convex failure");
      }
      return this.storage.getSecurityEvents(limit);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      this.errorLogs.push(`Failed to get security events from Convex: ${errorMessage}`);
      return [];
    }
  }
}

/**
 * Helper function to check if an action is a security event
 */
function isSecurityEventAction(action: string): boolean {
  return SECURITY_EVENT_ACTIONS.includes(action as SecurityEventAction);
}

/**
 * Helper function to verify logs are in descending timestamp order
 */
function isDescendingOrder(logs: StoredAuditLog[]): boolean {
  for (let i = 1; i < logs.length; i++) {
    if (logs[i].timestamp > logs[i - 1].timestamp) {
      return false;
    }
  }
  return true;
}

// Fast-check arbitraries for generating test data
const auditActionArb = fc.constantFrom(...ALL_AUDIT_ACTIONS);
const resourceTypeArb = fc.constantFrom(...RESOURCE_TYPES);
const userIdArb = fc.uuid();
const ipAddressArb = fc.ipV4();
const userAgentArb = fc.string({ minLength: 10, maxLength: 100 });
const timestampArb = fc.integer({ min: 1609459200000, max: 1893456000000 }); // 2021-2030

// Create a typed audit log entry arbitrary
const auditLogEntryArb: fc.Arbitrary<AuditLogEntry> = fc
  .record({
    userId: fc.option(userIdArb, { nil: undefined }),
    action: auditActionArb,
    resource: resourceTypeArb,
    details: fc.option(fc.dictionary(fc.string({ minLength: 1, maxLength: 20 }), fc.string()), {
      nil: undefined,
    }),
    ipAddress: fc.option(ipAddressArb, { nil: undefined }),
    userAgent: fc.option(userAgentArb, { nil: undefined }),
    timestamp: fc.option(timestampArb, { nil: undefined }),
  })
  .map(entry => ({
    userId: entry.userId,
    action: entry.action,
    resource: entry.resource,
    details: entry.details as Record<string, unknown> | undefined,
    ipAddress: entry.ipAddress,
    userAgent: entry.userAgent,
    timestamp: entry.timestamp,
  }));

describe("Audit Logger Property Tests", () => {
  let storage: MockAuditStorage;
  let logger: MockAuditLogger;

  beforeEach(() => {
    storage = new MockAuditStorage();
    logger = new MockAuditLogger(storage);
  });

  afterEach(() => {
    storage.clear();
    logger.clearErrorLogs();
  });

  /**
   * **Feature: convex-integration-pending, Property 1: Audit Log Persistence**
   * **Validates: Requirements 1.1**
   *
   * For any audit log entry passed to AuditLogger.log(), the entry should be
   * retrievable from storage with matching action, resource, and details fields.
   */
  describe("Property 1: Audit Log Persistence", () => {
    it("should persist audit log entries with matching fields", async () => {
      await fc.assert(
        fc.asyncProperty(auditLogEntryArb, async entry => {
          // Clear storage for each test case
          storage.clear();

          // Log the entry
          await logger.log(entry);

          // Retrieve all logs
          const allLogs = storage.getAllLogs();

          // Verify the entry was stored
          expect(allLogs.length).toBe(1);

          const storedLog = allLogs[0];

          // Verify matching fields
          expect(storedLog.action).toBe(entry.action);
          expect(storedLog.resource).toBe(entry.resource);
          expect(storedLog.clerkId).toBe(entry.userId);

          // Details should match if provided
          if (entry.details !== undefined) {
            expect(storedLog.details).toEqual(entry.details);
          }

          // IP address should match if provided
          if (entry.ipAddress !== undefined) {
            expect(storedLog.ipAddress).toBe(entry.ipAddress);
          }

          // User agent should match if provided
          if (entry.userAgent !== undefined) {
            expect(storedLog.userAgent).toBe(entry.userAgent);
          }

          // Timestamp should be set
          expect(storedLog.timestamp).toBeDefined();
          expect(typeof storedLog.timestamp).toBe("number");
        }),
        { numRuns: 100 }
      );
    });

    it("should persist multiple audit log entries", async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(auditLogEntryArb, { minLength: 1, maxLength: 20 }),
          async entries => {
            // Clear storage for each test case
            storage.clear();

            // Log all entries
            for (const entry of entries) {
              await logger.log(entry);
            }

            // Retrieve all logs
            const allLogs = storage.getAllLogs();

            // Verify all entries were stored
            expect(allLogs.length).toBe(entries.length);

            // Verify each entry's action and resource are present in stored logs
            for (let i = 0; i < entries.length; i++) {
              expect(allLogs[i].action).toBe(entries[i].action);
              expect(allLogs[i].resource).toBe(entries[i].resource);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * **Feature: convex-integration-pending, Property 2: Audit Log Ordering**
   * **Validates: Requirements 1.2**
   *
   * For any user with multiple audit logs, calling getUserAuditLogs should
   * return logs in descending timestamp order (most recent first).
   */
  describe("Property 2: Audit Log Ordering", () => {
    it("should return user audit logs in descending timestamp order", async () => {
      await fc.assert(
        fc.asyncProperty(
          userIdArb,
          fc.array(
            fc.record({
              action: auditActionArb,
              resource: resourceTypeArb,
              timestamp: timestampArb,
            }),
            { minLength: 2, maxLength: 20 }
          ),
          async (userId, logData) => {
            // Clear storage for each test case
            storage.clear();

            // Create entries with the same userId but different timestamps
            for (const data of logData) {
              await logger.log({
                userId,
                action: data.action,
                resource: data.resource,
                timestamp: data.timestamp,
              });
            }

            // Retrieve user logs
            const userLogs = await logger.getUserAuditLogs(userId);

            // Verify logs are in descending timestamp order
            expect(isDescendingOrder(userLogs as StoredAuditLog[])).toBe(true);

            // Verify all logs belong to the user
            for (const log of userLogs) {
              expect(log.userId).toBe(userId);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it("should respect the limit parameter for user audit logs", async () => {
      await fc.assert(
        fc.asyncProperty(
          userIdArb,
          fc.integer({ min: 1, max: 10 }), // limit
          fc.integer({ min: 15, max: 30 }), // number of logs to create (more than limit)
          async (userId, limit, logCount) => {
            // Clear storage for each test case
            storage.clear();

            // Create more logs than the limit
            for (let i = 0; i < logCount; i++) {
              await logger.log({
                userId,
                action: "user_login",
                resource: "users",
                timestamp: Date.now() + i * 1000, // Ensure different timestamps
              });
            }

            // Retrieve user logs with limit
            const userLogs = await logger.getUserAuditLogs(userId, limit);

            // Verify limit is respected
            expect(userLogs.length).toBe(limit);

            // Verify logs are still in descending order
            expect(isDescendingOrder(userLogs as StoredAuditLog[])).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it("should return empty array for user with no logs", async () => {
      await fc.assert(
        fc.asyncProperty(userIdArb, async userId => {
          // Clear storage for each test case
          storage.clear();

          // Retrieve logs for user with no entries
          const userLogs = await logger.getUserAuditLogs(userId);

          // Should return empty array
          expect(userLogs).toEqual([]);
        }),
        { numRuns: 100 }
      );
    });
  });

  /**
   * **Feature: convex-integration-pending, Property 3: Security Event Filtering**
   * **Validates: Requirements 1.3**
   *
   * For any set of audit logs, calling getSecurityEvents should return only
   * logs where action is one of: "login_failed", "security_event", "rate_limit_exceeded".
   */
  describe("Property 3: Security Event Filtering", () => {
    it("should return only security-related events", async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(auditLogEntryArb, { minLength: 5, maxLength: 30 }),
          async entries => {
            // Clear storage for each test case
            storage.clear();

            // Log all entries (mix of security and non-security events)
            for (const entry of entries) {
              await logger.log(entry);
            }

            // Retrieve security events
            const securityEvents = await logger.getSecurityEvents();

            // Verify all returned events are security events
            for (const event of securityEvents) {
              expect(isSecurityEventAction(event.action)).toBe(true);
            }

            // Verify we got all security events from the input
            const expectedSecurityCount = entries.filter(e =>
              isSecurityEventAction(e.action)
            ).length;
            expect(securityEvents.length).toBe(expectedSecurityCount);
          }
        ),
        { numRuns: 100 }
      );
    });

    it("should filter out non-security events", async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.record({
              userId: fc.option(userIdArb, { nil: undefined }),
              action: fc.constantFrom(
                "user_registered",
                "user_login",
                "subscription_created",
                "payment_processed"
              ),
              resource: resourceTypeArb,
              timestamp: timestampArb,
            }),
            { minLength: 5, maxLength: 20 }
          ),
          async nonSecurityEntries => {
            // Clear storage for each test case
            storage.clear();

            // Log only non-security events
            for (const entry of nonSecurityEntries) {
              await logger.log(entry);
            }

            // Retrieve security events
            const securityEvents = await logger.getSecurityEvents();

            // Should return empty array since no security events were logged
            expect(securityEvents.length).toBe(0);
          }
        ),
        { numRuns: 100 }
      );
    });

    it("should return security events in descending timestamp order", async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.record({
              userId: fc.option(userIdArb, { nil: undefined }),
              action: fc.constantFrom(...SECURITY_EVENT_ACTIONS),
              resource: resourceTypeArb,
              timestamp: timestampArb,
            }),
            { minLength: 2, maxLength: 20 }
          ),
          async securityEntries => {
            // Clear storage for each test case
            storage.clear();

            // Log security events
            for (const entry of securityEntries) {
              await logger.log(entry);
            }

            // Retrieve security events
            const securityEvents = await logger.getSecurityEvents();

            // Verify descending timestamp order
            expect(isDescendingOrder(securityEvents as StoredAuditLog[])).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it("should respect the limit parameter for security events", async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 10 }), // limit
          fc.integer({ min: 15, max: 30 }), // number of security events to create
          async (limit, eventCount) => {
            // Clear storage for each test case
            storage.clear();

            // Create more security events than the limit
            for (let i = 0; i < eventCount; i++) {
              await logger.log({
                action: SECURITY_EVENT_ACTIONS[i % SECURITY_EVENT_ACTIONS.length],
                resource: "security",
                timestamp: Date.now() + i * 1000,
              });
            }

            // Retrieve security events with limit
            const securityEvents = await logger.getSecurityEvents(limit);

            // Verify limit is respected
            expect(securityEvents.length).toBe(limit);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * **Feature: convex-integration-pending, Property 4: Audit Error Graceful Degradation**
   * **Validates: Requirements 1.4, 5.1**
   *
   * For any Convex failure during audit logging, the AuditLogger should not
   * throw an exception and should log the error to console.
   */
  describe("Property 4: Audit Error Graceful Degradation", () => {
    it("should not throw when Convex fails during log()", async () => {
      await fc.assert(
        fc.asyncProperty(auditLogEntryArb, async entry => {
          // Clear state for each test case
          storage.clear();
          logger.clearErrorLogs();

          // Enable failure mode
          logger.setFailureMode(true);

          // This should NOT throw
          await expect(logger.log(entry)).resolves.toBeUndefined();

          // Verify error was logged
          const errorLogs = logger.getErrorLogs();
          expect(errorLogs.length).toBe(1);
          expect(errorLogs[0]).toContain("Failed to log audit entry to Convex");
        }),
        { numRuns: 100 }
      );
    });

    it("should return empty array when Convex fails during getUserAuditLogs()", async () => {
      await fc.assert(
        fc.asyncProperty(userIdArb, async userId => {
          // Clear state for each test case
          storage.clear();
          logger.clearErrorLogs();

          // Enable failure mode
          logger.setFailureMode(true);

          // This should NOT throw and should return empty array
          const result = await logger.getUserAuditLogs(userId);

          expect(result).toEqual([]);

          // Verify error was logged
          const errorLogs = logger.getErrorLogs();
          expect(errorLogs.length).toBe(1);
          expect(errorLogs[0]).toContain("Failed to get user audit logs from Convex");
        }),
        { numRuns: 100 }
      );
    });

    it("should return empty array when Convex fails during getSecurityEvents()", async () => {
      await fc.assert(
        fc.asyncProperty(fc.integer({ min: 1, max: 100 }), async limit => {
          // Clear state for each test case
          storage.clear();
          logger.clearErrorLogs();

          // Enable failure mode
          logger.setFailureMode(true);

          // This should NOT throw and should return empty array
          const result = await logger.getSecurityEvents(limit);

          expect(result).toEqual([]);

          // Verify error was logged
          const errorLogs = logger.getErrorLogs();
          expect(errorLogs.length).toBe(1);
          expect(errorLogs[0]).toContain("Failed to get security events from Convex");
        }),
        { numRuns: 100 }
      );
    });

    it("should continue processing after Convex failure", async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(auditLogEntryArb, { minLength: 3, maxLength: 10 }),
          async entries => {
            // Clear state for each test case
            storage.clear();
            logger.clearErrorLogs();

            // Log first entry with failure mode
            logger.setFailureMode(true);
            await logger.log(entries[0]);

            // Disable failure mode and log remaining entries
            logger.setFailureMode(false);
            for (let i = 1; i < entries.length; i++) {
              await logger.log(entries[i]);
            }

            // Verify only entries after failure were stored
            const allLogs = storage.getAllLogs();
            expect(allLogs.length).toBe(entries.length - 1);

            // Verify error was logged for the failed entry
            const errorLogs = logger.getErrorLogs();
            expect(errorLogs.length).toBe(1);
          }
        ),
        { numRuns: 100 }
      );
    });

    it("should handle intermittent failures gracefully", async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(auditLogEntryArb, { minLength: 5, maxLength: 15 }),
          fc.array(fc.boolean(), { minLength: 5, maxLength: 15 }),
          async (entries, failurePattern) => {
            // Clear state for each test case
            storage.clear();
            logger.clearErrorLogs();

            let successCount = 0;
            let failureCount = 0;

            // Log entries with intermittent failures based on pattern
            for (let i = 0; i < entries.length; i++) {
              const shouldFail = failurePattern[i % failurePattern.length];
              logger.setFailureMode(shouldFail);

              // This should never throw
              await expect(logger.log(entries[i])).resolves.toBeUndefined();

              if (shouldFail) {
                failureCount++;
              } else {
                successCount++;
              }
            }

            // Verify correct number of entries were stored
            const allLogs = storage.getAllLogs();
            expect(allLogs.length).toBe(successCount);

            // Verify correct number of errors were logged
            const errorLogs = logger.getErrorLogs();
            expect(errorLogs.length).toBe(failureCount);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
