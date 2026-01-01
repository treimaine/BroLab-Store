import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const log = mutation({
  args: {
    action: v.string(),
    resource: v.string(),
    details: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("auditLogs", {
      action: args.action,
      resource: args.resource,
      details: args.details,
      timestamp: Date.now(),
    });
    return { success: true };
  },
});

export interface AuditLogEntry {
  userId?: string;
  action: string;
  resource: string;
  details?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}

// Enhanced audit details interface to support both structured and flexible properties
export interface AuditDetails {
  // Core structured properties (optional for backward compatibility)
  operation?: string;
  resource?: string;
  resourceId?: string;
  changes?: Array<{
    field: string;
    oldValue?: string;
    newValue?: string;
    changeType: "create" | "update" | "delete";
  }>;
  context?: {
    requestId?: string;
    sessionId?: string;
    apiVersion?: string;
    clientVersion?: string;
    correlationId?: string;
  };
  // Allow additional custom properties for specific audit events
  [key: string]: unknown;
}

// Log a security-relevant action
export const logAuditEvent = mutation({
  args: {
    userId: v.optional(v.string()),
    action: v.string(),
    resource: v.string(),
    details: v.optional(v.any()),
    ipAddress: v.optional(v.string()),
    userAgent: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Get user if userId is provided
    let user = null;
    if (args.userId) {
      user = await ctx.db
        .query("users")
        .withIndex("by_clerk_id", q => q.eq("clerkId", args.userId!))
        .first();
    }

    return await ctx.db.insert("auditLogs", {
      userId: user?._id || undefined,
      clerkId: args.userId || undefined,
      action: args.action,
      resource: args.resource,
      details: args.details || undefined,
      ipAddress: args.ipAddress || undefined,
      userAgent: args.userAgent || undefined,
      timestamp: Date.now(),
    });
  },
});

// Get user audit logs
export const getUserAuditLogs = query({
  args: {
    clerkId: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { clerkId, limit = 50 }) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", q => q.eq("clerkId", clerkId))
      .first();

    if (!user) return [];

    const logs = await ctx.db
      .query("auditLogs")
      .withIndex("by_user", q => q.eq("userId", user._id))
      .order("desc")
      .take(limit);

    return logs;
  },
});

// Get security events
export const getSecurityEvents = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, { limit = 100 }) => {
    const logs = await ctx.db
      .query("auditLogs")
      .filter(q =>
        q.or(
          q.eq(q.field("action"), "login_failed"),
          q.eq(q.field("action"), "security_event"),
          q.eq(q.field("action"), "rate_limit_exceeded")
        )
      )
      .order("desc")
      .take(limit);

    return logs;
  },
});

// Log user registration
export const logRegistration = mutation({
  args: {
    clerkId: v.string(),
    ipAddress: v.optional(v.string()),
    userAgent: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Get user
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", q => q.eq("clerkId", args.clerkId))
      .first();

    return await ctx.db.insert("auditLogs", {
      userId: user?._id || undefined,
      clerkId: args.clerkId,
      action: "user_registered",
      resource: "users",
      details: { event: "registration_success" },
      ipAddress: args.ipAddress || undefined,
      userAgent: args.userAgent || undefined,
      timestamp: Date.now(),
    });
  },
});

// Log user login
export const logLogin = mutation({
  args: {
    clerkId: v.string(),
    ipAddress: v.optional(v.string()),
    userAgent: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Get user
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", q => q.eq("clerkId", args.clerkId))
      .first();

    return await ctx.db.insert("auditLogs", {
      userId: user?._id || undefined,
      clerkId: args.clerkId,
      action: "user_login",
      resource: "users",
      details: { event: "login_success" },
      ipAddress: args.ipAddress || undefined,
      userAgent: args.userAgent || undefined,
      timestamp: Date.now(),
    });
  },
});

// Log failed login attempt
export const logFailedLogin = mutation({
  args: {
    username: v.string(),
    ipAddress: v.optional(v.string()),
    userAgent: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("auditLogs", {
      userId: undefined,
      clerkId: undefined,
      action: "login_failed",
      resource: "users",
      details: { username: args.username, event: "login_failed" },
      ipAddress: args.ipAddress || undefined,
      userAgent: args.userAgent || undefined,
      timestamp: Date.now(),
    });
  },
});

// Log authentication error (for Clerk errors)
export const logAuthenticationError = mutation({
  args: {
    endpoint: v.string(),
    statusCode: v.number(),
    userAction: v.string(),
    errorMessage: v.string(),
    errorStack: v.optional(v.string()),
    userAgent: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("auditLogs", {
      userId: undefined,
      clerkId: undefined,
      action: "authentication_error",
      resource: "clerk",
      details: {
        endpoint: args.endpoint,
        statusCode: args.statusCode,
        userAction: args.userAction,
        errorMessage: args.errorMessage,
        errorStack: args.errorStack,
        timestamp: new Date().toISOString(),
      },
      ipAddress: undefined,
      userAgent: args.userAgent || undefined,
      timestamp: Date.now(),
    });
  },
});

// ============================================================================
// SPECIALIZED AUDIT MUTATIONS
// ============================================================================

/**
 * Log payment-related events (Stripe, PayPal webhooks, payment confirmations)
 * Use for: webhook processing, payment success/failure, refunds
 */
export const logPaymentEvent = mutation({
  args: {
    action: v.string(), // 'payment_succeeded', 'payment_failed', 'refund_processed', 'webhook_received'
    provider: v.string(), // 'stripe', 'paypal'
    orderId: v.optional(v.string()),
    amount: v.optional(v.number()),
    currency: v.optional(v.string()),
    eventId: v.optional(v.string()),
    paymentIntentId: v.optional(v.string()),
    errorMessage: v.optional(v.string()),
    metadata: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("auditLogs", {
      userId: undefined,
      clerkId: undefined,
      action: args.action,
      resource: "payments",
      details: {
        provider: args.provider,
        orderId: args.orderId,
        amount: args.amount,
        currency: args.currency,
        eventId: args.eventId,
        paymentIntentId: args.paymentIntentId,
        errorMessage: args.errorMessage,
        ...args.metadata,
      },
      ipAddress: undefined,
      userAgent: undefined,
      timestamp: Date.now(),
    });
  },
});

/**
 * Log admin actions (role changes, data cleanup, user management)
 * Use for: admin operations that modify data or user permissions
 */
export const logAdminAction = mutation({
  args: {
    adminClerkId: v.string(), // Clerk ID of admin performing action
    action: v.string(), // 'subscription_cleanup', 'role_change', 'user_delete', etc.
    targetResource: v.string(), // 'subscriptions', 'users', 'orders'
    targetId: v.optional(v.string()), // ID of affected resource
    details: v.optional(v.any()), // Additional context
    result: v.optional(
      v.object({
        success: v.boolean(),
        affectedCount: v.optional(v.number()),
        message: v.optional(v.string()),
      })
    ),
  },
  handler: async (ctx, args) => {
    // Get admin user for proper userId reference
    const adminUser = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", q => q.eq("clerkId", args.adminClerkId))
      .first();

    return await ctx.db.insert("auditLogs", {
      userId: adminUser?._id || undefined,
      clerkId: args.adminClerkId,
      action: `admin_${args.action}`,
      resource: args.targetResource,
      details: {
        targetId: args.targetId,
        result: args.result,
        ...args.details,
      },
      ipAddress: undefined,
      userAgent: undefined,
      timestamp: Date.now(),
    });
  },
});

/**
 * Log subscription-related events
 * Use for: subscription creation, updates, cancellations, quota changes
 */
export const logSubscriptionEvent = mutation({
  args: {
    userId: v.optional(v.string()), // Clerk ID
    action: v.string(), // 'created', 'updated', 'cancelled', 'quota_reset'
    subscriptionId: v.optional(v.string()),
    planId: v.optional(v.string()),
    previousPlan: v.optional(v.string()),
    details: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    let user = null;
    if (args.userId) {
      user = await ctx.db
        .query("users")
        .withIndex("by_clerk_id", q => q.eq("clerkId", args.userId!))
        .first();
    }

    return await ctx.db.insert("auditLogs", {
      userId: user?._id || undefined,
      clerkId: args.userId || undefined,
      action: `subscription_${args.action}`,
      resource: "subscriptions",
      details: {
        subscriptionId: args.subscriptionId,
        planId: args.planId,
        previousPlan: args.previousPlan,
        ...args.details,
      },
      ipAddress: undefined,
      userAgent: undefined,
      timestamp: Date.now(),
    });
  },
});

// ============================================================================
// ADMIN AUDIT QUERIES
// ============================================================================

/**
 * Get all admin actions (for admin dashboard)
 */
export const getAdminActions = query({
  args: {
    limit: v.optional(v.number()),
    adminClerkId: v.optional(v.string()),
  },
  handler: async (ctx, { limit = 100, adminClerkId }) => {
    let logsQuery = ctx.db
      .query("auditLogs")
      .withIndex("by_action")
      .filter(q => q.gte(q.field("action"), "admin_"));

    if (adminClerkId) {
      logsQuery = ctx.db
        .query("auditLogs")
        .withIndex("by_clerk_id", q => q.eq("clerkId", adminClerkId))
        .filter(q => q.gte(q.field("action"), "admin_"));
    }

    const logs = await logsQuery.order("desc").take(limit);

    return logs;
  },
});

/**
 * Get payment audit trail
 */
export const getPaymentAuditTrail = query({
  args: {
    orderId: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { orderId, limit = 50 }) => {
    const logs = await ctx.db
      .query("auditLogs")
      .filter(q => q.eq(q.field("resource"), "payments"))
      .order("desc")
      .take(limit);

    if (orderId) {
      return logs.filter(
        log =>
          log.details &&
          typeof log.details === "object" &&
          "orderId" in log.details &&
          log.details.orderId === orderId
      );
    }

    return logs;
  },
});
