// Debug script to test ConsistencyChecker
const { ConsistencyChecker } = require("./client/src/utils/dataConsistency.ts");

// Mock the validation function
const mockValidation = {
  validateDashboardData: data => ({
    valid: true,
    errors: [],
    warnings: [],
    dataHash: "mock-hash",
    validatedAt: Date.now(),
  }),
  generateDataHash: data => {
    return JSON.stringify(data)
      .split("")
      .reduce((a, b) => {
        a = (a << 5) - a + b.charCodeAt(0);
        return a & a;
      }, 0)
      .toString(36);
  },
};

// Mock the shared modules
jest.doMock("../../shared/validation/sync", () => mockValidation);

const mockData = {
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
    status: "completed",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  })),
  downloads: Array.from({ length: 10 }, (_, i) => ({
    id: `download-${i + 1}`,
    beatId: i + 1,
    beatTitle: `Beat ${i + 1}`,
    format: "mp3",
    licenseType: "Basic",
    downloadedAt: new Date().toISOString(),
    downloadCount: 1,
  })),
  reservations: [],
  activity: [],
  chartData: [],
  trends: {
    orders: { period: "30d", value: 3, change: 1, changePercent: 50, isPositive: true },
    downloads: { period: "30d", value: 10, change: 2, changePercent: 25, isPositive: true },
    revenue: { period: "30d", value: 149.97, change: 49.99, changePercent: 50, isPositive: true },
    favorites: { period: "30d", value: 5, change: 1, changePercent: 25, isPositive: true },
  },
};

console.log("Testing ConsistencyChecker...");
console.log("Mock data:", JSON.stringify(mockData, null, 2));

try {
  const result = ConsistencyChecker.validateCrossSection(mockData);
  console.log("Validation result:", JSON.stringify(result, null, 2));
} catch (error) {
  console.error("Error during validation:", error);
}
