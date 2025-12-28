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
 * - Code-split debug overlays (excluded from production bundle)
 */

import { toast } from "@/hooks/use-toast";
import { useCacheWarming } from "@/hooks/useCachingStrategy";
import { apiService } from "@/services/ApiService";
import { useUser } from "@clerk/clerk-react";
import {
  ReactNode,
  Suspense,
  createContext,
  lazy,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { DataType, cachingStrategy } from "../services/cachingStrategy";

// Lazy load debug components - only loaded in development, excluded from production bundle
const CacheStatusIndicator = lazy(() =>
  import("./CacheDebugComponents").then(m => ({ default: m.CacheStatusIndicator }))
);
const CacheDebugPanel = lazy(() =>
  import("./CacheDebugComponents").then(m => ({ default: m.CacheDebugPanel }))
);

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

  // Helper to calculate backoff delay - uses ref to avoid dependency cycle
  const calculateBackoffDelay = useCallback((operation: CacheOperationType): number => {
    const status = operationStatusesRef.current[operation];
    if (status.failureCount === 0) {
      return operation === "metrics" ? 30_000 : 5 * 60_000; // Default intervals
    }
    const delay = Math.min(
      BACKOFF_CONFIG.initialDelay * Math.pow(BACKOFF_CONFIG.multiplier, status.failureCount),
      BACKOFF_CONFIG.maxDelay
    );
    return delay;
  }, []);

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
          const response = await apiService.get("/beats/featured");
          return response.data;
        },
        priority: "high" as const,
      },
      {
        key: "categories",
        dataType: DataType.STATIC,
        fetcher: async () => {
          const response = await apiService.get("/categories");
          return response.data;
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
          try {
            const response = await apiService.get("/subscription/plans", { requireAuth: true });
            return response.data;
          } catch {
            // Gracefully handle 401 if auth state changes during fetch
            return null;
          }
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

  // Use refs to avoid dependency cycles in callbacks
  const operationStatusesRef = useRef(operationStatuses);
  operationStatusesRef.current = operationStatuses;

  // Update cache metrics and health - uses ref to avoid dependency cycle
  const updateMetrics = useCallback(() => {
    // Skip if metrics operation is paused (use ref to avoid dependency)
    if (operationStatusesRef.current.metrics.isPaused) {
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
  }, [handleOperationSuccess, handleOperationFailure]);

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
    let isMounted = true;

    const initializeCache = async (): Promise<void> => {
      try {
        setIsWarming(true);

        // Initialize service worker cache
        await cachingStrategy.initialize();

        // Preload critical data
        await cachingStrategy.preloadCriticalData();

        if (isMounted) {
          setIsInitialized(true);
          console.log("✅ Cache provider initialized successfully");
        }
      } catch (error) {
        console.error("❌ Failed to initialize cache provider:", error);
      } finally {
        if (isMounted) {
          setIsWarming(false);
        }
      }
    };

    initializeCache();

    return () => {
      isMounted = false;
    };
  }, []); // Empty deps - run only once on mount

  // Schedule metrics updates with backoff - stable callback using refs
  const scheduleMetricsUpdate = useCallback(() => {
    if (metricsTimeoutRef.current) {
      clearTimeout(metricsTimeoutRef.current);
    }

    const delay = calculateBackoffDelay("metrics");

    metricsTimeoutRef.current = setTimeout(() => {
      updateMetrics();
      // Reschedule if not paused (check ref for current value)
      if (!operationStatusesRef.current.metrics.isPaused) {
        scheduleMetricsUpdate();
      }
    }, delay);
  }, [calculateBackoffDelay, updateMetrics]);

  // Schedule optimization with backoff - stable callback using refs
  const scheduleOptimization = useCallback(() => {
    if (optimizationTimeoutRef.current) {
      clearTimeout(optimizationTimeoutRef.current);
    }

    // Skip if paused (check ref for current value)
    if (operationStatusesRef.current.optimization.isPaused) {
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
      // Reschedule if not paused (check ref for current value)
      if (!operationStatusesRef.current.optimization.isPaused) {
        scheduleOptimization();
      }
    }, delay);
  }, [calculateBackoffDelay, handleOperationSuccess, handleOperationFailure]);

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
    // Run metrics update once when tab becomes visible
    updateMetrics();

    // Schedule periodic updates with backoff support
    scheduleMetricsUpdate();
    scheduleOptimization();

    return clearTimeouts;
    // Only re-run when visibility changes, not when callbacks change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isTabVisible]);

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

  return (
    <CacheContext.Provider value={contextValue}>
      {children}
      {/* Debug overlays - code-split and only loaded in development */}
      {import.meta.env.DEV && (
        <Suspense fallback={null}>
          <CacheStatusIndicator />
          <CacheDebugPanel />
        </Suspense>
      )}
    </CacheContext.Provider>
  );
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

// Re-export debug components for backward compatibility (lazy-loaded)
export { CacheDebugPanel, CacheStatusIndicator };
