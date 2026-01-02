/**
 * Error Notification Component
 *
 * User-friendly error notifications with actionable recovery options.
 * Displays sync errors with appropriate severity styling and recovery actions.
 */

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import type { EnhancedSyncError, RecoveryAttempt } from "@/services/ErrorHandlingManager";
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Info,
  Loader2,
  RefreshCw,
  WifiOff,
  X,
} from "lucide-react";
import React, { useCallback, useEffect, useState } from "react";

// ================================
// COMPONENT INTERFACES
// ================================

export interface ErrorNotificationProps {
  /** The error to display */
  error: EnhancedSyncError;
  /** Recovery status information */
  recoveryStatus?: {
    inProgress: boolean;
    attempts: RecoveryAttempt[];
    canRetry: boolean;
    nextAttemptAt?: number;
  };
  /** Whether to show technical details */
  showTechnicalDetails?: boolean;
  /** Whether the notification can be dismissed */
  dismissible?: boolean;
  /** Auto-dismiss timeout in milliseconds */
  autoDismissTimeout?: number;
  /** Callback when notification is dismissed */
  onDismiss?: () => void;
  /** Callback when user action is executed */
  onUserAction?: (actionId: string) => void;
  /** Custom CSS classes */
  className?: string;
}

export interface ErrorNotificationListProps {
  /** List of errors to display */
  errors: EnhancedSyncError[];
  /** Recovery status for each error */
  recoveryStatuses?: Record<
    string,
    {
      inProgress: boolean;
      attempts: RecoveryAttempt[];
      canRetry: boolean;
      nextAttemptAt?: number;
    }
  >;
  /** Maximum number of errors to show */
  maxErrors?: number;
  /** Whether to group similar errors */
  groupSimilarErrors?: boolean;
  /** Callback when an error is dismissed */
  onDismissError?: (errorId: string) => void;
  /** Callback when user action is executed */
  onUserAction?: (errorId: string, actionId: string) => void;
  /** Custom CSS classes */
  className?: string;
}

// ================================
// ERROR NOTIFICATION COMPONENT
// ================================

export const ErrorNotification: React.FC<ErrorNotificationProps> = ({
  error,
  recoveryStatus,
  showTechnicalDetails = false,
  dismissible = true,
  autoDismissTimeout,
  onDismiss,
  onUserAction,
  className = "",
}) => {
  const { toast } = useToast();
  const [isExpanded, setIsExpanded] = useState(false);
  const [timeUntilNextRetry, setTimeUntilNextRetry] = useState<number | null>(null);
  const [isDismissed, setIsDismissed] = useState(false);

  // Define handleDismiss before using it in useEffect
  const handleDismiss = useCallback(() => {
    setIsDismissed(true);
    onDismiss?.();
  }, [onDismiss]);

  // Auto-dismiss timer
  useEffect(() => {
    if (autoDismissTimeout && autoDismissTimeout > 0) {
      const timer = setTimeout(() => {
        handleDismiss();
      }, autoDismissTimeout);

      return () => clearTimeout(timer);
    }
    return undefined;
  }, [autoDismissTimeout, handleDismiss]);

  // Countdown timer for next retry
  useEffect(() => {
    if (recoveryStatus?.nextAttemptAt) {
      const updateCountdown = () => {
        const now = Date.now();
        const timeLeft = recoveryStatus.nextAttemptAt! - now;

        if (timeLeft > 0) {
          setTimeUntilNextRetry(Math.ceil(timeLeft / 1000));
        } else {
          setTimeUntilNextRetry(null);
        }
      };

      updateCountdown();
      const interval = setInterval(updateCountdown, 1000);

      return () => clearInterval(interval);
    } else {
      setTimeUntilNextRetry(null);
      return undefined;
    }
  }, [recoveryStatus?.nextAttemptAt]);

  const handleUserAction = useCallback(
    (actionId: string) => {
      onUserAction?.(actionId);

      // Show feedback for user action
      const action = error.userActions.find(a => a.id === actionId);
      if (action) {
        toast({
          title: "Action Executed",
          description: `${action.label}: ${action.description}`,
          duration: 3000,
        });
      }
    },
    [error.userActions, onUserAction, toast]
  );

  const getSeverityIcon = () => {
    switch (error.severity) {
      case "critical":
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      case "high":
        return <AlertTriangle className="h-5 w-5 text-orange-500" />;
      case "medium":
        return <Info className="h-5 w-5 text-yellow-500" />;
      case "low":
      default:
        return <Info className="h-5 w-5 text-blue-500" />;
    }
  };

  const getSeverityColor = () => {
    switch (error.severity) {
      case "critical":
        return "border-red-200 bg-red-50";
      case "high":
        return "border-orange-200 bg-orange-50";
      case "medium":
        return "border-yellow-200 bg-yellow-50";
      case "low":
      default:
        return "border-blue-200 bg-blue-50";
    }
  };

  const getRecoveryProgress = () => {
    if (!recoveryStatus?.attempts.length) return 0;

    const totalAttempts = error.maxRetries;
    const currentAttempts = recoveryStatus.attempts.length;
    return (currentAttempts / totalAttempts) * 100;
  };

  if (isDismissed) {
    return null;
  }

  return (
    <Card className={`${getSeverityColor()} ${className}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-2">
            {getSeverityIcon()}
            <div>
              <CardTitle className="text-sm font-medium">
                {error.category === "connection" && <WifiOff className="inline h-4 w-4 mr-1" />}
                Sync Error
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                {new Date(error.timestamp).toLocaleTimeString()}
              </CardDescription>
            </div>
          </div>

          <div className="flex items-center space-x-1">
            {recoveryStatus?.inProgress && (
              <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
            )}
            {dismissible && (
              <Button variant="ghost" size="sm" onClick={handleDismiss} className="h-6 w-6 p-0">
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        {/* Error Message */}
        <p className="text-sm text-gray-700 mb-3">{error.userMessage}</p>

        {/* Recovery Progress */}
        {recoveryStatus?.inProgress && (
          <div className="mb-3">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
              <span>Recovery in progress...</span>
              <span>
                {recoveryStatus.attempts.length}/{error.maxRetries} attempts
              </span>
            </div>
            <Progress value={getRecoveryProgress()} className="h-2" />
          </div>
        )}

        {/* Next Retry Countdown */}
        {timeUntilNextRetry && (
          <div className="flex items-center space-x-2 text-xs text-muted-foreground mb-3">
            <RefreshCw className="h-3 w-3" />
            <span>Next retry in {timeUntilNextRetry}s</span>
          </div>
        )}

        {/* User Actions */}
        {error.userActions.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-3">
            {error.userActions
              .filter(action => action.available)
              .map(action => (
                <Button
                  key={action.id}
                  variant={action.primary ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleUserAction(action.id)}
                  disabled={recoveryStatus?.inProgress}
                  className="text-xs"
                >
                  {action.type === "retry" && <RefreshCw className="h-3 w-3 mr-1" />}
                  {action.label}
                </Button>
              ))}
          </div>
        )}

        {/* Technical Details Toggle */}
        {showTechnicalDetails && (
          <div className="border-t pt-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-xs p-0 h-auto"
            >
              {isExpanded ? "Hide" : "Show"} Technical Details
            </Button>

            {isExpanded && (
              <div className="mt-2 p-2 bg-gray-100 rounded text-xs font-mono">
                <div>
                  <strong>Type:</strong> {error.type}
                </div>
                <div>
                  <strong>Code:</strong> {error.code || "N/A"}
                </div>
                <div>
                  <strong>Fingerprint:</strong> {error.fingerprint}
                </div>
                <div>
                  <strong>Retryable:</strong> {error.retryable ? "Yes" : "No"}
                </div>
                {error.technicalDetails.stackTrace && (
                  <details className="mt-2">
                    <summary className="cursor-pointer">Stack Trace</summary>
                    <pre className="mt-1 text-xs overflow-x-auto">
                      {error.technicalDetails.stackTrace}
                    </pre>
                  </details>
                )}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// ================================
// ERROR NOTIFICATION LIST COMPONENT
// ================================

export const ErrorNotificationList: React.FC<ErrorNotificationListProps> = ({
  errors,
  recoveryStatuses = {},
  maxErrors = 5,
  groupSimilarErrors = true,
  onDismissError,
  onUserAction,
  className = "",
}) => {
  const [dismissedErrors, setDismissedErrors] = useState<Set<string>>(new Set());

  const handleDismissError = useCallback(
    (errorId: string) => {
      setDismissedErrors(prev => new Set(prev).add(errorId));
      onDismissError?.(errorId);
    },
    [onDismissError]
  );

  const handleUserAction = useCallback(
    (errorId: string, actionId: string) => {
      onUserAction?.(errorId, actionId);
    },
    [onUserAction]
  );

  // Group similar errors if enabled
  const processedErrors = React.useMemo(() => {
    let filteredErrors = errors.filter(error => !dismissedErrors.has(error.fingerprint));

    if (groupSimilarErrors) {
      const errorGroups = new Map<string, EnhancedSyncError[]>();

      for (const error of filteredErrors) {
        const groupKey = `${error.type}-${error.category}`;
        if (!errorGroups.has(groupKey)) {
          errorGroups.set(groupKey, []);
        }
        errorGroups.get(groupKey)!.push(error);
      }

      // Take the most recent error from each group
      filteredErrors = Array.from(errorGroups.values()).map(
        group => group.toSorted((a, b) => b.timestamp - a.timestamp)[0]
      );
    }

    return filteredErrors.toSorted((a, b) => b.timestamp - a.timestamp).slice(0, maxErrors);
  }, [errors, dismissedErrors, groupSimilarErrors, maxErrors]);

  if (processedErrors.length === 0) {
    return null;
  }

  return (
    <div className={`space-y-3 ${className}`}>
      {processedErrors.map(error => (
        <ErrorNotification
          key={error.fingerprint}
          error={error}
          recoveryStatus={recoveryStatuses[error.fingerprint]}
          showTechnicalDetails={process.env.NODE_ENV === "development"}
          dismissible={true}
          autoDismissTimeout={error.severity === "low" ? 10000 : undefined}
          onDismiss={() => handleDismissError(error.fingerprint)}
          onUserAction={actionId => handleUserAction(error.fingerprint, actionId)}
        />
      ))}

      {errors.length > maxErrors && (
        <Card className="border-gray-200 bg-gray-50">
          <CardContent className="p-3">
            <p className="text-xs text-muted-foreground text-center">
              {errors.length - maxErrors} more error{errors.length - maxErrors === 1 ? "" : "s"} not
              shown
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

// ================================
// ERROR SUMMARY COMPONENT
// ================================

export interface ErrorSummaryProps {
  /** Total number of errors */
  totalErrors: number;
  /** Number of active recoveries */
  activeRecoveries: number;
  /** Overall recovery success rate */
  successRate: number;
  /** Whether sync is currently healthy */
  isHealthy: boolean;
  /** Callback to clear all errors */
  onClearAll?: () => void;
  /** Custom CSS classes */
  className?: string;
}

export const ErrorSummary: React.FC<ErrorSummaryProps> = ({
  totalErrors,
  activeRecoveries,
  successRate,
  isHealthy,
  onClearAll,
  className = "",
}) => {
  const getHealthIcon = () => {
    if (isHealthy) {
      return <CheckCircle2 className="h-4 w-4 text-green-500" />;
    } else if (activeRecoveries > 0) {
      return <Loader2 className="h-4 w-4 animate-spin text-yellow-500" />;
    } else {
      return <AlertCircle className="h-4 w-4 text-red-500" />;
    }
  };

  const getHealthStatus = () => {
    if (isHealthy) return "All systems operational";
    if (activeRecoveries > 0)
      return `${activeRecoveries} recovery${activeRecoveries === 1 ? "" : "ies"} in progress`;
    return "Sync issues detected";
  };

  return (
    <Card className={`border-gray-200 ${className}`}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {getHealthIcon()}
            <div>
              <p className="text-sm font-medium">{getHealthStatus()}</p>
              <p className="text-xs text-muted-foreground">
                {totalErrors} total error{totalErrors === 1 ? "" : "s"} • {successRate.toFixed(1)}%
                recovery rate
              </p>
            </div>
          </div>

          {totalErrors > 0 && onClearAll && (
            <Button variant="outline" size="sm" onClick={onClearAll} className="text-xs">
              Clear All
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
