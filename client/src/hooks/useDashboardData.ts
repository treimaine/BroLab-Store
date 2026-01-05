/**
 * Real Dashboard Data Hook
 *
 * This hook replaces mock data with real data from Convex database.
 * It integrates with the unified dashboard store to provide consistent,
 * real-time data across all dashboard sections.
 *
 * FIX: Added visibility-aware query control to prevent "thundering herd"
 * freeze when tab becomes visible. Convex queries are paused when tab
 * is hidden and resumed with staggered delays when visible.
 */

import { useConvexQueryEnabled } from "@/providers/ConvexVisibilityProvider";
import { useDashboardStore } from "@/stores/useDashboardStore";
import type { DashboardData } from "@shared/types/dashboard";
import { SyncErrorType, type ConsistentUserStats } from "@shared/types/sync";
import { useQuery } from "convex/react";
import { useEffect, useRef } from "react";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore - Avoiding circular type dependency
import { api } from "@convex/_generated/api";

interface UseDashboardDataOptions {
  includeChartData?: boolean;
  includeTrends?: boolean;
  period?: "7d" | "30d" | "90d" | "1y";
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
    period = "30d",
    activityLimit = 20,
    ordersLimit = 20,
    downloadsLimit = 50,
    favoritesLimit = 50,
    reservationsLimit = 20,
  } = options;

  // Get store actions
  const { setData, setLoading, setError, clearError } = useDashboardStore();

  // Track if we've initialized data to prevent unnecessary re-fetching
  const initializedRef = useRef(false);

  // FIX: Check if Convex queries should be active (visibility-aware)
  // This prevents the "thundering herd" freeze when tab becomes visible
  const isConvexEnabled = useConvexQueryEnabled();

  // Fetch dashboard data from Convex with real-time updates
  // FIX: Use "skip" to disable query when tab is hidden
  const dashboardData = useQuery(
    // @ts-expect-error - Type instantiation is excessively deep with Convex conditional args
    api.dashboard.getDashboardData,
    isConvexEnabled
      ? {
          includeChartData,
          includeTrends,
          period,
          activityLimit,
          ordersLimit,
          downloadsLimit,
          favoritesLimit,
          reservationsLimit,
        }
      : "skip"
  );

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
        type: SyncErrorType.AUTHENTICATION_ERROR,
        message: "Authentication required to load dashboard data",
        retryable: true,
        retryCount: 0,
        maxRetries: 3,
        timestamp: Date.now(),
        context: { source: "useDashboardData", action: "authentication_check" },
        fingerprint: `auth_error_${Date.now()}`,
      });
      return;
    }

    // Data loaded successfully
    try {
      // Transform and validate the data with proper source metadata
      // Ensure all Convex IDs and timestamps are preserved for validation
      const transformedData: DashboardData = {
        user: {
          ...dashboardData.user,
          // Ensure user ID is preserved for Convex ID validation
          id: dashboardData.user.id,
        },
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
          // Add source metadata for validation (ConsistentUserStats fields)
          source: "database" as const,
          calculatedAt: new Date().toISOString(),
          dataHash: "", // Will be calculated by validation service
          version: 1,
        } as ConsistentUserStats,
        // Preserve Convex IDs and timestamps in all collections
        // These are critical for source validation
        favorites: (dashboardData.favorites || []).map(fav => ({
          ...fav,
          id: fav.id, // Preserve Convex ID
          createdAt: fav.createdAt, // Preserve timestamp
        })),
        orders: (dashboardData.orders || []).map(order => ({
          ...order,
          id: order.id, // Preserve Convex ID
          createdAt: order.createdAt, // Preserve timestamp
          updatedAt: order.updatedAt, // Preserve timestamp
        })),
        downloads: (dashboardData.downloads || []).map(download => ({
          ...download,
          id: download.id, // Preserve Convex ID
          downloadedAt: download.downloadedAt, // Preserve timestamp
        })),
        reservations: (dashboardData.reservations || []).map(reservation => ({
          ...reservation,
          id: reservation.id, // Preserve Convex ID
          createdAt: reservation.createdAt, // Preserve timestamp
          updatedAt: reservation.updatedAt, // Preserve timestamp
        })),
        activity: (dashboardData.activity || []).map(activity => ({
          ...activity,
          id: activity.id, // Preserve Convex ID
          timestamp: activity.timestamp, // Preserve timestamp
        })),
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
      const errorMessage =
        error instanceof Error ? error.message : "Failed to process dashboard data";
      setError({
        type: SyncErrorType.DATA_INCONSISTENCY,
        message: errorMessage,
        retryable: true,
        retryCount: 0,
        maxRetries: 3,
        timestamp: Date.now(),
        context: {
          source: "useDashboardData",
          action: "data_processing",
          originalError: error instanceof Error ? error : undefined,
        },
        fingerprint: `data_error_${errorMessage.slice(0, 20)}_${Date.now()}`,
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
  // FIX: Check if Convex queries should be active (visibility-aware)
  const isConvexEnabled = useConvexQueryEnabled();

  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore - Type inference issue with Convex API
  const analyticsData = useQuery(
    api.dashboard.getAnalyticsData,
    isConvexEnabled ? { period } : "skip"
  );

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
  // FIX: Check if Convex queries should be active (visibility-aware)
  const isConvexEnabled = useConvexQueryEnabled();

  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore - Type inference issue with Convex API
  const stats = useQuery(api.dashboard.getDashboardStats, isConvexEnabled ? {} : "skip");

  return {
    stats,
    isLoading: stats === undefined,
    hasError: stats === null,
  };
}
