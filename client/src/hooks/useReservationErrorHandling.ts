import { useToast } from "@/hooks/use-toast";
import { addBreadcrumb, errorTracker } from "@/lib/errorTracker";
import { logger } from "@/lib/logger";
import { performanceMonitor } from "@/lib/performanceMonitor";
import { useCallback, useState } from "react";

export interface ReservationError {
  type:
    | "validation"
    | "authentication"
    | "network"
    | "server"
    | "payment"
    | "file_upload"
    | "unknown";
  code?: string | number;
  message: string;
  details?: Record<string, unknown>;
  recoverable: boolean;
  retryable: boolean;
  userMessage: string;
  suggestedActions: string[];
}

export interface ErrorHandlingState {
  hasError: boolean;
  error: ReservationError | null;
  errorHistory: ReservationError[];
  retryCount: number;
  isRecovering: boolean;
}

export interface UseReservationErrorHandlingOptions {
  serviceName?: string;
  maxRetries?: number;
  showToastOnError?: boolean;
  autoRetryTransientErrors?: boolean;
  onError?: (error: ReservationError) => void;
  onRecovery?: () => void;
}

/**
 * Comprehensive error handling hook for reservation forms
 * Provides intelligent error categorization, user-friendly messages, and recovery mechanisms
 */
export function useReservationErrorHandling(options: UseReservationErrorHandlingOptions = {}) {
  const {
    serviceName = "reservation",
    maxRetries = 3,
    showToastOnError = true,
    autoRetryTransientErrors = true,
    onError,
    onRecovery,
  } = options;

  const { toast } = useToast();
  const [state, setState] = useState<ErrorHandlingState>({
    hasError: false,
    error: null,
    errorHistory: [],
    retryCount: 0,
    isRecovering: false,
  });

  /**
   * Categorize and enhance error information
   */
  const categorizeError = useCallback((error: unknown, context?: string): ReservationError => {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorName = error instanceof Error ? error.name : "UnknownError";

    // Authentication errors
    if (
      errorMessage.includes("401") ||
      errorMessage.includes("unauthorized") ||
      errorMessage.includes("authentication") ||
      errorMessage.includes("sign in") ||
      errorMessage.includes("not authenticated")
    ) {
      return {
        type: "authentication",
        code: 401,
        message: errorMessage,
        recoverable: true,
        retryable: false,
        userMessage: "Please sign in to continue with your reservation.",
        suggestedActions: [
          "Sign in to your account",
          "Create a new account if you don't have one",
          "Check if you're still logged in",
        ],
      };
    }

    // Validation errors
    if (
      errorMessage.includes("validation") ||
      errorMessage.includes("invalid") ||
      errorMessage.includes("required") ||
      errorMessage.includes("422") ||
      errorName === "ValidationError"
    ) {
      return {
        type: "validation",
        code: 422,
        message: errorMessage,
        recoverable: true,
        retryable: false,
        userMessage: "Please check your form information and try again.",
        suggestedActions: [
          "Review all required fields",
          "Check email format and phone number",
          "Ensure dates are valid and in the future",
          "Verify file uploads are complete",
        ],
      };
    }

    // Network errors
    if (
      errorMessage.includes("network") ||
      errorMessage.includes("fetch") ||
      errorMessage.includes("timeout") ||
      errorMessage.includes("connection") ||
      errorName === "NetworkError" ||
      errorName === "TypeError"
    ) {
      return {
        type: "network",
        code: "NETWORK_ERROR",
        message: errorMessage,
        recoverable: true,
        retryable: true,
        userMessage: "Connection issue detected. We'll retry automatically.",
        suggestedActions: [
          "Check your internet connection",
          "Try refreshing the page",
          "Wait a moment and try again",
        ],
      };
    }

    // Server errors
    if (
      errorMessage.includes("500") ||
      errorMessage.includes("502") ||
      errorMessage.includes("503") ||
      errorMessage.includes("server error") ||
      errorMessage.includes("internal error")
    ) {
      return {
        type: "server",
        code: 500,
        message: errorMessage,
        recoverable: true,
        retryable: true,
        userMessage: "Server is temporarily unavailable. We're working to fix this.",
        suggestedActions: [
          "Wait a few minutes and try again",
          "Check our status page for updates",
          "Contact support if the issue persists",
        ],
      };
    }

    // Payment errors
    if (
      errorMessage.includes("payment") ||
      errorMessage.includes("stripe") ||
      errorMessage.includes("paypal") ||
      errorMessage.includes("billing") ||
      context === "payment"
    ) {
      return {
        type: "payment",
        code: "PAYMENT_ERROR",
        message: errorMessage,
        recoverable: true,
        retryable: true,
        userMessage: "Payment processing issue. Please try a different payment method.",
        suggestedActions: [
          "Check your payment information",
          "Try a different payment method",
          "Contact your bank if the issue persists",
          "Contact support for assistance",
        ],
      };
    }

    // File upload errors
    if (
      errorMessage.includes("upload") ||
      errorMessage.includes("file") ||
      errorMessage.includes("size") ||
      errorMessage.includes("format") ||
      context === "file_upload"
    ) {
      return {
        type: "file_upload",
        code: "FILE_UPLOAD_ERROR",
        message: errorMessage,
        recoverable: true,
        retryable: true,
        userMessage: "File upload issue. Please check your files and try again.",
        suggestedActions: [
          "Check file size (max 100MB per file)",
          "Ensure files are in supported formats",
          "Try uploading files one at a time",
          "Check your internet connection",
        ],
      };
    }

    // Default unknown error
    return {
      type: "unknown",
      code: "UNKNOWN_ERROR",
      message: errorMessage,
      recoverable: true,
      retryable: false,
      userMessage: "An unexpected error occurred. Please try again.",
      suggestedActions: [
        "Try refreshing the page",
        "Clear your browser cache",
        "Try using a different browser",
        "Contact support if the issue persists",
      ],
    };
  }, []);

  /**
   * Handle and track errors with comprehensive logging
   */
  const handleError = useCallback(
    (error: unknown, context?: string) => {
      const categorizedError = categorizeError(error, context);
      const errorStartTime = performance.now();

      // Map custom error types to supported error tracker types
      const mapErrorType = (
        type: string
      ): "api" | "validation" | "authentication" | "file_upload" | "network" | "critical" => {
        switch (type) {
          case "validation":
            return "validation";
          case "authentication":
            return "authentication";
          case "network":
            return "network";
          case "file_upload":
            return "file_upload";
          case "server":
          case "payment":
          case "unknown":
          default:
            return "api";
        }
      };

      // Track the error with comprehensive context
      const errorId = errorTracker.trackError(
        error instanceof Error ? error : new Error(String(error)),
        {
          errorType: mapErrorType(categorizedError.type),
          component: "reservation_error_handler",
          action: "handle_error",
          page: serviceName,
          errorCode: categorizedError.code,
          recoverable: categorizedError.recoverable,
          retryable: categorizedError.retryable,
          context: context || "unknown",
          retryCount: state.retryCount,
        }
      );

      // Log the error with detailed context
      logger.logError(
        `Reservation error in ${serviceName}: ${categorizedError.type}`,
        error instanceof Error ? error : new Error(String(error)),
        {
          errorType: mapErrorType(categorizedError.type),
          component: "reservation_error_handler",
          action: "handle_error",
          serviceName,
          errorId,
          context: context || "unknown",
          retryCount: state.retryCount,
          recoverable: categorizedError.recoverable,
          retryable: categorizedError.retryable,
        }
      );

      // Add breadcrumb for error
      addBreadcrumb({
        category: "error",
        message: `Reservation error: ${categorizedError.type} in ${serviceName}`,
        level: "error",
        data: {
          errorType: categorizedError.type,
          errorCode: categorizedError.code,
          errorId,
          serviceName,
          context: context || "unknown",
          retryCount: state.retryCount,
          recoverable: categorizedError.recoverable,
          retryable: categorizedError.retryable,
        },
      });

      // Record error performance metrics
      const errorHandlingTime = performance.now() - errorStartTime;
      performanceMonitor.recordMetric("error_handling_time", errorHandlingTime, "ms", {
        component: "reservation_error_handler",
        errorType: categorizedError.type,
        serviceName,
      });

      // Update state
      setState(prev => ({
        ...prev,
        hasError: true,
        error: categorizedError,
        errorHistory: [...prev.errorHistory, categorizedError],
      }));

      // Show toast notification if enabled
      if (showToastOnError) {
        toast({
          title: `${serviceName.charAt(0).toUpperCase() + serviceName.slice(1)} Error`,
          description: categorizedError.userMessage,
          variant: "destructive",
        });
      }

      // Call custom error handler
      if (onError) {
        onError(categorizedError);
      }

      // Auto-retry transient errors if enabled
      if (autoRetryTransientErrors && categorizedError.retryable && state.retryCount < maxRetries) {
        setTimeout(
          () => {
            // Inline retry logic to avoid circular dependency
            const newRetryCount = state.retryCount + 1;
            setState(prev => ({
              ...prev,
              retryCount: newRetryCount,
              isRecovering: true,
            }));
          },
          Math.pow(2, state.retryCount) * 1000
        ); // Exponential backoff
      }

      return categorizedError;
    },
    [
      categorizeError,
      serviceName,
      state.retryCount,
      showToastOnError,
      toast,
      onError,
      autoRetryTransientErrors,
      maxRetries,
    ]
  );

  /**
   * Retry the last failed operation
   */
  const retry = useCallback(() => {
    if (!state.error || !state.error.retryable || state.retryCount >= maxRetries) {
      return false;
    }

    const retryStartTime = performance.now();
    const newRetryCount = state.retryCount + 1;

    // Log retry attempt
    logger.logInfo(`Retrying reservation operation (${newRetryCount}/${maxRetries})`, {
      component: "reservation_error_handler",
      action: "retry_attempt",
      serviceName,
      errorType: state.error.type,
      retryCount: newRetryCount,
    });

    // Add breadcrumb for retry
    addBreadcrumb({
      category: "user_action",
      message: `Retrying reservation operation (${newRetryCount}/${maxRetries})`,
      level: "info",
      data: {
        serviceName,
        errorType: state.error.type,
        retryCount: newRetryCount,
      },
    });

    // Update state for retry
    setState(prev => ({
      ...prev,
      retryCount: newRetryCount,
      isRecovering: true,
    }));

    // Record retry performance metrics
    const retryTime = performance.now() - retryStartTime;
    performanceMonitor.recordMetric("error_retry_time", retryTime, "ms", {
      component: "reservation_error_handler",
      errorType: state.error.type,
      serviceName,
      retryCount: newRetryCount,
    });

    // Show retry toast
    if (showToastOnError) {
      toast({
        title: "Retrying...",
        description: `Attempt ${newRetryCount} of ${maxRetries}`,
        variant: "default",
      });
    }

    return true;
  }, [state.error, state.retryCount, maxRetries, serviceName, showToastOnError, toast]);

  /**
   * Clear error state and mark as recovered
   */
  const clearError = useCallback(() => {
    const recoveryStartTime = performance.now();

    // Log recovery
    logger.logInfo(`Clearing reservation error state for ${serviceName}`, {
      component: "reservation_error_handler",
      action: "clear_error",
      serviceName,
      hadError: state.hasError,
      errorType: state.error?.type,
      retryCount: state.retryCount,
    });

    // Add breadcrumb for recovery
    addBreadcrumb({
      category: "state_change",
      message: `Reservation error cleared for ${serviceName}`,
      level: "info",
      data: {
        serviceName,
        hadError: state.hasError,
        errorType: state.error?.type,
        retryCount: state.retryCount,
      },
    });

    // Update state
    setState(prev => ({
      ...prev,
      hasError: false,
      error: null,
      isRecovering: false,
    }));

    // Record recovery performance metrics
    const recoveryTime = performance.now() - recoveryStartTime;
    performanceMonitor.recordMetric("error_recovery_time", recoveryTime, "ms", {
      component: "reservation_error_handler",
      serviceName,
    });

    // Call custom recovery handler
    if (onRecovery) {
      onRecovery();
    }
  }, [serviceName, state.hasError, state.error?.type, state.retryCount, onRecovery]);

  /**
   * Reset all error state
   */
  const reset = useCallback(() => {
    setState({
      hasError: false,
      error: null,
      errorHistory: [],
      retryCount: 0,
      isRecovering: false,
    });
  }, []);

  /**
   * Get user-friendly error message with suggestions
   */
  const getErrorDisplay = useCallback(() => {
    if (!state.error) return null;

    return {
      title: `${state.error.type.charAt(0).toUpperCase() + state.error.type.slice(1)} Error`,
      message: state.error.userMessage,
      suggestions: state.error.suggestedActions,
      canRetry: state.error.retryable && state.retryCount < maxRetries,
      retryCount: state.retryCount,
      maxRetries,
    };
  }, [state.error, state.retryCount, maxRetries]);

  return {
    // State
    ...state,
    canRetry: state.error?.retryable && state.retryCount < maxRetries,

    // Actions
    handleError,
    retry,
    clearError,
    reset,

    // Utilities
    getErrorDisplay,
    categorizeError,
  };
}
