/**
 * BroLab Entertainment - Centralized Error Messages
 *
 * This file contains all error messages used throughout the application
 * to ensure consistency and easier maintenance/localization.
 */

export const ErrorMessages = {
  // Authentication & Authorization
  AUTH: {
    UNAUTHORIZED: "You must be logged in to access this resource",
    FORBIDDEN: "You do not have permission to perform this action",
    INVALID_TOKEN: "Invalid or expired authentication token",
    SESSION_EXPIRED: "Your session has expired. Please log in again",
    ACCOUNT_SUSPENDED: "Your account has been suspended. Please contact support",
  },

  // User Management
  USER: {
    NOT_FOUND: "User not found",
    INVALID_EMAIL: "Please enter a valid email address",
    EMAIL_ALREADY_EXISTS: "An account with this email already exists",
    WEAK_PASSWORD: "Password must be at least 8 characters with uppercase, lowercase, and numbers",
    PROFILE_UPDATE_FAILED: "Failed to update profile. Please try again",
    INVALID_USER_DATA: "Invalid user data provided",
  },

  // Beats & Products
  BEATS: {
    NOT_FOUND: "Beat not found",
    UNAVAILABLE: "This beat is no longer available",
    INVALID_LICENSE: "Invalid license type selected",
    ALREADY_PURCHASED: "You have already purchased this beat",
    INSUFFICIENT_QUOTA: "You have exceeded your download quota. Please upgrade your subscription",
    UPLOAD_FAILED: "Failed to upload beat. Please try again",
    INVALID_AUDIO_FORMAT: "Invalid audio format. Please upload MP3, WAV, or FLAC files",
    FILE_TOO_LARGE: "File size exceeds maximum limit of 50MB",
    VIRUS_DETECTED: "File failed security scan. Please contact support",
  },

  // Cart & Orders
  CART: {
    EMPTY: "Your cart is empty",
    ITEM_NOT_FOUND: "Item not found in cart",
    INVALID_QUANTITY: "Invalid quantity specified",
    UPDATE_FAILED: "Failed to update cart. Please try again",
    EXPIRED_ITEMS: "Some items in your cart are no longer available",
  },

  ORDER: {
    NOT_FOUND: "Order not found",
    ALREADY_PROCESSED: "This order has already been processed",
    INVALID_STATUS: "Invalid order status",
    PROCESSING_FAILED: "Failed to process order. Please try again",
    INSUFFICIENT_FUNDS: "Insufficient funds to complete purchase",
  },

  // Payment Processing
  PAYMENT: {
    FAILED: "Payment processing failed. Please try again",
    INVALID_CARD: "Invalid credit card information",
    CARD_DECLINED: "Your card was declined. Please try a different payment method",
    EXPIRED_CARD: "Your card has expired. Please update your payment information",
    INSUFFICIENT_FUNDS: "Insufficient funds. Please try a different payment method",
    PAYMENT_METHOD_REQUIRED: "Please add a payment method to continue",
    REFUND_FAILED: "Refund processing failed. Please contact support",
    STRIPE_ERROR: "Payment service error. Please try again later",
    PAYPAL_ERROR: "PayPal service error. Please try again later",
  },

  // Subscriptions
  SUBSCRIPTION: {
    NOT_FOUND: "Subscription not found",
    ALREADY_ACTIVE: "You already have an active subscription",
    EXPIRED: "Your subscription has expired. Please renew to continue",
    UPGRADE_FAILED: "Failed to upgrade subscription. Please try again",
    CANCEL_FAILED: "Failed to cancel subscription. Please contact support",
    INVALID_PLAN: "Invalid subscription plan selected",
  },

  // File Management
  FILE: {
    NOT_FOUND: "File not found",
    UPLOAD_FAILED: "File upload failed. Please try again",
    DOWNLOAD_FAILED: "File download failed. Please try again",
    INVALID_FORMAT: "Invalid file format",
    CORRUPTED: "File appears to be corrupted",
    ACCESS_DENIED: "You do not have access to this file",
    STORAGE_FULL: "Storage limit exceeded. Please free up space",
  },

  // Reservations & Services
  RESERVATION: {
    NOT_FOUND: "Reservation not found",
    SLOT_UNAVAILABLE: "Selected time slot is no longer available",
    BOOKING_FAILED: "Failed to create reservation. Please try again",
    CANCELLATION_FAILED: "Failed to cancel reservation. Please contact support",
    INVALID_DATE: "Invalid date selected",
    PAST_DATE: "Cannot book appointments in the past",
    TOO_FAR_AHEAD: "Cannot book more than 3 months in advance",
  },

  // WooCommerce Integration
  WOOCOMMERCE: {
    SYNC_FAILED: "Failed to sync with WooCommerce. Please try again later",
    PRODUCT_NOT_FOUND: "Product not found in WooCommerce",
    INVALID_PRODUCT_DATA: "Invalid product data received from WooCommerce",
    CONNECTION_ERROR: "Unable to connect to WooCommerce API",
    RATE_LIMIT_EXCEEDED: "Too many requests. Please wait before trying again",
  },

  // Database & Server
  DATABASE: {
    CONNECTION_ERROR: "Database connection error. Please try again later",
    QUERY_FAILED: "Database query failed. Please try again",
    CONSTRAINT_VIOLATION: "Data constraint violation. Please check your input",
    TIMEOUT: "Database operation timed out. Please try again",
  },

  SERVER: {
    INTERNAL_ERROR: "Internal server error. Please try again later",
    SERVICE_UNAVAILABLE: "Service temporarily unavailable. Please try again later",
    RATE_LIMIT_EXCEEDED: "Too many requests. Please wait before trying again",
    MAINTENANCE_MODE: "System is under maintenance. Please try again later",
  },

  // Validation
  VALIDATION: {
    REQUIRED_FIELD: "This field is required",
    INVALID_FORMAT: "Invalid format provided",
    TOO_SHORT: "Input is too short",
    TOO_LONG: "Input is too long",
    INVALID_CHARACTERS: "Contains invalid characters",
    NUMERIC_ONLY: "Only numeric values are allowed",
    ALPHA_ONLY: "Only alphabetic characters are allowed",
  },

  // Network & API
  NETWORK: {
    CONNECTION_ERROR: "Network connection error. Please check your internet connection",
    TIMEOUT: "Request timed out. Please try again",
    OFFLINE: "You are currently offline. Please check your connection",
    API_ERROR: "API service error. Please try again later",
  },

  // Generic Messages
  GENERIC: {
    UNKNOWN_ERROR: "An unexpected error occurred. Please try again",
    TRY_AGAIN: "Something went wrong. Please try again",
    CONTACT_SUPPORT: "If this problem persists, please contact support",
    FEATURE_UNAVAILABLE: "This feature is currently unavailable",
    COMING_SOON: "This feature is coming soon",
  },
} as const;

// Type for error message keys
export type ErrorMessageKey = keyof typeof ErrorMessages;
export type ErrorMessageCategory = keyof typeof ErrorMessages;

// Helper function to get nested error messages
export const getErrorMessage = (category: string, key: string): string => {
  const categoryMessages = ErrorMessages[category as ErrorMessageCategory];
  if (categoryMessages && typeof categoryMessages === "object") {
    return (categoryMessages as Record<string, string>)[key] || ErrorMessages.GENERIC.UNKNOWN_ERROR;
  }
  return ErrorMessages.GENERIC.UNKNOWN_ERROR;
};
