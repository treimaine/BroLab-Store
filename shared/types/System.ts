/**
 * System-Level Type Definitions for BroLab Entertainment
 *
 * This module contains system-wide enums and types that are used across
 * multiple domains in the BroLab Entertainment marketplace platform.
 */

// ================================
// ENUMS
// ================================

/**
 * Device types for user sessions and analytics
 */
export enum DeviceType {
  DESKTOP = "desktop",
  MOBILE = "mobile",
  TABLET = "tablet",
}

/**
 * Data sources for tracking where data originates
 */
export enum DataSource {
  WEB = "web",
  MOBILE = "mobile",
  API = "api",
  ADMIN = "admin",
  SYSTEM = "system",
}

/**
 * Action types for audit logging
 */
export enum AuditAction {
  CREATE = "create",
  READ = "read",
  UPDATE = "update",
  DELETE = "delete",
  LOGIN = "login",
  LOGOUT = "logout",
  PURCHASE = "purchase",
  DOWNLOAD = "download",
  UPLOAD = "upload",
  PAYMENT = "payment",
  REFUND = "refund",
  SUBSCRIPTION_CHANGE = "subscription_change",
  PERMISSION_CHANGE = "permission_change",
}

/**
 * Resource types for audit logging and permissions
 */
export enum AuditResource {
  USER = "user",
  BEAT = "beat",
  ORDER = "order",
  PAYMENT = "payment",
  SUBSCRIPTION = "subscription",
  RESERVATION = "reservation",
  DOWNLOAD = "download",
  INVOICE = "invoice",
  QUOTA = "quota",
  SYSTEM_SETTING = "system_setting",
}

/**
 * Activity types for user activity tracking
 */
export enum ActivityType {
  BEAT_PLAY = "beat_play",
  BEAT_DOWNLOAD = "beat_download",
  BEAT_FAVORITE = "beat_favorite",
  BEAT_UNFAVORITE = "beat_unfavorite",
  CART_ADD = "cart_add",
  CART_REMOVE = "cart_remove",
  ORDER_PLACED = "order_placed",
  ORDER_COMPLETED = "order_completed",
  SUBSCRIPTION_STARTED = "subscription_started",
  SUBSCRIPTION_CANCELLED = "subscription_cancelled",
  PROFILE_UPDATED = "profile_updated",
  PASSWORD_CHANGED = "password_changed",
  RESERVATION_CREATED = "reservation_created",
  RESERVATION_CANCELLED = "reservation_cancelled",
}

/**
 * File types supported by the platform
 */
export enum FileType {
  AUDIO = "audio",
  IMAGE = "image",
  VIDEO = "video",
  DOCUMENT = "document",
  ARCHIVE = "archive",
}

/**
 * File purposes for categorizing uploads
 */
export enum FilePurpose {
  BEAT_AUDIO = "beat_audio",
  BEAT_COVER = "beat_cover",
  PROFILE_AVATAR = "profile_avatar",
  INVOICE_PDF = "invoice_pdf",
  REFERENCE_MATERIAL = "reference_material",
  SOURCE_FILE = "source_file",
  DELIVERABLE = "deliverable",
  CONTRACT = "contract",
}

/**
 * Notification delivery methods
 */
export enum NotificationDelivery {
  EMAIL = "email",
  PUSH = "push",
  SMS = "sms",
  IN_APP = "in_app",
  WEBHOOK = "webhook",
}

/**
 * Time zones commonly used by the platform
 */
export enum TimeZone {
  UTC = "UTC",
  EST = "America/New_York",
  PST = "America/Los_Angeles",
  GMT = "Europe/London",
  CET = "Europe/Paris",
  JST = "Asia/Tokyo",
  AEST = "Australia/Sydney",
}

/**
 * Billing cycles for subscriptions
 */
export enum BillingCycle {
  MONTHLY = "monthly",
  QUARTERLY = "quarterly",
  YEARLY = "yearly",
}

/**
 * Rate limit types for different operations
 */
export enum RateLimitType {
  API_REQUEST = "api_request",
  FILE_UPLOAD = "file_upload",
  DOWNLOAD = "download",
  LOGIN_ATTEMPT = "login_attempt",
  PASSWORD_RESET = "password_reset",
  EMAIL_SEND = "email_send",
  SEARCH_QUERY = "search_query",
}

// ================================
// CORE INTERFACES
// ================================

/**
 * Generic timestamp interface for entities
 */
export interface Timestamps {
  /** When the entity was created */
  createdAt: string;
  /** When the entity was last updated */
  updatedAt: string;
}

/**
 * Generic metadata interface for flexible data storage
 */
export interface Metadata {
  /** Custom key-value pairs */
  [key: string]: unknown;
}

/**
 * Pagination parameters for list queries
 */
export interface PaginationParams {
  /** Number of items per page */
  limit?: number;
  /** Page offset */
  offset?: number;
  /** Current page number */
  page?: number;
}

/**
 * Pagination response metadata
 */
export interface PaginationMeta {
  /** Total number of items */
  total: number;
  /** Current page */
  page: number;
  /** Items per page */
  limit: number;
  /** Whether there are more pages */
  hasMore: boolean;
  /** Total number of pages */
  totalPages: number;
}

/**
 * Sort parameters for list queries
 */
export interface SortParams {
  /** Field to sort by */
  sortBy?: string;
  /** Sort direction */
  sortOrder?: "asc" | "desc";
}

/**
 * Date range filter for queries
 */
export interface DateRange {
  /** Start date (ISO string) */
  start: string;
  /** End date (ISO string) */
  end: string;
}

/**
 * Numeric range filter for queries
 */
export interface NumericRange {
  /** Minimum value */
  min: number;
  /** Maximum value */
  max: number;
}

/**
 * Generic API response wrapper
 */
export interface ApiResponse<T = unknown> {
  /** Whether the request was successful */
  success: boolean;
  /** Response data */
  data?: T;
  /** Error message if unsuccessful */
  error?: string;
  /** Error code if unsuccessful */
  errorCode?: string;
  /** Additional metadata */
  meta?: Metadata;
  /** Pagination info for list responses */
  pagination?: PaginationMeta;
}

/**
 * File information for uploads and downloads
 */
export interface FileInfo {
  /** File ID */
  id: string;
  /** Original filename */
  filename: string;
  /** File size in bytes */
  size: number;
  /** MIME type */
  mimeType: string;
  /** File type category */
  type: FileType;
  /** File purpose */
  purpose: FilePurpose;
  /** Storage URL */
  url: string;
  /** When file was uploaded */
  uploadedAt: string;
  /** File checksum for integrity */
  checksum: string;
}

/**
 * Rate limit information
 */
export interface RateLimitInfo {
  /** Rate limit type */
  type: RateLimitType;
  /** Maximum requests allowed */
  limit: number;
  /** Remaining requests */
  remaining: number;
  /** When the limit resets */
  resetAt: string;
  /** Whether the limit is currently exceeded */
  exceeded: boolean;
}

// ================================
// CONSTANTS
// ================================

/** Default pagination limits */
export const DEFAULT_PAGINATION = {
  LIMIT: 20,
  MAX_LIMIT: 100,
  DEFAULT_PAGE: 1,
} as const;

/** Common date formats used in the platform */
export const DATE_FORMATS = {
  ISO: "YYYY-MM-DDTHH:mm:ss.SSSZ",
  DATE_ONLY: "YYYY-MM-DD",
  TIME_ONLY: "HH:mm:ss",
  DISPLAY: "MMM DD, YYYY",
  DISPLAY_WITH_TIME: "MMM DD, YYYY HH:mm",
} as const;

/** File size limits in bytes */
export const FILE_SIZE_LIMITS = {
  AUDIO: 100 * 1024 * 1024, // 100MB
  IMAGE: 10 * 1024 * 1024, // 10MB
  VIDEO: 500 * 1024 * 1024, // 500MB
  DOCUMENT: 25 * 1024 * 1024, // 25MB
  ARCHIVE: 200 * 1024 * 1024, // 200MB
} as const;

/** Supported MIME types by category */
export const SUPPORTED_MIME_TYPES = {
  [FileType.AUDIO]: ["audio/mpeg", "audio/wav", "audio/flac", "audio/aiff", "audio/ogg"],
  [FileType.IMAGE]: ["image/jpeg", "image/png", "image/gif", "image/webp", "image/svg+xml"],
  [FileType.VIDEO]: ["video/mp4", "video/webm", "video/ogg", "video/quicktime"],
  [FileType.DOCUMENT]: [
    "application/pdf",
    "text/plain",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ],
  [FileType.ARCHIVE]: [
    "application/zip",
    "application/x-rar-compressed",
    "application/x-7z-compressed",
  ],
} as const;

/** Rate limit configurations */
export const RATE_LIMITS = {
  [RateLimitType.API_REQUEST]: { requests: 1000, windowMs: 60 * 60 * 1000 }, // 1000/hour
  [RateLimitType.FILE_UPLOAD]: { requests: 50, windowMs: 60 * 60 * 1000 }, // 50/hour
  [RateLimitType.DOWNLOAD]: { requests: 100, windowMs: 60 * 60 * 1000 }, // 100/hour
  [RateLimitType.LOGIN_ATTEMPT]: { requests: 5, windowMs: 15 * 60 * 1000 }, // 5/15min
  [RateLimitType.PASSWORD_RESET]: { requests: 3, windowMs: 60 * 60 * 1000 }, // 3/hour
  [RateLimitType.EMAIL_SEND]: { requests: 10, windowMs: 60 * 60 * 1000 }, // 10/hour
  [RateLimitType.SEARCH_QUERY]: { requests: 200, windowMs: 60 * 60 * 1000 }, // 200/hour
} as const;
