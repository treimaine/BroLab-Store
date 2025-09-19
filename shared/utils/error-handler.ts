// Base error handling utilities for system optimization

import {
  ErrorCategory,
  ErrorSeverity,
  ErrorType,
  getErrorCategory,
  getErrorMessage,
  getErrorSeverity,
} from "../constants/errors";
import {
  ErrorBoundaryManager,
  ErrorContext,
  ErrorLog,
  ErrorStats,
  ErrorTrend,
  RecoveryOption,
  TimeRange,
} from "../types/system-optimization";

// ================================
// CUSTOM ERROR CLASSES
// ================================

export class SystemError extends Error {
  public readonly type: ErrorType;
  public readonly severity: ErrorSeverity;
  public readonly category: ErrorCategory;
  public readonly context?: ErrorContext;
  public readonly timestamp: number;
  public readonly code?: string;

  constructor(type: ErrorType, message?: string, context?: ErrorContext, code?: string) {
    super(message || getErrorMessage(type));
    this.name = "SystemError";
    this.type = type;
    this.severity = getErrorSeverity(type);
    this.category = getErrorCategory(type);
    this.context = context;
    this.timestamp = Date.now();
    this.code = code;

    // Maintain proper stack trace for V8
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, SystemError);
    }
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      type: this.type,
      severity: this.severity,
      category: this.category,
      context: this.context,
      timestamp: this.timestamp,
      code: this.code,
      stack: this.stack,
    };
  }
}

export class NetworkError extends SystemError {
  constructor(message?: string, context?: ErrorContext) {
    super(ErrorType.NETWORK_ERROR, message, context);
    this.name = "NetworkError";
  }
}

export class ValidationError extends SystemError {
  public readonly field?: string;
  public readonly value?: unknown;

  constructor(message?: string, field?: string, value?: unknown, context?: ErrorContext) {
    super(ErrorType.VALIDATION_ERROR, message, context);
    this.name = "ValidationError";
    this.field = field;
    this.value = value;
  }
}

export class AuthenticationError extends SystemError {
  constructor(message?: string, context?: ErrorContext) {
    super(ErrorType.AUTHENTICATION_ERROR, message, context);
    this.name = "AuthenticationError";
  }
}

export class RateLimitError extends SystemError {
  public readonly retryAfter?: number;

  constructor(message?: string, retryAfter?: number, context?: ErrorContext) {
    super(ErrorType.RATE_LIMIT_ERROR, message, context);
    this.name = "RateLimitError";
    this.retryAfter = retryAfter;
  }
}

// ================================
// ERROR HANDLER UTILITIES
// ================================

export class ErrorHandler {
  private static instance: ErrorHandler;
  private errorLogs: ErrorLog[] = [];
  private maxLogSize = 1000;

  private constructor() {}

  public static getInstance(): ErrorHandler {
    if (!ErrorHandler.instance) {
      ErrorHandler.instance = new ErrorHandler();
    }
    return ErrorHandler.instance;
  }

  public handleError(error: Error, context?: ErrorContext): ErrorLog {
    const errorLog: ErrorLog = {
      id: this.generateErrorId(),
      message: error.message,
      stack: error.stack,
      level: this.getLogLevel(error),
      component: context?.component || "unknown",
      action: context?.action || "unknown",
      userId: context?.userId,
      sessionId: context?.sessionId,
      timestamp: Date.now(),
      metadata: context?.metadata || {},
      resolved: false,
      errorType: this.getErrorType(error),
      severity: this.getErrorSeverity(error),
    };

    this.addErrorLog(errorLog);
    this.reportError(error, context);

    return errorLog;
  }

  public getRecoveryOptions(error: Error): RecoveryOption[] {
    const options: RecoveryOption[] = [];

    if (error instanceof NetworkError) {
      options.push({
        id: "retry",
        label: "Retry",
        description: "Try the operation again",
        action: async () => {
          // Retry logic would be implemented by the caller
        },
        isDestructive: false,
        requiresConfirmation: false,
      });
    }

    if (error instanceof ValidationError) {
      options.push({
        id: "correct_input",
        label: "Correct Input",
        description: "Fix the validation errors and try again",
        action: async () => {
          // Input correction would be handled by the UI
        },
        isDestructive: false,
        requiresConfirmation: false,
      });
    }

    if (error instanceof AuthenticationError) {
      options.push({
        id: "login",
        label: "Login Again",
        description: "Authenticate with your credentials",
        action: async () => {
          // Redirect to login would be handled by the auth system
        },
        isDestructive: false,
        requiresConfirmation: false,
      });
    }

    // Generic recovery options
    options.push({
      id: "refresh",
      label: "Refresh Page",
      description: "Reload the page to reset the application state",
      action: async () => {
        if (typeof window !== "undefined") {
          window.location.reload();
        }
      },
      isDestructive: true,
      requiresConfirmation: true,
    });

    return options;
  }

  public getErrorHistory(limit = 50): ErrorLog[] {
    return this.errorLogs.sort((a, b) => b.timestamp - a.timestamp).slice(0, limit);
  }

  public markErrorResolved(errorId: string, notes?: string): void {
    const errorLog = this.errorLogs.find(log => log.id === errorId);
    if (errorLog) {
      errorLog.resolved = true;
      errorLog.resolutionNotes = notes;
      errorLog.resolutionTimestamp = Date.now();
    }
  }

  public clearErrors(): void {
    this.errorLogs = [];
  }

  private generateErrorId(): string {
    return `error_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }

  private getLogLevel(error: Error): ErrorLog["level"] {
    if (error instanceof SystemError) {
      switch (error.severity) {
        case ErrorSeverity.CRITICAL:
          return "error";
        case ErrorSeverity.HIGH:
          return "error";
        case ErrorSeverity.MEDIUM:
          return "warning";
        case ErrorSeverity.LOW:
          return "info";
        default:
          return "error";
      }
    }
    return "error";
  }

  public getErrorType(error: Error): ErrorType {
    if (error instanceof SystemError) {
      return error.type;
    }

    // Try to infer error type from error message or type
    const message = error.message.toLowerCase();

    if (message.includes("network") || message.includes("fetch")) {
      return ErrorType.NETWORK_ERROR;
    }

    if (message.includes("timeout")) {
      return ErrorType.TIMEOUT_ERROR;
    }

    if (message.includes("validation") || message.includes("invalid")) {
      return ErrorType.VALIDATION_ERROR;
    }

    if (message.includes("auth") || message.includes("unauthorized")) {
      return ErrorType.AUTHENTICATION_ERROR;
    }

    if (message.includes("rate limit") || message.includes("too many")) {
      return ErrorType.RATE_LIMIT_ERROR;
    }

    return ErrorType.UNKNOWN_ERROR;
  }

  private getErrorSeverity(error: Error): ErrorLog["severity"] {
    if (error instanceof SystemError) {
      return error.severity;
    }
    return getErrorSeverity(this.getErrorType(error));
  }

  private addErrorLog(errorLog: ErrorLog): void {
    this.errorLogs.push(errorLog);

    // Keep only the most recent errors
    if (this.errorLogs.length > this.maxLogSize) {
      this.errorLogs = this.errorLogs.slice(-this.maxLogSize);
    }
  }

  private async reportError(error: Error, context?: ErrorContext): Promise<void> {
    try {
      // In a real implementation, this would send errors to a logging service
      console.error("Error reported:", {
        error: error.message,
        stack: error.stack,
        context,
        timestamp: new Date().toISOString(),
      });

      // Could integrate with services like Sentry, LogRocket, etc.
      // await this.sendToLoggingService(error, context);
    } catch (reportingError) {
      console.error("Failed to report error:", reportingError);
    }
  }
}

// ================================
// ERROR BOUNDARY MANAGER
// ================================

export class ErrorBoundaryManagerImpl implements ErrorBoundaryManager {
  private errorHandler: ErrorHandler;
  private errorPatterns: Map<string, ErrorPattern> = new Map();
  private errorNotificationCallbacks: Array<(error: ErrorLog, trend: ErrorTrend) => void> = [];
  private performanceMonitor?: any; // Will be injected to avoid circular dependency

  constructor() {
    this.errorHandler = ErrorHandler.getInstance();
    this.initializeErrorPatterns();
  }

  // Inject performance monitor to avoid circular dependency
  setPerformanceMonitor(monitor: any): void {
    this.performanceMonitor = monitor;
  }

  captureError(error: Error, context: ErrorContext): void {
    const errorLog = this.errorHandler.handleError(error, context);

    // Enhanced error tracking with analytics
    this.analyzeErrorPattern(errorLog);
    this.trackErrorMetrics(errorLog);
    this.checkErrorTrends(errorLog);
  }

  getErrorRecoveryOptions(error: Error): RecoveryOption[] {
    const baseOptions = this.errorHandler.getRecoveryOptions(error);

    // Add enhanced recovery options based on error patterns
    const enhancedOptions = this.getEnhancedRecoveryOptions(error);

    return [...baseOptions, ...enhancedOptions];
  }

  async reportError(error: Error, context: ErrorContext): Promise<void> {
    const errorLog = this.errorHandler.handleError(error, context);

    // Enhanced reporting with trend analysis
    await this.reportErrorWithAnalytics(errorLog);
  }

  clearErrors(): void {
    this.errorHandler.clearErrors();
    this.errorPatterns.clear();
  }

  getErrorHistory(limit?: number): Promise<ErrorLog[]> {
    return Promise.resolve(this.errorHandler.getErrorHistory(limit));
  }

  async markErrorResolved(errorId: string, notes?: string): Promise<void> {
    this.errorHandler.markErrorResolved(errorId, notes);

    // Track resolution metrics
    this.trackResolutionMetrics(errorId, notes);
  }

  // ================================
  // ERROR TREND ANALYSIS
  // ================================

  async getErrorStats(timeRange: TimeRange): Promise<ErrorStats> {
    const errors = await this.getErrorHistory();
    const filteredErrors = errors.filter(
      error => error.timestamp >= timeRange.start && error.timestamp <= timeRange.end
    );

    const totalErrors = filteredErrors.length;
    const resolvedErrors = filteredErrors.filter(error => error.resolved).length;
    const criticalErrors = filteredErrors.filter(error => error.severity === "critical").length;

    // Calculate resolution times
    const resolutionTimes = filteredErrors
      .filter(error => error.resolved && error.resolutionTimestamp)
      .map(error => (error.resolutionTimestamp! - error.timestamp) / 1000); // Convert to seconds

    const averageResolutionTime =
      resolutionTimes.length > 0
        ? resolutionTimes.reduce((sum, time) => sum + time, 0) / resolutionTimes.length
        : 0;

    // Group errors by type and component
    const errorsByType: Record<string, number> = {};
    const errorsByComponent: Record<string, number> = {};

    filteredErrors.forEach(error => {
      errorsByType[error.errorType] = (errorsByType[error.errorType] || 0) + 1;
      errorsByComponent[error.component] = (errorsByComponent[error.component] || 0) + 1;
    });

    // Recent errors (last hour)
    const oneHourAgo = Date.now() - 60 * 60 * 1000;
    const recentErrors = filteredErrors.filter(error => error.timestamp >= oneHourAgo).length;

    return {
      totalErrors,
      errorsByType,
      errorsByComponent,
      resolutionRate: totalErrors > 0 ? (resolvedErrors / totalErrors) * 100 : 0,
      averageResolutionTime,
      criticalErrors,
      recentErrors,
    };
  }

  async getErrorTrends(timeRange: TimeRange): Promise<ErrorTrend[]> {
    const errors = await this.getErrorHistory();
    const filteredErrors = errors.filter(
      error => error.timestamp >= timeRange.start && error.timestamp <= timeRange.end
    );

    // Group errors by hour for trend analysis
    const hourlyTrends = new Map<number, Map<string, ErrorTrend>>();

    filteredErrors.forEach(error => {
      const hourTimestamp = Math.floor(error.timestamp / (60 * 60 * 1000)) * (60 * 60 * 1000);

      if (!hourlyTrends.has(hourTimestamp)) {
        hourlyTrends.set(hourTimestamp, new Map());
      }

      const hourTrends = hourlyTrends.get(hourTimestamp)!;
      const trendKey = `${error.errorType}_${error.component}_${error.severity}`;

      if (!hourTrends.has(trendKey)) {
        hourTrends.set(trendKey, {
          timestamp: hourTimestamp,
          errorCount: 0,
          errorType: error.errorType,
          component: error.component,
          severity: error.severity,
        });
      }

      hourTrends.get(trendKey)!.errorCount++;
    });

    // Flatten trends
    const trends: ErrorTrend[] = [];
    hourlyTrends.forEach(hourTrends => {
      hourTrends.forEach(trend => trends.push(trend));
    });

    return trends.sort((a, b) => a.timestamp - b.timestamp);
  }

  async getTopErrors(
    limit = 10
  ): Promise<Array<{ error: string; count: number; pattern?: ErrorPattern }>> {
    const errors = await this.getErrorHistory();
    const errorCounts = new Map<string, number>();

    errors.forEach(error => {
      const key = `${error.errorType}: ${error.message}`;
      errorCounts.set(key, (errorCounts.get(key) || 0) + 1);
    });

    return Array.from(errorCounts.entries())
      .map(([error, count]) => ({
        error,
        count,
        pattern: this.findErrorPattern(error),
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  }

  async getErrorsByComponent(component: string): Promise<ErrorLog[]> {
    const errors = await this.getErrorHistory();
    return errors.filter(error => error.component === component);
  }

  // ================================
  // ERROR PATTERN DETECTION
  // ================================

  private analyzeErrorPattern(errorLog: ErrorLog): void {
    const patternKey = this.generatePatternKey(errorLog);

    if (!this.errorPatterns.has(patternKey)) {
      this.errorPatterns.set(patternKey, {
        id: patternKey,
        errorType: errorLog.errorType,
        component: errorLog.component,
        message: errorLog.message,
        occurrences: 0,
        firstSeen: errorLog.timestamp,
        lastSeen: errorLog.timestamp,
        frequency: 0,
        severity: errorLog.severity,
        isRecurring: false,
        suggestedFix: this.getSuggestedFix(errorLog),
      });
    }

    const pattern = this.errorPatterns.get(patternKey)!;
    pattern.occurrences++;
    pattern.lastSeen = errorLog.timestamp;
    pattern.frequency = this.calculateFrequency(pattern);
    pattern.isRecurring = pattern.occurrences >= 3;

    // Update suggested fix based on pattern analysis
    if (pattern.isRecurring) {
      pattern.suggestedFix = this.getRecurringErrorFix(pattern);
    }
  }

  private generatePatternKey(errorLog: ErrorLog): string {
    // Create a pattern key based on error type, component, and normalized message
    const normalizedMessage = this.normalizeErrorMessage(errorLog.message);
    return `${errorLog.errorType}_${errorLog.component}_${normalizedMessage}`;
  }

  private normalizeErrorMessage(message: string): string {
    // Remove dynamic parts like IDs, timestamps, etc. to identify patterns
    return message
      .replace(/\d+/g, "N") // Replace numbers with N
      .replace(/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/gi, "UUID") // Replace UUIDs
      .replace(/https?:\/\/[^\s]+/g, "URL") // Replace URLs
      .toLowerCase()
      .trim();
  }

  private calculateFrequency(pattern: ErrorPattern): number {
    const timeSpan = pattern.lastSeen - pattern.firstSeen;
    if (timeSpan === 0) return 0;

    // Frequency per hour
    return pattern.occurrences / (timeSpan / (60 * 60 * 1000));
  }

  private findErrorPattern(errorKey: string): ErrorPattern | undefined {
    const patterns = Array.from(this.errorPatterns.values());
    for (const pattern of patterns) {
      if (
        errorKey.includes(pattern.errorType) &&
        errorKey.includes(pattern.message.substring(0, 20))
      ) {
        return pattern;
      }
    }
    return undefined;
  }

  // ================================
  // ERROR RESOLUTION WORKFLOW
  // ================================

  private getEnhancedRecoveryOptions(error: Error): RecoveryOption[] {
    const options: RecoveryOption[] = [];
    const pattern = this.findErrorPatternByError(error);

    // Add pattern-based recovery options
    if (pattern?.isRecurring) {
      options.push({
        id: "pattern_fix",
        label: "Apply Pattern Fix",
        description: pattern.suggestedFix || "Apply the recommended fix for this recurring error",
        action: async () => {
          await this.applyPatternFix(pattern);
        },
        isDestructive: false,
        requiresConfirmation: true,
      });
    }

    // Add component-specific recovery options
    if (error.message.includes("network") || error.message.includes("fetch")) {
      options.push({
        id: "check_connection",
        label: "Check Connection",
        description: "Verify network connectivity and retry",
        action: async () => {
          await this.checkNetworkAndRetry();
        },
        isDestructive: false,
        requiresConfirmation: false,
      });
    }

    return options;
  }

  private getSuggestedFix(errorLog: ErrorLog): string {
    const fixes: Record<string, string> = {
      [ErrorType.NETWORK_ERROR]: "Check network connectivity and retry the operation",
      [ErrorType.VALIDATION_ERROR]: "Validate input data and correct any formatting issues",
      [ErrorType.AUTHENTICATION_ERROR]: "Re-authenticate or refresh authentication tokens",
      [ErrorType.RATE_LIMIT_ERROR]: "Implement exponential backoff or reduce request frequency",
      [ErrorType.TIMEOUT_ERROR]: "Increase timeout values or optimize the operation",
      [ErrorType.SERVER_ERROR]: "Check server logs and ensure service availability",
    };

    return fixes[errorLog.errorType] || "Review error details and contact support if needed";
  }

  private getRecurringErrorFix(pattern: ErrorPattern): string {
    if (pattern.frequency > 10) {
      // More than 10 per hour
      return `High frequency error detected. Consider implementing circuit breaker pattern or caching for ${pattern.component}`;
    }

    if (pattern.occurrences > 50) {
      return `Persistent error pattern. Review ${pattern.component} implementation and add proper error handling`;
    }

    return pattern.suggestedFix || "Monitor pattern and implement targeted fix";
  }

  private findErrorPatternByError(error: Error): ErrorPattern | undefined {
    const errorType = this.errorHandler.getErrorType(error);
    const normalizedMessage = this.normalizeErrorMessage(error.message);

    const patterns = Array.from(this.errorPatterns.values());
    for (const pattern of patterns) {
      if (
        pattern.errorType === errorType &&
        this.normalizeErrorMessage(pattern.message) === normalizedMessage
      ) {
        return pattern;
      }
    }
    return undefined;
  }

  private async applyPatternFix(pattern: ErrorPattern): Promise<void> {
    // Implementation would depend on the specific pattern
    console.log(`Applying fix for pattern: ${pattern.id}`);

    // Track the fix attempt
    if (this.performanceMonitor) {
      this.performanceMonitor.trackMetric("error_pattern_fix_applied", 1, {
        pattern_id: pattern.id,
        error_type: pattern.errorType,
        component: pattern.component,
      });
    }
  }

  private async checkNetworkAndRetry(): Promise<void> {
    // Simple network check
    try {
      await fetch("/api/health", { method: "HEAD" });
      console.log("Network connectivity verified");
    } catch (error) {
      console.error("Network connectivity issue detected:", error);
      throw new NetworkError("Network connectivity issue detected");
    }
  }

  // ================================
  // PERFORMANCE INTEGRATION
  // ================================

  private trackErrorMetrics(errorLog: ErrorLog): void {
    if (!this.performanceMonitor) return;

    // Track error occurrence
    this.performanceMonitor.trackMetric("error_occurred", 1, {
      error_type: errorLog.errorType,
      component: errorLog.component,
      severity: errorLog.severity,
      level: errorLog.level,
    });

    // Track error by component
    this.performanceMonitor.trackMetric("component_error_rate", 1, {
      component: errorLog.component,
    });

    // Track critical errors separately - check both severity levels
    if (errorLog.severity === "critical" || errorLog.level === "error") {
      this.performanceMonitor.trackMetric("critical_error_occurred", 1, {
        component: errorLog.component,
        error_type: errorLog.errorType,
      });
    }
  }

  private trackResolutionMetrics(errorId: string, notes?: string): void {
    if (!this.performanceMonitor) return;

    const errorLog = this.errorHandler.getErrorHistory().find(log => log.id === errorId);
    if (!errorLog) return;

    const resolutionTime = Date.now() - errorLog.timestamp;

    this.performanceMonitor.trackMetric("error_resolution_time", resolutionTime, {
      error_type: errorLog.errorType,
      component: errorLog.component,
      severity: errorLog.severity,
      has_notes: notes ? "true" : "false",
    });

    this.performanceMonitor.trackMetric("error_resolved", 1, {
      error_type: errorLog.errorType,
      component: errorLog.component,
    });
  }

  private checkErrorTrends(errorLog: ErrorLog): void {
    const pattern = this.errorPatterns.get(this.generatePatternKey(errorLog));
    if (!pattern) return;

    // Check for concerning trends - lower threshold for testing
    if (pattern.occurrences >= 10) {
      this.notifyErrorTrend({
        timestamp: Date.now(),
        errorCount: pattern.occurrences,
        errorType: pattern.errorType,
        component: pattern.component,
        severity: pattern.severity,
      });
    }
  }

  private async reportErrorWithAnalytics(errorLog: ErrorLog): Promise<void> {
    // Enhanced reporting with context and trends
    const pattern = this.errorPatterns.get(this.generatePatternKey(errorLog));
    const recentSimilarErrors = await this.getRecentSimilarErrors(errorLog);

    const enhancedReport = {
      ...errorLog,
      pattern: pattern
        ? {
            id: pattern.id,
            occurrences: pattern.occurrences,
            frequency: pattern.frequency,
            isRecurring: pattern.isRecurring,
            suggestedFix: pattern.suggestedFix,
          }
        : null,
      recentSimilarCount: recentSimilarErrors.length,
      trendAnalysis: await this.analyzeTrendForError(errorLog),
    };

    console.log("Enhanced error report:", enhancedReport);
  }

  private async getRecentSimilarErrors(errorLog: ErrorLog): Promise<ErrorLog[]> {
    const errors = await this.getErrorHistory();
    const oneHourAgo = Date.now() - 60 * 60 * 1000;

    return errors.filter(
      error =>
        error.timestamp >= oneHourAgo &&
        error.errorType === errorLog.errorType &&
        error.component === errorLog.component &&
        error.id !== errorLog.id
    );
  }

  private async analyzeTrendForError(errorLog: ErrorLog): Promise<string> {
    const recentErrors = await this.getRecentSimilarErrors(errorLog);

    if (recentErrors.length === 0) {
      return "isolated";
    } else if (recentErrors.length < 3) {
      return "occasional";
    } else if (recentErrors.length < 10) {
      return "frequent";
    } else {
      return "critical_pattern";
    }
  }

  // ================================
  // NOTIFICATION SYSTEM
  // ================================

  onErrorTrend(callback: (error: ErrorLog, trend: ErrorTrend) => void): void {
    this.errorNotificationCallbacks.push(callback);
  }

  private notifyErrorTrend(trend: ErrorTrend): void {
    // Find the most recent error for this trend
    const errors = this.errorHandler.getErrorHistory();
    const recentError = errors
      .filter(error => error.errorType === trend.errorType && error.component === trend.component)
      .sort((a, b) => b.timestamp - a.timestamp)[0];

    if (recentError) {
      this.errorNotificationCallbacks.forEach(callback => {
        try {
          callback(recentError, trend);
        } catch (error) {
          console.error("Error in notification callback:", error);
        }
      });
    }
  }

  // ================================
  // INITIALIZATION
  // ================================

  private initializeErrorPatterns(): void {
    // Initialize with common error patterns
    // This could be loaded from configuration or learned over time
  }
}

// ================================
// ERROR PATTERN INTERFACE
// ================================

interface ErrorPattern {
  id: string;
  errorType: ErrorType;
  component: string;
  message: string;
  occurrences: number;
  firstSeen: number;
  lastSeen: number;
  frequency: number; // per hour
  severity: string;
  isRecurring: boolean;
  suggestedFix?: string;
}

// ================================
// UTILITY FUNCTIONS
// ================================

export function createErrorContext(
  component: string,
  action: string,
  metadata: Record<string, unknown> = {},
  request?: {
    userId?: string;
    sessionId?: string;
    requestId?: string;
    userAgent?: string;
    ipAddress?: string;
    url?: string;
    method?: string;
  }
): ErrorContext {
  return {
    component,
    action,
    timestamp: Date.now(),
    metadata,
    ...request,
  };
}

export function isRetryableError(error: Error): boolean {
  if (error instanceof SystemError) {
    const retryableTypes = [
      ErrorType.NETWORK_ERROR,
      ErrorType.TIMEOUT_ERROR,
      ErrorType.CONNECTION_ERROR,
      ErrorType.SERVER_ERROR,
      ErrorType.DATABASE_ERROR,
      ErrorType.EXTERNAL_SERVICE_ERROR,
    ];
    return retryableTypes.includes(error.type);
  }

  // Check error message for retryable patterns
  const message = error.message.toLowerCase();
  return (
    message.includes("network") ||
    message.includes("timeout") ||
    message.includes("connection") ||
    message.includes("server error") ||
    message.includes("503") ||
    message.includes("502") ||
    message.includes("500")
  );
}

export function sanitizeErrorForClient(error: Error): {
  message: string;
  type: string;
  code?: string;
  timestamp: number;
} {
  // Don't expose sensitive information in client-facing errors
  if (error instanceof SystemError) {
    return {
      message: getErrorMessage(error.type),
      type: error.type,
      code: error.code,
      timestamp: error.timestamp,
    };
  }

  return {
    message: "An unexpected error occurred. Please try again.",
    type: ErrorType.UNKNOWN_ERROR,
    timestamp: Date.now(),
  };
}

// ================================
// GLOBAL ERROR HANDLER SETUP
// ================================

export function setupGlobalErrorHandlers(): void {
  if (typeof window !== "undefined") {
    // Handle unhandled promise rejections
    window.addEventListener("unhandledrejection", event => {
      const error = event.reason instanceof Error ? event.reason : new Error(String(event.reason));
      const context = createErrorContext("global", "unhandled_promise_rejection", {
        url: window.location.href,
      });

      ErrorHandler.getInstance().handleError(error, context);

      // Prevent the default browser behavior
      event.preventDefault();
    });

    // Handle uncaught errors
    window.addEventListener("error", event => {
      const error = event.error || new Error(event.message);
      const context = createErrorContext("global", "uncaught_error", {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        url: window.location.href,
      });

      ErrorHandler.getInstance().handleError(error, context);
    });
  }

  // Node.js error handlers
  if (typeof process !== "undefined") {
    process.on("uncaughtException", error => {
      const context = createErrorContext("global", "uncaught_exception");
      ErrorHandler.getInstance().handleError(error, context);
    });

    process.on("unhandledRejection", reason => {
      const error = reason instanceof Error ? reason : new Error(String(reason));
      const context = createErrorContext("global", "unhandled_rejection");
      ErrorHandler.getInstance().handleError(error, context);
    });
  }
}

// Export singleton instance
export const errorHandler = ErrorHandler.getInstance();
export const errorBoundaryManager = new ErrorBoundaryManagerImpl();
