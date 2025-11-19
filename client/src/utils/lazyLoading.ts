import { ComponentType, lazy, LazyExoticComponent } from "react";

/**
 * Enhanced lazy loading utility with preloading capabilities
 */
export interface LazyComponentOptions {
  /** Preload the component after a delay (in ms) */
  preloadDelay?: number;
  /** Preload on hover/focus events */
  preloadOnHover?: boolean;
  /** Retry loading on failure */
  retryOnError?: boolean;
}

/**
 * Creates a lazy component with enhanced loading capabilities
 */
export function createLazyComponent<T extends ComponentType<any>>(
  importFn: () => Promise<{ default: T }>,
  options: LazyComponentOptions = {}
): LazyExoticComponent<T> {
  const { preloadDelay, preloadOnHover = false, retryOnError = true } = options;

  // Create the lazy component
  const LazyComponent = lazy(() => {
    if (retryOnError) {
      return importFn().catch(error => {
        console.warn("Failed to load component, retrying...", error);
        // Retry once after a short delay
        return new Promise<{ default: T }>((resolve, reject) => {
          setTimeout(() => {
            importFn().then(resolve).catch(reject);
          }, 1000);
        });
      });
    }
    return importFn();
  });

  // Preload after delay if specified
  if (preloadDelay && preloadDelay > 0) {
    setTimeout(() => {
      importFn().catch(() => {
        // Silently fail preloading
      });
    }, preloadDelay);
  }

  return LazyComponent;
}

/**
 * Preloads a component without rendering it
 */
export function preloadComponent<T extends ComponentType<any>>(
  importFn: () => Promise<{ default: T }>
): Promise<void> {
  return importFn()
    .then(() => {
      // Component loaded successfully
    })
    .catch(error => {
      console.warn("Failed to preload component:", error);
    });
}

/**
 * Creates a lazy component with route-based preloading
 */
export function createRouteLazyComponent<T extends ComponentType<any>>(
  importFn: () => Promise<{ default: T }>,
  routePath: string
): LazyExoticComponent<T> {
  const LazyComponent = createLazyComponent(importFn, {
    retryOnError: true,
  });

  // Preload when user hovers over navigation links to this route
  if (typeof window !== "undefined") {
    const preloadOnHover = () => {
      preloadComponent(importFn);
    };

    // Add event listeners for navigation links
    setTimeout(() => {
      const navLinks = document.querySelectorAll(`a[href="${routePath}"]`);
      navLinks.forEach(link => {
        link.addEventListener("mouseenter", preloadOnHover, { once: true });
        link.addEventListener("focus", preloadOnHover, { once: true });
      });
    }, 1000);
  }

  return LazyComponent;
}

/**
 * Bundle size optimization utilities
 */
export const bundleOptimization = {
  /**
   * Lazy load heavy third-party libraries
   */
  loadWaveSurfer: () => import("wavesurfer.js"),
  loadFramerMotion: () => import("framer-motion"),
  loadReactQuery: () => import("@tanstack/react-query"),

  /**
   * Preload critical components based on user interaction
   */
  preloadCriticalComponents: () => {
    // Preload shop and product pages as they're commonly accessed
    preloadComponent(() => import("@/pages/shop"));
    preloadComponent(() => import("@/pages/product"));
  },

  /**
   * Preload components based on user behavior
   */
  preloadOnUserInteraction: () => {
    const events = ["mousedown", "touchstart", "keydown"];
    const preload = () => {
      // Preload cart and dashboard as user is likely to interact
      preloadComponent(() => import("@/pages/cart"));
      preloadComponent(() => import("@/pages/dashboard"));

      // Remove listeners after first interaction
      events.forEach(event => {
        document.removeEventListener(event, preload);
      });
    };

    events.forEach(event => {
      document.addEventListener(event, preload, { once: true, passive: true });
    });
  },
};

/**
 * Performance monitoring for lazy loading
 */
export const lazyLoadingMetrics = {
  trackComponentLoad: (componentName: string, startTime: number) => {
    const loadTime = performance.now() - startTime;
    console.log(`Component ${componentName} loaded in ${loadTime.toFixed(2)}ms`);

    // Track in analytics if available
    if (typeof window !== "undefined" && "gtag" in window && typeof window.gtag === "function") {
      window.gtag("event", "component_load", {
        event_category: "performance",
        event_label: componentName,
        value: Math.round(loadTime),
      });
    }
  },
};
