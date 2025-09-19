/**
 * Offline Manager
 * Handles offline functionality and queue management for critical operations
 */

import { OfflineManager, OfflineOperation } from "../types/system-optimization";
import { SyncManager } from "./syncManager";

export class OfflineManagerImpl implements OfflineManager {
  private offlineQueue: Map<string, OfflineOperation> = new Map();
  private onlineCallbacks: (() => void)[] = [];
  private offlineCallbacks: (() => void)[] = [];
  private syncManager: SyncManager;
  private isInitialized = false;

  constructor(syncManager: SyncManager) {
    this.syncManager = syncManager;
    this.initialize();
  }

  private initialize(): void {
    if (this.isInitialized) return;

    // Listen for online/offline events
    window.addEventListener("online", this.handleOnline.bind(this));
    window.addEventListener("offline", this.handleOffline.bind(this));

    // Load persisted offline operations from localStorage
    this.loadPersistedOperations();

    this.isInitialized = true;
  }

  /**
   * Check if the browser is currently online
   */
  isOnline(): boolean {
    return navigator.onLine;
  }

  /**
   * Queue an operation for offline processing
   */
  async queueOperation(
    operation: Omit<OfflineOperation, "id" | "timestamp" | "retryCount" | "status">
  ): Promise<string> {
    const offlineOperation: OfflineOperation = {
      ...operation,
      id: this.generateOperationId(),
      timestamp: Date.now(),
      retryCount: 0,
      status: "pending",
    };

    // Add to offline queue
    this.offlineQueue.set(offlineOperation.id, offlineOperation);

    // Persist to localStorage
    await this.persistOperations();

    // If online, try to sync immediately
    if (this.isOnline()) {
      this.syncPendingOperations();
    }

    return offlineOperation.id;
  }

  /**
   * Sync all pending offline operations
   */
  async syncPendingOperations(): Promise<void> {
    if (!this.isOnline() || this.offlineQueue.size === 0) {
      return;
    }

    const operations = Array.from(this.offlineQueue.values())
      .filter(op => op.status === "pending")
      .sort((a, b) => a.timestamp - b.timestamp); // Process oldest first

    for (const operation of operations) {
      try {
        // Mark as syncing
        operation.status = "syncing";
        this.offlineQueue.set(operation.id, operation);

        // Convert offline operation to sync operation
        await this.syncManager.scheduleSync({
          type: operation.type as any,
          payload: operation.data as Record<string, unknown>,
          priority: "high", // Offline operations get high priority
          maxRetries: 3,
          userId: (operation.data as any)?.userId,
          sessionId: (operation.data as any)?.sessionId,
        });

        // Mark as completed
        operation.status = "completed";
        this.offlineQueue.set(operation.id, operation);
      } catch (error) {
        // Handle sync failure
        operation.retryCount++;
        operation.status = operation.retryCount >= 3 ? "failed" : "pending";
        this.offlineQueue.set(operation.id, operation);

        console.error(`Failed to sync offline operation ${operation.id}:`, error);
      }
    }

    // Persist updated operations
    await this.persistOperations();
  }

  /**
   * Get all pending offline operations
   */
  async getPendingOperations(): Promise<OfflineOperation[]> {
    return Array.from(this.offlineQueue.values()).filter(
      op => op.status === "pending" || op.status === "syncing"
    );
  }

  /**
   * Clear completed operations from the queue
   */
  async clearCompletedOperations(): Promise<void> {
    const completedIds: string[] = [];

    for (const [id, operation] of Array.from(this.offlineQueue.entries())) {
      if (operation.status === "completed" || operation.status === "failed") {
        // Keep failed operations for 24 hours for debugging
        const isOldFailure =
          operation.status === "failed" && Date.now() - operation.timestamp > 24 * 60 * 60 * 1000;

        if (operation.status === "completed" || isOldFailure) {
          completedIds.push(id);
        }
      }
    }

    completedIds.forEach(id => this.offlineQueue.delete(id));
    await this.persistOperations();
  }

  /**
   * Register callback for when connection comes online
   */
  onOnline(callback: () => void): void {
    this.onlineCallbacks.push(callback);
  }

  /**
   * Register callback for when connection goes offline
   */
  onOffline(callback: () => void): void {
    this.offlineCallbacks.push(callback);
  }

  /**
   * Handle online event
   */
  private handleOnline(): void {
    console.log("Connection restored - syncing offline operations");

    // Sync pending operations
    this.syncPendingOperations();

    // Notify callbacks
    this.onlineCallbacks.forEach(callback => {
      try {
        callback();
      } catch (error) {
        console.error("Error in online callback:", error);
      }
    });
  }

  /**
   * Handle offline event
   */
  private handleOffline(): void {
    console.log("Connection lost - entering offline mode");

    // Notify callbacks
    this.offlineCallbacks.forEach(callback => {
      try {
        callback();
      } catch (error) {
        console.error("Error in offline callback:", error);
      }
    });
  }

  /**
   * Load persisted operations from localStorage
   */
  private loadPersistedOperations(): void {
    try {
      const stored = localStorage.getItem("offline_operations");
      if (stored) {
        const operations: OfflineOperation[] = JSON.parse(stored);
        operations.forEach(op => {
          this.offlineQueue.set(op.id, op);
        });
      }
    } catch (error) {
      console.error("Failed to load persisted offline operations:", error);
    }
  }

  /**
   * Persist operations to localStorage
   */
  private async persistOperations(): Promise<void> {
    try {
      const operations = Array.from(this.offlineQueue.values());
      localStorage.setItem("offline_operations", JSON.stringify(operations));
    } catch (error) {
      console.error("Failed to persist offline operations:", error);
    }
  }

  /**
   * Generate unique operation ID
   */
  private generateOperationId(): string {
    return `offline_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }

  /**
   * Get operation statistics
   */
  async getOperationStats(): Promise<{
    total: number;
    pending: number;
    syncing: number;
    completed: number;
    failed: number;
  }> {
    const operations = Array.from(this.offlineQueue.values());

    return {
      total: operations.length,
      pending: operations.filter(op => op.status === "pending").length,
      syncing: operations.filter(op => op.status === "syncing").length,
      completed: operations.filter(op => op.status === "completed").length,
      failed: operations.filter(op => op.status === "failed").length,
    };
  }

  /**
   * Cleanup and destroy the manager
   */
  destroy(): void {
    if (!this.isInitialized) return;

    window.removeEventListener("online", this.handleOnline.bind(this));
    window.removeEventListener("offline", this.handleOffline.bind(this));

    this.onlineCallbacks.length = 0;
    this.offlineCallbacks.length = 0;
    this.isInitialized = false;
  }
}
