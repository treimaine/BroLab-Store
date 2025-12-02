import { v } from "convex/values";
import type { Id } from "../_generated/dataModel";
import { query } from "../_generated/server";

export const getUserQuotas = query({
  args: { userId: v.string() },
  handler: async (ctx, { userId }) => {
    try {
      console.log(`🔍 Getting quotas for user: ${userId}`);

      const quotas = await ctx.db
        .query("quotas")
        .withIndex("by_user", q => q.eq("userId", userId as Id<"users">))
        .filter(q => q.eq(q.field("isActive"), true))
        .collect();

      console.log(`✅ Found ${quotas.length} active quotas for user: ${userId}`);
      return quotas;
    } catch (error) {
      console.error(`❌ Error getting quotas:`, error);
      return [];
    }
  },
});

// Récupérer un quota spécifique par type
export const getUserQuotaByType = query({
  args: {
    userId: v.string(),
    quotaType: v.string(),
  },
  handler: async (ctx, { userId, quotaType }) => {
    try {
      console.log(`🔍 Getting ${quotaType} quota for user: ${userId}`);

      const quota = await ctx.db
        .query("quotas")
        .withIndex("by_user", q => q.eq("userId", userId as Id<"users">))
        .filter(q => q.and(q.eq(q.field("quotaType"), quotaType), q.eq(q.field("isActive"), true)))
        .first();

      if (!quota) {
        console.log(`ℹ️ No ${quotaType} quota found for user: ${userId}`);
        return null;
      }

      console.log(`✅ Found ${quotaType} quota for user: ${userId}`);
      return quota;
    } catch (error) {
      console.error(`❌ Error getting quota:`, error);
      return null;
    }
  },
});

// Récupérer l'utilisation d'un quota
export const getQuotaUsage = query({
  args: { quotaId: v.id("quotas") },
  handler: async (ctx, { quotaId }) => {
    try {
      console.log(`🔍 Getting usage for quota: ${quotaId}`);

      const usage = await ctx.db
        .query("quotaUsage")
        .withIndex("by_quota", q => q.eq("quotaId", quotaId))
        .order("desc")
        .collect();

      console.log(`✅ Found ${usage.length} usage records for quota: ${quotaId}`);
      return usage;
    } catch (error) {
      console.error(`❌ Error getting quota usage:`, error);
      return [];
    }
  },
});
