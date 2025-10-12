import { RollbackManager } from "../server/lib/rollbackManager";

// Mock ConvexHttpClient
const mockConvexClient = {
  query: jest.fn(),
  mutation: jest.fn(),
};

// Mock logger
jest.mock("../server/lib/logger", () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

// Mock timers
jest.useFakeTimers();

// Mock setInterval
const mockSetInterval = jest.fn();
global.setInterval = mockSetInterval;

describe("RollbackManager", () => {
  let manager: RollbackManager;

  beforeEach(() => {
    jest.clearAllMocks();
    mockSetInterval.mockClear();
    manager = new RollbackManager(mockConvexClient as any);
  });

  afterEach(() => {
    jest.clearAllTimers();
  });

  describe("createRollbackPoint", () => {
    it("should create rollback point successfully", async () => {
      const currentState = { id: "1", name: "Current State", version: 1 };
      const metadata = { userId: "user123", action: "update" };

      mockConvexClient.mutation
        .mockResolvedValueOnce("backup123") // backup:store
        .mockResolvedValueOnce("rollback123"); // rollback:store

      const rollbackId = await manager.createRollbackPoint(
        "update_user",
        "1",
        currentState,
        metadata
      );

      expect(rollbackId).toMatch(/^rollback_update_user_1_\d+_[a-z0-9]+$/);
      expect(mockConvexClient.mutation).toHaveBeenCalledTimes(2);
      expect(mockConvexClient.mutation).toHaveBeenCalledWith("backup:store", expect.any(Object));
      expect(mockConvexClient.mutation).toHaveBeenCalledWith("rollback:store", expect.any(Object));
    });

    it("should handle errors during rollback point creation", async () => {
      mockConvexClient.mutation.mockRejectedValue(new Error("Storage error"));

      await expect(manager.createRollbackPoint("update_user", "1", {})).rejects.toThrow(
        "Storage error"
      );
    });

    it("should include metadata in rollback operation", async () => {
      const metadata = { source: "api", requestId: "req123" };
      mockConvexClient.mutation.mockResolvedValue("success");

      const rollbackId = await manager.createRollbackPoint("update_order", "order1", {}, metadata);

      expect(rollbackId).toBeDefined();

      // Check that metadata was included in the rollback:store call
      const rollbackStoreCall = mockConvexClient.mutation.mock.calls.find(
        call => call[0] === "rollback:store"
      );
      expect(rollbackStoreCall[1].operation.metadata).toMatchObject(metadata);
    });
  });

  describe("updateRollbackPoint", () => {
    it("should update rollback point with new state", async () => {
      // First create a rollback point
      mockConvexClient.mutation.mockResolvedValue("success");
      const rollbackId = await manager.createRollbackPoint("update_user", "1", {});

      const newState = { id: "1", name: "Updated State", version: 2 };

      await manager.updateRollbackPoint(rollbackId, newState);

      expect(mockConvexClient.mutation).toHaveBeenCalledWith("rollback:update", {
        rollbackId,
        currentState: newState,
      });
    });

    it("should throw error for non-existent rollback point", async () => {
      await expect(manager.updateRollbackPoint("non_existent", {})).rejects.toThrow(
        "Rollback operation not found: non_existent"
      );
    });
  });

  describe("executeRollback", () => {
    it("should execute rollback successfully", async () => {
      // Create rollback point
      mockConvexClient.mutation.mockResolvedValue("success");
      const rollbackId = await manager.createRollbackPoint("update_user", "1", {
        name: "Original",
      });

      // Mock backup retrieval
      mockConvexClient.query.mockResolvedValue({
        resourceId: "1",
        state: { name: "Original" },
        timestamp: Date.now(),
      });

      const reason = "Operation failed";
      await manager.executeRollback(rollbackId, reason);

      expect(mockConvexClient.mutation).toHaveBeenCalledWith("rollback:markRolledBack", {
        rollbackId,
        reason,
      });
    });

    it("should throw error for non-existent rollback operation", async () => {
      await expect(manager.executeRollback("non_existent")).rejects.toThrow(
        "Rollback operation not found: non_existent"
      );
    });

    it("should throw error when rollback is not allowed", async () => {
      // Create rollback point
      mockConvexClient.mutation.mockResolvedValue("success");
      const rollbackId = await manager.createRollbackPoint("update_user", "1", {});

      // Manually mark as not rollbackable
      const rollbackOperations = (manager as any).rollbackOperations;
      const operation = rollbackOperations.get(rollbackId);
      operation.canRollback = false;
      rollbackOperations.set(rollbackId, operation);

      await expect(manager.executeRollback(rollbackId)).rejects.toThrow(
        `Rollback not allowed for operation: ${rollbackId}`
      );
    });

    it("should throw error for expired rollback operation", async () => {
      // Create rollback point
      mockConvexClient.mutation.mockResolvedValue("success");
      const rollbackId = await manager.createRollbackPoint("update_user", "1", {});

      // Manually set as expired
      const rollbackOperations = (manager as any).rollbackOperations;
      const operation = rollbackOperations.get(rollbackId);
      operation.metadata.expiresAt = Date.now() - 1000; // Expired 1 second ago
      rollbackOperations.set(rollbackId, operation);

      await expect(manager.executeRollback(rollbackId)).rejects.toThrow(
        `Rollback operation expired: ${rollbackId}`
      );
    });
  });

  describe("createBackup", () => {
    it("should create backup successfully", async () => {
      const state = { id: "1", data: "test data" };
      mockConvexClient.mutation.mockResolvedValue("success");

      const backupId = await manager.createBackup("resource1", state);

      expect(backupId).toMatch(/^backup_resource1_\d+_[a-z0-9]+$/);
      expect(mockConvexClient.mutation).toHaveBeenCalledWith("backup:store", {
        backupId,
        resourceId: "resource1",
        state,
        timestamp: expect.any(Number),
      });
    });

    it("should handle errors during backup creation", async () => {
      mockConvexClient.mutation.mockRejectedValue(new Error("Backup storage error"));

      await expect(manager.createBackup("resource1", {})).rejects.toThrow("Backup storage error");
    });
  });

  describe("validateRollback", () => {
    it("should validate rollback operation successfully", async () => {
      // Create rollback point
      mockConvexClient.mutation.mockResolvedValue("success");
      const rollbackId = await manager.createRollbackPoint("update_user", "1", {});

      // Mock backup exists check
      mockConvexClient.query.mockResolvedValue(true);

      const validation = await manager.validateRollback(rollbackId);

      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it("should return validation errors for invalid rollback", async () => {
      const validation = await manager.validateRollback("non_existent");

      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain("Rollback operation not found: non_existent");
    });

    it("should detect expired rollback operations", async () => {
      // Create rollback point
      mockConvexClient.mutation.mockResolvedValue("success");
      const rollbackId = await manager.createRollbackPoint("update_user", "1", {});

      // Manually set as expired
      const rollbackOperations = (manager as any).rollbackOperations;
      const operation = rollbackOperations.get(rollbackId);
      operation.metadata.expiresAt = Date.now() - 1000;
      rollbackOperations.set(rollbackId, operation);

      const validation = await manager.validateRollback(rollbackId);

      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain("Rollback operation has expired");
    });

    it("should detect missing backup data", async () => {
      // Create rollback point
      mockConvexClient.mutation.mockResolvedValue("success");
      const rollbackId = await manager.createRollbackPoint("update_user", "1", {});

      // Clear the local backup storage to simulate missing backup
      const backupStorage = (manager as any).backupStorage;
      backupStorage.clear();

      // Mock backup doesn't exist in Convex either
      mockConvexClient.query.mockResolvedValue(false);

      const validation = await manager.validateRollback(rollbackId);

      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain("Backup data not found");
    });
  });

  describe("getRollbackHistory", () => {
    it("should return all rollback operations when no filter provided", async () => {
      // Create multiple rollback points
      mockConvexClient.mutation.mockResolvedValue("success");

      const rollbackId1 = await manager.createRollbackPoint("update_user", "1", {});
      const rollbackId2 = await manager.createRollbackPoint("update_order", "2", {});

      const history = await manager.getRollbackHistory();

      expect(history).toHaveLength(2);
      expect(history[0].timestamp).toBeGreaterThanOrEqual(history[1].timestamp); // Sorted by timestamp desc
    });

    it("should filter rollback operations by resourceId", async () => {
      mockConvexClient.mutation.mockResolvedValue("success");

      await manager.createRollbackPoint("update_user", "1", {});
      await manager.createRollbackPoint("update_user", "2", {});
      await manager.createRollbackPoint("update_order", "1", {});

      const history = await manager.getRollbackHistory({ resourceId: "1" });

      expect(history).toHaveLength(2);
      expect(history.every(op => op.resourceId === "1")).toBe(true);
    });

    it("should filter rollback operations by operationType", async () => {
      mockConvexClient.mutation.mockResolvedValue("success");

      await manager.createRollbackPoint("update_user", "1", {});
      await manager.createRollbackPoint("update_user", "2", {});
      await manager.createRollbackPoint("update_order", "3", {});

      const history = await manager.getRollbackHistory({ operationType: "update_user" });

      expect(history).toHaveLength(2);
      expect(history.every(op => op.operationType === "update_user")).toBe(true);
    });

    it("should limit results when limit is specified", async () => {
      mockConvexClient.mutation.mockResolvedValue("success");

      await manager.createRollbackPoint("update_user", "1", {});
      await manager.createRollbackPoint("update_user", "2", {});
      await manager.createRollbackPoint("update_user", "3", {});

      const history = await manager.getRollbackHistory({ limit: 2 });

      expect(history).toHaveLength(2);
    });
  });

  describe("cleanup", () => {
    it("should clean up expired rollback operations and backups", async () => {
      // Create rollback points
      mockConvexClient.mutation.mockResolvedValue("success");

      const rollbackId1 = await manager.createRollbackPoint("update_user", "1", {});
      const rollbackId2 = await manager.createRollbackPoint("update_user", "2", {});

      // Manually expire one operation
      const rollbackOperations = (manager as any).rollbackOperations;
      const operation1 = rollbackOperations.get(rollbackId1);
      operation1.metadata.expiresAt = Date.now() - 1000; // Expired
      rollbackOperations.set(rollbackId1, operation1);

      const result = await manager.cleanup();

      expect(result.removedRollbacks).toBe(1);
      expect(result.removedBackups).toBe(1);
      expect(mockConvexClient.mutation).toHaveBeenCalledWith(
        "rollback:cleanup",
        expect.any(Object)
      );
    });

    it("should handle cleanup errors gracefully", async () => {
      mockConvexClient.mutation.mockRejectedValue(new Error("Cleanup error"));

      await expect(manager.cleanup()).rejects.toThrow("Cleanup error");
    });
  });

  describe("getStatistics", () => {
    it("should return rollback statistics", async () => {
      // Create rollback points
      mockConvexClient.mutation.mockResolvedValue("success");

      await manager.createRollbackPoint("update_user", "1", {});
      await manager.createRollbackPoint("update_user", "2", {});
      await manager.createRollbackPoint("update_order", "3", {});

      const stats = await manager.getStatistics();

      expect(stats.totalRollbacks).toBe(3);
      expect(stats.activeRollbacks).toBe(3);
      expect(stats.expiredRollbacks).toBe(0);
      expect(stats.rollbacksByType).toEqual({
        update_user: 2,
        update_order: 1,
      });
    });

    it("should count expired rollbacks correctly", async () => {
      mockConvexClient.mutation.mockResolvedValue("success");

      const rollbackId = await manager.createRollbackPoint("update_user", "1", {});

      // Manually expire the operation
      const rollbackOperations = (manager as any).rollbackOperations;
      const operation = rollbackOperations.get(rollbackId);
      operation.metadata.expiresAt = Date.now() - 1000;
      rollbackOperations.set(rollbackId, operation);

      const stats = await manager.getStatistics();

      expect(stats.totalRollbacks).toBe(1);
      expect(stats.activeRollbacks).toBe(0);
      expect(stats.expiredRollbacks).toBe(1);
    });
  });

  describe("private helper methods", () => {
    it("should detect expired operations correctly", async () => {
      mockConvexClient.mutation.mockResolvedValue("success");
      const rollbackId = await manager.createRollbackPoint("update_user", "1", {});

      const rollbackOperations = (manager as any).rollbackOperations;
      const operation = rollbackOperations.get(rollbackId);

      // Not expired
      expect((manager as any).isExpired(operation)).toBe(false);

      // Expired
      operation.metadata.expiresAt = Date.now() - 1000;
      expect((manager as any).isExpired(operation)).toBe(true);
    });

    it("should validate dependencies correctly", async () => {
      mockConvexClient.mutation.mockResolvedValue("success");

      const rollbackId1 = await manager.createRollbackPoint("update_user", "1", {});
      const rollbackId2 = await manager.createRollbackPoint("update_order", "2", {});

      const rollbackOperations = (manager as any).rollbackOperations;
      const operation2 = rollbackOperations.get(rollbackId2);
      operation2.dependencies = [rollbackId1];
      rollbackOperations.set(rollbackId2, operation2);

      // Should throw error because dependency is still rollbackable
      await expect((manager as any).validateDependencies(operation2)).rejects.toThrow(
        `Cannot rollback: dependency ${rollbackId1} must be rolled back first`
      );

      // Mark dependency as not rollbackable
      const operation1 = rollbackOperations.get(rollbackId1);
      operation1.canRollback = false;
      rollbackOperations.set(rollbackId1, operation1);

      // Should not throw error now
      await expect((manager as any).validateDependencies(operation2)).resolves.not.toThrow();
    });
  });

  describe("cleanup timer", () => {
    it("should start cleanup timer on initialization", () => {
      expect(mockSetInterval).toHaveBeenCalledWith(expect.any(Function), 60 * 60 * 1000);
    });

    it("should run cleanup periodically", async () => {
      const cleanupSpy = jest.spyOn(manager, "cleanup").mockResolvedValue({
        removedRollbacks: 0,
        removedBackups: 0,
      });

      // Get the callback function from setInterval call
      const timerCallback = mockSetInterval.mock.calls[0][0];

      // Execute the callback to simulate timer firing
      await timerCallback();

      expect(cleanupSpy).toHaveBeenCalled();
    });
  });
});
