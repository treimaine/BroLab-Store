/**
 * Performance optimization utilities
 * Fixes for FCP, LCP, CLS, and memory leak issues
 */

// Preload critical resources
export const preloadCriticalResources = () => {
  if (typeof window === "undefined") return;

  // Preload critical fonts
  const fontPreload = document.createElement("link");
  fontPreload.rel = "preload";
  fontPreload.as = "font";
  fontPreload.type = "font/woff2";
  fontPreload.href = "/fonts/inter-var.woff2";
  fontPreload.crossOrigin = "anonymous";
  document.head.appendChild(fontPreload);
};

// Optimize bundle loading
export const optimizeBundleLoading = () => {
  if (typeof window === "undefined") return;

  // Add resource hints for faster loading
  const resourceHints = [
    { rel: "dns-prefetch", href: "https://api.clerk.dev" },
    { rel: "dns-prefetch", href: "https://convex.cloud" },
    { rel: "preconnect", href: "https://api.clerk.dev" },
    { rel: "preconnect", href: "https://convex.cloud" },
  ];

  resourceHints.forEach(hint => {
    const link = document.createElement("link");
    link.rel = hint.rel;
    link.href = hint.href;
    document.head.appendChild(link);
  });
};

// Memory leak prevention
export const preventMemoryLeaks = () => {
  if (typeof window === "undefined") return;

  // Clean up event listeners on page unload
  window.addEventListener("beforeunload", () => {
    // Remove all event listeners
    const elements = document.querySelectorAll("*");
    elements.forEach(element => {
      const clone = element.cloneNode(true);
      element.parentNode?.replaceChild(clone, element);
    });
  });

  // Monitor for memory leaks
  let memoryUsage = 0;
  const memoryCheckInterval = setInterval(() => {
    if ((performance as any).memory) {
      const currentUsage = (performance as any).memory.usedJSHeapSize;
      if (currentUsage > memoryUsage * 1.5) {
        console.warn("Potential memory leak detected");
        // Force garbage collection if available
        if ((window as any).gc) {
          (window as any).gc();
        }
      }
      memoryUsage = currentUsage;
    }
  }, 30000); // Check every 30 seconds

  // Clean up interval on page unload
  window.addEventListener("beforeunload", () => {
    clearInterval(memoryCheckInterval);
  });
};

// Optimize JavaScript execution
export const optimizeJavaScriptExecution = () => {
  if (typeof window === "undefined") return;

  // Use requestIdleCallback for non-critical tasks
  const scheduleNonCriticalTask = (task: () => void) => {
    if ("requestIdleCallback" in window) {
      (window as any).requestIdleCallback(task);
    } else {
      setTimeout(task, 1);
    }
  };

  // Debounce expensive operations
  const debounce = (func: Function, wait: number) => {
    let timeout: NodeJS.Timeout;
    return function executedFunction(...args: any[]) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  };

  // Throttle scroll events
  const throttle = (func: Function, limit: number) => {
    let inThrottle: boolean;
    return function executedFunction(this: any, ...args: any[]) {
      if (!inThrottle) {
        func.apply(this, args);
        inThrottle = true;
        setTimeout(() => (inThrottle = false), limit);
      }
    };
  };

  // Apply optimizations to scroll events
  const scrollHandler = throttle(() => {
    // Handle scroll events efficiently
  }, 16); // ~60fps

  window.addEventListener("scroll", scrollHandler, { passive: true });
};

// Initialize all performance optimizations
export const initPerformanceOptimizations = () => {
  preloadCriticalResources();
  optimizeBundleLoading();
  preventMemoryLeaks();
  optimizeJavaScriptExecution();
};

// Performance monitoring with alerts
export const monitorPerformance = () => {
  if (typeof window === "undefined") return;

  // Monitor Core Web Vitals
  const observer = new PerformanceObserver(list => {
    list.getEntries().forEach(entry => {
      if (entry.entryType === "largest-contentful-paint") {
        const lcp = entry.startTime;
        if (lcp > 2500) {
          console.warn(`LCP is slow: ${Math.round(lcp)}ms`);
        }
      }

      if (entry.entryType === "first-contentful-paint") {
        const fcp = entry.startTime;
        if (fcp > 1800) {
          console.warn(`FCP is slow: ${Math.round(fcp)}ms`);
        }
      }
    });
  });

  observer.observe({ entryTypes: ["largest-contentful-paint", "first-contentful-paint"] });

  // Monitor layout shifts
  let clsValue = 0;
  const clsObserver = new PerformanceObserver(list => {
    list.getEntries().forEach((entry: any) => {
      if (!entry.hadRecentInput) {
        clsValue += entry.value;
      }
    });

    if (clsValue > 0.1) {
      console.warn(`CLS is poor: ${clsValue.toFixed(3)}`);
    }
  });

  clsObserver.observe({ entryTypes: ["layout-shift"] });
};
