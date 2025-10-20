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

        // Exponential backoff retry
        return new Promise<{ default: T }>((resolve, reject) => {
          const retryDelays = [1000, 2000, 4000]; // 1s, 2s, 4s
          let retryCount = 0;

          const attemptRetry = () => {
            if (retryCount >= retryDelays.length) {
              reject(new Error("Failed to load chart component after multiple retries"));
              return;
            }

            setTimeout(() => {
              importFn()
                .then(resolve)
                .catch(() => {
                  retryCount++;
                  attemptRetry();
                });
            }, retryDelays[retryCount]);
          };

          attemptRetry();
        });
      });
    }
    return importFn();
  });

  // Setup hover preloading for chart components
  if (preloadOnHover && typeof window !== "undefined") {
    const preloadOnChartHover = () => {
      importFn().catch(() => {
        // Silently fail preloading
      });
    };

    // Add event listeners for chart containers
    setTimeout(() => {
      const chartContainers = document.querySelectorAll("[data-chart-container]");
      chartContainers.forEach(container => {
        container.addEventListener("mouseenter", preloadOnChartHover, { once: true });
      });
    }, 1000);
  }

  return LazyChartComponent;
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
    events.forEach(event => {
      document.removeEventListener(event, preload);
    });
  };

  events.forEach(event => {
    document.addEventListener(event, preload, { once: true, passive: true });
  });
}

/**
 * Chart-specific bundle optimization
 */
export const chartBundleOptimization = {
  /**
   * Lazy load heavy chart components
   */
  loadAnalyticsCharts: () => import("@/components/dashboard/AnalyticsCharts"),
  loadBroLabTrendCharts: () => import("@/components/dashboard/BroLabTrendCharts"),
  loadEnhancedAnalytics: () => import("@/components/dashboard/EnhancedAnalytics"),

  /**
   * Preload chart components based on dashboard tab visibility
   */
  preloadOnTabChange: (tabName: string) => {
    switch (tabName) {
      case "analytics":
        chartBundleOptimization.loadBroLabTrendCharts();
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
    console.log(`Chart ${chartName} rendered in ${renderTime.toFixed(2)}ms`);

    // Track in analytics if available
    if (
      typeof window !== "undefined" &&
      "gtag" in window &&
      typeof (window as any).gtag === "function"
    ) {
      (window as any).gtag("event", "chart_render", {
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
  if (typeof window === "undefined" || !("IntersectionObserver" in window)) {
    return;
  }

  const observer = new IntersectionObserver(
    entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const chartType = entry.target.getAttribute("data-chart-type");
          if (chartType) {
            // Preload chart component when it comes into view
            chartBundleOptimization.preloadOnTabChange(chartType);
          }
        }
      });
    },
    {
      rootMargin: "50px", // Start loading 50px before chart is visible
      threshold: 0.1,
    }
  );

  // Observe all chart containers
  setTimeout(() => {
    const chartContainers = document.querySelectorAll("[data-chart-container]");
    chartContainers.forEach(container => {
      observer.observe(container);
    });
  }, 1000);

  return observer;
}
