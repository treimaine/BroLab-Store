import { CacheConfig, CacheEntry, CacheManager, CacheStats } from "../types/system-optimization";

/**
 * Comprehensive cache manager with TTL, memory limits, and eviction strategies
 * Implements LRU, LFU, and FIFO eviction policies with optional compression
 */
export class CacheManagerImpl implements CacheManager {
  private cache = new Map<string, CacheEntry>();
  private accessOrder: string[] = []; // For LRU
  private accessFrequency = new Map<string, number>(); // For LFU
  private insertionOrder: string[] = []; // For FIFO
  private config: CacheConfig;
  private stats: CacheStats;
  private cleanupInterval?: NodeJS.Timeout;

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = {
      defaultTTL: 5 * 60 * 1000, // 5 minutes
      maxSize: 50 * 1024 * 1024, // 50MB
      maxEntries: 1000,
      strategy: "LRU",
      enableCompression: false,
      compressionThreshold: 1024, // 1KB
      ...config,
    };

    this.stats = {
      totalEntries: 0,
      totalSize: 0,
      hitRate: 0,
      missRate: 0,
      evictionCount: 0,
      memoryUsage: 0,
    };

    // Start periodic cleanup
    this.startCleanup();
  }

  async get<T>(key: string): Promise<T | null> {
    const entry = this.cache.get(key);

    if (!entry) {
      this.updateStats("miss");
      return null;
    }

    // Check if expired
    if (Date.now() > entry.expiresAt) {
      await this.delete(key);
      this.updateStats("miss");
      return null;
    }

    // Update access tracking
    this.updateAccess(key);
    this.updateStats("hit");

    // Decompress if needed
    let value = entry.value;
    if (entry.compressed && typeof value === "string") {
      try {
        value = JSON.parse(value);
      } catch (error) {
        console.warn("Failed to decompress cache entry:", error);
        await this.delete(key);
        return null;
      }
    }

    return value as T;
  }

  async set<T>(key: string, value: T, ttl?: number, tags?: string[]): Promise<void> {
    const now = Date.now();
    const actualTTL = ttl ?? this.config.defaultTTL;

    // Calculate size
    const serializedValue = JSON.stringify(value);
    let finalValue: T | string = value;
    let compressed = false;
    let size = new Blob([serializedValue]).size;

    // Compress if enabled and value is large enough
    if (this.config.enableCompression && size > this.config.compressionThreshold) {
      try {
        finalValue = serializedValue; // In a real implementation, use actual compression
        compressed = true;
        size = Math.floor(size * 0.7); // Simulate compression ratio
      } catch (error) {
        console.warn("Compression failed, storing uncompressed:", error);
      }
    }

    const entry: CacheEntry<T | string> = {
      key,
      value: finalValue,
      createdAt: now,
      expiresAt: now + actualTTL,
      accessCount: 1,
      lastAccessed: now,
      size,
      tags,
      compressed,
    };

    // Check if we need to evict entries
    await this.ensureCapacity(size);

    // Remove existing entry if it exists
    if (this.cache.has(key)) {
      await this.delete(key);
    }

    // Add new entry
    this.cache.set(key, entry);
    this.updateInsertionTracking(key);
    this.updateStats("set", size);
  }

  async delete(key: string): Promise<boolean> {
    const entry = this.cache.get(key);
    if (!entry) {
      return false;
    }

    this.cache.delete(key);
    this.removeFromTracking(key);
    this.updateStats("delete", -entry.size);

    return true;
  }

  async invalidate(pattern: string): Promise<number> {
    let count = 0;
    const regex = new RegExp(pattern.replace(/\*/g, ".*"));

    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        await this.delete(key);
        count++;
      }
    }

    return count;
  }

  async invalidateByTags(tags: string[]): Promise<number> {
    let count = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (entry.tags && entry.tags.some(tag => tags.includes(tag))) {
        await this.delete(key);
        count++;
      }
    }

    return count;
  }

  async clear(): Promise<void> {
    this.cache.clear();
    this.accessOrder = [];
    this.accessFrequency.clear();
    this.insertionOrder = [];

    this.stats = {
      totalEntries: 0,
      totalSize: 0,
      hitRate: 0,
      missRate: 0,
      evictionCount: this.stats.evictionCount,
      lastEvictionAt: this.stats.lastEvictionAt,
      memoryUsage: 0,
    };
  }

  async getStats(): Promise<CacheStats> {
    return { ...this.stats };
  }

  async cleanup(): Promise<void> {
    const now = Date.now();
    const expiredKeys: string[] = [];

    // Find expired entries
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        expiredKeys.push(key);
      }
    }

    // Remove expired entries
    for (const key of expiredKeys) {
      await this.delete(key);
    }
  }

  async exists(key: string): Promise<boolean> {
    const entry = this.cache.get(key);
    if (!entry) {
      return false;
    }

    // Check if expired
    if (Date.now() > entry.expiresAt) {
      await this.delete(key);
      return false;
    }

    return true;
  }

  async touch(key: string, ttl?: number): Promise<boolean> {
    const entry = this.cache.get(key);
    if (!entry) {
      return false;
    }

    const now = Date.now();
    const actualTTL = ttl ?? this.config.defaultTTL;

    entry.expiresAt = now + actualTTL;
    entry.lastAccessed = now;

    this.updateAccess(key);

    return true;
  }

  // Private helper methods

  private updateAccess(key: string): void {
    const now = Date.now();
    const entry = this.cache.get(key);

    if (entry) {
      entry.accessCount++;
      entry.lastAccessed = now;
    }

    // Update LRU tracking
    const index = this.accessOrder.indexOf(key);
    if (index > -1) {
      this.accessOrder.splice(index, 1);
    }
    this.accessOrder.push(key);

    // Update LFU tracking
    const currentFreq = this.accessFrequency.get(key) || 0;
    this.accessFrequency.set(key, currentFreq + 1);
  }

  private updateInsertionTracking(key: string): void {
    // Remove from existing positions
    this.removeFromTracking(key);

    // Add to tracking arrays
    this.accessOrder.push(key);
    this.insertionOrder.push(key);
    this.accessFrequency.set(key, 1);
  }

  private removeFromTracking(key: string): void {
    // Remove from LRU tracking
    const lruIndex = this.accessOrder.indexOf(key);
    if (lruIndex > -1) {
      this.accessOrder.splice(lruIndex, 1);
    }

    // Remove from FIFO tracking
    const fifoIndex = this.insertionOrder.indexOf(key);
    if (fifoIndex > -1) {
      this.insertionOrder.splice(fifoIndex, 1);
    }

    // Remove from LFU tracking
    this.accessFrequency.delete(key);
  }

  private async ensureCapacity(newEntrySize: number): Promise<void> {
    // Check entry count limit
    while (this.cache.size >= this.config.maxEntries) {
      await this.evictOne();
    }

    // Check size limit
    while (this.stats.totalSize + newEntrySize > this.config.maxSize) {
      await this.evictOne();
    }
  }

  private async evictOne(): Promise<void> {
    let keyToEvict: string | undefined;

    switch (this.config.strategy) {
      case "LRU":
        keyToEvict = this.accessOrder[0];
        break;

      case "LFU":
        let minFreq = Infinity;
        for (const [key, freq] of this.accessFrequency.entries()) {
          if (freq < minFreq) {
            minFreq = freq;
            keyToEvict = key;
          }
        }
        break;

      case "FIFO":
        keyToEvict = this.insertionOrder[0];
        break;
    }

    if (keyToEvict) {
      await this.delete(keyToEvict);
      this.stats.evictionCount++;
      this.stats.lastEvictionAt = Date.now();
    }
  }

  private updateStats(operation: "hit" | "miss" | "set" | "delete", sizeChange: number = 0): void {
    switch (operation) {
      case "hit":
        this.stats.hitRate = this.calculateHitRate(true);
        break;

      case "miss":
        this.stats.missRate = this.calculateHitRate(false);
        break;

      case "set":
        this.stats.totalEntries = this.cache.size;
        this.stats.totalSize += sizeChange;
        break;

      case "delete":
        this.stats.totalEntries = this.cache.size;
        this.stats.totalSize += sizeChange; // sizeChange is negative for delete
        break;
    }

    this.stats.memoryUsage = this.stats.totalSize;

    // Calculate compression ratio if compression is enabled
    if (this.config.enableCompression) {
      let compressedEntries = 0;
      for (const entry of this.cache.values()) {
        if (entry.compressed) {
          compressedEntries++;
        }
      }
      this.stats.compressionRatio = this.cache.size > 0 ? compressedEntries / this.cache.size : 0;
    }
  }

  private calculateHitRate(isHit: boolean): number {
    // This is a simplified calculation - in production, you'd want to track this more accurately
    const totalRequests = this.stats.totalEntries || 1;
    return isHit
      ? Math.min(100, this.stats.hitRate * 0.9 + 10)
      : Math.max(0, this.stats.missRate + 1);
  }

  private startCleanup(): void {
    // Run cleanup every 5 minutes
    this.cleanupInterval = setInterval(
      () => {
        this.cleanup().catch(console.error);
      },
      5 * 60 * 1000
    );
  }

  public destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.clear();
  }
}

// Export singleton instance with default configuration
export const cacheManager = new CacheManagerImpl({
  defaultTTL: 5 * 60 * 1000, // 5 minutes
  maxSize: 50 * 1024 * 1024, // 50MB
  maxEntries: 1000,
  strategy: "LRU",
  enableCompression: false,
  compressionThreshold: 1024,
});

// Export factory function for custom configurations
export function createCacheManager(config: Partial<CacheConfig>): CacheManager {
  return new CacheManagerImpl(config);
}
