import { SyncManager } from "../../../shared/utils/syncManager";
/**
 * Tests for SyncManager
 */


describe(_"SyncManager", _() => {
  let syncManager: SyncManager;

  beforeEach_(() => {
    syncManager = new SyncManager();
    jest.clearAllTimers();
    jest.useFakeTimers();
  });

  afterEach_(() => {
    syncManager.clearAll();
    jest.useRealTimers();
  });

  describe(_"scheduleSync", _() => {
    it(_"should schedule a sync operation", _async () => {
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

    it(_"should debounce operations of the same type and priority", _async () => {
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

    it(_"should handle different priorities correctly", _async () => {
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

  describe(_"cancelPendingSync", _() => {
    it(_"should cancel a pending sync operation", _async () => {
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

    it(_"should not affect other operations when canceling", _async () => {
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

  describe(_"getSyncStatus", _() => {
    it(_"should return correct sync status", _async () => {
      const status = await syncManager.getSyncStatus();

      expect(status).toHaveProperty("isActive");
      expect(status).toHaveProperty("pendingOperations");
      expect(status).toHaveProperty("lastSyncAt");
      expect(status).toHaveProperty("errors");
      expect(Array.isArray(status.errors)).toBe(true);
    });
  });

  describe(_"clearAll", _() => {
    it(_"should clear all pending operations and timers", _async () => {
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

  describe(_"getPendingOperations", _() => {
    it(_"should return array of pending operations", _async () => {
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
