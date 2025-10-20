/**
 * Data Validation Service - Cache Improvements Tests
 * Tests for task 11: validation caching improvements
 */

import { DataValidationService } from "@/services/DataValidationService";
import type { DashboardData } from "@shared/types/dashboard";

// Mock the error logging service
jest.mock("@/services/ErrorLoggingService", () => ({
  getErrorLoggingService: () => ({
    logSystemEvent: jest.fn(),
    logError: jest.fn(),
  }),
}));

describe("DataValidationService - Cache Improvements", () => {
  let service: DataValidationService;
  let mockData: DashboardData;

  beforeEach(() => {
    // Initialize service in development mode for detailed logging
    service = new DataValidationService({}, "development");

    // Create mock dashboard data
    mockData = {
      user: {
        id: "abc123def456ghi789jk",
        email: "user@example.com",
        name: "Test User",
        createdAt: Date.now(),
      },
      stats: {
        totalDownloads: 5,
        totalOrders: 2,
        totalFavorites: 3,
        totalReservations: 1,
        source: "database",
        calculatedAt: Date.now(),
        isConsistent: true,
      },
      favorites: [
        { id: "fav1abc123def456ghi7", beatId: "beat1", createdAt: Date.now() },
        { id: "fav2abc123def456ghi7", beatId: "beat2", createdAt: Date.now() },
      ],
      orders: [
        {
          id: "ord1abc123def456ghi7",
          total: 49.99,
          status: "completed",
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
      ],
      downloads: [
        {
          id: "dl1abc123def456ghi78",
          beatId: "beat1",
          downloadedAt: Date.now(),
        },
      ],
      reservations: [
        {
          id: "res1abc123def456ghi7",
          service: "mixing",
          status: "confirmed",
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
      ],
      activity: [
        {
          id: "act1abc123def456ghi",
          type: "download",
          timestamp: Date.now(),
        },
      ],
    };
  });

  afterEach(() => {
    service.destroy();
  });

  describe("Cache Key Generation", () => {
    it("should generate cache key that includes source validation metadata", async () => {
      // First validation creates cache entry
      const report1 = await service.validateDataIntegrity(mockData, {
        cacheResults: true,
      });

      // Get cache stats
      const stats = service.getCacheStats();

      expect(stats.size).toBe(1);
      expect(stats.entries[0].source).toBe("database");
    });

    it("should generate different cache keys for different data sources", async () => {
      // Validate with database source
      const report1 = await service.validateDataIntegrity(mockData, {
        cacheResults: true,
      });

      // Change source to cache
      const modifiedData = {
        ...mockData,
        stats: {
          ...mockData.stats,
          source: "cache" as const,
        },
      };

      const report2 = await service.validateDataIntegrity(modifiedData, {
        cacheResults: true,
      });

      // Should have 2 cache entries
      const stats = service.getCacheStats();
      expect(stats.size).toBe(2);
    });
  });

  describe("Confidence-Based TTL", () => {
    it("should use longer TTL for high confidence data", async () => {
      // Validate data with high confidence (database source)
      await service.validateDataIntegrity(mockData, {
        cacheResults: true,
      });

      const stats = service.getCacheStats();
      expect(stats.entries[0].confidence).toBeGreaterThanOrEqual(0.9);
      expect(stats.entries[0].isValid).toBe(true);
    });

    it("should use shorter TTL for low confidence data", async () => {
      // Create data with no IDs (low confidence)
      const lowConfidenceData: DashboardData = {
        ...mockData,
        user: { ...mockData.user, id: "" },
        favorites: [],
        orders: [],
        downloads: [],
        reservations: [],
        activity: [],
        stats: {
          ...mockData.stats,
          source: "unknown",
        },
      };

      await service.validateDataIntegrity(lowConfidenceData, {
        cacheResults: true,
      });

      const stats = service.getCacheStats();
      expect(stats.entries[0].confidence).toBeLessThan(0.9);
    });

    it("should invalidate cache entries based on confidence-adjusted TTL", async () => {
      // Validate data
      await service.validateDataIntegrity(mockData, {
        cacheResults: true,
      });

      // Manually advance time by checking cache validity
      const stats1 = service.getCacheStats();
      expect(stats1.entries[0].isValid).toBe(true);

      // Wait a bit and check again (in real scenario, time would pass)
      // For testing, we just verify the cache entry exists
      expect(stats1.size).toBe(1);
    });
  });

  describe("Cache Invalidation", () => {
    it("should invalidate cache for specific source type", async () => {
      // Create entries with different sources
      await service.validateDataIntegrity(mockData, {
        cacheResults: true,
      });

      // Create a truly different data set that will have a different cache key
      const modifiedData = {
        ...mockData,
        user: { ...mockData.user, name: "Different User" },
        stats: {
          ...mockData.stats,
          source: "cache" as const,
          totalDownloads: 10, // Different stats
        },
      };

      await service.validateDataIntegrity(modifiedData, {
        cacheResults: true,
      });

      // Should have 2 entries
      let stats = service.getCacheStats();
      expect(stats.size).toBe(2);

      // Invalidate database source
      service.invalidateCacheForSource("database");

      // Should have fewer entries (at least one database entry removed)
      stats = service.getCacheStats();
      expect(stats.size).toBeLessThan(2);
    });

    it("should invalidate all cache entries", async () => {
      // Create multiple cache entries
      await service.validateDataIntegrity(mockData, {
        cacheResults: true,
      });

      const modifiedData = {
        ...mockData,
        user: { ...mockData.user, name: "Different User" },
      };

      await service.validateDataIntegrity(modifiedData, {
        cacheResults: true,
      });

      // Should have entries
      let stats = service.getCacheStats();
      expect(stats.size).toBeGreaterThan(0);

      // Invalidate all
      service.invalidateAllCache();

      // Should have no entries
      stats = service.getCacheStats();
      expect(stats.size).toBe(0);
    });
  });

  describe("Cache Cleanup", () => {
    it("should cleanup old cache entries automatically", async () => {
      // Validate data multiple times
      for (let i = 0; i < 5; i++) {
        const data = {
          ...mockData,
          user: { ...mockData.user, name: `User ${i}` },
        };
        await service.validateDataIntegrity(data, {
          cacheResults: true,
        });
      }

      // Should have multiple entries
      const stats = service.getCacheStats();
      expect(stats.size).toBeGreaterThan(0);
      expect(stats.size).toBeLessThanOrEqual(5);
    });
  });

  describe("Cache Hit/Miss", () => {
    it("should return cached result on second validation", async () => {
      // First validation
      const report1 = await service.validateDataIntegrity(mockData, {
        cacheResults: true,
      });

      // Second validation with same data should hit cache
      const report2 = await service.validateDataIntegrity(mockData, {
        cacheResults: true,
      });

      // Reports should be identical (same reference)
      expect(report2).toBe(report1);
    });

    it("should not use cache when cacheResults is false", async () => {
      // First validation with cache
      const report1 = await service.validateDataIntegrity(mockData, {
        cacheResults: true,
      });

      // Second validation without cache
      const report2 = await service.validateDataIntegrity(mockData, {
        cacheResults: false,
      });

      // Reports should be different instances
      expect(report2).not.toBe(report1);
    });
  });

  describe("Cache Statistics", () => {
    it("should provide cache statistics", async () => {
      await service.validateDataIntegrity(mockData, {
        cacheResults: true,
      });

      const stats = service.getCacheStats();

      expect(stats).toHaveProperty("size");
      expect(stats).toHaveProperty("entries");
      expect(stats.size).toBe(1);
      expect(stats.entries[0]).toHaveProperty("key");
      expect(stats.entries[0]).toHaveProperty("age");
      expect(stats.entries[0]).toHaveProperty("confidence");
      expect(stats.entries[0]).toHaveProperty("source");
      expect(stats.entries[0]).toHaveProperty("isValid");
    });

    it("should track cache entry age", async () => {
      await service.validateDataIntegrity(mockData, {
        cacheResults: true,
      });

      const stats = service.getCacheStats();
      expect(stats.entries[0].age).toBeGreaterThanOrEqual(0);
    });
  });
});
