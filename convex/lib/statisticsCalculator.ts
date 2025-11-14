/**
 * Enhanced Statistics Calculator
 *
 * Comprehensive statistics calculation system for dashboard metrics
 * with proper currency handling and trend analysis.
 *
 * Requirements addressed:
 * - 8.1: Show favorites, downloads, orders, and revenue metrics
 * - 8.2: Provide period-over-period comparisons
 * - 8.3: Display interactive analytics with multiple time periods
 * - 8.4: Accurate calculations without hardcoded values
 * - 7.1: Proper currency formatting with symbols
 * - 7.4: Handle cents vs dollars consistently
 */

import type {
  ChartDataPoint,
  TrendData,
  TrendMetric,
  UserStats,
} from "../../shared/types/dashboard";

// Time period definitions for trend analysis
export type TimePeriod = "7d" | "30d" | "90d" | "1y";

// Granularity type alias to avoid union type warnings
export type Granularity = "day" | "week" | "month";

export interface PeriodConfig {
  days: number;
  label: string;
  granularity: Granularity;
}

export const PERIOD_CONFIGS: Record<TimePeriod, PeriodConfig> = {
  "7d": { days: 7, label: "Last 7 days", granularity: "day" },
  "30d": { days: 30, label: "Last 30 days", granularity: "day" },
  "90d": { days: 90, label: "Last 90 days", granularity: "week" },
  "1y": { days: 365, label: "Last year", granularity: "month" },
};

// Currency utilities with consistent dollar handling
export class CurrencyCalculator {
  /**
   * Convert cents to dollars with proper rounding
   */
  static centsToDollars(cents: number): number {
    if (typeof cents !== "number" || Number.isNaN(cents) || cents < 0) {
      return 0;
    }
    return Math.round(cents) / 100;
  }

  /**
   * Convert dollars to cents for storage
   */
  static dollarsToCents(dollars: number): number {
    if (typeof dollars !== "number" || Number.isNaN(dollars) || dollars < 0) {
      return 0;
    }
    return Math.round(dollars * 100);
  }

  /**
   * Format currency amount as dollars with proper symbols
   */
  static formatDollars(amount: number, showSymbol = true): string {
    const dollars = typeof amount === "number" ? amount : this.centsToDollars(amount);
    const formatted = dollars.toFixed(2);
    return showSymbol ? `$${formatted}` : formatted;
  }

  /**
   * Safely add currency amounts (handles both cents and dollars)
   */
  static addAmounts(amounts: number[], fromCents = true): number {
    const total = amounts.reduce((sum, amount) => {
      const value = typeof amount === "number" && !Number.isNaN(amount) ? amount : 0;
      return sum + value;
    }, 0);

    return fromCents ? this.centsToDollars(total) : total;
  }
}

// Date utilities for period calculations
export class DateCalculator {
  /**
   * Get date range for a specific period
   */
  static getPeriodRange(period: TimePeriod, endDate = new Date()): { start: Date; end: Date } {
    const config = PERIOD_CONFIGS[period];
    const start = new Date(endDate.getTime() - config.days * 24 * 60 * 60 * 1000);
    return { start, end: endDate };
  }

  /**
   * Get previous period range for comparison
   */
  static getPreviousPeriodRange(
    period: TimePeriod,
    endDate = new Date()
  ): { start: Date; end: Date } {
    const config = PERIOD_CONFIGS[period];
    const periodEnd = new Date(endDate.getTime() - config.days * 24 * 60 * 60 * 1000);
    const periodStart = new Date(periodEnd.getTime() - config.days * 24 * 60 * 60 * 1000);
    return { start: periodStart, end: periodEnd };
  }

  /**
   * Generate date buckets for chart data based on granularity
   */
  static generateDateBuckets(start: Date, end: Date, granularity: Granularity): string[] {
    const buckets: string[] = [];
    const current = new Date(start);

    while (current < end) {
      buckets.push(current.toISOString().split("T")[0]);

      switch (granularity) {
        case "day":
          current.setDate(current.getDate() + 1);
          break;
        case "week":
          current.setDate(current.getDate() + 7);
          break;
        case "month":
          current.setMonth(current.getMonth() + 1);
          break;
      }
    }

    return buckets;
  }

  /**
   * Get bucket key for a date based on granularity
   */
  static getBucketKey(date: Date, granularity: Granularity): string {
    switch (granularity) {
      case "day":
        return date.toISOString().split("T")[0];
      case "week": {
        // Get Monday of the week
        const monday = new Date(date);
        monday.setDate(date.getDate() - date.getDay() + 1);
        return monday.toISOString().split("T")[0];
      }
      case "month":
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-01`;
    }
  }
}

// Statistics calculation engine
export class StatisticsCalculator {
  /**
   * Calculate comprehensive user statistics
   */
  static calculateUserStats(data: {
    favorites: Array<Record<string, unknown>>;
    downloads: Array<{
      timestamp?: number;
    }>;
    orders: Array<{
      status: string;
      total?: number;
      createdAt: number;
    }>;
    quotas: Array<{
      quotaType: string;
      used?: number;
      limit?: number;
    }>;
    activityLog: Array<Record<string, unknown>>;
  }): UserStats {
    const { favorites, downloads, orders, quotas, activityLog } = data;

    // Filter completed orders for revenue calculation
    const completedOrders = orders.filter(
      order => order.status === "completed" || order.status === "paid"
    );

    // Calculate total spent (convert from cents to dollars)
    const totalSpent = CurrencyCalculator.addAmounts(
      completedOrders.map(order => order.total || 0),
      true // fromCents
    );

    // Get current month data for monthly metrics
    const now = new Date();
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

    const monthlyOrders = orders.filter(order => order.createdAt >= currentMonthStart);
    const monthlyDownloads = downloads.filter(
      download => (download.timestamp || 0) >= currentMonthStart
    );

    const monthlyRevenue = CurrencyCalculator.addAmounts(
      monthlyOrders
        .filter(order => order.status === "completed" || order.status === "paid")
        .map(order => order.total || 0),
      true // fromCents
    );

    // Get quota information
    const downloadQuota = quotas.find(q => q.quotaType === "downloads");

    return {
      totalFavorites: favorites.length,
      totalDownloads: downloads.length,
      totalOrders: orders.length,
      totalSpent,
      recentActivity: activityLog.length,
      quotaUsed: downloadQuota?.used || 0,
      quotaLimit: downloadQuota?.limit || 0,
      monthlyDownloads: monthlyDownloads.length,
      monthlyOrders: monthlyOrders.length,
      monthlyRevenue,
    };
  }

  /**
   * Calculate trend metric with period-over-period comparison
   */
  static calculateTrendMetric(
    currentValue: number,
    previousValue: number,
    period: TimePeriod
  ): TrendMetric {
    const change = currentValue - previousValue;
    const changePercent = previousValue > 0 ? (change / previousValue) * 100 : 0;

    return {
      period,
      value: currentValue,
      change,
      changePercent: Math.round(changePercent * 100) / 100, // Round to 2 decimal places
      isPositive: change >= 0,
    };
  }

  /**
   * Generate comprehensive trend data for multiple metrics
   */
  static calculateTrendData(
    currentPeriodData: {
      orders: Array<Record<string, unknown>>;
      downloads: Array<Record<string, unknown>>;
      favorites: Array<Record<string, unknown>>;
      revenue: number;
    },
    previousPeriodData: {
      orders: Array<Record<string, unknown>>;
      downloads: Array<Record<string, unknown>>;
      favorites: Array<Record<string, unknown>>;
      revenue: number;
    },
    period: TimePeriod = "30d"
  ): TrendData {
    return {
      orders: this.calculateTrendMetric(
        currentPeriodData.orders.length,
        previousPeriodData.orders.length,
        period
      ),
      downloads: this.calculateTrendMetric(
        currentPeriodData.downloads.length,
        previousPeriodData.downloads.length,
        period
      ),
      favorites: this.calculateTrendMetric(
        currentPeriodData.favorites.length,
        previousPeriodData.favorites.length,
        period
      ),
      revenue: this.calculateTrendMetric(
        currentPeriodData.revenue,
        previousPeriodData.revenue,
        period
      ),
    };
  }

  /**
   * Helper: Check if date is within range
   */
  private static isDateInRange(date: Date, start: Date, end: Date): boolean {
    return date >= start && date <= end;
  }

  /**
   * Helper: Aggregate orders into buckets
   */
  private static aggregateOrders(
    orders: Array<{ createdAt: number; status: string; total?: number }>,
    dataByBucket: Map<string, ChartDataPoint>,
    start: Date,
    end: Date,
    granularity: Granularity
  ): void {
    for (const order of orders) {
      const orderDate = new Date(order.createdAt);
      if (this.isDateInRange(orderDate, start, end)) {
        const bucketKey = DateCalculator.getBucketKey(orderDate, granularity);
        const bucket = dataByBucket.get(bucketKey);
        if (bucket) {
          bucket.orders += 1;
          if (order.status === "completed" || order.status === "paid") {
            bucket.revenue += CurrencyCalculator.centsToDollars(order.total || 0);
          }
        }
      }
    }
  }

  /**
   * Helper: Aggregate downloads into buckets
   */
  private static aggregateDownloads(
    downloads: Array<{ timestamp: number }>,
    dataByBucket: Map<string, ChartDataPoint>,
    start: Date,
    end: Date,
    granularity: Granularity
  ): void {
    for (const download of downloads) {
      const downloadDate = new Date(download.timestamp);
      if (this.isDateInRange(downloadDate, start, end)) {
        const bucketKey = DateCalculator.getBucketKey(downloadDate, granularity);
        const bucket = dataByBucket.get(bucketKey);
        if (bucket) {
          bucket.downloads += 1;
        }
      }
    }
  }

  /**
   * Helper: Aggregate favorites into buckets
   */
  private static aggregateFavorites(
    favorites: Array<{ createdAt: number }>,
    dataByBucket: Map<string, ChartDataPoint>,
    start: Date,
    end: Date,
    granularity: Granularity
  ): void {
    for (const favorite of favorites) {
      const favoriteDate = new Date(favorite.createdAt);
      if (this.isDateInRange(favoriteDate, start, end)) {
        const bucketKey = DateCalculator.getBucketKey(favoriteDate, granularity);
        const bucket = dataByBucket.get(bucketKey);
        if (bucket) {
          bucket.favorites += 1;
        }
      }
    }
  }

  /**
   * Generate chart data points for analytics visualization
   */
  static generateChartData(
    orders: Array<{
      createdAt: number;
      status: string;
      total?: number;
    }>,
    downloads: Array<{
      timestamp: number;
    }>,
    favorites: Array<{
      createdAt: number;
    }>,
    period: TimePeriod = "30d"
  ): ChartDataPoint[] {
    const { start, end } = DateCalculator.getPeriodRange(period);
    const config = PERIOD_CONFIGS[period];
    const buckets = DateCalculator.generateDateBuckets(start, end, config.granularity);

    // Initialize data structure
    const dataByBucket = new Map<string, ChartDataPoint>();
    for (const bucket of buckets) {
      dataByBucket.set(bucket, {
        date: bucket,
        orders: 0,
        downloads: 0,
        revenue: 0,
        favorites: 0,
      });
    }

    // Aggregate data using helper methods
    this.aggregateOrders(orders, dataByBucket, start, end, config.granularity);
    this.aggregateDownloads(downloads, dataByBucket, start, end, config.granularity);
    this.aggregateFavorites(favorites, dataByBucket, start, end, config.granularity);

    return Array.from(dataByBucket.values()).sort((a, b) => a.date.localeCompare(b.date));
  }

  /**
   * Calculate advanced metrics for detailed analytics
   */
  static calculateAdvancedMetrics(data: {
    orders: Array<{
      createdAt: number;
      status: string;
      total?: number;
    }>;
    downloads: Array<{
      timestamp: number;
    }>;
    favorites: Array<{
      createdAt: number;
    }>;
    period: TimePeriod;
  }): {
    conversionRates: {
      favoriteToDownload: number;
      downloadToOrder: number;
    };
    averageOrderValue: number;
    dailyAverages: {
      orders: number;
      downloads: number;
      favorites: number;
      revenue: number;
    };
    totalRevenue: number;
    periodDays: number;
  } {
    const { orders, downloads, favorites, period } = data;
    const { start, end } = DateCalculator.getPeriodRange(period);

    // Filter data for the period
    const periodOrders = orders.filter(order => {
      const orderDate = new Date(order.createdAt);
      return orderDate >= start && orderDate <= end;
    });

    const periodDownloads = downloads.filter(download => {
      const downloadDate = new Date(download.timestamp);
      return downloadDate >= start && downloadDate <= end;
    });

    const periodFavorites = favorites.filter(favorite => {
      const favoriteDate = new Date(favorite.createdAt);
      return favoriteDate >= start && favoriteDate <= end;
    });

    // Calculate conversion rates
    const favoriteToDownloadRate =
      periodFavorites.length > 0 ? (periodDownloads.length / periodFavorites.length) * 100 : 0;

    const downloadToOrderRate =
      periodDownloads.length > 0 ? (periodOrders.length / periodDownloads.length) * 100 : 0;

    // Calculate average order value
    const completedOrders = periodOrders.filter(
      order => order.status === "completed" || order.status === "paid"
    );

    const totalRevenue = CurrencyCalculator.addAmounts(
      completedOrders.map(order => order.total || 0),
      true
    );

    const averageOrderValue =
      completedOrders.length > 0 ? totalRevenue / completedOrders.length : 0;

    // Calculate daily averages
    const periodDays = PERIOD_CONFIGS[period].days;
    const dailyAverages = {
      orders: periodOrders.length / periodDays,
      downloads: periodDownloads.length / periodDays,
      favorites: periodFavorites.length / periodDays,
      revenue: totalRevenue / periodDays,
    };

    return {
      conversionRates: {
        favoriteToDownload: Math.round(favoriteToDownloadRate * 100) / 100,
        downloadToOrder: Math.round(downloadToOrderRate * 100) / 100,
      },
      averageOrderValue: Math.round(averageOrderValue * 100) / 100,
      dailyAverages: {
        orders: Math.round(dailyAverages.orders * 100) / 100,
        downloads: Math.round(dailyAverages.downloads * 100) / 100,
        favorites: Math.round(dailyAverages.favorites * 100) / 100,
        revenue: Math.round(dailyAverages.revenue * 100) / 100,
      },
      totalRevenue,
      periodDays,
    };
  }
}

// Classes and constants are already exported above, no need to re-export
