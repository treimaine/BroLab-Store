import { v } from "convex/values";
import { mutation } from "../_generated/server";

interface QuotaUpdateData {
  updatedAt: number;
  used?: number;
  limit?: number;
  resetAt?: number;
  isActive?: boolean;
  metadata?: Record<string, unknown>;
}

export const updateQuota = mutation({
  args: {
    quotaId: v.id("quotas"),
    used: v.optional(v.number()),
    limit: v.optional(v.number()),
    resetAt: v.optional(v.number()),
    isActive: v.optional(v.boolean()),
    metadata: v.optional(
      v.object({
        resourceType: v.optional(v.string()),
        resourceSize: v.optional(v.number()),
        resourceFormat: v.optional(v.string()),
      })
    ),
  },
  handler: async (ctx, args) => {
    try {
      console.log(`🔄 Updating quota: ${args.quotaId}`);

      const updateData: QuotaUpdateData = {
        updatedAt: Date.now(),
      };

      if (args.used !== undefined) updateData.used = args.used;
      if (args.limit !== undefined) updateData.limit = args.limit;
      if (args.resetAt !== undefined) updateData.resetAt = args.resetAt;
      if (args.isActive !== undefined) updateData.isActive = args.isActive;
      if (args.metadata !== undefined) {
        updateData.metadata = {
          ...updateData.metadata,
          ...args.metadata,
        };
      }

      await ctx.db.patch(args.quotaId, updateData);

      // Log de l'activité
      const quota = await ctx.db.get(args.quotaId);
      if (quota) {
        await ctx.db.insert("activityLog", {
          userId: quota.userId,
          action: "quota_updated",
          details: {
            quotaId: args.quotaId,
            quotaType: quota.quotaType,
            changes: updateData,
          },
          timestamp: Date.now(),
        });
      }

      console.log(`✅ Quota updated successfully: ${args.quotaId}`);
      return { success: true, message: "Quota updated successfully" };
    } catch (error) {
      console.error(`❌ Error updating quota:`, error);

      const errorMessage = error instanceof Error ? error.message : String(error);

      // Log de l'erreur
      const quota = await ctx.db.get(args.quotaId);
      if (quota) {
        await ctx.db.insert("auditLogs", {
          userId: quota.userId,
          action: "quota_update_error",
          resource: "quotas",
          details: {
            operation: "update",
            resource: "quotas",
            resourceId: args.quotaId,
            error: errorMessage,
            quotaId: args.quotaId,
            changes: args,
          },
          timestamp: Date.now(),
        });
      }

      throw new Error(`Failed to update quota: ${errorMessage}`);
    }
  },
});

// Consommer un quota (incrémenter l'utilisation)
export const consumeQuota = mutation({
  args: {
    quotaId: v.id("quotas"),
    amount: v.number(),
    resourceId: v.optional(v.string()),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    try {
      console.log(`🔄 Consuming quota: ${args.quotaId}, amount: ${args.amount}`);

      const quota = await ctx.db.get(args.quotaId);
      if (!quota) {
        throw new Error("Quota not found");
      }

      // Vérifier si le quota peut être consommé
      if (quota.limit !== -1 && quota.used + args.amount > quota.limit) {
        throw new Error("Quota limit exceeded");
      }

      // Mettre à jour l'utilisation
      const newUsed = quota.used + args.amount;
      await ctx.db.patch(args.quotaId, {
        used: newUsed,
        updatedAt: Date.now(),
      });

      // Enregistrer l'utilisation
      await ctx.db.insert("quotaUsage", {
        quotaId: args.quotaId,
        resourceId: args.resourceId || "unknown",
        resourceType: quota.quotaType,
        amount: args.amount,
        description: args.description || `Consumed ${args.amount} ${quota.quotaType}`,
        metadata: {
          resourceType: quota.quotaType as "download" | "upload" | "api_call" | "storage",
        },
        createdAt: Date.now(),
      });

      // Log de l'activité
      await ctx.db.insert("activityLog", {
        userId: quota.userId,
        action: "quota_consumed",
        details: {
          quotaId: args.quotaId,
          quotaType: quota.quotaType,
          amount: args.amount,
          resourceId: args.resourceId,
          newTotal: newUsed,
        },
        timestamp: Date.now(),
      });

      console.log(`✅ Quota consumed successfully: ${args.quotaId}, new usage: ${newUsed}`);
      return {
        success: true,
        message: "Quota consumed successfully",
        newUsage: newUsed,
        remaining: quota.limit === -1 ? Infinity : Math.max(0, quota.limit - newUsed),
      };
    } catch (error) {
      console.error(`❌ Error consuming quota:`, error);

      const errorMessage = error instanceof Error ? error.message : String(error);

      // Log de l'erreur
      const quota = await ctx.db.get(args.quotaId);
      if (quota) {
        await ctx.db.insert("auditLogs", {
          userId: quota.userId,
          action: "quota_consumption_error",
          resource: "quotas",
          details: {
            operation: "update",
            resource: "quotas",
            resourceId: args.quotaId,
            error: errorMessage,
            quotaId: args.quotaId,
            amount: args.amount,
            consumedResourceId: args.resourceId,
          },
          timestamp: Date.now(),
        });
      }

      throw new Error(`Failed to consume quota: ${errorMessage}`);
    }
  },
});
