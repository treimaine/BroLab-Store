import { v } from "convex/values";
import { mutation } from "../_generated/server";
import { requireAuth } from "../lib/authHelpers";

export const logActivity = mutation({
  args: {
    userId: v.id("users"),
    action: v.string(),
    details: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    // Verify user is authenticated (we don't need the result, just the check)
    await requireAuth(ctx);

    // Insert activity log entry
    const activityId = await ctx.db.insert("activityLog", {
      userId: args.userId,
      action: args.action,
      details: args.details,
      timestamp: Date.now(),
    });

    return activityId;
  },
});
