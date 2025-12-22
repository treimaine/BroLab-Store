/**
 * BroLab Entertainment - Error Utilities
 *
 * Centralized error handling utilities including:
 * - AppError interface and factory functions
 * - Error wrapping utilities for async operations
 * - BroLab-specific error message formatting
 */

import { ErrorMessages } from "../constants/ErrorMessages";
import { ERROR_HTTP_STATUS, ERROR_MESSAGES, ErrorType } from "../constants/errors";

// ================================
// APP ERROR INTERFACE & UTILITIES
// ================================

/**
 * Application error interface with typed properties
 * Replaces scattered throw new Error() patterns
 */
export interface AppError extends Error {
  type: ErrorType;
  statusCode: number;
  userMessage: string;
  details?: Record<string, unknown>;
  isOperational: boolean;
}

/**
 * Create a typed application error
 * Replaces scattered throw new Error() patterns across the codebase
 *
 * @param type - The error type from ErrorType enum
 * @param message - Optional technical message (defaults to ERROR_MESSAGES mapping)
 * @param details - Optional additional context for debugging
 * @returns AppError instance with all properties set
 *
 * @example
 * throw createAppError(ErrorType.AUTHENTICATION_ERROR);
 * throw createAppError(ErrorType.VALIDATION_ERROR, "Email format invalid", { field: "email" });
 */
export function createAppError(
  type: ErrorType,
  message?: string,
  details?: Record<string, unknown>
): AppError {
  const error = new Error(message || ERROR_MESSAGES[type]) as AppError;
  error.name = "AppError";
  error.type = type;
  error.statusCode = ERROR_HTTP_STATUS[type];
  error.userMessage = ERROR_MESSAGES[type];
  error.details = details;
  error.isOperational = true;
  return error;
}

/**
 * Type guard to check if an error is an AppError
 *
 * @param error - Unknown error to check
 * @returns True if error is an AppError instance
 *
 * @example
 * try {
 *   await riskyOperation();
 * } catch (error) {
 *   if (isAppError(error)) {
 *     // Handle typed error
 *     console.log(error.type, error.statusCode);
 *   }
 * }
 */
export function isAppError(error: unknown): error is AppError {
  return (
    error instanceof Error &&
    "type" in error &&
    "isOperational" in error &&
    "statusCode" in error &&
    "userMessage" in error
  );
}

/**
 * Wrap async handlers with consistent error handling
 * Replaces try-catch boilerplate across the codebase
 *
 * @param fn - Async function to wrap
 * @param context - Optional context string for logging
 * @returns Promise that resolves to the function result or throws AppError
 *
 * @example
 * const result = await withErrorHandling(
 *   () => fetchUserData(userId),
 *   "fetchUserData"
 * );
 */
export async function withErrorHandling<T>(fn: () => Promise<T>, context?: string): Promise<T> {
  try {
    return await fn();
  } catch (error: unknown) {
    // If already an AppError, re-throw as-is
    if (isAppError(error)) {
      throw error;
    }

    // Extract message from unknown error
    const message = error instanceof Error ? error.message : "Unknown error";

    // Log with context for debugging
    console.error(`Error in ${context || "operation"}:`, error);

    // Wrap in AppError for consistent handling
    throw createAppError(ErrorType.UNKNOWN_ERROR, message, {
      originalError: error instanceof Error ? error.name : typeof error,
      context,
    });
  }
}

/**
 * Synchronous version of withErrorHandling for non-async operations
 *
 * @param fn - Synchronous function to wrap
 * @param context - Optional context string for logging
 * @returns Function result or throws AppError
 */
export function withErrorHandlingSync<T>(fn: () => T, context?: string): T {
  try {
    return fn();
  } catch (error: unknown) {
    if (isAppError(error)) {
      throw error;
    }

    const message = error instanceof Error ? error.message : "Unknown error";
    console.error(`Error in ${context || "operation"}:`, error);

    throw createAppError(ErrorType.UNKNOWN_ERROR, message, {
      originalError: error instanceof Error ? error.name : typeof error,
      context,
    });
  }
}

/**
 * Convert any error to AppError for consistent handling
 *
 * @param error - Any error to convert
 * @param defaultType - Default error type if not determinable
 * @returns AppError instance
 */
export function toAppError(
  error: unknown,
  defaultType: ErrorType = ErrorType.UNKNOWN_ERROR
): AppError {
  if (isAppError(error)) {
    return error;
  }

  const message = error instanceof Error ? error.message : String(error);
  return createAppError(defaultType, message);
}

// ================================
// BROLAB-SPECIFIC ERROR UTILITIES
// ================================

/**
 * Error category definition for mapping keywords to messages
 */
interface ErrorCategoryRule {
  keywords: string[];
  message: string;
}

interface ErrorCategory {
  triggers: string[];
  rules: ErrorCategoryRule[];
  fallback?: string;
}

/**
 * Error mapping configuration - declarative approach to reduce cognitive complexity
 */
const ERROR_CATEGORIES: ErrorCategory[] = [
  {
    triggers: ["beat", "track", "audio"],
    rules: [
      { keywords: ["not found"], message: ErrorMessages.BEATS.NOT_FOUND },
      { keywords: ["unavailable"], message: ErrorMessages.BEATS.UNAVAILABLE },
      { keywords: ["license"], message: ErrorMessages.BEATS.INVALID_LICENSE },
      { keywords: ["quota"], message: ErrorMessages.BEATS.INSUFFICIENT_QUOTA },
      { keywords: ["upload"], message: ErrorMessages.BEATS.UPLOAD_FAILED },
      { keywords: ["format"], message: ErrorMessages.BEATS.INVALID_AUDIO_FORMAT },
      { keywords: ["size", "large"], message: ErrorMessages.BEATS.FILE_TOO_LARGE },
      { keywords: ["virus"], message: ErrorMessages.BEATS.VIRUS_DETECTED },
    ],
  },
  {
    triggers: ["payment", "card", "billing"],
    rules: [
      { keywords: ["declined"], message: ErrorMessages.PAYMENT.CARD_DECLINED },
      { keywords: ["expired"], message: ErrorMessages.PAYMENT.EXPIRED_CARD },
      { keywords: ["insufficient"], message: ErrorMessages.PAYMENT.INSUFFICIENT_FUNDS },
      { keywords: ["stripe"], message: ErrorMessages.PAYMENT.STRIPE_ERROR },
      { keywords: ["paypal"], message: ErrorMessages.PAYMENT.PAYPAL_ERROR },
    ],
    fallback: ErrorMessages.PAYMENT.FAILED,
  },
  {
    triggers: ["auth", "login", "unauthorized"],
    rules: [
      { keywords: ["unauthorized"], message: ErrorMessages.AUTH.UNAUTHORIZED },
      { keywords: ["forbidden"], message: ErrorMessages.AUTH.FORBIDDEN },
      { keywords: ["token"], message: ErrorMessages.AUTH.INVALID_TOKEN },
      { keywords: ["session"], message: ErrorMessages.AUTH.SESSION_EXPIRED },
      { keywords: ["suspended"], message: ErrorMessages.AUTH.ACCOUNT_SUSPENDED },
    ],
  },
  {
    triggers: ["file", "download", "upload"],
    rules: [
      { keywords: ["not found"], message: ErrorMessages.FILE.NOT_FOUND },
      { keywords: ["download"], message: ErrorMessages.FILE.DOWNLOAD_FAILED },
      { keywords: ["upload"], message: ErrorMessages.FILE.UPLOAD_FAILED },
      { keywords: ["access"], message: ErrorMessages.FILE.ACCESS_DENIED },
      { keywords: ["corrupted"], message: ErrorMessages.FILE.CORRUPTED },
    ],
  },
];

/**
 * Check if message contains any of the keywords
 */
function matchesKeywords(message: string, keywords: string[]): boolean {
  return keywords.some(keyword => message.includes(keyword));
}

/**
 * Find matching error message from category rules
 */
function findMatchingRule(message: string, category: ErrorCategory): string | null {
  for (const rule of category.rules) {
    if (matchesKeywords(message, rule.keywords)) {
      return rule.message;
    }
  }
  return category.fallback ?? null;
}

/**
 * Maps generic error types to BroLab-specific error messages
 * Uses declarative mapping to maintain low cognitive complexity
 */
export function getBroLabErrorMessage(error: Error | string): string {
  const errorMessage = typeof error === "string" ? error : error.message;
  const lowerMessage = errorMessage.toLowerCase();

  for (const category of ERROR_CATEGORIES) {
    if (matchesKeywords(lowerMessage, category.triggers)) {
      const matchedMessage = findMatchingRule(lowerMessage, category);
      if (matchedMessage) {
        return matchedMessage;
      }
    }
  }

  return ErrorMessages.GENERIC.UNKNOWN_ERROR;
}
/**
 * Formats error messages with BroLab-specific context and guidance
 */
export function formatBroLabError(
  error: Error | string,
  _context?: string
): {
  message: string;
  guidance: string;
  escalation?: string;
} {
  const errorMessage = getBroLabErrorMessage(error);

  // Provide context-specific guidance
  let guidance = "Please try again in a few moments.";
  let escalation: string | undefined;

  if (errorMessage.includes("beat") || errorMessage.includes("track")) {
    guidance = "Try refreshing the beats catalog or check your internet connection.";
    escalation = "If you continue having issues accessing beats, please contact our support team.";
  } else if (errorMessage.includes("payment") || errorMessage.includes("card")) {
    guidance = "Please verify your payment information and try again.";
    escalation =
      "For payment issues, contact support@brolabentertainment.com or try a different payment method.";
  } else if (errorMessage.includes("authentication") || errorMessage.includes("login")) {
    guidance = "Please try logging out and back in to your BroLab account.";
    escalation =
      "If you can't access your account, use the password reset option or contact support.";
  } else if (errorMessage.includes("download") || errorMessage.includes("file")) {
    guidance = "Check your internet connection and available storage space.";
    escalation = "For download issues, verify your subscription status or contact support.";
  } else if (errorMessage.includes("reservation") || errorMessage.includes("booking")) {
    guidance = "Please check the availability calendar and try selecting a different time slot.";
    escalation = "For studio booking issues, call us directly at +33 (0)1 XX XX XX XX.";
  }

  return {
    message: errorMessage,
    guidance,
    escalation,
  };
}

/**
 * Creates user-friendly error notifications for the BroLab platform
 */
export function createBroLabErrorNotification(error: Error | string, context?: string) {
  const { message, guidance, escalation } = formatBroLabError(error, context);

  return {
    title: "BroLab Error",
    message,
    guidance,
    escalation,
    actions: [
      { label: "Try Again", action: "retry" },
      { label: "Contact Support", action: "support" },
      { label: "Go to Home", action: "home", url: "/" },
    ],
  };
}

/**
 * Error severity levels for BroLab operations
 */
export enum BroLabErrorSeverity {
  LOW = "low", // Minor UI issues, non-critical features
  MEDIUM = "medium", // Feature unavailable, user can continue
  HIGH = "high", // Payment issues, authentication problems
  CRITICAL = "critical", // Complete system failure, data loss risk
}

/**
 * Determines error severity based on error type
 */
export function getBroLabErrorSeverity(error: Error | string): BroLabErrorSeverity {
  const errorMessage = typeof error === "string" ? error : error.message;
  const lowerMessage = errorMessage.toLowerCase();

  // Critical errors that prevent core functionality
  if (
    lowerMessage.includes("payment") ||
    lowerMessage.includes("authentication") ||
    lowerMessage.includes("database") ||
    lowerMessage.includes("server error")
  ) {
    return BroLabErrorSeverity.CRITICAL;
  }

  // High priority errors affecting user experience
  if (
    lowerMessage.includes("beat") ||
    lowerMessage.includes("download") ||
    lowerMessage.includes("upload") ||
    lowerMessage.includes("reservation")
  ) {
    return BroLabErrorSeverity.HIGH;
  }

  // Medium priority errors for secondary features
  if (
    lowerMessage.includes("sync") ||
    lowerMessage.includes("cache") ||
    lowerMessage.includes("notification")
  ) {
    return BroLabErrorSeverity.MEDIUM;
  }

  return BroLabErrorSeverity.LOW;
}
