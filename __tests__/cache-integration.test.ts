import {
import { cacheManager } from "../shared/utils/cache-manager";
  CACHE_KEYS,
  CACHE_TAGS,
  CACHE_TTL,
  cacheApiResponse,
  cacheBeatsData,
  cacheUserProfile,
  checkCacheHealth,
  getCachedBeatsData,
  getCachedUserProfile,
  invalidateBeatsCache,
  invalidateUserCache,
} from "../shared/utils/cache-integration";

// Mock the cache manager
jest.mock(_"../shared/utils/cache-manager", _() => ({
  cacheManager: {
    get: jest.fn(),
    set: jest.fn(),
    delete: jest.fn(),
    invalidateByTags: jest.fn(),
    getStats: jest.fn(),
    clear: jest.fn(),
  },
}));

const mockCacheManager = cacheManager as jest.Mocked<typeof cacheManager>;

describe(_"Cache Integration", _() => {
  beforeEach_(() => {
    jest.clearAllMocks();
  });

  describe(_"cacheApiResponse", _() => {
    test(_"should return cached data when available", _async () => {
      const key = "test-api-key";
      const cachedData = { id: 1, name: "Test" };
      const fetcher = jest.fn();

      mockCacheManager.get.mockResolvedValue(cachedData);

      const result = await cacheApiResponse(key, fetcher);

      expect(result).toEqual(cachedData);
      expect(mockCacheManager.get).toHaveBeenCalledWith(key);
      expect(fetcher).not.toHaveBeenCalled();
      expect(mockCacheManager.set).not.toHaveBeenCalled();
    });

    test(_"should fetch and cache data when not in cache", _async () => {
      const key = "test-api-key";
      const freshData = { id: 2, name: "Fresh" };
      const fetcher = jest.fn().mockResolvedValue(freshData);

      mockCacheManager.get.mockResolvedValue(null);

      const result = await cacheApiResponse(key, fetcher, {
        ttl: CACHE_TTL.LONG,
        tags: ["test-tag"],
      });

      expect(result).toEqual(freshData);
      expect(mockCacheManager.get).toHaveBeenCalledWith(key);
      expect(fetcher).toHaveBeenCalled();
      expect(mockCacheManager.set).toHaveBeenCalledWith(key, freshData, CACHE_TTL.LONG, [
        "test-tag",
      ]);
    });

    test(_"should force refresh when forceRefresh is true", _async () => {
      const key = "test-api-key";
      const cachedData = { id: 1, name: "Cached" };
      const freshData = { id: 1, name: "Fresh" };
      const fetcher = jest.fn().mockResolvedValue(freshData);

      mockCacheManager.get.mockResolvedValue(cachedData);

      const result = await cacheApiResponse(key, fetcher, {
        forceRefresh: true,
      });

      expect(result).toEqual(freshData);
      expect(fetcher).toHaveBeenCalled();
      expect(mockCacheManager.set).toHaveBeenCalledWith(key, freshData, CACHE_TTL.MEDIUM, []);
    });

    test(_"should return stale data when fetch fails", _async () => {
      const key = "test-api-key";
      const staleData = { id: 1, name: "Stale" };
      const fetcher = jest.fn().mockRejectedValue(new Error("Fetch failed"));

      mockCacheManager.get
        .mockResolvedValueOnce(null) // First call returns null (no fresh cache)
        .mockResolvedValueOnce(staleData); // Second call returns stale data

      const result = await cacheApiResponse(key, fetcher);

      expect(result).toEqual(staleData);
      expect(fetcher).toHaveBeenCalled();
      expect(mockCacheManager.get).toHaveBeenCalledTimes(2);
    });

    test(_"should throw error when fetch fails and no stale data available", _async () => {
      const key = "test-api-key";
      const error = new Error("Fetch failed");
      const fetcher = jest.fn().mockRejectedValue(error);

      mockCacheManager.get.mockResolvedValue(null);

      await expect(cacheApiResponse(key, fetcher)).rejects.toThrow("Fetch failed");
      expect(fetcher).toHaveBeenCalled();
      expect(mockCacheManager.get).toHaveBeenCalledTimes(2);
    });
  });

  describe(_"User Profile Caching", _() => {
    test(_"should cache user profile data", _async () => {
      const userId = "user123";
      const profileData = { id: userId, name: "John Doe", email: "john@example.com" };

      await cacheUserProfile(userId, profileData);

      expect(mockCacheManager.set).toHaveBeenCalledWith(
        CACHE_KEYS.USER_PROFILE(userId),
        profileData,
        CACHE_TTL.LONG,
        [CACHE_TAGS.USER_DATA]
      );
    });

    test(_"should get cached user profile data", _async () => {
      const userId = "user123";
      const profileData = { id: userId, name: "John Doe" };

      mockCacheManager.get.mockResolvedValue(profileData);

      const result = await getCachedUserProfile(userId);

      expect(result).toEqual(profileData);
      expect(mockCacheManager.get).toHaveBeenCalledWith(CACHE_KEYS.USER_PROFILE(userId));
    });
  });

  describe(_"Beats Data Caching", _() => {
    test(_"should cache beats data with filters", _async () => {
      const filters = { genre: "hip-hop", bpm: 120 };
      const beatsData = [
        { id: 1, title: "Beat 1" },
        { id: 2, title: "Beat 2" },
      ];

      await cacheBeatsData(filters, beatsData);

      const expectedKey = CACHE_KEYS.BEATS_LIST(JSON.stringify(filters));
      expect(mockCacheManager.set).toHaveBeenCalledWith(expectedKey, beatsData, CACHE_TTL.MEDIUM, [
        CACHE_TAGS.BEATS_DATA,
      ]);
    });

    test(_"should get cached beats data", _async () => {
      const filters = { genre: "hip-hop", bpm: 120 };
      const beatsData = [{ id: 1, title: "Beat 1" }];

      mockCacheManager.get.mockResolvedValue(beatsData);

      const result = await getCachedBeatsData(filters);

      expect(result).toEqual(beatsData);
      const expectedKey = CACHE_KEYS.BEATS_LIST(JSON.stringify(filters));
      expect(mockCacheManager.get).toHaveBeenCalledWith(expectedKey);
    });
  });

  describe(_"Cache Invalidation", _() => {
    test(_"should invalidate user cache", _async () => {
      const userId = "user123";

      await invalidateUserCache(userId);

      expect(mockCacheManager.delete).toHaveBeenCalledWith(CACHE_KEYS.USER_PROFILE(userId));
      expect(mockCacheManager.delete).toHaveBeenCalledWith(CACHE_KEYS.USER_FAVORITES(userId));
      expect(mockCacheManager.delete).toHaveBeenCalledWith(CACHE_KEYS.CART_ITEMS(userId));
      expect(mockCacheManager.delete).toHaveBeenCalledWith(CACHE_KEYS.DASHBOARD_ANALYTICS(userId));
      expect(mockCacheManager.invalidateByTags).toHaveBeenCalledWith([CACHE_TAGS.USER_DATA]);
    });

    test(_"should invalidate beats cache", _async () => {
      await invalidateBeatsCache();

      expect(mockCacheManager.invalidateByTags).toHaveBeenCalledWith([
        CACHE_TAGS.BEATS_DATA,
        CACHE_TAGS.SEARCH_DATA,
      ]);
    });
  });

  describe(_"Cache Health Check", _() => {
    test(_"should return healthy status when cache is performing well", _async () => {
      const goodStats = {
        totalEntries: 100,
        totalSize: 1024 * 1024, // 1MB
        hitRate: 75,
        missRate: 25,
        evictionCount: 5,
        memoryUsage: 1024 * 1024, // 1MB
      };

      mockCacheManager.getStats.mockResolvedValue(goodStats);

      const health = await checkCacheHealth();

      expect(health.healthy).toBe(true);
      expect(health.stats).toEqual(goodStats);
      expect(health.issues).toHaveLength(0);
    });

    test(_"should detect low hit rate issue", _async () => {
      const badStats = {
        totalEntries: 100,
        totalSize: 1024 * 1024,
        hitRate: 30, // Low hit rate
        missRate: 70,
        evictionCount: 5,
        memoryUsage: 1024 * 1024,
      };

      mockCacheManager.getStats.mockResolvedValue(badStats);

      const health = await checkCacheHealth();

      expect(health.healthy).toBe(false);
      expect(health.issues).toContain("Low cache hit rate (< 50%)");
    });

    test(_"should detect high memory usage issue", _async () => {
      const badStats = {
        totalEntries: 100,
        totalSize: 1024 * 1024,
        hitRate: 75,
        missRate: 25,
        evictionCount: 5,
        memoryUsage: 46 * 1024 * 1024, // 46MB (> 90% of 50MB limit)
      };

      mockCacheManager.getStats.mockResolvedValue(badStats);

      const health = await checkCacheHealth();

      expect(health.healthy).toBe(false);
      expect(health.issues).toContain("High memory usage (> 90% of limit)");
    });

    test(_"should detect high eviction count issue", _async () => {
      const badStats = {
        totalEntries: 100,
        totalSize: 1024 * 1024,
        hitRate: 75,
        missRate: 25,
        evictionCount: 150, // High eviction count
        memoryUsage: 1024 * 1024,
      };

      mockCacheManager.getStats.mockResolvedValue(badStats);

      const health = await checkCacheHealth();

      expect(health.healthy).toBe(false);
      expect(health.issues).toContain("High eviction count - consider increasing cache size");
    });

    test(_"should handle cache health check errors", _async () => {
      mockCacheManager.getStats.mockRejectedValue(new Error("Cache unavailable"));

      const health = await checkCacheHealth();

      expect(health.healthy).toBe(false);
      expect(health.stats).toBeNull();
      expect(health.issues).toContain("Cache health check failed: Error: Cache unavailable");
    });
  });

  describe(_"Cache Keys and Constants", _() => {
    test(_"should generate correct cache keys", _() => {
      const userId = "user123";
      const beatId = "beat456";
      const query = "hip hop beats";

      expect(CACHE_KEYS.USER_PROFILE(userId)).toBe("user:profile:user123");
      expect(CACHE_KEYS.BEAT_DETAILS(beatId)).toBe("beat:details:beat456");
      expect(CACHE_KEYS.SEARCH_RESULTS(query)).toBe("search:results:hip hop beats");
      expect(CACHE_KEYS.SUBSCRIPTION_PLANS).toBe("subscription:plans");
    });

    test(_"should have correct TTL values", _() => {
      expect(CACHE_TTL.SHORT).toBe(2 * 60 * 1000); // 2 minutes
      expect(CACHE_TTL.MEDIUM).toBe(5 * 60 * 1000); // 5 minutes
      expect(CACHE_TTL.LONG).toBe(15 * 60 * 1000); // 15 minutes
      expect(CACHE_TTL.VERY_LONG).toBe(60 * 60 * 1000); // 1 hour
      expect(CACHE_TTL.PERSISTENT).toBe(24 * 60 * 60 * 1000); // 24 hours
    });

    test(_"should have correct cache tags", _() => {
      expect(CACHE_TAGS.USER_DATA).toBe("user-data");
      expect(CACHE_TAGS.BEATS_DATA).toBe("beats-data");
      expect(CACHE_TAGS.SEARCH_DATA).toBe("search-data");
      expect(CACHE_TAGS.COMMERCE_DATA).toBe("commerce-data");
      expect(CACHE_TAGS.AUDIO_DATA).toBe("audio-data");
      expect(CACHE_TAGS.ANALYTICS_DATA).toBe("analytics-data");
    });
  });
});
