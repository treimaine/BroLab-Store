/**
 * Performance Optimization Example Component
 *
 * Demonstrates all performance optimizations:
 * - Intelligent batching
 * - Request deduplication
 * - Memory optimization
 * - Selective sync
 * - Progressive loading
 * - Smart caching
 */

import {
  useOptimizedDashboardSync,
  usePerformanceMetrics,
  useSectionSync,
} from "@/hooks/useOptimizedDashboardSync";
import { useEffect, useState } from "react";

export function PerformanceOptimizationExample() {
  const { isSyncing, lastSync, error, metrics, forceSync, flushBatches, clearCaches } =
    useOptimizedDashboardSync({
      autoSync: true,
      syncInterval: 30000,
      enableOptimizations: true,
      alwaysSyncSections: ["stats", "user"],
      debug: true,
    });

  const performanceMetrics = usePerformanceMetrics();
  const [showMetrics, setShowMetrics] = useState(false);

  return (
    <div className="p-6 space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-2xl font-bold mb-4">Performance Optimization Dashboard</h2>

        {/* Sync Status */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-2">Sync Status</h3>
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-gray-50 p-4 rounded">
              <div className="text-sm text-gray-600">Status</div>
              <div className="text-lg font-semibold">
                {isSyncing ? (
                  <span className="text-blue-600">Syncing...</span>
                ) : (
                  <span className="text-green-600">Idle</span>
                )}
              </div>
            </div>

            <div className="bg-gray-50 p-4 rounded">
              <div className="text-sm text-gray-600">Last Sync</div>
              <div className="text-lg font-semibold">
                {lastSync ? new Date(lastSync).toLocaleTimeString() : "Never"}
              </div>
            </div>

            <div className="bg-gray-50 p-4 rounded">
              <div className="text-sm text-gray-600">Error</div>
              <div className="text-lg font-semibold">
                {error ? (
                  <span className="text-red-600">{error.message}</span>
                ) : (
                  <span className="text-green-600">None</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-2">Actions</h3>
          <div className="flex gap-2">
            <button
              onClick={forceSync}
              disabled={isSyncing}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
            >
              Force Sync
            </button>

            <button
              onClick={flushBatches}
              className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
            >
              Flush Batches
            </button>

            <button
              onClick={clearCaches}
              className="px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700"
            >
              Clear Caches
            </button>

            <button
              onClick={() => setShowMetrics(!showMetrics)}
              className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
            >
              {showMetrics ? "Hide" : "Show"} Metrics
            </button>
          </div>
        </div>

        {/* Performance Metrics */}
        {showMetrics && performanceMetrics && (
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-2">Performance Metrics</h3>

            {/* Batching Stats */}
            <div className="mb-4">
              <h4 className="font-medium mb-2">Batching</h4>
              <div className="grid grid-cols-3 gap-4">
                <MetricCard
                  label="Total Batches"
                  value={performanceMetrics.batchStats.totalBatches}
                />
                <MetricCard
                  label="Avg Batch Size"
                  value={performanceMetrics.batchStats.averageBatchSize.toFixed(1)}
                />
                <MetricCard
                  label="Avg Processing Time"
                  value={`${performanceMetrics.batchStats.averageProcessingTime.toFixed(2)}ms`}
                />
              </div>
            </div>

            {/* Deduplication Stats */}
            <div className="mb-4">
              <h4 className="font-medium mb-2">Deduplication</h4>
              <div className="grid grid-cols-3 gap-4">
                <MetricCard
                  label="Total Requests"
                  value={performanceMetrics.deduplicationStats.totalRequests}
                />
                <MetricCard
                  label="Duplicates Filtered"
                  value={performanceMetrics.deduplicationStats.duplicatesFiltered}
                />
                <MetricCard
                  label="Filter Rate"
                  value={`${(performanceMetrics.deduplicationStats.filterRate * 100).toFixed(1)}%`}
                />
              </div>
            </div>

            {/* Memory Stats */}
            <div className="mb-4">
              <h4 className="font-medium mb-2">Memory</h4>
              <div className="grid grid-cols-4 gap-4">
                <MetricCard
                  label="Event History"
                  value={performanceMetrics.memoryStats.eventHistorySize}
                />
                <MetricCard label="Cache Size" value={performanceMetrics.memoryStats.cacheSize} />
                <MetricCard
                  label="Memory Usage"
                  value={`${(performanceMetrics.memoryStats.estimatedMemoryUsage / 1024).toFixed(1)}KB`}
                />
                <MetricCard label="Cleanups" value={performanceMetrics.memoryStats.cleanupCount} />
              </div>
            </div>

            {/* Cache Stats */}
            <div className="mb-4">
              <h4 className="font-medium mb-2">Cache</h4>
              <div className="grid grid-cols-4 gap-4">
                <MetricCard label="Hits" value={performanceMetrics.cacheStats.hits} />
                <MetricCard label="Misses" value={performanceMetrics.cacheStats.misses} />
                <MetricCard
                  label="Hit Rate"
                  value={`${(performanceMetrics.cacheStats.hitRate * 100).toFixed(1)}%`}
                />
                <MetricCard label="Evictions" value={performanceMetrics.cacheStats.evictions} />
              </div>
            </div>

            {/* Sync Metrics */}
            <div className="mb-4">
              <h4 className="font-medium mb-2">Sync Performance</h4>
              <div className="grid grid-cols-4 gap-4">
                <MetricCard
                  label="Avg Latency"
                  value={`${performanceMetrics.averageLatency.toFixed(0)}ms`}
                />
                <MetricCard
                  label="Success Rate"
                  value={`${performanceMetrics.successRate.toFixed(1)}%`}
                />
                <MetricCard label="Errors" value={performanceMetrics.errorCount} />
                <MetricCard label="Reconnects" value={performanceMetrics.reconnectCount} />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Selective Sync Example */}
      <SelectiveSyncExample />

      {/* Progressive Loading Example */}
      <ProgressiveLoadingExample />
    </div>
  );
}

function MetricCard({ label, value }: Readonly<{ label: string; value: string | number }>) {
  return (
    <div className="bg-gray-50 p-3 rounded">
      <div className="text-xs text-gray-600">{label}</div>
      <div className="text-lg font-semibold">{value}</div>
    </div>
  );
}

/**
 * Example of selective sync with visibility tracking
 */
function SelectiveSyncExample() {
  const sectionRef = useSectionSync("example-section", 7);

  return (
    <div ref={sectionRef} data-section="example-section" className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold mb-2">Selective Sync Example</h3>
      <p className="text-gray-600">
        This section is registered for selective sync. It will only sync when visible in the
        viewport.
      </p>
      <div className="mt-4 p-4 bg-blue-50 rounded">
        <p className="text-sm text-blue-800">
          Scroll this section in and out of view to see selective sync in action. Check the
          performance metrics to see how it reduces unnecessary updates.
        </p>
      </div>
    </div>
  );
}

/**
 * Example of progressive loading
 */
function ProgressiveLoadingExample() {
  const [items, setItems] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  const loadMore = async () => {
    if (loading || !hasMore) return;

    setLoading(true);

    // Simulate loading delay
    await new Promise(resolve => setTimeout(resolve, 500));

    const newItems = Array.from({ length: 20 }, (_, i) => items.length + i + 1);
    setItems(prev => [...prev, ...newItems]);

    if (items.length + newItems.length >= 100) {
      setHasMore(false);
    }

    setLoading(false);
  };

  useEffect(() => {
    loadMore();
  }, []);

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold mb-2">Progressive Loading Example</h3>
      <p className="text-gray-600 mb-4">
        Items are loaded progressively as you scroll. This reduces initial load time and memory
        usage.
      </p>

      <div className="space-y-2 max-h-96 overflow-y-auto">
        {items.map(item => (
          <div key={item} className="p-3 bg-gray-50 rounded">
            Item {item}
          </div>
        ))}

        {loading && (
          <div className="p-3 text-center text-gray-600">
            <div className="animate-spin inline-block w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full" />
            <span className="ml-2">Loading more...</span>
          </div>
        )}

        {!loading && hasMore && (
          <button
            onClick={loadMore}
            className="w-full p-3 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Load More
          </button>
        )}

        {!hasMore && (
          <div className="p-3 text-center text-gray-600">All items loaded ({items.length})</div>
        )}
      </div>
    </div>
  );
}

export default PerformanceOptimizationExample;
