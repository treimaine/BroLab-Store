/**
 * BroLab Entertainment - Error Utilities
 *
 * Utilities for handling and formatting BroLab-specific error messages
 */

import { ErrorMessages } from "../constants/ErrorMessages";

/**
 * Maps generic error types to BroLab-specific error messages
 */
export function getBroLabErrorMessage(error: Error | string): string {
  const errorMessage = typeof error === "string" ? error : error.message;
  const lowerMessage = errorMessage.toLowerCase();

  // Beat/Music specific errors
  if (
    lowerMessage.includes("beat") ||
    lowerMessage.includes("track") ||
    lowerMessage.includes("audio")
  ) {
    if (lowerMessage.includes("not found")) return ErrorMessages.BEATS.NOT_FOUND;
    if (lowerMessage.includes("unavailable")) return ErrorMessages.BEATS.UNAVAILABLE;
    if (lowerMessage.includes("license")) return ErrorMessages.BEATS.INVALID_LICENSE;
    if (lowerMessage.includes("quota")) return ErrorMessages.BEATS.INSUFFICIENT_QUOTA;
    if (lowerMessage.includes("upload")) return ErrorMessages.BEATS.UPLOAD_FAILED;
    if (lowerMessage.includes("format")) return ErrorMessages.BEATS.INVALID_AUDIO_FORMAT;
    if (lowerMessage.includes("size") || lowerMessage.includes("large"))
      return ErrorMessages.BEATS.FILE_TOO_LARGE;
    if (lowerMessage.includes("virus")) return ErrorMessages.BEATS.VIRUS_DETECTED;
  }

  // Payment specific errors
  if (
    lowerMessage.includes("payment") ||
    lowerMessage.includes("card") ||
    lowerMessage.includes("billing")
  ) {
    if (lowerMessage.includes("declined")) return ErrorMessages.PAYMENT.CARD_DECLINED;
    if (lowerMessage.includes("expired")) return ErrorMessages.PAYMENT.EXPIRED_CARD;
    if (lowerMessage.includes("insufficient")) return ErrorMessages.PAYMENT.INSUFFICIENT_FUNDS;
    if (lowerMessage.includes("stripe")) return ErrorMessages.PAYMENT.STRIPE_ERROR;
    if (lowerMessage.includes("paypal")) return ErrorMessages.PAYMENT.PAYPAL_ERROR;
    return ErrorMessages.PAYMENT.FAILED;
  }

  // Authentication errors
  if (
    lowerMessage.includes("auth") ||
    lowerMessage.includes("login") ||
    lowerMessage.includes("unauthorized")
  ) {
    if (lowerMessage.includes("unauthorized")) return ErrorMessages.AUTH.UNAUTHORIZED;
    if (lowerMessage.includes("forbidden")) return ErrorMessages.AUTH.FORBIDDEN;
    if (lowerMessage.includes("token")) return ErrorMessages.AUTH.INVALID_TOKEN;
    if (lowerMessage.includes("session")) return ErrorMessages.AUTH.SESSION_EXPIRED;
    if (lowerMessage.includes("suspended")) return ErrorMessages.AUTH.ACCOUNT_SUSPENDED;
  }

  // File/Download errors
  if (
    lowerMessage.includes("file") ||
    lowerMessage.includes("download") ||
    lowerMessage.includes("upload")
  ) {
    if (lowerMessage.includes("not found")) return ErrorMessages.FILE.NOT_FOUND;
    if (lowerMessage.includes("download")) return ErrorMessages.FILE.DOWNLOAD_FAILED;
    if (lowerMessage.includes("upload")) return ErrorMessages.FILE.UPLOAD_FAILED;
    if (lowerMessage.includes("access")) return ErrorMessages.FILE.ACCESS_DENIED;
    if (lowerMessage.includes("corrupted")) return ErrorMessages.FILE.CORRUPTED;
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
