import { CacheConfig } from "../shared/types/system-optimization";
import { CacheManagerImpl, createCacheManager } from "../shared/utils/cache-manager";

describe("CacheManager", () => {
  let cacheManager: CacheManagerImpl;

  beforeEach(() => {
    cacheManager = new CacheManagerImpl({
      defaultTTL: 1000, // 1 second for testing
      maxSize: 1024 * 1024, // 1MB
      maxEntries: 10,
      strategy: "LRU",
      enableCompression: false,
    });
  });

  afterEach(() => {
    cacheManager.destroy();
  });

  describe("Basic Operations", () => {
    test("should set and get values", async () => {
      const key = "test-key";
      const value = { data: "test-data", number: 42 };

      await cacheManager.set(key, value);
      const retrieved = await cacheManager.get(key);

      expect(retrieved).toEqual(value);
    });

    test("should return null for non-existent keys", async () => {
      const result = await cacheManager.get("non-existent");
      expect(result).toBeNull();
    });

    test("should delete values", async () => {
      const key = "test-key";
      const value = "test-value";

      await cacheManager.set(key, value);
      expect(await cacheManager.get(key)).toBe(value);

      const deleted = await cacheManager.delete(key);
      expect(deleted).toBe(true);
      expect(await cacheManager.get(key)).toBeNull();
    });

    test("should return false when deleting non-existent key", async () => {
      const deleted = await cacheManager.delete("non-existent");
      expect(deleted).toBe(false);
    });

    test("should clear all values", async () => {
      await cacheManager.set("key1", "value1");
      await cacheManager.set("key2", "value2");

      await cacheManager.clear();

      expect(await cacheManager.get("key1")).toBeNull();
      expect(await cacheManager.get("key2")).toBeNull();
    });
  });

  describe("TTL (Time To Live)", () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    test("should expire values after TTL", async () => {
      const key = "expiring-key";
      const value = "expiring-value";
      const ttl = 100; // 100ms

      await cacheManager.set(key, value, ttl);
      expect(await cacheManager.get(key)).toBe(value);

      // Fast-forward time past TTL
      jest.advanceTimersByTime(150);
      expect(await cacheManager.get(key)).toBeNull();
    });

    test("should use default TTL when not specified", async () => {
      const key = "default-ttl-key";
      const value = "default-ttl-value";

      await cacheManager.set(key, value);
      expect(await cacheManager.get(key)).toBe(value);

      // Should still be there after a short time
      jest.advanceTimersByTime(50);
      expect(await cacheManager.get(key)).toBe(value);
    });

    test("should touch entries to extend TTL", async () => {
      const key = "touch-key";
      const value = "touch-value";
      const shortTTL = 100;

      await cacheManager.set(key, value, shortTTL);

      // Fast-forward time partially
      jest.advanceTimersByTime(50);
      const touched = await cacheManager.touch(key, 200);
      expect(touched).toBe(true);

      // Should still be available after original TTL would have expired
      jest.advanceTimersByTime(100);
      expect(await cacheManager.get(key)).toBe(value);
    });
  });

  describe("Tags and Invalidation", () => {
    test("should set values with tags", async () => {
      const key = "tagged-key";
      const value = "tagged-value";
      const tags = ["user-data", "profile"];

      await cacheManager.set(key, value, undefined, tags);
      expect(await cacheManager.get(key)).toBe(value);
    });

    test("should invalidate by pattern", async () => {
      await cacheManager.set("user:1:profile", "profile1");
      await cacheManager.set("user:2:profile", "profile2");
      await cacheManager.set("beat:1:data", "beat1");

      const invalidated = await cacheManager.invalidate("user:*:profile");
      expect(invalidated).toBe(2);

      expect(await cacheManager.get("user:1:profile")).toBeNull();
      expect(await cacheManager.get("user:2:profile")).toBeNull();
      expect(await cacheManager.get("beat:1:data")).toBe("beat1");
    });

    test("should invalidate by tags", async () => {
      await cacheManager.set("key1", "value1", undefined, ["user-data"]);
      await cacheManager.set("key2", "value2", undefined, ["user-data", "profile"]);
      await cacheManager.set("key3", "value3", undefined, ["beat-data"]);

      const invalidated = await cacheManager.invalidateByTags(["user-data"]);
      expect(invalidated).toBe(2);

      expect(await cacheManager.get("key1")).toBeNull();
      expect(await cacheManager.get("key2")).toBeNull();
      expect(await cacheManager.get("key3")).toBe("value3");
    });
  });

  describe("Eviction Strategies", () => {
    test("should evict entries when max entries exceeded (LRU)", async () => {
      const lruCache = new CacheManagerImpl({
        maxEntries: 3,
        strategy: "LRU",
        defaultTTL: 10000, // Long TTL to avoid expiration
      });

      // Fill cache
      await lruCache.set("key1", "value1");
      await lruCache.set("key2", "value2");
      await lruCache.set("key3", "value3");

      // Access key1 to make it recently used
      await lruCache.get("key1");

      // Add another entry, should evict key2 (least recently used)
      await lruCache.set("key4", "value4");

      expect(await lruCache.get("key1")).toBe("value1"); // Recently accessed
      expect(await lruCache.get("key2")).toBeNull(); // Should be evicted
      expect(await lruCache.get("key3")).toBe("value3");
      expect(await lruCache.get("key4")).toBe("value4");

      lruCache.destroy();
    });

    test("should evict entries when max entries exceeded (FIFO)", async () => {
      const fifoCache = new CacheManagerImpl({
        maxEntries: 3,
        strategy: "FIFO",
        defaultTTL: 10000,
      });

      // Fill cache
      await fifoCache.set("key1", "value1");
      await fifoCache.set("key2", "value2");
      await fifoCache.set("key3", "value3");

      // Add another entry, should evict key1 (first in)
      await fifoCache.set("key4", "value4");

      expect(await fifoCache.get("key1")).toBeNull(); // Should be evicted
      expect(await fifoCache.get("key2")).toBe("value2");
      expect(await fifoCache.get("key3")).toBe("value3");
      expect(await fifoCache.get("key4")).toBe("value4");

      fifoCache.destroy();
    });

    test("should evict entries when max size exceeded", async () => {
      const smallCache = new CacheManagerImpl({
        maxSize: 100, // Very small size
        maxEntries: 100,
        defaultTTL: 10000,
      });

      // Add entries until size limit is reached
      const largeValue = "x".repeat(50); // 50 bytes

      await smallCache.set("key1", largeValue);
      await smallCache.set("key2", largeValue);

      // This should trigger eviction due to size
      await smallCache.set("key3", largeValue);

      const stats = await smallCache.getStats();
      expect(stats.evictionCount).toBeGreaterThan(0);

      smallCache.destroy();
    });
  });

  describe("Statistics", () => {
    test("should track cache statistics", async () => {
      await cacheManager.set("key1", "value1");
      await cacheManager.set("key2", "value2");

      // Generate some hits and misses
      await cacheManager.get("key1"); // hit
      await cacheManager.get("key2"); // hit
      await cacheManager.get("nonexistent"); // miss

      const stats = await cacheManager.getStats();

      expect(stats.totalEntries).toBe(2);
      expect(stats.totalSize).toBeGreaterThan(0);
      expect(stats.hitRate).toBeGreaterThan(0);
    });

    test("should update stats after operations", async () => {
      const initialStats = await cacheManager.getStats();
      expect(initialStats.totalEntries).toBe(0);

      await cacheManager.set("key1", "value1");
      const afterSetStats = await cacheManager.getStats();
      expect(afterSetStats.totalEntries).toBe(1);

      await cacheManager.delete("key1");
      const afterDeleteStats = await cacheManager.getStats();
      expect(afterDeleteStats.totalEntries).toBe(0);
    });
  });

  describe("Utility Methods", () => {
    test("should check if key exists", async () => {
      const key = "existence-key";
      const value = "existence-value";

      expect(await cacheManager.exists(key)).toBe(false);

      await cacheManager.set(key, value);
      expect(await cacheManager.exists(key)).toBe(true);

      await cacheManager.delete(key);
      expect(await cacheManager.exists(key)).toBe(false);
    });

    test("should handle expired entries in exists check", async () => {
      jest.useFakeTimers();

      const key = "expiring-existence-key";
      const value = "expiring-existence-value";
      const ttl = 50;

      await cacheManager.set(key, value, ttl);
      expect(await cacheManager.exists(key)).toBe(true);

      jest.advanceTimersByTime(100);
      expect(await cacheManager.exists(key)).toBe(false);

      jest.useRealTimers();
    });

    test("should cleanup expired entries", async () => {
      jest.useFakeTimers();

      const key1 = "cleanup-key1";
      const key2 = "cleanup-key2";
      const shortTTL = 50;
      const longTTL = 10000;

      await cacheManager.set(key1, "value1", shortTTL);
      await cacheManager.set(key2, "value2", longTTL);

      // Fast-forward time for first entry to expire
      jest.advanceTimersByTime(100);

      await cacheManager.cleanup();

      expect(await cacheManager.get(key1)).toBeNull();
      expect(await cacheManager.get(key2)).toBe("value2");

      jest.useRealTimers();
    });
  });

  describe("Error Handling", () => {
    test("should handle invalid JSON gracefully", async () => {
      // This test simulates corruption or invalid data
      const key = "invalid-json-key";

      // Manually set invalid compressed data
      const cache = cacheManager as any;
      cache.cache.set(key, {
        key,
        value: "invalid-json{",
        createdAt: Date.now(),
        expiresAt: Date.now() + 10000,
        accessCount: 1,
        lastAccessed: Date.now(),
        size: 100,
        compressed: true,
      });

      const result = await cacheManager.get(key);
      expect(result).toBeNull();
      expect(await cacheManager.exists(key)).toBe(false);
    });
  });

  describe("Factory Function", () => {
    test("should create cache manager with custom config", () => {
      const customConfig: Partial<CacheConfig> = {
        defaultTTL: 2000,
        maxEntries: 50,
        strategy: "LFU",
      };

      const customCache = createCacheManager(customConfig);
      expect(customCache).toBeDefined();

      // Test that it works
      customCache
        .set("test", "value")
        .then(() => {
          return customCache.get("test");
        })
        .then(value => {
          expect(value).toBe("value");
        });
    });
  });

  describe("Memory Management", () => {
    test("should track memory usage accurately", async () => {
      const initialStats = await cacheManager.getStats();
      const initialMemory = initialStats.memoryUsage;

      const largeValue = "x".repeat(1000);
      await cacheManager.set("large-key", largeValue);

      const afterSetStats = await cacheManager.getStats();
      expect(afterSetStats.memoryUsage).toBeGreaterThan(initialMemory);

      await cacheManager.delete("large-key");
      const afterDeleteStats = await cacheManager.getStats();
      expect(afterDeleteStats.memoryUsage).toBeLessThan(afterSetStats.memoryUsage);
    });
  });

  describe("Concurrent Operations", () => {
    test("should handle concurrent operations safely", async () => {
      const promises = [];

      // Simulate concurrent sets
      for (let i = 0; i < 10; i++) {
        promises.push(cacheManager.set(`concurrent-key-${i}`, `value-${i}`));
      }

      await Promise.all(promises);

      // Verify all values were set
      for (let i = 0; i < 10; i++) {
        const value = await cacheManager.get(`concurrent-key-${i}`);
        expect(value).toBe(`value-${i}`);
      }
    });

    test("should handle concurrent gets safely", async () => {
      await cacheManager.set("concurrent-get-key", "concurrent-value");

      const promises = [];
      for (let i = 0; i < 10; i++) {
        promises.push(cacheManager.get("concurrent-get-key"));
      }

      const results = await Promise.all(promises);
      results.forEach(result => {
        expect(result).toBe("concurrent-value");
      });
    });
  });
});
