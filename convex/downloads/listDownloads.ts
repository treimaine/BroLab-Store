import { v } from "convex/values";
import { query } from "../_generated/server";
import { optionalAuth } from "../lib/authHelpers";

/**
 * List all downloads for a user
 * Returns downloads with beat information for display
 */
export const listDownloads = query({
  args: {
    userId: v.optional(v.id("users")),
    clerkId: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    let userId = args.userId;

    // If clerkId provided, look up user
    if (!userId && args.clerkId) {
      const user = await ctx.db
        .query("users")
        .withIndex("by_clerk_id", q => q.eq("clerkId", args.clerkId!))
        .first();
      if (!user) return [];
      userId = user._id;
    }

    // If still no userId, try to get from auth
    if (!userId) {
      const auth = await optionalAuth(ctx);
      if (!auth) return [];
      userId = auth.userId;
    }

    const limit = Math.min(args.limit || 100, 500);

    // userId is guaranteed to be defined at this point
    const userIdValue = userId;
    if (!userIdValue) return [];

    const downloads = await ctx.db
      .query("downloads")
      .withIndex("by_user", q => q.eq("userId", userIdValue))
      .order("desc")
      .take(limit);

    return downloads;
  },
});

/**
 * List downloads for server-side calls (no auth required, uses userId directly)
 */
export const listDownloadsServer = query({
  args: {
    userId: v.id("users"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = Math.min(args.limit || 100, 500);

    const downloads = await ctx.db
      .query("downloads")
      .withIndex("by_user", q => q.eq("userId", args.userId))
      .order("desc")
      .take(limit);

    return downloads;
  },
});
