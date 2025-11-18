/**
 * Optimistic Update Feedback Component
 *
 * Displays user feedback notifications for optimistic updates including
 * success messages, error notifications with retry options, and loading states.
 */

import { useOptimisticUpdates } from "@/hooks/useOptimisticUpdates";
import type { FeedbackAction, UserFeedback } from "@/services/OptimisticUpdateManager";
import { AlertCircle, CheckCircle, Clock, RefreshCw, X } from "lucide-react";
import React, { useEffect, useState } from "react";

export interface OptimisticUpdateFeedbackProps {
  /** Custom CSS classes */
  className?: string;
  /** Position of the feedback notifications */
  position?:
    | "top-right"
    | "top-left"
    | "bottom-right"
    | "bottom-left"
    | "top-center"
    | "bottom-center";
  /** Maximum number of notifications to show */
  maxNotifications?: number;
  /** Whether to show pending update indicators */
  showPendingIndicator?: boolean;
}

/**
 * Feedback notification component for optimistic updates
 */
export const OptimisticUpdateFeedback: React.FC<OptimisticUpdateFeedbackProps> = ({
  className = "",
  position = "top-right",
  maxNotifications = 3,
  showPendingIndicator = true,
}) => {
  const { feedback, dismissFeedback, queueStatus, hasPendingUpdates } = useOptimisticUpdates({
    showFeedback: true,
  });

  const [notifications, setNotifications] = useState<UserFeedback[]>([]);

  // Add new feedback to notifications list
  useEffect(() => {
    if (feedback) {
      setNotifications(prev => {
        const newNotifications = [feedback, ...prev.filter(n => n.updateId !== feedback.updateId)];
        return newNotifications.slice(0, maxNotifications);
      });
    }
  }, [feedback, maxNotifications]);

  // Remove notification
  const removeNotification = (updateId: string) => {
    setNotifications(prev => prev.filter(n => n.updateId !== updateId));
    if (feedback?.updateId === updateId) {
      dismissFeedback();
    }
  };

  // Get position classes
  const getPositionClasses = () => {
    const baseClasses = "fixed z-50 flex flex-col gap-2";

    switch (position) {
      case "top-right":
        return `${baseClasses} top-4 right-4`;
      case "top-left":
        return `${baseClasses} top-4 left-4`;
      case "bottom-right":
        return `${baseClasses} bottom-4 right-4`;
      case "bottom-left":
        return `${baseClasses} bottom-4 left-4`;
      case "top-center":
        return `${baseClasses} top-4 left-1/2 transform -translate-x-1/2`;
      case "bottom-center":
        return `${baseClasses} bottom-4 left-1/2 transform -translate-x-1/2`;
      default:
        return `${baseClasses} top-4 right-4`;
    }
  };

  if (notifications.length === 0 && (!showPendingIndicator || !hasPendingUpdates)) {
    return null;
  }

  return (
    <div className={`${getPositionClasses()} ${className}`}>
      {/* Pending updates indicator */}
      {showPendingIndicator && hasPendingUpdates && (
        <PendingUpdatesIndicator queueStatus={queueStatus} />
      )}

      {/* Feedback notifications */}
      {notifications.map(notification => (
        <FeedbackNotification
          key={notification.updateId}
          feedback={notification}
          onDismiss={() => removeNotification(notification.updateId)}
        />
      ))}
    </div>
  );
};

/**
 * Individual feedback notification component
 */
interface FeedbackNotificationProps {
  feedback: UserFeedback;
  onDismiss: () => void;
}

const FeedbackNotification: React.FC<FeedbackNotificationProps> = ({ feedback, onDismiss }) => {
  const [isVisible, setIsVisible] = useState(false);

  // Animate in
  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 10);
    return () => clearTimeout(timer);
  }, []);

  // Auto-dismiss
  useEffect(() => {
    if (feedback.timeout) {
      const timer = setTimeout(() => {
        setIsVisible(false);
        setTimeout(onDismiss, 300); // Wait for animation
      }, feedback.timeout);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [feedback.timeout, onDismiss]);

  const getIcon = (): JSX.Element => {
    switch (feedback.type) {
      case "success":
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case "error":
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      case "warning":
        return <AlertCircle className="w-5 h-5 text-yellow-500" />;
      case "info":
        return <Clock className="w-5 h-5 text-blue-500" />;
      default:
        return <AlertCircle className="w-5 h-5 text-gray-500" />;
    }
  };

  const getBackgroundColor = (): string => {
    switch (feedback.type) {
      case "success":
        return "bg-green-50 border-green-200";
      case "error":
        return "bg-red-50 border-red-200";
      case "warning":
        return "bg-yellow-50 border-yellow-200";
      case "info":
        return "bg-blue-50 border-blue-200";
      default:
        return "bg-gray-50 border-gray-200";
    }
  };

  const handleActionClick = (action: FeedbackAction): void => {
    action.handler();
    if (action.type === "dismiss") {
      onDismiss();
    }
  };

  return (
    <div
      className={`
        transform transition-all duration-300 ease-in-out
        ${isVisible ? "translate-x-0 opacity-100" : "translate-x-full opacity-0"}
        ${getBackgroundColor()}
        border rounded-lg shadow-lg p-4 min-w-80 max-w-md
      `}
    >
      <div className="flex items-start gap-3">
        {getIcon()}

        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 break-words">{feedback.message}</p>

          {feedback.actions && feedback.actions.length > 0 && (
            <div className="flex gap-2 mt-3">
              {feedback.actions.map(action => (
                <button
                  key={`${feedback.updateId}-${action.type}-${action.label}`}
                  onClick={() => handleActionClick(action)}
                  className={`
                    px-3 py-1 text-xs font-medium rounded-md transition-colors
                    ${
                      action.type === "retry"
                        ? "bg-blue-600 text-white hover:bg-blue-700"
                        : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                    }
                  `}
                >
                  {action.type === "retry" && <RefreshCw className="w-3 h-3 mr-1 inline" />}
                  {action.label}
                </button>
              ))}
            </div>
          )}
        </div>

        <button
          onClick={onDismiss}
          className="flex-shrink-0 p-1 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

/**
 * Pending updates indicator component
 */
interface QueueStatus {
  totalPending: number;
  failed: unknown[];
}

interface PendingUpdatesIndicatorProps {
  queueStatus: QueueStatus;
}

const PendingUpdatesIndicator: React.FC<PendingUpdatesIndicatorProps> = ({ queueStatus }) => {
  if (queueStatus.totalPending === 0) {
    return null;
  }

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg shadow-sm p-3 min-w-80">
      <div className="flex items-center gap-3">
        <div className="animate-spin">
          <RefreshCw className="w-4 h-4 text-blue-500" />
        </div>

        <div className="flex-1">
          <p className="text-sm font-medium text-blue-900">
            {queueStatus.totalPending === 1
              ? "1 update in progress..."
              : `${queueStatus.totalPending} updates in progress...`}
          </p>

          {queueStatus.failed.length > 0 && (
            <p className="text-xs text-red-600 mt-1">
              {queueStatus.failed.length} failed (will retry automatically)
            </p>
          )}
        </div>
      </div>

      {/* Progress bar */}
      <div className="mt-2 bg-blue-100 rounded-full h-1">
        <div
          className="bg-blue-500 h-1 rounded-full transition-all duration-300 animate-pulse"
          style={{
            width: queueStatus.totalPending > 0 ? "100%" : "0%",
          }}
        />
      </div>
    </div>
  );
};

export default OptimisticUpdateFeedback;
