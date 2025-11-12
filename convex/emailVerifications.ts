import { v } from "convex/values";
import { internalMutation, mutation, query } from "./_generated/server";

/**
 * Create email verification token
 * Security: Stores token securely with expiration
 */
export const create = mutation({
  args: {
    userId: v.id("users"),
    email: v.string(),
    token: v.string(),
    expiresAt: v.number(),
  },
  handler: async (ctx, args) => {
    // Delete any existing tokens for this user/email
    const existing = await ctx.db
      .query("emailVerifications")
      .withIndex("by_user", q => q.eq("userId", args.userId))
      .filter(q => q.eq(q.field("email"), args.email))
      .collect();

    for (const token of existing) {
      await ctx.db.delete(token._id);
    }

    // Create new token
    const id = await ctx.db.insert("emailVerifications", {
      userId: args.userId,
      email: args.email,
      token: args.token,
      expiresAt: args.expiresAt,
      createdAt: Date.now(),
    });

    return id;
  },
});

/**
 * Get email verification by token
 * Security: Validates token and expiration
 */
export const getByToken = query({
  args: {
    token: v.string(),
  },
  handler: async (ctx, args) => {
    const verification = await ctx.db
      .query("emailVerifications")
      .withIndex("by_token", q => q.eq("token", args.token))
      .first();

    if (!verification) {
      return null;
    }

    // Check if expired
    if (verification.expiresAt < Date.now()) {
      return null;
    }

    // Check if already verified
    if (verification.verified) {
      return null;
    }

    return verification;
  },
});

/**
 * Get email verification
 * Security: Retrieves verification record with validation
 * @param token - Verification token to look up
 * @returns Verification record if valid, null otherwise
 */
export const getEmailVerification = query({
  args: {
    token: v.string(),
  },
  handler: async (ctx, args) => {
    const verification = await ctx.db
      .query("emailVerifications")
      .withIndex("by_token", q => q.eq("token", args.token))
      .first();

    if (!verification) {
      return null;
    }

    // Check if expired
    if (verification.expiresAt < Date.now()) {
      return null;
    }

    // Check if already verified
    if (verification.verified) {
      return null;
    }

    return verification;
  },
});

/**
 * Mark email as verified
 * Security: Updates verification status
 */
export const markVerified = mutation({
  args: {
    token: v.string(),
  },
  handler: async (ctx, args) => {
    const verification = await ctx.db
      .query("emailVerifications")
      .withIndex("by_token", q => q.eq("token", args.token))
      .first();

    if (!verification) {
      throw new Error("Verification token not found");
    }

    // Check if expired
    if (verification.expiresAt < Date.now()) {
      throw new Error("Verification token expired");
    }

    // Check if already verified
    if (verification.verified) {
      throw new Error("Email already verified");
    }

    // Mark as verified
    await ctx.db.patch(verification._id, {
      verified: true,
      verifiedAt: Date.now(),
    });

    return {
      success: true,
      userId: verification.userId,
      email: verification.email,
    };
  },
});

/**
 * Delete email verification token
 * Security: Cleanup after verification
 */
export const deleteToken = mutation({
  args: {
    token: v.string(),
  },
  handler: async (ctx, args) => {
    const verification = await ctx.db
      .query("emailVerifications")
      .withIndex("by_token", q => q.eq("token", args.token))
      .first();

    if (verification) {
      await ctx.db.delete(verification._id);
    }

    return { success: true };
  },
});

/**
 * Delete email verification
 * Security: Cleanup after verification or on expiration
 * @param token - Verification token to delete
 * @returns Success status
 */
export const deleteEmailVerification = mutation({
  args: {
    token: v.string(),
  },
  handler: async (ctx, args) => {
    const verification = await ctx.db
      .query("emailVerifications")
      .withIndex("by_token", q => q.eq("token", args.token))
      .first();

    if (verification) {
      await ctx.db.delete(verification._id);
    }

    return { success: true };
  },
});

/**
 * Cleanup expired tokens
 * Security: Periodic cleanup of expired tokens (24h expiration)
 * This is an internal mutation called by cron jobs
 */
export const cleanupExpired = internalMutation({
  args: {},
  handler: async ctx => {
    const now = Date.now();
    const expired = await ctx.db
      .query("emailVerifications")
      .withIndex("by_expires")
      .filter(q => q.lt(q.field("expiresAt"), now))
      .collect();

    let deleted = 0;
    for (const token of expired) {
      await ctx.db.delete(token._id);
      deleted++;
    }

    console.log(`[Email Verifications] Cleaned up ${deleted} expired tokens`);
    return { deleted };
  },
});
