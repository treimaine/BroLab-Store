/**
 * Real-time Dashboard Hook
 *
 * Comprehensive hook that integrates all real-time features for the dashboard.
 *
 * Requirements addressed:
 * - 4.1: Real-time updates without full page refreshes
 * - 4.2: Optimistic updates for favorites, orders, and downloads with rollback capability
 * - 4.3: Connection status indicators and automatic reconnection logic
 * - 4.4: Selective real-time subscriptions based on active dashboard tab
 * - 4.5: Fallback to periodic polling when real-time fails
 */

import { useDashboard } from "@/hooks/useDashboard";
import { useDashboardTabs, type DashboardTab } from "@/hooks/useDashboardTabs";
import { useFallbackPolling } from "@/hooks/useFallbackPolling";
import { useOptimisticDownloads } from "@/hooks/useOptimisticDownloads";
import { useOptimisticFavorites } from "@/hooks/useOptimisticFavorites";
import { useOptimisticOrders } from "@/hooks/useOptimisticOrders";
import {
  useRealtimeConnection,
  useRealtimeSubscription,
  type RealtimeEvent,
} from "@/providers/DashboardRealtimeProvider";
import type { DashboardData } from "@shared/types/dashboard";
import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useState } from "react";

// Re-export DashboardTab for external use
export type { DashboardTab };

export interface RealtimeDashboardOptions {
  initialTab?: DashboardTab;
  enableOptimisticUpdates?: boolean;
  enableFallbackPolling?: boolean;
  autoConnect?: boolean;
}

export interface RealtimeDashboardHook extends DashboardData {
  // Connection state
  isConnected: boolean;
  connectionStatus: string;
  lastConnected: Date | null;
  reconnectAttempts: number;

  // Tab management
  activeTab: DashboardTab;
  setActiveTab: (tab: DashboardTab) => void;
  tabHistory: DashboardTab[];

  // Optimistic updates
  optimisticFavorites: ReturnType<typeof useOptimisticFavorites>;
  optimisticOrders: ReturnType<typeof useOptimisticOrders>;
  optimisticDownloads: ReturnType<typeof useOptimisticDownloads>;

  // Fallback polling
  isPolling: boolean;
  pollCount: number;
  lastPollTime: Date | null;
  forcePoll: () => Promise<void>;

  // Dashboard state
  isLoading: boolean;
  error: unknown;
  refetch: () => Promise<void>;

  // Connection controls
  connect: () => void;
  disconnect: () => void;
  reconnect: () => void;

  // Real-time events
  realtimeEvents: RealtimeEvent[];
  clearEvents: () => void;
}

const DEFAULT_OPTIONS: Required<RealtimeDashboardOptions> = {
  initialTab: "overview",
  enableOptimisticUpdates: true,
  enableFallbackPolling: true,
  autoConnect: true,
};

export function useRealtimeDashboard(
  options: RealtimeDashboardOptions = {}
): RealtimeDashboardHook {
  const config = { ...DEFAULT_OPTIONS, ...options };
  const queryClient = useQueryClient();

  // Core dashboard data
  const dashboardData = useDashboard({
    includeChartData: true,
    includeTrends: true,
    enableRealtime: true,
  });

  // Real-time connection
  const {
    isConnected,
    connectionStatus,
    lastConnected,
    reconnectAttempts,
    connect,
    disconnect,
    reconnect,
  } = useRealtimeConnection();

  // Tab management with selective subscriptions
  const { activeTab, setActiveTab, tabHistory, getActiveEvents } = useDashboardTabs(
    config.initialTab
  );

  // Optimistic updates
  const optimisticFavorites = useOptimisticFavorites();
  const optimisticOrders = useOptimisticOrders();
  const optimisticDownloads = useOptimisticDownloads();

  // Fallback polling
  const { isPolling, pollCount, lastPollTime, forcePoll } = useFallbackPolling({
    enabled: config.enableFallbackPolling,
    intervals: {
      disconnected: 30000,
      error: 60000,
      reconnecting: 15000,
    },
    queryKeys: [
      ["convex", "dashboard.getDashboardData"],
      ["convex", "favorites.getFavorites"],
      ["convex", "users.getUserStats"],
    ],
  });

  // Real-time events tracking
  const [realtimeEvents, setRealtimeEvents] = useState<RealtimeEvent[]>([]);

  // Handle real-time events
  const handleRealtimeEvent = useCallback(
    (event: RealtimeEvent) => {
      console.log("Received real-time event:", event);

      // Add to events history (keep last 50 events)
      setRealtimeEvents(prev => [event, ...prev.slice(0, 49)]);

      // Handle specific event types
      switch (event.type) {
        case "favorite_added":
        case "favorite_removed":
          queryClient.invalidateQueries({
            queryKey: ["convex", "favorites.getFavorites"],
          });
          break;

        case "order_created":
        case "order_updated":
          queryClient.invalidateQueries({
            queryKey: ["convex", "orders"],
          });
          break;

        case "download_completed":
          queryClient.invalidateQueries({
            queryKey: ["convex", "downloads"],
          });
          break;

        case "reservation_created":
        case "reservation_updated":
          queryClient.invalidateQueries({
            queryKey: ["convex", "reservations"],
          });
          break;

        case "activity_logged":
        case "stats_updated":
          queryClient.invalidateQueries({
            queryKey: ["convex", "dashboard.getDashboardData"],
          });
          break;
      }
    },
    [queryClient]
  );

  // Subscribe to real-time events for active tab
  useRealtimeSubscription(getActiveEvents(), handleRealtimeEvent);

  // Clear events history
  const clearEvents = useCallback(() => {
    setRealtimeEvents([]);
  }, []);

  // Auto-connect when enabled
  useEffect(() => {
    if (config.autoConnect && !isConnected) {
      connect();
    }
  }, [config.autoConnect, isConnected, connect]);

  // Enhanced refetch that works with both real-time and polling
  const enhancedRefetch = useCallback(async () => {
    if (isConnected) {
      // Use dashboard refetch when connected
      await dashboardData.refetch();
    } else {
      // Use force poll when disconnected
      await forcePoll();
    }
  }, [isConnected, dashboardData.refetch, forcePoll]);

  // Compute connection quality indicator
  const connectionQuality = useMemo(() => {
    if (isConnected) return "excellent";
    if (connectionStatus === "reconnecting") return "poor";
    if (isPolling) return "limited";
    return "offline";
  }, [isConnected, connectionStatus, isPolling]);

  // Compute overall loading state
  const isLoading = useMemo(() => {
    return dashboardData.isLoading || connectionStatus === "connecting";
  }, [dashboardData.isLoading, connectionStatus]);

  // Enhanced error handling
  const error = useMemo(() => {
    if (dashboardData.error) return dashboardData.error;
    if (connectionStatus === "error" && !isPolling) {
      return {
        type: "connection_error",
        message: "Real-time connection failed and polling is disabled",
        retryable: true,
      };
    }
    return null;
  }, [dashboardData.error, connectionStatus, isPolling]);

  return {
    // Dashboard data (spread from useDashboard)
    ...dashboardData,

    // Connection state
    isConnected,
    connectionStatus,
    lastConnected,
    reconnectAttempts,

    // Tab management
    activeTab,
    setActiveTab,
    tabHistory,

    // Optimistic updates
    optimisticFavorites,
    optimisticOrders,
    optimisticDownloads,

    // Fallback polling
    isPolling,
    pollCount,
    lastPollTime,
    forcePoll,

    // Enhanced state
    isLoading,
    error,
    refetch: enhancedRefetch,

    // Connection controls
    connect,
    disconnect,
    reconnect,

    // Real-time events
    realtimeEvents,
    clearEvents,
  };
}

// Specialized hook for specific dashboard tabs
export function useTabSpecificRealtime(tab: DashboardTab) {
  const { activeTab, setActiveTab } = useDashboardTabs();
  const isActive = activeTab === tab;

  // Only enable real-time features when this tab is active
  const realtimeDashboard = useRealtimeDashboard({
    initialTab: tab,
    enableOptimisticUpdates: isActive,
    enableFallbackPolling: isActive,
    autoConnect: isActive,
  });

  // Switch to this tab
  const activateTab = useCallback(() => {
    setActiveTab(tab);
  }, [tab, setActiveTab]);

  return {
    ...realtimeDashboard,
    isActive,
    activateTab,
  };
}

// Hook for monitoring real-time performance
export function useRealtimePerformance() {
  const { isConnected, connectionStatus, realtimeEvents, isPolling } = useRealtimeDashboard();
  const [metrics, setMetrics] = useState({
    eventsReceived: 0,
    averageLatency: 0,
    connectionUptime: 0,
    fallbackActivations: 0,
  });

  // Track events and calculate metrics
  useEffect(() => {
    if (realtimeEvents.length > 0) {
      const latestEvent = realtimeEvents[0];
      const latency = Date.now() - latestEvent.timestamp;

      setMetrics(prev => ({
        eventsReceived: prev.eventsReceived + 1,
        averageLatency: (prev.averageLatency + latency) / 2,
        connectionUptime: prev.connectionUptime,
        fallbackActivations: isPolling ? prev.fallbackActivations + 1 : prev.fallbackActivations,
      }));
    }
  }, [realtimeEvents, isPolling]);

  return {
    metrics,
    connectionQuality: isConnected ? "good" : isPolling ? "degraded" : "offline",
    isHealthy: isConnected || isPolling,
  };
}
