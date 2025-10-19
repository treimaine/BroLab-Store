/**
 * Data Consistency Validation System Tests
 *
 * Comprehensive tests for the enhanced ConsistencyChecker class and related utilities
 * that validate data integrity across dashboard sections with automatic inconsistency
 * detection and detailed logging for debugging.
 */

import {
  ConsistencyChecker,
  ConsistencyMonitor,
  DataHashCalculator,
  compareDashboardData,
  formatInconsistency,
  generateInconsistencyReport,
  quickConsistencyCheck,
  validateSection,
} from "../../client/src/utils/dataConsistency";

import type {
  Activity,
  DashboardData,
  Download,
  Favorite,
  Order,
  Reservation,
} from "../../shared/types/dashboard";
import type { ConsistentUserStats, Inconsistency } from "../../shared/types/sync";

// ================================
// TEST DATA FACTORIES
// ================================

const createMockUser = () => ({
  id: "user-123",
  clerkId: "clerk-123",
  email: "test@example.com",
  firstName: "Test",
  lastName: "User",
});

const createMockStats = (overrides: Partial<ConsistentUserStats> = {}): ConsistentUserStats => ({
  totalFavorites: 5,
  totalDownloads: 10,
  totalOrders: 3,
  totalSpent: 149.97,
  recentActivity: 8,
  quotaUsed: 10,
  quotaLimit: 50,
  monthlyDownloads: 5,
  monthlyOrders: 2,
  monthlyRevenue: 99.98,
  calculatedAt: new Date().toISOString(),
  dataHash: "test-hash",
  source: "database",
  version: 1,
  ...overrides,
});

const createMockFavorites = (count: number = 5): Favorite[] => {
  return Array.from({ length: count }, (_, i) => ({
    id: `fav-${i + 1}`,
    beatId: i + 1,
    beatTitle: `Beat ${i + 1}`,
    beatArtist: `Artist ${i + 1}`,
    createdAt: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString(),
  }));
};

const createMockOrders = (count: number = 3): Order[] => {
  return Array.from({ length: count }, (_, i) => ({
    id: `order-${i + 1}`,
    orderNumber: `ORD-${1000 + i}`,
    items: [],
    total: 49.99,
    currency: "USD",
    status: "completed" as const,
    createdAt: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString(),
  }));
};

const createMockDownloads = (count: number = 10): Download[] => {
  return Array.from({ length: count }, (_, i) => ({
    id: `download-${i + 1}`,
    beatId: i + 1,
    beatTitle: `Beat ${i + 1}`,
    format: "mp3" as const,
    licenseType: "Basic",
    downloadedAt: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString(),
    downloadCount: 1,
  }));
};

const createMockReservations = (count: number = 2): Reservation[] => {
  return Array.from({ length: count }, (_, i) => ({
    id: `reservation-${i + 1}`,
    serviceType: "mixing" as const,
    preferredDate: new Date(Date.now() + i * 24 * 60 * 60 * 1000).toISOString(),
    duration: 120,
    totalPrice: 199.99,
    status: "confirmed" as const,
    details: {
      name: "Test User",
      email: "test@example.com",
      phone: "+1234567890",
    },
    createdAt: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString(),
  }));
};

const createMockActivity = (count: number = 5): Activity[] => {
  return Array.from({ length: count }, (_, i) => ({
    id: `activity-${i + 1}`,
    type: "favorite_added" as const,
    description: `Added beat ${i + 1} to favorites`,
    timestamp: new Date(Date.now() - i * 60 * 60 * 1000).toISOString(),
    metadata: {},
  }));
};

const createMockDashboardData = (overrides: Partial<DashboardData> = {}): DashboardData => ({
  user: createMockUser(),
  stats: createMockStats(),
  favorites: createMockFavorites(),
  orders: createMockOrders(),
  downloads: createMockDownloads(),
  reservations: createMockReservations(),
  activity: createMockActivity(),
  chartData: [],
  trends: {
    orders: { period: "30d", value: 3, change: 1, changePercent: 50, isPositive: true },
    downloads: { period: "30d", value: 10, change: 2, changePercent: 25, isPositive: true },
    revenue: { period: "30d", value: 149.97, change: 49.99, changePercent: 50, isPositive: true },
    favorites: { period: "30d", value: 5, change: 1, changePercent: 25, isPositive: true },
  },
  ...overrides,
});

// ================================
// CONSISTENCY CHECKER TESTS
// ================================

describe("ConsistencyChecker", () => {
  beforeEach(() => {
    ConsistencyChecker.clearValidationHistory();
  });

  describe("validateCrossSection", () => {
    it("should validate consistent data successfully", () => {
      const data = createMockDashboardData();
      const result = ConsistencyChecker.validateCrossSection(data);

      expect(result.consistent).toBe(true);
      expect(result.inconsistencies).toHaveLength(0);
      expect(result.recommendedAction).toBe("ignore");
    });

    it("should detect favorites count inconsistency", () => {
      const data = createMockDashboardData({
        stats: createMockStats({ totalFavorites: 10 }), // Wrong count
        favorites: createMockFavorites(5), // Actual count is 5
      });

      const result = ConsistencyChecker.validateCrossSection(data);

      expect(result.consistent).toBe(false);
      expect(result.inconsistencies).toHaveLength(1);
      expect(result.inconsistencies[0].type).toBe("calculation");
      expect(result.inconsistencies[0].sections).toContain("stats");
      expect(result.inconsistencies[0].sections).toContain("favorites");
      expect(result.inconsistencies[0].description).toContain("favorites");
      expect(result.inconsistencies[0].expectedValue).toBe(5);
      expect(result.inconsistencies[0].actualValue).toBe(10);
    });

    it("should detect downloads count inconsistency", () => {
      const data = createMockDashboardData({
        stats: createMockStats({ totalDownloads: 15 }), // Wrong count
        downloads: createMockDownloads(10), // Actual count is 10
      });

      const result = ConsistencyChecker.validateCrossSection(data);

      expect(result.consistent).toBe(false);
      expect(result.inconsistencies).toHaveLength(1);
      expect(result.inconsistencies[0].type).toBe("calculation");
      expect(result.inconsistencies[0].sections).toContain("stats");
      expect(result.inconsistencies[0].sections).toContain("downloads");
    });

    it("should detect orders count inconsistency", () => {
      const data = createMockDashboardData({
        stats: createMockStats({ totalOrders: 5 }), // Wrong count
        orders: createMockOrders(3), // Actual count is 3
      });

      const result = ConsistencyChecker.validateCrossSection(data);

      expect(result.consistent).toBe(false);
      expect(result.inconsistencies).toHaveLength(1);
      expect(result.inconsistencies[0].type).toBe("calculation");
      expect(result.inconsistencies[0].sections).toContain("stats");
      expect(result.inconsistencies[0].sections).toContain("orders");
    });

    it("should detect total spent inconsistency", () => {
      const data = createMockDashboardData({
        stats: createMockStats({ totalSpent: 200 }), // Wrong amount
        orders: createMockOrders(3), // Actual total: 3 * 49.99 = 149.97
      });

      const result = ConsistencyChecker.validateCrossSection(data);

      expect(result.consistent).toBe(false);
      expect(result.inconsistencies).toHaveLength(1);
      expect(result.inconsistencies[0].type).toBe("calculation");
      expect(result.inconsistencies[0].sections).toContain("stats");
      expect(result.inconsistencies[0].sections).toContain("orders");
      expect(result.inconsistencies[0].description).toContain("total spent");
    });

    it("should detect quota exceeded inconsistency", () => {
      const data = createMockDashboardData({
        stats: createMockStats({
          quotaUsed: 60,
          quotaLimit: 50,
        }),
      });

      const result = ConsistencyChecker.validateCrossSection(data);

      expect(result.consistent).toBe(false);
      expect(result.inconsistencies).toHaveLength(1);
      expect(result.inconsistencies[0].type).toBe("calculation");
      expect(result.inconsistencies[0].sections).toContain("stats");
      expect(result.inconsistencies[0].description).toContain("quota");
      expect(result.inconsistencies[0].severity).toBe("high");
    });

    it("should detect duplicate favorites", () => {
      const favorites = createMockFavorites(3);
      favorites.push({ ...favorites[0] }); // Add duplicate

      const data = createMockDashboardData({
        favorites,
        stats: createMockStats({ totalFavorites: 4 }), // Should be 3 unique
      });

      const result = ConsistencyChecker.validateCrossSection(data);

      expect(result.consistent).toBe(false);
      const duplicateInconsistency = result.inconsistencies.find(
        inc => inc.type === "duplicate_data"
      );
      expect(duplicateInconsistency).toBeDefined();
      expect(duplicateInconsistency?.sections).toContain("favorites");
    });

    it("should detect future timestamps", () => {
      const futureDate = new Date(Date.now() + 2 * 60 * 1000).toISOString(); // 2 minutes in future
      const favorites = createMockFavorites(1);
      favorites[0].createdAt = futureDate;

      const data = createMockDashboardData({ favorites });

      const result = ConsistencyChecker.validateCrossSection(data);

      expect(result.consistent).toBe(false);
      const timingInconsistency = result.inconsistencies.find(inc => inc.type === "timing");
      expect(timingInconsistency).toBeDefined();
      expect(timingInconsistency?.sections).toContain("favorites");
      expect(timingInconsistency?.description).toContain("future timestamp");
    });

    it("should handle missing required sections", () => {
      const data = {
        user: createMockUser(),
        // Missing stats, favorites, etc.
      } as unknown as DashboardData;

      const result = ConsistencyChecker.validateCrossSection(data);

      expect(result.consistent).toBe(false);
      expect(result.inconsistencies.length).toBeGreaterThan(0);
      const missingDataInconsistencies = result.inconsistencies.filter(
        inc => inc.type === "missing_data"
      );
      expect(missingDataInconsistencies.length).toBeGreaterThan(0);
    });

    it("should recommend appropriate actions based on severity", () => {
      // Critical inconsistency should recommend reload
      const criticalData = {
        user: createMockUser(),
        // Missing critical sections
      } as unknown as DashboardData;

      const criticalResult = ConsistencyChecker.validateCrossSection(criticalData);
      expect(criticalResult.recommendedAction).toBe("reload");

      // High severity should recommend sync
      const highSeverityData = createMockDashboardData({
        stats: createMockStats({ totalFavorites: 100 }), // Major inconsistency
        favorites: createMockFavorites(5),
      });

      const highResult = ConsistencyChecker.validateCrossSection(highSeverityData);
      expect(highResult.recommendedAction).toBe("sync");
    });
  });

  describe("validation history", () => {
    it("should store validation history", () => {
      const data = createMockDashboardData();

      ConsistencyChecker.validateCrossSection(data);
      const history = ConsistencyChecker.getValidationHistory();

      expect(history).toHaveLength(1);
      expect(history[0].result.consistent).toBe(true);
      expect(history[0].dataHash).toBeDefined();
    });

    it("should limit validation history size", () => {
      const data = createMockDashboardData();

      // Perform more than 50 validations
      for (let i = 0; i < 55; i++) {
        ConsistencyChecker.validateCrossSection(data);
      }

      const history = ConsistencyChecker.getValidationHistory();
      expect(history).toHaveLength(50); // Should be limited to 50
    });

    it("should provide consistency metrics", () => {
      const consistentData = createMockDashboardData();
      const inconsistentData = createMockDashboardData({
        stats: createMockStats({ totalFavorites: 100 }),
      });

      // Perform some validations
      ConsistencyChecker.validateCrossSection(consistentData);
      ConsistencyChecker.validateCrossSection(inconsistentData);
      ConsistencyChecker.validateCrossSection(consistentData);

      const metrics = ConsistencyChecker.getConsistencyMetrics();

      expect(metrics.totalValidations).toBe(3);
      expect(metrics.consistentValidations).toBe(2);
      expect(metrics.consistencyRate).toBeCloseTo(66.67, 1);
      expect(metrics.averageInconsistencies).toBeGreaterThan(0);
    });
  });
});

// ================================
// DATA HASH CALCULATOR TESTS
// ================================

describe("DataHashCalculator", () => {
  describe("calculateStatsHash", () => {
    it("should generate consistent hash for same stats", () => {
      const stats1 = createMockStats();
      const stats2 = createMockStats();

      const hash1 = DataHashCalculator.calculateStatsHash(stats1);
      const hash2 = DataHashCalculator.calculateStatsHash(stats2);

      expect(hash1).toBe(hash2);
      expect(hash1).toBeDefined();
      expect(hash1.length).toBeGreaterThan(0);
    });

    it("should generate different hash for different stats", () => {
      const stats1 = createMockStats({ totalFavorites: 5 });
      const stats2 = createMockStats({ totalFavorites: 10 });

      const hash1 = DataHashCalculator.calculateStatsHash(stats1);
      const hash2 = DataHashCalculator.calculateStatsHash(stats2);

      expect(hash1).not.toBe(hash2);
    });

    it("should handle monetary values consistently", () => {
      const stats1 = createMockStats({ totalSpent: 49.99 });
      const stats2 = createMockStats({ totalSpent: 49.99 }); // Same value, different precision

      const hash1 = DataHashCalculator.calculateStatsHash(stats1);
      const hash2 = DataHashCalculator.calculateStatsHash(stats2);

      expect(hash1).toBe(hash2); // Should be same after rounding
    });
  });

  describe("calculateFavoritesHash", () => {
    it("should generate consistent hash for same favorites", () => {
      const favorites = createMockFavorites(3);

      const hash1 = DataHashCalculator.calculateFavoritesHash(favorites);
      const hash2 = DataHashCalculator.calculateFavoritesHash([...favorites]);

      expect(hash1).toBe(hash2);
    });

    it("should generate different hash for different favorites", () => {
      const favorites1 = createMockFavorites(3);
      const favorites2 = createMockFavorites(5);

      const hash1 = DataHashCalculator.calculateFavoritesHash(favorites1);
      const hash2 = DataHashCalculator.calculateFavoritesHash(favorites2);

      expect(hash1).not.toBe(hash2);
    });

    it("should handle order independence", () => {
      const favorites = createMockFavorites(3);
      const shuffledFavorites = [...favorites].reverse();

      const hash1 = DataHashCalculator.calculateFavoritesHash(favorites);
      const hash2 = DataHashCalculator.calculateFavoritesHash(shuffledFavorites);

      expect(hash1).toBe(hash2); // Should be same regardless of order
    });
  });

  describe("calculateDashboardHash", () => {
    it("should generate comprehensive hash for dashboard data", () => {
      const data = createMockDashboardData();

      const hash = DataHashCalculator.calculateDashboardHash(data);

      expect(hash).toBeDefined();
      expect(hash.length).toBeGreaterThan(0);
    });

    it("should detect changes in any section", () => {
      const data1 = createMockDashboardData();
      const data2 = createMockDashboardData({
        favorites: createMockFavorites(10), // Different favorites
      });

      const hash1 = DataHashCalculator.calculateDashboardHash(data1);
      const hash2 = DataHashCalculator.calculateDashboardHash(data2);

      expect(hash1).not.toBe(hash2);
    });
  });
});

// ================================
// UTILITY FUNCTIONS TESTS
// ================================

describe("Utility Functions", () => {
  describe("formatInconsistency", () => {
    it("should format inconsistency with all details", () => {
      const inconsistency: Inconsistency = {
        type: "calculation",
        sections: ["stats", "favorites"],
        description: "Test inconsistency",
        severity: "high",
        autoResolvable: true,
        detectedAt: Date.now() - 5000, // 5 seconds ago
        expectedValue: 5,
        actualValue: 10,
      };

      const formatted = formatInconsistency(inconsistency);

      expect(formatted).toContain("HIGH");
      expect(formatted).toContain("stats, favorites");
      expect(formatted).toContain("Test inconsistency");
      expect(formatted).toContain("Auto-resolvable");
      expect(formatted).toContain("5s ago");
    });
  });

  describe("generateInconsistencyReport", () => {
    it("should generate report for no inconsistencies", () => {
      const report = generateInconsistencyReport([]);

      expect(report).toContain("No inconsistencies detected");
      expect(report).toContain("✅");
    });

    it("should generate detailed report for inconsistencies", () => {
      const inconsistencies: Inconsistency[] = [
        {
          type: "calculation",
          sections: ["stats"],
          description: "Test inconsistency 1",
          severity: "high",
          autoResolvable: true,
          detectedAt: Date.now(),
        },
        {
          type: "timing",
          sections: ["favorites"],
          description: "Test inconsistency 2",
          severity: "low",
          autoResolvable: false,
          detectedAt: Date.now(),
        },
      ];

      const report = generateInconsistencyReport(inconsistencies);

      expect(report).toContain("Dashboard Data Inconsistency Report");
      expect(report).toContain("Total inconsistencies: 2");
      expect(report).toContain("high: 1");
      expect(report).toContain("low: 1");
      expect(report).toContain("Auto-resolvable: 1/2");
      expect(report).toContain("Test inconsistency 1");
      expect(report).toContain("Test inconsistency 2");
    });
  });

  describe("quickConsistencyCheck", () => {
    it("should perform quick check on consistent data", () => {
      const data = createMockDashboardData();

      const result = quickConsistencyCheck(data);

      expect(result.consistent).toBe(true);
      expect(result.issues).toBe(0);
      expect(result.criticalIssues).toBe(0);
      expect(result.summary).toBe("All sections consistent");
    });

    it("should detect issues in quick check", () => {
      const data = createMockDashboardData({
        stats: createMockStats({ totalFavorites: 100 }),
      });

      const result = quickConsistencyCheck(data);

      expect(result.consistent).toBe(false);
      expect(result.issues).toBeGreaterThan(0);
      expect(result.summary).toContain("issues found");
    });
  });

  describe("validateSection", () => {
    it("should validate individual section successfully", () => {
      const data = createMockDashboardData();

      const result = validateSection(data, "favorites");

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.dataHash).toBeDefined();
    });

    it("should detect missing section", () => {
      const data = { user: createMockUser() } as unknown as DashboardData;

      const result = validateSection(data, "favorites");

      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toContain("missing or null");
    });
  });

  describe("compareDashboardData", () => {
    it("should detect identical data", () => {
      const data1 = createMockDashboardData();
      const data2 = createMockDashboardData();

      const result = compareDashboardData(data1, data2);

      expect(result.identical).toBe(true);
      expect(result.differences).toHaveLength(0);
      expect(result.hashComparison.identical).toBe(true);
    });

    it("should detect differences in data", () => {
      const data1 = createMockDashboardData();
      const data2 = createMockDashboardData({
        stats: createMockStats({ totalFavorites: 10 }),
      });

      const result = compareDashboardData(data1, data2);

      expect(result.identical).toBe(false);
      expect(result.differences.length).toBeGreaterThan(0);
      expect(result.hashComparison.identical).toBe(false);

      const favoriteDiff = result.differences.find(diff => diff.field === "totalFavorites");
      expect(favoriteDiff).toBeDefined();
      expect(favoriteDiff?.value1).toBe(5);
      expect(favoriteDiff?.value2).toBe(10);
    });
  });
});

// ================================
// CONSISTENCY MONITOR TESTS
// ================================

describe("ConsistencyMonitor", () => {
  beforeEach(() => {
    ConsistencyMonitor.clearHistory();
  });

  describe("recordInconsistencies", () => {
    it("should record inconsistencies with metadata", () => {
      const inconsistencies: Inconsistency[] = [
        {
          type: "calculation",
          sections: ["stats"],
          description: "Test inconsistency",
          severity: "medium",
          autoResolvable: true,
          detectedAt: Date.now(),
        },
      ];

      const recordId = ConsistencyMonitor.recordInconsistencies(inconsistencies, "test-hash");

      expect(recordId).toBeGreaterThan(0);

      const history = ConsistencyMonitor.getInconsistencyHistory();
      expect(history).toHaveLength(1);
      expect(history[0].inconsistencies).toEqual(inconsistencies);
      expect(history[0].dataHash).toBe("test-hash");
      expect(history[0].resolved).toBe(false);
    });
  });

  describe("getUnresolvedInconsistencies", () => {
    it("should return only unresolved inconsistencies", () => {
      const inconsistencies: Inconsistency[] = [
        {
          type: "calculation",
          sections: ["stats"],
          description: "Test inconsistency",
          severity: "medium",
          autoResolvable: true,
          detectedAt: Date.now(),
        },
      ];

      const recordId = ConsistencyMonitor.recordInconsistencies(inconsistencies);
      ConsistencyMonitor.markResolved(recordId, "manual");

      const unresolved = ConsistencyMonitor.getUnresolvedInconsistencies();
      expect(unresolved).toHaveLength(0);
    });
  });

  describe("autoResolveInconsistencies", () => {
    it("should attempt to auto-resolve inconsistencies", () => {
      const data = createMockDashboardData();
      const inconsistencies: Inconsistency[] = [
        {
          type: "calculation",
          sections: ["stats"],
          description: "Auto-resolvable inconsistency",
          severity: "medium",
          autoResolvable: true,
          detectedAt: Date.now(),
        },
      ];

      ConsistencyMonitor.recordInconsistencies(inconsistencies);

      const result = ConsistencyMonitor.autoResolveInconsistencies(data);

      expect(result.resolved).toBeGreaterThan(0);
      expect(result.failed).toBe(0);
      expect(result.errors).toHaveLength(0);
    });
  });
});
