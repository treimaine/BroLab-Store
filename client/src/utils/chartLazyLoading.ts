import { ComponentType, lazy, LazyExoticComponent } from "react";
/**
 * Enhanced lazy loading utilities specifically for heavy chart components
 * These components contain large charting libraries and should be loaded on-demand
 */

/**
 * Chart-specific lazy loading options
 */
export interface ChartLazyOptions {
  /** Preload when user hovers over chart container */
  preloadOnHover?: boolean;
  /** Preload when chart tab becomes visible */
  preloadOnTabVisible?: boolean;
  /** Retry loading on failure with exponential backoff */
  retryWithBackoff?: boolean;
}

/**
 * Creates a lazy component specifically optimized for chart libraries
 */
export function createChartLazyComponent<T extends ComponentType<Record<string, unknown>>>(
  importFn: () => Promise<{ default: T }>,
  options: ChartLazyOptions = {}
): LazyExoticComponent<T> {
  const { preloadOnHover = true, retryWithBackoff = true } = options;

  // Create the lazy component with retry logic
  const LazyChartComponent = lazy(() => {
    if (retryWithBackoff) {
      return importFn().catch(error => {
        console.warn("Failed to load chart component, retrying with backoff...", error);
        return retryImportWithBackoff(importFn);
      });
    }
    return importFn();
  });

  // Setup hover preloading for chart components
  if (preloadOnHover && globalThis.window !== undefined) {
    setupHoverPreloading(importFn);
  }

  return LazyChartComponent;
}

/**
 * Retry import with exponential backoff
 */
function retryImportWithBackoff<T>(
  importFn: () => Promise<{ default: T }>
): Promise<{ default: T }> {
  const retryDelays = [1000, 2000, 4000]; // 1s, 2s, 4s

  return new Promise<{ default: T }>((resolve, reject) => {
    let retryCount = 0;

    const attemptRetry = (): void => {
      if (retryCount >= retryDelays.length) {
        reject(new Error("Failed to load chart component after multiple retries"));
        return;
      }

      const currentDelay = retryDelays[retryCount];
      retryCount++;

      setTimeout(() => {
        importFn().then(resolve).catch(attemptRetry);
      }, currentDelay);
    };

    attemptRetry();
  });
}

/**
 * Setup hover preloading for chart containers
 */
function setupHoverPreloading<T>(importFn: () => Promise<{ default: T }>): void {
  if (globalThis.document === undefined) {
    return;
  }

  const preloadOnChartHover = () => {
    importFn().catch(() => {
      // Silently fail preloading
    });
  };

  // Add event listeners for chart containers
  setTimeout(() => {
    const chartContainers = document.querySelectorAll("[data-chart-container]");
    for (const container of chartContainers) {
      container.addEventListener("mouseenter", preloadOnChartHover, { once: true });
    }
  }, 1000);
}

/**
 * Preloads chart libraries when user shows intent to view charts
 */
export function preloadChartLibraries() {
  // Preload Recharts when user might need charts
  const preloadRecharts = () => import("recharts");

  // Preload on first user interaction
  const events = ["mousedown", "touchstart", "keydown"];
  const preload = () => {
    preloadRecharts().catch(() => {
      // Silently handle preload failures
    });

    // Remove listeners after first interaction
    for (const event of events) {
      document.removeEventListener(event, preload);
    }
  };

  for (const event of events) {
    document.addEventListener(event, preload, { once: true, passive: true });
  }
}

/**
 * Chart-specific bundle optimization
 */
export const chartBundleOptimization = {
  /**
   * Lazy load heavy chart components
   */
  loadAnalyticsCharts: () => import("@/components/dashboard/AnalyticsCharts"),
  loadTrendCharts: () => import("@/components/dashboard/TrendCharts"),
  loadEnhancedAnalytics: () => import("@/components/dashboard/EnhancedAnalytics"),

  /**
   * Preload chart components based on dashboard tab visibility
   */
  preloadOnTabChange: (tabName: string) => {
    switch (tabName) {
      case "analytics":
        chartBundleOptimization.loadTrendCharts();
        chartBundleOptimization.loadEnhancedAnalytics();
        break;
      case "overview":
        chartBundleOptimization.loadAnalyticsCharts();
        break;
    }
  },

  /**
   * Monitor chart rendering performance
   */
  trackChartPerformance: (chartName: string, startTime: number) => {
    const renderTime = performance.now() - startTime;
    if (import.meta.env.DEV) {
      console.log(`Chart ${chartName} rendered in ${renderTime.toFixed(2)}ms`);
    }

    // Track in analytics if available
    if (
      globalThis.window !== undefined &&
      "gtag" in globalThis.window &&
      typeof (globalThis.window as Window & { gtag?: (...args: unknown[]) => void }).gtag ===
        "function"
    ) {
      const windowWithGtag = globalThis.window as Window & {
        gtag: (...args: unknown[]) => void;
      };
      windowWithGtag.gtag("event", "chart_render", {
        event_category: "performance",
        event_label: chartName,
        value: Math.round(renderTime),
      });
    }
  },
};

/**
 * Intersection Observer for chart lazy loading
 */
export function setupChartIntersectionObserver() {
  if (globalThis.window === undefined || !("IntersectionObserver" in globalThis.window)) {
    return;
  }

  const observer = new IntersectionObserver(
    entries => {
      for (const entry of entries) {
        if (entry.isIntersecting && entry.target instanceof HTMLElement) {
          const chartType = entry.target.dataset.chartType;
          if (chartType) {
            // Preload chart component when it comes into view
            chartBundleOptimization.preloadOnTabChange(chartType);
          }
        }
      }
    },
    {
      rootMargin: "50px", // Start loading 50px before chart is visible
      threshold: 0.1,
    }
  );

  // Observe all chart containers
  setTimeout(() => {
    const chartContainers = document.querySelectorAll("[data-chart-container]");
    for (const container of chartContainers) {
      observer.observe(container);
    }
  }, 1000);

  return observer;
}
