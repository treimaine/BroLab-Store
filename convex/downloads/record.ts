import { v } from "convex/values";
import { mutation, query } from "../_generated/server";
import { optionalAuth, requireAuth } from "../lib/authHelpers";

export const recordDownload = mutation({
  args: {
    beatId: v.number(),
    licenseType: v.string(),
    downloadUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuth(ctx);

    // Enforce quota before recording download
    const activeSubscription = await ctx.db
      .query("subscriptions")
      .withIndex("by_user", q => q.eq("userId", userId))
      .filter(q => q.eq(q.field("status"), "active"))
      .first();

    if (!activeSubscription) {
      throw new Error("No active subscription");
    }

    const downloadQuota = await ctx.db
      .query("quotas")
      .withIndex("by_user", q => q.eq("userId", userId))
      .filter(q => q.eq(q.field("quotaType"), "downloads"))
      .filter(q => q.eq(q.field("isActive"), true))
      .first();

    if (!downloadQuota) {
      throw new Error("Download quota not initialized");
    }

    // If limit is -1 treat as unlimited
    if (downloadQuota.limit !== -1 && downloadQuota.used >= downloadQuota.limit) {
      throw new Error("Download quota exceeded");
    }

    const downloadId = await ctx.db.insert("downloads", {
      userId,
      beatId: args.beatId,
      licenseType: args.licenseType,
      downloadUrl: args.downloadUrl,
      timestamp: Date.now(),
    });

    // Increment quota usage
    await ctx.db.patch(downloadQuota._id, {
      used: downloadQuota.used + 1,
      updatedAt: Date.now(),
    });

    await ctx.db.insert("quotaUsage", {
      quotaId: downloadQuota._id,
      resourceId: String(args.beatId),
      resourceType: "downloads",
      amount: 1,
      description: "Download recorded",
      createdAt: Date.now(),
    });

    return downloadId;
  },
});

export const getUserDownloads = query({
  args: {},
  handler: async ctx => {
    const auth = await optionalAuth(ctx);
    if (!auth) return [];

    const downloads = await ctx.db
      .query("downloads")
      .withIndex("by_user", q => q.eq("userId", auth.userId))
      .order("desc")
      .collect();

    return downloads;
  },
});

export const getUserDownloadQuota = query({
  args: {},
  handler: async ctx => {
    const auth = await optionalAuth(ctx);
    if (!auth) return { downloadsUsed: 0, quota: 0, remaining: 0, progress: 0 };

    // Get user's subscription to determine license type
    const subscription = await ctx.db
      .query("subscriptions")
      .withIndex("by_user", q => q.eq("userId", auth.userId))
      .first();

    // Determine license type and quota
    const licenseType = subscription?.planId || "basic";
    const quotaByLicense: Record<string, number> = {
      basic: 10,
      premium: 25,
      unlimited: 999999,
    };
    const quota = quotaByLicense[licenseType] ?? 10;

    // Count downloads for this user
    const downloads = await ctx.db
      .query("downloads")
      .withIndex("by_user", q => q.eq("userId", auth.userId))
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
    const auth = await optionalAuth(ctx);
    if (!auth) return null;

    // Get sample download data for debugging
    const downloads = await ctx.db
      .query("downloads")
      .withIndex("by_user", q => q.eq("userId", auth.userId))
      .take(5);

    return {
      totalDownloads: downloads.length,
      sampleData: downloads[0] || null,
      userExists: true,
    };
  },
});
