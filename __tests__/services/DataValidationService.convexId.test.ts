/**
 * Tests for Convex ID validation in DataValidationService
 * Task 2: Implement Convex ID validation
 */

import { DataValidationService } from "@/services/DataValidationService";
import type { DashboardData } from "@shared/types/dashboard";

describe("DataValidationService - Convex ID Validation", () => {
  let service: DataValidationService;

  beforeEach(() => {
    service = new DataValidationService();
  });

  afterEach(() => {
    service.destroy();
  });

  describe("validateConvexId", () => {
    it("should validate a valid Convex ID format", () => {
      // Access private method through type assertion for testing
      const validateConvexId = (service as any).validateConvexId.bind(service);

      const validId = "jx7abc123def456789";
      const result = validateConvexId(validId);

      expect(result.isValidFormat).toBe(true);
      expect(result.pattern).toBe("convex");
      expect(result.confidence).toBeGreaterThan(0.9);
    });

    it("should reject invalid ID formats", () => {
      const validateConvexId = (service as any).validateConvexId.bind(service);

      const invalidIds = [
        "123", // Too short
        "UPPERCASE_ID_123456789", // Uppercase
        "id-with-special-chars!", // Special characters
        "", // Empty
        "test@example.com", // Email format
      ];

      invalidIds.forEach(id => {
        const result = validateConvexId(id);
        expect(result.isValidFormat).toBe(false);
        expect(result.confidence).toBeLessThan(0.5);
      });
    });

    it("should handle null or undefined IDs", () => {
      const validateConvexId = (service as any).validateConvexId.bind(service);

      const nullResult = validateConvexId(null);
      expect(nullResult.isValidFormat).toBe(false);
      expect(nullResult.confidence).toBe(0);

      const undefinedResult = validateConvexId(undefined);
      expect(undefinedResult.isValidFormat).toBe(false);
      expect(undefinedResult.confidence).toBe(0);
    });
  });

  describe("validateDataIds", () => {
    it("should validate IDs across all dashboard data sections", () => {
      const validateDataIds = (service as any).validateDataIds.bind(service);

      const mockData: DashboardData = {
        user: {
          id: "jx7abc123def456789",
          clerkId: "clerk_123",
          email: "user@example.com",
        },
        stats: {
          totalFavorites: 5,
          totalDownloads: 10,
          totalOrders: 3,
          totalSpent: 100,
          recentActivity: 2,
          quotaUsed: 5,
          quotaLimit: 100,
          monthlyDownloads: 10,
          monthlyOrders: 3,
          monthlyRevenue: 100,
        },
        favorites: [
          {
            id: "jx7favorite123456789",
            beatId: 1,
            beatTitle: "Test Beat",
            createdAt: new Date().toISOString(),
          },
        ],
        orders: [
          {
            id: "jx7order1234567890",
            items: [],
            total: 50,
            currency: "USD",
            status: "paid" as const,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ],
        downloads: [
          {
            id: "jx7download12345678",
            beatId: 1,
            beatTitle: "Test Beat",
            format: "mp3" as const,
            licenseType: "basic",
            downloadedAt: new Date().toISOString(),
            downloadCount: 1,
          },
        ],
        reservations: [
          {
            id: "jx7reservation123456",
            serviceType: "mixing" as const,
            preferredDate: new Date().toISOString(),
            duration: 60,
            totalPrice: 100,
            status: "pending" as const,
            details: {
              name: "Test User",
              email: "user@example.com",
              phone: "1234567890",
            },
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ],
        activity: [
          {
            id: "jx7activity123456789",
            type: "favorite_added" as const,
            description: "Added favorite",
            timestamp: new Date().toISOString(),
            metadata: {},
          },
        ],
        chartData: [],
        trends: {
          orders: {
            period: "7d" as const,
            value: 3,
            change: 1,
            changePercent: 50,
            isPositive: true,
          },
          downloads: {
            period: "7d" as const,
            value: 10,
            change: 2,
            changePercent: 25,
            isPositive: true,
          },
          revenue: {
            period: "7d" as const,
            value: 100,
            change: 20,
            changePercent: 25,
            isPositive: true,
          },
          favorites: {
            period: "7d" as const,
            value: 5,
            change: 1,
            changePercent: 25,
            isPositive: true,
          },
        },
      };

      const result = validateDataIds(mockData);

      expect(result.hasValidIds).toBe(true);
      expect(result.validIdCount).toBeGreaterThan(0);
      expect(result.confidence).toBeGreaterThan(0.5);
      expect(result.results.length).toBeGreaterThan(0);
    });

    it("should handle data with no valid IDs", () => {
      const validateDataIds = (service as any).validateDataIds.bind(service);

      const mockData: DashboardData = {
        user: {
          id: "invalid-id",
          clerkId: "clerk_123",
          email: "user@example.com",
        },
        stats: {
          totalFavorites: 0,
          totalDownloads: 0,
          totalOrders: 0,
          totalSpent: 0,
          recentActivity: 0,
          quotaUsed: 0,
          quotaLimit: 100,
          monthlyDownloads: 0,
          monthlyOrders: 0,
          monthlyRevenue: 0,
        },
        favorites: [],
        orders: [],
        downloads: [],
        reservations: [],
        activity: [],
        chartData: [],
        trends: {
          orders: {
            period: "7d" as const,
            value: 0,
            change: 0,
            changePercent: 0,
            isPositive: false,
          },
          downloads: {
            period: "7d" as const,
            value: 0,
            change: 0,
            changePercent: 0,
            isPositive: false,
          },
          revenue: {
            period: "7d" as const,
            value: 0,
            change: 0,
            changePercent: 0,
            isPositive: false,
          },
          favorites: {
            period: "7d" as const,
            value: 0,
            change: 0,
            changePercent: 0,
            isPositive: false,
          },
        },
      };

      const result = validateDataIds(mockData);

      expect(result.hasValidIds).toBe(false);
      expect(result.validIdCount).toBe(0);
      expect(result.confidence).toBe(0);
    });
  });

  describe("validateDataSource with ID validation", () => {
    it("should trust data with valid Convex IDs", async () => {
      const mockData: DashboardData = {
        user: {
          id: "jx7abc123def456789",
          clerkId: "clerk_123",
          email: "user@example.com",
        },
        stats: {
          totalFavorites: 5,
          totalDownloads: 10,
          totalOrders: 3,
          totalSpent: 100,
          recentActivity: 2,
          quotaUsed: 5,
          quotaLimit: 100,
          monthlyDownloads: 10,
          monthlyOrders: 3,
          monthlyRevenue: 100,
        },
        favorites: [
          {
            id: "jx7favorite123456789",
            beatId: 1,
            beatTitle: "Test Beat",
            createdAt: new Date().toISOString(),
          },
        ],
        orders: [],
        downloads: [],
        reservations: [],
        activity: [],
        chartData: [],
        trends: {
          orders: {
            period: "7d" as const,
            value: 3,
            change: 1,
            changePercent: 50,
            isPositive: true,
          },
          downloads: {
            period: "7d" as const,
            value: 10,
            change: 2,
            changePercent: 25,
            isPositive: true,
          },
          revenue: {
            period: "7d" as const,
            value: 100,
            change: 20,
            changePercent: 25,
            isPositive: true,
          },
          favorites: {
            period: "7d" as const,
            value: 5,
            change: 1,
            changePercent: 25,
            isPositive: true,
          },
        },
      };

      const result = await service.validateDataSource(mockData);

      expect(result.isRealData).toBe(true);
      expect(result.hasMockData).toBe(false);
      expect(result.source).toBe("database");
      expect(result.idValidations).toBeDefined();
      expect(result.idValidations?.hasValidIds).toBe(true);
      expect(result.idValidations?.confidence).toBeGreaterThan(0.7);
    });

    it("should flag data without valid Convex IDs as suspicious", async () => {
      const mockData: DashboardData = {
        user: {
          id: "123",
          clerkId: "clerk_123",
          email: "test@test.com", // Test email
        },
        stats: {
          totalFavorites: 0,
          totalDownloads: 0,
          totalOrders: 0,
          totalSpent: 0,
          recentActivity: 0,
          quotaUsed: 0,
          quotaLimit: 100,
          monthlyDownloads: 0,
          monthlyOrders: 0,
          monthlyRevenue: 0,
        },
        favorites: [],
        orders: [],
        downloads: [],
        reservations: [],
        activity: [],
        chartData: [],
        trends: {
          orders: {
            period: "7d" as const,
            value: 0,
            change: 0,
            changePercent: 0,
            isPositive: false,
          },
          downloads: {
            period: "7d" as const,
            value: 0,
            change: 0,
            changePercent: 0,
            isPositive: false,
          },
          revenue: {
            period: "7d" as const,
            value: 0,
            change: 0,
            changePercent: 0,
            isPositive: false,
          },
          favorites: {
            period: "7d" as const,
            value: 0,
            change: 0,
            changePercent: 0,
            isPositive: false,
          },
        },
      };

      const result = await service.validateDataSource(mockData);

      expect(result.idValidations).toBeDefined();
      expect(result.idValidations?.hasValidIds).toBe(false);
      // Should detect test email as mock data
      expect(result.hasMockData).toBe(true);
    });
  });

  describe("Integration with source determination", () => {
    it("should prioritize ID validation over content patterns", async () => {
      const mockData: DashboardData = {
        user: {
          id: "jx7abc123def456789", // Valid Convex ID
          clerkId: "clerk_123",
          email: "test@test.com", // Would normally be flagged as test email
        },
        stats: {
          totalFavorites: 0,
          totalDownloads: 0,
          totalOrders: 0,
          totalSpent: 0,
          recentActivity: 0,
          quotaUsed: 0,
          quotaLimit: 100,
          monthlyDownloads: 0,
          monthlyOrders: 0,
          monthlyRevenue: 0,
        },
        favorites: [],
        orders: [],
        downloads: [],
        reservations: [],
        activity: [],
        chartData: [],
        trends: {
          orders: {
            period: "7d" as const,
            value: 0,
            change: 0,
            changePercent: 0,
            isPositive: false,
          },
          downloads: {
            period: "7d" as const,
            value: 0,
            change: 0,
            changePercent: 0,
            isPositive: false,
          },
          revenue: {
            period: "7d" as const,
            value: 0,
            change: 0,
            changePercent: 0,
            isPositive: false,
          },
          favorites: {
            period: "7d" as const,
            value: 0,
            change: 0,
            changePercent: 0,
            isPositive: false,
          },
        },
      };

      const result = await service.validateDataSource(mockData);

      // Should trust the data because of valid Convex ID
      // even though email looks like test data
      expect(result.isRealData).toBe(true);
      expect(result.source).toBe("database");
      expect(result.idValidations?.hasValidIds).toBe(true);
    });
  });
});
