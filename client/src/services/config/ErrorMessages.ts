/**
 * Error Message Mapping Configuration
 *
 * Maps technical sync errors to user-friendly messages with specific recovery actions.
 * This configuration provides clear, actionable guidance for users when sync errors occur.
 *
 * Requirements addressed:
 * - 9.3: User-friendly error messages with actionable recovery options
 * - 10.3: Manual sync trigger and error recovery
 */

import { SyncErrorType } from "@shared/types/sync";

/**
 * User-friendly error message configuration
 */
export interface ErrorMessageConfig {
  /** User-friendly title for the error */
  title: string;
  /** Detailed user-friendly message explaining what happened */
  message: string;
  /** Short description for tooltips or compact displays */
  shortMessage: string;
  /** Suggested recovery actions for the user */
  recoveryActions: RecoveryAction[];
  /** Severity level for UI styling */
  severity: "info" | "warning" | "error" | "critical";
  /** Whether to show technical details by default */
  showTechnicalDetails: boolean;
  /** Icon name for visual representation */
  icon: "wifi-off" | "alert-circle" | "shield-alert" | "refresh-cw" | "database" | "clock" | "lock";
}

/**
 * Recovery action configuration
 */
export interface RecoveryAction {
  /** Unique identifier for the action */
  id: string;
  /** User-facing label for the action button */
  label: string;
  /** Detailed description of what the action does */
  description: string;
  /** Action type for handling */
  type: "retry" | "refresh" | "reload" | "contact_support" | "dismiss" | "custom";
  /** Whether this is the primary/recommended action */
  primary: boolean;
  /** Whether the action is available in the current context */
  available: boolean;
  /** Custom handler function (optional) */
  handler?: () => void | Promise<void>;
}

/**
 * Error message mapping for all sync error types
 */
export const ERROR_MESSAGES: Record<SyncErrorType, ErrorMessageConfig> = {
  [SyncErrorType.NETWORK_ERROR]: {
    title: "Connection Lost",
    message:
      "We're having trouble connecting to our servers. This is usually temporary and we're automatically trying to reconnect. Your data is safe and will sync once the connection is restored.",
    shortMessage: "Connection lost. Retrying...",
    recoveryActions: [
      {
        id: "retry",
        label: "Retry Now",
        description: "Try to reconnect immediately",
        type: "retry",
        primary: true,
        available: true,
      },
      {
        id: "refresh",
        label: "Refresh Page",
        description: "Reload the page to reset the connection",
        type: "reload",
        primary: false,
        available: true,
      },
      {
        id: "dismiss",
        label: "Dismiss",
        description: "Hide this message (we'll keep trying in the background)",
        type: "dismiss",
        primary: false,
        available: true,
      },
    ],
    severity: "warning",
    showTechnicalDetails: false,
    icon: "wifi-off",
  },

  [SyncErrorType.WEBSOCKET_ERROR]: {
    title: "Real-time Connection Issue",
    message:
      "The real-time connection was interrupted. We've automatically switched to a backup method to keep your data synchronized. You may experience a slight delay in updates.",
    shortMessage: "Switched to backup connection",
    recoveryActions: [
      {
        id: "retry",
        label: "Restore Real-time",
        description: "Try to restore the real-time connection",
        type: "retry",
        primary: true,
        available: true,
      },
      {
        id: "dismiss",
        label: "Continue with Backup",
        description: "Keep using the backup connection method",
        type: "dismiss",
        primary: false,
        available: true,
      },
    ],
    severity: "info",
    showTechnicalDetails: false,
    icon: "refresh-cw",
  },

  [SyncErrorType.AUTHENTICATION_ERROR]: {
    title: "Session Expired",
    message:
      "Your session has expired for security reasons. Please sign in again to continue accessing your dashboard. Don't worry, your data is safe and will be available after you sign in.",
    shortMessage: "Please sign in again",
    recoveryActions: [
      {
        id: "reload",
        label: "Sign In Again",
        description: "Reload the page to sign in",
        type: "reload",
        primary: true,
        available: true,
      },
      {
        id: "contact_support",
        label: "Contact Support",
        description: "Get help if you're having trouble signing in",
        type: "contact_support",
        primary: false,
        available: true,
      },
    ],
    severity: "critical",
    showTechnicalDetails: false,
    icon: "lock",
  },

  [SyncErrorType.DATA_INCONSISTENCY]: {
    title: "Data Sync Issue",
    message:
      "We detected a mismatch in your dashboard data. This can happen when multiple devices are used simultaneously. We're automatically fixing this to ensure all your information is accurate.",
    shortMessage: "Syncing data...",
    recoveryActions: [
      {
        id: "refresh",
        label: "Refresh Data",
        description: "Reload all dashboard data from the server",
        type: "refresh",
        primary: true,
        available: true,
      },
      {
        id: "retry",
        label: "Retry Sync",
        description: "Try to synchronize the data again",
        type: "retry",
        primary: false,
        available: true,
      },
      {
        id: "dismiss",
        label: "Dismiss",
        description: "Hide this message (sync will continue automatically)",
        type: "dismiss",
        primary: false,
        available: true,
      },
    ],
    severity: "warning",
    showTechnicalDetails: true,
    icon: "database",
  },

  [SyncErrorType.VALIDATION_ERROR]: {
    title: "Data Validation Failed",
    message:
      "Some of your dashboard data couldn't be validated. This might be due to an outdated cache or a temporary server issue. Refreshing your data should resolve this.",
    shortMessage: "Please refresh your data",
    recoveryActions: [
      {
        id: "refresh",
        label: "Refresh Data",
        description: "Reload all dashboard data",
        type: "refresh",
        primary: true,
        available: true,
      },
      {
        id: "reload",
        label: "Reload Page",
        description: "Completely reload the page",
        type: "reload",
        primary: false,
        available: true,
      },
      {
        id: "contact_support",
        label: "Contact Support",
        description: "Get help if the problem persists",
        type: "contact_support",
        primary: false,
        available: true,
      },
    ],
    severity: "error",
    showTechnicalDetails: true,
    icon: "alert-circle",
  },

  [SyncErrorType.CONFLICT_ERROR]: {
    title: "Data Conflict Detected",
    message:
      "Your data was modified in multiple places at the same time. We're automatically resolving this conflict to ensure you don't lose any information. This usually happens when using multiple devices.",
    shortMessage: "Resolving conflict...",
    recoveryActions: [
      {
        id: "retry",
        label: "Retry",
        description: "Try the operation again",
        type: "retry",
        primary: true,
        available: true,
      },
      {
        id: "refresh",
        label: "Refresh Data",
        description: "Reload data to see the latest version",
        type: "refresh",
        primary: false,
        available: true,
      },
      {
        id: "dismiss",
        label: "Dismiss",
        description: "Hide this message",
        type: "dismiss",
        primary: false,
        available: true,
      },
    ],
    severity: "warning",
    showTechnicalDetails: true,
    icon: "alert-circle",
  },

  [SyncErrorType.TIMEOUT_ERROR]: {
    title: "Request Timed Out",
    message:
      "The server is taking longer than expected to respond. This might be due to a slow connection or high server load. We're automatically retrying with optimized settings.",
    shortMessage: "Request timed out. Retrying...",
    recoveryActions: [
      {
        id: "retry",
        label: "Retry Now",
        description: "Try the request again immediately",
        type: "retry",
        primary: true,
        available: true,
      },
      {
        id: "refresh",
        label: "Refresh Page",
        description: "Reload the page to start fresh",
        type: "reload",
        primary: false,
        available: true,
      },
      {
        id: "dismiss",
        label: "Wait",
        description: "Wait for automatic retry",
        type: "dismiss",
        primary: false,
        available: true,
      },
    ],
    severity: "warning",
    showTechnicalDetails: false,
    icon: "clock",
  },
};

/**
 * Get user-friendly error message configuration for a specific error type
 */
export function getErrorMessage(errorType: SyncErrorType): ErrorMessageConfig {
  return ERROR_MESSAGES[errorType] || getDefaultErrorMessage();
}

/**
 * Get default error message for unknown error types
 */
export function getDefaultErrorMessage(): ErrorMessageConfig {
  return {
    title: "Unexpected Error",
    message:
      "Something unexpected happened. We're working to resolve this issue. Please try refreshing the page or contact support if the problem persists.",
    shortMessage: "An error occurred",
    recoveryActions: [
      {
        id: "refresh",
        label: "Refresh Page",
        description: "Reload the page",
        type: "reload",
        primary: true,
        available: true,
      },
      {
        id: "contact_support",
        label: "Contact Support",
        description: "Get help from our support team",
        type: "contact_support",
        primary: false,
        available: true,
      },
      {
        id: "dismiss",
        label: "Dismiss",
        description: "Hide this message",
        type: "dismiss",
        primary: false,
        available: true,
      },
    ],
    severity: "error",
    showTechnicalDetails: true,
    icon: "alert-circle",
  };
}

/**
 * Get severity color for UI styling
 */
export function getSeverityColor(severity: ErrorMessageConfig["severity"]): {
  bg: string;
  border: string;
  text: string;
  icon: string;
} {
  switch (severity) {
    case "info":
      return {
        bg: "bg-blue-50/10",
        border: "border-blue-500/20",
        text: "text-blue-400",
        icon: "text-blue-500",
      };
    case "warning":
      return {
        bg: "bg-yellow-50/10",
        border: "border-yellow-500/20",
        text: "text-yellow-400",
        icon: "text-yellow-500",
      };
    case "error":
      return {
        bg: "bg-red-50/10",
        border: "border-red-500/20",
        text: "text-red-400",
        icon: "text-red-500",
      };
    case "critical":
      return {
        bg: "bg-red-50/10",
        border: "border-red-600/30",
        text: "text-red-300",
        icon: "text-red-600",
      };
    default:
      return {
        bg: "bg-gray-50/10",
        border: "border-gray-500/20",
        text: "text-gray-400",
        icon: "text-gray-500",
      };
  }
}

/**
 * Format error message with context
 */
export function formatErrorMessage(
  errorType: SyncErrorType,
  context?: {
    retryCount?: number;
    nextRetryIn?: number;
    affectedSections?: string[];
  }
): string {
  const config = getErrorMessage(errorType);
  let message = config.message;

  // Add retry information if available
  if (context?.retryCount && context.retryCount > 0) {
    message += ` (Retry attempt ${context.retryCount})`;
  }

  // Add next retry timing if available
  if (context?.nextRetryIn && context.nextRetryIn > 0) {
    const seconds = Math.ceil(context.nextRetryIn / 1000);
    message += ` Next retry in ${seconds} second${seconds === 1 ? "" : "s"}.`;
  }

  // Add affected sections if available
  if (context?.affectedSections && context.affectedSections.length > 0) {
    message += ` Affected sections: ${context.affectedSections.join(", ")}.`;
  }

  return message;
}
