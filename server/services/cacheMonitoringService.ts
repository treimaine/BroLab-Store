/**
 * Cache Monitoring and Analytics Service
 *
 * Monitors cache performance, tracks metrics, and provides
 * insights for cache optimization.
 */

import { EventEmitter } from "events";
import { cache } from "../lib/cache";

interface CacheMetric {
  timestamp: Date;
  operation: "hit" | "miss" | "set" | "delete" | "eviction";
  key: string;
  responseTime?: number;
  size?: number;
  tags?: string[];
}

interface CacheAlert {
  id: string;
  type: "performance" | "capacity" | "error";
  severity: "low" | "medium" | "high" | "critical";
  message: string;
  timestamp: Date;
  resolved: boolean;
  metadata?: Record<string, any>;
}

interface CacheAnalytics {
  hitRate: number;
  missRate: number;
  averageResponseTime: number;
  totalOperations: number;
  cacheSize: number;
  memoryUsage: number;
  topKeys: Array<{ key: string; hits: number; misses: number }>;
  performanceTrends: Array<{ timestamp: Date; hitRate: number; responseTime: number }>;
  alerts: CacheAlert[];
}

/**
 * Cache Monitoring Service
 */
export class CacheMonitoringService extends EventEmitter {
  private metrics: CacheMetric[] = [];
  private alerts: CacheAlert[] = [];
  private keyStats: Map<string, { hits: number; misses: number; totalTime: number }> = new Map();
  private performanceHistory: Array<{ timestamp: Date; hitRate: number; responseTime: number }> =
    [];
  private maxMetricsHistory = 10000; // Keep last 10k metrics
  private maxPerformanceHistory = 1000; // Keep last 1k performance snapshots
  private monitoringInterval?: NodeJS.Timeout;

  constructor() {
    super();
    this.startMonitoring();
  }

  /**
   * Record a cache operation
   */
  recordOperation(
    operation: CacheMetric["operation"],
    key: string,
    options: {
      responseTime?: number;
      size?: number;
      tags?: string[];
    } = {}
  ): void {
    const metric: CacheMetric = {
      timestamp: new Date(),
      operation,
      key,
      ...options,
    };

    this.metrics.push(metric);

    // Maintain metrics history limit
    if (this.metrics.length > this.maxMetricsHistory) {
      this.metrics = this.metrics.slice(-this.maxMetricsHistory);
    }

    // Update key statistics
    this.updateKeyStats(key, operation, options.responseTime);

    // Check for alerts
    this.checkForAlerts(metric);

    // Emit event for real-time monitoring
    this.emit("metric", metric);
  }

  /**
   * Get comprehensive cache analytics
   */
  getAnalytics(timeRange?: { start: Date; end: Date }): CacheAnalytics {
    const filteredMetrics = timeRange
      ? this.metrics.filter(m => m.timestamp >= timeRange.start && m.timestamp <= timeRange.end)
      : this.metrics;

    const totalOperations = filteredMetrics.length;
    const hits = filteredMetrics.filter(m => m.operation === "hit").length;
    const misses = filteredMetrics.filter(m => m.operation === "miss").length;
    const totalRequests = hits + misses;

    const hitRate = totalRequests > 0 ? (hits / totalRequests) * 100 : 0;
    const missRate = totalRequests > 0 ? (misses / totalRequests) * 100 : 0;

    const responseTimes = filteredMetrics
      .filter(m => m.responseTime !== undefined)
      .map(m => m.responseTime!);
    const averageResponseTime =
      responseTimes.length > 0
        ? responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length
        : 0;

    const cacheStats = cache.stats();

    // Get top keys by activity
    const topKeys = Array.from(this.keyStats.entries())
      .map(([key, stats]) => ({
        key,
        hits: stats.hits,
        misses: stats.misses,
      }))
      .sort((a, b) => b.hits + b.misses - (a.hits + a.misses))
      .slice(0, 20);

    return {
      hitRate,
      missRate,
      averageResponseTime,
      totalOperations,
      cacheSize: cacheStats.totalEntries,
      memoryUsage: cacheStats.memoryUsage,
      topKeys,
      performanceTrends: this.performanceHistory.slice(-100), // Last 100 snapshots
      alerts: this.alerts.filter(a => !a.resolved).slice(-50), // Last 50 unresolved alerts
    };
  }

  /**
   * Get real-time cache statistics
   */
  getRealTimeStats(): {
    currentHitRate: number;
    currentResponseTime: number;
    operationsPerSecond: number;
    activeAlerts: number;
    cacheHealth: "excellent" | "good" | "fair" | "poor";
  } {
    const lastMinuteMetrics = this.metrics.filter(m => Date.now() - m.timestamp.getTime() < 60000);

    const hits = lastMinuteMetrics.filter(m => m.operation === "hit").length;
    const misses = lastMinuteMetrics.filter(m => m.operation === "miss").length;
    const totalRequests = hits + misses;

    const currentHitRate = totalRequests > 0 ? (hits / totalRequests) * 100 : 0;

    const recentResponseTimes = lastMinuteMetrics
      .filter(m => m.responseTime !== undefined)
      .map(m => m.responseTime!);
    const currentResponseTime =
      recentResponseTimes.length > 0
        ? recentResponseTimes.reduce((sum, time) => sum + time, 0) / recentResponseTimes.length
        : 0;

    const operationsPerSecond = lastMinuteMetrics.length / 60;
    const activeAlerts = this.alerts.filter(a => !a.resolved).length;

    // Determine cache health
    let cacheHealth: "excellent" | "good" | "fair" | "poor" = "excellent";
    if (currentHitRate < 50 || currentResponseTime > 1000 || activeAlerts > 5) {
      cacheHealth = "poor";
    } else if (currentHitRate < 70 || currentResponseTime > 500 || activeAlerts > 2) {
      cacheHealth = "fair";
    } else if (currentHitRate < 85 || currentResponseTime > 200 || activeAlerts > 0) {
      cacheHealth = "good";
    }

    return {
      currentHitRate,
      currentResponseTime,
      operationsPerSecond,
      activeAlerts,
      cacheHealth,
    };
  }

  /**
   * Get cache optimization recommendations
   */
  getOptimizationRecommendations(): Array<{
    type: "performance" | "capacity" | "configuration";
    priority: "high" | "medium" | "low";
    recommendation: string;
    impact: string;
  }> {
    const recommendations: Array<{
      type: "performance" | "capacity" | "configuration";
      priority: "high" | "medium" | "low";
      recommendation: string;
      impact: string;
    }> = [];

    const analytics = this.getAnalytics();

    // Hit rate recommendations
    if (analytics.hitRate < 50) {
      recommendations.push({
        type: "performance",
        priority: "high",
        recommendation:
          "Hit rate is below 50%. Consider increasing cache TTL for frequently accessed data.",
        impact: "Could improve response times by 30-50%",
      });
    } else if (analytics.hitRate < 70) {
      recommendations.push({
        type: "performance",
        priority: "medium",
        recommendation:
          "Hit rate could be improved. Review caching strategies for popular endpoints.",
        impact: "Could improve response times by 15-25%",
      });
    }

    // Response time recommendations
    if (analytics.averageResponseTime > 1000) {
      recommendations.push({
        type: "performance",
        priority: "high",
        recommendation:
          "Average response time is high. Consider optimizing cache lookup algorithms.",
        impact: "Could reduce response times by 40-60%",
      });
    }

    // Memory usage recommendations
    if (analytics.memoryUsage > 0.8) {
      recommendations.push({
        type: "capacity",
        priority: "high",
        recommendation:
          "Cache memory usage is high. Consider increasing cache size or implementing better eviction policies.",
        impact: "Prevents cache thrashing and improves stability",
      });
    }

    // Key distribution recommendations
    const topKeyHits = analytics.topKeys.slice(0, 5).reduce((sum, key) => sum + key.hits, 0);
    const totalHits = analytics.topKeys.reduce((sum, key) => sum + key.hits, 0);

    if (totalHits > 0 && topKeyHits / totalHits > 0.8) {
      recommendations.push({
        type: "configuration",
        priority: "medium",
        recommendation:
          "Cache access is concentrated on few keys. Consider implementing cache warming for popular data.",
        impact: "Could improve overall cache efficiency by 20-30%",
      });
    }

    return recommendations;
  }

  /**
   * Resolve an alert
   */
  resolveAlert(alertId: string): boolean {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.resolved = true;
      this.emit("alertResolved", alert);
      return true;
    }
    return false;
  }

  /**
   * Clear old metrics and alerts
   */
  cleanup(): void {
    const cutoffDate = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours ago

    // Clean old metrics
    this.metrics = this.metrics.filter(m => m.timestamp > cutoffDate);

    // Clean resolved alerts older than 7 days
    const alertCutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    this.alerts = this.alerts.filter(a => !a.resolved || a.timestamp > alertCutoff);

    // Clean old performance history
    this.performanceHistory = this.performanceHistory.slice(-this.maxPerformanceHistory);
  }

  /**
   * Stop monitoring
   */
  stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = undefined;
    }
  }

  // Private methods

  private updateKeyStats(
    key: string,
    operation: CacheMetric["operation"],
    responseTime?: number
  ): void {
    if (!this.keyStats.has(key)) {
      this.keyStats.set(key, { hits: 0, misses: 0, totalTime: 0 });
    }

    const stats = this.keyStats.get(key)!;

    if (operation === "hit") {
      stats.hits++;
    } else if (operation === "miss") {
      stats.misses++;
    }

    if (responseTime !== undefined) {
      stats.totalTime += responseTime;
    }
  }

  private checkForAlerts(metric: CacheMetric): void {
    // Check for high response time
    if (metric.responseTime && metric.responseTime > 2000) {
      this.createAlert({
        type: "performance",
        severity: "high",
        message: `High response time detected: ${metric.responseTime}ms for key ${metric.key}`,
        metadata: { key: metric.key, responseTime: metric.responseTime },
      });
    }

    // Check for cache miss patterns
    const recentMisses = this.metrics.filter(
      m => m.operation === "miss" && Date.now() - m.timestamp.getTime() < 60000
    ).length;

    if (recentMisses > 100) {
      this.createAlert({
        type: "performance",
        severity: "medium",
        message: `High cache miss rate detected: ${recentMisses} misses in the last minute`,
        metadata: { missCount: recentMisses },
      });
    }

    // Check for memory usage
    const cacheStats = cache.stats();
    if (cacheStats.memoryUsage > 0.9) {
      this.createAlert({
        type: "capacity",
        severity: "critical",
        message: `Cache memory usage is critical: ${(cacheStats.memoryUsage * 100).toFixed(1)}%`,
        metadata: { memoryUsage: cacheStats.memoryUsage },
      });
    }
  }

  private createAlert(alertData: Omit<CacheAlert, "id" | "timestamp" | "resolved">): void {
    const alert: CacheAlert = {
      id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      resolved: false,
      ...alertData,
    };

    this.alerts.push(alert);
    this.emit("alert", alert);

    // Auto-resolve low severity alerts after 1 hour
    if (alert.severity === "low") {
      setTimeout(
        () => {
          this.resolveAlert(alert.id);
        },
        60 * 60 * 1000
      );
    }
  }

  private startMonitoring(): void {
    // Take performance snapshots every minute
    this.monitoringInterval = setInterval(() => {
      const stats = this.getRealTimeStats();

      this.performanceHistory.push({
        timestamp: new Date(),
        hitRate: stats.currentHitRate,
        responseTime: stats.currentResponseTime,
      });

      // Maintain history limit
      if (this.performanceHistory.length > this.maxPerformanceHistory) {
        this.performanceHistory = this.performanceHistory.slice(-this.maxPerformanceHistory);
      }

      // Periodic cleanup
      if (this.performanceHistory.length % 60 === 0) {
        // Every hour
        this.cleanup();
      }
    }, 60000); // Every minute
  }
}

// Export singleton instance
export const cacheMonitoringService = new CacheMonitoringService();

// Utility functions for integration
export const monitoringUtils = {
  // Record cache operations (to be called from cache middleware)
  recordHit: (key: string, responseTime?: number) =>
    cacheMonitoringService.recordOperation("hit", key, { responseTime }),

  recordMiss: (key: string, responseTime?: number) =>
    cacheMonitoringService.recordOperation("miss", key, { responseTime }),

  recordSet: (key: string, size?: number, tags?: string[]) =>
    cacheMonitoringService.recordOperation("set", key, { size, tags }),

  recordDelete: (key: string) => cacheMonitoringService.recordOperation("delete", key),

  // Get monitoring dashboard data
  getDashboardData: () => ({
    analytics: cacheMonitoringService.getAnalytics(),
    realTimeStats: cacheMonitoringService.getRealTimeStats(),
    recommendations: cacheMonitoringService.getOptimizationRecommendations(),
  }),

  // Health check for monitoring systems
  healthCheck: () => {
    const stats = cacheMonitoringService.getRealTimeStats();
    return {
      healthy: stats.cacheHealth === "excellent" || stats.cacheHealth === "good",
      status: stats.cacheHealth,
      metrics: stats,
    };
  },
};
