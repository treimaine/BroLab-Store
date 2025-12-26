/**
 * CSP Nonce Utility Module
 *
 * Provides cryptographically secure nonce generation for Content Security Policy.
 * Nonces are used to allow specific inline scripts/styles while blocking others.
 *
 * @module server/utils/cspNonce
 */

import crypto from "node:crypto";

/**
 * Generates a cryptographically secure nonce for CSP.
 *
 * Uses Node.js crypto.randomBytes() which provides cryptographically
 * secure random values, encoded as base64 for CSP compatibility.
 *
 * @returns Base64-encoded nonce string (24 characters)
 * @example
 * const nonce = generateCspNonce();
 * // Returns: "abc123def456ghi789jkl012"
 */
export function generateCspNonce(): string {
  return crypto.randomBytes(16).toString("base64");
}

/**
 * Validates a CSP nonce format.
 *
 * Valid nonces are base64-encoded strings of appropriate length.
 *
 * @param nonce - The nonce to validate
 * @returns true if valid, false otherwise
 */
export function isValidCspNonce(nonce: string): boolean {
  if (!nonce || typeof nonce !== "string") {
    return false;
  }
  // Base64 encoded 16 bytes = 24 characters (with padding) or 22 without
  return /^[A-Za-z0-9+/]{22,24}={0,2}$/.test(nonce);
}
