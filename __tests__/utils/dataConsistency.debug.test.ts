/**
 * Debug Test for Data Consistency
 */

import { ConsistencyChecker } from "../../client/src/utils/dataConsistency";

// Mock the validation function
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

describe("Debug ConsistencyChecker", () => {
  beforeEach(() => {
    ConsistencyChecker.clearValidationHistory();
  });

  it("should debug what inconsistencies are found in 'consistent' data", () => {
    const data = {
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
        orders: {
          period: "30d" as const,
          value: 3,
          change: 1,
          changePercent: 50,
          isPositive: true,
        },
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
    };

    // Calculate expected values
    const actualTotalSpent = data.orders
      .filter(order => order.status === "completed" || order.status === "paid")
      .reduce((sum, order) => sum + order.total, 0);

    console.log("=== DEBUG INFO ===");
    console.log("Stats totalFavorites:", data.stats.totalFavorites);
    console.log("Actual favorites count:", data.favorites.length);
    console.log("Stats totalDownloads:", data.stats.totalDownloads);
    console.log("Actual downloads count:", data.downloads.length);
    console.log("Stats totalOrders:", data.stats.totalOrders);
    console.log("Actual orders count:", data.orders.length);
    console.log("Stats totalSpent:", data.stats.totalSpent);
    console.log("Calculated totalSpent:", actualTotalSpent);

    const result = ConsistencyChecker.validateCrossSection(data);

    console.log("=== VALIDATION RESULT ===");
    console.log("Consistent:", result.consistent);
    console.log("Inconsistencies count:", result.inconsistencies.length);
    console.log("Recommended action:", result.recommendedAction);

    if (result.inconsistencies.length > 0) {
      console.log("=== INCONSISTENCIES ===");
      result.inconsistencies.forEach((inc, i) => {
        console.log(`${i + 1}. [${inc.severity}] ${inc.type} in ${inc.sections.join(", ")}`);
        console.log(`   Description: ${inc.description}`);
        if (inc.expectedValue !== undefined && inc.actualValue !== undefined) {
          console.log(`   Expected: ${inc.expectedValue}, Actual: ${inc.actualValue}`);
        }
        console.log(`   Auto-resolvable: ${inc.autoResolvable}`);
        console.log("");
      });
    }

    // The test should pass regardless of the result for debugging
    expect(result).toBeDefined();
  });
});
