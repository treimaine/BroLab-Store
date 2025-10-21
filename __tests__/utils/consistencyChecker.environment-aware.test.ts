/**
 * Environment-Aware ConsistencyChecker Tests
 *
 * Tests for the enhanced ConsistencyChecker with environment-aware validation
 */

import {
  ConsistencyChecker,
  ConsistencyCheckOptions,
} from "../../client/src/utils/dataConsistency";
import type { DashboardData } from "../../shared/types/dashboard";
import type { CrossValidationResult } from "../../shared/types/sync";

// Type alias for the result with checks tracking
type TestConsistencyCheckResult = CrossValidationResult & {
  checksPerformed: string[];
  checksSkipped: string[];
};

// Mock the validation function
jest.mock("@shared/validation/sync", () => ({
  generateDataHash: jest.fn((data: unknown) => {
    return `hash-${JSON.stringify(data).length}`;
  }),
  validateDashboardData: jest.fn(() => ({
    valid: true,
    errors: [],
    warnings: [],
  })),
}));

describe("ConsistencyChecker - Environment-Aware Validation", () => {
  const createTestDashboardData = (): DashboardData => {
    return {
      user: {
        id: "user_test123",
        clerkId: "clerk_test123",
        email: "test@example.com",
        firstName: "Test",
        lastName: "User",
        imageUrl: "https://example.com/avatar.jpg",
      },
      stats: {
        totalFavorites: 5,
        totalDownloads: 10,
        totalOrders: 3,
        totalSpent: 150,
        recentActivity: 0,
        quotaUsed: 10,
        quotaLimit: 50,
        monthlyDownloads: 3,
        monthlyOrders: 1,
        monthlyRevenue: 50,
      },
      favorites: Array.from({ length: 5 }, (_, i) => ({
        id: `fav_${i}`,
        beatId: i,
        beatTitle: `Beat ${i}`,
        createdAt: "2024-01-01T00:00:00Z",
      })),
      orders: Array.from({ length: 3 }, (_, i) => ({
        id: `order_${i}`,
        orderNumber: `ORD-${i}`,
        total: 50,
        currency: "USD",
        status: "completed" as const,
        items: [],
        createdAt: "2024-01-01T00:00:00Z",
        updatedAt: "2024-01-01T00:00:00Z",
      })),
      downloads: Array.from({ length: 10 }, (_, i) => ({
        id: `download_${i}`,
        beatId: i,
        beatTitle: `Beat ${i}`,
        format: "mp3" as const,
        licenseType: "basic",
        downloadedAt: "2024-01-01T00:00:00Z",
        downloadCount: 1,
      })),
      reservations: [],
      activity: [],
      chartData: [],
      trends: {
        orders: {
          period: "30d" as const,
          value: 3,
          change: 0,
          changePercent: 0,
          isPositive: true,
        },
        downloads: {
          period: "30d" as const,
          value: 10,
          change: 0,
          changePercent: 0,
          isPositive: true,
        },
        revenue: {
          period: "30d" as const,
          value: 150,
          change: 0,
          changePercent: 0,
          isPositive: true,
        },
        favorites: {
          period: "30d" as const,
          value: 5,
          change: 0,
          changePercent: 0,
          isPositive: true,
        },
      },
    };
  };

  beforeEach(() => {
    ConsistencyChecker.clearValidationHistory();
  });

  describe("Environment Detection", () => {
    it("should detect test environment from options", () => {
      const data = createTestDashboardData();
      const options: ConsistencyCheckOptions = {
        environment: "test",
      };

      const result = ConsistencyChecker.validateCrossSection(data, options);

      expect(result).toBeDefined();
      expect(result.checksPerformed).toBeDefined();
      expect(result.checksSkipped).toBeDefined();
    });

    it("should use production environment by default", () => {
      const data = createTestDashboardData();

      const result = ConsistencyChecker.validateCrossSection(data);

      expect(result).toBeDefined();
      expect(result.checksPerformed).toContain("stats_consistency");
    });
  });

  describe("Time-Based Validation Skipping", () => {
    it("should skip monthly statistics validation when skipTimeBasedValidations is true", () => {
      const data = createTestDashboardData();
      // Set monthly stats to incorrect values
      data.stats.monthlyOrders = 999;
      data.stats.monthlyDownloads = 999;

      const options: ConsistencyCheckOptions = {
        skipTimeBasedValidations: true,
      };

      const result = ConsistencyChecker.validateCrossSection(
        data,
        options
      ) as CrossValidationResult & {
        checksPerformed: string[];
        checksSkipped: string[];
      };

      // Should not report monthly stats inconsistencies
      const monthlyInconsistencies = result.inconsistencies.filter(inc =>
        inc.description.includes("Monthly")
      );
      expect(monthlyInconsistencies).toHaveLength(0);
    });

    it("should validate monthly statistics when skipTimeBasedValidations is false", () => {
      const data = createTestDashboardData();
      // Set monthly stats to incorrect values
      data.stats.monthlyOrders = 999;
      data.stats.monthlyDownloads = 999;

      const options: ConsistencyCheckOptions = {
        skipTimeBasedValidations: false,
      };

      const result = ConsistencyChecker.validateCrossSection(
        data,
        options
      ) as TestConsistencyCheckResult;

      // Should report monthly stats inconsistencies
      const monthlyInconsistencies = result.inconsistencies.filter(
        inc => inc.description.includes("Monthly") || inc.description.includes("monthly")
      );
      expect(monthlyInconsistencies.length).toBeGreaterThan(0);
    });

    it("should skip time-based validations in test environment by default", () => {
      const data = createTestDashboardData();
      data.stats.monthlyOrders = 999;
      data.stats.monthlyDownloads = 999;

      const options: ConsistencyCheckOptions = {
        environment: "test",
      };

      const result = ConsistencyChecker.validateCrossSection(
        data,
        options
      ) as TestConsistencyCheckResult;

      const monthlyInconsistencies = result.inconsistencies.filter(inc =>
        inc.description.includes("Monthly")
      );
      expect(monthlyInconsistencies).toHaveLength(0);
    });
  });

  describe("Test Hash Acceptance", () => {
    it("should accept test-hash when allowTestHashes is true", () => {
      const data = createTestDashboardData();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (data.stats as any).dataHash = "test-hash";

      const options: ConsistencyCheckOptions = {
        allowTestHashes: true,
        skipHashValidation: false,
      };

      const result = ConsistencyChecker.validateCrossSection(
        data,
        options
      ) as TestConsistencyCheckResult;

      // Should not report hash mismatch for test-hash
      const hashInconsistencies = result.inconsistencies.filter(inc =>
        inc.description.includes("hash mismatch")
      );
      expect(hashInconsistencies).toHaveLength(0);
    });

    it("should accept test- prefixed hashes when allowTestHashes is true", () => {
      const data = createTestDashboardData();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (data.stats as any).dataHash = "test-12345";

      const options: ConsistencyCheckOptions = {
        allowTestHashes: true,
        skipHashValidation: false,
      };

      const result = ConsistencyChecker.validateCrossSection(
        data,
        options
      ) as TestConsistencyCheckResult;

      const hashInconsistencies = result.inconsistencies.filter(inc =>
        inc.description.includes("hash mismatch")
      );
      expect(hashInconsistencies).toHaveLength(0);
    });

    it("should accept mock-hash when allowTestHashes is true", () => {
      const data = createTestDashboardData();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (data.stats as any).dataHash = "mock-hash";

      const options: ConsistencyCheckOptions = {
        allowTestHashes: true,
        skipHashValidation: false,
      };

      const result = ConsistencyChecker.validateCrossSection(
        data,
        options
      ) as TestConsistencyCheckResult;

      const hashInconsistencies = result.inconsistencies.filter(inc =>
        inc.description.includes("hash mismatch")
      );
      expect(hashInconsistencies).toHaveLength(0);
    });

    it("should allow test hashes in test environment by default", () => {
      const data = createTestDashboardData();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (data.stats as any).dataHash = "test-hash";

      const options: ConsistencyCheckOptions = {
        environment: "test",
      };

      const result = ConsistencyChecker.validateCrossSection(
        data,
        options
      ) as TestConsistencyCheckResult;

      const hashInconsistencies = result.inconsistencies.filter(inc =>
        inc.description.includes("hash mismatch")
      );
      expect(hashInconsistencies).toHaveLength(0);
    });
  });

  describe("Hash Validation Skipping", () => {
    it("should skip hash validation when skipHashValidation is true", () => {
      const data = createTestDashboardData();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (data.stats as any).dataHash = "invalid-hash";

      const options: ConsistencyCheckOptions = {
        skipHashValidation: true,
      };

      const result = ConsistencyChecker.validateCrossSection(
        data,
        options
      ) as TestConsistencyCheckResult;

      expect(result.checksSkipped).toContain("hash_consistency");
      expect(result.checksPerformed).not.toContain("hash_consistency");
    });

    it("should perform hash validation when skipHashValidation is false", () => {
      const data = createTestDashboardData();

      const options: ConsistencyCheckOptions = {
        skipHashValidation: false,
      };

      const result = ConsistencyChecker.validateCrossSection(
        data,
        options
      ) as TestConsistencyCheckResult;

      expect(result.checksPerformed).toContain("hash_consistency");
      expect(result.checksSkipped).not.toContain("hash_consistency");
    });
  });

  describe("createTestChecker Factory Method", () => {
    it("should return test-friendly options", () => {
      const options = ConsistencyChecker.createTestChecker();

      expect(options.environment).toBe("test");
      expect(options.skipTimeBasedValidations).toBe(true);
      expect(options.skipHashValidation).toBe(false);
      expect(options.allowTestHashes).toBe(true);
    });

    it("should work with validateCrossSection", () => {
      const data = createTestDashboardData();
      data.stats.monthlyOrders = 999;
      data.stats.monthlyDownloads = 999;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (data.stats as any).dataHash = "test-hash";

      const options = ConsistencyChecker.createTestChecker();
      const result = ConsistencyChecker.validateCrossSection(
        data,
        options
      ) as TestConsistencyCheckResult;

      // Should not report monthly stats or test hash issues
      const timeBasedInconsistencies = result.inconsistencies.filter(inc =>
        inc.description.includes("Monthly")
      );
      const hashInconsistencies = result.inconsistencies.filter(inc =>
        inc.description.includes("hash mismatch")
      );

      expect(timeBasedInconsistencies).toHaveLength(0);
      expect(hashInconsistencies).toHaveLength(0);
    });
  });

  describe("Checks Performed and Skipped Tracking", () => {
    it("should track all checks performed", () => {
      const data = createTestDashboardData();

      const result = ConsistencyChecker.validateCrossSection(data);

      expect(result.checksPerformed).toContain("data_structure");
      expect(result.checksPerformed).toContain("stats_consistency");
      expect(result.checksPerformed).toContain("data_relationships");
      expect(result.checksPerformed).toContain("data_freshness");
      expect(result.checksPerformed).toContain("hash_consistency");
      expect(result.checksPerformed).toContain("duplicate_data");
    });

    it("should track skipped checks", () => {
      const data = createTestDashboardData();
      const options: ConsistencyCheckOptions = {
        skipHashValidation: true,
      };

      const result = ConsistencyChecker.validateCrossSection(data, options);

      expect(result.checksSkipped).toContain("hash_consistency");
    });
  });

  describe("Valid Test Data", () => {
    it("should return zero anomalies for valid test data with test options", () => {
      const data = createTestDashboardData();
      const options = ConsistencyChecker.createTestChecker();

      const result = ConsistencyChecker.validateCrossSection(
        data,
        options
      ) as TestConsistencyCheckResult;

      // Debug: log inconsistencies if any
      if (!result.consistent) {
        console.log("Inconsistencies found:", JSON.stringify(result.inconsistencies, null, 2));
      }

      expect(result.consistent).toBe(true);
      expect(result.inconsistencies).toHaveLength(0);
    });
  });
});
