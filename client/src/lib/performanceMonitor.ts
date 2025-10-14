/**
 * Performance monitoring system for the mixing-mastering page
 * Tracks page load times, component render times, API response times, and user interactions
 */

import { logger, type LogContext } from "./logger";

export interface PerformanceMetric {
  name: string;
  value: number;
  unit: "ms" | "bytes" | "count";
  timestamp: string;
  context?: LogContext;
  tags?: string[];
}

export interface ComponentPerformance {
  componentName: string;
  renderTime: number;
  mountTime: number;
  updateCount: number;
  lastUpdate: string;
}

export interface ApiPerformance {
  endpoint: string;
  method: string;
  responseTime: number;
  status: number;
  timestamp: string;
  retryCount?: number;
}

export interface UserInteractionMetric {
  action: string;
  element: string;
  timestamp: string;
  responseTime?: number;
  context?: Record<string, unknown>;
}

class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private metrics: PerformanceMetric[] = [];
  private componentMetrics: Map<string, ComponentPerformance> = new Map();
  private apiMetrics: ApiPerformance[] = [];
  private userInteractions: UserInteractionMetric[] = [];
  private timers: Map<string, number> = new Map();
  private observers: PerformanceObserver[] = [];
  private maxMetrics = 1000;

  private constructor() {
    this.initializePerformanceMonitoring();
  }

  public static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  private initializePerformanceMonitoring(): void {
    // Monitor navigation timing
    this.trackNavigationTiming();

    // Monitor resource loading
    this.trackResourceTiming();

    // Monitor paint timing
    this.trackPaintTiming();

    // Monitor layout shifts
    this.trackLayoutShifts();

    // Monitor long tasks
    this.trackLongTasks();

    // Monitor memory usage
    this.trackMemoryUsage();

    // Track initial page load metrics
    this.trackPageLoadMetrics();
  }

  private trackNavigationTiming(): void {
    if (!window.performance || !window.performance.timing) {
      return;
    }

    window.addEventListener("load", () => {
      setTimeout(() => {
        const timing = window.performance.timing;
        const navigationStart = timing.navigationStart;

        const metrics = [
          { name: "dns_lookup", value: timing.domainLookupEnd - timing.domainLookupStart },
          { name: "tcp_connection", value: timing.connectEnd - timing.connectStart },
          { name: "request_time", value: timing.responseStart - timing.requestStart },
          { name: "response_time", value: timing.responseEnd - timing.responseStart },
          {
            name: "dom_processing",
            value: timing.domContentLoadedEventEnd - timing.domContentLoadedEventStart,
          },
          { name: "load_event", value: timing.loadEventEnd - timing.loadEventStart },
          { name: "total_load_time", value: timing.loadEventEnd - navigationStart },
        ];

        metrics.forEach(metric => {
          if (metric.value > 0) {
            this.recordMetric(metric.name, metric.value, "ms", {
              component: "navigation",
            });
          }
        });
      }, 100);
    });
  }

  private trackResourceTiming(): void {
    if (!window.performance || !window.performance.getEntriesByType) {
      return;
    }

    const observer = new PerformanceObserver(list => {
      list.getEntries().forEach(entry => {
        if (entry.entryType === "resource") {
          const resourceEntry = entry as PerformanceResourceTiming;

          this.recordMetric(
            `resource_${this.getResourceType(resourceEntry.name)}`,
            resourceEntry.duration,
            "ms",
            {
              component: "resource_loading",
              resource: resourceEntry.name,
              size: resourceEntry.transferSize,
            }
          );
        }
      });
    });

    observer.observe({ entryTypes: ["resource"] });
    this.observers.push(observer);
  }

  private trackPaintTiming(): void {
    if (!window.performance || !window.performance.getEntriesByType) {
      return;
    }

    const observer = new PerformanceObserver(list => {
      list.getEntries().forEach(entry => {
        if (entry.entryType === "paint") {
          this.recordMetric(entry.name, entry.startTime, "ms", {
            component: "paint_timing",
          });
        }
      });
    });

    observer.observe({ entryTypes: ["paint"] });
    this.observers.push(observer);
  }

  private trackLayoutShifts(): void {
    if (!window.performance || !("PerformanceObserver" in window)) {
      return;
    }

    try {
      const observer = new PerformanceObserver(list => {
        let cumulativeScore = 0;

        list.getEntries().forEach(entry => {
          if (entry.entryType === "layout-shift" && !(entry as any).hadRecentInput) {
            cumulativeScore += (entry as any).value;
          }
        });

        if (cumulativeScore > 0) {
          this.recordMetric("cumulative_layout_shift", cumulativeScore, "count", {
            component: "layout_stability",
          });
        }
      });

      observer.observe({ entryTypes: ["layout-shift"] });
      this.observers.push(observer);
    } catch (error) {
      logger.logWarning("Layout shift tracking not supported", {
        component: "performance_monitor",
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  private trackLongTasks(): void {
    if (!window.performance || !("PerformanceObserver" in window)) {
      return;
    }

    try {
      const observer = new PerformanceObserver(list => {
        list.getEntries().forEach(entry => {
          if (entry.entryType === "longtask") {
            this.recordMetric("long_task", entry.duration, "ms", {
              component: "main_thread_blocking",
              startTime: entry.startTime,
            });
          }
        });
      });

      observer.observe({ entryTypes: ["longtask"] });
      this.observers.push(observer);
    } catch (error) {
      logger.logWarning("Long task tracking not supported", {
        component: "performance_monitor",
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  private trackMemoryUsage(): void {
    if (!(window.performance as any)?.memory) {
      return;
    }

    const trackMemory = () => {
      const memory = (window.performance as any).memory;

      this.recordMetric("memory_used", memory.usedJSHeapSize, "bytes", {
        component: "memory_usage",
      });

      this.recordMetric("memory_total", memory.totalJSHeapSize, "bytes", {
        component: "memory_usage",
      });

      this.recordMetric("memory_limit", memory.jsHeapSizeLimit, "bytes", {
        component: "memory_usage",
      });
    };

    // Track memory usage every 30 seconds
    trackMemory();
    setInterval(trackMemory, 30000);
  }

  private trackPageLoadMetrics(): void {
    // Track when the page becomes interactive
    document.addEventListener("DOMContentLoaded", () => {
      this.recordMetric("dom_content_loaded", performance.now(), "ms", {
        component: "page_load",
      });
    });

    // Track when all resources are loaded
    window.addEventListener("load", () => {
      this.recordMetric("window_load", performance.now(), "ms", {
        component: "page_load",
      });
    });

    // Track first interaction
    const trackFirstInteraction = () => {
      this.recordMetric("first_interaction", performance.now(), "ms", {
        component: "user_interaction",
      });

      // Remove listeners after first interaction
      document.removeEventListener("click", trackFirstInteraction);
      document.removeEventListener("keydown", trackFirstInteraction);
      document.removeEventListener("scroll", trackFirstInteraction);
    };

    document.addEventListener("click", trackFirstInteraction, { once: true });
    document.addEventListener("keydown", trackFirstInteraction, { once: true });
    document.addEventListener("scroll", trackFirstInteraction, { once: true });
  }

  private getResourceType(url: string): string {
    if (url.includes(".js")) return "javascript";
    if (url.includes(".css")) return "stylesheet";
    if (url.match(/\.(png|jpg|jpeg|gif|svg|webp)$/)) return "image";
    if (url.match(/\.(woff|woff2|ttf|eot)$/)) return "font";
    if (url.includes("/api/")) return "api";
    return "other";
  }

  public recordMetric(
    name: string,
    value: number,
    unit: "ms" | "bytes" | "count",
    context?: LogContext,
    tags?: string[]
  ): void {
    const metric: PerformanceMetric = {
      name,
      value,
      unit,
      timestamp: new Date().toISOString(),
      context,
      tags,
    };

    this.metrics.push(metric);

    // Keep only the most recent metrics
    if (this.metrics.length > this.maxMetrics) {
      this.metrics = this.metrics.slice(-this.maxMetrics);
    }

    logger.logPerformance(name, { value, unit }, context);
  }

  public startTimer(name: string): () => number {
    const startTime = performance.now();
    this.timers.set(name, startTime);

    return () => {
      const endTime = performance.now();
      const duration = endTime - startTime;
      this.timers.delete(name);

      this.recordMetric(`timer_${name}`, duration, "ms", {
        component: "timer",
      });

      return duration;
    };
  }

  public trackComponentPerformance(
    componentName: string,
    renderTime: number,
    isMount: boolean = false
  ): void {
    const existing = this.componentMetrics.get(componentName);

    if (existing) {
      existing.renderTime = renderTime;
      existing.updateCount++;
      existing.lastUpdate = new Date().toISOString();
      if (isMount) {
        existing.mountTime = renderTime;
      }
    } else {
      this.componentMetrics.set(componentName, {
        componentName,
        renderTime,
        mountTime: isMount ? renderTime : 0,
        updateCount: 1,
        lastUpdate: new Date().toISOString(),
      });
    }

    this.recordMetric(`component_${isMount ? "mount" : "render"}`, renderTime, "ms", {
      component: componentName,
    });
  }

  public trackApiPerformance(
    endpoint: string,
    method: string,
    responseTime: number,
    status: number,
    retryCount?: number
  ): void {
    const apiMetric: ApiPerformance = {
      endpoint,
      method,
      responseTime,
      status,
      timestamp: new Date().toISOString(),
      retryCount,
    };

    this.apiMetrics.push(apiMetric);

    // Keep only the most recent API metrics
    if (this.apiMetrics.length > this.maxMetrics) {
      this.apiMetrics = this.apiMetrics.slice(-this.maxMetrics);
    }

    this.recordMetric("api_response_time", responseTime, "ms", {
      component: "api",
      endpoint,
      method,
      status,
      retryCount,
    });
  }

  public trackUserInteraction(
    action: string,
    element: string,
    responseTime?: number,
    context?: Record<string, unknown>
  ): void {
    const interaction: UserInteractionMetric = {
      action,
      element,
      timestamp: new Date().toISOString(),
      responseTime,
      context,
    };

    this.userInteractions.push(interaction);

    // Keep only the most recent interactions
    if (this.userInteractions.length > this.maxMetrics) {
      this.userInteractions = this.userInteractions.slice(-this.maxMetrics);
    }

    if (responseTime) {
      this.recordMetric("user_interaction_response", responseTime, "ms", {
        component: "user_interaction",
        action,
        element,
      });
    }
  }

  public getMetrics(filter?: {
    name?: string;
    component?: string;
    limit?: number;
    since?: Date;
  }): PerformanceMetric[] {
    let filteredMetrics = [...this.metrics];

    if (filter) {
      if (filter.name) {
        filteredMetrics = filteredMetrics.filter(m => m.name.includes(filter.name!));
      }
      if (filter.component) {
        filteredMetrics = filteredMetrics.filter(m => m.context?.component === filter.component);
      }
      if (filter.since) {
        filteredMetrics = filteredMetrics.filter(m => new Date(m.timestamp) >= filter.since!);
      }
      if (filter.limit) {
        filteredMetrics = filteredMetrics.slice(-filter.limit);
      }
    }

    return filteredMetrics.sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }

  public getComponentMetrics(): ComponentPerformance[] {
    return Array.from(this.componentMetrics.values()).sort((a, b) => b.renderTime - a.renderTime);
  }

  public getApiMetrics(limit?: number): ApiPerformance[] {
    const metrics = [...this.apiMetrics];
    return limit ? metrics.slice(-limit) : metrics;
  }

  public getUserInteractions(limit?: number): UserInteractionMetric[] {
    const interactions = [...this.userInteractions];
    return limit ? interactions.slice(-limit) : interactions;
  }

  public getPerformanceSummary(): Record<string, unknown> {
    const now = Date.now();
    const oneMinuteAgo = new Date(now - 60000);
    const recentMetrics = this.getMetrics({ since: oneMinuteAgo });

    const summary = {
      totalMetrics: this.metrics.length,
      recentMetrics: recentMetrics.length,
      componentCount: this.componentMetrics.size,
      apiCallsCount: this.apiMetrics.length,
      userInteractionsCount: this.userInteractions.length,
      averageApiResponseTime: this.calculateAverageApiResponseTime(),
      slowestComponents: this.getComponentMetrics().slice(0, 5),
      recentErrors: recentMetrics.filter(m => m.name.includes("error")).length,
      memoryUsage: this.getLatestMemoryUsage(),
      timestamp: new Date().toISOString(),
    };

    return summary;
  }

  private calculateAverageApiResponseTime(): number {
    if (this.apiMetrics.length === 0) return 0;

    const total = this.apiMetrics.reduce((sum, metric) => sum + metric.responseTime, 0);
    return total / this.apiMetrics.length;
  }

  private getLatestMemoryUsage(): Record<string, number> | null {
    const memoryMetrics = this.metrics.filter(m => m.name.startsWith("memory_"));
    if (memoryMetrics.length === 0) return null;

    const latest = memoryMetrics.reduce((latest, current) =>
      new Date(current.timestamp) > new Date(latest.timestamp) ? current : latest
    );

    return {
      used: memoryMetrics.find(m => m.name === "memory_used")?.value || 0,
      total: memoryMetrics.find(m => m.name === "memory_total")?.value || 0,
      limit: memoryMetrics.find(m => m.name === "memory_limit")?.value || 0,
    };
  }

  public clearMetrics(): void {
    this.metrics = [];
    this.componentMetrics.clear();
    this.apiMetrics = [];
    this.userInteractions = [];
    this.timers.clear();

    logger.logInfo("Performance metrics cleared", {
      component: "performance_monitor",
    });
  }

  public destroy(): void {
    // Clean up observers
    this.observers.forEach(observer => observer.disconnect());
    this.observers = [];

    // Clear all data
    this.clearMetrics();
  }
}

// Export singleton instance
export const performanceMonitor = PerformanceMonitor.getInstance();

// Export convenience functions
export const recordMetric = (
  name: string,
  value: number,
  unit: "ms" | "bytes" | "count",
  context?: LogContext,
  tags?: string[]
) => performanceMonitor.recordMetric(name, value, unit, context, tags);

export const startTimer = (name: string) => performanceMonitor.startTimer(name);

export const trackComponentPerformance = (
  componentName: string,
  renderTime: number,
  isMount?: boolean
) => performanceMonitor.trackComponentPerformance(componentName, renderTime, isMount);

export const trackApiPerformance = (
  endpoint: string,
  method: string,
  responseTime: number,
  status: number,
  retryCount?: number
) => performanceMonitor.trackApiPerformance(endpoint, method, responseTime, status, retryCount);

export const trackUserInteraction = (
  action: string,
  element: string,
  responseTime?: number,
  context?: Record<string, unknown>
) => performanceMonitor.trackUserInteraction(action, element, responseTime, context);

export const getPerformanceMetrics = (
  filter?: Parameters<typeof performanceMonitor.getMetrics>[0]
) => performanceMonitor.getMetrics(filter);

export const getPerformanceSummary = () => performanceMonitor.getPerformanceSummary();

// Make performance monitor available globally in development
if (process.env.NODE_ENV === "development") {
  (window as any).performanceMonitor = {
    getMetrics: getPerformanceMetrics,
    getSummary: getPerformanceSummary,
    getComponentMetrics: () => performanceMonitor.getComponentMetrics(),
    getApiMetrics: () => performanceMonitor.getApiMetrics(),
    getUserInteractions: () => performanceMonitor.getUserInteractions(),
    clearMetrics: () => performanceMonitor.clearMetrics(),
  };
}
