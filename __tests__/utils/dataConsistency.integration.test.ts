/**
 * Integration Test for Data Consistency Validation System
 */

import { ConsistencyChecker } from "../../client/src/utils/dataConsistency";

// Mock the validation function since we can't import from shared in tests
jest.mock("../../shared/validation/sync", () => ({
  validateDashboardData: jest.fn(data => ({
    valid: true,
    errors: [],
    warnings: [],
    dataHash: "mock-hash",
    validatedAt: Date.now(),
  })),
  generateDataHash: jest.fn(data => {
    return JSON.stringify(data)
      .split("")
      .reduce((a, b) => {
        a = (a << 5) - a + b.charCodeAt(0);
        return a & a;
      }, 0)
      .toString(36);
  }),
}));

describe("ConsistencyChecker Integration", () => {
  const createMockDashboardData = () => ({
    user: {
      id: "test-user",
      clerkId: "clerk-123",
      email: "test@example.com",
    },
    stats: {
      totalFavorites: 5,
      totalDownloads: 10,
      totalOrders: 3,
      totalSpent: 149.97,
      recentActivity: 18, // 5 favorites + 10 downloads + 3 orders from last 24h
      quotaUsed: 10,
      quotaLimit: 50,
      monthlyDownloads: 10, // All downloads are from this month
      monthlyOrders: 3, // All orders are from this month
      monthlyRevenue: 149.97, // All revenue is from this month
      calculatedAt: new Date().toISOString(),
      dataHash: "", // Will be calculated by the system
      source: "database" as const,
      version: 1,
    },
    favorites: Array.from({ length: 5 }, (_, i) => ({
      id: `fav-${i + 1}`,
      beatId: i + 1,
      beatTitle: `Beat ${i + 1}`,
      createdAt: new Date().toISOString(),
    })),
    orders: Array.from({ length: 3 }, (_, i) => ({
      id: `order-${i + 1}`,
      orderNumber: `ORD-${1000 + i}`,
      items: [],
      total: 49.99,
      currency: "USD",
      status: "completed" as const,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })),
    downloads: Array.from({ length: 10 }, (_, i) => ({
      id: `download-${i + 1}`,
      beatId: i + 1,
      beatTitle: `Beat ${i + 1}`,
      format: "mp3" as const,
      licenseType: "Basic",
      downloadedAt: new Date().toISOString(),
      downloadCount: 1,
    })),
    reservations: [],
    activity: [],
    chartData: [],
    trends: {
      orders: { period: "30d" as const, value: 3, change: 1, changePercent: 50, isPositive: true },
      downloads: {
        period: "30d" as const,
        value: 10,
        change: 2,
        changePercent: 25,
        isPositive: true,
      },
      revenue: {
        period: "30d" as const,
        value: 149.97,
        change: 49.99,
        changePercent: 50,
        isPositive: true,
      },
      favorites: {
        period: "30d" as const,
        value: 5,
        change: 1,
        changePercent: 25,
        isPositive: true,
      },
    },
  });

  beforeEach(() => {
    ConsistencyChecker.clearValidationHistory();
  });

  it("should validate consistent dashboard data", () => {
    const data = createMockDashboardData();

    const result = ConsistencyChecker.validateCrossSection(data);

    expect(result).toBeDefined();
    expect(result.consistent).toBe(true);
    expect(result.inconsistencies).toHaveLength(0);
    expect(result.recommendedAction).toBe("ignore");
    expect(result.affectedSections).toHaveLength(0);
  });

  it("should detect favorites count inconsistency", () => {
    const data = createMockDashboardData();
    // Create inconsistency: stats say 10 favorites but array has 5
    data.stats.totalFavorites = 10;

    const result = ConsistencyChecker.validateCrossSection(data);

    expect(result.consistent).toBe(false);
    expect(result.inconsistencies.length).toBeGreaterThan(0);

    const favoritesInconsistency = result.inconsistencies.find(
      inc => inc.sections.includes("favorites") && inc.sections.includes("stats")
    );

    expect(favoritesInconsistency).toBeDefined();
    expect(favoritesInconsistency?.type).toBe("calculation");
    expect(favoritesInconsistency?.description).toContain("favorites");
    expect(favoritesInconsistency?.expectedValue).toBe(5);
    expect(favoritesInconsistency?.actualValue).toBe(10);
    expect(favoritesInconsistency?.autoResolvable).toBe(true);
  });

  it("should detect downloads count inconsistency", () => {
    const data = createMockDashboardData();
    // Create inconsistency: stats say 15 downloads but array has 10
    data.stats.totalDownloads = 15;

    const result = ConsistencyChecker.validateCrossSection(data);

    expect(result.consistent).toBe(false);

    const downloadsInconsistency = result.inconsistencies.find(
      inc => inc.sections.includes("downloads") && inc.sections.includes("stats")
    );

    expect(downloadsInconsistency).toBeDefined();
    expect(downloadsInconsistency?.type).toBe("calculation");
    expect(downloadsInconsistency?.expectedValue).toBe(10);
    expect(downloadsInconsistency?.actualValue).toBe(15);
  });

  it("should detect orders count inconsistency", () => {
    const data = createMockDashboardData();
    // Create inconsistency: stats say 5 orders but array has 3
    data.stats.totalOrders = 5;

    const result = ConsistencyChecker.validateCrossSection(data);

    expect(result.consistent).toBe(false);

    const ordersInconsistency = result.inconsistencies.find(
      inc => inc.sections.includes("orders") && inc.sections.includes("stats")
    );

    expect(ordersInconsistency).toBeDefined();
    expect(ordersInconsistency?.type).toBe("calculation");
    expect(ordersInconsistency?.expectedValue).toBe(3);
    expect(ordersInconsistency?.actualValue).toBe(5);
  });

  it("should detect total spent inconsistency", () => {
    const data = createMockDashboardData();
    // Create inconsistency: stats say $200 spent but calculated is $149.97
    data.stats.totalSpent = 200;

    const result = ConsistencyChecker.validateCrossSection(data);

    expect(result.consistent).toBe(false);

    const spentInconsistency = result.inconsistencies.find(
      inc =>
        inc.sections.includes("orders") &&
        inc.sections.includes("stats") &&
        inc.description.includes("total spent")
    );

    expect(spentInconsistency).toBeDefined();
    expect(spentInconsistency?.type).toBe("calculation");
    expect(spentInconsistency?.expectedValue).toBeCloseTo(149.97, 2);
    expect(spentInconsistency?.actualValue).toBe(200);
  });

  it("should detect quota exceeded inconsistency", () => {
    const data = createMockDashboardData();
    // Create inconsistency: quota used exceeds limit
    data.stats.quotaUsed = 60;
    data.stats.quotaLimit = 50;

    const result = ConsistencyChecker.validateCrossSection(data);

    expect(result.consistent).toBe(false);

    const quotaInconsistency = result.inconsistencies.find(
      inc => inc.sections.includes("stats") && inc.description.includes("quota")
    );

    expect(quotaInconsistency).toBeDefined();
    expect(quotaInconsistency?.type).toBe("calculation");
    expect(quotaInconsistency?.severity).toBe("high");
    expect(quotaInconsistency?.autoResolvable).toBe(false);
  });

  it("should detect duplicate data", () => {
    const data = createMockDashboardData();
    // Add duplicate favorite
    data.favorites.push({ ...data.favorites[0] });

    const result = ConsistencyChecker.validateCrossSection(data);

    expect(result.consistent).toBe(false);

    const duplicateInconsistency = result.inconsistencies.find(
      inc => inc.type === "duplicate_data" && inc.sections.includes("favorites")
    );

    expect(duplicateInconsistency).toBeDefined();
    expect(duplicateInconsistency?.severity).toBe("medium");
    expect(duplicateInconsistency?.autoResolvable).toBe(true);
  });

  it("should detect future timestamps", () => {
    const data = createMockDashboardData();
    // Set future timestamp (2 minutes from now)
    const futureDate = new Date(Date.now() + 2 * 60 * 1000).toISOString();
    data.favorites[0].createdAt = futureDate;

    const result = ConsistencyChecker.validateCrossSection(data);

    expect(result.consistent).toBe(false);

    const timingInconsistency = result.inconsistencies.find(
      inc => inc.type === "timing" && inc.sections.includes("favorites")
    );

    expect(timingInconsistency).toBeDefined();
    expect(timingInconsistency?.description).toContain("future timestamp");
    expect(timingInconsistency?.severity).toBe("medium");
    expect(timingInconsistency?.autoResolvable).toBe(false);
  });

  it("should recommend appropriate actions based on severity", () => {
    // Test critical inconsistency (missing data)
    const criticalData = {
      user: { id: "test", clerkId: "test", email: "test@test.com" },
      // Missing required sections
    } as any;

    const criticalResult = ConsistencyChecker.validateCrossSection(criticalData);
    expect(criticalResult.recommendedAction).toBe("reload");

    // Test high severity inconsistency
    const highSeverityData = createMockDashboardData();
    highSeverityData.stats.totalFavorites = 100; // Major inconsistency

    const highResult = ConsistencyChecker.validateCrossSection(highSeverityData);
    expect(highResult.recommendedAction).toBe("sync");
  });

  it("should store and retrieve validation history", () => {
    const data = createMockDashboardData();

    // Perform validation
    ConsistencyChecker.validateCrossSection(data);

    const history = ConsistencyChecker.getValidationHistory();
    expect(history).toHaveLength(1);
    expect(history[0].result.consistent).toBe(true); // Should be consistent with our fixed data
    expect(history[0].dataHash).toBeDefined();
    expect(history[0].timestamp).toBeDefined();
  });

  it("should provide consistency metrics", () => {
    const consistentData = createMockDashboardData();
    const inconsistentData = createMockDashboardData();
    inconsistentData.stats.totalFavorites = 100;

    // Perform multiple validations
    ConsistencyChecker.validateCrossSection(consistentData);
    ConsistencyChecker.validateCrossSection(inconsistentData);
    ConsistencyChecker.validateCrossSection(consistentData);

    const metrics = ConsistencyChecker.getConsistencyMetrics();

    expect(metrics.totalValidations).toBe(3);
    expect(metrics.consistentValidations).toBe(2);
    expect(metrics.consistencyRate).toBeCloseTo(66.67, 1);
    expect(metrics.averageInconsistencies).toBeGreaterThan(0);
    expect(metrics.mostCommonInconsistencyType).toBeDefined();
  });

  it("should handle multiple inconsistencies correctly", () => {
    const data = createMockDashboardData();

    // Create multiple inconsistencies
    data.stats.totalFavorites = 100; // Wrong favorites count
    data.stats.totalDownloads = 50; // Wrong downloads count
    data.stats.totalSpent = 1000; // Wrong total spent
    data.stats.quotaUsed = 60; // Quota exceeded

    const result = ConsistencyChecker.validateCrossSection(data);

    expect(result.consistent).toBe(false);
    expect(result.inconsistencies.length).toBeGreaterThanOrEqual(4);

    // Check that all expected inconsistencies are detected
    const inconsistencyTypes = result.inconsistencies.map(
      inc => `${inc.type}-${inc.sections.join(",")}`
    );

    expect(inconsistencyTypes.some(type => type.includes("favorites"))).toBe(true);
    expect(inconsistencyTypes.some(type => type.includes("downloads"))).toBe(true);
    expect(inconsistencyTypes.some(type => type.includes("orders"))).toBe(true);

    // Should recommend reload for critical issues (like $850+ difference)
    expect(result.recommendedAction).toBe("reload");
  });
});
