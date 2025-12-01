// Error handling constants and utilities

// ================================
// ERROR TYPES AND CODES
// ================================

export enum ErrorType {
  // Network Errors
  NETWORK_ERROR = "network_error",
  TIMEOUT_ERROR = "timeout_error",
  CONNECTION_ERROR = "connection_error",

  // Authentication & Authorization
  AUTHENTICATION_ERROR = "auth_error",
  AUTHORIZATION_ERROR = "authz_error",
  TOKEN_EXPIRED = "token_expired",
  INVALID_CREDENTIALS = "invalid_credentials",

  // Validation Errors
  VALIDATION_ERROR = "validation_error",
  SCHEMA_ERROR = "schema_error",
  TYPE_ERROR = "type_error",

  // Rate Limiting
  RATE_LIMIT_ERROR = "rate_limit_error",
  QUOTA_EXCEEDED = "quota_exceeded",

  // Server Errors
  SERVER_ERROR = "server_error",
  DATABASE_ERROR = "database_error",
  EXTERNAL_SERVICE_ERROR = "external_service_error",

  // Client Errors
  CLIENT_ERROR = "client_error",
  NOT_FOUND = "not_found",
  CONFLICT = "conflict",

  // System Errors
  MEMORY_ERROR = "memory_error",
  DISK_SPACE_ERROR = "disk_space_error",
  CONFIGURATION_ERROR = "configuration_error",

  // Unknown
  UNKNOWN_ERROR = "unknown_error",
}

export enum ErrorSeverity {
  LOW = "low",
  MEDIUM = "medium",
  HIGH = "high",
  CRITICAL = "critical",
}

export enum ErrorCategory {
  SYSTEM = "system",
  USER = "user",
  EXTERNAL = "external",
  SECURITY = "security",
  PERFORMANCE = "performance",
}

// ================================
// ERROR MESSAGES
// ================================

export const ERROR_MESSAGES = {
  [ErrorType.NETWORK_ERROR]: "Network connection failed. Please check your internet connection.",
  [ErrorType.TIMEOUT_ERROR]: "Request timed out. Please try again.",
  [ErrorType.CONNECTION_ERROR]: "Unable to connect to the server. Please try again later.",

  [ErrorType.AUTHENTICATION_ERROR]: "Authentication failed. Please log in again.",
  [ErrorType.AUTHORIZATION_ERROR]: "You don't have permission to perform this action.",
  [ErrorType.TOKEN_EXPIRED]: "Your session has expired. Please log in again.",
  [ErrorType.INVALID_CREDENTIALS]: "Invalid username or password.",

  [ErrorType.VALIDATION_ERROR]: "The provided data is invalid. Please check your input.",
  [ErrorType.SCHEMA_ERROR]: "Data format is incorrect.",
  [ErrorType.TYPE_ERROR]: "Invalid data type provided.",

  [ErrorType.RATE_LIMIT_ERROR]: "Too many requests. Please wait before trying again.",
  [ErrorType.QUOTA_EXCEEDED]: "Usage quota exceeded. Please upgrade your plan or wait for reset.",

  [ErrorType.SERVER_ERROR]: "An internal server error occurred. Please try again later.",
  [ErrorType.DATABASE_ERROR]: "Database operation failed. Please try again.",
  [ErrorType.EXTERNAL_SERVICE_ERROR]: "External service is temporarily unavailable.",

  [ErrorType.CLIENT_ERROR]: "Invalid request. Please check your input.",
  [ErrorType.NOT_FOUND]: "The requested resource was not found.",
  [ErrorType.CONFLICT]: "The operation conflicts with the current state.",

  [ErrorType.MEMORY_ERROR]: "System is running low on memory.",
  [ErrorType.DISK_SPACE_ERROR]: "Insufficient disk space.",
  [ErrorType.CONFIGURATION_ERROR]: "System configuration error.",

  [ErrorType.UNKNOWN_ERROR]: "An unexpected error occurred. Please try again.",
} as const;

// ================================
// HTTP STATUS CODE MAPPINGS
// ================================

export const ERROR_HTTP_STATUS = {
  [ErrorType.NETWORK_ERROR]: 503,
  [ErrorType.TIMEOUT_ERROR]: 408,
  [ErrorType.CONNECTION_ERROR]: 503,

  [ErrorType.AUTHENTICATION_ERROR]: 401,
  [ErrorType.AUTHORIZATION_ERROR]: 403,
  [ErrorType.TOKEN_EXPIRED]: 401,
  [ErrorType.INVALID_CREDENTIALS]: 401,

  [ErrorType.VALIDATION_ERROR]: 400,
  [ErrorType.SCHEMA_ERROR]: 400,
  [ErrorType.TYPE_ERROR]: 400,

  [ErrorType.RATE_LIMIT_ERROR]: 429,
  [ErrorType.QUOTA_EXCEEDED]: 429,

  [ErrorType.SERVER_ERROR]: 500,
  [ErrorType.DATABASE_ERROR]: 500,
  [ErrorType.EXTERNAL_SERVICE_ERROR]: 502,

  [ErrorType.CLIENT_ERROR]: 400,
  [ErrorType.NOT_FOUND]: 404,
  [ErrorType.CONFLICT]: 409,

  [ErrorType.MEMORY_ERROR]: 500,
  [ErrorType.DISK_SPACE_ERROR]: 500,
  [ErrorType.CONFIGURATION_ERROR]: 500,

  [ErrorType.UNKNOWN_ERROR]: 500,
} as const;

// ================================
// RETRY CONFIGURATIONS
// ================================

export const DEFAULT_RETRY_CONFIG = {
  maxRetries: 3,
  baseDelay: 1000, // 1 second
  maxDelay: 30000, // 30 seconds
  backoffFactor: 2,
  jitter: true,
  retryCondition: (error: Error): boolean => {
    // Retry on network errors, timeouts, and server errors
    const retryableErrors = [
      ErrorType.NETWORK_ERROR,
      ErrorType.TIMEOUT_ERROR,
      ErrorType.CONNECTION_ERROR,
      ErrorType.SERVER_ERROR,
      ErrorType.DATABASE_ERROR,
      ErrorType.EXTERNAL_SERVICE_ERROR,
    ];

    return retryableErrors.some(type => error.message.includes(type));
  },
} as const;

export const RETRY_CONFIGS = {
  network: {
    maxRetries: 5,
    baseDelay: 500,
    maxDelay: 10000,
    backoffFactor: 1.5,
    jitter: true,
  },
  database: {
    maxRetries: 3,
    baseDelay: 1000,
    maxDelay: 5000,
    backoffFactor: 2,
    jitter: false,
  },
  external_api: {
    maxRetries: 4,
    baseDelay: 2000,
    maxDelay: 20000,
    backoffFactor: 2.5,
    jitter: true,
  },
  user_action: {
    maxRetries: 2,
    baseDelay: 500,
    maxDelay: 2000,
    backoffFactor: 2,
    jitter: false,
  },
} as const;

// ================================
// CACHE CONFIGURATIONS
// ================================

export const DEFAULT_CACHE_CONFIG = {
  defaultTTL: 5 * 60 * 1000, // 5 minutes
  maxSize: 100 * 1024 * 1024, // 100MB
  maxEntries: 10000,
  strategy: "LRU" as const,
  enableCompression: true,
  compressionThreshold: 1024, // 1KB
} as const;

export const CACHE_CONFIGS = {
  user_data: {
    defaultTTL: 15 * 60 * 1000, // 15 minutes
    maxSize: 50 * 1024 * 1024, // 50MB
    maxEntries: 5000,
  },
  api_responses: {
    defaultTTL: 2 * 60 * 1000, // 2 minutes
    maxSize: 20 * 1024 * 1024, // 20MB
    maxEntries: 2000,
  },
  static_content: {
    defaultTTL: 60 * 60 * 1000, // 1 hour
    maxSize: 200 * 1024 * 1024, // 200MB
    maxEntries: 1000,
  },
  session_data: {
    defaultTTL: 30 * 60 * 1000, // 30 minutes
    maxSize: 10 * 1024 * 1024, // 10MB
    maxEntries: 1000,
  },
} as const;

// ================================
// RATE LIMIT CONFIGURATIONS
// ================================

export const DEFAULT_RATE_LIMITS = {
  api: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 100,
  },
  auth: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 5,
  },
  upload: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 10,
  },
  download: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 20,
  },
} as const;

// ================================
// MONITORING CONFIGURATIONS
// ================================

export const PERFORMANCE_THRESHOLDS = {
  page_load: 3000, // 3 seconds
  api_response: 1000, // 1 second
  database_query: 500, // 500ms
  cache_operation: 50, // 50ms
  memory_usage: 0.8, // 80%
  cpu_usage: 0.7, // 70%
} as const;

export const WEB_VITALS_THRESHOLDS = {
  FCP: { good: 1800, poor: 3000 }, // First Contentful Paint
  LCP: { good: 2500, poor: 4000 }, // Largest Contentful Paint
  CLS: { good: 0.1, poor: 0.25 }, // Cumulative Layout Shift
  FID: { good: 100, poor: 300 }, // First Input Delay
  TTFB: { good: 800, poor: 1800 }, // Time to First Byte
} as const;

// ================================
// SECURITY CONFIGURATIONS
// ================================

export const SECURITY_CONFIG = {
  webhook: {
    timestampTolerance: 300, // 5 minutes
    requiredHeaders: ["x-signature", "x-timestamp"],
  },
  session: {
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    secure: true,
    httpOnly: true,
    sameSite: "strict" as const,
  },
  cors: {
    maxAge: 86400, // 24 hours
    credentials: true,
  },
} as const;

// ================================
// UTILITY FUNCTIONS
// ================================

export function getErrorMessage(errorType: ErrorType, _locale = "en"): string {
  // For now, return English messages. In the future, this could support i18n
  return ERROR_MESSAGES[errorType] || ERROR_MESSAGES[ErrorType.UNKNOWN_ERROR];
}

export function getErrorSeverity(errorType: ErrorType): ErrorSeverity {
  const criticalErrors = [
    ErrorType.MEMORY_ERROR,
    ErrorType.DISK_SPACE_ERROR,
    ErrorType.DATABASE_ERROR,
  ];

  const highErrors = [
    ErrorType.AUTHENTICATION_ERROR,
    ErrorType.AUTHORIZATION_ERROR,
    ErrorType.SERVER_ERROR,
  ];

  const mediumErrors = [
    ErrorType.NETWORK_ERROR,
    ErrorType.TIMEOUT_ERROR,
    ErrorType.RATE_LIMIT_ERROR,
  ];

  if (criticalErrors.includes(errorType)) return ErrorSeverity.CRITICAL;
  if (highErrors.includes(errorType)) return ErrorSeverity.HIGH;
  if (mediumErrors.includes(errorType)) return ErrorSeverity.MEDIUM;

  return ErrorSeverity.LOW;
}

export function getErrorCategory(errorType: ErrorType): ErrorCategory {
  const systemErrors = [
    ErrorType.MEMORY_ERROR,
    ErrorType.DISK_SPACE_ERROR,
    ErrorType.CONFIGURATION_ERROR,
    ErrorType.SERVER_ERROR,
    ErrorType.DATABASE_ERROR,
  ];

  const securityErrors = [
    ErrorType.AUTHENTICATION_ERROR,
    ErrorType.AUTHORIZATION_ERROR,
    ErrorType.TOKEN_EXPIRED,
    ErrorType.INVALID_CREDENTIALS,
  ];

  const performanceErrors = [
    ErrorType.TIMEOUT_ERROR,
    ErrorType.RATE_LIMIT_ERROR,
    ErrorType.QUOTA_EXCEEDED,
  ];

  const externalErrors = [
    ErrorType.NETWORK_ERROR,
    ErrorType.CONNECTION_ERROR,
    ErrorType.EXTERNAL_SERVICE_ERROR,
  ];

  if (systemErrors.includes(errorType)) return ErrorCategory.SYSTEM;
  if (securityErrors.includes(errorType)) return ErrorCategory.SECURITY;
  if (performanceErrors.includes(errorType)) return ErrorCategory.PERFORMANCE;
  if (externalErrors.includes(errorType)) return ErrorCategory.EXTERNAL;

  return ErrorCategory.USER;
}

export function shouldRetry(error: Error, attemptNumber: number, maxRetries: number): boolean {
  if (attemptNumber >= maxRetries) return false;

  // Don't retry client errors (4xx) or authentication errors
  const nonRetryableErrors = [
    ErrorType.VALIDATION_ERROR,
    ErrorType.AUTHENTICATION_ERROR,
    ErrorType.AUTHORIZATION_ERROR,
    ErrorType.NOT_FOUND,
    ErrorType.CONFLICT,
  ];

  return !nonRetryableErrors.some(type => error.message.includes(type));
}

export function calculateBackoffDelay(
  attemptNumber: number,
  baseDelay: number,
  maxDelay: number,
  backoffFactor: number,
  jitter = true
): number {
  const exponentialDelay = Math.min(baseDelay * Math.pow(backoffFactor, attemptNumber), maxDelay);

  if (!jitter) return exponentialDelay;

  // Add jitter to prevent thundering herd
  const jitterAmount = exponentialDelay * 0.1; // 10% jitter
  return exponentialDelay + (Math.random() * jitterAmount * 2 - jitterAmount);
}
