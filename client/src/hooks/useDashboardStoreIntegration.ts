/**
 * Dashboard Store Integration Hook
 *
 * This hook integrates the new unified dashboard store with the existing
 * dashboard data fetching logic, providing a smooth transition and
 * maintaining backward compatibility while adding real-time sync capabilities.
 */

import type { DashboardOptions } from "@/hooks/useDashboard";
import { api } from "@/lib/convex-api";
import {
  useDashboardData,
  useDashboardError,
  useDashboardLoading,
  useDashboardStore,
  useSyncStatus,
} from "@/stores/useDashboardStore";
import { useUser } from "@clerk/clerk-react";
import type { DashboardData } from "@shared/types/dashboard";
import { useQuery } from "convex/react";
import { useCallback, useEffect, useMemo } from "react";

// ================================
// INTEGRATION HOOK
// ================================

/**
 * Enhanced dashboard hook that uses the unified store
 * while maintaining compatibility with existing components
 */
export function useEnhancedDashboard(options: DashboardOptions = {}) {
  const { user: clerkUser, isLoaded: isClerkLoaded } = useUser();
  const store = useDashboardStore();

  // Get data from store
  const storeData = useDashboardData();
  const syncStatus = useSyncStatus();
  const isStoreLoading = useDashboardLoading();
  const storeError = useDashboardError();

  // Authentication state
  const isAuthenticated = Boolean(clerkUser && isClerkLoaded);

  // Merge options with defaults
  const config = useMemo(
    () => ({
      includeChartData: true,
      includeTrends: true,
      activityLimit: 20,
      ordersLimit: 20,
      downloadsLimit: 50,
      favoritesLimit: 50,
      reservationsLimit: 20,
      enableRealtime: true,
      cacheTime: 5 * 60 * 1000,
      ...options,
    }),
    [options]
  );

  // Query arguments for Convex
  const queryArgs = useMemo(() => {
    if (!isAuthenticated) return "skip" as const;

    return {
      includeChartData: config.includeChartData,
      includeTrends: config.includeTrends,
      activityLimit: config.activityLimit,
      ordersLimit: config.ordersLimit,
      downloadsLimit: config.downloadsLimit,
      favoritesLimit: config.favoritesLimit,
      reservationsLimit: config.reservationsLimit,
    };
  }, [isAuthenticated, config]);

  // Convex query for data fetching
  const convexData = useQuery(
    api.dashboard.getDashboardData,
    queryArgs === "skip" ? "skip" : queryArgs
  );

  // Update store when Convex data changes
  useEffect(() => {
    if (convexData && typeof convexData === "object") {
      const dashboardData = convexData as DashboardData;

      // Update store with new data
      store.setData(dashboardData);

      // Update sync status
      store.setSyncStatus({
        connected: true,
        connectionType: "websocket",
        lastSync: Date.now(),
        syncInProgress: false,
      });
    }
  }, [convexData, store]);

  // Handle authentication changes
  useEffect(() => {
    if (!isAuthenticated && storeData) {
      // Clear store when user logs out
      store.reset();
    }
  }, [isAuthenticated, storeData, store]);

  // Handle loading states
  const isLoading = useMemo(() => {
    return !isClerkLoaded || (isAuthenticated && !storeData && isStoreLoading);
  }, [isClerkLoaded, isAuthenticated, storeData, isStoreLoading]);

  // Handle errors
  const error = useMemo(() => {
    if (!isClerkLoaded) return null;

    if (!isAuthenticated) {
      return {
        type: "auth_error" as const,
        message: "Authentication required. Please sign in to access your dashboard.",
        code: "auth_required",
        timestamp: Date.now(),
        context: {},
        retryable: false,
        retryCount: 0,
        maxRetries: 0,
      };
    }

    return storeError;
  }, [isClerkLoaded, isAuthenticated, storeError]);

  // Refetch function
  const refetch = useCallback(async (): Promise<void> => {
    try {
      store.setLoading(true);
      await store.forceSync();
    } catch (err) {
      console.error("Failed to refetch dashboard data:", err);
      throw err;
    } finally {
      store.setLoading(false);
    }
  }, [store]);

  // Optimistic update function
  const optimisticUpdate = useCallback(
    (update: Partial<DashboardData>): void => {
      store.mergeData(update);
    },
    [store]
  );

  // Retry function
  const retry = useCallback((): void => {
    if (error?.retryable) {
      refetch().catch(console.error);
    }
  }, [error, refetch]);

  // Clear error function
  const clearError = useCallback((): void => {
    store.clearError();
  }, [store]);

  // Return enhanced dashboard data with store integration
  return {
    // Dashboard data (with fallback for compatibility)
    user: storeData?.user || null,
    stats: storeData?.stats || {
      totalFavorites: 0,
      totalDownloads: 0,
      totalOrders: 0,
      totalSpent: 0,
      recentActivity: 0,
      quotaUsed: 0,
      quotaLimit: 0,
      monthlyDownloads: 0,
      monthlyOrders: 0,
      monthlyRevenue: 0,
    },
    favorites: storeData?.favorites || [],
    orders: storeData?.orders || [],
    downloads: storeData?.downloads || [],
    reservations: storeData?.reservations || [],
    activity: storeData?.activity || [],
    chartData: storeData?.chartData || [],
    trends: storeData?.trends || {
      orders: { period: "30d", value: 0, change: 0, changePercent: 0, isPositive: true },
      downloads: { period: "30d", value: 0, change: 0, changePercent: 0, isPositive: true },
      revenue: { period: "30d", value: 0, change: 0, changePercent: 0, isPositive: true },
      favorites: { period: "30d", value: 0, change: 0, changePercent: 0, isPositive: true },
    },

    // State
    isLoading,
    error,
    isAuthenticated,

    // Enhanced state from store
    syncStatus,
    dataVersion: store.dataVersion,
    inconsistencies: store.inconsistencies,
    memoryStats: store.memoryStats,

    // Actions
    refetch,
    optimisticUpdate,
    retry,
    clearError,

    // Enhanced actions from store
    validateData: store.validateData,
    validateCrossSection: store.validateCrossSection,
    detectInconsistencies: store.detectInconsistencies,
    subscribe: store.subscribe,
    publish: store.publish,
    applyOptimisticUpdate: store.applyOptimisticUpdate,
    confirmOptimisticUpdate: store.confirmOptimisticUpdate,
    rollbackOptimisticUpdate: store.rollbackOptimisticUpdate,
  };
}

// Export the hook
export default useEnhancedDashboard;
