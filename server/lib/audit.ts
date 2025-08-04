import { supabaseAdmin } from './supabase';

export interface AuditLogEntry {
  userId?: number;
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
      const { data, error } = await supabaseAdmin
        .from('audit_logs')
        .insert({
          user_id: entry.userId || null,
          action: entry.action,
          resource: entry.resource,
          details: entry.details || null,
          ip_address: entry.ipAddress || null,
          user_agent: entry.userAgent || null,
        });

      if (error) {
        console.error('Audit log error:', error);
      }
    } catch (error) {
      console.error('Failed to log audit entry:', error);
    }
  }

  /**
   * Log user registration
   */
  async logRegistration(userId: number, ipAddress?: string, userAgent?: string): Promise<void> {
    await this.log({
      userId,
      action: 'user_registered',
      resource: 'users',
      details: { event: 'registration_success' },
      ipAddress,
      userAgent,
    });
  }

  /**
   * Log user login
   */
  async logLogin(userId: number, ipAddress?: string, userAgent?: string): Promise<void> {
    await this.log({
      userId,
      action: 'user_login',
      resource: 'users',
      details: { event: 'login_success' },
      ipAddress,
      userAgent,
    });
  }

  /**
   * Log failed login attempt
   */
  async logFailedLogin(username: string, ipAddress?: string, userAgent?: string): Promise<void> {
    await this.log({
      action: 'login_failed',
      resource: 'users',
      details: { username, event: 'login_failed' },
      ipAddress,
      userAgent,
    });
  }

  /**
   * Log subscription creation
   */
  async logSubscriptionCreated(
    userId: number, 
    plan: string, 
    billingInterval: string,
    ipAddress?: string, 
    userAgent?: string
  ): Promise<void> {
    await this.log({
      userId,
      action: 'subscription_created',
      resource: 'subscriptions',
      details: { 
        plan, 
        billingInterval, 
        event: 'subscription_created' 
      },
      ipAddress,
      userAgent,
    });
  }

  /**
   * Log subscription update
   */
  async logSubscriptionUpdated(
    userId: number, 
    oldStatus: string, 
    newStatus: string,
    ipAddress?: string, 
    userAgent?: string
  ): Promise<void> {
    await this.log({
      userId,
      action: 'subscription_updated',
      resource: 'subscriptions',
      details: { 
        oldStatus, 
        newStatus, 
        event: 'subscription_updated' 
      },
      ipAddress,
      userAgent,
    });
  }

  /**
   * Log subscription cancellation
   */
  async logSubscriptionCancelled(
    userId: number, 
    plan: string,
    ipAddress?: string, 
    userAgent?: string
  ): Promise<void> {
    await this.log({
      userId,
      action: 'subscription_cancelled',
      resource: 'subscriptions',
      details: { 
        plan, 
        event: 'subscription_cancelled' 
      },
      ipAddress,
      userAgent,
    });
  }

  /**
   * Log payment processing
   */
  async logPaymentProcessed(
    userId: number, 
    amount: number, 
    currency: string,
    ipAddress?: string, 
    userAgent?: string
  ): Promise<void> {
    await this.log({
      userId,
      action: 'payment_processed',
      resource: 'payments',
      details: { 
        amount, 
        currency, 
        event: 'payment_success' 
      },
      ipAddress,
      userAgent,
    });
  }

  /**
   * Log failed payment
   */
  async logPaymentFailed(
    userId: number, 
    amount: number, 
    currency: string,
    error: string,
    ipAddress?: string, 
    userAgent?: string
  ): Promise<void> {
    await this.log({
      userId,
      action: 'payment_failed',
      resource: 'payments',
      details: { 
        amount, 
        currency, 
        error, 
        event: 'payment_failed' 
      },
      ipAddress,
      userAgent,
    });
  }

  /**
   * Log profile update
   */
  async logProfileUpdated(
    userId: number, 
    fields: string[],
    ipAddress?: string, 
    userAgent?: string
  ): Promise<void> {
    await this.log({
      userId,
      action: 'profile_updated',
      resource: 'users',
      details: { 
        fields, 
        event: 'profile_updated' 
      },
      ipAddress,
      userAgent,
    });
  }

  /**
   * Log security event
   */
  async logSecurityEvent(
    userId: number, 
    event: string, 
    details: Record<string, any>,
    ipAddress?: string, 
    userAgent?: string
  ): Promise<void> {
    await this.log({
      userId,
      action: 'security_event',
      resource: 'security',
      details: { 
        event, 
        ...details 
      },
      ipAddress,
      userAgent,
    });
  }

  /**
   * Log rate limit exceeded
   */
  async logRateLimitExceeded(
    ipAddress: string, 
    endpoint: string, 
    limit: number
  ): Promise<void> {
    await this.log({
      action: 'rate_limit_exceeded',
      resource: 'security',
      details: { 
        endpoint, 
        limit, 
        event: 'rate_limit_exceeded' 
      },
      ipAddress,
    });
  }

  /**
   * Get audit logs for a user (admin only)
   */
  async getUserAuditLogs(userId: number, limit = 50): Promise<any[]> {
    try {
      const { data, error } = await supabaseAdmin
        .from('audit_logs')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Error fetching audit logs:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Failed to fetch audit logs:', error);
      return [];
    }
  }

  /**
   * Get recent security events (admin only)
   */
  async getSecurityEvents(limit = 100): Promise<any[]> {
    try {
      const { data, error } = await supabaseAdmin
        .from('audit_logs')
        .select('*')
        .in('action', ['login_failed', 'rate_limit_exceeded', 'security_event'])
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Error fetching security events:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Failed to fetch security events:', error);
      return [];
    }
  }
}

// Export singleton instance
export const auditLogger = AuditLogger.getInstance(); 