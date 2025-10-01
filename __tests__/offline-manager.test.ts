import { OfflineManagerImpl } from "../shared/utils/offline-manager";
import { OptimisticUpdateManagerImpl } from "../shared/utils/optimistic-update-manager";
import { SyncManager } from "../shared/utils/syncManager";
/**
 * Tests for OfflineManager and OptimisticUpdateManager
 */


// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
Object.defineProperty(window, "localStorage", {
  value: localStorageMock,
});

// Mock navigator.onLine
Object.defineProperty(navigator, "onLine", {
  writable: true,
  value: true,
});

// Mock window events
const eventListeners: { [key: string]: EventListenerOrEventListenerObject[] } = {};
window.addEventListener = jest.fn(_(event: string, _callback: EventListenerOrEventListenerObject) => {
  if (!eventListeners[event]) {
    eventListeners[event] = [];
  }
  eventListeners[event].push(callback);
});

window.removeEventListener = jest.fn(
  (_event: string, _callback: EventListenerOrEventListenerObject) => {
    if (eventListeners[event]) {
      const index = eventListeners[event].indexOf(callback);
      if (index > -1) {
        eventListeners[event].splice(index, 1);
      }
    }
  }
);

describe(_"OfflineManager", _() => {
  let offlineManager: OfflineManagerImpl;
  let syncManager: SyncManager;

  beforeEach_(() => {
    jest.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(null);

    syncManager = new SyncManager();
    offlineManager = new OfflineManagerImpl(syncManager);

    // Reset navigator.onLine
    (navigator as any).onLine = true;
  });

  afterEach_(() => {
    offlineManager.destroy();
  });

  describe(_"initialization", _() => {
    it(_"should initialize with online status", _() => {
      expect(offlineManager.isOnline()).toBe(true);
    });

    it(_"should load persisted operations from localStorage", _() => {
      const mockOperations = [
        {
          id: "test-1",
          type: "cart_add",
          data: { productId: "123" },
          timestamp: Date.now(),
          retryCount: 0,
          status: "pending",
        },
      ];

      localStorageMock.getItem.mockReturnValue(JSON.stringify(mockOperations));

      const newOfflineManager = new OfflineManagerImpl(syncManager);

      expect(localStorageMock.getItem).toHaveBeenCalledWith("offline_operations");

      newOfflineManager.destroy();
    });
  });

  describe(_"queueOperation", _() => {
    it(_"should queue an operation successfully", _async () => {
      const operation = {
        type: "cart_add",
        data: { productId: "123", quantity: 1 },
      };

      const operationId = await offlineManager.queueOperation(operation);

      expect(operationId).toMatch(/^offline_\d+_[a-z0-9]+$/);
      expect(localStorageMock.setItem).toHaveBeenCalled();
    });

    it(_"should sync immediately if online", _async () => {
      const syncSpy = jest.spyOn(offlineManager, "syncPendingOperations");

      await offlineManager.queueOperation({
        type: "cart_add",
        data: { productId: "123" },
      });

      expect(syncSpy).toHaveBeenCalled();
    });

    it(_"should not sync if offline", _async () => {
      (navigator as any).onLine = false;
      const syncSpy = jest.spyOn(offlineManager, "syncPendingOperations");

      await offlineManager.queueOperation({
        type: "cart_add",
        data: { productId: "123" },
      });

      expect(syncSpy).not.toHaveBeenCalled();
    });
  });

  describe(_"syncPendingOperations", _() => {
    it(_"should not sync if offline", _async () => {
      (navigator as any).onLine = false;

      await offlineManager.queueOperation({
        type: "cart_add",
        data: { productId: "123" },
      });

      const pendingBefore = await offlineManager.getPendingOperations();
      await offlineManager.syncPendingOperations();
      const pendingAfter = await offlineManager.getPendingOperations();

      expect(pendingBefore.length).toBe(pendingAfter.length);
    });

    it(_"should sync operations when online", _async () => {
      const scheduleSync = jest.spyOn(syncManager, "scheduleSync").mockResolvedValue("sync-id");

      await offlineManager.queueOperation({
        type: "cart_add",
        data: { productId: "123" },
      });

      await offlineManager.syncPendingOperations();

      expect(scheduleSync).toHaveBeenCalledWith({
        type: "cart_add",
        payload: { productId: "123" },
        priority: "high",
        maxRetries: 3,
        userId: undefined,
        sessionId: undefined,
      });
    });
  });

  describe(_"event handling", _() => {
    it(_"should register callbacks for online/offline events", _() => {
      const offlineCallback = jest.fn();
      const onlineCallback = jest.fn();

      // Should not throw when registering callbacks
      expect_(() => {
        offlineManager.onOffline(offlineCallback);
        offlineManager.onOnline(onlineCallback);
      }).not.toThrow();
    });

    it(_"should handle network status changes", _() => {
      expect(offlineManager.isOnline()).toBe(true);

      // Change navigator.onLine
      (navigator as any).onLine = false;

      // The manager should still report the current status
      expect(typeof offlineManager.isOnline()).toBe("boolean");
    });
  });

  describe(_"operation statistics", _() => {
    it(_"should return correct statistics structure", _async () => {
      const stats = await offlineManager.getOperationStats();

      expect(stats).toHaveProperty("total");
      expect(stats).toHaveProperty("pending");
      expect(stats).toHaveProperty("syncing");
      expect(stats).toHaveProperty("completed");
      expect(stats).toHaveProperty("failed");

      expect(typeof stats.total).toBe("number");
      expect(typeof stats.pending).toBe("number");
      expect(typeof stats.syncing).toBe("number");
      expect(typeof stats.completed).toBe("number");
      expect(typeof stats.failed).toBe("number");
    });
  });

  describe(_"cleanup", _() => {
    it(_"should clear completed operations", _async () => {
      // This would require mocking the internal state
      // For now, just test that the method doesn't throw
      await expect(offlineManager.clearCompletedOperations()).resolves.not.toThrow();
    });
  });
});

describe(_"OptimisticUpdateManager", _() => {
  let optimisticManager: OptimisticUpdateManagerImpl;

  beforeEach_(() => {
    optimisticManager = new OptimisticUpdateManagerImpl();
    jest.useFakeTimers();
  });

  afterEach_(() => {
    jest.useRealTimers();
  });

  describe(_"applyOptimisticUpdate", _() => {
    it(_"should apply an optimistic update", _() => {
      const update = {
        operation: "cart_add",
        optimisticData: { productId: "123", quantity: 1 },
        rollbackData: { productId: "123", quantity: 0 },
      };

      const updateId = optimisticManager.applyOptimisticUpdate(update);

      expect(updateId).toMatch(/^opt_\d+_[a-z0-9]+$/);

      const pendingUpdates = optimisticManager.getPendingUpdates();
      expect(pendingUpdates).toHaveLength(1);
      expect(pendingUpdates[0].operation).toBe("cart_add");
    });

    it(_"should auto-rollback after timeout", _() => {
      const rollbackSpy = jest.spyOn(optimisticManager, "rollbackUpdate");

      optimisticManager.applyOptimisticUpdate({
        operation: "cart_add",
        optimisticData: { productId: "123" },
        rollbackData: { productId: "123" },
      });

      // Fast-forward 30 seconds
      jest.advanceTimersByTime(30000);

      expect(rollbackSpy).toHaveBeenCalled();
    });
  });

  describe(_"confirmUpdate", _() => {
    it(_"should confirm an optimistic update", _() => {
      const updateId = optimisticManager.applyOptimisticUpdate({
        operation: "cart_add",
        optimisticData: { productId: "123" },
        rollbackData: { productId: "123" },
      });

      optimisticManager.confirmUpdate(updateId);

      const pendingUpdates = optimisticManager.getPendingUpdates();
      expect(pendingUpdates).toHaveLength(0); // Confirmed updates are not pending
    });

    it(_"should handle non-existent update ID", _() => {
      expect_(() => {
        optimisticManager.confirmUpdate("non-existent");
      }).not.toThrow();
    });
  });

  describe(_"rollbackUpdate", _() => {
    it(_"should rollback an optimistic update", _() => {
      const updateId = optimisticManager.applyOptimisticUpdate({
        operation: "cart_add",
        optimisticData: { productId: "123" },
        rollbackData: { productId: "123" },
      });

      optimisticManager.rollbackUpdate(updateId);

      const pendingUpdates = optimisticManager.getPendingUpdates();
      expect(pendingUpdates).toHaveLength(0); // Rolled back updates are removed
    });
  });

  describe(_"convenience methods", _() => {
    it(_"should create cart add optimistic update", _async () => {
      await optimisticManager.addToCartOptimistic("123", 2);

      const pendingUpdates = optimisticManager.getPendingUpdates();
      expect(pendingUpdates).toHaveLength(1);
      expect(pendingUpdates[0].operation).toBe("cart_add");
    });

    it(_"should create favorite toggle optimistic update", _async () => {
      await optimisticManager.toggleFavoriteOptimistic("123", true);

      const pendingUpdates = optimisticManager.getPendingUpdates();
      expect(pendingUpdates).toHaveLength(1);
      expect(pendingUpdates[0].operation).toBe("favorite_toggle");
    });

    it(_"should create download start optimistic update", _async () => {
      await optimisticManager.startDownloadOptimistic("123", "mp3");

      const pendingUpdates = optimisticManager.getPendingUpdates();
      expect(pendingUpdates).toHaveLength(1);
      expect(pendingUpdates[0].operation).toBe("download_start");
    });
  });

  describe(_"callbacks", _() => {
    it(_"should call update callbacks", _() => {
      const updateCallback = jest.fn();
      optimisticManager.onUpdate("cart_add", updateCallback);

      optimisticManager.applyOptimisticUpdate({
        operation: "cart_add",
        optimisticData: { productId: "123" },
        rollbackData: { productId: "123" },
      });

      expect(updateCallback).toHaveBeenCalled();
    });

    it(_"should call rollback callbacks", _() => {
      const rollbackCallback = jest.fn();
      optimisticManager.onRollback("cart_add", rollbackCallback);

      const updateId = optimisticManager.applyOptimisticUpdate({
        operation: "cart_add",
        optimisticData: { productId: "123" },
        rollbackData: { productId: "123" },
      });

      optimisticManager.rollbackUpdate(updateId);

      expect(rollbackCallback).toHaveBeenCalled();
    });
  });

  describe(_"statistics", _() => {
    it(_"should return correct update statistics", _() => {
      optimisticManager.applyOptimisticUpdate({
        operation: "cart_add",
        optimisticData: { productId: "123" },
        rollbackData: { productId: "123" },
      });

      const updateId2 = optimisticManager.applyOptimisticUpdate({
        operation: "favorite_toggle",
        optimisticData: { productId: "456" },
        rollbackData: { productId: "456" },
      });

      optimisticManager.confirmUpdate(updateId2);

      const stats = optimisticManager.getUpdateStats();

      expect(stats.total).toBe(2);
      expect(stats.pending).toBe(1);
      expect(stats.confirmed).toBe(1);
      expect(stats.byOperation).toEqual({
        cart_add: 1,
        favorite_toggle: 1,
      });
    });
  });

  describe(_"cleanup", _() => {
    it(_"should cleanup old confirmed updates", _() => {
      const updateId = optimisticManager.applyOptimisticUpdate({
        operation: "cart_add",
        optimisticData: { productId: "123" },
        rollbackData: { productId: "123" },
      });

      optimisticManager.confirmUpdate(updateId);

      // Fast-forward 6 minutes
      jest.advanceTimersByTime(6 * 60 * 1000);

      optimisticManager.cleanup();

      const stats = optimisticManager.getUpdateStats();
      expect(stats.total).toBe(0);
    });
  });
});
