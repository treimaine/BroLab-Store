/**
 * Connection Status Panel Component
 *
 * Comprehensive connection status panel that can be embedded in different parts
 * of the dashboard to show detailed connection information, data freshness,
 * and provide manual refresh functionality.
 *
 * Requirements addressed:
 * - 6.1: Connection status indicators in dashboard UI
 * - 6.2: Visual indicators (green/yellow/red) for connection quality and data freshness
 * - 6.4: User-friendly messages explaining connection status and data reliability
 * - 10.5: Manual refresh button for forced synchronization
 */

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useConnectionManager, useConnectionMetrics } from "@/hooks/useConnectionManager";
import { cn } from "@/lib/utils";
import { useSyncStatus } from "@/store/useDashboardStore";
import {
  Activity,
  AlertCircle,
  CheckCircle,
  Clock,
  Database,
  Info,
  RefreshCw,
  Signal,
  SignalHigh,
  SignalLow,
  SignalMedium,
  WifiOff,
  XCircle,
  Zap,
} from "lucide-react";
import React, { useCallback } from "react";

export interface ConnectionStatusPanelProps {
  /** Custom className */
  className?: string;
  /** Show detailed metrics */
  showMetrics?: boolean;
  /** Show connection quality */
  showQuality?: boolean;
  /** Show data freshness */
  showDataFreshness?: boolean;
  /** Custom refresh handler */
  onRefresh?: () => Promise<void>;
  /** Last sync time */
  lastSyncTime?: string;
  /** Panel variant */
  variant?: "card" | "inline" | "compact";
}

/**
 * Connection status panel with comprehensive information
 */
export const ConnectionStatusPanel: React.FC<ConnectionStatusPanelProps> = ({
  className,
  showMetrics = true,
  showQuality = true,
  showDataFreshness = true,
  onRefresh,
  lastSyncTime,
  variant = "card",
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

  const { current: metrics, qualityScore, isHealthy } = useConnectionMetrics();
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

  // Get status information
  const getStatusInfo = () => {
    const isSyncing = isReconnecting || syncStatus.syncInProgress;

    if (isSyncing) {
      return {
        icon: RefreshCw,
        color: "text-yellow-500",
        bgColor: "bg-yellow-500/10",
        borderColor: "border-yellow-500/20",
        label: "Syncing",
        description: "Updating dashboard data...",
        message: "Your dashboard is being updated with the latest information.",
        severity: "info" as const,
      };
    }

    if (isConnected) {
      if (isHealthy) {
        return {
          icon: CheckCircle,
          color: "text-green-500",
          bgColor: "bg-green-500/10",
          borderColor: "border-green-500/20",
          label: "Online",
          description: `Connected via ${getCurrentStrategy()}`,
          message: "Your dashboard shows live data and updates automatically.",
          severity: "success" as const,
        };
      } else {
        return {
          icon: AlertCircle,
          color: "text-yellow-500",
          bgColor: "bg-yellow-500/10",
          borderColor: "border-yellow-500/20",
          label: "Connected",
          description: "Connection quality is degraded",
          message: "Connection is slower than usual. Data updates may be delayed.",
          severity: "warning" as const,
        };
      }
    }

    if (error) {
      return {
        icon: XCircle,
        color: "text-red-500",
        bgColor: "bg-red-500/10",
        borderColor: "border-red-500/20",
        label: "Error",
        description: "Connection failed",
        message: "Connection failed. Data may be outdated. Click refresh to reconnect.",
        severity: "error" as const,
      };
    }

    return {
      icon: WifiOff,
      color: "text-gray-500",
      bgColor: "bg-gray-500/10",
      borderColor: "border-gray-500/20",
      label: "Offline",
      description: "No connection available",
      message:
        "Dashboard is offline. Data shown may not be current. Check your internet connection.",
      severity: "error" as const,
    };
  };

  const statusInfo = getStatusInfo();
  const connectionType = getCurrentStrategy();

  // Get quality indicator
  const getQualityIndicator = (score: number) => {
    if (score >= 0.8) return { icon: SignalHigh, color: "text-green-500", label: "Excellent" };
    if (score >= 0.6) return { icon: SignalMedium, color: "text-yellow-500", label: "Good" };
    if (score >= 0.3) return { icon: SignalLow, color: "text-orange-500", label: "Poor" };
    return { icon: Signal, color: "text-red-500", label: "Very Poor" };
  };

  const qualityInfo = getQualityIndicator(qualityScore);

  // Get data freshness
  const getDataFreshness = () => {
    if (!lastSyncTime) return null;

    const now = new Date();
    const syncTime = new Date(lastSyncTime);
    const diffMinutes = Math.floor((now.getTime() - syncTime.getTime()) / (1000 * 60));

    if (diffMinutes < 1) {
      return {
        status: "fresh",
        color: "text-green-500",
        label: "Fresh",
        description: "Just updated",
      };
    } else if (diffMinutes < 5) {
      return {
        status: "recent",
        color: "text-green-500",
        label: "Fresh",
        description: `Updated ${diffMinutes}m ago`,
      };
    } else if (diffMinutes < 30) {
      return {
        status: "stale",
        color: "text-yellow-500",
        label: "Stale",
        description: `Updated ${diffMinutes}m ago`,
      };
    } else {
      return {
        status: "old",
        color: "text-red-500",
        label: "Old",
        description: `Updated ${diffMinutes}m ago`,
      };
    }
  };

  const dataFreshness = getDataFreshness();

  // Render compact version
  if (variant === "compact") {
    return (
      <div className={cn("flex items-center gap-3 p-2 rounded-lg", statusInfo.bgColor, className)}>
        <statusInfo.icon className={cn("h-4 w-4", statusInfo.color)} />
        <div className="flex-1 min-w-0">
          <div className={cn("text-sm font-medium", statusInfo.color)}>{statusInfo.label}</div>
          <div className="text-xs text-muted-foreground truncate">{statusInfo.description}</div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0"
          onClick={handleRefresh}
          disabled={isReconnecting || syncStatus.syncInProgress}
        >
          <RefreshCw
            className={cn(
              "h-3 w-3",
              (isReconnecting || syncStatus.syncInProgress) && "animate-spin"
            )}
          />
        </Button>
      </div>
    );
  }

  // Render inline version
  if (variant === "inline") {
    return (
      <div
        className={cn(
          "flex items-center justify-between p-3 rounded-lg border",
          statusInfo.bgColor,
          statusInfo.borderColor,
          className
        )}
      >
        <div className="flex items-center gap-3">
          <statusInfo.icon className={cn("h-5 w-5", statusInfo.color)} />
          <div>
            <div className={cn("font-medium", statusInfo.color)}>{statusInfo.label}</div>
            <div className="text-sm text-muted-foreground">{statusInfo.description}</div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {showDataFreshness && dataFreshness && (
            <Badge variant="outline" className={dataFreshness.color}>
              {dataFreshness.label}
            </Badge>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isReconnecting || syncStatus.syncInProgress}
          >
            <RefreshCw
              className={cn(
                "h-4 w-4 mr-2",
                (isReconnecting || syncStatus.syncInProgress) && "animate-spin"
              )}
            />
            Refresh
          </Button>
        </div>
      </div>
    );
  }

  // Render card version (default)
  return (
    <Card className={cn("", className)}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Activity className="h-4 w-4" />
          Connection Status
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Status Overview */}
        <div
          className={cn(
            "flex items-center gap-3 p-3 rounded-lg border",
            statusInfo.bgColor,
            statusInfo.borderColor
          )}
        >
          <statusInfo.icon className={cn("h-5 w-5", statusInfo.color)} />
          <div className="flex-1">
            <div className={cn("font-medium", statusInfo.color)}>{statusInfo.label}</div>
            <div className="text-sm text-muted-foreground">{statusInfo.description}</div>
          </div>

          {/* Connection Type Badge */}
          <div className="flex items-center gap-1">
            {connectionType === "websocket" && <Zap className="h-3 w-3 text-muted-foreground" />}
            {connectionType === "polling" && <Clock className="h-3 w-3 text-muted-foreground" />}
            {connectionType === "offline" && <WifiOff className="h-3 w-3 text-muted-foreground" />}
            <Badge variant="outline" className="text-xs">
              {connectionType}
            </Badge>
          </div>
        </div>

        {/* User-Friendly Message */}
        <div className="flex items-start gap-2 p-2 bg-muted/50 rounded text-sm">
          <Info className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
          <span className="text-muted-foreground">{statusInfo.message}</span>
        </div>

        {/* Connection Quality */}
        {showQuality && isConnected && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Connection Quality</span>
              <div className="flex items-center gap-1">
                <qualityInfo.icon className={cn("h-3 w-3", qualityInfo.color)} />
                <span className={cn("font-medium", qualityInfo.color)}>{qualityInfo.label}</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-muted rounded-full h-2">
                <div
                  className={cn(
                    "h-full rounded-full transition-all duration-300",
                    qualityScore >= 0.8
                      ? "bg-green-500"
                      : qualityScore >= 0.6
                        ? "bg-yellow-500"
                        : qualityScore >= 0.3
                          ? "bg-orange-500"
                          : "bg-red-500"
                  )}
                  style={{ width: `${Math.max(qualityScore * 100, 5)}%` }}
                />
              </div>
              <span className="text-xs text-muted-foreground w-8">
                {Math.round(qualityScore * 100)}%
              </span>
            </div>
          </div>
        )}

        {/* Data Freshness */}
        {showDataFreshness && dataFreshness && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Database className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Data Status</span>
            </div>
            <div className="text-right">
              <Badge variant="outline" className={dataFreshness.color}>
                {dataFreshness.label}
              </Badge>
              <div className="text-xs text-muted-foreground mt-1">{dataFreshness.description}</div>
            </div>
          </div>
        )}

        {/* Metrics */}
        {showMetrics && isConnected && (
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <div className="text-muted-foreground">Latency</div>
              <div className="font-medium">{Math.round(metrics.stats.averageLatency)}ms</div>
            </div>
            <div>
              <div className="text-muted-foreground">Uptime</div>
              <div className="font-medium">{formatUptime(metrics.stats.uptime)}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Messages</div>
              <div className="font-medium">
                {metrics.stats.messagesSent + metrics.stats.messagesReceived}
              </div>
            </div>
            <div>
              <div className="text-muted-foreground">Errors</div>
              <div className="font-medium">{metrics.stats.errorCount}</div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          <Button
            onClick={handleRefresh}
            disabled={isReconnecting || syncStatus.syncInProgress}
            className="flex-1"
          >
            <RefreshCw
              className={cn(
                "h-4 w-4 mr-2",
                (isReconnecting || syncStatus.syncInProgress) && "animate-spin"
              )}
            />
            {isReconnecting || syncStatus.syncInProgress ? "Syncing..." : "Force Refresh"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

// Helper function
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

export default ConnectionStatusPanel;
