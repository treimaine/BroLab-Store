import { v } from "convex/values";
import { internalMutation, mutation, query } from "./_generated/server";

/**
 * Create password reset token
 * Security: Stores token securely with expiration (15 minutes)
 * Requirement 7: Tokens de Réinitialisation Non Persistés
 */
export const create = mutation({
  args: {
    userId: v.id("users"),
    email: v.string(),
    token: v.string(),
    expiresAt: v.number(),
    ipAddress: v.optional(v.string()),
    userAgent: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Delete any existing tokens for this user/email
    const existing = await ctx.db
      .query("passwordResets")
      .withIndex("by_user", q => q.eq("userId", args.userId))
      .filter(q => q.eq(q.field("email"), args.email))
      .collect();

    for (const token of existing) {
      await ctx.db.delete(token._id);
    }

    // Create new token
    const id = await ctx.db.insert("passwordResets", {
      userId: args.userId,
      email: args.email,
      token: args.token,
      expiresAt: args.expiresAt,
      ipAddress: args.ipAddress,
      userAgent: args.userAgent,
      createdAt: Date.now(),
    });

    return id;
  },
});

/**
 * Create password reset token (alias for consistency)
 * Security: Stores token securely with expiration (15 minutes)
 * Requirement 7: Tokens de Réinitialisation Non Persistés
 */
export const createPasswordReset = mutation({
  args: {
    userId: v.id("users"),
    email: v.string(),
    token: v.string(),
    expiresAt: v.number(),
    ipAddress: v.optional(v.string()),
    userAgent: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Delete any existing tokens for this user/email
    const existing = await ctx.db
      .query("passwordResets")
      .withIndex("by_user", q => q.eq("userId", args.userId))
      .filter(q => q.eq(q.field("email"), args.email))
      .collect();

    for (const token of existing) {
      await ctx.db.delete(token._id);
    }

    // Create new token
    const id = await ctx.db.insert("passwordResets", {
      userId: args.userId,
      email: args.email,
      token: args.token,
      expiresAt: args.expiresAt,
      ipAddress: args.ipAddress,
      userAgent: args.userAgent,
      createdAt: Date.now(),
    });

    return id;
  },
});

/**
 * Get password reset by token
 * Security: Validates token and expiration
 */
export const getByToken = query({
  args: {
    token: v.string(),
  },
  handler: async (ctx, args) => {
    const reset = await ctx.db
      .query("passwordResets")
      .withIndex("by_token", q => q.eq("token", args.token))
      .first();

    if (!reset) {
      return null;
    }

    // Check if expired
    if (reset.expiresAt < Date.now()) {
      return null;
    }

    // Check if already used
    if (reset.used) {
      return null;
    }

    return reset;
  },
});

/**
 * Get password reset record
 * Security: Retrieves password reset with validation
 * Requirement 7: Tokens de Réinitialisation Non Persistés
 */
export const getPasswordReset = query({
  args: {
    token: v.string(),
  },
  handler: async (ctx, args) => {
    const reset = await ctx.db
      .query("passwordResets")
      .withIndex("by_token", q => q.eq("token", args.token))
      .first();

    if (!reset) {
      return null;
    }

    // Check if expired
    if (reset.expiresAt < Date.now()) {
      return null;
    }

    // Check if already used
    if (reset.used) {
      return null;
    }

    return reset;
  },
});

/**
 * Mark token as used
 * Security: Prevents token reuse
 */
export const markUsed = mutation({
  args: {
    token: v.string(),
  },
  handler: async (ctx, args) => {
    const reset = await ctx.db
      .query("passwordResets")
      .withIndex("by_token", q => q.eq("token", args.token))
      .first();

    if (!reset) {
      throw new Error("Reset token not found");
    }

    // Check if expired
    if (reset.expiresAt < Date.now()) {
      throw new Error("Reset token expired");
    }

    // Check if already used
    if (reset.used) {
      throw new Error("Reset token already used");
    }

    // Mark as used
    await ctx.db.patch(reset._id, {
      used: true,
      usedAt: Date.now(),
    });

    return {
      success: true,
      userId: reset.userId,
      email: reset.email,
    };
  },
});

/**
 * Delete password reset token
 * Security: Cleanup after use
 */
export const deleteToken = mutation({
  args: {
    token: v.string(),
  },
  handler: async (ctx, args) => {
    const reset = await ctx.db
      .query("passwordResets")
      .withIndex("by_token", q => q.eq("token", args.token))
      .first();

    if (reset) {
      await ctx.db.delete(reset._id);
    }

    return { success: true };
  },
});

/**
 * Delete password reset token (alias for consistency)
 * Security: Cleanup after use
 * Requirement 7: Tokens de Réinitialisation Non Persistés
 */
export const deletePasswordReset = mutation({
  args: {
    token: v.string(),
  },
  handler: async (ctx, args) => {
    const reset = await ctx.db
      .query("passwordResets")
      .withIndex("by_token", q => q.eq("token", args.token))
      .first();

    if (reset) {
      await ctx.db.delete(reset._id);
    }

    return { success: true };
  },
});

/**
 * Cleanup expired tokens
 * Security: Periodic cleanup of expired tokens (15min expiration)
 * This is an internal mutation called by cron jobs
 */
export const cleanupExpired = internalMutation({
  args: {},
  handler: async ctx => {
    const now = Date.now();
    const expired = await ctx.db
      .query("passwordResets")
      .withIndex("by_expires")
      .filter(q => q.lt(q.field("expiresAt"), now))
      .collect();

    let deleted = 0;
    for (const token of expired) {
      await ctx.db.delete(token._id);
      deleted++;
    }

    console.log(`[Password Resets] Cleaned up ${deleted} expired tokens`);
    return { deleted };
  },
});

/**
 * Get reset attempts for user
 * Security: Rate limiting check
 */
export const getRecentAttempts = query({
  args: {
    email: v.string(),
    windowMs: v.number(), // Time window in milliseconds
  },
  handler: async (ctx, args) => {
    const cutoff = Date.now() - args.windowMs;
    const attempts = await ctx.db
      .query("passwordResets")
      .withIndex("by_email", q => q.eq("email", args.email))
      .filter(q => q.gt(q.field("createdAt"), cutoff))
      .collect();

    return attempts.length;
  },
});
