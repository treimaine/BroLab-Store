import { v } from "convex/values";
import { mutation } from "../_generated/server";

export const updateSubscription = mutation({
  args: {
    userId: v.id("users"),
    stripeCustomerId: v.optional(v.string()),
    plan: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.patch(args.userId, {
      updatedAt: Date.now(),
    });
  },
});

export const updateCurrentUserSubscription = mutation({
  args: {
    stripeCustomerId: v.optional(v.string()),
    plan: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", q => q.eq("clerkId", identity.subject))
      .first();

    if (!user) throw new Error("User not found");

    return await ctx.db.patch(user._id, {
      updatedAt: Date.now(),
    });
  },
});
