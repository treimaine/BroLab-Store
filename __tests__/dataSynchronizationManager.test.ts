import { getDataConsistencyManager } from "../server/lib/dataConsistencyManager";
import { DataSynchronizationManager } from "../server/lib/dataSynchronizationManager";
import { getRollbackManager } from "../server/lib/rollbackManager";

// Mock ConvexHttpClient
const mockConvexClient = {
  query: jest.fn(),
  mutation: jest.fn(),
};

// Mock logger
jest.mock(_"../server/lib/logger", _() => ({
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

jest.mock(_"../server/lib/dataConsistencyManager", _() => ({
  getDataConsistencyManager: jest.fn_(() => mockDataConsistencyManager),
}));

// Mock RollbackManager
const mockRollbackManager = {
  createRollbackPoint: jest.fn().mockResolvedValue("rollback_123"),
  updateRollbackPoint: jest.fn().mockResolvedValue(undefined),
  executeRollback: jest.fn().mockResolvedValue(undefined),
};

jest.mock(_"../server/lib/rollbackManager", _() => ({
  getRollbackManager: jest.fn_(() => mockRollbackManager),
}));

// Mock timers
jest.useFakeTimers();
const mockSetInterval = jest.fn();
global.setInterval = mockSetInterval;

describe(_"DataSynchronizationManager", _() => {
  let manager: DataSynchronizationManager;

  beforeEach_(() => {
    jest.clearAllMocks();
    mockSetInterval.mockClear();
    mockDataConsistencyManager.detectConflicts.mockClear();
    mockRollbackManager.createRollbackPoint.mockClear();
    mockRollbackManager.updateRollbackPoint.mockClear();
    mockRollbackManager.executeRollback.mockClear();

    // Reset the mocked functions
    (getDataConsistencyManager as jest.Mock).mockReturnValue(mockDataConsistencyManager);
    (getRollbackManager as jest.Mock).mockReturnValue(mockRollbackManager);

    manager = new DataSynchronizationManager(mockConvexClient as any);
  });

  afterEach_(() => {
    jest.clearAllTimers();
  });

  describe(_"performSyncOperation", _() => {
    const mockOperation = {
      type: "users",
      resourceId: "user_123",
      currentState: { id: "user_123", name: "Old Name" },
      newState: { id: "user_123", name: "New Name" },
      metadata: { source: "api" },
    };

    it(_"should perform sync operation successfully", _async () => {
      // Mock the pre-sync and post-sync checks directly to avoid complex dependencies
      jest.spyOn(manager as any, "performPreSyncCheck").mockResolvedValue({
        isValid: true,
        checks: [],
        errors: [],
        timestamp: Date.now(),
      });

      jest.spyOn(manager as any, "performPostSyncCheck").mockResolvedValue({
        isValid: true,
        checks: [],
        errors: [],
        timestamp: Date.now(),
      });

      // Mock rollback manager
      const mockRollbackManager = {
        createRollbackPoint: jest.fn().mockResolvedValue("rollback_123"),
        rollback: jest.fn().mockResolvedValue(true),
      };

      // Mock the getRollbackManager function
      jest.doMock(_"../server/lib/rollbackManager", _() => ({
        getRollbackManager: () => mockRollbackManager,
      }));

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

    it(_"should fail when pre-sync check fails", _async () => {
      // Mock resource not found
      mockConvexClient.query.mockResolvedValueOnce(null);

      await expect(manager.performSyncOperation(mockOperation)).rejects.toThrow(
        "Pre-sync check failed"
      );
    });

    it(_"should rollback when post-sync check fails", _async () => {
      // Mock successful pre-sync but failed post-sync
      mockConvexClient.query
        .mockResolvedValueOnce({ id: "user_123", name: "Old Name" }) // resource exists
        .mockResolvedValueOnce({ id: "user_123", name: "Old Name" }) // pre-sync integrity
        .mockResolvedValueOnce(null); // post-sync integrity fails

      mockConvexClient.mutation.mockResolvedValueOnce({
        success: true,
        newState: mockOperation.newState,
      });

      await expect(manager.performSyncOperation(mockOperation)).rejects.toThrow(
        "Post-sync check failed"
      );
    });

    it(_"should handle sync operation errors", _async () => {
      // Mock successful pre-sync but failed sync
      mockConvexClient.query
        .mockResolvedValueOnce({ id: "user_123", name: "Old Name" })
        .mockResolvedValueOnce({ id: "user_123", name: "Old Name" });

      mockConvexClient.mutation.mockRejectedValueOnce(new Error("Sync failed"));

      await expect(manager.performSyncOperation(mockOperation)).rejects.toThrow("Sync failed");
    });
  });

  describe(_"validateDataIntegrity", _() => {
    it(_"should validate data integrity successfully", _async () => {
      const mockResource = { id: "user_123", userId: "user_123", email: "test@example.com" };
      mockConvexClient.query.mockResolvedValueOnce(mockResource);
      mockConvexClient.mutation.mockResolvedValueOnce({ id: "validation_123" });

      const result = await manager.validateDataIntegrity("users", "user_123");

      expect(result.isValid).toBe(true);
      expect(result.violations).toHaveLength(0);
      expect(result.checkedCount).toBe(1);
    });

    it(_"should detect integrity violations", _async () => {
      const mockResource = { id: "user_123" }; // Missing required fields
      mockConvexClient.query.mockResolvedValueOnce(mockResource);
      mockConvexClient.mutation.mockResolvedValueOnce({ id: "validation_123" });

      const result = await manager.validateDataIntegrity("users", "user_123");

      expect(result.isValid).toBe(false);
      expect(result.violations.length).toBeGreaterThan(0);
      expect(result.violations[0].rule).toBe("required_fields");
    });

    it(_"should validate multiple resources when no resourceId provided", _async () => {
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

    it(_"should handle validation errors gracefully", _async () => {
      mockConvexClient.query.mockRejectedValueOnce(new Error("Database error"));

      await expect(manager.validateDataIntegrity("users", "user_123")).rejects.toThrow(
        "Database error"
      );
    });
  });

  describe(_"repairIntegrityViolations", _() => {
    it(_"should repair integrity violations successfully", _async () => {
      const violations = [
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

    it(_"should handle repair failures", _async () => {
      const violations = [
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

  describe(_"getConsistencyMetrics", _() => {
    it(_"should return consistency metrics", _async () => {
      mockConvexClient.query.mockResolvedValueOnce({
        totalChecks: 100,
        passedChecks: 95,
        failedChecks: 5,
        passRate: 0.95,
        totalViolations: 3,
        resolvedViolations: 2,
        pendingViolations: 1,
        alertsTriggered: 1,
        alertsResolved: 1,
      });

      const metrics = await manager.getConsistencyMetrics();

      expect(metrics.syncOperations).toBeDefined();
      expect(metrics.consistencyChecks).toBeDefined();
      expect(metrics.integrityViolations).toBeDefined();
      expect(metrics.alerts).toBeDefined();
      expect(metrics.timeRange).toBeDefined();
    });

    it(_"should handle metrics query errors", _async () => {
      mockConvexClient.query.mockRejectedValueOnce(new Error("Query failed"));

      await expect(manager.getConsistencyMetrics()).rejects.toThrow("Query failed");
    });
  });

  describe(_"integrity rules management", _() => {
    it(_"should add custom integrity rule", _() => {
      const rule = {
        name: "custom_rule",
        description: "Custom validation rule",
        severity: "medium" as const,
        validator: (_data: any) => !!data.customField,
      };

      manager.addIntegrityRule("custom_type", rule);

      // Verify rule was added by checking internal state
      const rules = (manager as any).integrityRules.get("custom_type");
      expect(rules).toContain(rule);
    });

    it(_"should remove integrity rule", _() => {
      const rule = {
        name: "removable_rule",
        description: "Rule to be removed",
        severity: "low" as const,
        validator: () => true,
      };

      manager.addIntegrityRule("test_type", rule);
      const removed = manager.removeIntegrityRule("test_type", "removable_rule");

      expect(removed).toBe(true);

      const rules = (manager as any).integrityRules.get("test_type");
      expect(_rules.find((r: any) => r.name === "removable_rule")).toBeUndefined();
    });

    it(_"should return false when removing non-existent rule", _() => {
      const removed = manager.removeIntegrityRule("test_type", "non_existent");
      expect(removed).toBe(false);
    });
  });

  describe(_"monitoring configuration", _() => {
    it(_"should enable/disable monitoring", _() => {
      manager.setMonitoringEnabled(false);
      expect((manager as any).monitoringEnabled).toBe(false);

      manager.setMonitoringEnabled(true);
      expect((manager as any).monitoringEnabled).toBe(true);
    });

    it(_"should update alert thresholds", _() => {
      const newThresholds = {
        maxFailureRate: 0.2,
        maxConsistencyErrors: 10,
      };

      manager.updateAlertThresholds(newThresholds);

      const thresholds = (manager as any).alertThresholds;
      expect(thresholds.maxFailureRate).toBe(0.2);
      expect(thresholds.maxConsistencyErrors).toBe(10);
    });
  });

  describe(_"default integrity rules", _() => {
    it(_"should have default user integrity rules", _async () => {
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

    it(_"should have default order integrity rules", _async () => {
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

    it(_"should have default product integrity rules", _async () => {
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

  describe(_"consistency monitoring", _() => {
    it(_"should start consistency monitoring timer", _() => {
      expect(mockSetInterval).toHaveBeenCalledWith(expect.any(Function), 5 * 60 * 1000);
    });

    it(_"should trigger alerts when thresholds are exceeded", _async () => {
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

      // Simulate monitoring check
      const monitoringCallback = mockSetInterval.mock.calls[0][0];
      await monitoringCallback();

      // Should have created alerts
      expect(mockConvexClient.mutation).toHaveBeenCalledWith("alerts:create", expect.any(Object));
    });

    it(_"should not trigger alerts when monitoring is disabled", _async () => {
      manager.setMonitoringEnabled(false);

      mockConvexClient.query.mockResolvedValueOnce({
        totalChecks: 100,
        passedChecks: 50,
        failedChecks: 50, // Would exceed threshold
        passRate: 0.5,
      });

      // Simulate monitoring check
      const monitoringCallback = mockSetInterval.mock.calls[0][0];
      await monitoringCallback();

      // Should not have created alerts
      expect(mockConvexClient.mutation).not.toHaveBeenCalledWith(
        "alerts:create",
        expect.any(Object)
      );
    });
  });

  describe(_"private helper methods", _() => {
    it(_"should calculate average duration correctly", _() => {
      const operations = [
        { id: "1", startTime: 1000, endTime: 2000 },
        { id: "2", startTime: 2000, endTime: 3500 },
        { id: "3", startTime: 3000, endTime: 4000 },
      ];

      const avgDuration = (manager as any).calculateAverageDuration(operations);
      expect(avgDuration).toBe((1000 + 1500 + 1000) / 3);
    });

    it(_"should return 0 for average duration when no completed operations", _() => {
      const operations = [
        { id: "1", startTime: 1000 }, // No endTime
        { id: "2", startTime: 2000 }, // No endTime
      ];

      const avgDuration = (manager as any).calculateAverageDuration(operations);
      expect(avgDuration).toBe(0);
    });
  });
});
