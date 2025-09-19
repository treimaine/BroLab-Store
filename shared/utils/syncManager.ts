/**
 * Debounced Sync Manager
 * Handles user synchronization with debouncing to prevent excessive API calls
 */

export interface SyncOperation {
  id: string;
  type: "user" | "data" | "preferences" | "sync" | "cache_invalidation";
  payload: Record<string, unknown>;
  priority: "low" | "medium" | "high" | "critical";
  retryCount: number;
  maxRetries: number;
  timestamp: number;
  scheduledAt?: number;
  completedAt?: number;
  errorMessage?: string;
  userId?: string;
  sessionId?: string;
}

export interface SyncError {
  operationId: string;
  message: string;
  timestamp: number;
  retryCount: number;
  errorType?: string;
  context?: Record<string, unknown>;
}

export interface SyncStatus {
  isActive: boolean;
  pendingOperations: number;
  lastSyncAt?: number;
  nextSyncAt?: number;
  errors: SyncError[];
  queueSize: number;
  processingRate: number;
}

export class SyncManager {
  private pendingOperations = new Map<string, SyncOperation>();
  private debounceTimers = new Map<string, NodeJS.Timeout>();
  private isProcessing = false;
  private lastSyncTime = 0;
  private errors: SyncError[] = [];
  private operationHistory: SyncOperation[] = [];
  private maxHistorySize = 100;

  // Debounce delays by priority (in milliseconds)
  private readonly debounceDelays = {
    critical: 100,
    high: 500,
    medium: 1000,
    low: 2000,
  } as const;

  /**
   * Schedule a sync operation with debouncing
   */
  async scheduleSync(
    operation: Omit<SyncOperation, "id" | "timestamp" | "retryCount">
  ): Promise<string> {
    const fullOperation: SyncOperation = {
      ...operation,
      id: this.generateOperationId(),
      timestamp: Date.now(),
      retryCount: 0,
      maxRetries: operation.maxRetries || 3,
    };

    // Store the operation
    this.pendingOperations.set(fullOperation.id, fullOperation);

    // Clear existing timer for this operation type
    const timerKey = `${fullOperation.type}_${fullOperation.priority}`;
    if (this.debounceTimers.has(timerKey)) {
      clearTimeout(this.debounceTimers.get(timerKey)!);
    }

    // Set new debounced timer
    const delay = this.debounceDelays[fullOperation.priority];
    const timer = setTimeout(() => {
      this.executeSync(fullOperation.type, fullOperation.priority);
      this.debounceTimers.delete(timerKey);
    }, delay);

    this.debounceTimers.set(timerKey, timer);

    return fullOperation.id;
  }

  /**
   * Cancel a pending sync operation
   */
  async cancelPendingSync(operationId: string): Promise<boolean> {
    const operation = this.pendingOperations.get(operationId);
    if (operation) {
      this.pendingOperations.delete(operationId);

      // Clear timer if this was the last operation of its type/priority
      const timerKey = `${operation.type}_${operation.priority}`;
      const hasOtherOperations = Array.from(this.pendingOperations.values()).some(
        op => op.type === operation.type && op.priority === operation.priority
      );

      if (!hasOtherOperations && this.debounceTimers.has(timerKey)) {
        clearTimeout(this.debounceTimers.get(timerKey)!);
        this.debounceTimers.delete(timerKey);
      }
      return true;
    }
    return false;
  }

  /**
   * Get current sync status
   */
  async getSyncStatus(): Promise<SyncStatus> {
    const now = Date.now();
    const recentOperations = this.operationHistory.filter(op => now - op.timestamp < 60000); // Last minute
    const processingRate = recentOperations.length;

    return {
      isActive: this.isProcessing,
      pendingOperations: this.pendingOperations.size,
      lastSyncAt: this.lastSyncTime || undefined,
      nextSyncAt: this.getNextScheduledSync(),
      errors: [...this.errors],
      queueSize: this.pendingOperations.size,
      processingRate,
    };
  }

  /**
   * Execute sync operations for a specific type and priority
   */
  private async executeSync(
    type: SyncOperation["type"],
    priority: SyncOperation["priority"]
  ): Promise<void> {
    if (this.isProcessing) {
      // If already processing, reschedule
      setTimeout(() => this.executeSync(type, priority), 100);
      return;
    }

    this.isProcessing = true;

    try {
      // Get operations to process (filter by type and priority)
      const operationsToProcess = Array.from(this.pendingOperations.values())
        .filter(op => op.type === type && op.priority === priority)
        .sort((a, b) => {
          // Sort by priority (high first) then by timestamp (oldest first)
          const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 } as const;
          const aPriority = priorityOrder[a.priority] || 0;
          const bPriority = priorityOrder[b.priority] || 0;
          if (aPriority !== bPriority) {
            return bPriority - aPriority;
          }
          return a.timestamp - b.timestamp;
        });

      if (operationsToProcess.length === 0) {
        return;
      }

      // Process operations in batches to avoid overwhelming the API
      const batchSize = priority === "high" ? 1 : priority === "medium" ? 3 : 5;

      for (let i = 0; i < operationsToProcess.length; i += batchSize) {
        const batch = operationsToProcess.slice(i, i + batchSize);
        await this.processBatch(batch);
      }

      this.lastSyncTime = Date.now();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown sync error";
      const syncError: SyncError = {
        operationId: `batch_${type}_${priority}`,
        message: errorMessage,
        timestamp: Date.now(),
        retryCount: 0,
        errorType: error instanceof Error ? error.constructor.name : "UnknownError",
        context: { type, priority, operationCount: 0 },
      };

      this.errors.push(syncError);

      // Keep only last 10 errors
      if (this.errors.length > 10) {
        this.errors = this.errors.slice(-10);
      }

      console.error("Sync operation failed:", error);
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Process a batch of sync operations
   */
  private async processBatch(operations: SyncOperation[]): Promise<void> {
    const promises = operations.map(async operation => {
      try {
        await this.executeSingleOperation(operation);
        // Mark operation as completed and add to history
        operation.completedAt = Date.now();
        this.addToHistory(operation);
        // Remove successful operation
        this.pendingOperations.delete(operation.id);
      } catch (error) {
        // Handle retry logic
        operation.retryCount++;
        if (operation.retryCount < 3) {
          // Reschedule with exponential backoff
          setTimeout(
            () => {
              this.scheduleSync(operation);
            },
            Math.pow(2, operation.retryCount) * 1000
          );
        } else {
          // Max retries reached, remove operation and log error
          this.pendingOperations.delete(operation.id);
          const errorMessage = error instanceof Error ? error.message : "Unknown operation error";
          const syncError: SyncError = {
            operationId: operation.id,
            message: `Max retries reached: ${errorMessage}`,
            timestamp: Date.now(),
            retryCount: operation.retryCount,
            errorType: error instanceof Error ? error.constructor.name : "UnknownError",
            context: {
              type: operation.type,
              priority: operation.priority,
              payload: operation.payload,
            },
          };
          this.errors.push(syncError);
        }
      }
    });

    await Promise.allSettled(promises);
  }

  /**
   * Execute a single sync operation
   */
  private async executeSingleOperation(operation: SyncOperation): Promise<void> {
    // This is where the actual sync logic would be implemented
    // For now, we'll simulate the operation based on type

    switch (operation.type) {
      case "user":
        await this.syncUserData(operation.payload);
        break;
      case "data":
        await this.syncApplicationData(operation.payload);
        break;
      case "preferences":
        await this.syncUserPreferences(operation.payload);
        break;
      default:
        throw new Error(`Unknown sync operation type: ${operation.type}`);
    }
  }

  /**
   * Sync user data (placeholder implementation)
   */
  private async syncUserData(payload: Record<string, unknown>): Promise<void> {
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 100));

    // Here you would implement actual user sync logic
    // For example: await api.syncUser(payload);
    console.log("Syncing user data:", payload);
  }

  /**
   * Sync application data (placeholder implementation)
   */
  private async syncApplicationData(payload: Record<string, unknown>): Promise<void> {
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 150));

    // Here you would implement actual data sync logic
    // For example: await api.syncData(payload);
    console.log("Syncing application data:", payload);
  }

  /**
   * Sync user preferences (placeholder implementation)
   */
  private async syncUserPreferences(payload: Record<string, unknown>): Promise<void> {
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 50));

    // Here you would implement actual preferences sync logic
    // For example: await api.syncPreferences(payload);
    console.log("Syncing user preferences:", payload);
  }

  /**
   * Process all pending operations immediately
   */
  async processPendingOperations(): Promise<void> {
    if (this.isProcessing || this.pendingOperations.size === 0) {
      return;
    }

    // Group operations by type and priority
    const operationGroups = new Map<string, SyncOperation[]>();

    Array.from(this.pendingOperations.values()).forEach(operation => {
      const key = `${operation.type}_${operation.priority}`;
      if (!operationGroups.has(key)) {
        operationGroups.set(key, []);
      }
      operationGroups.get(key)!.push(operation);
    });

    // Process each group
    for (const [key, operations] of Array.from(operationGroups.entries())) {
      const [type, priority] = key.split("_") as [SyncOperation["type"], SyncOperation["priority"]];
      await this.executeSync(type, priority);
    }
  }

  /**
   * Clear completed operations from history
   */
  async clearCompletedOperations(): Promise<void> {
    const cutoffTime = Date.now() - 24 * 60 * 60 * 1000; // 24 hours ago
    this.operationHistory = this.operationHistory.filter(
      op => !op.completedAt || op.completedAt > cutoffTime
    );
  }

  /**
   * Pause sync operations
   */
  async pauseSync(): Promise<void> {
    // Clear all timers to prevent new operations from starting
    this.debounceTimers.forEach(timer => clearTimeout(timer));
    this.debounceTimers.clear();
  }

  /**
   * Resume sync operations
   */
  async resumeSync(): Promise<void> {
    // Reschedule all pending operations
    const operations = Array.from(this.pendingOperations.values());
    for (const operation of operations) {
      const timerKey = `${operation.type}_${operation.priority}`;
      if (!this.debounceTimers.has(timerKey)) {
        const delay = this.debounceDelays[operation.priority];
        const timer = setTimeout(() => {
          this.executeSync(operation.type, operation.priority);
          this.debounceTimers.delete(timerKey);
        }, delay);
        this.debounceTimers.set(timerKey, timer);
      }
    }
  }

  /**
   * Get operation history
   */
  async getOperationHistory(limit = 50): Promise<SyncOperation[]> {
    return this.operationHistory.sort((a, b) => b.timestamp - a.timestamp).slice(0, limit);
  }

  /**
   * Clear all pending operations and timers
   */
  clearAll(): void {
    // Clear all timers
    this.debounceTimers.forEach(timer => clearTimeout(timer));
    this.debounceTimers.clear();

    // Clear pending operations
    this.pendingOperations.clear();

    // Clear errors
    this.errors = [];

    // Clear history
    this.operationHistory = [];
  }

  /**
   * Get pending operations for debugging
   */
  getPendingOperations(): SyncOperation[] {
    return Array.from(this.pendingOperations.values());
  }

  /**
   * Generate a unique operation ID
   */
  private generateOperationId(): string {
    return `sync_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }

  /**
   * Get the next scheduled sync time
   */
  private getNextScheduledSync(): number | undefined {
    if (this.debounceTimers.size === 0) {
      return undefined;
    }

    // Find the shortest remaining timer
    let shortestDelay = Infinity;
    const now = Date.now();

    Array.from(this.debounceTimers.keys()).forEach(key => {
      const [, priority] = key.split("_") as [string, SyncOperation["priority"]];
      const delay = this.debounceDelays[priority];
      if (delay < shortestDelay) {
        shortestDelay = delay;
      }
    });

    return shortestDelay === Infinity ? undefined : now + shortestDelay;
  }

  /**
   * Add operation to history
   */
  private addToHistory(operation: SyncOperation): void {
    this.operationHistory.push({ ...operation });

    // Keep history size manageable
    if (this.operationHistory.length > this.maxHistorySize) {
      this.operationHistory = this.operationHistory.slice(-this.maxHistorySize);
    }
  }
}

// Export singleton instance
export const syncManager = new SyncManager();
