// Error handling utilities and base classes

import {
  ERROR_HTTP_STATUS,
  ERROR_MESSAGES,
  ErrorCategory,
  ErrorSeverity,
  ErrorType,
  getErrorCategory,
  getErrorMessage,
  getErrorSeverity,
} from "../constants/errors";
import { ErrorContext, ErrorLog, RecoveryOption } from "../types/core";

// ================================
// CUSTOM ERROR CLASSES
// ================================

export class AppError extends Error {
  public readonly type: ErrorType;
  public readonly severity: ErrorSeverity;
  public readonly category: ErrorCategory;
  public readonly httpStatus: number;
  public readonly context?: ErrorContext;
  public readonly isOperational: boolean;
  public readonly timestamp: number;

  constructor(type: ErrorType, message?: string, context?: ErrorContext, isOperational = true) {
    super(message || getErrorMessage(type));

    this.name = "AppError";
    this.type = type;
    this.severity = getErrorSeverity(type);
    this.category = getErrorCategory(type);
    this.httpStatus = ERROR_HTTP_STATUS[type];
    this.context = context;
    this.isOperational = isOperational;
    this.timestamp = Date.now();

    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AppError);
    }
  }

  toJSON() {
    return {
      name: this.name,
      type: this.type,
      message: this.message,
      severity: this.severity,
      category: this.category,
      httpStatus: this.httpStatus,
      context: this.context,
      isOperational: this.isOperational,
      timestamp: this.timestamp,
      stack: this.stack,
    };
  }
}

export class ValidationError extends AppError {
  constructor(message: string, context?: ErrorContext) {
    super(ErrorType.VALIDATION_ERROR, message, context);
    this.name = "ValidationError";
  }
}

export class AuthenticationError extends AppError {
  constructor(message?: string, context?: ErrorContext) {
    super(ErrorType.AUTHENTICATION_ERROR, message, context);
    this.name = "AuthenticationError";
  }
}

export class AuthorizationError extends AppError {
  constructor(message?: string, context?: ErrorContext) {
    super(ErrorType.AUTHORIZATION_ERROR, message, context);
    this.name = "AuthorizationError";
  }
}

export class NetworkError extends AppError {
  constructor(message?: string, context?: ErrorContext) {
    super(ErrorType.NETWORK_ERROR, message, context);
    this.name = "NetworkError";
  }
}

export class RateLimitError extends AppError {
  public readonly retryAfter?: number;

  constructor(message?: string, retryAfter?: number, context?: ErrorContext) {
    super(ErrorType.RATE_LIMIT_ERROR, message, context);
    this.name = "RateLimitError";
    this.retryAfter = retryAfter;
  }
}

// ================================
// ERROR HANDLER CLASS
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
      timestamp: context?.timestamp || Date.now(),
      metadata: context?.metadata || {},
      resolved: false,
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
      });
    }

    if (error instanceof AuthenticationError) {
      options.push({
        id: "login",
        label: "Log in again",
        description: "Refresh your authentication",
        action: async () => {
          // Redirect to login would be implemented by the caller
        },
        isDestructive: false,
      });
    }

    if (error instanceof ValidationError) {
      options.push({
        id: "correct_input",
        label: "Correct input",
        description: "Fix the validation errors and try again",
        action: async () => {
          // Focus on first invalid field would be implemented by the caller
        },
        isDestructive: false,
      });
    }

    // Always provide a generic "dismiss" option
    options.push({
      id: "dismiss",
      label: "Dismiss",
      description: "Close this error message",
      action: async () => {
        // Clear error state would be implemented by the caller
      },
      isDestructive: false,
    });

    return options;
  }

  public markErrorResolved(errorId: string, notes?: string): void {
    const errorLog = this.errorLogs.find(log => log.id === errorId);
    if (errorLog) {
      errorLog.resolved = true;
      errorLog.resolutionNotes = notes;
      errorLog.resolutionTimestamp = Date.now();
    }
  }

  public getErrorHistory(): ErrorLog[] {
    return [...this.errorLogs];
  }

  public clearErrors(): void {
    this.errorLogs = [];
  }

  public getErrorStats(timeRange?: { start: number; end: number }) {
    const logs = timeRange
      ? this.errorLogs.filter(
          log => log.timestamp >= timeRange.start && log.timestamp <= timeRange.end
        )
      : this.errorLogs;

    const totalErrors = logs.length;
    const resolvedErrors = logs.filter(log => log.resolved).length;

    const errorsByType: Record<string, number> = {};
    const errorsByComponent: Record<string, number> = {};

    logs.forEach(log => {
      // Extract error type from message or use level
      const errorType = this.extractErrorType(log);
      errorsByType[errorType] = (errorsByType[errorType] || 0) + 1;
      errorsByComponent[log.component] = (errorsByComponent[log.component] || 0) + 1;
    });

    const resolutionRate = totalErrors > 0 ? resolvedErrors / totalErrors : 0;

    const resolvedLogs = logs.filter(log => log.resolved && log.resolutionTimestamp);
    const averageResolutionTime =
      resolvedLogs.length > 0
        ? resolvedLogs.reduce((sum, log) => {
            return sum + (log.resolutionTimestamp! - log.timestamp) / 1000;
          }, 0) / resolvedLogs.length
        : 0;

    return {
      totalErrors,
      errorsByType,
      errorsByComponent,
      resolutionRate,
      averageResolutionTime,
    };
  }

  private addErrorLog(errorLog: ErrorLog): void {
    this.errorLogs.unshift(errorLog);

    // Keep only the most recent errors
    if (this.errorLogs.length > this.maxLogSize) {
      this.errorLogs = this.errorLogs.slice(0, this.maxLogSize);
    }
  }

  private generateErrorId(): string {
    return `error_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }

  private getLogLevel(error: Error): "error" | "warning" | "info" | "debug" {
    if (error instanceof AppError) {
      switch (error.severity) {
        case ErrorSeverity.CRITICAL:
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

  private extractErrorType(log: ErrorLog): string {
    // Try to extract error type from the error message or stack
    for (const [type, message] of Object.entries(ERROR_MESSAGES)) {
      if (log.message.includes(message) || log.message.includes(type)) {
        return type;
      }
    }
    return "unknown";
  }

  private async reportError(error: Error, context?: ErrorContext): Promise<void> {
    // In a real implementation, this would send the error to a logging service
    // For now, we'll just log to console in development
    if (process.env.NODE_ENV === "development") {
      console.error("Error reported:", {
        error: error.message,
        stack: error.stack,
        context,
        timestamp: new Date().toISOString(),
      });
    }

    // TODO: Implement actual error reporting to external service
    // Examples: Sentry, LogRocket, Bugsnag, etc.
  }
}

// ================================
// UTILITY FUNCTIONS
// ================================

export function createError(type: ErrorType, message?: string, context?: ErrorContext): AppError {
  return new AppError(type, message, context);
}

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

export function isOperationalError(error: unknown): boolean {
  if (isAppError(error)) {
    return error.isOperational;
  }
  return false;
}

export function formatErrorForUser(error: Error, locale = "en"): string {
  if (isAppError(error)) {
    return getErrorMessage(error.type, locale);
  }

  // For non-app errors, provide a generic message
  return getErrorMessage(ErrorType.UNKNOWN_ERROR, locale);
}

export function shouldRetryError(error: Error): boolean {
  if (isAppError(error)) {
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

  // For unknown errors, be conservative and don't retry
  return false;
}

export function getErrorHttpStatus(error: Error): number {
  if (isAppError(error)) {
    return error.httpStatus;
  }
  return 500; // Internal Server Error for unknown errors
}

// ================================
// ERROR BOUNDARY HELPERS
// ================================

export interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorInfo?: {
    componentStack: string;
  };
}

export function createErrorBoundaryState(): ErrorBoundaryState {
  return {
    hasError: false,
  };
}

export function handleErrorBoundaryError(
  error: Error,
  errorInfo: { componentStack: string }
): ErrorBoundaryState {
  const context: ErrorContext = {
    component: "ErrorBoundary",
    action: "render",
    timestamp: Date.now(),
    metadata: {
      componentStack: errorInfo.componentStack,
    },
  };

  ErrorHandler.getInstance().handleError(error, context);

  return {
    hasError: true,
    error,
    errorInfo,
  };
}

// ================================
// EXPORTS
// ================================

export const errorHandler = ErrorHandler.getInstance();
