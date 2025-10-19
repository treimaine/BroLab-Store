/**
 * Connection Status Indicator Component
 *
 * Enhanced connection status indicator that shows real-time sync status to users
 * with visual indicators (green/yellow/red), connection quality, data freshness,
 * user-friendly messages, and manual refresh functionality.
 *
 * Requirements addressed:
 * - 6.1: Connection status indicators in UI
 * - 6.2: Visual indicators for connection quality and data freshness
 * - 6.4: User-friendly messages explaining connection status
 * - 10.5: Manual refresh button for forced synchronization
 */

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useConnectionManager, useConnectionMetrics } from "@/hooks/useConnectionManager";
import { cn } from "@/lib/utils";
import { useSyncStatus } from "@/store/useDashboardStore";
import type { ConnectionStatus } from "@shared/types/sync";
import {
  AlertCircle,
  CheckCircle,
  Clock,
  Database,
  RefreshCw,
  Signal,
  SignalHigh,
  SignalLow,
  SignalMedium,
  Wifi,
  WifiOff,
  XCircle,
  Zap,
} from "lucide-react";
import React, { useCallback, useMemo } from "react";

export interface ConnectionStatusIndicatorProps {
  /** Whether to show detailed status */
  showDetails?: boolean;
  /** Whether to show metrics */
  showMetrics?: boolean;
  /** Custom className */
  className?: string;
  /** Compact mode (smaller size) */
  compact?: boolean;
  /** Position of the dropdown */
  dropdownAlign?: "start" | "center" | "end";
  /** Show data freshness indicator */
  showDataFreshness?: boolean;
  /** Last sync time for data freshness */
  lastSyncTime?: string;
  /** Custom refresh handler */
  onRefresh?: () => Promise<void>;
  /** Show connection quality bar */
  showQualityBar?: boolean;
}

/**
 * Enhanced connection status indicator with comprehensive status information
 */
export const ConnectionStatusIndicator: React.FC<ConnectionStatusIndicatorProps> = ({
  showDetails = true,
  showMetrics = false,
  className = "",
  compact = false,
  dropdownAlign = "end",
  showDataFreshness = true,
  lastSyncTime,
  onRefresh,
  showQualityBar = true,
}) => {
  const {
    status,
    isConnected,
    isReconnecting,
    connect,
    disconnect,
    reconnect,
    getCurrentStrategy,
    enableFallback,
    error,
    clearError,
    recoveryActions,
  } = useConnectionManager();

  const { current: metrics, qualityScore, isHealthy } = useConnectionMetrics();
  const syncStatus = useSyncStatus();

  // Get enhanced status info with data freshness
  const statusInfo = useMemo(
    () => getEnhancedStatusInfo(status, isHealthy, error, syncStatus, lastSyncTime),
    [status, isHealthy, error, syncStatus, lastSyncTime]
  );

  // Handle manual refresh with custom handler support
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

  // Handle fallback strategy change
  const handleFallbackChange = useCallback(
    (strategy: "immediate" | "gradual" | "quality_based" | "manual") => {
      enableFallback(strategy);
    },
    [enableFallback]
  );

  // Handle recovery action
  const handleRecoveryAction = useCallback(
    (action: string) => {
      switch (action) {
        case "retry":
          handleRefresh();
          break;
        case "fallback":
          handleFallbackChange("immediate");
          break;
        case "disconnect":
          disconnect();
          break;
        default:
          console.warn("Unknown recovery action:", action);
      }
    },
    [handleRefresh, handleFallbackChange, disconnect]
  );

  if (compact) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className={cn("h-8 w-8 p-0 relative", className)}
              onClick={handleRefresh}
              disabled={isReconnecting || syncStatus.syncInProgress}
            >
              {isReconnecting || syncStatus.syncInProgress ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <statusInfo.icon className={cn("h-4 w-4", statusInfo.color)} />
              )}
              {/* Data freshness indicator */}
              {showDataFreshness && statusInfo.dataAge && (
                <div
                  className={cn(
                    "absolute -top-1 -right-1 h-2 w-2 rounded-full",
                    statusInfo.dataAge === "fresh"
                      ? "bg-green-400"
                      : statusInfo.dataAge === "stale"
                        ? "bg-yellow-400"
                        : "bg-red-400"
                  )}
                />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="max-w-xs">
            <div className="text-sm space-y-1">
              <div className="font-medium">{statusInfo.label}</div>
              <div className="text-muted-foreground">{statusInfo.description}</div>
              {showDataFreshness && statusInfo.dataFreshnessText && (
                <div className="text-xs text-muted-foreground border-t pt-1">
                  {statusInfo.dataFreshnessText}
                </div>
              )}
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={cn("h-8 gap-2 px-2 relative", className)}
          disabled={isReconnecting || syncStatus.syncInProgress}
        >
          {isReconnecting || syncStatus.syncInProgress ? (
            <RefreshCw className="h-4 w-4 animate-spin" />
          ) : (
            <statusInfo.icon className={cn("h-4 w-4", statusInfo.color)} />
          )}
          {showDetails && <span className="text-sm font-medium">{statusInfo.label}</span>}
          {/* Data freshness indicator */}
          {showDataFreshness && statusInfo.dataAge && (
            <div
              className={cn(
                "absolute -top-1 -right-1 h-2 w-2 rounded-full",
                statusInfo.dataAge === "fresh"
                  ? "bg-green-400"
                  : statusInfo.dataAge === "stale"
                    ? "bg-yellow-400"
                    : "bg-red-400"
              )}
            />
          )}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align={dropdownAlign} className="w-80">
        {/* Enhanced Status Header */}
        <div className="px-3 py-2">
          <div className="flex items-start gap-3">
            <statusInfo.icon className={cn("h-5 w-5 mt-0.5", statusInfo.color)} />
            <div className="flex-1 space-y-1">
              <div className="font-medium">{statusInfo.label}</div>
              <div className="text-sm text-muted-foreground">{statusInfo.description}</div>
              {statusInfo.userFriendlyMessage && (
                <div className="text-xs text-muted-foreground bg-muted/50 rounded px-2 py-1">
                  {statusInfo.userFriendlyMessage}
                </div>
              )}
            </div>
          </div>
        </div>

        <DropdownMenuSeparator />

        {/* Enhanced Connection Details */}
        <div className="px-3 py-2 space-y-3">
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <span className="text-muted-foreground">Connection:</span>
              <div className="font-medium capitalize flex items-center gap-1">
                {getCurrentStrategy() === "websocket" && <Zap className="h-3 w-3" />}
                {getCurrentStrategy() === "polling" && <Clock className="h-3 w-3" />}
                {getCurrentStrategy() === "offline" && <WifiOff className="h-3 w-3" />}
                {getCurrentStrategy()}
              </div>
            </div>

            {showDataFreshness && (
              <div>
                <span className="text-muted-foreground">Data:</span>
                <div className="font-medium flex items-center gap-1">
                  <Database className="h-3 w-3" />
                  {statusInfo.dataAge === "fresh"
                    ? "Fresh"
                    : statusInfo.dataAge === "stale"
                      ? "Stale"
                      : "Old"}
                </div>
              </div>
            )}
          </div>

          {isConnected && (
            <>
              {showQualityBar && (
                <div className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Quality:</span>
                    <span className="font-medium">{Math.round(qualityScore * 100)}%</span>
                  </div>
                  <ConnectionQualityBar score={qualityScore} />
                </div>
              )}

              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Latency:</span>
                <span className="font-medium">{Math.round(metrics.stats.averageLatency)}ms</span>
              </div>

              {lastSyncTime && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Last sync:</span>
                  <span className="font-medium">{lastSyncTime}</span>
                </div>
              )}
            </>
          )}

          {status.reconnectAttempts > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Attempts:</span>
              <span className="font-medium">
                {status.reconnectAttempts}/{status.maxReconnectAttempts}
              </span>
            </div>
          )}

          {status.nextReconnectIn && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Next retry:</span>
              <span className="font-medium">{Math.round(status.nextReconnectIn / 1000)}s</span>
            </div>
          )}
        </div>

        {/* Metrics */}
        {showMetrics && isConnected && (
          <>
            <DropdownMenuSeparator />
            <div className="px-3 py-2 space-y-2">
              <div className="text-sm font-medium">Metrics</div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <div className="text-muted-foreground">Sent</div>
                  <div className="font-medium">{metrics.stats.messagesSent}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Received</div>
                  <div className="font-medium">{metrics.stats.messagesReceived}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Errors</div>
                  <div className="font-medium">{metrics.stats.errorCount}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Uptime</div>
                  <div className="font-medium">{formatUptime(metrics.stats.uptime)}</div>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Error Information */}
        {error && (
          <>
            <DropdownMenuSeparator />
            <div className="px-3 py-2">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-destructive mt-0.5" />
                <div className="flex-1">
                  <div className="text-sm font-medium text-destructive">Connection Error</div>
                  <div className="text-xs text-muted-foreground mt-1">{error.message}</div>
                </div>
              </div>
            </div>
          </>
        )}

        <DropdownMenuSeparator />

        {/* Enhanced Actions */}
        <div className="px-1 py-1">
          <DropdownMenuItem
            onClick={handleRefresh}
            disabled={isReconnecting || syncStatus.syncInProgress}
            className="font-medium"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            {isReconnecting || syncStatus.syncInProgress ? "Syncing..." : "Force Refresh"}
          </DropdownMenuItem>

          {recoveryActions.length > 0 && (
            <>
              <DropdownMenuSeparator />
              <div className="px-2 py-1 text-xs text-muted-foreground">Recovery Options</div>
              {recoveryActions.map((action, index) => (
                <DropdownMenuItem key={index} onClick={() => handleRecoveryAction(action.type)}>
                  {getActionIcon(action.type)}
                  {getActionLabel(action)}
                </DropdownMenuItem>
              ))}
            </>
          )}

          <DropdownMenuSeparator />

          {isConnected ? (
            <DropdownMenuItem onClick={() => disconnect()} className="text-muted-foreground">
              <WifiOff className="h-4 w-4 mr-2" />
              Disconnect
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem onClick={() => connect()} className="text-muted-foreground">
              <Wifi className="h-4 w-4 mr-2" />
              Connect
            </DropdownMenuItem>
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

/**
 * Enhanced quality indicator component with progress bar
 */
export const ConnectionQualityBar: React.FC<{ score: number }> = ({ score }) => {
  const getQualityColor = (score: number) => {
    if (score >= 0.8) return "bg-green-500";
    if (score >= 0.6) return "bg-yellow-500";
    if (score >= 0.3) return "bg-orange-500";
    return "bg-red-500";
  };

  const getQualityIcon = (score: number) => {
    if (score >= 0.8) return SignalHigh;
    if (score >= 0.6) return SignalMedium;
    if (score >= 0.3) return SignalLow;
    return Signal;
  };

  const Icon = getQualityIcon(score);
  const color = getQualityColor(score);

  return (
    <div className="flex items-center gap-2">
      <Icon className={cn("h-3 w-3", color.replace("bg-", "text-"))} />
      <div className="flex-1 bg-muted rounded-full h-1.5">
        <div
          className={cn("h-full rounded-full transition-all duration-300", color)}
          style={{ width: `${Math.max(score * 100, 5)}%` }}
        />
      </div>
    </div>
  );
};

/**
 * Simple connection status badge
 */
export const ConnectionStatusBadge: React.FC<{
  className?: string;
}> = ({ className = "" }) => {
  const { isConnected, isReconnecting, status } = useConnectionManager();

  const getBadgeColor = () => {
    if (isReconnecting) return "bg-yellow-500";
    if (isConnected) return "bg-green-500";
    return "bg-red-500";
  };

  const getBadgeLabel = () => {
    if (isReconnecting) return "Connecting";
    if (isConnected) return "Online";
    return "Offline";
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className={`h-2 w-2 rounded-full ${getBadgeColor()}`} />
      <span className="text-sm text-muted-foreground">{getBadgeLabel()}</span>
    </div>
  );
};

/**
 * Standalone connection quality progress bar
 */
export const ConnectionQualityProgressBar: React.FC<{
  className?: string;
  showLabel?: boolean;
}> = ({ className = "", showLabel = true }) => {
  const { qualityScore } = useConnectionMetrics();

  return (
    <div className={cn("space-y-1", className)}>
      {showLabel && (
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Connection Quality</span>
          <span className="font-medium">{Math.round(qualityScore * 100)}%</span>
        </div>
      )}
      <ConnectionQualityBar score={qualityScore} />
    </div>
  );
};

// Helper functions

function getEnhancedStatusInfo(
  status: ConnectionStatus,
  isHealthy: boolean,
  error: any,
  syncStatus: any,
  lastSyncTime?: string
) {
  const now = Date.now();
  const lastSync = syncStatus?.lastSync || 0;
  const timeSinceSync = now - lastSync;

  // Determine data freshness
  let dataAge: "fresh" | "stale" | "old" | null = null;
  let dataFreshnessText = "";

  if (lastSync > 0) {
    if (timeSinceSync < 30000) {
      // Less than 30 seconds
      dataAge = "fresh";
      dataFreshnessText = "Data is up to date";
    } else if (timeSinceSync < 300000) {
      // Less than 5 minutes
      dataAge = "stale";
      dataFreshnessText = "Data may be slightly outdated";
    } else {
      dataAge = "old";
      dataFreshnessText = "Data needs refresh";
    }
  }

  if (status.reconnecting || syncStatus?.syncInProgress) {
    return {
      icon: RefreshCw,
      color: "text-yellow-500",
      label: "Syncing",
      description: "Updating dashboard data...",
      userFriendlyMessage: "Your dashboard is being updated with the latest information.",
      dataAge,
      dataFreshnessText,
    };
  }

  if (status.connected) {
    if (isHealthy) {
      return {
        icon: CheckCircle,
        color: "text-green-500",
        label: "Online",
        description: `Real-time sync active via ${status.type}`,
        userFriendlyMessage: "Your dashboard shows live data and updates automatically.",
        dataAge,
        dataFreshnessText,
      };
    } else {
      return {
        icon: AlertCircle,
        color: "text-yellow-500",
        label: "Connected",
        description: "Connection quality is degraded",
        userFriendlyMessage: "Connection is slower than usual. Data updates may be delayed.",
        dataAge,
        dataFreshnessText,
      };
    }
  }

  if (error) {
    return {
      icon: XCircle,
      color: "text-red-500",
      label: "Error",
      description: "Connection failed - using cached data",
      userFriendlyMessage: "Connection failed. Data may be outdated. Click refresh to reconnect.",
      dataAge: "old",
      dataFreshnessText: "Using cached data - may be outdated",
    };
  }

  return {
    icon: WifiOff,
    color: "text-gray-500",
    label: "Offline",
    description: "No real-time updates available",
    userFriendlyMessage:
      "Dashboard is offline. Data shown may not be current. Check your internet connection.",
    dataAge: "old",
    dataFreshnessText: "Offline - data may be outdated",
  };
}

function getActionIcon(actionType: string) {
  switch (actionType) {
    case "retry":
      return <RefreshCw className="h-4 w-4 mr-2" />;
    case "fallback":
      return <Wifi className="h-4 w-4 mr-2" />;
    case "force_sync":
      return <Clock className="h-4 w-4 mr-2" />;
    default:
      return <AlertCircle className="h-4 w-4 mr-2" />;
  }
}

function getActionLabel(action: any) {
  switch (action.type) {
    case "retry":
      return `Retry (${Math.round(action.delay / 1000)}s delay)`;
    case "fallback":
      return `Switch to ${action.strategy}`;
    case "force_sync":
      return "Force sync all data";
    default:
      return "Unknown action";
  }
}

function formatUptime(uptime: number): string {
  const seconds = Math.floor(uptime / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  }
  return `${seconds}s`;
}
