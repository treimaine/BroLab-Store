import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Database, Image, Wifi, Zap } from "lucide-react";
import React, { Suspense, lazy, memo, useCallback, useMemo } from "react";

// Lazy load heavy components
const LazyWaveformPlayer = lazy(() => import("./WaveformPlayer"));
const LazyAdvancedFilters = lazy(() => import("./AdvancedBeatFilters"));
const LazyPaymentDashboard = lazy(() => import("../pages/payment-dashboard"));

// Performance monitoring hook
export const usePerformanceMonitoring = () => {
  const [performanceMetrics, setPerformanceMetrics] = React.useState({
    pageLoadTime: 0,
    firstContentfulPaint: 0,
    largestContentfulPaint: 0,
    cumulativeLayoutShift: 0,
    firstInputDelay: 0,
  });

  React.useEffect(() => {
    // Collect Core Web Vitals
    const observer = new PerformanceObserver(list => {
      list.getEntries().forEach(entry => {
        switch (entry.entryType) {
          case "navigation":
            const navEntry = entry as PerformanceNavigationTiming;
            setPerformanceMetrics(prev => ({
              ...prev,
              pageLoadTime: navEntry.loadEventEnd - navEntry.loadEventStart,
            }));
            break;
          case "paint":
            if (entry.name === "first-contentful-paint") {
              setPerformanceMetrics(prev => ({
                ...prev,
                firstContentfulPaint: entry.startTime,
              }));
            }
            break;
          case "largest-contentful-paint":
            setPerformanceMetrics(prev => ({
              ...prev,
              largestContentfulPaint: entry.startTime,
            }));
            break;
          case "layout-shift":
            setPerformanceMetrics(prev => ({
              ...prev,
              cumulativeLayoutShift: prev.cumulativeLayoutShift + (entry as any).value,
            }));
            break;
        }
      });
    });

    observer.observe({
      entryTypes: ["navigation", "paint", "largest-contentful-paint", "layout-shift"],
    });

    return () => observer.disconnect();
  }, []);

  return performanceMetrics;
};

// Optimized Image Component with lazy loading
export const OptimizedImage: React.FC<{
  src: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  priority?: boolean;
}> = memo(({ src, alt, width, height, className, priority = false }) => {
  const [isLoaded, setIsLoaded] = React.useState(false);
  const [error, setError] = React.useState(false);

  const handleLoad = useCallback(() => {
    setIsLoaded(true);
  }, []);

  const handleError = useCallback(() => {
    setError(true);
  }, []);

  return (
    <div className={`relative overflow-hidden ${className}`}>
      {!isLoaded && !error && (
        <div className="absolute inset-0 bg-gray-700 animate-pulse flex items-center justify-center">
          <Image className="w-8 h-8 text-gray-500" />
        </div>
      )}

      <img
        src={src}
        alt={alt}
        width={width}
        height={height}
        loading={priority ? "eager" : "lazy"}
        onLoad={handleLoad}
        onError={handleError}
        className={`transition-opacity duration-300 ${
          isLoaded ? "opacity-100" : "opacity-0"
        } ${className}`}
        style={{
          width: width ? `${width}px` : "auto",
          height: height ? `${height}px` : "auto",
        }}
      />

      {error && (
        <div className="absolute inset-0 bg-gray-800 flex items-center justify-center">
          <span className="text-gray-400 text-sm">Failed to load</span>
        </div>
      )}
    </div>
  );
});

OptimizedImage.displayName = "OptimizedImage";

// Virtual scrolling for large lists
export const VirtualizedBeatList: React.FC<{
  beats: any[];
  itemHeight: number;
  containerHeight: number;
  renderItem: (item: any, index: number) => React.ReactNode;
}> = memo(({ beats, itemHeight, containerHeight, renderItem }) => {
  const [scrollTop, setScrollTop] = React.useState(0);

  const visibleItemCount = Math.ceil(containerHeight / itemHeight);
  const startIndex = Math.floor(scrollTop / itemHeight);
  const endIndex = Math.min(startIndex + visibleItemCount + 1, beats.length);

  const visibleItems = useMemo(() => {
    return beats.slice(startIndex, endIndex);
  }, [beats, startIndex, endIndex]);

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  return (
    <div className="overflow-auto" style={{ height: containerHeight }} onScroll={handleScroll}>
      <div style={{ height: beats.length * itemHeight, position: "relative" }}>
        {visibleItems.map((item, index) => (
          <div
            key={startIndex + index}
            style={{
              position: "absolute",
              top: (startIndex + index) * itemHeight,
              left: 0,
              right: 0,
              height: itemHeight,
            }}
          >
            {renderItem(item, startIndex + index)}
          </div>
        ))}
      </div>
    </div>
  );
});

VirtualizedBeatList.displayName = "VirtualizedBeatList";

// Import the comprehensive cache manager
import { cacheManager } from "../../../shared/utils/cache-manager";

// Performance Dashboard Component
export const PerformanceDashboard: React.FC = () => {
  const metrics = usePerformanceMonitoring();
  const [cacheStats, setCacheStats] = React.useState({ size: 0, hitRate: 0 });

  React.useEffect(() => {
    const updateCacheStats = async () => {
      try {
        const stats = await cacheManager.getStats();
        setCacheStats({
          size: stats.totalEntries,
          hitRate: stats.hitRate,
        });
      } catch (error) {
        console.error("Failed to get cache stats:", error);
      }
    };

    updateCacheStats();
    const interval = setInterval(updateCacheStats, 5000);
    return () => clearInterval(interval);
  }, []);

  const getPerformanceScore = (value: number, thresholds: [number, number]) => {
    if (value <= thresholds[0]) return "good";
    if (value <= thresholds[1]) return "needs-improvement";
    return "poor";
  };

  const formatTime = (ms: number) => `${ms.toFixed(1)}ms`;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {/* Core Web Vitals */}
      <Card className="border-gray-600 bg-gray-800/50">
        <CardHeader>
          <CardTitle className="text-white flex items-center">
            <Zap className="w-5 h-5 mr-2" />
            Core Web Vitals
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-gray-300">First Contentful Paint</span>
            <div className="flex items-center space-x-2">
              <Badge
                className={
                  getPerformanceScore(metrics.firstContentfulPaint, [1800, 3000]) === "good"
                    ? "bg-green-500"
                    : getPerformanceScore(metrics.firstContentfulPaint, [1800, 3000]) ===
                        "needs-improvement"
                      ? "bg-yellow-500"
                      : "bg-red-500"
                }
              >
                {getPerformanceScore(metrics.firstContentfulPaint, [1800, 3000])}
              </Badge>
              <span className="text-white">{formatTime(metrics.firstContentfulPaint)}</span>
            </div>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-gray-300">Largest Contentful Paint</span>
            <div className="flex items-center space-x-2">
              <Badge
                className={
                  getPerformanceScore(metrics.largestContentfulPaint, [2500, 4000]) === "good"
                    ? "bg-green-500"
                    : getPerformanceScore(metrics.largestContentfulPaint, [2500, 4000]) ===
                        "needs-improvement"
                      ? "bg-yellow-500"
                      : "bg-red-500"
                }
              >
                {getPerformanceScore(metrics.largestContentfulPaint, [2500, 4000])}
              </Badge>
              <span className="text-white">{formatTime(metrics.largestContentfulPaint)}</span>
            </div>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-gray-300">Cumulative Layout Shift</span>
            <div className="flex items-center space-x-2">
              <Badge
                className={
                  getPerformanceScore(metrics.cumulativeLayoutShift, [0.1, 0.25]) === "good"
                    ? "bg-green-500"
                    : getPerformanceScore(metrics.cumulativeLayoutShift, [0.1, 0.25]) ===
                        "needs-improvement"
                      ? "bg-yellow-500"
                      : "bg-red-500"
                }
              >
                {getPerformanceScore(metrics.cumulativeLayoutShift, [0.1, 0.25])}
              </Badge>
              <span className="text-white">{metrics.cumulativeLayoutShift.toFixed(3)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Cache Performance */}
      <Card className="border-gray-600 bg-gray-800/50">
        <CardHeader>
          <CardTitle className="text-white flex items-center">
            <Database className="w-5 h-5 mr-2" />
            Cache Performance
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-gray-300">Cache Size</span>
            <span className="text-white">{cacheStats.size} items</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-300">Hit Rate</span>
            <span className="text-white">{cacheStats.hitRate.toFixed(1)}%</span>
          </div>
          <Button
            onClick={async () => {
              try {
                await cacheManager.clear();
                setCacheStats({ size: 0, hitRate: 0 });
              } catch (error) {
                console.error("Failed to clear cache:", error);
              }
            }}
            size="sm"
            variant="outline"
            className="w-full border-gray-600 text-gray-300"
          >
            Clear Cache
          </Button>
        </CardContent>
      </Card>

      {/* Network Status */}
      <Card className="border-gray-600 bg-gray-800/50">
        <CardHeader>
          <CardTitle className="text-white flex items-center">
            <Wifi className="w-5 h-5 mr-2" />
            Network & Loading
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-gray-300">Connection</span>
            <Badge className="bg-green-500">Online</Badge>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-300">Lazy Loading</span>
            <Badge className="bg-purple-500">Active</Badge>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-300">Image Optimization</span>
            <Badge className="bg-blue-500">Enabled</Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// Optimized Loading Skeleton
export const LoadingSkeleton: React.FC<{
  lines?: number;
  height?: string;
  className?: string;
}> = memo(({ lines = 3, height = "h-4", className = "" }) => {
  return (
    <div className={`animate-pulse space-y-2 ${className}`}>
      {Array.from({ length: lines }).map((_, index) => (
        <div key={index} className={`bg-gray-700 rounded ${height}`} />
      ))}
    </div>
  );
});

LoadingSkeleton.displayName = "LoadingSkeleton";

// Performance-optimized Suspense wrapper
export const OptimizedSuspense: React.FC<{
  children: React.ReactNode;
  fallback?: React.ReactNode;
}> = ({ children, fallback }) => {
  const defaultFallback = (
    <div className="flex items-center justify-center py-8">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500" />
      <span className="ml-2 text-gray-400">Loading...</span>
    </div>
  );

  return <Suspense fallback={fallback || defaultFallback}>{children}</Suspense>;
};
