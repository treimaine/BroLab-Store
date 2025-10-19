import { useSyncManager } from "@/hooks/useSyncManager";
import { cn } from "@/lib/utils";
import React from "react";

interface ConnectionStatusProps {
  className?: string;
  showDetails?: boolean;
  compact?: boolean;
}

/**
 * Connection Status Component
 * Displays real-time sync status with visual indicators
 */
export const ConnectionStatus: React.FC<ConnectionStatusProps> = ({
  className,
  showDetails = false,
  compact = false,
}) => {
  const { status, isConnected, connectionType, forceSync } = useSyncManager({
    autoStart: true,
  });

  const getStatusColor = () => {
    if (!isConnected) return "text-red-500";
    if (connectionType === "websocket") return "text-green-500";
    if (connectionType === "polling") return "text-yellow-500";
    return "text-gray-500";
  };

  const getStatusIcon = () => {
    if (status.syncInProgress) {
      return (
        <div className="animate-spin h-3 w-3 border-2 border-current border-t-transparent rounded-full" />
      );
    }

    if (!isConnected) {
      return <div className="h-3 w-3 bg-red-500 rounded-full" />;
    }

    if (connectionType === "websocket") {
      return <div className="h-3 w-3 bg-green-500 rounded-full animate-pulse" />;
    }

    if (connectionType === "polling") {
      return <div className="h-3 w-3 bg-yellow-500 rounded-full" />;
    }

    return <div className="h-3 w-3 bg-gray-500 rounded-full" />;
  };

  const getStatusText = () => {
    if (status.syncInProgress) return "Syncing...";
    if (!isConnected) return "Offline";
    if (connectionType === "websocket") return "Real-time";
    if (connectionType === "polling") return "Polling";
    return "Unknown";
  };

  const getLastSyncText = () => {
    if (!status.lastSync) return "Never";

    const now = Date.now();
    const diff = now - status.lastSync;

    if (diff < 60000) return "Just now";
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return `${Math.floor(diff / 86400000)}d ago`;
  };

  const handleForceSync = async () => {
    try {
      await forceSync();
    } catch (error) {
      console.error("Force sync failed:", error);
    }
  };

  if (compact) {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        {getStatusIcon()}
        <span className={cn("text-sm font-medium", getStatusColor())}>{getStatusText()}</span>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg",
        className
      )}
    >
      <div className="flex items-center gap-3">
        {getStatusIcon()}
        <div>
          <div className={cn("text-sm font-medium", getStatusColor())}>{getStatusText()}</div>
          {showDetails && (
            <div className="text-xs text-gray-500 dark:text-gray-400">
              Last sync: {getLastSyncText()}
            </div>
          )}
        </div>
      </div>

      {showDetails && (
        <div className="flex items-center gap-2">
          {status.metrics.errorCount > 0 && (
            <span className="text-xs text-red-500 bg-red-50 dark:bg-red-900/20 px-2 py-1 rounded">
              {status.metrics.errorCount} errors
            </span>
          )}

          {status.metrics.averageLatency > 0 && (
            <span className="text-xs text-gray-500 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
              {Math.round(status.metrics.averageLatency)}ms
            </span>
          )}

          <button
            onClick={handleForceSync}
            disabled={status.syncInProgress}
            className="text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {status.syncInProgress ? "Syncing..." : "Refresh"}
          </button>
        </div>
      )}
    </div>
  );
};

/**
 * Simple connection indicator for minimal UI space
 */
export const ConnectionIndicator: React.FC<{ className?: string }> = ({ className }) => {
  const { isConnected, connectionType } = useSyncManager();

  const getIndicatorClass = () => {
    if (!isConnected) return "bg-red-500";
    if (connectionType === "websocket") return "bg-green-500 animate-pulse";
    if (connectionType === "polling") return "bg-yellow-500";
    return "bg-gray-500";
  };

  return (
    <div
      className={cn("h-2 w-2 rounded-full", getIndicatorClass(), className)}
      title={`Connection: ${isConnected ? connectionType : "offline"}`}
    />
  );
};

export default ConnectionStatus;
