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

// Type for component props - using Record for flexibility without any
type ComponentProps = Record<string, unknown>;

/**
 * Retries importing a component after a delay
 */
function retryImport<T extends ComponentType<ComponentProps>>(
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
 * Creates a lazy component with enhanced loading capabilities
 */
export function createLazyComponent<T extends ComponentType<ComponentProps>>(
  importFn: () => Promise<{ default: T }>,
  options: LazyComponentOptions = {}
): LazyExoticComponent<T> {
  const { preloadDelay, preloadOnHover: _preloadOnHover = false, retryOnError = true } = options;

  // Create the lazy component
  const LazyComponent = lazy(() => {
    if (retryOnError) {
      return importFn().catch(error => retryImport(importFn, error));
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
export async function preloadComponent<T extends ComponentType<ComponentProps>>(
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
 * Sets up preload listeners for navigation links
 */
function setupPreloadListeners<T extends ComponentType<ComponentProps>>(
  importFn: () => Promise<{ default: T }>,
  routePath: string
): void {
  const preloadOnHover = (): void => {
    preloadComponent(importFn);
  };

  const navLinks = document.querySelectorAll(`a[href="${routePath}"]`);
  navLinks.forEach(link => {
    link.addEventListener("mouseenter", preloadOnHover, { once: true });
    link.addEventListener("focus", preloadOnHover, { once: true });
  });
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
      setupPreloadListeners(importFn, routePath);
    }, 1000);
  }

  return LazyComponent;
}

/**
 * Handles preloading on first user interaction
 */
function handleUserInteractionPreload(): void {
  const events = ["mousedown", "touchstart", "keydown"];

  const preload = (): void => {
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
}

/**
 * Bundle size optimization utilities
 */
export const bundleOptimization = {
  /**
   * Lazy load heavy third-party libraries
   */
  loadWaveSurfer: (): Promise<typeof import("wavesurfer.js")> => import("wavesurfer.js"),
  loadFramerMotion: (): Promise<typeof import("framer-motion")> => import("framer-motion"),
  loadReactQuery: (): Promise<typeof import("@tanstack/react-query")> =>
    import("@tanstack/react-query"),

  /**
   * Preload critical components based on user interaction
   */
  preloadCriticalComponents: (): void => {
    // Preload shop and product pages as they're commonly accessed
    preloadComponent(() => import("@/pages/shop"));
    preloadComponent(() => import("@/pages/product"));
  },

  /**
   * Preload components based on user behavior
   */
  preloadOnUserInteraction: handleUserInteractionPreload,
};

// Type for gtag function
type GtagFunction = (
  command: string,
  action: string,
  parameters?: {
    event_category?: string;
    event_label?: string;
    value?: number;
  }
) => void;

/**
 * Performance monitoring for lazy loading
 */
export const lazyLoadingMetrics = {
  trackComponentLoad: (componentName: string, startTime: number): void => {
    const loadTime = performance.now() - startTime;
    if (import.meta.env.DEV) {
      console.log(`Component ${componentName} loaded in ${loadTime.toFixed(2)}ms`);
    }

    // Track in analytics if available
    const win = globalThis.window as Window & { gtag?: GtagFunction };
    win?.gtag?.("event", "component_load", {
      event_category: "performance",
      event_label: componentName,
      value: Math.round(loadTime),
    });
  },
};
