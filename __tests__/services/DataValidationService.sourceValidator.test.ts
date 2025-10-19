/**
 * Tests for SourceValidator class in DataValidationService
 * Task 3: Add source-based validation priority system
 */

import { SourceValidator } from "@/services/DataValidationService";
import type { DashboardData } from "@shared/types/dashboard";

describe("SourceValidator", () => {
  let sourceValidator: SourceValidator;

  beforeEach(() => {
    sourceValidator = new SourceValidator();
  });

  describe("isConvexData", () => {
    it("should return true when user has valid Convex ID", () => {
      const data: Partial<DashboardData> = {
        user: {
          id: "jx7abc123def456789012345",
          email: "user@example.com",
          firstName: "John",
          lastName: "Doe",
        },
        favorites: [],
        orders: [],
        downloads: [],
        reservations: [],
        activity: [],
        stats: {
          totalFavorites: 0,
          totalDownloads: 0,
          totalOrders: 0,
          totalSpent: 0,
        },
      } as DashboardData;

      const result = sourceValidator.isConvexData(data as DashboardData);
      expect(result).toBe(true);
    });

    it("should return true when favorites have valid Convex IDs", () => {
      const data: Partial<DashboardData> = {
        user: {
          id: "user123",
          email: "user@example.com",
          firstName: "John",
          lastName: "Doe",
        },
        favorites: [
          {
            id: "jx7abc123def456789012345",
            beatId: "beat123",
            userId: "user123",
            addedAt: new Date().toISOString(),
          },
        ],
        orders: [],
        downloads: [],
        reservations: [],
        activity: [],
        stats: {
          totalFavorites: 1,
          totalDownloads: 0,
          totalOrders: 0,
          totalSpent: 0,
        },
      } as DashboardData;

      const result = sourceValidator.isConvexData(data as DashboardData);
      expect(result).toBe(true);
    });

    it("should return true when stats source is database", () => {
      const data: Partial<DashboardData> = {
        user: {
          id: "user123",
          email: "user@example.com",
          firstName: "John",
          lastName: "Doe",
        },
        favorites: [],
        orders: [],
        downloads: [],
        reservations: [],
        activity: [],
        stats: {
          totalFavorites: 0,
          totalDownloads: 0,
          totalOrders: 0,
          totalSpent: 0,
          source: "database",
        },
      } as DashboardData;

      const result = sourceValidator.isConvexData(data as DashboardData);
      expect(result).toBe(true);
    });

    it("should return false when no Convex indicators present", () => {
      const data: Partial<DashboardData> = {
        user: {
          id: "user123",
          email: "user@example.com",
          firstName: "John",
          lastName: "Doe",
        },
        favorites: [],
        orders: [],
        downloads: [],
        reservations: [],
        activity: [],
        stats: {
          totalFavorites: 0,
          totalDownloads: 0,
          totalOrders: 0,
          totalSpent: 0,
        },
      } as DashboardData;

      const result = sourceValidator.isConvexData(data as DashboardData);
      expect(result).toBe(false);
    });
  });

  describe("validateConvexId", () => {
    it("should validate correct Convex ID format", () => {
      const validIds = [
        "jx7abc123def456789012345",
        "k9zabcdefghijklmnopqrstu",
        "m1n2o3p4q5r6s7t8u9v0w1x2",
      ];

      validIds.forEach(id => {
        const result = sourceValidator.validateConvexId(id);
        expect(result.isValidFormat).toBe(true);
        expect(result.pattern).toBe("convex");
        expect(result.confidence).toBeGreaterThan(0.9);
      });
    });

    it("should reject invalid Convex ID formats", () => {
      const invalidIds = [
        "short",
        "UPPERCASE123456789012345",
        "has-dashes-123456789012345",
        "has_underscores_123456789",
        "",
        "123",
      ];

      invalidIds.forEach(id => {
        const result = sourceValidator.validateConvexId(id);
        expect(result.isValidFormat).toBe(false);
      });
    });

    it("should handle empty or non-string IDs", () => {
      const result1 = sourceValidator.validateConvexId("");
      expect(result1.isValidFormat).toBe(false);
      expect(result1.confidence).toBe(0);

      const result2 = sourceValidator.validateConvexId(null as any);
      expect(result2.isValidFormat).toBe(false);
      expect(result2.confidence).toBe(0);
    });
  });

  describe("validateSource", () => {
    it("should return high confidence for authenticated database source", async () => {
      const data: Partial<DashboardData> = {
        user: {
          id: "jx7abc123def456789012345",
          email: "user@example.com",
          firstName: "John",
          lastName: "Doe",
        },
        favorites: [
          {
            id: "jx7def456ghi789012345678",
            beatId: "beat123",
            userId: "jx7abc123def456789012345",
            addedAt: new Date().toISOString(),
          },
        ],
        orders: [],
        downloads: [],
        reservations: [],
        activity: [],
        stats: {
          totalFavorites: 1,
          totalDownloads: 0,
          totalOrders: 0,
          totalSpent: 0,
          source: "database",
        },
      } as DashboardData;

      const result = await sourceValidator.validateSource(data as DashboardData);

      expect(result.source).toBe("database");
      expect(result.isAuthenticated).toBe(true);
      expect(result.confidence).toBeGreaterThan(0.9);
      expect(result.details.hasValidIds).toBe(true);
    });

    it("should return medium confidence for data with some valid IDs", async () => {
      const data: Partial<DashboardData> = {
        user: {
          id: "jx7abc123def456789012345",
          email: "user@example.com",
          firstName: "John",
          lastName: "Doe",
        },
        favorites: [
          {
            id: "invalid-id",
            beatId: "beat123",
            userId: "jx7abc123def456789012345",
            addedAt: new Date().toISOString(),
          },
        ],
        orders: [],
        downloads: [],
        reservations: [],
        activity: [],
        stats: {
          totalFavorites: 1,
          totalDownloads: 0,
          totalOrders: 0,
          totalSpent: 0,
        },
      } as DashboardData;

      const result = await sourceValidator.validateSource(data as DashboardData);

      expect(result.details.hasValidIds).toBe(true);
      expect(result.confidence).toBeGreaterThan(0);
    });

    it("should return low confidence for data without valid IDs", async () => {
      const data: Partial<DashboardData> = {
        user: {
          id: "user123",
          email: "user@example.com",
          firstName: "John",
          lastName: "Doe",
        },
        favorites: [],
        orders: [],
        downloads: [],
        reservations: [],
        activity: [],
        stats: {
          totalFavorites: 0,
          totalDownloads: 0,
          totalOrders: 0,
          totalSpent: 0,
        },
      } as DashboardData;

      const result = await sourceValidator.validateSource(data as DashboardData);

      expect(result.details.hasValidIds).toBe(false);
      expect(result.confidence).toBeLessThan(0.5);
    });
  });

  describe("calculateSourceConfidence", () => {
    it("should calculate high confidence with valid IDs and timestamps", () => {
      const confidence = sourceValidator.calculateSourceConfidence(
        0.9, // idConfidence
        true, // hasValidTimestamps
        5, // timestampCount
        10 // totalIds
      );

      expect(confidence).toBeGreaterThan(0.8);
    });

    it("should calculate medium confidence with valid IDs but no timestamps", () => {
      const confidence = sourceValidator.calculateSourceConfidence(
        0.7, // idConfidence
        false, // hasValidTimestamps
        0, // timestampCount
        5 // totalIds
      );

      expect(confidence).toBeGreaterThan(0.4);
      expect(confidence).toBeLessThan(0.8);
    });

    it("should calculate low confidence with no valid IDs", () => {
      const confidence = sourceValidator.calculateSourceConfidence(
        0, // idConfidence
        false, // hasValidTimestamps
        0, // timestampCount
        0 // totalIds
      );

      expect(confidence).toBeLessThan(0.3);
    });

    it("should never exceed 1.0 confidence", () => {
      const confidence = sourceValidator.calculateSourceConfidence(
        1.0, // idConfidence
        true, // hasValidTimestamps
        100, // timestampCount
        100 // totalIds
      );

      expect(confidence).toBeLessThanOrEqual(1.0);
    });
  });

  describe("Priority-based validation", () => {
    it("should prioritize database source over content patterns", async () => {
      // Data with valid Convex IDs should be trusted even if it has common names
      const data: Partial<DashboardData> = {
        user: {
          id: "jx7abc123def456789012345",
          email: "john.smith@example.com",
          firstName: "John",
          lastName: "Smith",
        },
        favorites: [],
        orders: [],
        downloads: [],
        reservations: [],
        activity: [],
        stats: {
          totalFavorites: 0,
          totalDownloads: 0,
          totalOrders: 0,
          totalSpent: 0,
          source: "database",
        },
      } as DashboardData;

      const result = await sourceValidator.validateSource(data as DashboardData);

      expect(result.source).toBe("database");
      expect(result.isAuthenticated).toBe(true);
      expect(result.confidence).toBeGreaterThan(0.9);
    });

    it("should use ID validation when database source is unclear", async () => {
      const data: Partial<DashboardData> = {
        user: {
          id: "jx7abc123def456789012345",
          email: "user@example.com",
          firstName: "John",
          lastName: "Doe",
        },
        favorites: [
          {
            id: "jx7def456ghi789012345678",
            beatId: "beat123",
            userId: "jx7abc123def456789012345",
            addedAt: new Date().toISOString(),
          },
        ],
        orders: [],
        downloads: [],
        reservations: [],
        activity: [],
        stats: {
          totalFavorites: 1,
          totalDownloads: 0,
          totalOrders: 0,
          totalSpent: 0,
        },
      } as DashboardData;

      const result = await sourceValidator.validateSource(data as DashboardData);

      expect(result.details.hasValidIds).toBe(true);
      expect(result.confidence).toBeGreaterThan(0.7);
    });
  });
});
