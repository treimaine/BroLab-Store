import { ConvexHttpClient } from "convex/browser";
import { api } from "../../convex/_generated/api";

// Configuration Convex
const convexUrl = process.env.VITE_CONVEX_URL || "https://agile-boar-163.convex.cloud";
const convex = new ConvexHttpClient(convexUrl);

export interface AuditLogEntry {
  userId?: string;
  action: string;
  resource: string;
  details?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
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
   * Log a security-relevant action
   */
  async log(entry: AuditLogEntry): Promise<void> {
    try {
      await convex.mutation(api.audit.logAuditEvent, {
        userId: entry.userId,
        action: entry.action,
        resource: entry.resource,
        details: entry.details,
        ipAddress: entry.ipAddress,
        userAgent: entry.userAgent,
      });
    } catch (error) {
      console.error("Failed to log audit entry:", error);
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
    details: Record<string, any>,
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
   * Get user audit logs
   */
  async getUserAuditLogs(userId: string, limit = 50): Promise<any[]> {
    try {
      const logs = await convex.query(api.audit.getUserAuditLogs, {
        clerkId: userId,
        limit,
      });
      return logs;
    } catch (error) {
      console.error("Failed to get user audit logs:", error);
      return [];
    }
  }

  /**
   * Get security events
   */
  async getSecurityEvents(limit = 100): Promise<any[]> {
    try {
      const events = await convex.query(api.audit.getSecurityEvents, { limit });
      return events;
    } catch (error) {
      console.error("Failed to get security events:", error);
      return [];
    }
  }
}

// Export singleton instance
export const auditLogger = AuditLogger.getInstance();
