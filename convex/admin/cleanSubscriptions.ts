import { mutation } from "../_generated/server";

/**
 * Nettoie les souscriptions de test avec des dates incorrectes
 * À exécuter via: npx convex run admin/cleanSubscriptions:cleanTestSubscriptions
 */
export const cleanTestSubscriptions = mutation({
  handler: async ctx => {
    const now = Date.now();

    // Trouver toutes les souscriptions avec des dates dans le futur (plus de 24h)
    const allSubscriptions = await ctx.db.query("subscriptions").collect();

    const futureSubscriptions = allSubscriptions.filter(
      sub => sub.currentPeriodStart > now + 86400000 // Plus de 24h dans le futur
    );

    console.log(`🔍 Found ${futureSubscriptions.length} subscriptions with future dates`);

    // Supprimer ces souscriptions
    const deleted = [];
    for (const sub of futureSubscriptions) {
      await ctx.db.delete(sub._id);
      deleted.push({
        id: sub._id,
        planId: sub.planId,
        startDate: new Date(sub.currentPeriodStart).toISOString(),
        clerkId: sub.clerkSubscriptionId,
      });
      console.log(
        `❌ Deleted subscription ${sub._id} (${sub.planId}) with date ${new Date(sub.currentPeriodStart).toISOString()}`
      );
    }

    return {
      success: true,
      deleted: futureSubscriptions.length,
      details: deleted,
      message: `Cleaned ${futureSubscriptions.length} test subscriptions with invalid dates`,
    };
  },
});

/**
 * Réinitialise toutes les souscriptions à Free
 * ATTENTION: Utiliser uniquement en développement!
 */
export const resetAllToFree = mutation({
  handler: async ctx => {
    const allSubscriptions = await ctx.db.query("subscriptions").collect();

    console.log(`🔄 Resetting ${allSubscriptions.length} subscriptions to Free`);

    const updated = [];
    for (const sub of allSubscriptions) {
      await ctx.db.delete(sub._id);
      updated.push({
        id: sub._id,
        oldPlan: sub.planId,
        userId: sub.userId,
      });
      console.log(`🔄 Deleted subscription ${sub._id} (was ${sub.planId})`);
    }

    return {
      success: true,
      reset: allSubscriptions.length,
      details: updated,
      message: `Reset ${allSubscriptions.length} subscriptions - users will default to Free`,
    };
  },
});

/**
 * Supprime les souscriptions en double pour un utilisateur
 */
export const removeDuplicateSubscriptions = mutation({
  handler: async ctx => {
    const allSubscriptions = await ctx.db.query("subscriptions").collect();

    // Grouper par userId
    const byUser = new Map<string, typeof allSubscriptions>();
    for (const sub of allSubscriptions) {
      const userId = sub.userId.toString();
      if (!byUser.has(userId)) {
        byUser.set(userId, []);
      }
      byUser.get(userId)!.push(sub);
    }

    // Trouver les utilisateurs avec plusieurs souscriptions
    const duplicates = [];
    for (const [userId, subs] of byUser.entries()) {
      if (subs.length > 1) {
        // Garder la plus récente, supprimer les autres
        const sorted = [...subs].sort((a, b) => b.updatedAt - a.updatedAt);
        const toKeep = sorted[0];
        const toDelete = sorted.slice(1);

        for (const sub of toDelete) {
          await ctx.db.delete(sub._id);
          duplicates.push({
            userId,
            deletedId: sub._id,
            deletedPlan: sub.planId,
            keptId: toKeep._id,
            keptPlan: toKeep.planId,
          });
          console.log(`❌ Deleted duplicate subscription ${sub._id} for user ${userId}`);
        }
      }
    }

    return {
      success: true,
      duplicatesRemoved: duplicates.length,
      details: duplicates,
      message: `Removed ${duplicates.length} duplicate subscriptions`,
    };
  },
});
