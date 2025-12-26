/**
 * Client-side Secure Logger
 *
 * Provides secure logging with automatic PII sanitization for browser environments.
 * Mirrors server-side secureLogger patterns to ensure consistent data protection.
 *
 * @module clientLogger
 */

// Re-export types for convenience
export type { ErrorContext, LogContext } from "./loggerTypes";

/**
 * Log levels for structured logging
 */
export enum LogLevel {
  DEBUG = "debug",
  INFO = "info",
  WARN = "warn",
  ERROR = "error",
}

/**
 * Log entry structure
 */
interface LogEntry {
  level: LogLevel;
  timestamp: string;
  message: string;
  context?: Record<string, unknown>;
  requestId?: string;
}

/**
 * Sensitive field patterns to redact completely
 */
const SENSITIVE_PATTERNS = [
  /password/i,
  /secret/i,
  /token/i,
  /api[_-]?key/i,
  /auth/i,
  /credential/i,
  /private[_-]?key/i,
  /access[_-]?key/i,
  /bearer/i,
  /authorization/i,
];

/**
 * PII field patterns to hash/anonymize
 */
const PII_PATTERNS = [
  /email/i,
  /phone/i,
  /address/i,
  /ssn/i,
  /credit[_-]?card/i,
  /card[_-]?number/i,
  /cvv/i,
  /postal[_-]?code/i,
  /zip[_-]?code/i,
];

/**
 * Check if running in production
 */
function isProduction(): boolean {
  return import.meta.env.PROD;
}

/**
 * Simple hash function for client-side anonymization
 * Uses a basic string hash since Web Crypto is async
 */
function hashValue(value: string): string {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    const char = value.codePointAt(i) ?? 0;
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(16).padStart(8, "0").substring(0, 16);
}

/**
 * Check if a field name matches sensitive patterns
 */
function isSensitiveField(fieldName: string): boolean {
  return SENSITIVE_PATTERNS.some(pattern => pattern.test(fieldName));
}

/**
 * Check if a field name matches PII patterns
 */
function isPIIField(fieldName: string): boolean {
  return PII_PATTERNS.some(pattern => pattern.test(fieldName));
}

/**
 * Sanitize a single value based on field name
 */
function sanitizeValue(value: unknown, fieldName: string): unknown {
  // Redact sensitive fields completely
  if (isSensitiveField(fieldName)) {
    return "[REDACTED]";
  }

  // Hash PII fields
  if (isPIIField(fieldName) && typeof value === "string") {
    return `[HASHED:${hashValue(value)}]`;
  }

  // Sanitize email addresses found in any string
  if (typeof value === "string" && value.includes("@") && value.includes(".")) {
    const emailRegex = /([^@\s]+)@([^@\s]+)/;
    const emailMatch = emailRegex.exec(value);
    if (emailMatch) {
      return value.replace(emailMatch[0], `[EMAIL:***@${emailMatch[2]}]`);
    }
  }

  // Sanitize Clerk IDs (keep first 12 chars)
  if (
    fieldName.toLowerCase().includes("clerkid") &&
    typeof value === "string" &&
    value.startsWith("user_")
  ) {
    return `${value.substring(0, 12)}...`;
  }

  // Sanitize session IDs (keep first 16 chars for debugging)
  if (
    fieldName.toLowerCase().includes("sessionid") &&
    typeof value === "string" &&
    value.length > 16
  ) {
    return `${value.substring(0, 16)}...`;
  }

  // Sanitize long IDs (keep first 8 chars)
  if (
    (fieldName.toLowerCase().includes("id") || fieldName.toLowerCase().includes("token")) &&
    typeof value === "string" &&
    value.length > 20
  ) {
    return `${value.substring(0, 8)}...`;
  }

  return value;
}

/**
 * Recursively sanitize an object
 */
function sanitizeObject(obj: Record<string, unknown>): Record<string, unknown> {
  const sanitized: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(obj)) {
    if (value === null || value === undefined) {
      sanitized[key] = value;
    } else if (Array.isArray(value)) {
      sanitized[key] = value.map(item =>
        typeof item === "object" && item !== null
          ? sanitizeObject(item as Record<string, unknown>)
          : sanitizeValue(item, key)
      );
    } else if (typeof value === "object") {
      sanitized[key] = sanitizeObject(value as Record<string, unknown>);
    } else {
      sanitized[key] = sanitizeValue(value, key);
    }
  }

  return sanitized;
}

/**
 * Format log entry for output
 */
function formatLogEntry(entry: LogEntry): string {
  const { level, timestamp, message, context, requestId } = entry;

  // In production, use JSON format for log aggregation
  if (isProduction()) {
    return JSON.stringify({
      level,
      timestamp,
      message,
      ...(context && { context }),
      ...(requestId && { requestId }),
    });
  }

  // In development, use human-readable format
  const emoji = {
    [LogLevel.DEBUG]: "🔍",
    [LogLevel.INFO]: "ℹ️",
    [LogLevel.WARN]: "⚠️",
    [LogLevel.ERROR]: "❌",
  }[level];

  let output = `${emoji} [${level.toUpperCase()}] ${message}`;

  if (requestId) {
    output += ` [${requestId}]`;
  }

  if (context && Object.keys(context).length > 0) {
    output += `\n${JSON.stringify(context, null, 2)}`;
  }

  return output;
}

/**
 * Write log entry to console
 */
function writeLog(entry: LogEntry): void {
  const formatted = formatLogEntry(entry);

  switch (entry.level) {
    case LogLevel.ERROR:
      console.error(formatted);
      break;
    case LogLevel.WARN:
      console.warn(formatted);
      break;
    case LogLevel.DEBUG:
      // Only log debug in development
      if (!isProduction()) {
        console.log(formatted);
      }
      break;
    case LogLevel.INFO:
    default:
      console.log(formatted);
      break;
  }
}

/**
 * Core logging function
 */
function log(
  level: LogLevel,
  message: string,
  context?: Record<string, unknown>,
  requestId?: string
): void {
  const entry: LogEntry = {
    level,
    timestamp: new Date().toISOString(),
    message,
    context: context ? sanitizeObject(context) : undefined,
    requestId,
  };

  writeLog(entry);
}

/**
 * Client Logger - Secure logging utility for browser environments
 */
export const clientLogger = {
  /**
   * Log debug message (development only)
   */
  debug(message: string, context?: Record<string, unknown>, requestId?: string): void {
    log(LogLevel.DEBUG, message, context, requestId);
  },

  /**
   * Log info message
   */
  info(message: string, context?: Record<string, unknown>, requestId?: string): void {
    log(LogLevel.INFO, message, context, requestId);
  },

  /**
   * Log warning message
   */
  warn(message: string, context?: Record<string, unknown>, requestId?: string): void {
    log(LogLevel.WARN, message, context, requestId);
  },

  /**
   * Log error message with optional Error object
   */
  error(
    message: string,
    error?: Error | null,
    context?: Record<string, unknown>,
    requestId?: string
  ): void {
    const errorContext: Record<string, unknown> = { ...context };

    if (error) {
      errorContext.error = {
        name: error.name,
        message: error.message,
        // Only include stack in development
        ...(isProduction() ? {} : { stack: error.stack }),
      };
    }

    log(LogLevel.ERROR, message, errorContext, requestId);
  },

  /**
   * Log with custom emoji prefix (for specialized loggers)
   * Sanitizes context data before logging
   */
  logWithEmoji(
    level: LogLevel,
    emoji: string,
    tag: string,
    message: string,
    context?: Record<string, unknown>
  ): void {
    const sanitizedContext = context ? sanitizeObject(context) : undefined;
    const formattedMessage = `${emoji} [${tag}] ${message}`;

    switch (level) {
      case LogLevel.ERROR:
        console.error(formattedMessage, sanitizedContext ?? "");
        break;
      case LogLevel.WARN:
        console.warn(formattedMessage, sanitizedContext ?? "");
        break;
      case LogLevel.DEBUG:
        if (!isProduction()) {
          console.log(formattedMessage, sanitizedContext ?? "");
        }
        break;
      case LogLevel.INFO:
      default:
        console.log(formattedMessage, sanitizedContext ?? "");
        break;
    }
  },
};

/**
 * Utility to sanitize data before logging (for manual use)
 */
export function sanitize(data: Record<string, unknown>): Record<string, unknown> {
  return sanitizeObject(data);
}

export default clientLogger;
