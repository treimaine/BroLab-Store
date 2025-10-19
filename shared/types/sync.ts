/**
 * Real-time Synchronization Types for Dashboard
 *
 * This module contains TypeScript interfaces for the unified real-time
 * synchronization system, including sync status, consistency validation,
 * and event management for the BroLab Entertainment dashboard.
 */

import type { DashboardData } from "./dashboard";

// ================================
// SYNC STATUS INTERFACES
// ================================

/**
 * Connection status for real-time synchronization
 */
export interface ConnectionStatus {
  /** Connection type currently in use */
  type: "websocket" | "polling" | "offline";
  /** Whether connection is active */
  connected: boolean;
  /** Whether reconnection is in progress */
  reconnecting: boolean;
  /** Last successful connection timestamp */
  lastConnected: number;
  /** Number of reconnection attempts */
  reconnectAttempts: number;
  /** Maximum allowed reconnection attempts */
  maxReconnectAttempts: number;
  /** Time until next reconnection attempt (ms) */
  nextReconnectIn?: number;
}

/**
 * Synchronization status and metrics
 */
export interface SyncStatus {
  /** Whether sync is connected */
  connected: boolean;
  /** Current connection type */
  connectionType: "websocket" | "polling" | "offline";
  /** Last successful sync timestamp */
  lastSync: number;
  /** Whether sync operation is in progress */
  syncInProgress: boolean;
  /** Current sync errors */
  errors: SyncError[];
  /** Sync performance metrics */
  metrics: SyncMetrics;
}

/**
 * Sync performance metrics
 */
export interface SyncMetrics {
  /** Average sync latency in milliseconds */
  averageLatency: number;
  /** Success rate as percentage (0-100) */
  successRate: number;
  /** Total number of errors */
  errorCount: number;
  /** Number of reconnections */
  reconnectCount: number;
  /** Number of data inconsistencies detected */
  dataInconsistencies: number;
  /** Last inconsistency detection timestamp */
  lastInconsistencyTime?: number;
}

/**
 * Sync error with recovery information
 */
export interface SyncError {
  /** Error type classification */
  type: SyncErrorType;
  /** Human-readable error message */
  message: string;
  /** Error code for programmatic handling */
  code?: string;
  /** Timestamp when error occurred */
  timestamp: number;
  /** Additional error context */
  context: Record<string, unknown>;
  /** Whether error can be retried */
  retryable: boolean;
  /** Current retry count */
  retryCount: number;
  /** Maximum retry attempts */
  maxRetries: number;
  /** Next retry timestamp */
  nextRetryAt?: number;
  /** Error fingerprint for deduplication and tracking */
  fingerprint: string;
}

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
 * Error severity levels
 */
export type ErrorSeverity = "low" | "medium" | "high" | "critical";

/**
 * Error category types
 */
export type ErrorCategory = "connection" | "data" | "auth" | "system" | "user";

/**
 * Enhanced sync error with recovery metadata
 */
export interface EnhancedSyncError extends SyncError {
  /** Error severity level */
  severity: ErrorSeverity;
  /** Error category for grouping */
  category: ErrorCategory;
  /** Recovery strategy recommendation */
  recoveryStrategy: RecoveryStrategyType;
  /** User-friendly error message */
  userMessage: string;
  /** Actionable recovery options for user */
  userActions: UserAction[];
  /** Technical details for debugging */
  technicalDetails: TechnicalDetails;
}

/**
 * Recovery strategy types
 */
export type RecoveryStrategyType =
  | "immediate_retry"
  | "exponential_backoff"
  | "fallback_connection"
  | "force_sync"
  | "user_intervention"
  | "system_restart"
  | "no_recovery";

/**
 * User action for error recovery
 */
export interface UserAction {
  /** Action identifier */
  id: string;
  /** User-facing label */
  label: string;
  /** Action description */
  description: string;
  /** Action type */
  type: "retry" | "refresh" | "reload" | "contact_support" | "dismiss";
  /** Whether action is primary (highlighted) */
  primary: boolean;
  /** Action handler function */
  handler: () => void | Promise<void>;
  /** Whether action is available */
  available: boolean;
}

/**
 * Technical error details for debugging
 */
export interface TechnicalDetails {
  /** Stack trace if available */
  stackTrace?: string;
  /** Request/response details */
  requestDetails?: {
    url?: string;
    method?: string;
    headers?: Record<string, string>;
    body?: unknown;
  };
  /** Response details */
  responseDetails?: {
    status?: number;
    statusText?: string;
    headers?: Record<string, string>;
    body?: unknown;
  };
  /** Browser/environment info */
  environment: BrowserEnvironment;
  /** Additional context */
  additionalContext: Record<string, unknown>;
}

/**
 * Error context for debugging and tracking
 */
export interface ErrorContext {
  /** Component where error occurred */
  component: string;
  /** Action being performed */
  action: string;
  /** User ID if available */
  userId?: string;
  /** Session ID */
  sessionId: string;
  /** Dashboard section affected */
  section?: string;
  /** Data being processed */
  data?: unknown;
  /** Previous errors in session */
  errorHistory: string[];
  /** Performance metrics at time of error */
  performance: PerformanceContext;
  /** Browser environment details */
  environment: BrowserEnvironment;
  /** Request context if applicable */
  request?: RequestContext;
  /** Additional metadata */
  metadata: Record<string, unknown>;
}

/**
 * Browser environment information
 */
export interface BrowserEnvironment {
  /** User agent string */
  userAgent: string;
  /** Current URL */
  url: string;
  /** Timestamp when captured */
  timestamp: number;
  /** Connection type if available */
  connectionType?: string;
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
  /** Browser memory info if available */
  memory?: MemoryInfo;
  /** Connection info if available */
  connection?: NetworkInformation;
}

/**
 * Performance context at time of error
 */
export interface PerformanceContext {
  /** Memory usage at time of error */
  memoryUsage: number;
  /** Connection latency if available */
  latency?: number;
  /** Operation duration before error */
  operationDuration: number;
  /** CPU usage estimate */
  cpuUsage?: number;
  /** Performance timing if available */
  timing?: PerformanceTiming;
}

/**
 * Request context for API-related errors
 */
export interface RequestContext {
  /** Request URL */
  url: string;
  /** HTTP method */
  method: string;
  /** Request headers */
  headers: Record<string, string>;
  /** Request body */
  body?: unknown;
  /** Request timeout */
  timeout?: number;
  /** Retry count */
  retryCount: number;
}

/**
 * Browser memory information (if available)
 */
export interface MemoryInfo {
  /** Used JS heap size in bytes */
  usedJSHeapSize: number;
  /** Total JS heap size in bytes */
  totalJSHeapSize: number;
  /** JS heap size limit in bytes */
  jsHeapSizeLimit: number;
}

/**
 * Network connection information (if available)
 */
export interface NetworkInformation {
  /** Effective connection type */
  effectiveType: "slow-2g" | "2g" | "3g" | "4g";
  /** Downlink speed in Mbps */
  downlink: number;
  /** Round trip time in ms */
  rtt: number;
  /** Whether data saver is enabled */
  saveData: boolean;
}

/**
 * Performance timing information
 */
export interface PerformanceTiming {
  /** Navigation start time */
  navigationStart: number;
  /** DOM content loaded time */
  domContentLoadedEventEnd: number;
  /** Load event end time */
  loadEventEnd: number;
  /** First paint time */
  firstPaint?: number;
  /** First contentful paint time */
  firstContentfulPaint?: number;
}

// ================================
// DATA CONSISTENCY INTERFACES
// ================================

/**
 * Enhanced user statistics with consistency validation
 */
export interface ConsistentUserStats {
  /** Total number of favorites */
  totalFavorites: number;
  /** Total number of downloads */
  totalDownloads: number;
  /** Total number of orders */
  totalOrders: number;
  /** Total amount spent (always in dollars) */
  totalSpent: number;
  /** Recent activity count */
  recentActivity: number;
  /** Download quota used */
  quotaUsed: number;
  /** Download quota limit */
  quotaLimit: number;
  /** Monthly downloads count */
  monthlyDownloads: number;
  /** Monthly orders count */
  monthlyOrders: number;
  /** Monthly revenue (always in dollars) */
  monthlyRevenue: number;

  // Consistency validation metadata
  /** Timestamp when stats were calculated */
  calculatedAt: string;
  /** Hash of the data for consistency validation */
  dataHash: string;
  /** Source of the calculation */
  source: "database" | "cache" | "optimistic";
  /** Version number for conflict resolution */
  version: number;
}

/**
 * Data consistency validation result
 */
export interface ValidationResult {
  /** Whether data is valid */
  valid: boolean;
  /** Validation errors found */
  errors: ValidationError[];
  /** Validation warnings */
  warnings: ValidationWarning[];
  /** Hash of validated data */
  dataHash: string;
  /** Validation timestamp */
  validatedAt: number;
}

/**
 * Cross-section validation result
 */
export interface CrossValidationResult {
  /** Whether data is consistent across sections */
  consistent: boolean;
  /** Inconsistencies found */
  inconsistencies: Inconsistency[];
  /** Sections affected by inconsistencies */
  affectedSections: string[];
  /** Recommended action to resolve inconsistencies */
  recommendedAction: "sync" | "reload" | "ignore";
}

/**
 * Data inconsistency details
 */
export interface Inconsistency {
  /** Type of inconsistency */
  type: "calculation" | "timing" | "missing_data" | "duplicate_data";
  /** Sections involved in inconsistency */
  sections: string[];
  /** Description of the inconsistency */
  description: string;
  /** Severity level */
  severity: "low" | "medium" | "high" | "critical";
  /** Whether inconsistency can be auto-resolved */
  autoResolvable: boolean;
  /** When inconsistency was detected */
  detectedAt: number;
  /** Expected vs actual values */
  expectedValue?: unknown;
  actualValue?: unknown;
}

/**
 * Validation error
 */
export interface ValidationError {
  /** Field that failed validation */
  field: string;
  /** Error message */
  message: string;
  /** Error code */
  code: string;
  /** Expected value or format */
  expected?: unknown;
  /** Actual value received */
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
  /** Suggested action */
  suggestion?: string;
}

// ================================
// OPTIMISTIC UPDATES
// ================================

/**
 * Optimistic update for immediate UI feedback
 */
export interface OptimisticUpdate<T = OptimisticUpdateData> {
  /** Unique update identifier */
  id: string;
  /** Type of update operation */
  type: "add" | "update" | "delete";
  /** Dashboard section affected */
  section: string;
  /** Update data with required id property */
  data: T;
  /** Update timestamp */
  timestamp: number;
  /** Whether update has been confirmed by server */
  confirmed: boolean;
  /** Data to restore if rollback is needed */
  rollbackData?: T;
  /** User ID who initiated the update */
  userId?: string;
  /** Correlation ID for tracking related updates */
  correlationId?: string;
}

/**
 * Base type for optimistic update data - ensures id property exists
 */
export interface OptimisticUpdateData {
  /** Required id property for all optimistic update data */
  id: string;
  /** Additional properties can be added by extending types */
  [key: string]: unknown;
}

/**
 * Conflict resolution for simultaneous updates
 */
export interface DataConflict<T = OptimisticUpdateData> {
  /** Conflict identifier */
  id: string;
  /** Conflicting updates */
  updates: OptimisticUpdate<T>[];
  /** Conflict type */
  type: "concurrent_update" | "version_mismatch" | "data_corruption";
  /** Conflict description */
  description: string;
  /** Possible resolution strategies */
  resolutionStrategies: ConflictResolutionStrategy[];
  /** Detected timestamp */
  detectedAt: number;
  /** Affected resource type */
  resourceType: string;
  /** Affected resource ID */
  resourceId: string;
  /** Conflict severity */
  severity: "low" | "medium" | "high" | "critical";
  /** Whether conflict can be auto-resolved */
  autoResolvable: boolean;
}

/**
 * Conflict resolution strategy
 */
export interface ConflictResolutionStrategy {
  /** Strategy type */
  type: "server_wins" | "client_wins" | "merge" | "manual" | "last_write_wins" | "user_choice";
  /** Strategy description */
  description: string;
  /** Whether strategy can be applied automatically */
  automatic: boolean;
  /** Confidence score (0-1) */
  confidence: number;
  /** Strategy priority (higher = preferred) */
  priority: number;
  /** Conditions for applying this strategy */
  conditions?: (conflict: DataConflict) => boolean;
}

/**
 * Conflict resolution result
 */
export interface ConflictResolution {
  /** Resolution strategy used */
  strategy: ConflictResolutionStrategy;
  /** Resolved data */
  resolvedData: unknown;
  /** Whether resolution was successful */
  success: boolean;
  /** Resolution timestamp */
  resolvedAt: number;
  /** Additional resolution details */
  details?: Record<string, unknown>;
}

// ================================
// EVENT SYSTEM
// ================================

/**
 * Dashboard event for real-time communication
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
  /** Unique event identifier */
  id: string;
  /** Correlation ID for related events */
  correlationId?: string;
  /** User ID associated with event */
  userId?: string;
  /** Event priority */
  priority?: "low" | "normal" | "high" | "critical";
}

/**
 * Event subscription options
 */
export interface SubscriptionOptions {
  /** Whether to receive historical events */
  includeHistory?: boolean;
  /** Maximum number of historical events */
  historyLimit?: number;
  /** Event priority filter */
  priorityFilter?: ("low" | "normal" | "high" | "critical")[];
  /** Whether subscription should persist across page reloads */
  persistent?: boolean;
}

/**
 * Dashboard event types with payloads
 */
export type DashboardEventTypes = {
  "data.updated": { section: string; data: Partial<DashboardData> };
  "data.inconsistency": { sections: string[]; details: Inconsistency };
  "connection.status": { status: SyncStatus };
  "optimistic.applied": { update: OptimisticUpdate };
  "optimistic.rollback": { updateId: string; reason: string };
  "sync.forced": { trigger: "user" | "system" | "error" };
  "error.sync": { error: SyncError; context: Record<string, unknown> };
  "user.action": { action: string; data: Record<string, unknown> };
  "system.maintenance": { message: string; duration?: number };
};

// ================================
// SYNC RESULT INTERFACES
// ================================

/**
 * Synchronization operation result
 */
export interface SyncResult {
  /** Whether sync was successful */
  success: boolean;
  /** Sections that were synchronized */
  syncedSections: string[];
  /** Errors that occurred during sync */
  errors: SyncError[];
  /** Sync operation duration in milliseconds */
  duration: number;
  /** Data changes applied */
  dataChanges: DataChange[];
  /** Number of inconsistencies resolved */
  inconsistenciesResolved: number;
  /** Sync timestamp */
  syncedAt: number;
}

/**
 * Data change record
 */
export interface DataChange {
  /** Section that changed */
  section: string;
  /** Type of change */
  type: "create" | "update" | "delete";
  /** Changed data */
  data: unknown;
  /** Previous data (for updates/deletes) */
  previousData?: unknown;
  /** Change timestamp */
  timestamp: number;
  /** Change source */
  source: "server" | "optimistic" | "conflict_resolution";
}

// ================================
// MEMORY MANAGEMENT
// ================================

/**
 * Memory usage statistics
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
  /** Memory usage timestamp */
  measuredAt: number;
}

/**
 * Memory limits configuration
 */
export interface MemoryLimits {
  /** Maximum cache size in bytes */
  maxCacheSize: number;
  /** Maximum event history size in bytes */
  maxEventHistorySize: number;
  /** Maximum number of subscriptions */
  maxSubscriptions: number;
  /** Maximum number of pending updates */
  maxPendingUpdates: number;
  /** Memory cleanup threshold */
  cleanupThreshold: number;
}

// ================================
// SERVICE INTERFACES
// ================================

/**
 * Sync Manager interface for real-time data synchronization
 */
export interface SyncManagerInterface {
  /** Start synchronization */
  startSync(): Promise<void>;
  /** Stop synchronization */
  stopSync(): void;
  /** Force complete synchronization of all data */
  forceSyncAll(): Promise<void>;
  /** Validate data consistency */
  validateDataConsistency(): Promise<boolean>;
  /** Get current sync status */
  getStatus(): SyncStatus;
  /** Get sync metrics */
  getMetrics(): SyncMetrics;
  /** Enable/disable debug mode */
  enableDebugMode(enabled: boolean): void;
  /** Destroy the sync manager */
  destroy(): void;
}

/**
 * Connection Manager interface for connection management
 */
export interface ConnectionManagerInterface {
  /** Connect using best available strategy */
  connect(): Promise<void>;
  /** Disconnect current connection */
  disconnect(): void;
  /** Reconnect with exponential backoff */
  reconnect(): Promise<void>;
  /** Send message through current connection */
  send(message: ConnectionMessage): Promise<void>;
  /** Enable fallback strategy */
  enableFallback(strategy: FallbackStrategy): void;
  /** Get current connection strategy */
  getCurrentStrategy(): ConnectionStrategy;
  /** Get connection metrics */
  getConnectionMetrics(): ConnectionMetrics;
  /** Register status change handler */
  onStatusChange(callback: (status: ConnectionStatus) => void): () => void;
  /** Register message handler */
  onMessage(handler: (message: ConnectionMessage) => void): () => void;
  /** Register error handler */
  onError(handler: (error: Error) => void): () => void;
  /** Fallback to polling connection */
  fallbackToPolling(): void;
  /** Destroy the connection manager */
  destroy(): void;
}

/**
 * Event Bus interface for event communication
 */
export interface EventBusInterface {
  /** Publish an event */
  publish<T>(event: DashboardEvent<T>): void;
  /** Subscribe to events */
  subscribe<T>(
    eventType: string,
    handler: (event: DashboardEvent<T>) => void,
    options?: SubscriptionOptions
  ): () => void;
  /** Subscribe to multiple event types */
  subscribeToMultiple<T>(
    eventTypes: string[],
    handler: (event: DashboardEvent<T>) => void,
    options?: SubscriptionOptions
  ): () => void;
  /** Publish and wait for completion */
  publishAndWait<T>(event: DashboardEvent<T>): Promise<void>;
  /** Clear all listeners */
  clear(): void;
  /** Get subscriber count */
  getSubscribers(eventType: string): number;
  /** Get active event types */
  getActiveEventTypes(): string[];
  /** Enable logging */
  enableLogging(enabled: boolean): void;
  /** Enable debug mode */
  enableDebugMode(enabled: boolean): void;
  /** Get event history */
  getEventHistory(): EventHistory[];
  /** Get recent events */
  getRecentEvents(eventType?: string, limit?: number): EventHistory[];
  /** Get metrics */
  getMetrics(): EventMetrics;
  /** Add listener (EventEmitter method) */
  addListener(eventName: string | symbol, listener: (...args: unknown[]) => void): this;
  /** Prepend listener (EventEmitter method) */
  prependListener(eventName: string | symbol, listener: (...args: unknown[]) => void): this;
}

/**
 * Connection message for communication
 */
export interface ConnectionMessage {
  type: string;
  payload?: unknown;
  id?: string;
  timestamp?: number;
}

/**
 * Connection strategy types
 */
export type ConnectionStrategy = "websocket" | "polling" | "offline";

/**
 * Fallback strategy types
 */
export type FallbackStrategy = "immediate" | "delayed" | "manual";

/**
 * Connection metrics
 */
export interface ConnectionMetrics {
  status: ConnectionStatus;
  strategyPerformance: Map<ConnectionStrategy, StrategyMetrics>;
  totalConnections: number;
  totalReconnections: number;
  totalErrors: number;
  averageLatency: number;
  dataTransferred: number;
  lastActivity: number;
}

/**
 * Strategy performance metrics
 */
export interface StrategyMetrics {
  attempts: number;
  successes: number;
  failures: number;
  averageLatency: number;
  lastUsed: number;
}

/**
 * Event history for debugging
 */
export interface EventHistory {
  event: DashboardEvent;
  subscribers: number;
  processingTime: number;
}

/**
 * Event metrics
 */
export interface EventMetrics {
  totalEvents: number;
  eventsPerSecond: number;
  averageProcessingTime: number;
  subscriberCount: number;
  duplicatesFiltered: number;
  errorsCount: number;
}

// ================================
// RECOVERY ACTIONS
// ================================

/**
 * Recovery action for error handling
 */
export type RecoveryAction =
  | { type: "retry"; delay: number }
  | { type: "fallback"; strategy: "polling" | "cache" }
  | { type: "force_sync"; sections?: string[] }
  | { type: "reload"; full: boolean }
  | { type: "notify_user"; message: string };

/**
 * Time period for analytics and trends
 */
export type TimePeriod = "7d" | "30d" | "90d" | "1y";

// ================================
// HANDLER FUNCTION TYPES
// ================================

/**
 * Error handler function type
 */
export type ErrorHandler = (
  error: EnhancedSyncError,
  context: ErrorContext
) => void | Promise<void>;

/**
 * Recovery handler function type
 */
export type RecoveryHandler = (
  error: EnhancedSyncError,
  attempt: number
) => boolean | Promise<boolean>;

/**
 * Status change handler function type
 */
export type StatusChangeHandler = (status: ConnectionStatus) => void;

/**
 * Message handler function type
 */
export type MessageHandler = (message: ConnectionMessage) => void;

/**
 * Event handler function type
 */
export type EventHandler<T = unknown> = (event: DashboardEvent<T>) => void;

/**
 * Generic handler result type
 */
export type HandlerResult = void | Promise<void> | boolean | Promise<boolean>;

/**
 * Handler function with error handling
 */
export interface SafeHandler<T extends (...args: unknown[]) => unknown> {
  /** The actual handler function */
  handler: T;
  /** Error handling for the handler */
  onError?: (error: Error, ...args: Parameters<T>) => void;
  /** Whether to continue execution if handler fails */
  continueOnError?: boolean;
}
