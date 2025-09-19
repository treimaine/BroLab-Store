import { RollbackOperation } from "@shared/types/system-optimization";
import { ConvexHttpClient } from "convex/browser";
import { logger } from "./logger";

/**
 * RollbackManager handles operation rollback system for failed transactions,
 * data backup and restore mechanisms, and rollback testing and validation.
 */
export class RollbackManager {
  private rollbackOperations: Map<string, RollbackOperation> = new Map();
  private backupStorage: Map<string, any> = new Map();
  private convexClient: ConvexHttpClient;
  private maxRollbackHistory: number = 1000;
  private rollbackTimeoutMs: number = 24 * 60 * 60 * 1000; // 24 hours

  constructor(convexClient: ConvexHttpClient) {
    this.convexClient = convexClient;
    this.startCleanupTimer();
  }

  /**
   * Create a rollback point before performing an operation
   */
  async createRollbackPoint(
    operationType: string,
    resourceId: string,
    currentState: unknown,
    metadata?: Record<string, unknown>
  ): Promise<string> {
    try {
      const rollbackId = `rollback_${operationType}_${resourceId}_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;

      // Create backup of current state
      const backupId = await this.createBackup(resourceId, currentState);

      const rollbackOperation: RollbackOperation = {
        id: rollbackId,
        operationType,
        resourceId,
        previousState: currentState,
        currentState: null, // Will be set when operation completes
        timestamp: Date.now(),
        canRollback: true,
        dependencies: [],
        metadata: {
          ...metadata,
          backupId,
          createdBy: "RollbackManager",
          expiresAt: Date.now() + this.rollbackTimeoutMs,
        },
      };

      this.rollbackOperations.set(rollbackId, rollbackOperation);

      // Store in Convex for persistence
      await this.convexClient.mutation("rollback:store" as any, {
        rollbackId,
        operation: rollbackOperation,
      });

      logger.info("Rollback point created", {
        rollbackId,
        operationType,
        resourceId,
        backupId,
      });

      return rollbackId;
    } catch (error) {
      logger.error("Error creating rollback point", { error, operationType, resourceId });
      throw error;
    }
  }

  /**
   * Update rollback point with the new state after operation completion
   */
  async updateRollbackPoint(rollbackId: string, newState: unknown): Promise<void> {
    try {
      const rollbackOperation = this.rollbackOperations.get(rollbackId);
      if (!rollbackOperation) {
        throw new Error(`Rollback operation not found: ${rollbackId}`);
      }

      rollbackOperation.currentState = newState;
      this.rollbackOperations.set(rollbackId, rollbackOperation);

      // Update in Convex
      await this.convexClient.mutation("rollback:update" as any, {
        rollbackId,
        currentState: newState,
      });

      logger.info("Rollback point updated", { rollbackId });
    } catch (error) {
      logger.error("Error updating rollback point", { error, rollbackId });
      throw error;
    }
  }

  /**
   * Execute rollback to restore previous state
   */
  async executeRollback(rollbackId: string, reason?: string): Promise<void> {
    try {
      const rollbackOperation = this.rollbackOperations.get(rollbackId);
      if (!rollbackOperation) {
        throw new Error(`Rollback operation not found: ${rollbackId}`);
      }

      if (!rollbackOperation.canRollback) {
        throw new Error(`Rollback not allowed for operation: ${rollbackId}`);
      }

      if (this.isExpired(rollbackOperation)) {
        throw new Error(`Rollback operation expired: ${rollbackId}`);
      }

      logger.info("Executing rollback", {
        rollbackId,
        operationType: rollbackOperation.operationType,
        reason,
      });

      // Check dependencies before rollback
      await this.validateDependencies(rollbackOperation);

      // Restore the previous state
      await this.restoreFromBackup(rollbackOperation);

      // Mark as rolled back
      rollbackOperation.canRollback = false;
      rollbackOperation.metadata = {
        ...rollbackOperation.metadata,
        rolledBackAt: Date.now(),
        rollbackReason: reason,
      };

      this.rollbackOperations.set(rollbackId, rollbackOperation);

      // Update in Convex
      await this.convexClient.mutation("rollback:markRolledBack" as any, {
        rollbackId,
        reason,
      });

      logger.info("Rollback completed successfully", { rollbackId, reason });
    } catch (error) {
      logger.error("Error executing rollback", { error, rollbackId });
      throw error;
    }
  }

  /**
   * Create a backup of the current state
   */
  async createBackup(resourceId: string, state: unknown): Promise<string> {
    try {
      const backupId = `backup_${resourceId}_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;

      // Store backup locally
      this.backupStorage.set(backupId, {
        resourceId,
        state,
        timestamp: Date.now(),
        compressed: false,
      });

      // Store backup in Convex for persistence
      await this.convexClient.mutation("backup:store" as any, {
        backupId,
        resourceId,
        state,
        timestamp: Date.now(),
      });

      logger.info("Backup created", { backupId, resourceId });
      return backupId;
    } catch (error) {
      logger.error("Error creating backup", { error, resourceId });
      throw error;
    }
  }

  /**
   * Restore from backup
   */
  async restoreFromBackup(rollbackOperation: RollbackOperation): Promise<void> {
    try {
      const backupId = rollbackOperation.metadata?.backupId as string;
      if (!backupId) {
        throw new Error("No backup ID found in rollback operation");
      }

      // Get backup data
      let backup = this.backupStorage.get(backupId);
      if (!backup) {
        // Try to get from Convex
        backup = await this.convexClient.query("backup:get" as any, { backupId });
        if (!backup) {
          throw new Error(`Backup not found: ${backupId}`);
        }
      }

      // Restore the data using the appropriate method based on operation type
      await this.restoreData(
        rollbackOperation.operationType,
        rollbackOperation.resourceId,
        backup.state
      );

      logger.info("Data restored from backup", {
        backupId,
        resourceId: rollbackOperation.resourceId,
      });
    } catch (error) {
      logger.error("Error restoring from backup", {
        error,
        rollbackOperation: rollbackOperation.id,
      });
      throw error;
    }
  }

  /**
   * Validate rollback operation
   */
  async validateRollback(rollbackId: string): Promise<{ isValid: boolean; errors: string[] }> {
    try {
      const rollbackOperation = this.rollbackOperations.get(rollbackId);
      if (!rollbackOperation) {
        return { isValid: false, errors: [`Rollback operation not found: ${rollbackId}`] };
      }

      const errors: string[] = [];

      // Check if rollback is allowed
      if (!rollbackOperation.canRollback) {
        errors.push("Rollback is not allowed for this operation");
      }

      // Check if expired
      if (this.isExpired(rollbackOperation)) {
        errors.push("Rollback operation has expired");
      }

      // Check if backup exists
      const backupId = rollbackOperation.metadata?.backupId as string;
      if (backupId) {
        const backupExists =
          this.backupStorage.has(backupId) ||
          (await this.convexClient.query("backup:exists" as any, { backupId }));
        if (!backupExists) {
          errors.push("Backup data not found");
        }
      }

      // Validate dependencies
      try {
        await this.validateDependencies(rollbackOperation);
      } catch (error) {
        errors.push(`Dependency validation failed: ${error}`);
      }

      return { isValid: errors.length === 0, errors };
    } catch (error) {
      logger.error("Error validating rollback", { error, rollbackId });
      return { isValid: false, errors: [`Validation error: ${error}`] };
    }
  }

  /**
   * Get rollback history for a resource or operation type
   */
  async getRollbackHistory(filter?: {
    resourceId?: string;
    operationType?: string;
    limit?: number;
  }): Promise<RollbackOperation[]> {
    try {
      let operations = Array.from(this.rollbackOperations.values());

      // Apply filters
      if (filter?.resourceId) {
        operations = operations.filter(op => op.resourceId === filter.resourceId);
      }
      if (filter?.operationType) {
        operations = operations.filter(op => op.operationType === filter.operationType);
      }

      // Sort by timestamp (newest first)
      operations.sort((a, b) => b.timestamp - a.timestamp);

      // Apply limit
      if (filter?.limit) {
        operations = operations.slice(0, filter.limit);
      }

      return operations;
    } catch (error) {
      logger.error("Error getting rollback history", { error, filter });
      throw error;
    }
  }

  /**
   * Clean up expired rollback operations and backups
   */
  async cleanup(): Promise<{ removedRollbacks: number; removedBackups: number }> {
    try {
      let removedRollbacks = 0;
      let removedBackups = 0;

      // Clean up expired rollback operations
      for (const [rollbackId, operation] of this.rollbackOperations.entries()) {
        if (this.isExpired(operation)) {
          this.rollbackOperations.delete(rollbackId);
          removedRollbacks++;

          // Clean up associated backup
          const backupId = operation.metadata?.backupId as string;
          if (backupId && this.backupStorage.has(backupId)) {
            this.backupStorage.delete(backupId);
            removedBackups++;
          }
        }
      }

      // Clean up orphaned backups
      for (const [backupId, backup] of this.backupStorage.entries()) {
        const age = Date.now() - backup.timestamp;
        if (age > this.rollbackTimeoutMs) {
          this.backupStorage.delete(backupId);
          removedBackups++;
        }
      }

      // Clean up in Convex
      await this.convexClient.mutation("rollback:cleanup" as any, {
        expiredBefore: Date.now() - this.rollbackTimeoutMs,
      });

      logger.info("Rollback cleanup completed", { removedRollbacks, removedBackups });
      return { removedRollbacks, removedBackups };
    } catch (error) {
      logger.error("Error during rollback cleanup", { error });
      throw error;
    }
  }

  /**
   * Get rollback statistics
   */
  async getStatistics(): Promise<{
    totalRollbacks: number;
    activeRollbacks: number;
    expiredRollbacks: number;
    totalBackups: number;
    rollbacksByType: Record<string, number>;
  }> {
    try {
      const operations = Array.from(this.rollbackOperations.values());
      const activeRollbacks = operations.filter(op => op.canRollback && !this.isExpired(op)).length;
      const expiredRollbacks = operations.filter(op => this.isExpired(op)).length;

      const rollbacksByType: Record<string, number> = {};
      operations.forEach(op => {
        rollbacksByType[op.operationType] = (rollbacksByType[op.operationType] || 0) + 1;
      });

      return {
        totalRollbacks: operations.length,
        activeRollbacks,
        expiredRollbacks,
        totalBackups: this.backupStorage.size,
        rollbacksByType,
      };
    } catch (error) {
      logger.error("Error getting rollback statistics", { error });
      throw error;
    }
  }

  // Private helper methods

  private isExpired(operation: RollbackOperation): boolean {
    const expiresAt = operation.metadata?.expiresAt as number;
    return expiresAt ? Date.now() > expiresAt : false;
  }

  private async validateDependencies(operation: RollbackOperation): Promise<void> {
    if (!operation.dependencies || operation.dependencies.length === 0) {
      return;
    }

    for (const dependencyId of operation.dependencies) {
      const dependency = this.rollbackOperations.get(dependencyId);
      if (dependency && dependency.canRollback) {
        throw new Error(`Cannot rollback: dependency ${dependencyId} must be rolled back first`);
      }
    }
  }

  private async restoreData(
    operationType: string,
    resourceId: string,
    state: unknown
  ): Promise<void> {
    try {
      // Map operation types to appropriate restore methods
      switch (operationType) {
        case "update_user":
        case "update_preferences":
          await this.convexClient.mutation("users:restore" as any, { userId: resourceId, state });
          break;
        case "update_order":
        case "create_order":
          await this.convexClient.mutation("orders:restore" as any, { orderId: resourceId, state });
          break;
        case "update_product":
          await this.convexClient.mutation("products:restore" as any, {
            productId: resourceId,
            state,
          });
          break;
        case "update_favorites":
          await this.convexClient.mutation("restore:restoreFavorites" as any, {
            resourceId,
            state,
          });
          break;
        default:
          // Generic restore using data consistency functions
          await this.convexClient.mutation("data:restore" as any, {
            operationType,
            resourceId,
            state,
          });
      }

      logger.info("Data restored successfully", { operationType, resourceId });
    } catch (error) {
      logger.error("Error restoring data", { error, operationType, resourceId });
      throw error;
    }
  }

  private startCleanupTimer(): void {
    // Run cleanup every hour
    setInterval(
      () => {
        this.cleanup().catch(error => {
          logger.error("Scheduled cleanup failed", { error });
        });
      },
      60 * 60 * 1000
    );
  }
}

// Export singleton instance
let rollbackManagerInstance: RollbackManager | null = null;

export function getRollbackManager(convexClient?: ConvexHttpClient): RollbackManager {
  if (!rollbackManagerInstance) {
    if (!convexClient) {
      throw new Error("ConvexHttpClient required to initialize RollbackManager");
    }
    rollbackManagerInstance = new RollbackManager(convexClient);
  }
  return rollbackManagerInstance;
}
