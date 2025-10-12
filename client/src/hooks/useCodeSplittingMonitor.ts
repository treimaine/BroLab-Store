import { useEffect, useState } from "react";
import CodeSplittingMonitor, { type CodeSplittingMetrics } from "../utils/codeSplittingMonitor";
/**
 * React hook for code splitting monitoring
 */

export function useCodeSplittingMonitor() {
  const [monitor] = useState(() => CodeSplittingMonitor.getInstance());
  const [metrics, setMetrics] = useState<CodeSplittingMetrics | null>(null);

  useEffect(() => {
    // Update metrics every 5 seconds
    const interval = setInterval(() => {
      setMetrics(monitor.getMetrics());
    }, 5000);

    return () => {
      clearInterval(interval);
    };
  }, [monitor]);

  return {
    trackChunkLoad: monitor.trackChunkLoad.bind(monitor),
    trackComponentRender: monitor.trackComponentRender.bind(monitor),
    metrics,
  };
}
