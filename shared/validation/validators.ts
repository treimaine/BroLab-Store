/**
 * Centralized Validation Functions
 *
 * This module provides the single source of truth for all validation functions
 * used across the application (client, server, and Convex layers).
 *
 * @module shared/validation/validators
 */

import { z } from "zod";

// ================================
// EMAIL VALIDATION
// ================================

/**
 * Validate email address format
 *
 * Uses Zod's email validation with additional length check.
 * This is the SINGLE implementation used across all layers.
 *
 * @param email - Email address to validate
 * @returns true if valid, false otherwise
 *
 * @example
 * validateEmail("user@example.com") // true
 * validateEmail("invalid.email") // false
 */
export const validateEmail = (email: string): boolean => {
  if (!email || email.length > 254) return false;
  return z.string().email().safeParse(email).success;
};

// ================================
// PHONE VALIDATION
// ================================

/**
 * Validate phone number format
 *
 * Accepts international formats with common separators.
 *
 * @param phone - Phone number to validate
 * @returns true if valid, false otherwise
 */
export const validatePhoneNumber = (phone: string): boolean => {
  if (!phone || phone.length < 10 || phone.length > 17) return false;

  // Remove common formatting characters
  const cleaned = phone.replaceAll(/[\s\-()+]/g, "");

  // Check if it's all digits (after removing formatting)
  const digitRegex = /^\d{10,15}$/;
  return digitRegex.test(cleaned);
};

// ================================
// UUID VALIDATION
// ================================

/**
 * Validate UUID format (versions 1-5)
 *
 * @param uuid - UUID string to validate
 * @returns true if valid UUID, false otherwise
 */
export const validateUUID = (uuid: string): boolean => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
};

// ================================
// FILE PATH VALIDATION
// ================================

/**
 * Validate file path for security
 *
 * Rejects absolute paths, directory traversal, and dangerous characters.
 *
 * @param path - File path to validate
 * @returns true if safe path, false otherwise
 */
export const validateFilePath = (path: string): boolean => {
  if (!path) return false;

  // Reject absolute paths
  if (path.startsWith("/") || path.includes(":\\")) return false;

  // Reject directory traversal attempts
  if (path.includes("../") || path.includes("..\\")) return false;

  // Reject double slashes
  if (path.includes("//") || path.includes("\\\\")) return false;

  // Reject dangerous characters
  const dangerousChars = /[<>|?*"]/;
  if (dangerousChars.test(path)) return false;

  return true;
};

// ================================
// MIME TYPE VALIDATION
// ================================

/**
 * Default allowed MIME types for file uploads
 */
export const DEFAULT_ALLOWED_MIME_TYPES = [
  "application/pdf",
  "audio/mpeg",
  "audio/wav",
  "audio/mp3",
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/gif",
  "application/zip",
  "application/x-zip-compressed",
] as const;

/**
 * Validate MIME type against allowed types
 *
 * @param mimeType - MIME type to validate
 * @param allowedTypes - Optional custom allowed types (defaults to standard set)
 * @returns true if allowed, false otherwise
 */
export const validateMimeType = (mimeType: string, allowedTypes?: string[]): boolean => {
  const allowed = allowedTypes || [...DEFAULT_ALLOWED_MIME_TYPES];
  return allowed.includes(mimeType);
};

// ================================
// PASSWORD VALIDATION
// ================================

/**
 * Password validation result
 */
export interface PasswordValidationResult {
  isValid: boolean;
  errors: string[];
}

/**
 * Validate password strength
 *
 * Requirements:
 * - Minimum 8 characters
 * - At least one lowercase letter
 * - At least one uppercase letter
 * - At least one number
 *
 * @param password - Password to validate
 * @returns Validation result with errors if any
 */
export const validatePassword = (password: string): PasswordValidationResult => {
  const errors: string[] = [];

  if (password.length < 8) {
    errors.push("Password must be at least 8 characters");
  }

  if (!/(?=.*[a-z])/.test(password)) {
    errors.push("Password must contain at least one lowercase letter");
  }

  if (!/(?=.*[A-Z])/.test(password)) {
    errors.push("Password must contain at least one uppercase letter");
  }

  if (!/(?=.*\d)/.test(password)) {
    errors.push("Password must contain at least one number");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

// ================================
// FILE UPLOAD VALIDATION
// ================================

/**
 * File upload validation input
 */
export interface FileUploadInput {
  name?: string;
  originalname?: string;
  size: number;
  type?: string;
  mimetype?: string;
}

/**
 * File upload validation result
 */
export interface FileUploadValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Validate file upload for security and size constraints
 *
 * @param file - File object to validate
 * @param maxSize - Maximum file size in bytes (default: 50MB)
 * @returns Validation result with errors if any
 */
export const validateFileUpload = (
  file: FileUploadInput,
  maxSize: number = 50 * 1024 * 1024
): FileUploadValidationResult => {
  const errors: string[] = [];

  // Get the filename and mimetype from either format
  const fileName = file.name || file.originalname;
  const mimeType = file.type || file.mimetype;

  // Check file size
  if (file.size > maxSize) {
    errors.push("File size exceeds 50MB limit");
  }

  // Check MIME type
  if (mimeType && !validateMimeType(mimeType)) {
    errors.push("File type not allowed");
  }

  // Check for executable extensions (only if name is provided)
  if (fileName) {
    const executableExtensions = [".exe", ".bat", ".cmd", ".scr", ".com", ".pif"];
    const hasExecutableExt = executableExtensions.some(ext => fileName.toLowerCase().endsWith(ext));

    if (hasExecutableExt) {
      errors.push("Executable files are not allowed");
    }

    // Check filename
    if (!validateFilePath(fileName)) {
      errors.push("Invalid filename");
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
};

// ================================
// CLERK ID VALIDATION
// ================================

/**
 * Validate Clerk user ID format
 *
 * @param clerkId - Clerk ID to validate
 * @returns true if valid Clerk ID format
 */
export const validateClerkId = (clerkId: string): boolean => {
  return typeof clerkId === "string" && clerkId.startsWith("user_") && clerkId.length > 10;
};

/**
 * Type guard for Clerk ID validation
 *
 * @param clerkId - Value to check
 * @returns Type predicate indicating if value is a valid Clerk ID string
 */
export const validateClerkIdSafe = (clerkId: unknown): clerkId is string => {
  return typeof clerkId === "string" && clerkId.startsWith("user_") && clerkId.length > 10;
};

// ================================
// STATUS VALIDATION
// ================================

/**
 * Valid order statuses
 */
export const VALID_ORDER_STATUSES = [
  "pending",
  "processing",
  "paid",
  "completed",
  "failed",
  "refunded",
  "cancelled",
] as const;

export type OrderStatus = (typeof VALID_ORDER_STATUSES)[number];

/**
 * Validate order status
 *
 * @param status - Status to validate
 * @returns true if valid order status
 */
export const validateOrderStatus = (status: string): status is OrderStatus => {
  return VALID_ORDER_STATUSES.includes(status as OrderStatus);
};

/**
 * Valid reservation statuses
 */
export const VALID_RESERVATION_STATUSES = [
  "pending",
  "confirmed",
  "in_progress",
  "completed",
  "cancelled",
] as const;

export type ReservationStatus = (typeof VALID_RESERVATION_STATUSES)[number];

/**
 * Validate reservation status
 *
 * @param status - Status to validate
 * @returns true if valid reservation status
 */
export const validateReservationStatus = (status: string): status is ReservationStatus => {
  return VALID_RESERVATION_STATUSES.includes(status as ReservationStatus);
};

/**
 * Valid service types
 */
export const VALID_SERVICE_TYPES = [
  "mixing",
  "mastering",
  "recording",
  "custom_beat",
  "consultation",
] as const;

export type ServiceType = (typeof VALID_SERVICE_TYPES)[number];

/**
 * Validate service type
 *
 * @param serviceType - Service type to validate
 * @returns true if valid service type
 */
export const validateServiceType = (serviceType: string): serviceType is ServiceType => {
  return VALID_SERVICE_TYPES.includes(serviceType as ServiceType);
};

/**
 * Valid user roles
 */
export const VALID_USER_ROLES = ["user", "admin", "artist", "moderator"] as const;

export type UserRole = (typeof VALID_USER_ROLES)[number];

/**
 * Validate user role
 *
 * @param role - Role to validate
 * @returns true if valid user role
 */
export const validateUserRole = (role: string): role is UserRole => {
  return VALID_USER_ROLES.includes(role as UserRole);
};

// ================================
// NUMERIC VALIDATION
// ================================

/**
 * Validate price value
 *
 * @param price - Price to validate
 * @returns true if valid price (non-negative, finite)
 */
export const validatePrice = (price: number): boolean => {
  return price >= 0 && Number.isFinite(price);
};

/**
 * Validate duration in minutes
 *
 * @param duration - Duration to validate
 * @returns true if valid duration (1-480 minutes / 8 hours max)
 */
export const validateDuration = (duration: number): boolean => {
  return duration > 0 && duration <= 480;
};

// ================================
// BUSINESS LOGIC VALIDATION
// ================================

/**
 * BPM ranges by genre
 */
export const BPM_RANGES: Record<string, { min: number; max: number }> = {
  "hip-hop": { min: 70, max: 140 },
  trap: { min: 130, max: 170 },
  "r&b": { min: 60, max: 120 },
  pop: { min: 100, max: 130 },
};

/**
 * Validate BPM range for genre
 *
 * @param bpm - BPM value
 * @param genre - Genre name
 * @returns true if BPM is within typical range for genre (or genre is unknown)
 */
export const validateBpmForGenre = (bpm: number, genre: string): boolean => {
  const range = BPM_RANGES[genre.toLowerCase()];
  if (!range) return true; // Allow unknown genres

  return bpm >= range.min && bpm <= range.max;
};

/**
 * Validate order total calculation
 *
 * @param subtotal - Order subtotal
 * @param tax - Tax amount
 * @param fees - Fee amount
 * @param total - Expected total
 * @returns true if total matches calculation (within rounding tolerance)
 */
export const validateOrderTotal = (
  subtotal: number,
  tax: number,
  fees: number,
  total: number
): boolean => {
  const calculatedTotal = subtotal + tax + fees;
  return Math.abs(calculatedTotal - total) < 0.01; // Allow for rounding
};

/**
 * Validate reservation time slot
 *
 * @param startTime - ISO datetime string for start
 * @param durationMinutes - Duration in minutes
 * @returns true if slot is valid (future, during business hours)
 */
export const validateReservationSlot = (startTime: string, durationMinutes: number): boolean => {
  const start = new Date(startTime);
  const end = new Date(start.getTime() + durationMinutes * 60000);

  // Must be in the future
  if (start <= new Date()) return false;

  // Must be during business hours (9 AM - 6 PM)
  const startHour = start.getHours();
  const endHour = end.getHours();

  return startHour >= 9 && endHour <= 18;
};
