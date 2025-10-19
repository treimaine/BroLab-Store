/**
 * Enhanced Error Handling and Recovery Manager
 *
 * Comprehensive error classification system for different types of sync failures
 * with automatic error recovery strategies, exponential backoff for retries,
 * user-friendly error messages, and full context logging for debugging.
 */

import BrowserEventEmitter from "@/utils/BrowserEventEmitter";
import type {
  DashboardEvent,
  EnhancedSyncError,
  ErrorContext,
  RecoveryStrategyType,
  SyncError,
  TechnicalDetails,
  UserAction,
} from "@shared/types/sync";
import { SyncErrorType } from "@shared/types/sync";

// Re-export types for backward compatibility
export type {
  EnhancedSyncError,
  ErrorContext,
  RecoveryStrategyType,
  TechnicalDetails,
  UserAction,
} from "@shared/types/sync";

// ================================
// ERROR CLASSIFICATION SYSTEM
// ================================

// ================================
// ERROR RECOVERY STRATEGIES
// ================================

/**
 * Error recovery strategy configuration
 */
export interface RecoveryStrategy {
  /** Strategy type */
  type: RecoveryStrategyType;
  /** Strategy name */
  name: string;
  /** Strategy description */
  description: string;
  /** Whether strategy can be applied automatically */
  automatic: boolean;
  /** Maximum number of attempts */
  maxAttempts: number;
  /** Base delay between attempts (ms) */
  baseDelay: number;
  /** Maximum delay between attempts (ms) */
  maxDelay: number;
  /** Backoff multiplier */
  backoffMultiplier: number;
  /** Conditions for applying strategy */
  conditions: (error: EnhancedSyncError) => boolean;
  /** Strategy execution function */
  execute: (error: EnhancedSyncError, attempt: number) => Promise<boolean>;
}

/**
 * Recovery attempt tracking
 */
export interface RecoveryAttempt {
  /** Attempt identifier */
  id: string;
  /** Error being recovered */
  errorId: string;
  /** Recovery strategy used */
  strategy: RecoveryStrategyType;
  /** Attempt number */
  attemptNumber: number;
  /** Attempt timestamp */
  timestamp: number;
  /** Attempt result */
  result: "success" | "failure" | "pending";
  /** Attempt duration (ms) */
  duration?: number;
  /** Error that occurred during recovery */
  recoveryError?: Error;
  /** Next attempt scheduled time */
  nextAttemptAt?: number;
}

// ================================
// ERROR LOGGING AND CONTEXT
// ================================

/**
 * Error logging configuration
 */
export interface ErrorLoggingConfig {
  /** Whether to log to console */
  console: boolean;
  /** Whether to send to remote logging service */
  remote: boolean;
  /** Log level threshold */
  logLevel: "debug" | "info" | "warn" | "error";
  /** Whether to include stack traces */
  includeStackTrace: boolean;
  /** Whether to include user data */
  includeUserData: boolean;
  /** Maximum log entries to keep in memory */
  maxLogEntries: number;
  /** Remote logging endpoint */
  remoteEndpoint?: string;
}

// ================================
// ERROR HANDLING MANAGER
// ================================

/**
 * Configuration for error handling manager
 */
export interface ErrorHandlingConfig {
  /** Maximum number of errors to track */
  maxErrorHistory: number;
  /** Error deduplication window (ms) */
  deduplicationWindow: number;
  /** Default recovery strategy */
  defaultRecoveryStrategy: RecoveryStrategyType;
  /** Whether to auto-retry recoverable errors */
  autoRetry: boolean;
  /** Maximum auto-retry attempts */
  maxAutoRetries: number;
  /** Base retry delay (ms) */
  baseRetryDelay: number;
  /** Maximum retry delay (ms) */
  maxRetryDelay: number;
  /** Logging configuration */
  logging: ErrorLoggingConfig;
  /** User notification preferences */
  notifications: {
    /** Show toast notifications for errors */
    showToasts: boolean;
    /** Show recovery progress */
    showRecoveryProgress: boolean;
    /** Auto-dismiss timeout (ms) */
    autoDismissTimeout: number;
  };
}

/**
 * Enhanced Error Handling Manager for dashboard sync operations
 */
export class ErrorHandlingManager extends BrowserEventEmitter {
  private config: ErrorHandlingConfig;
  private errorHistory: EnhancedSyncError[] = [];
  private recoveryAttempts = new Map<string, RecoveryAttempt[]>();
  private recoveryStrategies = new Map<RecoveryStrategyType, RecoveryStrategy>();
  private activeRecoveries = new Set<string>();
  private errorFingerprints = new Map<string, number>();
  private sessionId: string;
  private isDestroyed = false;

  constructor(config: Partial<ErrorHandlingConfig> = {}) {
    super();
    this.setMaxListeners(100);

    this.config = {
      maxErrorHistory: config.maxErrorHistory || 100,
      deduplicationWindow: config.deduplicationWindow || 5000, // 5 seconds
      defaultRecoveryStrategy: config.defaultRecoveryStrategy || "exponential_backoff",
      autoRetry: config.autoRetry ?? true,
      maxAutoRetries: config.maxAutoRetries || 3,
      baseRetryDelay: config.baseRetryDelay || 1000,
      maxRetryDelay: config.maxRetryDelay || 30000,
      logging: {
        console: true,
        remote: false,
        logLevel: "error",
        includeStackTrace: true,
        includeUserData: false,
        maxLogEntries: 1000,
        ...config.logging,
      },
      notifications: {
        showToasts: true,
        showRecoveryProgress: true,
        autoDismissTimeout: 5000,
        ...config.notifications,
      },
    };

    this.sessionId = this.generateSessionId();
    this.initializeRecoveryStrategies();
    this.setupCleanupInterval();
  }

  // ================================
  // ERROR CLASSIFICATION
  // ================================

  /**
   * Classify and enhance a sync error with recovery metadata
   */
  public classifyError(error: unknown, context: Partial<ErrorContext> = {}): EnhancedSyncError {
    const baseError = this.createBaseSyncError(error, context);
    const enhancedError = this.enhanceError(baseError, context);

    return enhancedError;
  }

  /**
   * Handle a sync error with automatic recovery if enabled
   */
  public async handleError(
    error: unknown,
    context: Partial<ErrorContext> = {}
  ): Promise<EnhancedSyncError> {
    if (this.isDestroyed) {
      throw new Error("ErrorHandlingManager has been destroyed");
    }

    const enhancedError = this.classifyError(error, context);

    // Check for duplicate errors
    if (this.isDuplicateError(enhancedError)) {
      this.log("Duplicate error detected, skipping handling", {
        errorId: enhancedError.fingerprint,
      });
      return enhancedError;
    }

    // Add to error history
    this.addToErrorHistory(enhancedError);

    // Log the error
    this.logError(enhancedError, context);

    // Emit error event
    this.emitErrorEvent(enhancedError);

    // Attempt automatic recovery if enabled
    if (this.config.autoRetry && enhancedError.retryable) {
      this.scheduleRecovery(enhancedError);
    }

    return enhancedError;
  }

  // ================================
  // RECOVERY MANAGEMENT
  // ================================

  /**
   * Attempt to recover from an error using the appropriate strategy
   */
  public async attemptRecovery(
    errorId: string,
    strategyType?: RecoveryStrategyType
  ): Promise<boolean> {
    const error = this.findErrorById(errorId);
    if (!error) {
      this.log("Error not found for recovery", { errorId });
      return false;
    }

    if (this.activeRecoveries.has(errorId)) {
      this.log("Recovery already in progress", { errorId });
      return false;
    }

    const strategy = strategyType
      ? this.recoveryStrategies.get(strategyType)
      : this.selectRecoveryStrategy(error);

    if (!strategy) {
      this.log("No suitable recovery strategy found", { errorId, strategyType });
      return false;
    }

    return this.executeRecovery(error, strategy);
  }

  /**
   * Get recovery status for an error
   */
  public getRecoveryStatus(errorId: string): {
    inProgress: boolean;
    attempts: RecoveryAttempt[];
    canRetry: boolean;
    nextAttemptAt?: number;
  } {
    const attempts = this.recoveryAttempts.get(errorId) || [];
    const lastAttempt = attempts[attempts.length - 1];
    const error = this.findErrorById(errorId);

    return {
      inProgress: this.activeRecoveries.has(errorId),
      attempts,
      canRetry: error ? this.canRetry(error, attempts.length) : false,
      nextAttemptAt: lastAttempt?.nextAttemptAt,
    };
  }

  // ================================
  // ERROR ANALYTICS
  // ================================

  /**
   * Get error statistics and patterns
   */
  public getErrorAnalytics(): {
    totalErrors: number;
    errorsByType: Record<SyncErrorType, number>;
    errorsBySeverity: Record<string, number>;
    errorsByCategory: Record<string, number>;
    recoverySuccessRate: number;
    averageRecoveryTime: number;
    topErrorFingerprints: Array<{ fingerprint: string; count: number }>;
    recentErrors: EnhancedSyncError[];
  } {
    const errorsByType = {} as Record<SyncErrorType, number>;
    const errorsBySeverity = {} as Record<string, number>;
    const errorsByCategory = {} as Record<string, number>;

    // Analyze error history
    for (const error of this.errorHistory) {
      errorsByType[error.type] = (errorsByType[error.type] || 0) + 1;
      errorsBySeverity[error.severity] = (errorsBySeverity[error.severity] || 0) + 1;
      errorsByCategory[error.category] = (errorsByCategory[error.category] || 0) + 1;
    }

    // Calculate recovery success rate
    let totalRecoveryAttempts = 0;
    let successfulRecoveries = 0;
    let totalRecoveryTime = 0;

    for (const attempts of this.recoveryAttempts.values()) {
      for (const attempt of attempts) {
        totalRecoveryAttempts++;
        if (attempt.result === "success") {
          successfulRecoveries++;
          if (attempt.duration) {
            totalRecoveryTime += attempt.duration;
          }
        }
      }
    }

    const recoverySuccessRate =
      totalRecoveryAttempts > 0 ? (successfulRecoveries / totalRecoveryAttempts) * 100 : 0;

    const averageRecoveryTime =
      successfulRecoveries > 0 ? totalRecoveryTime / successfulRecoveries : 0;

    // Get top error fingerprints
    const topErrorFingerprints = Array.from(this.errorFingerprints.entries())
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([fingerprint, count]) => ({ fingerprint, count }));

    return {
      totalErrors: this.errorHistory.length,
      errorsByType,
      errorsBySeverity,
      errorsByCategory,
      recoverySuccessRate,
      averageRecoveryTime,
      topErrorFingerprints,
      recentErrors: this.errorHistory.slice(-20),
    };
  }

  // ================================
  // USER ACTIONS
  // ================================

  /**
   * Get available user actions for an error
   */
  public getUserActions(errorId: string): UserAction[] {
    const error = this.findErrorById(errorId);
    if (!error) return [];

    return error.userActions.filter(action => action.available);
  }

  /**
   * Execute a user action for error recovery
   */
  public async executeUserAction(errorId: string, actionId: string): Promise<boolean> {
    const error = this.findErrorById(errorId);
    if (!error) return false;

    const action = error.userActions.find(a => a.id === actionId);
    if (!action || !action.available) return false;

    try {
      await action.handler();
      this.log("User action executed successfully", { errorId, actionId });
      return true;
    } catch (actionError) {
      this.log("User action failed", { errorId, actionId, error: actionError });
      return false;
    }
  }

  // ================================
  // CLEANUP AND MANAGEMENT
  // ================================

  /**
   * Clear error history and reset state
   */
  public clearErrorHistory(): void {
    this.errorHistory = [];
    this.recoveryAttempts.clear();
    this.errorFingerprints.clear();
    this.activeRecoveries.clear();
    this.emit("error_history_cleared");
  }

  /**
   * Destroy the error handling manager
   */
  public destroy(): void {
    this.isDestroyed = true;
    this.clearErrorHistory();
    this.removeAllListeners();
  }

  // ================================
  // PRIVATE METHODS
  // ================================

  private createBaseSyncError(error: unknown, context: Partial<ErrorContext>): SyncError {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;

    // Determine error type based on error characteristics
    let errorType: SyncErrorType = SyncErrorType.NETWORK_ERROR;

    if (
      errorMessage.includes("auth") ||
      errorMessage.includes("401") ||
      errorMessage.includes("403")
    ) {
      errorType = SyncErrorType.AUTHENTICATION_ERROR;
    } else if (errorMessage.includes("websocket") || errorMessage.includes("ws")) {
      errorType = SyncErrorType.WEBSOCKET_ERROR;
    } else if (errorMessage.includes("timeout")) {
      errorType = SyncErrorType.TIMEOUT_ERROR;
    } else if (errorMessage.includes("validation") || errorMessage.includes("invalid")) {
      errorType = SyncErrorType.VALIDATION_ERROR;
    } else if (errorMessage.includes("conflict") || errorMessage.includes("version")) {
      errorType = SyncErrorType.CONFLICT_ERROR;
    } else if (errorMessage.includes("inconsistency") || errorMessage.includes("mismatch")) {
      errorType = SyncErrorType.DATA_INCONSISTENCY;
    }

    const baseError = {
      type: errorType,
      message: errorMessage,
      code: this.extractErrorCode(error),
      timestamp: Date.now(),
      context: {
        ...context,
        stackTrace: errorStack,
        sessionId: this.sessionId,
      },
      retryable: this.isRetryableError(errorType, errorMessage),
      retryCount: 0,
      maxRetries: this.config.maxAutoRetries,
    };

    // Generate fingerprint for the error
    const fingerprint = this.generateErrorFingerprint(baseError);

    return {
      ...baseError,
      fingerprint,
    };
  }

  private enhanceError(baseError: SyncError, context: Partial<ErrorContext>): EnhancedSyncError {
    const severity = this.determineSeverity(baseError);
    const category = this.determineCategory(baseError);
    const recoveryStrategy = this.determineRecoveryStrategy(baseError);
    const userMessage = this.generateUserMessage(baseError);
    const userActions = this.generateUserActions(baseError);
    const technicalDetails = this.generateTechnicalDetails(baseError, context);
    const fingerprint = this.generateErrorFingerprint(baseError);

    return {
      ...baseError,
      severity,
      category,
      recoveryStrategy,
      userMessage,
      userActions,
      technicalDetails,
      fingerprint,
    };
  }

  private determineSeverity(error: SyncError): "low" | "medium" | "high" | "critical" {
    switch (error.type) {
      case SyncErrorType.AUTHENTICATION_ERROR:
        return "critical";
      case SyncErrorType.DATA_INCONSISTENCY:
      case SyncErrorType.VALIDATION_ERROR:
        return "high";
      case SyncErrorType.WEBSOCKET_ERROR:
      case SyncErrorType.TIMEOUT_ERROR:
        return "medium";
      case SyncErrorType.NETWORK_ERROR:
      case SyncErrorType.CONFLICT_ERROR:
      default:
        return "low";
    }
  }

  private determineCategory(error: SyncError): "connection" | "data" | "auth" | "system" | "user" {
    switch (error.type) {
      case SyncErrorType.AUTHENTICATION_ERROR:
        return "auth";
      case SyncErrorType.NETWORK_ERROR:
      case SyncErrorType.WEBSOCKET_ERROR:
      case SyncErrorType.TIMEOUT_ERROR:
        return "connection";
      case SyncErrorType.DATA_INCONSISTENCY:
      case SyncErrorType.VALIDATION_ERROR:
      case SyncErrorType.CONFLICT_ERROR:
        return "data";
      default:
        return "system";
    }
  }

  private determineRecoveryStrategy(error: SyncError): RecoveryStrategyType {
    if (!error.retryable) return "no_recovery";

    switch (error.type) {
      case SyncErrorType.AUTHENTICATION_ERROR:
        return "user_intervention";
      case SyncErrorType.WEBSOCKET_ERROR:
        return "fallback_connection";
      case SyncErrorType.DATA_INCONSISTENCY:
        return "force_sync";
      case SyncErrorType.TIMEOUT_ERROR:
      case SyncErrorType.NETWORK_ERROR:
        return "exponential_backoff";
      default:
        return this.config.defaultRecoveryStrategy;
    }
  }

  private generateUserMessage(error: SyncError): string {
    const messages: Record<SyncErrorType, string> = {
      [SyncErrorType.NETWORK_ERROR]:
        "Connection issue detected. We're trying to reconnect automatically.",
      [SyncErrorType.WEBSOCKET_ERROR]:
        "Real-time connection lost. Switching to backup connection method.",
      [SyncErrorType.AUTHENTICATION_ERROR]:
        "Authentication expired. Please sign in again to continue.",
      [SyncErrorType.DATA_INCONSISTENCY]:
        "Data synchronization issue detected. We're fixing this automatically.",
      [SyncErrorType.VALIDATION_ERROR]:
        "Data validation failed. Please refresh the page to reload your data.",
      [SyncErrorType.CONFLICT_ERROR]: "Data conflict detected. We're resolving this automatically.",
      [SyncErrorType.TIMEOUT_ERROR]:
        "Request timed out. We're retrying with a faster connection method.",
    };

    return messages[error.type] || "An unexpected error occurred. We're working to resolve this.";
  }

  private generateUserActions(error: SyncError): UserAction[] {
    const actions: UserAction[] = [];

    // Always provide dismiss action
    actions.push({
      id: "dismiss",
      label: "Dismiss",
      description: "Hide this error message",
      type: "dismiss",
      primary: false,
      available: true,
      handler: () => {
        this.emit("user_action", {
          action: "dismiss",
          errorId: (error as EnhancedSyncError).fingerprint || `${error.type}-${error.timestamp}`,
        });
      },
    });

    // Add retry action for retryable errors
    if (error.retryable) {
      actions.push({
        id: "retry",
        label: "Retry Now",
        description: "Try the operation again immediately",
        type: "retry",
        primary: true,
        available: true,
        handler: () => {
          this.attemptRecovery(
            (error as EnhancedSyncError).fingerprint || `${error.type}-${error.timestamp}`
          );
        },
      });
    }

    // Add refresh action for data errors
    if (
      error.type === SyncErrorType.DATA_INCONSISTENCY ||
      error.type === SyncErrorType.VALIDATION_ERROR
    ) {
      actions.push({
        id: "refresh",
        label: "Refresh Data",
        description: "Reload all dashboard data from the server",
        type: "refresh",
        primary: true,
        available: true,
        handler: () => {
          this.emit("user_action", {
            action: "refresh",
            errorId: (error as EnhancedSyncError).fingerprint || `${error.type}-${error.timestamp}`,
          });
        },
      });
    }

    // Add reload action for critical errors
    if (error.type === SyncErrorType.AUTHENTICATION_ERROR) {
      actions.push({
        id: "reload",
        label: "Reload Page",
        description: "Reload the entire page to reset the application",
        type: "reload",
        primary: true,
        available: true,
        handler: () => window.location.reload(),
      });
    }

    // Add contact support action for high severity errors
    if (this.determineSeverity(error) === "high" || this.determineSeverity(error) === "critical") {
      actions.push({
        id: "contact_support",
        label: "Contact Support",
        description: "Get help from our support team",
        type: "contact_support",
        primary: false,
        available: true,
        handler: () => {
          this.emit("user_action", {
            action: "contact_support",
            errorId: (error as EnhancedSyncError).fingerprint || `${error.type}-${error.timestamp}`,
          });
        },
      });
    }

    return actions;
  }

  private generateTechnicalDetails(
    error: SyncError,
    context: Partial<ErrorContext>
  ): TechnicalDetails {
    return {
      stackTrace: error.context.stackTrace as string,
      environment: {
        userAgent: navigator.userAgent,
        url: window.location.href,
        timestamp: Date.now(),
        connectionType: (navigator as any)?.connection?.effectiveType,
        onlineStatus: navigator.onLine,
        viewport: {
          width: window.innerWidth,
          height: window.innerHeight,
        },
        screen: {
          width: window.screen.width,
          height: window.screen.height,
        },
        memory: (performance as any)?.memory
          ? {
              usedJSHeapSize: (performance as any).memory.usedJSHeapSize,
              totalJSHeapSize: (performance as any).memory.totalJSHeapSize,
              jsHeapSizeLimit: (performance as any).memory.jsHeapSizeLimit,
            }
          : undefined,
        connection: (navigator as any)?.connection
          ? {
              effectiveType: (navigator as any).connection.effectiveType,
              downlink: (navigator as any).connection.downlink,
              rtt: (navigator as any).connection.rtt,
              saveData: (navigator as unknown).connection.saveData,
            }
          : undefined,
      },
      additionalContext: {
        ...context,
        errorType: error.type,
        retryCount: error.retryCount,
        sessionId: this.sessionId,
      },
    };
  }

  private generateErrorFingerprint(error: Omit<SyncError, "fingerprint">): string {
    const fingerprintData = {
      type: error.type,
      message: error.message.substring(0, 100), // First 100 chars
      code: error.code,
    };

    return btoa(JSON.stringify(fingerprintData)).substring(0, 16);
  }

  private isDuplicateError(error: EnhancedSyncError): boolean {
    const lastOccurrence = this.errorFingerprints.get(error.fingerprint);
    if (!lastOccurrence) {
      this.errorFingerprints.set(error.fingerprint, Date.now());
      return false;
    }

    const timeSinceLastOccurrence = Date.now() - lastOccurrence;
    if (timeSinceLastOccurrence < this.config.deduplicationWindow) {
      return true;
    }

    this.errorFingerprints.set(error.fingerprint, Date.now());
    return false;
  }

  private addToErrorHistory(error: EnhancedSyncError): void {
    this.errorHistory.push(error);

    // Trim history if it exceeds maximum
    if (this.errorHistory.length > this.config.maxErrorHistory) {
      this.errorHistory = this.errorHistory.slice(-this.config.maxErrorHistory);
    }
  }

  private logError(error: EnhancedSyncError, context: Partial<ErrorContext>): void {
    if (this.config.logging.console) {
      console.error(`[ErrorHandlingManager] ${error.type}: ${error.message}`, {
        error,
        context,
        technicalDetails: error.technicalDetails,
      });
    }

    // TODO: Implement remote logging if configured
    if (this.config.logging.remote && this.config.logging.remoteEndpoint) {
      // Send to remote logging service
    }
  }

  private emitErrorEvent(error: EnhancedSyncError): void {
    const event: DashboardEvent = {
      type: "error.sync",
      payload: { error, context: {} },
      timestamp: Date.now(),
      source: "system",
      id: `error-${error.fingerprint}-${Date.now()}`,
      priority: error.severity === "critical" ? "critical" : "high",
    };

    this.emit("dashboard_event", event);
    this.emit("error", error);
  }

  private scheduleRecovery(error: EnhancedSyncError): void {
    if (!this.canRetry(error, 0)) return;

    const strategy = this.recoveryStrategies.get(error.recoveryStrategy);
    if (!strategy || !strategy.automatic) return;

    const delay = this.calculateRetryDelay(0, strategy);

    setTimeout(() => {
      this.executeRecovery(error, strategy);
    }, delay);
  }

  private async executeRecovery(
    error: EnhancedSyncError,
    strategy: RecoveryStrategy
  ): Promise<boolean> {
    const attemptId = this.generateAttemptId();
    const attempts = this.recoveryAttempts.get(error.fingerprint) || [];
    const attemptNumber = attempts.length + 1;

    if (attemptNumber > strategy.maxAttempts) {
      this.log("Max recovery attempts exceeded", {
        errorId: error.fingerprint,
        strategy: strategy.type,
      });
      return false;
    }

    const attempt: RecoveryAttempt = {
      id: attemptId,
      errorId: error.fingerprint,
      strategy: strategy.type,
      attemptNumber,
      timestamp: Date.now(),
      result: "pending",
    };

    attempts.push(attempt);
    this.recoveryAttempts.set(error.fingerprint, attempts);
    this.activeRecoveries.add(error.fingerprint);

    this.emit("recovery_started", { error, attempt, strategy });

    try {
      const startTime = Date.now();
      const success = await strategy.execute(error, attemptNumber);
      const duration = Date.now() - startTime;

      attempt.result = success ? "success" : "failure";
      attempt.duration = duration;

      if (success) {
        this.activeRecoveries.delete(error.fingerprint);
        this.emit("recovery_success", { error, attempt, strategy });
        this.log("Recovery successful", {
          errorId: error.fingerprint,
          strategy: strategy.type,
          duration,
        });
        return true;
      } else {
        // Schedule next attempt if within limits
        if (attemptNumber < strategy.maxAttempts) {
          const nextDelay = this.calculateRetryDelay(attemptNumber, strategy);
          attempt.nextAttemptAt = Date.now() + nextDelay;

          setTimeout(() => {
            this.executeRecovery(error, strategy);
          }, nextDelay);
        } else {
          this.activeRecoveries.delete(error.fingerprint);
        }

        this.emit("recovery_failure", { error, attempt, strategy });
        this.log("Recovery failed", {
          errorId: error.fingerprint,
          strategy: strategy.type,
          attemptNumber,
        });
        return false;
      }
    } catch (recoveryError) {
      attempt.result = "failure";
      attempt.recoveryError = recoveryError as Error;
      this.activeRecoveries.delete(error.fingerprint);

      this.emit("recovery_error", { error, attempt, strategy, recoveryError });
      this.log("Recovery error", {
        errorId: error.fingerprint,
        strategy: strategy.type,
        recoveryError,
      });
      return false;
    }
  }

  private selectRecoveryStrategy(error: EnhancedSyncError): RecoveryStrategy | undefined {
    for (const strategy of this.recoveryStrategies.values()) {
      if (strategy.conditions(error)) {
        return strategy;
      }
    }
    return undefined;
  }

  private canRetry(error: EnhancedSyncError, currentAttempts: number): boolean {
    return error.retryable && currentAttempts < error.maxRetries;
  }

  private calculateRetryDelay(attemptNumber: number, strategy: RecoveryStrategy): number {
    const delay = Math.min(
      strategy.baseDelay * Math.pow(strategy.backoffMultiplier, attemptNumber),
      strategy.maxDelay
    );

    // Add jitter to prevent thundering herd
    const jitter = Math.random() * 0.1 * delay;
    return Math.floor(delay + jitter);
  }

  private findErrorById(errorId: string): EnhancedSyncError | undefined {
    return this.errorHistory.find(error => error.fingerprint === errorId);
  }

  private extractErrorCode(error: unknown): string | undefined {
    if (error instanceof Error && "code" in error) {
      return String(error.code);
    }
    return undefined;
  }

  private isRetryableError(type: SyncErrorType, message: string): boolean {
    // Authentication errors are not retryable
    if (type === SyncErrorType.AUTHENTICATION_ERROR) return false;

    // Validation errors are usually not retryable
    if (type === SyncErrorType.VALIDATION_ERROR) return false;

    // Check for specific non-retryable messages
    const nonRetryablePatterns = [
      "permission denied",
      "access forbidden",
      "invalid token",
      "malformed request",
    ];

    return !nonRetryablePatterns.some(pattern => message.toLowerCase().includes(pattern));
  }

  private initializeRecoveryStrategies(): void {
    // Immediate retry strategy
    this.recoveryStrategies.set("immediate_retry", {
      type: "immediate_retry",
      name: "Immediate Retry",
      description: "Retry the operation immediately",
      automatic: true,
      maxAttempts: 1,
      baseDelay: 0,
      maxDelay: 0,
      backoffMultiplier: 1,
      conditions: error => error.retryable && error.severity === "low",
      execute: async () => {
        this.emit("force_retry");
        return true;
      },
    });

    // Exponential backoff strategy
    this.recoveryStrategies.set("exponential_backoff", {
      type: "exponential_backoff",
      name: "Exponential Backoff",
      description: "Retry with increasing delays",
      automatic: true,
      maxAttempts: this.config.maxAutoRetries,
      baseDelay: this.config.baseRetryDelay,
      maxDelay: this.config.maxRetryDelay,
      backoffMultiplier: 2,
      conditions: error =>
        error.retryable && ["network_error", "timeout_error"].includes(error.type),
      execute: async () => {
        this.emit("force_retry");
        return true;
      },
    });

    // Fallback connection strategy
    this.recoveryStrategies.set("fallback_connection", {
      type: "fallback_connection",
      name: "Fallback Connection",
      description: "Switch to backup connection method",
      automatic: true,
      maxAttempts: 2,
      baseDelay: 1000,
      maxDelay: 5000,
      backoffMultiplier: 2,
      conditions: error => error.type === SyncErrorType.WEBSOCKET_ERROR,
      execute: async () => {
        this.emit("fallback_connection");
        return true;
      },
    });

    // Force sync strategy
    this.recoveryStrategies.set("force_sync", {
      type: "force_sync",
      name: "Force Sync",
      description: "Force a complete data synchronization",
      automatic: true,
      maxAttempts: 2,
      baseDelay: 2000,
      maxDelay: 10000,
      backoffMultiplier: 3,
      conditions: error => error.type === SyncErrorType.DATA_INCONSISTENCY,
      execute: async () => {
        this.emit("force_sync");
        return true;
      },
    });

    // User intervention strategy
    this.recoveryStrategies.set("user_intervention", {
      type: "user_intervention",
      name: "User Intervention Required",
      description: "User action required to resolve the error",
      automatic: false,
      maxAttempts: 1,
      baseDelay: 0,
      maxDelay: 0,
      backoffMultiplier: 1,
      conditions: error => error.type === SyncErrorType.AUTHENTICATION_ERROR,
      execute: async () => {
        this.emit("user_intervention_required");
        return false;
      },
    });
  }

  private setupCleanupInterval(): void {
    // Clean up old errors and recovery attempts every 10 minutes
    setInterval(
      () => {
        if (this.isDestroyed) return;

        const cutoffTime = Date.now() - 24 * 60 * 60 * 1000; // 24 hours ago

        // Clean up old errors
        this.errorHistory = this.errorHistory.filter(error => error.timestamp > cutoffTime);

        // Clean up old recovery attempts
        for (const [errorId, attempts] of this.recoveryAttempts.entries()) {
          const recentAttempts = attempts.filter(attempt => attempt.timestamp > cutoffTime);
          if (recentAttempts.length === 0) {
            this.recoveryAttempts.delete(errorId);
          } else {
            this.recoveryAttempts.set(errorId, recentAttempts);
          }
        }

        // Clean up old error fingerprints
        for (const [fingerprint, timestamp] of this.errorFingerprints.entries()) {
          if (timestamp < cutoffTime) {
            this.errorFingerprints.delete(fingerprint);
          }
        }
      },
      10 * 60 * 1000
    );
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  private generateAttemptId(): string {
    return `attempt_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  private log(message: string, data?: unknown): void {
    if (this.config.logging.console) {
      console.log(`[ErrorHandlingManager] ${message}`, data || "");
    }
  }
}

// Singleton instance
let errorHandlingManagerInstance: ErrorHandlingManager | null = null;

export const getErrorHandlingManager = (
  config?: Partial<ErrorHandlingConfig>
): ErrorHandlingManager => {
  if (!errorHandlingManagerInstance) {
    errorHandlingManagerInstance = new ErrorHandlingManager(config);
  }
  return errorHandlingManagerInstance;
};

export const destroyErrorHandlingManager = (): void => {
  if (errorHandlingManagerInstance) {
    errorHandlingManagerInstance.destroy();
    errorHandlingManagerInstance = null;
  }
};
