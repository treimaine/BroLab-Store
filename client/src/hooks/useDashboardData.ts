/**
 * Real Dashboard Data Hook
 *
 * This hook replaces mock data with real data from Convex database.
 * It integrates with the unified dashboard store to provide consistent,
 * real-time data across all dashboard sections.
 */

import { useDashboardStore } from "@/store/useDashboardStore";
import { api } from "@convex/_generated/api";
import type { DashboardData } from "@shared/types/dashboard";
import { SyncErrorType } from "@shared/types/sync";
import { useQuery } from "convex/react";
import { useEffect, useRef } from "react";

interface UseDashboardDataOptions {
  includeChartData?: boolean;
  includeTrends?: boolean;
  activityLimit?: number;
  ordersLimit?: number;
  downloadsLimit?: number;
  favoritesLimit?: number;
  reservationsLimit?: number;
  enableRealTimeSync?: boolean;
}

/**
 * Hook to fetch and manage real dashboard data from Convex
 */
export function useDashboardData(options: UseDashboardDataOptions = {}) {
  const {
    includeChartData = true,
    includeTrends = true,
    activityLimit = 20,
    ordersLimit = 20,
    downloadsLimit = 50,
    favoritesLimit = 50,
    reservationsLimit = 20,
    enableRealTimeSync = true,
  } = options;

  // Get store actions
  const { setData, setLoading, setError, clearError } = useDashboardStore();

  // Track if we've initialized data to prevent unnecessary re-fetching
  const initializedRef = useRef(false);

  // Fetch dashboard data from Convex with real-time updates
  const dashboardData = useQuery(api.dashboard.getDashboardData, {
    includeChartData,
    includeTrends,
    activityLimit,
    ordersLimit,
    downloadsLimit,
    favoritesLimit,
    reservationsLimit,
  });

  // Handle loading states and data updates
  useEffect(() => {
    if (dashboardData === undefined) {
      // Data is loading
      if (!initializedRef.current) {
        setLoading(true);
        clearError();
      }
      return;
    }

    if (dashboardData === null) {
      // User not authenticated or error occurred
      setLoading(false);
      setError({
        type: "AUTHENTICATION_ERROR" as unknown,
        message: "Authentication required to load dashboard data",
        retryable: true,
        retryCount: 0,
        maxRetries: 3,
        timestamp: Date.now(),
        context: { source: "useDashboardData", action: "authentication_check" },
      });
      return;
    }

    // Data loaded successfully
    try {
      // Transform and validate the data
      const transformedData: DashboardData = {
        user: dashboardData.user,
        stats: {
          ...dashboardData.stats,
          // Ensure all stats are numbers and properly formatted
          totalFavorites: Number(dashboardData.stats.totalFavorites) || 0,
          totalDownloads: Number(dashboardData.stats.totalDownloads) || 0,
          totalOrders: Number(dashboardData.stats.totalOrders) || 0,
          totalSpent: Number(dashboardData.stats.totalSpent) || 0,
          recentActivity: Number(dashboardData.stats.recentActivity) || 0,
          quotaUsed: Number(dashboardData.stats.quotaUsed) || 0,
          quotaLimit: Number(dashboardData.stats.quotaLimit) || 0,
          monthlyDownloads: Number(dashboardData.stats.monthlyDownloads) || 0,
          monthlyOrders: Number(dashboardData.stats.monthlyOrders) || 0,
          monthlyRevenue: Number(dashboardData.stats.monthlyRevenue) || 0,
        },
        favorites: dashboardData.favorites || [],
        orders: dashboardData.orders || [],
        downloads: dashboardData.downloads || [],
        reservations: dashboardData.reservations || [],
        activity: dashboardData.activity || [],
        chartData: dashboardData.chartData || [],
        trends: dashboardData.trends,
      };

      // Update the unified store with real data
      setData(transformedData);
      setLoading(false);
      clearError();
      initializedRef.current = true;

      console.log("✅ Real dashboard data loaded:", {
        user: transformedData.user.email,
        stats: transformedData.stats,
        dataArrays: {
          favorites: transformedData.favorites.length,
          orders: transformedData.orders.length,
          downloads: transformedData.downloads.length,
          reservations: transformedData.reservations.length,
          activity: transformedData.activity.length,
        },
      });
    } catch (error) {
      console.error("❌ Error processing dashboard data:", error);
      setLoading(false);
      setError({
        type: SyncErrorType.DATA_INCONSISTENCY,
        message: error instanceof Error ? error.message : "Failed to process dashboard data",
        retryable: true,
        retryCount: 0,
        maxRetries: 3,
        timestamp: Date.now(),
        context: { source: "useDashboardData", action: "data_processing", error },
      });
    }
  }, [dashboardData, setData, setLoading, setError, clearError]);

  return {
    isLoading: dashboardData === undefined,
    hasError: dashboardData === null,
    isInitialized: initializedRef.current,
    refetch: () => {
      // Convex handles refetching automatically, but we can force a re-initialization
      initializedRef.current = false;
    },
  };
}

/**
 * Hook to fetch analytics data for specific time periods
 */
export function useAnalyticsData(period: "7d" | "30d" | "90d" | "1y" = "30d") {
  const analyticsData = useQuery(api.dashboard.getAnalyticsData, { period });

  return {
    data: analyticsData,
    isLoading: analyticsData === undefined,
    hasError: analyticsData === null,
  };
}

/**
 * Hook to fetch lightweight dashboard stats only
 */
export function useDashboardStats() {
  const stats = useQuery(api.dashboard.getDashboardStats);

  return {
    stats,
    isLoading: stats === undefined,
    hasError: stats === null,
  };
}
