/**
 * Offline Mode Banner Component
 *
 * Displays a prominent banner when the dashboard connection is lost,
 * showing cached data age, reconnection status, and manual refresh option.
 *
 * Requirements addressed:
 * - 10.2: Fallback and recovery mechanisms - show cached data with warning
 * - 10.4: Inform users when cached data is being used with data age
 */

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useDashboardStore } from "@/stores/useDashboardStore";
import { AlertCircle, RefreshCw, WifiOff } from "lucide-react";
import React, { useCallback, useMemo } from "react";

export interface OfflineBannerProps {
  /** Custom className */
  className?: string;
  /** Whether to show the banner (overrides automatic detection) */
  forceShow?: boolean;
  /** Custom refresh handler */
  onRefresh?: () => Promise<void>;
  /** Position of the banner */
  position?: "top" | "bottom";
  /** Whether to show data age */
  showDataAge?: boolean;
}

/**
 * Offline mode banner that appears when connection is lost
 */
export const OfflineBanner: React.FC<OfflineBannerProps> = ({
  className = "",
  forceShow = false,
  onRefresh,
  position = "top",
  showDataAge = true,
}) => {
  // Get sync status from dashboard store
  const syncStatus = useDashboardStore(state => state.syncStatus);
  const error = useDashboardStore(state => state.error);
  const forceSync = useDashboardStore(state => state.forceSync);
  const isLoading = useDashboardStore(state => state.isLoading);

  // Determine if we should show the banner
  const isOffline = !syncStatus.connected;
  const isReconnecting = syncStatus.syncInProgress && !syncStatus.connected;
  const shouldShow = forceShow || isOffline;

  // Calculate data age
  const dataAge = useMemo(() => {
    if (syncStatus.lastSync === 0) {
      return { text: "No data available", severity: "critical" as const };
    }

    const now = Date.now();
    const diff = now - syncStatus.lastSync;

    if (diff < 60000) {
      // Less than 1 minute
      return { text: "Less than a minute old", severity: "low" as const };
    } else if (diff < 300000) {
      // Less than 5 minutes
      const minutes = Math.floor(diff / 60000);
      return {
        text: `${minutes} minute${minutes > 1 ? "s" : ""} old`,
        severity: "medium" as const,
      };
    } else if (diff < 3600000) {
      // Less than 1 hour
      const minutes = Math.floor(diff / 60000);
      return {
        text: `${minutes} minutes old`,
        severity: "high" as const,
      };
    } else {
      // More than 1 hour
      const hours = Math.floor(diff / 3600000);
      return {
        text: `${hours} hour${hours > 1 ? "s" : ""} old`,
        severity: "critical" as const,
      };
    }
  }, [syncStatus.lastSync]);

  // Handle manual refresh
  const handleRefresh = useCallback(async () => {
    try {
      if (onRefresh) {
        await onRefresh();
      } else {
        await forceSync();
      }
    } catch (err) {
      console.error("Manual refresh failed:", err);
    }
  }, [onRefresh, forceSync]);

  // Don't render if not offline
  if (!shouldShow) {
    return null;
  }

  // Get banner styling based on state
  const getBannerStyle = () => {
    if (isReconnecting) {
      return {
        bg: "bg-yellow-50 dark:bg-yellow-950/20",
        border: "border-yellow-200 dark:border-yellow-800",
        text: "text-yellow-900 dark:text-yellow-100",
        icon: "text-yellow-600 dark:text-yellow-400",
      };
    }

    return {
      bg: "bg-red-50 dark:bg-red-950/20",
      border: "border-red-200 dark:border-red-800",
      text: "text-red-900 dark:text-red-100",
      icon: "text-red-600 dark:text-red-400",
    };
  };

  const style = getBannerStyle();

  return (
    <div
      className={cn(
        "w-full border-b transition-all duration-300 ease-in-out",
        style.bg,
        style.border,
        position === "bottom" && "border-t border-b-0",
        className
      )}
      role="alert"
      aria-live="assertive"
      aria-atomic="true"
    >
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between gap-4">
          {/* Left side: Icon and message */}
          <div className="flex items-center gap-3 flex-1 min-w-0">
            {isReconnecting ? (
              <RefreshCw
                className={cn("h-5 w-5 flex-shrink-0 animate-spin", style.icon)}
                aria-hidden="true"
              />
            ) : (
              <WifiOff className={cn("h-5 w-5 flex-shrink-0", style.icon)} aria-hidden="true" />
            )}

            <div className="flex-1 min-w-0">
              <div className={cn("font-medium text-sm", style.text)}>
                {isReconnecting ? "Reconnecting..." : "Offline - Showing cached data"}
              </div>

              {showDataAge && !isReconnecting && (
                <div className={cn("text-xs mt-0.5", style.text, "opacity-80")}>
                  Data is {dataAge.text}
                  {dataAge.severity === "critical" && " - may be significantly outdated"}
                </div>
              )}

              {isReconnecting && (
                <div className={cn("text-xs mt-0.5", style.text, "opacity-80")}>
                  Attempting to restore connection...
                </div>
              )}

              {error && !isReconnecting && (
                <div className="flex items-center gap-1.5 mt-1">
                  <AlertCircle className="h-3 w-3" aria-hidden="true" />
                  <span className={cn("text-xs", style.text, "opacity-80")}>{error.message}</span>
                </div>
              )}
            </div>
          </div>

          {/* Right side: Action button */}
          {!isReconnecting && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={isLoading}
              className={cn(
                "flex-shrink-0 border-current",
                style.text,
                "hover:bg-white/50 dark:hover:bg-black/50"
              )}
              aria-label="Refresh dashboard data"
            >
              <RefreshCw
                className={cn("h-4 w-4 mr-2", isLoading && "animate-spin")}
                aria-hidden="true"
              />
              {isLoading ? "Refreshing..." : "Refresh"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

/**
 * Compact offline indicator for use in headers or toolbars
 */
export const CompactOfflineIndicator: React.FC<{
  className?: string;
  showLabel?: boolean;
}> = ({ className = "", showLabel = true }) => {
  const syncStatus = useDashboardStore(state => state.syncStatus);
  const isOffline = !syncStatus.connected;
  const isReconnecting = syncStatus.syncInProgress && !syncStatus.connected;

  if (!isOffline) {
    return null;
  }

  return (
    <output
      className={cn(
        "flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium",
        isReconnecting
          ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-200"
          : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200",
        className
      )}
      aria-live="polite"
    >
      {isReconnecting ? (
        <RefreshCw className="h-3 w-3 animate-spin" aria-hidden="true" />
      ) : (
        <WifiOff className="h-3 w-3" aria-hidden="true" />
      )}
      {showLabel && <span>{isReconnecting ? "Reconnecting" : "Offline"}</span>}
    </output>
  );
};

/**
 * Inline offline message for use within content areas
 */
export const InlineOfflineMessage: React.FC<{
  className?: string;
  showRefreshButton?: boolean;
  onRefresh?: () => Promise<void>;
}> = ({ className = "", showRefreshButton = true, onRefresh }) => {
  const syncStatus = useDashboardStore(state => state.syncStatus);
  const forceSync = useDashboardStore(state => state.forceSync);
  const isLoading = useDashboardStore(state => state.isLoading);
  const isOffline = !syncStatus.connected;

  const handleRefresh = useCallback(async () => {
    try {
      if (onRefresh) {
        await onRefresh();
      } else {
        await forceSync();
      }
    } catch (err) {
      console.error("Manual refresh failed:", err);
    }
  }, [onRefresh, forceSync]);

  if (!isOffline) {
    return null;
  }

  return (
    <div
      className={cn(
        "flex items-center justify-between gap-4 p-4 rounded-lg border",
        "bg-amber-50 border-amber-200 dark:bg-amber-950/20 dark:border-amber-800",
        className
      )}
      role="alert"
    >
      <div className="flex items-center gap-3">
        <WifiOff
          className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0"
          aria-hidden="true"
        />
        <div>
          <div className="font-medium text-sm text-amber-900 dark:text-amber-100">
            You&apos;re currently offline
          </div>
          <div className="text-xs text-amber-700 dark:text-amber-300 mt-0.5">
            Showing cached data. Some information may be outdated.
          </div>
        </div>
      </div>

      {showRefreshButton && (
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={isLoading}
          className="flex-shrink-0 border-amber-300 text-amber-900 hover:bg-amber-100 dark:border-amber-700 dark:text-amber-100 dark:hover:bg-amber-900/50"
        >
          <RefreshCw className={cn("h-4 w-4 mr-2", isLoading && "animate-spin")} />
          {isLoading ? "Refreshing..." : "Try Again"}
        </Button>
      )}
    </div>
  );
};
