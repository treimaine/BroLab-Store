/**
 * Offline Indicator Component
 * Shows offline status and pending operations to users
 */

import { AlertCircle, CheckCircle, Clock, RefreshCw, Wifi, WifiOff } from "lucide-react";
import React, { useEffect, useState } from "react";
import { useOfflineManager } from "../hooks/useOfflineManager";

interface OfflineIndicatorProps {
  className?: string;
  showDetails?: boolean;
}

export const OfflineIndicator: React.FC<OfflineIndicatorProps> = ({
  className = "",
  showDetails = false,
}) => {
  const { isOnline, getOperationStats, getPendingUpdates, syncNow, clearCompleted } =
    useOfflineManager();

  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    syncing: 0,
    completed: 0,
    failed: 0,
  });

  const [pendingUpdates, setPendingUpdates] = useState(0);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  // Update stats periodically
  useEffect(() => {
    const updateStats = async () => {
      try {
        const [operationStats, updates] = await Promise.all([
          getOperationStats(),
          getPendingUpdates(),
        ]);

        setStats(operationStats);
        setPendingUpdates(updates.length);
      } catch (error) {
        console.error("Failed to update offline stats:", error);
      }
    };

    updateStats();
    const interval = setInterval(updateStats, 3000);

    return () => clearInterval(interval);
  }, [getOperationStats, getPendingUpdates]);

  // Handle sync
  const handleSync = async () => {
    if (!isOnline || isSyncing) return;

    setIsSyncing(true);
    try {
      await syncNow();
    } catch (error) {
      console.error("Sync failed:", error);
    } finally {
      setIsSyncing(false);
    }
  };

  // Handle clear completed
  const handleClearCompleted = async () => {
    try {
      await clearCompleted();
    } catch (error) {
      console.error("Failed to clear completed operations:", error);
    }
  };

  // Don't show if online and no pending operations
  if (isOnline && stats.total === 0 && pendingUpdates === 0) {
    return null;
  }

  const totalPending = stats.pending + stats.syncing + pendingUpdates;

  return (
    <div className={`offline-indicator ${className}`}>
      {/* Main indicator */}
      <div
        className={`
          flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-all
          ${
            isOnline
              ? "bg-green-900/20 text-green-300 border border-green-600/30"
              : "bg-red-900/20 text-red-300 border border-red-600/30"
          }
          ${showDetails ? "hover:bg-opacity-30" : ""}
        `}
        onClick={() => showDetails && setIsExpanded(!isExpanded)}
      >
        {/* Status icon */}
        {isOnline ? <Wifi className="w-4 h-4" /> : <WifiOff className="w-4 h-4" />}

        {/* Status text */}
        <span className="text-sm font-medium">{isOnline ? "Online" : "Offline"}</span>

        {/* Pending count */}
        {totalPending > 0 && (
          <div className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            <span className="text-xs">{totalPending}</span>
          </div>
        )}

        {/* Sync button */}
        {isOnline && totalPending > 0 && (
          <button
            onClick={e => {
              e.stopPropagation();
              handleSync();
            }}
            disabled={isSyncing}
            className={`
              p-1 rounded transition-colors
              ${
                isSyncing
                  ? "text-gray-400 cursor-not-allowed"
                  : "text-blue-400 hover:text-blue-300 hover:bg-blue-900/20"
              }
            `}
            title="Sync now"
          >
            <RefreshCw className={`w-3 h-3 ${isSyncing ? "animate-spin" : ""}`} />
          </button>
        )}

        {/* Expand indicator */}
        {showDetails && <div className="text-xs opacity-60">{isExpanded ? "▼" : "▶"}</div>}
      </div>

      {/* Detailed view */}
      {showDetails && isExpanded && (
        <div className="mt-2 p-3 bg-gray-900/50 rounded-lg border border-gray-700/50">
          <div className="space-y-3">
            {/* Connection status */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-300">Connection</span>
              <div className="flex items-center gap-2">
                {isOnline ? (
                  <>
                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                    <span className="text-xs text-green-300">Connected</span>
                  </>
                ) : (
                  <>
                    <div className="w-2 h-2 bg-red-400 rounded-full" />
                    <span className="text-xs text-red-300">Disconnected</span>
                  </>
                )}
              </div>
            </div>

            {/* Operation stats */}
            {stats.total > 0 && (
              <div className="space-y-2">
                <div className="text-sm text-gray-300 font-medium">Queued Operations</div>

                {stats.pending > 0 && (
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <Clock className="w-3 h-3 text-yellow-400" />
                      <span className="text-gray-300">Pending</span>
                    </div>
                    <span className="text-yellow-300">{stats.pending}</span>
                  </div>
                )}

                {stats.syncing > 0 && (
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <RefreshCw className="w-3 h-3 text-blue-400 animate-spin" />
                      <span className="text-gray-300">Syncing</span>
                    </div>
                    <span className="text-blue-300">{stats.syncing}</span>
                  </div>
                )}

                {stats.completed > 0 && (
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-3 h-3 text-green-400" />
                      <span className="text-gray-300">Completed</span>
                    </div>
                    <span className="text-green-300">{stats.completed}</span>
                  </div>
                )}

                {stats.failed > 0 && (
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="w-3 h-3 text-red-400" />
                      <span className="text-gray-300">Failed</span>
                    </div>
                    <span className="text-red-300">{stats.failed}</span>
                  </div>
                )}
              </div>
            )}

            {/* Optimistic updates */}
            {pendingUpdates > 0 && (
              <div className="space-y-2">
                <div className="text-sm text-gray-300 font-medium">Pending Updates</div>
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-purple-400 rounded-full animate-pulse" />
                    <span className="text-gray-300">Optimistic</span>
                  </div>
                  <span className="text-purple-300">{pendingUpdates}</span>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2 pt-2 border-t border-gray-700/50">
              {isOnline && totalPending > 0 && (
                <button
                  onClick={handleSync}
                  disabled={isSyncing}
                  className={`
                    flex-1 px-3 py-1 text-xs rounded transition-colors
                    ${
                      isSyncing
                        ? "bg-gray-700 text-gray-400 cursor-not-allowed"
                        : "bg-blue-600 text-white hover:bg-blue-700"
                    }
                  `}
                >
                  {isSyncing ? "Syncing..." : "Sync Now"}
                </button>
              )}

              {stats.completed > 0 && (
                <button
                  onClick={handleClearCompleted}
                  className="flex-1 px-3 py-1 text-xs rounded bg-gray-600 text-gray-200 hover:bg-gray-700 transition-colors"
                >
                  Clear Completed
                </button>
              )}
            </div>

            {/* Offline message */}
            {!isOnline && (
              <div className="text-xs text-gray-400 text-center pt-2 border-t border-gray-700/50">
                Operations will sync when connection is restored
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default OfflineIndicator;
