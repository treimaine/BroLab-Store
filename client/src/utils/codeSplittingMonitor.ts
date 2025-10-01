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
  private metrics: CodeSplittingMetrics;
  private performanceObserver?: PerformanceObserver;

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

  private initializeMonitoring() {
    if (typeof window === "undefined" || process.env.NODEENV !== "development") {
      return;
    }

    // Monitor resource loading (chunks)
    this.performanceObserver = new PerformanceObserver(list => {
      list.getEntries().forEach(entry => {
        if (entry.name.includes("assets/") && entry.name.endsWith(".js")) {
          const chunkName = this.extractChunkName(entry.name);
          this.trackChunkLoad({
            chunkName,
            loadTime: entry.duration,
            size: (entry as PerformanceResourceTiming).transferSize || 0,
            timestamp: Date.now(),
          });
        }
      });
    });

    this.performanceObserver.observe({ entryTypes: ["resource"] });

    // Track initial load time
    window.addEventListener("load", () => {
      this.metrics.initialLoadTime = performance.now();
    });

    // Report metrics periodically
    setInterval(() => {
      this.reportMetrics();
    }, 30000); // Every 30 seconds
  }

  private extractChunkName(url: string): string {
    const match = url.match(/assets\/(.+?)-[a-f0-9]+\.js$/);
    return match ? match[1] : "unknown";
  }

  trackChunkLoad(metric: ChunkLoadMetric) {
    this.metrics.chunksLoaded.push(metric);
    console.log(`📦 Chunk loaded: ${metric.chunkName} (${metric.loadTime.toFixed(2)}ms)`);
  }

  trackComponentRender(componentName: string, renderTime: number, isLazyLoaded = false) {
    const metric: ComponentRenderMetric = {
      componentName,
      renderTime,
      isLazyLoaded,
      timestamp: Date.now(),
    };

    this.metrics.componentsRendered.push(metric);

    if (isLazyLoaded) {
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

  private reportMetrics() {
    const metrics = this.getMetrics();

    console.group("📊 Code Splitting Performance Report");
    console.log(`Initial load time: ${metrics.initialLoadTime.toFixed(2)}ms`);
    console.log(`Chunks loaded: ${metrics.chunksLoaded.length}`);
    console.log(
      `Lazy components rendered: ${metrics.componentsRendered.filter(c => c.isLazyLoaded).length}`
    );
    console.log(`Estimated lazy load savings: ${metrics.lazyLoadSavings}KB`);

    // Top slowest chunks
    const slowestChunks = metrics.chunksLoaded.sort((a, b) => b.loadTime - a.loadTime).slice(0, 5);

    if (slowestChunks.length > 0) {
      console.log("Slowest chunks:");
      slowestChunks.forEach(chunk => {
        console.log(`  ${chunk.chunkName}: ${chunk.loadTime.toFixed(2)}ms`);
      });
    }

    console.groupEnd();
  }

  destroy() {
    this.performanceObserver?.disconnect();
  }
}

export default CodeSplittingMonitor;
