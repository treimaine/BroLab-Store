/**
 * Performance Monitoring and Metrics System for Dashboard Sync
 *
 * Comprehensive monitoring system that tracks sync latency, success rates, error patterns,
 * performance thresholds with automatic alerts, memory usage monitoring to prevent leaks,
 * and sync report generation for analyzing dashboard performance over time.
 */

import BrowserEventEmitter from "@/utils/BrowserEventEmitter";
import type {
  MemoryStats,
  SyncError,
  SyncMetrics,
  SyncStatus,
  TimePeriod,
} from "@shared/types/sync";

// ================================
// PERFORMANCE MONITORING INTERFACES
// ================================

/**
 * Performance threshold configuration
 */
export interface PerformanceThreshold {
  /** Threshold name */
  name: string;
  /** Metric being monitored */
  metric: "latency" | "error_rate" | "memory_usage" | "success_rate" | "inconsistency_rate";
  /** Threshold value */
  value: number;
  /** Comparison operator */
  operator: ">" | "<" | ">=" | "<=" | "==" | "!=";
  /** Threshold severity */
  severity: "warning" | "critical";
  /** Whether threshold is enabled */
  enabled: boolean;
  /** Evaluation window in milliseconds */
  windowMs: number;
  /** Minimum samples required for evaluation */
  minSamples: number;
}

/**
 * Performance alert
 */
export interface PerformanceAlert {
  /** Alert ID */
  id: string;
  /** Threshold that triggered the alert */
  threshold: PerformanceThreshold;
  /** Current metric value */
  currentValue: number;
  /** Threshold value that was exceeded */
  thresholdValue: number;
  /** Alert timestamp */
  timestamp: number;
  /** Alert message */
  message: string;
  /** Alert severity */
  severity: "warning" | "critical";
  /** Whether alert is active */
  active: boolean;
  /** Alert resolution timestamp */
  resolvedAt?: number;
  /** Additional alert context */
  context: Record<string, unknown>;
}

/**
 * Sync performance metrics with detailed breakdown
 */
export interface DetailedSyncMetrics extends SyncMetrics {
  /** Metrics collection period */
  period: TimePeriod;
  /** Total sync operations */
  totalOperations: number;
  /** Successful operations */
  successfulOperations: number;
  /** Failed operations */
  failedOperations: number;
  /** Average operation duration */
  averageDuration: number;
  /** Minimum latency recorded */
  minLatency: number;
  /** Maximum latency recorded */
  maxLatency: number;
  /** 95th percentile latency */
  p95Latency: number;
  /** 99th percentile latency */
  p99Latency: number;
  /** Operations per second */
  operationsPerSecond: number;
  /** Error breakdown by type */
  errorBreakdown: Record<string, number>;
  /** Memory usage trend */
  memoryTrend: MemoryDataPoint[];
  /** Connection stability metrics */
  connectionMetrics: ConnectionMetrics;
}

/**
 * Memory usage data point
 */
export interface MemoryDataPoint {
  /** Timestamp */
  timestamp: number;
  /** Memory usage in bytes */
  usage: number;
  /** Memory type */
  type: "cache" | "events" | "subscriptions" | "total";
}

/**
 * Connection stability metrics
 */
export interface ConnectionMetrics {
  /** Connection uptime percentage */
  uptime: number;
  /** Average connection duration */
  averageConnectionDuration: number;
  /** Number of disconnections */
  disconnectionCount: number;
  /** Average reconnection time */
  averageReconnectionTime: number;
  /** Connection type distribution */
  connectionTypeDistribution: Record<string, number>;
}

/**
 * Sync performance report
 */
export interface SyncReport {
  /** Report generation timestamp */
  generatedAt: number;
  /** Report period */
  period: TimePeriod;
  /** Report summary */
  summary: {
    /** Overall health score (0-100) */
    healthScore: number;
    /** Key performance indicators */
    kpis: Record<string, number>;
    /** Top issues identified */
    topIssues: string[];
    /** Performance trends */
    trends: Record<string, "improving" | "stable" | "degrading">;
  };
  /** Detailed metrics */
  metrics: DetailedSyncMetrics;
  /** Performance alerts during period */
  alerts: PerformanceAlert[];
  /** Memory usage analysis */
  memoryAnalysis: MemoryAnalysis;
  /** Error pattern analysis */
  errorAnalysis: ErrorAnalysis;
  /** Recommendations for improvement */
  recommendations: PerformanceRecommendation[];
}

/**
 * Memory usage analysis
 */
export interface MemoryAnalysis {
  /** Average memory usage */
  averageUsage: number;
  /** Peak memory usage */
  peakUsage: number;
  /** Memory growth rate (bytes per hour) */
  growthRate: number;
  /** Memory leak indicators */
  leakIndicators: MemoryLeakIndicator[];
  /** Memory cleanup effectiveness */
  cleanupEffectiveness: number;
  /** Memory usage by component */
  componentBreakdown: Record<string, number>;
}

/**
 * Memory leak indicator
 */
export interface MemoryLeakIndicator {
  /** Component with potential leak */
  component: string;
  /** Leak severity */
  severity: "low" | "medium" | "high";
  /** Growth pattern description */
  pattern: string;
  /** Recommended action */
  recommendation: string;
  /** Confidence score (0-1) */
  confidence: number;
}

/**
 * Error pattern analysis
 */
export interface ErrorAnalysis {
  /** Most frequent errors */
  frequentErrors: Array<{ error: string; count: number; percentage: number }>;
  /** Error trends over time */
  errorTrends: Record<string, "increasing" | "stable" | "decreasing">;
  /** Error correlation patterns */
  correlations: Array<{ errors: string[]; correlation: number }>;
  /** Recovery success rates by error type */
  recoveryRates: Record<string, number>;
  /** Error impact on user experience */
  userImpact: "low" | "medium" | "high";
}

/**
 * Performance improvement recommendation
 */
export interface PerformanceRecommendation {
  /** Recommendation ID */
  id: string;
  /** Recommendation title */
  title: string;
  /** Detailed description */
  description: string;
  /** Priority level */
  priority: "low" | "medium" | "high" | "critical";
  /** Expected impact */
  expectedImpact: string;
  /** Implementation effort */
  effort: "low" | "medium" | "high";
  /** Recommendation category */
  category: "performance" | "reliability" | "memory" | "user_experience";
  /** Specific actions to take */
  actions: string[];
}

// ================================
// MONITORING CONFIGURATION
// ================================

/**
 * Sync monitoring configuration
 */
export interface SyncMonitoringConfig {
  /** Whether monitoring is enabled */
  enabled: boolean;
  /** Metrics collection interval (ms) */
  metricsInterval: number;
  /** Memory monitoring interval (ms) */
  memoryInterval: number;
  /** Maximum metrics history to keep */
  maxMetricsHistory: number;
  /** Maximum memory samples to keep */
  maxMemorySamples: number;
  /** Performance thresholds */
  thresholds: PerformanceThreshold[];
  /** Alert configuration */
  alerts: {
    /** Whether to emit events for alerts */
    emitEvents: boolean;
    /** Whether to log alerts to console */
    logToConsole: boolean;
    /** Alert cooldown period (ms) */
    cooldownMs: number;
    /** Maximum active alerts */
    maxActiveAlerts: number;
  };
  /** Report generation settings */
  reports: {
    /** Whether to auto-generate reports */
    autoGenerate: boolean;
    /** Report generation interval (ms) */
    interval: number;
    /** Report retention period (ms) */
    retentionMs: number;
  };
}

// ================================
// SYNC MONITORING CLASS
// ================================

/**
 * Comprehensive sync monitoring and metrics system
 */
export class SyncMonitoring extends BrowserEventEmitter {
  private config: SyncMonitoringConfig;
  private metrics: SyncMetrics;
  private metricsHistory: Array<{ timestamp: number; metrics: SyncMetrics }> = [];
  private memoryHistory: MemoryDataPoint[] = [];
  private latencyHistory: number[] = [];
  private operationHistory: Array<{ timestamp: number; success: boolean; duration: number }> = [];
  private errorHistory: Array<{ timestamp: number; error: SyncError }> = [];
  private activeAlerts = new Map<string, PerformanceAlert>();
  private alertCooldowns = new Map<string, number>();
  private reports: SyncReport[] = [];
  private metricsTimer?: NodeJS.Timeout;
  private memoryTimer?: NodeJS.Timeout;
  private reportTimer?: NodeJS.Timeout;
  private isDestroyed = false;

  constructor(config: Partial<SyncMonitoringConfig> = {}) {
    super();
    this.setMaxListeners(100);

    this.config = {
      enabled: config.enabled ?? true,
      metricsInterval: config.metricsInterval || 5000, // 5 seconds
      memoryInterval: config.memoryInterval || 10000, // 10 seconds
      maxMetricsHistory: config.maxMetricsHistory || 1000,
      maxMemorySamples: config.maxMemorySamples || 500,
      thresholds: config.thresholds || this.getDefaultThresholds(),
      alerts: {
        emitEvents: true,
        logToConsole: true,
        cooldownMs: 60000, // 1 minute
        maxActiveAlerts: 10,
        ...config.alerts,
      },
      reports: {
        autoGenerate: true,
        interval: 24 * 60 * 60 * 1000, // 24 hours
        retentionMs: 7 * 24 * 60 * 60 * 1000, // 7 days
        ...config.reports,
      },
    };

    this.metrics = this.initializeMetrics();

    if (this.config.enabled) {
      this.startMonitoring();
    }
  }

  // ================================
  // METRICS TRACKING
  // ================================

  /**
   * Track sync latency
   */
  public trackSyncLatency(latency: number): void {
    if (this.isDestroyed || !this.config.enabled) return;

    this.latencyHistory.push(latency);

    // Keep only recent latency samples
    if (this.latencyHistory.length > 1000) {
      this.latencyHistory = this.latencyHistory.slice(-1000);
    }

    // Update average latency
    this.metrics.averageLatency = this.calculateAverageLatency();

    this.evaluateThresholds();
  }

  /**
   * Track sync operation result
   */
  public trackSyncOperation(success: boolean, duration: number): void {
    if (this.isDestroyed || !this.config.enabled) return;

    const operation = {
      timestamp: Date.now(),
      success,
      duration,
    };

    this.operationHistory.push(operation);

    // Keep only recent operations
    if (this.operationHistory.length > 1000) {
      this.operationHistory = this.operationHistory.slice(-1000);
    }

    // Update success rate
    this.metrics.successRate = this.calculateSuccessRate();

    this.evaluateThresholds();
  }

  /**
   * Track data inconsistency
   */
  public trackDataInconsistency(inconsistency: { type: string; severity: string }): void {
    if (this.isDestroyed || !this.config.enabled) return;

    this.metrics.dataInconsistencies++;
    this.metrics.lastInconsistencyTime = Date.now();

    this.evaluateThresholds();

    this.emit("inconsistency_detected", inconsistency);
  }

  /**
   * Track sync error
   */
  public trackSyncError(error: SyncError): void {
    if (this.isDestroyed || !this.config.enabled) return;

    this.metrics.errorCount++;

    this.errorHistory.push({
      timestamp: Date.now(),
      error,
    });

    // Keep only recent errors
    if (this.errorHistory.length > 500) {
      this.errorHistory = this.errorHistory.slice(-500);
    }

    this.evaluateThresholds();

    this.emit("error_tracked", error);
  }

  /**
   * Track connection status change
   */
  public trackConnectionStatus(status: SyncStatus): void {
    if (this.isDestroyed || !this.config.enabled) return;

    if (!status.connected && this.metrics.reconnectCount !== undefined) {
      this.metrics.reconnectCount++;
    }

    this.evaluateThresholds();

    this.emit("connection_status_tracked", status);
  }

  // ================================
  // MEMORY MONITORING
  // ================================

  /**
   * Track memory usage
   */
  public trackMemoryUsage(memoryStats: MemoryStats): void {
    if (this.isDestroyed || !this.config.enabled) return;

    const dataPoints: MemoryDataPoint[] = [
      {
        timestamp: memoryStats.measuredAt,
        usage: memoryStats.cacheSize,
        type: "cache",
      },
      {
        timestamp: memoryStats.measuredAt,
        usage: memoryStats.eventHistorySize,
        type: "events",
      },
      {
        timestamp: memoryStats.measuredAt,
        usage: memoryStats.subscriptionCount * 1024, // Estimate subscription memory
        type: "subscriptions",
      },
      {
        timestamp: memoryStats.measuredAt,
        usage: memoryStats.totalMemoryUsage,
        type: "total",
      },
    ];

    this.memoryHistory.push(...dataPoints);

    // Keep only recent memory samples
    if (this.memoryHistory.length > this.config.maxMemorySamples) {
      this.memoryHistory = this.memoryHistory.slice(-this.config.maxMemorySamples);
    }

    this.evaluateMemoryThresholds(memoryStats);

    this.emit("memory_tracked", memoryStats);
  }

  /**
   * Detect memory leaks
   */
  public detectMemoryLeaks(): MemoryLeakIndicator[] {
    if (this.memoryHistory.length < 10) return [];

    const indicators: MemoryLeakIndicator[] = [];
    const recentSamples = this.memoryHistory.slice(-50); // Last 50 samples

    // Group by type
    const byType = recentSamples.reduce(
      (acc, sample) => {
        if (!acc[sample.type]) acc[sample.type] = [];
        acc[sample.type].push(sample);
        return acc;
      },
      {} as Record<string, MemoryDataPoint[]>
    );

    // Analyze each type for growth patterns
    for (const [type, samples] of Object.entries(byType)) {
      if (samples.length < 5) continue;

      const growthRate = this.calculateGrowthRate(samples);

      if (growthRate > 1024 * 1024) {
        // 1MB per hour growth
        indicators.push({
          component: type,
          severity: growthRate > 10 * 1024 * 1024 ? "high" : "medium",
          pattern: `Consistent memory growth at ${this.formatBytes(growthRate)}/hour`,
          recommendation: `Investigate ${type} memory usage and implement cleanup`,
          confidence: Math.min(0.9, growthRate / (10 * 1024 * 1024)),
        });
      }
    }

    return indicators;
  }

  // ================================
  // THRESHOLD EVALUATION
  // ================================

  /**
   * Set performance threshold
   */
  public setThreshold(threshold: PerformanceThreshold): void {
    const existingIndex = this.config.thresholds.findIndex(t => t.name === threshold.name);

    if (existingIndex >= 0) {
      this.config.thresholds[existingIndex] = threshold;
    } else {
      this.config.thresholds.push(threshold);
    }

    this.evaluateThresholds();
  }

  /**
   * Remove performance threshold
   */
  public removeThreshold(name: string): void {
    this.config.thresholds = this.config.thresholds.filter(t => t.name !== name);

    // Resolve any active alerts for this threshold
    for (const [alertId, alert] of this.activeAlerts.entries()) {
      if (alert.threshold.name === name) {
        this.resolveAlert(alertId);
      }
    }
  }

  /**
   * Get active alerts
   */
  public getActiveAlerts(): PerformanceAlert[] {
    return Array.from(this.activeAlerts.values()).filter(alert => alert.active);
  }

  /**
   * Resolve an alert
   */
  public resolveAlert(alertId: string): void {
    const alert = this.activeAlerts.get(alertId);
    if (alert) {
      alert.active = false;
      alert.resolvedAt = Date.now();
      this.emit("alert_resolved", alert);
    }
  }

  // ================================
  // REPORT GENERATION
  // ================================

  /**
   * Generate sync performance report
   */
  public generateReport(period: TimePeriod = "7d"): SyncReport {
    const now = Date.now();
    const periodMs = this.getPeriodMs(period);
    const startTime = now - periodMs;

    // Filter data for the period
    const periodMetrics = this.metricsHistory.filter(m => m.timestamp >= startTime);
    const periodOperations = this.operationHistory.filter(op => op.timestamp >= startTime);
    const periodErrors = this.errorHistory.filter(e => e.timestamp >= startTime);
    const periodMemory = this.memoryHistory.filter(m => m.timestamp >= startTime);
    const periodAlerts = Array.from(this.activeAlerts.values()).filter(
      a => a.timestamp >= startTime
    );

    // Calculate detailed metrics
    const detailedMetrics = this.calculateDetailedMetrics(
      period,
      periodOperations,
      periodErrors,
      periodMemory
    );

    // Generate analyses
    const memoryAnalysis = this.generateMemoryAnalysis(periodMemory);
    const errorAnalysis = this.generateErrorAnalysis(periodErrors);
    const recommendations = this.generateRecommendations(
      detailedMetrics,
      memoryAnalysis,
      errorAnalysis
    );

    // Calculate health score
    const healthScore = this.calculateHealthScore(detailedMetrics, memoryAnalysis, errorAnalysis);

    const report: SyncReport = {
      generatedAt: now,
      period,
      summary: {
        healthScore,
        kpis: {
          averageLatency: detailedMetrics.averageLatency,
          successRate: detailedMetrics.successRate,
          errorCount: detailedMetrics.errorCount,
          memoryUsage: memoryAnalysis.averageUsage,
          uptime: detailedMetrics.connectionMetrics.uptime,
        },
        topIssues: this.identifyTopIssues(detailedMetrics, memoryAnalysis, errorAnalysis),
        trends: this.calculateTrends(periodMetrics),
      },
      metrics: detailedMetrics,
      alerts: periodAlerts,
      memoryAnalysis,
      errorAnalysis,
      recommendations,
    };

    // Store report
    this.reports.push(report);

    // Clean up old reports
    const retentionCutoff = now - this.config.reports.retentionMs;
    this.reports = this.reports.filter(r => r.generatedAt >= retentionCutoff);

    this.emit("report_generated", report);

    return report;
  }

  /**
   * Get historical reports
   */
  public getReports(limit?: number): SyncReport[] {
    const reports = [...this.reports].sort((a, b) => b.generatedAt - a.generatedAt);
    return limit ? reports.slice(0, limit) : reports;
  }

  /**
   * Export report as JSON
   */
  public exportReport(report: SyncReport): string {
    return JSON.stringify(report, null, 2);
  }

  /**
   * Export report as CSV
   */
  public exportReportCSV(report: SyncReport): string {
    const lines: string[] = [];

    // Header
    lines.push("Metric,Value,Unit");

    // KPIs
    for (const [key, value] of Object.entries(report.summary.kpis)) {
      const unit = this.getMetricUnit(key);
      lines.push(`${key},${value},${unit}`);
    }

    return lines.join("\n");
  }

  // ================================
  // METRICS ACCESS
  // ================================

  /**
   * Get current metrics
   */
  public getCurrentMetrics(): SyncMetrics {
    return { ...this.metrics };
  }

  /**
   * Get metrics history
   */
  public getMetricsHistory(limit?: number): Array<{ timestamp: number; metrics: SyncMetrics }> {
    const history = [...this.metricsHistory].sort((a, b) => b.timestamp - a.timestamp);
    return limit ? history.slice(0, limit) : history;
  }

  /**
   * Get memory usage trend
   */
  public getMemoryTrend(type?: "cache" | "events" | "subscriptions" | "total"): MemoryDataPoint[] {
    if (type) {
      return this.memoryHistory.filter(point => point.type === type);
    }
    return [...this.memoryHistory];
  }

  // ================================
  // LIFECYCLE MANAGEMENT
  // ================================

  /**
   * Start monitoring
   */
  public startMonitoring(): void {
    if (this.isDestroyed || !this.config.enabled) return;

    this.stopMonitoring(); // Stop any existing timers

    // Start metrics collection
    this.metricsTimer = setInterval(() => {
      this.collectMetrics();
    }, this.config.metricsInterval);

    // Start memory monitoring
    this.memoryTimer = setInterval(() => {
      this.collectMemoryMetrics();
    }, this.config.memoryInterval);

    // Start report generation
    if (this.config.reports.autoGenerate) {
      this.reportTimer = setInterval(() => {
        this.generateReport();
      }, this.config.reports.interval);
    }

    this.emit("monitoring_started");
  }

  /**
   * Stop monitoring
   */
  public stopMonitoring(): void {
    if (this.metricsTimer) {
      clearInterval(this.metricsTimer);
      this.metricsTimer = undefined;
    }

    if (this.memoryTimer) {
      clearInterval(this.memoryTimer);
      this.memoryTimer = undefined;
    }

    if (this.reportTimer) {
      clearInterval(this.reportTimer);
      this.reportTimer = undefined;
    }

    this.emit("monitoring_stopped");
  }

  /**
   * Reset all metrics and history
   */
  public reset(): void {
    this.metrics = this.initializeMetrics();
    this.metricsHistory = [];
    this.memoryHistory = [];
    this.latencyHistory = [];
    this.operationHistory = [];
    this.errorHistory = [];
    this.activeAlerts.clear();
    this.alertCooldowns.clear();
    this.reports = [];

    this.emit("metrics_reset");
  }

  /**
   * Destroy the monitoring system
   */
  public destroy(): void {
    this.isDestroyed = true;
    this.stopMonitoring();
    this.removeAllListeners();
  }

  // ================================
  // PRIVATE METHODS
  // ================================

  private initializeMetrics(): SyncMetrics {
    return {
      averageLatency: 0,
      successRate: 100,
      errorCount: 0,
      reconnectCount: 0,
      dataInconsistencies: 0,
    };
  }

  private getDefaultThresholds(): PerformanceThreshold[] {
    return [
      {
        name: "high_latency",
        metric: "latency",
        value: 5000, // 5 seconds
        operator: ">",
        severity: "warning",
        enabled: true,
        windowMs: 60000, // 1 minute
        minSamples: 5,
      },
      {
        name: "critical_latency",
        metric: "latency",
        value: 10000, // 10 seconds
        operator: ">",
        severity: "critical",
        enabled: true,
        windowMs: 60000,
        minSamples: 3,
      },
      {
        name: "low_success_rate",
        metric: "success_rate",
        value: 90, // 90%
        operator: "<",
        severity: "warning",
        enabled: true,
        windowMs: 300000, // 5 minutes
        minSamples: 10,
      },
      {
        name: "critical_success_rate",
        metric: "success_rate",
        value: 75, // 75%
        operator: "<",
        severity: "critical",
        enabled: true,
        windowMs: 300000,
        minSamples: 5,
      },
      {
        name: "high_memory_usage",
        metric: "memory_usage",
        value: 100 * 1024 * 1024, // 100MB
        operator: ">",
        severity: "warning",
        enabled: true,
        windowMs: 300000,
        minSamples: 3,
      },
    ];
  }

  private calculateAverageLatency(): number {
    if (this.latencyHistory.length === 0) return 0;

    const sum = this.latencyHistory.reduce((acc, latency) => acc + latency, 0);
    return sum / this.latencyHistory.length;
  }

  private calculateSuccessRate(): number {
    if (this.operationHistory.length === 0) return 100;

    const successful = this.operationHistory.filter(op => op.success).length;
    return (successful / this.operationHistory.length) * 100;
  }

  private evaluateThresholds(): void {
    for (const threshold of this.config.thresholds) {
      if (!threshold.enabled) continue;

      const currentValue = this.getCurrentMetricValue(threshold.metric);
      const shouldAlert = this.evaluateThreshold(threshold, currentValue);

      if (shouldAlert && !this.isInCooldown(threshold.name)) {
        this.triggerAlert(threshold, currentValue);
      }
    }
  }

  private evaluateMemoryThresholds(memoryStats: MemoryStats): void {
    const memoryThresholds = this.config.thresholds.filter(t => t.metric === "memory_usage");

    for (const threshold of memoryThresholds) {
      if (!threshold.enabled) continue;

      const shouldAlert = this.evaluateThreshold(threshold, memoryStats.totalMemoryUsage);

      if (shouldAlert && !this.isInCooldown(threshold.name)) {
        this.triggerAlert(threshold, memoryStats.totalMemoryUsage);
      }
    }
  }

  private getCurrentMetricValue(metric: string): number {
    switch (metric) {
      case "latency":
        return this.metrics.averageLatency;
      case "error_rate":
        return 100 - this.metrics.successRate;
      case "success_rate":
        return this.metrics.successRate;
      case "inconsistency_rate":
        return this.metrics.dataInconsistencies;
      default:
        return 0;
    }
  }

  private evaluateThreshold(threshold: PerformanceThreshold, currentValue: number): boolean {
    switch (threshold.operator) {
      case ">":
        return currentValue > threshold.value;
      case "<":
        return currentValue < threshold.value;
      case ">=":
        return currentValue >= threshold.value;
      case "<=":
        return currentValue <= threshold.value;
      case "==":
        return currentValue === threshold.value;
      case "!=":
        return currentValue !== threshold.value;
      default:
        return false;
    }
  }

  private isInCooldown(thresholdName: string): boolean {
    const cooldownEnd = this.alertCooldowns.get(thresholdName);
    return cooldownEnd ? Date.now() < cooldownEnd : false;
  }

  private triggerAlert(threshold: PerformanceThreshold, currentValue: number): void {
    if (this.activeAlerts.size >= this.config.alerts.maxActiveAlerts) {
      return; // Too many active alerts
    }

    const alertId = `${threshold.name}_${Date.now()}`;
    const alert: PerformanceAlert = {
      id: alertId,
      threshold,
      currentValue,
      thresholdValue: threshold.value,
      timestamp: Date.now(),
      message: `${threshold.metric} ${threshold.operator} ${threshold.value} (current: ${currentValue})`,
      severity: threshold.severity,
      active: true,
      context: {
        metric: threshold.metric,
        windowMs: threshold.windowMs,
      },
    };

    this.activeAlerts.set(alertId, alert);
    this.alertCooldowns.set(threshold.name, Date.now() + this.config.alerts.cooldownMs);

    if (this.config.alerts.emitEvents) {
      this.emit("alert_triggered", alert);
    }

    if (this.config.alerts.logToConsole) {
      console.warn(`[SyncMonitoring] ${alert.severity.toUpperCase()}: ${alert.message}`);
    }
  }

  private collectMetrics(): void {
    const snapshot = {
      timestamp: Date.now(),
      metrics: { ...this.metrics },
    };

    this.metricsHistory.push(snapshot);

    // Keep only recent metrics
    if (this.metricsHistory.length > this.config.maxMetricsHistory) {
      this.metricsHistory = this.metricsHistory.slice(-this.config.maxMetricsHistory);
    }
  }

  private collectMemoryMetrics(): void {
    // This would typically get memory stats from the dashboard store
    // For now, we'll emit an event to request memory stats
    this.emit("memory_collection_requested");
  }

  private calculateGrowthRate(samples: MemoryDataPoint[]): number {
    if (samples.length < 2) return 0;

    const sorted = samples.sort((a, b) => a.timestamp - b.timestamp);
    const first = sorted[0];
    const last = sorted[sorted.length - 1];

    const timeDiff = last.timestamp - first.timestamp;
    const usageDiff = last.usage - first.usage;

    // Convert to bytes per hour
    return (usageDiff / timeDiff) * (60 * 60 * 1000);
  }

  private calculateDetailedMetrics(
    period: TimePeriod,
    operations: Array<{ timestamp: number; success: boolean; duration: number }>,
    errors: Array<{ timestamp: number; error: SyncError }>,
    memory: MemoryDataPoint[]
  ): DetailedSyncMetrics {
    const totalOps = operations.length;
    const successfulOps = operations.filter(op => op.success).length;
    const durations = operations.map(op => op.duration);

    return {
      ...this.metrics,
      period,
      totalOperations: totalOps,
      successfulOperations: successfulOps,
      failedOperations: totalOps - successfulOps,
      averageDuration:
        durations.length > 0 ? durations.reduce((a, b) => a + b, 0) / durations.length : 0,
      minLatency: durations.length > 0 ? Math.min(...durations) : 0,
      maxLatency: durations.length > 0 ? Math.max(...durations) : 0,
      p95Latency: this.calculatePercentile(durations, 0.95),
      p99Latency: this.calculatePercentile(durations, 0.99),
      operationsPerSecond: this.calculateOpsPerSecond(operations),
      errorBreakdown: this.calculateErrorBreakdown(errors),
      memoryTrend: memory.filter(m => m.type === "total"),
      connectionMetrics: this.calculateConnectionMetrics(operations),
    };
  }

  private calculatePercentile(values: number[], percentile: number): number {
    if (values.length === 0) return 0;

    const sorted = [...values].sort((a, b) => a - b);
    const index = Math.ceil(sorted.length * percentile) - 1;
    return sorted[Math.max(0, index)];
  }

  private calculateOpsPerSecond(operations: Array<{ timestamp: number }>): number {
    if (operations.length < 2) return 0;

    const sorted = operations.sort((a, b) => a.timestamp - b.timestamp);
    const timeSpan = sorted[sorted.length - 1].timestamp - sorted[0].timestamp;

    return timeSpan > 0 ? (operations.length / timeSpan) * 1000 : 0;
  }

  private calculateErrorBreakdown(errors: Array<{ error: SyncError }>): Record<string, number> {
    const breakdown: Record<string, number> = {};

    for (const { error } of errors) {
      breakdown[error.type] = (breakdown[error.type] || 0) + 1;
    }

    return breakdown;
  }

  private calculateConnectionMetrics(
    operations: Array<{ timestamp: number; success: boolean }>
  ): ConnectionMetrics {
    // Simplified connection metrics calculation
    const successRate =
      operations.length > 0
        ? (operations.filter(op => op.success).length / operations.length) * 100
        : 100;

    return {
      uptime: successRate,
      averageConnectionDuration: 0, // Would need connection duration tracking
      disconnectionCount: this.metrics.reconnectCount,
      averageReconnectionTime: 0, // Would need reconnection time tracking
      connectionTypeDistribution: { websocket: 80, polling: 20 }, // Example distribution
    };
  }

  private generateMemoryAnalysis(memory: MemoryDataPoint[]): MemoryAnalysis {
    const totalMemory = memory.filter(m => m.type === "total");

    if (totalMemory.length === 0) {
      return {
        averageUsage: 0,
        peakUsage: 0,
        growthRate: 0,
        leakIndicators: [],
        cleanupEffectiveness: 100,
        componentBreakdown: {},
      };
    }

    const usages = totalMemory.map(m => m.usage);
    const averageUsage = usages.reduce((a, b) => a + b, 0) / usages.length;
    const peakUsage = Math.max(...usages);
    const growthRate = this.calculateGrowthRate(totalMemory);

    return {
      averageUsage,
      peakUsage,
      growthRate,
      leakIndicators: this.detectMemoryLeaks(),
      cleanupEffectiveness: Math.max(0, 100 - (growthRate / (1024 * 1024)) * 10), // Rough calculation
      componentBreakdown: this.calculateComponentBreakdown(memory),
    };
  }

  private calculateComponentBreakdown(memory: MemoryDataPoint[]): Record<string, number> {
    const breakdown: Record<string, number> = {};
    const latest = memory.filter(m => m.timestamp === Math.max(...memory.map(m => m.timestamp)));

    for (const point of latest) {
      breakdown[point.type] = point.usage;
    }

    return breakdown;
  }

  private generateErrorAnalysis(
    errors: Array<{ timestamp: number; error: SyncError }>
  ): ErrorAnalysis {
    const errorCounts = this.calculateErrorBreakdown(errors);
    const totalErrors = errors.length;

    const frequentErrors = Object.entries(errorCounts)
      .map(([error, count]) => ({
        error,
        count,
        percentage: totalErrors > 0 ? (count / totalErrors) * 100 : 0,
      }))
      .sort((a, b) => b.count - a.count);

    return {
      frequentErrors,
      errorTrends: {}, // Would need historical comparison
      correlations: [], // Would need correlation analysis
      recoveryRates: {}, // Would need recovery tracking
      userImpact: totalErrors > 10 ? "high" : totalErrors > 5 ? "medium" : "low",
    };
  }

  private generateRecommendations(
    metrics: DetailedSyncMetrics,
    memoryAnalysis: MemoryAnalysis,
    errorAnalysis: ErrorAnalysis
  ): PerformanceRecommendation[] {
    const recommendations: PerformanceRecommendation[] = [];

    // High latency recommendation
    if (metrics.averageLatency > 3000) {
      recommendations.push({
        id: "reduce_latency",
        title: "Reduce Sync Latency",
        description: "Average sync latency is above optimal threshold",
        priority: "high",
        expectedImpact: "Improve user experience and responsiveness",
        effort: "medium",
        category: "performance",
        actions: ["Optimize database queries", "Implement connection pooling", "Add caching layer"],
      });
    }

    // Memory leak recommendation
    if (memoryAnalysis.leakIndicators.length > 0) {
      recommendations.push({
        id: "fix_memory_leaks",
        title: "Address Memory Leaks",
        description: "Potential memory leaks detected in sync system",
        priority: "critical",
        expectedImpact: "Prevent browser crashes and improve stability",
        effort: "high",
        category: "memory",
        actions: [
          "Review event listener cleanup",
          "Implement proper subscription disposal",
          "Add memory monitoring alerts",
        ],
      });
    }

    return recommendations;
  }

  private calculateHealthScore(
    metrics: DetailedSyncMetrics,
    memoryAnalysis: MemoryAnalysis,
    errorAnalysis: ErrorAnalysis
  ): number {
    let score = 100;

    // Deduct for low success rate
    if (metrics.successRate < 95) {
      score -= (95 - metrics.successRate) * 2;
    }

    // Deduct for high latency
    if (metrics.averageLatency > 2000) {
      score -= Math.min(30, (metrics.averageLatency - 2000) / 100);
    }

    // Deduct for memory issues
    if (memoryAnalysis.leakIndicators.length > 0) {
      score -= memoryAnalysis.leakIndicators.length * 10;
    }

    // Deduct for high error rate
    if (errorAnalysis.userImpact === "high") {
      score -= 20;
    } else if (errorAnalysis.userImpact === "medium") {
      score -= 10;
    }

    return Math.max(0, Math.min(100, score));
  }

  private identifyTopIssues(
    metrics: DetailedSyncMetrics,
    memoryAnalysis: MemoryAnalysis,
    errorAnalysis: ErrorAnalysis
  ): string[] {
    const issues: string[] = [];

    if (metrics.successRate < 90) {
      issues.push("Low sync success rate");
    }

    if (metrics.averageLatency > 5000) {
      issues.push("High sync latency");
    }

    if (memoryAnalysis.leakIndicators.length > 0) {
      issues.push("Memory leaks detected");
    }

    if (errorAnalysis.userImpact === "high") {
      issues.push("High error impact on users");
    }

    return issues.slice(0, 5); // Top 5 issues
  }

  private calculateTrends(
    metricsHistory: Array<{ timestamp: number; metrics: SyncMetrics }>
  ): Record<string, "improving" | "stable" | "degrading"> {
    if (metricsHistory.length < 2) {
      return {
        latency: "stable",
        successRate: "stable",
        errorCount: "stable",
      };
    }

    const recent = metricsHistory.slice(-10); // Last 10 samples
    const older = metricsHistory.slice(-20, -10); // Previous 10 samples

    if (recent.length === 0 || older.length === 0) {
      return {
        latency: "stable",
        successRate: "stable",
        errorCount: "stable",
      };
    }

    const recentAvgLatency =
      recent.reduce((sum, m) => sum + m.metrics.averageLatency, 0) / recent.length;
    const olderAvgLatency =
      older.reduce((sum, m) => sum + m.metrics.averageLatency, 0) / older.length;

    const recentAvgSuccess =
      recent.reduce((sum, m) => sum + m.metrics.successRate, 0) / recent.length;
    const olderAvgSuccess = older.reduce((sum, m) => sum + m.metrics.successRate, 0) / older.length;

    const recentAvgErrors =
      recent.reduce((sum, m) => sum + m.metrics.errorCount, 0) / recent.length;
    const olderAvgErrors = older.reduce((sum, m) => sum + m.metrics.errorCount, 0) / older.length;

    return {
      latency: this.getTrend(recentAvgLatency, olderAvgLatency, false), // Lower is better
      successRate: this.getTrend(recentAvgSuccess, olderAvgSuccess, true), // Higher is better
      errorCount: this.getTrend(recentAvgErrors, olderAvgErrors, false), // Lower is better
    };
  }

  private getTrend(
    recent: number,
    older: number,
    higherIsBetter: boolean
  ): "improving" | "stable" | "degrading" {
    const threshold = 0.05; // 5% change threshold
    const change = (recent - older) / older;

    if (Math.abs(change) < threshold) {
      return "stable";
    }

    if (higherIsBetter) {
      return change > 0 ? "improving" : "degrading";
    } else {
      return change < 0 ? "improving" : "degrading";
    }
  }

  private getPeriodMs(period: TimePeriod): number {
    switch (period) {
      case "7d":
        return 7 * 24 * 60 * 60 * 1000;
      case "30d":
        return 30 * 24 * 60 * 60 * 1000;
      case "90d":
        return 90 * 24 * 60 * 60 * 1000;
      case "1y":
        return 365 * 24 * 60 * 60 * 1000;
      default:
        return 7 * 24 * 60 * 60 * 1000;
    }
  }

  private formatBytes(bytes: number): string {
    if (bytes === 0) return "0 B";

    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  }

  private getMetricUnit(metric: string): string {
    switch (metric) {
      case "averageLatency":
        return "ms";
      case "successRate":
        return "%";
      case "errorCount":
        return "count";
      case "memoryUsage":
        return "bytes";
      case "uptime":
        return "%";
      default:
        return "";
    }
  }
}

// Singleton instance
let syncMonitoringInstance: SyncMonitoring | null = null;

export const getSyncMonitoring = (config?: Partial<SyncMonitoringConfig>): SyncMonitoring => {
  if (!syncMonitoringInstance) {
    syncMonitoringInstance = new SyncMonitoring(config);
  }
  return syncMonitoringInstance;
};

export const destroySyncMonitoring = (): void => {
  if (syncMonitoringInstance) {
    syncMonitoringInstance.destroy();
    syncMonitoringInstance = null;
  }
};
