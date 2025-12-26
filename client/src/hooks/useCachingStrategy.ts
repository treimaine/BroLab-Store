/**
 * React Hook for Caching Strategy Integration
 *
 * Provides easy-to-use caching functionality for React components
 * with automatic invalidation and performance monitoring.
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo } from "react";
import { DataType, cachingStrategy } from "../services/cachingStrategy";

// Hook options interface
interface UseCachingOptions<T> {
  dataType: DataType;
  fetcher?: () => Promise<T>;
  enabled?: boolean;
  tags?: string[];
  customTTL?: number;
  onSuccess?: (data: T) => void;
  onError?: (error: Error) => void;
  staleWhileRevalidate?: boolean;
}

/**
 * Main caching hook that integrates with TanStack Query
 */
export function useCaching<T>(key: string, options: UseCachingOptions<T>) {
  const {
    dataType,
    fetcher,
    enabled = true,
    tags = [],
    customTTL,
    onSuccess,
    onError,
    staleWhileRevalidate = true,
  } = options;

  const queryClient = useQueryClient();

  // Create query key
  const queryKey = useMemo(() => [dataType, key], [dataType, key]);

  // Use TanStack Query with caching strategy
  const query = useQuery({
    queryKey,
    queryFn: async () => {
      if (!fetcher) {
        throw new Error("Fetcher function is required");
      }

      // Try to get from cache first
      const cached = await cachingStrategy.getCachedData(key, dataType);
      if (cached !== null && staleWhileRevalidate) {
        // Return cached data immediately, but trigger background refetch
        setTimeout(() => {
          fetcher()
            .then(freshData => {
              cachingStrategy.cacheData(key, freshData, dataType, { tags, customTTL });
              queryClient.setQueryData(queryKey, freshData);
            })
            .catch(console.error);
        }, 0);
        return cached;
      }

      // Fetch fresh data
      const freshData = await fetcher();

      // Cache the result
      await cachingStrategy.cacheData(key, freshData, dataType, { tags, customTTL });

      return freshData;
    },
    enabled,
    // Configure based on data type
    staleTime: customTTL || getStaleTimeForDataType(dataType),
    gcTime: (customTTL || getStaleTimeForDataType(dataType)) * 2,
  });

  // Handle success/error callbacks with useEffect
  useEffect(() => {
    if (query.isSuccess && query.data && onSuccess) {
      onSuccess(query.data as T);
    }
  }, [query.isSuccess, query.data, onSuccess]);

  useEffect(() => {
    if (query.isError && query.error && onError) {
      onError(query.error);
    }
  }, [query.isError, query.error, onError]);

  // Cache invalidation function
  const invalidate = useCallback(
    async (trigger?: string) => {
      await cachingStrategy.invalidateCache(trigger || "user_action", {
        keys: [key],
        tags,
      });
    },
    [key, tags]
  );

  // Manual cache update
  const updateCache = useCallback(
    async (newData: T) => {
      await cachingStrategy.cacheData(key, newData, dataType, { tags, customTTL });
      queryClient.setQueryData(queryKey, newData);
    },
    [key, dataType, tags, customTTL, queryClient, queryKey]
  );

  return {
    ...query,
    invalidate,
    updateCache,
  };
}

/**
 * Hook for caching beats data
 */
export function useCachedBeats(
  filters: Record<string, unknown> = {},
  fetcher?: () => Promise<unknown[]>
) {
  const key = `beats-${JSON.stringify(filters)}`;

  return useCaching(key, {
    dataType: DataType.DYNAMIC,
    fetcher,
    tags: ["beats", "music"],
    staleWhileRevalidate: true,
  });
}

/**
 * Hook for caching user data
 */
export function useCachedUserData<T>(userId: string, dataKey: string, fetcher?: () => Promise<T>) {
  const key = `user-${userId}-${dataKey}`;

  return useCaching(key, {
    dataType: DataType.USER_SPECIFIC,
    fetcher,
    tags: ["user", userId],
    staleWhileRevalidate: true,
  });
}

/**
 * Hook for caching media data (waveforms, audio metadata)
 */
export function useCachedMedia<T>(
  mediaId: string,
  mediaType: "waveform" | "metadata" | "thumbnail",
  fetcher?: () => Promise<T>
) {
  const key = `media-${mediaType}-${mediaId}`;

  return useCaching(key, {
    dataType: DataType.MEDIA,
    fetcher,
    tags: ["media", mediaType, mediaId],
    customTTL: 60 * 60 * 1000, // 1 hour for media
  });
}

/**
 * Hook for caching search results
 */
export function useCachedSearch<T>(
  query: string,
  filters: Record<string, unknown> = {},
  fetcher?: () => Promise<T>
) {
  const key = `search-${query}-${JSON.stringify(filters)}`;

  return useCaching(key, {
    dataType: DataType.DYNAMIC,
    fetcher,
    tags: ["search", "beats"],
    customTTL: 2 * 60 * 1000, // 2 minutes for search results
  });
}

/**
 * Hook for caching static data (subscription plans, categories)
 */
export function useCachedStatic<T>(key: string, fetcher?: () => Promise<T>) {
  return useCaching(key, {
    dataType: DataType.STATIC,
    fetcher,
    tags: ["static"],
    customTTL: 24 * 60 * 60 * 1000, // 24 hours for static data
  });
}

/**
 * Hook for cache-aware mutations
 */
export function useCachedMutation<TData, TVariables>(
  mutationFn: (variables: TVariables) => Promise<TData>,
  options: {
    invalidationKeys?: string[];
    invalidationTags?: string[];
    invalidationTrigger?: string;
    optimisticUpdate?: {
      key: string;
      dataType: DataType;
      updater: (variables: TVariables, oldData: unknown) => unknown;
    };
    onSuccess?: (data: TData, variables: TVariables) => void;
    onError?: (error: Error, variables: TVariables) => void;
  } = {}
) {
  const {
    invalidationKeys = [],
    invalidationTags = [],
    invalidationTrigger = "user_action",
    optimisticUpdate,
    onSuccess,
    onError,
  } = options;

  const queryClient = useQueryClient();

  return useMutation({
    mutationFn,
    onMutate: async variables => {
      // Apply optimistic update if provided
      if (optimisticUpdate) {
        const { key, dataType, updater } = optimisticUpdate;
        const queryKey = [dataType, key];

        // Cancel outgoing refetches
        await queryClient.cancelQueries({ queryKey });

        // Snapshot previous value
        const previousData = queryClient.getQueryData(queryKey);

        // Optimistically update
        const newData = updater(variables, previousData);
        queryClient.setQueryData(queryKey, newData);

        // Cache the optimistic update
        await cachingStrategy.cacheData(key, newData, dataType);

        return { previousData, queryKey };
      }

      return undefined;
    },
    onSuccess: async (data, variables, _context) => {
      // Invalidate related cache entries
      await cachingStrategy.invalidateCache(invalidationTrigger, {
        keys: invalidationKeys,
        tags: invalidationTags,
      });

      onSuccess?.(data, variables);
    },
    onError: async (error, variables, context) => {
      // Revert optimistic update on error
      if (context?.previousData && context?.queryKey) {
        queryClient.setQueryData(context.queryKey, context.previousData);
      }

      onError?.(error, variables);
    },
  });
}

/**
 * Hook for cache performance monitoring
 */
export function useCacheMetrics() {
  const queryClient = useQueryClient();

  const metrics = useMemo(() => {
    const performanceMetrics = cachingStrategy.getPerformanceMetrics();
    const queryCache = queryClient.getQueryCache();
    const queries = queryCache.getAll();

    return {
      ...performanceMetrics,
      totalQueries: queries.length,
      staleQueries: queries.filter(q => q.isStale()).length,
      errorQueries: queries.filter(q => q.state.status === "error").length,
      loadingQueries: queries.filter(q => q.state.status === "pending").length,
    };
  }, [queryClient]);

  const clearCache = useCallback(async () => {
    await cachingStrategy.invalidateCache("manual_clear");
    queryClient.clear();
  }, [queryClient]);

  const optimizeCache = useCallback(async () => {
    await cachingStrategy.optimizeCache();
  }, []);

  return {
    metrics,
    clearCache,
    optimizeCache,
  };
}

/**
 * Hook for cache warming on component mount
 */
export function useCacheWarming(
  warmingData: Array<{
    key: string;
    dataType: DataType;
    fetcher: () => Promise<unknown>;
    priority?: "high" | "medium" | "low";
  }>
) {
  useEffect(() => {
    const warmCache = async () => {
      // Sort by priority using toSorted to avoid mutation
      const sortedData = [...warmingData].toSorted((a, b) => {
        const priorityOrder = { high: 0, medium: 1, low: 2 };
        return priorityOrder[a.priority || "medium"] - priorityOrder[b.priority || "medium"];
      });

      // Warm cache in batches to avoid overwhelming the system
      const batchSize = 3;
      for (let i = 0; i < sortedData.length; i += batchSize) {
        const batch = sortedData.slice(i, i + batchSize);

        await Promise.allSettled(
          batch.map(async ({ key, dataType, fetcher }) => {
            try {
              const data = await fetcher();
              await cachingStrategy.cacheData(key, data, dataType);
            } catch (error) {
              console.warn(`Failed to warm cache for ${key}:`, error);
            }
          })
        );

        // Small delay between batches
        if (i + batchSize < sortedData.length) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
    };

    // Start warming after a short delay to not block initial render
    const timer = setTimeout(warmCache, 500);
    return () => clearTimeout(timer);
  }, [warmingData]);
}

// Helper function to get stale time based on data type
function getStaleTimeForDataType(dataType: DataType): number {
  switch (dataType) {
    case DataType.STATIC:
      return 24 * 60 * 60 * 1000; // 24 hours
    case DataType.USER_SPECIFIC:
      return 5 * 60 * 1000; // 5 minutes
    case DataType.DYNAMIC:
      return 2 * 60 * 1000; // 2 minutes
    case DataType.REALTIME:
      return 30 * 1000; // 30 seconds
    case DataType.MEDIA:
      return 60 * 60 * 1000; // 1 hour
    case DataType.COMMERCE:
      return 1 * 60 * 1000; // 1 minute
    default:
      return 5 * 60 * 1000; // Default 5 minutes
  }
}

// Export utility functions using re-export syntax
export { DataType, cacheUtils } from "../services/cachingStrategy";
