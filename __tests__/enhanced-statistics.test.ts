import {
/**
 * Enhanced Statistics System Tests
 *
 * Comprehensive tests for the enhanced statistics and metrics system
 * including currency calculations, trend analysis, and chart data generation.
 *
 * Requirements tested:
 * - 8.1: Show favorites, downloads, orders, and revenue metrics
 * - 8.2: Provide period-over-period comparisons
 * - 8.3: Display interactive analytics with multiple time periods
 * - 8.4: Accurate calculations without hardcoded values
 * - 7.1: Proper currency formatting with symbols
 * - 7.4: Handle cents vs dollars consistently
 */

  CurrencyCalculator,
  DateCalculator,
  PERIOD_CONFIGS,
  StatisticsCalculator,
} from "../convex/lib/statisticsCalculator";

describe(_"CurrencyCalculator", _() => {
  describe(_"centsToDollars", _() => {
    it(_"should convert cents to dollars correctly", _() => {
      expect(CurrencyCalculator.centsToDollars(2999)).toBe(29.99);
      expect(CurrencyCalculator.centsToDollars(0)).toBe(0);
      expect(CurrencyCalculator.centsToDollars(1)).toBe(0.01);
      expect(CurrencyCalculator.centsToDollars(100)).toBe(1.0);
    });

    it(_"should handle invalid inputs", _() => {
      expect(CurrencyCalculator.centsToDollars(NaN)).toBe(0);
      expect(CurrencyCalculator.centsToDollars(-100)).toBe(0);
      expect(CurrencyCalculator.centsToDollars(undefined as any)).toBe(0);
    });

    it(_"should round properly", _() => {
      expect(CurrencyCalculator.centsToDollars(2999.7)).toBe(30.0);
      expect(CurrencyCalculator.centsToDollars(2999.3)).toBe(29.99);
    });
  });

  describe(_"dollarsToCents", _() => {
    it(_"should convert dollars to cents correctly", _() => {
      expect(CurrencyCalculator.dollarsToCents(29.99)).toBe(2999);
      expect(CurrencyCalculator.dollarsToCents(0)).toBe(0);
      expect(CurrencyCalculator.dollarsToCents(0.01)).toBe(1);
      expect(CurrencyCalculator.dollarsToCents(1.0)).toBe(100);
    });

    it(_"should handle invalid inputs", _() => {
      expect(CurrencyCalculator.dollarsToCents(NaN)).toBe(0);
      expect(CurrencyCalculator.dollarsToCents(-10)).toBe(0);
      expect(CurrencyCalculator.dollarsToCents(undefined as any)).toBe(0);
    });
  });

  describe(_"formatDollars", _() => {
    it(_"should format currency with symbols", _() => {
      expect(CurrencyCalculator.formatDollars(29.99)).toBe("$29.99");
      expect(CurrencyCalculator.formatDollars(0)).toBe("$0.00");
      expect(CurrencyCalculator.formatDollars(1000.5)).toBe("$1000.50");
    });

    it(_"should format without symbols when requested", _() => {
      expect(CurrencyCalculator.formatDollars(29.99, false)).toBe("29.99");
      expect(CurrencyCalculator.formatDollars(0, false)).toBe("0.00");
    });

    it(_"should handle cents input", _() => {
      // formatDollars expects dollars, not cents
      expect(CurrencyCalculator.formatDollars(CurrencyCalculator.centsToDollars(2999))).toBe(
        "$29.99"
      );
    });
  });

  describe(_"addAmounts", _() => {
    it(_"should add amounts correctly from cents", _() => {
      const amounts = [2999, 1500, 500]; // $29.99, $15.00, $5.00
      expect(CurrencyCalculator.addAmounts(amounts, true)).toBe(49.99);
    });

    it(_"should add amounts correctly from dollars", _() => {
      const amounts = [29.99, 15.0, 5.0];
      expect(CurrencyCalculator.addAmounts(amounts, false)).toBeCloseTo(49.99, 2);
    });

    it(_"should handle invalid amounts", _() => {
      const amounts = [2999, NaN, undefined as unknown, 1500];
      expect(CurrencyCalculator.addAmounts(amounts, true)).toBe(44.99);
    });

    it(_"should handle empty array", _() => {
      expect(CurrencyCalculator.addAmounts([], true)).toBe(0);
    });
  });
});

describe(_"DateCalculator", _() => {
  const testDate = new Date("2024-01-15T12:00:00Z");

  describe(_"getPeriodRange", _() => {
    it(_"should calculate correct date ranges", _() => {
      const range7d = DateCalculator.getPeriodRange("7d", testDate);
      expect(range7d.end).toEqual(testDate);
      expect(range7d.start).toEqual(new Date("2024-01-08T12:00:00Z"));

      const range30d = DateCalculator.getPeriodRange("30d", testDate);
      expect(range30d.end).toEqual(testDate);
      expect(range30d.start).toEqual(new Date("2023-12-16T12:00:00Z"));
    });
  });

  describe(_"getPreviousPeriodRange", _() => {
    it(_"should calculate correct previous period ranges", _() => {
      const range = DateCalculator.getPreviousPeriodRange("7d", testDate);
      expect(range.end).toEqual(new Date("2024-01-08T12:00:00Z"));
      expect(range.start).toEqual(new Date("2024-01-01T12:00:00Z"));
    });
  });

  describe(_"generateDateBuckets", _() => {
    it(_"should generate daily buckets correctly", _() => {
      const start = new Date("2024-01-01");
      const end = new Date("2024-01-03");
      const buckets = DateCalculator.generateDateBuckets(start, end, "day");

      expect(buckets).toEqual(["2024-01-01", "2024-01-02"]);
    });

    it(_"should generate weekly buckets correctly", _() => {
      const start = new Date("2024-01-01");
      const end = new Date("2024-01-15");
      const buckets = DateCalculator.generateDateBuckets(start, end, "week");

      expect(buckets.length).toBe(2);
      expect(buckets[0]).toBe("2024-01-01");
    });
  });

  describe(_"getBucketKey", _() => {
    it(_"should generate correct bucket keys", _() => {
      const date = new Date("2024-01-15T15:30:00Z");

      expect(DateCalculator.getBucketKey(date, "day")).toBe("2024-01-15");
      expect(DateCalculator.getBucketKey(date, "month")).toBe("2024-01-01");
    });
  });
});

describe(_"StatisticsCalculator", _() => {
  const mockData = {
    favorites: [
      { _id: "1", createdAt: Date.now() - 86400000 }, // 1 day ago
      { _id: "2", createdAt: Date.now() - 172800000 }, // 2 days ago
    ],
    downloads: [
      { _id: "1", timestamp: Date.now() - 86400000 },
      { _id: "2", timestamp: Date.now() - 172800000 },
      { _id: "3", timestamp: Date.now() - 259200000 }, // 3 days ago
    ],
    orders: [
      {
        _id: "1",
        createdAt: Date.now() - 86400000,
        status: "completed",
        total: 2999, // $29.99 in cents
      },
      {
        _id: "2",
        createdAt: Date.now() - 172800000,
        status: "completed",
        total: 4999, // $49.99 in cents
      },
      {
        _id: "3",
        createdAt: Date.now() - 259200000,
        status: "pending",
        total: 1999, // Should not count in revenue
      },
    ],
    quotas: [{ quotaType: "downloads", used: 15, limit: 100 }],
    activityLog: [{ _id: "1" }, { _id: "2" }],
  };

  describe(_"calculateUserStats", _() => {
    it(_"should calculate comprehensive user statistics", _() => {
      const stats = StatisticsCalculator.calculateUserStats(mockData);

      expect(stats.totalFavorites).toBe(2);
      expect(stats.totalDownloads).toBe(3);
      expect(stats.totalOrders).toBe(3);
      expect(stats.totalSpent).toBe(79.98); // $29.99 + $49.99
      expect(stats.recentActivity).toBe(2);
      expect(stats.quotaUsed).toBe(15);
      expect(stats.quotaLimit).toBe(100);
    });

    it(_"should handle empty data", _() => {
      const emptyData = {
        favorites: [],
        downloads: [],
        orders: [],
        quotas: [],
        activityLog: [],
      };

      const stats = StatisticsCalculator.calculateUserStats(emptyData);

      expect(stats.totalFavorites).toBe(0);
      expect(stats.totalDownloads).toBe(0);
      expect(stats.totalOrders).toBe(0);
      expect(stats.totalSpent).toBe(0);
      expect(stats.quotaUsed).toBe(0);
      expect(stats.quotaLimit).toBe(0);
    });

    it(_"should only count completed orders in revenue", _() => {
      const dataWithPendingOrders = {
        ...mockData,
        orders: [
          { _id: "1", createdAt: Date.now(), status: "completed", total: 2999 },
          { _id: "2", createdAt: Date.now(), status: "pending", total: 4999 },
          { _id: "3", createdAt: Date.now(), status: "cancelled", total: 1999 },
        ],
      };

      const stats = StatisticsCalculator.calculateUserStats(dataWithPendingOrders);
      expect(stats.totalSpent).toBe(29.99); // Only completed order
    });
  });

  describe(_"calculateTrendMetric", _() => {
    it(_"should calculate positive trends correctly", _() => {
      const trend = StatisticsCalculator.calculateTrendMetric(120, 100, "30d");

      expect(trend.period).toBe("30d");
      expect(trend.value).toBe(120);
      expect(trend.change).toBe(20);
      expect(trend.changePercent).toBe(20);
      expect(trend.isPositive).toBe(true);
    });

    it(_"should calculate negative trends correctly", _() => {
      const trend = StatisticsCalculator.calculateTrendMetric(80, 100, "30d");

      expect(trend.value).toBe(80);
      expect(trend.change).toBe(-20);
      expect(trend.changePercent).toBe(-20);
      expect(trend.isPositive).toBe(false);
    });

    it(_"should handle zero previous value", _() => {
      const trend = StatisticsCalculator.calculateTrendMetric(50, 0, "30d");

      expect(trend.value).toBe(50);
      expect(trend.change).toBe(50);
      expect(trend.changePercent).toBe(0);
      expect(trend.isPositive).toBe(true);
    });
  });

  describe(_"calculateTrendData", _() => {
    it(_"should calculate comprehensive trend data", _() => {
      const currentData = {
        orders: mockData.orders.slice(0, 2), // 2 orders
        downloads: mockData.downloads, // 3 downloads
        favorites: mockData.favorites, // 2 favorites
        revenue: 79.98,
      };

      const previousData = {
        orders: [mockData.orders[0]], // 1 order
        downloads: mockData.downloads.slice(0, 2), // 2 downloads
        favorites: [mockData.favorites[0]], // 1 favorite
        revenue: 29.99,
      };

      const trends = StatisticsCalculator.calculateTrendData(currentData, previousData, "30d");

      expect(trends.orders.value).toBe(2);
      expect(trends.orders.change).toBe(1);
      expect(trends.orders.changePercent).toBe(100);
      expect(trends.orders.isPositive).toBe(true);

      expect(trends.downloads.value).toBe(3);
      expect(trends.downloads.change).toBe(1);
      expect(trends.downloads.changePercent).toBe(50);

      expect(trends.revenue.value).toBe(79.98);
      expect(trends.revenue.change).toBeCloseTo(49.99, 2);
    });
  });

  describe(_"generateChartData", _() => {
    it(_"should generate chart data for specified period", _() => {
      const chartData = StatisticsCalculator.generateChartData(
        mockData.orders,
        mockData.downloads,
        mockData.favorites,
        "7d"
      );

      expect(chartData).toHaveLength(7);
      expect(chartData[0]).toHaveProperty("date");
      expect(chartData[0]).toHaveProperty("orders");
      expect(chartData[0]).toHaveProperty("downloads");
      expect(chartData[0]).toHaveProperty("revenue");
      expect(chartData[0]).toHaveProperty("favorites");
    });

    it(_"should aggregate data correctly by date", _() => {
      // Create test data with recent dates that will be in the 7-day range
      const now = new Date();
      const testDate = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000); // 2 days ago

      const testOrders = [
        {
          _id: "1",
          createdAt: testDate.getTime(),
          status: "completed",
          total: 2999,
        },
        {
          _id: "2",
          createdAt: testDate.getTime(),
          status: "completed",
          total: 1999,
        },
      ];

      const testDownloads = [{ _id: "1", timestamp: testDate.getTime() }];

      const testFavorites = [{ _id: "1", createdAt: testDate.getTime() }];

      const chartData = StatisticsCalculator.generateChartData(
        testOrders,
        testDownloads,
        testFavorites,
        "7d"
      );

      // Find the data point for the test date
      const testDateStr = testDate.toISOString().split("T")[0];
      const dataPoint = chartData.find(d => d.date === testDateStr);
      expect(dataPoint).toBeDefined();
      expect(dataPoint?.orders).toBe(2);
      expect(dataPoint?.downloads).toBe(1);
      expect(dataPoint?.favorites).toBe(1);
      expect(dataPoint?.revenue).toBeCloseTo(49.98, 2); // $29.99 + $19.99
    });
  });

  describe(_"calculateAdvancedMetrics", _() => {
    it(_"should calculate conversion rates correctly", _() => {
      const metrics = StatisticsCalculator.calculateAdvancedMetrics({
        orders: mockData.orders.slice(0, 1), // 1 order
        downloads: mockData.downloads.slice(0, 2), // 2 downloads
        favorites: mockData.favorites, // 2 favorites
        period: "30d",
      });

      expect(metrics.conversionRates.favoriteToDownload).toBe(100); // 2 downloads / 2 favorites
      expect(metrics.conversionRates.downloadToOrder).toBe(50); // 1 order / 2 downloads
    });

    it(_"should calculate average order value", _() => {
      const completedOrders = mockData.orders.filter(o => o.status === "completed");
      const totalRevenue = CurrencyCalculator.addAmounts(
        completedOrders.map(o => o.total),
        true
      );
      const expectedAOV = totalRevenue / completedOrders.length;

      const metrics = StatisticsCalculator.calculateAdvancedMetrics({
        orders: mockData.orders,
        downloads: mockData.downloads,
        favorites: mockData.favorites,
        period: "30d",
      });

      expect(metrics.averageOrderValue).toBeCloseTo(expectedAOV, 2);
    });

    it(_"should calculate daily averages", _() => {
      const metrics = StatisticsCalculator.calculateAdvancedMetrics({
        orders: mockData.orders,
        downloads: mockData.downloads,
        favorites: mockData.favorites,
        period: "30d",
      });

      expect(metrics.dailyAverages.orders).toBeCloseTo(3 / 30, 2);
      expect(metrics.dailyAverages.downloads).toBeCloseTo(3 / 30, 2);
      expect(metrics.dailyAverages.favorites).toBeCloseTo(2 / 30, 2);
      expect(metrics.periodDays).toBe(30);
    });

    it(_"should handle zero values gracefully", _() => {
      const metrics = StatisticsCalculator.calculateAdvancedMetrics({
        orders: [],
        downloads: [],
        favorites: [],
        period: "7d",
      });

      expect(metrics.conversionRates.favoriteToDownload).toBe(0);
      expect(metrics.conversionRates.downloadToOrder).toBe(0);
      expect(metrics.averageOrderValue).toBe(0);
      expect(metrics.totalRevenue).toBe(0);
    });
  });
});

describe(_"PERIOD_CONFIGS", _() => {
  it(_"should have correct period configurations", _() => {
    expect(PERIOD_CONFIGS["7d"]).toEqual({
      days: 7,
      label: "Last 7 days",
      granularity: "day",
    });

    expect(PERIOD_CONFIGS["30d"]).toEqual({
      days: 30,
      label: "Last 30 days",
      granularity: "day",
    });

    expect(PERIOD_CONFIGS["90d"]).toEqual({
      days: 90,
      label: "Last 90 days",
      granularity: "week",
    });

    expect(PERIOD_CONFIGS["1y"]).toEqual({
      days: 365,
      label: "Last year",
      granularity: "month",
    });
  });
});

describe(_"Integration Tests", _() => {
  it(_"should maintain consistency between currency calculations", _() => {
    const centsValue = 2999;
    const dollarsValue = CurrencyCalculator.centsToDollars(centsValue);
    const backToCents = CurrencyCalculator.dollarsToCents(dollarsValue);

    expect(backToCents).toBe(centsValue);
  });

  it(_"should generate consistent chart data across different periods", _() => {
    const integrationMockData = {
      favorites: [
        { _id: "1", createdAt: Date.now() - 86400000 }, // 1 day ago
        { _id: "2", createdAt: Date.now() - 172800000 }, // 2 days ago
      ],
      downloads: [
        { _id: "1", timestamp: Date.now() - 86400000 },
        { _id: "2", timestamp: Date.now() - 172800000 },
        { _id: "3", timestamp: Date.now() - 259200000 }, // 3 days ago
      ],
      orders: [
        {
          _id: "1",
          createdAt: Date.now() - 86400000,
          status: "completed",
          total: 2999, // $29.99 in cents
        },
        {
          _id: "2",
          createdAt: Date.now() - 172800000,
          status: "completed",
          total: 4999, // $49.99 in cents
        },
      ],
    };

    const chartData7d = StatisticsCalculator.generateChartData(
      integrationMockData.orders,
      integrationMockData.downloads,
      integrationMockData.favorites,
      "7d"
    );

    const chartData30d = StatisticsCalculator.generateChartData(
      integrationMockData.orders,
      integrationMockData.downloads,
      integrationMockData.favorites,
      "30d"
    );

    expect(chartData7d.length).toBe(7);
    expect(chartData30d.length).toBe(30);

    // Both should have the same data structure
    expect(Object.keys(chartData7d[0])).toEqual(Object.keys(chartData30d[0]));
  });

  it(_"should calculate trends that match manual calculations", _() => {
    const currentRevenue = 100;
    const previousRevenue = 80;
    const expectedChange = 20;
    const expectedPercent = 25; // (20/80) * 100

    const trend = StatisticsCalculator.calculateTrendMetric(currentRevenue, previousRevenue, "30d");

    expect(trend.change).toBe(expectedChange);
    expect(trend.changePercent).toBe(expectedPercent);
  });
});
