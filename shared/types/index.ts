/**
 * Central Export File for All Shared Types
 *
 * This file provides a centralized export point for all type definitions
 * used across the BroLab Entertainment marketplace platform.
 */

// ================================
// CORE BUSINESS TYPES
// ================================

// Beat/Track types
export * from "./Beat";
export type {
  Beat,
  BeatAnalytics,
  BeatAttribute,
  BeatCategory,
  BeatImage,
  BeatInput,
  BeatMetadata,
  BeatSearchCriteria,
  BeatSearchResults,
  BeatSummary,
  BeatTag,
  LicensePricing,
  LicenseTerms,
  WaveformData,
} from "./Beat";

export {
  AudioFormat,
  BeatGenre,
  BeatMood,
  BeatStatus,
  DEFAULT_LICENSE_TERMS,
  GENRE_BPM_RANGES,
  LICENSE_PRICING,
  LicenseType,
  MusicalKey,
} from "./Beat";

// Order and Payment types
export * from "./Order";
export type {
  BillingAddress,
  BillingInfo,
  FraudCheckResult,
  Order,
  OrderAnalytics,
  OrderInput,
  OrderItem,
  OrderItemMetadata,
  OrderMetadata,
  OrderSearchCriteria,
  OrderSearchResults,
  OrderStatusHistory,
  OrderSummary,
  OrderUpdateInput,
  PaymentInfo,
  RefundInfo,
} from "./Order";

export {
  CURRENCY_SYMBOLS,
  Currency,
  DEFAULT_CURRENCY,
  ORDER_STATUS_TRANSITIONS,
  OrderItemType,
  OrderStatus,
  PAYMENT_METHOD_NAMES,
  PaymentMethod,
  PaymentStatus,
  RefundReason,
} from "./Order";

// User and Subscription types
export * from "./User";
export type {
  AudioPreferences,
  DeviceInfo,
  LocationInfo,
  NotificationPreferences,
  PrivacyPreferences,
  SubscriptionEvent,
  User,
  UserAnalytics,
  UserInput,
  UserMetadata,
  UserPreferences,
  UserProfile,
  UserQuota,
  UserSearchCriteria,
  UserSearchResults,
  UserSubscription,
  UserUpdateInput,
} from "./User";

export {
  AudioQuality,
  AuthMethod,
  DEFAULT_USER_PREFERENCES,
  DownloadFormat,
  InvoiceStatus,
  Language,
  NotificationType,
  PrivacyLevel,
  QuotaType,
  ROLE_PERMISSIONS,
  ResetPeriod,
  ResourceType,
  SUBSCRIPTION_FEATURES,
  SubscriptionPlan,
  SubscriptionStatus,
  Theme,
  UserRole,
  UserStatus,
} from "./User";

// Reservation and Service types
export * from "./Reservation";
export type {
  AvailabilitySlot,
  BudgetRange,
  ContactInfo,
  ProjectRequirements,
  Reservation,
  ReservationAnalytics,
  ReservationDetails,
  ReservationFile,
  ReservationInput,
  ReservationSearchCriteria,
  ReservationSearchResults,
  ReservationStatusHistory,
  ReservationSummary,
  ReservationUpdateInput,
  ServiceDetails,
  ServiceOrder,
  ServicePricing,
  ServiceProvider,
} from "./Reservation";

export {
  BASE_SERVICE_PRICING,
  CommunicationPreference,
  DEFAULT_SERVICE_DURATIONS,
  DeliveryMethod,
  Priority,
  RESERVATION_STATUS_TRANSITIONS,
  ReservationStatus,
  SERVICE_TYPE_NAMES,
  ServiceAudioFormat,
  ServicePriority,
  ServiceQuality,
  ServiceType,
} from "./Reservation";

// Error types
export * from "./Error";
export type {
  BroLabError,
  BroLabErrorDetails,
  ErrorBoundaryState,
  ErrorContext,
  ErrorLog,
  ErrorNotification,
  ErrorRecoveryOption,
  ErrorStats,
} from "./Error";

export {
  BROLAB_ERROR_MESSAGES,
  BroLabErrorType,
  DEFAULT_RECOVERY_OPTIONS,
  ERROR_SEVERITY_COLORS,
  ErrorCategory,
  ErrorSeverity,
} from "./Error";

// System types
export * from "./System";
export type {
  ActivityType,
  AuditAction,
  AuditResource,
  DateRange,
  FileInfo,
  Metadata,
  NumericRange,
  PaginationMeta,
  PaginationParams,
  RateLimitInfo,
  SortParams,
  ApiResponse as SystemApiResponse,
  Timestamps,
} from "./System";

export {
  BillingCycle,
  DATE_FORMATS,
  DEFAULT_PAGINATION,
  DataSource,
  DeviceType,
  FilePurpose,
  FileType,
  NotificationDelivery,
  RATE_LIMITS,
  RateLimitType,
  SUPPORTED_MIME_TYPES,
  FILE_SIZE_LIMITS as SYSTEM_FILE_SIZE_LIMITS,
  TimeZone,
} from "./System";

// ================================
// EXISTING TYPES (Re-exports)
// ================================

// API types
export {
  ActivityDetails,
  ActivityMetadata,
  ApiError,
  ApiRequest,
  ApplePayLineItem,
  ApplePayPaymentRequest,
  ApplePayShippingMethod,
  AuditChange,
  AuditContext,
  AuditDetails,
  AuthErrorResponse,
  AuthenticatedUser,
  BusinessErrorResponse,
  ExternalServiceErrorResponse,
  FileUploadErrorResponse,
  GooglePayMerchantInfo,
  GooglePayPaymentMethod,
  GooglePayPaymentRequest,
  GooglePayTokenizationSpecification,
  GooglePayTransactionInfo,
  PaymentMetadata,
  QuotaUsageMetadata,
  RateLimitErrorResponse,
  SessionData,
  SessionMetadata,
  ValidationErrorResponse,
  WebhookData,
  WebhookMetadata,
  WebhookPayload,
  WooCommerceAttribute,
  WooCommerceCategory,
  WooCommerceDefaultAttribute,
  WooCommerceDimensions,
  WooCommerceDownload,
  WooCommerceImage,
  WooCommerceMetaData,
  WooCommerceProduct,
  WooCommerceTag,
} from "./api";
export * from "./apiEndpoints";
// Note: ErrorResponse is exported from ApiEndpoints, so we don't re-export it here to avoid conflicts

// Analytics types
export * from "./analytics";

// System optimization types
export type {
  BundleAnalysis,
  BundleComparison,
  BundleOptimizer,
  CacheConfig,
  CacheEntry,
  CacheManager,
  CacheStats,
  ChunkInfo,
  ConflictResolution,
  DataConflict,
  DataConsistencyManager,
  ErrorBoundaryManager,
  ErrorTracker,
  ErrorTrend,
  HealthCheck,
  HealthMonitor,
  LoadingManager,
  LoadingState,
  MetricTrend,
  OfflineManager,
  OfflineOperation,
  OptimisticUpdate,
  OptimisticUpdateManager,
  OptimizationRecommendation,
  PerformanceMetric,
  PerformanceMonitor,
  RateLimit,
  RateLimitResult,
  RateLimitStats,
  RateLimiter,
  RecoveryOption,
  RetryAttempt,
  RetryConfig,
  RetryManager,
  RollbackOperation,
  SyncError,
  SyncManager,
  SyncOperation,
  SyncStatus,
  SystemHealth,
  TimeRange,
  Timer,
  WebVitals,
  WebhookValidationConfig,
  WebhookValidator,
} from "./system-optimization";

// Re-export commonly used types from schema
export type {
  ActivityLog,
  BeatProduct,
  CartItem,
  Download,
  File,
  ProductLike,
  ServiceOrder as SchemaServiceOrder,
  Subscription,
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

// ================================
// TYPE UTILITIES
// ================================

/**
 * Utility type for making all properties optional
 */
export type Partial<T> = {
  [P in keyof T]?: T[P];
};

/**
 * Utility type for making specific properties required
 */
export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>;

/**
 * Utility type for omitting specific properties
 */
export type OmitFields<T, K extends keyof T> = Omit<T, K>;

/**
 * Utility type for picking specific properties
 */
export type PickFields<T, K extends keyof T> = Pick<T, K>;

/**
 * Utility type for API responses
 */
export type ApiResponse<T = unknown> = {
  success: boolean;
  data?: T;
  error?: {
    type: string;
    message: string;
    code?: string;
  };
  message?: string;
  timestamp: string;
  requestId?: string;
};

/**
 * Utility type for paginated responses
 */
export type PaginatedResponse<T> = {
  items: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
};

/**
 * Utility type for search/filter criteria
 */
export type SearchCriteria = {
  query?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  limit?: number;
  offset?: number;
};

/**
 * Utility type for timestamp fields
 */
export type TimestampFields = {
  createdAt: string;
  updatedAt?: string;
};

/**
 * Utility type for ID fields
 */
export type WithId<T> = T & { id: number | string };

/**
 * Utility type for optional ID (for creation)
 */
export type WithOptionalId<T> = T & { id?: number | string };

// ================================
// CONSTANTS
// ================================

/** Common HTTP status codes */
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
} as const;

/** Common MIME types for audio files */
export const AUDIO_MIME_TYPES = {
  MP3: "audio/mpeg",
  WAV: "audio/wav",
  FLAC: "audio/flac",
  AIFF: "audio/aiff",
  OGG: "audio/ogg",
  M4A: "audio/mp4",
} as const;

/** Common image MIME types */
export const IMAGE_MIME_TYPES = {
  JPEG: "image/jpeg",
  PNG: "image/png",
  GIF: "image/gif",
  WEBP: "image/webp",
  SVG: "image/svg+xml",
} as const;

/** File size limits (in bytes) */
export const FILE_SIZE_LIMITS = {
  AUDIO_MAX: 100 * 1024 * 1024, // 100MB
  IMAGE_MAX: 10 * 1024 * 1024, // 10MB
  DOCUMENT_MAX: 50 * 1024 * 1024, // 50MB
} as const;

/** Pagination defaults */
export const PAGINATION_DEFAULTS = {
  LIMIT: 20,
  MAX_LIMIT: 100,
  DEFAULT_PAGE: 1,
} as const;
