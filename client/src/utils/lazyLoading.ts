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
 * Retry loading a component after a delay
 */
async function retryComponentLoad<T extends ComponentType<unknown>>(
  importFn: () => Promise<{ default: T }>,
  error: unknown
): Promise<{ default: T }> {
  console.warn("Failed to load component, retrying...", error);

  return new Promise<{ default: T }>((resolve, reject) => {
    setTimeout(() => {
      importFn().then(resolve).catch(reject);
    }, 1000);
  });
}

/**
 * Load component with retry logic
 */
async function loadComponentWithRetry<T extends ComponentType<unknown>>(
  importFn: () => Promise<{ default: T }>,
  retryOnError: boolean
): Promise<{ default: T }> {
  if (!retryOnError) {
    return importFn();
  }

  try {
    return await importFn();
  } catch (error) {
    return retryComponentLoad(importFn, error);
  }
}

/**
 * Schedule component preloading
 */
function schedulePreload<T extends ComponentType<unknown>>(
  importFn: () => Promise<{ default: T }>,
  delay: number
): void {
  setTimeout(() => {
    importFn().catch(() => {
      // Silently fail preloading
    });
  }, delay);
}

/**
 * Creates a lazy component with enhanced loading capabilities
 */
export function createLazyComponent<T extends ComponentType<unknown>>(
  importFn: () => Promise<{ default: T }>,
  options: LazyComponentOptions = {}
): LazyExoticComponent<T> {
  const { preloadDelay, retryOnError = true } = options;

  // Create the lazy component with retry logic
  const LazyComponent = lazy(() => loadComponentWithRetry(importFn, retryOnError));

  // Preload after delay if specified
  if (preloadDelay && preloadDelay > 0) {
    schedulePreload(importFn, preloadDelay);
  }

  return LazyComponent;
}

/**
 * Preloads a component without rendering it
 */
export async function preloadComponent<T extends ComponentType<unknown>>(
  importFn: () => Promise<{ default: T }>
): Promise<void> {
  try {
    await importFn();
    // Component loaded successfully
  } catch (error) {
    console.warn("Failed to preload component:", error);
  }
}

/**
 * Setup user interaction preloading with debouncing
 */
function setupUserInteractionPreloading(): void {
  let hasPreloaded = false;
  let debounceTimer: NodeJS.Timeout | null = null;

  const events = ["mousedown", "touchstart", "keydown"];

  const handlePreload = (): void => {
    if (hasPreloaded) return;

    // Clear existing debounce timer
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }

    // Debounce preloading to prevent excessive network/CPU churn
    debounceTimer = setTimeout(() => {
      if (!hasPreloaded) {
        hasPreloaded = true;

        // Preload cart and dashboard as user is likely to interact
        preloadComponent(() => import("@/pages/cart"));
        preloadComponent(() => import("@/pages/dashboard"));

        // Remove listeners after first interaction
        for (const event of events) {
          document.removeEventListener(event, handlePreload);
        }
      }
    }, 300); // 300ms debounce
  };

  for (const event of events) {
    document.addEventListener(event, handlePreload, { passive: true });
  }
}

/**
 * Attach preload listeners to navigation links
 */
function attachPreloadListeners(
  routePath: string,
  importFn: () => Promise<{ default: ComponentType<unknown> }>
): void {
  const preloadOnHover = (): void => {
    preloadComponent(importFn);
  };

  const navLinks = document.querySelectorAll(`a[href="${routePath}"]`);
  for (const link of navLinks) {
    link.addEventListener("mouseenter", preloadOnHover, { once: true });
    link.addEventListener("focus", preloadOnHover, { once: true });
  }
}

/**
 * Creates a lazy component with route-based preloading
 */
export function createRouteLazyComponent<T extends ComponentType<unknown>>(
  importFn: () => Promise<{ default: T }>,
  routePath: string
): LazyExoticComponent<T> {
  const LazyComponent = createLazyComponent(importFn, {
    retryOnError: true,
  });

  // Preload when user hovers over navigation links to this route
  if (globalThis.window !== undefined) {
    setTimeout(() => {
      attachPreloadListeners(routePath, importFn);
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
   * Preload public pages for anonymous users
   */
  preloadPublicPages: () => {
    // Only preload shop and product pages for anonymous users
    preloadComponent(() => import("@/pages/shop"));
    preloadComponent(() => import("@/pages/product"));
  },

  /**
   * Preload critical components for authenticated users
   */
  preloadCriticalComponents: () => {
    // Preload shop, product, and cart pages for authenticated users
    preloadComponent(() => import("@/pages/shop"));
    preloadComponent(() => import("@/pages/product"));
    preloadComponent(() => import("@/pages/cart"));
  },

  /**
   * Preload components based on user behavior with throttling
   */
  preloadOnUserInteraction: (): void => {
    setupUserInteractionPreloading();
  },
};

/**
 * Performance monitoring for lazy loading
 */
export const lazyLoadingMetrics = {
  trackComponentLoad: (componentName: string, startTime: number): void => {
    const loadTime = performance.now() - startTime;

    if (process.env.NODE_ENV === "development") {
      console.log(`Component ${componentName} loaded in ${loadTime.toFixed(2)}ms`);
    }

    // Track in analytics if available
    if (globalThis.window !== undefined) {
      const win = globalThis.window as Window & {
        gtag?: (command: string, action: string, parameters?: Record<string, unknown>) => void;
      };

      win.gtag?.("event", "component_load", {
        event_category: "performance",
        event_label: componentName,
        value: Math.round(loadTime),
      });
    }
  },
};
