/**
 * Dashboard Cache Management Hook
 *
 * Provides intelligent caching with automatic invalidation based on user actions.
 * Implements cache strategies for optimal performance and data freshness.
 *
 * Requirements addressed:
 * - 1.2: Intelligent caching with automatic invalidation
 * - 5.2: Implement intelligent cache invalidation
 * - Performance optimization through smart caching
 */

import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useRef } from "react";
import { useDashboardConfig } from "./useDashboardConfig";

// Cache invalidation triggers
export enum CacheInvalidationTrigger {
  FAVORITE_ADDED = "favorite_added",
  FAVORITE_REMOVED = "favorite_removed",
  ORDER_PLACED = "order_placed",
  DOWNLOAD_COMPLETED = "download_completed",
  RESERVATION_MADE = "reservation_made",
  PROFILE_UPDATED = "profile_updated",
  SUBSCRIPTION_CHANGED = "subscription_changed",
  USER_ACTION = "user_action",
}

// Cache key patterns for different data types
const CACHE_KEYS = {
  DASHBOARD_DATA: ["convex", "dashboard.getDashboardData"],
  DASHBOARD_STATS: ["convex", "dashboard.getDashboardStats"],
  FAVORITES: ["convex", "favorites"],
  ORDERS: ["convex", "orders"],
  DOWNLOADS: ["convex", "downloads"],
  RESERVATIONS: ["convex", "reservations"],
  USER_PROFILE: ["convex", "users"],
  ACTIVITY: ["convex", "activity"],
  CHARTS: ["dashboard", "charts"],
  TRENDS: ["dashboard", "trends"],
} as const;

// Cache invalidation rules
const INVALIDATION_RULES: Record<
  CacheInvalidationTrigger,
  (typeof CACHE_KEYS)[keyof typeof CACHE_KEYS][]
> = {
  [CacheInvalidationTrigger.FAVORITE_ADDED]: [
    CACHE_KEYS.DASHBOARD_DATA,
    CACHE_KEYS.DASHBOARD_STATS,
    CACHE_KEYS.FAVORITES,
    CACHE_KEYS.ACTIVITY,
    CACHE_KEYS.TRENDS,
  ],
  [CacheInvalidationTrigger.FAVORITE_REMOVED]: [
    CACHE_KEYS.DASHBOARD_DATA,
    CACHE_KEYS.DASHBOARD_STATS,
    CACHE_KEYS.FAVORITES,
    CACHE_KEYS.ACTIVITY,
    CACHE_KEYS.TRENDS,
  ],
  [CacheInvalidationTrigger.ORDER_PLACED]: [
    CACHE_KEYS.DASHBOARD_DATA,
    CACHE_KEYS.DASHBOARD_STATS,
    CACHE_KEYS.ORDERS,
    CACHE_KEYS.ACTIVITY,
    CACHE_KEYS.CHARTS,
    CACHE_KEYS.TRENDS,
  ],
  [CacheInvalidationTrigger.DOWNLOAD_COMPLETED]: [
    CACHE_KEYS.DASHBOARD_DATA,
    CACHE_KEYS.DASHBOARD_STATS,
    CACHE_KEYS.DOWNLOADS,
    CACHE_KEYS.ACTIVITY,
    CACHE_KEYS.CHARTS,
  ],
  [CacheInvalidationTrigger.RESERVATION_MADE]: [
    CACHE_KEYS.DASHBOARD_DATA,
    CACHE_KEYS.DASHBOARD_STATS,
    CACHE_KEYS.RESERVATIONS,
    CACHE_KEYS.ACTIVITY,
  ],
  [CacheInvalidationTrigger.PROFILE_UPDATED]: [CACHE_KEYS.DASHBOARD_DATA, CACHE_KEYS.USER_PROFILE],
  [CacheInvalidationTrigger.SUBSCRIPTION_CHANGED]: [
    CACHE_KEYS.DASHBOARD_DATA,
    CACHE_KEYS.DASHBOARD_STATS,
    CACHE_KEYS.USER_PROFILE,
  ],
  [CacheInvalidationTrigger.USER_ACTION]: [CACHE_KEYS.DASHBOARD_DATA, CACHE_KEYS.ACTIVITY],
};

// Cache statistics for monitoring
interface CacheStats {
  hitRate: number;
  missRate: number;
  invalidationCount: number;
  lastInvalidation: Date | null;
  cacheSize: number;
}

/**
 * Dashboard Cache Management Hook
 *
 * Provides intelligent caching with automatic invalidation based on user actions.
 */
export function useDashboardCache() {
  const queryClient = useQueryClient();
  const { performance } = useDashboardConfig();
  const cacheConfig = performance.cache;
  const statsRef = useRef<CacheStats>({
    hitRate: 0,
    missRate: 0,
    invalidationCount: 0,
    lastInvalidation: null,
    cacheSize: 0,
  });

  // Set up default cache configuration
  useEffect(() => {
    queryClient.setDefaultOptions({
      queries: {
        staleTime: cacheConfig.ttl.userStats, // Use userStats as default
        gcTime: cacheConfig.ttl.userStats * 2, // Set garbage collection time to 2x stale time
        retry: 3, // Use a reasonable default
        retryDelay: 1000, // Use a reasonable default
        refetchOnWindowFocus: false,
        refetchOnReconnect: true,
      },
    });
  }, [queryClient, cacheConfig]);

  // Invalidate cache based on user actions
  const invalidateCache = useCallback(
    async (trigger: CacheInvalidationTrigger, options?: { force?: boolean }) => {
      const { force = false } = options || {};
      const keysToInvalidate = INVALIDATION_RULES[trigger];

      try {
        // Invalidate specific cache keys
        await Promise.all(
          keysToInvalidate.map(async keyPattern => {
            if (force) {
              await queryClient.resetQueries({ queryKey: keyPattern });
            } else {
              await queryClient.invalidateQueries({ queryKey: keyPattern });
            }
          })
        );

        // Update statistics
        statsRef.current.invalidationCount++;
        statsRef.current.lastInvalidation = new Date();

        console.debug(`Cache invalidated for trigger: ${trigger}`, {
          keysInvalidated: keysToInvalidate.length,
          force,
        });
      } catch (error) {
        console.error("Failed to invalidate cache:", error);
        throw error;
      }
    },
    [queryClient]
  );

  // Prefetch dashboard data
  const prefetchDashboardData = useCallback(
    async (options?: { includeChartData?: boolean; includeTrends?: boolean }) => {
      try {
        await queryClient.prefetchQuery({
          queryKey: [...CACHE_KEYS.DASHBOARD_DATA, options],
          staleTime: cacheConfig.ttl.userStats,
        });
      } catch (error) {
        console.error("Failed to prefetch dashboard data:", error);
      }
    },
    [queryClient, cacheConfig.ttl.userStats]
  );

  // Prefetch user statistics
  const prefetchStats = useCallback(async () => {
    try {
      await queryClient.prefetchQuery({
        queryKey: CACHE_KEYS.DASHBOARD_STATS,
        staleTime: cacheConfig.ttl.userStats,
      });
    } catch (error) {
      console.error("Failed to prefetch stats:", error);
    }
  }, [queryClient, cacheConfig.ttl.userStats]);

  // Clear all dashboard cache
  const clearCache = useCallback(
    async (options?: { keepUserData?: boolean }) => {
      const { keepUserData = false } = options || {};

      try {
        if (keepUserData) {
          // Clear only dashboard-specific data, keep user profile
          await Promise.all([
            queryClient.removeQueries({ queryKey: CACHE_KEYS.DASHBOARD_DATA }),
            queryClient.removeQueries({ queryKey: CACHE_KEYS.FAVORITES }),
            queryClient.removeQueries({ queryKey: CACHE_KEYS.ORDERS }),
            queryClient.removeQueries({ queryKey: CACHE_KEYS.DOWNLOADS }),
            queryClient.removeQueries({ queryKey: CACHE_KEYS.RESERVATIONS }),
            queryClient.removeQueries({ queryKey: CACHE_KEYS.ACTIVITY }),
            queryClient.removeQueries({ queryKey: CACHE_KEYS.CHARTS }),
            queryClient.removeQueries({ queryKey: CACHE_KEYS.TRENDS }),
          ]);
        } else {
          // Clear all cache
          await queryClient.clear();
        }

        console.debug("Dashboard cache cleared", { keepUserData });
      } catch (error) {
        console.error("Failed to clear cache:", error);
        throw error;
      }
    },
    [queryClient]
  );

  // Get cache statistics
  const getCacheStats = useCallback((): CacheStats => {
    const cache = queryClient.getQueryCache();
    const queries = cache.getAll();

    // Calculate hit/miss rates (simplified)
    const totalQueries = queries.length;
    const staleQueries = queries.filter(query => query.isStale()).length;
    const freshQueries = totalQueries - staleQueries;

    return {
      ...statsRef.current,
      hitRate: totalQueries > 0 ? (freshQueries / totalQueries) * 100 : 0,
      missRate: totalQueries > 0 ? (staleQueries / totalQueries) * 100 : 0,
      cacheSize: totalQueries,
    };
  }, [queryClient]);

  // Optimistic cache updates
  const updateCacheOptimistically = useCallback(
    <T>(queryKey: readonly unknown[], updater: (oldData: T | undefined) => T) => {
      queryClient.setQueryData(queryKey, updater);
    },
    [queryClient]
  );

  // Batch cache operations for performance
  const batchInvalidate = useCallback(
    async (triggers: CacheInvalidationTrigger[]) => {
      const uniqueKeys = new Set<string>();

      // Collect all unique cache keys to invalidate
      triggers.forEach(trigger => {
        INVALIDATION_RULES[trigger].forEach(keyPattern => {
          uniqueKeys.add(JSON.stringify(keyPattern));
        });
      });

      // Invalidate all unique keys in parallel
      await Promise.all(
        Array.from(uniqueKeys).map(async keyStr => {
          const keyPattern = JSON.parse(keyStr);
          await queryClient.invalidateQueries({ queryKey: keyPattern });
        })
      );

      statsRef.current.invalidationCount += uniqueKeys.size;
      statsRef.current.lastInvalidation = new Date();
    },
    [queryClient]
  );

  // Cache warming for better UX
  const warmCache = useCallback(async () => {
    try {
      await Promise.all([
        prefetchDashboardData({ includeChartData: false, includeTrends: false }),
        prefetchStats(),
      ]);
    } catch (error) {
      console.error("Failed to warm cache:", error);
    }
  }, [prefetchDashboardData, prefetchStats]);

  // Return cache management interface
  return useMemo(
    () => ({
      // Core cache operations
      invalidateCache,
      clearCache,
      updateCacheOptimistically,
      batchInvalidate,

      // Prefetching
      prefetchDashboardData,
      prefetchStats,
      warmCache,

      // Monitoring
      getCacheStats,

      // Cache keys for external use
      cacheKeys: CACHE_KEYS,

      // Invalidation triggers
      triggers: CacheInvalidationTrigger,
    }),
    [
      invalidateCache,
      clearCache,
      updateCacheOptimistically,
      batchInvalidate,
      prefetchDashboardData,
      prefetchStats,
      warmCache,
      getCacheStats,
    ]
  );
}

// Utility hook for cache-aware mutations
export function useCacheAwareMutation<TData, TVariables>(
  mutationFn: (variables: TVariables) => Promise<TData>,
  options?: {
    onSuccess?: (data: TData, variables: TVariables) => void;
    invalidationTrigger?: CacheInvalidationTrigger;
    optimisticUpdate?: {
      queryKey: readonly unknown[];
      updater: (variables: TVariables) => (oldData: any) => any;
    };
  }
) {
  const { invalidateCache, updateCacheOptimistically } = useDashboardCache();

  return useCallback(
    async (variables: TVariables): Promise<TData> => {
      // Apply optimistic update if provided
      if (options?.optimisticUpdate) {
        updateCacheOptimistically(
          options.optimisticUpdate.queryKey,
          options.optimisticUpdate.updater(variables)
        );
      }

      try {
        const result = await mutationFn(variables);

        // Invalidate cache on success
        if (options?.invalidationTrigger) {
          await invalidateCache(options.invalidationTrigger);
        }

        // Call success callback
        options?.onSuccess?.(result, variables);

        return result;
      } catch (error) {
        // Revert optimistic update on error
        if (options?.optimisticUpdate) {
          await invalidateCache(CacheInvalidationTrigger.USER_ACTION);
        }
        throw error;
      }
    },
    [mutationFn, options, invalidateCache, updateCacheOptimistically]
  );
}

// Export types
export type { CacheStats };
