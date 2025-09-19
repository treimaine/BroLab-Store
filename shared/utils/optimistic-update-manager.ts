/**
 * Optimistic Update Manager
 * Handles optimistic updates for critical user actions (cart, favorites, downloads)
 */

import { OptimisticUpdate, OptimisticUpdateManager } from "../types/system-optimization";

export class OptimisticUpdateManagerImpl implements OptimisticUpdateManager {
  private pendingUpdates: Map<string, OptimisticUpdate> = new Map();
  private updateCallbacks: Map<string, (update: OptimisticUpdate) => void> = new Map();
  private rollbackCallbacks: Map<string, (update: OptimisticUpdate) => void> = new Map();

  /**
   * Apply an optimistic update
   */
  applyOptimisticUpdate<T>(
    update: Omit<OptimisticUpdate<T>, "id" | "timestamp" | "confirmed">
  ): string {
    const optimisticUpdate: OptimisticUpdate<T> = {
      operation: update.operation,
      optimisticData: update.optimisticData,
      rollbackData: update.rollbackData,
      id: this.generateUpdateId(),
      timestamp: Date.now(),
      confirmed: false,
    };

    // Store the update
    this.pendingUpdates.set(optimisticUpdate.id, optimisticUpdate);

    // Apply the optimistic change immediately
    this.notifyUpdateCallbacks(optimisticUpdate);

    // Set up automatic rollback after timeout (30 seconds)
    setTimeout(() => {
      if (this.pendingUpdates.has(optimisticUpdate.id) && !optimisticUpdate.confirmed) {
        console.warn(`Optimistic update ${optimisticUpdate.id} timed out, rolling back`);
        this.rollbackUpdate(optimisticUpdate.id);
      }
    }, 30000);

    return optimisticUpdate.id;
  }

  /**
   * Confirm an optimistic update (when server confirms the operation)
   */
  confirmUpdate(updateId: string): void {
    const update = this.pendingUpdates.get(updateId);
    if (!update) {
      console.warn(`Attempted to confirm non-existent update: ${updateId}`);
      return;
    }

    // Mark as confirmed
    update.confirmed = true;
    this.pendingUpdates.set(updateId, update);

    console.log(`Optimistic update ${updateId} confirmed`);
  }

  /**
   * Rollback an optimistic update (when server rejects the operation)
   */
  rollbackUpdate(updateId: string): void {
    const update = this.pendingUpdates.get(updateId);
    if (!update) {
      console.warn(`Attempted to rollback non-existent update: ${updateId}`);
      return;
    }

    // Apply rollback data
    this.notifyRollbackCallbacks(update);

    // Remove from pending updates
    this.pendingUpdates.delete(updateId);

    console.log(`Optimistic update ${updateId} rolled back`);
  }

  /**
   * Get all pending updates
   */
  getPendingUpdates(): OptimisticUpdate[] {
    return Array.from(this.pendingUpdates.values())
      .filter(update => !update.confirmed)
      .sort((a, b) => a.timestamp - b.timestamp);
  }

  /**
   * Clear confirmed updates from memory
   */
  clearConfirmedUpdates(): void {
    const confirmedIds: string[] = [];

    for (const [id, update] of Array.from(this.pendingUpdates.entries())) {
      if (update.confirmed) {
        confirmedIds.push(id);
      }
    }

    confirmedIds.forEach(id => this.pendingUpdates.delete(id));

    console.log(`Cleared ${confirmedIds.length} confirmed updates`);
  }

  /**
   * Register callback for when updates are applied
   */
  onUpdate(operation: string, callback: (update: OptimisticUpdate) => void): void {
    this.updateCallbacks.set(operation, callback);
  }

  /**
   * Register callback for when updates are rolled back
   */
  onRollback(operation: string, callback: (update: OptimisticUpdate) => void): void {
    this.rollbackCallbacks.set(operation, callback);
  }

  /**
   * Create optimistic update for cart operations
   */
  async addToCartOptimistic(productId: string, quantity: number = 1): Promise<string> {
    return this.applyOptimisticUpdate({
      operation: "cart_add",
      optimisticData: { productId, quantity, action: "add" } as Record<string, unknown>,
      rollbackData: { productId, quantity, action: "remove" } as Record<string, unknown>,
    });
  }

  /**
   * Create optimistic update for removing from cart
   */
  async removeFromCartOptimistic(productId: string, quantity: number = 1): Promise<string> {
    return this.applyOptimisticUpdate({
      operation: "cart_remove",
      optimisticData: { productId, quantity, action: "remove" } as Record<string, unknown>,
      rollbackData: { productId, quantity, action: "add" } as Record<string, unknown>,
    });
  }

  /**
   * Create optimistic update for favorites
   */
  async toggleFavoriteOptimistic(productId: string, isFavorite: boolean): Promise<string> {
    return this.applyOptimisticUpdate({
      operation: "favorite_toggle",
      optimisticData: { productId, isFavorite } as Record<string, unknown>,
      rollbackData: { productId, isFavorite: !isFavorite } as Record<string, unknown>,
    });
  }

  /**
   * Create optimistic update for downloads
   */
  async startDownloadOptimistic(productId: string, downloadType: string): Promise<string> {
    return this.applyOptimisticUpdate({
      operation: "download_start",
      optimisticData: {
        productId,
        downloadType,
        status: "downloading",
        progress: 0,
        startedAt: Date.now(),
      } as Record<string, unknown>,
      rollbackData: {
        productId,
        downloadType,
        status: "failed",
        error: "Download failed",
      } as Record<string, unknown>,
    });
  }

  /**
   * Update download progress optimistically
   */
  async updateDownloadProgressOptimistic(updateId: string, progress: number): Promise<void> {
    const update = this.pendingUpdates.get(updateId);
    if (!update || update.operation !== "download_start") {
      return;
    }

    // Update the optimistic data with new progress
    const updatedData = {
      ...(update.optimisticData as Record<string, unknown>),
      progress,
      lastUpdated: Date.now(),
    };

    const progressUpdate: OptimisticUpdate = {
      id: update.id,
      operation: update.operation,
      optimisticData: updatedData,
      rollbackData: update.rollbackData,
      timestamp: update.timestamp,
      confirmed: update.confirmed,
    };

    this.pendingUpdates.set(updateId, progressUpdate);
    this.notifyUpdateCallbacks(progressUpdate);
  }

  /**
   * Complete download optimistically
   */
  async completeDownloadOptimistic(updateId: string, downloadUrl: string): Promise<void> {
    const update = this.pendingUpdates.get(updateId);
    if (!update || update.operation !== "download_start") {
      return;
    }

    // Update the optimistic data with completion info
    const completedData = {
      ...(update.optimisticData as Record<string, unknown>),
      status: "completed",
      progress: 100,
      downloadUrl,
      completedAt: Date.now(),
    };

    const completedUpdate: OptimisticUpdate = {
      id: update.id,
      operation: update.operation,
      optimisticData: completedData,
      rollbackData: update.rollbackData,
      timestamp: update.timestamp,
      confirmed: true,
    };

    this.pendingUpdates.set(updateId, completedUpdate);
    this.notifyUpdateCallbacks(completedUpdate);
  }

  /**
   * Get pending updates for a specific operation type
   */
  getPendingUpdatesForOperation(operation: string): OptimisticUpdate[] {
    return Array.from(this.pendingUpdates.values())
      .filter(update => update.operation === operation && !update.confirmed)
      .sort((a, b) => a.timestamp - b.timestamp);
  }

  /**
   * Get update statistics
   */
  getUpdateStats(): {
    total: number;
    pending: number;
    confirmed: number;
    byOperation: Record<string, number>;
  } {
    const updates = Array.from(this.pendingUpdates.values());
    const byOperation: Record<string, number> = {};

    updates.forEach(update => {
      byOperation[update.operation] = (byOperation[update.operation] || 0) + 1;
    });

    return {
      total: updates.length,
      pending: updates.filter(u => !u.confirmed).length,
      confirmed: updates.filter(u => u.confirmed).length,
      byOperation,
    };
  }

  /**
   * Notify update callbacks
   */
  private notifyUpdateCallbacks(update: OptimisticUpdate): void {
    const callback = this.updateCallbacks.get(update.operation);
    if (callback) {
      try {
        callback(update);
      } catch (error) {
        console.error(`Error in update callback for ${update.operation}:`, error);
      }
    }
  }

  /**
   * Notify rollback callbacks
   */
  private notifyRollbackCallbacks(update: OptimisticUpdate): void {
    const callback = this.rollbackCallbacks.get(update.operation);
    if (callback) {
      try {
        callback(update);
      } catch (error) {
        console.error(`Error in rollback callback for ${update.operation}:`, error);
      }
    }
  }

  /**
   * Generate unique update ID
   */
  private generateUpdateId(): string {
    return `opt_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }

  /**
   * Cleanup old updates (call periodically)
   */
  cleanup(): void {
    const cutoffTime = Date.now() - 5 * 60 * 1000; // 5 minutes ago
    const oldUpdateIds: string[] = [];

    for (const [id, update] of Array.from(this.pendingUpdates.entries())) {
      if (update.confirmed && update.timestamp < cutoffTime) {
        oldUpdateIds.push(id);
      }
    }

    oldUpdateIds.forEach(id => this.pendingUpdates.delete(id));

    if (oldUpdateIds.length > 0) {
      console.log(`Cleaned up ${oldUpdateIds.length} old optimistic updates`);
    }
  }
}
