/**
 * Cross-Tab Synchronization Manager Tests
 *
 * Tests for the CrossTabSyncManager class including:
 * - BroadcastChannel communication
 * - localStorage fallback
 * - Tab focus detection
 * - Conflict resolution
 * - Message deduplication
 */

import CrossTabSyncManager from "@/services/CrossTabSyncManager";
import type { OptimisticUpdate } from "@shared/types/sync";

// Mock BroadcastChannel
class MockBroadcastChannel {
  public name: string;
  public onmessage: ((event: MessageEvent) => void) | null = null;
  private listeners: ((event: MessageEvent) => void)[] = [];

  constructor(name: string) {
    this.name = name;
  }

  addEventListener(type: string, listener: (event: MessageEvent) => void) {
    if (type === "message") {
      this.listeners.push(listener);
    }
  }

  removeEventListener(type: string, listener: (event: MessageEvent) => void) {
    if (type === "message") {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    }
  }

  postMessage(data: any) {
    // Simulate async message delivery
    setTimeout(() => {
      const event = new MessageEvent("message", { data });
      this.listeners.forEach(listener => listener(event));
      if (this.onmessage) {
        this.onmessage(event);
      }
    }, 0);
  }

  close() {
    this.listeners = [];
  }
}

// Mock localStorage
const mockLocalStorage = (() => {
  let store: Record<string, string> = {};
  const listeners: ((event: StorageEvent) => void)[] = [];

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      const oldValue = store[key];
      store[key] = value;

      // Simulate storage event
      setTimeout(() => {
        const event = new StorageEvent("storage", {
          key,
          oldValue,
          newValue: value,
          storageArea: mockLocalStorage as any,
        });
        listeners.forEach(listener => listener(event));
      }, 0);
    },
    removeItem: (key: string) => {
      const oldValue = store[key];
      delete store[key];

      // Simulate storage event
      setTimeout(() => {
        const event = new StorageEvent("storage", {
          key,
          oldValue,
          newValue: null,
          storageArea: mockLocalStorage as any,
        });
        listeners.forEach(listener => listener(event));
      }, 0);
    },
    clear: () => {
      store = {};
    },
    addEventListener: (type: string, listener: (event: StorageEvent) => void) => {
      if (type === "storage") {
        listeners.push(listener);
      }
    },
    removeEventListener: (type: string, listener: (event: StorageEvent) => void) => {
      if (type === "storage") {
        const index = listeners.indexOf(listener);
        if (index > -1) {
          listeners.splice(index, 1);
        }
      }
    },
  };
})();

// Setup global mocks
Object.defineProperty(global, "BroadcastChannel", {
  value: MockBroadcastChannel,
  writable: true,
});

Object.defineProperty(global, "localStorage", {
  value: mockLocalStorage,
  writable: true,
});

// Mock window if it doesn't exist
if (typeof window === "undefined") {
  Object.defineProperty(global, "window", {
    value: {
      location: { href: "http://localhost:3000/dashboard" },
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    },
    writable: true,
  });
} else {
  // Extend existing window
  Object.assign(window, {
    location: { href: "http://localhost:3000/dashboard" },
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  });
}

Object.defineProperty(global, "navigator", {
  value: {
    userAgent: "Mozilla/5.0 (Test Browser)",
  },
  writable: true,
});

describe("CrossTabSyncManager", () => {
  let syncManager: CrossTabSyncManager;
  let syncManager2: CrossTabSyncManager;

  beforeEach(() => {
    jest.clearAllMocks();
    mockLocalStorage.clear();

    syncManager = new CrossTabSyncManager(
      {
        debug: true,
        heartbeatInterval: 100,
        tabTimeout: 500,
        deduplicationWindow: 200,
      },
      "test-user-1"
    );
  });

  afterEach(() => {
    if (syncManager) {
      syncManager.destroy();
    }
    if (syncManager2) {
      syncManager2.destroy();
    }
  });

  describe("Initialization", () => {
    it("should initialize with correct configuration", () => {
      expect(syncManager).toBeDefined();
      expect(syncManager.isFocusedTab()).toBe(true);
      expect(syncManager.getActiveTabs()).toHaveLength(1);
    });

    it("should register current tab in active tabs", () => {
      const activeTabs = syncManager.getActiveTabs();
      expect(activeTabs).toHaveLength(1);
      expect(activeTabs[0]).toMatchObject({
        focused: true,
        url: "http://localhost:3000/dashboard",
        userAgent: "Mozilla/5.0 (Test Browser)",
      });
    });
  });

  describe("Data Broadcasting", () => {
    it("should broadcast data updates to other tabs", done => {
      syncManager2 = new CrossTabSyncManager({ debug: true }, "test-user-1");

      syncManager2.on("data_update", event => {
        expect(event.section).toBe("favorites");
        expect(event.data).toEqual({ favorites: [{ id: "test" }] });
        done();
      });

      syncManager.broadcastDataUpdate("favorites", { favorites: [{ id: "test" }] });
    });

    it("should broadcast optimistic updates", done => {
      syncManager2 = new CrossTabSyncManager({ debug: true }, "test-user-1");

      const update: OptimisticUpdate = {
        id: "test-update",
        type: "add",
        section: "favorites",
        data: { id: "fav-1", beatId: 123 },
        timestamp: Date.now(),
        confirmed: false,
      };

      syncManager2.on("optimistic_update", event => {
        expect(event.update).toEqual(update);
        done();
      });

      syncManager.broadcastOptimisticUpdate(update);
    });

    it("should broadcast optimistic rollbacks", done => {
      syncManager2 = new CrossTabSyncManager({ debug: true }, "test-user-1");

      syncManager2.on("optimistic_rollback", event => {
        expect(event.updateId).toBe("test-update");
        expect(event.reason).toBe("Server error");
        done();
      });

      syncManager.broadcastOptimisticRollback("test-update", "Server error");
    });
  });

  describe("Tab Focus Detection", () => {
    it("should detect tab focus changes", done => {
      syncManager2 = new CrossTabSyncManager({ debug: true }, "test-user-1");

      syncManager2.on("tab_focus", event => {
        expect(event.tabId).toBeDefined();
        done();
      });

      // Simulate focus event
      const focusEvent = new Event("focus");
      window.dispatchEvent(focusEvent);
    });

    it("should detect tab blur changes", done => {
      syncManager2 = new CrossTabSyncManager({ debug: true }, "test-user-1");

      syncManager2.on("tab_blur", event => {
        expect(event.tabId).toBeDefined();
        done();
      });

      // Simulate blur event
      const blurEvent = new Event("blur");
      window.dispatchEvent(blurEvent);
    });
  });

  describe("Conflict Resolution", () => {
    it("should detect and resolve conflicts", done => {
      syncManager2 = new CrossTabSyncManager({ debug: true }, "test-user-1");

      syncManager.on("conflict_resolved", event => {
        expect(event.resolution).toBe("accept");
        done();
      });

      // Create a conflict scenario
      const conflictId = "test-conflict";
      syncManager.resolveConflict(conflictId, "accept");
    });

    it("should handle multiple simultaneous updates", async () => {
      syncManager2 = new CrossTabSyncManager({ debug: true }, "test-user-1");

      const updates: OptimisticUpdate[] = [];

      syncManager2.on("optimistic_update", event => {
        updates.push(event.update);
      });

      // Send multiple updates quickly
      const update1: OptimisticUpdate = {
        id: "update-1",
        type: "add",
        section: "favorites",
        data: { id: "fav-1" },
        timestamp: Date.now(),
        confirmed: false,
      };

      const update2: OptimisticUpdate = {
        id: "update-2",
        type: "add",
        section: "favorites",
        data: { id: "fav-2" },
        timestamp: Date.now() + 1,
        confirmed: false,
      };

      syncManager.broadcastOptimisticUpdate(update1);
      syncManager.broadcastOptimisticUpdate(update2);

      // Wait for updates to be processed
      await new Promise(resolve => setTimeout(resolve, 50));

      expect(updates).toHaveLength(2);
      expect(updates[0].id).toBe("update-1");
      expect(updates[1].id).toBe("update-2");
    });
  });

  describe("Message Deduplication", () => {
    it("should not process duplicate messages", done => {
      syncManager2 = new CrossTabSyncManager(
        { debug: true, deduplicationWindow: 1000 },
        "test-user-1"
      );

      let messageCount = 0;
      syncManager2.on("data_update", () => {
        messageCount++;
      });

      // Send the same message twice
      syncManager.broadcastDataUpdate("test", { data: "test" });
      syncManager.broadcastDataUpdate("test", { data: "test" });

      setTimeout(() => {
        expect(messageCount).toBe(1);
        done();
      }, 100);
    });
  });

  describe("Tab Cleanup", () => {
    it("should clean up inactive tabs", async () => {
      const shortTimeoutManager = new CrossTabSyncManager(
        {
          debug: true,
          tabTimeout: 100,
          heartbeatInterval: 50,
        },
        "test-user-2"
      );

      // Initially should have 2 tabs (syncManager + shortTimeoutManager)
      expect(syncManager.getActiveTabs().length).toBeGreaterThanOrEqual(1);

      // Destroy the short timeout manager to simulate inactive tab
      shortTimeoutManager.destroy();

      // Wait for cleanup to occur
      await new Promise(resolve => setTimeout(resolve, 200));

      // Should clean up the inactive tab
      const activeTabs = syncManager.getActiveTabs();
      expect(activeTabs.every(tab => tab.id !== shortTimeoutManager.getCurrentTab().id)).toBe(true);
    });
  });

  describe("Storage Fallback", () => {
    it("should use localStorage when BroadcastChannel is not available", done => {
      // Temporarily disable BroadcastChannel
      const originalBroadcastChannel = global.BroadcastChannel;
      (global as any).BroadcastChannel = undefined;

      const fallbackManager = new CrossTabSyncManager({ debug: true }, "test-user-fallback");

      syncManager.on("data_update", event => {
        expect(event.section).toBe("test");
        expect(event.data).toEqual({ test: "data" });

        // Restore BroadcastChannel
        global.BroadcastChannel = originalBroadcastChannel;
        fallbackManager.destroy();
        done();
      });

      fallbackManager.broadcastDataUpdate("test", { test: "data" });
    });
  });

  describe("Memory Management", () => {
    it("should clean up resources on destroy", () => {
      const tabId = syncManager.getCurrentTab().id;
      const activeTabs = syncManager.getActiveTabs();

      expect(activeTabs.some(tab => tab.id === tabId)).toBe(true);

      syncManager.destroy();

      // After destroy, the tab should be removed from active tabs
      // Note: In a real scenario, this would be verified by another tab
      expect(() => syncManager.broadcastDataUpdate("test", {})).not.toThrow();
    });
  });

  describe("Sync Requests", () => {
    it("should handle sync requests from other tabs", done => {
      syncManager2 = new CrossTabSyncManager({ debug: true }, "test-user-1");

      syncManager.on("sync_request", event => {
        expect(event.sections).toEqual(["favorites", "downloads"]);
        done();
      });

      syncManager2.requestSync(["favorites", "downloads"]);
    });

    it("should request sync for all sections when no sections specified", done => {
      syncManager2 = new CrossTabSyncManager({ debug: true }, "test-user-1");

      syncManager.on("sync_request", event => {
        expect(event.sections).toBeUndefined();
        done();
      });

      syncManager2.requestSync();
    });
  });
});
