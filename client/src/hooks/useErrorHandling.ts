/**
 * Error Handling Hook
 *
 * React hook for integrating the ErrorHandlingManager with dashboard components.
 * Provides error handling, recovery management, and user notification capabilities.
 */

import { useToast } from "@/hooks/use-toast";
import type {
  EnhancedSyncError,
  ErrorContext,
  ErrorHandlingConfig,
  RecoveryAttempt,
  UserAction,
} from "@/services/ErrorHandlingManager";
import { getErrorHandlingManager } from "@/services/ErrorHandlingManager";
import { useCallback, useEffect, useRef, useState } from "react";

// ================================
// HOOK INTERFACES
// ================================

export interface UseErrorHandlingOptions {
  /** Component name for error context */
  component?: string;
  /** Whether to show toast notifications */
  showToasts?: boolean;
  /** Whether to auto-retry recoverable errors */
  autoRetry?: boolean;
  /** Maximum number of auto-retry attempts */
  maxRetries?: number;
  /** Custom error handling configuration */
  config?: Partial<ErrorHandlingConfig>;
  /** Callback when an error occurs */
  onError?: (error: EnhancedSyncError) => void;
  /** Callback when recovery succeeds */
  onRecoverySuccess?: (error: EnhancedSyncError) => void;
  /** Callback when recovery fails */
  onRecoveryFailure?: (error: EnhancedSyncError) => void;
}

export interface ErrorHandlingState {
  /** Current errors */
  errors: EnhancedSyncError[];
  /** Recovery status for each error */
  recoveryStatuses: Record<
    string,
    {
      inProgress: boolean;
      attempts: RecoveryAttempt[];
      canRetry: boolean;
      nextAttemptAt?: number;
    }
  >;
  /** Whether any recovery is in progress */
  hasActiveRecoveries: boolean;
  /** Overall error statistics */
  analytics: {
    totalErrors: number;
    errorsByType: Record<string, number>;
    errorsBySeverity: Record<string, number>;
    recoverySuccessRate: number;
    averageRecoveryTime: number;
  };
  /** Whether the system is currently healthy */
  isHealthy: boolean;
}

export interface ErrorHandlingActions {
  /** Handle a new error */
  handleError: (error: unknown, context?: Partial<ErrorContext>) => Promise<EnhancedSyncError>;
  /** Attempt recovery for a specific error */
  attemptRecovery: (errorId: string) => Promise<boolean>;
  /** Execute a user action for an error */
  executeUserAction: (errorId: string, actionId: string) => Promise<boolean>;
  /** Dismiss a specific error */
  dismissError: (errorId: string) => void;
  /** Clear all errors */
  clearAllErrors: () => void;
  /** Get available user actions for an error */
  getUserActions: (errorId: string) => UserAction[];
  /** Refresh error analytics */
  refreshAnalytics: () => void;
}

// ================================
// ERROR HANDLING HOOK
// ================================

export const useErrorHandling = (
  options: UseErrorHandlingOptions = {}
): ErrorHandlingState & ErrorHandlingActions => {
  const {
    component = "dashboard",
    showToasts = true,
    autoRetry: _autoRetry = true,
    maxRetries: _maxRetries = 3,
    config,
    onError,
    onRecoverySuccess,
    onRecoveryFailure,
  } = options;

  const { toast } = useToast();
  const errorManagerRef = useRef(getErrorHandlingManager(config));
  const [state, setState] = useState<ErrorHandlingState>({
    errors: [],
    recoveryStatuses: {},
    hasActiveRecoveries: false,
    analytics: {
      totalErrors: 0,
      errorsByType: {},
      errorsBySeverity: {},
      recoverySuccessRate: 0,
      averageRecoveryTime: 0,
    },
    isHealthy: true,
  });

  // ================================
  // ERROR MANAGER EVENT HANDLERS
  // ================================

  useEffect(() => {
    const errorManager = errorManagerRef.current;

    // Error event handler
    const handleErrorEvent = (error: EnhancedSyncError) => {
      setState(prev => ({
        ...prev,
        errors: [...prev.errors, error],
        isHealthy: false,
      }));

      // Show toast notification if enabled
      if (showToasts) {
        toast({
          title: "Sync Error",
          description: error.userMessage,
          variant: "destructive",
          duration: error.severity === "critical" ? 0 : 5000, // Critical errors don't auto-dismiss
        });
      }

      // Call custom error handler
      onError?.(error);

      // Update analytics
      refreshAnalytics();
    };

    // Recovery started handler
    const handleRecoveryStarted = ({ error }: { error: EnhancedSyncError }) => {
      setState(prev => ({
        ...prev,
        recoveryStatuses: {
          ...prev.recoveryStatuses,
          [error.fingerprint]: {
            ...prev.recoveryStatuses[error.fingerprint],
            inProgress: true,
          },
        },
        hasActiveRecoveries: true,
      }));

      if (showToasts) {
        toast({
          title: "Recovery Started",
          description: `Attempting to recover from ${error.type}`,
          duration: 3000,
        });
      }
    };

    // Recovery success handler
    const handleRecoverySuccess = ({ error }: { error: EnhancedSyncError }) => {
      setState(prev => {
        const newRecoveryStatuses = { ...prev.recoveryStatuses };
        if (newRecoveryStatuses[error.fingerprint]) {
          newRecoveryStatuses[error.fingerprint].inProgress = false;
        }

        const hasActiveRecoveries = Object.values(newRecoveryStatuses).some(
          status => status.inProgress
        );

        return {
          ...prev,
          recoveryStatuses: newRecoveryStatuses,
          hasActiveRecoveries,
          isHealthy: !hasActiveRecoveries && prev.errors.length === 0,
        };
      });

      if (showToasts) {
        toast({
          title: "Recovery Successful",
          description: "The sync error has been resolved",
          variant: "default",
          duration: 3000,
        });
      }

      onRecoverySuccess?.(error);
      refreshAnalytics();
    };

    // Recovery failure handler
    const handleRecoveryFailure = ({ error }: { error: EnhancedSyncError }) => {
      setState(prev => {
        const newRecoveryStatuses = { ...prev.recoveryStatuses };
        if (newRecoveryStatuses[error.fingerprint]) {
          newRecoveryStatuses[error.fingerprint].inProgress = false;
        }

        const hasActiveRecoveries = Object.values(newRecoveryStatuses).some(
          status => status.inProgress
        );

        return {
          ...prev,
          recoveryStatuses: newRecoveryStatuses,
          hasActiveRecoveries,
        };
      });

      if (showToasts) {
        toast({
          title: "Recovery Failed",
          description: "Unable to automatically resolve the error",
          variant: "destructive",
          duration: 5000,
        });
      }

      onRecoveryFailure?.(error);
      refreshAnalytics();
    };

    // User action handler
    const handleUserAction = ({ action, errorId }: { action: string; errorId: string }) => {
      if (action === "dismiss") {
        dismissError(errorId);
      } else if (action === "refresh") {
        // Emit refresh event for dashboard components to handle
        window.dispatchEvent(new CustomEvent("dashboard:refresh"));
      } else if (action === "contact_support") {
        // Open support contact (could be a modal, email, or external link)
        window.open("mailto:support@brolab.com?subject=Dashboard Sync Error", "_blank");
      }
    };

    // Register event listeners
    errorManager.on("error", handleErrorEvent);
    errorManager.on("recovery_started", handleRecoveryStarted);
    errorManager.on("recovery_success", handleRecoverySuccess);
    errorManager.on("recovery_failure", handleRecoveryFailure);
    errorManager.on("user_action", handleUserAction);

    // Cleanup on unmount
    return () => {
      errorManager.off("error", handleErrorEvent);
      errorManager.off("recovery_started", handleRecoveryStarted);
      errorManager.off("recovery_success", handleRecoverySuccess);
      errorManager.off("recovery_failure", handleRecoveryFailure);
      errorManager.off("user_action", handleUserAction);
    };
  }, [showToasts, toast, onError, onRecoverySuccess, onRecoveryFailure]);

  // ================================
  // ACTION HANDLERS
  // ================================

  const handleError = useCallback(
    async (error: unknown, context: Partial<ErrorContext> = {}): Promise<EnhancedSyncError> => {
      const errorContext: Partial<ErrorContext> = {
        component,
        sessionId: `session_${Date.now()}`,
        ...context,
      };

      return errorManagerRef.current.handleError(error, errorContext);
    },
    [component]
  );

  const attemptRecovery = useCallback(async (errorId: string): Promise<boolean> => {
    const success = await errorManagerRef.current.attemptRecovery(errorId);

    // Update recovery status
    const recoveryStatus = errorManagerRef.current.getRecoveryStatus(errorId);
    setState(prev => ({
      ...prev,
      recoveryStatuses: {
        ...prev.recoveryStatuses,
        [errorId]: recoveryStatus,
      },
    }));

    return success;
  }, []);

  const executeUserAction = useCallback(
    async (errorId: string, actionId: string): Promise<boolean> => {
      return errorManagerRef.current.executeUserAction(errorId, actionId);
    },
    []
  );

  const dismissError = useCallback((errorId: string) => {
    setState(prev => ({
      ...prev,
      errors: prev.errors.filter(error => error.fingerprint !== errorId),
      recoveryStatuses: {
        ...prev.recoveryStatuses,
        [errorId]: {
          ...prev.recoveryStatuses[errorId],
          inProgress: false,
        },
      },
    }));

    // Check if system is healthy after dismissing error
    setState(prev => ({
      ...prev,
      isHealthy: prev.errors.length === 0 && !prev.hasActiveRecoveries,
    }));
  }, []);

  const clearAllErrors = useCallback(() => {
    errorManagerRef.current.clearErrorHistory();
    setState(prev => ({
      ...prev,
      errors: [],
      recoveryStatuses: {},
      hasActiveRecoveries: false,
      isHealthy: true,
    }));

    if (showToasts) {
      toast({
        title: "Errors Cleared",
        description: "All error notifications have been cleared",
        duration: 3000,
      });
    }
  }, [showToasts, toast]);

  const getUserActions = useCallback((errorId: string): UserAction[] => {
    return errorManagerRef.current.getUserActions(errorId);
  }, []);

  const refreshAnalytics = useCallback(() => {
    const analytics = errorManagerRef.current.getErrorAnalytics();
    setState(prev => ({
      ...prev,
      analytics: {
        totalErrors: analytics.totalErrors,
        errorsByType: analytics.errorsByType,
        errorsBySeverity: analytics.errorsBySeverity,
        recoverySuccessRate: analytics.recoverySuccessRate,
        averageRecoveryTime: analytics.averageRecoveryTime,
      },
    }));
  }, []);

  // ================================
  // PERIODIC UPDATES
  // ================================

  useEffect(() => {
    // Update recovery statuses periodically
    const updateRecoveryStatuses = () => {
      const newRecoveryStatuses: Record<string, any> = {};
      let hasActiveRecoveries = false;

      for (const error of state.errors) {
        const status = errorManagerRef.current.getRecoveryStatus(error.fingerprint);
        newRecoveryStatuses[error.fingerprint] = status;
        if (status.inProgress) {
          hasActiveRecoveries = true;
        }
      }

      setState(prev => ({
        ...prev,
        recoveryStatuses: newRecoveryStatuses,
        hasActiveRecoveries,
        isHealthy: prev.errors.length === 0 && !hasActiveRecoveries,
      }));
    };

    const interval = setInterval(updateRecoveryStatuses, 1000);
    return () => clearInterval(interval);
  }, [state.errors]);

  // Initial analytics load
  useEffect(() => {
    refreshAnalytics();
  }, [refreshAnalytics]);

  return {
    // State
    ...state,

    // Actions
    handleError,
    attemptRecovery,
    executeUserAction,
    dismissError,
    clearAllErrors,
    getUserActions,
    refreshAnalytics,
  };
};

// ================================
// SPECIALIZED HOOKS
// ================================

/**
 * Hook for handling sync-specific errors
 */
export const useSyncErrorHandling = (options: UseErrorHandlingOptions = {}) => {
  return useErrorHandling({
    ...options,
    component: "sync_manager",
    config: {
      ...options.config,
      defaultRecoveryStrategy: "exponential_backoff",
      autoRetry: true,
      maxAutoRetries: 3,
    },
  });
};

/**
 * Hook for handling connection-specific errors
 */
export const useConnectionErrorHandling = (options: UseErrorHandlingOptions = {}) => {
  return useErrorHandling({
    ...options,
    component: "connection_manager",
    config: {
      ...options.config,
      defaultRecoveryStrategy: "fallback_connection",
      autoRetry: true,
      maxAutoRetries: 5,
    },
  });
};

/**
 * Hook for handling data consistency errors
 */
export const useDataConsistencyErrorHandling = (options: UseErrorHandlingOptions = {}) => {
  return useErrorHandling({
    ...options,
    component: "data_consistency",
    config: {
      ...options.config,
      defaultRecoveryStrategy: "force_sync",
      autoRetry: true,
      maxAutoRetries: 2,
    },
  });
};
