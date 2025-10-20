/**
 * Data Freshness Monitor
 *
 * Real-time monitoring service that tracks data freshness, detects stale data,
 * and automatically triggers refresh when data becomes outdated. Provides
 * real-time indicators and automatic refresh capabilities.
 */

import type { DataIntegrityReport } from "@/services/DataValidationService";
import { getDataValidationService } from "@/services/DataValidationService";
import { getErrorLoggingService } from "@/services/ErrorLoggingService";
import { useDashboardStore } from "@/stores/useDashboardStore";
import type { DashboardData } from "@shared/types/dashboard";
import { SyncErrorType } from "@shared/types/sync";

// ================================
// FRESHNESS MONITORING INTERFACES
// ================================

/**
 * Freshness monitoring configuration
 */
export interface FreshnessMonitorConfig {
  /** Check interval in milliseconds */
  checkInterval: number;
  /** Auto-refresh threshold in milliseconds */
  autoRefreshThreshold: number;
  /** Warning threshold in milliseconds */
  warningThreshold: number;
  /** Critical threshold in milliseconds */
  criticalThreshold: number;
  /** Whether to auto-refresh stale data */
  autoRefresh: boolean;
  /** Maximum auto-refresh attempts */
  maxAutoRefreshAttempts: number;
  /** Sections to monitor for freshness */
  monitoredSections: string[];
  /** Whether to show freshness indicators in UI */
  showIndicators: boolean;
}

/**
 * Freshness status type
 */
export type FreshnessStatusType = "fresh" | "warning" | "stale" | "critical";

/**
 * Freshness status for a data section
 */
export interface SectionFreshnessStatus {
  /** Section name */
  section: string;
  /** Last update timestamp */
  lastUpdated: number;
  /** Data age in milliseconds */
  age: number;
  /** Freshness status */
  status: FreshnessStatusType;
  /** Whether auto-refresh is needed */
  needsRefresh: boolean;
  /** Next check timestamp */
  nextCheck: number;
}

/**
 * Overall freshness monitoring status
 */
export interface FreshnessMonitoringStatus {
  /** Whether monitoring is active */
  isActive: boolean;
  /** Last check timestamp */
  lastCheck: number;
  /** Next check timestamp */
  nextCheck: number;
  /** Overall freshness status */
  overallStatus: FreshnessStatusType;
  /** Section-specific statuses */
  sections: Record<string, SectionFreshnessStatus>;
  /** Auto-refresh attempts made */
  autoRefreshAttempts: number;
  /** Whether auto-refresh is in progress */
  refreshInProgress: boolean;
}

/**
 * Freshness event type
 */
export type FreshnessEventType =
  | "freshness_warning"
  | "freshness_critical"
  | "auto_refresh_triggered"
  | "refresh_completed"
  | "refresh_failed";

/**
 * Freshness event for notifications
 */
export interface FreshnessEvent {
  /** Event type */
  type: FreshnessEventType;
  /** Section affected */
  section?: string;
  /** Event timestamp */
  timestamp: number;
  /** Additional event data */
  data: Record<string, unknown>;
}

// ================================
// DATA FRESHNESS MONITOR
// ================================

export class DataFreshnessMonitor {
  private config: FreshnessMonitorConfig;
  private readonly logger = getErrorLoggingService();
  private readonly validationService = getDataValidationService();
  private readonly monitoringStatus: FreshnessMonitoringStatus;
  private checkTimer?: NodeJS.Timeout;
  private readonly eventListeners = new Set<(event: FreshnessEvent) => void>();
  private isDestroyed = false;

  /**
   * Helper to create browser environment for error logging
   */
  private createBrowserEnvironment(): {
    userAgent: string;
    url: string;
    timestamp: number;
    onlineStatus: boolean;
    viewport: { width: number; height: number };
    screen: { width: number; height: number };
  } {
    const hasWindow = globalThis.window !== undefined;
    const hasNavigator = typeof navigator !== "undefined";

    return {
      userAgent: hasNavigator ? navigator.userAgent : "unknown",
      url: hasWindow ? globalThis.window.location.href : "unknown",
      timestamp: Date.now(),
      onlineStatus: hasNavigator ? navigator.onLine : true,
      viewport: {
        width: hasWindow ? globalThis.window.innerWidth : 0,
        height: hasWindow ? globalThis.window.innerHeight : 0,
      },
      screen: {
        width: hasWindow ? globalThis.window.screen.width : 0,
        height: hasWindow ? globalThis.window.screen.height : 0,
      },
    };
  }

  constructor(config: Partial<FreshnessMonitorConfig> = {}) {
    this.config = {
      checkInterval: 30 * 1000, // 30 seconds
      autoRefreshThreshold: 5 * 60 * 1000, // 5 minutes
      warningThreshold: 2 * 60 * 1000, // 2 minutes
      criticalThreshold: 10 * 60 * 1000, // 10 minutes
      autoRefresh: true,
      maxAutoRefreshAttempts: 3,
      monitoredSections: ["stats", "favorites", "orders", "downloads", "reservations", "activity"],
      showIndicators: true,
      ...config,
    };

    this.monitoringStatus = {
      isActive: false,
      lastCheck: 0,
      nextCheck: 0,
      overallStatus: "fresh",
      sections: {},
      autoRefreshAttempts: 0,
      refreshInProgress: false,
    };

    this.initializeMonitoring();
  }

  // ================================
  // PUBLIC MONITORING METHODS
  // ================================

  /**
   * Start freshness monitoring
   */
  public startMonitoring(): void {
    if (this.isDestroyed || this.monitoringStatus.isActive) {
      return;
    }

    this.monitoringStatus.isActive = true;
    this.scheduleNextCheck();

    this.logger.logSystemEvent("Data freshness monitoring started", "info", {
      component: "DataFreshnessMonitor",
    });

    this.emitEvent({
      type: "refresh_completed",
      timestamp: Date.now(),
      data: { action: "monitoring_started" },
    });
  }

  /**
   * Stop freshness monitoring
   */
  public stopMonitoring(): void {
    if (!this.monitoringStatus.isActive) {
      return;
    }

    this.monitoringStatus.isActive = false;

    if (this.checkTimer) {
      clearTimeout(this.checkTimer);
      this.checkTimer = undefined;
    }

    this.logger.logSystemEvent("Data freshness monitoring stopped", "info", {
      component: "DataFreshnessMonitor",
    });
  }

  /**
   * Perform immediate freshness check
   */
  public async checkFreshness(data?: DashboardData): Promise<FreshnessMonitoringStatus> {
    if (this.isDestroyed) {
      return this.monitoringStatus;
    }

    const startTime = Date.now();

    try {
      // Get current data if not provided
      const currentData = data || useDashboardStore.getState().data;
      if (!currentData) {
        this.logger.logSystemEvent("No data available for freshness check", "warn", {
          component: "DataFreshnessMonitor",
        });
        return this.monitoringStatus;
      }

      // Validate data integrity
      const integrityReport = await this.validationService.validateDataIntegrity(currentData, {
        includeSourceValidation: true,
        includeCrossValidation: false,
        includeDataValidation: false,
        cacheResults: true,
      });

      // Update section statuses
      this.updateSectionStatuses(currentData, integrityReport);

      // Update overall status
      this.updateOverallStatus();

      // Check if auto-refresh is needed
      if (this.config.autoRefresh && this.shouldAutoRefresh()) {
        await this.triggerAutoRefresh();
      }

      // Update monitoring status
      this.monitoringStatus.lastCheck = startTime;
      this.monitoringStatus.nextCheck = startTime + this.config.checkInterval;

      this.logger.logPerformance(
        "freshness_check",
        {
          memoryUsage: 0,
          operationDuration: Date.now() - startTime,
        },
        {
          component: "DataFreshnessMonitor",
        }
      );

      return this.monitoringStatus;
    } catch (error) {
      this.logger.logError(
        {
          type: SyncErrorType.VALIDATION_ERROR,
          message: `Freshness check failed: ${error instanceof Error ? error.message : "Unknown error"}`,
          timestamp: Date.now(),
          context: { error },
          retryable: true,
          retryCount: 0,
          maxRetries: 3,
          severity: "medium" as const,
          category: "data" as const,
          recoveryStrategy: "immediate_retry" as const,
          userMessage: "Data freshness check failed. Retrying automatically.",
          userActions: [],
          technicalDetails: {
            stackTrace: error instanceof Error ? error.stack : undefined,
            environment: this.createBrowserEnvironment(),
            additionalContext: { component: "DataFreshnessMonitor", action: "checkFreshness" },
          },
          fingerprint: `freshness-check-${Date.now()}`,
        },
        { component: "DataFreshnessMonitor", action: "checkFreshness" }
      );

      throw error;
    }
  }

  /**
   * Force refresh of stale data
   */
  public async forceRefresh(): Promise<void> {
    if (this.monitoringStatus.refreshInProgress) {
      return;
    }

    this.monitoringStatus.refreshInProgress = true;
    this.monitoringStatus.autoRefreshAttempts++;

    try {
      this.emitEvent({
        type: "auto_refresh_triggered",
        timestamp: Date.now(),
        data: {
          trigger: "manual",
          attempt: this.monitoringStatus.autoRefreshAttempts,
        },
      });

      // Trigger data refresh through the store
      const store = useDashboardStore.getState();
      await store.forceSync();

      this.emitEvent({
        type: "refresh_completed",
        timestamp: Date.now(),
        data: {
          success: true,
          attempt: this.monitoringStatus.autoRefreshAttempts,
        },
      });

      this.logger.logSystemEvent("Manual data refresh completed successfully", "info", {
        component: "DataFreshnessMonitor",
      });
    } catch (error) {
      this.emitEvent({
        type: "refresh_failed",
        timestamp: Date.now(),
        data: {
          error: error instanceof Error ? error.message : "Unknown error",
          attempt: this.monitoringStatus.autoRefreshAttempts,
        },
      });

      this.logger.logError(
        {
          type: SyncErrorType.NETWORK_ERROR,
          message: `Manual data refresh failed: ${error instanceof Error ? error.message : "Unknown error"}`,
          timestamp: Date.now(),
          context: { error },
          retryable: true,
          retryCount: 0,
          maxRetries: 3,
          severity: "high" as const,
          category: "connection" as const,
          recoveryStrategy: "exponential_backoff" as const,
          userMessage: "Failed to refresh data. Please try again.",
          userActions: [],
          technicalDetails: {
            stackTrace: error instanceof Error ? error.stack : undefined,
            environment: this.createBrowserEnvironment(),
            additionalContext: { component: "DataFreshnessMonitor", action: "forceRefresh" },
          },
          fingerprint: `refresh-failed-${Date.now()}`,
        },
        { component: "DataFreshnessMonitor", action: "forceRefresh" }
      );

      throw error;
    } finally {
      this.monitoringStatus.refreshInProgress = false;
    }
  }

  /**
   * Get current freshness status
   */
  public getFreshnessStatus(): FreshnessMonitoringStatus {
    return { ...this.monitoringStatus };
  }

  /**
   * Get freshness status for a specific section
   */
  public getSectionFreshness(section: string): SectionFreshnessStatus | null {
    return this.monitoringStatus.sections[section] || null;
  }

  /**
   * Add event listener for freshness events
   */
  public addEventListener(listener: (event: FreshnessEvent) => void): () => void {
    this.eventListeners.add(listener);

    // Return unsubscribe function
    return () => {
      this.eventListeners.delete(listener);
    };
  }

  /**
   * Update configuration
   */
  public updateConfig(newConfig: Partial<FreshnessMonitorConfig>): void {
    this.config = { ...this.config, ...newConfig };

    // Restart monitoring if active
    if (this.monitoringStatus.isActive) {
      this.stopMonitoring();
      this.startMonitoring();
    }
  }

  // ================================
  // PRIVATE MONITORING METHODS
  // ================================

  private initializeMonitoring(): void {
    // Initialize section statuses
    for (const section of this.config.monitoredSections) {
      this.monitoringStatus.sections[section] = {
        section,
        lastUpdated: 0,
        age: 0,
        status: "fresh",
        needsRefresh: false,
        nextCheck: Date.now(),
      };
    }
  }

  private scheduleNextCheck(): void {
    if (this.isDestroyed || !this.monitoringStatus.isActive) {
      return;
    }

    this.checkTimer = setTimeout(() => {
      this.performScheduledCheck();
    }, this.config.checkInterval);
  }

  private async performScheduledCheck(): Promise<void> {
    try {
      await this.checkFreshness();
    } catch {
      // Error already logged in checkFreshness
    }

    // Schedule next check
    this.scheduleNextCheck();
  }

  private updateSectionStatuses(data: DashboardData, integrityReport: DataIntegrityReport): void {
    const now = Date.now();
    const store = useDashboardStore.getState();

    for (const section of this.config.monitoredSections) {
      const lastUpdated = store.lastUpdated[section] || 0;
      const age = now - lastUpdated;

      // Determine freshness status
      let status: FreshnessStatusType = "fresh";
      let needsRefresh = false;

      if (age > this.config.criticalThreshold) {
        status = "critical";
        needsRefresh = true;
      } else if (age > this.config.autoRefreshThreshold) {
        status = "stale";
        needsRefresh = this.config.autoRefresh;
      } else if (age > this.config.warningThreshold) {
        status = "warning";
      }

      // Check for mock data in this section
      const sectionMockIndicators = integrityReport.sourceValidation.mockIndicators.filter(
        indicator => indicator.field.startsWith(section)
      );

      if (sectionMockIndicators.length > 0) {
        status = "critical";
        needsRefresh = true;
      }

      // Update section status
      this.monitoringStatus.sections[section] = {
        section,
        lastUpdated,
        age,
        status,
        needsRefresh,
        nextCheck: now + this.config.checkInterval,
      };

      // Emit events for status changes
      const previousStatus = this.monitoringStatus.sections[section]?.status;
      if (previousStatus && previousStatus !== status) {
        if (status === "warning") {
          this.emitEvent({
            type: "freshness_warning",
            section,
            timestamp: now,
            data: { age, previousStatus, newStatus: status },
          });
        } else if (status === "critical") {
          this.emitEvent({
            type: "freshness_critical",
            section,
            timestamp: now,
            data: { age, previousStatus, newStatus: status },
          });
        }
      }
    }
  }

  private updateOverallStatus(): void {
    const sectionStatuses = Object.values(this.monitoringStatus.sections);

    // Determine overall status based on worst section status
    let overallStatus: FreshnessStatusType = "fresh";

    for (const sectionStatus of sectionStatuses) {
      if (sectionStatus.status === "critical") {
        overallStatus = "critical";
        break;
      }

      if (sectionStatus.status === "stale") {
        overallStatus = "stale";
        continue;
      }

      if (sectionStatus.status === "warning" && overallStatus === "fresh") {
        overallStatus = "warning";
      }
    }

    this.monitoringStatus.overallStatus = overallStatus;
  }

  private shouldAutoRefresh(): boolean {
    if (!this.config.autoRefresh) {
      return false;
    }

    if (this.monitoringStatus.refreshInProgress) {
      return false;
    }

    if (this.monitoringStatus.autoRefreshAttempts >= this.config.maxAutoRefreshAttempts) {
      return false;
    }

    // Check if any section needs refresh
    const sectionsNeedingRefresh = Object.values(this.monitoringStatus.sections).filter(
      section => section.needsRefresh
    );

    return sectionsNeedingRefresh.length > 0;
  }

  private async triggerAutoRefresh(): Promise<void> {
    if (this.monitoringStatus.refreshInProgress) {
      return;
    }

    this.monitoringStatus.refreshInProgress = true;
    this.monitoringStatus.autoRefreshAttempts++;

    try {
      this.emitEvent({
        type: "auto_refresh_triggered",
        timestamp: Date.now(),
        data: {
          trigger: "automatic",
          attempt: this.monitoringStatus.autoRefreshAttempts,
          sectionsNeedingRefresh: Object.values(this.monitoringStatus.sections)
            .filter(s => s.needsRefresh)
            .map(s => s.section),
        },
      });

      // Trigger data refresh through the store
      const store = useDashboardStore.getState();
      await store.forceSync();

      // Reset auto-refresh attempts on success
      this.monitoringStatus.autoRefreshAttempts = 0;

      this.emitEvent({
        type: "refresh_completed",
        timestamp: Date.now(),
        data: {
          success: true,
          trigger: "automatic",
        },
      });

      this.logger.logSystemEvent("Automatic data refresh completed successfully", "info", {
        component: "DataFreshnessMonitor",
      });
    } catch (error) {
      this.emitEvent({
        type: "refresh_failed",
        timestamp: Date.now(),
        data: {
          error: error instanceof Error ? error.message : "Unknown error",
          trigger: "automatic",
          attempt: this.monitoringStatus.autoRefreshAttempts,
        },
      });

      this.logger.logError(
        {
          type: SyncErrorType.NETWORK_ERROR,
          message: `Automatic data refresh failed: ${error instanceof Error ? error.message : "Unknown error"}`,
          timestamp: Date.now(),
          context: { error },
          retryable: true,
          retryCount: this.monitoringStatus.autoRefreshAttempts,
          maxRetries: this.config.maxAutoRefreshAttempts,
          severity: "medium" as const,
          category: "connection" as const,
          recoveryStrategy: "exponential_backoff" as const,
          userMessage: "Automatic data refresh failed. Will retry automatically.",
          userActions: [],
          technicalDetails: {
            stackTrace: error instanceof Error ? error.stack : undefined,
            environment: this.createBrowserEnvironment(),
            additionalContext: { component: "DataFreshnessMonitor", action: "triggerAutoRefresh" },
          },
          fingerprint: `auto-refresh-failed-${Date.now()}`,
        },
        { component: "DataFreshnessMonitor", action: "triggerAutoRefresh" }
      );
    } finally {
      this.monitoringStatus.refreshInProgress = false;
    }
  }

  private emitEvent(event: FreshnessEvent): void {
    for (const listener of this.eventListeners) {
      try {
        listener(event);
      } catch (error) {
        console.error("Error in freshness event listener:", error);
      }
    }
  }

  /**
   * Destroy the freshness monitor
   */
  public destroy(): void {
    this.isDestroyed = true;
    this.stopMonitoring();
    this.eventListeners.clear();
  }
}

// Singleton instance
let dataFreshnessMonitorInstance: DataFreshnessMonitor | null = null;

export const getDataFreshnessMonitor = (
  config?: Partial<FreshnessMonitorConfig>
): DataFreshnessMonitor => {
  dataFreshnessMonitorInstance ??= new DataFreshnessMonitor(config);
  return dataFreshnessMonitorInstance;
};

export const destroyDataFreshnessMonitor = (): void => {
  if (dataFreshnessMonitorInstance) {
    dataFreshnessMonitorInstance.destroy();
    dataFreshnessMonitorInstance = null;
  }
};
