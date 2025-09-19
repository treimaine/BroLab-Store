/**
 * Tests for SyncManager
 */

import { SyncManager } from "../../../shared/utils/syncManager";

describe("SyncManager", () => {
  let syncManager: SyncManager;

  beforeEach(() => {
    syncManager = new SyncManager();
    jest.clearAllTimers();
    jest.useFakeTimers();
  });

  afterEach(() => {
    syncManager.clearAll();
    jest.useRealTimers();
  });

  describe("scheduleSync", () => {
    it("should schedule a sync operation", async () => {
      const operation = {
        type: "user" as const,
        payload: { userId: "123" },
        priority: "medium" as const,
        maxRetries: 3,
      };

      await syncManager.scheduleSync(operation);

      const status = await syncManager.getSyncStatus();
      expect(status.pendingOperations).toBe(1);
    });

    it("should debounce operations of the same type and priority", async () => {
      const operation1 = {
        type: "user" as const,
        payload: { userId: "123" },
        priority: "medium" as const,
        maxRetries: 3,
      };

      const operation2 = {
        type: "user" as const,
        payload: { userId: "456" },
        priority: "medium" as const,
        maxRetries: 3,
      };

      await syncManager.scheduleSync(operation1);
      await syncManager.scheduleSync(operation2);

      const status = await syncManager.getSyncStatus();
      expect(status.pendingOperations).toBe(2);
    });

    it("should handle different priorities correctly", async () => {
      const highPriorityOp = {
        type: "user" as const,
        payload: { userId: "123" },
        priority: "high" as const,
        maxRetries: 3,
      };

      const lowPriorityOp = {
        type: "user" as const,
        payload: { userId: "456" },
        priority: "low" as const,
        maxRetries: 3,
      };

      await syncManager.scheduleSync(highPriorityOp);
      await syncManager.scheduleSync(lowPriorityOp);

      const status = await syncManager.getSyncStatus();
      expect(status.pendingOperations).toBe(2);
    });
  });

  describe("cancelPendingSync", () => {
    it("should cancel a pending sync operation", async () => {
      const operation = {
        type: "user" as const,
        payload: { userId: "123" },
        priority: "medium" as const,
        maxRetries: 3,
      };

      const operationId = await syncManager.scheduleSync(operation);
      const status1 = await syncManager.getSyncStatus();
      expect(status1.pendingOperations).toBe(1);

      await syncManager.cancelPendingSync(operationId);
      const status2 = await syncManager.getSyncStatus();
      expect(status2.pendingOperations).toBe(0);
    });

    it("should not affect other operations when canceling", async () => {
      const operation1 = {
        type: "user" as const,
        payload: { userId: "123" },
        priority: "medium" as const,
        maxRetries: 3,
      };

      const operation2 = {
        type: "data" as const,
        payload: { data: "test" },
        priority: "high" as const,
        maxRetries: 3,
      };

      const id1 = await syncManager.scheduleSync(operation1);
      await syncManager.scheduleSync(operation2);
      const status1 = await syncManager.getSyncStatus();
      expect(status1.pendingOperations).toBe(2);

      await syncManager.cancelPendingSync(id1);
      const status2 = await syncManager.getSyncStatus();
      expect(status2.pendingOperations).toBe(1);
    });
  });

  describe("getSyncStatus", () => {
    it("should return correct sync status", async () => {
      const status = await syncManager.getSyncStatus();

      expect(status).toHaveProperty("isActive");
      expect(status).toHaveProperty("pendingOperations");
      expect(status).toHaveProperty("lastSyncAt");
      expect(status).toHaveProperty("errors");
      expect(Array.isArray(status.errors)).toBe(true);
    });
  });

  describe("clearAll", () => {
    it("should clear all pending operations and timers", async () => {
      const operation = {
        type: "user" as const,
        payload: { userId: "123" },
        priority: "medium" as const,
        maxRetries: 3,
      };

      await syncManager.scheduleSync(operation);
      const status1 = await syncManager.getSyncStatus();
      expect(status1.pendingOperations).toBe(1);

      syncManager.clearAll();
      const status2 = await syncManager.getSyncStatus();
      expect(status2.pendingOperations).toBe(0);
      expect(status2.errors).toHaveLength(0);
    });
  });

  describe("getPendingOperations", () => {
    it("should return array of pending operations", async () => {
      const operation = {
        type: "user" as const,
        payload: { userId: "123" },
        priority: "medium" as const,
        maxRetries: 3,
      };

      await syncManager.scheduleSync(operation);

      const pending = syncManager.getPendingOperations();
      expect(Array.isArray(pending)).toBe(true);
      expect(pending).toHaveLength(1);
      expect(pending[0].type).toBe("user");
      expect(pending[0].payload.userId).toBe("123");
    });
  });
});
