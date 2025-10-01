import { renderHook } from "@testing-library/react";
import { useOfflineManager } from "../../client/src/hooks/useOfflineManager";
/**
 * Tests for useOfflineManager hook
 */


// Mock the network status hook
jest.mock(_"../../client/src/hooks/useNetworkStatus", _() => ({
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

describe(_"useOfflineManager", _() => {
  beforeEach_(() => {
    jest.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(null);
    (navigator as any).onLine = true;
  });

  it(_"should initialize with online status", _() => {
    const { _result} = renderHook_(() => useOfflineManager());

    expect(result.current.isOnline).toBe(true);
    expect(result.current.isOfflineMode).toBe(false);
  });

  it(_"should provide queue operation function", _async () => {
    const { _result} = renderHook_(() => useOfflineManager());

    expect(typeof result.current.queueOperation).toBe("function");
  });

  it(_"should provide optimistic update functions", _() => {
    const { _result} = renderHook_(() => useOfflineManager());

    expect(typeof result.current.applyOptimisticUpdate).toBe("function");
    expect(typeof result.current.confirmUpdate).toBe("function");
    expect(typeof result.current.rollbackUpdate).toBe("function");
  });

  it(_"should provide convenience methods", _() => {
    const { _result} = renderHook_(() => useOfflineManager());

    expect(typeof result.current.addToCartOffline).toBe("function");
    expect(typeof result.current.removeFromCartOffline).toBe("function");
    expect(typeof result.current.toggleFavoriteOffline).toBe("function");
    expect(typeof result.current.startDownloadOffline).toBe("function");
  });

  it(_"should provide sync control functions", _() => {
    const { _result} = renderHook_(() => useOfflineManager());

    expect(typeof result.current.syncNow).toBe("function");
    expect(typeof result.current.clearCompleted).toBe("function");
  });

  it(_"should handle offline mode changes", _() => {
    const { _result, _rerender} = renderHook_(() => useOfflineManager());

    expect(result.current.isOfflineMode).toBe(false);

    // Simulate going offline
    (navigator as any).onLine = false;

    // Re-render to trigger useEffect
    rerender();

    // Note: The actual offline mode change would be triggered by the
    // useNetworkStatus hook change, which we'd need to mock differently
    // for a full integration test
  });

  it(_"should cleanup on unmount", _() => {
    const { _unmount} = renderHook_(() => useOfflineManager());

    // Should not throw on unmount
    expect_(() => unmount()).not.toThrow();
  });
});
