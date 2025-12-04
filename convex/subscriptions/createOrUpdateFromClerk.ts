import { v } from "convex/values";
import { mutation } from "../_generated/server";

// Clerk Billing webhook payload type
interface ClerkSubscriptionData {
  id?: string;
  subscription_id?: string;
  subscription?: { id?: string; status?: string };
  user_id?: string;
  customer_id?: string;
  user?: { id?: string };
  plan?: { name?: string };
  plan_id?: string;
  price?: { product?: { name?: string } };
  status?: string;
  current_period_start?: number;
  current_period_end?: number;
  period_start?: number;
  period_end?: number;
}

// Upsert subscription from Clerk Billing webhook payload
export const upsert = mutation({
  args: { data: v.any() },
  handler: async (ctx, { data }: { data: ClerkSubscriptionData }) => {
    const now = Date.now();

    const clerkSubscriptionId = data.id || data.subscription_id || data.subscription?.id || "";
    const clerkUserId = data.user_id || data.customer_id || data.user?.id || "";
    const planId: string = (
      data.plan?.name ||
      data.plan_id ||
      data.price?.product?.name ||
      ""
    ).toLowerCase();
    const status: string = data.status || data.subscription?.status || "active";
    const currentPeriodStart: number =
      (data.current_period_start || data.period_start || Date.now()) * 1;
    const currentPeriodEnd: number =
      (data.current_period_end || data.period_end || Date.now() + 30 * 24 * 3600 * 1000) * 1;

    // Resolve user by clerkId
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", q => q.eq("clerkId", clerkUserId))
      .first();
    if (!user) {
      await ctx.db.insert("auditLogs", {
        clerkId: clerkUserId,
        action: "subscription_upsert_user_missing",
        resource: "subscriptions",
        details: {
          operation: "upsert",
          resource: "subscriptions",
          clerkSubscriptionId,
          error: "User not found for Clerk ID",
        },
        timestamp: now,
      });
      throw new Error("User not found for Clerk ID");
    }

    // Find existing subscription by clerkSubscriptionId
    const existing = await ctx.db
      .query("subscriptions")
      .withIndex("by_clerk_id", q => q.eq("clerkSubscriptionId", clerkSubscriptionId))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        planId,
        status,
        currentPeriodStart,
        currentPeriodEnd,
        updatedAt: now,
      });
    } else {
      // Calculate download quota based on plan
      // Synced with Clerk Billing Dashboard configuration
      const calculateDownloadQuota = (plan: string): number => {
        if (plan === "ultimate_pass" || plan === "ultimate") return -1;
        if (plan === "artist") return 20;
        if (plan === "basic") return 5;
        if (plan === "free_user") return 1;
        return 5; // Default to basic
      };

      const downloadQuota = calculateDownloadQuota(planId);

      await ctx.db.insert("subscriptions", {
        userId: user._id,
        clerkSubscriptionId,
        planId,
        status,
        currentPeriodStart,
        currentPeriodEnd,
        cancelAtPeriodEnd: false,
        features: [],
        downloadQuota,
        downloadUsed: 0,
        createdAt: now,
        updatedAt: now,
      });

      // Initialize quota for downloads
      await ctx.db.insert("quotas", {
        userId: user._id,
        subscriptionId: undefined, // optional; could be linked in a follow-up query
        quotaType: "downloads",
        limit: downloadQuota,
        used: 0,
        resetAt: currentPeriodEnd,
        resetPeriod: "monthly",
        isActive: true,
        createdAt: now,
        updatedAt: now,
      });
    }

    await ctx.db.insert("activityLog", {
      userId: user._id,
      action: "subscription_upserted",
      details: { clerkSubscriptionId, planId, status },
      timestamp: now,
    });

    return { success: true };
  },
});

export const cancel = mutation({
  args: { data: v.any() },
  handler: async (ctx, { data }: { data: ClerkSubscriptionData }) => {
    const clerkSubscriptionId: string =
      data.id || data.subscription_id || data.subscription?.id || "";
    const existing = await ctx.db
      .query("subscriptions")
      .withIndex("by_clerk_id", q => q.eq("clerkSubscriptionId", clerkSubscriptionId))
      .first();
    if (existing) {
      await ctx.db.patch(existing._id, {
        status: "cancelled",
        cancelAtPeriodEnd: true,
        updatedAt: Date.now(),
      });
    }
    return { success: true };
  },
});
