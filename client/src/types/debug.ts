/**
 * Type definitions for debug panel summary objects
 */

// Logger summary type based on debugUtils.getSummary() return
export interface LoggerSummary {
  sessionId: string;
  errorCount: number;
  pageLoadTime: number | null;
  performanceMetrics: {
    pageLoadStart: number;
    pageLoadEnd?: number;
    authLoadTime?: number;
    formValidationTime?: number;
    apiRequestTime?: number;
    fileUploadTime?: number;
    renderTime?: number;
  };
  debugMode: boolean;
  timestamp: string;
}

// Error summary type based on errorTracker.getDebugInfo() return
export interface ErrorSummary {
  totalErrors: number;
  errorsByType: Record<string, number>;
  errorsBySeverity: Record<string, number>;
  topErrorPatterns: Array<{
    type: string;
    count: number;
    firstSeen: string;
    lastSeen: string;
    frequency: number;
    commonContext: Record<string, unknown>;
  }>;
  recentBreadcrumbs: Array<{
    timestamp: string;
    category: "navigation" | "user_action" | "api_call" | "state_change" | "error";
    message: string;
    data?: Record<string, unknown>;
    level: "info" | "warning" | "error";
  }>;
  timestamp: string;
}

// Performance summary type based on performanceMonitor.getPerformanceSummary() return
export interface PerformanceSummary {
  totalMetrics: number;
  recentMetrics: number;
  componentCount: number;
  apiCallsCount: number;
  userInteractionsCount: number;
  averageApiResponseTime: number;
  slowestComponents: Array<{
    componentName: string;
    renderTime: number;
    mountTime: number;
    updateCount: number;
    lastUpdate: string;
  }>;
  recentErrors: number;
  memoryUsage: {
    used: number;
    total: number;
    limit: number;
  } | null;
  timestamp: string;
}
