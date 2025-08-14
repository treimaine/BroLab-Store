import { v } from "convex/values";
import { query } from "../_generated/server";

export const getUserReservations = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();

    if (!identity) {
      throw new Error("Not authenticated");
    }

    const userId = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", q => q.eq("clerkId", identity.subject))
      .unique();

    if (!userId) {
      throw new Error("User not found");
    }

    const reservations = await ctx.db
      .query("reservations")
      .withIndex("by_user", q => q.eq("userId", userId._id))
      .order("desc")
      .take(args.limit || 50);

    return reservations;
  },
});
