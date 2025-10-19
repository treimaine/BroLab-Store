/**
 * Data Validation Integration Tests
 *
 * Comprehensive tests for the real-time data validation and integrity
 * checking system. Tests validation services, freshness monitoring,
 * and integration with dashboard components.
 */

import { useDataValidation } from "@/hooks/useDataValidation";
import {
  DataFreshnessMonitor,
  destroyDataFreshnessMonitor,
  getDataFreshnessMonitor,
} from "@/services/DataFreshnessMonitor";
import {
  DataValidationService,
  destroyDataValidationService,
  getDataValidationService,
} from "@/services/DataValidationService";
import type { DashboardData } from "@shared/types/dashboard";
import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi, type MockedFunction } from "vitest";

// Mock the dashboard store
vi.mock("@/store/useDashboardStore", () => ({
  useDashboardStore: vi.fn(() => ({
    data: null,
    lastUpdated: {},
    dataVersion: 1,
    forceSync: vi.fn(),
  })),
}));

// Mock the error logging service
vi.mock("@/services/ErrorLoggingService", () => ({
  getErrorLoggingService: vi.fn(() => ({
    logError: vi.fn(),
    logSystemEvent: vi.fn(),
    logPerformance: vi.fn(),
  })),
}));

// Test data
const createMockDashboardData = (overrides: Partial<DashboardData> = {}): DashboardData => ({
  user: {
    id: "user_123",
    clerkId: "clerk_123",
    email: "test@example.com",
    firstName: "Test",
    lastName: "User",
  },
  stats: {
    totalFavorites: 5,
    totalDownloads: 10,
    totalOrders: 3,
    totalSpent: 150.0,
    recentActivity: 2,
    quotaUsed: 8,
    quotaLimit: 50,
    monthlyDownloads: 8,
    monthlyOrders: 2,
    monthlyRevenue: 100.0,
    calculatedAt: new Date().toISOString(),
    dataHash: "test_hash_123",
    source: "database",
    version: 1,
  },
  favorites: [
    {
      id: "fav_1",
      beatId: 101,
      beatTitle: "Test Beat 1",
      beatArtist: "Test Artist",
      beatGenre: "Hip Hop",
      beatBpm: 120,
      beatPrice: 29.99,
      createdAt: new Date().toISOString(),
    },
    {
      id: "fav_2",
      beatId: 102,
      beatTitle: "Test Beat 2",
      beatArtist: "Test Artist 2",
      beatGenre: "Trap",
      beatBpm: 140,
      beatPrice: 39.99,
      createdAt: new Date().toISOString(),
    },
  ],
  orders: [
    {
      id: "order_1",
      orderNumber: "ORD-001",
      items: [],
      total: 50.0,
      currency: "USD",
      status: "completed",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ],
  downloads: [
    {
      id: "download_1",
      beatId: 101,
      beatTitle: "Test Beat 1",
      format: "mp3",
      licenseType: "Basic",
      downloadedAt: new Date().toISOString(),
      downloadCount: 1,
    },
  ],
  reservations: [],
  activity: [
    {
      id: "activity_1",
      type: "favorite_added",
      description: "Added Test Beat 1 to favorites",
      timestamp: new Date().toISOString(),
      metadata: { beatId: "101" },
    },
  ],
  chartData: [],
  trends: {
    orders: {
      period: "30d",
      value: 3,
      change: 1,
      changePercent: 50,
      isPositive: true,
    },
    downloads: {
      period: "30d",
      value: 10,
      change: 2,
      changePercent: 25,
      isPositive: true,
    },
    revenue: {
      period: "30d",
      value: 150,
      change: 50,
      changePercent: 50,
      isPositive: true,
    },
    favorites: {
      period: "30d",
      value: 5,
      change: 2,
      changePercent: 67,
      isPositive: true,
    },
  },
  ...overrides,
});

const createMockDataWithMockIndicators = (): DashboardData => {
  return createMockDashboardData({
    user: {
      id: "user_123",
      clerkId: "clerk_123",
      email: "test@example.com", // This will be flagged as mock data
      firstName: "John Doe", // This will be flagged as mock data
      lastName: "Test User", // This will be flagged as mock data
    },
    stats: {
      totalFavorites: 100, // Suspiciously round number
      totalDownloads: 1000, // Suspiciously round number
      totalOrders: 0, // Generic value
      totalSpent: 999999, // Generic test value
      recentActivity: 0,
      quotaUsed: 0,
      quotaLimit: 100,
      monthlyDownloads: 0,
      monthlyOrders: 0,
      monthlyRevenue: 0,
      calculatedAt: new Date().toISOString(),
      dataHash: "mock_hash",
      source: "cache",
      version: 1,
    },
    favorites: [
      {
        id: "fav_mock",
        beatId: 123456, // Generic test number
        beatTitle: "Sample Beat", // Placeholder text
        beatArtist: "Test Artist", // Placeholder text
        beatGenre: "Example Genre", // Placeholder text
        beatBpm: 120,
        beatPrice: 0, // Generic value
        createdAt: new Date().toISOString(),
      },
    ],
  });
};

describe("DataValidationService", () => {
  let validationService: DataValidationService;

  beforeEach(() => {
    validationService = getDataValidationService();
  });

  afterEach(() => {
    destroyDataValidationService();
  });

  describe("validateDataIntegrity", () => {
    it("should validate real data successfully", async () => {
      const mockData = createMockDashboardData();

      const report = await validationService.validateDataIntegrity(mockData);

      expect(report.status).toBe("valid");
      expect(report.sourceValidation.isRealData).toBe(true);
      expect(report.sourceValidation.hasMockData).toBe(false);
      expect(report.crossValidation.consistent).toBe(true);
      expect(report.dataValidation.valid).toBe(true);
      expect(report.inconsistencies).toHaveLength(0);
    });

    it("should detect mock data indicators", async () => {
      const mockData = createMockDataWithMockIndicators();

      const report = await validationService.validateDataIntegrity(mockData);

      expect(report.sourceValidation.hasMockData).toBe(true);
      expect(report.sourceValidation.mockIndicators.length).toBeGreaterThan(0);

      // Check for specific mock indicators
      const mockIndicators = report.sourceValidation.mockIndicators;
      expect(mockIndicators.some(indicator => indicator.field.includes("email"))).toBe(true);
      expect(mockIndicators.some(indicator => indicator.type === "placeholder_text")).toBe(true);
    });

    it("should detect data inconsistencies", async () => {
      const inconsistentData = createMockDashboardData({
        stats: {
          totalFavorites: 1, // Inconsistent with favorites array length (2)
          totalDownloads: 5, // Inconsistent with downloads array length (1)
          totalOrders: 10, // Inconsistent with orders array length (1)
          totalSpent: 150.0,
          recentActivity: 2,
          quotaUsed: 8,
          quotaLimit: 50,
          monthlyDownloads: 8,
          monthlyOrders: 2,
          monthlyRevenue: 100.0,
          calculatedAt: new Date().toISOString(),
          dataHash: "test_hash_123",
          source: "database",
          version: 1,
        },
      });

      const report = await validationService.validateDataIntegrity(inconsistentData);

      expect(report.crossValidation.consistent).toBe(false);
      expect(report.inconsistencies.length).toBeGreaterThan(0);

      // Check for specific inconsistencies
      const inconsistencies = report.inconsistencies;
      expect(inconsistencies.some(inc => inc.sections.includes("favorites"))).toBe(true);
      expect(inconsistencies.some(inc => inc.type === "calculation")).toBe(true);
    });

    it("should validate data freshness", async () => {
      const staleData = createMockDashboardData({
        stats: {
          ...createMockDashboardData().stats,
          calculatedAt: new Date(Date.now() - 10 * 60 * 1000).toISOString(), // 10 minutes ago
        },
      });

      const report = await validationService.validateDataIntegrity(staleData);

      expect(report.sourceValidation.isFresh).toBe(false);
      expect(report.sourceValidation.freshnessWarnings.length).toBeGreaterThan(0);
    });

    it("should provide appropriate recommendations", async () => {
      const mockData = createMockDataWithMockIndicators();

      const report = await validationService.validateDataIntegrity(mockData);

      expect(report.recommendations.length).toBeGreaterThan(0);
      expect(report.recommendations.some(rec => rec.type === "refresh_data")).toBe(true);
    });
  });

  describe("shouldRefreshData", () => {
    it("should recommend refresh for mock data", async () => {
      const mockData = createMockDataWithMockIndicators();
      const report = await validationService.validateDataIntegrity(mockData);

      const shouldRefresh = validationService.shouldRefreshData(report);
      expect(shouldRefresh).toBe(true);
    });

    it("should not recommend refresh for fresh real data", async () => {
      const realData = createMockDashboardData();
      const report = await validationService.validateDataIntegrity(realData);

      const shouldRefresh = validationService.shouldRefreshData(report);
      expect(shouldRefresh).toBe(false);
    });
  });

  describe("getDataFreshnessIndicator", () => {
    it("should return fresh indicator for recent data", async () => {
      const recentData = createMockDashboardData();
      const report = await validationService.validateDataIntegrity(recentData);

      const indicator = validationService.getDataFreshnessIndicator(report);
      expect(indicator.status).toBe("fresh");
      expect(indicator.color).toBe("green");
    });

    it("should return stale indicator for old data", async () => {
      const staleData = createMockDashboardData({
        stats: {
          ...createMockDashboardData().stats,
          calculatedAt: new Date(Date.now() - 15 * 60 * 1000).toISOString(), // 15 minutes ago
        },
      });
      const report = await validationService.validateDataIntegrity(staleData);

      const indicator = validationService.getDataFreshnessIndicator(report);
      expect(indicator.status).toBe("outdated");
      expect(indicator.color).toBe("red");
    });

    it("should return unknown indicator for mock data", async () => {
      const mockData = createMockDataWithMockIndicators();
      const report = await validationService.validateDataIntegrity(mockData);

      const indicator = validationService.getDataFreshnessIndicator(report);
      expect(indicator.status).toBe("unknown");
      expect(indicator.color).toBe("gray");
    });
  });
});

describe("DataFreshnessMonitor", () => {
  let freshnessMonitor: DataFreshnessMonitor;

  beforeEach(() => {
    freshnessMonitor = getDataFreshnessMonitor({
      checkInterval: 1000, // 1 second for testing
      autoRefresh: false,
    });
  });

  afterEach(() => {
    destroyDataFreshnessMonitor();
  });

  describe("startMonitoring", () => {
    it("should start monitoring successfully", () => {
      freshnessMonitor.startMonitoring();

      const status = freshnessMonitor.getFreshnessStatus();
      expect(status.isActive).toBe(true);
    });

    it("should not start monitoring twice", () => {
      freshnessMonitor.startMonitoring();
      freshnessMonitor.startMonitoring(); // Second call should be ignored

      const status = freshnessMonitor.getFreshnessStatus();
      expect(status.isActive).toBe(true);
    });
  });

  describe("checkFreshness", () => {
    it("should check freshness of provided data", async () => {
      const mockData = createMockDashboardData();

      const status = await freshnessMonitor.checkFreshness(mockData);

      expect(status.overallStatus).toBe("fresh");
      expect(Object.keys(status.sections)).toContain("stats");
      expect(Object.keys(status.sections)).toContain("favorites");
    });

    it("should detect stale sections", async () => {
      // Mock the store to return old timestamps
      const { useDashboardStore } = await import("@/store/useDashboardStore");
      const mockStore = useDashboardStore as MockedFunction<typeof useDashboardStore>;

      mockStore.mockReturnValue({
        data: createMockDashboardData(),
        lastUpdated: {
          stats: Date.now() - 10 * 60 * 1000, // 10 minutes ago
          favorites: Date.now() - 5 * 60 * 1000, // 5 minutes ago
        },
        dataVersion: 1,
        forceSync: vi.fn(),
      });

      const mockData = createMockDashboardData();
      const status = await freshnessMonitor.checkFreshness(mockData);

      expect(status.overallStatus).toBe("stale");
      expect(status.sections.stats.status).toBe("stale");
    });
  });

  describe("addEventListener", () => {
    it("should add and remove event listeners", () => {
      const listener = vi.fn();

      const unsubscribe = freshnessMonitor.addEventListener(listener);
      expect(typeof unsubscribe).toBe("function");

      unsubscribe();
      // Listener should be removed (no direct way to test this without triggering events)
    });
  });
});

describe("useDataValidation hook", () => {
  beforeEach(() => {
    // Mock the dashboard store
    const { useDashboardStore } = vi.mocked(await import("@/store/useDashboardStore"));
    useDashboardStore.mockReturnValue({
      data: createMockDashboardData(),
      dataVersion: 1,
      lastUpdated: {},
      forceSync: vi.fn(),
    });
  });

  afterEach(() => {
    destroyDataValidationService();
    destroyDataFreshnessMonitor();
  });

  it("should initialize with default options", async () => {
    const { result } = renderHook(() => useDataValidation());

    await waitFor(() => {
      expect(result.current.isValidating).toBe(false);
    });

    expect(result.current.integrityReport).toBeDefined();
    expect(result.current.isValid).toBe(true);
    expect(result.current.isFresh).toBe(true);
    expect(result.current.hasMockData).toBe(false);
  });

  it("should detect mock data", async () => {
    // Mock the store with mock data
    const { useDashboardStore } = vi.mocked(await import("@/store/useDashboardStore"));
    useDashboardStore.mockReturnValue({
      data: createMockDataWithMockIndicators(),
      dataVersion: 1,
      lastUpdated: {},
      forceSync: vi.fn(),
    });

    const { result } = renderHook(() => useDataValidation());

    await waitFor(() => {
      expect(result.current.hasMockData).toBe(true);
    });

    expect(result.current.isValid).toBe(false);
    expect(result.current.integrityReport?.sourceValidation.mockIndicators.length).toBeGreaterThan(
      0
    );
  });

  it("should provide manual validation trigger", async () => {
    const { result } = renderHook(() => useDataValidation({ autoValidate: false }));

    expect(result.current.integrityReport).toBeNull();

    await act(async () => {
      await result.current.validateNow();
    });

    expect(result.current.integrityReport).toBeDefined();
  });

  it("should provide freshness indicator", async () => {
    const { result } = renderHook(() => useDataValidation());

    await waitFor(() => {
      expect(result.current.integrityReport).toBeDefined();
    });

    const indicator = result.current.getFreshnessIndicator();
    expect(indicator).toHaveProperty("status");
    expect(indicator).toHaveProperty("color");
    expect(indicator).toHaveProperty("message");
    expect(indicator).toHaveProperty("lastUpdated");
  });

  it("should handle validation errors gracefully", async () => {
    // Mock validation service to throw error
    const mockValidationService = {
      validateDataIntegrity: vi.fn().mockRejectedValue(new Error("Validation failed")),
      getDataFreshnessIndicator: vi.fn(),
      shouldRefreshData: vi.fn(),
    };

    vi.doMock("@/services/DataValidationService", () => ({
      getDataValidationService: () => mockValidationService,
    }));

    const { result } = renderHook(() => useDataValidation());

    await waitFor(() => {
      expect(result.current.validationError).toBeDefined();
    });

    expect(result.current.validationError?.message).toBe("Validation failed");
  });
});

describe("Integration Tests", () => {
  afterEach(() => {
    destroyDataValidationService();
    destroyDataFreshnessMonitor();
  });

  it("should integrate validation service with freshness monitor", async () => {
    const validationService = getDataValidationService();
    const freshnessMonitor = getDataFreshnessMonitor();

    const mockData = createMockDashboardData();

    // Validate data
    const report = await validationService.validateDataIntegrity(mockData);
    expect(report.status).toBe("valid");

    // Check freshness
    const status = await freshnessMonitor.checkFreshness(mockData);
    expect(status.overallStatus).toBe("fresh");
  });

  it("should handle production mock data alerts", async () => {
    // Mock production environment
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = "production";

    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    try {
      const validationService = getDataValidationService();
      const mockData = createMockDataWithMockIndicators();

      const report = await validationService.validateDataIntegrity(mockData);

      expect(report.sourceValidation.hasMockData).toBe(true);
      expect(report.status).toBe("critical");

      // Should have logged error for production mock data
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("Mock data detected in production")
      );
    } finally {
      process.env.NODE_ENV = originalEnv;
      consoleSpy.mockRestore();
    }
  });

  it("should provide comprehensive validation workflow", async () => {
    const validationService = getDataValidationService();
    const freshnessMonitor = getDataFreshnessMonitor();

    // Start with mock data
    const mockData = createMockDataWithMockIndicators();

    // Validate and detect issues
    const report = await validationService.validateDataIntegrity(mockData);
    expect(report.sourceValidation.hasMockData).toBe(true);
    expect(validationService.shouldRefreshData(report)).toBe(true);

    // Check freshness
    const status = await freshnessMonitor.checkFreshness(mockData);
    expect(status.overallStatus).toBe("critical");

    // Get freshness indicator
    const indicator = validationService.getDataFreshnessIndicator(report);
    expect(indicator.status).toBe("unknown");
    expect(indicator.color).toBe("gray");
  });
});
