import { useSyncManager, useSyncMetrics } from "@/hooks/useSyncManager";
import { cn } from "@/lib/utils";
import { SyncError } from "@/services/SyncManager";
import React, { useState } from "react";

interface SyncMetricsProps {
  className?: string;
  showDebugPanel?: boolean;
}

/**
 * Sync Metrics Component
 * Displays detailed synchronization metrics and debugging information
 */
export const SyncMetrics: React.FC<SyncMetricsProps> = ({ className, showDebugPanel = false }) => {
  const metrics = useSyncMetrics();
  const { status, enableDebug } = useSyncManager();
  const [debugMode, setDebugMode] = useState(false);
  const [showErrors, setShowErrors] = useState(false);

  const handleToggleDebug = () => {
    const newDebugMode = !debugMode;
    setDebugMode(newDebugMode);
    enableDebug(newDebugMode);
  };

  const formatLatency = (latency: number) => {
    if (latency < 1000) return `${Math.round(latency)}ms`;
    return `${(latency / 1000).toFixed(1)}s`;
  };

  const formatSuccessRate = (rate: number) => {
    return `${rate.toFixed(1)}%`;
  };

  const getSuccessRateColor = (rate: number) => {
    if (rate >= 95) return "text-green-600 dark:text-green-400";
    if (rate >= 85) return "text-yellow-600 dark:text-yellow-400";
    return "text-red-600 dark:text-red-400";
  };

  const getLatencyColor = (latency: number) => {
    if (latency < 500) return "text-green-600 dark:text-green-400";
    if (latency < 1000) return "text-yellow-600 dark:text-yellow-400";
    return "text-red-600 dark:text-red-400";
  };

  return (
    <div className={cn("space-y-4", className)}>
      {/* Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border">
          <div className="text-sm text-gray-500 dark:text-gray-400">Success Rate</div>
          <div className={cn("text-2xl font-bold", getSuccessRateColor(metrics.successRate))}>
            {formatSuccessRate(metrics.successRate)}
          </div>
          <div className="text-xs text-gray-400">
            {metrics.totalSyncs - metrics.failedSyncs}/{metrics.totalSyncs} syncs
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border">
          <div className="text-sm text-gray-500 dark:text-gray-400">Avg Latency</div>
          <div className={cn("text-2xl font-bold", getLatencyColor(metrics.averageLatency))}>
            {formatLatency(metrics.averageLatency)}
          </div>
          <div className="text-xs text-gray-400">Response time</div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border">
          <div className="text-sm text-gray-500 dark:text-gray-400">Errors</div>
          <div
            className={cn(
              "text-2xl font-bold",
              metrics.errorCount > 0
                ? "text-red-600 dark:text-red-400"
                : "text-green-600 dark:text-green-400"
            )}
          >
            {metrics.errorCount}
          </div>
          <div className="text-xs text-gray-400">Total errors</div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border">
          <div className="text-sm text-gray-500 dark:text-gray-400">Reconnects</div>
          <div
            className={cn(
              "text-2xl font-bold",
              metrics.reconnectCount > 0
                ? "text-yellow-600 dark:text-yellow-400"
                : "text-green-600 dark:text-green-400"
            )}
          >
            {metrics.reconnectCount}
          </div>
          <div className="text-xs text-gray-400">Connection resets</div>
        </div>
      </div>

      {/* Data Consistency */}
      {metrics.dataInconsistencies > 0 && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 p-4 rounded-lg">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 bg-yellow-500 rounded-full" />
            <span className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
              Data Inconsistencies Detected
            </span>
          </div>
          <div className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
            {metrics.dataInconsistencies} inconsistencies found
            {metrics.lastInconsistencyTime && (
              <span className="ml-2">
                (Last: {new Date(metrics.lastInconsistencyTime).toLocaleTimeString()})
              </span>
            )}
          </div>
        </div>
      )}

      {/* Debug Panel */}
      {showDebugPanel && (
        <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg border">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Debug Panel</h3>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={debugMode}
                  onChange={handleToggleDebug}
                  className="rounded"
                />
                Debug Mode
              </label>
              <button
                onClick={() => setShowErrors(!showErrors)}
                className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
              >
                {showErrors ? "Hide" : "Show"} Errors ({status.errors.length})
              </button>
            </div>
          </div>

          {/* Connection Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Connection Type
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400 capitalize">
                {status.connectionType}
              </div>
            </div>
            <div>
              <div className="text-sm font-medium text-gray-700 dark:text-gray-300">Last Sync</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                {status.lastSync ? new Date(status.lastSync).toLocaleString() : "Never"}
              </div>
            </div>
          </div>

          {/* Error List */}
          {showErrors && status.errors.length > 0 && (
            <div className="space-y-2">
              <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Recent Errors
              </div>
              <div className="max-h-40 overflow-y-auto space-y-2">
                {status.errors.map((error, index) => (
                  <ErrorItem key={index} error={error} />
                ))}
              </div>
            </div>
          )}

          {/* Debug Info */}
          {debugMode && (
            <div className="mt-4 p-3 bg-gray-100 dark:bg-gray-800 rounded text-xs font-mono">
              <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Debug Info
              </div>
              <pre className="whitespace-pre-wrap text-gray-600 dark:text-gray-400">
                {JSON.stringify({ status: status, metrics }, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

/**
 * Individual Error Item Component
 */
const ErrorItem: React.FC<{ error: SyncError }> = ({ error }) => {
  const [expanded, setExpanded] = useState(false);

  const getErrorTypeColor = (type: string) => {
    switch (type) {
      case "network_error":
        return "text-red-600 bg-red-50 dark:bg-red-900/20";
      case "websocket_error":
        return "text-orange-600 bg-orange-50 dark:bg-orange-900/20";
      case "timeout_error":
        return "text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20";
      case "authentication_error":
        return "text-purple-600 bg-purple-50 dark:bg-purple-900/20";
      default:
        return "text-gray-600 bg-gray-50 dark:bg-gray-900/20";
    }
  };

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded p-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span
            className={cn("px-2 py-1 rounded text-xs font-medium", getErrorTypeColor(error.type))}
          >
            {error.type.replace("_", " ").toUpperCase()}
          </span>
          <span className="text-sm text-gray-600 dark:text-gray-400">
            {new Date(error.timestamp).toLocaleTimeString()}
          </span>
        </div>
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
        >
          {expanded ? "Less" : "More"}
        </button>
      </div>

      <div className="text-sm text-gray-700 dark:text-gray-300 mt-1">{error.message}</div>

      {expanded && (
        <div className="mt-2 p-2 bg-gray-50 dark:bg-gray-800 rounded text-xs">
          <div className="grid grid-cols-2 gap-2 text-gray-600 dark:text-gray-400">
            <div>Retryable: {error.retryable ? "Yes" : "No"}</div>
            <div>
              Retry Count: {error.retryCount}/{error.maxRetries}
            </div>
          </div>
          {error.context && (
            <div className="mt-2">
              <div className="text-gray-500 dark:text-gray-400 mb-1">Context:</div>
              <pre className="whitespace-pre-wrap text-gray-600 dark:text-gray-400 text-xs">
                {JSON.stringify(error.context, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SyncMetrics;
