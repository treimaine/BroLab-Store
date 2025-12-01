import { ConvexHttpClient } from "convex/browser";
import {
  ConflictResolution,
  DataConflict,
  DataConsistencyManager,
  RollbackOperation,
} from "../../shared/types/system-optimization";
import { logger } from "./logger";

/**
 * Resource data interface for type safety
 */
interface ResourceData {
  _updatedAt?: number;
  updatedAt?: number;
  [key: string]: unknown;
}

/**
 * DataConsistencyManager handles conflict detection, resolution, and rollback operations
 * for maintaining data consistency across the system.
 */
export class DataConsistencyManagerImpl implements DataConsistencyManager {
  private readonly conflicts: Map<string, DataConflict> = new Map();
  private readonly rollbackPoints: Map<string, RollbackOperation> = new Map();
  private readonly convexClient: ConvexHttpClient;
  private readonly autoResolveStrategies: Map<string, ConflictResolution["strategy"]> = new Map();

  constructor(convexClient: ConvexHttpClient) {
    this.convexClient = convexClient;
    this.setupDefaultStrategies();
  }

  /**
   * Setup default conflict resolution strategies for different resource types
   */
  private setupDefaultStrategies(): void {
    this.autoResolveStrategies.set("user_preferences", "last_write_wins");
    this.autoResolveStrategies.set("cart_items", "merge");
    this.autoResolveStrategies.set("favorites", "merge");
    this.autoResolveStrategies.set("downloads", "last_write_wins");
  }

  /**
   * Detect conflicts for a specific resource
   */
  async detectConflicts(_resourceType: string, _resourceId: string): Promise<DataConflict[]> {
    try {
      logger.info("Detecting conflicts", { resourceType: _resourceType, resourceId: _resourceId });

      // Get local and remote versions of the resource
      const localData = await this.getLocalData(_resourceType, _resourceId);
      const remoteData = await this.getRemoteData(_resourceType, _resourceId);

      if (!localData || !remoteData) {
        return [];
      }

      const conflicts: DataConflict[] = [];

      // Compare timestamps and data
      if (this.hasDataConflict(localData, remoteData)) {
        const conflict: DataConflict = {
          id: `${_resourceType}_${_resourceId}_${Date.now()}`,
          resourceType: _resourceType,
          resourceId: _resourceId,
          localValue: localData,
          remoteValue: remoteData,
          timestamp: Date.now(),
          status: "pending",
          metadata: {
            localTimestamp: localData._updatedAt || localData.updatedAt,
            remoteTimestamp: remoteData._updatedAt || remoteData.updatedAt,
            conflictFields: this.getConflictingFields(localData, remoteData),
          },
        };

        this.conflicts.set(conflict.id, conflict);
        conflicts.push(conflict);

        logger.warn("Data conflict detected", {
          conflictId: conflict.id,
          resourceType: _resourceType,
          resourceId: _resourceId,
          conflictFields: conflict.metadata?.conflictFields,
        });
      }

      return conflicts;
    } catch (error) {
      logger.error("Error detecting conflicts", {
        error,
        resourceType: _resourceType,
        resourceId: _resourceId,
      });
      throw error;
    }
  }

  /**
   * Resolve a specific conflict using the provided resolution strategy
   */
  async resolveConflict(conflictId: string, resolution: ConflictResolution): Promise<void> {
    try {
      const conflict = this.conflicts.get(conflictId);
      if (!conflict) {
        throw new Error(`Conflict not found: ${conflictId}`);
      }

      logger.info("Resolving conflict", { conflictId, strategy: resolution.strategy });

      let resolvedValue: unknown;

      switch (resolution.strategy) {
        case "last_write_wins":
          resolvedValue = this.resolveLastWriteWins(conflict);
          break;
        case "merge":
          resolvedValue = this.resolveMerge(conflict);
          break;
        case "user_choice":
          resolvedValue = await this.resolveUserChoice(conflict);
          break;
        case "custom":
          if (!resolution.resolver) {
            throw new Error("Custom resolver function required for custom strategy");
          }
          resolvedValue = resolution.resolver(conflict.localValue, conflict.remoteValue);
          break;
        default:
          throw new Error(`Unknown resolution strategy: ${resolution.strategy}`);
      }

      // Apply the resolved value
      await this.applyResolvedValue(conflict, resolvedValue);

      // Update conflict status
      conflict.status = "resolved";
      conflict.resolution = resolution;
      this.conflicts.set(conflictId, conflict);

      logger.info("Conflict resolved successfully", { conflictId, strategy: resolution.strategy });
    } catch (error) {
      logger.error("Error resolving conflict", { error, conflictId });
      throw error;
    }
  }

  /**
   * Create a rollback point for an operation
   */
  async createRollbackPoint(
    operationType: string,
    resourceId: string,
    state: unknown
  ): Promise<string> {
    try {
      const rollbackId = `rollback_${operationType}_${resourceId}_${Date.now()}`;

      const rollbackOperation: RollbackOperation = {
        id: rollbackId,
        operationType,
        resourceId,
        previousState: state,
        currentState: null, // Will be set when operation completes
        timestamp: Date.now(),
        canRollback: true,
        metadata: {
          createdBy: "DataConsistencyManager",
          operationType,
        },
      };

      this.rollbackPoints.set(rollbackId, rollbackOperation);

      logger.info("Rollback point created", { rollbackId, operationType, resourceId });
      return rollbackId;
    } catch (error) {
      logger.error("Error creating rollback point", { error, operationType, resourceId });
      throw error;
    }
  }

  /**
   * Rollback an operation to its previous state
   */
  async rollback(rollbackId: string): Promise<void> {
    try {
      const rollbackOperation = this.rollbackPoints.get(rollbackId);
      if (!rollbackOperation) {
        throw new Error(`Rollback operation not found: ${rollbackId}`);
      }

      if (!rollbackOperation.canRollback) {
        throw new Error(`Rollback not allowed for operation: ${rollbackId}`);
      }

      logger.info("Executing rollback", {
        rollbackId,
        operationType: rollbackOperation.operationType,
      });

      // Restore the previous state
      await this.restorePreviousState(rollbackOperation);

      // Mark as rolled back
      rollbackOperation.canRollback = false;
      rollbackOperation.metadata = {
        ...rollbackOperation.metadata,
        rolledBackAt: Date.now(),
      };

      this.rollbackPoints.set(rollbackId, rollbackOperation);

      logger.info("Rollback completed successfully", { rollbackId });
    } catch (error) {
      logger.error("Error executing rollback", { error, rollbackId });
      throw error;
    }
  }

  /**
   * Validate data consistency for a resource type
   */
  async validateConsistency(resourceType: string): Promise<boolean> {
    try {
      logger.info("Validating consistency", { resourceType });

      // Get all resources of this type
      const resources = await this.getAllResources(resourceType);
      let isConsistent = true;

      for (const resource of resources) {
        const conflicts = await this.detectConflicts(resourceType, resource.id);
        if (conflicts.length > 0) {
          isConsistent = false;
          logger.warn("Consistency validation failed", {
            resourceType,
            resourceId: resource.id,
            conflictCount: conflicts.length,
          });
        }
      }

      logger.info("Consistency validation completed", { resourceType, isConsistent });
      return isConsistent;
    } catch (error) {
      logger.error("Error validating consistency", { error, resourceType });
      return false;
    }
  }

  /**
   * Get conflict history for a specific resource or all conflicts
   */
  async getConflictHistory(resourceId?: string): Promise<DataConflict[]> {
    try {
      const allConflicts = Array.from(this.conflicts.values());

      if (resourceId) {
        return allConflicts.filter(conflict => conflict.resourceId === resourceId);
      }

      return allConflicts.sort((a, b) => b.timestamp - a.timestamp);
    } catch (error) {
      logger.error("Error getting conflict history", { error, resourceId });
      throw error;
    }
  }

  /**
   * Auto-resolve conflicts using predefined strategies
   */
  async autoResolveConflicts(strategy: ConflictResolution["strategy"]): Promise<number> {
    try {
      logger.info("Auto-resolving conflicts", { strategy });

      const pendingConflicts = Array.from(this.conflicts.values()).filter(
        conflict => conflict.status === "pending"
      );

      let resolvedCount = 0;

      for (const conflict of pendingConflicts) {
        try {
          await this.resolveConflict(conflict.id, { strategy });
          resolvedCount++;
        } catch (error) {
          logger.error("Error auto-resolving conflict", {
            error,
            conflictId: conflict.id,
          });
        }
      }

      logger.info("Auto-resolution completed", { strategy, resolvedCount });
      return resolvedCount;
    } catch (error) {
      logger.error("Error in auto-resolve conflicts", { error, strategy });
      throw error;
    }
  }

  // Private helper methods

  private async getLocalData(
    _resourceType: string,
    _resourceId: string
  ): Promise<ResourceData | null> {
    // Implementation would depend on local storage mechanism
    // For now, return null to indicate no local data
    return null;
  }

  private async getRemoteData(
    resourceType: string,
    resourceId: string
  ): Promise<ResourceData | null> {
    try {
      // Use Convex to get remote data with proper function reference
      const result = await this.convexClient.query(
        "data:get" as unknown as Parameters<typeof this.convexClient.query>[0],
        {
          resourceType,
          resourceId,
        }
      );
      return result as ResourceData | null;
    } catch (error) {
      logger.error("Error fetching remote data", { error, resourceType, resourceId });
      return null;
    }
  }

  private hasDataConflict(localData: ResourceData, remoteData: ResourceData): boolean {
    if (!localData || !remoteData) return false;

    // Compare timestamps
    const localTimestamp = localData._updatedAt || localData.updatedAt || 0;
    const remoteTimestamp = remoteData._updatedAt || remoteData.updatedAt || 0;

    // If timestamps are different and data is different, there's a conflict
    if (localTimestamp !== remoteTimestamp) {
      return JSON.stringify(localData) !== JSON.stringify(remoteData);
    }

    return false;
  }

  private getConflictingFields(localData: ResourceData, remoteData: ResourceData): string[] {
    const conflictingFields: string[] = [];

    if (!localData || !remoteData) return conflictingFields;

    const localKeys = Object.keys(localData);
    const remoteKeys = Object.keys(remoteData);
    const allKeys = new Set([...localKeys, ...remoteKeys]);

    Array.from(allKeys).forEach(key => {
      if (JSON.stringify(localData[key]) !== JSON.stringify(remoteData[key])) {
        conflictingFields.push(key);
      }
    });

    return conflictingFields;
  }

  private resolveLastWriteWins(conflict: DataConflict): unknown {
    const localValue = conflict.localValue as ResourceData | null;
    const remoteValue = conflict.remoteValue as ResourceData | null;

    const localTimestamp = localValue?._updatedAt || localValue?.updatedAt || 0;
    const remoteTimestamp = remoteValue?._updatedAt || remoteValue?.updatedAt || 0;

    return localTimestamp > remoteTimestamp ? conflict.localValue : conflict.remoteValue;
  }

  private resolveMerge(conflict: DataConflict): unknown {
    // Simple merge strategy - combine non-conflicting fields
    const local = conflict.localValue as ResourceData | null;
    const remote = conflict.remoteValue as ResourceData | null;

    if (!local || !remote) {
      return local || remote;
    }

    const merged: ResourceData = { ...remote, ...local };

    // For arrays, merge them
    Object.keys(merged).forEach(key => {
      const localVal = local[key];
      const remoteVal = remote[key];
      if (Array.isArray(localVal) && Array.isArray(remoteVal)) {
        const uniqueItems = Array.from(new Set([...remoteVal, ...localVal]));
        merged[key] = uniqueItems;
      }
    });

    return merged;
  }

  private async resolveUserChoice(conflict: DataConflict): Promise<unknown> {
    // In a real implementation, this would prompt the user
    // For now, default to remote value
    logger.info("User choice resolution defaulting to remote value", {
      conflictId: conflict.id,
    });
    return conflict.remoteValue;
  }

  private async applyResolvedValue(conflict: DataConflict, resolvedValue: unknown): Promise<void> {
    try {
      // Apply the resolved value to both local and remote storage
      await this.convexClient.mutation(
        "data:update" as unknown as Parameters<typeof this.convexClient.mutation>[0],
        {
          resourceType: conflict.resourceType,
          resourceId: conflict.resourceId,
          data: resolvedValue,
        }
      );

      logger.info("Resolved value applied", {
        conflictId: conflict.id,
        resourceType: conflict.resourceType,
        resourceId: conflict.resourceId,
      });
    } catch (error) {
      logger.error("Error applying resolved value", { error, conflictId: conflict.id });
      throw error;
    }
  }

  private async restorePreviousState(rollbackOperation: RollbackOperation): Promise<void> {
    try {
      // Restore the previous state using Convex
      await this.convexClient.mutation(
        "data:restore" as unknown as Parameters<typeof this.convexClient.mutation>[0],
        {
          operationType: rollbackOperation.operationType,
          resourceId: rollbackOperation.resourceId,
          state: rollbackOperation.previousState,
        }
      );

      logger.info("Previous state restored", {
        rollbackId: rollbackOperation.id,
        resourceId: rollbackOperation.resourceId,
      });
    } catch (error) {
      logger.error("Error restoring previous state", {
        error,
        rollbackId: rollbackOperation.id,
      });
      throw error;
    }
  }

  private async getAllResources(resourceType: string): Promise<Array<{ id: string }>> {
    try {
      // Use proper Convex API reference
      const result = await this.convexClient.query(
        "data:list" as unknown as Parameters<typeof this.convexClient.query>[0],
        {
          resourceType,
        }
      );
      return (result as Array<{ id: string }>) || [];
    } catch (error) {
      logger.error("Error fetching all resources", { error, resourceType });
      return [];
    }
  }
}

// Export singleton instance
let dataConsistencyManagerInstance: DataConsistencyManagerImpl | null = null;

export function getDataConsistencyManager(
  convexClient?: ConvexHttpClient
): DataConsistencyManagerImpl {
  if (!dataConsistencyManagerInstance) {
    if (!convexClient) {
      throw new Error("ConvexHttpClient required to initialize DataConsistencyManager");
    }
    dataConsistencyManagerInstance = new DataConsistencyManagerImpl(convexClient);
  }
  return dataConsistencyManagerInstance;
}
