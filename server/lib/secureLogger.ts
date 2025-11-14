/**
 * Secure Logger Utility
 *
 * Provides secure logging with automatic PII sanitization and environment-aware behavior.
 * Replaces direct console.log usage to prevent sensitive data exposure.
 *
 * @module secureLogger
 */

import crypto from "node:crypto";

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
 * Sensitive field patterns to redact
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
];

/**
 * PII field patterns to sanitize
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
 * Hash a value for anonymization
 */
function hashValue(value: string): string {
  return crypto.createHash("sha256").update(value).digest("hex").substring(0, 16);
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
 * Sanitize a single value
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

  // Sanitize email addresses
  if (typeof value === "string" && value.includes("@")) {
    const [, domain] = value.split("@");
    return `[EMAIL:***@${domain}]`;
  }

  // Sanitize Clerk IDs (keep first 8 chars)
  if (
    fieldName.toLowerCase().includes("clerkid") &&
    typeof value === "string" &&
    value.startsWith("user_")
  ) {
    return `${value.substring(0, 12)}...`;
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
  if (process.env.NODE_ENV === "production") {
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
 * Write log entry to appropriate output
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
      if (process.env.NODE_ENV !== "production") {
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
 * Secure Logger Class
 */
class SecureLogger {
  private requestId?: string;

  /**
   * Set request ID for correlation
   */
  setRequestId(requestId: string): void {
    this.requestId = requestId;
  }

  /**
   * Clear request ID
   */
  clearRequestId(): void {
    this.requestId = undefined;
  }

  /**
   * Log debug message (development only)
   */
  debug(message: string, context?: Record<string, unknown>): void {
    this.log(LogLevel.DEBUG, message, context);
  }

  /**
   * Log info message
   */
  info(message: string, context?: Record<string, unknown>): void {
    this.log(LogLevel.INFO, message, context);
  }

  /**
   * Log warning message
   */
  warn(message: string, context?: Record<string, unknown>): void {
    this.log(LogLevel.WARN, message, context);
  }

  /**
   * Log error message
   */
  error(message: string, error?: Error, context?: Record<string, unknown>): void {
    const errorContext = {
      ...context,
      ...(error && {
        error: {
          name: error.name,
          message: error.message,
          stack: process.env.NODE_ENV === "production" ? undefined : error.stack,
        },
      }),
    };

    this.log(LogLevel.ERROR, message, errorContext);
  }

  /**
   * Core logging method
   */
  private log(level: LogLevel, message: string, context?: Record<string, unknown>): void {
    const entry: LogEntry = {
      level,
      timestamp: new Date().toISOString(),
      message,
      context: context ? sanitizeObject(context) : undefined,
      requestId: this.requestId,
    };

    writeLog(entry);
  }
}

/**
 * Singleton instance
 */
export const secureLogger = new SecureLogger();

/**
 * Create a logger with request ID
 */
export function createRequestLogger(requestId: string): SecureLogger {
  const logger = new SecureLogger();
  logger.setRequestId(requestId);
  return logger;
}

/**
 * Express middleware to add request logger
 */
export function requestLoggerMiddleware(
  req: { id?: string; logger?: SecureLogger },
  _res: Record<string, unknown>,
  next: () => void
): void {
  const requestId = req.id || crypto.randomUUID();
  req.logger = createRequestLogger(requestId);
  next();
}

/**
 * Utility to sanitize data before logging (for manual use)
 */
export function sanitize(data: Record<string, unknown>): Record<string, unknown> {
  return sanitizeObject(data);
}

export default secureLogger;
