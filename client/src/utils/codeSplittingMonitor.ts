/**
 * Code Splitting Performance Monitor
 *
 * Monitors and reports on the effectiveness of code splitting optimizations
 * Tracks bundle loading times, component render times, and user interactions
 */

export interface ChunkLoadMetric {
  chunkName: string;
  loadTime: number;
  size?: number;
  timestamp: number;
}

export interface ComponentRenderMetric {
  componentName: string;
  renderTime: number;
  isLazyLoaded: boolean;
  timestamp: number;
}

export interface CodeSplittingMetrics {
  chunksLoaded: ChunkLoadMetric[];
  componentsRendered: ComponentRenderMetric[];
  totalBundleSize: number;
  initialLoadTime: number;
  lazyLoadSavings: number;
}

class CodeSplittingMonitor {
  private static instance: CodeSplittingMonitor;
  private readonly metrics: CodeSplittingMetrics;
  private performanceObserver?: PerformanceObserver;
  private reportInterval?: NodeJS.Timeout;
  private _visibilityHandler?: () => void;

  private constructor() {
    this.metrics = {
      chunksLoaded: [],
      componentsRendered: [],
      totalBundleSize: 0,
      initialLoadTime: 0,
      lazyLoadSavings: 0,
    };
    this.initializeMonitoring();
  }

  static getInstance(): CodeSplittingMonitor {
    if (!CodeSplittingMonitor.instance) {
      CodeSplittingMonitor.instance = new CodeSplittingMonitor();
    }
    return CodeSplittingMonitor.instance;
  }

  private initializeMonitoring(): void {
    if (globalThis.window === undefined || process.env.NODE_ENV !== "development") {
      return;
    }

    // Monitor resource loading (chunks)
    this.performanceObserver = new PerformanceObserver(list => {
      for (const entry of list.getEntries()) {
        if (entry.name.includes("assets/") && entry.name.endsWith(".js")) {
          const chunkName = this.extractChunkName(entry.name);
          this.trackChunkLoad({
            chunkName,
            loadTime: entry.duration,
            size: (entry as PerformanceResourceTiming).transferSize || 0,
            timestamp: Date.now(),
          });
        }
      }
    });

    this.performanceObserver.observe({ entryTypes: ["resource"] });

    // Track initial load time
    globalThis.window.addEventListener("load", () => {
      this.metrics.initialLoadTime = performance.now();
    });

    // Report metrics periodically
    // FIX: Added visibility awareness to pause reporting when tab is hidden
    const startReportInterval = (): void => {
      if (this.reportInterval) return;
      this.reportInterval = setInterval(() => {
        if (!document.hidden) {
          this.reportMetrics();
        }
      }, 30000); // Every 30 seconds
    };

    const stopReportInterval = (): void => {
      if (this.reportInterval) {
        clearInterval(this.reportInterval);
        this.reportInterval = undefined;
      }
    };

    const handleVisibilityChange = (): void => {
      if (document.hidden) {
        stopReportInterval();
      } else {
        startReportInterval();
      }
    };

    // Start if visible
    if (!document.hidden) {
      startReportInterval();
    }

    document.addEventListener("visibilitychange", handleVisibilityChange, { passive: true });

    // Store cleanup reference for destroy()
    this._visibilityHandler = handleVisibilityChange;
  }

  private extractChunkName(url: string): string {
    const regex = /assets\/(.+?)-[a-f0-9]+\.js$/;
    const match = regex.exec(url);
    return match ? match[1] : "unknown";
  }

  trackChunkLoad(metric: ChunkLoadMetric): void {
    this.metrics.chunksLoaded.push(metric);
    if (import.meta.env.DEV) {
      console.log(`📦 Chunk loaded: ${metric.chunkName} (${metric.loadTime.toFixed(2)}ms)`);
    }
  }

  trackComponentRender(componentName: string, renderTime: number, isLazyLoaded = false): void {
    const metric: ComponentRenderMetric = {
      componentName,
      renderTime,
      isLazyLoaded,
      timestamp: Date.now(),
    };

    this.metrics.componentsRendered.push(metric);

    if (isLazyLoaded && import.meta.env.DEV) {
      console.log(`🚀 Lazy component rendered: ${componentName} (${renderTime.toFixed(2)}ms)`);
    }
  }

  calculateLazyLoadSavings(): number {
    const lazyComponents = this.metrics.componentsRendered.filter(m => m.isLazyLoaded);
    const totalLazySize = lazyComponents.length * 50; // Estimate 50KB per lazy component
    return totalLazySize;
  }

  getMetrics(): CodeSplittingMetrics {
    return {
      ...this.metrics,
      lazyLoadSavings: this.calculateLazyLoadSavings(),
    };
  }

  private reportMetrics(): void {
    if (!import.meta.env.DEV) return;

    const metrics = this.getMetrics();

    console.group("📊 Code Splitting Performance Report");
    console.log(`Initial load time: ${metrics.initialLoadTime.toFixed(2)}ms`);
    console.log(`Chunks loaded: ${metrics.chunksLoaded.length}`);
    console.log(
      `Lazy components rendered: ${metrics.componentsRendered.filter(c => c.isLazyLoaded).length}`
    );
    console.log(`Estimated lazy load savings: ${metrics.lazyLoadSavings}KB`);

    // Top slowest chunks
    const sortedChunks = metrics.chunksLoaded.toSorted((a, b) => b.loadTime - a.loadTime);
    const slowestChunks = sortedChunks.slice(0, 5);

    if (slowestChunks.length > 0) {
      console.log("Slowest chunks:");
      for (const chunk of slowestChunks) {
        console.log(`  ${chunk.chunkName}: ${chunk.loadTime.toFixed(2)}ms`);
      }
    }

    console.groupEnd();
  }

  destroy(): void {
    if (this.reportInterval) {
      clearInterval(this.reportInterval);
      this.reportInterval = undefined;
    }
    this.performanceObserver?.disconnect();
    // FIX: Clean up visibility listener
    if (this._visibilityHandler) {
      document.removeEventListener("visibilitychange", this._visibilityHandler);
      this._visibilityHandler = undefined;
    }
  }
}

export default CodeSplittingMonitor;
