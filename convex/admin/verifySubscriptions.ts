import { query } from "../_generated/server";
import { optionalAuth } from "../lib/authHelpers";

/**
 * Vérifie l'état de toutes les souscriptions
 * À exécuter via: npx convex run admin/verifySubscriptions:verifyAllSubscriptions
 */
export const verifyAllSubscriptions = query({
  handler: async ctx => {
    const now = Date.now();

    const allSubscriptions = await ctx.db.query("subscriptions").collect();

    const report = {
      total: allSubscriptions.length,
      active: 0,
      cancelled: 0,
      past_due: 0,
      unpaid: 0,
      futureStart: 0,
      pastEnd: 0,
      byPlan: {} as Record<string, number>,
      issues: [] as Array<{
        id: string;
        issue: string;
        planId: string;
        status: string;
        dates: {
          start: string;
          end: string;
        };
      }>,
    };

    for (const sub of allSubscriptions) {
      // Compter par statut
      if (sub.status === "active") report.active++;
      if (sub.status === "cancelled") report.cancelled++;
      if (sub.status === "past_due") report.past_due++;
      if (sub.status === "unpaid") report.unpaid++;

      // Compter par plan
      report.byPlan[sub.planId] = (report.byPlan[sub.planId] || 0) + 1;

      // Vérifier les dates
      const startDate = new Date(sub.currentPeriodStart).toISOString();
      const endDate = new Date(sub.currentPeriodEnd).toISOString();

      if (sub.currentPeriodStart > now + 86400000) {
        report.futureStart++;
        report.issues.push({
          id: sub._id.toString(),
          issue: "Start date is more than 24h in the future",
          planId: sub.planId,
          status: sub.status,
          dates: { start: startDate, end: endDate },
        });
      }

      if (sub.currentPeriodEnd < now && sub.status === "active") {
        report.pastEnd++;
        report.issues.push({
          id: sub._id.toString(),
          issue: "End date is in the past but status is still active",
          planId: sub.planId,
          status: sub.status,
          dates: { start: startDate, end: endDate },
        });
      }
    }

    return {
      timestamp: new Date().toISOString(),
      summary: {
        total: report.total,
        byStatus: {
          active: report.active,
          cancelled: report.cancelled,
          past_due: report.past_due,
          unpaid: report.unpaid,
        },
        byPlan: report.byPlan,
      },
      issues: {
        count: report.issues.length,
        futureStart: report.futureStart,
        pastEnd: report.pastEnd,
        details: report.issues,
      },
      healthy: report.issues.length === 0,
    };
  },
});

/**
 * Liste toutes les souscriptions avec détails complets
 */
export const listAllSubscriptions = query({
  handler: async ctx => {
    const allSubscriptions = await ctx.db.query("subscriptions").collect();

    const subscriptionsWithUsers = await Promise.all(
      allSubscriptions.map(async sub => {
        const user = await ctx.db.get(sub.userId);
        return {
          subscriptionId: sub._id.toString(),
          clerkSubscriptionId: sub.clerkSubscriptionId,
          planId: sub.planId,
          status: sub.status,
          dates: {
            start: new Date(sub.currentPeriodStart).toISOString(),
            end: new Date(sub.currentPeriodEnd).toISOString(),
            created: new Date(sub.createdAt).toISOString(),
            updated: new Date(sub.updatedAt).toISOString(),
          },
          quota: {
            total: sub.downloadQuota,
            used: sub.downloadUsed,
            remaining: sub.downloadQuota - sub.downloadUsed,
          },
          user: user
            ? {
                id: user._id.toString(),
                clerkId: user.clerkId,
                email: user.email,
              }
            : null,
        };
      })
    );

    return {
      count: subscriptionsWithUsers.length,
      subscriptions: subscriptionsWithUsers,
    };
  },
});

/**
 * Vérifie les souscriptions d'un utilisateur spécifique
 */
export const verifyUserSubscriptions = query({
  args: {},
  handler: async ctx => {
    const auth = await optionalAuth(ctx);
    if (!auth) {
      return { error: "Not authenticated" };
    }

    // Query users table specifically for proper typing
    const user = await ctx.db
      .query("users")
      .filter(q => q.eq(q.field("_id"), auth.userId))
      .first();
    if (!user) {
      return { error: "User not found" };
    }

    const subscriptions = await ctx.db
      .query("subscriptions")
      .withIndex("by_user", q => q.eq("userId", auth.userId))
      .collect();

    return {
      userId: user._id.toString(),
      clerkId: user.clerkId,
      email: user.email,
      subscriptionCount: subscriptions.length,
      subscriptions: subscriptions.map(sub => ({
        id: sub._id.toString(),
        clerkSubscriptionId: sub.clerkSubscriptionId,
        planId: sub.planId,
        status: sub.status,
        dates: {
          start: new Date(sub.currentPeriodStart).toISOString(),
          end: new Date(sub.currentPeriodEnd).toISOString(),
        },
        quota: {
          total: sub.downloadQuota,
          used: sub.downloadUsed,
        },
      })),
    };
  },
});
