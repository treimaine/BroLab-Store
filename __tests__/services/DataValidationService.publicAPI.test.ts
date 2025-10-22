/**
 * Tests for DataValidationService public API methods
 * Task 2: Verify new public methods work correctly
 */

import { DataValidationService } from "../../client/src/services/DataValidationService";

describe("DataValidationService - Public API", () => {
  let service: DataValidationService;

  beforeEach(() => {
    service = new DataValidationService();
  });

  afterEach(() => {
    service.destroy();
  });

  describe("validateConvexId", () => {
    it("should validate a valid Convex ID format", () => {
      const validId = "jx7abc123def456789";
      const result = service.validateConvexId(validId);

      expect(result.isValidFormat).toBe(true);
      expect(result.pattern).toBe("convex");
      expect(result.confidence).toBeGreaterThan(0.9);
    });

    it("should reject invalid ID formats", () => {
      const invalidIds = [
        "123", // Too short
        "UPPERCASE_ID_123456789", // Uppercase
        "id-with-special-chars!", // Special characters
        "", // Empty
      ];

      for (const id of invalidIds) {
        const result = service.validateConvexId(id);
        expect(result.isValidFormat).toBe(false);
        expect(result.confidence).toBeLessThan(0.5);
      }
    });

    it("should handle null or undefined IDs gracefully", () => {
      const nullResult = service.validateConvexId(null as unknown as string);
      expect(nullResult.isValidFormat).toBe(false);
      expect(nullResult.confidence).toBe(0);

      const undefinedResult = service.validateConvexId(undefined as unknown as string);
      expect(undefinedResult.isValidFormat).toBe(false);
      expect(undefinedResult.confidence).toBe(0);
    });
  });

  describe("validateAllIds", () => {
    it("should validate IDs in a simple object", () => {
      const data = {
        id: "jx7abc123def456789",
        userId: "jx7def456ghi789012",
        name: "Test User",
      };

      const result = service.validateAllIds(data);

      expect(result.hasValidIds).toBe(true);
      expect(result.validIdCount).toBe(2);
      expect(result.confidence).toBe(1);
      expect(result.results).toHaveLength(2);
    });

    it("should validate IDs in nested objects", () => {
      const data = {
        user: {
          id: "jx7abc123def456789",
        },
        items: [{ id: "jx7def456ghi789012" }, { id: "jx7ghi789jkl012345" }],
      };

      const result = service.validateAllIds(data);

      expect(result.hasValidIds).toBe(true);
      expect(result.validIdCount).toBe(3);
      expect(result.confidence).toBe(1);
    });

    it("should handle data with no valid IDs", () => {
      const data = {
        id: "invalid-id",
        userId: "123",
        name: "Test User",
      };

      const result = service.validateAllIds(data);

      expect(result.hasValidIds).toBe(false);
      expect(result.validIdCount).toBe(0);
      expect(result.confidence).toBe(0);
    });

    it("should handle mixed valid and invalid IDs", () => {
      const data = {
        id: "jx7abc123def456789", // Valid
        userId: "invalid-id", // Invalid
        orderId: "jx7def456ghi789012", // Valid
      };

      const result = service.validateAllIds(data);

      expect(result.hasValidIds).toBe(true);
      expect(result.validIdCount).toBe(2);
      expect(result.confidence).toBeCloseTo(0.67, 1);
      expect(result.results).toHaveLength(3);
    });

    it("should handle empty objects", () => {
      const data = {};

      const result = service.validateAllIds(data);

      expect(result.hasValidIds).toBe(false);
      expect(result.validIdCount).toBe(0);
      expect(result.confidence).toBe(0);
      expect(result.results).toHaveLength(0);
    });
  });

  describe("validateDataIds", () => {
    it("should validate IDs in complex data structures", () => {
      const data = {
        user: {
          id: "jx7abc123def456789",
        },
        favorites: [{ id: "jx7favorite123456789" }, { id: "jx7favorite987654321" }],
        orders: [{ id: "jx7order1234567890" }],
      };

      const result = service.validateDataIds(data);

      expect(result.hasValidIds).toBe(true);
      expect(result.validIdCount).toBe(4);
      expect(result.confidence).toBe(1);
    });

    it("should handle non-object data gracefully", () => {
      const primitiveValues = [null, undefined, "string", 123, true];

      for (const value of primitiveValues) {
        const result = service.validateDataIds(value);
        expect(result.hasValidIds).toBe(false);
        expect(result.validIdCount).toBe(0);
        expect(result.confidence).toBe(0);
        expect(result.results).toHaveLength(0);
      }
    });

    it("should extract IDs from deeply nested structures", () => {
      const data = {
        level1: {
          id: "jx7level1id123456789",
          level2: {
            id: "jx7level2id123456789",
            level3: {
              id: "jx7level3id123456789",
            },
          },
        },
      };

      const result = service.validateDataIds(data);

      expect(result.hasValidIds).toBe(true);
      expect(result.validIdCount).toBe(3);
      expect(result.confidence).toBe(1);
    });

    it("should handle arrays at any level", () => {
      const data = {
        items: [
          {
            id: "jx7item1id1234567890",
            subItems: [{ id: "jx7subitem1id123456" }, { id: "jx7subitem2id123456" }],
          },
          {
            id: "jx7item2id1234567890",
          },
        ],
      };

      const result = service.validateDataIds(data);

      expect(result.hasValidIds).toBe(true);
      expect(result.validIdCount).toBe(4);
      expect(result.confidence).toBe(1);
    });
  });

  describe("Integration with existing methods", () => {
    it("should work consistently with validateDataSource", async () => {
      const mockData = {
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

      // Validate using new public API
      const idValidation = service.validateDataIds(mockData);
      expect(idValidation.hasValidIds).toBe(true);

      // Validate using existing method
      const sourceValidation = await service.validateDataSource(mockData);
      expect(sourceValidation.isRealData).toBe(true);
      expect(sourceValidation.idValidations?.hasValidIds).toBe(true);

      // Both should agree on the presence of valid IDs
      expect(idValidation.hasValidIds).toBe(sourceValidation.idValidations?.hasValidIds);
    });
  });
});
