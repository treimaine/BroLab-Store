import { useCodeSplittingMonitor } from "@/hooks/useCodeSplittingMonitor";
/**
 * Code Splitting Performance Monitor Display Component
 */


/**
 * Development-only component to display code splitting metrics
 * Only shows when explicitly enabled via URL parameter or localStorage
 *
 * To enable:
 * - Add ?debug=metrics to the URL, or
 * - Set localStorage.setItem('show-code-splitting-metrics', 'true') in console
 */
export function CodeSplittingMetricsDisplay() {
  const { metrics } = useCodeSplittingMonitor();

  // Multiple checks to ensure this only shows when explicitly requested
  const isDevelopment = process.env.NODEENV === "development";
  const isExplicitlyEnabled =
    typeof window !== "undefined" &&
    (window.location.search.includes("debug=metrics") ||
      localStorage.getItem("show-code-splitting-metrics") === "true");

  if (!isDevelopment || !isExplicitlyEnabled || !metrics) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 bg-gray-900/95 border border-gray-700 rounded-lg p-3 text-xs text-gray-300 max-w-xs z-50">
      <div className="font-semibold mb-2">Code Splitting Metrics</div>
      <div className="space-y-1">
        <div>Chunks loaded: {metrics.chunksLoaded.length}</div>
        <div>Lazy components: {metrics.componentsRendered.filter(c => c.isLazyLoaded).length}</div>
        <div>Estimated savings: {metrics.lazyLoadSavings}KB</div>
        <div>Initial load: {metrics.initialLoadTime.toFixed(0)}ms</div>
      </div>
    </div>
  );
}
