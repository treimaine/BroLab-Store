import { v } from "convex/values";
import { query } from "../_generated/server";

export const getSubscription = query({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    // Récupérer l'abonnement de l'utilisateur
    const subscription = await ctx.db
      .query("subscriptions")
      .withIndex("by_user", q => q.eq("userId", args.userId))
      .first();

    if (!subscription) {
      // Retourner un abonnement gratuit par défaut
      return {
        plan: "free",
        status: "inactive",
        currentPeriodEnd: null,
        cancelAtPeriodEnd: false,
        userId: args.userId,
      };
    }

    // Retourner les informations d'abonnement
    return {
      plan: subscription.planId,
      status: subscription.status,
      currentPeriodEnd: subscription.currentPeriodEnd,
      cancelAtPeriodEnd: subscription.cancelAtPeriodEnd || false,
      userId: args.userId,
    };
  },
});

export const getCurrentUserSubscription = query({
  args: {
    clerkId: v.string(),
  },
  handler: async (ctx, args) => {
    // Trouver l'utilisateur par son clerkId
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", q => q.eq("clerkId", args.clerkId))
      .first();

    if (!user) return null;

    // Récupérer l'abonnement de l'utilisateur
    const subscription = await ctx.db
      .query("subscriptions")
      .withIndex("by_user", q => q.eq("userId", user._id))
      .first();

    if (!subscription) {
      // Retourner un abonnement gratuit par défaut
      return {
        plan: "free",
        status: "inactive",
        currentPeriodEnd: null,
        cancelAtPeriodEnd: false,
        userId: user._id,
      };
    }

    // Retourner les informations d'abonnement
    return {
      plan: subscription.planId,
      status: subscription.status,
      currentPeriodEnd: subscription.currentPeriodEnd,
      cancelAtPeriodEnd: subscription.cancelAtPeriodEnd || false,
      userId: user._id,
    };
  },
});

/**
 * Get subscription by Clerk subscription ID (for reconciliation)
 */
export const getByClerkId = query({
  args: {
    clerkSubscriptionId: v.string(),
  },
  handler: async (ctx, args) => {
    const subscription = await ctx.db
      .query("subscriptions")
      .withIndex("by_clerk_id", q => q.eq("clerkSubscriptionId", args.clerkSubscriptionId))
      .first();

    return subscription;
  },
});
