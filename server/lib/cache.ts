/**
 * Simple in-memory cache system for BroLab
 * In production, consider using Redis for distributed caching
 */

interface CacheItem<T = unknown> {
  data: T;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
  accessCount: number;
  lastAccessed: number;
  size: number;
  tags?: string[];
}

interface CacheStats {
  totalEntries: number;
  totalSize: number;
  hitRate: number;
  missRate: number;
  evictionCount: number;
  lastEvictionAt?: number;
  memoryUsage: number;
}

class Cache {
  private store: Map<string, CacheItem> = new Map();
  private maxSize: number = 1000; // Maximum number of items in cache
  private maxMemorySize: number = 100 * 1024 * 1024; // 100MB
  private hitCount: number = 0;
  private missCount: number = 0;
  private evictionCount: number = 0;
  private lastEvictionAt?: number;

  /**
   * Set a value in cache
   */
  set<T>(key: string, data: T, ttl: number = 5 * 60 * 1000, tags?: string[]): void {
    // Default 5 minutes
    // Clean expired items if cache is full
    if (this.store.size >= this.maxSize) {
      this.cleanup();
    }

    const size = this.calculateSize(data);
    const now = Date.now();

    this.store.set(key, {
      data,
      timestamp: now,
      ttl,
      accessCount: 0,
      lastAccessed: now,
      size,
      tags,
    });
  }

  /**
   * Get a value from cache
   */
  get<T>(key: string): T | null {
    const item = this.store.get(key);

    if (!item) {
      this.missCount++;
      return null;
    }

    // Check if item is expired
    if (Date.now() - item.timestamp > item.ttl) {
      this.store.delete(key);
      this.missCount++;
      return null;
    }

    // Update access tracking
    item.accessCount++;
    item.lastAccessed = Date.now();
    this.hitCount++;

    return item.data as T;
  }

  /**
   * Check if a key exists and is not expired
   */
  has(key: string): boolean {
    return this.get(key) !== null;
  }

  /**
   * Delete a key from cache
   */
  delete(key: string): boolean {
    return this.store.delete(key);
  }

  /**
   * Clear all cache
   */
  clear(): void {
    this.store.clear();
  }

  /**
   * Get cache size
   */
  size(): number {
    this.cleanup(); // Clean expired items first
    return this.store.size;
  }

  /**
   * Clean expired items
   */
  private cleanup(): void {
    const now = Date.now();
    let evicted = 0;

    this.store.forEach((item, key) => {
      if (now - item.timestamp > item.ttl) {
        this.store.delete(key);
        evicted++;
      }
    });

    if (evicted > 0) {
      this.evictionCount += evicted;
      this.lastEvictionAt = now;
    }
  }

  /**
   * Calculate approximate size of data in bytes
   */
  private calculateSize(data: unknown): number {
    try {
      return JSON.stringify(data).length * 2; // Rough estimate (UTF-16)
    } catch {
      return 1024; // Default size if can't serialize
    }
  }

  /**
   * Get cache statistics
   */
  stats(): CacheStats {
    this.cleanup();

    const totalRequests = this.hitCount + this.missCount;
    const hitRate = totalRequests > 0 ? this.hitCount / totalRequests : 0;
    const missRate = totalRequests > 0 ? this.missCount / totalRequests : 0;

    let totalSize = 0;
    this.store.forEach(item => {
      totalSize += item.size;
    });

    return {
      totalEntries: this.store.size,
      totalSize,
      hitRate,
      missRate,
      evictionCount: this.evictionCount,
      lastEvictionAt: this.lastEvictionAt,
      memoryUsage: totalSize / this.maxMemorySize,
    };
  }

  /**
   * Invalidate cache entries by pattern
   */
  invalidate(pattern: string): number {
    const regex = new RegExp(pattern.replace(/\*/g, ".*"));
    let deleted = 0;

    this.store.forEach((_, key) => {
      if (regex.test(key)) {
        this.store.delete(key);
        deleted++;
      }
    });

    return deleted;
  }

  /**
   * Invalidate cache entries by tags
   */
  invalidateByTags(tags: string[]): number {
    let deleted = 0;

    this.store.forEach((item, key) => {
      if (item.tags && item.tags.some(tag => tags.includes(tag))) {
        this.store.delete(key);
        deleted++;
      }
    });

    return deleted;
  }

  /**
   * Check if key exists without affecting access stats
   */
  exists(key: string): boolean {
    const item = this.store.get(key);
    if (!item) return false;

    // Check if expired
    if (Date.now() - item.timestamp > item.ttl) {
      this.store.delete(key);
      return false;
    }

    return true;
  }

  /**
   * Update TTL for existing key
   */
  touch(key: string, ttl?: number): boolean {
    const item = this.store.get(key);
    if (!item) return false;

    // Check if expired
    if (Date.now() - item.timestamp > item.ttl) {
      this.store.delete(key);
      return false;
    }

    if (ttl !== undefined) {
      item.ttl = ttl;
    }
    item.lastAccessed = Date.now();

    return true;
  }
}

// Create singleton instance
export const cache = new Cache();

// Cache middleware for Express
import { NextFunction, Request, Response } from "express";

export function cacheMiddleware(
  options: {
    ttl?: number;
    keyGenerator?: (req: Request) => string;
    condition?: (req: Request) => boolean;
    tags?: string[];
    varyBy?: string[];
  } = {}
) {
  const { ttl = 5 * 60 * 1000, keyGenerator, condition, tags = [], varyBy = [] } = options;

  return (req: Request, res: Response, next: NextFunction) => {
    // Skip cache for non-GET requests
    if (req.method !== "GET") {
      return next();
    }

    // Check condition if provided
    if (condition && !condition(req)) {
      return next();
    }

    // Generate cache key
    let key: string;
    if (keyGenerator) {
      key = keyGenerator(req);
    } else {
      const varyParams = varyBy.map(param => req.get(param) || req.query[param] || "").join(":");
      key = `cache:${req.method}:${req.originalUrl}${varyParams ? ":" + varyParams : ""}`;
    }

    const cached = cache.get(key);
    if (cached) {
      res.setHeader("X-Cache", "HIT");
      res.setHeader("X-Cache-Key", key);
      return res.json(cached);
    }

    // Store original send method
    const originalSend = res.json;

    // Override send method to cache response
    res.json = function (data: unknown) {
      // Only cache successful responses
      if (res.statusCode >= 200 && res.statusCode < 300) {
        cache.set(key, data, ttl, tags);
        res.setHeader("X-Cache", "MISS");
        res.setHeader("X-Cache-Key", key);
      }
      return originalSend.call(this, data);
    };

    next();
  };
}

// Cache durations
export const CACHE_TTL = {
  SHORT: 1 * 60 * 1000, // 1 minute
  MEDIUM: 5 * 60 * 1000, // 5 minutes
  LONG: 15 * 60 * 1000, // 15 minutes
  VERY_LONG: 60 * 60 * 1000, // 1 hour
};

// Cache keys for common data
export const CACHE_KEYS = {
  PRODUCTS: "products:all",
  CATEGORIES: "categories:all",
  SUBSCRIPTION_PLANS: "subscription:plans",
  USER_PROFILE: (userId: string) => `user:profile:${userId}`,
  USER_SUBSCRIPTION: (userId: string) => `user:subscription:${userId}`,
  BEAT_DETAILS: (beatId: string) => `beat:details:${beatId}`,
  WISHLIST: (userId: string) => `wishlist:${userId}`,
  DOWNLOADS: (userId: string) => `downloads:${userId}`,
};

// Specialized middleware for different data types
export const cacheMiddlewares = {
  // Static data (subscription plans, categories)
  static: cacheMiddleware({
    ttl: CACHE_TTL.VERY_LONG,
    tags: ["static"],
    condition: req => !req.headers.authorization, // Don't cache authenticated requests
  }),

  // User-specific data
  userSpecific: (userId?: string) =>
    cacheMiddleware({
      ttl: CACHE_TTL.MEDIUM,
      keyGenerator: req => `user:${userId || req.user?.id}:${req.originalUrl}`,
      tags: ["user", userId || "unknown"],
      condition: req => !!req.user,
    }),

  // Dynamic content (beats, search results)
  dynamic: cacheMiddleware({
    ttl: CACHE_TTL.SHORT,
    tags: ["dynamic"],
    varyBy: ["accept-language", "user-agent"],
  }),

  // API responses
  api: cacheMiddleware({
    ttl: CACHE_TTL.MEDIUM,
    keyGenerator: req => `api:${req.originalUrl}:${JSON.stringify(req.query)}`,
    tags: ["api"],
  }),
};
