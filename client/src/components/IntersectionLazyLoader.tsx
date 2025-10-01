import { Loader2 } from "lucide-react";
import React, { ComponentType, Suspense, useEffect, useRef, useState } from "react";
/**
 * Intersection Observer-based Lazy Loader
 *
 * This component uses Intersection Observer API to load heavy components
 * only when they're about to become visible, improving initial page load performance.
 */


interface IntersectionLazyLoaderProps {
  /** The component to lazy load */
  component: () => Promise<{ default: ComponentType<any> }>;
  /** Props to pass to the lazy loaded component */
  componentProps?: Record<string, any>;
  /** Loading fallback component */
  fallback?: React.ReactNode;
  /** Root margin for intersection observer (default: "100px") */
  rootMargin?: string;
  /** Threshold for intersection observer (default: 0.1) */
  threshold?: number;
  /** Minimum height for the placeholder (default: "200px") */
  minHeight?: string;
  /** Whether to load immediately on mount (default: false) */
  loadImmediately?: boolean;
  /** Custom placeholder content */
  placeholder?: React.ReactNode;
  /** Callback when component starts loading */
  onLoadStart?: () => void;
  /** Callback when component finishes loading */
  onLoadComplete?: () => void;
  /** Callback when loading fails */
  onLoadError?: (error: Error) => void;
}

const DefaultFallback = ({ minHeight }: { minHeight: string }) => (
  <div
    className="flex items-center justify-center bg-gray-900/50 border border-gray-700/50 rounded-lg"
    style={{ minHeight }}
  >
    <div className="flex items-center space-x-3">
      <Loader2 className="w-5 h-5 animate-spin text-purple-400" />
      <span className="text-sm text-gray-400">Loading component...</span>
    </div>
  </div>
);

const DefaultPlaceholder = ({ minHeight }: { minHeight: string }) => (
  <div className="bg-gray-800/30 border border-gray-700/30 rounded-lg" style={{ minHeight }}>
    <div className="p-4">
      <div className="h-4 bg-gray-700/50 rounded w-1/3 mb-3 animate-pulse" />
      <div className="space-y-2">
        <div className="h-3 bg-gray-700/30 rounded w-full animate-pulse" />
        <div className="h-3 bg-gray-700/30 rounded w-3/4 animate-pulse" />
        <div className="h-3 bg-gray-700/30 rounded w-1/2 animate-pulse" />
      </div>
    </div>
  </div>
);

export function IntersectionLazyLoader({
  component,
  componentProps = {},
  fallback,
  rootMargin = "100px",
  threshold = 0.1,
  minHeight = "200px",
  loadImmediately = false,
  placeholder,
  onLoadStart,
  onLoadComplete,
  onLoadError,
}: IntersectionLazyLoaderProps) {
  const [shouldLoad, setShouldLoad] = useState(loadImmediately);
  const [LazyComponent, setLazyComponent] = useState<ComponentType<any> | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Setup intersection observer
  useEffect_(() => {
    if (shouldLoad || !containerRef.current) return;

    const observer = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            setShouldLoad(true);
            observer.unobserve(entry.target);
          }
        });
      },
      {
        rootMargin,
        threshold,
      }
    );

    observer.observe(containerRef.current);

    return () => {
      observer.disconnect();
    };
  }, [shouldLoad, rootMargin, threshold]);

  // Load component when shouldLoad becomes true
  useEffect_(() => {
    if (!shouldLoad || LazyComponent || isLoading) return;

    setIsLoading(true);
    setError(null);
    onLoadStart?.();

    component()
      .then(module => {
        setLazyComponent_(() => module.default);
        onLoadComplete?.();
      })
      .catch(err => {
        const error = err instanceof Error ? err : new Error("Failed to load component");
        setError(error);
        onLoadError?.(error);
      })
      .finally_(() => {
        setIsLoading(false);
      });
  }, [shouldLoad, LazyComponent, isLoading, component, onLoadStart, onLoadComplete, onLoadError]);

  // Render error state
  if (error) {
    return (
      <div
        ref={containerRef}
        className="flex items-center justify-center bg-red-900/20 border border-red-700/50 rounded-lg p-4"
        style={{ minHeight }}
      >
        <div className="text-center">
          <div className="text-red-400 text-sm mb-2">Failed to load component</div>
          <button
            onClick={() => {
              setError(null);
              setShouldLoad(true);
            }}
            className="text-xs text-red-300 hover:text-red-200 underline"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Render loaded component
  if (LazyComponent) {
    return (
      <Suspense fallback={fallback || <DefaultFallback minHeight={minHeight} />}>
        <LazyComponent {...componentProps} />
      </Suspense>
    );
  }

  // Render loading state
  if (isLoading) {
    return fallback || <DefaultFallback minHeight={minHeight} />;
  }

  // Render placeholder
  return (
    <div ref={containerRef}>{placeholder || <DefaultPlaceholder minHeight={minHeight} />}</div>
  );
}

/**
 * Hook for creating intersection-based lazy loaders
 */
export function useIntersectionLazyLoader<T extends ComponentType<any>>(
  component: () => Promise<{ default: T }>,
  options: Omit<IntersectionLazyLoaderProps, "component"> = {}
) {
  return (props: React.ComponentProps<T>) => (
    <IntersectionLazyLoader component={component} componentProps={props} {...options} />
  );
}

/**
 * Higher-order component for intersection-based lazy loading
 */
export function withIntersectionLazyLoading<T extends ComponentType<unknown>>(
  component: () => Promise<{ default: T }>,
  options: Omit<IntersectionLazyLoaderProps, "component" | "componentProps"> = {}
) {
  return (props: React.ComponentProps<T>) => (
    <IntersectionLazyLoader component={component} componentProps={props} {...options} />
  );
}

/**
 * Prebuilt lazy loaders for common heavy components
 */
export const LazyLoaders = {
  // Dashboard components
  BroLabTrendCharts: withIntersectionLazyLoading(
    () =>
      import("@/components/dashboard/BroLabTrendCharts").then(module => ({
        default: module.BroLabTrendCharts,
      })),
    { minHeight: "400px", rootMargin: "50px" }
  ),

  EnhancedAnalytics: withIntersectionLazyLoading(
    () => import("@/components/dashboard/EnhancedAnalytics"),
    { minHeight: "600px", rootMargin: "100px" }
  ),

  AnalyticsCharts: withIntersectionLazyLoading_(() => import("@/components/AnalyticsCharts"), {
    minHeight: "500px",
    rootMargin: "75px",
  }),

  // Audio components
  WaveformAudioPlayer: withIntersectionLazyLoading(
    () =>
      import("@/components/WaveformAudioPlayer").then(module => ({
        default: module.WaveformAudioPlayer,
      })),
    { minHeight: "120px", rootMargin: "200px" }
  ),

  EnhancedWaveformPlayer: withIntersectionLazyLoading(
    () =>
      import("@/components/EnhancedWaveformPlayer").then(module => ({
        default: module.EnhancedWaveformPlayer,
      })),
    { minHeight: "150px", rootMargin: "200px" }
  ),

  // Table components
  DownloadsTable: withIntersectionLazyLoading_(() => import("@/components/DownloadsTable"), {
    minHeight: "300px",
    rootMargin: "100px",
  }),

  OrdersTable: withIntersectionLazyLoading_(() => import("@/components/OrdersTable"), {
    minHeight: "300px",
    rootMargin: "100px",
  }),
};
