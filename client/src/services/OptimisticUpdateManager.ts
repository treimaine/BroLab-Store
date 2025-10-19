/**
 * Optimistic Update Manager
 *
 * Manages optimistic updates for immediate UI feedback with rollback capabilities.
 * Handles queuing, conflict resolution, and user feedback for failed operations.
 */

import BrowserEventEmitter from "@/utils/BrowserEventEmitter";
import type { DashboardData, DashboardEvent } from "@shared/types";
import type {
  ConflictResolution,
  DataConflict,
  OptimisticUpdate,
  SyncError,
} from "@shared/types/sync";

export interface OptimisticUpdateConfig {
  /** Maximum number of pending updates */
  maxPendingUpdates: number;
  /** Timeout for server confirmation (ms) */
  confirmationTimeout: number;
  /** Whether to auto-retry failed updates */
  autoRetry: boolean;
  /** Maximum retry attempts */
  maxRetries: number;
  /** Retry delay base (ms) */
  retryDelayBase: number;
}

export interface UpdateQueue {
  /** Pending updates waiting for confirmation */
  pending: OptimisticUpdate[];
  /** Updates being processed */
  processing: OptimisticUpdate[];
  /** Failed updates */
  failed: OptimisticUpdate[];
  /** Confirmed updates */
  confirmed: OptimisticUpdate[];
}

export interface UserFeedback {
  /** Feedback type */
  type: "success" | "error" | "warning" | "info";
  /** Feedback message */
  message: string;
  /** Update that triggered feedback */
  updateId: string;
  /** Action buttons for user */
  actions?: FeedbackAction[];
  /** Auto-dismiss timeout (ms) */
  timeout?: number;
}

export interface FeedbackAction {
  /** Action label */
  label: string;
  /** Action type */
  type: "retry" | "dismiss" | "undo" | "reload";
  /** Action handler */
  handler: () => void;
}

/**
 * Optimistic Update Manager for immediate UI feedback with rollback
 */
export class OptimisticUpdateManager extends BrowserEventEmitter {
  private config: OptimisticUpdateConfig;
  private updateQueue: UpdateQueue;
  private timeouts = new Map<string, NodeJS.Timeout>();
  private retryCounters = new Map<string, number>();
  private isDestroyed = false;

  constructor(config: Partial<OptimisticUpdateConfig> = {}) {
    super();

    this.config = {
      maxPendingUpdates: config.maxPendingUpdates || 50,
      confirmationTimeout: config.confirmationTimeout || 10000, // 10 seconds
      autoRetry: config.autoRetry ?? true,
      maxRetries: config.maxRetries || 3,
      retryDelayBase: config.retryDelayBase || 1000,
    };

    this.updateQueue = {
      pending: [],
      processing: [],
      failed: [],
      confirmed: [],
    };

    this.setupCleanupInterval();
  }

  /**
   * Apply an optimistic update immediately to the UI
   */
  public applyOptimisticUpdate(
    section: keyof DashboardData,
    operation: "add" | "update" | "delete",
    data: any,
    rollbackData?: any,
    userId?: string
  ): OptimisticUpdate {
    if (this.isDestroyed) {
      throw new Error("OptimisticUpdateManager has been destroyed");
    }

    // Check queue limits
    if (this.updateQueue.pending.length >= this.config.maxPendingUpdates) {
      throw new Error("Too many pending updates. Please wait for some to complete.");
    }

    const update: OptimisticUpdate = {
      id: this.generateUpdateId(),
      type: operation,
      section: section as string,
      data,
      timestamp: Date.now(),
      confirmed: false,
      rollbackData,
      userId,
      correlationId: this.generateCorrelationId(),
    };

    // Add to pending queue
    this.updateQueue.pending.push(update);

    // Set confirmation timeout
    this.setConfirmationTimeout(update);

    // Emit event for immediate UI update
    this.emit("optimistic_applied", update);

    // Emit dashboard event
    this.emitDashboardEvent("optimistic.applied", { update });

    this.log("Optimistic update applied", {
      id: update.id,
      section: update.section,
      type: update.type,
    });

    return update;
  }

  /**
   * Confirm an optimistic update (called when server operation succeeds)
   */
  public confirmOptimisticUpdate(updateId: string, serverData?: any): void {
    const update = this.findUpdate(updateId);
    if (!update) {
      this.log("Update not found for confirmation", { updateId });
      return;
    }

    // Clear timeout
    this.clearTimeout(updateId);

    // Move to confirmed
    this.moveUpdate(update, "confirmed");
    update.confirmed = true;

    // Update with server data if provided
    if (serverData) {
      update.data = serverData;
    }

    this.emit("optimistic_confirmed", update);
    this.log("Optimistic update confirmed", { id: update.id });

    // Show success feedback
    this.showUserFeedback({
      type: "success",
      message: this.getSuccessMessage(update),
      updateId: update.id,
      timeout: 3000,
    });
  }

  /**
   * Rollback an optimistic update (called when server operation fails)
   */
  public rollbackOptimisticUpdate(updateId: string, reason: string, error?: SyncError): void {
    const update = this.findUpdate(updateId);
    if (!update) {
      this.log("Update not found for rollback", { updateId });
      return;
    }

    // Clear timeout
    this.clearTimeout(updateId);

    // Move to failed
    this.moveUpdate(update, "failed");

    // Emit rollback event
    this.emit("optimistic_rollback", { update, reason, error });

    // Emit dashboard event
    this.emitDashboardEvent("optimistic.rollback", { updateId, reason });

    this.log("Optimistic update rolled back", {
      id: update.id,
      reason,
      error: error?.message,
    });

    // Show error feedback with retry option
    this.showUserFeedback({
      type: "error",
      message: this.getErrorMessage(update, reason),
      updateId: update.id,
      actions: this.getErrorActions(update, error),
      timeout: 10000, // Longer timeout for errors
    });

    // Auto-retry if enabled and retryable
    if (this.config.autoRetry && this.isRetryable(error)) {
      this.scheduleRetry(update);
    }
  }

  /**
   * Retry a failed optimistic update
   */
  public retryOptimisticUpdate(updateId: string): OptimisticUpdate | null {
    const update = this.updateQueue.failed.find(u => u.id === updateId);
    if (!update) {
      this.log("Failed update not found for retry", { updateId });
      return null;
    }

    // Check retry limit
    const retryCount = this.retryCounters.get(updateId) || 0;
    if (retryCount >= this.config.maxRetries) {
      this.log("Max retries exceeded", { updateId, retryCount });
      this.showUserFeedback({
        type: "error",
        message: "Maximum retry attempts exceeded. Please try again later.",
        updateId,
        actions: [
          {
            label: "Reload Page",
            type: "reload",
            handler: () => window.location.reload(),
          },
        ],
      });
      return null;
    }

    // Create new update with incremented retry count
    const retryUpdate: OptimisticUpdate = {
      ...update,
      id: this.generateUpdateId(),
      timestamp: Date.now(),
      confirmed: false,
    };

    // Increment retry counter
    this.retryCounters.set(updateId, retryCount + 1);

    // Remove from failed, add to pending
    this.updateQueue.failed = this.updateQueue.failed.filter(u => u.id !== updateId);
    this.updateQueue.pending.push(retryUpdate);

    // Set new timeout
    this.setConfirmationTimeout(retryUpdate);

    // Emit retry event
    this.emit("optimistic_retry", { original: update, retry: retryUpdate });

    this.log("Optimistic update retried", {
      originalId: updateId,
      retryId: retryUpdate.id,
      retryCount: retryCount + 1,
    });

    return retryUpdate;
  }

  /**
   * Get current update queue status
   */
  public getQueueStatus(): UpdateQueue & { totalPending: number; canAddMore: boolean } {
    return {
      ...this.updateQueue,
      totalPending: this.updateQueue.pending.length + this.updateQueue.processing.length,
      canAddMore: this.updateQueue.pending.length < this.config.maxPendingUpdates,
    };
  }

  /**
   * Clear all updates (useful for logout or reset)
   */
  public clearAllUpdates(): void {
    // Clear all timeouts
    this.timeouts.forEach(timeout => clearTimeout(timeout));
    this.timeouts.clear();
    this.retryCounters.clear();

    // Clear queues
    this.updateQueue = {
      pending: [],
      processing: [],
      failed: [],
      confirmed: [],
    };

    this.emit("queue_cleared");
    this.log("All updates cleared");
  }

  /**
   * Detect conflicts between concurrent updates
   */
  public detectConflicts(): DataConflict[] {
    const conflicts: DataConflict[] = [];
    const sectionGroups = new Map<string, OptimisticUpdate[]>();

    // Group updates by section
    [...this.updateQueue.pending, ...this.updateQueue.processing].forEach(update => {
      if (!sectionGroups.has(update.section)) {
        sectionGroups.set(update.section, []);
      }
      sectionGroups.get(update.section)!.push(update);
    });

    // Check for conflicts within each section
    sectionGroups.forEach((updates, section) => {
      if (updates.length > 1) {
        // Check for concurrent updates to the same data
        const concurrentUpdates = updates.filter(
          update => Date.now() - update.timestamp < 5000 // Within 5 seconds
        );

        if (concurrentUpdates.length > 1) {
          conflicts.push({
            id: this.generateConflictId(),
            updates: concurrentUpdates,
            type: "concurrent_update",
            description: `Multiple concurrent updates detected in ${section}`,
            resolutionStrategies: [
              {
                type: "server_wins",
                description: "Use server data as authoritative",
                automatic: true,
                confidence: 0.9,
                priority: 1,
              },
              {
                type: "merge",
                description: "Attempt to merge changes",
                automatic: false,
                confidence: 0.6,
                priority: 2,
              },
            ],
            detectedAt: Date.now(),
            resourceType: "dashboard_data",
            resourceId: section,
            severity: "medium",
            autoResolvable: true,
          });
        }
      }
    });

    return conflicts;
  }

  /**
   * Resolve a data conflict
   */
  public resolveConflict(
    conflictId: string,
    strategy: "server_wins" | "client_wins" | "merge" | "manual"
  ): ConflictResolution | null {
    // This would implement actual conflict resolution logic
    // For now, return a basic resolution
    return {
      strategy: {
        type: strategy,
        description: `Resolved using ${strategy} strategy`,
        automatic: strategy === "server_wins",
        confidence: strategy === "server_wins" ? 0.9 : 0.7,
        priority: strategy === "server_wins" ? 1 : 2,
      },
      resolvedData: null,
      success: true,
      resolvedAt: Date.now(),
    };
  }

  /**
   * Destroy the manager and clean up resources
   */
  public destroy(): void {
    this.isDestroyed = true;
    this.clearAllUpdates();
    this.removeAllListeners();
    this.log("OptimisticUpdateManager destroyed");
  }

  // Private methods

  private findUpdate(updateId: string): OptimisticUpdate | null {
    const allUpdates = [
      ...this.updateQueue.pending,
      ...this.updateQueue.processing,
      ...this.updateQueue.failed,
      ...this.updateQueue.confirmed,
    ];
    return allUpdates.find(update => update.id === updateId) || null;
  }

  private moveUpdate(update: OptimisticUpdate, toQueue: keyof UpdateQueue): void {
    // Remove from all queues
    Object.keys(this.updateQueue).forEach(queueName => {
      const queue = this.updateQueue[queueName as keyof UpdateQueue];
      const index = queue.findIndex(u => u.id === update.id);
      if (index !== -1) {
        queue.splice(index, 1);
      }
    });

    // Add to target queue
    this.updateQueue[toQueue].push(update);
  }

  private setConfirmationTimeout(update: OptimisticUpdate): void {
    const timeout = setTimeout(() => {
      this.rollbackOptimisticUpdate(update.id, "Server confirmation timeout");
    }, this.config.confirmationTimeout);

    this.timeouts.set(update.id, timeout);
  }

  private clearTimeout(updateId: string): void {
    const timeout = this.timeouts.get(updateId);
    if (timeout) {
      clearTimeout(timeout);
      this.timeouts.delete(updateId);
    }
  }

  private scheduleRetry(update: OptimisticUpdate): void {
    const retryCount = this.retryCounters.get(update.id) || 0;
    const delay = this.config.retryDelayBase * Math.pow(2, retryCount); // Exponential backoff

    setTimeout(() => {
      this.retryOptimisticUpdate(update.id);
    }, delay);

    this.log("Retry scheduled", {
      updateId: update.id,
      retryCount: retryCount + 1,
      delay,
    });
  }

  private isRetryable(error?: SyncError): boolean {
    if (!error) return true;
    return error.retryable && error.retryCount < error.maxRetries;
  }

  private getSuccessMessage(update: OptimisticUpdate): string {
    const actionMap = {
      add: "added",
      update: "updated",
      delete: "removed",
    };

    const sectionMap = {
      favorites: "favorite",
      downloads: "download",
      orders: "order",
      reservations: "reservation",
    };

    const action = actionMap[update.type] || "updated";
    const item = sectionMap[update.section as keyof typeof sectionMap] || "item";

    return `Successfully ${action} ${item}`;
  }

  private getErrorMessage(update: OptimisticUpdate, reason: string): string {
    const actionMap = {
      add: "add",
      update: "update",
      delete: "remove",
    };

    const sectionMap = {
      favorites: "favorite",
      downloads: "download",
      orders: "order",
      reservations: "reservation",
    };

    const action = actionMap[update.type] || "update";
    const item = sectionMap[update.section as keyof typeof sectionMap] || "item";

    return `Failed to ${action} ${item}: ${reason}`;
  }

  private getErrorActions(update: OptimisticUpdate, error?: SyncError): FeedbackAction[] {
    const actions: FeedbackAction[] = [
      {
        label: "Dismiss",
        type: "dismiss",
        handler: () => this.emit("feedback_dismissed", update.id),
      },
    ];

    if (this.isRetryable(error)) {
      actions.unshift({
        label: "Retry",
        type: "retry",
        handler: () => this.retryOptimisticUpdate(update.id),
      });
    }

    return actions;
  }

  private showUserFeedback(feedback: UserFeedback): void {
    this.emit("user_feedback", feedback);
  }

  private emitDashboardEvent(type: string, payload: unknown): void {
    const event: DashboardEvent = {
      type,
      payload,
      timestamp: Date.now(),
      source: "system",
      id: this.generateEventId(),
    };

    this.emit("dashboard_event", event);
  }

  private setupCleanupInterval(): void {
    // Clean up old confirmed updates every 5 minutes
    setInterval(
      () => {
        if (this.isDestroyed) return;

        const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
        this.updateQueue.confirmed = this.updateQueue.confirmed.filter(
          update => update.timestamp > fiveMinutesAgo
        );

        // Clean up old retry counters
        this.retryCounters.forEach((count, updateId) => {
          if (!this.findUpdate(updateId)) {
            this.retryCounters.delete(updateId);
          }
        });
      },
      5 * 60 * 1000
    );
  }

  private generateUpdateId(): string {
    return `opt_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  private generateCorrelationId(): string {
    return `corr_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  private generateConflictId(): string {
    return `conflict_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  private generateEventId(): string {
    return `evt_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  private log(message: string, data?: unknown): void {
    console.log(`[OptimisticUpdateManager] ${message}`, data || "");
  }
}

// Singleton instance
let optimisticUpdateManagerInstance: OptimisticUpdateManager | null = null;

export const getOptimisticUpdateManager = (
  config?: Partial<OptimisticUpdateConfig>
): OptimisticUpdateManager => {
  if (!optimisticUpdateManagerInstance) {
    optimisticUpdateManagerInstance = new OptimisticUpdateManager(config);
  }
  return optimisticUpdateManagerInstance;
};

export const destroyOptimisticUpdateManager = (): void => {
  if (optimisticUpdateManagerInstance) {
    optimisticUpdateManagerInstance.destroy();
    optimisticUpdateManagerInstance = null;
  }
};
