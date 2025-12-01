/**
 * Comprehensive logging and debugging system for the mixing-mastering page
 * Implements detailed console logging, error tracking, and performance monitoring
 */

export interface LogContext {
  page?: string;
  component?: string;
  action?: string;
  userId?: string;
  sessionId?: string;
  timestamp?: string;
  userAgent?: string;
  url?: string;
  [key: string]: unknown;
}

export interface ErrorContext extends LogContext {
  errorType: "authentication" | "api" | "validation" | "file_upload" | "network" | "critical";
  errorCode?: string | number;
  stack?: string;
  recoverable?: boolean;
  retryCount?: number;
  formData?: Record<string, unknown>;
}

export interface PerformanceMetrics {
  pageLoadStart: number;
  pageLoadEnd?: number;
  authLoadTime?: number;
  formValidationTime?: number;
  apiRequestTime?: number;
  fileUploadTime?: number;
  renderTime?: number;
}

export class Logger {
  private static instance: Logger;
  private sessionId: string;
  private performanceMetrics: PerformanceMetrics;
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
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
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
    window.addEventListener("load", () => {
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
      url: window.location.href,
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
      console.log(`🔵 [INFO] ${message}`, fullContext);
    }
  }

  public logWarning(message: string, context?: LogContext): void {
    const fullContext = { ...this.getBaseContext(), ...context };
    console.warn(`🟡 [WARNING] ${message}`, fullContext);
  }

  public logError(message: string, error: Error | unknown, errorContext?: ErrorContext): void {
    this.errorCount++;

    const fullContext: ErrorContext = {
      ...this.getBaseContext(),
      ...errorContext,
      errorType: errorContext?.errorType || "critical",
      stack: error instanceof Error ? error.stack : undefined,
      errorMessage: error instanceof Error ? error.message : String(error),
      errorCount: this.errorCount,
    };

    console.error(`🔴 [ERROR] ${message}`, {
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
      console.log(`🔐 [AUTH] ${event}`, authContext);
    }
  }

  public logAuthenticationError(
    message: string,
    error: Error | unknown,
    context?: LogContext
  ): void {
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
      console.log(`🌐 [API] Request: ${method} ${url}`, apiContext);
    }
  }

  public logApiError(message: string, error: Error | unknown, context?: LogContext): void {
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
      console.log(`📝 [VALIDATION] ${field}: ${isValid ? "valid" : "invalid"}`, validationContext);
    }
  }

  public logFormValidationError(
    message: string,
    error: Error | unknown,
    context?: LogContext
  ): void {
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
      console.log(`📁 [FILE_UPLOAD] ${event}`, uploadContext);
    }
  }

  public logFileUploadError(message: string, error: Error | unknown, context?: LogContext): void {
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
      console.log(`⚡ [PERFORMANCE] ${metric}`, perfContext);
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
      console.log(`👤 [USER_ACTION] ${action}`, actionContext);
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
      console.log(`📊 [ERROR_PATTERN] ${errorKey}`, errorData);
    }
  }

  private logNavigationTiming(): void {
    if (!window.performance || !window.performance.timing) {
      return;
    }

    const timing = window.performance.timing;
    const navigationStart = timing.navigationStart;

    const metrics = {
      dns: timing.domainLookupEnd - timing.domainLookupStart,
      tcp: timing.connectEnd - timing.connectStart,
      request: timing.responseStart - timing.requestStart,
      response: timing.responseEnd - timing.responseStart,
      dom: timing.domContentLoadedEventEnd - timing.domContentLoadedEventStart,
      load: timing.loadEventEnd - timing.loadEventStart,
      total: timing.loadEventEnd - navigationStart,
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
    console.log("🔧 Debug mode enabled for mixing-mastering page");
  }

  public disableDebugMode(): void {
    this.debugMode = false;
    localStorage.removeItem("debug-mixing-mastering");
    console.log("🔧 Debug mode disabled for mixing-mastering page");
  }
}

// Export singleton instance
export const logger = Logger.getInstance();

// Export convenience functions
export const logInfo = (message: string, context?: LogContext) => logger.logInfo(message, context);
export const logWarning = (message: string, context?: LogContext) =>
  logger.logWarning(message, context);
export const logError = (message: string, error: Error | unknown, context?: ErrorContext) =>
  logger.logError(message, error, context);
export const logAuthEvent = (event: string, context?: LogContext) =>
  logger.logAuthenticationEvent(event, context);
export const logAuthError = (message: string, error: Error | unknown, context?: LogContext) =>
  logger.logAuthenticationError(message, error, context);
export const logApiRequest = (method: string, url: string, context?: LogContext) =>
  logger.logApiRequest(method, url, context);
export const logApiError = (message: string, error: Error | unknown, context?: LogContext) =>
  logger.logApiError(message, error, context);
export const logFormValidation = (
  field: string,
  isValid: boolean,
  error?: string,
  context?: LogContext
) => logger.logFormValidation(field, isValid, error, context);
export const logFormValidationError = (
  message: string,
  error: Error | unknown,
  context?: LogContext
) => logger.logFormValidationError(message, error, context);
export const logFileUpload = (event: string, fileName?: string, context?: LogContext) =>
  logger.logFileUpload(event, fileName, context);
export const logFileUploadError = (message: string, error: Error | unknown, context?: LogContext) =>
  logger.logFileUploadError(message, error, context);
export const logPerformance = (
  metric: string,
  data: Record<string, unknown>,
  context?: LogContext
) => logger.logPerformance(metric, data, context);
export const startTimer = (name: string) => logger.startPerformanceTimer(name);
export const logUserAction = (action: string, context?: LogContext) =>
  logger.logUserAction(action, context);

// Debug utilities for development
export const debugUtils = {
  enableDebug: () => logger.enableDebugMode(),
  disableDebug: () => logger.disableDebugMode(),
  getSummary: () => logger.getDebugSummary(),
  getPageLoadTime: () => logger.getPageLoadTime(),
};

// Extend Window interface for debug utilities
declare global {
  interface Window {
    mixingMasteringDebug?: typeof debugUtils;
  }
}

// Make debug utils available globally in development
if (process.env.NODE_ENV === "development") {
  window.mixingMasteringDebug = debugUtils;
}
