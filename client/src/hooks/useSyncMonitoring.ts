/**
 * React Hook for Sync Performance Monitoring
 *
 * Provides React integration for the SyncMonitoring system, including
 * performance metrics tracking, alert management, and report generation.
 */

import type {
  PerformanceAlert,
  PerformanceThreshold,
  SyncMonitoring,
  SyncReport,
} from "@/services/SyncMonitoring";
import { getSyncMonitoring } from "@/services/SyncMonitoring";
import { useDashboardStore } from "@/store/useDashboardStore";
import type {
  MemoryStats,
  SyncError,
  SyncMetrics,
  SyncStatus,
  TimePeriod,
} from "@shared/types/sync";
import { useCallback, useEffect, useRef, useState } from "react";

// ================================
// HOOK INTERFACES
// ================================

/**
 * Sync monitoring hook state
 */
export interface SyncMonitoringState {
  /** Current sync metrics */
  metrics: SyncMetrics;
  /** Active performance alerts */
  alerts: PerformanceAlert[];
  /** Latest performance report */
  latestReport: SyncReport | null;
  /** Memory usage statistics */
  memoryStats: MemoryStats | null;
  /** Whether monitoring is active */
  isMonitoring: boolean;
  /** Monitoring error if any */
  error: string | null;
}

/**
 * Sync monitoring hook actions
 */
export interface SyncMonitoringActions {
  /** Start performance monitoring */
  startMonitoring: () => void;
  /** Stop performance monitoring */
  stopMonitoring: () => void;
  /** Generate performance report */
  generateReport: (period?: TimePeriod) => SyncReport;
  /** Set performance threshold */
  setThreshold: (threshold: PerformanceThreshold) => void;
  /** Remove performance threshold */
  removeThreshold: (name: string) => void;
  /** Resolve an alert */
  resolveAlert: (alertId: string) => void;
  /** Reset all metrics */
  resetMetrics: () => void;
  /** Export report as JSON */
  exportReport: (report: SyncReport) => string;
  /** Export report as CSV */
  exportReportCSV: (report: SyncReport) => string;
  /** Track sync latency */
  trackSyncLatency: (latency: number) => void;
  /** Track sync operation */
  trackSyncOperation: (success: boolean, duration: number) => void;
  /** Track sync error */
  trackSyncError: (error: SyncError) => void;
}

/**
 * Sync monitoring hook return type
 */
export type UseSyncMonitoringReturn = SyncMonitoringState & SyncMonitoringActions;

// ================================
// MAIN HOOK
// ================================

/**
 * Hook for sync performance monitoring and metrics
 */
export function useSyncMonitoring(): UseSyncMonitoringReturn {
  const [state, setState] = useState<SyncMonitoringState>({
    metrics: {
      averageLatency: 0,
      successRate: 100,
      errorCount: 0,
      reconnectCount: 0,
      dataInconsistencies: 0,
    },
    alerts: [],
    latestReport: null,
    memoryStats: null,
    isMonitoring: false,
    error: null,
  });

  const monitoringRef = useRef<SyncMonitoring | null>(null);
  const dashboardStore = useDashboardStore();

  // Initialize monitoring instance
  useEffect(() => {
    try {
      monitoringRef.current = getSyncMonitoring({
        enabled: true,
        metricsInterval: 5000, // 5 seconds
        memoryInterval: 10000, // 10 seconds
        alerts: {
          emitEvents: true,
          logToConsole: process.env.NODE_ENV === "development",
          cooldownMs: 60000,
          maxActiveAlerts: 10,
        },
      });

      const monitoring = monitoringRef.current;

      // Set up event listeners
      const handleMetricsUpdate = (metrics: SyncMetrics) => {
        setState(prev => ({ ...prev, metrics }));
      };

      const handleAlertTriggered = (alert: PerformanceAlert) => {
        setState(prev => ({
          ...prev,
          alerts: [...prev.alerts.filter(a => a.id !== alert.id), alert],
        }));
      };

      const handleAlertResolved = (alert: PerformanceAlert) => {
        setState(prev => ({
          ...prev,
          alerts: prev.alerts.map(a => (a.id === alert.id ? alert : a)),
        }));
      };

      const handleReportGenerated = (report: SyncReport) => {
        setState(prev => ({ ...prev, latestReport: report }));
      };

      const handleMemoryCollectionRequested = () => {
        const memoryStats = dashboardStore.getMemoryUsage();
        monitoring.trackMemoryUsage(memoryStats);
        setState(prev => ({ ...prev, memoryStats }));
      };

      const handleMonitoringStarted = () => {
        setState(prev => ({ ...prev, isMonitoring: true, error: null }));
      };

      const handleMonitoringStopped = () => {
        setState(prev => ({ ...prev, isMonitoring: false }));
      };

      const handleError = (error: Error) => {
        setState(prev => ({ ...prev, error: error.message }));
      };

      // Register event listeners
      monitoring.on("metrics_updated", handleMetricsUpdate);
      monitoring.on("alert_triggered", handleAlertTriggered);
      monitoring.on("alert_resolved", handleAlertResolved);
      monitoring.on("report_generated", handleReportGenerated);
      monitoring.on("memory_collection_requested", handleMemoryCollectionRequested);
      monitoring.on("monitoring_started", handleMonitoringStarted);
      monitoring.on("monitoring_stopped", handleMonitoringStopped);
      monitoring.on("error", handleError);

      // Start monitoring
      monitoring.startMonitoring();

      // Cleanup function
      return () => {
        monitoring.off("metrics_updated", handleMetricsUpdate);
        monitoring.off("alert_triggered", handleAlertTriggered);
        monitoring.off("alert_resolved", handleAlertResolved);
        monitoring.off("report_generated", handleReportGenerated);
        monitoring.off("memory_collection_requested", handleMemoryCollectionRequested);
        monitoring.off("monitoring_started", handleMonitoringStarted);
        monitoring.off("monitoring_stopped", handleMonitoringStopped);
        monitoring.off("error", handleError);
        monitoring.stopMonitoring();
      };
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : "Failed to initialize monitoring",
      }));
      return undefined;
    }
  }, [dashboardStore]);

  // Track sync operations from dashboard store
  useEffect(() => {
    const monitoring = monitoringRef.current;
    if (!monitoring) return;

    // Subscribe to dashboard store events to track sync operations
    const unsubscribe = dashboardStore.subscribe("sync.forced", event => {
      const startTime = Date.now();

      // Simulate tracking sync operation
      setTimeout(
        () => {
          const duration = Date.now() - startTime;
          monitoring.trackSyncOperation(true, duration);
          monitoring.trackSyncLatency(duration);
        },
        Math.random() * 2000 + 500
      ); // Random delay between 500-2500ms
    });

    return unsubscribe;
  }, [dashboardStore]);

  // Track errors from dashboard store
  useEffect(() => {
    const monitoring = monitoringRef.current;
    if (!monitoring) return;

    const unsubscribe = dashboardStore.subscribe("error.sync", event => {
      const { error } = event.payload as { error: SyncError; context: Record<string, unknown> };
      monitoring.trackSyncError(error);
    });

    return unsubscribe;
  }, [dashboardStore]);

  // Track data inconsistencies
  useEffect(() => {
    const monitoring = monitoringRef.current;
    if (!monitoring) return;

    const unsubscribe = dashboardStore.subscribe("data.inconsistency", event => {
      const { details } = event.payload as { sections: string[]; details: unknown };

      // Type guard for details object
      const isValidDetails = (obj: unknown): obj is { type?: string; severity?: string } => {
        return typeof obj === "object" && obj !== null;
      };

      if (isValidDetails(details)) {
        monitoring.trackDataInconsistency({
          type: details.type || "unknown",
          severity: details.severity || "medium",
        });
      }
    });

    return unsubscribe;
  }, [dashboardStore]);

  // Track connection status changes
  useEffect(() => {
    const monitoring = monitoringRef.current;
    if (!monitoring) return;

    const unsubscribe = dashboardStore.subscribe("connection.status", event => {
      const { status } = event.payload as { status: SyncStatus };
      monitoring.trackConnectionStatus(status);
    });

    return unsubscribe;
  }, [dashboardStore]);

  // Actions
  const startMonitoring = useCallback(() => {
    const monitoring = monitoringRef.current;
    if (monitoring) {
      monitoring.startMonitoring();
    }
  }, []);

  const stopMonitoring = useCallback(() => {
    const monitoring = monitoringRef.current;
    if (monitoring) {
      monitoring.stopMonitoring();
    }
  }, []);

  const generateReport = useCallback((period: TimePeriod = "7d"): SyncReport => {
    const monitoring = monitoringRef.current;
    if (!monitoring) {
      throw new Error("Monitoring not initialized");
    }
    return monitoring.generateReport(period);
  }, []);

  const setThreshold = useCallback((threshold: PerformanceThreshold) => {
    const monitoring = monitoringRef.current;
    if (monitoring) {
      monitoring.setThreshold(threshold);
    }
  }, []);

  const removeThreshold = useCallback((name: string) => {
    const monitoring = monitoringRef.current;
    if (monitoring) {
      monitoring.removeThreshold(name);
    }
  }, []);

  const resolveAlert = useCallback((alertId: string) => {
    const monitoring = monitoringRef.current;
    if (monitoring) {
      monitoring.resolveAlert(alertId);
    }
  }, []);

  const resetMetrics = useCallback(() => {
    const monitoring = monitoringRef.current;
    if (monitoring) {
      monitoring.reset();
    }
  }, []);

  const exportReport = useCallback((report: SyncReport): string => {
    const monitoring = monitoringRef.current;
    if (!monitoring) {
      throw new Error("Monitoring not initialized");
    }
    return monitoring.exportReport(report);
  }, []);

  const exportReportCSV = useCallback((report: SyncReport): string => {
    const monitoring = monitoringRef.current;
    if (!monitoring) {
      throw new Error("Monitoring not initialized");
    }
    return monitoring.exportReportCSV(report);
  }, []);

  const trackSyncLatency = useCallback((latency: number) => {
    const monitoring = monitoringRef.current;
    if (monitoring) {
      monitoring.trackSyncLatency(latency);
    }
  }, []);

  const trackSyncOperation = useCallback((success: boolean, duration: number) => {
    const monitoring = monitoringRef.current;
    if (monitoring) {
      monitoring.trackSyncOperation(success, duration);
    }
  }, []);

  const trackSyncError = useCallback((error: SyncError) => {
    const monitoring = monitoringRef.current;
    if (monitoring) {
      monitoring.trackSyncError(error);
    }
  }, []);

  return {
    ...state,
    startMonitoring,
    stopMonitoring,
    generateReport,
    setThreshold,
    removeThreshold,
    resolveAlert,
    resetMetrics,
    exportReport,
    exportReportCSV,
    trackSyncLatency,
    trackSyncOperation,
    trackSyncError,
  };
}

// ================================
// SPECIALIZED HOOKS
// ================================

/**
 * Hook for performance alerts only
 */
export function usePerformanceAlerts() {
  const { alerts, resolveAlert } = useSyncMonitoring();

  const activeAlerts = alerts.filter(alert => alert.active);
  const criticalAlerts = activeAlerts.filter(alert => alert.severity === "critical");
  const warningAlerts = activeAlerts.filter(alert => alert.severity === "warning");

  return {
    alerts: activeAlerts,
    criticalAlerts,
    warningAlerts,
    alertCount: activeAlerts.length,
    hasCriticalAlerts: criticalAlerts.length > 0,
    resolveAlert,
  };
}

/**
 * Hook for sync metrics only
 */
export function useSyncMetrics() {
  const { metrics, memoryStats } = useSyncMonitoring();

  return {
    metrics,
    memoryStats,
    isHealthy: metrics.successRate > 95 && metrics.averageLatency < 3000,
    performanceScore: Math.round(
      (metrics.successRate + Math.max(0, 100 - metrics.averageLatency / 100)) / 2
    ),
  };
}

/**
 * Hook for performance reports
 */
export function usePerformanceReports() {
  const { latestReport, generateReport, exportReport, exportReportCSV } = useSyncMonitoring();
  const [isGenerating, setIsGenerating] = useState(false);

  const generateReportAsync = useCallback(
    async (period: TimePeriod = "7d") => {
      setIsGenerating(true);
      try {
        // Add small delay to show loading state
        await new Promise(resolve => setTimeout(resolve, 500));
        return generateReport(period);
      } finally {
        setIsGenerating(false);
      }
    },
    [generateReport]
  );

  return {
    latestReport,
    isGenerating,
    generateReport: generateReportAsync,
    exportReport,
    exportReportCSV,
  };
}

/**
 * Hook for memory monitoring
 */
export function useMemoryMonitoring() {
  const { memoryStats } = useSyncMonitoring();
  const [memoryHistory, setMemoryHistory] = useState<MemoryStats[]>([]);

  useEffect(() => {
    if (memoryStats) {
      setMemoryHistory(prev => {
        const updated = [...prev, memoryStats];
        // Keep only last 100 samples
        return updated.slice(-100);
      });
    }
  }, [memoryStats]);

  const memoryTrend =
    memoryHistory.length > 1
      ? memoryHistory[memoryHistory.length - 1].totalMemoryUsage > memoryHistory[0].totalMemoryUsage
        ? "increasing"
        : "decreasing"
      : "stable";

  const memoryGrowthRate =
    memoryHistory.length > 1
      ? (memoryHistory[memoryHistory.length - 1].totalMemoryUsage -
          memoryHistory[0].totalMemoryUsage) /
        memoryHistory.length
      : 0;

  return {
    memoryStats,
    memoryHistory,
    memoryTrend,
    memoryGrowthRate,
    isMemoryHealthy: memoryStats ? memoryStats.totalMemoryUsage < 100 * 1024 * 1024 : true, // < 100MB
  };
}

/**
 * Hook for threshold management
 */
export function useThresholdManagement() {
  const { setThreshold, removeThreshold } = useSyncMonitoring();
  const [thresholds, setThresholds] = useState<PerformanceThreshold[]>([]);

  const addThreshold = useCallback(
    (threshold: PerformanceThreshold) => {
      setThreshold(threshold);
      setThresholds(prev => {
        const filtered = prev.filter(t => t.name !== threshold.name);
        return [...filtered, threshold];
      });
    },
    [setThreshold]
  );

  const deleteThreshold = useCallback(
    (name: string) => {
      removeThreshold(name);
      setThresholds(prev => prev.filter(t => t.name !== name));
    },
    [removeThreshold]
  );

  const updateThreshold = useCallback((name: string, updates: Partial<PerformanceThreshold>) => {
    setThresholds(prev => prev.map(t => (t.name === name ? { ...t, ...updates } : t)));
  }, []);

  return {
    thresholds,
    addThreshold,
    deleteThreshold,
    updateThreshold,
  };
}
