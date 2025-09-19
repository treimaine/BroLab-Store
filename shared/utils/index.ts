// Central export file for all shared utilities

// Core utilities
export * from "./analytics-manager";
export * from "./error-handler";
export * from "./offline-manager";
export * from "./optimistic-update-manager";
export * from "./rate-limiter";
export * from "./retry-manager";
export * from "./syncManager";
export * from "./system-manager";

// Re-export singleton instances
export {
  errorBoundaryManager,
  healthMonitor,
  offlineManager,
  optimisticUpdateManager,
  performanceMonitor,
  rateLimiter,
  retryManager,
  syncManager,
  systemManager,
} from "./system-manager";

export { analyticsManager } from "./analytics-manager";

export { errorHandler } from "./error-handler";

export { retryManager as defaultRetryManager } from "./retry-manager";
