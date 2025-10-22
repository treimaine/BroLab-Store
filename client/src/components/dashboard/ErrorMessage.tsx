/**
 * Error Message Component
 *
 * Displays user-friendly error messages with actionable recovery options.
 * Provides clear guidance and recovery actions for dashboard sync errors.
 *
 * Requirements addressed:
 * - 9.3: User-friendly error messages with actionable recovery options
 * - 10.3: Manual sync trigger and error recovery
 */

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  getErrorMessage,
  getSeverityColor,
  type RecoveryAction,
} from "@/services/config/ErrorMessages";
import type { EnhancedSyncError } from "@shared/types/sync";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Clock,
  Database,
  Lock,
  RefreshCw,
  ShieldAlert,
  WifiOff,
  X,
} from "lucide-react";
import { memo, useCallback, useState } from "react";

/**
 * Icon mapping for error types
 */
const ICON_MAP = {
  "wifi-off": WifiOff,
  "alert-circle": AlertCircle,
  "shield-alert": ShieldAlert,
  "refresh-cw": RefreshCw,
  database: Database,
  clock: Clock,
  lock: Lock,
} as const;

/**
 * Props for ErrorMessage component
 */
export interface ErrorMessageProps {
  /** The enhanced sync error to display */
  error: EnhancedSyncError;
  /** Callback when an action is executed */
  onAction?: (actionId: string) => void | Promise<void>;
  /** Callback when the error is dismissed */
  onDismiss?: () => void;
  /** Whether to show the error in compact mode */
  compact?: boolean;
  /** Whether to show technical details by default */
  showTechnicalDetails?: boolean;
  /** Additional CSS classes */
  className?: string;
}

/**
 * ErrorMessage Component
 *
 * Displays user-friendly error messages with recovery actions
 */
export const ErrorMessage = memo<ErrorMessageProps>(
  ({
    error,
    onAction,
    onDismiss,
    compact = false,
    showTechnicalDetails: showTechnicalDetailsProp,
    className = "",
  }) => {
    const [showDetails, setShowDetails] = useState(false);
    const [isExecuting, setIsExecuting] = useState<string | null>(null);

    // Get error message configuration
    const errorConfig = getErrorMessage(error.type);
    const severityColors = getSeverityColor(errorConfig.severity);

    // Determine if technical details should be shown
    const shouldShowTechnicalDetails = showTechnicalDetailsProp ?? errorConfig.showTechnicalDetails;

    // Get icon component
    const IconComponent = ICON_MAP[errorConfig.icon];

    /**
     * Handle action execution
     */
    const handleAction = useCallback(
      async (action: RecoveryAction) => {
        if (!action.available || isExecuting) return;

        setIsExecuting(action.id);

        try {
          // Execute custom handler if provided
          if (action.handler) {
            await action.handler();
          }

          // Execute callback
          if (onAction) {
            await onAction(action.id);
          }

          // Handle built-in action types
          switch (action.type) {
            case "reload":
              globalThis.location.reload();
              break;
            case "dismiss":
              onDismiss?.();
              break;
            // Other action types are handled by the callback
          }
        } catch (actionError) {
          console.error("Error executing action:", actionError);
        } finally {
          setIsExecuting(null);
        }
      },
      [isExecuting, onAction, onDismiss]
    );

    /**
     * Toggle technical details visibility
     */
    const toggleDetails = useCallback(() => {
      setShowDetails(prev => !prev);
    }, []);

    // Compact mode rendering
    if (compact) {
      return (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className={`flex items-center space-x-2 p-3 rounded-lg ${severityColors.bg} ${severityColors.border} border ${className}`}
        >
          <IconComponent className={`h-4 w-4 flex-shrink-0 ${severityColors.icon}`} />
          <p className={`text-sm flex-1 ${severityColors.text}`}>{errorConfig.shortMessage}</p>
          {errorConfig.recoveryActions
            .filter(action => action.primary && action.available)
            .map(action => (
              <Button
                key={action.id}
                size="sm"
                variant="ghost"
                onClick={() => handleAction(action)}
                disabled={isExecuting === action.id}
                className="h-7 px-2 text-xs"
              >
                {isExecuting === action.id ? "..." : action.label}
              </Button>
            ))}
          {onDismiss && (
            <button
              onClick={onDismiss}
              className={`p-1 rounded hover:bg-gray-700/50 transition-colors ${severityColors.text}`}
              aria-label="Dismiss error"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </motion.div>
      );
    }

    // Full mode rendering
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        className={className}
      >
        <Card className={`${severityColors.bg} ${severityColors.border} border backdrop-blur-sm`}>
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <div className="flex items-start space-x-3 flex-1">
                <div className={`p-2 rounded-lg ${severityColors.bg}`}>
                  <IconComponent className={`h-5 w-5 ${severityColors.icon}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <CardTitle className={`text-base font-semibold ${severityColors.text}`}>
                    {errorConfig.title}
                  </CardTitle>
                  <CardDescription className="text-sm text-gray-300 mt-1">
                    {errorConfig.message}
                  </CardDescription>
                </div>
              </div>
              {onDismiss && (
                <button
                  onClick={onDismiss}
                  className="p-1 rounded hover:bg-gray-700/50 transition-colors text-gray-400 hover:text-gray-300"
                  aria-label="Dismiss error"
                >
                  <X className="h-5 w-5" />
                </button>
              )}
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            {/* Recovery Actions */}
            <div className="flex flex-wrap gap-2">
              {errorConfig.recoveryActions
                .filter(action => action.available)
                .map(action => (
                  <Button
                    key={action.id}
                    size="sm"
                    variant={action.primary ? "default" : "outline"}
                    onClick={() => handleAction(action)}
                    disabled={isExecuting === action.id}
                    className={
                      action.primary
                        ? "bg-purple-600 hover:bg-purple-700 text-white"
                        : "border-gray-600 text-gray-300 hover:bg-gray-700/50"
                    }
                    title={action.description}
                  >
                    {isExecuting === action.id ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      action.label
                    )}
                  </Button>
                ))}
            </div>

            {/* Technical Details (Collapsible) */}
            {shouldShowTechnicalDetails && error.technicalDetails && (
              <div className="border-t border-gray-700/50 pt-3">
                <button
                  onClick={toggleDetails}
                  className="flex items-center space-x-2 text-sm text-gray-400 hover:text-gray-300 transition-colors"
                >
                  {showDetails ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                  <span>{showDetails ? "Hide" : "Show"} Technical Details</span>
                </button>

                <AnimatePresence>
                  {showDetails && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="mt-3 space-y-2 text-xs text-gray-400 font-mono"
                    >
                      <div className="bg-gray-900/50 rounded p-3 space-y-1">
                        <div>
                          <span className="text-gray-500">Error Type:</span>{" "}
                          <span className="text-gray-300">{error.type}</span>
                        </div>
                        {error.code && (
                          <div>
                            <span className="text-gray-500">Error Code:</span>{" "}
                            <span className="text-gray-300">{error.code}</span>
                          </div>
                        )}
                        <div>
                          <span className="text-gray-500">Timestamp:</span>{" "}
                          <span className="text-gray-300">
                            {new Date(error.timestamp).toLocaleString()}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-500">Severity:</span>{" "}
                          <span className="text-gray-300">{error.severity}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Category:</span>{" "}
                          <span className="text-gray-300">{error.category}</span>
                        </div>
                        {error.retryCount > 0 && (
                          <div>
                            <span className="text-gray-500">Retry Count:</span>{" "}
                            <span className="text-gray-300">
                              {error.retryCount} / {error.maxRetries}
                            </span>
                          </div>
                        )}
                        {error.technicalDetails.environment && (
                          <>
                            <div className="pt-2 border-t border-gray-700/50">
                              <span className="text-gray-500">Connection:</span>{" "}
                              <span className="text-gray-300">
                                {error.technicalDetails.environment.onlineStatus
                                  ? "Online"
                                  : "Offline"}
                                {error.technicalDetails.environment.connectionType &&
                                  ` (${error.technicalDetails.environment.connectionType})`}
                              </span>
                            </div>
                            <div>
                              <span className="text-gray-500">URL:</span>{" "}
                              <span className="text-gray-300 break-all">
                                {error.technicalDetails.environment.url}
                              </span>
                            </div>
                          </>
                        )}
                        {error.technicalDetails.stackTrace && (
                          <div className="pt-2 border-t border-gray-700/50">
                            <span className="text-gray-500">Stack Trace:</span>
                            <pre className="mt-1 text-xs text-gray-400 overflow-x-auto whitespace-pre-wrap break-words">
                              {error.technicalDetails.stackTrace.substring(0, 500)}
                              {error.technicalDetails.stackTrace.length > 500 && "..."}
                            </pre>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    );
  }
);

ErrorMessage.displayName = "ErrorMessage";

export default ErrorMessage;
