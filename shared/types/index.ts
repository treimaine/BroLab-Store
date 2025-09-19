// Central export file for all shared types

// API types
export * from "./api";

// Analytics types
export * from "./analytics";

// System optimization types (avoiding duplicates with core)
export type {
  BundleAnalysis,
  BundleComparison,
  BundleOptimizer,
  CacheConfig,
  // Cache Manager types
  CacheEntry,
  CacheManager,
  CacheStats,
  // Bundle optimization types
  ChunkInfo,
  // Data consistency types
  ConflictResolution,
  DataConflict,
  DataConsistencyManager,
  ErrorBoundaryManager,
  ErrorContext,
  ErrorLog,
  ErrorStats,
  ErrorTracker,
  ErrorTrend,
  // System health types
  HealthCheck,
  HealthMonitor,
  LoadingManager,
  // User experience types
  LoadingState,
  MetricTrend,
  OfflineManager,
  // Offline support types
  OfflineOperation,
  OptimisticUpdate,
  OptimisticUpdateManager,
  OptimizationRecommendation,
  // Monitoring types
  PerformanceMetric,
  PerformanceMonitor,
  RateLimit,
  RateLimitResult,
  RateLimitStats,
  RateLimiter,
  RecoveryOption,
  RetryAttempt,
  // Error Handler types
  RetryConfig,
  RetryManager,
  RollbackOperation,
  SyncError,
  SyncManager,
  // Sync Manager types
  SyncOperation,
  SyncStatus,
  SystemHealth,
  TimeRange,
  Timer,
  WebVitals,
  // Security types
  WebhookValidationConfig,
  WebhookValidator,
} from "./system-optimization";

// Re-export commonly used types from schema
export type {
  ActivityLog,
  Beat,
  BeatProduct,
  CartItem,
  Download,
  File,
  LicenseTypeEnum,
  Order,
  OrderStatusEnum,
  ProductLike,
  Reservation,
  ReservationStatusEnum,
  ServiceOrder,
  ServiceTypeEnum,
  Subscription,
  User,
  WishlistItem,
} from "../schema";

// Re-export validation types
export type {
  CreateSubscriptionInput,
  LoginInput,
  PaymentIntentInput,
  RegisterInput,
  UpdateProfileInput,
} from "../validation";
