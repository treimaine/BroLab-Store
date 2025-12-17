import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const log = mutation({
  args: {
    action: v.string(),
    resource: v.string(),
<<<<<<< HEAD
    details: v.optional(v.object({})),
=======
    details: v.optional(v.any()),
>>>>>>> 36d5f1783a85309cded75560c94663152dc37dcc
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
<<<<<<< HEAD
    details: v.optional(v.object({})),
=======
    details: v.optional(v.any()),
>>>>>>> 36d5f1783a85309cded75560c94663152dc37dcc
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
