/* eslint-disable react-refresh/only-export-components -- Provider pattern exports both provider component and debug components */
/**
 * Cache Provider Component
 *
 * Provides caching context and initialization for the entire application.
 * Handles cache warming, monitoring, and optimization.
 *
 * Features:
 * - Exponential backoff for failed operations
 * - User-facing toast notifications for operation status
 * - Maximum retry limits to prevent API hammering
 * - Visual status indicators for cache health
 */

import { toast } from "@/hooks/use-toast";
import { useCache } from "@/hooks/useCache";
import { useCacheWarming } from "@/hooks/useCachingStrategy";
import { useUser } from "@clerk/clerk-react";
import { ReactNode, createContext, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { DataType, cachingStrategy } from "../services/cachingStrategy";

type CacheHealthStatus = "excellent" | "good" | "fair" | "poor";

// Backoff configuration for retry logic
const BACKOFF_CONFIG = {
  initialDelay: 30_000, // 30 seconds
  maxDelay: 5 * 60_000, // 5 minutes max
  multiplier: 2, // Double delay on each failure
  maxRetries: 5, // Stop after 5 consecutive failures
} as const;

type CacheOperationType = "metrics" | "optimization" | "warm" | "clear";

export type { CacheOperationType };

interface OperationStatus {
  failureCount: number;
  currentDelay: number;
  isPaused: boolean;
  lastError?: string;
}

interface CacheContextValue {
  isInitialized: boolean;
  isWarming: boolean;
  cacheHealth: CacheHealthStatus;
  metrics: {
    hitRate: number;
    totalQueries: number;
    cacheSize: number;
  };
  operationStatuses: Record<CacheOperationType, OperationStatus>;
  actions: {
    warmCache: () => Promise<void>;
    clearCache: () => Promise<void>;
    optimizeCache: () => Promise<void>;
    resumeOperation: (operation: CacheOperationType) => void;
  };
}

export const CacheContext = createContext<CacheContextValue | null>(null);

interface CacheProviderProps {
  readonly children: ReactNode;
}

export function CacheProvider({ children }: Readonly<CacheProviderProps>) {
  const { isLoaded: authLoaded, isSignedIn } = useUser();
  const [isInitialized, setIsInitialized] = useState(false);
  const [isWarming, setIsWarming] = useState(false);
  const [cacheHealth, setCacheHealth] = useState<CacheHealthStatus>("good");
  const [metrics, setMetrics] = useState({
    hitRate: 0,
    totalQueries: 0,
    cacheSize: 0,
  });

  // Track operation statuses for backoff and retry logic
  const [operationStatuses, setOperationStatuses] = useState<
    Record<CacheOperationType, OperationStatus>
  >({
    metrics: { failureCount: 0, currentDelay: BACKOFF_CONFIG.initialDelay, isPaused: false },
    optimization: { failureCount: 0, currentDelay: BACKOFF_CONFIG.initialDelay, isPaused: false },
    warm: { failureCount: 0, currentDelay: BACKOFF_CONFIG.initialDelay, isPaused: false },
    clear: { failureCount: 0, currentDelay: BACKOFF_CONFIG.initialDelay, isPaused: false },
  });

  // Helper to calculate backoff delay
  const calculateBackoffDelay = useCallback(
    (operation: CacheOperationType): number => {
      const status = operationStatuses[operation];
      if (status.failureCount === 0) {
        return operation === "metrics" ? 30_000 : 5 * 60_000; // Default intervals
      }
      const delay = Math.min(
        BACKOFF_CONFIG.initialDelay * Math.pow(BACKOFF_CONFIG.multiplier, status.failureCount),
        BACKOFF_CONFIG.maxDelay
      );
      return delay;
    },
    [operationStatuses]
  );

  // Helper to handle operation failure with backoff
  const handleOperationFailure = useCallback(
    (operation: CacheOperationType, error: unknown): void => {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";

      setOperationStatuses(prev => {
        const current = prev[operation];
        const newFailureCount = current.failureCount + 1;
        const isPaused = newFailureCount >= BACKOFF_CONFIG.maxRetries;
        const newDelay = Math.min(
          BACKOFF_CONFIG.initialDelay * Math.pow(BACKOFF_CONFIG.multiplier, newFailureCount),
          BACKOFF_CONFIG.maxDelay
        );

        // Show toast notification based on failure count
        if (isPaused) {
          toast({
            title: "Cache operation suspended",
            description: `${operation} failed ${newFailureCount} times. Click to retry.`,
            variant: "destructive",
          });
        } else if (newFailureCount >= 2) {
          toast({
            title: "Cache operation failing",
            description: `${operation} attempt ${newFailureCount}/${BACKOFF_CONFIG.maxRetries}. Retrying in ${Math.round(newDelay / 1000)}s.`,
            variant: "default",
          });
        }

        return {
          ...prev,
          [operation]: {
            failureCount: newFailureCount,
            currentDelay: newDelay,
            isPaused,
            lastError: errorMessage,
          },
        };
      });
    },
    []
  );

  // Helper to reset operation status on success
  const handleOperationSuccess = useCallback((operation: CacheOperationType): void => {
    setOperationStatuses(prev => {
      const current = prev[operation];
      // Only show success toast if we were previously failing
      if (current.failureCount > 0) {
        toast({
          title: "Cache operation recovered",
          description: `${operation} is working again.`,
        });
      }
      return {
        ...prev,
        [operation]: {
          failureCount: 0,
          currentDelay: BACKOFF_CONFIG.initialDelay,
          isPaused: false,
          lastError: undefined,
        },
      };
    });
  }, []);

  // Resume a paused operation
  const resumeOperation = useCallback((operation: CacheOperationType): void => {
    setOperationStatuses(prev => ({
      ...prev,
      [operation]: {
        failureCount: 0,
        currentDelay: BACKOFF_CONFIG.initialDelay,
        isPaused: false,
        lastError: undefined,
      },
    }));
    toast({
      title: "Operation resumed",
      description: `${operation} will retry now.`,
    });
  }, []);

  // Public data - can be warmed immediately without auth
  const publicWarmingData = useMemo(
    () => [
      {
        key: "featured-beats",
        dataType: DataType.DYNAMIC,
        fetcher: async () => {
          const response = await fetch("/api/beats/featured");
          if (!response.ok) throw new Error("Failed to fetch featured beats");
          return response.json();
        },
        priority: "high" as const,
      },
      {
        key: "categories",
        dataType: DataType.STATIC,
        fetcher: async () => {
          const response = await fetch("/api/categories");
          if (!response.ok) throw new Error("Failed to fetch categories");
          return response.json();
        },
        priority: "medium" as const,
      },
    ],
    []
  );

  // Auth-required data - only warm after auth state is confirmed
  const authRequiredWarmingData = useMemo(
    () => [
      {
        key: "subscription-plans",
        dataType: DataType.STATIC,
        fetcher: async () => {
          const response = await fetch("/api/subscription/plans");
          // Gracefully handle 401 if auth state changes during fetch
          if (response.status === 401) {
            return null;
          }
          if (!response.ok) throw new Error("Failed to fetch subscription plans");
          return response.json();
        },
        priority: "high" as const,
      },
    ],
    []
  );

  // Warm public data immediately
  useCacheWarming(publicWarmingData);

  // Warm auth-required data only after auth state is confirmed and user is signed in
  useCacheWarming(authLoaded && isSignedIn ? authRequiredWarmingData : []);

  // Update cache metrics and health - defined before useEffect that uses it
  const updateMetrics = useCallback(() => {
    // Skip if metrics operation is paused
    if (operationStatuses.metrics.isPaused) {
      return;
    }

    try {
      const performanceMetrics = cachingStrategy.getPerformanceMetrics();

      setMetrics({
        hitRate: performanceMetrics.cacheHitRate,
        totalQueries: performanceMetrics.totalQueries,
        cacheSize: performanceMetrics.cacheSize,
      });

      // Determine cache health based on metrics
      const health = calculateCacheHealth(
        performanceMetrics.cacheHitRate,
        performanceMetrics.averageResponseTime
      );

      setCacheHealth(health);
      handleOperationSuccess("metrics");
    } catch (error) {
      console.error("Failed to update cache metrics:", error);
      handleOperationFailure("metrics", error);
      setCacheHealth("poor");
    }
  }, [operationStatuses.metrics.isPaused, handleOperationSuccess, handleOperationFailure]);

  // Track tab visibility to pause timers when hidden (saves bandwidth and battery)
  const [isTabVisible, setIsTabVisible] = useState(() => !document.hidden);
  const metricsTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const optimizationTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Listen for visibility changes
  useEffect(() => {
    const handleVisibilityChange = (): void => {
      setIsTabVisible(!document.hidden);
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  // Initialize cache on mount (runs once)
  useEffect(() => {
    const initializeCache = async (): Promise<void> => {
      try {
        setIsWarming(true);

        // Initialize service worker cache
        await cachingStrategy.initialize();

        // Preload critical data
        await cachingStrategy.preloadCriticalData();

        // Update metrics
        updateMetrics();

        setIsInitialized(true);
        console.log("✅ Cache provider initialized successfully");
      } catch (error) {
        console.error("❌ Failed to initialize cache provider:", error);
      } finally {
        setIsWarming(false);
      }
    };

    initializeCache();
  }, [updateMetrics]);

  // Schedule metrics updates with backoff
  const scheduleMetricsUpdate = useCallback(() => {
    if (metricsTimeoutRef.current) {
      clearTimeout(metricsTimeoutRef.current);
    }

    const delay = calculateBackoffDelay("metrics");

    metricsTimeoutRef.current = setTimeout(() => {
      updateMetrics();
      // Reschedule if not paused
      if (!operationStatuses.metrics.isPaused) {
        scheduleMetricsUpdate();
      }
    }, delay);
  }, [calculateBackoffDelay, updateMetrics, operationStatuses.metrics.isPaused]);

  // Schedule optimization with backoff
  const scheduleOptimization = useCallback(() => {
    if (optimizationTimeoutRef.current) {
      clearTimeout(optimizationTimeoutRef.current);
    }

    // Skip if paused
    if (operationStatuses.optimization.isPaused) {
      return;
    }

    const delay = calculateBackoffDelay("optimization");

    optimizationTimeoutRef.current = setTimeout(async () => {
      try {
        await cachingStrategy.optimizeCache();
        handleOperationSuccess("optimization");
      } catch (error) {
        console.error("Cache optimization failed:", error);
        handleOperationFailure("optimization", error);
      }
      // Reschedule if not paused
      if (!operationStatuses.optimization.isPaused) {
        scheduleOptimization();
      }
    }, delay);
  }, [
    calculateBackoffDelay,
    handleOperationSuccess,
    handleOperationFailure,
    operationStatuses.optimization.isPaused,
  ]);

  // Manage periodic timers based on tab visibility
  useEffect(() => {
    // Clear existing timeouts when tab becomes hidden
    const clearTimeouts = (): void => {
      if (metricsTimeoutRef.current) {
        clearTimeout(metricsTimeoutRef.current);
        metricsTimeoutRef.current = null;
      }
      if (optimizationTimeoutRef.current) {
        clearTimeout(optimizationTimeoutRef.current);
        optimizationTimeoutRef.current = null;
      }
    };

    if (!isTabVisible) {
      clearTimeouts();
      return;
    }

    // Tab is visible - start scheduled operations
    // Run immediately when tab becomes visible again
    updateMetrics();

    // Schedule periodic updates with backoff support
    scheduleMetricsUpdate();
    scheduleOptimization();

    return clearTimeouts;
  }, [isTabVisible, updateMetrics, scheduleMetricsUpdate, scheduleOptimization]);

  // Cache actions - memoized to prevent unnecessary re-renders
  const warmCache = useCallback(async () => {
    setIsWarming(true);
    try {
      await cachingStrategy.preloadCriticalData();
      updateMetrics();
      handleOperationSuccess("warm");
      toast({
        title: "Cache warmed",
        description: "Critical data has been preloaded successfully.",
      });
    } catch (error) {
      console.error("Failed to warm cache:", error);
      handleOperationFailure("warm", error);
    } finally {
      setIsWarming(false);
    }
  }, [updateMetrics, handleOperationSuccess, handleOperationFailure]);

  const clearCache = useCallback(async () => {
    try {
      await cachingStrategy.invalidateCache("manual_clear");
      updateMetrics();
      handleOperationSuccess("clear");
      toast({
        title: "Cache cleared",
        description: "All cached data has been removed.",
      });
      console.log("Cache cleared successfully");
    } catch (error) {
      console.error("Failed to clear cache:", error);
      handleOperationFailure("clear", error);
    }
  }, [updateMetrics, handleOperationSuccess, handleOperationFailure]);

  const optimizeCache = useCallback(async () => {
    try {
      await cachingStrategy.optimizeCache();
      updateMetrics();
      handleOperationSuccess("optimization");
      toast({
        title: "Cache optimized",
        description: "Cache has been optimized for better performance.",
      });
      console.log("Cache optimized successfully");
    } catch (error) {
      console.error("Failed to optimize cache:", error);
      handleOperationFailure("optimization", error);
    }
  }, [updateMetrics, handleOperationSuccess, handleOperationFailure]);

  const actions = useMemo(
    () => ({ warmCache, clearCache, optimizeCache, resumeOperation }),
    [warmCache, clearCache, optimizeCache, resumeOperation]
  );

  const contextValue = useMemo<CacheContextValue>(
    () => ({
      isInitialized,
      isWarming,
      cacheHealth,
      metrics,
      operationStatuses,
      actions,
    }),
    [isInitialized, isWarming, cacheHealth, metrics, operationStatuses, actions]
  );

  return <CacheContext.Provider value={contextValue}>{children}</CacheContext.Provider>;
}

// Helper function to calculate cache health
function calculateCacheHealth(hitRate: number, responseTime: number): CacheHealthStatus {
  if (hitRate < 50 || responseTime > 1000) {
    return "poor";
  }
  if (hitRate < 70 || responseTime > 500) {
    return "fair";
  }
  if (hitRate < 85 || responseTime > 200) {
    return "good";
  }
  return "excellent";
}

// Cache status indicator component
export function CacheStatusIndicator() {
  const { cacheHealth, metrics, isWarming, operationStatuses } = useCache();

  const getHealthColor = (health: string): string => {
    switch (health) {
      case "excellent":
        return "text-green-500";
      case "good":
        return "text-blue-500";
      case "fair":
        return "text-yellow-500";
      case "poor":
        return "text-red-500";
      default:
        return "text-gray-500";
    }
  };

  const getHealthIcon = (health: string): string => {
    switch (health) {
      case "excellent":
        return "🟢";
      case "good":
        return "🔵";
      case "fair":
        return "🟡";
      case "poor":
        return "🔴";
      default:
        return "⚪";
    }
  };

  // Check if any operation is paused or failing
  const hasPausedOperations = Object.values(operationStatuses).some(s => s.isPaused);
  const hasFailingOperations = Object.values(operationStatuses).some(
    s => s.failureCount > 0 && !s.isPaused
  );

  if (process.env.NODE_ENV !== "development") {
    return null; // Only show in development
  }

  return (
    <div className="fixed bottom-4 left-4 z-50 bg-black/80 text-white p-2 rounded-lg text-xs">
      <div className="flex items-center space-x-2">
        <span>{getHealthIcon(cacheHealth)}</span>
        <span className={getHealthColor(cacheHealth)}>Cache: {cacheHealth}</span>
        {isWarming && <span className="animate-pulse">🔥</span>}
        {hasPausedOperations && <span title="Some operations paused">⏸️</span>}
        {hasFailingOperations && (
          <span className="animate-pulse" title="Some operations failing">
            ⚠️
          </span>
        )}
      </div>
      <div className="text-gray-400 mt-1">
        Hit Rate: {metrics.hitRate.toFixed(1)}% | Size: {metrics.cacheSize}
      </div>
    </div>
  );
}

// Helper function to get health color class
function getHealthColorClass(health: CacheHealthStatus): string {
  switch (health) {
    case "excellent":
      return "text-green-400";
    case "good":
      return "text-blue-400";
    case "fair":
      return "text-yellow-400";
    case "poor":
      return "text-red-400";
  }
}

// Cache debug panel for development
export function CacheDebugPanel() {
  const { metrics, actions, cacheHealth, isWarming, operationStatuses } = useCache();

  if (process.env.NODE_ENV !== "development") {
    return null;
  }

  const healthColorClass = getHealthColorClass(cacheHealth);

  const getOperationStatusBadge = (status: OperationStatus): JSX.Element => {
    if (status.isPaused) {
      return <span className="text-red-400 text-xs">⏸️ Paused</span>;
    }
    if (status.failureCount > 0) {
      return <span className="text-yellow-400 text-xs">⚠️ {status.failureCount} fails</span>;
    }
    return <span className="text-green-400 text-xs">✓ OK</span>;
  };

  return (
    <div className="fixed top-4 right-4 z-50 bg-black/90 text-white p-4 rounded-lg text-sm max-w-xs">
      <h3 className="font-bold mb-2">Cache Debug Panel</h3>

      <div className="space-y-2">
        <div>
          <strong>Health:</strong>
          <span className={`ml-2 ${healthColorClass}`}>{cacheHealth}</span>
        </div>

        <div>
          <strong>Hit Rate:</strong> {metrics.hitRate.toFixed(1)}%
        </div>

        <div>
          <strong>Cache Size:</strong> {metrics.cacheSize}
        </div>

        <div>
          <strong>Status:</strong> {isWarming ? "Warming..." : "Ready"}
        </div>

        {/* Operation statuses */}
        <div className="border-t border-gray-700 pt-2 mt-2">
          <strong className="text-xs text-gray-400">Operations:</strong>
          <div className="mt-1 space-y-1">
            {(Object.entries(operationStatuses) as [CacheOperationType, OperationStatus][]).map(
              ([op, status]) => (
                <div key={op} className="flex items-center justify-between">
                  <span className="text-xs capitalize">{op}</span>
                  <div className="flex items-center gap-2">
                    {getOperationStatusBadge(status)}
                    {status.isPaused && (
                      <button
                        onClick={() => actions.resumeOperation(op)}
                        className="text-xs bg-blue-600 hover:bg-blue-700 px-1 rounded"
                      >
                        Resume
                      </button>
                    )}
                  </div>
                </div>
              )
            )}
          </div>
        </div>
      </div>

      <div className="mt-4 space-y-1">
        <button
          onClick={actions.warmCache}
          disabled={isWarming || operationStatuses.warm.isPaused}
          className="block w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 px-2 py-1 rounded text-xs"
        >
          Warm Cache
        </button>

        <button
          onClick={actions.optimizeCache}
          disabled={operationStatuses.optimization.isPaused}
          className="block w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-600 px-2 py-1 rounded text-xs"
        >
          Optimize
        </button>

        <button
          onClick={actions.clearCache}
          disabled={operationStatuses.clear.isPaused}
          className="block w-full bg-red-600 hover:bg-red-700 disabled:bg-gray-600 px-2 py-1 rounded text-xs"
        >
          Clear Cache
        </button>
      </div>
    </div>
  );
}
