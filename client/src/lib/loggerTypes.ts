/**
 * Shared types for logging system
 * Used by both logger.ts (mixing-mastering) and clientLogger.ts
 *
 * @module loggerTypes
 */

/**
 * Base context for all log entries
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

/**
 * Extended context for error logging
 */
export interface ErrorContext extends LogContext {
  errorType: "authentication" | "api" | "validation" | "file_upload" | "network" | "critical";
  errorCode?: string | number;
  stack?: string;
  recoverable?: boolean;
  retryCount?: number;
  formData?: Record<string, unknown>;
}

/**
 * Performance metrics tracking
 */
export interface PerformanceMetrics {
  pageLoadStart: number;
  pageLoadEnd?: number;
  authLoadTime?: number;
  formValidationTime?: number;
  apiRequestTime?: number;
  fileUploadTime?: number;
  renderTime?: number;
}

/**
 * Error types for categorization
 */
export type ErrorType = ErrorContext["errorType"];

/**
 * Component types for logging context
 */
export type ComponentType =
  | "authentication"
  | "api"
  | "form_validation"
  | "file_upload"
  | "performance"
  | "user_interaction";
