import { getDataConsistencyManager } from "../server/lib/dataConsistencyManager";
import { DataSynchronizationManager } from "../server/lib/dataSynchronizationManager";
import { getRollbackManager } from "../server/lib/rollbackManager";
import {
  ConsistencyMetrics,
  IntegrityRule,
  IntegrityViolation,
  MockConvexClient,
  SyncOperation,
  TimedOperation,
  createMockConvexClient,
} from "./types/test-types";

// Mock ConvexHttpClient
const mockConvexClient: MockConvexClient = createMockConvexClient();

// Mock logger
jest.mock("../server/lib/logger", () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

// Mock DataConsistencyManager
const mockDataConsistencyManager = {
  detectConflicts: jest.fn().mockResolvedValue([]),
};

jest.mock("../server/lib/dataConsistencyManager", () => ({
  getDataConsistencyManager: jest.fn(() => mockDataConsistencyManager),
}));

// Mock RollbackManager
const mockRollbackManager = {
  createRollbackPoint: jest.fn().mockResolvedValue("rollback_123"),
  updateRollbackPoint: jest.fn().mockResolvedValue(undefined),
  executeRollback: jest.fn().mockResolvedValue(undefined),
};

jest.mock("../server/lib/rollbackManager", () => ({
  getRollbackManager: jest.fn(() => mockRollbackManager),
}));

// Mock timers
jest.useFakeTimers();
const mockSetInterval = jest.fn<ReturnType<typeof setInterval>, Parameters<typeof setInterval>>();
globalThis.setInterval = mockSetInterval as unknown as typeof setInterval;

// Helper functions to reduce nesting in tests
const createMockSyncCheck = (isValid: boolean, errors: string[] = []) => ({
  isValid,
  checks: [],
  errors,
  timestamp: Date.now(),
});

const createLocalMockRollbackManager = () => ({
  createRollbackPoint: jest.fn().mockResolvedValue("rollback_123"),
  rollback: jest.fn().mockResolvedValue(true),
});

const mockGetRollbackManager = (mockManager: ReturnType<typeof createLocalMockRollbackManager>) => {
  jest.doMock("../server/lib/rollbackManager", () => ({
    getRollbackManager: () => mockManager,
  }));
};

describe("DataSynchronizationManager", () => {
  let manager: DataSynchronizationManager;

  beforeEach(() => {
    jest.clearAllMocks();
    mockSetInterval.mockClear();
    mockDataConsistencyManager.detectConflicts.mockClear();
    mockRollbackManager.createRollbackPoint.mockClear();
    mockRollbackManager.updateRollbackPoint.mockClear();
    mockRollbackManager.executeRollback.mockClear();

    // Reset the mocked functions
    (getDataConsistencyManager as jest.Mock).mockReturnValue(mockDataConsistencyManager);
    (getRollbackManager as jest.Mock).mockReturnValue(mockRollbackManager);

    manager = new DataSynchronizationManager(
      mockConvexClient as unknown as ConstructorParameters<typeof DataSynchronizationManager>[0]
    );
  });

  afterEach(() => {
    jest.clearAllTimers();
  });

  describe("performSyncOperation", () => {
    const mockOperation: SyncOperation = {
      type: "users",
      resourceId: "user_123",
      currentState: { id: "user_123", name: "Old Name" },
      newState: { id: "user_123", name: "New Name" },
      metadata: { source: "api" },
    };

    it("should perform sync operation successfully", async () => {
      // Mock the pre-sync and post-sync checks using helper functions

      jest
        .spyOn(manager as any, "performPreSyncCheck")
        .mockResolvedValue(createMockSyncCheck(true));

      jest
        .spyOn(manager as any, "performPostSyncCheck")
        .mockResolvedValue(createMockSyncCheck(true));

      // Mock rollback manager using helper
      const localMockRollbackManager = createLocalMockRollbackManager();
      mockGetRollbackManager(localMockRollbackManager);

      mockConvexClient.mutation.mockResolvedValueOnce({
        success: true,
        newState: mockOperation.newState,
      }); // sync operation

      const result = await manager.performSyncOperation(mockOperation);

      expect(result.success).toBe(true);
      expect(result.operationId).toBeDefined();
      expect(result.consistencyChecks.preSync.isValid).toBe(true);
      expect(result.consistencyChecks.postSync.isValid).toBe(true);
    });

    it("should fail when pre-sync check fails", async () => {
      // Mock resource not found
      mockConvexClient.query.mockResolvedValueOnce(null);

      await expect(manager.performSyncOperation(mockOperation)).rejects.toThrow(
        "Pre-sync check failed"
      );
    });

    it("should rollback when post-sync check fails", async () => {
      // Mock successful pre-sync check using helper

      jest
        .spyOn(manager as any, "performPreSyncCheck")
        .mockResolvedValue(createMockSyncCheck(true));

      // Mock failed post-sync check using helper

      jest
        .spyOn(manager as any, "performPostSyncCheck")
        .mockResolvedValue(createMockSyncCheck(false, ["Post-sync validation failed"]));

      mockConvexClient.mutation.mockResolvedValueOnce({
        success: true,
        newState: mockOperation.newState,
      });

      await expect(manager.performSyncOperation(mockOperation)).rejects.toThrow(
        "Post-sync check failed"
      );
    });

    it("should handle sync operation errors", async () => {
      // Mock successful pre-sync but failed sync
      mockConvexClient.query
        .mockResolvedValueOnce({ id: "user_123", name: "Old Name" })
        .mockResolvedValueOnce({ id: "user_123", name: "Old Name" });

      mockConvexClient.mutation.mockRejectedValueOnce(new Error("Sync failed"));

      await expect(manager.performSyncOperation(mockOperation)).rejects.toThrow("Sync failed");
    });
  });

  describe("validateDataIntegrity", () => {
    it("should validate data integrity successfully", async () => {
      const mockResource = { id: "user_123", userId: "user_123", email: "test@example.com" };
      mockConvexClient.query.mockResolvedValueOnce(mockResource);
      mockConvexClient.mutation.mockResolvedValueOnce({ id: "validation_123" });

      const result = await manager.validateDataIntegrity("users", "user_123");

      expect(result.isValid).toBe(true);
      expect(result.violations).toHaveLength(0);
      expect(result.checkedCount).toBe(1);
    });

    it("should detect integrity violations", async () => {
      const mockResource = { id: "user_123" }; // Missing required fields
      mockConvexClient.query.mockResolvedValueOnce(mockResource);
      mockConvexClient.mutation.mockResolvedValueOnce({ id: "validation_123" });

      const result = await manager.validateDataIntegrity("users", "user_123");

      expect(result.isValid).toBe(false);
      expect(result.violations.length).toBeGreaterThan(0);
      expect(result.violations[0].rule).toBe("required_fields");
    });

    it("should validate multiple resources when no resourceId provided", async () => {
      const mockResources = [
        { id: "user_1", userId: "user_1", email: "user1@example.com" },
        { id: "user_2", userId: "user_2", email: "user2@example.com" },
      ];
      mockConvexClient.query.mockResolvedValueOnce(mockResources);
      mockConvexClient.mutation.mockResolvedValueOnce({ id: "validation_123" });

      const result = await manager.validateDataIntegrity("users");

      expect(result.checkedCount).toBe(2);
      expect(result.isValid).toBe(true);
    });

    it("should handle validation errors gracefully", async () => {
      mockConvexClient.query.mockRejectedValueOnce(new Error("Database error"));

      await expect(manager.validateDataIntegrity("users", "user_123")).rejects.toThrow(
        "Database error"
      );
    });
  });

  describe("repairIntegrityViolations", () => {
    it("should repair integrity violations successfully", async () => {
      const violations: IntegrityViolation[] = [
        {
          resourceId: "user_123",
          resourceType: "users",
          rule: "required_fields",
          description: "Missing required fields",
          severity: "high" as const,
          timestamp: Date.now(),
          data: { id: "user_123" },
        },
      ];

      mockConvexClient.mutation.mockResolvedValueOnce({ success: true });

      const result = await manager.repairIntegrityViolations(violations);

      expect(result.totalViolations).toBe(1);
      expect(result.successfulRepairs).toBe(1);
      expect(result.failedRepairs).toBe(0);
    });

    it("should handle repair failures", async () => {
      const violations: IntegrityViolation[] = [
        {
          resourceId: "user_123",
          resourceType: "users",
          rule: "unknown_rule",
          description: "Unknown rule",
          severity: "high" as const,
          timestamp: Date.now(),
          data: { id: "user_123" },
        },
      ];

      const result = await manager.repairIntegrityViolations(violations);

      expect(result.totalViolations).toBe(1);
      expect(result.successfulRepairs).toBe(0);
      expect(result.failedRepairs).toBe(1);
    });
  });

  describe("getConsistencyMetrics", () => {
    it("should return consistency metrics", async () => {
      const mockMetrics: ConsistencyMetrics = {
        totalChecks: 100,
        passedChecks: 95,
        failedChecks: 5,
        passRate: 0.95,
        totalViolations: 3,
        resolvedViolations: 2,
        pendingViolations: 1,
        alertsTriggered: 1,
        alertsResolved: 1,
      };
      mockConvexClient.query.mockResolvedValueOnce(mockMetrics);

      const metrics = await manager.getConsistencyMetrics();

      expect(metrics.syncOperations).toBeDefined();
      expect(metrics.consistencyChecks).toBeDefined();
      expect(metrics.integrityViolations).toBeDefined();
      expect(metrics.alerts).toBeDefined();
      expect(metrics.timeRange).toBeDefined();
    });

    it("should handle metrics query errors", async () => {
      mockConvexClient.query.mockRejectedValueOnce(new Error("Query failed"));

      await expect(manager.getConsistencyMetrics()).rejects.toThrow("Query failed");
    });
  });

  describe("integrity rules management", () => {
    it("should add custom integrity rule", () => {
      const rule: IntegrityRule = {
        name: "custom_rule",
        description: "Custom validation rule",
        severity: "medium" as const,
        validator: (data: Record<string, unknown>) => !!data.customField,
      };

      manager.addIntegrityRule("custom_type", rule);

      // Verify rule was added by checking internal state
      const rules = (
        manager as unknown as { integrityRules: Map<string, IntegrityRule[]> }
      ).integrityRules.get("custom_type");
      expect(rules).toContain(rule);
    });

    it("should remove integrity rule", () => {
      const rule: IntegrityRule = {
        name: "removable_rule",
        description: "Rule to be removed",
        severity: "low" as const,
        validator: () => true,
      };

      manager.addIntegrityRule("test_type", rule);
      const removed = manager.removeIntegrityRule("test_type", "removable_rule");

      expect(removed).toBe(true);

      const rules = (
        manager as unknown as { integrityRules: Map<string, IntegrityRule[]> }
      ).integrityRules.get("test_type");
      expect(rules?.find((r: IntegrityRule) => r.name === "removable_rule")).toBeUndefined();
    });

    it("should return false when removing non-existent rule", () => {
      const removed = manager.removeIntegrityRule("test_type", "non_existent");
      expect(removed).toBe(false);
    });
  });

  describe("monitoring configuration", () => {
    it("should enable/disable monitoring", () => {
      manager.setMonitoringEnabled(false);
      expect((manager as unknown as { monitoringEnabled: boolean }).monitoringEnabled).toBe(false);

      manager.setMonitoringEnabled(true);
      expect((manager as unknown as { monitoringEnabled: boolean }).monitoringEnabled).toBe(true);
    });

    it("should update alert thresholds", () => {
      const newThresholds = {
        maxFailureRate: 0.2,
        maxConsistencyErrors: 10,
      };

      manager.updateAlertThresholds(newThresholds);

      const thresholds = (manager as unknown as { alertThresholds: typeof newThresholds })
        .alertThresholds;
      expect(thresholds.maxFailureRate).toBe(0.2);
      expect(thresholds.maxConsistencyErrors).toBe(10);
    });
  });

  describe("default integrity rules", () => {
    it("should have default user integrity rules", async () => {
      const validUser = { userId: "user_123", email: "test@example.com" };
      const invalidUser = { id: "user_123" }; // Missing email

      mockConvexClient.query.mockResolvedValueOnce(validUser);
      mockConvexClient.mutation.mockResolvedValueOnce({ id: "validation_123" });

      const validResult = await manager.validateDataIntegrity("users", "user_123");
      expect(validResult.isValid).toBe(true);

      mockConvexClient.query.mockResolvedValueOnce(invalidUser);
      mockConvexClient.mutation.mockResolvedValueOnce({ id: "validation_124" });

      const invalidResult = await manager.validateDataIntegrity("users", "user_123");
      expect(invalidResult.isValid).toBe(false);
    });

    it("should have default order integrity rules", async () => {
      const validOrder = { userId: "user_123", items: [{ id: "item_1" }] };
      const invalidOrder = { userId: "user_123" }; // Missing items

      mockConvexClient.query.mockResolvedValueOnce(validOrder);
      mockConvexClient.mutation.mockResolvedValueOnce({ id: "validation_123" });

      const validResult = await manager.validateDataIntegrity("orders", "order_123");
      expect(validResult.isValid).toBe(true);

      mockConvexClient.query.mockResolvedValueOnce(invalidOrder);
      mockConvexClient.mutation.mockResolvedValueOnce({ id: "validation_124" });

      const invalidResult = await manager.validateDataIntegrity("orders", "order_123");
      expect(invalidResult.isValid).toBe(false);
    });

    it("should have default product integrity rules", async () => {
      const validProduct = { id: "product_123", name: "Test Product" };
      const invalidProduct = { id: "product_123" }; // Missing name

      mockConvexClient.query.mockResolvedValueOnce(validProduct);
      mockConvexClient.mutation.mockResolvedValueOnce({ id: "validation_123" });

      const validResult = await manager.validateDataIntegrity("products", "product_123");
      expect(validResult.isValid).toBe(true);

      mockConvexClient.query.mockResolvedValueOnce(invalidProduct);
      mockConvexClient.mutation.mockResolvedValueOnce({ id: "validation_124" });

      const invalidResult = await manager.validateDataIntegrity("products", "product_123");
      expect(invalidResult.isValid).toBe(false);
    });
  });

  describe("consistency monitoring", () => {
    it("should start consistency monitoring timer", () => {
      expect(mockSetInterval).toHaveBeenCalledWith(expect.any(Function), 5 * 60 * 1000);
    });

    it("should trigger alerts when thresholds are exceeded", async () => {
      // Mock metrics that exceed thresholds
      mockConvexClient.query.mockResolvedValueOnce({
        totalChecks: 100,
        passedChecks: 80,
        failedChecks: 20, // Exceeds threshold
        passRate: 0.8,
        totalViolations: 10,
        resolvedViolations: 5,
        pendingViolations: 5, // Exceeds threshold
        alertsTriggered: 0,
        alertsResolved: 0,
      });

      mockConvexClient.mutation.mockResolvedValue({ id: "alert_123" });

      // Simulate monitoring check - extract callback and execute
      const monitoringCallback = mockSetInterval.mock.calls[0][0] as () => void | Promise<void>;
      const callbackResult = monitoringCallback();
      if (callbackResult instanceof Promise) {
        await callbackResult;
      }

      // Should have created alerts
      expect(mockConvexClient.mutation).toHaveBeenCalledWith("alerts:create", expect.any(Object));
    });

    it("should not trigger alerts when monitoring is disabled", async () => {
      manager.setMonitoringEnabled(false);

      mockConvexClient.query.mockResolvedValueOnce({
        totalChecks: 100,
        passedChecks: 50,
        failedChecks: 50, // Would exceed threshold
        passRate: 0.5,
      });

      // Simulate monitoring check - extract callback and execute
      const monitoringCallback = mockSetInterval.mock.calls[0][0] as () => void | Promise<void>;
      const callbackResult = monitoringCallback();
      if (callbackResult instanceof Promise) {
        await callbackResult;
      }

      // Should not have created alerts
      expect(mockConvexClient.mutation).not.toHaveBeenCalledWith(
        "alerts:create",
        expect.any(Object)
      );
    });
  });

  describe("private helper methods", () => {
    it("should calculate average duration correctly", () => {
      const operations: TimedOperation[] = [
        { id: "1", startTime: 1000, endTime: 2000 },
        { id: "2", startTime: 2000, endTime: 3500 },
        { id: "3", startTime: 3000, endTime: 4000 },
      ];

      const avgDuration = (
        manager as unknown as { calculateAverageDuration: (ops: TimedOperation[]) => number }
      ).calculateAverageDuration(operations);
      expect(avgDuration).toBe((1000 + 1500 + 1000) / 3);
    });

    it("should return 0 for average duration when no completed operations", () => {
      const operations: TimedOperation[] = [
        { id: "1", startTime: 1000 }, // No endTime
        { id: "2", startTime: 2000 }, // No endTime
      ];

      const avgDuration = (
        manager as unknown as { calculateAverageDuration: (ops: TimedOperation[]) => number }
      ).calculateAverageDuration(operations);
      expect(avgDuration).toBe(0);
    });
  });
});
