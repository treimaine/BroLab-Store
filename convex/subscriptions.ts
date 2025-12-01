import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

/**
 * Get subscription by Clerk subscription ID
 */
export const getByClerkId = query({
  args: { clerkSubscriptionId: v.string() },
  handler: async (ctx, { clerkSubscriptionId }) => {
    const subscription = await ctx.db
      .query("subscriptions")
      .withIndex("by_clerk_id", q => q.eq("clerkSubscriptionId", clerkSubscriptionId))
      .first();
    return subscription;
  },
});

/**
 * Get user's active subscription
 */
export const getUserSubscription = query({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    const subscription = await ctx.db
      .query("subscriptions")
      .withIndex("by_user", q => q.eq("userId", userId))
      .filter(q => q.eq(q.field("status"), "active"))
      .first();
    return subscription;
  },
});

/**
 * Create new subscription
 */
export const create = mutation({
  args: {
    userId: v.id("users"),
    clerkSubscriptionId: v.string(),
    planId: v.string(),
    status: v.string(),
    currentPeriodStart: v.number(),
    currentPeriodEnd: v.number(),
    downloadQuota: v.number(),
    downloadUsed: v.number(),
    features: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const subscriptionId = await ctx.db.insert("subscriptions", {
      ...args,
      createdAt: now,
      updatedAt: now,
    });

    console.log(`✅ Subscription created: ${subscriptionId}`);
    return subscriptionId;
  },
});

/**
 * Update existing subscription
 */
export const update = mutation({
  args: {
    clerkSubscriptionId: v.string(),
    status: v.string(),
    currentPeriodStart: v.number(),
    currentPeriodEnd: v.number(),
    downloadQuota: v.number(),
  },
  handler: async (ctx, args) => {
    const subscription = await ctx.db
      .query("subscriptions")
      .withIndex("by_clerk_id", q => q.eq("clerkSubscriptionId", args.clerkSubscriptionId))
      .first();

    if (!subscription) {
      throw new Error(`Subscription not found: ${args.clerkSubscriptionId}`);
    }

    await ctx.db.patch(subscription._id, {
      status: args.status,
      currentPeriodStart: args.currentPeriodStart,
      currentPeriodEnd: args.currentPeriodEnd,
      downloadQuota: args.downloadQuota,
      updatedAt: Date.now(),
    });

    console.log(`✅ Subscription updated: ${subscription._id}`);
    return subscription._id;
  },
});

/**
 * Cancel subscription
 */
export const cancel = mutation({
  args: {
    clerkSubscriptionId: v.string(),
  },
  handler: async (ctx, { clerkSubscriptionId }) => {
    const subscription = await ctx.db
      .query("subscriptions")
      .withIndex("by_clerk_id", q => q.eq("clerkSubscriptionId", clerkSubscriptionId))
      .first();

    if (!subscription) {
      throw new Error(`Subscription not found: ${clerkSubscriptionId}`);
    }

    await ctx.db.patch(subscription._id, {
      status: "cancelled",
      cancelAtPeriodEnd: true,
      updatedAt: Date.now(),
    });

    console.log(`✅ Subscription cancelled: ${subscription._id}`);
    return subscription._id;
  },
});
