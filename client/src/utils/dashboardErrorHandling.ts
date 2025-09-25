/**
 * Dashboard Error Handling Utilities
 *
 * Centralized error handling logic for dashboard components.
 * Provides consistent error management and user-friendly error messages.
 */

// ================================
// ERROR TYPES
// ================================

export type DashboardErrorType =
  | "network_error"
  | "auth_error"
  | "data_error"
  | "transform_error"
  | "metadata_error"
  | "validation_error"
  | "unknown_error";

export interface DashboardError {
  type: DashboardErrorType;
  message: string;
  originalError?: Error;
  retryable: boolean;
  userMessage: string;
  actionRequired?: string;
}

// ================================
// ERROR CLASSIFICATION
// ================================

/**
 * Classify an error and return structured error information
 */
export const classifyDashboardError = (error: unknown): DashboardError => {
  if (error instanceof Error) {
    // Network errors
    if (error.name === "NetworkError" || error.message.includes("fetch")) {
      return {
        type: "network_error",
        message: error.message,
        originalError: error,
        retryable: true,
        userMessage: "Unable to connect to the server. Please check your internet connection.",
        actionRequired: "Try refreshing the page or check your network connection.",
      };
    }

    // Authentication errors
    if (error.message.includes("auth") || error.message.includes("unauthorized")) {
      return {
        type: "auth_error",
        message: error.message,
        originalError: error,
        retryable: false,
        userMessage: "Authentication failed. Please sign in again.",
        actionRequired: "Please sign out and sign back in to continue.",
      };
    }

    // Data transformation errors
    if (error.message.includes("transform") || error.message.includes("parse")) {
      return {
        type: "transform_error",
        message: error.message,
        originalError: error,
        retryable: true,
        userMessage: "There was an issue processing your data.",
        actionRequired: "Please refresh the page to reload your data.",
      };
    }

    // Validation errors
    if (error.message.includes("validation") || error.message.includes("invalid")) {
      return {
        type: "validation_error",
        message: error.message,
        originalError: error,
        retryable: false,
        userMessage: "Some data appears to be invalid.",
        actionRequired: "Please contact support if this issue persists.",
      };
    }

    // Generic error
    return {
      type: "unknown_error",
      message: error.message,
      originalError: error,
      retryable: true,
      userMessage: "An unexpected error occurred.",
      actionRequired: "Please try again or contact support if the issue persists.",
    };
  }

  // Non-Error objects
  return {
    type: "unknown_error",
    message: String(error),
    retryable: true,
    userMessage: "An unexpected error occurred.",
    actionRequired: "Please try again or contact support if the issue persists.",
  };
};

// ================================
// ERROR HANDLING UTILITIES
// ================================

/**
 * Handle dashboard errors with consistent logging and user feedback
 */
export const handleDashboardError = (
  error: unknown,
  context: string,
  onError?: (error: DashboardError) => void
): DashboardError => {
  const dashboardError = classifyDashboardError(error);

  // Log error with context
  console.error(`Dashboard error in ${context}:`, {
    type: dashboardError.type,
    message: dashboardError.message,
    originalError: dashboardError.originalError,
    retryable: dashboardError.retryable,
  });

  // Call error handler if provided
  if (onError) {
    onError(dashboardError);
  }

  return dashboardError;
};

/**
 * Create a retry function for retryable errors
 */
export const createRetryHandler = (
  originalFunction: () => Promise<void>,
  maxRetries: number = 3,
  retryDelay: number = 1000
) => {
  let retryCount = 0;

  const retry = async (): Promise<void> => {
    try {
      await originalFunction();
      retryCount = 0; // Reset on success
    } catch (error) {
      const dashboardError = classifyDashboardError(error);

      if (dashboardError.retryable && retryCount < maxRetries) {
        retryCount++;
        console.log(`Retrying operation (attempt ${retryCount}/${maxRetries})...`);

        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, retryDelay * retryCount));

        return retry();
      } else {
        // Max retries reached or error not retryable
        throw error;
      }
    }
  };

  return retry;
};

// ================================
// ERROR RECOVERY STRATEGIES
// ================================

/**
 * Get recovery suggestions based on error type
 */
export const getErrorRecoveryStrategy = (
  error: DashboardError
): {
  canRetry: boolean;
  retryLabel: string;
  alternativeActions: Array<{
    label: string;
    action: string;
    description: string;
  }>;
} => {
  switch (error.type) {
    case "network_error":
      return {
        canRetry: true,
        retryLabel: "Retry Connection",
        alternativeActions: [
          {
            label: "Check Network",
            action: "check_network",
            description: "Verify your internet connection is working",
          },
          {
            label: "Refresh Page",
            action: "refresh_page",
            description: "Reload the entire page to reset the connection",
          },
        ],
      };

    case "auth_error":
      return {
        canRetry: false,
        retryLabel: "Sign In Again",
        alternativeActions: [
          {
            label: "Sign Out",
            action: "sign_out",
            description: "Sign out and sign back in to refresh your session",
          },
          {
            label: "Contact Support",
            action: "contact_support",
            description: "Get help with authentication issues",
          },
        ],
      };

    case "data_error":
    case "transform_error":
      return {
        canRetry: true,
        retryLabel: "Reload Data",
        alternativeActions: [
          {
            label: "Refresh Dashboard",
            action: "refresh_dashboard",
            description: "Reload all dashboard data from the server",
          },
          {
            label: "Clear Cache",
            action: "clear_cache",
            description: "Clear cached data and reload fresh information",
          },
        ],
      };

    case "validation_error":
      return {
        canRetry: false,
        retryLabel: "Report Issue",
        alternativeActions: [
          {
            label: "Contact Support",
            action: "contact_support",
            description: "Report this data validation issue to our support team",
          },
          {
            label: "Refresh Page",
            action: "refresh_page",
            description: "Try reloading the page to see if the issue resolves",
          },
        ],
      };

    default:
      return {
        canRetry: true,
        retryLabel: "Try Again",
        alternativeActions: [
          {
            label: "Refresh Page",
            action: "refresh_page",
            description: "Reload the page to reset the application state",
          },
          {
            label: "Contact Support",
            action: "contact_support",
            description: "Get help resolving this issue",
          },
        ],
      };
  }
};

// ================================
// ERROR BOUNDARY HELPERS
// ================================

/**
 * Format error for display in error boundaries
 */
export const formatErrorForDisplay = (
  error: DashboardError
): {
  title: string;
  message: string;
  details?: string;
} => {
  const titles: Record<DashboardErrorType, string> = {
    network_error: "Connection Problem",
    auth_error: "Authentication Required",
    data_error: "Data Loading Error",
    transform_error: "Data Processing Error",
    metadata_error: "Metadata Loading Error",
    validation_error: "Data Validation Error",
    unknown_error: "Unexpected Error",
  };

  return {
    title: titles[error.type] || "Error",
    message: error.userMessage,
    details: error.actionRequired,
  };
};

/**
 * Check if error should trigger a full page reload
 */
export const shouldReloadPage = (error: DashboardError): boolean => {
  return error.type === "auth_error" || (error.type === "unknown_error" && !error.retryable);
};

/**
 * Get error severity level for logging and monitoring
 */
export const getErrorSeverity = (error: DashboardError): "low" | "medium" | "high" | "critical" => {
  switch (error.type) {
    case "metadata_error":
      return "low";
    case "network_error":
    case "data_error":
      return "medium";
    case "transform_error":
    case "validation_error":
      return "high";
    case "auth_error":
    case "unknown_error":
      return "critical";
    default:
      return "medium";
  }
};
