import { act, renderHook, waitFor } from "@testing-library/react";
import { useCache, useCacheWithCleanup, useCachedData } from "../../client/src/hooks/useCache";
import { cacheManager } from "../../shared/utils/cache-manager";

// Mock the cache manager
jest.mock("../../shared/utils/cache-manager", () => ({
  cacheManager: {
    get: jest.fn(),
    set: jest.fn(),
    delete: jest.fn(),
    clear: jest.fn(),
    invalidate: jest.fn(),
    invalidateByTags: jest.fn(),
    exists: jest.fn(),
    touch: jest.fn(),
    getStats: jest.fn(),
    cleanup: jest.fn(),
  },
}));

const mockCacheManager = cacheManager as jest.Mocked<typeof cacheManager>;

describe("useCache Hook", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCacheManager.getStats.mockResolvedValue({
      totalEntries: 0,
      totalSize: 0,
      hitRate: 0,
      missRate: 0,
      evictionCount: 0,
      memoryUsage: 0,
    });
  });

  test("should initialize with cache stats", async () => {
    const mockStats = {
      totalEntries: 5,
      totalSize: 1024,
      hitRate: 75,
      missRate: 25,
      evictionCount: 2,
      memoryUsage: 1024,
    };

    mockCacheManager.getStats.mockResolvedValue(mockStats);

    const { result } = renderHook(() => useCache());

    await waitFor(() => {
      expect(result.current.stats).toEqual(mockStats);
    });

    expect(result.current.hitRate).toBe(75);
    expect(result.current.totalEntries).toBe(5);
    expect(result.current.totalSize).toBe(1024);
    expect(result.current.memoryUsage).toBe(1024);
    expect(result.current.evictionCount).toBe(2);
  });

  test("should set cache values", async () => {
    mockCacheManager.set.mockResolvedValue(undefined);
    mockCacheManager.getStats.mockResolvedValue({
      totalEntries: 1,
      totalSize: 100,
      hitRate: 0,
      missRate: 0,
      evictionCount: 0,
      memoryUsage: 100,
    });

    const { result } = renderHook(() => useCache());

    let setResult: boolean | undefined;
    await act(async () => {
      setResult = await result.current.set("test-key", "test-value", 5000, ["test-tag"]);
    });

    expect(setResult).toBe(true);
    expect(mockCacheManager.set).toHaveBeenCalledWith("test-key", "test-value", 5000, ["test-tag"]);
    expect(mockCacheManager.getStats).toHaveBeenCalled();
  });

  test("should get cache values", async () => {
    const testValue = { data: "test-data" };
    mockCacheManager.get.mockResolvedValue(testValue);

    const { result } = renderHook(() => useCache());

    let getValue: any;
    await act(async () => {
      getValue = await result.current.get("test-key");
    });

    expect(getValue).toEqual(testValue);
    expect(mockCacheManager.get).toHaveBeenCalledWith("test-key");
  });

  test("should remove cache values", async () => {
    mockCacheManager.delete.mockResolvedValue(true);

    const { result } = renderHook(() => useCache());

    let removeResult: boolean | undefined;
    await act(async () => {
      removeResult = await result.current.remove("test-key");
    });

    expect(removeResult).toBe(true);
    expect(mockCacheManager.delete).toHaveBeenCalledWith("test-key");
  });

  test("should clear cache", async () => {
    mockCacheManager.clear.mockResolvedValue(undefined);

    const { result } = renderHook(() => useCache());

    let clearResult: boolean | undefined;
    await act(async () => {
      clearResult = await result.current.clear();
    });

    expect(clearResult).toBe(true);
    expect(mockCacheManager.clear).toHaveBeenCalled();
  });

  test("should invalidate cache by pattern", async () => {
    mockCacheManager.invalidate.mockResolvedValue(3);

    const { result } = renderHook(() => useCache());

    let invalidateResult: number | undefined;
    await act(async () => {
      invalidateResult = await result.current.invalidate("user:*");
    });

    expect(invalidateResult).toBe(3);
    expect(mockCacheManager.invalidate).toHaveBeenCalledWith("user:*");
  });

  test("should invalidate cache by tags", async () => {
    mockCacheManager.invalidateByTags.mockResolvedValue(2);

    const { result } = renderHook(() => useCache());

    let invalidateResult: number | undefined;
    await act(async () => {
      invalidateResult = await result.current.invalidateByTags(["user-data"]);
    });

    expect(invalidateResult).toBe(2);
    expect(mockCacheManager.invalidateByTags).toHaveBeenCalledWith(["user-data"]);
  });

  test("should check if key exists", async () => {
    mockCacheManager.exists.mockResolvedValue(true);

    const { result } = renderHook(() => useCache());

    let existsResult: boolean | undefined;
    await act(async () => {
      existsResult = await result.current.exists("test-key");
    });

    expect(existsResult).toBe(true);
    expect(mockCacheManager.exists).toHaveBeenCalledWith("test-key");
  });

  test("should touch cache entries", async () => {
    mockCacheManager.touch.mockResolvedValue(true);

    const { result } = renderHook(() => useCache());

    let touchResult: boolean | undefined;
    await act(async () => {
      touchResult = await result.current.touch("test-key", 10000);
    });

    expect(touchResult).toBe(true);
    expect(mockCacheManager.touch).toHaveBeenCalledWith("test-key", 10000);
  });

  test("should handle errors gracefully", async () => {
    mockCacheManager.set.mockRejectedValue(new Error("Cache error"));
    const consoleSpy = jest.spyOn(console, "error").mockImplementation();

    const { result } = renderHook(() => useCache());

    let setResult: boolean | undefined;
    await act(async () => {
      setResult = await result.current.set("test-key", "test-value");
    });

    expect(setResult).toBe(false);
    expect(consoleSpy).toHaveBeenCalledWith("Failed to cache value:", expect.any(Error));

    consoleSpy.mockRestore();
  });
});

describe("useCachedData Hook", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCacheManager.getStats.mockResolvedValue({
      totalEntries: 0,
      totalSize: 0,
      hitRate: 0,
      missRate: 0,
      evictionCount: 0,
      memoryUsage: 0,
    });
  });

  test("should return cached data when available", async () => {
    const cachedData = { id: 1, name: "Cached Data" };
    const fetcher = jest.fn();

    mockCacheManager.get.mockResolvedValue(cachedData);

    const { result } = renderHook(() => useCachedData("test-key", fetcher, { enabled: true }));

    await waitFor(() => {
      expect(result.current.data).toEqual(cachedData);
    });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(fetcher).not.toHaveBeenCalled();
    expect(mockCacheManager.get).toHaveBeenCalledWith("test-key");
  });

  test("should fetch and cache data when not in cache", async () => {
    const freshData = { id: 2, name: "Fresh Data" };
    const fetcher = jest.fn().mockResolvedValue(freshData);

    mockCacheManager.get.mockResolvedValue(null);
    mockCacheManager.set.mockResolvedValue(undefined);

    const { result } = renderHook(() =>
      useCachedData("test-key", fetcher, {
        ttl: 10000,
        tags: ["test-tag"],
        enabled: true,
      })
    );

    await waitFor(() => {
      expect(result.current.data).toEqual(freshData);
    });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(fetcher).toHaveBeenCalled();
    expect(mockCacheManager.set).toHaveBeenCalledWith("test-key", freshData, 10000, ["test-tag"]);
  });

  test("should not fetch when disabled", async () => {
    const fetcher = jest.fn();

    const { result } = renderHook(() => useCachedData("test-key", fetcher, { enabled: false }));

    await waitFor(() => {
      expect(result.current.data).toBeNull();
    });

    expect(result.current.isLoading).toBe(false);
    expect(fetcher).not.toHaveBeenCalled();
    expect(mockCacheManager.get).not.toHaveBeenCalled();
  });

  test("should handle fetch errors", async () => {
    const error = new Error("Fetch failed");
    const fetcher = jest.fn().mockRejectedValue(error);
    const consoleSpy = jest.spyOn(console, "error").mockImplementation();

    mockCacheManager.get.mockResolvedValue(null);

    const { result } = renderHook(() => useCachedData("test-key", fetcher, { enabled: true }));

    await waitFor(() => {
      expect(result.current.error).toEqual(error);
    });

    expect(result.current.data).toBeNull();
    expect(result.current.isLoading).toBe(false);
    expect(consoleSpy).toHaveBeenCalledWith("Failed to fetch cached data:", error);

    consoleSpy.mockRestore();
  });

  test("should refresh data when requested", async () => {
    const initialData = { id: 1, name: "Initial" };
    const refreshedData = { id: 1, name: "Refreshed" };
    const fetcher = jest
      .fn()
      .mockResolvedValueOnce(initialData)
      .mockResolvedValueOnce(refreshedData);

    mockCacheManager.get.mockResolvedValue(null);
    mockCacheManager.set.mockResolvedValue(undefined);

    const { result } = renderHook(() => useCachedData("test-key", fetcher, { enabled: true }));

    // Wait for initial fetch
    await waitFor(() => {
      expect(result.current.data).toEqual(initialData);
    });

    // Refresh data
    await act(async () => {
      await result.current.refresh();
    });

    expect(result.current.data).toEqual(refreshedData);
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
});

describe("useCacheWithCleanup Hook", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    mockCacheManager.getStats.mockResolvedValue({
      totalEntries: 0,
      totalSize: 0,
      hitRate: 0,
      missRate: 0,
      evictionCount: 0,
      memoryUsage: 0,
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test("should setup cleanup interval", async () => {
    mockCacheManager.cleanup.mockResolvedValue(undefined);

    const { unmount } = renderHook(() => useCacheWithCleanup(1000));

    // Fast-forward time to trigger cleanup
    act(() => {
      jest.advanceTimersByTime(1000);
    });

    await waitFor(() => {
      expect(mockCacheManager.cleanup).toHaveBeenCalled();
    });

    unmount();
  });

  test("should cleanup interval on unmount", () => {
    const clearIntervalSpy = jest.spyOn(global, "clearInterval");

    const { unmount } = renderHook(() => useCacheWithCleanup(1000));

    unmount();

    expect(clearIntervalSpy).toHaveBeenCalled();
    clearIntervalSpy.mockRestore();
  });

  test("should handle cleanup errors gracefully", async () => {
    const error = new Error("Cleanup failed");
    const consoleSpy = jest.spyOn(console, "error").mockImplementation();

    mockCacheManager.cleanup.mockRejectedValue(error);

    renderHook(() => useCacheWithCleanup(1000));

    // Fast-forward time to trigger cleanup
    act(() => {
      jest.advanceTimersByTime(1000);
    });

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith("Cache cleanup failed:", error);
    });

    consoleSpy.mockRestore();
  });
});
