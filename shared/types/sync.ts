/**
 * Shared Types for Real-time Sync System
 *
 * Type definitions for dashboard synchronization, error handling,
 * and real-time data updates.
 */

// ================================
// ERROR TYPES
// ================================

/**
 * Sync error types
 */
export enum SyncErrorType {
  NETWORK_ERROR = "network_error",
  WEBSOCKET_ERROR = "websocket_error",
  DATA_INCONSISTENCY = "data_inconsistency",
  VALIDATION_ERROR = "validation_error",
  CONFLICT_ERROR = "conflict_error",
  TIMEOUT_ERROR = "timeout_error",
  AUTHENTICATION_ERROR = "auth_error",
}

/**
 * Error context for debugging
 */
export interface ErrorContext {
  /** User ID if available */
  userId?: string;
  /** Section where error occurred */
  section?: string;
  /** Operation being performed */
  operation?: string;
  /** Component where error occurred */
  component?: string;
  /** Connection type when error occurred */
  connectionType?: ConnectionType;
  /** Source of the error */
  source?: string;
  /** Additional metadata */
  metadata?: Record<string, unknown>;
  /** Stack trace */
  stackTrace?: string;
  /** Session ID */
  sessionId?: string;
  /** Action being performed when error occurred */
  action?: string;
  /** Report ID for error tracking */
  reportId?: string;
  /** Original error object */
  originalError?: Error;
}

/**
 * Basic sync error
 */
export interface SyncError {
  /** Error type */
  type: SyncErrorType;
  /** Error message */
  message: string;
  /** Error code (optional) */
  code?: string;
  /** Timestamp when error occurred */
  timestamp: number;
  /** Error context */
  context: ErrorContext;
  /** Whether error is retryable */
  retryable: boolean;
  /** Current retry count */
  retryCount: number;
  /** Maximum retry attempts */
  maxRetries: number;
  /** Next retry time (optional) */
  nextRetryAt?: number;
  /** Error fingerprint for deduplication */
  fingerprint: string;
}

/**
 * Technical details for debugging
 */
export interface TechnicalDetails {
  /** Stack trace */
  stackTrace?: string;
  /** Environment information */
  environment: {
    /** User agent */
    userAgent: string;
    /** Current URL */
    url: string;
    /** Timestamp */
    timestamp: number;
    /** Connection type */
    connectionType?: "slow-2g" | "2g" | "3g" | "4g";
    /** Online status */
    onlineStatus: boolean;
    /** Viewport dimensions */
    viewport: {
      width: number;
      height: number;
    };
    /** Screen dimensions */
    screen: {
      width: number;
      height: number;
    };
    /** Memory information (if available) */
    memory?: {
      usedJSHeapSize: number;
      totalJSHeapSize: number;
      jsHeapSizeLimit: number;
    };
    /** Connection information (if available) */
    connection?: {
      effectiveType: "slow-2g" | "2g" | "3g" | "4g";
      downlink: number;
      rtt: number;
      saveData: boolean;
    };
  };
  /** Additional context */
  additionalContext: Record<string, unknown>;
}

/**
 * User action for error recovery
 */
export interface UserAction {
  /** Action ID */
  id: string;
  /** Action label */
  label: string;
  /** Action description */
  description: string;
  /** Action type */
  type: "retry" | "refresh" | "reload" | "contact_support" | "dismiss" | "custom";
  /** Whether this is the primary action */
  primary: boolean;
  /** Whether action is available */
  available: boolean;
  /** Action handler */
  handler: () => void | Promise<void>;
}

/**
 * Enhanced sync error with recovery metadata
 */
export interface EnhancedSyncError extends SyncError {
  /** Error severity */
  severity: ErrorSeverity;
  /** Error category */
  category: ErrorCategory;
  /** Recovery strategy */
  recoveryStrategy: RecoveryStrategyType;
  /** User-friendly message */
  userMessage: string;
  /** Available user actions */
  userActions: UserAction[];
  /** Technical details */
  technicalDetails: TechnicalDetails;
}

/**
 * Connection type
 */
export type ConnectionType = "websocket" | "polling" | "offline";

/**
 * Error severity level
 */
export type ErrorSeverity = "low" | "medium" | "high" | "critical";

/**
 * Error category
 */
export type ErrorCategory = "connection" | "data" | "auth" | "system" | "user";

/**
 * Recovery strategy types
 */
export type RecoveryStrategyType =
  | "immediate_retry"
  | "exponential_backoff"
  | "fallback_connection"
  | "force_sync"
  | "user_intervention"
  | "no_recovery";

// ================================
// SYNC STATUS TYPES
// ================================

/**
 * Connection status
 */
export interface ConnectionStatus {
  /** Connection type */
  type: ConnectionType;
  /** Whether connected */
  connected: boolean;
  /** Whether reconnecting */
  reconnecting: boolean;
  /** Last connected timestamp */
  lastConnected: number;
  /** Reconnect attempts */
  reconnectAttempts: number;
  /** Maximum reconnect attempts */
  maxReconnectAttempts: number;
  /** Next reconnect time (optional) */
  nextReconnectIn?: number;
}

/**
 * Sync metrics
 */
export interface SyncMetrics {
  /** Average latency in ms */
  averageLatency: number;
  /** Success rate percentage */
  successRate: number;
  /** Error count */
  errorCount: number;
  /** Reconnect count */
  reconnectCount: number;
  /** Data inconsistencies detected */
  dataInconsistencies: number;
  /** Last inconsistency time (optional) */
  lastInconsistencyTime?: number;
}

/**
 * Sync status
 */
export interface SyncStatus {
  /** Whether connected */
  connected: boolean;
  /** Connection type */
  connectionType: ConnectionType;
  /** Last sync timestamp */
  lastSync: number;
  /** Whether sync is in progress */
  syncInProgress: boolean;
  /** Sync errors */
  errors: SyncError[];
  /** Sync metrics */
  metrics: SyncMetrics;
}

// ================================
// VALIDATION TYPES
// ================================

/**
 * Validation error
 */
export interface ValidationError {
  /** Field with error */
  field: string;
  /** Error message */
  message: string;
  /** Error code */
  code: string;
  /** Expected value (optional) */
  expected?: unknown;
  /** Actual value (optional) */
  actual?: unknown;
}

/**
 * Validation warning
 */
export interface ValidationWarning {
  /** Field with warning */
  field: string;
  /** Warning message */
  message: string;
  /** Warning code */
  code: string;
  /** Suggestion (optional) */
  suggestion?: string;
}

/**
 * Validation result
 */
export interface ValidationResult {
  /** Whether validation passed */
  valid: boolean;
  /** Validation errors */
  errors: ValidationError[];
  /** Validation warnings */
  warnings: ValidationWarning[];
  /** Data hash */
  dataHash: string;
  /** Validation timestamp */
  validatedAt: number;
}

/**
 * Data inconsistency
 */
export interface Inconsistency {
  /** Inconsistency type */
  type: "calculation" | "timing" | "missing_data" | "duplicate_data";
  /** Affected sections */
  sections: string[];
  /** Description of the inconsistency */
  description: string;
  /** Severity level */
  severity: "low" | "medium" | "high" | "critical";
  /** Whether it can be auto-resolved */
  autoResolvable: boolean;
  /** When it was detected */
  detectedAt: number;
  /** Expected value (optional) */
  expectedValue?: unknown;
  /** Actual value (optional) */
  actualValue?: unknown;
}

/**
 * Cross-validation result
 */
export interface CrossValidationResult {
  /** Whether data is consistent */
  consistent: boolean;
  /** List of inconsistencies found */
  inconsistencies: Inconsistency[];
  /** Sections affected by inconsistencies */
  affectedSections: string[];
  /** Recommended action to resolve */
  recommendedAction: "sync" | "reload" | "ignore";
}

// ================================
// EVENT TYPES
// ================================

/**
 * Dashboard event
 */
export interface DashboardEvent<T = unknown> {
  /** Event type */
  type: string;
  /** Event payload */
  payload: T;
  /** Event timestamp */
  timestamp: number;
  /** Event source */
  source: "user" | "server" | "system";
  /** Event ID */
  id: string;
  /** Correlation ID (optional) */
  correlationId?: string;
  /** User ID (optional) */
  userId?: string;
  /** Event priority (optional) */
  priority?: "low" | "normal" | "high" | "critical";
}

/**
 * Subscription options
 */
export interface SubscriptionOptions {
  /** Include event history */
  includeHistory?: boolean;
  /** History limit */
  historyLimit?: number;
  /** Priority filter */
  priorityFilter?: Array<"low" | "normal" | "high" | "critical">;
  /** Persistent subscription */
  persistent?: boolean;
}

// ================================
// OPTIMISTIC UPDATE TYPES
// ================================

/**
 * Optimistic update
 */
export interface OptimisticUpdate {
  /** Update ID */
  id: string;
  /** Update type */
  type: "add" | "update" | "delete";
  /** Section being updated */
  section: string;
  /** Update data */
  data: unknown;
  /** Update timestamp */
  timestamp: number;
  /** Whether update is confirmed */
  confirmed: boolean;
  /** Rollback data (optional) */
  rollbackData?: unknown;
  /** User ID (optional) */
  userId?: string;
  /** Correlation ID (optional) */
  correlationId?: string;
}

/**
 * Data change
 */
export interface DataChange {
  /** Section changed */
  section: string;
  /** Change type */
  type: "create" | "update" | "delete";
  /** New data */
  data: unknown;
  /** Previous data (optional) */
  previousData?: unknown;
  /** Change timestamp */
  timestamp: number;
  /** Change source */
  source: "server" | "optimistic" | "conflict_resolution";
}

/**
 * Sync result
 */
export interface SyncResult {
  /** Whether sync was successful */
  success: boolean;
  /** Synced sections */
  syncedSections: string[];
  /** Sync errors */
  errors: SyncError[];
  /** Sync duration in ms */
  duration: number;
  /** Data changes */
  dataChanges: DataChange[];
  /** Inconsistencies resolved */
  inconsistenciesResolved: number;
  /** Sync timestamp */
  syncedAt: number;
}

// ================================
// ADDITIONAL TYPES
// ================================

/**
 * Time period for analytics and reporting
 */
export type TimePeriod = "7d" | "30d" | "90d" | "1y" | "all";

/**
 * Memory statistics
 */
export interface MemoryStats {
  /** Cache size in bytes */
  cacheSize: number;
  /** Event history size in bytes */
  eventHistorySize: number;
  /** Number of active subscriptions */
  subscriptionCount: number;
  /** Number of pending updates */
  pendingUpdatesCount: number;
  /** Total memory usage in bytes */
  totalMemoryUsage: number;
  /** When the stats were measured */
  measuredAt: number;
}

/**
 * Consistent user statistics
 */
export interface ConsistentUserStats {
  /** Total number of favorites */
  totalFavorites: number;
  /** Total number of downloads */
  totalDownloads: number;
  /** Total number of orders */
  totalOrders: number;
  /** Total amount spent */
  totalSpent: number;
  /** Recent activity count */
  recentActivity: number;
  /** Quota used */
  quotaUsed: number;
  /** Quota limit */
  quotaLimit: number;
  /** Monthly downloads */
  monthlyDownloads: number;
  /** Monthly orders */
  monthlyOrders: number;
  /** Monthly revenue */
  monthlyRevenue: number;
  /** When stats were calculated */
  calculatedAt: string;
  /** Data hash for consistency validation */
  dataHash: string;
  /** Data source */
  source: "database" | "cache" | "optimistic";
  /** Data version */
  version: number;
}

/**
 * Recovery action (re-exported for compatibility)
 */
export interface RecoveryAction {
  /** Action ID */
  id?: string;
  /** Action label */
  label?: string;
  /** Action description */
  description?: string;
  /** Action type */
  type:
    | "retry"
    | "refresh"
    | "reload"
    | "contact_support"
    | "dismiss"
    | "custom"
    | "fallback"
    | "force_sync"
    | "notify_user";
  /** Whether this is the primary action */
  primary?: boolean;
  /** Whether action is available */
  available?: boolean;
  /** Action handler */
  handler?: () => void | Promise<void>;
  /** Delay before action (optional) */
  delay?: number;
  /** Connection strategy (optional) */
  strategy?: ConnectionType;
  /** Sections to sync (optional) */
  sections?: string[];
  /** Full sync flag (optional) */
  full?: boolean;
  /** Action message (optional) */
  message?: string;
}

// ================================
// DATA CONSISTENCY TYPES
// ================================

/**
 * Conflict resolution strategy
 */
export interface ConflictResolution {
  /** Resolution strategy */
  strategy: "last_write_wins" | "merge" | "user_choice" | "custom";
  /** Custom resolver function */
  resolver?: (local: unknown, remote: unknown) => unknown;
  /** Priority for resolution */
  priority?: "local" | "remote" | "newest" | "manual";
}

/**
 * Data conflict between local and remote state
 */
export interface DataConflict {
  /** Conflict ID */
  id: string;
  /** Resource type */
  resourceType: string;
  /** Resource ID */
  resourceId: string;
  /** Local value */
  localValue: unknown;
  /** Remote value */
  remoteValue: unknown;
  /** Conflict timestamp */
  timestamp: number;
  /** Resolution strategy */
  resolution?: ConflictResolution;
  /** Conflict status */
  status: "pending" | "resolved" | "ignored";
  /** Additional metadata */
  metadata?: Record<string, unknown>;
}
