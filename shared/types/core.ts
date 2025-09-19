// Core system interfaces for performance optimization and type safety

// ================================
// PERFORMANCE OPTIMIZATION TYPES
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
}

export interface SyncStatus {
  isActive: boolean;
  pendingOperations: number;
  lastSyncAt?: number;
  nextSyncAt?: number;
  errors: SyncError[];
}

export interface SyncError {
  operationId: string;
  message: string;
  timestamp: number;
  retryCount: number;
}

export interface SyncManager {
  scheduleSync(operation: Omit<SyncOperation, "id" | "createdAt" | "retryCount">): Promise<string>;
  cancelPendingSync(operationId: string): Promise<boolean>;
  getSyncStatus(): Promise<SyncStatus>;
  processPendingOperations(): Promise<void>;
  clearCompletedOperations(): Promise<void>;
}

// ================================
// CACHE MANAGEMENT TYPES
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
}

export interface CacheConfig {
  defaultTTL: number; // milliseconds
  maxSize: number; // bytes
  maxEntries: number;
  strategy: "LRU" | "LFU" | "FIFO";
  enableCompression: boolean;
  compressionThreshold: number; // bytes
}

export interface CacheStats {
  totalEntries: number;
  totalSize: number;
  hitRate: number;
  missRate: number;
  evictionCount: number;
  lastEvictionAt?: number;
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
}

// ================================
// ERROR HANDLING TYPES
// ================================

export interface RetryConfig {
  maxRetries: number;
  baseDelay: number; // milliseconds
  maxDelay: number; // milliseconds
  backoffFactor: number;
  jitter: boolean;
  retryCondition: (error: Error) => boolean;
}

export interface RetryAttempt {
  attemptNumber: number;
  delay: number;
  error?: Error;
  timestamp: number;
}

export interface RetryManager {
  executeWithRetry<T>(operation: () => Promise<T>, config?: Partial<RetryConfig>): Promise<T>;
  getDefaultConfig(): RetryConfig;
  setDefaultConfig(config: Partial<RetryConfig>): void;
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
}

export interface RecoveryOption {
  id: string;
  label: string;
  description: string;
  action: () => Promise<void>;
  isDestructive: boolean;
}

export interface ErrorBoundaryManager {
  captureError(error: Error, context: ErrorContext): void;
  getErrorRecoveryOptions(error: Error): RecoveryOption[];
  reportError(error: Error, context: ErrorContext): Promise<void>;
  clearErrors(): void;
  getErrorHistory(): ErrorLog[];
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
}

// ================================
// SECURITY TYPES
// ================================

export interface WebhookValidationConfig {
  secret: string;
  timestampTolerance: number; // seconds
  requiredHeaders: string[];
  allowedIPs?: string[];
}

export interface WebhookValidator {
  validateSignature(payload: string, signature: string, secret: string): boolean;
  validateTimestamp(timestamp: number, tolerance: number): boolean;
  sanitizePayload<T>(payload: T): T;
  validateHeaders(headers: Record<string, string>): boolean;
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
  getMetrics(timeRange?: { start: number; end: number }): Promise<{
    totalKeys: number;
    totalRequests: number;
    totalBlocked: number;
    activeWindows: number;
    byAction?: Record<string, number>;
  }>;
  cleanupExpired(olderThanMs?: number): Promise<{ deletedCount: number }>;
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
// MONITORING TYPES
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
}

export interface WebVitals {
  FCP: number; // First Contentful Paint
  LCP: number; // Largest Contentful Paint
  CLS: number; // Cumulative Layout Shift
  FID: number; // First Input Delay
  TTFB: number; // Time to First Byte
  INP?: number; // Interaction to Next Paint
}

export interface Timer {
  name: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  stop(): number;
}

export interface PerformanceMonitor {
  trackMetric(name: string, value: number, tags?: Record<string, string>): void;
  startTimer(name: string): Timer;
  recordWebVitals(vitals: WebVitals): void;
  getMetrics(timeRange?: TimeRange): Promise<PerformanceMetric[]>;
  clearMetrics(): Promise<void>;
}

export interface ErrorStats {
  totalErrors: number;
  errorsByType: Record<string, number>;
  errorsByComponent: Record<string, number>;
  resolutionRate: number;
  averageResolutionTime: number;
}

export interface ErrorTrend {
  timestamp: number;
  errorCount: number;
  errorType: string;
  component: string;
}

export interface ErrorTracker {
  trackError(error: Error, context: ErrorContext): void;
  getErrorStats(timeRange: TimeRange): Promise<ErrorStats>;
  getErrorTrends(timeRange: TimeRange): Promise<ErrorTrend[]>;
  markErrorResolved(errorId: string, notes?: string): Promise<void>;
}

export interface TimeRange {
  start: number;
  end: number;
}

// ================================
// BUNDLE OPTIMIZATION TYPES
// ================================

export interface ChunkInfo {
  name: string;
  size: number;
  gzipSize: number;
  modules: string[];
  dependencies: string[];
}

export interface OptimizationRecommendation {
  type: "code_splitting" | "tree_shaking" | "compression" | "lazy_loading";
  description: string;
  estimatedSavings: number; // bytes
  priority: "low" | "medium" | "high";
  implementation: string;
}

export interface BundleAnalysis {
  totalSize: number;
  gzipSize: number;
  chunks: ChunkInfo[];
  recommendations: OptimizationRecommendation[];
  duplicateModules: string[];
  unusedModules: string[];
}

export interface BundleOptimizer {
  analyzeBundleSize(): Promise<BundleAnalysis>;
  implementCodeSplitting(components: string[]): Promise<void>;
  optimizeAssets(): Promise<void>;
  generateReport(): Promise<string>;
}

// ================================
// DATA CONSISTENCY TYPES
// ================================

export interface ConflictResolution {
  strategy: "last_write_wins" | "merge" | "user_choice" | "custom";
  resolver?: (local: unknown, remote: unknown) => unknown;
}

export interface DataConflict {
  id: string;
  resourceType: string;
  resourceId: string;
  localValue: unknown;
  remoteValue: unknown;
  timestamp: number;
  resolution?: ConflictResolution;
}

export interface RollbackOperation {
  id: string;
  operationType: string;
  resourceId: string;
  previousState: unknown;
  currentState: unknown;
  timestamp: number;
  canRollback: boolean;
}

export interface DataConsistencyManager {
  detectConflicts(resourceType: string, resourceId: string): Promise<DataConflict[]>;
  resolveConflict(conflictId: string, resolution: ConflictResolution): Promise<void>;
  createRollbackPoint(operationType: string, resourceId: string, state: unknown): Promise<string>;
  rollback(rollbackId: string): Promise<void>;
  validateConsistency(resourceType: string): Promise<boolean>;
}

// ================================
// SYSTEM HEALTH TYPES
// ================================

export interface HealthCheck {
  name: string;
  status: "healthy" | "degraded" | "unhealthy";
  message?: string;
  timestamp: number;
  responseTime?: number;
  metadata?: Record<string, unknown>;
}

export interface SystemHealth {
  overall: "healthy" | "degraded" | "unhealthy";
  checks: HealthCheck[];
  timestamp: number;
  uptime: number;
}

export interface HealthMonitor {
  registerCheck(name: string, check: () => Promise<HealthCheck>): void;
  runChecks(): Promise<SystemHealth>;
  getHealth(): Promise<SystemHealth>;
  isHealthy(): Promise<boolean>;
}
