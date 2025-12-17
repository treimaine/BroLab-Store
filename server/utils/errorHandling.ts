/**
 * Error Handling Utilities for Payment System
 *
 * Provides standardized error response formats, error codes,
 * and error classification for consistent error handling across
 * all payment routes and services.
 *
 * Requirements: 8.1, 8.2, 8.3, 8.4, 8.5
 */

/**
 * Standardized error response format
 */
export interface ErrorResponse {
  error: string;
  code: string;
  message: string;
  details?: Record<string, unknown>;
  timestamp: string;
  requestId?: string;
}

/**
 * Error severity levels for logging and alerting
 */
export enum ErrorSeverity {
  LOW = "low",
  MEDIUM = "medium",
  HIGH = "high",
  CRITICAL = "critical",
}

/**
 * Payment error codes
 */
export enum PaymentErrorCode {
  // Signature verification errors
  STRIPE_MISSING_SIGNATURE = "STRIPE_MISSING_SIGNATURE",
  STRIPE_INVALID_SIGNATURE = "STRIPE_INVALID_SIGNATURE",
  PAYPAL_MISSING_HEADERS = "PAYPAL_MISSING_HEADERS",
  PAYPAL_INVALID_SIGNATURE = "PAYPAL_INVALID_SIGNATURE",

  // Webhook processing errors
  WEBHOOK_PROCESSING_ERROR = "WEBHOOK_PROCESSING_ERROR",
  WEBHOOK_TIMEOUT = "WEBHOOK_TIMEOUT",
  WEBHOOK_DUPLICATE_EVENT = "WEBHOOK_DUPLICATE_EVENT",
  WEBHOOK_MISSING_HEADERS = "WEBHOOK_MISSING_HEADERS",
  WEBHOOK_REPLAY_DETECTED = "WEBHOOK_REPLAY_DETECTED",
  WEBHOOK_INVALID_TIMESTAMP = "WEBHOOK_INVALID_TIMESTAMP",

  // Payment processing errors
  PAYMENT_INTENT_CREATION_FAILED = "PAYMENT_INTENT_CREATION_FAILED",
  PAYMENT_RECORDING_FAILED = "PAYMENT_RECORDING_FAILED",
  PAYMENT_CONFIRMATION_FAILED = "PAYMENT_CONFIRMATION_FAILED",
  PAYMENT_REFUND_FAILED = "PAYMENT_REFUND_FAILED",

  // Order/Reservation errors
  ORDER_NOT_FOUND = "ORDER_NOT_FOUND",
  RESERVATION_NOT_FOUND = "RESERVATION_NOT_FOUND",
  INVALID_ORDER_METADATA = "INVALID_ORDER_METADATA",

  // Invoice errors
  INVOICE_GENERATION_FAILED = "INVOICE_GENERATION_FAILED",
  INVOICE_EMAIL_FAILED = "INVOICE_EMAIL_FAILED",

  // Configuration errors
  MISSING_CONFIGURATION = "MISSING_CONFIGURATION",
  INVALID_CONFIGURATION = "INVALID_CONFIGURATION",

  // Generic errors
  INTERNAL_SERVER_ERROR = "INTERNAL_SERVER_ERROR",
  UNKNOWN_ERROR = "UNKNOWN_ERROR",
}

/**
 * Create standardized error response
 */
export function createErrorResponse(
  error: string,
  code: PaymentErrorCode | string,
  message: string,
  requestId?: string,
  details?: Record<string, unknown>
): ErrorResponse {
  return {
    error,
    code,
    message,
    details,
    timestamp: new Date().toISOString(),
    requestId,
  };
}

/**
 * Determine error severity based on error code
 */
export function getErrorSeverity(code: PaymentErrorCode | string): ErrorSeverity {
  const criticalErrors = [
    PaymentErrorCode.STRIPE_INVALID_SIGNATURE,
    PaymentErrorCode.PAYPAL_INVALID_SIGNATURE,
    PaymentErrorCode.PAYMENT_CONFIRMATION_FAILED,
    PaymentErrorCode.MISSING_CONFIGURATION,
  ];

  const highErrors = [
    PaymentErrorCode.PAYMENT_INTENT_CREATION_FAILED,
    PaymentErrorCode.PAYMENT_RECORDING_FAILED,
    PaymentErrorCode.PAYMENT_REFUND_FAILED,
    PaymentErrorCode.WEBHOOK_PROCESSING_ERROR,
  ];

  const mediumErrors = [
    PaymentErrorCode.INVOICE_GENERATION_FAILED,
    PaymentErrorCode.INVOICE_EMAIL_FAILED,
    PaymentErrorCode.ORDER_NOT_FOUND,
    PaymentErrorCode.RESERVATION_NOT_FOUND,
  ];

  if (criticalErrors.includes(code as PaymentErrorCode)) {
    return ErrorSeverity.CRITICAL;
  }

  if (highErrors.includes(code as PaymentErrorCode)) {
    return ErrorSeverity.HIGH;
  }

  if (mediumErrors.includes(code as PaymentErrorCode)) {
    return ErrorSeverity.MEDIUM;
  }

  return ErrorSeverity.LOW;
}

/**
 * Check if error requires admin notification
 */
export function requiresAdminNotification(code: PaymentErrorCode | string): boolean {
  const severity = getErrorSeverity(code);
  return severity === ErrorSeverity.CRITICAL || severity === ErrorSeverity.HIGH;
}

/**
 * Format error for logging with full context
 */
export function formatErrorForLogging(
  error: Error,
  context: {
    action: string;
    resource: string;
    requestId?: string;
    userId?: string;
    orderId?: string;
    [key: string]: string | number | boolean | undefined;
  }
): Record<string, unknown> {
  return {
    error: error.message,
    stack: error.stack,
    name: error.name,
    context,
    timestamp: Date.now(),
  };
}

/**
 * Sanitize error message for user display
 * Removes sensitive information and technical details
 */
export function sanitizeErrorMessage(error: Error): string {
  const message = error.message;

  // Remove sensitive patterns using regex replace
  let sanitized = message;
  sanitized = sanitized.replaceAll(/sk_live_[a-zA-Z0-9]+/g, "[REDACTED_KEY]");
  sanitized = sanitized.replaceAll(/sk_test_[a-zA-Z0-9]+/g, "[REDACTED_KEY]");
  sanitized = sanitized.replaceAll(/whsec_[a-zA-Z0-9]+/g, "[REDACTED_SECRET]");
  sanitized = sanitized.replaceAll(/Bearer [a-zA-Z0-9._-]+/g, "Bearer [REDACTED]");
  sanitized = sanitized.replaceAll(
    /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
    "[EMAIL]"
  );

  // Provide user-friendly messages for common errors
  if (sanitized.includes("signature")) {
    return "Payment verification failed. Please contact support if this persists.";
  }

  if (sanitized.includes("timeout") || sanitized.includes("ETIMEDOUT")) {
    return "Payment processing is taking longer than expected. Please check your order status.";
  }

  if (sanitized.includes("network") || sanitized.includes("ECONNREFUSED")) {
    return "Unable to connect to payment service. Please try again later.";
  }

  return sanitized;
}

/**
 * Payment error class with additional context
 */
export class PaymentError extends Error {
  public readonly code: PaymentErrorCode | string;
  public readonly severity: ErrorSeverity;
  public readonly context?: Record<string, unknown>;
  public readonly originalError?: Error;

  constructor(
    message: string,
    code: PaymentErrorCode | string,
    context?: Record<string, unknown>,
    originalError?: Error
  ) {
    super(message);
    this.name = "PaymentError";
    this.code = code;
    this.severity = getErrorSeverity(code);
    this.context = context;
    this.originalError = originalError;

    // Maintain proper stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, PaymentError);
    }
  }

  /**
   * Convert to error response format
   */
  toErrorResponse(requestId?: string): ErrorResponse {
    return createErrorResponse(
      this.message,
      this.code,
      sanitizeErrorMessage(this),
      requestId,
      this.context
    );
  }

  /**
   * Check if this error requires admin notification
   */
  requiresNotification(): boolean {
    return requiresAdminNotification(this.code);
  }
}
