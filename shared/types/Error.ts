/**
 * BroLab-Specific Error Type Definitions
 *
 * This module contains all error types and error handling interfaces specific to
 * the BroLab Entertainment marketplace platform, including music marketplace-specific
 * error scenarios and recovery options.
 */

// ================================
// ENUMS
// ================================

/**
 * Error categories specific to BroLab Entertainment
 */
export enum ErrorCategory {
  AUTHENTICATION = "authentication",
  AUTHORIZATION = "authorization",
  BEAT_LICENSING = "beat_licensing",
  PAYMENT_PROCESSING = "payment_processing",
  AUDIO_PROCESSING = "audio_processing",
  DOWNLOAD_QUOTA = "download_quota",
  STUDIO_BOOKING = "studio_booking",
  FILE_UPLOAD = "file_upload",
  SUBSCRIPTION = "subscription",
  VALIDATION = "validation",
  NETWORK = "network",
  SYSTEM = "system",
  BUSINESS_LOGIC = "business_logic",
}

/**
 * Error severity levels
 */
export enum ErrorSeverity {
  LOW = "low",
  MEDIUM = "medium",
  HIGH = "high",
  CRITICAL = "critical",
}

/**
 * Error types specific to music marketplace operations
 */
export enum BroLabErrorType {
  // Authentication & Authorization
  INVALID_CREDENTIALS = "invalid_credentials",
  SESSION_EXPIRED = "session_expired",
  INSUFFICIENT_PERMISSIONS = "insufficient_permissions",
  ACCOUNT_SUSPENDED = "account_suspended",
  EMAIL_NOT_VERIFIED = "email_not_verified",

  // Beat Licensing
  LICENSE_NOT_AVAILABLE = "license_not_available",
  BEAT_NOT_FOUND = "beat_not_found",
  BEAT_UNAVAILABLE = "beat_unavailable",
  EXCLUSIVE_BEAT_SOLD = "exclusive_beat_sold",
  INVALID_LICENSE_TYPE = "invalid_license_type",
  LICENSE_TERMS_VIOLATION = "license_terms_violation",

  // Payment Processing
  PAYMENT_FAILED = "payment_failed",
  INSUFFICIENT_FUNDS = "insufficient_funds",
  CARD_DECLINED = "card_declined",
  PAYMENT_METHOD_INVALID = "payment_method_invalid",
  CURRENCY_NOT_SUPPORTED = "currency_not_supported",
  REFUND_FAILED = "refund_failed",
  SUBSCRIPTION_PAYMENT_FAILED = "subscription_payment_failed",

  // Audio Processing
  AUDIO_FILE_CORRUPT = "audio_file_corrupt",
  AUDIO_FORMAT_UNSUPPORTED = "audio_format_unsupported",
  WAVEFORM_GENERATION_FAILED = "waveform_generation_failed",
  AUDIO_PROCESSING_TIMEOUT = "audio_processing_timeout",
  AUDIO_QUALITY_INSUFFICIENT = "audio_quality_insufficient",

  // Download & Quota
  DOWNLOAD_QUOTA_EXCEEDED = "download_quota_exceeded",
  DOWNLOAD_LINK_EXPIRED = "download_link_expired",
  FILE_NOT_FOUND = "file_not_found",
  DOWNLOAD_FAILED = "download_failed",
  CONCURRENT_DOWNLOAD_LIMIT = "concurrent_download_limit",

  // Studio Booking
  BOOKING_CONFLICT = "booking_conflict",
  STUDIO_UNAVAILABLE = "studio_unavailable",
  BOOKING_CANCELLED = "booking_cancelled",
  SERVICE_NOT_AVAILABLE = "service_not_available",
  BOOKING_DEADLINE_PASSED = "booking_deadline_passed",

  // File Upload
  FILE_TOO_LARGE = "file_too_large",
  FILE_TYPE_NOT_ALLOWED = "file_type_not_allowed",
  VIRUS_DETECTED = "virus_detected",
  UPLOAD_FAILED = "upload_failed",
  STORAGE_QUOTA_EXCEEDED = "storage_quota_exceeded",

  // Subscription
  SUBSCRIPTION_EXPIRED = "subscription_expired",
  SUBSCRIPTION_CANCELLED = "subscription_cancelled",
  PLAN_NOT_FOUND = "plan_not_found",
  UPGRADE_FAILED = "upgrade_failed",
  DOWNGRADE_RESTRICTED = "downgrade_restricted",

  // Business Logic
  CART_EMPTY = "cart_empty",
  ITEM_OUT_OF_STOCK = "item_out_of_stock",
  PRICE_CHANGED = "price_changed",
  PROMOTIONAL_CODE_INVALID = "promotional_code_invalid",
  WISHLIST_FULL = "wishlist_full",

  // System Errors
  DATABASE_ERROR = "database_error",
  EXTERNAL_SERVICE_ERROR = "external_service_error",
  RATE_LIMIT_EXCEEDED = "rate_limit_exceeded",
  MAINTENANCE_MODE = "maintenance_mode",
  FEATURE_DISABLED = "feature_disabled",

  // Validation Errors
  VALIDATION_ERROR = "validation_error",
  INVALID_INPUT = "invalid_input",
  MISSING_REQUIRED_FIELD = "missing_required_field",

  // API Errors
  API_ERROR = "api_error",
  INTERNAL_ERROR = "internal_error",
  NOT_FOUND = "not_found",
  UNAUTHORIZED = "unauthorized",
  FORBIDDEN = "forbidden",
}

// ================================
// CORE INTERFACES
// ================================

/**
 * Error context for debugging and logging
 */
export interface ErrorContext {
  /** Component where error occurred */
  component: string;
  /** Action being performed when error occurred */
  action: string;
  /** User ID if applicable */
  userId?: string;
  /** Session ID */
  sessionId?: string;
  /** Request ID for tracing */
  requestId?: string;
  /** Timestamp when error occurred */
  timestamp: string;
  /** Additional metadata */
  metadata: Record<string, unknown>;
  /** Stack trace */
  stackTrace: string;
  /** User agent string */
  userAgent?: string;
  /** IP address (hashed for privacy) */
  ipAddress?: string;
  /** URL where error occurred */
  url?: string;
  /** HTTP method if applicable */
  method?: string;
}

/**
 * User-friendly error recovery options
 */
export interface ErrorRecoveryOption {
  /** Unique option identifier */
  id: string;
  /** Display label for the option */
  label: string;
  /** Detailed description */
  description: string;
  /** Action to perform recovery */
  action: () => Promise<void>;
  /** Whether this action is destructive */
  isDestructive: boolean;
  /** Icon to display with option */
  icon?: string;
  /** Whether this is the recommended option */
  recommended?: boolean;
}

/**
 * BroLab-specific error details
 */
export interface BroLabErrorDetails {
  /** Beat ID if error is beat-related */
  beatId?: number;
  /** Order ID if error is order-related */
  orderId?: number;
  /** Reservation ID if error is booking-related */
  reservationId?: string;
  /** License type if error is license-related */
  licenseType?: string;
  /** Payment intent ID if error is payment-related */
  paymentIntentId?: string;
  /** File ID if error is file-related */
  fileId?: string;
  /** Subscription ID if error is subscription-related */
  subscriptionId?: string;
  /** Service type if error is service-related */
  serviceType?: string;
  /** Additional error-specific data */
  additionalData?: Record<string, unknown>;
}

/**
 * Core BroLab Error interface
 */
export interface BroLabError {
  /** Unique error identifier */
  id: string;
  /** Error type */
  type: BroLabErrorType;
  /** Error category */
  category: ErrorCategory;
  /** Error severity */
  severity: ErrorSeverity;
  /** User-friendly error message */
  message: string;
  /** Technical error message for developers */
  technicalMessage: string;
  /** Error code for API responses */
  code: string;
  /** HTTP status code if applicable */
  statusCode: number;
  /** Error context */
  context: ErrorContext;
  /** BroLab-specific error details */
  details?: BroLabErrorDetails;
  /** Recovery options for the user */
  recoveryOptions?: ErrorRecoveryOption[];
  /** Whether error has been resolved */
  resolved: boolean;
  /** Resolution notes */
  resolutionNotes?: string;
  /** When error was resolved */
  resolutionTimestamp?: string;
  /** Related errors */
  relatedErrors?: string[];
  /** Whether error should be reported to external services */
  shouldReport: boolean;
}

/**
 * Error log entry for tracking and analytics
 */
export interface ErrorLog {
  /** Log entry ID */
  id: string;
  /** Error information */
  error: BroLabError;
  /** When error was logged */
  loggedAt: string;
  /** How many times this error has occurred */
  occurrenceCount: number;
  /** First occurrence timestamp */
  firstOccurrence: string;
  /** Last occurrence timestamp */
  lastOccurrence: string;
  /** Whether error is currently active */
  isActive: boolean;
  /** Tags for categorization */
  tags: string[];
}

/**
 * Error statistics for monitoring
 */
export interface ErrorStats {
  /** Total number of errors */
  totalErrors: number;
  /** Errors by type */
  errorsByType: Record<BroLabErrorType, number>;
  /** Errors by category */
  errorsByCategory: Record<ErrorCategory, number>;
  /** Errors by severity */
  errorsBySeverity: Record<ErrorSeverity, number>;
  /** Resolution rate percentage */
  resolutionRate: number;
  /** Average resolution time in minutes */
  averageResolutionTime: number;
  /** Most common errors */
  topErrors: Array<{
    type: BroLabErrorType;
    count: number;
    percentage: number;
  }>;
  /** Error trends over time */
  trends: Array<{
    timestamp: string;
    errorCount: number;
    errorType: BroLabErrorType;
  }>;
}

/**
 * Error boundary state for React components
 */
export interface ErrorBoundaryState {
  /** Whether error boundary has caught an error */
  hasError: boolean;
  /** The caught error */
  error?: BroLabError;
  /** Error info from React */
  errorInfo?: {
    componentStack: string;
  };
  /** Recovery attempts made */
  recoveryAttempts: number;
  /** Maximum recovery attempts allowed */
  maxRecoveryAttempts: number;
  /** Whether automatic recovery is enabled */
  autoRecovery: boolean;
}

/**
 * Error notification for user alerts
 */
export interface ErrorNotification {
  /** Notification ID */
  id: string;
  /** Error that triggered notification */
  error: BroLabError;
  /** Notification title */
  title: string;
  /** Notification message */
  message: string;
  /** Notification type */
  type: "error" | "warning" | "info";
  /** Whether notification is dismissible */
  dismissible: boolean;
  /** Auto-dismiss timeout in seconds */
  timeout?: number;
  /** Actions available in notification */
  actions?: Array<{
    label: string;
    action: () => void;
    style?: "primary" | "secondary" | "danger";
  }>;
}

// ================================
// ERROR MESSAGES
// ================================

/**
 * User-friendly error messages for BroLab-specific errors
 */
export const BROLAB_ERROR_MESSAGES: Record<
  BroLabErrorType,
  {
    title: string;
    message: string;
    userGuidance: string;
  }
> = {
  // Authentication & Authorization
  [BroLabErrorType.INVALID_CREDENTIALS]: {
    title: "Login Failed",
    message: "The email or password you entered is incorrect.",
    userGuidance: "Please check your credentials and try again, or reset your password if needed.",
  },
  [BroLabErrorType.SESSION_EXPIRED]: {
    title: "Session Expired",
    message: "Your session has expired for security reasons.",
    userGuidance: "Please log in again to continue using BroLab Entertainment.",
  },
  [BroLabErrorType.INSUFFICIENT_PERMISSIONS]: {
    title: "Access Denied",
    message: "You don't have permission to perform this action.",
    userGuidance: "Please contact support if you believe this is an error.",
  },
  [BroLabErrorType.ACCOUNT_SUSPENDED]: {
    title: "Account Suspended",
    message: "Your account has been temporarily suspended.",
    userGuidance: "Please contact our support team for assistance with reactivating your account.",
  },
  [BroLabErrorType.EMAIL_NOT_VERIFIED]: {
    title: "Email Not Verified",
    message: "Please verify your email address to continue.",
    userGuidance: "Check your email for a verification link or request a new one.",
  },

  // Beat Licensing
  [BroLabErrorType.LICENSE_NOT_AVAILABLE]: {
    title: "License Unavailable",
    message: "The selected license type is not available for this beat.",
    userGuidance:
      "Please choose a different license type or contact the producer for custom licensing options.",
  },
  [BroLabErrorType.BEAT_NOT_FOUND]: {
    title: "Beat Not Found",
    message: "The requested beat could not be found.",
    userGuidance: "The beat may have been removed or the link may be incorrect.",
  },
  [BroLabErrorType.BEAT_UNAVAILABLE]: {
    title: "Beat Unavailable",
    message: "This beat is currently unavailable for purchase.",
    userGuidance: "Please try again later or browse other available beats.",
  },
  [BroLabErrorType.EXCLUSIVE_BEAT_SOLD]: {
    title: "Beat No Longer Available",
    message: "This exclusive beat has already been sold to another artist.",
    userGuidance: "Browse our catalog for similar beats or contact the producer for custom work.",
  },
  [BroLabErrorType.INVALID_LICENSE_TYPE]: {
    title: "Invalid License",
    message: "The selected license type is not valid.",
    userGuidance: "Please select a valid license type from the available options.",
  },
  [BroLabErrorType.LICENSE_TERMS_VIOLATION]: {
    title: "License Terms Violation",
    message: "This action would violate the license terms.",
    userGuidance: "Please review the license terms or upgrade to a higher license tier.",
  },

  // Payment Processing
  [BroLabErrorType.PAYMENT_FAILED]: {
    title: "Payment Failed",
    message: "We couldn't process your payment at this time.",
    userGuidance:
      "Please check your payment method and try again, or use a different payment method.",
  },
  [BroLabErrorType.INSUFFICIENT_FUNDS]: {
    title: "Insufficient Funds",
    message: "Your payment method has insufficient funds.",
    userGuidance: "Please add funds to your account or use a different payment method.",
  },
  [BroLabErrorType.CARD_DECLINED]: {
    title: "Card Declined",
    message: "Your card was declined by your bank.",
    userGuidance: "Please contact your bank or try a different payment method.",
  },
  [BroLabErrorType.PAYMENT_METHOD_INVALID]: {
    title: "Invalid Payment Method",
    message: "The payment method you selected is invalid or expired.",
    userGuidance: "Please update your payment information or use a different method.",
  },
  [BroLabErrorType.CURRENCY_NOT_SUPPORTED]: {
    title: "Currency Not Supported",
    message: "The selected currency is not supported.",
    userGuidance: "Please select a supported currency from the available options.",
  },
  [BroLabErrorType.REFUND_FAILED]: {
    title: "Refund Failed",
    message: "We couldn't process your refund at this time.",
    userGuidance: "Please contact support for assistance with your refund.",
  },
  [BroLabErrorType.SUBSCRIPTION_PAYMENT_FAILED]: {
    title: "Subscription Payment Failed",
    message: "We couldn't process your subscription payment.",
    userGuidance: "Please update your payment method to continue your subscription.",
  },

  // Audio Processing
  [BroLabErrorType.AUDIO_FILE_CORRUPT]: {
    title: "Audio File Error",
    message: "The audio file appears to be corrupted or damaged.",
    userGuidance:
      "Please try uploading a different version of the file or contact support for help.",
  },
  [BroLabErrorType.AUDIO_FORMAT_UNSUPPORTED]: {
    title: "Unsupported Audio Format",
    message: "The audio file format is not supported.",
    userGuidance: "Please convert your file to a supported format (MP3, WAV, FLAC) and try again.",
  },
  [BroLabErrorType.WAVEFORM_GENERATION_FAILED]: {
    title: "Audio Preview Unavailable",
    message: "We couldn't generate a preview for this audio file.",
    userGuidance: "The file is still available for purchase, but preview may be limited.",
  },
  [BroLabErrorType.AUDIO_PROCESSING_TIMEOUT]: {
    title: "Processing Timeout",
    message: "Audio processing took too long and timed out.",
    userGuidance: "Please try again with a smaller file or contact support.",
  },
  [BroLabErrorType.AUDIO_QUALITY_INSUFFICIENT]: {
    title: "Audio Quality Issue",
    message: "The audio quality doesn't meet our minimum standards.",
    userGuidance: "Please upload a higher quality version of your audio file.",
  },

  // Download & Quota
  [BroLabErrorType.DOWNLOAD_QUOTA_EXCEEDED]: {
    title: "Download Limit Reached",
    message: "You've reached your monthly download limit.",
    userGuidance:
      "Upgrade your subscription for more downloads or wait until next month for your quota to reset.",
  },
  [BroLabErrorType.DOWNLOAD_LINK_EXPIRED]: {
    title: "Download Link Expired",
    message: "This download link has expired for security reasons.",
    userGuidance: "Please go to your account dashboard to generate a new download link.",
  },
  [BroLabErrorType.FILE_NOT_FOUND]: {
    title: "File Not Found",
    message: "The requested file could not be found.",
    userGuidance: "The file may have been moved or deleted. Please contact support.",
  },
  [BroLabErrorType.DOWNLOAD_FAILED]: {
    title: "Download Failed",
    message: "The download could not be completed.",
    userGuidance: "Please try again or contact support if the problem persists.",
  },
  [BroLabErrorType.CONCURRENT_DOWNLOAD_LIMIT]: {
    title: "Too Many Downloads",
    message: "You have too many concurrent downloads.",
    userGuidance: "Please wait for current downloads to complete before starting new ones.",
  },

  // Studio Booking
  [BroLabErrorType.BOOKING_CONFLICT]: {
    title: "Booking Conflict",
    message: "The selected time slot is no longer available.",
    userGuidance: "Please choose a different time slot or contact us for alternative options.",
  },
  [BroLabErrorType.STUDIO_UNAVAILABLE]: {
    title: "Studio Unavailable",
    message: "The studio is currently unavailable for bookings.",
    userGuidance: "Please check our availability calendar or contact us for more information.",
  },
  [BroLabErrorType.BOOKING_CANCELLED]: {
    title: "Booking Cancelled",
    message: "Your booking has been cancelled.",
    userGuidance: "Please contact us to reschedule or for more information.",
  },
  [BroLabErrorType.SERVICE_NOT_AVAILABLE]: {
    title: "Service Unavailable",
    message: "The requested service is not currently available.",
    userGuidance: "Please try a different service or contact us for alternatives.",
  },
  [BroLabErrorType.BOOKING_DEADLINE_PASSED]: {
    title: "Booking Deadline Passed",
    message: "The deadline for this booking has passed.",
    userGuidance: "Please select a future date for your booking.",
  },

  // File Upload
  [BroLabErrorType.FILE_TOO_LARGE]: {
    title: "File Too Large",
    message: "The file you're trying to upload exceeds the maximum size limit.",
    userGuidance: "Please compress your file or upgrade your account for larger file uploads.",
  },
  [BroLabErrorType.FILE_TYPE_NOT_ALLOWED]: {
    title: "File Type Not Allowed",
    message: "This file type is not allowed.",
    userGuidance: "Please upload a supported file type.",
  },
  [BroLabErrorType.VIRUS_DETECTED]: {
    title: "Security Issue Detected",
    message: "The uploaded file failed our security scan.",
    userGuidance: "Please scan your file with antivirus software and try uploading again.",
  },
  [BroLabErrorType.UPLOAD_FAILED]: {
    title: "Upload Failed",
    message: "The file upload could not be completed.",
    userGuidance: "Please check your connection and try again.",
  },
  [BroLabErrorType.STORAGE_QUOTA_EXCEEDED]: {
    title: "Storage Limit Reached",
    message: "You've reached your storage limit.",
    userGuidance: "Please delete some files or upgrade your account for more storage.",
  },

  // Subscription
  [BroLabErrorType.SUBSCRIPTION_EXPIRED]: {
    title: "Subscription Expired",
    message: "Your subscription has expired.",
    userGuidance: "Renew your subscription to continue enjoying premium features and downloads.",
  },
  [BroLabErrorType.SUBSCRIPTION_CANCELLED]: {
    title: "Subscription Cancelled",
    message: "Your subscription has been cancelled.",
    userGuidance: "Reactivate your subscription to continue using premium features.",
  },
  [BroLabErrorType.PLAN_NOT_FOUND]: {
    title: "Plan Not Found",
    message: "The requested subscription plan could not be found.",
    userGuidance: "Please select a valid subscription plan.",
  },
  [BroLabErrorType.UPGRADE_FAILED]: {
    title: "Upgrade Failed",
    message: "We couldn't upgrade your subscription at this time.",
    userGuidance: "Please try again or contact support if the problem persists.",
  },
  [BroLabErrorType.DOWNGRADE_RESTRICTED]: {
    title: "Downgrade Not Allowed",
    message: "You cannot downgrade to this plan at this time.",
    userGuidance: "Please contact support for assistance with changing your plan.",
  },

  // Business Logic
  [BroLabErrorType.CART_EMPTY]: {
    title: "Cart is Empty",
    message: "Your cart is empty.",
    userGuidance: "Add some beats to your cart before proceeding to checkout.",
  },
  [BroLabErrorType.ITEM_OUT_OF_STOCK]: {
    title: "Item Out of Stock",
    message: "One or more items in your cart are out of stock.",
    userGuidance: "Please remove out of stock items or find similar alternatives.",
  },
  [BroLabErrorType.PRICE_CHANGED]: {
    title: "Price Updated",
    message: "The price of an item in your cart has changed.",
    userGuidance: "Please review your cart and proceed with the updated pricing.",
  },
  [BroLabErrorType.PROMOTIONAL_CODE_INVALID]: {
    title: "Invalid Promo Code",
    message: "The promotional code you entered is invalid or expired.",
    userGuidance: "Please check the code and try again or proceed without the discount.",
  },
  [BroLabErrorType.WISHLIST_FULL]: {
    title: "Wishlist Full",
    message: "Your wishlist is full.",
    userGuidance: "Please remove some items from your wishlist before adding new ones.",
  },

  // System Errors
  [BroLabErrorType.DATABASE_ERROR]: {
    title: "System Error",
    message: "A database error occurred.",
    userGuidance: "Please try again later or contact support if the problem persists.",
  },
  [BroLabErrorType.EXTERNAL_SERVICE_ERROR]: {
    title: "Service Unavailable",
    message: "An external service is currently unavailable.",
    userGuidance: "Please try again later.",
  },
  [BroLabErrorType.RATE_LIMIT_EXCEEDED]: {
    title: "Too Many Requests",
    message: "You're making requests too quickly.",
    userGuidance: "Please wait a moment before trying again.",
  },
  [BroLabErrorType.MAINTENANCE_MODE]: {
    title: "Maintenance in Progress",
    message: "BroLab Entertainment is currently undergoing maintenance.",
    userGuidance: "We'll be back shortly. Thank you for your patience.",
  },
  [BroLabErrorType.FEATURE_DISABLED]: {
    title: "Feature Disabled",
    message: "This feature is currently disabled.",
    userGuidance: "Please try again later or contact support for more information.",
  },

  // Validation Errors
  [BroLabErrorType.VALIDATION_ERROR]: {
    title: "Validation Error",
    message: "The provided data is invalid.",
    userGuidance: "Please check your input and try again.",
  },
  [BroLabErrorType.INVALID_INPUT]: {
    title: "Invalid Input",
    message: "The input provided is not valid.",
    userGuidance: "Please correct the highlighted fields and try again.",
  },
  [BroLabErrorType.MISSING_REQUIRED_FIELD]: {
    title: "Missing Required Field",
    message: "A required field is missing.",
    userGuidance: "Please fill in all required fields and try again.",
  },

  // API Errors
  [BroLabErrorType.API_ERROR]: {
    title: "API Error",
    message: "An error occurred while processing your request.",
    userGuidance: "Please try again later or contact support if the problem persists.",
  },
  [BroLabErrorType.INTERNAL_ERROR]: {
    title: "Internal Error",
    message: "An internal server error occurred.",
    userGuidance: "Please try again later or contact support if the problem persists.",
  },
  [BroLabErrorType.NOT_FOUND]: {
    title: "Not Found",
    message: "The requested resource was not found.",
    userGuidance: "Please check the URL or contact support if you believe this is an error.",
  },
  [BroLabErrorType.UNAUTHORIZED]: {
    title: "Unauthorized",
    message: "You are not authorized to access this resource.",
    userGuidance: "Please log in or contact support if you believe this is an error.",
  },
  [BroLabErrorType.FORBIDDEN]: {
    title: "Forbidden",
    message: "Access to this resource is forbidden.",
    userGuidance: "You don't have permission to access this resource.",
  },
} as const;

// ================================
// CONSTANTS
// ================================

/** Error severity colors for UI display */
export const ERROR_SEVERITY_COLORS: Record<ErrorSeverity, string> = {
  [ErrorSeverity.LOW]: "#10B981", // Green
  [ErrorSeverity.MEDIUM]: "#F59E0B", // Yellow
  [ErrorSeverity.HIGH]: "#EF4444", // Red
  [ErrorSeverity.CRITICAL]: "#7C2D12", // Dark Red
} as const;

/** Default recovery options for common errors */
export const DEFAULT_RECOVERY_OPTIONS: Partial<
  Record<BroLabErrorType, readonly ErrorRecoveryOption[]>
> = {
  [BroLabErrorType.SESSION_EXPIRED]: [
    {
      id: "login_again",
      label: "Log In Again",
      description: "Sign in to your account to continue",
      action: async () => {
        /* Redirect to login */
      },
      isDestructive: false,
      recommended: true,
    },
  ],
  [BroLabErrorType.DOWNLOAD_QUOTA_EXCEEDED]: [
    {
      id: "upgrade_subscription",
      label: "Upgrade Subscription",
      description: "Get more downloads with a premium plan",
      action: async () => {
        /* Redirect to subscription page */
      },
      isDestructive: false,
      recommended: true,
    },
    {
      id: "wait_for_reset",
      label: "Wait for Reset",
      description: "Your quota will reset next month",
      action: async () => {
        /* Show quota reset date */
      },
      isDestructive: false,
    },
  ],
  [BroLabErrorType.PAYMENT_FAILED]: [
    {
      id: "retry_payment",
      label: "Try Again",
      description: "Retry the payment with the same method",
      action: async () => {
        /* Retry payment */
      },
      isDestructive: false,
      recommended: true,
    },
    {
      id: "change_payment_method",
      label: "Different Payment Method",
      description: "Use a different card or payment option",
      action: async () => {
        /* Show payment methods */
      },
      isDestructive: false,
    },
  ],
} as const;
