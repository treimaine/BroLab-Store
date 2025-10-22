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
import { cn } from "@/lib/utils";
import { useDashboardStore } from "@/stores/useDashboardStore";
import type { SyncStatus } from "@shared/types/sync";
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
  // Get sync status from dashboard store
  const syncStatus = useDashboardStore(state => state.syncStatus);
  const error = useDashboardStore(state => state.error);
  const forceSync = useDashboardStore(state => state.forceSync);
  const clearError = useDashboardStore(state => state.clearError);

  // Derive connection state from sync status
  const isConnected = syncStatus.connected;
  const isReconnecting = syncStatus.syncInProgress;
  const connectionType = syncStatus.connectionType;

  // Calculate quality score from metrics
  const qualityScore = useMemo(() => {
    const { successRate, averageLatency } = syncStatus.metrics;
    // Quality based on success rate and latency
    const latencyScore = Math.max(0, 1 - averageLatency / 5000); // 0-5s latency range
    const successScore = successRate / 100;
    return latencyScore * 0.4 + successScore * 0.6;
  }, [syncStatus.metrics]);

  const isHealthy = qualityScore >= 0.7;

  // Calculate last sync time if not provided
  const calculatedLastSyncTime = useMemo(() => {
    if (lastSyncTime) return lastSyncTime;
    if (syncStatus.lastSync === 0) return "Never";

    const now = Date.now();
    const diff = now - syncStatus.lastSync;

    if (diff < 60000) return "Just now";
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return `${Math.floor(diff / 86400000)}d ago`;
  }, [lastSyncTime, syncStatus.lastSync]);

  // Get enhanced status info with data freshness
  const statusInfo = useMemo(
    () => getEnhancedStatusInfo(syncStatus, isHealthy, error, calculatedLastSyncTime),
    [syncStatus, isHealthy, error, calculatedLastSyncTime]
  );

  // Handle manual refresh with custom handler support
  const handleRefresh = useCallback(async () => {
    try {
      if (onRefresh) {
        await onRefresh();
      } else {
        await forceSync();
      }
      clearError();
    } catch (err) {
      console.error("Manual refresh failed:", err);
    }
  }, [onRefresh, forceSync, clearError]);

  // Handle recovery action
  const handleRecoveryAction = useCallback(
    (action: string) => {
      switch (action) {
        case "retry":
          handleRefresh();
          break;
        case "clear_error":
          clearError();
          break;
        default:
          console.warn("Unknown recovery action:", action);
      }
    },
    [handleRefresh, clearError]
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
                    getDataAgeBadgeColor(statusInfo.dataAge)
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
                getDataAgeBadgeColor(statusInfo.dataAge)
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
                {connectionType === "websocket" && <Zap className="h-3 w-3" />}
                {connectionType === "polling" && <Clock className="h-3 w-3" />}
                {connectionType === "offline" && <WifiOff className="h-3 w-3" />}
                {connectionType}
              </div>
            </div>

            {showDataFreshness && (
              <div>
                <span className="text-muted-foreground">Data:</span>
                <div className="font-medium flex items-center gap-1">
                  <Database className="h-3 w-3" />
                  {getDataAgeLabel(statusInfo.dataAge)}
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
                <span className="font-medium">
                  {Math.round(syncStatus.metrics.averageLatency)}ms
                </span>
              </div>

              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Last sync:</span>
                <span className="font-medium">{calculatedLastSyncTime}</span>
              </div>
            </>
          )}

          {syncStatus.metrics.reconnectCount > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Reconnects:</span>
              <span className="font-medium">{syncStatus.metrics.reconnectCount}</span>
            </div>
          )}
        </div>

        {/* Metrics */}
        {showMetrics && isConnected && (
          <>
            <DropdownMenuSeparator />
            <div className="px-3 py-2 space-y-2">
              <div className="text-sm font-medium">Sync Metrics</div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <div className="text-muted-foreground">Success Rate</div>
                  <div className="font-medium">{syncStatus.metrics.successRate.toFixed(1)}%</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Errors</div>
                  <div className="font-medium">{syncStatus.metrics.errorCount}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Reconnects</div>
                  <div className="font-medium">{syncStatus.metrics.reconnectCount}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Inconsistencies</div>
                  <div className="font-medium">{syncStatus.metrics.dataInconsistencies}</div>
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

          {error && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => handleRecoveryAction("retry")}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Retry Connection
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleRecoveryAction("clear_error")}>
                <XCircle className="h-4 w-4 mr-2" />
                Clear Error
              </DropdownMenuItem>
            </>
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
  const syncStatus = useDashboardStore(state => state.syncStatus);
  const isConnected = syncStatus.connected;
  const isReconnecting = syncStatus.syncInProgress;

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
  const syncStatus = useDashboardStore(state => state.syncStatus);

  // Calculate quality score from metrics
  const qualityScore = useMemo(() => {
    const { successRate, averageLatency } = syncStatus.metrics;
    const latencyScore = Math.max(0, 1 - averageLatency / 5000);
    const successScore = successRate / 100;
    return latencyScore * 0.4 + successScore * 0.6;
  }, [syncStatus.metrics]);

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

function getDataAgeLabel(dataAge: "fresh" | "stale" | "old" | null): string {
  if (dataAge === "fresh") return "Fresh";
  if (dataAge === "stale") return "Stale";
  return "Old";
}

function getDataAgeBadgeColor(dataAge: "fresh" | "stale" | "old" | null): string {
  if (dataAge === "fresh") return "bg-green-400";
  if (dataAge === "stale") return "bg-yellow-400";
  return "bg-red-400";
}

type DataFreshness = {
  dataAge: "fresh" | "stale" | "old" | null;
  dataFreshnessText: string;
};

function calculateDataFreshness(lastSync: number): DataFreshness {
  if (lastSync === 0) {
    return { dataAge: null, dataFreshnessText: "" };
  }

  const now = Date.now();
  const timeSinceSync = now - lastSync;

  if (timeSinceSync < 30000) {
    // Less than 30 seconds
    return {
      dataAge: "fresh",
      dataFreshnessText: "Data is up to date",
    };
  }

  if (timeSinceSync < 300000) {
    // Less than 5 minutes
    return {
      dataAge: "stale",
      dataFreshnessText: "Data may be slightly outdated",
    };
  }

  return {
    dataAge: "old",
    dataFreshnessText: "Data needs refresh",
  };
}

function getStatusForSyncing(freshness: DataFreshness) {
  return {
    icon: RefreshCw,
    color: "text-yellow-500",
    label: "Syncing",
    description: "Updating dashboard data...",
    userFriendlyMessage: "Your dashboard is being updated with the latest information.",
    ...freshness,
  };
}

function getStatusForHealthyConnection(connectionType: string, freshness: DataFreshness) {
  return {
    icon: CheckCircle,
    color: "text-green-500",
    label: "Online",
    description: `Real-time sync active via ${connectionType}`,
    userFriendlyMessage: "Your dashboard shows live data and updates automatically.",
    ...freshness,
  };
}

function getStatusForDegradedConnection(freshness: DataFreshness) {
  return {
    icon: AlertCircle,
    color: "text-yellow-500",
    label: "Connected",
    description: "Connection quality is degraded",
    userFriendlyMessage: "Connection is slower than usual. Data updates may be delayed.",
    ...freshness,
  };
}

function getStatusForError() {
  return {
    icon: XCircle,
    color: "text-red-500",
    label: "Error",
    description: "Connection failed - using cached data",
    userFriendlyMessage: "Connection failed. Data may be outdated. Click refresh to reconnect.",
    dataAge: "old" as const,
    dataFreshnessText: "Using cached data - may be outdated",
  };
}

function getStatusForOffline() {
  return {
    icon: WifiOff,
    color: "text-gray-500",
    label: "Offline",
    description: "No real-time updates available",
    userFriendlyMessage:
      "Dashboard is offline. Data shown may not be current. Check your internet connection.",
    dataAge: "old" as const,
    dataFreshnessText: "Offline - data may be outdated",
  };
}

function getEnhancedStatusInfo(
  syncStatus: SyncStatus,
  isHealthy: boolean,
  error: unknown,
  _lastSyncTime: string
) {
  const freshness = calculateDataFreshness(syncStatus.lastSync || 0);

  if (syncStatus.syncInProgress) {
    return getStatusForSyncing(freshness);
  }

  if (syncStatus.connected) {
    if (isHealthy) {
      return getStatusForHealthyConnection(syncStatus.connectionType, freshness);
    }
    return getStatusForDegradedConnection(freshness);
  }

  if (error) {
    return getStatusForError();
  }

  return getStatusForOffline();
}
