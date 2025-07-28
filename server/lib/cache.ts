/**
 * Simple in-memory cache system for BroLab
 * In production, consider using Redis for distributed caching
 */

interface CacheItem<T> {
  data: T;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
}

class Cache {
  private store: Map<string, CacheItem<any>> = new Map();
  private maxSize: number = 1000; // Maximum number of items in cache

  /**
   * Set a value in cache
   */
  set<T>(key: string, data: T, ttl: number = 5 * 60 * 1000): void { // Default 5 minutes
    // Clean expired items if cache is full
    if (this.store.size >= this.maxSize) {
      this.cleanup();
    }

    this.store.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
  }

  /**
   * Get a value from cache
   */
  get<T>(key: string): T | null {
    const item = this.store.get(key);
    
    if (!item) {
      return null;
    }

    // Check if item is expired
    if (Date.now() - item.timestamp > item.ttl) {
      this.store.delete(key);
      return null;
    }

    return item.data;
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
    this.store.forEach((item, key) => {
      if (now - item.timestamp > item.ttl) {
        this.store.delete(key);
      }
    });
  }

  /**
   * Get cache statistics
   */
  stats(): {
    size: number;
    maxSize: number;
    hitRate: number;
  } {
    this.cleanup();
    return {
      size: this.store.size,
      maxSize: this.maxSize,
      hitRate: 0 // TODO: Implement hit rate tracking
    };
  }
}

// Create singleton instance
export const cache = new Cache();

// Cache middleware for Express
export function cacheMiddleware(ttl: number = 5 * 60 * 1000) {
  return (req: any, res: any, next: any) => {
    const key = `cache:${req.method}:${req.originalUrl}`;
    
    // Skip cache for non-GET requests
    if (req.method !== 'GET') {
      return next();
    }

    const cached = cache.get(key);
    if (cached) {
      return res.json(cached);
    }

    // Store original send method
    const originalSend = res.json;
    
    // Override send method to cache response
    res.json = function(data: any) {
      cache.set(key, data, ttl);
      return originalSend.call(this, data);
    };

    next();
  };
}

// Cache keys for common data
export const CACHE_KEYS = {
  PRODUCTS: 'products:all',
  CATEGORIES: 'categories:all',
  SUBSCRIPTION_PLANS: 'subscription:plans',
  USER_PROFILE: (userId: number) => `user:profile:${userId}`,
  USER_SUBSCRIPTION: (userId: number) => `user:subscription:${userId}`,
  BEAT_DETAILS: (beatId: number) => `beat:details:${beatId}`,
  WISHLIST: (userId: number) => `wishlist:${userId}`,
  DOWNLOADS: (userId: number) => `downloads:${userId}`
};

// Cache durations
export const CACHE_TTL = {
  SHORT: 1 * 60 * 1000,      // 1 minute
  MEDIUM: 5 * 60 * 1000,     // 5 minutes
  LONG: 15 * 60 * 1000,      // 15 minutes
  VERY_LONG: 60 * 60 * 1000  // 1 hour
}; 