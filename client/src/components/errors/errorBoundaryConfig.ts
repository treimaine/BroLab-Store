/**
 * Error Boundary Configuration
 *
 * Centralized configuration for all error boundary variants.
 * This allows consistent behavior across the application while
 * supporting variant-specific customizations.
 */

export type ErrorBoundaryVariant =
  | "default"
  | "auth"
  | "reservation"
  | "dashboard"
  | "mixing"
  | "safe-mixing";

export type ErrorSeverity = "low" | "medium" | "high";

export interface ErrorBoundaryConfig {
  serviceName: string;
  maxRetries: number;
  supportEmail: string;
  showGoBack: boolean;
  accentColor: string;
}

const configs: Record<ErrorBoundaryVariant, ErrorBoundaryConfig> = {
  default: {
    serviceName: "BroLab App",
    maxRetries: 3,
    supportEmail: "support@brolabentertainment.com",
    showGoBack: false,
    accentColor: "var(--color-accent)",
  },
  auth: {
    serviceName: "Authentication",
    maxRetries: 3,
    supportEmail: "support@brolabentertainment.com",
    showGoBack: false,
    accentColor: "var(--accent-purple)",
  },
  reservation: {
    serviceName: "Reservation Service",
    maxRetries: 3,
    supportEmail: "support@brolabentertainment.com",
    showGoBack: true,
    accentColor: "var(--accent-purple)",
  },
  dashboard: {
    serviceName: "Dashboard",
    maxRetries: 3,
    supportEmail: "support@brolab.com",
    showGoBack: false,
    accentColor: "var(--accent-purple)",
  },
  mixing: {
    serviceName: "Mixing & Mastering",
    maxRetries: 3,
    supportEmail: "support@brolabentertainment.com",
    showGoBack: false,
    accentColor: "var(--accent-purple)",
  },
  "safe-mixing": {
    serviceName: "Mixing & Mastering",
    maxRetries: 3,
    supportEmail: "support@brolabentertainment.com",
    showGoBack: false,
    accentColor: "var(--accent-purple)",
  },
};

export function getErrorBoundaryConfig(variant: ErrorBoundaryVariant): ErrorBoundaryConfig {
  return configs[variant] ?? configs.default;
}

/**
 * Determine error type from error object
 */
export function getErrorType(error: Error | null): string {
  if (!error) return "Unknown Error";

  if (error.name === "ChunkLoadError") return "Network Error";
  if (error.message.includes("Loading chunk")) return "Loading Error";
  if (error.message.includes("Network") || error.message.includes("fetch")) return "Network Error";
  if (error.message.includes("Authentication") || error.message.includes("Clerk")) {
    return "Authentication Error";
  }
  return "Application Error";
}

/**
 * Determine error severity based on error type and retry count
 */
export function getErrorSeverity(
  error: Error | null,
  retryCount: number,
  maxRetries: number
): ErrorSeverity {
  if (!error) return "low";

  // High severity conditions
  if (
    error.name === "ChunkLoadError" ||
    error.message.includes("Loading chunk") ||
    retryCount >= maxRetries
  ) {
    return "high";
  }

  // Medium severity conditions
  if (
    error.message.includes("Cannot read properties") ||
    error.message.includes("is not a function") ||
    retryCount > 0
  ) {
    return "medium";
  }

  return "low";
}

/**
 * Get severity-based styles
 */
export function getSeverityStyles(severity: ErrorSeverity): {
  bgColor: string;
  iconColor: string;
  borderColor: string;
} {
  switch (severity) {
    case "high":
      return {
        bgColor: "bg-red-500/20",
        iconColor: "text-red-400",
        borderColor: "border-red-500/30",
      };
    case "medium":
      return {
        bgColor: "bg-yellow-500/20",
        iconColor: "text-yellow-400",
        borderColor: "border-yellow-500/30",
      };
    default:
      return {
        bgColor: "bg-blue-500/20",
        iconColor: "text-blue-400",
        borderColor: "border-blue-500/30",
      };
  }
}

type ErrorCategory = "authentication" | "network" | "general" | "critical";

export type { ErrorCategory };

interface ErrorMessage {
  title: string;
  description: string;
  suggestion: string;
}

/**
 * Get user-friendly error messages based on error type and context
 */
export function getErrorMessage(
  error: Error | null,
  errorCategory: ErrorCategory,
  serviceName: string,
  severity: ErrorSeverity
): ErrorMessage {
  // Authentication errors
  if (errorCategory === "authentication") {
    return {
      title: "Authentication Issue",
      description: `We encountered an issue with authentication. You can still view our services, but you'll need to sign in to continue.`,
      suggestion: "",
    };
  }

  // Network errors
  if (errorCategory === "network") {
    return {
      title: "Connection Problem",
      description: `We're having trouble connecting to our servers. Please check your internet connection and try again.`,
      suggestion: "If the problem persists, try refreshing the page.",
    };
  }

  // Severity-based messages for other errors
  switch (severity) {
    case "high":
      return {
        title: "Service Temporarily Unavailable",
        description: `We're experiencing technical difficulties with ${serviceName}. This appears to be a system-level issue that requires immediate attention.`,
        suggestion: "Please try refreshing the page or contact support if the problem persists.",
      };

    case "medium":
      return {
        title: "Loading Issue",
        description: `There was a problem loading ${serviceName}. This might be due to a temporary network issue or browser compatibility problem.`,
        suggestion:
          "Please try again or refresh the page. If the issue continues, try using a different browser.",
      };

    default:
      return {
        title: "Something went wrong",
        description: `We encountered an unexpected error while loading ${serviceName}. Our team has been notified and is working to resolve this issue.`,
        suggestion: "Please try again. The issue should resolve automatically.",
      };
  }
}
