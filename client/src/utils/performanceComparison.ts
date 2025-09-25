/**
 * Performance Comparison Utility
 *
 * Utilities to measure and compare performance improvements
 * between the original and optimized dashboard implementations.
 *
 * Requirements addressed:
 * - 5.1: 50% faster loading times through performance optimization
 * - Measure and validate performance improvements
 */

interface PerformanceBenchmark {
  componentName: string;
  renderTime: number;
  bundleSize: number;
  memoryUsage: number;
  loadTime: number;
  timestamp: number;
}

interface PerformanceComparison {
  original: PerformanceBenchmark;
  optimized: PerformanceBenchmark;
  improvements: {
    renderTimeImprovement: number;
    bundleSizeReduction: number;
    memoryReduction: number;
    loadTimeImprovement: number;
    overallImprovement: number;
  };
}

class PerformanceTracker {
  private benchmarks: Map<string, PerformanceBenchmark[]> = new Map();
  private readonly maxBenchmarks = 100; // Keep last 100 benchmarks per component

  // Record a performance benchmark
  recordBenchmark(benchmark: PerformanceBenchmark): void {
    const key = benchmark.componentName;
    const existing = this.benchmarks.get(key) || [];

    existing.push(benchmark);

    // Keep only the most recent benchmarks
    if (existing.length > this.maxBenchmarks) {
      existing.splice(0, existing.length - this.maxBenchmarks);
    }

    this.benchmarks.set(key, existing);
  }

  // Get average performance for a component
  getAveragePerformance(componentName: string, sampleSize = 10): PerformanceBenchmark | null {
    const benchmarks = this.benchmarks.get(componentName);
    if (!benchmarks || benchmarks.length === 0) return null;

    const recentBenchmarks = benchmarks.slice(-sampleSize);
    const count = recentBenchmarks.length;

    return {
      componentName,
      renderTime: recentBenchmarks.reduce((sum, b) => sum + b.renderTime, 0) / count,
      bundleSize: recentBenchmarks.reduce((sum, b) => sum + b.bundleSize, 0) / count,
      memoryUsage: recentBenchmarks.reduce((sum, b) => sum + b.memoryUsage, 0) / count,
      loadTime: recentBenchmarks.reduce((sum, b) => sum + b.loadTime, 0) / count,
      timestamp: Date.now(),
    };
  }

  // Compare two components' performance
  comparePerformance(
    originalComponent: string,
    optimizedComponent: string,
    sampleSize = 10
  ): PerformanceComparison | null {
    const original = this.getAveragePerformance(originalComponent, sampleSize);
    const optimized = this.getAveragePerformance(optimizedComponent, sampleSize);

    if (!original || !optimized) return null;

    const renderTimeImprovement =
      ((original.renderTime - optimized.renderTime) / original.renderTime) * 100;
    const bundleSizeReduction =
      ((original.bundleSize - optimized.bundleSize) / original.bundleSize) * 100;
    const memoryReduction =
      ((original.memoryUsage - optimized.memoryUsage) / original.memoryUsage) * 100;
    const loadTimeImprovement =
      ((original.loadTime - optimized.loadTime) / original.loadTime) * 100;

    // Calculate overall improvement as weighted average
    const overallImprovement =
      renderTimeImprovement * 0.3 +
      bundleSizeReduction * 0.25 +
      memoryReduction * 0.2 +
      loadTimeImprovement * 0.25;

    return {
      original,
      optimized,
      improvements: {
        renderTimeImprovement,
        bundleSizeReduction,
        memoryReduction,
        loadTimeImprovement,
        overallImprovement,
      },
    };
  }

  // Generate performance report
  generateReport(originalComponent: string, optimizedComponent: string): string {
    const comparison = this.comparePerformance(originalComponent, optimizedComponent);

    if (!comparison) {
      return "Insufficient data for performance comparison";
    }

    const { original, optimized, improvements } = comparison;

    return `
Performance Comparison Report
============================

Component: ${originalComponent} vs ${optimizedComponent}

Original Performance:
- Render Time: ${original.renderTime.toFixed(2)}ms
- Bundle Size: ${(original.bundleSize / 1024).toFixed(2)}KB
- Memory Usage: ${(original.memoryUsage / 1024 / 1024).toFixed(2)}MB
- Load Time: ${original.loadTime.toFixed(2)}ms

Optimized Performance:
- Render Time: ${optimized.renderTime.toFixed(2)}ms
- Bundle Size: ${(optimized.bundleSize / 1024).toFixed(2)}KB
- Memory Usage: ${(optimized.memoryUsage / 1024 / 1024).toFixed(2)}MB
- Load Time: ${optimized.loadTime.toFixed(2)}ms

Improvements:
- Render Time: ${improvements.renderTimeImprovement.toFixed(1)}% faster
- Bundle Size: ${improvements.bundleSizeReduction.toFixed(1)}% smaller
- Memory Usage: ${improvements.memoryReduction.toFixed(1)}% less
- Load Time: ${improvements.loadTimeImprovement.toFixed(1)}% faster

Overall Improvement: ${improvements.overallImprovement.toFixed(1)}%

Target Achievement: ${improvements.overallImprovement >= 50 ? "✅ ACHIEVED" : "❌ NOT ACHIEVED"}
(Target: 50% improvement)
    `.trim();
  }

  // Export benchmarks for analysis
  exportBenchmarks(): string {
    const data = Array.from(this.benchmarks.entries()).map(([component, benchmarks]) => ({
      component,
      benchmarks: benchmarks.slice(-10), // Last 10 benchmarks
    }));

    return JSON.stringify(data, null, 2);
  }

  // Clear all benchmarks
  clear(): void {
    this.benchmarks.clear();
  }
}

// Global performance tracker instance
export const performanceTracker = new PerformanceTracker();

// Utility functions for measuring performance
export function measureComponentPerformance(
  componentName: string,
  renderFunction: () => void
): Promise<number> {
  return new Promise(resolve => {
    const startTime = performance.now();

    // Use requestAnimationFrame to measure after render
    requestAnimationFrame(() => {
      const endTime = performance.now();
      const renderTime = endTime - startTime;

      resolve(renderTime);
    });

    renderFunction();
  });
}

export function measureBundleSize(): number {
  if (typeof performance !== "undefined" && performance.getEntriesByType) {
    const navigationEntries = performance.getEntriesByType("navigation") as any[];
    if (navigationEntries.length > 0) {
      const entry = navigationEntries[0];
      return entry.transferSize || 0;
    }
  }
  return 0;
}

export function measureMemoryUsage(): number {
  if (typeof performance !== "undefined" && (performance as any).memory) {
    const memory = (performance as any).memory;
    return memory.usedJSHeapSize || 0;
  }
  return 0;
}

export function measureLoadTime(): number {
  if (typeof performance !== "undefined" && performance.getEntriesByType) {
    const navigationEntries = performance.getEntriesByType("navigation") as any[];
    if (navigationEntries.length > 0) {
      const entry = navigationEntries[0];
      return entry.loadEventEnd - entry.navigationStart;
    }
  }
  return 0;
}

// Create a benchmark for a component
export function createBenchmark(componentName: string): PerformanceBenchmark {
  return {
    componentName,
    renderTime: 0, // Will be measured separately
    bundleSize: measureBundleSize(),
    memoryUsage: measureMemoryUsage(),
    loadTime: measureLoadTime(),
    timestamp: Date.now(),
  };
}

// Performance testing utilities
export class PerformanceTester {
  private results: Map<string, number[]> = new Map();

  async testComponent(
    componentName: string,
    testFunction: () => Promise<void> | void,
    iterations = 10
  ): Promise<{
    average: number;
    min: number;
    max: number;
    median: number;
    standardDeviation: number;
  }> {
    const times: number[] = [];

    for (let i = 0; i < iterations; i++) {
      const startTime = performance.now();

      await testFunction();

      const endTime = performance.now();
      times.push(endTime - startTime);

      // Small delay between tests
      await new Promise(resolve => setTimeout(resolve, 10));
    }

    this.results.set(componentName, times);

    const average = times.reduce((sum, time) => sum + time, 0) / times.length;
    const min = Math.min(...times);
    const max = Math.max(...times);
    const sortedTimes = [...times].sort((a, b) => a - b);
    const median = sortedTimes[Math.floor(sortedTimes.length / 2)];

    const variance =
      times.reduce((sum, time) => sum + Math.pow(time - average, 2), 0) / times.length;
    const standardDeviation = Math.sqrt(variance);

    return {
      average,
      min,
      max,
      median,
      standardDeviation,
    };
  }

  getResults(): Map<string, number[]> {
    return new Map(this.results);
  }

  generateTestReport(): string {
    let report = "Performance Test Results\n";
    report += "========================\n\n";

    for (const [component, times] of this.results) {
      const average = times.reduce((sum, time) => sum + time, 0) / times.length;
      const min = Math.min(...times);
      const max = Math.max(...times);

      report += `${component}:\n`;
      report += `  Average: ${average.toFixed(2)}ms\n`;
      report += `  Min: ${min.toFixed(2)}ms\n`;
      report += `  Max: ${max.toFixed(2)}ms\n`;
      report += `  Iterations: ${times.length}\n\n`;
    }

    return report;
  }
}

export default performanceTracker;
