/**
 * Development-only performance monitors wrapper
 * Uses lazy loading to ensure monitoring code is excluded from production bundles
 */

import { lazy, Suspense } from "react";

// Lazy load monitors only in development - production builds will tree-shake this
const LazyPerformanceMonitor = lazy(() =>
  import("./PerformanceMonitor").then(m => ({ default: m.PerformanceMonitor }))
);

const LazyBundleSizeAnalyzer = lazy(() =>
  import("./PerformanceMonitor").then(m => ({ default: m.BundleSizeAnalyzer }))
);

/**
 * Development-only monitors component
 * Returns null in production, lazy-loads monitors in development
 */
export function DevOnlyMonitors(): JSX.Element | null {
  // Early return for production - enables tree-shaking
  if (import.meta.env.PROD) {
    return null;
  }

  return (
    <Suspense fallback={null}>
      <LazyPerformanceMonitor />
      <LazyBundleSizeAnalyzer />
    </Suspense>
  );
}
