/**
 * Error Logging Service
 *
 * Comprehensive error logging system that captures full context for debugging
 * synchronization issues. Provides structured logging, remote reporting,
 * and error analytics for dashboard sync operations.
 */

import type {
  EnhancedSyncError,
  ErrorContext,
  RecoveryAttempt,
} from "@/services/ErrorHandlingManager";
import { storage } from "@/services/StorageManager";

// ================================
// TYPE ALIASES
// ================================

/** Log level type */
export type LogLevel = "debug" | "info" | "warn" | "error" | "critical";

/** Log category type */
export type LogCategory = "error" | "recovery" | "performance" | "user_action" | "system";

// ================================
// LOGGING INTERFACES
// ================================

/**
 * Log entry structure
 */
export interface LogEntry {
  /** Unique log entry ID */
  id: string;
  /** Log level */
  level: LogLevel;
  /** Log message */
  message: string;
  /** Timestamp */
  timestamp: number;
  /** Log category */
  category: LogCategory;
  /** Component that generated the log */
  component: string;
  /** User ID if available */
  userId?: string;
  /** Session ID */
  sessionId: string;
  /** Error details if applicable */
  error?: EnhancedSyncError;
  /** Recovery attempt details if applicable */
  recoveryAttempt?: RecoveryAttempt;
  /** Additional context data */
  context: Record<string, unknown>;
  /** Performance metrics */
  performance?: PerformanceMetrics;
  /** Browser/environment information */
  environment: EnvironmentInfo;
}

/**
 * Performance metrics for logging
 */
export interface PerformanceMetrics {
  /** Memory usage in bytes */
  memoryUsage: number;
  /** CPU usage percentage (if available) */
  cpuUsage?: number;
  /** Network latency in milliseconds */
  networkLatency?: number;
  /** Operation duration in milliseconds */
  operationDuration: number;
  /** DOM nodes count */
  domNodes?: number;
  /** Active event listeners count */
  eventListeners?: number;
}

/**
 * Browser/environment information
 */
export interface EnvironmentInfo {
  /** User agent string */
  userAgent: string;
  /** Current URL */
  url: string;
  /** Viewport dimensions */
  viewport: {
    width: number;
    height: number;
  };
  /** Screen dimensions */
  screen: {
    width: number;
    height: number;
  };
  /** Connection information */
  connection?: {
    effectiveType: string;
    downlink: number;
    rtt: number;
  };
  /** Online status */
  online: boolean;
  /** Local storage availability */
  localStorage: boolean;
  /** Session storage availability */
  sessionStorage: boolean;
  /** WebSocket support */
  webSocketSupport: boolean;
  /** Service worker support */
  serviceWorkerSupport: boolean;
}

/**
 * Remote logging configuration
 */
export interface RemoteLoggingConfig {
  /** Remote logging endpoint URL */
  endpoint: string;
  /** API key for authentication */
  apiKey?: string;
  /** Batch size for log entries */
  batchSize: number;
  /** Flush interval in milliseconds */
  flushInterval: number;
  /** Maximum retries for failed requests */
  maxRetries: number;
  /** Retry delay in milliseconds */
  retryDelay: number;
  /** Whether to compress log data */
  compress: boolean;
  /** Custom headers */
  headers?: Record<string, string>;
}

/** Console log level type */
export type ConsoleLogLevel = "debug" | "info" | "warn" | "error";

/**
 * Error logging configuration
 */
export interface ErrorLoggingConfig {
  /** Whether to log to console */
  console: boolean;
  /** Console log level threshold */
  consoleLevel: ConsoleLogLevel;
  /** Whether to store logs locally */
  localStorage: boolean;
  /** Maximum local log entries */
  maxLocalEntries: number;
  /** Whether to send logs to remote service */
  remote: boolean;
  /** Remote logging configuration */
  remoteConfig?: RemoteLoggingConfig;
  /** Whether to include stack traces */
  includeStackTrace: boolean;
  /** Whether to include performance metrics */
  includePerformance: boolean;
  /** Whether to include environment info */
  includeEnvironment: boolean;
  /** Whether to sanitize sensitive data */
  sanitizeData: boolean;
  /** Custom data sanitization function */
  sanitizer?: (data: unknown) => unknown;
}

// ================================
// ERROR LOGGING SERVICE
// ================================

export class ErrorLoggingService {
  private readonly config: ErrorLoggingConfig;
  private logEntries: LogEntry[] = [];
  private readonly sessionId: string;
  private userId?: string;
  private remoteQueue: LogEntry[] = [];
  private flushTimer?: NodeJS.Timeout;
  private cleanupInterval?: NodeJS.Timeout;
  private isDestroyed = false;

  constructor(config: Partial<ErrorLoggingConfig> = {}) {
    this.config = {
      console: true,
      consoleLevel: "error",
      localStorage: true,
      maxLocalEntries: 1000,
      remote: false,
      includeStackTrace: true,
      includePerformance: true,
      includeEnvironment: true,
      sanitizeData: true,
      ...config,
    };

    this.sessionId = this.generateSessionId();
    this.initializeService();
  }

  // ================================
  // PUBLIC LOGGING METHODS
  // ================================

  /**
   * Log an error with full context
   */
  public logError(
    error: EnhancedSyncError,
    context: Partial<ErrorContext> = {},
    additionalData: Record<string, unknown> = {}
  ): void {
    const logEntry = this.createLogEntry({
      level: this.mapSeverityToLevel(error.severity),
      message: `Sync Error: ${error.type} - ${error.message}`,
      category: "error",
      component: context.component || "unknown",
      error,
      context: {
        ...context,
        ...additionalData,
        errorFingerprint: error.fingerprint,
        errorCategory: error.category,
        recoveryStrategy: error.recoveryStrategy,
      },
    });

    this.addLogEntry(logEntry);
  }

  /**
   * Log a recovery attempt
   */
  public logRecoveryAttempt(
    recoveryAttempt: RecoveryAttempt,
    error: EnhancedSyncError,
    context: Partial<ErrorContext> = {}
  ): void {
    const attemptInfo = `attempt ${recoveryAttempt.attemptNumber}`;
    const message = `Recovery Attempt: ${recoveryAttempt.strategy} for ${error.type} (${attemptInfo})`;

    const logEntry = this.createLogEntry({
      level: "info",
      message,
      category: "recovery",
      component: context.component || "recovery_manager",
      error,
      recoveryAttempt,
      context: {
        ...context,
        errorFingerprint: error.fingerprint,
        recoveryStrategy: recoveryAttempt.strategy,
        attemptNumber: recoveryAttempt.attemptNumber,
      },
    });

    this.addLogEntry(logEntry);
  }

  /**
   * Log performance metrics
   */
  public logPerformance(
    operation: string,
    metrics: PerformanceMetrics,
    context: Partial<ErrorContext> = {}
  ): void {
    const logEntry = this.createLogEntry({
      level: "debug",
      message: `Performance: ${operation} completed in ${metrics.operationDuration}ms`,
      category: "performance",
      component: context.component || "performance_monitor",
      performance: metrics,
      context: {
        ...context,
        operation,
        duration: metrics.operationDuration,
        memoryUsage: metrics.memoryUsage,
      },
    });

    this.addLogEntry(logEntry);
  }

  /**
   * Log user action
   */
  public logUserAction(
    action: string,
    errorId?: string,
    context: Partial<ErrorContext> = {}
  ): void {
    const errorSuffix = errorId ? ` for error ${errorId}` : "";
    const message = `User Action: ${action}${errorSuffix}`;

    const logEntry = this.createLogEntry({
      level: "info",
      message,
      category: "user_action",
      component: context.component || "user_interface",
      context: {
        ...context,
        action,
        errorId,
        userInitiated: true,
      },
    });

    this.addLogEntry(logEntry);
  }

  /**
   * Log system event
   */
  public logSystemEvent(
    event: string,
    level: LogLevel = "info",
    context: Partial<ErrorContext> = {}
  ): void {
    const logEntry = this.createLogEntry({
      level,
      message: `System Event: ${event}`,
      category: "system",
      component: context.component || "system",
      context: {
        ...context,
        event,
        systemGenerated: true,
      },
    });

    this.addLogEntry(logEntry);
  }

  // ================================
  // LOG RETRIEVAL AND ANALYSIS
  // ================================

  /**
   * Get log entries with optional filtering
   */
  public getLogs(filter?: {
    level?: LogLevel;
    category?: LogCategory;
    component?: string;
    since?: number;
    limit?: number;
  }): LogEntry[] {
    let filteredLogs = [...this.logEntries];

    if (filter) {
      if (filter.level) {
        const levelPriority = { debug: 0, info: 1, warn: 2, error: 3, critical: 4 };
        const minPriority = levelPriority[filter.level];
        filteredLogs = filteredLogs.filter(log => levelPriority[log.level] >= minPriority);
      }

      if (filter.category) {
        filteredLogs = filteredLogs.filter(log => log.category === filter.category);
      }

      if (filter.component) {
        filteredLogs = filteredLogs.filter(log => log.component === filter.component);
      }

      if (filter.since) {
        filteredLogs = filteredLogs.filter(log => log.timestamp >= filter.since!);
      }

      if (filter.limit) {
        filteredLogs = filteredLogs.slice(-filter.limit);
      }
    }

    const sortedLogs = [...filteredLogs];
    sortedLogs.sort((a, b) => b.timestamp - a.timestamp);
    return sortedLogs;
  }

  /**
   * Get error analytics from logs
   */
  public getErrorAnalytics(): {
    totalErrors: number;
    errorsByType: Record<string, number>;
    errorsBySeverity: Record<string, number>;
    errorsByComponent: Record<string, number>;
    recoveryAttempts: number;
    successfulRecoveries: number;
    averageRecoveryTime: number;
    performanceMetrics: {
      averageMemoryUsage: number;
      averageOperationDuration: number;
      slowestOperations: Array<{ operation: string; duration: number }>;
    };
  } {
    const errorLogs = this.logEntries.filter(log => log.category === "error");
    const recoveryLogs = this.logEntries.filter(log => log.category === "recovery");
    const performanceLogs = this.logEntries.filter(log => log.category === "performance");

    // Error analysis
    const errorsByType: Record<string, number> = {};
    const errorsBySeverity: Record<string, number> = {};
    const errorsByComponent: Record<string, number> = {};

    for (const log of errorLogs) {
      if (log.error) {
        errorsByType[log.error.type] = (errorsByType[log.error.type] || 0) + 1;
        errorsBySeverity[log.error.severity] = (errorsBySeverity[log.error.severity] || 0) + 1;
      }
      errorsByComponent[log.component] = (errorsByComponent[log.component] || 0) + 1;
    }

    // Recovery analysis
    const successfulRecoveries = recoveryLogs.filter(
      log => log.recoveryAttempt?.result === "success"
    ).length;

    const recoveryTimes = recoveryLogs
      .filter(log => log.recoveryAttempt?.duration)
      .map(log => log.recoveryAttempt!.duration!);

    const averageRecoveryTime =
      recoveryTimes.length > 0
        ? recoveryTimes.reduce((sum, time) => sum + time, 0) / recoveryTimes.length
        : 0;

    // Performance analysis
    const memoryUsages = performanceLogs
      .filter(log => log.performance?.memoryUsage)
      .map(log => log.performance!.memoryUsage);

    const operationDurations = performanceLogs
      .filter(log => log.performance?.operationDuration)
      .map(log => ({
        operation: (log.context.operation as string) || "unknown",
        duration: log.performance!.operationDuration,
      }));

    const averageMemoryUsage =
      memoryUsages.length > 0
        ? memoryUsages.reduce((sum, usage) => sum + usage, 0) / memoryUsages.length
        : 0;

    const averageOperationDuration =
      operationDurations.length > 0
        ? operationDurations.reduce((sum, op) => sum + op.duration, 0) / operationDurations.length
        : 0;

    const sortedOperations = [...operationDurations];
    sortedOperations.sort((a, b) => b.duration - a.duration);
    const slowestOperations = sortedOperations.slice(0, 10);

    return {
      totalErrors: errorLogs.length,
      errorsByType,
      errorsBySeverity,
      errorsByComponent,
      recoveryAttempts: recoveryLogs.length,
      successfulRecoveries,
      averageRecoveryTime,
      performanceMetrics: {
        averageMemoryUsage,
        averageOperationDuration,
        slowestOperations,
      },
    };
  }

  /**
   * Export logs in various formats
   */
  public exportLogs(format: "json" | "csv" | "txt" = "json"): string {
    const logs = this.getLogs();

    switch (format) {
      case "json":
        return JSON.stringify(logs, null, 2);

      case "csv": {
        const headers = ["timestamp", "level", "category", "component", "message"];
        const csvRows = [
          headers.join(","),
          ...logs.map(log =>
            [
              new Date(log.timestamp).toISOString(),
              log.level,
              log.category,
              log.component,
              `"${log.message.replaceAll('"', '""')}"`,
            ].join(",")
          ),
        ];
        return csvRows.join("\n");
      }

      case "txt":
        return logs
          .map(
            log =>
              `[${new Date(log.timestamp).toISOString()}] ${log.level.toUpperCase()} ${log.component}: ${log.message}`
          )
          .join("\n");

      default:
        return JSON.stringify(logs, null, 2);
    }
  }

  // ================================
  // CONFIGURATION AND MANAGEMENT
  // ================================

  /**
   * Set user ID for log entries
   */
  public setUserId(userId: string): void {
    this.userId = userId;
  }

  /**
   * Clear all log entries
   */
  public clearLogs(): void {
    this.logEntries = [];
    this.remoteQueue = [];

    if (this.config.localStorage) {
      storage.removeErrorLogs();
    }
  }

  /**
   * Flush pending remote logs immediately
   */
  public async flushRemoteLogs(): Promise<void> {
    if (!this.config.remote || this.remoteQueue.length === 0) {
      return;
    }

    await this.sendLogsToRemote([...this.remoteQueue]);
    this.remoteQueue = [];
  }

  /**
   * Destroy the logging service
   */
  public destroy(): void {
    this.isDestroyed = true;

    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = undefined;
    }

    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = undefined;
    }

    // Flush any pending remote logs
    if (this.config.remote && this.remoteQueue.length > 0) {
      this.flushRemoteLogs().catch(console.error);
    }
  }

  // ================================
  // PRIVATE METHODS
  // ================================

  private initializeService(): void {
    // Load existing logs from localStorage
    if (this.config.localStorage) {
      this.loadLogsFromStorage();
    }

    // Set up remote logging flush timer
    if (this.config.remote && this.config.remoteConfig) {
      this.flushTimer = setInterval(() => {
        if (this.remoteQueue.length > 0) {
          this.flushRemoteLogs().catch(console.error);
        }
      }, this.config.remoteConfig.flushInterval);
    }

    // Set up periodic cleanup
    this.cleanupInterval = setInterval(() => {
      this.cleanupOldLogs();
    }, 60000); // Clean up every minute
  }

  private createLogEntry(params: {
    level: LogLevel;
    message: string;
    category: LogCategory;
    component: string;
    error?: EnhancedSyncError;
    recoveryAttempt?: RecoveryAttempt;
    performance?: PerformanceMetrics;
    context: Record<string, unknown>;
  }): LogEntry {
    const entry: LogEntry = {
      id: this.generateLogId(),
      level: params.level,
      message: params.message,
      timestamp: Date.now(),
      category: params.category,
      component: params.component,
      userId: this.userId,
      sessionId: this.sessionId,
      error: params.error,
      recoveryAttempt: params.recoveryAttempt,
      context: this.config.sanitizeData ? this.sanitizeData(params.context) : params.context,
      performance: this.config.includePerformance
        ? params.performance || this.collectPerformanceMetrics()
        : undefined,
      environment: this.config.includeEnvironment
        ? this.collectEnvironmentInfo()
        : ({} as EnvironmentInfo),
    };

    return entry;
  }

  private addLogEntry(entry: LogEntry): void {
    if (this.isDestroyed) return;

    // Add to memory
    this.logEntries.push(entry);

    // Trim if exceeding max entries
    if (this.logEntries.length > this.config.maxLocalEntries) {
      this.logEntries = this.logEntries.slice(-this.config.maxLocalEntries);
    }

    // Console logging
    if (this.config.console && this.shouldLogToConsole(entry.level)) {
      this.logToConsole(entry);
    }

    // Local storage
    if (this.config.localStorage) {
      this.saveLogsToStorage();
    }

    // Remote logging
    if (this.config.remote) {
      this.remoteQueue.push(entry);

      // Flush if batch size reached
      if (
        this.config.remoteConfig &&
        this.remoteQueue.length >= this.config.remoteConfig.batchSize
      ) {
        this.flushRemoteLogs().catch(console.error);
      }
    }
  }

  private shouldLogToConsole(level: LogLevel): boolean {
    const levelPriority = { debug: 0, info: 1, warn: 2, error: 3, critical: 4 };
    const consolePriority = levelPriority[this.config.consoleLevel];
    const entryPriority = levelPriority[level];

    return entryPriority >= consolePriority;
  }

  private logToConsole(entry: LogEntry): void {
    const consoleMethod = entry.level === "critical" ? "error" : entry.level;
    const method = console[consoleMethod] || console.log;

    method(`[${entry.component}] ${entry.message}`, {
      timestamp: new Date(entry.timestamp).toISOString(),
      category: entry.category,
      context: entry.context,
      error: entry.error,
      performance: entry.performance,
    });
  }

  private async sendLogsToRemote(logs: LogEntry[]): Promise<void> {
    if (!this.config.remoteConfig) return;

    const payload = {
      logs: logs.map(log => ({
        ...log,
        // Remove sensitive data for remote logging
        environment: this.config.includeEnvironment ? log.environment : undefined,
      })),
      sessionId: this.sessionId,
      userId: this.userId,
      timestamp: Date.now(),
    };

    try {
      const response = await fetch(this.config.remoteConfig.endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...this.config.remoteConfig.headers,
          ...(this.config.remoteConfig.apiKey && {
            Authorization: `Bearer ${this.config.remoteConfig.apiKey}`,
          }),
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`Remote logging failed: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      console.error("Failed to send logs to remote service:", error);
      // Could implement retry logic here
    }
  }

  private collectPerformanceMetrics(): PerformanceMetrics {
    const performance = globalThis.window.performance;
    const memory = (performance as Performance & { memory?: { usedJSHeapSize: number } }).memory;

    return {
      memoryUsage: memory ? memory.usedJSHeapSize : 0,
      operationDuration: 0, // Will be set by caller
      domNodes: document.querySelectorAll("*").length,
      eventListeners: this.countEventListeners(),
    };
  }

  private collectEnvironmentInfo(): EnvironmentInfo {
    const connection = (
      navigator as Navigator & {
        connection?: {
          effectiveType: string;
          downlink: number;
          rtt: number;
        };
      }
    ).connection;

    return {
      userAgent: navigator.userAgent,
      url: globalThis.window.location.href,
      viewport: {
        width: globalThis.window.innerWidth,
        height: globalThis.window.innerHeight,
      },
      screen: {
        width: screen.width,
        height: screen.height,
      },
      connection: connection
        ? {
            effectiveType: connection.effectiveType,
            downlink: connection.downlink,
            rtt: connection.rtt,
          }
        : undefined,
      online: navigator.onLine,
      localStorage: this.testStorageAvailability("localStorage"),
      sessionStorage: this.testStorageAvailability("sessionStorage"),
      webSocketSupport: typeof WebSocket !== "undefined",
      serviceWorkerSupport: "serviceWorker" in navigator,
    };
  }

  private countEventListeners(): number {
    // This is a rough estimate - actual implementation would be more complex
    return document.querySelectorAll("[onclick], [onload], [onerror]").length;
  }

  private testStorageAvailability(type: "localStorage" | "sessionStorage"): boolean {
    try {
      const storage = window[type];
      const testKey = "__test__";
      storage.setItem(testKey, "test");
      storage.removeItem(testKey);
      return true;
    } catch {
      return false;
    }
  }

  private sanitizeData(data: Record<string, unknown>): Record<string, unknown> {
    if (this.config.sanitizer) {
      return this.config.sanitizer(data) as Record<string, unknown>;
    }

    // Default sanitization - remove sensitive fields
    const sensitiveFields = ["password", "token", "apiKey", "secret", "auth"];
    const sanitized = { ...data };

    for (const key in sanitized) {
      if (sensitiveFields.some(field => key.toLowerCase().includes(field))) {
        sanitized[key] = "[REDACTED]";
      }
    }

    return sanitized;
  }

  private mapSeverityToLevel(
    severity: "low" | "medium" | "high" | "critical"
  ): "debug" | "info" | "warn" | "error" | "critical" {
    switch (severity) {
      case "low":
        return "debug";
      case "medium":
        return "info";
      case "high":
        return "warn";
      case "critical":
        return "critical";
      default:
        return "error";
    }
  }

  private loadLogsFromStorage(): void {
    try {
      const logs = storage.getErrorLogs<LogEntry>();
      if (logs.length > 0) {
        this.logEntries = logs.slice(-this.config.maxLocalEntries);
      }
    } catch (error) {
      console.warn("Failed to load logs from storage:", error);
    }
  }

  private saveLogsToStorage(): void {
    try {
      const logsToStore = this.logEntries.slice(-this.config.maxLocalEntries);
      storage.setErrorLogs(logsToStore);
    } catch (error) {
      console.warn("Failed to save logs to storage:", error);
    }
  }

  private cleanupOldLogs(): void {
    const cutoffTime = Date.now() - 24 * 60 * 60 * 1000; // 24 hours ago
    this.logEntries = this.logEntries.filter(log => log.timestamp > cutoffTime);
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  private generateLogId(): string {
    return `log_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }
}

// Singleton instance
let errorLoggingServiceInstance: ErrorLoggingService | null = null;

export const getErrorLoggingService = (
  config?: Partial<ErrorLoggingConfig>
): ErrorLoggingService => {
  errorLoggingServiceInstance ??= new ErrorLoggingService(config);
  return errorLoggingServiceInstance;
};

export const destroyErrorLoggingService = (): void => {
  if (errorLoggingServiceInstance) {
    errorLoggingServiceInstance.destroy();
    errorLoggingServiceInstance = null;
  }
};
