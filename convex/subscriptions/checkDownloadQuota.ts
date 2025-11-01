import { v } from "convex/values";
import type { Id } from "../_generated/dataModel";
import type { QueryCtx } from "../_generated/server";
import { query } from "../_generated/server";

type QuotaResult = {
  canDownload: boolean;
  reason: string;
  quota: { limit: number; used: number; remaining: number };
  planId?: string;
  subscriptionId?: Id<"subscriptions">;
  currentPeriodEnd?: number;
};

/**
 * Get user ID from args or authenticated user
 */
async function getUserId(ctx: QueryCtx, userId?: Id<"users">): Promise<Id<"users"> | null> {
  if (userId) return userId;

  const identity = await ctx.auth.getUserIdentity();
  if (!identity) return null;

  const user = await ctx.db
    .query("users")
    .withIndex("by_clerk_id", q => q.eq("clerkId", identity.subject))
    .first();

  return user?._id || null;
}

/**
 * Check free tier quota
 */
async function checkFreeQuota(ctx: QueryCtx, userId: Id<"users">): Promise<QuotaResult | null> {
  const freeQuota = await ctx.db
    .query("quotas")
    .withIndex("by_user", q => q.eq("userId", userId))
    .filter(q => q.and(q.eq(q.field("quotaType"), "downloads"), q.eq(q.field("isActive"), true)))
    .first();

  if (!freeQuota) return null;

  const remaining =
    freeQuota.limit === -1 ? Infinity : Math.max(0, freeQuota.limit - freeQuota.used);

  return {
    canDownload: remaining > 0 || freeQuota.limit === -1,
    reason:
      remaining > 0 || freeQuota.limit === -1
        ? "Free tier quota available"
        : "Free tier quota exceeded",
    quota: {
      limit: freeQuota.limit === -1 ? Infinity : freeQuota.limit,
      used: freeQuota.used,
      remaining,
    },
    planId: "free",
  };
}

/**
 * Check subscription quota
 */
function checkSubscriptionQuota(subscription: {
  _id: Id<"subscriptions">;
  downloadQuota: number;
  downloadUsed: number;
  planId: string;
  currentPeriodEnd: number;
}): QuotaResult {
  const remaining =
    subscription.downloadQuota === -1
      ? Infinity
      : Math.max(0, subscription.downloadQuota - subscription.downloadUsed);

  const canDownload = remaining > 0 || subscription.downloadQuota === -1;

  return {
    canDownload,
    reason: canDownload ? "Quota available" : "Download quota exceeded",
    quota: {
      limit: subscription.downloadQuota === -1 ? Infinity : subscription.downloadQuota,
      used: subscription.downloadUsed,
      remaining,
    },
    planId: subscription.planId,
    subscriptionId: subscription._id,
    currentPeriodEnd: subscription.currentPeriodEnd,
  };
}

/**
 * Check if user has available download quota
 * Returns quota information and whether user can download
 */
export const checkDownloadQuota = query({
  args: {
    userId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    try {
      const userId = await getUserId(ctx, args.userId);

      if (!userId) {
        return {
          canDownload: false,
          reason: "Not authenticated",
          quota: { limit: 0, used: 0, remaining: 0 },
        };
      }

      // Get user's active subscription
      const subscription = await ctx.db
        .query("subscriptions")
        .withIndex("by_user", q => q.eq("userId", userId))
        .filter(q => q.eq(q.field("status"), "active"))
        .first();

      if (!subscription) {
        const freeQuotaResult = await checkFreeQuota(ctx, userId);
        if (freeQuotaResult) return freeQuotaResult;

        return {
          canDownload: false,
          reason: "No active subscription or quota",
          quota: { limit: 0, used: 0, remaining: 0 },
        };
      }

      return checkSubscriptionQuota(subscription);
    } catch (error) {
      console.error("Error checking download quota:", error);

      return {
        canDownload: false,
        reason: "Error checking quota",
        quota: { limit: 0, used: 0, remaining: 0 },
      };
    }
  },
});
