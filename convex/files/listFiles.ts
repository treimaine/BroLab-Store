import { v } from "convex/values";
import { query } from "../_generated/server";

export const listFiles = query({
  args: {
    role: v.optional(v.union(v.literal("upload"), v.literal("deliverable"), v.literal("invoice"))),
    reservationId: v.optional(v.id("reservations")),
    orderId: v.optional(v.id("orders")),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthorized");
    }

    // Get user from Convex
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", q => q.eq("clerkId", identity.subject))
      .first();

    if (!user) {
      throw new Error("User not found");
    }

    // Build query based on filters
    const filesQuery = ctx.db.query("files").withIndex("by_user", q => q.eq("userId", user._id));

    const allFiles = await filesQuery.collect();

    // Apply additional filters
    let filteredFiles = allFiles;

    if (args.role) {
      filteredFiles = filteredFiles.filter(file => file.role === args.role);
    }

    if (args.reservationId) {
      filteredFiles = filteredFiles.filter(file => file.reservationId === args.reservationId);
    }

    if (args.orderId) {
      filteredFiles = filteredFiles.filter(file => file.orderId === args.orderId);
    }

    return filteredFiles;
  },
});
