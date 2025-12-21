/**
 * Centralized Sanitization Functions
 *
 * This module provides the single source of truth for all sanitization functions
 * used across the application to clean and normalize user input.
 *
 * @module shared/validation/sanitizers
 */

// ================================
// STRING SANITIZATION
// ================================

/**
 * Sanitize user input by removing dangerous characters
 *
 * Removes:
 * - HTML brackets (< >)
 * - Quotes (' ")
 * - Ampersands (&)
 *
 * Also trims whitespace and limits length.
 *
 * @param input - User input to sanitize
 * @param maxLength - Maximum allowed length (default: 1000)
 * @returns Sanitized string
 */
export const sanitizeUserInput = (input: string, maxLength: number = 1000): string => {
  if (!input) return "";

  return input
    .trim()
    .replaceAll(/[<>]/g, "") // Remove HTML brackets
    .replaceAll(/['"]/g, "") // Remove quotes
    .replaceAll("&", "") // Remove ampersands
    .slice(0, maxLength); // Limit length
};

/**
 * Sanitize input by removing potential XSS vectors
 *
 * Removes:
 * - HTML tags
 * - javascript: protocol
 * - Event handlers (onclick, onload, etc.)
 *
 * @param input - Input to sanitize
 * @returns Sanitized string
 */
export const sanitizeInput = (input: string): string => {
  return input
    .trim()
    .replaceAll(/[<>]/g, "") // Remove potential HTML tags
    .replaceAll(/javascript:/gi, "") // Remove javascript: protocol
    .replaceAll(/on\w+=/gi, ""); // Remove event handlers
};

// ================================
// EMAIL SANITIZATION
// ================================

/**
 * Sanitize email address
 *
 * Normalizes to lowercase and trims whitespace.
 *
 * @param email - Email to sanitize
 * @returns Sanitized email
 */
export const sanitizeEmail = (email: string): string => {
  return email.toLowerCase().trim();
};

// ================================
// USERNAME SANITIZATION
// ================================

/**
 * Sanitize username
 *
 * Normalizes to lowercase and removes invalid characters.
 * Only allows: a-z, 0-9, underscore, hyphen
 *
 * @param username - Username to sanitize
 * @returns Sanitized username or undefined if input is falsy
 */
export const sanitizeUsername = (username: string | undefined): string | undefined => {
  if (!username) return username;
  return username
    .toLowerCase()
    .trim()
    .replaceAll(/[^a-z0-9_-]/g, "");
};

// ================================
// FILENAME SANITIZATION
// ================================

/**
 * Sanitize filename for safe storage
 *
 * Removes dangerous characters and normalizes the filename.
 *
 * @param filename - Filename to sanitize
 * @returns Sanitized filename
 */
export const sanitizeFilename = (filename: string): string => {
  if (!filename) return "";

  return filename
    .trim()
    .replaceAll(/[<>:"/\\|?*]/g, "") // Remove dangerous characters
    .replaceAll(/\s+/g, "_") // Replace spaces with underscores
    .replaceAll(/\.{2,}/g, ".") // Remove multiple dots
    .slice(0, 255); // Limit length
};

// ================================
// GENERIC STRING SANITIZATION
// ================================

/**
 * Sanitize a string by removing HTML-like characters
 *
 * @param str - String to sanitize
 * @returns Sanitized string or undefined if input is falsy
 */
export const sanitizeString = (str: string | undefined): string | undefined => {
  if (!str) return str;
  return str.trim().replaceAll(/[<>"'&]/g, "");
};

// ================================
// HTML SANITIZATION
// ================================

/**
 * Escape HTML special characters
 *
 * Converts special characters to HTML entities to prevent XSS.
 *
 * @param html - String containing potential HTML
 * @returns String with HTML entities escaped
 */
export const escapeHtml = (html: string): string => {
  const htmlEntities: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  };

  return html.replaceAll(/[&<>"']/g, char => htmlEntities[char] || char);
};

/**
 * Strip all HTML tags from a string
 *
 * @param html - String containing HTML
 * @returns Plain text without HTML tags
 */
export const stripHtml = (html: string): string => {
  return html.replaceAll(/<[^>]*>/g, "");
};

// ================================
// URL SANITIZATION
// ================================

/**
 * Sanitize URL by removing dangerous protocols
 *
 * Only allows http, https, and relative URLs.
 *
 * @param url - URL to sanitize
 * @returns Sanitized URL or empty string if dangerous
 */
export const sanitizeUrl = (url: string): string => {
  if (!url) return "";

  const trimmed = url.trim();

  // Allow relative URLs
  if (trimmed.startsWith("/") || trimmed.startsWith("./") || trimmed.startsWith("../")) {
    return trimmed;
  }

  // Only allow http and https protocols
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed;
  }

  // Block javascript:, data:, and other dangerous protocols
  return "";
};
