import React from "react";

/**
 * Lazy Loading Performance Monitor
 *
 * Monitors and tracks performance metrics for lazy loaded components
 * in production environments.
 */

interface LazyLoadMetric {
  componentName: string;
  loadStartTime: number;
  loadEndTime?: number;
  loadDuration?: number;
  chunkSize?: number;
  error?: string;
  retryCount?: number;
}

interface LazyLoadStats {
  totalComponents: number;
  successfulLoads: number;
  failedLoads: number;
  averageLoadTime: number;
  slowestComponent: string;
  fastestComponent: string;
  totalChunkSize: number;
}

// Type for gtag function
type GtagFunction = (command: string, action: string, params: Record<string, unknown>) => void;

// Extend globalThis for our monitor
declare global {
  var __lazyLoadingMonitor: LazyLoadingMonitor | undefined;
}

class LazyLoadingMonitor {
  private readonly metrics: Map<string, LazyLoadMetric> = new Map();
  private readonly isProduction = process.env.NODE_ENV === "production";
  private reportingEnabled = true;

  /**
   * Start tracking a lazy load operation
   */
  startLoad(componentName: string): void {
    if (!this.isProduction || !this.reportingEnabled) return;

    const metric: LazyLoadMetric = {
      componentName,
      loadStartTime: performance.now(),
    };

    this.metrics.set(componentName, metric);

    // Track in performance timeline
    if ("mark" in performance) {
      performance.mark(`lazy-load-start-${componentName}`);
    }
  }

  /**
   * Complete tracking a lazy load operation
   */
  endLoad(componentName: string, chunkSize?: number): void {
    if (!this.isProduction || !this.reportingEnabled) return;

    const metric = this.metrics.get(componentName);
    if (!metric) return;

    const endTime = performance.now();
    metric.loadEndTime = endTime;
    metric.loadDuration = endTime - metric.loadStartTime;
    metric.chunkSize = chunkSize;

    // Track in performance timeline
    if ("mark" in performance && "measure" in performance) {
      performance.mark(`lazy-load-end-${componentName}`);
      performance.measure(
        `lazy-load-${componentName}`,
        `lazy-load-start-${componentName}`,
        `lazy-load-end-${componentName}`
      );
    }

    // Report slow loads
    if (metric.loadDuration > 2000) {
      this.reportSlowLoad(metric);
    }

    // Send to analytics if available
    this.sendToAnalytics(metric);
  }

  /**
   * Track a failed lazy load
   */
  trackError(componentName: string, error: string, retryCount = 0): void {
    if (!this.isProduction || !this.reportingEnabled) return;

    const metric = this.metrics.get(componentName) || {
      componentName,
      loadStartTime: performance.now(),
    };

    metric.error = error;
    metric.retryCount = retryCount;
    metric.loadEndTime = performance.now();

    this.metrics.set(componentName, metric);

    // Report error
    this.reportError(metric);
  }

  /**
   * Get performance statistics
   */
  getStats(): LazyLoadStats {
    const metrics = Array.from(this.metrics.values());
    const successfulLoads = metrics.filter(m => !m.error && m.loadDuration);
    const failedLoads = metrics.filter(m => m.error);

    const loadTimes = successfulLoads.map(m => m.loadDuration!).filter(time => time > 0);

    const averageLoadTime =
      loadTimes.length > 0 ? loadTimes.reduce((sum, time) => sum + time, 0) / loadTimes.length : 0;

    const sortedBySlowest = successfulLoads.toSorted(
      (a, b) => (b.loadDuration || 0) - (a.loadDuration || 0)
    );
    const slowestComponent = sortedBySlowest[0]?.componentName || "";

    const sortedByFastest = successfulLoads.toSorted(
      (a, b) => (a.loadDuration || 0) - (b.loadDuration || 0)
    );
    const fastestComponent = sortedByFastest[0]?.componentName || "";

    const totalChunkSize = metrics.reduce((sum, m) => sum + (m.chunkSize || 0), 0);

    return {
      totalComponents: metrics.length,
      successfulLoads: successfulLoads.length,
      failedLoads: failedLoads.length,
      averageLoadTime: Math.round(averageLoadTime),
      slowestComponent,
      fastestComponent,
      totalChunkSize,
    };
  }

  /**
   * Report slow loading component
   */
  private reportSlowLoad(metric: LazyLoadMetric): void {
    console.warn(
      `🐌 Slow lazy load detected: ${metric.componentName} took ${metric.loadDuration}ms`
    );

    // Send to monitoring service if available
    if (globalThis.window !== undefined && "gtag" in globalThis.window) {
      const gtag = (globalThis.window as unknown as { gtag: GtagFunction }).gtag;
      gtag("event", "slow_lazy_load", {
        event_category: "performance",
        event_label: metric.componentName,
        value: Math.round(metric.loadDuration!),
      });
    }
  }

  /**
   * Report lazy loading error
   */
  private reportError(metric: LazyLoadMetric): void {
    console.error(`❌ Lazy load failed: ${metric.componentName} - ${metric.error}`);

    // Send to error tracking if available
    if (globalThis.window !== undefined && "gtag" in globalThis.window) {
      const gtag = (globalThis.window as unknown as { gtag: GtagFunction }).gtag;
      gtag("event", "lazy_load_error", {
        event_category: "error",
        event_label: metric.componentName,
        value: metric.retryCount || 0,
      });
    }
  }

  /**
   * Send metrics to analytics
   */
  private sendToAnalytics(metric: LazyLoadMetric): void {
    if (globalThis.window !== undefined && "gtag" in globalThis.window && metric.loadDuration) {
      const gtag = (globalThis.window as unknown as { gtag: GtagFunction }).gtag;
      gtag("event", "lazy_load_success", {
        event_category: "performance",
        event_label: metric.componentName,
        value: Math.round(metric.loadDuration),
        custom_parameters: {
          chunk_size: metric.chunkSize || 0,
        },
      });
    }
  }

  /**
   * Generate performance report
   */
  generateReport(): string {
    const stats = this.getStats();

    return `
🚀 Lazy Loading Performance Report
=====================================

📊 Overview:
  • Total Components: ${stats.totalComponents}
  • Successful Loads: ${stats.successfulLoads}
  • Failed Loads: ${stats.failedLoads}
  • Success Rate: ${stats.totalComponents > 0 ? Math.round((stats.successfulLoads / stats.totalComponents) * 100) : 0}%

⏱️  Performance:
  • Average Load Time: ${stats.averageLoadTime}ms
  • Slowest Component: ${stats.slowestComponent}
  • Fastest Component: ${stats.fastestComponent}
  • Total Chunk Size: ${Math.round(stats.totalChunkSize / 1024)}KB

💡 Recommendations:
${stats.averageLoadTime > 1000 ? "  • Consider preloading critical components" : "  • Load times are optimal"}
${stats.failedLoads > 0 ? "  • Investigate failed loads and add retry logic" : "  • No failed loads detected"}
${stats.totalChunkSize > 500000 ? "  • Consider further code splitting to reduce chunk sizes" : "  • Chunk sizes are reasonable"}
    `.trim();
  }

  /**
   * Enable/disable reporting
   */
  setReportingEnabled(enabled: boolean): void {
    this.reportingEnabled = enabled;
  }

  /**
   * Clear all metrics
   */
  clear(): void {
    this.metrics.clear();
  }
}

// Global instance
export const lazyLoadingMonitor = new LazyLoadingMonitor();

/**
 * Hook for monitoring lazy loading in React components
 */
export function useLazyLoadingMonitor(componentName: string) {
  const startLoad = () => lazyLoadingMonitor.startLoad(componentName);
  const endLoad = (chunkSize?: number) => lazyLoadingMonitor.endLoad(componentName, chunkSize);
  const trackError = (error: string, retryCount?: number) =>
    lazyLoadingMonitor.trackError(componentName, error, retryCount);

  return { startLoad, endLoad, trackError };
}

/**
 * Enhanced lazy component creator with monitoring
 */
export function createMonitoredLazyComponent<T>(
  componentName: string,
  importFn: () => Promise<{ default: React.ComponentType<T> }>,
  options: {
    preloadDelay?: number;
    retryOnError?: boolean;
    maxRetries?: number;
  } = {}
) {
  const { preloadDelay: _preloadDelay, retryOnError = true, maxRetries = 3 } = options;

  return React.lazy(() => {
    lazyLoadingMonitor.startLoad(componentName);

    const loadWithRetry = async (retryCount = 0): Promise<{ default: React.ComponentType<T> }> => {
      try {
        const startTime = performance.now();
        const module = await importFn();
        const endTime = performance.now();

        // Estimate chunk size (rough approximation)
        const chunkSize = (endTime - startTime) * 100; // Very rough estimate

        lazyLoadingMonitor.endLoad(componentName, chunkSize);
        return module;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";

        if (retryOnError && retryCount < maxRetries) {
          console.warn(`Retrying lazy load for ${componentName} (attempt ${retryCount + 1})`);
          // Exponential backoff
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, retryCount) * 1000));
          return loadWithRetry(retryCount + 1);
        }

        lazyLoadingMonitor.trackError(componentName, errorMessage, retryCount);
        throw error;
      }
    };

    return loadWithRetry();
  });
}

// Export for global access in development
if (globalThis.window !== undefined) {
  globalThis.__lazyLoadingMonitor = lazyLoadingMonitor;
}
