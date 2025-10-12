import { v } from "convex/values";
import { mutation } from "../_generated/server";

export const logActivity = mutation({
  args: {
    userId: v.id("users"),
    action: v.string(),
    details: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthorized");
    }

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
