import { v } from "convex/values";
import { mutation } from "../_generated/server";

export const createSubscription = mutation({
  args: {
    clerkId: v.string(),
    planId: v.string(),
    status: v.string(),
    features: v.array(v.string()),
    downloadQuota: v.number(),
    downloadUsed: v.number(),
    clerkSubscriptionId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    try {
      console.log(`🔄 Creating subscription for clerkId: ${args.clerkId}, plan: ${args.planId}`);

      const now = Date.now();

      // Resolve user by clerkId
      const user = await ctx.db
        .query("users")
        .withIndex("by_clerk_id", q => q.eq("clerkId", args.clerkId))
        .first();
      if (!user) throw new Error("User not found for clerkId");
      const currentPeriodStart = now;
      const currentPeriodEnd = now + 30 * 24 * 60 * 60 * 1000; // +30 jours

      // Créer l'abonnement
      const subscriptionId = await ctx.db.insert("subscriptions", {
        userId: user._id,
        clerkSubscriptionId: args.clerkSubscriptionId || `sub_${Date.now()}`,
        planId: args.planId,
        status: args.status,
        currentPeriodStart,
        currentPeriodEnd,
        cancelAtPeriodEnd: false,
        features: args.features,
        downloadQuota: args.downloadQuota,
        downloadUsed: args.downloadUsed,
        metadata: {
          billingCycle: "monthly",
          referralSource: "manual",
        },
        createdAt: now,
        updatedAt: now,
      });

      // Créer les quotas pour cet abonnement
      await ctx.db.insert("quotas", {
        userId: user._id,
        subscriptionId,
        quotaType: "downloads",
        limit: args.downloadQuota,
        used: args.downloadUsed,
        resetAt: currentPeriodEnd,
        resetPeriod: "monthly",
        isActive: true,
        createdAt: now,
        updatedAt: now,
      });

      // Log de l'activité
      await ctx.db.insert("activityLog", {
        userId: user._id,
        action: "subscription_created",
        details: {
          planId: args.planId,
          subscriptionId,
          features: args.features,
        },
        timestamp: now,
      });

      console.log(`✅ Subscription created successfully: ${subscriptionId}`);
      return {
        success: true,
        subscriptionId,
        message: "Subscription created successfully",
      };
    } catch (error) {
      console.error(`❌ Error creating subscription:`, error);

      const errorMessage = error instanceof Error ? error.message : String(error);

      // Log de l'erreur
      await ctx.db.insert("auditLogs", {
        // userId optional if user not found earlier
        action: "subscription_creation_error",
        resource: "subscriptions",
        details: {
          error: errorMessage,
          planId: args.planId,
          clerkId: args.clerkId,
        },
        timestamp: Date.now(),
      });

      throw new Error(`Failed to create subscription: ${errorMessage}`);
    }
  },
});
