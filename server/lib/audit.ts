// Configuration Convex
// SECURITY: Use lazy initialization with proper validation, no hardcoded fallback

import { api } from "../../convex/_generated/api";
import { getConvex } from "./convex";

export interface AuditLogEntry {
  userId?: string;
  action: string;
  resource: string;
  details?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  timestamp?: number;
}

export class AuditLogger {
  private static instance: AuditLogger;

  private constructor() {}

  public static getInstance(): AuditLogger {
    if (!AuditLogger.instance) {
      AuditLogger.instance = new AuditLogger();
    }
    return AuditLogger.instance;
  }

  /**
   * Log a security-relevant action to Convex
   * Implements graceful degradation - logs to console if Convex fails
   * Requirements: 1.1, 1.4
   */
  async log(entry: AuditLogEntry): Promise<void> {
    try {
      const convex = getConvex();
      // @ts-expect-error - Convex API type instantiation depth issue
      await convex.mutation(api.audit.logAuditEvent, {
        userId: entry.userId,
        action: entry.action,
        resource: entry.resource,
        details: entry.details as Record<string, never> | undefined,
        ipAddress: entry.ipAddress,
        userAgent: entry.userAgent,
      });
    } catch (error) {
      // Graceful degradation: log error and continue without throwing
      // Requirements: 1.4, 5.1
      console.error("Failed to log audit entry to Convex:", error);
      console.log("Audit log entry (fallback):", entry);
    }
  }

  /**
   * Log user registration
   */
  async logRegistration(userId: string, ipAddress?: string, userAgent?: string): Promise<void> {
    await this.log({
      userId,
      action: "user_registered",
      resource: "users",
      details: { event: "registration_success" },
      ipAddress,
      userAgent,
    });
  }

  /**
   * Log user login
   */
  async logLogin(userId: string, ipAddress?: string, userAgent?: string): Promise<void> {
    await this.log({
      userId,
      action: "user_login",
      resource: "users",
      details: { event: "login_success" },
      ipAddress,
      userAgent,
    });
  }

  /**
   * Log failed login attempt
   */
  async logFailedLogin(username: string, ipAddress?: string, userAgent?: string): Promise<void> {
    await this.log({
      action: "login_failed",
      resource: "users",
      details: { username, event: "login_failed" },
      ipAddress,
      userAgent,
    });
  }

  /**
   * Log subscription creation
   */
  async logSubscriptionCreated(
    userId: string,
    plan: string,
    billingInterval: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    await this.log({
      userId,
      action: "subscription_created",
      resource: "subscriptions",
      details: { plan, billingInterval, event: "subscription_created" },
      ipAddress,
      userAgent,
    });
  }

  /**
   * Log subscription update
   */
  async logSubscriptionUpdated(
    userId: string,
    oldStatus: string,
    newStatus: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    await this.log({
      userId,
      action: "subscription_updated",
      resource: "subscriptions",
      details: {
        oldStatus,
        newStatus,
        event: "subscription_updated",
      },
      ipAddress,
      userAgent,
    });
  }

  /**
   * Log subscription cancellation
   */
  async logSubscriptionCancelled(
    userId: string,
    plan: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    await this.log({
      userId,
      action: "subscription_cancelled",
      resource: "subscriptions",
      details: { plan, event: "subscription_cancelled" },
      ipAddress,
      userAgent,
    });
  }

  /**
   * Log payment processed
   */
  async logPaymentProcessed(
    userId: string,
    amount: number,
    currency: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    await this.log({
      userId,
      action: "payment_processed",
      resource: "payments",
      details: { amount, currency, event: "payment_success" },
      ipAddress,
      userAgent,
    });
  }

  /**
   * Log payment failure
   */
  async logPaymentFailed(
    userId: string,
    amount: number,
    currency: string,
    error: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    await this.log({
      userId,
      action: "payment_failed",
      resource: "payments",
      details: { amount, currency, error, event: "payment_failed" },
      ipAddress,
      userAgent,
    });
  }

  /**
   * Log profile update
   */
  async logProfileUpdated(
    userId: string,
    fields: string[],
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    await this.log({
      userId,
      action: "profile_updated",
      resource: "users",
      details: { fields, event: "profile_updated" },
      ipAddress,
      userAgent,
    });
  }

  /**
   * Log security event
   */
  async logSecurityEvent(
    userId: string,
    event: string,
    details: Record<string, unknown>,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    await this.log({
      userId,
      action: "security_event",
      resource: "security",
      details: { ...details, event },
      ipAddress,
      userAgent,
    });
  }

  /**
   * Log rate limit exceeded
   */
  async logRateLimitExceeded(ipAddress: string, endpoint: string, limit: number): Promise<void> {
    await this.log({
      action: "rate_limit_exceeded",
      resource: "api",
      details: { endpoint, limit, event: "rate_limit_exceeded" },
      ipAddress,
      userAgent: undefined,
    });
  }

  /**
   * Get user audit logs from Convex
   * Requirements: 1.2
   */
  async getUserAuditLogs(clerkId: string, limit = 50): Promise<AuditLogEntry[]> {
    try {
      const convex = getConvex();
      const logs = await convex.query(api.audit.getUserAuditLogs, {
        clerkId,
        limit,
      });

      // Transform Convex response to AuditLogEntry[] format
      return logs.map(log => ({
        userId: log.clerkId ?? undefined,
        action: log.action,
        resource: log.resource,
        details: log.details as Record<string, unknown> | undefined,
        ipAddress: log.ipAddress ?? undefined,
        userAgent: log.userAgent ?? undefined,
        timestamp: log.timestamp,
      }));
    } catch (error) {
      console.error("Failed to get user audit logs from Convex:", error);
      return [];
    }
  }

  /**
   * Get security events from Convex
   * Requirements: 1.3
   */
  async getSecurityEvents(limit = 100): Promise<AuditLogEntry[]> {
    try {
      const convex = getConvex();
      const events = await convex.query(api.audit.getSecurityEvents, {
        limit,
      });

      // Transform Convex response to AuditLogEntry[] format
      return events.map(event => ({
        userId: event.clerkId ?? undefined,
        action: event.action,
        resource: event.resource,
        details: event.details as Record<string, unknown> | undefined,
        ipAddress: event.ipAddress ?? undefined,
        userAgent: event.userAgent ?? undefined,
        timestamp: event.timestamp,
      }));
    } catch (error) {
      console.error("Failed to get security events from Convex:", error);
      return [];
    }
  }
}

// Export singleton instance
export const auditLogger = AuditLogger.getInstance();
