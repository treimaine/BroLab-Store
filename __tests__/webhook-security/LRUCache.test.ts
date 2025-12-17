/**
 * Unit tests for LRUCache
 * Tests core functionality: get, set, has, delete, clear, TTL, and LRU eviction
 */

import { LRUCache } from "../../server/utils/LRUCache";

describe("LRUCache", () => {
  let cache: LRUCache<string, string>;

  beforeEach(() => {
    cache = new LRUCache<string, string>({
      maxSize: 3,
      defaultTTL: 5000, // 5 seconds
    });
  });

  describe("Basic Operations", () => {
    it("should set and get values", () => {
      cache.set("key1", "value1");
      expect(cache.get("key1")).toBe("value1");
    });

    it("should return undefined for non-existent keys", () => {
      expect(cache.get("nonexistent")).toBeUndefined();
    });

    it("should check if key exists with has()", () => {
      cache.set("key1", "value1");
      expect(cache.has("key1")).toBe(true);
      expect(cache.has("nonexistent")).toBe(false);
    });

    it("should delete keys", () => {
      cache.set("key1", "value1");
      expect(cache.delete("key1")).toBe(true);
      expect(cache.get("key1")).toBeUndefined();
    });

    it("should return false when deleting non-existent key", () => {
      expect(cache.delete("nonexistent")).toBe(false);
    });

    it("should clear all entries", () => {
      cache.set("key1", "value1");
      cache.set("key2", "value2");
      cache.clear();
      expect(cache.size).toBe(0);
      expect(cache.get("key1")).toBeUndefined();
      expect(cache.get("key2")).toBeUndefined();
    });

    it("should track size correctly", () => {
      expect(cache.size).toBe(0);
      cache.set("key1", "value1");
      expect(cache.size).toBe(1);
      cache.set("key2", "value2");
      expect(cache.size).toBe(2);
      cache.delete("key1");
      expect(cache.size).toBe(1);
    });
  });

  describe("TTL Expiration", () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it("should expire entries after TTL", () => {
      cache.set("key1", "value1", 100); // 100ms TTL
      expect(cache.get("key1")).toBe("value1");

      jest.advanceTimersByTime(150);
      expect(cache.get("key1")).toBeUndefined();
    });

    it("should use default TTL when not specified", () => {
      cache.set("key1", "value1");
      expect(cache.get("key1")).toBe("value1");

      // Advance time but not past default TTL (5000ms)
      jest.advanceTimersByTime(4000);
      expect(cache.get("key1")).toBe("value1");

      // Advance past default TTL
      jest.advanceTimersByTime(2000);
      expect(cache.get("key1")).toBeUndefined();
    });

    it("should return false for has() on expired entries", () => {
      cache.set("key1", "value1", 100);
      expect(cache.has("key1")).toBe(true);

      jest.advanceTimersByTime(150);
      expect(cache.has("key1")).toBe(false);
    });

    it("should cleanup expired entries", () => {
      cache.set("key1", "value1", 100);
      cache.set("key2", "value2", 200);
      cache.set("key3", "value3", 5000);

      jest.advanceTimersByTime(150);
      const removed = cache.cleanup();

      expect(removed).toBe(1);
      expect(cache.has("key1")).toBe(false);
      expect(cache.has("key2")).toBe(true);
      expect(cache.has("key3")).toBe(true);
    });
  });

  describe("LRU Eviction", () => {
    it("should evict oldest entry when max size reached", () => {
      cache.set("key1", "value1");
      cache.set("key2", "value2");
      cache.set("key3", "value3");

      // Cache is full, adding key4 should evict key1 (oldest)
      cache.set("key4", "value4");

      expect(cache.get("key1")).toBeUndefined(); // Evicted
      expect(cache.get("key2")).toBe("value2");
      expect(cache.get("key3")).toBe("value3");
      expect(cache.get("key4")).toBe("value4");
    });

    it("should update LRU order on get()", () => {
      cache.set("key1", "value1");
      cache.set("key2", "value2");
      cache.set("key3", "value3");

      // Access key1 to make it most recently used
      cache.get("key1");

      // Adding key4 should now evict key2 (least recently used)
      cache.set("key4", "value4");

      expect(cache.get("key1")).toBe("value1"); // Recently accessed
      expect(cache.get("key2")).toBeUndefined(); // Evicted
      expect(cache.get("key3")).toBe("value3");
      expect(cache.get("key4")).toBe("value4");
    });

    it("should update LRU order on set() for existing key", () => {
      cache.set("key1", "value1");
      cache.set("key2", "value2");
      cache.set("key3", "value3");

      // Update key1 to make it most recently used
      cache.set("key1", "updated-value1");

      // Adding key4 should now evict key2 (least recently used)
      cache.set("key4", "value4");

      expect(cache.get("key1")).toBe("updated-value1"); // Recently updated
      expect(cache.get("key2")).toBeUndefined(); // Evicted
      expect(cache.get("key3")).toBe("value3");
      expect(cache.get("key4")).toBe("value4");
    });

    it("should maintain max size constraint", () => {
      for (let i = 0; i < 10; i++) {
        cache.set(`key${i}`, `value${i}`);
      }

      expect(cache.size).toBe(3); // Max size is 3
    });
  });

  describe("Generic Types", () => {
    it("should work with number keys", () => {
      const numCache = new LRUCache<number, string>({
        maxSize: 10,
        defaultTTL: 5000,
      });

      numCache.set(1, "one");
      numCache.set(2, "two");

      expect(numCache.get(1)).toBe("one");
      expect(numCache.get(2)).toBe("two");
    });

    it("should work with object values", () => {
      interface TestObject {
        id: string;
        timestamp: number;
      }

      const objCache = new LRUCache<string, TestObject>({
        maxSize: 10,
        defaultTTL: 5000,
      });

      const obj: TestObject = { id: "test-id", timestamp: Date.now() };
      objCache.set("key1", obj);

      expect(objCache.get("key1")).toEqual(obj);
    });
  });
});
