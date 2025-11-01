import { v } from "convex/values";
import type { Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";
import { mutation } from "../_generated/server";

type UpdateArgs = {
  subscriptionId: Id<"subscriptions">;
  status?: string;
  planId?: string;
  currentPeriodStart?: number;
  currentPeriodEnd?: number;
  cancelAtPeriodEnd?: boolean;
  downloadQuota?: number;
};

type SubscriptionUpdateData = Partial<{
  status: string;
  planId: string;
  currentPeriodStart: number;
  currentPeriodEnd: number;
  cancelAtPeriodEnd: boolean;
  downloadQuota: number;
  updatedAt: number;
}>;

/**
 * Build subscription update data from args
 */
function buildUpdateData(args: UpdateArgs, now: number): SubscriptionUpdateData {
  const updateData: SubscriptionUpdateData = { updatedAt: now };

  if (args.status !== undefined) updateData.status = args.status;
  if (args.planId !== undefined) updateData.planId = args.planId;
  if (args.currentPeriodStart !== undefined)
    updateData.currentPeriodStart = args.currentPeriodStart;
  if (args.currentPeriodEnd !== undefined) updateData.currentPeriodEnd = args.currentPeriodEnd;
  if (args.cancelAtPeriodEnd !== undefined) updateData.cancelAtPeriodEnd = args.cancelAtPeriodEnd;
  if (args.downloadQuota !== undefined) updateData.downloadQuota = args.downloadQuota;

  return updateData;
}

/**
 * Update associated quota if download quota or period changed
 */
async function updateAssociatedQuota(
  ctx: MutationCtx,
  args: UpdateArgs,
  now: number
): Promise<void> {
  if (args.downloadQuota === undefined && args.currentPeriodEnd === undefined) {
    return;
  }

  const quota = await ctx.db
    .query("quotas")
    .withIndex("by_subscription", q => q.eq("subscriptionId", args.subscriptionId))
    .filter(q => q.eq(q.field("quotaType"), "downloads"))
    .first();

  if (!quota) return;

  const quotaUpdate: Partial<{
    limit: number;
    resetAt: number;
    updatedAt: number;
  }> = { updatedAt: now };

  if (args.downloadQuota !== undefined) quotaUpdate.limit = args.downloadQuota;
  if (args.currentPeriodEnd !== undefined) quotaUpdate.resetAt = args.currentPeriodEnd;

  await ctx.db.patch(quota._id, quotaUpdate);
}

/**
 * Log error to audit logs
 */
async function logUpdateError(
  ctx: MutationCtx,
  subscriptionId: Id<"subscriptions">,
  args: UpdateArgs,
  errorMessage: string,
  now: number
): Promise<void> {
  const subscription = await ctx.db.get(subscriptionId);
  if (!subscription) return;

  await ctx.db.insert("auditLogs", {
    userId: subscription.userId,
    action: "subscription_update_error",
    resource: "subscriptions",
    details: {
      operation: "mutation",
      resource: "subscriptions",
      resourceId: subscriptionId,
      error: errorMessage,
      changes: args,
    },
    timestamp: now,
  });
}

/**
 * Update subscription status and details
 * Used for webhook events and manual updates
 */
export const updateSubscription = mutation({
  args: {
    subscriptionId: v.id("subscriptions"),
    status: v.optional(v.string()),
    planId: v.optional(v.string()),
    currentPeriodStart: v.optional(v.number()),
    currentPeriodEnd: v.optional(v.number()),
    cancelAtPeriodEnd: v.optional(v.boolean()),
    downloadQuota: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    try {
      const subscription = await ctx.db.get(args.subscriptionId);
      if (!subscription) {
        throw new Error("Subscription not found");
      }

      const updateData = buildUpdateData(args, now);
      await ctx.db.patch(args.subscriptionId, updateData);
      await updateAssociatedQuota(ctx, args, now);

      // Log activity
      await ctx.db.insert("activityLog", {
        userId: subscription.userId,
        action: "subscription_updated",
        details: {
          subscriptionId: args.subscriptionId,
          changes: updateData,
        },
        timestamp: now,
      });

      return {
        success: true,
        message: "Subscription updated successfully",
      };
    } catch (error) {
      console.error("Error updating subscription:", error);

      const errorMessage = error instanceof Error ? error.message : String(error);
      await logUpdateError(ctx, args.subscriptionId, args, errorMessage, now);

      throw new Error(`Failed to update subscription: ${errorMessage}`);
    }
  },
});

/**
 * Update current user's subscription
 * Legacy function for backward compatibility
 */
export const updateCurrentUserSubscription = mutation({
  args: {
    stripeCustomerId: v.optional(v.string()),
    plan: v.optional(v.string()),
  },
  handler: async (ctx, _args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", q => q.eq("clerkId", identity.subject))
      .first();

    if (!user) throw new Error("User not found");

    return await ctx.db.patch(user._id, {
      updatedAt: Date.now(),
    });
  },
});
