/* eslint-disable react-refresh/only-export-components -- Provider pattern exports both provider component and debug components */
/**
 * Cache Provider Component
 *
 * Provides caching context and initialization for the entire application.
 * Handles cache warming, monitoring, and optimization.
 */

import { useCache } from "@/hooks/useCache";
import { useCacheWarming } from "@/hooks/useCachingStrategy";
import { ReactNode, createContext, useCallback, useEffect, useMemo, useState } from "react";
import { DataType, cachingStrategy } from "../services/cachingStrategy";

type CacheHealthStatus = "excellent" | "good" | "fair" | "poor";

interface CacheContextValue {
  isInitialized: boolean;
  isWarming: boolean;
  cacheHealth: CacheHealthStatus;
  metrics: {
    hitRate: number;
    totalQueries: number;
    cacheSize: number;
  };
  actions: {
    warmCache: () => Promise<void>;
    clearCache: () => Promise<void>;
    optimizeCache: () => Promise<void>;
  };
}

export const CacheContext = createContext<CacheContextValue | null>(null);

interface CacheProviderProps {
  readonly children: ReactNode;
}

export function CacheProvider({ children }: Readonly<CacheProviderProps>) {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isWarming, setIsWarming] = useState(false);
  const [cacheHealth, setCacheHealth] = useState<CacheHealthStatus>("good");
  const [metrics, setMetrics] = useState({
    hitRate: 0,
    totalQueries: 0,
    cacheSize: 0,
  });

  // Define critical data to warm on startup
  const criticalWarmingData = [
    {
      key: "subscription-plans",
      dataType: DataType.STATIC,
      fetcher: async () => {
        const response = await fetch("/api/subscription/plans");
        if (!response.ok) throw new Error("Failed to fetch subscription plans");
        return response.json();
      },
      priority: "high" as const,
    },
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
  ];

  // Use cache warming hook
  useCacheWarming(criticalWarmingData);

  // Update cache metrics and health - defined before useEffect that uses it
  const updateMetrics = useCallback(() => {
    try {
      const performanceMetrics = cachingStrategy.getPerformanceMetrics();

      setMetrics({
        hitRate: performanceMetrics.cacheHitRate,
        totalQueries: performanceMetrics.cacheSize,
        cacheSize: performanceMetrics.cacheSize,
      });

      // Determine cache health based on metrics
      const health = calculateCacheHealth(
        performanceMetrics.cacheHitRate,
        performanceMetrics.averageResponseTime
      );

      setCacheHealth(health);
    } catch (error) {
      console.error("Failed to update cache metrics:", error);
      setCacheHealth("poor");
    }
  }, []);

  // Initialize cache and start monitoring
  useEffect(() => {
    const initializeCache = async () => {
      try {
        setIsWarming(true);

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

    // Set up periodic metrics updates
    const metricsInterval = setInterval(updateMetrics, 30000); // Every 30 seconds

    // Set up cache optimization
    const optimizationInterval = setInterval(
      async () => {
        try {
          await cachingStrategy.optimizeCache();
        } catch (error) {
          console.error("Cache optimization failed:", error);
        }
      },
      5 * 60 * 1000
    ); // Every 5 minutes

    return () => {
      clearInterval(metricsInterval);
      clearInterval(optimizationInterval);
    };
  }, [updateMetrics]);

  // Cache actions - memoized to prevent unnecessary re-renders
  const warmCache = useCallback(async () => {
    setIsWarming(true);
    try {
      await cachingStrategy.preloadCriticalData();
      updateMetrics();
    } catch (error) {
      console.error("Failed to warm cache:", error);
    } finally {
      setIsWarming(false);
    }
  }, [updateMetrics]);

  const clearCache = useCallback(async () => {
    try {
      await cachingStrategy.invalidateCache("manual_clear");
      updateMetrics();
      console.log("Cache cleared successfully");
    } catch (error) {
      console.error("Failed to clear cache:", error);
    }
  }, [updateMetrics]);

  const optimizeCache = useCallback(async () => {
    try {
      await cachingStrategy.optimizeCache();
      updateMetrics();
      console.log("Cache optimized successfully");
    } catch (error) {
      console.error("Failed to optimize cache:", error);
    }
  }, [updateMetrics]);

  const actions = useMemo(
    () => ({ warmCache, clearCache, optimizeCache }),
    [warmCache, clearCache, optimizeCache]
  );

  const contextValue = useMemo<CacheContextValue>(
    () => ({
      isInitialized,
      isWarming,
      cacheHealth,
      metrics,
      actions,
    }),
    [isInitialized, isWarming, cacheHealth, metrics, actions]
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
  const { cacheHealth, metrics, isWarming } = useCache();

  const getHealthColor = (health: string) => {
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

  const getHealthIcon = (health: string) => {
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

  if (process.env.NODE_ENV !== "development") {
    return null; // Only show in development
  }

  return (
    <div className="fixed bottom-4 left-4 z-50 bg-black/80 text-white p-2 rounded-lg text-xs">
      <div className="flex items-center space-x-2">
        <span>{getHealthIcon(cacheHealth)}</span>
        <span className={getHealthColor(cacheHealth)}>Cache: {cacheHealth}</span>
        {isWarming && <span className="animate-pulse">🔥</span>}
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
  const { metrics, actions, cacheHealth, isWarming } = useCache();

  if (process.env.NODE_ENV !== "development") {
    return null;
  }

  const healthColorClass = getHealthColorClass(cacheHealth);

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
      </div>

      <div className="mt-4 space-y-1">
        <button
          onClick={actions.warmCache}
          disabled={isWarming}
          className="block w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 px-2 py-1 rounded text-xs"
        >
          Warm Cache
        </button>

        <button
          onClick={actions.optimizeCache}
          className="block w-full bg-green-600 hover:bg-green-700 px-2 py-1 rounded text-xs"
        >
          Optimize
        </button>

        <button
          onClick={actions.clearCache}
          className="block w-full bg-red-600 hover:bg-red-700 px-2 py-1 rounded text-xs"
        >
          Clear Cache
        </button>
      </div>
    </div>
  );
}
