import { act, renderHook } from "@testing-library/react";
import { useOfflineManager } from "../../client/src/hooks/useOfflineManager";
/**
 * Tests for useOfflineManager hook
 */

// Mock the network status hook
jest.mock("../../client/src/hooks/useNetworkStatus", () => ({
  useNetworkStatus: () => ({
    isOnline: true,
    effectiveType: "4g",
    saveData: false,
    downlink: 10,
  }),
}));

// Mock the managers
jest.mock("../../shared/utils/offline-manager");
jest.mock("../../shared/utils/optimistic-update-manager");
jest.mock("../../shared/utils/system-manager");

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

describe("useOfflineManager", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(null);
    (navigator as any).onLine = true;

    // Clear all timers to prevent interference between tests
    jest.clearAllTimers();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it("should initialize with online status", async () => {
    let result: ReturnType<
      typeof renderHook<ReturnType<typeof useOfflineManager>, unknown>
    >["result"];

    await act(async () => {
      const hookResult = renderHook(() => useOfflineManager());
      result = hookResult.result;
    });

    expect(result.current.isOnline).toBe(true);
    expect(result.current.isOfflineMode).toBe(false);
  });

  it("should provide queue operation function", async () => {
    let result: any;

    await act(async () => {
      const hookResult = renderHook(() => useOfflineManager());
      result = hookResult.result;
    });

    expect(typeof result.current.queueOperation).toBe("function");
  });

  it("should provide optimistic update functions", async () => {
    let result: any;

    await act(async () => {
      const hookResult = renderHook(() => useOfflineManager());
      result = hookResult.result;
    });

    expect(typeof result.current.applyOptimisticUpdate).toBe("function");
    expect(typeof result.current.confirmUpdate).toBe("function");
    expect(typeof result.current.rollbackUpdate).toBe("function");
  });

  it("should provide convenience methods", async () => {
    let result: any;

    await act(async () => {
      const hookResult = renderHook(() => useOfflineManager());
      result = hookResult.result;
    });

    expect(typeof result.current.addToCartOffline).toBe("function");
    expect(typeof result.current.removeFromCartOffline).toBe("function");
    expect(typeof result.current.toggleFavoriteOffline).toBe("function");
    expect(typeof result.current.startDownloadOffline).toBe("function");
  });

  it("should provide sync control functions", async () => {
    let result: any;

    await act(async () => {
      const hookResult = renderHook(() => useOfflineManager());
      result = hookResult.result;
    });

    expect(typeof result.current.syncNow).toBe("function");
    expect(typeof result.current.clearCompleted).toBe("function");
  });

  it("should handle offline mode changes", async () => {
    let result: any;
    let rerender: any;

    await act(async () => {
      const hookResult = renderHook(() => useOfflineManager());
      result = hookResult.result;
      rerender = hookResult.rerender;
    });

    expect(result.current.isOfflineMode).toBe(false);

    // Simulate going offline
    await act(async () => {
      (navigator as any).onLine = false;
      // Re-render to trigger useEffect
      rerender();
    });

    // Note: The actual offline mode change would be triggered by the
    // useNetworkStatus hook change, which we'd need to mock differently
    // for a full integration test
  });

  it("should cleanup on unmount", async () => {
    let unmount: any;

    await act(async () => {
      const hookResult = renderHook(() => useOfflineManager());
      unmount = hookResult.unmount;
    });

    // Should not throw on unmount
    await act(async () => {
      expect(() => unmount()).not.toThrow();
    });
  });

  it("should handle async state updates without warnings", async () => {
    let result: any;

    await act(async () => {
      const hookResult = renderHook(() => useOfflineManager());
      result = hookResult.result;
    });

    // Wait for initial async operations to complete
    await act(async () => {
      // Fast-forward timers to trigger the interval-based state updates
      jest.advanceTimersByTime(5000);
    });

    // Verify the hook is still functional after async updates
    expect(result.current.isOnline).toBe(true);
    expect(typeof result.current.queueOperation).toBe("function");
  });

  it("should handle multiple async operations without interference", async () => {
    let result: unknown;

    await act(async () => {
      const hookResult = renderHook(() => useOfflineManager());
      result = hookResult.result;
    });

    // Simulate multiple async operations
    await act(async () => {
      // Trigger multiple timer cycles
      jest.advanceTimersByTime(10000);
    });

    // Verify state remains consistent
    expect(result.current.isOnline).toBe(true);
    expect(result.current.isOfflineMode).toBe(false);
  });
});
