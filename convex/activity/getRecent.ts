import { query } from "../_generated/server";
import { optionalAuth } from "../lib/authHelpers";

export interface ActivityItem {
  _id: string;
  action: string;
  details?: Record<string, unknown>;
  timestamp: number;
}

export const getRecent = query({
  args: {},
  handler: async ctx => {
    const auth = await optionalAuth(ctx);
    if (!auth) return [] as ActivityItem[];

    const activities = await ctx.db
      .query("activityLog")
      .withIndex("by_user", q => q.eq("userId", auth.userId))
      .order("desc")
      .take(50);

    return activities.map(a => ({
      _id: a._id as string,
      action: a.action,
      details: a.details as Record<string, unknown> | undefined,
      timestamp: a.timestamp,
    }));
  },
});
