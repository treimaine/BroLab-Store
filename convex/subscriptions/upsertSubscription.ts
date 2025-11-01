import { v } from "convex/values";
import type { Id } from "../_generated/dataModel";
import { mutation } from "../_generated/server";

/**
 * Upsert subscription from Clerk Billing webhook
 * Creates or updates subscription and associated quota
 */
export const upsertSubscription = mutation({
  args: {
    userId: v.id("users"),
    clerkSubscriptionId: v.string(),
    planId: v.string(),
    status: v.string(),
    currentPeriodStart: v.number(),
    currentPeriodEnd: v.number(),
    cancelAtPeriodEnd: v.optional(v.boolean()),
    trialEnd: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    try {
      // Determine download quota based on plan
      let downloadQuota: number;
      switch (args.planId.toLowerCase()) {
        case "ultimate":
          downloadQuota = -1; // Unlimited
          break;
        case "artist":
          downloadQuota = 50;
          break;
        case "basic":
          downloadQuota = 10;
          break;
        default:
          downloadQuota = 5; // Free tier default
      }

      // Find existing subscription by clerkSubscriptionId
      const existing = await ctx.db
        .query("subscriptions")
        .withIndex("by_clerk_id", q => q.eq("clerkSubscriptionId", args.clerkSubscriptionId))
        .first();

      let subscriptionId: Id<"subscriptions">;

      if (existing) {
        // Update existing subscription
        await ctx.db.patch(existing._id, {
          planId: args.planId,
          status: args.status,
          currentPeriodStart: args.currentPeriodStart,
          currentPeriodEnd: args.currentPeriodEnd,
          cancelAtPeriodEnd: args.cancelAtPeriodEnd ?? false,
          trialEnd: args.trialEnd,
          downloadQuota,
          updatedAt: now,
        });

        subscriptionId = existing._id;

        // Update associated quota
        const quota = await ctx.db
          .query("quotas")
          .withIndex("by_subscription", q => q.eq("subscriptionId", existing._id))
          .filter(q => q.eq(q.field("quotaType"), "downloads"))
          .first();

        if (quota) {
          await ctx.db.patch(quota._id, {
            limit: downloadQuota,
            resetAt: args.currentPeriodEnd,
            updatedAt: now,
          });
        }
      } else {
        // Create new subscription
        subscriptionId = await ctx.db.insert("subscriptions", {
          userId: args.userId,
          clerkSubscriptionId: args.clerkSubscriptionId,
          planId: args.planId,
          status: args.status,
          currentPeriodStart: args.currentPeriodStart,
          currentPeriodEnd: args.currentPeriodEnd,
          cancelAtPeriodEnd: args.cancelAtPeriodEnd ?? false,
          trialEnd: args.trialEnd,
          features: [],
          downloadQuota,
          downloadUsed: 0,
          createdAt: now,
          updatedAt: now,
        });

        // Create associated quota
        await ctx.db.insert("quotas", {
          userId: args.userId,
          subscriptionId,
          quotaType: "downloads",
          limit: downloadQuota,
          used: 0,
          resetAt: args.currentPeriodEnd,
          resetPeriod: "monthly",
          isActive: true,
          createdAt: now,
          updatedAt: now,
        });
      }

      // Log activity
      await ctx.db.insert("activityLog", {
        userId: args.userId,
        action: existing ? "subscription_updated" : "subscription_created",
        details: {
          subscriptionId,
          clerkSubscriptionId: args.clerkSubscriptionId,
          planId: args.planId,
          status: args.status,
          downloadQuota,
        },
        timestamp: now,
      });

      return {
        success: true,
        subscriptionId,
        message: existing
          ? "Subscription updated successfully"
          : "Subscription created successfully",
      };
    } catch (error) {
      console.error("Error upserting subscription:", error);

      const errorMessage = error instanceof Error ? error.message : String(error);

      // Log error to audit logs
      await ctx.db.insert("auditLogs", {
        userId: args.userId,
        action: "subscription_upsert_error",
        resource: "subscriptions",
        details: {
          operation: "mutation",
          resource: "subscriptions",
          error: errorMessage,
          clerkSubscriptionId: args.clerkSubscriptionId,
          planId: args.planId,
        },
        timestamp: now,
      });

      throw new Error(`Failed to upsert subscription: ${errorMessage}`);
    }
  },
});
