/**
 * Sync Error Integration Service
 *
 * Integrates the enhanced error handling system with existing sync components.
 * Provides seamless error handling for SyncManager, ConnectionManager, and
 * other dashboard sync operations with automatic recovery and user feedback.
 */

import type { ConnectionManager } from "@/services/ConnectionManager";
import { getErrorHandlingManager, type ErrorHandlingConfig } from "@/services/ErrorHandlingManager";
import { getErrorLoggingService, type ErrorLoggingConfig } from "@/services/ErrorLoggingService";
import type { EventBus } from "@/services/EventBus";
import type { SyncManager } from "@/services/SyncManager";
import BrowserEventEmitter from "@/utils/BrowserEventEmitter";
import type { SyncError } from "@shared/types/sync";
import { SyncErrorType } from "@shared/types/sync";

// ================================
// INTEGRATION INTERFACES
// ================================

export interface SyncErrorIntegrationConfig {
  /** Error handling configuration */
  errorHandling: Partial<ErrorHandlingConfig>;
  /** Error logging configuration */
  errorLogging: Partial<ErrorLoggingConfig>;
  /** Whether to enable automatic error recovery */
  autoRecovery: boolean;
  /** Whether to show user notifications */
  showNotifications: boolean;
  /** Component name for error context */
  componentName: string;
}

export interface ErrorRecoveryCallbacks {
  /** Callback to force a sync operation */
  forceSync: () => Promise<void>;
  /** Callback to retry connection */
  retryConnection: () => Promise<void>;
  /** Callback to fallback to polling */
  fallbackToPolling: () => Promise<void>;
  /** Callback to refresh dashboard data */
  refreshData: () => Promise<void>;
  /** Callback to clear cache */
  clearCache: () => Promise<void>;
}

// ================================
// SYNC ERROR INTEGRATION SERVICE
// ================================

export class SyncErrorIntegration extends BrowserEventEmitter {
  private errorManager = getErrorHandlingManager();
  private loggingService = getErrorLoggingService();
  private config: SyncErrorIntegrationConfig;
  private recoveryCallbacks: Partial<ErrorRecoveryCallbacks> = {};
  private isDestroyed = false;

  constructor(config: Partial<SyncErrorIntegrationConfig> = {}) {
    super();
    this.setMaxListeners(100);

    this.config = {
      errorHandling: {},
      errorLogging: {},
      autoRecovery: true,
      showNotifications: true,
      componentName: "sync_integration",
      ...config,
    };

    this.initializeIntegration();
  }

  // ================================
  // INTEGRATION SETUP
  // ================================

  /**
   * Integrate with SyncManager
   */
  public integrateSyncManager(syncManager: SyncManager): void {
    // Listen for sync errors
    syncManager.on("sync_error", (error: SyncError) => {
      this.handleSyncError(error, { component: "sync_manager" });
    });

    // Listen for connection events
    syncManager.on("connected", () => {
      this.loggingService.logSystemEvent("sync_connected", "info", {
        component: "sync_manager",
      });
    });

    syncManager.on("disconnected", () => {
      this.loggingService.logSystemEvent("sync_disconnected", "warn", {
        component: "sync_manager",
      });
    });

    // Set up recovery callbacks
    this.recoveryCallbacks.forceSync = () => syncManager.forceSyncAll();
    this.recoveryCallbacks.refreshData = () => syncManager.forceSyncAll();
  }

  /**
   * Integrate with ConnectionManager
   */
  public integrateConnectionManager(connectionManager: ConnectionManager): void {
    // Listen for connection errors (if method exists)
    if ("onError" in connectionManager && typeof connectionManager.onError === "function") {
      connectionManager.onError((error: Error) => {
        this.handleConnectionError(error, { component: "connection_manager" });
      });
    }

    // Listen for connection status changes
    connectionManager.onStatusChange?.((status: unknown) => {
      // Type guard for status object
      const isValidStatus = (obj: unknown): obj is { connected?: boolean; type?: string } => {
        return typeof obj === "object" && obj !== null;
      };

      if (isValidStatus(status) && !status.connected) {
        this.loggingService.logSystemEvent("connection_lost", "warn", {
          component: "connection_manager",
        });
      }
    });

    // Set up recovery callbacks
    this.recoveryCallbacks.retryConnection = () => connectionManager.reconnect();
    this.recoveryCallbacks.fallbackToPolling = () => {
      if (
        "fallbackToPolling" in connectionManager &&
        typeof connectionManager.fallbackToPolling === "function"
      ) {
        return connectionManager.fallbackToPolling();
      }
      return Promise.resolve();
    };
  }

  /**
   * Integrate with EventBus
   */
  public integrateEventBus(eventBus: EventBus): void {
    // Listen for event bus errors
    eventBus.on("error", (error: Error) => {
      this.handleEventBusError(error, { component: "event_bus" });
    });

    // Forward error events to event bus
    this.errorManager.on("dashboard_event", event => {
      eventBus.publish(event);
    });
  }

  // ================================
  // ERROR HANDLING METHODS
  // ================================

  /**
   * Handle sync-specific errors
   */
  private async handleSyncError(
    error: SyncError,
    context: { component: string; [key: string]: unknown } = { component: "unknown" }
  ): Promise<void> {
    const enhancedError = await this.errorManager.handleError(error, {
      ...context,
      action: "sync_operation",
      sessionId: this.generateSessionId(),
    });

    // Log the error with full context
    this.loggingService.logError(enhancedError, context, {
      syncOperation: true,
      originalError: error,
    });

    // Emit integration event
    this.emit("sync_error_handled", { error: enhancedError, context });
  }

  /**
   * Handle connection-specific errors
   */
  private async handleConnectionError(
    error: Error,
    context: { component: string; [key: string]: unknown } = { component: "unknown" }
  ): Promise<void> {
    // Convert to sync error format
    const syncError: SyncError = {
      type: this.classifyConnectionError(error),
      message: error.message,
      code: (error as any)?.code,
      timestamp: Date.now(),
      context: { ...context, originalError: error },
      retryable: this.isConnectionErrorRetryable(error),
      retryCount: 0,
      maxRetries: 3,
      fingerprint: this.generateErrorFingerprint(
        error.message,
        this.classifyConnectionError(error)
      ),
    };

    await this.handleSyncError(syncError, context);
  }

  /**
   * Handle event bus errors
   */
  private async handleEventBusError(
    error: Error,
    context: { component: string; [key: string]: unknown } = { component: "unknown" }
  ): Promise<void> {
    // Convert to sync error format
    const syncError: SyncError = {
      type: SyncErrorType.VALIDATION_ERROR,
      message: `Event bus error: ${error.message}`,
      timestamp: Date.now(),
      context: { ...context, originalError: error },
      retryable: false,
      retryCount: 0,
      maxRetries: 0,
      fingerprint: this.generateErrorFingerprint(
        `Event bus error: ${error.message}`,
        SyncErrorType.VALIDATION_ERROR
      ),
    };

    await this.handleSyncError(syncError, context);
  }

  // ================================
  // RECOVERY INTEGRATION
  // ================================

  /**
   * Set up error recovery callbacks
   */
  public setRecoveryCallbacks(callbacks: Partial<ErrorRecoveryCallbacks>): void {
    this.recoveryCallbacks = { ...this.recoveryCallbacks, ...callbacks };
    this.setupRecoveryHandlers();
  }

  /**
   * Set up recovery event handlers
   */
  private setupRecoveryHandlers(): void {
    // Force retry handler
    this.errorManager.on("force_retry", () => {
      this.executeRecoveryCallback("forceSync", "Force sync requested by error recovery");
    });

    // Fallback connection handler
    this.errorManager.on("fallback_connection", () => {
      this.executeRecoveryCallback(
        "fallbackToPolling",
        "Fallback to polling requested by error recovery"
      );
    });

    // Force sync handler
    this.errorManager.on("force_sync", () => {
      this.executeRecoveryCallback("refreshData", "Data refresh requested by error recovery");
    });

    // User intervention handler
    this.errorManager.on("user_intervention_required", () => {
      this.emit("user_intervention_required");
    });
  }

  /**
   * Execute a recovery callback with error handling
   */
  private async executeRecoveryCallback(
    callbackName: keyof ErrorRecoveryCallbacks,
    reason: string
  ): Promise<void> {
    const callback = this.recoveryCallbacks[callbackName];
    if (!callback) {
      this.loggingService.logSystemEvent(
        `Recovery callback ${callbackName} not available`,
        "warn",
        { component: this.config.componentName }
      );
      return;
    }

    try {
      this.loggingService.logSystemEvent(`Executing recovery callback: ${callbackName}`, "info", {
        component: this.config.componentName,
      });

      const startTime = Date.now();
      await callback();
      const duration = Date.now() - startTime;

      this.loggingService.logPerformance(
        `recovery_${callbackName}`,
        {
          memoryUsage: (performance as any)?.memory?.usedJSHeapSize || 0,
          operationDuration: duration,
        },
        { component: this.config.componentName }
      );

      this.emit("recovery_callback_success", { callback: callbackName, duration });
    } catch (error) {
      this.loggingService.logSystemEvent(
        `Recovery callback ${callbackName} failed: ${error}`,
        "error",
        { component: this.config.componentName }
      );

      this.emit("recovery_callback_failure", { callback: callbackName, error });
    }
  }

  // ================================
  // ERROR CLASSIFICATION
  // ================================

  /**
   * Classify connection errors into sync error types
   */
  private classifyConnectionError(error: Error): SyncErrorType {
    const message = error.message.toLowerCase();
    const name = error.name.toLowerCase();

    if (message.includes("websocket") || name.includes("websocket")) {
      return SyncErrorType.WEBSOCKET_ERROR;
    }

    if (message.includes("timeout") || name.includes("timeout")) {
      return SyncErrorType.TIMEOUT_ERROR;
    }

    if (message.includes("network") || message.includes("fetch") || name.includes("network")) {
      return SyncErrorType.NETWORK_ERROR;
    }

    if (message.includes("auth") || message.includes("401") || message.includes("403")) {
      return SyncErrorType.AUTHENTICATION_ERROR;
    }

    return SyncErrorType.NETWORK_ERROR;
  }

  /**
   * Determine if a connection error is retryable
   */
  private isConnectionErrorRetryable(error: Error): boolean {
    const message = error.message.toLowerCase();

    // Non-retryable errors
    const nonRetryablePatterns = [
      "permission denied",
      "access forbidden",
      "invalid token",
      "authentication failed",
      "401",
      "403",
    ];

    return !nonRetryablePatterns.some(pattern => message.includes(pattern));
  }

  // ================================
  // MONITORING AND ANALYTICS
  // ================================

  /**
   * Get error analytics from the integration
   */
  public getErrorAnalytics(): {
    errorHandling: any;
    logging: unknown;
    integration: {
      totalIntegratedErrors: number;
      recoveryCallbacksExecuted: number;
      recoveryCallbacksSuccessful: number;
      averageRecoveryTime: number;
    };
  } {
    const errorAnalytics = this.errorManager.getErrorAnalytics();
    const loggingAnalytics = this.loggingService.getErrorAnalytics();

    // Calculate integration-specific metrics
    const integrationLogs = this.loggingService.getLogs({
      component: this.config.componentName,
      category: "system",
    });

    const recoveryLogs = integrationLogs.filter(log => log.message.includes("recovery callback"));

    const successfulRecoveries = recoveryLogs.filter(log => log.message.includes("success")).length;

    const recoveryTimes = recoveryLogs
      .filter(log => log.performance?.operationDuration)
      .map(log => log.performance!.operationDuration);

    const averageRecoveryTime =
      recoveryTimes.length > 0
        ? recoveryTimes.reduce((sum, time) => sum + time, 0) / recoveryTimes.length
        : 0;

    return {
      errorHandling: errorAnalytics,
      logging: loggingAnalytics,
      integration: {
        totalIntegratedErrors: integrationLogs.filter(log => log.category === "error").length,
        recoveryCallbacksExecuted: recoveryLogs.length,
        recoveryCallbacksSuccessful: successfulRecoveries,
        averageRecoveryTime,
      },
    };
  }

  /**
   * Export comprehensive error report
   */
  public exportErrorReport(format: "json" | "csv" | "txt" = "json"): string {
    const analytics = this.getErrorAnalytics();
    const logs = this.loggingService.getLogs({ limit: 1000 });

    const report = {
      timestamp: new Date().toISOString(),
      sessionId: this.generateSessionId(),
      analytics,
      recentLogs: logs.slice(0, 100), // Last 100 logs
      configuration: {
        autoRecovery: this.config.autoRecovery,
        showNotifications: this.config.showNotifications,
        componentName: this.config.componentName,
      },
    };

    switch (format) {
      case "json":
        return JSON.stringify(report, null, 2);
      case "csv":
      case "txt":
        return this.loggingService.exportLogs(format);
      default:
        return JSON.stringify(report, null, 2);
    }
  }

  // ================================
  // LIFECYCLE MANAGEMENT
  // ================================

  /**
   * Initialize the integration service
   */
  private initializeIntegration(): void {
    // Set up error manager configuration
    this.errorManager = getErrorHandlingManager(this.config.errorHandling);

    // Set up logging service configuration
    this.loggingService = getErrorLoggingService(this.config.errorLogging);

    // Set up recovery handlers
    this.setupRecoveryHandlers();

    // Log initialization
    this.loggingService.logSystemEvent("Sync error integration initialized", "info", {
      component: this.config.componentName,
    });
  }

  /**
   * Destroy the integration service
   */
  public destroy(): void {
    this.isDestroyed = true;

    // Log destruction
    this.loggingService.logSystemEvent("Sync error integration destroyed", "info", {
      component: this.config.componentName,
    });

    // Clean up event listeners
    this.removeAllListeners();

    // Clear recovery callbacks
    this.recoveryCallbacks = {};
  }

  // ================================
  // UTILITY METHODS
  // ================================

  private generateSessionId(): string {
    return `integration_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  private generateErrorFingerprint(message: string, type: string): string {
    const fingerprintData = {
      type,
      message: message.substring(0, 100), // First 100 chars
    };

    return btoa(JSON.stringify(fingerprintData)).substring(0, 16);
  }
}

// Singleton instance
let syncErrorIntegrationInstance: SyncErrorIntegration | null = null;

export const getSyncErrorIntegration = (
  config?: Partial<SyncErrorIntegrationConfig>
): SyncErrorIntegration => {
  if (!syncErrorIntegrationInstance) {
    syncErrorIntegrationInstance = new SyncErrorIntegration(config);
  }
  return syncErrorIntegrationInstance;
};

export const destroySyncErrorIntegration = (): void => {
  if (syncErrorIntegrationInstance) {
    syncErrorIntegrationInstance.destroy();
    syncErrorIntegrationInstance = null;
  }
};
