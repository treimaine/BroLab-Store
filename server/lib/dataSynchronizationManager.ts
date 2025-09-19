import { ConvexHttpClient } from "convex/browser";
import { getDataConsistencyManager } from "./dataConsistencyManager";
import { logger } from "./logger";
import { getRollbackManager } from "./rollbackManager";

/**
 * DataSynchronizationManager ensures data consistency across all sync operations,
 * implements data integrity validation and repair mechanisms, and provides
 * consistency monitoring and alerting.
 */
export class DataSynchronizationManager {
  private convexClient: ConvexHttpClient;
  private consistencyChecks: Map<string, ConsistencyCheck> = new Map();
  private syncOperations: Map<string, SyncOperation> = new Map();
  private integrityRules: Map<string, IntegrityRule[]> = new Map();
  private monitoringEnabled: boolean = true;
  private alertThresholds: AlertThresholds;

  constructor(convexClient: ConvexHttpClient) {
    this.convexClient = convexClient;
    this.alertThresholds = {
      maxFailureRate: 0.1, // 10%
      maxConsistencyErrors: 5,
      maxSyncDelay: 30000, // 30 seconds
      maxIntegrityViolations: 3,
    };
    this.setupDefaultIntegrityRules();
    this.startConsistencyMonitoring();
  }

  /**
   * Perform a synchronization operation with consistency checks
   */
  async performSyncOperation(operation: SyncOperationRequest): Promise<SyncResult> {
    const operationId = `sync_${operation.type}_${operation.resourceId}_${Date.now()}`;

    try {
      logger.info("Starting sync operation", { operationId, operation });

      // Pre-sync consistency check
      const preCheckResult = await this.performPreSyncCheck(operation);
      if (!preCheckResult.isValid) {
        throw new Error(`Pre-sync check failed: ${preCheckResult.errors.join(", ")}`);
      }

      // Create rollback point
      const rollbackManager = getRollbackManager(this.convexClient);
      const rollbackId = await rollbackManager.createRollbackPoint(
        operation.type,
        operation.resourceId,
        operation.currentState,
        { operationId, source: "DataSynchronizationManager" }
      );

      // Record sync operation
      const syncOp: SyncOperation = {
        id: operationId,
        type: operation.type,
        resourceId: operation.resourceId,
        status: "in_progress",
        startTime: Date.now(),
        rollbackId,
        metadata: operation.metadata || {},
      };
      this.syncOperations.set(operationId, syncOp);

      // Perform the actual sync
      const syncResult = await this.executeSyncOperation(operation);

      // Post-sync consistency check
      const postCheckResult = await this.performPostSyncCheck(operation, syncResult);
      if (!postCheckResult.isValid) {
        // Rollback on consistency failure
        await rollbackManager.executeRollback(rollbackId, "Post-sync consistency check failed");
        throw new Error(`Post-sync check failed: ${postCheckResult.errors.join(", ")}`);
      }

      // Update rollback point with new state
      await rollbackManager.updateRollbackPoint(rollbackId, syncResult.newState);

      // Update sync operation status
      syncOp.status = "completed";
      syncOp.endTime = Date.now();
      syncOp.result = syncResult;
      this.syncOperations.set(operationId, syncOp);

      logger.info("Sync operation completed successfully", { operationId });

      return {
        success: true,
        operationId,
        result: syncResult,
        consistencyChecks: {
          preSync: preCheckResult,
          postSync: postCheckResult,
        },
      };
    } catch (error) {
      logger.error("Sync operation failed", { error, operationId, operation });

      // Update sync operation status
      const syncOp = this.syncOperations.get(operationId);
      if (syncOp) {
        syncOp.status = "failed";
        syncOp.endTime = Date.now();
        syncOp.error = String(error);
        this.syncOperations.set(operationId, syncOp);
      }

      // Trigger alert if needed
      await this.checkAndTriggerAlerts();

      throw error;
    }
  }

  /**
   * Validate data integrity for a specific resource type
   */
  async validateDataIntegrity(
    resourceType: string,
    resourceId?: string
  ): Promise<IntegrityValidationResult> {
    try {
      logger.info("Validating data integrity", { resourceType, resourceId });

      const rules = this.integrityRules.get(resourceType) || [];
      const violations: IntegrityViolation[] = [];

      // Get resources to validate
      const resources = resourceId
        ? [await this.convexClient.query("data:get" as any, { resourceType, resourceId })]
        : await this.convexClient.query("data:list" as any, { resourceType });

      for (const resource of resources) {
        if (!resource) continue;

        for (const rule of rules) {
          try {
            const isValid = await rule.validator(resource);
            if (!isValid) {
              violations.push({
                resourceId: resource._id || resource.id,
                resourceType,
                rule: rule.name,
                description: rule.description,
                severity: rule.severity,
                timestamp: Date.now(),
                data: resource,
              });
            }
          } catch (error) {
            logger.error("Error validating integrity rule", {
              error,
              rule: rule.name,
              resourceId: resource._id,
            });
            violations.push({
              resourceId: resource._id || resource.id,
              resourceType,
              rule: rule.name,
              description: `Validation error: ${error}`,
              severity: "high",
              timestamp: Date.now(),
              data: resource,
            });
          }
        }
      }

      const result: IntegrityValidationResult = {
        resourceType,
        resourceId,
        isValid: violations.length === 0,
        violations,
        checkedCount: resources.length,
        timestamp: Date.now(),
      };

      // Store validation result
      await this.convexClient.mutation("integrity:storeValidationResult" as any, result);

      logger.info("Data integrity validation completed", {
        resourceType,
        resourceId,
        isValid: result.isValid,
        violationCount: violations.length,
      });

      return result;
    } catch (error) {
      logger.error("Error validating data integrity", { error, resourceType, resourceId });
      throw error;
    }
  }

  /**
   * Repair data integrity violations
   */
  async repairIntegrityViolations(violations: IntegrityViolation[]): Promise<RepairResult> {
    try {
      logger.info("Starting integrity violation repair", { violationCount: violations.length });

      const repairResults: RepairAttempt[] = [];

      for (const violation of violations) {
        try {
          const repairResult = await this.repairSingleViolation(violation);
          repairResults.push(repairResult);
        } catch (error) {
          logger.error("Error repairing violation", { error, violation });
          repairResults.push({
            violationId: violation.resourceId,
            success: false,
            error: String(error),
            timestamp: Date.now(),
          });
        }
      }

      const successfulRepairs = repairResults.filter(r => r.success).length;
      const result: RepairResult = {
        totalViolations: violations.length,
        successfulRepairs,
        failedRepairs: violations.length - successfulRepairs,
        repairAttempts: repairResults,
        timestamp: Date.now(),
      };

      logger.info("Integrity violation repair completed", result);
      return result;
    } catch (error) {
      logger.error("Error repairing integrity violations", { error });
      throw error;
    }
  }

  /**
   * Get consistency monitoring metrics
   */
  async getConsistencyMetrics(timeRange?: TimeRange): Promise<ConsistencyMetrics> {
    try {
      const range = timeRange || {
        start: Date.now() - 24 * 60 * 60 * 1000, // Last 24 hours
        end: Date.now(),
      };

      // Get sync operations in time range
      const syncOps = Array.from(this.syncOperations.values()).filter(
        op => op.startTime >= range.start && op.startTime <= range.end
      );

      const totalOperations = syncOps.length;
      const successfulOperations = syncOps.filter(op => op.status === "completed").length;
      const failedOperations = syncOps.filter(op => op.status === "failed").length;

      // Get consistency check results
      const consistencyResults = await this.convexClient.query("consistency:getMetrics" as any, {
        timeRange: range,
      });

      // Calculate metrics
      const metrics: ConsistencyMetrics = {
        timeRange: range,
        syncOperations: {
          total: totalOperations,
          successful: successfulOperations,
          failed: failedOperations,
          successRate: totalOperations > 0 ? successfulOperations / totalOperations : 1,
          averageDuration: this.calculateAverageDuration(syncOps),
        },
        consistencyChecks: {
          total: consistencyResults?.totalChecks || 0,
          passed: consistencyResults?.passedChecks || 0,
          failed: consistencyResults?.failedChecks || 0,
          passRate: consistencyResults?.passRate || 1,
        },
        integrityViolations: {
          total: consistencyResults?.totalViolations || 0,
          resolved: consistencyResults?.resolvedViolations || 0,
          pending: consistencyResults?.pendingViolations || 0,
        },
        alerts: {
          triggered: consistencyResults?.alertsTriggered || 0,
          resolved: consistencyResults?.alertsResolved || 0,
        },
      };

      return metrics;
    } catch (error) {
      logger.error("Error getting consistency metrics", { error });
      throw error;
    }
  }

  /**
   * Add custom integrity rule
   */
  addIntegrityRule(resourceType: string, rule: IntegrityRule): void {
    const rules = this.integrityRules.get(resourceType) || [];
    rules.push(rule);
    this.integrityRules.set(resourceType, rules);

    logger.info("Integrity rule added", { resourceType, ruleName: rule.name });
  }

  /**
   * Remove integrity rule
   */
  removeIntegrityRule(resourceType: string, ruleName: string): boolean {
    const rules = this.integrityRules.get(resourceType) || [];
    const initialLength = rules.length;
    const filteredRules = rules.filter(rule => rule.name !== ruleName);

    if (filteredRules.length < initialLength) {
      this.integrityRules.set(resourceType, filteredRules);
      logger.info("Integrity rule removed", { resourceType, ruleName });
      return true;
    }

    return false;
  }

  /**
   * Enable or disable monitoring
   */
  setMonitoringEnabled(enabled: boolean): void {
    this.monitoringEnabled = enabled;
    logger.info("Monitoring status changed", { enabled });
  }

  /**
   * Update alert thresholds
   */
  updateAlertThresholds(thresholds: Partial<AlertThresholds>): void {
    this.alertThresholds = { ...this.alertThresholds, ...thresholds };
    logger.info("Alert thresholds updated", { thresholds: this.alertThresholds });
  }

  // Private helper methods

  private async performPreSyncCheck(
    operation: SyncOperationRequest
  ): Promise<ConsistencyCheckResult> {
    try {
      const checks: ConsistencyCheck[] = [];

      // Check if resource exists
      const resource = await this.convexClient.query("data:get" as any, {
        resourceType: operation.type,
        resourceId: operation.resourceId,
      });

      checks.push({
        name: "resource_exists",
        passed: !!resource,
        message: resource ? "Resource exists" : "Resource not found",
        timestamp: Date.now(),
      });

      // Check data integrity
      const integrityResult = await this.validateDataIntegrity(
        operation.type,
        operation.resourceId
      );
      checks.push({
        name: "data_integrity",
        passed: integrityResult.isValid,
        message: integrityResult.isValid
          ? "Data integrity valid"
          : `${integrityResult.violations.length} violations found`,
        timestamp: Date.now(),
      });

      // Check for conflicts
      const consistencyManager = getDataConsistencyManager(this.convexClient);
      const conflicts = await consistencyManager.detectConflicts(
        operation.type,
        operation.resourceId
      );
      checks.push({
        name: "conflict_detection",
        passed: conflicts.length === 0,
        message:
          conflicts.length === 0 ? "No conflicts detected" : `${conflicts.length} conflicts found`,
        timestamp: Date.now(),
      });

      const allPassed = checks.every(check => check.passed);
      const errors = checks.filter(check => !check.passed).map(check => check.message);

      return {
        isValid: allPassed,
        checks,
        errors,
        timestamp: Date.now(),
      };
    } catch (error) {
      logger.error("Error in pre-sync check", { error, operation });
      return {
        isValid: false,
        checks: [],
        errors: [`Pre-sync check error: ${error}`],
        timestamp: Date.now(),
      };
    }
  }

  private async performPostSyncCheck(
    operation: SyncOperationRequest,
    result: any
  ): Promise<ConsistencyCheckResult> {
    try {
      const checks: ConsistencyCheck[] = [];

      // Verify the sync result
      checks.push({
        name: "sync_result_valid",
        passed: !!result && !!result.newState,
        message: result ? "Sync result valid" : "Invalid sync result",
        timestamp: Date.now(),
      });

      // Re-check data integrity after sync
      const integrityResult = await this.validateDataIntegrity(
        operation.type,
        operation.resourceId
      );
      checks.push({
        name: "post_sync_integrity",
        passed: integrityResult.isValid,
        message: integrityResult.isValid
          ? "Post-sync integrity valid"
          : `${integrityResult.violations.length} violations found`,
        timestamp: Date.now(),
      });

      const allPassed = checks.every(check => check.passed);
      const errors = checks.filter(check => !check.passed).map(check => check.message);

      return {
        isValid: allPassed,
        checks,
        errors,
        timestamp: Date.now(),
      };
    } catch (error) {
      logger.error("Error in post-sync check", { error, operation });
      return {
        isValid: false,
        checks: [],
        errors: [`Post-sync check error: ${error}`],
        timestamp: Date.now(),
      };
    }
  }

  private async executeSyncOperation(operation: SyncOperationRequest): Promise<any> {
    // Execute the actual sync operation using Convex
    return await this.convexClient.mutation("data:sync" as any, {
      type: operation.type,
      resourceId: operation.resourceId,
      newState: operation.newState,
      metadata: operation.metadata,
    });
  }

  private async repairSingleViolation(violation: IntegrityViolation): Promise<RepairAttempt> {
    try {
      // Get the integrity rule for this violation
      const rules = this.integrityRules.get(violation.resourceType) || [];
      const rule = rules.find(r => r.name === violation.rule);

      if (!rule || !rule.repair) {
        return {
          violationId: violation.resourceId,
          success: false,
          error: "No repair function available for this violation",
          timestamp: Date.now(),
        };
      }

      // Attempt repair
      const repairedData = await rule.repair(violation.data);

      // Update the resource with repaired data
      await this.convexClient.mutation("data:update" as any, {
        resourceType: violation.resourceType,
        resourceId: violation.resourceId,
        data: repairedData,
      });

      return {
        violationId: violation.resourceId,
        success: true,
        repairedData,
        timestamp: Date.now(),
      };
    } catch (error) {
      return {
        violationId: violation.resourceId,
        success: false,
        error: String(error),
        timestamp: Date.now(),
      };
    }
  }

  private setupDefaultIntegrityRules(): void {
    // User data integrity rules
    this.addIntegrityRule("users", {
      name: "required_fields",
      description: "User must have required fields",
      severity: "high",
      validator: (data: any) => {
        return !!(data.userId || data.id) && !!data.email;
      },
      repair: (data: any) => {
        if (!data.userId && !data.id) {
          data.userId = `user_${Date.now()}`;
        }
        if (!data.email) {
          data.email = `${data.userId}@example.com`;
        }
        return data;
      },
    });

    // Order data integrity rules
    this.addIntegrityRule("orders", {
      name: "order_items_valid",
      description: "Order must have valid items array",
      severity: "high",
      validator: (data: any) => {
        return Array.isArray(data.items) && data.items.length > 0;
      },
      repair: (data: any) => {
        if (!Array.isArray(data.items)) {
          data.items = [];
        }
        return data;
      },
    });

    // Product data integrity rules
    this.addIntegrityRule("products", {
      name: "product_name_required",
      description: "Product must have a name",
      severity: "medium",
      validator: (data: any) => {
        return !!data.name && data.name.trim().length > 0;
      },
      repair: (data: any) => {
        if (!data.name || data.name.trim().length === 0) {
          data.name = `Product ${data.id || Date.now()}`;
        }
        return data;
      },
    });
  }

  private calculateAverageDuration(operations: SyncOperation[]): number {
    const completedOps = operations.filter(op => op.endTime && op.startTime);
    if (completedOps.length === 0) return 0;

    const totalDuration = completedOps.reduce((sum, op) => sum + (op.endTime! - op.startTime), 0);
    return totalDuration / completedOps.length;
  }

  private async checkAndTriggerAlerts(): Promise<void> {
    if (!this.monitoringEnabled) return;

    try {
      const metrics = await this.getConsistencyMetrics();

      // Check failure rate threshold
      if (metrics.syncOperations.successRate < 1 - this.alertThresholds.maxFailureRate) {
        await this.triggerAlert("high_failure_rate", {
          currentRate: metrics.syncOperations.successRate,
          threshold: 1 - this.alertThresholds.maxFailureRate,
          message: "Sync operation failure rate exceeds threshold",
        });
      }

      // Check consistency errors
      if (metrics.consistencyChecks.failed > this.alertThresholds.maxConsistencyErrors) {
        await this.triggerAlert("consistency_errors", {
          errorCount: metrics.consistencyChecks.failed,
          threshold: this.alertThresholds.maxConsistencyErrors,
          message: "Consistency check errors exceed threshold",
        });
      }

      // Check integrity violations
      if (metrics.integrityViolations.pending > this.alertThresholds.maxIntegrityViolations) {
        await this.triggerAlert("integrity_violations", {
          violationCount: metrics.integrityViolations.pending,
          threshold: this.alertThresholds.maxIntegrityViolations,
          message: "Pending integrity violations exceed threshold",
        });
      }
    } catch (error) {
      logger.error("Error checking alert thresholds", { error });
    }
  }

  private async triggerAlert(type: string, details: any): Promise<void> {
    try {
      const alert = {
        type,
        severity: "high",
        message: details.message,
        details,
        timestamp: Date.now(),
      };

      // Store alert
      await this.convexClient.mutation("alerts:create" as any, alert);

      // Log alert
      logger.warn("Consistency alert triggered", alert);

      // Here you could also send notifications, emails, etc.
    } catch (error) {
      logger.error("Error triggering alert", { error, type, details });
    }
  }

  private startConsistencyMonitoring(): void {
    // Run consistency monitoring every 5 minutes
    setInterval(
      async () => {
        if (this.monitoringEnabled) {
          try {
            await this.checkAndTriggerAlerts();
          } catch (error) {
            logger.error("Error in consistency monitoring", { error });
          }
        }
      },
      5 * 60 * 1000
    );
  }
}

// Type definitions
interface SyncOperationRequest {
  type: string;
  resourceId: string;
  currentState: any;
  newState: any;
  metadata?: Record<string, any>;
}

interface SyncOperation {
  id: string;
  type: string;
  resourceId: string;
  status: "in_progress" | "completed" | "failed";
  startTime: number;
  endTime?: number;
  rollbackId: string;
  result?: any;
  error?: string;
  metadata: Record<string, any>;
}

interface SyncResult {
  success: boolean;
  operationId: string;
  result?: any;
  consistencyChecks: {
    preSync: ConsistencyCheckResult;
    postSync: ConsistencyCheckResult;
  };
}

interface ConsistencyCheck {
  name: string;
  passed: boolean;
  message: string;
  timestamp: number;
}

interface ConsistencyCheckResult {
  isValid: boolean;
  checks: ConsistencyCheck[];
  errors: string[];
  timestamp: number;
}

interface IntegrityRule {
  name: string;
  description: string;
  severity: "low" | "medium" | "high";
  validator: (data: any) => boolean | Promise<boolean>;
  repair?: (data: any) => any | Promise<any>;
}

interface IntegrityViolation {
  resourceId: string;
  resourceType: string;
  rule: string;
  description: string;
  severity: "low" | "medium" | "high";
  timestamp: number;
  data: any;
}

interface IntegrityValidationResult {
  resourceType: string;
  resourceId?: string;
  isValid: boolean;
  violations: IntegrityViolation[];
  checkedCount: number;
  timestamp: number;
}

interface RepairAttempt {
  violationId: string;
  success: boolean;
  repairedData?: any;
  error?: string;
  timestamp: number;
}

interface RepairResult {
  totalViolations: number;
  successfulRepairs: number;
  failedRepairs: number;
  repairAttempts: RepairAttempt[];
  timestamp: number;
}

interface TimeRange {
  start: number;
  end: number;
}

interface ConsistencyMetrics {
  timeRange: TimeRange;
  syncOperations: {
    total: number;
    successful: number;
    failed: number;
    successRate: number;
    averageDuration: number;
  };
  consistencyChecks: {
    total: number;
    passed: number;
    failed: number;
    passRate: number;
  };
  integrityViolations: {
    total: number;
    resolved: number;
    pending: number;
  };
  alerts: {
    triggered: number;
    resolved: number;
  };
}

interface AlertThresholds {
  maxFailureRate: number;
  maxConsistencyErrors: number;
  maxSyncDelay: number;
  maxIntegrityViolations: number;
}

// Export singleton instance
let dataSynchronizationManagerInstance: DataSynchronizationManager | null = null;

export function getDataSynchronizationManager(
  convexClient?: ConvexHttpClient
): DataSynchronizationManager {
  if (!dataSynchronizationManagerInstance) {
    if (!convexClient) {
      throw new Error("ConvexHttpClient required to initialize DataSynchronizationManager");
    }
    dataSynchronizationManagerInstance = new DataSynchronizationManager(convexClient);
  }
  return dataSynchronizationManagerInstance;
}
