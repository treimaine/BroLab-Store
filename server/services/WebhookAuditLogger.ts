/**
 * WebhookAuditLogger - Structured audit logging for Clerk Billing webhooks
 *
 * Provides:
 * - Structured JSON logging for webhook events (Requirements 4.1, 4.2, 4.3)
 * - Security warning logging for suspicious activity (Requirement 4.4)
 * - Complete audit trail for security analysis and debugging
 */

// ============================================================================
// Interfaces
// ============================================================================

/**
 * Outcome of webhook processing
 */
export type WebhookOutcome = "success" | "rejected" | "duplicate" | "error";

/**
 * Structured audit entry for webhook events
 * Requirements: 4.1, 4.2, 4.3
 */
export interface WebhookAuditEntry {
  /** Unique request identifier (UUID) for tracing */
  requestId: string;
  /** ISO 8601 timestamp of the request */
  timestamp: string;
  /** Type of webhook event (e.g., 'session.created', 'invoice.paid') */
  eventType: string;
  /** Source IP address of the request */
  sourceIp: string;
  /** Svix webhook identifier */
  svixId: string;
  /** Whether signature verification passed */
  signatureValid: boolean;
  /** Time taken to process the webhook in milliseconds */
  processingTimeMs: number;
  /** Final outcome of webhook processing */
  outcome: WebhookOutcome;
  /** Reason for rejection (when outcome is 'rejected') */
  rejectionReason?: string;
  /** Convex mutation called (when outcome is 'success') */
  mutationCalled?: string;
  /** Whether sync to Convex succeeded (when outcome is 'success') */
  syncStatus?: boolean;
}

/**
 * Security warning entry for suspicious activity
 * Requirement: 4.4
 */
export interface SecurityWarningEntry {
  /** ISO 8601 timestamp of the warning */
  timestamp: string;
  /** Source IP address triggering the warning */
  sourceIp: string;
  /** Number of failures from this IP */
  failureCount: number;
  /** Warning message */
  message: string;
}

/**
 * Log level for audit entries
 */
export type LogLevel = "info" | "warn" | "error";

// ============================================================================
// WebhookAuditLogger
// ============================================================================

export class WebhookAuditLogger {
  private static instance: WebhookAuditLogger;

  private constructor() {}

  /**
   * Get singleton instance
   */
  public static getInstance(): WebhookAuditLogger {
    if (!WebhookAuditLogger.instance) {
      WebhookAuditLogger.instance = new WebhookAuditLogger();
    }
    return WebhookAuditLogger.instance;
  }

  /**
   * Log a webhook audit entry
   *
   * Requirements:
   * - 4.1: Log structured audit entry for any webhook request
   * - 4.2: Include rejection reason for rejected webhooks
   * - 4.3: Include mutation called and sync status for successful webhooks
   *
   * @param entry - Complete audit entry with all required fields
   */
  log(entry: WebhookAuditEntry): void {
    const level = this.determineLogLevel(entry);
    const logEntry = this.formatLogEntry(entry);

    // Output as structured JSON for easy parsing by log aggregators
    this.writeLog(level, logEntry);
  }

  /**
   * Log a security warning for suspicious IP activity
   *
   * Requirement 4.4: Log security warning when multiple failures from same IP
   *
   * @param ip - Source IP address
   * @param failureCount - Number of failures from this IP
   */
  logSecurityWarning(ip: string, failureCount: number): void {
    const warningEntry: SecurityWarningEntry = {
      timestamp: new Date().toISOString(),
      sourceIp: ip,
      failureCount,
      message: `Multiple signature verification failures detected from IP: ${ip}`,
    };

    const logEntry = {
      type: "webhook_security_warning",
      ...warningEntry,
    };

    // Security warnings are always logged at warn level
    this.writeLog("warn", logEntry);
  }

  /**
   * Create a partial audit entry with common fields pre-filled
   * Useful for starting to build an audit entry at request start
   *
   * @param requestId - Unique request identifier
   * @param sourceIp - Source IP address
   * @param svixId - Svix webhook identifier
   * @returns Partial audit entry with common fields
   */
  createPartialEntry(
    requestId: string,
    sourceIp: string,
    svixId: string
  ): Pick<WebhookAuditEntry, "requestId" | "timestamp" | "sourceIp" | "svixId"> {
    return {
      requestId,
      timestamp: new Date().toISOString(),
      sourceIp,
      svixId,
    };
  }

  /**
   * Determine the appropriate log level based on outcome
   */
  private determineLogLevel(entry: WebhookAuditEntry): LogLevel {
    switch (entry.outcome) {
      case "success":
      case "duplicate":
        return "info";
      case "rejected":
        return "warn";
      case "error":
        return "error";
      default:
        return "info";
    }
  }

  /**
   * Format the audit entry for logging
   * Adds type field and ensures consistent structure
   */
  private formatLogEntry(entry: WebhookAuditEntry): Record<string, unknown> {
    const logEntry: Record<string, unknown> = {
      type: "webhook_audit",
      requestId: entry.requestId,
      timestamp: entry.timestamp,
      eventType: entry.eventType,
      sourceIp: entry.sourceIp,
      svixId: entry.svixId,
      signatureValid: entry.signatureValid,
      processingTimeMs: entry.processingTimeMs,
      outcome: entry.outcome,
    };

    // Include optional fields only when present
    if (entry.rejectionReason !== undefined) {
      logEntry.rejectionReason = entry.rejectionReason;
    }

    if (entry.mutationCalled !== undefined) {
      logEntry.mutationCalled = entry.mutationCalled;
    }

    if (entry.syncStatus !== undefined) {
      logEntry.syncStatus = entry.syncStatus;
    }

    return logEntry;
  }

  /**
   * Write log entry to console as JSON
   * In production, this would be picked up by log aggregators
   */
  private writeLog(level: LogLevel, entry: Record<string, unknown>): void {
    const jsonLog = JSON.stringify(entry);

    switch (level) {
      case "info":
        console.info(jsonLog);
        break;
      case "warn":
        console.warn(jsonLog);
        break;
      case "error":
        console.error(jsonLog);
        break;
    }
  }
}

// ============================================================================
// Singleton Instance Export
// ============================================================================

/**
 * Get the singleton instance of WebhookAuditLogger
 */
export function getWebhookAuditLogger(): WebhookAuditLogger {
  return WebhookAuditLogger.getInstance();
}

/**
 * Convenience export for direct usage
 */
export const webhookAuditLogger = WebhookAuditLogger.getInstance();
