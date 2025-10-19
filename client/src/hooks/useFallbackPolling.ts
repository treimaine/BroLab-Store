/**
 * Fallback Polling Hook
 *
 * Provides periodic data polling when real-time connections fail.
 *
 * Requirements addressed:
 * - 4.5: Fallback to periodic polling when real-time fails
 * - 4.3: Connection status and automatic reconnection logic
 */

import { useRealtimeConnection } from "@/providers/DashboardRealtimeProvider";
import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";

export interface FallbackPollingOptions {
  // Polling intervals for different connection states
  intervals: {
    disconnected: number;
    error: number;
    reconnecting: number;
  };

  // Query keys to refresh
  queryKeys: string[][];

  // Polling behavior
  enabled?: boolean;
  maxRetries?: number;
  backoffMultiplier?: number;
  maxInterval?: number;
}

export interface FallbackPollingHook {
  // State
  isPolling: boolean;
  pollCount: number;
  lastPollTime: Date | null;

  // Controls
  startPolling: () => void;
  stopPolling: () => void;
  forcePoll: () => Promise<void>;

  // Configuration
  updateOptions: (options: Partial<FallbackPollingOptions>) => void;
}

const DEFAULT_OPTIONS: FallbackPollingOptions = {
  intervals: {
    disconnected: 30000, // 30 seconds when disconnected
    error: 60000, // 1 minute when in error state
    reconnecting: 15000, // 15 seconds when reconnecting
  },
  queryKeys: [
    ["convex", "dashboard.getDashboardData"],
    ["convex", "dashboard.getDashboardStats"],
  ],
  enabled: true,
  maxRetries: 10,
  backoffMultiplier: 1.5,
  maxInterval: 300000, // 5 minutes max
};

export function useFallbackPolling(
  options: Partial<FallbackPollingOptions> = {}
): FallbackPollingHook {
  const queryClient = useQueryClient();
  const { connectionStatus, isConnected } = useRealtimeConnection();

  const [config, setConfig] = useState<FallbackPollingOptions>({
    ...DEFAULT_OPTIONS,
    ...options,
  });

  const [isPolling, setIsPolling] = useState(false);
  const [pollCount, setPollCount] = useState(0);
  const [lastPollTime, setLastPollTime] = useState<Date | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  const pollTimer = useRef<NodeJS.Timeout | null>(null);
  const isPollingRef = useRef(false);

  // Calculate current polling interval based on connection status
  const getCurrentInterval = useCallback(() => {
    let baseInterval: number;

    switch (connectionStatus) {
      case "disconnected":
        baseInterval = config.intervals.disconnected;
        break;
      case "error":
        baseInterval = config.intervals.error;
        break;
      case "reconnecting":
        baseInterval = config.intervals.reconnecting;
        break;
      default:
        return null; // Don't poll when connected
    }

    // Apply exponential backoff if there have been retries
    if (retryCount > 0) {
      const backoffInterval = baseInterval * Math.pow(config.backoffMultiplier || 1.5, retryCount);
      return Math.min(backoffInterval, config.maxInterval || 300000);
    }

    return baseInterval;
  }, [connectionStatus, config, retryCount]);

  // Execute polling operation
  const executePoll = useCallback(async () => {
    if (!config.enabled || isConnected) {
      return;
    }

    try {
      console.log("Executing fallback poll...");

      // Invalidate and refetch all configured queries
      const promises = config.queryKeys.map(queryKey =>
        queryClient.invalidateQueries({ queryKey })
      );

      await Promise.all(promises);

      // Update state
      setPollCount(prev => prev + 1);
      setLastPollTime(new Date());
      setRetryCount(0); // Reset retry count on success

      console.log("Fallback poll completed successfully");
    } catch (error) {
      console.error("Fallback poll failed:", error);

      setRetryCount(prev => {
        const newCount = prev + 1;
        if (newCount >= (config.maxRetries || 10)) {
          console.warn("Max polling retries reached, stopping polling");
          stopPolling();
        }
        return newCount;
      });
    }
  }, [config, isConnected, queryClient]);

  // Start polling
  const startPolling = useCallback(() => {
    if (isPollingRef.current || isConnected) {
      return;
    }

    console.log("Starting fallback polling");
    setIsPolling(true);
    isPollingRef.current = true;
    setRetryCount(0);

    const scheduleNextPoll = () => {
      const interval = getCurrentInterval();

      if (interval === null || !isPollingRef.current) {
        stopPolling();
        return;
      }

      pollTimer.current = setTimeout(() => {
        if (isPollingRef.current) {
          executePoll().finally(() => {
            if (isPollingRef.current) {
              scheduleNextPoll();
            }
          });
        }
      }, interval);
    };

    // Execute first poll immediately
    executePoll().finally(() => {
      if (isPollingRef.current) {
        scheduleNextPoll();
      }
    });
  }, [isConnected, getCurrentInterval, executePoll]);

  // Stop polling
  const stopPolling = useCallback(() => {
    console.log("Stopping fallback polling");

    if (pollTimer.current) {
      clearTimeout(pollTimer.current);
      pollTimer.current = null;
    }

    setIsPolling(false);
    isPollingRef.current = false;
  }, []);

  // Force immediate poll
  const forcePoll = useCallback(async () => {
    await executePoll();
  }, [executePoll]);

  // Update configuration
  const updateOptions = useCallback((newOptions: Partial<FallbackPollingOptions>) => {
    setConfig(prev => ({ ...prev, ...newOptions }));
  }, []);

  // Auto-start/stop polling based on connection status
  useEffect(() => {
    if (!config.enabled) {
      stopPolling();
      return;
    }

    if (isConnected) {
      // Stop polling when connected
      stopPolling();
    } else if (connectionStatus === "disconnected" || connectionStatus === "error") {
      // Start polling when disconnected or in error state
      if (!isPollingRef.current) {
        startPolling();
      }
    }
  }, [isConnected, connectionStatus, config.enabled, startPolling, stopPolling]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopPolling();
    };
  }, [stopPolling]);

  return {
    isPolling,
    pollCount,
    lastPollTime,
    startPolling,
    stopPolling,
    forcePoll,
    updateOptions,
  };
}

// Hook for smart polling based on tab visibility and priority
export function useSmartFallbackPolling(
  tabPriority: "high" | "medium" | "low",
  customQueryKeys?: string[][]
) {
  const [isVisible, setIsVisible] = useState(!document.hidden);

  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsVisible(!document.hidden);
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, []);

  // Adjust polling intervals based on tab priority and visibility
  const getPollingOptions = useCallback((): Partial<FallbackPollingOptions> => {
    const baseIntervals = {
      high: { disconnected: 15000, error: 30000, reconnecting: 10000 },
      medium: { disconnected: 30000, error: 60000, reconnecting: 20000 },
      low: { disconnected: 60000, error: 120000, reconnecting: 45000 },
    };

    let intervals = baseIntervals[tabPriority];

    // Increase intervals when tab is not visible
    if (!isVisible) {
      intervals = {
        disconnected: intervals.disconnected * 2,
        error: intervals.error * 2,
        reconnecting: intervals.reconnecting * 2,
      };
    }

    return {
      intervals,
      queryKeys: customQueryKeys,
      enabled: true,
    };
  }, [tabPriority, isVisible, customQueryKeys]);

  return useFallbackPolling(getPollingOptions());
}

// Hook for dashboard-specific fallback polling
export function useDashboardFallbackPolling() {
  return useFallbackPolling({
    intervals: {
      disconnected: 30000, // 30 seconds
      error: 60000, // 1 minute
      reconnecting: 15000, // 15 seconds
    },
    queryKeys: [
      ["convex", "dashboard.getDashboardData"],
      ["convex", "favorites.getFavorites"],
      ["convex", "users.getUserStats"],
    ],
    enabled: true,
    maxRetries: 15,
    backoffMultiplier: 1.3,
    maxInterval: 300000, // 5 minutes
  });
}
