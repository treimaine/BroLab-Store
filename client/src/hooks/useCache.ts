import { useCallback, useEffect, useState } from "react";
import { CacheStats } from "../../../shared/types/system-optimization";
import { cacheManager } from "../../../shared/utils/cache-manager";

/**
 * Hook for interacting with the cache manager
 */
export function useCache() {
  const [stats, setStats] = useState<CacheStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Get cache statistics
  const getStats = useCallback(async () => {
    try {
      const cacheStats = await cacheManager.getStats();
      setStats(cacheStats);
      return cacheStats;
    } catch (error) {
      console.error("Failed to get cache stats:", error);
      return null;
    }
  }, []);

  // Cache a value with optional TTL and tags
  const set = useCallback(
    async <T>(key: string, value: T, ttl?: number, tags?: string[]): Promise<boolean> => {
      try {
        setIsLoading(true);
        await cacheManager.set(key, value, ttl, tags);
        await getStats(); // Update stats
        return true;
      } catch (error) {
        console.error("Failed to cache value:", error);
        return false;
      } finally {
        setIsLoading(false);
      }
    },
    [getStats]
  );

  // Get a cached value
  const get = useCallback(
    async <T>(key: string): Promise<T | null> => {
      try {
        const value = await cacheManager.get<T>(key);
        await getStats(); // Update stats after access
        return value;
      } catch (error) {
        console.error("Failed to get cached value:", error);
        return null;
      }
    },
    [getStats]
  );

  // Delete a cached value
  const remove = useCallback(
    async (key: string): Promise<boolean> => {
      try {
        setIsLoading(true);
        const result = await cacheManager.delete(key);
        await getStats(); // Update stats
        return result;
      } catch (error) {
        console.error("Failed to delete cached value:", error);
        return false;
      } finally {
        setIsLoading(false);
      }
    },
    [getStats]
  );

  // Clear all cached values
  const clear = useCallback(async (): Promise<boolean> => {
    try {
      setIsLoading(true);
      await cacheManager.clear();
      await getStats(); // Update stats
      return true;
    } catch (error) {
      console.error("Failed to clear cache:", error);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [getStats]);

  // Invalidate cache entries by pattern
  const invalidate = useCallback(
    async (pattern: string): Promise<number> => {
      try {
        setIsLoading(true);
        const count = await cacheManager.invalidate(pattern);
        await getStats(); // Update stats
        return count;
      } catch (error) {
        console.error("Failed to invalidate cache:", error);
        return 0;
      } finally {
        setIsLoading(false);
      }
    },
    [getStats]
  );

  // Invalidate cache entries by tags
  const invalidateByTags = useCallback(
    async (tags: string[]): Promise<number> => {
      try {
        setIsLoading(true);
        const count = await cacheManager.invalidateByTags(tags);
        await getStats(); // Update stats
        return count;
      } catch (error) {
        console.error("Failed to invalidate cache by tags:", error);
        return 0;
      } finally {
        setIsLoading(false);
      }
    },
    [getStats]
  );

  // Check if a key exists in cache
  const exists = useCallback(async (key: string): Promise<boolean> => {
    try {
      return await cacheManager.exists(key);
    } catch (error) {
      console.error("Failed to check cache existence:", error);
      return false;
    }
  }, []);

  // Touch a cache entry to extend its TTL
  const touch = useCallback(
    async (key: string, ttl?: number): Promise<boolean> => {
      try {
        const result = await cacheManager.touch(key, ttl);
        await getStats(); // Update stats
        return result;
      } catch (error) {
        console.error("Failed to touch cache entry:", error);
        return false;
      }
    },
    [getStats]
  );

  // Load initial stats
  useEffect(() => {
    getStats();
  }, [getStats]);

  return {
    // Cache operations
    set,
    get,
    remove,
    clear,
    invalidate,
    invalidateByTags,
    exists,
    touch,

    // Cache information
    stats,
    isLoading,
    getStats,

    // Computed values
    hitRate: stats?.hitRate ?? 0,
    totalEntries: stats?.totalEntries ?? 0,
    totalSize: stats?.totalSize ?? 0,
    memoryUsage: stats?.memoryUsage ?? 0,
    evictionCount: stats?.evictionCount ?? 0,
  };
}

/**
 * Hook for caching API responses with automatic invalidation
 */
export function useCachedData<T>(
  key: string,
  fetcher: () => Promise<T>,
  options: {
    ttl?: number;
    tags?: string[];
    enabled?: boolean;
    refetchOnMount?: boolean;
  } = {}
) {
  const { get, set, exists } = useCache();
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const {
    ttl = 5 * 60 * 1000, // 5 minutes default
    tags = [],
    enabled = true,
    refetchOnMount = false,
  } = options;

  const fetchData = useCallback(
    async (forceRefresh = false) => {
      if (!enabled) return;

      try {
        setIsLoading(true);
        setError(null);

        // Check cache first unless forcing refresh
        if (!forceRefresh) {
          const cachedData = await get<T>(key);
          if (cachedData !== null) {
            setData(cachedData);
            return cachedData;
          }
        }

        // Fetch fresh data
        const freshData = await fetcher();

        // Cache the result
        await set(key, freshData, ttl, tags);
        setData(freshData);

        return freshData;
      } catch (err) {
        const error = err instanceof Error ? err : new Error("Unknown error");
        setError(error);
        setData(null); // Clear data on error
        console.error("Failed to fetch cached data:", error);
        throw error; // Re-throw to allow proper error handling in tests
      } finally {
        setIsLoading(false);
      }
    },
    [key, fetcher, ttl, tags, enabled, get, set]
  );

  const refresh = useCallback(() => {
    return fetchData(true);
  }, [fetchData]);

  // Initial fetch
  useEffect(() => {
    if (enabled && (refetchOnMount || data === null)) {
      fetchData();
    }
  }, [fetchData, enabled, refetchOnMount, data]);

  return {
    data,
    isLoading,
    error,
    refresh,
    refetch: refresh,
  };
}

/**
 * Hook for managing cache with automatic cleanup
 */
export function useCacheWithCleanup(cleanupInterval = 5 * 60 * 1000) {
  const cache = useCache();

  useEffect(() => {
    const cleanup = async () => {
      try {
        await cacheManager.cleanup();
        await cache.getStats();
      } catch (error) {
        console.error("Cache cleanup failed:", error);
      }
    };

    const interval = setInterval(cleanup, cleanupInterval);

    return () => {
      clearInterval(interval);
    };
  }, [cleanupInterval, cache]);

  return cache;
}
