import { useEffect } from "react";

interface PerformanceMetrics {
  componentLoadTime: number;
  bundleSize: number;
  initialLoadTime: number;
  interactionToNextPaint: number;
}

/**
 * Performance monitoring component for lazy loading optimization
 */
export function PerformanceMonitor() {
  useEffect(() => {
    // Monitor Core Web Vitals
    const observer = new PerformanceObserver(list => {
      list.getEntries().forEach(entry => {
        if (entry.entryType === "navigation") {
          const navEntry = entry as PerformanceNavigationTiming;
          console.log("Navigation timing:", {
            domContentLoaded:
              navEntry.domContentLoadedEventEnd - navEntry.domContentLoadedEventStart,
            loadComplete: navEntry.loadEventEnd - navEntry.loadEventStart,
            firstPaint: navEntry.responseEnd - navEntry.requestStart,
          });
        }

        if (entry.entryType === "measure" && entry.name.includes("component-load")) {
          console.log(`Component load time: ${entry.name} - ${entry.duration.toFixed(2)}ms`);
        }
      });
    });

    observer.observe({ entryTypes: ["navigation", "measure"] });

    // Monitor lazy loading effectiveness
    const trackLazyLoading = () => {
      const lazyComponents = document.querySelectorAll('[data-lazy-loaded="true"]');
      console.log(`Lazy loaded components: ${lazyComponents.length}`);
    };

    // Track after initial load
    setTimeout(trackLazyLoading, 3000);

    return () => {
      observer.disconnect();
    };
  }, []);

  // This component doesn't render anything visible
  return null;
}

/**
 * Hook to measure component load time
 */
export function useComponentLoadTime(componentName: string) {
  useEffect(() => {
    const startTime = performance.now();

    return () => {
      const endTime = performance.now();
      const loadTime = endTime - startTime;

      // Create a performance measure
      performance.mark(`${componentName}-load-end`);
      performance.measure(
        `component-load-${componentName}`,
        `${componentName}-load-start`,
        `${componentName}-load-end`
      );

      console.log(`${componentName} load time: ${loadTime.toFixed(2)}ms`);
    };
  }, [componentName]);

  // Mark the start of component load
  useEffect(() => {
    performance.mark(`${componentName}-load-start`);
  }, [componentName]);

  // Return void explicitly to satisfy TypeScript noImplicitReturns
  return;
}

/**
 * Bundle size analyzer for development
 */
export function BundleSizeAnalyzer() {
  useEffect(() => {
    if (process.env.NODE_ENV === "development") {
      // Analyze loaded scripts
      const scripts = Array.from(document.querySelectorAll("script[src]"));
      const totalScripts = scripts.length;

      console.log("Bundle Analysis:", {
        totalScripts,
        scriptSources: scripts.map(script => ({
          src: (script as HTMLScriptElement).src,
          async: (script as HTMLScriptElement).async,
          defer: (script as HTMLScriptElement).defer,
        })),
      });

      // Monitor resource loading
      const resourceObserver = new PerformanceObserver(list => {
        list.getEntries().forEach(entry => {
          if (entry.entryType === "resource" && entry.name.includes(".js")) {
            console.log(`Script loaded: ${entry.name} - ${entry.duration.toFixed(2)}ms`);
          }
        });
      });

      resourceObserver.observe({ entryTypes: ["resource"] });

      return () => {
        resourceObserver.disconnect();
      };
    }
    // Return undefined when not in development mode
    return undefined;
  }, []);

  return null;
}

/**
 * Lazy loading effectiveness tracker
 */
export function LazyLoadingTracker() {
  useEffect(() => {
    const trackLazyComponents = () => {
      const allComponents = document.querySelectorAll("[data-component]");
      const lazyComponents = document.querySelectorAll('[data-lazy="true"]');

      const effectiveness = {
        totalComponents: allComponents.length,
        lazyComponents: lazyComponents.length,
        lazyPercentage: ((lazyComponents.length / allComponents.length) * 100).toFixed(1),
      };

      console.log("Lazy Loading Effectiveness:", effectiveness);
    };

    // Track after components have loaded
    setTimeout(trackLazyComponents, 2000);
  }, []);

  return null;
}
