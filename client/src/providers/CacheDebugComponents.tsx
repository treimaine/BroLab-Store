/**
 * Cache Debug Components
 *
 * Development-only components for cache monitoring and debugging.
 * These are code-split to avoid shipping in production bundles.
 */

import { useCache } from "@/hooks/useCache";
import type { CacheOperationType } from "./CacheProvider";

type CacheHealthStatus = "excellent" | "good" | "fair" | "poor";

interface OperationStatus {
  failureCount: number;
  currentDelay: number;
  isPaused: boolean;
  lastError?: string;
}

// Helper function to get health color class
function getHealthColorClass(health: CacheHealthStatus): string {
  switch (health) {
    case "excellent":
      return "text-green-400";
    case "good":
      return "text-blue-400";
    case "fair":
      return "text-yellow-400";
    case "poor":
      return "text-red-400";
  }
}

/**
 * Cache status indicator - shows cache health in corner
 */
export function CacheStatusIndicator(): JSX.Element | null {
  const { cacheHealth, metrics, isWarming, operationStatuses } = useCache();

  const getHealthColor = (health: string): string => {
    switch (health) {
      case "excellent":
        return "text-green-500";
      case "good":
        return "text-blue-500";
      case "fair":
        return "text-yellow-500";
      case "poor":
        return "text-red-500";
      default:
        return "text-gray-500";
    }
  };

  const getHealthIcon = (health: string): string => {
    switch (health) {
      case "excellent":
        return "🟢";
      case "good":
        return "🔵";
      case "fair":
        return "🟡";
      case "poor":
        return "🔴";
      default:
        return "⚪";
    }
  };

  const hasPausedOperations = Object.values(operationStatuses).some(s => s.isPaused);
  const hasFailingOperations = Object.values(operationStatuses).some(
    s => s.failureCount > 0 && !s.isPaused
  );

  return (
    <div className="fixed bottom-4 left-4 z-50 bg-black/80 text-white p-2 rounded-lg text-xs">
      <div className="flex items-center space-x-2">
        <span>{getHealthIcon(cacheHealth)}</span>
        <span className={getHealthColor(cacheHealth)}>Cache: {cacheHealth}</span>
        {isWarming && <span className="animate-pulse">🔥</span>}
        {hasPausedOperations && <span title="Some operations paused">⏸️</span>}
        {hasFailingOperations && (
          <span className="animate-pulse" title="Some operations failing">
            ⚠️
          </span>
        )}
      </div>
      <div className="text-gray-400 mt-1">
        Hit Rate: {metrics.hitRate.toFixed(1)}% | Size: {metrics.cacheSize}
      </div>
    </div>
  );
}

/**
 * Cache debug panel - full debug interface for development
 */
export function CacheDebugPanel(): JSX.Element {
  const { metrics, actions, cacheHealth, isWarming, operationStatuses } = useCache();

  const healthColorClass = getHealthColorClass(cacheHealth);

  const getOperationStatusBadge = (status: OperationStatus): JSX.Element => {
    if (status.isPaused) {
      return <span className="text-red-400 text-xs">⏸️ Paused</span>;
    }
    if (status.failureCount > 0) {
      return <span className="text-yellow-400 text-xs">⚠️ {status.failureCount} fails</span>;
    }
    return <span className="text-green-400 text-xs">✓ OK</span>;
  };

  return (
    <div className="fixed top-4 right-4 z-50 bg-black/90 text-white p-4 rounded-lg text-sm max-w-xs">
      <h3 className="font-bold mb-2">Cache Debug Panel</h3>

      <div className="space-y-2">
        <div>
          <strong>Health:</strong>
          <span className={`ml-2 ${healthColorClass}`}>{cacheHealth}</span>
        </div>

        <div>
          <strong>Hit Rate:</strong> {metrics.hitRate.toFixed(1)}%
        </div>

        <div>
          <strong>Cache Size:</strong> {metrics.cacheSize}
        </div>

        <div>
          <strong>Status:</strong> {isWarming ? "Warming..." : "Ready"}
        </div>

        <div className="border-t border-gray-700 pt-2 mt-2">
          <strong className="text-xs text-gray-400">Operations:</strong>
          <div className="mt-1 space-y-1">
            {(Object.entries(operationStatuses) as [CacheOperationType, OperationStatus][]).map(
              ([op, status]) => (
                <div key={op} className="flex items-center justify-between">
                  <span className="text-xs capitalize">{op}</span>
                  <div className="flex items-center gap-2">
                    {getOperationStatusBadge(status)}
                    {status.isPaused && (
                      <button
                        onClick={() => actions.resumeOperation(op)}
                        className="text-xs bg-blue-600 hover:bg-blue-700 px-1 rounded"
                      >
                        Resume
                      </button>
                    )}
                  </div>
                </div>
              )
            )}
          </div>
        </div>
      </div>

      <div className="mt-4 space-y-1">
        <button
          onClick={actions.warmCache}
          disabled={isWarming || operationStatuses.warm.isPaused}
          className="block w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 px-2 py-1 rounded text-xs"
        >
          Warm Cache
        </button>

        <button
          onClick={actions.optimizeCache}
          disabled={operationStatuses.optimization.isPaused}
          className="block w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-600 px-2 py-1 rounded text-xs"
        >
          Optimize
        </button>

        <button
          onClick={actions.clearCache}
          disabled={operationStatuses.clear.isPaused}
          className="block w-full bg-red-600 hover:bg-red-700 disabled:bg-gray-600 px-2 py-1 rounded text-xs"
        >
          Clear Cache
        </button>
      </div>
    </div>
  );
}
