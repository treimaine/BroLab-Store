/**
 * Zod Validation Schemas for Real-time Sync System
 *
 * This module contains comprehensive Zod schemas for validating
 * dashboard data, sync status, and consistency validation to ensure
 * data integrity across all dashboard sections.
 */

import { z } from "zod";
import type { ValidationResult } from "../types/sync";

// ================================
// BASIC VALIDATION SCHEMAS
// ================================

/**
 * Connection status validation schema
 */
const ConnectionStatusSchema = z.object({
  type: z.enum(["websocket", "polling", "offline"]),
  connected: z.boolean(),
  reconnecting: z.boolean(),
  lastConnected: z.number().min(0),
  reconnectAttempts: z.number().min(0),
  maxReconnectAttempts: z.number().min(1),
  nextReconnectIn: z.number().min(0).optional(),
});

/**
 * Sync metrics validation schema
 */
const SyncMetricsSchema = z.object({
  averageLatency: z.number().min(0),
  successRate: z.number().min(0).max(100),
  errorCount: z.number().min(0),
  reconnectCount: z.number().min(0),
  dataInconsistencies: z.number().min(0),
  lastInconsistencyTime: z.number().min(0).optional(),
});

/**
 * Sync error validation schema
 */
const SyncErrorSchema = z.object({
  type: z.enum([
    "network_error",
    "websocket_error",
    "data_inconsistency",
    "validation_error",
    "conflict_error",
    "timeout_error",
    "auth_error",
  ]),
  message: z.string().min(1),
  code: z.string().optional(),
  timestamp: z.number().min(0),
  context: z.record(z.unknown()),
  retryable: z.boolean(),
  retryCount: z.number().min(0),
  maxRetries: z.number().min(0),
  nextRetryAt: z.number().min(0).optional(),
});

/**
 * Sync status validation schema
 */
const SyncStatusSchema = z.object({
  connected: z.boolean(),
  connectionType: z.enum(["websocket", "polling", "offline"]),
  lastSync: z.number().min(0),
  syncInProgress: z.boolean(),
  errors: z.array(SyncErrorSchema),
  metrics: SyncMetricsSchema,
});

// ================================
// CONSISTENT USER STATS SCHEMA
// ================================

/**
 * Enhanced user statistics with consistency validation
 */
const ConsistentUserStatsSchema = z.object({
  totalFavorites: z.number().min(0),
  totalDownloads: z.number().min(0),
  totalOrders: z.number().min(0),
  totalSpent: z.number().min(0),
  recentActivity: z.number().min(0),
  quotaUsed: z.number().min(0),
  quotaLimit: z.number().min(0),
  monthlyDownloads: z.number().min(0),
  monthlyOrders: z.number().min(0),
  monthlyRevenue: z.number().min(0),

  // Consistency metadata
  calculatedAt: z.string().datetime(),
  dataHash: z.string().min(1),
  source: z.enum(["database", "cache", "optimistic"]),
  version: z.number().min(1),
});

// ================================
// VALIDATION RESULT SCHEMAS
// ================================

/**
 * Validation error schema
 */
const ValidationErrorSchema = z.object({
  field: z.string().min(1),
  message: z.string().min(1),
  code: z.string().min(1),
  expected: z.unknown().optional(),
  actual: z.unknown().optional(),
});

/**
 * Validation warning schema
 */
const ValidationWarningSchema = z.object({
  field: z.string().min(1),
  message: z.string().min(1),
  code: z.string().min(1),
  suggestion: z.string().optional(),
});

/**
 * Validation result schema
 */
const ValidationResultSchema = z.object({
  valid: z.boolean(),
  errors: z.array(ValidationErrorSchema),
  warnings: z.array(ValidationWarningSchema),
  dataHash: z.string().min(1),
  validatedAt: z.number().min(0),
});

/**
 * Data inconsistency schema
 */
const InconsistencySchema = z.object({
  type: z.enum(["calculation", "timing", "missing_data", "duplicate_data"]),
  sections: z.array(z.string().min(1)).min(1),
  description: z.string().min(1),
  severity: z.enum(["low", "medium", "high", "critical"]),
  autoResolvable: z.boolean(),
  detectedAt: z.number().min(0),
  expectedValue: z.unknown().optional(),
  actualValue: z.unknown().optional(),
});

/**
 * Cross-validation result schema
 */
const CrossValidationResultSchema = z.object({
  consistent: z.boolean(),
  inconsistencies: z.array(InconsistencySchema),
  affectedSections: z.array(z.string().min(1)),
  recommendedAction: z.enum(["sync", "reload", "ignore"]),
});

// ================================
// OPTIMISTIC UPDATE SCHEMAS
// ================================

/**
 * Optimistic update schema
 */
const OptimisticUpdateSchema = z.object({
  id: z.string().min(1),
  type: z.enum(["add", "update", "delete"]),
  section: z.string().min(1),
  data: z.unknown(),
  timestamp: z.number().min(0),
  confirmed: z.boolean(),
  rollbackData: z.unknown().optional(),
  userId: z.string().optional(),
  correlationId: z.string().optional(),
});

/**
 * Conflict resolution strategy schema
 */
const ConflictResolutionStrategySchema = z.object({
  type: z.enum(["server_wins", "client_wins", "merge", "manual"]),
  description: z.string().min(1),
  automatic: z.boolean(),
  confidence: z.number().min(0).max(1),
});

/**
 * Data conflict schema
 */
const DataConflictSchema = z.object({
  id: z.string().min(1),
  updates: z.array(OptimisticUpdateSchema).min(1),
  type: z.enum(["concurrent_update", "version_mismatch", "data_corruption"]),
  description: z.string().min(1),
  resolutionStrategies: z.array(ConflictResolutionStrategySchema),
  detectedAt: z.number().min(0),
});

// ================================
// EVENT SYSTEM SCHEMAS
// ================================

/**
 * Dashboard event schema
 */
const DashboardEventSchema = z.object({
  type: z.string().min(1),
  payload: z.unknown(),
  timestamp: z.number().min(0),
  source: z.enum(["user", "server", "system"]),
  id: z.string().min(1),
  correlationId: z.string().optional(),
  userId: z.string().optional(),
  priority: z.enum(["low", "normal", "high", "critical"]).optional(),
});

/**
 * Subscription options schema
 */
const SubscriptionOptionsSchema = z.object({
  includeHistory: z.boolean().optional(),
  historyLimit: z.number().min(1).optional(),
  priorityFilter: z.array(z.enum(["low", "normal", "high", "critical"])).optional(),
  persistent: z.boolean().optional(),
});

// ================================
// SYNC RESULT SCHEMAS
// ================================

/**
 * Data change schema
 */
const DataChangeSchema = z.object({
  section: z.string().min(1),
  type: z.enum(["create", "update", "delete"]),
  data: z.unknown(),
  previousData: z.unknown().optional(),
  timestamp: z.number().min(0),
  source: z.enum(["server", "optimistic", "conflict_resolution"]),
});

/**
 * Sync result schema
 */
const SyncResultSchema = z.object({
  success: z.boolean(),
  syncedSections: z.array(z.string().min(1)),
  errors: z.array(SyncErrorSchema),
  duration: z.number().min(0),
  dataChanges: z.array(DataChangeSchema),
  inconsistenciesResolved: z.number().min(0),
  syncedAt: z.number().min(0),
});

// ================================
// MEMORY MANAGEMENT SCHEMAS
// ================================

/**
 * Memory statistics schema
 */
const MemoryStatsSchema = z.object({
  cacheSize: z.number().min(0),
  eventHistorySize: z.number().min(0),
  subscriptionCount: z.number().min(0),
  pendingUpdatesCount: z.number().min(0),
  totalMemoryUsage: z.number().min(0),
  measuredAt: z.number().min(0),
});

/**
 * Memory limits schema
 */
const MemoryLimitsSchema = z.object({
  maxCacheSize: z.number().min(1),
  maxEventHistorySize: z.number().min(1),
  maxSubscriptions: z.number().min(1),
  maxPendingUpdates: z.number().min(1),
  cleanupThreshold: z.number().min(0).max(1),
});

// ================================
// DASHBOARD DATA VALIDATION
// ================================

/**
 * Dashboard data validation schema (extends existing types)
 */
const DashboardDataSchema = z.object({
  user: z.object({
    id: z.string().min(1),
    clerkId: z.string().min(1),
    email: z.string().email(),
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    imageUrl: z.string().url().optional(),
    username: z.string().optional(),
  }),
  stats: ConsistentUserStatsSchema,
  favorites: z.array(
    z.object({
      id: z.string().min(1),
      beatId: z.number().min(1),
      beatTitle: z.string().min(1),
      beatArtist: z.string().optional(),
      beatImageUrl: z.string().url().optional(),
      beatGenre: z.string().optional(),
      beatBpm: z.number().min(1).optional(),
      beatPrice: z.number().min(0).optional(),
      createdAt: z.string().datetime(),
    })
  ),
  orders: z.array(
    z.object({
      id: z.string().min(1),
      orderNumber: z.string().optional(),
      total: z.number().min(0),
      currency: z.string().min(1),
      status: z.enum([
        "draft",
        "pending",
        "processing",
        "paid",
        "completed",
        "cancelled",
        "refunded",
        "payment_failed",
      ]),
      createdAt: z.string().datetime(),
      updatedAt: z.string().datetime(),
    })
  ),
  downloads: z.array(
    z.object({
      id: z.string().min(1),
      beatId: z.number().min(1),
      beatTitle: z.string().min(1),
      format: z.enum(["mp3", "wav", "flac"]),
      licenseType: z.string().min(1),
      downloadedAt: z.string().datetime(),
      downloadCount: z.number().min(1),
    })
  ),
  reservations: z.array(
    z.object({
      id: z.string().min(1),
      serviceType: z.enum(["mixing", "mastering", "recording", "consultation", "custom_beat"]),
      preferredDate: z.string().datetime(),
      duration: z.number().min(1),
      totalPrice: z.number().min(0),
      status: z.enum(["pending", "confirmed", "in_progress", "completed", "cancelled"]),
      createdAt: z.string().datetime(),
    })
  ),
  activity: z.array(
    z.object({
      id: z.string().min(1),
      type: z.string().min(1),
      description: z.string().min(1),
      timestamp: z.string().datetime(),
      metadata: z.record(z.unknown()),
    })
  ),
  chartData: z.array(
    z.object({
      date: z.string().min(1),
      orders: z.number().min(0),
      downloads: z.number().min(0),
      revenue: z.number().min(0),
      favorites: z.number().min(0),
    })
  ),
  trends: z.object({
    orders: z.object({
      period: z.enum(["7d", "30d", "90d", "1y"]),
      value: z.number().min(0),
      change: z.number(),
      changePercent: z.number(),
      isPositive: z.boolean(),
    }),
    downloads: z.object({
      period: z.enum(["7d", "30d", "90d", "1y"]),
      value: z.number().min(0),
      change: z.number(),
      changePercent: z.number(),
      isPositive: z.boolean(),
    }),
    revenue: z.object({
      period: z.enum(["7d", "30d", "90d", "1y"]),
      value: z.number().min(0),
      change: z.number(),
      changePercent: z.number(),
      isPositive: z.boolean(),
    }),
    favorites: z.object({
      period: z.enum(["7d", "30d", "90d", "1y"]),
      value: z.number().min(0),
      change: z.number(),
      changePercent: z.number(),
      isPositive: z.boolean(),
    }),
  }),
});

// ================================
// UTILITY FUNCTIONS
// ================================

/**
 * Validate dashboard data with comprehensive error reporting
 */
export function validateDashboardData(data: unknown): ValidationResult {
  const startTime = Date.now();

  try {
    const result = DashboardDataSchema.safeParse(data);

    if (result.success) {
      return {
        valid: true,
        errors: [],
        warnings: [],
        dataHash: generateDataHash(result.data),
        validatedAt: startTime,
      };
    }

    const errors = result.error.issues.map(issue => ({
      field: issue.path.join("."),
      message: issue.message,
      code: issue.code,
      expected: undefined,
      actual: (data as Record<string, unknown>)?.[issue.path[0]],
    }));

    return {
      valid: false,
      errors,
      warnings: [],
      dataHash: "",
      validatedAt: startTime,
    };
  } catch (error) {
    return {
      valid: false,
      errors: [
        {
          field: "root",
          message: error instanceof Error ? error.message : "Unknown validation error",
          code: "validation_exception",
        },
      ],
      warnings: [],
      dataHash: "",
      validatedAt: startTime,
    };
  }
}

/**
 * Generate a hash for data consistency validation
 */
export function generateDataHash(data: unknown): string {
  // Simple hash function for data consistency validation
  // In production, consider using a more robust hashing algorithm
  const jsonString = JSON.stringify(
    data,
    Object.keys(data as object).sort((a, b) => a.localeCompare(b))
  );
  let hash = 0;

  for (let i = 0; i < jsonString.length; i++) {
    const char = jsonString.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }

  return Math.abs(hash).toString(36);
}

/**
 * Validate sync status
 */
export function validateSyncStatus(status: unknown): ValidationResult {
  const startTime = Date.now();

  try {
    const result = SyncStatusSchema.safeParse(status);

    if (result.success) {
      return {
        valid: true,
        errors: [],
        warnings: [],
        dataHash: generateDataHash(result.data),
        validatedAt: startTime,
      };
    }

    const errors = result.error.issues.map(issue => ({
      field: issue.path.join("."),
      message: issue.message,
      code: issue.code,
    }));

    return {
      valid: false,
      errors,
      warnings: [],
      dataHash: "",
      validatedAt: startTime,
    };
  } catch (error) {
    return {
      valid: false,
      errors: [
        {
          field: "root",
          message: error instanceof Error ? error.message : "Unknown validation error",
          code: "validation_exception",
        },
      ],
      warnings: [],
      dataHash: "",
      validatedAt: startTime,
    };
  }
}

/**
 * Validate optimistic update
 */
export function validateOptimisticUpdate(update: unknown): ValidationResult {
  const startTime = Date.now();

  try {
    const result = OptimisticUpdateSchema.safeParse(update);

    if (result.success) {
      return {
        valid: true,
        errors: [],
        warnings: [],
        dataHash: generateDataHash(result.data),
        validatedAt: startTime,
      };
    }

    const errors = result.error.issues.map(issue => ({
      field: issue.path.join("."),
      message: issue.message,
      code: issue.code,
    }));

    return {
      valid: false,
      errors,
      warnings: [],
      dataHash: "",
      validatedAt: startTime,
    };
  } catch (error) {
    return {
      valid: false,
      errors: [
        {
          field: "root",
          message: error instanceof Error ? error.message : "Unknown validation error",
          code: "validation_exception",
        },
      ],
      warnings: [],
      dataHash: "",
      validatedAt: startTime,
    };
  }
}

// Export all schemas for external use
export {
  ConnectionStatusSchema,
  ConsistentUserStatsSchema,
  CrossValidationResultSchema,
  DashboardDataSchema,
  DashboardEventSchema,
  DataConflictSchema,
  InconsistencySchema,
  MemoryLimitsSchema,
  MemoryStatsSchema,
  OptimisticUpdateSchema,
  SyncErrorSchema,
  SyncMetricsSchema,
  SyncResultSchema,
  SyncStatusSchema,
  ValidationResultSchema,
};
