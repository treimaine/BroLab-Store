import { v } from "convex/values";
import type { Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";
import { mutation } from "../_generated/server";

type IncrementArgs = {
  userId?: Id<"users">;
  beatId?: number;
  amount?: number;
};

/**
 * Get user ID from args or authenticated user
 */
async function getUserId(ctx: MutationCtx, userId?: Id<"users">): Promise<Id<"users">> {
  if (userId) return userId;

  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new Error("Not authenticated");
  }

  const user = await ctx.db
    .query("users")
    .withIndex("by_clerk_id", q => q.eq("clerkId", identity.subject))
    .first();

  if (!user) {
    throw new Error("User not found");
  }

  return user._id;
}

/**
 * Handle free tier quota increment
 */
async function incrementFreeQuota(
  ctx: MutationCtx,
  userId: Id<"users">,
  amount: number,
  beatId?: number
): Promise<{ success: boolean; message: string; newUsage: number; remaining: number }> {
  const freeQuota = await ctx.db
    .query("quotas")
    .withIndex("by_user", q => q.eq("userId", userId))
    .filter(q => q.and(q.eq(q.field("quotaType"), "downloads"), q.eq(q.field("isActive"), true)))
    .first();

  if (!freeQuota) {
    throw new Error("No active subscription or quota found");
  }

  if (freeQuota.limit !== -1 && freeQuota.used + amount > freeQuota.limit) {
    throw new Error("Download quota exceeded");
  }

  const newUsage = freeQuota.used + amount;
  await ctx.db.patch(freeQuota._id, {
    used: newUsage,
    updatedAt: Date.now(),
  });

  await ctx.db.insert("quotaUsage", {
    quotaId: freeQuota._id,
    resourceId: beatId?.toString() || "unknown",
    resourceType: "downloads",
    amount,
    description: `Downloaded ${amount} beat(s)`,
    metadata: { resourceType: "download" },
    createdAt: Date.now(),
  });

  await ctx.db.insert("activityLog", {
    userId,
    action: "download_quota_incremented",
    details: {
      quotaId: freeQuota._id,
      amount,
      beatId,
      newUsage,
      remaining: freeQuota.limit === -1 ? Infinity : Math.max(0, freeQuota.limit - newUsage),
    },
    timestamp: Date.now(),
  });

  return {
    success: true,
    message: "Download usage incremented successfully",
    newUsage,
    remaining: freeQuota.limit === -1 ? Infinity : Math.max(0, freeQuota.limit - newUsage),
  };
}

/**
 * Update quota table if exists
 */
async function updateQuotaTable(
  ctx: MutationCtx,
  userId: Id<"users">,
  subscriptionId: Id<"subscriptions">,
  amount: number,
  beatId?: number
): Promise<void> {
  const quota = await ctx.db
    .query("quotas")
    .withIndex("by_user", q => q.eq("userId", userId))
    .filter(q =>
      q.and(
        q.eq(q.field("quotaType"), "downloads"),
        q.eq(q.field("isActive"), true),
        q.eq(q.field("subscriptionId"), subscriptionId)
      )
    )
    .first();

  if (!quota) return;

  await ctx.db.patch(quota._id, {
    used: quota.used + amount,
    updatedAt: Date.now(),
  });

  await ctx.db.insert("quotaUsage", {
    quotaId: quota._id,
    resourceId: beatId?.toString() || "unknown",
    resourceType: "downloads",
    amount,
    description: `Downloaded ${amount} beat(s)`,
    metadata: { resourceType: "download" },
    createdAt: Date.now(),
  });
}

/**
 * Log error to audit logs
 */
async function logIncrementError(
  ctx: MutationCtx,
  args: IncrementArgs,
  amount: number,
  errorMessage: string
): Promise<void> {
  await ctx.db.insert("auditLogs", {
    userId: args.userId,
    action: "increment_download_usage_error",
    resource: "subscriptions",
    details: {
      operation: "mutation",
      resource: "subscriptions",
      error: errorMessage,
      userId: args.userId,
      beatId: args.beatId,
      amount,
    },
    timestamp: Date.now(),
  });
}

/**
 * Increment download usage for user's subscription
 * Updates both subscription downloadUsed and quota used fields
 */
export const incrementDownloadUsage = mutation({
  args: {
    userId: v.optional(v.id("users")),
    beatId: v.optional(v.number()),
    amount: v.optional(v.number()), // Default to 1
  },
  handler: async (ctx, args) => {
    const amount = args.amount ?? 1;

    try {
      const userId = await getUserId(ctx, args.userId);

      // Get user's active subscription
      const subscription = await ctx.db
        .query("subscriptions")
        .withIndex("by_user", q => q.eq("userId", userId))
        .filter(q => q.eq(q.field("status"), "active"))
        .first();

      if (!subscription) {
        return await incrementFreeQuota(ctx, userId, amount, args.beatId);
      }

      // Check if subscription allows download
      if (
        subscription.downloadQuota !== -1 &&
        subscription.downloadUsed + amount > subscription.downloadQuota
      ) {
        throw new Error("Download quota exceeded for subscription");
      }

      // Update subscription download usage
      const newUsage = subscription.downloadUsed + amount;
      await ctx.db.patch(subscription._id, {
        downloadUsed: newUsage,
        updatedAt: Date.now(),
      });

      await updateQuotaTable(ctx, userId, subscription._id, amount, args.beatId);

      // Log activity
      await ctx.db.insert("activityLog", {
        userId,
        action: "download_usage_incremented",
        details: {
          subscriptionId: subscription._id,
          planId: subscription.planId,
          amount,
          beatId: args.beatId,
          newUsage,
          remaining:
            subscription.downloadQuota === -1
              ? Infinity
              : Math.max(0, subscription.downloadQuota - newUsage),
        },
        timestamp: Date.now(),
      });

      return {
        success: true,
        message: "Download usage incremented successfully",
        newUsage,
        remaining:
          subscription.downloadQuota === -1
            ? Infinity
            : Math.max(0, subscription.downloadQuota - newUsage),
      };
    } catch (error) {
      console.error("Error incrementing download usage:", error);

      const errorMessage = error instanceof Error ? error.message : String(error);
      await logIncrementError(ctx, args, amount, errorMessage);

      throw new Error(`Failed to increment download usage: ${errorMessage}`);
    }
  },
});
