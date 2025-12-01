// Configuration Convex
// SECURITY: Use lazy initialization with proper validation, no hardcoded fallback

export interface AuditLogEntry {
  userId?: string;
  action: string;
  resource: string;
  details?: Record<string, unknown>;
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
   * Note: Convex integration pending - currently logs to console
   */
  async log(entry: AuditLogEntry): Promise<void> {
    try {
      // Log to console for now - Convex integration pending
      console.log("Audit log entry:", entry);
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
   * Get user audit logs
   * Note: Convex integration temporarily disabled for strict mode compliance
   */
  async getUserAuditLogs(_userId: string, _limit = 50): Promise<AuditLogEntry[]> {
    try {
      // Temporary fallback - Convex integration pending
      console.log("Getting audit logs for user:", _userId, "limit:", _limit);
      return [];
    } catch (error) {
      console.error("Failed to get user audit logs:", error);
      return [];
    }
  }

  /**
   * Get security events
   * Note: Convex integration temporarily disabled for strict mode compliance
   */
  async getSecurityEvents(_limit = 100): Promise<AuditLogEntry[]> {
    try {
      // Temporary fallback - Convex integration pending
      const events: AuditLogEntry[] = [];
      return events;
    } catch (error) {
      console.error("Failed to get security events:", error);
      return [];
    }
  }
}

// Export singleton instance
export const auditLogger = AuditLogger.getInstance();
