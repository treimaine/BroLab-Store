/**
 * Comprehensive Caching Strategy Service for BroLab Entertainment
 *
 * This service implements a multi-layered caching strategy:
 * 1. Browser Cache (HTTP headers)
 * 2. TanStack Query Cache (React Query)
 * 3. Application Cache (In-memory)
 * 4. Service Worker Cache (PWA)
 * 5. CDN Cache (Static assets)
 */

import { cacheManager } from "@shared/utils/cache-manager";
import { QueryClient } from "@tanstack/react-query";
import { queryClient } from "../lib/queryClient";

// Cache strategy types
export type CacheStrategy = "aggressive" | "balanced" | "conservative" | "realtime";

// Cache layer priorities
export enum CacheLayer {
  BROWSER = 1,
  QUERY_CACHE = 2,
  APP_CACHE = 3,
  SERVICE_WORKER = 4,
  CDN = 5,
}

// Data type classifications for caching
export enum DataType {
  STATIC = "static", // Rarely changes (subscription plans, site config)
  USER_SPECIFIC = "user", // User profile, preferences, favorites
  DYNAMIC = "dynamic", // Beats list, search results
  REALTIME = "realtime", // Live data, notifications
  MEDIA = "media", // Audio files, waveforms, images
  COMMERCE = "commerce", // Cart, orders, payments
}

// Cache configuration per data type
const CACHE_STRATEGIES: Record<
  DataType,
  {
    strategy: CacheStrategy;
    layers: CacheLayer[];
    ttl: {
      browser: number;
      query: number;
      app: number;
    };
    invalidationTriggers: string[];
  }
> = {
  [DataType.STATIC]: {
    strategy: "aggressive",
    layers: [CacheLayer.CDN, CacheLayer.BROWSER, CacheLayer.QUERY_CACHE, CacheLayer.APP_CACHE],
    ttl: {
      browser: 24 * 60 * 60 * 1000, // 24 hours
      query: 24 * 60 * 60 * 1000, // 24 hours
      app: 60 * 60 * 1000, // 1 hour
    },
    invalidationTriggers: ["admin_update", "deployment"],
  },
  [DataType.USER_SPECIFIC]: {
    strategy: "balanced",
    layers: [CacheLayer.QUERY_CACHE, CacheLayer.APP_CACHE],
    ttl: {
      browser: 5 * 60 * 1000, // 5 minutes
      query: 10 * 60 * 1000, // 10 minutes
      app: 5 * 60 * 1000, // 5 minutes
    },
    invalidationTriggers: ["user_action", "profile_update", "subscription_change"],
  },
  [DataType.DYNAMIC]: {
    strategy: "balanced",
    layers: [CacheLayer.QUERY_CACHE, CacheLayer.APP_CACHE],
    ttl: {
      browser: 2 * 60 * 1000, // 2 minutes
      query: 5 * 60 * 1000, // 5 minutes
      app: 2 * 60 * 1000, // 2 minutes
    },
    invalidationTriggers: ["content_update", "filter_change", "search_update"],
  },
  [DataType.REALTIME]: {
    strategy: "realtime",
    layers: [CacheLayer.QUERY_CACHE],
    ttl: {
      browser: 0, // No browser cache
      query: 30 * 1000, // 30 seconds
      app: 10 * 1000, // 10 seconds
    },
    invalidationTriggers: ["realtime_update", "websocket_message"],
  },
  [DataType.MEDIA]: {
    strategy: "aggressive",
    layers: [CacheLayer.CDN, CacheLayer.BROWSER, CacheLayer.SERVICE_WORKER, CacheLayer.APP_CACHE],
    ttl: {
      browser: 7 * 24 * 60 * 60 * 1000, // 7 days
      query: 60 * 60 * 1000, // 1 hour
      app: 30 * 60 * 1000, // 30 minutes
    },
    invalidationTriggers: ["media_update", "beat_update"],
  },
  [DataType.COMMERCE]: {
    strategy: "conservative",
    layers: [CacheLayer.QUERY_CACHE],
    ttl: {
      browser: 1 * 60 * 1000, // 1 minute
      query: 2 * 60 * 1000, // 2 minutes
      app: 1 * 60 * 1000, // 1 minute
    },
    invalidationTriggers: ["cart_update", "order_placed", "payment_processed"],
  },
};

/**
 * Comprehensive Caching Strategy Service
 */
export class CachingStrategyService {
  private readonly queryClient: QueryClient;
  private readonly performanceMetrics: Map<string, number> = new Map();
  private serviceWorkerInitialized = false;

  constructor(queryClient: QueryClient) {
    this.queryClient = queryClient;
  }

  /**
   * Initialize service worker cache - call this after construction
   */
  async initialize(): Promise<void> {
    if (!this.serviceWorkerInitialized) {
      await this.initializeServiceWorkerCache();
      this.serviceWorkerInitialized = true;
    }
  }

  /**
   * Cache data with appropriate strategy based on data type
   */
  async cacheData<T>(
    key: string,
    data: T,
    dataType: DataType,
    options: {
      tags?: string[];
      customTTL?: number;
      forceRefresh?: boolean;
    } = {}
  ): Promise<void> {
    const strategy = CACHE_STRATEGIES[dataType];
    const { tags = [], customTTL, forceRefresh: _forceRefresh = false } = options;

    const startTime = performance.now();

    try {
      // Cache in TanStack Query
      if (strategy.layers.includes(CacheLayer.QUERY_CACHE)) {
        const queryTTL = customTTL || strategy.ttl.query;
        this.queryClient.setQueryData([dataType, key], data);

        // Set query options for future fetches
        this.queryClient.setQueryDefaults([dataType, key], {
          staleTime: queryTTL,
          gcTime: queryTTL * 2,
        });
      }

      // Cache in application cache
      if (strategy.layers.includes(CacheLayer.APP_CACHE)) {
        const appTTL = customTTL || strategy.ttl.app;
        await cacheManager.set(`${dataType}:${key}`, data, appTTL, [
          ...tags,
          dataType,
          ...strategy.invalidationTriggers,
        ]);
      }

      // Cache in Service Worker (for offline support)
      if (strategy.layers.includes(CacheLayer.SERVICE_WORKER)) {
        await this.cacheInServiceWorker(key, data, dataType);
      }

      const endTime = performance.now();
      this.performanceMetrics.set(`cache_${dataType}`, endTime - startTime);
    } catch (error) {
      console.error(`Failed to cache data for ${dataType}:${key}`, error);
      throw error;
    }
  }

  /**
   * Retrieve cached data with fallback strategy
   */
  async getCachedData<T>(
    key: string,
    dataType: DataType,
    fetcher?: () => Promise<T>
  ): Promise<T | null> {
    const strategy = CACHE_STRATEGIES[dataType];
    const startTime = performance.now();

    try {
      // Try TanStack Query cache first
      if (strategy.layers.includes(CacheLayer.QUERY_CACHE)) {
        const queryData = this.queryClient.getQueryData<T>([dataType, key]);
        if (queryData !== undefined) {
          this.recordCacheHit("query_cache", dataType);
          return queryData;
        }
      }

      // Try application cache
      if (strategy.layers.includes(CacheLayer.APP_CACHE)) {
        const appData = await cacheManager.get<T>(`${dataType}:${key}`);
        if (appData !== null) {
          this.recordCacheHit("app_cache", dataType);
          // Populate query cache for next time
          if (strategy.layers.includes(CacheLayer.QUERY_CACHE)) {
            this.queryClient.setQueryData([dataType, key], appData);
          }
          return appData;
        }
      }

      // Try Service Worker cache
      if (strategy.layers.includes(CacheLayer.SERVICE_WORKER)) {
        const swData = await this.getFromServiceWorker<T>(key, dataType);
        if (swData !== null) {
          this.recordCacheHit("service_worker", dataType);
          return swData;
        }
      }

      // If no cache hit and fetcher provided, fetch and cache
      if (fetcher) {
        const freshData = await fetcher();
        await this.cacheData(key, freshData, dataType);
        return freshData;
      }

      this.recordCacheMiss(dataType);
      return null;
    } catch (error) {
      console.error(`Failed to get cached data for ${dataType}:${key}`, error);
      return null;
    } finally {
      const endTime = performance.now();
      this.performanceMetrics.set(`get_${dataType}`, endTime - startTime);
    }
  }

  /**
   * Invalidate cache based on triggers
   */
  async invalidateCache(
    trigger: string,
    options: {
      dataTypes?: DataType[];
      keys?: string[];
      tags?: string[];
    } = {}
  ): Promise<void> {
    const { dataTypes, keys, tags } = options;

    try {
      // Invalidate by data types
      if (dataTypes) {
        for (const dataType of dataTypes) {
          const strategy = CACHE_STRATEGIES[dataType];

          if (strategy.invalidationTriggers.includes(trigger)) {
            // Invalidate TanStack Query cache
            await this.queryClient.invalidateQueries({ queryKey: [dataType] });

            // Invalidate application cache by tags
            await cacheManager.invalidateByTags([dataType]);
          }
        }
      }

      // Invalidate specific keys
      if (keys) {
        for (const key of keys) {
          await this.queryClient.invalidateQueries({ queryKey: [key] });
          await cacheManager.delete(key);
        }
      }

      // Invalidate by tags
      if (tags) {
        await cacheManager.invalidateByTags(tags);

        // Invalidate related queries
        for (const tag of tags) {
          await this.queryClient.invalidateQueries({
            predicate: query =>
              query.queryKey.some(key => typeof key === "string" && key.includes(tag)),
          });
        }
      }
    } catch (error) {
      console.error("Failed to invalidate cache:", error);
      throw error;
    }
  }

  /**
   * Preload critical data for better UX
   */
  async preloadCriticalData(): Promise<void> {
    try {
      const criticalData = [
        { key: "subscription-plans", dataType: DataType.STATIC },
        { key: "featured-beats", dataType: DataType.DYNAMIC },
        { key: "categories", dataType: DataType.STATIC },
      ];

      await Promise.all(
        criticalData.map(async ({ key, dataType }) => {
          // Only preload if not already cached
          const cached = await this.getCachedData(key, dataType);
          if (!cached) {
            // In a real implementation, you'd call the actual API
            if (import.meta.env.DEV) {
              console.log(`Preloading ${key} for ${dataType}`);
            }
          }
        })
      );
    } catch (error) {
      console.warn("Failed to preload critical data:", error);
    }
  }

  /**
   * Get cache performance metrics
   */
  getPerformanceMetrics(): {
    cacheHitRate: number;
    averageResponseTime: number;
    cacheSize: number;
    totalQueries: number;
    cacheHits: number;
    cacheMisses: number;
    metrics: Record<string, number>;
  } {
    const metrics = Object.fromEntries(this.performanceMetrics);
    const { hits, misses } = this.calculateHitMissCounts();

    return {
      cacheHitRate: this.calculateHitRate(),
      averageResponseTime: this.calculateAverageResponseTime(),
      cacheSize: this.queryClient.getQueryCache().getAll().length,
      totalQueries: hits + misses,
      cacheHits: hits,
      cacheMisses: misses,
      metrics,
    };
  }

  /**
   * Optimize cache based on usage patterns
   */
  async optimizeCache(): Promise<void> {
    try {
      // Clean up expired entries
      await cacheManager.cleanup();

      // Remove least recently used queries if cache is too large
      const queries = this.queryClient.getQueryCache().getAll();
      if (queries.length > 1000) {
        const sortedQueries = queries
          .toSorted((a, b) => (a.state.dataUpdatedAt || 0) - (b.state.dataUpdatedAt || 0))
          .slice(0, 200); // Remove oldest 200 queries

        sortedQueries.forEach(query => {
          this.queryClient.removeQueries({ queryKey: query.queryKey });
        });
      }

      // Prefetch frequently accessed data
      await this.preloadCriticalData();
    } catch (error) {
      console.error("Cache optimization failed:", error);
    }
  }

  // Private helper methods

  private async initializeServiceWorkerCache(): Promise<void> {
    if ("serviceWorker" in navigator && "caches" in globalThis) {
      try {
        await caches.open("brolab-cache-v1");
      } catch (error) {
        console.warn("Service Worker cache initialization failed:", error);
      }
    }
  }

  private async cacheInServiceWorker<T>(key: string, data: T, dataType: DataType): Promise<void> {
    if ("caches" in globalThis) {
      try {
        const cache = await caches.open("brolab-cache-v1");
        const response = new Response(JSON.stringify(data), {
          headers: { "Content-Type": "application/json" },
        });
        await cache.put(`/cache/${dataType}/${key}`, response);
      } catch (error) {
        console.warn("Service Worker caching failed:", error);
      }
    }
  }

  private async getFromServiceWorker<T>(key: string, dataType: DataType): Promise<T | null> {
    if ("caches" in globalThis) {
      try {
        const cache = await caches.open("brolab-cache-v1");
        const response = await cache.match(`/cache/${dataType}/${key}`);
        if (response) {
          return await response.json();
        }
      } catch (error) {
        console.warn("Service Worker cache retrieval failed:", error);
      }
    }
    return null;
  }

  private recordCacheHit(layer: string, dataType: DataType): void {
    const key = `hit_${layer}_${dataType}`;
    const current = this.performanceMetrics.get(key) || 0;
    this.performanceMetrics.set(key, current + 1);
  }

  private recordCacheMiss(dataType: DataType): void {
    const key = `miss_${dataType}`;
    const current = this.performanceMetrics.get(key) || 0;
    this.performanceMetrics.set(key, current + 1);
  }

  private calculateHitMissCounts(): { hits: number; misses: number } {
    let hits = 0;
    let misses = 0;

    for (const [key, value] of this.performanceMetrics.entries()) {
      if (key.startsWith("hit_")) {
        hits += value;
      } else if (key.startsWith("miss_")) {
        misses += value;
      }
    }

    return { hits, misses };
  }

  private calculateHitRate(): number {
    const { hits, misses } = this.calculateHitMissCounts();
    const total = hits + misses;
    return total > 0 ? (hits / total) * 100 : 0;
  }

  private calculateAverageResponseTime(): number {
    const responseTimes: number[] = [];

    for (const [key, value] of this.performanceMetrics.entries()) {
      if (key.startsWith("get_") || key.startsWith("cache_")) {
        responseTimes.push(value);
      }
    }

    return responseTimes.length > 0
      ? responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length
      : 0;
  }
}

// Export singleton instance
export const cachingStrategy = new CachingStrategyService(queryClient);

// Export utilities for easy use in components
export const cacheUtils = {
  // Cache beats data
  cacheBeats: (key: string, data: unknown, options?: { tags?: string[] }) =>
    cachingStrategy.cacheData(key, data, DataType.DYNAMIC, options),

  // Cache user data
  cacheUserData: (key: string, data: unknown, options?: { tags?: string[] }) =>
    cachingStrategy.cacheData(key, data, DataType.USER_SPECIFIC, options),

  // Cache media data
  cacheMedia: (key: string, data: unknown, options?: { tags?: string[] }) =>
    cachingStrategy.cacheData(key, data, DataType.MEDIA, options),

  // Get cached data with fallback
  getCached: <T>(key: string, dataType: DataType, fetcher?: () => Promise<T>) =>
    cachingStrategy.getCachedData<T>(key, dataType, fetcher),

  // Invalidate user-related cache
  invalidateUserCache: () =>
    cachingStrategy.invalidateCache("user_action", {
      dataTypes: [DataType.USER_SPECIFIC, DataType.COMMERCE],
    }),

  // Invalidate beats cache
  invalidateBeatsCache: () =>
    cachingStrategy.invalidateCache("content_update", {
      dataTypes: [DataType.DYNAMIC],
    }),
};
