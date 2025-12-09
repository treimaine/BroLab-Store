/**
 * Secure Request ID Utility Module
 *
 * Provides cryptographically secure request ID generation using UUID v4.
 * Replaces the legacy Date.now()-based generation for improved uniqueness
 * and security.
 *
 * @module server/utils/requestId
 */

import crypto from "node:crypto";

/**
 * Regex pattern for validating request IDs.
 * Accepts both legacy (Date.now) and new (UUID) formats.
 * Pattern: req_ followed by alphanumeric characters, hyphens, or underscores
 */
const REQUEST_ID_PATTERN = /^req_[a-zA-Z0-9_-]+$/;

/**
 * Generates a cryptographically secure request ID using UUID v4.
 *
 * Uses Node.js crypto.randomUUID() which provides cryptographically
 * secure random values, ensuring uniqueness even under high concurrency.
 *
 * @returns Request ID in format "req_<uuid-v4>"
 * @example
 * const id = generateSecureRequestId();
 * // Returns: "req_550e8400-e29b-41d4-a716-446655440000"
 *
 * @requirements 1.1, 1.3, 2.1
 */
export function generateSecureRequestId(): string {
  return `req_${crypto.randomUUID()}`;
}

/**
 * Validates a request ID format.
 *
 * Accepts both legacy (Date.now-based) and new (UUID) formats to ensure
 * backward compatibility during the transition period.
 *
 * Valid formats:
 * - New UUID format: req_550e8400-e29b-41d4-a716-446655440000
 * - Legacy timestamp: req_1702345678901
 * - Legacy with random: req_1702345678901_abc123def
 *
 * @param id - The request ID to validate
 * @returns true if valid, false otherwise
 *
 * @requirements 2.2, 3.3, 5.1
 */
export function isValidRequestId(id: string): boolean {
  if (!id || typeof id !== "string") {
    return false;
  }
  return REQUEST_ID_PATTERN.test(id);
}

/**
 * @deprecated Use generateSecureRequestId instead.
 * Maintained for backward compatibility with existing code.
 *
 * @returns Request ID in format "req_<uuid-v4>"
 *
 * @requirements 5.2
 */
export function generateRequestId(): string {
  return generateSecureRequestId();
}
