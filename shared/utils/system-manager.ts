// System manager that coordinates all core infrastructure components

import { RateLimiter } from "../types/core";
import {
  ErrorBoundaryManager,
  HealthCheck,
  HealthMonitor,
  MetricTrend,
  OfflineManager,
  OptimisticUpdateManager,
  PerformanceMetric,
  PerformanceMonitor,
  RetryManager,
  SystemHealth,
  TimeRange,
  Timer,
  WebVitals,
} from "../types/system-optimization";
import { ErrorBoundaryManagerImpl, setupGlobalErrorHandlers } from "./error-handler";
import { OfflineManagerImpl } from "./offline-manager";
import { OptimisticUpdateManagerImpl } from "./optimistic-update-manager";
import { RateLimiterImpl } from "./rate-limiter";
import { RetryManagerImpl } from "./retry-manager";
import { SyncManager, SyncStatus } from "./syncManager";

// Browser Performance API with memory extension (non-standard)
interface PerformanceMemory {
  usedJSHeapSize: number;
  totalJSHeapSize: number;
  jsHeapSizeLimit: number;
}

interface PerformanceWithMemory extends Performance {
  memory: PerformanceMemory;
}

// ================================
// PERFORMANCE MONITOR IMPLEMENTATION
// ================================

export class PerformanceMonitorImpl implements PerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private timers: Map<string, Timer> = new Map();
  private maxMetrics = 10000;

  trackMetric(name: string, value: number, tags: Record<string, string> = {}): void {
    const metric: PerformanceMetric = {
      id: this.generateId(),
      name,
      value,
      unit: this.inferUnit(name),
      timestamp: Date.now(),
      tags,
      sessionId: this.getSessionId(),
      userId: this.getUserId(),
      component: tags.component,
    };

    this.metrics.push(metric);

    // Keep metrics array manageable
    if (this.metrics.length > this.maxMetrics) {
      this.metrics = this.metrics.slice(-this.maxMetrics);
    }
  }

  startTimer(name: string, tags: Record<string, string> = {}): Timer {
    const timer: Timer = {
      name,
      startTime: performance.now(),
      tags,
      stop: () => {
        timer.endTime = performance.now();
        timer.duration = timer.endTime - timer.startTime;

        // Track the metric
        this.trackMetric(name, timer.duration, { ...tags, type: "duration" });

        // Remove from active timers
        this.timers.delete(name);

        return timer.duration;
      },
    };

    this.timers.set(name, timer);
    return timer;
  }

  recordWebVitals(vitals: WebVitals): void {
    // Track each vital as a separate metric
    Object.entries(vitals).forEach(([key, value]) => {
      if (key !== "url" && key !== "timestamp" && typeof value === "number") {
        this.trackMetric(`web_vitals_${key.toLowerCase()}`, value, {
          type: "web_vital",
          url: vitals.url,
        });
      }
    });
  }

  async getMetrics(timeRange?: TimeRange): Promise<PerformanceMetric[]> {
    let filteredMetrics = this.metrics;

    if (timeRange) {
      filteredMetrics = this.metrics.filter(
        metric => metric.timestamp >= timeRange.start && metric.timestamp <= timeRange.end
      );
    }

    return filteredMetrics.sort((a, b) => b.timestamp - a.timestamp);
  }

  async clearMetrics(): Promise<void> {
    this.metrics = [];
    this.timers.clear();
  }

  async getAverageMetric(name: string, timeRange?: TimeRange): Promise<number> {
    const metrics = await this.getMetrics(timeRange);
    const namedMetrics = metrics.filter(m => m.name === name);

    if (namedMetrics.length === 0) return 0;

    const sum = namedMetrics.reduce((acc, metric) => acc + metric.value, 0);
    return sum / namedMetrics.length;
  }

  async getMetricTrends(name: string, timeRange?: TimeRange): Promise<MetricTrend[]> {
    const metrics = await this.getMetrics(timeRange);
    const namedMetrics = metrics
      .filter(m => m.name === name)
      .sort((a, b) => a.timestamp - b.timestamp);

    const trends: MetricTrend[] = [];

    for (let i = 0; i < namedMetrics.length; i++) {
      const current = namedMetrics[i];
      const previous = i > 0 ? namedMetrics[i - 1] : null;

      const change = previous ? ((current.value - previous.value) / previous.value) * 100 : 0;

      trends.push({
        timestamp: current.timestamp,
        value: current.value,
        change,
      });
    }

    return trends;
  }

  private generateId(): string {
    return `metric_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }

  private inferUnit(name: string): string {
    const lowerName = name.toLowerCase();

    if (
      lowerName.includes("time") ||
      lowerName.includes("duration") ||
      lowerName.includes("delay")
    ) {
      return "ms";
    }
    if (lowerName.includes("size") || lowerName.includes("memory")) {
      return "bytes";
    }
    if (lowerName.includes("rate") || lowerName.includes("percentage")) {
      return "%";
    }
    if (lowerName.includes("count") || lowerName.includes("number")) {
      return "count";
    }

    return "unit";
  }

  private getSessionId(): string {
    // In a real implementation, this would get the actual session ID
    return typeof window !== "undefined"
      ? sessionStorage.getItem("sessionId") || "unknown"
      : "server";
  }

  private getUserId(): string | undefined {
    // In a real implementation, this would get the actual user ID
    return undefined;
  }
}

// ================================
// HEALTH MONITOR IMPLEMENTATION
// ================================

export class HealthMonitorImpl implements HealthMonitor {
  private checks: Map<string, { check: () => Promise<HealthCheck>; critical: boolean }> = new Map();
  private checkHistory: Map<string, HealthCheck[]> = new Map();
  private maxHistorySize = 100;

  registerCheck(name: string, check: () => Promise<HealthCheck>, critical = false): void {
    this.checks.set(name, { check, critical });
  }

  async runChecks(): Promise<SystemHealth> {
    const checkResults: HealthCheck[] = [];

    for (const [name, { check, critical }] of Array.from(this.checks.entries())) {
      try {
        const result = await Promise.race([
          check(),
          this.timeoutPromise(5000, name), // 5 second timeout
        ]);

        const healthCheck: HealthCheck = {
          ...result,
          name,
          critical,
          timestamp: Date.now(),
        };

        checkResults.push(healthCheck);
        this.addToHistory(name, healthCheck);
      } catch (error) {
        const failedCheck: HealthCheck = {
          name,
          status: "unhealthy",
          message: error instanceof Error ? error.message : "Check failed",
          timestamp: Date.now(),
          critical,
        };

        checkResults.push(failedCheck);
        this.addToHistory(name, failedCheck);
      }
    }

    const overall = this.calculateOverallHealth(checkResults);

    return {
      overall,
      checks: checkResults,
      timestamp: Date.now(),
      uptime: this.getUptime(),
      version: this.getVersion(),
      environment: this.getEnvironment(),
    };
  }

  async getHealth(): Promise<SystemHealth> {
    return this.runChecks();
  }

  async isHealthy(): Promise<boolean> {
    const health = await this.getHealth();
    return health.overall === "healthy";
  }

  async getCheckHistory(checkName: string): Promise<HealthCheck[]> {
    return this.checkHistory.get(checkName) || [];
  }

  removeCheck(name: string): void {
    this.checks.delete(name);
    this.checkHistory.delete(name);
  }

  private async timeoutPromise(ms: number, checkName: string): Promise<HealthCheck> {
    return new Promise((_, reject) => {
      setTimeout(() => reject(new Error(`Health check '${checkName}' timed out`)), ms);
    });
  }

  private calculateOverallHealth(checks: HealthCheck[]): SystemHealth["overall"] {
    const criticalChecks = checks.filter(check => check.critical);
    const hasCriticalFailures = criticalChecks.some(check => check.status === "unhealthy");

    if (hasCriticalFailures) {
      return "unhealthy";
    }

    const hasAnyFailures = checks.some(check => check.status === "unhealthy");
    const hasDegradedServices = checks.some(check => check.status === "degraded");

    if (hasAnyFailures || hasDegradedServices) {
      return "degraded";
    }

    return "healthy";
  }

  private addToHistory(checkName: string, check: HealthCheck): void {
    if (!this.checkHistory.has(checkName)) {
      this.checkHistory.set(checkName, []);
    }

    const history = this.checkHistory.get(checkName)!;
    history.push(check);

    // Keep history manageable
    if (history.length > this.maxHistorySize) {
      history.splice(0, history.length - this.maxHistorySize);
    }
  }

  private getUptime(): number {
    // In a real implementation, this would track actual uptime
    return Date.now() - (typeof process !== "undefined" ? process.uptime() * 1000 : 0);
  }

  private getVersion(): string {
    // In a real implementation, this would get the actual version
    return process.env.npm_package_version || "1.0.0";
  }

  private getEnvironment(): string {
    return process.env.NODE_ENV || "development";
  }
}

// ================================
// SYSTEM MANAGER MAIN CLASS
// ================================

export class SystemManager {
  private static instance: SystemManager;

  public readonly syncManager: SyncManager;
  public readonly retryManager: RetryManager;
  public readonly errorBoundaryManager: ErrorBoundaryManager;
  public readonly performanceMonitor: PerformanceMonitor;
  public readonly healthMonitor: HealthMonitor;
  public readonly rateLimiter: RateLimiter;
  public readonly offlineManager: OfflineManager;
  public readonly optimisticUpdateManager: OptimisticUpdateManager;

  private initialized = false;

  private constructor() {
    this.syncManager = new SyncManager();
    this.retryManager = new RetryManagerImpl();
    this.errorBoundaryManager = new ErrorBoundaryManagerImpl();
    this.performanceMonitor = new PerformanceMonitorImpl();
    this.healthMonitor = new HealthMonitorImpl();
    this.rateLimiter = new RateLimiterImpl();

    // Integrate error boundary manager with performance monitor for comprehensive reporting
    this.errorBoundaryManager.setPerformanceMonitor(this.performanceMonitor);

    // Initialize offline manager and optimistic update manager
    this.offlineManager = new OfflineManagerImpl(this.syncManager);
    this.optimisticUpdateManager = new OptimisticUpdateManagerImpl();
  }

  public static getInstance(): SystemManager {
    if (!SystemManager.instance) {
      SystemManager.instance = new SystemManager();
    }
    return SystemManager.instance;
  }

  public async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      // Set up global error handlers
      setupGlobalErrorHandlers();

      // Register default health checks
      this.registerDefaultHealthChecks();

      // Start performance monitoring
      this.startPerformanceMonitoring();

      // Start rate limiter monitoring
      this.startRateLimiterMonitoring();

      this.initialized = true;

      console.log("System Manager initialized successfully");
    } catch (error) {
      console.error("Failed to initialize System Manager:", error);
      throw error;
    }
  }

  public async getSystemStatus(): Promise<{
    sync: SyncStatus;
    health: SystemHealth;
    performance: {
      averageResponseTime: number;
      errorRate: number;
      memoryUsage: number;
    };
  }> {
    const [syncStatus, health] = await Promise.all([
      this.syncManager.getSyncStatus(),
      this.healthMonitor.getHealth(),
    ]);

    const now = Date.now();
    const oneHourAgo = now - 60 * 60 * 1000;
    const timeRange: TimeRange = { start: oneHourAgo, end: now };

    const [averageResponseTime, errorMetrics] = await Promise.all([
      this.performanceMonitor.getAverageMetric("api_response_time", timeRange),
      this.performanceMonitor.getMetrics(timeRange),
    ]);

    const errorCount = errorMetrics.filter(m => m.name.includes("error")).length;
    const totalRequests = errorMetrics.filter(m => m.name.includes("request")).length;
    const errorRate = totalRequests > 0 ? (errorCount / totalRequests) * 100 : 0;

    return {
      sync: syncStatus,
      health,
      performance: {
        averageResponseTime,
        errorRate,
        memoryUsage: this.getMemoryUsage(),
      },
    };
  }

  private registerDefaultHealthChecks(): void {
    // Memory usage check
    this.healthMonitor.registerCheck(
      "memory",
      async () => {
        const usage = this.getMemoryUsage();
        const status = usage > 0.9 ? "unhealthy" : usage > 0.7 ? "degraded" : "healthy";

        return {
          name: "memory",
          status,
          message: `Memory usage: ${(usage * 100).toFixed(1)}%`,
          timestamp: Date.now(),
          responseTime: 1,
          metadata: { usage },
          critical: true,
        };
      },
      true
    );

    // Sync manager health check
    this.healthMonitor.registerCheck("sync", async () => {
      const syncStatus = await this.syncManager.getSyncStatus();
      const hasErrors = syncStatus.errors.length > 0;
      const status = hasErrors ? "degraded" : "healthy";

      return {
        name: "sync",
        status,
        message: `Pending operations: ${syncStatus.pendingOperations}, Errors: ${syncStatus.errors.length}`,
        timestamp: Date.now(),
        responseTime: 2,
        metadata: {
          pendingOperations: syncStatus.pendingOperations,
          errorCount: syncStatus.errors.length,
          isActive: syncStatus.isActive,
          queueSize: syncStatus.queueSize,
          processingRate: syncStatus.processingRate,
        },
        critical: false,
      };
    });

    // Rate limiter health check
    this.healthMonitor.registerCheck("rate_limiter", async () => {
      try {
        const metrics = await this.rateLimiter.getMetrics();
        const blockRate =
          metrics.totalRequests > 0 ? (metrics.totalBlocked / metrics.totalRequests) * 100 : 0;

        let status: "healthy" | "degraded" | "unhealthy" = "healthy";
        let message = `Active windows: ${metrics.activeWindows}, Block rate: ${blockRate.toFixed(1)}%`;

        if (blockRate > 50) {
          status = "unhealthy";
          message = `High block rate: ${blockRate.toFixed(1)}% - possible attack or misconfiguration`;
        } else if (blockRate > 20) {
          status = "degraded";
          message = `Elevated block rate: ${blockRate.toFixed(1)}% - monitor closely`;
        }

        return {
          name: "rate_limiter",
          status,
          message,
          timestamp: Date.now(),
          responseTime: 5,
          metadata: {
            totalKeys: metrics.totalKeys,
            totalRequests: metrics.totalRequests,
            totalBlocked: metrics.totalBlocked,
            activeWindows: metrics.activeWindows,
            blockRate: blockRate,
          },
          critical: false,
        };
      } catch (error) {
        return {
          name: "rate_limiter",
          status: "unhealthy",
          message: `Rate limiter check failed: ${error instanceof Error ? error.message : "unknown error"}`,
          timestamp: Date.now(),
          responseTime: 0,
          critical: false,
        };
      }
    });
  }

  private startPerformanceMonitoring(): void {
    // Track basic system metrics periodically
    setInterval(() => {
      this.performanceMonitor.trackMetric("memory_usage", this.getMemoryUsage(), {
        type: "system",
        component: "system_manager",
      });
    }, 30000); // Every 30 seconds
  }

  private startRateLimiterMonitoring(): void {
    // Track rate limiter metrics periodically
    setInterval(async () => {
      try {
        const metrics = await this.rateLimiter.getMetrics();

        this.performanceMonitor.trackMetric("rate_limit_total_keys", metrics.totalKeys, {
          type: "rate_limit",
          component: "rate_limiter",
        });

        this.performanceMonitor.trackMetric("rate_limit_total_requests", metrics.totalRequests, {
          type: "rate_limit",
          component: "rate_limiter",
        });

        this.performanceMonitor.trackMetric("rate_limit_total_blocked", metrics.totalBlocked, {
          type: "rate_limit",
          component: "rate_limiter",
        });

        this.performanceMonitor.trackMetric("rate_limit_active_windows", metrics.activeWindows, {
          type: "rate_limit",
          component: "rate_limiter",
        });

        // Track block rate
        const blockRate =
          metrics.totalRequests > 0 ? (metrics.totalBlocked / metrics.totalRequests) * 100 : 0;
        this.performanceMonitor.trackMetric("rate_limit_block_rate", blockRate, {
          type: "rate_limit",
          component: "rate_limiter",
          unit: "percentage",
        });
      } catch (error) {
        console.error("Failed to collect rate limiter metrics:", error);
      }
    }, 60000); // Every minute

    // Cleanup expired rate limits periodically
    setInterval(
      async () => {
        try {
          const result = await this.rateLimiter.cleanupExpired(24 * 60 * 60 * 1000); // 24 hours

          if (result.deletedCount > 0) {
            this.performanceMonitor.trackMetric("rate_limit_cleanup", result.deletedCount, {
              type: "rate_limit",
              component: "rate_limiter",
            });
          }
        } catch (error) {
          console.error("Failed to cleanup expired rate limits:", error);
        }
      },
      60 * 60 * 1000
    ); // Every hour
  }

  private getMemoryUsage(): number {
    if (typeof process !== "undefined" && process.memoryUsage) {
      const usage = process.memoryUsage();
      return usage.heapUsed / usage.heapTotal;
    }

    // Browser memory estimation (not accurate)
    if (typeof performance !== "undefined" && "memory" in performance) {
      const memory = (performance as PerformanceWithMemory).memory;
      return memory.usedJSHeapSize / memory.jsHeapSizeLimit;
    }

    return 0;
  }

  public async shutdown(): Promise<void> {
    try {
      // Clear all sync operations
      this.syncManager.clearAll();

      // Clear performance metrics
      await this.performanceMonitor.clearMetrics();

      // Clear error logs
      this.errorBoundaryManager.clearErrors();

      this.initialized = false;

      console.log("System Manager shut down successfully");
    } catch (error) {
      console.error("Error during System Manager shutdown:", error);
      throw error;
    }
  }
}

// Export singleton instance
export const systemManager = SystemManager.getInstance();

// Export individual managers for direct access
export const syncManager = systemManager.syncManager;
export const retryManager = systemManager.retryManager;
export const errorBoundaryManager = systemManager.errorBoundaryManager;
export const performanceMonitor = systemManager.performanceMonitor;
export const healthMonitor = systemManager.healthMonitor;
export const rateLimiter = systemManager.rateLimiter;
export const offlineManager = systemManager.offlineManager;
export const optimisticUpdateManager = systemManager.optimisticUpdateManager;
