/**
 * LRU Cache with TTL support for webhook security
 * Used for idempotency checking and IP failure tracking
 *
 * Requirements: 3.2, 3.3 - Idempotency cache with LRU eviction
 */

interface CacheEntry<V> {
  value: V;
  expiresAt: number;
}

export interface LRUCacheConfig {
  maxSize: number;
  defaultTTL: number; // milliseconds
}

/**
 * Generic LRU Cache implementation with TTL support
 * - Maintains insertion order for LRU eviction
 * - Automatically expires entries based on TTL
 * - Evicts oldest entries when max size is reached
 */
export class LRUCache<K, V> {
  private readonly cache: Map<K, CacheEntry<V>>;
  private readonly maxSize: number;
  private readonly defaultTTL: number;

  constructor(config: LRUCacheConfig) {
    this.cache = new Map();
    this.maxSize = config.maxSize;
    this.defaultTTL = config.defaultTTL;
  }

  /**
   * Get a value from the cache
   * Returns undefined if key doesn't exist or has expired
   * Moves accessed key to end (most recently used)
   */
  get(key: K): V | undefined {
    const entry = this.cache.get(key);

    if (!entry) {
      return undefined;
    }

    // Check if entry has expired
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return undefined;
    }

    // Move to end (most recently used) by re-inserting
    this.cache.delete(key);
    this.cache.set(key, entry);

    return entry.value;
  }

  /**
   * Set a value in the cache with optional custom TTL
   * Evicts oldest entry if max size is reached
   */
  set(key: K, value: V, ttl?: number): void {
    // If key exists, delete it first to update position
    if (this.cache.has(key)) {
      this.cache.delete(key);
    }

    // Evict oldest entry if at max size
    if (this.cache.size >= this.maxSize) {
      this.evictOldest();
    }

    const expiresAt = Date.now() + (ttl ?? this.defaultTTL);
    this.cache.set(key, { value, expiresAt });
  }

  /**
   * Check if a key exists and is not expired
   */
  has(key: K): boolean {
    const entry = this.cache.get(key);

    if (!entry) {
      return false;
    }

    // Check if entry has expired
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  /**
   * Delete a key from the cache
   * Returns true if key existed and was deleted
   */
  delete(key: K): boolean {
    return this.cache.delete(key);
  }

  /**
   * Clear all entries from the cache
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get the current number of entries in the cache
   * Note: May include expired entries until they are accessed
   */
  get size(): number {
    return this.cache.size;
  }

  /**
   * Evict the oldest (least recently used) entry
   * Map maintains insertion order, so first key is oldest
   */
  private evictOldest(): void {
    const oldestKey = this.cache.keys().next().value;
    if (oldestKey !== undefined) {
      this.cache.delete(oldestKey);
    }
  }

  /**
   * Clean up expired entries
   * Useful for periodic maintenance
   */
  cleanup(): number {
    const now = Date.now();
    let removed = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
        removed++;
      }
    }

    return removed;
  }
}
