import { useEffect, useState } from "react";
import CodeSplittingMonitor, { type CodeSplittingMetrics } from "../utils/codeSplittingMonitor";
/**
 * React hook for code splitting monitoring
 * FIX: Uses visibility-aware interval to prevent browser freezes
 */

export function useCodeSplittingMonitor() {
  const [monitor] = useState(() => CodeSplittingMonitor.getInstance());
  const [metrics, setMetrics] = useState<CodeSplittingMetrics | null>(null);

  useEffect(() => {
    // FIX: Use visibility-aware interval to prevent browser freezes
    let interval: ReturnType<typeof setInterval> | null = null;

    const startInterval = (): void => {
      if (interval) return;
      // Update metrics every 5 seconds
      interval = setInterval(() => {
        if (!document.hidden) {
          setMetrics(monitor.getMetrics());
        }
      }, 5000);
    };

    const stopInterval = (): void => {
      if (interval) {
        clearInterval(interval);
        interval = null;
      }
    };

    const handleVisibilityChange = (): void => {
      if (document.hidden) {
        stopInterval();
      } else {
        // Stagger restart to prevent thundering herd
        setTimeout(
          () => {
            startInterval();
          },
          Math.random() * 500 + 450
        );
      }
    };

    // Start interval if tab is visible
    if (!document.hidden) {
      startInterval();
    }

    document.addEventListener("visibilitychange", handleVisibilityChange, { passive: true });

    return () => {
      stopInterval();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [monitor]);

  return {
    trackChunkLoad: monitor.trackChunkLoad.bind(monitor),
    trackComponentRender: monitor.trackComponentRender.bind(monitor),
    metrics,
  };
}
