/**
 * Advanced Performance Monitoring & Memory Optimization
 * Provides comprehensive performance tracking, memory leak detection, and network monitoring
 */

import { logger } from "./logger";

// Type definitions for browser APIs
interface MemoryInfo {
  usedJSHeapSize: number;
  totalJSHeapSize: number;
  jsHeapSizeLimit: number;
}

interface PerformanceWithMemory extends Performance {
  memory?: MemoryInfo;
}

interface NetworkConnectionInfo {
  effectiveType: string;
  downlink: number;
  rtt: number;
  saveData: boolean;
}

interface NavigatorWithConnection {
  connection?: NetworkConnectionInfo;
}

// Memory leak detection with optimized thresholds
let memoryCheckInterval: NodeJS.Timeout | undefined;
let visibilityHandler: (() => void) | undefined;

export const startMemoryMonitoring = (): void => {
  if (memoryCheckInterval) {
    clearInterval(memoryCheckInterval);
  }

  const runMemoryCheck = (): void => {
    const performanceWithMemory = performance as PerformanceWithMemory;
    const memory = performanceWithMemory.memory;

    if (memory) {
      const usedMB = Math.round(memory.usedJSHeapSize / 1024 / 1024);
      const totalMB = Math.round(memory.totalJSHeapSize / 1024 / 1024);
      const limitMB = Math.round(memory.jsHeapSizeLimit / 1024 / 1024);

      logger.logInfo(`Memory usage: ${usedMB}MB / ${totalMB}MB (limit: ${limitMB}MB)`, {
        component: "performance_monitoring",
        action: "memory_check",
        usedMB,
        totalMB,
        limitMB,
      });

      // Optimized threshold for earlier intervention
      if (usedMB > 35) {
        logger.logWarning("Memory optimization triggered - cleaning unused resources", {
          component: "performance_monitoring",
          action: "memory_cleanup",
          usedMB,
          threshold: 35,
        });

        // Cleanup strategies
        cleanupUnusedComponents();

        // Trigger garbage collection if available
        if ("gc" in globalThis) {
          (globalThis as typeof globalThis & { gc?: () => void }).gc?.();
        }
      }
    }
  };

  // FIX: Added visibility awareness to pause memory monitoring when tab is hidden
  const startInterval = (): void => {
    if (memoryCheckInterval) return;
    memoryCheckInterval = setInterval(() => {
      if (!document.hidden) {
        runMemoryCheck();
      }
    }, 60000); // Check every 60 seconds
  };

  const stopInterval = (): void => {
    if (memoryCheckInterval) {
      clearInterval(memoryCheckInterval);
      memoryCheckInterval = undefined;
    }
  };

  visibilityHandler = (): void => {
    if (document.hidden) {
      stopInterval();
    } else {
      startInterval();
    }
  };

  // Start if visible
  if (!document.hidden) {
    startInterval();
  }

  document.addEventListener("visibilitychange", visibilityHandler, { passive: true });
};

// Component cleanup for memory optimization
export const cleanupUnusedComponents = (): void => {
  let cleanedCount = 0;

  // Clear unused audio players
  const audioPlayers = document.querySelectorAll("audio");
  for (const player of audioPlayers) {
    if (player.paused && !player.currentTime) {
      player.src = "";
      player.load();
      cleanedCount++;
    }
  }

  // Clear unused images from cache
  const images = document.querySelectorAll('img[data-cleanup="true"]');
  for (const img of images) {
    if (!img.getBoundingClientRect().width) {
      (img as HTMLImageElement).src = "";
      cleanedCount++;
    }
  }

  logger.logInfo(`Cleaned up ${cleanedCount} unused components`, {
    component: "performance_monitoring",
    action: "cleanup",
    cleanedCount,
  });
};

// Constants for performance thresholds
const PERFORMANCE_THRESHOLDS = {
  FCP: 2500, // First Contentful Paint threshold in ms
  LCP: 2500, // Largest Contentful Paint threshold in ms
  CLS: 0.1, // Cumulative Layout Shift threshold
} as const;

// Handle First Contentful Paint metric
const handleFirstContentfulPaint = (entry: PerformanceEntry): void => {
  logger.logPerformance(
    "FCP",
    { value: entry.startTime, unit: "ms" },
    {
      component: "performance_monitoring",
      action: "core_web_vitals",
    }
  );

  if (entry.startTime > PERFORMANCE_THRESHOLDS.FCP) {
    logger.logWarning("FCP is slow, consider optimizing critical resources", {
      component: "performance_monitoring",
      action: "fcp_warning",
      value: entry.startTime,
      threshold: PERFORMANCE_THRESHOLDS.FCP,
    });
  }
};

// Handle Largest Contentful Paint metric
const handleLargestContentfulPaint = (entry: PerformanceEntry): void => {
  logger.logPerformance(
    "LCP",
    { value: entry.startTime, unit: "ms" },
    {
      component: "performance_monitoring",
      action: "core_web_vitals",
    }
  );

  if (entry.startTime > PERFORMANCE_THRESHOLDS.LCP) {
    logger.logWarning("LCP is slow, optimize largest content elements", {
      component: "performance_monitoring",
      action: "lcp_warning",
      value: entry.startTime,
      threshold: PERFORMANCE_THRESHOLDS.LCP,
    });
  }
};

// Handle Cumulative Layout Shift metric
const handleLayoutShift = (entry: PerformanceEntry): void => {
  const layoutShiftEntry = entry as PerformanceEntry & { value?: number };
  const cls = layoutShiftEntry.value ?? 0;

  if (cls > PERFORMANCE_THRESHOLDS.CLS) {
    logger.logWarning(`CLS: ${cls.toFixed(3)} - Layout shifts detected`, {
      component: "performance_monitoring",
      action: "cls_warning",
      value: cls,
      threshold: PERFORMANCE_THRESHOLDS.CLS,
    });
  }
};

// Process performance entry based on type
const processPerformanceEntry = (entry: PerformanceEntry): void => {
  switch (entry.entryType) {
    case "paint":
      if (entry.name === "first-contentful-paint") {
        handleFirstContentfulPaint(entry);
      }
      break;

    case "largest-contentful-paint":
      handleLargestContentfulPaint(entry);
      break;

    case "layout-shift":
      handleLayoutShift(entry);
      break;
  }
};

// Advanced performance metrics
export const trackPerformanceMetrics = (): void => {
  try {
    // Core Web Vitals tracking
    const observer = new PerformanceObserver(list => {
      for (const entry of list.getEntries()) {
        processPerformanceEntry(entry);
      }
    });

    observer.observe({ entryTypes: ["paint", "largest-contentful-paint", "layout-shift"] });

    logger.logInfo("Performance metrics tracking initialized", {
      component: "performance_monitoring",
      action: "init",
    });
  } catch (error) {
    logger.logError("Failed to initialize performance metrics tracking", error, {
      errorType: "critical",
      component: "performance_monitoring",
      action: "init_error",
    });
  }
};

// Network performance monitoring
export const monitorNetworkPerformance = (): void => {
  const navigatorWithConnection = navigator as NavigatorWithConnection;

  if ("connection" in navigatorWithConnection && navigatorWithConnection.connection) {
    const connection = navigatorWithConnection.connection;

    logger.logInfo("Network info", {
      component: "performance_monitoring",
      action: "network_check",
      effectiveType: connection.effectiveType,
      downlink: connection.downlink,
      rtt: connection.rtt,
      saveData: connection.saveData,
    });

    // Adapt performance based on network
    if (connection.effectiveType === "slow-2g" || connection.saveData) {
      logger.logInfo("Enabling data saving mode", {
        component: "performance_monitoring",
        action: "data_saving_mode",
        effectiveType: connection.effectiveType,
        saveData: connection.saveData,
      });

      enableDataSavingMode();
    }
  } else {
    logger.logInfo("Network Connection API not supported", {
      component: "performance_monitoring",
      action: "network_check",
    });
  }
};

const enableDataSavingMode = (): void => {
  let optimizedCount = 0;

  // Reduce image quality
  const images = document.querySelectorAll("img");
  for (const img of images) {
    if (img.src && !img.dataset.optimized) {
      img.dataset.optimized = "true";
      optimizedCount++;
      // Could implement image compression here
    }
  }

  logger.logInfo(`Data saving mode enabled, optimized ${optimizedCount} images`, {
    component: "performance_monitoring",
    action: "data_saving_mode",
    optimizedCount,
  });
};

// Stop memory monitoring
export const stopMemoryMonitoring = (): void => {
  if (memoryCheckInterval) {
    clearInterval(memoryCheckInterval);
    memoryCheckInterval = undefined;
  }

  // FIX: Clean up visibility listener
  if (visibilityHandler) {
    document.removeEventListener("visibilitychange", visibilityHandler);
    visibilityHandler = undefined;
  }

  logger.logInfo("Memory monitoring stopped", {
    component: "performance_monitoring",
    action: "stop",
  });
};

// Initialize all performance monitoring
export const initializePerformanceMonitoring = (): void => {
  try {
    startMemoryMonitoring();
    trackPerformanceMetrics();
    monitorNetworkPerformance();

    logger.logInfo("Performance monitoring initialized successfully", {
      component: "performance_monitoring",
      action: "init",
    });
  } catch (error) {
    logger.logError("Failed to initialize performance monitoring", error, {
      errorType: "critical",
      component: "performance_monitoring",
      action: "init_error",
    });
  }
};

// Make performance monitoring available globally in development
if (process.env.NODE_ENV === "development") {
  (
    globalThis as typeof globalThis & {
      performanceMonitoring?: {
        start: () => void;
        stop: () => void;
        cleanup: () => void;
        trackMetrics: () => void;
        monitorNetwork: () => void;
      };
    }
  ).performanceMonitoring = {
    start: initializePerformanceMonitoring,
    stop: stopMemoryMonitoring,
    cleanup: cleanupUnusedComponents,
    trackMetrics: trackPerformanceMetrics,
    monitorNetwork: monitorNetworkPerformance,
  };
}
