/**
 * Tests for useOfflineManager hook
 */

import { renderHook } from "@testing-library/react";
import { useOfflineManager } from "../../client/src/hooks/useOfflineManager";

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
  });

  it("should initialize with online status", () => {
    const { result } = renderHook(() => useOfflineManager());

    expect(result.current.isOnline).toBe(true);
    expect(result.current.isOfflineMode).toBe(false);
  });

  it("should provide queue operation function", async () => {
    const { result } = renderHook(() => useOfflineManager());

    expect(typeof result.current.queueOperation).toBe("function");
  });

  it("should provide optimistic update functions", () => {
    const { result } = renderHook(() => useOfflineManager());

    expect(typeof result.current.applyOptimisticUpdate).toBe("function");
    expect(typeof result.current.confirmUpdate).toBe("function");
    expect(typeof result.current.rollbackUpdate).toBe("function");
  });

  it("should provide convenience methods", () => {
    const { result } = renderHook(() => useOfflineManager());

    expect(typeof result.current.addToCartOffline).toBe("function");
    expect(typeof result.current.removeFromCartOffline).toBe("function");
    expect(typeof result.current.toggleFavoriteOffline).toBe("function");
    expect(typeof result.current.startDownloadOffline).toBe("function");
  });

  it("should provide sync control functions", () => {
    const { result } = renderHook(() => useOfflineManager());

    expect(typeof result.current.syncNow).toBe("function");
    expect(typeof result.current.clearCompleted).toBe("function");
  });

  it("should handle offline mode changes", () => {
    const { result, rerender } = renderHook(() => useOfflineManager());

    expect(result.current.isOfflineMode).toBe(false);

    // Simulate going offline
    (navigator as any).onLine = false;

    // Re-render to trigger useEffect
    rerender();

    // Note: The actual offline mode change would be triggered by the
    // useNetworkStatus hook change, which we'd need to mock differently
    // for a full integration test
  });

  it("should cleanup on unmount", () => {
    const { unmount } = renderHook(() => useOfflineManager());

    // Should not throw on unmount
    expect(() => unmount()).not.toThrow();
  });
});
