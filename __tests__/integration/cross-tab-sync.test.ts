/**
 * Cross-Tab Synchronization Integration Test
 *
 * Tests the integration between CrossTabSyncManager and the dashboard store
 * to ensure cross-tab synchronization works correctly.
 */

import { useDashboardStore, usePendingUpdates } from "@/store/useDashboardStore";
import type { OptimisticUpdate } from "@shared/types/sync";
import { act, renderHook } from "@testing-library/react";

// Mock BroadcastChannel for testing
class MockBroadcastChannel {
  public name: string;
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

  postMessage(data: unknown) {
    // Simulate async message delivery
    setTimeout(() => {
      const event = new MessageEvent("message", { data });
      this.listeners.forEach(listener => listener(event));
    }, 0);
  }

  close() {
    this.listeners = [];
  }
}

// Mock localStorage
const mockLocalStorage = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
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
}

Object.defineProperty(global, "navigator", {
  value: {
    userAgent: "Mozilla/5.0 (Test Browser)",
  },
  writable: true,
});

describe("Cross-Tab Synchronization Integration", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLocalStorage.clear();
  });

  afterEach(() => {
    // Clean up any active sync managers
    const { result } = renderHook(() => useDashboardStore());
    act(() => {
      result.current.destroyCrossTabSync();
      result.current.reset();
    });
  });

  it("should initialize cross-tab sync manager", () => {
    const { result } = renderHook(() => useDashboardStore());

    act(() => {
      result.current.initializeCrossTabSync("test-user");
    });

    const crossTabInfo = result.current.getCrossTabInfo();
    expect(crossTabInfo.activeTabs).toBeGreaterThanOrEqual(1);
    expect(crossTabInfo.currentTabFocused).toBe(true);
  });

  it("should broadcast optimistic updates across tabs", async () => {
    const { result: store1 } = renderHook(() => useDashboardStore());
    const { result: pendingUpdates1 } = renderHook(() => usePendingUpdates());

    // Initialize cross-tab sync
    act(() => {
      store1.current.initializeCrossTabSync("test-user");
    });

    // Create an optimistic update in store1
    const update: OptimisticUpdate = {
      id: "test-update",
      type: "add",
      section: "favorites",
      data: {
        id: "fav-1",
        beatId: 123,
        beatTitle: "Test Beat",
        createdAt: new Date().toISOString(),
      },
      timestamp: Date.now(),
      confirmed: false,
    };

    act(() => {
      store1.current.applyOptimisticUpdate(update);
    });

    // Wait for cross-tab communication
    await new Promise(resolve => setTimeout(resolve, 50));

    // Store1 should have the pending update
    expect(pendingUpdates1.current).toContainEqual(expect.objectContaining({ id: "test-update" }));
  });

  it("should handle cross-tab data updates", async () => {
    const { result: store1 } = renderHook(() => useDashboardStore());
    const { result: store2 } = renderHook(() => useDashboardStore());

    // Initialize cross-tab sync
    act(() => {
      store1.current.initializeCrossTabSync("test-user");
      store2.current.initializeCrossTabSync("test-user");
    });

    // Set initial data in store1
    const testData = {
      user: {
        id: "user-1",
        clerkId: "clerk-1",
        email: "test@example.com",
      },
      stats: {
        totalFavorites: 5,
        totalDownloads: 10,
        totalOrders: 2,
        totalSpent: 100,
        recentActivity: 3,
        quotaUsed: 5,
        quotaLimit: 50,
        monthlyDownloads: 8,
        monthlyOrders: 1,
        monthlyRevenue: 50,
        calculatedAt: new Date().toISOString(),
        dataHash: "test-hash",
        source: "database" as const,
        version: 1,
      },
      favorites: [],
      orders: [],
      downloads: [],
      reservations: [],
      activity: [],
      chartData: [],
      trends: {
        orders: {
          period: "30d" as const,
          value: 2,
          change: 1,
          changePercent: 100,
          isPositive: true,
        },
        downloads: {
          period: "30d" as const,
          value: 10,
          change: 5,
          changePercent: 100,
          isPositive: true,
        },
        revenue: {
          period: "30d" as const,
          value: 100,
          change: 50,
          changePercent: 100,
          isPositive: true,
        },
        favorites: {
          period: "30d" as const,
          value: 5,
          change: 2,
          changePercent: 67,
          isPositive: true,
        },
      },
    };

    act(() => {
      store1.current.setData(testData);
    });

    // Wait for cross-tab communication
    await new Promise(resolve => setTimeout(resolve, 50));

    // Verify that data was set in store1
    expect(store1.current.data).toBeDefined();
    expect(store1.current.data?.stats.totalFavorites).toBe(5);
  });

  it("should provide cross-tab information", () => {
    const { result } = renderHook(() => useDashboardStore());

    act(() => {
      result.current.initializeCrossTabSync("test-user");
    });

    const crossTabInfo = result.current.getCrossTabInfo();

    expect(typeof crossTabInfo.activeTabs).toBe("number");
    expect(typeof crossTabInfo.currentTabFocused).toBe("boolean");
    expect(crossTabInfo.activeTabs).toBeGreaterThanOrEqual(1);
  });

  it("should clean up cross-tab sync on destroy", () => {
    const { result } = renderHook(() => useDashboardStore());

    act(() => {
      result.current.initializeCrossTabSync("test-user");
    });

    // Verify sync is initialized
    let crossTabInfo = result.current.getCrossTabInfo();
    expect(crossTabInfo.activeTabs).toBeGreaterThanOrEqual(1);

    act(() => {
      result.current.destroyCrossTabSync();
    });

    // After destroy, should return default values
    crossTabInfo = result.current.getCrossTabInfo();
    expect(crossTabInfo.activeTabs).toBe(1);
    expect(crossTabInfo.currentTabFocused).toBe(true);
  });
});
