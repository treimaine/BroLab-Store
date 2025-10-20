/**
 * Dashboard Connection Status Component
 *
 * Simple connection status indicator specifically designed for the dashboard header.
 * Shows connection status with visual indicators and manual refresh functionality.
 *
 * Requirements addressed:
 * - 6.1: Connection status indicators in dashboard UI
 * - 6.2: Visual indicators (green/yellow/red) for connection quality
 * - 6.4: User-friendly messages explaining connection status
 * - 10.5: Manual refresh button for forced synchronization
 */

import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useConnectionManager } from "@/hooks/useConnectionManager";
import { cn } from "@/lib/utils";
import { useSyncStatus } from "@/stores/useDashboardStore";
import { CheckCircle, Clock, RefreshCw, WifiOff, XCircle, Zap } from "lucide-react";
import React, { useCallback } from "react";

export interface DashboardConnectionStatusProps {
  /** Custom className */
  className?: string;
  /** Show connection type icon */
  showConnectionType?: boolean;
  /** Custom refresh handler */
  onRefresh?: () => Promise<void>;
  /** Last sync time display */
  lastSyncTime?: string;
}

/**
 * Dashboard connection status indicator
 */
export const DashboardConnectionStatus: React.FC<DashboardConnectionStatusProps> = ({
  className,
  showConnectionType = true,
  onRefresh,
  lastSyncTime,
}) => {
  const {
    status,
    isConnected,
    isReconnecting,
    connect,
    reconnect,
    getCurrentStrategy,
    error,
    clearError,
  } = useConnectionManager();

  const syncStatus = useSyncStatus();

  // Handle refresh
  const handleRefresh = useCallback(async () => {
    try {
      if (onRefresh) {
        await onRefresh();
      } else {
        if (isConnected) {
          await reconnect();
        } else {
          await connect();
        }
      }
      clearError();
    } catch (err) {
      console.error("Manual refresh failed:", err);
    }
  }, [isConnected, reconnect, connect, clearError, onRefresh]);

  // Get status info
  const getStatusInfo = () => {
    const isSyncing = isReconnecting || syncStatus.syncInProgress;

    if (isSyncing) {
      return {
        icon: RefreshCw,
        color: "text-yellow-500",
        bgColor: "bg-yellow-500/10",
        label: "Syncing",
        description: "Updating dashboard data...",
        pulse: true,
      };
    }

    if (isConnected) {
      return {
        icon: CheckCircle,
        color: "text-green-500",
        bgColor: "bg-green-500/10",
        label: "Online",
        description: `Connected via ${getCurrentStrategy()}`,
        pulse: false,
      };
    }

    if (error) {
      return {
        icon: XCircle,
        color: "text-red-500",
        bgColor: "bg-red-500/10",
        label: "Error",
        description: "Connection failed - click to retry",
        pulse: false,
      };
    }

    return {
      icon: WifiOff,
      color: "text-gray-500",
      bgColor: "bg-gray-500/10",
      label: "Offline",
      description: "No connection - click to retry",
      pulse: false,
    };
  };

  const statusInfo = getStatusInfo();
  const connectionType = getCurrentStrategy();

  return (
    <div className={cn("flex items-center gap-2", className)}>
      {/* Connection Status Indicator */}
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div
              className={cn(
                "flex items-center gap-2 px-2 py-1 rounded-md transition-colors",
                statusInfo.bgColor
              )}
            >
              <statusInfo.icon
                className={cn("h-4 w-4", statusInfo.color, statusInfo.pulse && "animate-spin")}
              />

              {/* Connection Type Icon */}
              {showConnectionType && isConnected && (
                <>
                  {connectionType === "websocket" && (
                    <Zap className="h-3 w-3 text-muted-foreground" />
                  )}
                  {connectionType === "polling" && (
                    <Clock className="h-3 w-3 text-muted-foreground" />
                  )}
                </>
              )}

              <span className={cn("text-sm font-medium", statusInfo.color)}>
                {statusInfo.label}
              </span>
            </div>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="max-w-xs">
            <div className="text-sm space-y-1">
              <div className="font-medium">{statusInfo.label}</div>
              <div className="text-muted-foreground">{statusInfo.description}</div>
              {lastSyncTime && (
                <div className="text-xs text-muted-foreground border-t pt-1">
                  Last sync: {lastSyncTime}
                </div>
              )}
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {/* Manual Refresh Button */}
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={handleRefresh}
              disabled={isReconnecting || syncStatus.syncInProgress}
            >
              <RefreshCw
                className={cn(
                  "h-4 w-4",
                  (isReconnecting || syncStatus.syncInProgress) && "animate-spin"
                )}
              />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <div className="text-sm">
              {isReconnecting || syncStatus.syncInProgress
                ? "Syncing..."
                : "Force refresh dashboard data"}
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
};

/**
 * Simple connection status badge for minimal space
 */
export const ConnectionStatusBadge: React.FC<{
  className?: string;
  showLabel?: boolean;
}> = ({ className, showLabel = true }) => {
  const { isConnected, isReconnecting, getCurrentStrategy } = useConnectionManager();
  const syncStatus = useSyncStatus();

  const getStatusColor = () => {
    if (isReconnecting || syncStatus.syncInProgress) return "bg-yellow-500";
    if (isConnected) return "bg-green-500";
    return "bg-red-500";
  };

  const getStatusLabel = () => {
    if (isReconnecting || syncStatus.syncInProgress) return "Syncing";
    if (isConnected) return "Online";
    return "Offline";
  };

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div
        className={cn(
          "h-2 w-2 rounded-full transition-colors",
          getStatusColor(),
          (isReconnecting || syncStatus.syncInProgress) && "animate-pulse"
        )}
      />
      {showLabel && <span className="text-sm text-muted-foreground">{getStatusLabel()}</span>}
    </div>
  );
};

export default DashboardConnectionStatus;
