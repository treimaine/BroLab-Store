import type {
  Beat,
  BeatSearchCriteria,
  BeatSummary,
  User,
  UserProfile,
  WaveformData,
} from "../types";
import type { CacheStats } from "../types/system-optimization";
import { cacheManager } from "./cache-manager";

// ================================
// CACHE-SPECIFIC INTERFACES
// ================================

/**
 * Extended cache health statistics
 */
export interface CacheHealthStats extends CacheStats {
  /** Total number of cache hits */
  hits?: number;
  /** Total number of cache misses */
  misses?: number;
  /** Number of cached items (alias for totalEntries) */
  itemCount?: number;
  /** Cache uptime in milliseconds */
  uptime?: number;
}

/**
 * Express request interface for cache middleware
 */
export interface CacheableRequest {
  /** Request method */
  method: string;
  /** Request URL */
  url: string;
  /** Request parameters */
  params: Record<string, string>;
  /** Query parameters */
  query: Record<string, string | string[]>;
  /** Request headers */
  headers: Record<string, string>;
  /** User information if authenticated */
  user?: {
    id: string;
    role: string;
  };
}

/**
 * Express response interface for cache middleware
 */
export interface CacheableResponse {
  /** Set response header */
  setHeader: (name: string, value: string) => void;
  /** Send JSON response */
  json: (data: unknown) => CacheableResponse;
}

/**
 * Express next function for middleware
 */
export type NextFunction = () => void;

/**
 * Cache integration utilities for common use cases
 */

// Cache keys constants
export const CACHE_KEYS = {
  USER_PROFILE: (userId: string) => `user:profile:${userId}`,
  BEATS_LIST: (filters: string) => `beats:list:${filters}`,
  BEAT_DETAILS: (beatId: string) => `beat:details:${beatId}`,
  USER_FAVORITES: (userId: string) => `user:favorites:${userId}`,
  SEARCH_RESULTS: (query: string) => `search:results:${query}`,
  DASHBOARD_ANALYTICS: (userId: string) => `dashboard:analytics:${userId}`,
  SUBSCRIPTION_PLANS: "subscription:plans",
  CART_ITEMS: (userId: string) => `cart:items:${userId}`,
  WAVEFORM_DATA: (beatId: string) => `waveform:data:${beatId}`,
  AUDIO_METADATA: (beatId: string) => `audio:metadata:${beatId}`,
} as const;

// Cache tags for organized invalidation
export const CACHE_TAGS = {
  USER_DATA: "user-data",
  BEATS_DATA: "beats-data",
  SEARCH_DATA: "search-data",
  COMMERCE_DATA: "commerce-data",
  AUDIO_DATA: "audio-data",
  ANALYTICS_DATA: "analytics-data",
} as const;

// TTL constants (in milliseconds)
export const CACHE_TTL = {
  SHORT: 2 * 60 * 1000, // 2 minutes
  MEDIUM: 5 * 60 * 1000, // 5 minutes
  LONG: 15 * 60 * 1000, // 15 minutes
  VERY_LONG: 60 * 60 * 1000, // 1 hour
  PERSISTENT: 24 * 60 * 60 * 1000, // 24 hours
} as const;

/**
 * Cache wrapper for API responses with automatic error handling
 */
export async function cacheApiResponse<T>(
  key: string,
  fetcher: () => Promise<T>,
  options: {
    ttl?: number;
    tags?: string[];
    forceRefresh?: boolean;
  } = {}
): Promise<T> {
  const { ttl = CACHE_TTL.MEDIUM, tags = [], forceRefresh = false } = options;

  try {
    // Check cache first unless forcing refresh
    if (!forceRefresh) {
      const cached = await cacheManager.get<T>(key);
      if (cached !== null) {
        return cached;
      }
    }

    // Fetch fresh data
    const data = await fetcher();

    // Cache the result
    await cacheManager.set(key, data, ttl, tags);

    return data;
  } catch (error) {
    // If fetch fails, try to return stale cache data
    const staleData = await cacheManager.get<T>(key);
    if (staleData !== null) {
      console.warn("Returning stale cache data due to fetch error:", error);
      return staleData;
    }

    throw error;
  }
}

/**
 * Cache user profile data
 */
export async function cacheUserProfile(
  userId: string,
  profileData: User | UserProfile
): Promise<void> {
  const key = CACHE_KEYS.USER_PROFILE(userId);
  await cacheManager.set(key, profileData, CACHE_TTL.LONG, [CACHE_TAGS.USER_DATA]);
}

/**
 * Get cached user profile
 */
export async function getCachedUserProfile(userId: string): Promise<User | UserProfile | null> {
  const key = CACHE_KEYS.USER_PROFILE(userId);
  return await cacheManager.get(key);
}

/**
 * Cache beats list with filters
 */
export async function cacheBeatsData(
  filters: BeatSearchCriteria,
  beatsData: Beat[] | BeatSummary[]
): Promise<void> {
  const filterKey = JSON.stringify(filters);
  const key = CACHE_KEYS.BEATS_LIST(filterKey);
  await cacheManager.set(key, beatsData, CACHE_TTL.MEDIUM, [CACHE_TAGS.BEATS_DATA]);
}

/**
 * Get cached beats data
 */
export async function getCachedBeatsData(
  filters: BeatSearchCriteria
): Promise<Beat[] | BeatSummary[] | null> {
  const filterKey = JSON.stringify(filters);
  const key = CACHE_KEYS.BEATS_LIST(filterKey);
  return await cacheManager.get(key);
}

/**
 * Cache search results
 */
export async function cacheSearchResults(
  query: string,
  results: Beat[] | BeatSummary[]
): Promise<void> {
  const key = CACHE_KEYS.SEARCH_RESULTS(query);
  await cacheManager.set(key, results, CACHE_TTL.SHORT, [CACHE_TAGS.SEARCH_DATA]);
}

/**
 * Get cached search results
 */
export async function getCachedSearchResults(
  query: string
): Promise<Beat[] | BeatSummary[] | null> {
  const key = CACHE_KEYS.SEARCH_RESULTS(query);
  return await cacheManager.get(key);
}

/**
 * Cache waveform data for audio player
 */
export async function cacheWaveformData(beatId: string, waveformData: WaveformData): Promise<void> {
  const key = CACHE_KEYS.WAVEFORM_DATA(beatId);
  await cacheManager.set(key, waveformData, CACHE_TTL.VERY_LONG, [CACHE_TAGS.AUDIO_DATA]);
}

/**
 * Get cached waveform data
 */
export async function getCachedWaveformData(beatId: string): Promise<WaveformData | null> {
  const key = CACHE_KEYS.WAVEFORM_DATA(beatId);
  return await cacheManager.get(key);
}

/**
 * Invalidate user-related cache entries
 */
export async function invalidateUserCache(userId: string): Promise<void> {
  await Promise.all([
    cacheManager.delete(CACHE_KEYS.USER_PROFILE(userId)),
    cacheManager.delete(CACHE_KEYS.USER_FAVORITES(userId)),
    cacheManager.delete(CACHE_KEYS.CART_ITEMS(userId)),
    cacheManager.delete(CACHE_KEYS.DASHBOARD_ANALYTICS(userId)),
    cacheManager.invalidateByTags([CACHE_TAGS.USER_DATA]),
  ]);
}

/**
 * Invalidate beats-related cache entries
 */
export async function invalidateBeatsCache(): Promise<void> {
  await cacheManager.invalidateByTags([CACHE_TAGS.BEATS_DATA, CACHE_TAGS.SEARCH_DATA]);
}

/**
 * Invalidate commerce-related cache entries
 */
export async function invalidateCommerceCache(userId?: string): Promise<void> {
  const promises = [
    cacheManager.invalidateByTags([CACHE_TAGS.COMMERCE_DATA]),
    cacheManager.delete(CACHE_KEYS.SUBSCRIPTION_PLANS),
  ];

  if (userId) {
    promises.push(cacheManager.delete(CACHE_KEYS.CART_ITEMS(userId)));
  }

  await Promise.all(promises);
}

/**
 * Cache middleware for Express.js routes
 */
export function createCacheMiddleware(
  keyGenerator: (req: CacheableRequest) => string,
  options: {
    ttl?: number;
    tags?: string[];
    condition?: (req: CacheableRequest) => boolean;
  } = {}
) {
  const { ttl = CACHE_TTL.MEDIUM, tags = [], condition } = options;

  return async (req: CacheableRequest, res: CacheableResponse, next: NextFunction) => {
    // Skip caching if condition is not met
    if (condition && !condition(req)) {
      return next();
    }

    const key = keyGenerator(req);

    try {
      // Check cache
      const cached = await cacheManager.get(key);
      if (cached !== null) {
        res.setHeader("X-Cache", "HIT");
        return res.json(cached);
      }

      // Store original json method
      const originalJson = res.json;

      // Override json method to cache response
      res.json = function (data: unknown) {
        // Cache the response
        cacheManager.set(key, data, ttl, tags).catch(console.error);

        res.setHeader("X-Cache", "MISS");
        return originalJson.call(this, data);
      };

      next();
    } catch (error) {
      console.error("Cache middleware error:", error);
      next();
    }
  };
}

/**
 * Preload commonly accessed data into cache
 */
export async function preloadCache(): Promise<void> {
  try {
    // This would typically be called during application startup
    console.log("Preloading cache with commonly accessed data...");

    // Example: Preload subscription plans
    // const plans = await fetchSubscriptionPlans();
    // await cacheManager.set(CACHE_KEYS.SUBSCRIPTION_PLANS, plans, CACHE_TTL.VERY_LONG, [CACHE_TAGS.COMMERCE_DATA]);

    console.log("Cache preloading completed");
  } catch (error) {
    console.error("Cache preloading failed:", error);
  }
}

/**
 * Cache health check result
 */
export interface CacheHealthResult {
  /** Whether the cache is healthy */
  healthy: boolean;
  /** Cache statistics */
  stats: CacheHealthStats | null;
  /** List of issues found */
  issues: string[];
}

/**
 * Cache health check
 */
export async function checkCacheHealth(): Promise<CacheHealthResult> {
  try {
    const stats = await cacheManager.getStats();
    const healthStats: CacheHealthStats = {
      ...stats,
      itemCount: stats.totalEntries,
      hits: Math.round((stats.hitRate / 100) * stats.totalEntries),
      misses: Math.round((stats.missRate / 100) * stats.totalEntries),
      uptime: Date.now() - (stats.lastEvictionAt || Date.now()),
    };
    const issues: string[] = [];

    // Check for potential issues
    if (healthStats.hitRate < 50) {
      issues.push("Low cache hit rate (< 50%)");
    }

    if (healthStats.memoryUsage > 0.9 * 50 * 1024 * 1024) {
      // 90% of 50MB
      issues.push("High memory usage (> 90% of limit)");
    }

    if (healthStats.evictionCount > 100) {
      issues.push("High eviction count - consider increasing cache size");
    }

    return {
      healthy: issues.length === 0,
      stats: healthStats,
      issues,
    };
  } catch (error) {
    return {
      healthy: false,
      stats: null,
      issues: [`Cache health check failed: ${error}`],
    };
  }
}
