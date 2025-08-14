import { v } from "convex/values";
import { query } from "../_generated/server";

export const getCurrentSubscription = query({
  args: { userId: v.string() },
  handler: async (ctx, { userId }) => {
    try {
      console.log(`🔍 Getting current subscription for user: ${userId}`);

      // Récupérer l'abonnement actif le plus récent
      const subscription = await ctx.db
        .query("subscriptions")
        .withIndex("by_user", q => q.eq("userId", userId as any))
        .filter(q => q.eq(q.field("status"), "active"))
        .order("desc")
        .first();

      if (!subscription) {
        console.log(`ℹ️ No active subscription found for user: ${userId}`);
        return null;
      }

      console.log(`✅ Found active subscription: ${subscription._id} (${subscription.planId})`);
      return subscription;
    } catch (error) {
      console.error(`❌ Error getting subscription:`, error);
      return null;
    }
  },
});

// Récupérer tous les abonnements d'un utilisateur (historique)
export const getUserSubscriptions = query({
  args: { userId: v.string() },
  handler: async (ctx, { userId }) => {
    try {
      console.log(`🔍 Getting all subscriptions for user: ${userId}`);

      const subscriptions = await ctx.db
        .query("subscriptions")
        .withIndex("by_user", q => q.eq("userId", userId as any))
        .order("desc")
        .collect();

      console.log(`✅ Found ${subscriptions.length} subscriptions for user: ${userId}`);
      return subscriptions;
    } catch (error) {
      console.error(`❌ Error getting subscriptions:`, error);
      return [];
    }
  },
});

// Récupérer un abonnement par son ID
export const getSubscriptionById = query({
  args: { subscriptionId: v.id("subscriptions") },
  handler: async (ctx, { subscriptionId }) => {
    try {
      console.log(`🔍 Getting subscription by ID: ${subscriptionId}`);

      const subscription = await ctx.db.get(subscriptionId);

      if (!subscription) {
        console.log(`ℹ️ Subscription not found: ${subscriptionId}`);
        return null;
      }

      console.log(`✅ Found subscription: ${subscriptionId}`);
      return subscription;
    } catch (error) {
      console.error(`❌ Error getting subscription:`, error);
      return null;
    }
  },
});
