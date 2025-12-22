/**
 * AdminNotificationService - Handles admin notifications for critical payment events
 *
 * Responsibilities:
 * - Send email notifications to admins for critical payment failures
 * - Format notification content with relevant context
 * - Track notification delivery status
 * - Implement rate limiting to prevent notification spam
 *
 * Requirements: 8.4, 8.5
 */

import { ConvexHttpClient } from "convex/browser";
import { centsToDollars } from "../../shared/utils/currency";
import { ErrorSeverity } from "../utils/errorHandling";
import { sendAdminNotification } from "./mail";

/**
 * Notification types
 */
export enum NotificationType {
  PAYMENT_FAILURE = "payment_failure",
  SIGNATURE_VERIFICATION_FAILURE = "signature_verification_failure",
  WEBHOOK_PROCESSING_ERROR = "webhook_processing_error",
  REFUND_PROCESSED = "refund_processed",
  CONFIGURATION_ERROR = "configuration_error",
}

/**
 * Notification payload
 */
export interface NotificationPayload {
  type: NotificationType;
  severity: ErrorSeverity;
  title: string;
  message: string;
  metadata?: Record<string, unknown>;
  requestId?: string;
  timestamp: number;
}

/**
 * AdminNotificationService class
 */
export class AdminNotificationService {
  private static instance: AdminNotificationService;
  private readonly convex: ConvexHttpClient;
  private readonly notificationCache: Map<string, number> = new Map();
  private readonly rateLimitWindow = 5 * 60 * 1000; // 5 minutes
  private readonly maxNotificationsPerWindow = 10;

  private constructor() {
    const convexUrl = process.env.VITE_CONVEX_URL;
    if (!convexUrl) {
      throw new Error("VITE_CONVEX_URL environment variable is required");
    }
    this.convex = new ConvexHttpClient(convexUrl);
  }

  /**
   * Get singleton instance
   */
  static getInstance(): AdminNotificationService {
    if (!AdminNotificationService.instance) {
      AdminNotificationService.instance = new AdminNotificationService();
    }
    return AdminNotificationService.instance;
  }

  /**
   * Send admin notification for critical payment failure
   */
  async notifyPaymentFailure(
    orderId: string,
    paymentIntentId: string,
    amount: number,
    currency: string,
    failureReason?: string,
    requestId?: string
  ): Promise<void> {
    const payload: NotificationPayload = {
      type: NotificationType.PAYMENT_FAILURE,
      severity: ErrorSeverity.HIGH,
      title: "Payment Failure Detected",
      message: `Payment failed for order ${orderId}`,
      metadata: {
        orderId,
        paymentIntentId,
        amount: centsToDollars(amount).toFixed(2),
        currency: currency.toUpperCase(),
        failureReason: failureReason || "Unknown reason",
      },
      requestId,
      timestamp: Date.now(),
    };

    await this.sendNotification(payload);
  }

  /**
   * Send admin notification for signature verification failure
   */
  async notifySignatureVerificationFailure(
    provider: "stripe" | "paypal",
    errorMessage: string,
    requestId?: string
  ): Promise<void> {
    const payload: NotificationPayload = {
      type: NotificationType.SIGNATURE_VERIFICATION_FAILURE,
      severity: ErrorSeverity.CRITICAL,
      title: "⚠️ Security Alert: Signature Verification Failed",
      message: `${provider.toUpperCase()} webhook signature verification failed`,
      metadata: {
        provider,
        error: errorMessage,
        securityNote: "This could indicate a security issue or misconfiguration",
      },
      requestId,
      timestamp: Date.now(),
    };

    await this.sendNotification(payload);
  }

  /**
   * Send admin notification for webhook processing error
   */
  async notifyWebhookProcessingError(
    provider: "stripe" | "paypal",
    eventType: string,
    eventId: string,
    errorMessage: string,
    requestId?: string
  ): Promise<void> {
    const payload: NotificationPayload = {
      type: NotificationType.WEBHOOK_PROCESSING_ERROR,
      severity: ErrorSeverity.HIGH,
      title: "Webhook Processing Error",
      message: `Failed to process ${provider.toUpperCase()} webhook: ${eventType}`,
      metadata: {
        provider,
        eventType,
        eventId,
        error: errorMessage,
      },
      requestId,
      timestamp: Date.now(),
    };

    await this.sendNotification(payload);
  }

  /**
   * Send admin notification for refund processed
   */
  async notifyRefundProcessed(
    orderId: string,
    chargeId: string,
    amountRefunded: number,
    currency: string,
    reason?: string,
    requestId?: string
  ): Promise<void> {
    const payload: NotificationPayload = {
      type: NotificationType.REFUND_PROCESSED,
      severity: ErrorSeverity.MEDIUM,
      title: "Refund Processed",
      message: `Refund processed for order ${orderId}`,
      metadata: {
        orderId,
        chargeId,
        amountRefunded: centsToDollars(amountRefunded).toFixed(2),
        currency: currency.toUpperCase(),
        reason: reason || "No reason provided",
      },
      requestId,
      timestamp: Date.now(),
    };

    await this.sendNotification(payload);
  }

  /**
   * Send admin notification for configuration error
   */
  async notifyConfigurationError(
    service: string,
    missingConfig: string[],
    requestId?: string
  ): Promise<void> {
    const payload: NotificationPayload = {
      type: NotificationType.CONFIGURATION_ERROR,
      severity: ErrorSeverity.CRITICAL,
      title: "⚠️ Configuration Error",
      message: `Missing configuration for ${service}`,
      metadata: {
        service,
        missingConfig,
        action: "Please check environment variables and update configuration",
      },
      requestId,
      timestamp: Date.now(),
    };

    await this.sendNotification(payload);
  }

  /**
   * Send notification with rate limiting
   */
  private async sendNotification(payload: NotificationPayload): Promise<void> {
    try {
      // Check rate limit
      if (!this.shouldSendNotification(payload.type)) {
        console.log(`⏸️ Rate limit reached for ${payload.type}, skipping notification`);
        return;
      }

      // Generate email content
      const emailContent = this.generateEmailContent(payload);

      // Send email to admins
      await sendAdminNotification(payload.type, {
        subject: payload.title,
        html: emailContent,
        metadata: payload.metadata,
      });

      // Log notification to audit
      await this.logNotificationToAudit(payload);

      // Update rate limit cache
      this.updateRateLimitCache(payload.type);

      console.log(`✅ Admin notification sent: ${payload.type}`);
    } catch (error) {
      console.error("❌ Failed to send admin notification:", error);
      // Don't throw - notification failure shouldn't break payment processing
    }
  }

  /**
   * Check if notification should be sent based on rate limiting
   */
  private shouldSendNotification(type: NotificationType): boolean {
    const cacheKey = `notification:${type}`;
    const lastSent = this.notificationCache.get(cacheKey);
    const now = Date.now();

    if (!lastSent) {
      return true;
    }

    // Check if we're within the rate limit window
    if (now - lastSent < this.rateLimitWindow) {
      // Count notifications in this window
      const count = Array.from(this.notificationCache.entries()).filter(
        ([key, timestamp]) =>
          key.startsWith(`notification:${type}:`) && now - timestamp < this.rateLimitWindow
      ).length;

      if (count >= this.maxNotificationsPerWindow) {
        return false;
      }
    }

    return true;
  }

  /**
   * Update rate limit cache
   */
  private updateRateLimitCache(type: NotificationType): void {
    const cacheKey = `notification:${type}:${Date.now()}`;
    this.notificationCache.set(cacheKey, Date.now());

    // Clean up old entries
    const now = Date.now();
    for (const [key, timestamp] of this.notificationCache.entries()) {
      if (now - timestamp > this.rateLimitWindow) {
        this.notificationCache.delete(key);
      }
    }
  }

  /**
   * Generate email content for notification
   */
  private generateEmailContent(payload: NotificationPayload): string {
    const severityColor = this.getSeverityColor(payload.severity);
    const severityLabel = payload.severity.toUpperCase();

    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: ${severityColor}; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
          <h2 style="margin: 0;">${payload.title}</h2>
          <p style="margin: 10px 0 0 0; opacity: 0.9;">Severity: ${severityLabel}</p>
        </div>
        
        <div style="background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; border-top: none;">
          <p style="margin: 0 0 15px 0; font-size: 16px; color: #374151;">
            ${payload.message}
          </p>
          
          ${payload.requestId ? `<p style="margin: 0 0 15px 0; color: #6b7280; font-size: 14px;"><strong>Request ID:</strong> ${payload.requestId}</p>` : ""}
          
          ${payload.metadata ? this.formatMetadata(payload.metadata) : ""}
          
          <p style="margin: 20px 0 0 0; color: #6b7280; font-size: 14px;">
            <strong>Timestamp:</strong> ${new Date(payload.timestamp).toLocaleString()}
          </p>
        </div>
        
        <div style="background: #1f2937; color: #9ca3af; padding: 15px; text-align: center; border-radius: 0 0 8px 8px; font-size: 12px;">
          <p style="margin: 0;">BroLab Entertainment - Payment System Alert</p>
          <p style="margin: 5px 0 0 0;">This is an automated notification. Please review and take appropriate action.</p>
        </div>
      </div>
    `;
  }

  /**
   * Format metadata for email display
   */
  private formatMetadata(metadata: Record<string, unknown>): string {
    const rows = Object.entries(metadata)
      .map(
        ([key, value]) => `
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; font-weight: bold; color: #374151;">
            ${this.formatKey(key)}
          </td>
          <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; color: #6b7280;">
            ${this.formatValue(value)}
          </td>
        </tr>
      `
      )
      .join("");

    return `
      <table style="width: 100%; margin: 15px 0; border-collapse: collapse; background: white; border-radius: 4px; overflow: hidden;">
        ${rows}
      </table>
    `;
  }

  /**
   * Format metadata key for display
   */
  private formatKey(key: string): string {
    // Add space before capital letters, then capitalize first letter
    const withSpaces = key.replaceAll(/([A-Z])/g, " $1");
    const capitalized = withSpaces.charAt(0).toUpperCase() + withSpaces.slice(1);
    return capitalized.trim();
  }

  /**
   * Format metadata value for display
   */
  private formatValue(value: unknown): string {
    if (value === null || value === undefined) {
      return "N/A";
    }

    if (typeof value === "object" && value !== null) {
      try {
        return `<pre style="margin: 0; font-size: 12px; white-space: pre-wrap;">${JSON.stringify(value, null, 2)}</pre>`;
      } catch {
        return "[Complex Object]";
      }
    }

    if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
      return String(value);
    }

    return "[Unknown Type]";
  }

  /**
   * Get color for severity level
   */
  private getSeverityColor(severity: ErrorSeverity): string {
    switch (severity) {
      case ErrorSeverity.CRITICAL:
        return "#dc2626"; // Red
      case ErrorSeverity.HIGH:
        return "#ea580c"; // Orange
      case ErrorSeverity.MEDIUM:
        return "#f59e0b"; // Amber
      case ErrorSeverity.LOW:
        return "#3b82f6"; // Blue
      default:
        return "#6b7280"; // Gray
    }
  }

  /**
   * Log notification to audit trail
   */
  private async logNotificationToAudit(payload: NotificationPayload): Promise<void> {
    try {
      // Log to console for now - Convex audit logging has type issues
      console.log("📝 Admin notification audit log:", {
        action: "admin_notification_sent",
        resource: "notifications",
        type: payload.type,
        severity: payload.severity,
        title: payload.title,
        requestId: payload.requestId,
        timestamp: payload.timestamp,
      });
    } catch (error) {
      console.error("❌ Failed to log notification to audit:", error);
      // Don't throw - audit logging failure shouldn't break notification
    }
  }
}

// Export singleton instance
export const adminNotificationService = AdminNotificationService.getInstance();
