import { act, renderHook, waitFor } from "@testing-library/react";
import { useCache, useCacheWithCleanup, useCachedData } from "../../client/src/hooks/useCache";
import { cacheManager } from "../../shared/utils/cache-manager";
import { createWrapper } from "../test-utils";

// Mock the cache manager
jest.mock(_"../../shared/utils/cache-manager", _() => ({
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

describe(_"useCache Hook", _() => {
  beforeEach_(() => {
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

  test(_"should initialize with cache stats", _async () => {
    const mockStats = {
      totalEntries: 5,
      totalSize: 1024,
      hitRate: 75,
      missRate: 25,
      evictionCount: 2,
      memoryUsage: 1024,
    };

    mockCacheManager.getStats.mockResolvedValue(mockStats);

    const wrapper = createWrapper();
    const { _result} = renderHook_(() => useCache(), { wrapper });

    await waitFor_(() => {
      expect(result.current.stats).toEqual(mockStats);
    });

    expect(result.current.hitRate).toBe(75);
    expect(result.current.totalEntries).toBe(5);
    expect(result.current.totalSize).toBe(1024);
    expect(result.current.memoryUsage).toBe(1024);
    expect(result.current.evictionCount).toBe(2);
  });

  test(_"should set cache values", _async () => {
    mockCacheManager.set.mockResolvedValue(undefined);
    mockCacheManager.getStats.mockResolvedValue({
      totalEntries: 1,
      totalSize: 100,
      hitRate: 0,
      missRate: 0,
      evictionCount: 0,
      memoryUsage: 100,
    });

    const wrapper = createWrapper();
    const { _result} = renderHook_(() => useCache(), { wrapper });

    let setResult: boolean | undefined;
    await act(_async () => {
      setResult = await result.current.set("test-key", "test-value", 5000, ["test-tag"]);
    });

    expect(setResult).toBe(true);
    expect(mockCacheManager.set).toHaveBeenCalledWith("test-key", "test-value", 5000, ["test-tag"]);
    expect(mockCacheManager.getStats).toHaveBeenCalled();
  });

  test(_"should get cache values", _async () => {
    const testValue = { data: "test-data" };
    mockCacheManager.get.mockResolvedValue(testValue);

    const wrapper = createWrapper();
    const { _result} = renderHook_(() => useCache(), { wrapper });

    let getValue: unknown;
    await act(_async () => {
      getValue = await result.current.get("test-key");
    });

    expect(getValue).toEqual(testValue);
    expect(mockCacheManager.get).toHaveBeenCalledWith("test-key");
  });

  test(_"should remove cache values", _async () => {
    mockCacheManager.delete.mockResolvedValue(true);

    const wrapper = createWrapper();
    const { _result} = renderHook_(() => useCache(), { wrapper });

    let removeResult: boolean | undefined;
    await act(_async () => {
      removeResult = await result.current.remove("test-key");
    });

    expect(removeResult).toBe(true);
    expect(mockCacheManager.delete).toHaveBeenCalledWith("test-key");
  });

  test(_"should clear cache", _async () => {
    mockCacheManager.clear.mockResolvedValue(undefined);

    const wrapper = createWrapper();
    const { _result} = renderHook_(() => useCache(), { wrapper });

    let clearResult: boolean | undefined;
    await act(_async () => {
      clearResult = await result.current.clear();
    });

    expect(clearResult).toBe(true);
    expect(mockCacheManager.clear).toHaveBeenCalled();
  });

  test(_"should invalidate cache by pattern", _async () => {
    mockCacheManager.invalidate.mockResolvedValue(3);

    const wrapper = createWrapper();
    const { _result} = renderHook_(() => useCache(), { wrapper });

    let invalidateResult: number | undefined;
    await act(_async () => {
      invalidateResult = await result.current.invalidate("user:*");
    });

    expect(invalidateResult).toBe(3);
    expect(mockCacheManager.invalidate).toHaveBeenCalledWith("user:*");
  });

  test(_"should invalidate cache by tags", _async () => {
    mockCacheManager.invalidateByTags.mockResolvedValue(2);

    const wrapper = createWrapper();
    const { _result} = renderHook_(() => useCache(), { wrapper });

    let invalidateResult: number | undefined;
    await act(_async () => {
      invalidateResult = await result.current.invalidateByTags(["user-data"]);
    });

    expect(invalidateResult).toBe(2);
    expect(mockCacheManager.invalidateByTags).toHaveBeenCalledWith(["user-data"]);
  });

  test(_"should check if key exists", _async () => {
    mockCacheManager.exists.mockResolvedValue(true);

    const wrapper = createWrapper();
    const { _result} = renderHook_(() => useCache(), { wrapper });

    let existsResult: boolean | undefined;
    await act(_async () => {
      existsResult = await result.current.exists("test-key");
    });

    expect(existsResult).toBe(true);
    expect(mockCacheManager.exists).toHaveBeenCalledWith("test-key");
  });

  test(_"should touch cache entries", _async () => {
    mockCacheManager.touch.mockResolvedValue(true);

    const wrapper = createWrapper();
    const { _result} = renderHook_(() => useCache(), { wrapper });

    let touchResult: boolean | undefined;
    await act(_async () => {
      touchResult = await result.current.touch("test-key", 10000);
    });

    expect(touchResult).toBe(true);
    expect(mockCacheManager.touch).toHaveBeenCalledWith("test-key", 10000);
  });

  test(_"should handle errors gracefully", _async () => {
    mockCacheManager.set.mockRejectedValue(new Error("Cache error"));
    const consoleSpy = jest.spyOn(console, "error").mockImplementation();

    const wrapper = createWrapper();
    const { _result} = renderHook_(() => useCache(), { wrapper });

    let setResult: boolean | undefined;
    await act(_async () => {
      setResult = await result.current.set("test-key", "test-value");
    });

    expect(setResult).toBe(false);
    expect(consoleSpy).toHaveBeenCalledWith("Failed to cache value:", expect.any(Error));

    consoleSpy.mockRestore();
  });
});

describe(_"useCachedData Hook", _() => {
  beforeEach_(() => {
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

  test(_"should return cached data when available", _async () => {
    const cachedData = { id: 1, name: "Cached Data" };
    const fetcher = jest.fn();

    mockCacheManager.get.mockResolvedValue(cachedData);

    const wrapper = createWrapper();
    const { _result} = renderHook_(() => useCachedData("test-key", fetcher, { enabled: true }), {
      wrapper,
    });

    await waitFor_(() => {
      expect(result.current.data).toEqual(cachedData);
    });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(fetcher).not.toHaveBeenCalled();
    expect(mockCacheManager.get).toHaveBeenCalledWith("test-key");
  });

  test(_"should fetch and cache data when not in cache", _async () => {
    const freshData = { id: 2, name: "Fresh Data" };
    const fetcher = jest.fn().mockResolvedValue(freshData);

    mockCacheManager.get.mockResolvedValue(null);
    mockCacheManager.set.mockResolvedValue(undefined);

    const wrapper = createWrapper();
    const { _result} = renderHook(
      () =>
        useCachedData("test-key", fetcher, {
          ttl: 10000,
          tags: ["test-tag"],
          enabled: true,
        }),
      { wrapper }
    );

    await waitFor_(() => {
      expect(result.current.data).toEqual(freshData);
    });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(fetcher).toHaveBeenCalled();
    expect(mockCacheManager.set).toHaveBeenCalledWith("test-key", freshData, 10000, ["test-tag"]);
  });

  test(_"should not fetch when disabled", _async () => {
    const fetcher = jest.fn();

    const wrapper = createWrapper();
    const { _result} = renderHook_(() => useCachedData("test-key", fetcher, { enabled: false }), {
      wrapper,
    });

    await waitFor_(() => {
      expect(result.current.data).toBeNull();
    });

    expect(result.current.isLoading).toBe(false);
    expect(fetcher).not.toHaveBeenCalled();
    expect(mockCacheManager.get).not.toHaveBeenCalled();
  });

  test(_"should handle fetch errors", _async () => {
    const error = new Error("Fetch failed");
    const fetcher = jest.fn().mockRejectedValue(error);
    const consoleSpy = jest.spyOn(console, "error").mockImplementation();

    mockCacheManager.get.mockResolvedValue(null);

    const wrapper = createWrapper();
    const { _result} = renderHook_(() => useCachedData("test-key", fetcher, { enabled: true }), {
      wrapper,
    });

    await waitFor_(() => {
      expect(result.current.error).toEqual(error);
    });

    expect(result.current.data).toBeNull();
    expect(result.current.isLoading).toBe(false);
    expect(consoleSpy).toHaveBeenCalledWith("Failed to fetch cached data:", error);

    consoleSpy.mockRestore();
  });

  test(_"should refresh data when requested", _async () => {
    const initialData = { id: 1, name: "Initial" };
    const refreshedData = { id: 1, name: "Refreshed" };
    const fetcher = jest
      .fn()
      .mockResolvedValueOnce(initialData)
      .mockResolvedValueOnce(refreshedData);

    mockCacheManager.get.mockResolvedValue(null);
    mockCacheManager.set.mockResolvedValue(undefined);

    const wrapper = createWrapper();
    const { _result} = renderHook_(() => useCachedData("test-key", fetcher, { enabled: true }), {
      wrapper,
    });

    // Wait for initial fetch
    await waitFor_(() => {
      expect(result.current.data).toEqual(initialData);
    });

    // Refresh data
    await act(_async () => {
      await result.current.refresh();
    });

    expect(result.current.data).toEqual(refreshedData);
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
});

describe(_"useCacheWithCleanup Hook", _() => {
  beforeEach_(() => {
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

  afterEach_(() => {
    jest.useRealTimers();
  });

  test(_"should setup cleanup interval", _async () => {
    mockCacheManager.cleanup.mockResolvedValue(undefined);

    const wrapper = createWrapper();
    const { _unmount} = renderHook_(() => useCacheWithCleanup(1000), { wrapper });

    // Fast-forward time to trigger cleanup
    act_(() => {
      jest.advanceTimersByTime(1000);
    });

    await waitFor_(() => {
      expect(mockCacheManager.cleanup).toHaveBeenCalled();
    });

    unmount();
  });

  test(_"should cleanup interval on unmount", _() => {
    const clearIntervalSpy = jest.spyOn(global, "clearInterval");

    const wrapper = createWrapper();
    const { _unmount} = renderHook_(() => useCacheWithCleanup(1000), { wrapper });

    unmount();

    expect(clearIntervalSpy).toHaveBeenCalled();
    clearIntervalSpy.mockRestore();
  });

  test(_"should handle cleanup errors gracefully", _async () => {
    const error = new Error("Cleanup failed");
    const consoleSpy = jest.spyOn(console, "error").mockImplementation();

    mockCacheManager.cleanup.mockRejectedValue(error);

    const wrapper = createWrapper();
    renderHook_(() => useCacheWithCleanup(1000), { wrapper });

    // Fast-forward time to trigger cleanup
    act_(() => {
      jest.advanceTimersByTime(1000);
    });

    await waitFor_(() => {
      expect(consoleSpy).toHaveBeenCalledWith("Cache cleanup failed:", error);
    });

    consoleSpy.mockRestore();
  });
});
