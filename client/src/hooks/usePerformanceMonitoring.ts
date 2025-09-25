/**
 * Performance Monitoring Hook
 *
 * Tracks performance metrics for the dashboard and other components
 * to measure the effectiveness of optimizations.
 *
 * Requirements addressed:
 * - 5.1: 50% faster loading times through performance optimization
 * - Monitor component render times and bundle sizes
 */

import { useCallback, useEffect, useRef, useState } from "react";

interface PerformanceMetrics {
  initialLoadTime: number;
  componentRenderTime: number;
  dataFetchTime: number;
  bundleSize: number;
  memoryUsage: number;
  renderCount: number;
}

interface PerformanceEntry {
  name: string;
  startTime: number;
  duration: number;
  entryType: string;
}

export function usePerformanceMonitoring(componentName: string) {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    initialLoadTime: 0,
    componentRenderTime: 0,
    dataFetchTime: 0,
    bundleSize: 0,
    memoryUsage: 0,
    renderCount: 0,
  });

  const renderStartTime = useRef<number>(0);
  const renderCount = useRef<number>(0);

  // Start performance measurement
  const startMeasurement = useCallback(
    (measurementName: string) => {
      if (typeof performance !== "undefined" && performance.mark) {
        performance.mark(`${componentName}-${measurementName}-start`);
      }
      return Date.now();
    },
    [componentName]
  );

  // End performance measurement
  const endMeasurement = useCallback(
    (measurementName: string, startTime?: number) => {
      const endTime = Date.now();

      if (typeof performance !== "undefined" && performance.mark && performance.measure) {
        const startMarkName = `${componentName}-${measurementName}-start`;
        const endMarkName = `${componentName}-${measurementName}-end`;
        const measureName = `${componentName}-${measurementName}`;

        performance.mark(endMarkName);

        try {
          performance.measure(measureName, startMarkName, endMarkName);

          // Get the measurement
          const entries = performance.getEntriesByName(measureName);
          if (entries.length > 0) {
            const entry = entries[entries.length - 1];
            return entry.duration;
          }
        } catch (error) {
          console.warn("Performance measurement failed:", error);
        }
      }

      return startTime ? endTime - startTime : 0;
    },
    [componentName]
  );

  // Measure component render time
  const measureRender = useCallback(() => {
    renderCount.current += 1;
    renderStartTime.current = startMeasurement("render");

    // Use setTimeout to measure after render completes
    setTimeout(() => {
      const renderTime = endMeasurement("render", renderStartTime.current);

      setMetrics(prev => ({
        ...prev,
        componentRenderTime: renderTime,
        renderCount: renderCount.current,
      }));
    }, 0);
  }, [startMeasurement, endMeasurement]);

  // Measure data fetch time
  const measureDataFetch = useCallback(
    async <T>(fetchFunction: () => Promise<T>, fetchName = "data-fetch"): Promise<T> => {
      const startTime = startMeasurement(fetchName);

      try {
        const result = await fetchFunction();
        const fetchTime = endMeasurement(fetchName, startTime);

        setMetrics(prev => ({
          ...prev,
          dataFetchTime: fetchTime,
        }));

        return result;
      } catch (error) {
        endMeasurement(fetchName, startTime);
        throw error;
      }
    },
    [startMeasurement, endMeasurement]
  );

  // Get memory usage
  const getMemoryUsage = useCallback(() => {
    if (typeof performance !== "undefined" && (performance as any).memory) {
      const memory = (performance as any).memory;
      return {
        used: memory.usedJSHeapSize,
        total: memory.totalJSHeapSize,
        limit: memory.jsHeapSizeLimit,
      };
    }
    return null;
  }, []);

  // Get bundle size information
  const getBundleSize = useCallback(() => {
    if (typeof performance !== "undefined" && performance.getEntriesByType) {
      const navigationEntries = performance.getEntriesByType("navigation") as any[];
      if (navigationEntries.length > 0) {
        const entry = navigationEntries[0];
        return entry.transferSize || 0;
      }
    }
    return 0;
  }, []);

  // Update metrics periodically
  useEffect(() => {
    const updateMetrics = () => {
      const memory = getMemoryUsage();
      const bundleSize = getBundleSize();

      setMetrics(prev => ({
        ...prev,
        memoryUsage: memory ? memory.used : 0,
        bundleSize,
      }));
    };

    updateMetrics();

    // Update every 5 seconds
    const interval = setInterval(updateMetrics, 5000);

    return () => clearInterval(interval);
  }, [getMemoryUsage, getBundleSize]);

  // Measure initial load time
  useEffect(() => {
    if (typeof performance !== "undefined" && performance.getEntriesByType) {
      const navigationEntries = performance.getEntriesByType("navigation") as any[];
      if (navigationEntries.length > 0) {
        const entry = navigationEntries[0];
        const loadTime = entry.loadEventEnd - entry.navigationStart;

        setMetrics(prev => ({
          ...prev,
          initialLoadTime: loadTime,
        }));
      }
    }
  }, []);

  // Log performance data for debugging
  const logPerformance = useCallback(() => {
    console.group(`Performance Metrics - ${componentName}`);
    console.log("Initial Load Time:", `${metrics.initialLoadTime}ms`);
    console.log("Component Render Time:", `${metrics.componentRenderTime}ms`);
    console.log("Data Fetch Time:", `${metrics.dataFetchTime}ms`);
    console.log("Bundle Size:", `${(metrics.bundleSize / 1024).toFixed(2)}KB`);
    console.log("Memory Usage:", `${(metrics.memoryUsage / 1024 / 1024).toFixed(2)}MB`);
    console.log("Render Count:", metrics.renderCount);
    console.groupEnd();
  }, [componentName, metrics]);

  // Get performance score (0-100)
  const getPerformanceScore = useCallback(() => {
    let score = 100;

    // Deduct points for slow render times
    if (metrics.componentRenderTime > 16) score -= 20; // 60fps threshold
    if (metrics.componentRenderTime > 33) score -= 20; // 30fps threshold

    // Deduct points for slow data fetching
    if (metrics.dataFetchTime > 1000) score -= 20; // 1s threshold
    if (metrics.dataFetchTime > 3000) score -= 20; // 3s threshold

    // Deduct points for high memory usage
    if (metrics.memoryUsage > 50 * 1024 * 1024) score -= 10; // 50MB threshold
    if (metrics.memoryUsage > 100 * 1024 * 1024) score -= 20; // 100MB threshold

    // Deduct points for excessive re-renders
    if (metrics.renderCount > 10) score -= 10;
    if (metrics.renderCount > 20) score -= 20;

    return Math.max(0, score);
  }, [metrics]);

  return {
    metrics,
    measureRender,
    measureDataFetch,
    startMeasurement,
    endMeasurement,
    logPerformance,
    getPerformanceScore,
    getMemoryUsage,
  };
}

// Hook for measuring component lifecycle performance
export function useComponentPerformance(componentName: string) {
  const { measureRender, metrics, getPerformanceScore } = usePerformanceMonitoring(componentName);

  // Measure render on every render
  useEffect(() => {
    measureRender();
  });

  return {
    renderTime: metrics.componentRenderTime,
    renderCount: metrics.renderCount,
    performanceScore: getPerformanceScore(),
  };
}

// Hook for measuring data fetching performance
export function useDataFetchPerformance() {
  const [fetchMetrics, setFetchMetrics] = useState<{
    [key: string]: { duration: number; timestamp: number };
  }>({});

  const measureFetch = useCallback(
    async <T>(fetchFunction: () => Promise<T>, fetchName: string): Promise<T> => {
      const startTime = performance.now();

      try {
        const result = await fetchFunction();
        const duration = performance.now() - startTime;

        setFetchMetrics(prev => ({
          ...prev,
          [fetchName]: { duration, timestamp: Date.now() },
        }));

        return result;
      } catch (error) {
        const duration = performance.now() - startTime;

        setFetchMetrics(prev => ({
          ...prev,
          [fetchName]: { duration, timestamp: Date.now() },
        }));

        throw error;
      }
    },
    []
  );

  return {
    fetchMetrics,
    measureFetch,
  };
}

export default usePerformanceMonitoring;
