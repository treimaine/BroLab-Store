/**
 * WebhookSecurityService - Security validation for Clerk Billing webhooks
 *
 * Provides:
 * - Timestamp validation for replay attack protection (Requirements 2.1, 2.2, 2.3)
 * - Idempotency checking to prevent duplicate processing (Requirements 3.1, 3.2)
 * - IP failure tracking for suspicious activity detection (Requirement 4.4)
 */

import { LRUCache, LRUCacheConfig } from "../utils/LRUCache";

// ============================================================================
// Configuration
// ============================================================================

export interface WebhookSecurityConfig {
  /** Maximum age of timestamp in seconds (default: 300 = 5 minutes) */
  maxTimestampAge: number;
  /** Maximum future timestamp in seconds (default: 60) */
  maxTimestampFuture: number;
  /** Maximum entries in idempotency cache (default: 10000) */
  idempotencyCacheSize: number;
  /** TTL for idempotency cache entries in ms (default: 300000 = 5 minutes) */
  idempotencyCacheTTL: number;
  /** Window for tracking IP failures in ms (default: 300000 = 5 minutes) */
  failureTrackingWindow: number;
  /** Number of failures before warning (default: 5) */
  failureThreshold: number;
}

const DEFAULT_CONFIG: WebhookSecurityConfig = {
  maxTimestampAge: 300, // 5 minutes
  maxTimestampFuture: 60, // 1 minute
  idempotencyCacheSize: 10000,
  idempotencyCacheTTL: 300000, // 5 minutes
  failureTrackingWindow: 300000, // 5 minutes
  failureThreshold: 5,
};

// ============================================================================
// Result Types
// ============================================================================

/**
 * Result of timestamp validation
 * Requirements: 2.1, 2.2, 2.3
 */
export type ValidationResult = { valid: true } | { valid: false; reason: string; code: string };

/**
 * Result of idempotency check
 * Requirements: 3.1, 3.2
 */
export type IdempotencyResult =
  | { isDuplicate: false }
  | { isDuplicate: true; originalProcessedAt: number };

// ============================================================================
// Internal Types
// ============================================================================

interface IdempotencyEntry {
  svixId: string;
  processedAt: number;
  eventType: string;
}

interface IPFailureRecord {
  failures: number[]; // Array of failure timestamps
}

// ============================================================================
// WebhookSecurityService
// ============================================================================

export class WebhookSecurityService {
  private readonly config: WebhookSecurityConfig;
  private readonly idempotencyCache: LRUCache<string, IdempotencyEntry>;
  private readonly ipFailureCache: LRUCache<string, IPFailureRecord>;

  constructor(config: Partial<WebhookSecurityConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };

    // Initialize idempotency cache
    const idempotencyCacheConfig: LRUCacheConfig = {
      maxSize: this.config.idempotencyCacheSize,
      defaultTTL: this.config.idempotencyCacheTTL,
    };
    this.idempotencyCache = new LRUCache<string, IdempotencyEntry>(idempotencyCacheConfig);

    // Initialize IP failure tracking cache
    const ipFailureCacheConfig: LRUCacheConfig = {
      maxSize: 1000, // Track up to 1000 unique IPs
      defaultTTL: this.config.failureTrackingWindow,
    };
    this.ipFailureCache = new LRUCache<string, IPFailureRecord>(ipFailureCacheConfig);
  }

  /**
   * Validate webhook timestamp for replay attack protection
   *
   * Requirements:
   * - 2.1: Reject timestamps older than 300 seconds (5 minutes)
   * - 2.2: Reject timestamps more than 60 seconds in the future
   * - 2.3: Accept timestamps within the valid window
   *
   * @param timestamp - Unix timestamp in seconds (from svix-timestamp header)
   * @returns ValidationResult indicating if timestamp is valid
   */
  validateTimestamp(timestamp: string): ValidationResult {
    // Parse timestamp
    const timestampSeconds = Number.parseInt(timestamp, 10);

    if (Number.isNaN(timestampSeconds)) {
      return {
        valid: false,
        reason: "Invalid timestamp format: not a valid number",
        code: "WEBHOOK_INVALID_TIMESTAMP_FORMAT",
      };
    }

    const nowSeconds = Math.floor(Date.now() / 1000);
    const ageSeconds = nowSeconds - timestampSeconds;

    // Check if timestamp is too old (potential replay attack)
    // Requirement 2.1: Reject timestamps older than 300 seconds
    if (ageSeconds > this.config.maxTimestampAge) {
      return {
        valid: false,
        reason: `Timestamp too old: ${ageSeconds} seconds (max: ${this.config.maxTimestampAge})`,
        code: "WEBHOOK_REPLAY_DETECTED",
      };
    }

    // Check if timestamp is too far in the future
    // Requirement 2.2: Reject timestamps more than 60 seconds in the future
    if (ageSeconds < -this.config.maxTimestampFuture) {
      return {
        valid: false,
        reason: `Timestamp too far in future: ${-ageSeconds} seconds (max: ${this.config.maxTimestampFuture})`,
        code: "WEBHOOK_INVALID_TIMESTAMP_FUTURE",
      };
    }

    // Requirement 2.3: Valid timestamp within acceptable window
    return { valid: true };
  }

  /**
   * Check if a webhook has already been processed (idempotency check)
   *
   * Requirements:
   * - 3.1: Detect duplicate webhooks by svix-id
   * - 3.2: Cache processed webhooks with 5-minute TTL
   *
   * @param svixId - Unique webhook identifier from svix-id header
   * @returns IdempotencyResult indicating if this is a duplicate
   */
  checkIdempotency(svixId: string): IdempotencyResult {
    const entry = this.idempotencyCache.get(svixId);

    if (entry) {
      return {
        isDuplicate: true,
        originalProcessedAt: entry.processedAt,
      };
    }

    return { isDuplicate: false };
  }

  /**
   * Record a successfully processed webhook for idempotency tracking
   *
   * Requirements:
   * - 3.2: Store svix-id in cache with 5-minute TTL
   * - 3.3: LRU eviction when max size reached (handled by LRUCache)
   *
   * @param svixId - Unique webhook identifier
   * @param eventType - Type of webhook event
   */
  recordProcessed(svixId: string, eventType: string): void {
    const entry: IdempotencyEntry = {
      svixId,
      processedAt: Date.now(),
      eventType,
    };
    this.idempotencyCache.set(svixId, entry);
  }

  /**
   * Track a signature verification failure for an IP address
   *
   * Requirement 4.4: Track failures within 5-minute sliding window
   *
   * @param ip - Source IP address
   */
  trackSignatureFailure(ip: string): void {
    const now = Date.now();
    const record = this.ipFailureCache.get(ip);

    if (record) {
      // Filter out old failures outside the tracking window
      const recentFailures = record.failures.filter(
        timestamp => now - timestamp < this.config.failureTrackingWindow
      );
      recentFailures.push(now);
      this.ipFailureCache.set(ip, { failures: recentFailures });
    } else {
      this.ipFailureCache.set(ip, { failures: [now] });
    }
  }

  /**
   * Check if an IP has exceeded the failure threshold
   *
   * Requirement 4.4: Trigger warning after 5 failures from same IP
   *
   * @param ip - Source IP address
   * @returns true if IP should trigger a security warning
   */
  shouldWarnAboutIP(ip: string): boolean {
    const record = this.ipFailureCache.get(ip);

    if (!record) {
      return false;
    }

    const now = Date.now();
    const recentFailures = record.failures.filter(
      timestamp => now - timestamp < this.config.failureTrackingWindow
    );

    return recentFailures.length >= this.config.failureThreshold;
  }

  /**
   * Get the current failure count for an IP
   *
   * @param ip - Source IP address
   * @returns Number of recent failures
   */
  getFailureCount(ip: string): number {
    const record = this.ipFailureCache.get(ip);

    if (!record) {
      return 0;
    }

    const now = Date.now();
    return record.failures.filter(timestamp => now - timestamp < this.config.failureTrackingWindow)
      .length;
  }

  /**
   * Get the current configuration
   */
  getConfig(): Readonly<WebhookSecurityConfig> {
    return { ...this.config };
  }

  /**
   * Get cache statistics for monitoring
   */
  getCacheStats(): { idempotencyCacheSize: number; ipFailureCacheSize: number } {
    return {
      idempotencyCacheSize: this.idempotencyCache.size,
      ipFailureCacheSize: this.ipFailureCache.size,
    };
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

let instance: WebhookSecurityService | null = null;

/**
 * Get the singleton instance of WebhookSecurityService
 */
export function getWebhookSecurityService(
  config?: Partial<WebhookSecurityConfig>
): WebhookSecurityService {
  instance ??= new WebhookSecurityService(config);
  return instance;
}

/**
 * Reset the singleton instance (useful for testing)
 */
export function resetWebhookSecurityService(): void {
  instance = null;
}
