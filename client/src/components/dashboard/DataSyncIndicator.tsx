/**
 * Enhanced Data Sync Indicator Component
 *
 * Shows real-time sync status with connection quality indicators,
 * data freshness information, and manual refresh functionality.
 *
 * Requirements addressed:
 * - 6.1: Connection status indicators in dashboard UI
 * - 6.2: Visual indicators (green/yellow/red) for connection quality and data freshness
 * - 6.4: User-friendly messages explaining connection status and data reliability
 * - 10.5: Manual refresh button for forced synchronization
 */

import { motion } from "framer-motion";
import { AlertTriangle, CheckCircle, RefreshCw, XCircle } from "lucide-react";
import { memo } from "react";
import { DashboardConnectionStatus } from "./DashboardConnectionStatus";

interface DataSyncIndicatorProps {
  isLoading: boolean;
  onRefresh: () => Promise<void>;
  lastSyncTime?: string;
  /** Show enhanced connection status */
  showConnectionStatus?: boolean;
  /** Show data freshness indicator */
  showDataFreshness?: boolean;
  /** Custom className */
  className?: string;
}

export const DataSyncIndicator = memo<DataSyncIndicatorProps>(
  ({
    isLoading,
    onRefresh,
    lastSyncTime,
    showConnectionStatus = true,
    showDataFreshness = true,
    className = "",
  }) => {
    // Determine data freshness based on last sync time
    const getDataFreshness = () => {
      if (!lastSyncTime) return null;

      const now = new Date();
      const syncTime = new Date(lastSyncTime);
      const diffMinutes = Math.floor((now.getTime() - syncTime.getTime()) / (1000 * 60));

      if (diffMinutes < 1) {
        return { status: "fresh", color: "text-green-500", icon: CheckCircle, label: "Just now" };
      } else if (diffMinutes < 5) {
        return {
          status: "recent",
          color: "text-green-500",
          icon: CheckCircle,
          label: `${diffMinutes}m ago`,
        };
      } else if (diffMinutes < 30) {
        return {
          status: "stale",
          color: "text-yellow-500",
          icon: AlertTriangle,
          label: `${diffMinutes}m ago`,
        };
      } else {
        return {
          status: "old",
          color: "text-red-500",
          icon: XCircle,
          label: `${diffMinutes}m ago`,
        };
      }
    };

    const dataFreshness = getDataFreshness();

    if (showConnectionStatus) {
      return (
        <div className={`flex items-center gap-4 ${className}`}>
          {/* Enhanced Connection Status */}
          <DashboardConnectionStatus
            onRefresh={onRefresh}
            lastSyncTime={lastSyncTime}
            showConnectionType={true}
          />

          {/* Data Freshness Indicator */}
          {showDataFreshness && dataFreshness && (
            <div className="flex items-center gap-2">
              <dataFreshness.icon className={`h-3 w-3 ${dataFreshness.color}`} />
              <span className={`text-xs ${dataFreshness.color}`}>{dataFreshness.label}</span>
            </div>
          )}
        </div>
      );
    }

    // Fallback to simple indicator
    return (
      <div className={`flex items-center space-x-3 ${className}`}>
        {/* Sync Status */}
        <div className="flex items-center space-x-2">
          <motion.div
            className={`w-2 h-2 rounded-full ${isLoading ? "bg-yellow-500" : "bg-green-500"}`}
            animate={isLoading ? { scale: [1, 1.2, 1] } : {}}
            transition={isLoading ? { repeat: Infinity, duration: 1.5 } : {}}
          />
          <span className="text-xs text-gray-400">{isLoading ? "Syncing..." : "Data synced"}</span>
          {lastSyncTime && !isLoading && (
            <span className="text-xs text-gray-500">• {lastSyncTime}</span>
          )}
        </div>

        {/* Refresh Button */}
        <motion.button
          onClick={onRefresh}
          disabled={isLoading}
          className="flex items-center space-x-1 px-3 py-1 text-xs bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white rounded transition-colors"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <RefreshCw className={`w-3 h-3 ${isLoading ? "animate-spin" : ""}`} />
          <span>Refresh</span>
        </motion.button>
      </div>
    );
  }
);

DataSyncIndicator.displayName = "DataSyncIndicator";

export default DataSyncIndicator;
