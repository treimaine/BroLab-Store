// Core system optimization interfaces for performance, error handling, and monitoring

import { ErrorType } from "../constants/errors";

// ================================
// SYNC MANAGER INTERFACES
// ================================

export interface SyncOperation {
  id: string;
  type: "user" | "data" | "preferences" | "sync" | "cache_invalidation";
  payload: Record<string, unknown>;
  priority: "low" | "medium" | "high" | "critical";
  retryCount: number;
  maxRetries: number;
  createdAt: number;
  scheduledAt?: number;
  completedAt?: number;
  errorMessage?: string;
  userId?: string;
  sessionId?: string;
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

export interface SyncError {
  operationId: string;
  message: string;
  timestamp: number;
  retryCount: number;
  errorType: ErrorType;
  context?: Record<string, unknown>;
}

export interface SyncManager {
  scheduleSync(operation: Omit<SyncOperation, "id" | "createdAt" | "retryCount">): Promise<string>;
  cancelPendingSync(operationId: string): Promise<boolean>;
  getSyncStatus(): Promise<SyncStatus>;
  processPendingOperations(): Promise<void>;
  clearCompletedOperations(): Promise<void>;
  pauseSync(): Promise<void>;
  resumeSync(): Promise<void>;
  getOperationHistory(limit?: number): Promise<SyncOperation[]>;
}

// ================================
// CACHE MANAGER INTERFACES
// ================================

export interface CacheEntry<T = unknown> {
  key: string;
  value: T;
  createdAt: number;
  expiresAt: number;
  accessCount: number;
  lastAccessed: number;
  size: number;
  tags?: string[];
  compressed?: boolean;
}

export interface CacheConfig {
  defaultTTL: number; // milliseconds
  maxSize: number; // bytes
  maxEntries: number;
  strategy: "LRU" | "LFU" | "FIFO";
  enableCompression: boolean;
  compressionThreshold: number; // bytes
  enablePersistence?: boolean;
  persistencePath?: string;
}

export interface CacheStats {
  totalEntries: number;
  totalSize: number;
  hitRate: number;
  missRate: number;
  evictionCount: number;
  lastEvictionAt?: number;
  compressionRatio?: number;
  memoryUsage: number;
}

export interface CacheManager {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttl?: number, tags?: string[]): Promise<void>;
  delete(key: string): Promise<boolean>;
  invalidate(pattern: string): Promise<number>;
  invalidateByTags(tags: string[]): Promise<number>;
  clear(): Promise<void>;
  getStats(): Promise<CacheStats>;
  cleanup(): Promise<void>;
  exists(key: string): Promise<boolean>;
  touch(key: string, ttl?: number): Promise<boolean>;
}

// ================================
// ERROR HANDLER INTERFACES
// ================================

export interface RetryConfig {
  maxRetries: number;
  baseDelay: number; // milliseconds
  maxDelay: number; // milliseconds
  backoffFactor: number;
  jitter: boolean;
  retryCondition: (error: Error) => boolean;
  onRetry?: (error: Error, attemptNumber: number) => void;
}

export interface RetryAttempt {
  attemptNumber: number;
  delay: number;
  error?: Error;
  timestamp: number;
  success: boolean;
}

export interface RetryManager {
  executeWithRetry<T>(operation: () => Promise<T>, config?: Partial<RetryConfig>): Promise<T>;
  getDefaultConfig(): RetryConfig;
  setDefaultConfig(config: Partial<RetryConfig>): void;
  getRetryHistory(operationId?: string): Promise<RetryAttempt[]>;
}

export interface ErrorContext {
  component: string;
  action: string;
  userId?: string;
  sessionId?: string;
  requestId?: string;
  timestamp: number;
  metadata: Record<string, unknown>;
  stackTrace?: string;
  userAgent?: string;
  ipAddress?: string;
  url?: string;
  method?: string;
}

export interface RecoveryOption {
  id: string;
  label: string;
  description: string;
  action: () => Promise<void>;
  isDestructive: boolean;
  estimatedTime?: number;
  requiresConfirmation: boolean;
}

export interface ErrorBoundaryManager {
  captureError(error: Error, context: ErrorContext): void;
  getErrorRecoveryOptions(error: Error): RecoveryOption[];
  reportError(error: Error, context: ErrorContext): Promise<void>;
  clearErrors(): void;
  getErrorHistory(limit?: number): Promise<ErrorLog[]>;
  markErrorResolved(errorId: string, notes?: string): Promise<void>;

  // Enhanced error tracking and analytics methods
  getErrorStats(timeRange: TimeRange): Promise<ErrorStats>;
  getErrorTrends(timeRange: TimeRange): Promise<ErrorTrend[]>;
  getTopErrors(limit?: number): Promise<Array<{ error: string; count: number }>>;
  getErrorsByComponent(component: string): Promise<ErrorLog[]>;
  onErrorTrend(callback: (error: ErrorLog, trend: ErrorTrend) => void): void;
  setPerformanceMonitor(monitor: any): void;
}

export interface ErrorLog {
  id: string;
  message: string;
  stack?: string;
  level: "error" | "warning" | "info" | "debug";
  component: string;
  action: string;
  userId?: string;
  sessionId?: string;
  timestamp: number;
  metadata: Record<string, unknown>;
  resolved: boolean;
  resolutionNotes?: string;
  resolutionTimestamp?: number;
  errorType: ErrorType;
  severity: "low" | "medium" | "high" | "critical";
}

// ================================
// SECURITY INTERFACES
// ================================

export interface WebhookValidationConfig {
  secret: string;
  timestampTolerance: number; // seconds
  requiredHeaders: string[];
  allowedIPs?: string[];
  algorithm?: "sha256" | "sha1";
}

export interface WebhookValidator {
  validateSignature(payload: string, signature: string, secret: string): boolean;
  validateTimestamp(timestamp: number, tolerance: number): boolean;
  sanitizePayload<T>(payload: T): T;
  validateHeaders(headers: Record<string, string>): boolean;
  validateIP(ip: string, allowedIPs: string[]): boolean;
}

export interface RateLimit {
  windowMs: number;
  maxRequests: number;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
  keyGenerator?: (identifier: string) => string;
  onLimitReached?: (identifier: string) => void;
  message?: string;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetTime: number;
  totalRequests: number;
  retryAfter?: number;
}

export interface RateLimiter {
  checkLimit(key: string, limit: RateLimit): Promise<RateLimitResult>;
  resetLimit(key: string): Promise<void>;
  getStats(key: string): Promise<RateLimitStats>;
  incrementCounter(key: string): Promise<number>;
  getGlobalStats(): Promise<Record<string, RateLimitStats>>;
}

export interface RateLimitStats {
  key: string;
  requests: number;
  remaining: number;
  resetTime: number;
  windowStart: number;
  blocked: number;
}

// ================================
// MONITORING INTERFACES
// ================================

export interface PerformanceMetric {
  id: string;
  name: string;
  value: number;
  unit: string;
  timestamp: number;
  tags: Record<string, string>;
  sessionId: string;
  userId?: string;
  component?: string;
}

export interface WebVitals {
  FCP: number; // First Contentful Paint
  LCP: number; // Largest Contentful Paint
  CLS: number; // Cumulative Layout Shift
  FID: number; // First Input Delay
  TTFB: number; // Time to First Byte
  INP?: number; // Interaction to Next Paint
  url: string;
  timestamp: number;
}

export interface Timer {
  name: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  tags?: Record<string, string>;
  stop(): number;
}

export interface PerformanceMonitor {
  trackMetric(name: string, value: number, tags?: Record<string, string>): void;
  startTimer(name: string, tags?: Record<string, string>): Timer;
  recordWebVitals(vitals: WebVitals): void;
  getMetrics(timeRange?: TimeRange): Promise<PerformanceMetric[]>;
  clearMetrics(): Promise<void>;
  getAverageMetric(name: string, timeRange?: TimeRange): Promise<number>;
  getMetricTrends(name: string, timeRange?: TimeRange): Promise<MetricTrend[]>;
}

export interface MetricTrend {
  timestamp: number;
  value: number;
  change: number; // percentage change from previous
}

export interface ErrorStats {
  totalErrors: number;
  errorsByType: Record<string, number>;
  errorsByComponent: Record<string, number>;
  resolutionRate: number;
  averageResolutionTime: number;
  criticalErrors: number;
  recentErrors: number;
}

export interface ErrorTrend {
  timestamp: number;
  errorCount: number;
  errorType: string;
  component: string;
  severity: string;
}

export interface ErrorTracker {
  trackError(error: Error, context: ErrorContext): void;
  getErrorStats(timeRange: TimeRange): Promise<ErrorStats>;
  getErrorTrends(timeRange: TimeRange): Promise<ErrorTrend[]>;
  markErrorResolved(errorId: string, notes?: string): Promise<void>;
  getTopErrors(limit?: number): Promise<Array<{ error: string; count: number }>>;
  getErrorsByComponent(component: string): Promise<ErrorLog[]>;
}

export interface TimeRange {
  start: number;
  end: number;
}

// ================================
// BUNDLE OPTIMIZATION INTERFACES
// ================================

export interface ChunkInfo {
  name: string;
  size: number;
  gzipSize: number;
  modules: string[];
  dependencies: string[];
  isAsync: boolean;
  isEntry: boolean;
}

export interface OptimizationRecommendation {
  type: "code_splitting" | "tree_shaking" | "compression" | "lazy_loading" | "bundle_analysis";
  description: string;
  estimatedSavings: number; // bytes
  priority: "low" | "medium" | "high";
  implementation: string;
  effort: "low" | "medium" | "high";
}

export interface BundleAnalysis {
  totalSize: number;
  gzipSize: number;
  chunks: ChunkInfo[];
  recommendations: OptimizationRecommendation[];
  duplicateModules: string[];
  unusedModules: string[];
  largestModules: Array<{ name: string; size: number }>;
  compressionRatio: number;
}

export interface BundleOptimizer {
  analyzeBundleSize(): Promise<BundleAnalysis>;
  implementCodeSplitting(components: string[]): Promise<void>;
  optimizeAssets(): Promise<void>;
  generateReport(): Promise<string>;
  trackBundleSize(): Promise<void>;
  compareWithBaseline(baseline: BundleAnalysis): Promise<BundleComparison>;
}

export interface BundleComparison {
  sizeDifference: number;
  percentageChange: number;
  newChunks: string[];
  removedChunks: string[];
  modifiedChunks: Array<{ name: string; sizeDifference: number }>;
}

// ================================
// DATA CONSISTENCY INTERFACES
// ================================

export interface ConflictResolution {
  strategy: "last_write_wins" | "merge" | "user_choice" | "custom";
  resolver?: (local: unknown, remote: unknown) => unknown;
  priority?: "local" | "remote" | "newest" | "manual";
}

export interface DataConflict {
  id: string;
  resourceType: string;
  resourceId: string;
  localValue: unknown;
  remoteValue: unknown;
  timestamp: number;
  resolution?: ConflictResolution;
  status: "pending" | "resolved" | "ignored";
  metadata?: Record<string, unknown>;
}

export interface RollbackOperation {
  id: string;
  operationType: string;
  resourceId: string;
  previousState: unknown;
  currentState: unknown;
  timestamp: number;
  canRollback: boolean;
  dependencies?: string[];
  metadata?: Record<string, unknown>;
}

export interface DataConsistencyManager {
  detectConflicts(resourceType: string, resourceId: string): Promise<DataConflict[]>;
  resolveConflict(conflictId: string, resolution: ConflictResolution): Promise<void>;
  createRollbackPoint(operationType: string, resourceId: string, state: unknown): Promise<string>;
  rollback(rollbackId: string): Promise<void>;
  validateConsistency(resourceType: string): Promise<boolean>;
  getConflictHistory(resourceId?: string): Promise<DataConflict[]>;
  autoResolveConflicts(strategy: ConflictResolution["strategy"]): Promise<number>;
}

// ================================
// SYSTEM HEALTH INTERFACES
// ================================

export interface HealthCheck {
  name: string;
  status: "healthy" | "degraded" | "unhealthy";
  message?: string;
  timestamp: number;
  responseTime?: number;
  metadata?: Record<string, unknown>;
  critical: boolean;
}

export interface SystemHealth {
  overall: "healthy" | "degraded" | "unhealthy";
  checks: HealthCheck[];
  timestamp: number;
  uptime: number;
  version?: string;
  environment?: string;
}

export interface HealthMonitor {
  registerCheck(name: string, check: () => Promise<HealthCheck>, critical?: boolean): void;
  runChecks(): Promise<SystemHealth>;
  getHealth(): Promise<SystemHealth>;
  isHealthy(): Promise<boolean>;
  getCheckHistory(checkName: string): Promise<HealthCheck[]>;
  removeCheck(name: string): void;
}

// ================================
// OFFLINE SUPPORT INTERFACES
// ================================

export interface OfflineOperation {
  id: string;
  type: string;
  data: unknown;
  timestamp: number;
  retryCount: number;
  status: "pending" | "syncing" | "completed" | "failed";
}

export interface OfflineManager {
  isOnline(): boolean;
  queueOperation(
    operation: Omit<OfflineOperation, "id" | "timestamp" | "retryCount" | "status">
  ): Promise<string>;
  syncPendingOperations(): Promise<void>;
  getPendingOperations(): Promise<OfflineOperation[]>;
  clearCompletedOperations(): Promise<void>;
  onOnline(callback: () => void): void;
  onOffline(callback: () => void): void;
}

// ================================
// USER EXPERIENCE INTERFACES
// ================================

export interface LoadingState {
  isLoading: boolean;
  message?: string;
  progress?: number;
  estimatedTime?: number;
  cancellable?: boolean;
}

export interface LoadingManager {
  startLoading(id: string, message?: string): void;
  updateProgress(id: string, progress: number, message?: string): void;
  stopLoading(id: string): void;
  getLoadingState(id: string): LoadingState | null;
  getAllLoadingStates(): Record<string, LoadingState>;
}

export interface OptimisticUpdate<T = unknown> {
  id: string;
  operation: string;
  optimisticData: T;
  rollbackData: T;
  timestamp: number;
  confirmed: boolean;
}

export interface OptimisticUpdateManager {
  applyOptimisticUpdate<T>(
    update: Omit<OptimisticUpdate<T>, "id" | "timestamp" | "confirmed">
  ): string;
  confirmUpdate(updateId: string): void;
  rollbackUpdate(updateId: string): void;
  getPendingUpdates(): OptimisticUpdate[];
  clearConfirmedUpdates(): void;
}
