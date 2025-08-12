import { v } from "convex/values";
import { mutation, query } from "../_generated/server";

export const recordDownload = mutation({
  args: {
    beatId: v.number(),
    licenseType: v.string(),
    downloadUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", q => q.eq("clerkId", identity.subject))
      .first();

    if (!user) throw new Error("User not found");

    return await ctx.db.insert("downloads", {
      userId: user._id,
      beatId: args.beatId,
      licenseType: args.licenseType,
      downloadUrl: args.downloadUrl,
      timestamp: Date.now(),
    });
  },
});

export const getUserDownloads = query({
  args: {},
  handler: async ctx => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", q => q.eq("clerkId", identity.subject))
      .first();

    if (!user) return [];

    const downloads = await ctx.db
      .query("downloads")
      .withIndex("by_user", q => q.eq("userId", user._id))
      .order("desc")
      .collect();

    return downloads;
  },
});

export const getUserDownloadQuota = query({
  args: {},
  handler: async ctx => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return { downloadsUsed: 0, quota: 0, remaining: 0, progress: 0 };

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", q => q.eq("clerkId", identity.subject))
      .first();

    if (!user) return { downloadsUsed: 0, quota: 0, remaining: 0, progress: 0 };

    // Get user's subscription to determine license type
    const subscription = await ctx.db
      .query("subscriptions")
      .withIndex("by_user", q => q.eq("userId", user._id))
      .first();

    // Determine license type and quota
    const licenseType = subscription?.plan || "basic";
    const quota =
      licenseType === "basic"
        ? 10
        : licenseType === "premium"
          ? 25
          : licenseType === "unlimited"
            ? 999999
            : 10;

    // Count downloads for this user
    const downloads = await ctx.db
      .query("downloads")
      .withIndex("by_user", q => q.eq("userId", user._id))
      .collect();

    const downloadsUsed = downloads.length;
    const remaining = Math.max(quota - downloadsUsed, 0);
    const progress = Math.min((downloadsUsed / quota) * 100, 100);

    return {
      downloadsUsed,
      quota,
      remaining,
      progress,
      licenseType,
    };
  },
});

export const getDownloadStats = query({
  args: {},
  handler: async ctx => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", q => q.eq("clerkId", identity.subject))
      .first();

    if (!user) return null;

    // Get sample download data for debugging
    const downloads = await ctx.db
      .query("downloads")
      .withIndex("by_user", q => q.eq("userId", user._id))
      .take(5);

    return {
      totalDownloads: downloads.length,
      sampleData: downloads[0] || null,
      userExists: true,
    };
  },
});
