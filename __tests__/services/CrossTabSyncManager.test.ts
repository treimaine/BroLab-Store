/**
 * Cross-Tab Synchronization Manager Tests
 *
 * Simplified tests focusing on BroadcastChannel communication
 */

import CrossTabSyncManager from "@/services/CrossTabSyncManager";
import type { OptimisticUpdate } from "@shared/types/sync";

// Increase test timeout
jest.setTimeout(5000);

// Mock BroadcastChannel with shared message bus
const messageBus: Array<{ channel: string; data: any }> = [];
const channelInstances: MockBroadcastChannel[] = [];

class MockBroadcastChannel {
  public name: string;
  public onmessage: ((event: MessageEvent) => void) | null = null;
  private listeners: ((event: MessageEvent) => void)[] = [];

  constructor(name: string) {
    this.name = name;
    channelInstances.push(this);
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
    // Broadcast to all other instances of the same channel
    setImmediate(() => {
      channelInstances.forEach(instance => {
        if (instance !== this && instance.name === this.name) {
          const event = new MessageEvent("message", { data });
          instance.listeners.forEach(listener => listener(event));
          if (instance.onmessage) {
            instance.onmessage(event);
          }
        }
      });
    });
  }

  close() {
    const index = channelInstances.indexOf(this);
    if (index > -1) {
      channelInstances.splice(index, 1);
    }
    this.listeners = [];
  }
}

// Setup global mocks
Object.defineProperty(global, "BroadcastChannel", {
  value: MockBroadcastChannel,
  writable: true,
  configurable: true,
});

// Mock window
if (typeof window === "undefined") {
  Object.defineProperty(global, "window", {
    value: {
      location: { href: "http://localhost:3000/" },
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    },
    writable: true,
    configurable: true,
  });
} else {
  Object.assign(window, {
    location: { href: "http://localhost:3000/" },
  });
}

Object.defineProperty(global, "navigator", {
  value: {
    userAgent: "Mozilla/5.0 (Test Browser)",
  },
  writable: true,
  configurable: true,
});

describe("CrossTabSyncManager", () => {
  let syncManager: CrossTabSyncManager;
  let syncManager2: CrossTabSyncManager;

  beforeEach(() => {
    jest.clearAllMocks();
    // Clear channel instances
    channelInstances.length = 0;
    messageBus.length = 0;
  });

  afterEach(done => {
    // Destroy managers
    if (syncManager) {
      syncManager.destroy();
      syncManager = null as any;
    }
    if (syncManager2) {
      syncManager2.destroy();
      syncManager2 = null as unknown;
    }
    // Wait for cleanup
    setTimeout(done, 100);
  });

  describe("Initialization", () => {
    it("should initialize with correct configuration", () => {
      syncManager = new CrossTabSyncManager(
        {
          debug: false,
          heartbeatInterval: 100000,
          tabTimeout: 500000,
          deduplicationWindow: 200,
        },
        "test-user-1"
      );

      expect(syncManager).toBeDefined();
      expect(syncManager.isFocusedTab()).toBe(true);
      expect(syncManager.getActiveTabs()).toHaveLength(1);
    });

    it("should register current tab in active tabs", () => {
      syncManager = new CrossTabSyncManager(
        {
          debug: false,
          heartbeatInterval: 100000,
          tabTimeout: 500000,
        },
        "test-user-1"
      );

      const activeTabs = syncManager.getActiveTabs();
      expect(activeTabs).toHaveLength(1);
      expect(activeTabs[0]).toMatchObject({
        focused: true,
        userAgent: "Mozilla/5.0 (Test Browser)",
      });
    });
  });

  describe("Data Broadcasting", () => {
    it("should broadcast data updates to other tabs", done => {
      syncManager = new CrossTabSyncManager(
        { debug: false, heartbeatInterval: 100000, tabTimeout: 500000 },
        "test-user-1"
      );
      syncManager2 = new CrossTabSyncManager(
        { debug: false, heartbeatInterval: 100000, tabTimeout: 500000 },
        "test-user-1"
      );

      syncManager2.on("data_update", event => {
        try {
          expect(event.section).toBe("favorites");
          expect(event.data).toEqual({ favorites: [{ id: "test" }] });
          done();
        } catch (error) {
          done(error);
        }
      });

      setImmediate(() => {
        syncManager.broadcastDataUpdate("favorites", { favorites: [{ id: "test" }] });
      });
    });

    it("should broadcast optimistic updates", done => {
      syncManager = new CrossTabSyncManager(
        { debug: false, heartbeatInterval: 100000, tabTimeout: 500000 },
        "test-user-1"
      );
      syncManager2 = new CrossTabSyncManager(
        { debug: false, heartbeatInterval: 100000, tabTimeout: 500000 },
        "test-user-1"
      );

      const update: OptimisticUpdate = {
        id: "test-update",
        type: "add",
        section: "favorites",
        data: { id: "fav-1", beatId: 123 },
        timestamp: Date.now(),
        confirmed: false,
      };

      syncManager2.on("optimistic_update", event => {
        try {
          expect(event.update.id).toBe(update.id);
          expect(event.update.type).toBe(update.type);
          done();
        } catch (error) {
          done(error);
        }
      });

      setImmediate(() => {
        syncManager.broadcastOptimisticUpdate(update);
      });
    });

    it("should broadcast optimistic rollbacks", done => {
      syncManager = new CrossTabSyncManager(
        { debug: false, heartbeatInterval: 100000, tabTimeout: 500000 },
        "test-user-1"
      );
      syncManager2 = new CrossTabSyncManager(
        { debug: false, heartbeatInterval: 100000, tabTimeout: 500000 },
        "test-user-1"
      );

      syncManager2.on("optimistic_rollback", event => {
        try {
          expect(event.updateId).toBe("test-update");
          expect(event.reason).toBe("Server error");
          done();
        } catch (error) {
          done(error);
        }
      });

      setImmediate(() => {
        syncManager.broadcastOptimisticRollback("test-update", "Server error");
      });
    });
  });

  describe("Sync Requests", () => {
    it("should handle sync requests from other tabs", done => {
      syncManager = new CrossTabSyncManager(
        { debug: false, heartbeatInterval: 100000, tabTimeout: 500000 },
        "test-user-1"
      );
      syncManager2 = new CrossTabSyncManager(
        { debug: false, heartbeatInterval: 100000, tabTimeout: 500000 },
        "test-user-1"
      );

      syncManager.on("sync_request", event => {
        try {
          expect(event.sections).toEqual(["favorites", "downloads"]);
          done();
        } catch (error) {
          done(error);
        }
      });

      setImmediate(() => {
        syncManager2.requestSync(["favorites", "downloads"]);
      });
    });

    it("should request sync for all sections when no sections specified", done => {
      syncManager = new CrossTabSyncManager(
        { debug: false, heartbeatInterval: 100000, tabTimeout: 500000 },
        "test-user-1"
      );
      syncManager2 = new CrossTabSyncManager(
        { debug: false, heartbeatInterval: 100000, tabTimeout: 500000 },
        "test-user-1"
      );

      syncManager.on("sync_request", event => {
        try {
          expect(event.sections).toBeUndefined();
          done();
        } catch (error) {
          done(error);
        }
      });

      setImmediate(() => {
        syncManager2.requestSync();
      });
    });
  });

  describe("Memory Management", () => {
    it("should clean up resources on destroy", () => {
      syncManager = new CrossTabSyncManager(
        { debug: false, heartbeatInterval: 100000, tabTimeout: 500000 },
        "test-user-1"
      );

      const tabId = syncManager.getCurrentTab().id;
      const activeTabs = syncManager.getActiveTabs();

      expect(activeTabs.some(tab => tab.id === tabId)).toBe(true);

      syncManager.destroy();

      // Should not throw after destroy
      expect(() => syncManager.broadcastDataUpdate("test", {})).not.toThrow();
    });
  });
});
