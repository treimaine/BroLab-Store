import { v } from "convex/values";
import { query } from "../_generated/server";

export interface ActivityItem {
  _id: string;
  action: string;
  details?: Record<string, unknown>;
  timestamp: number;
}

/**
 * Get user activity by clerkId
 * Used by server routes to fetch activity for authenticated users
 */
export const getUserActivity = query({
  args: {
    clerkId: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<ActivityItem[]> => {
    const { clerkId, limit = 20 } = args;

    if (!clerkId) {
      return [];
    }

    // Find user by clerkId
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", q => q.eq("clerkId", clerkId))
      .first();

    if (!user) {
      return [];
    }

    // Fetch activity logs for the user
    const activities = await ctx.db
      .query("activityLog")
      .withIndex("by_user", q => q.eq("userId", user._id))
      .order("desc")
      .take(Math.min(limit, 100));

    return activities.map(a => ({
      _id: a._id as string,
      action: a.action,
      details: a.details as Record<string, unknown> | undefined,
      timestamp: a.timestamp,
    }));
  },
});
