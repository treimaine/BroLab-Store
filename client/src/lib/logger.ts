/**
 * Comprehensive logging and debugging system for the mixing-mastering page
 * Implements detailed console logging, error tracking, and performance monitoring
 *
 * Uses clientLogger internally for PII sanitization while maintaining
 * the specialized mixing-mastering logging API.
 */

import { clientLogger, LogLevel } from "./clientLogger";
import type { ErrorContext, LogContext, PerformanceMetrics } from "./loggerTypes";

// Re-export types for backward compatibility
export type { ErrorContext, LogContext, PerformanceMetrics } from "./loggerTypes";

export class Logger {
  private static instance: Logger;
  private readonly sessionId: string;
  private readonly performanceMetrics: PerformanceMetrics;
  private errorCount: number = 0;
  private debugMode: boolean;

  private constructor() {
    this.sessionId = this.generateSessionId();
    this.performanceMetrics = {
      pageLoadStart: performance.now(),
    };
    this.debugMode =
      process.env.NODE_ENV === "development" ||
      localStorage.getItem("debug-mixing-mastering") === "true";

    // Initialize performance monitoring
    this.initializePerformanceMonitoring();
  }

  public static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }

  private initializePerformanceMonitoring(): void {
    // Monitor page load completion
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", () => {
        this.performanceMetrics.pageLoadEnd = performance.now();
        this.logPerformance("page_load_complete", {
          loadTime: this.getPageLoadTime(),
        });
      });
    } else {
      this.performanceMetrics.pageLoadEnd = performance.now();
    }

    // Monitor navigation timing
    globalThis.addEventListener("load", () => {
      setTimeout(() => {
        this.logNavigationTiming();
      }, 100);
    });
  }

  private getBaseContext(): LogContext {
    return {
      page: "mixing-mastering",
      sessionId: this.sessionId,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: globalThis.location.href,
    };
  }

  public getPageLoadTime(): number | null {
    if (this.performanceMetrics.pageLoadEnd) {
      return this.performanceMetrics.pageLoadEnd - this.performanceMetrics.pageLoadStart;
    }
    return null;
  }

  public logInfo(message: string, context?: LogContext): void {
    const fullContext = { ...this.getBaseContext(), ...context };

    if (this.debugMode) {
      clientLogger.logWithEmoji(LogLevel.INFO, "🔵", "INFO", message, fullContext);
    }
  }

  public logWarning(message: string, context?: LogContext): void {
    const fullContext = { ...this.getBaseContext(), ...context };
    clientLogger.logWithEmoji(LogLevel.WARN, "🟡", "WARNING", message, fullContext);
  }

  public logError(message: string, error: unknown, errorContext?: ErrorContext): void {
    this.errorCount++;

    const fullContext: ErrorContext = {
      ...this.getBaseContext(),
      ...errorContext,
      errorType: errorContext?.errorType || "critical",
      stack: error instanceof Error ? error.stack : undefined,
      errorMessage: error instanceof Error ? error.message : String(error),
      errorCount: this.errorCount,
    };

    clientLogger.logWithEmoji(LogLevel.ERROR, "🔴", "ERROR", message, {
      error,
      context: fullContext,
    });

    // Track error patterns for debugging
    this.trackErrorPattern(fullContext);
  }

  public logAuthenticationEvent(event: string, context?: LogContext): void {
    const authContext = {
      ...this.getBaseContext(),
      ...context,
      component: "authentication",
    };

    if (this.debugMode) {
      clientLogger.logWithEmoji(LogLevel.INFO, "🔐", "AUTH", event, authContext);
    }
  }

  public logAuthenticationError(message: string, error: unknown, context?: LogContext): void {
    const errorContext: ErrorContext = {
      ...this.getBaseContext(),
      ...context,
      errorType: "authentication",
      component: "authentication",
    };

    this.logError(message, error, errorContext);
  }

  public logApiRequest(method: string, url: string, context?: LogContext): void {
    const apiContext = {
      ...this.getBaseContext(),
      ...context,
      component: "api",
      action: `${method} ${url}`,
    };

    if (this.debugMode) {
      clientLogger.logWithEmoji(
        LogLevel.INFO,
        "🌐",
        "API",
        `Request: ${method} ${url}`,
        apiContext
      );
    }
  }

  public logApiError(message: string, error: unknown, context?: LogContext): void {
    const errorContext: ErrorContext = {
      ...this.getBaseContext(),
      ...context,
      errorType: "api",
      component: "api",
    };

    this.logError(message, error, errorContext);
  }

  public logFormValidation(
    field: string,
    isValid: boolean,
    error?: string,
    context?: LogContext
  ): void {
    const validationContext = {
      ...this.getBaseContext(),
      ...context,
      component: "form_validation",
      field,
      isValid,
      validationError: error,
    };

    if (this.debugMode) {
      clientLogger.logWithEmoji(
        LogLevel.INFO,
        "📝",
        "VALIDATION",
        `${field}: ${isValid ? "valid" : "invalid"}`,
        validationContext
      );
    }
  }

  public logFormValidationError(message: string, error: unknown, context?: LogContext): void {
    const errorContext: ErrorContext = {
      ...this.getBaseContext(),
      ...context,
      errorType: "validation",
      component: "form_validation",
    };

    this.logError(message, error, errorContext);
  }

  public logFileUpload(event: string, fileName?: string, context?: LogContext): void {
    const uploadContext = {
      ...this.getBaseContext(),
      ...context,
      component: "file_upload",
      fileName,
    };

    if (this.debugMode) {
      clientLogger.logWithEmoji(LogLevel.INFO, "📁", "FILE_UPLOAD", event, uploadContext);
    }
  }

  public logFileUploadError(message: string, error: unknown, context?: LogContext): void {
    const errorContext: ErrorContext = {
      ...this.getBaseContext(),
      ...context,
      errorType: "file_upload",
      component: "file_upload",
    };

    this.logError(message, error, errorContext);
  }

  public logPerformance(metric: string, data: Record<string, unknown>, context?: LogContext): void {
    const perfContext = {
      ...this.getBaseContext(),
      ...context,
      component: "performance",
      metric,
      ...data,
    };

    if (this.debugMode) {
      clientLogger.logWithEmoji(LogLevel.INFO, "⚡", "PERFORMANCE", metric, perfContext);
    }
  }

  public startPerformanceTimer(name: string): () => void {
    const startTime = performance.now();

    return () => {
      const endTime = performance.now();
      const duration = endTime - startTime;

      this.logPerformance(`timer_${name}`, {
        duration,
        startTime,
        endTime,
      });

      return duration;
    };
  }

  public logUserAction(action: string, context?: LogContext): void {
    const actionContext = {
      ...this.getBaseContext(),
      ...context,
      component: "user_interaction",
      action,
    };

    if (this.debugMode) {
      clientLogger.logWithEmoji(LogLevel.INFO, "👤", "USER_ACTION", action, actionContext);
    }
  }

  private trackErrorPattern(errorContext: ErrorContext): void {
    // Track error patterns for debugging insights
    const errorKey = `error_${errorContext.errorType}_${errorContext.component}`;
    const errorData = {
      count: this.errorCount,
      lastOccurrence: errorContext.timestamp,
      pattern: errorKey,
    };

    if (this.debugMode) {
      clientLogger.logWithEmoji(LogLevel.INFO, "📊", "ERROR_PATTERN", errorKey, errorData);
    }
  }

  private logNavigationTiming(): void {
    // Use modern Performance Navigation Timing API
    const entries = globalThis.performance?.getEntriesByType?.("navigation");
    if (!entries || entries.length === 0) {
      return;
    }

    const timing = entries[0] as PerformanceNavigationTiming;

    const metrics = {
      dns: timing.domainLookupEnd - timing.domainLookupStart,
      tcp: timing.connectEnd - timing.connectStart,
      request: timing.responseStart - timing.requestStart,
      response: timing.responseEnd - timing.responseStart,
      dom: timing.domContentLoadedEventEnd - timing.domContentLoadedEventStart,
      load: timing.loadEventEnd - timing.loadEventStart,
      total: timing.loadEventEnd - timing.startTime,
    };

    this.logPerformance("navigation_timing", metrics);
  }

  public getDebugSummary(): Record<string, unknown> {
    return {
      sessionId: this.sessionId,
      errorCount: this.errorCount,
      pageLoadTime: this.getPageLoadTime(),
      performanceMetrics: this.performanceMetrics,
      debugMode: this.debugMode,
      timestamp: new Date().toISOString(),
    };
  }

  public enableDebugMode(): void {
    this.debugMode = true;
    localStorage.setItem("debug-mixing-mastering", "true");
    clientLogger.info("Debug mode enabled for mixing-mastering page");
  }

  public disableDebugMode(): void {
    this.debugMode = false;
    localStorage.removeItem("debug-mixing-mastering");
    clientLogger.info("Debug mode disabled for mixing-mastering page");
  }
}

// Export singleton instance
export const logger = Logger.getInstance();

// Export convenience functions
export const logInfo = (message: string, context?: LogContext): void =>
  logger.logInfo(message, context);
export const logWarning = (message: string, context?: LogContext): void =>
  logger.logWarning(message, context);
export const logError = (message: string, error: unknown, context?: ErrorContext): void =>
  logger.logError(message, error, context);
export const logAuthEvent = (event: string, context?: LogContext): void =>
  logger.logAuthenticationEvent(event, context);
export const logAuthError = (message: string, error: unknown, context?: LogContext): void =>
  logger.logAuthenticationError(message, error, context);
export const logApiRequest = (method: string, url: string, context?: LogContext): void =>
  logger.logApiRequest(method, url, context);
export const logApiError = (message: string, error: unknown, context?: LogContext): void =>
  logger.logApiError(message, error, context);
export const logFormValidation = (
  field: string,
  isValid: boolean,
  error?: string,
  context?: LogContext
): void => logger.logFormValidation(field, isValid, error, context);
export const logFormValidationError = (
  message: string,
  error: unknown,
  context?: LogContext
): void => logger.logFormValidationError(message, error, context);
export const logFileUpload = (event: string, fileName?: string, context?: LogContext): void =>
  logger.logFileUpload(event, fileName, context);
export const logFileUploadError = (message: string, error: unknown, context?: LogContext): void =>
  logger.logFileUploadError(message, error, context);
export const logPerformance = (
  metric: string,
  data: Record<string, unknown>,
  context?: LogContext
): void => logger.logPerformance(metric, data, context);
export const startTimer = (name: string): (() => void) => logger.startPerformanceTimer(name);
export const logUserAction = (action: string, context?: LogContext): void =>
  logger.logUserAction(action, context);

// Debug utilities for development
export const debugUtils = {
  enableDebug: (): void => logger.enableDebugMode(),
  disableDebug: (): void => logger.disableDebugMode(),
  getSummary: (): Record<string, unknown> => logger.getDebugSummary(),
  getPageLoadTime: (): number | null => logger.getPageLoadTime(),
};

// Extend globalThis interface for debug utilities
declare global {
  var mixingMasteringDebug: typeof debugUtils | undefined;
}

// Make debug utils available globally in development
if (process.env.NODE_ENV === "development") {
  globalThis.mixingMasteringDebug = debugUtils;
}
