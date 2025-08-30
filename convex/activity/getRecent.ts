import { query } from "../_generated/server";

export interface ActivityItem {
  _id: string;
  action: string;
  details?: any;
  timestamp: number;
}

export const getRecent = query({
  args: {},
  handler: async ctx => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [] as ActivityItem[];

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", q => q.eq("clerkId", identity.subject))
      .first();
    if (!user) return [] as ActivityItem[];

    const activities = await ctx.db
      .query("activityLog")
      .withIndex("by_user", q => q.eq("userId", user._id))
      .order("desc")
      .take(50);

    return activities.map(a => ({
      _id: a._id as any,
      action: a.action,
      details: a.details,
      timestamp: a.timestamp,
    }));
  },
});
