import { z } from "zod";

// ================================
// ERROR VALIDATION SCHEMAS
// ================================

/**
 * Error severity levels
 */
export const ErrorSeverity = z.enum(["low", "medium", "high", "critical"]);

/**
 * Error categories for BroLab Entertainment
 */
export const ErrorCategory = z.enum([
  "authentication",
  "authorization",
  "validation",
  "payment",
  "audio_processing",
  "file_upload",
  "database",
  "external_api",
  "rate_limiting",
  "system",
  "user_input",
  "business_logic",
  "network",
  "security",
]);

/**
 * Error types for specific business contexts
 */
export const ErrorType = z.enum([
  // Authentication errors
  "invalid_credentials",
  "account_locked",
  "session_expired",
  "two_factor_required",

  // Authorization errors
  "insufficient_permissions",
  "resource_forbidden",
  "subscription_required",
  "quota_exceeded",

  // Validation errors
  "invalid_input",
  "missing_required_field",
  "format_error",
  "constraint_violation",

  // Payment errors
  "payment_failed",
  "insufficient_funds",
  "card_declined",
  "payment_method_invalid",
  "subscription_expired",

  // Audio processing errors
  "audio_format_unsupported",
  "audio_file_corrupted",
  "processing_timeout",
  "waveform_generation_failed",

  // File upload errors
  "file_too_large",
  "file_type_not_allowed",
  "virus_detected",
  "upload_failed",
  "file_validation_failed",
  "security_threat_detected",
  "security_check_failed",
  "upload_rate_limit",
  "upload_size_limit",

  // Database errors
  "connection_failed",
  "query_timeout",
  "constraint_violation_db",
  "data_not_found",

  // External API errors
  "api_unavailable",
  "api_rate_limited",
  "api_authentication_failed",
  "api_response_invalid",

  // System errors
  "internal_server_error",
  "service_unavailable",
  "timeout",
  "configuration_error",

  // Business logic errors
  "beat_not_available",
  "license_conflict",
  "reservation_conflict",
  "order_processing_failed",
]);

/**
 * Error context information
 */
export const ErrorContextSchema = z.object({
  // Request information
  requestId: z.string().optional(),
  userId: z.string().optional(),
  userAgent: z.string().optional(),
  ipAddress: z.string().ip().optional(),

  // API information
  endpoint: z.string().optional(),
  method: z.enum(["GET", "POST", "PUT", "PATCH", "DELETE"]).optional(),
  statusCode: z.number().min(100).max(599).optional(),

  // Business context
  beatId: z.number().optional(),
  orderId: z.string().optional(),
  reservationId: z.string().optional(),

  // Technical context
  stackTrace: z.string().optional(),
  errorCode: z.string().optional(),

  // Additional metadata
  metadata: z.record(z.unknown()).optional(),
});

/**
 * Error resolution information
 */
export const ErrorResolutionSchema = z.object({
  // User-facing information
  userMessage: z.string().min(1, "User message is required").max(500),
  userAction: z.string().max(200).optional(),

  // Support information
  supportCode: z.string().max(50).optional(),
  documentationUrl: z.string().url().optional(),

  // Recovery suggestions
  retryable: z.boolean().default(false),
  retryAfter: z.number().positive().optional(), // seconds

  // Escalation
  requiresSupport: z.boolean().default(false),
  escalationLevel: z.enum(["none", "tier1", "tier2", "engineering"]).default("none"),
});

/**
 * Complete error validation schema
 */
export const ErrorSchema = z.object({
  id: z.string().optional(),

  // Error classification
  type: ErrorType,
  category: ErrorCategory,
  severity: ErrorSeverity,

  // Error details
  message: z.string().min(1, "Error message is required").max(1000),
  code: z.string().max(50).optional(),

  // Context information
  context: ErrorContextSchema.optional(),

  // Resolution information
  resolution: ErrorResolutionSchema,

  // Timestamps
  occurredAt: z.string().datetime(),
  resolvedAt: z.string().datetime().optional(),

  // Tracking
  count: z.number().positive().default(1),
  firstOccurrence: z.string().datetime().optional(),
  lastOccurrence: z.string().datetime().optional(),
});

/**
 * API error response validation
 */
export const ApiErrorResponseSchema = z.object({
  error: z.object({
    type: ErrorType,
    message: z.string().min(1).max(500),
    code: z.string().max(50).optional(),
    details: z.record(z.unknown()).optional(),

    // User guidance
    userMessage: z.string().max(500).optional(),
    userAction: z.string().max(200).optional(),

    // Support information
    supportCode: z.string().max(50).optional(),
    documentationUrl: z.string().url().optional(),

    // Request tracking
    requestId: z.string().optional(),
    timestamp: z.string().datetime(),
  }),

  // Additional context for debugging (dev/staging only)
  debug: z
    .object({
      stackTrace: z.string().optional(),
      context: z.record(z.unknown()).optional(),
    })
    .optional(),
});

/**
 * Validation error details
 */
export const ValidationErrorSchema = z.object({
  field: z.string().min(1, "Field name is required"),
  value: z.unknown(),
  message: z.string().min(1, "Validation message is required"),
  code: z.string().optional(),

  // Nested validation errors (simplified to avoid circular reference)
  nested: z
    .array(
      z.object({
        field: z.string(),
        value: z.unknown(),
        message: z.string(),
        code: z.string().optional(),
      })
    )
    .optional(),
});

/**
 * Validation error response
 */
export const ValidationErrorResponseSchema = z.object({
  error: z.object({
    type: z.literal("validation_error"),
    message: z.string().default("Validation failed"),
    errors: z.array(ValidationErrorSchema).min(1, "At least one validation error required"),

    // Summary
    errorCount: z.number().positive(),

    // Request tracking
    requestId: z.string().optional(),
    timestamp: z.string().datetime(),
  }),
});

/**
 * Rate limiting error
 */
export const RateLimitErrorSchema = z.object({
  error: z.object({
    type: z.literal("rate_limit_exceeded"),
    message: z.string().default("Rate limit exceeded"),

    // Rate limit details
    limit: z.number().positive(),
    remaining: z.number().nonnegative(),
    resetTime: z.string().datetime(),
    retryAfter: z.number().positive(), // seconds

    // Request tracking
    requestId: z.string().optional(),
    timestamp: z.string().datetime(),
  }),
});

/**
 * Business logic error for BroLab-specific scenarios
 */
export const BusinessLogicErrorSchema = z.object({
  error: z.object({
    type: ErrorType,
    message: z.string().min(1).max(500),

    // Business context
    businessRule: z.string().max(100).optional(),
    resourceId: z.string().optional(),
    resourceType: z.enum(["beat", "order", "reservation", "user", "subscription"]).optional(),

    // Resolution guidance
    userMessage: z.string().max(500),
    suggestedAction: z.string().max(200).optional(),

    // Request tracking
    requestId: z.string().optional(),
    timestamp: z.string().datetime(),
  }),
});

// ================================
// ERROR CREATION UTILITIES
// ================================

/**
 * Create standardized API error response
 */
export const createApiError = (
  type: z.infer<typeof ErrorType>,
  message: string,
  options: {
    code?: string;
    userMessage?: string;
    userAction?: string;
    supportCode?: string;
    statusCode?: number;
    context?: Record<string, unknown>;
    requestId?: string;
  } = {}
): z.infer<typeof ApiErrorResponseSchema> => {
  return {
    error: {
      type,
      message,
      code: options.code,
      userMessage: options.userMessage || message,
      userAction: options.userAction,
      supportCode: options.supportCode,
      requestId: options.requestId,
      timestamp: new Date().toISOString(),
    },
  };
};

/**
 * Create validation error response
 */
export const createValidationError = (
  errors: Array<{
    field: string;
    value: unknown;
    message: string;
    code?: string;
  }>,
  requestId?: string
): z.infer<typeof ValidationErrorResponseSchema> => {
  return {
    error: {
      type: "validation_error",
      message: "Validation failed",
      errors: errors.map(err => ({
        field: err.field,
        value: err.value,
        message: err.message,
        code: err.code,
      })),
      errorCount: errors.length,
      requestId,
      timestamp: new Date().toISOString(),
    },
  };
};

/**
 * Create business logic error
 */
export const createBusinessLogicError = (
  type: z.infer<typeof ErrorType>,
  message: string,
  userMessage: string,
  options: {
    businessRule?: string;
    resourceId?: string;
    resourceType?: "beat" | "order" | "reservation" | "user" | "subscription";
    suggestedAction?: string;
    requestId?: string;
  } = {}
): z.infer<typeof BusinessLogicErrorSchema> => {
  return {
    error: {
      type,
      message,
      businessRule: options.businessRule,
      resourceId: options.resourceId,
      resourceType: options.resourceType,
      userMessage,
      suggestedAction: options.suggestedAction,
      requestId: options.requestId,
      timestamp: new Date().toISOString(),
    },
  };
};

// ================================
// ERROR MAPPING UTILITIES
// ================================

/**
 * Map error type to HTTP status code
 */
export const getHttpStatusForErrorType = (errorType: z.infer<typeof ErrorType>): number => {
  const statusMap: Record<string, number> = {
    // 400 Bad Request
    invalid_input: 400,
    missing_required_field: 400,
    format_error: 400,
    constraint_violation: 400,
    file_too_large: 400,
    file_type_not_allowed: 400,
    audio_format_unsupported: 400,

    // 401 Unauthorized
    invalid_credentials: 401,
    session_expired: 401,
    two_factor_required: 401,

    // 403 Forbidden
    insufficient_permissions: 403,
    resource_forbidden: 403,
    account_locked: 403,

    // 404 Not Found
    data_not_found: 404,
    beat_not_available: 404,

    // 409 Conflict
    license_conflict: 409,
    reservation_conflict: 409,

    // 402 Payment Required
    subscription_required: 402,
    subscription_expired: 402,

    // 422 Unprocessable Entity
    payment_failed: 422,
    insufficient_funds: 422,
    card_declined: 422,
    payment_method_invalid: 422,

    // 429 Too Many Requests
    quota_exceeded: 429,

    // 500 Internal Server Error
    internal_server_error: 500,
    audio_file_corrupted: 500,
    processing_timeout: 500,
    waveform_generation_failed: 500,
    connection_failed: 500,
    query_timeout: 500,

    // 502 Bad Gateway
    api_unavailable: 502,
    api_response_invalid: 502,

    // 503 Service Unavailable
    service_unavailable: 503,
    upload_failed: 503,

    // 504 Gateway Timeout
    timeout: 504,
    api_rate_limited: 504,
  };

  return statusMap[errorType] || 500;
};

/**
 * Get user-friendly message for error type
 */
export const getUserMessageForErrorType = (errorType: z.infer<typeof ErrorType>): string => {
  const messageMap: Record<string, string> = {
    invalid_credentials: "Invalid email or password. Please try again.",
    account_locked: "Your account has been temporarily locked. Please contact support.",
    session_expired: "Your session has expired. Please log in again.",
    insufficient_permissions: "You don't have permission to perform this action.",
    subscription_required: "This feature requires an active subscription.",
    quota_exceeded: "You've reached your download limit. Upgrade your plan to continue.",
    payment_failed: "Payment could not be processed. Please check your payment method.",
    beat_not_available: "This beat is no longer available for purchase.",
    file_too_large: "File size exceeds the maximum limit of 50MB.",
    audio_format_unsupported: "Audio format not supported. Please use MP3, WAV, or AIFF.",
    virus_detected: "File failed security scan. Please ensure your file is safe.",
    reservation_conflict: "This time slot is no longer available. Please choose another time.",
    internal_server_error: "Something went wrong on our end. Please try again later.",
  };

  return messageMap[errorType] || "An unexpected error occurred. Please try again.";
};

// ================================
// TYPE EXPORTS
// ================================

export type ErrorInfo = z.infer<typeof ErrorSchema>;
export type ApiErrorResponse = z.infer<typeof ApiErrorResponseSchema>;
export type ValidationErrorResponse = z.infer<typeof ValidationErrorResponseSchema>;
export type ValidationError = z.infer<typeof ValidationErrorSchema>;
export type RateLimitError = z.infer<typeof RateLimitErrorSchema>;
export type BusinessLogicError = z.infer<typeof BusinessLogicErrorSchema>;
export type ErrorContext = z.infer<typeof ErrorContextSchema>;
export type ErrorResolution = z.infer<typeof ErrorResolutionSchema>;

export type ErrorSeverityType = z.infer<typeof ErrorSeverity>;
export type ErrorCategoryType = z.infer<typeof ErrorCategory>;
export type ErrorTypeType = z.infer<typeof ErrorType>;
