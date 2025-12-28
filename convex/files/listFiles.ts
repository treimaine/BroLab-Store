import { v } from "convex/values";
import { Id } from "../_generated/dataModel";
import { query } from "../_generated/server";
import { requireAuth } from "../lib/authHelpers";

export const listFiles = query({
  args: {
    role: v.optional(v.union(v.literal("upload"), v.literal("deliverable"), v.literal("invoice"))),
    reservationId: v.optional(v.id("reservations")),
    orderId: v.optional(v.id("orders")),
    clerkId: v.optional(v.string()), // For server-side calls from Express
  },
  handler: async (ctx, args) => {
    let userId: Id<"users">;

    // Support both authenticated client calls and server-side calls with clerkId
    if (args.clerkId) {
      // Server-side call with explicit clerkId - look up user directly
      const user = await ctx.db
        .query("users")
        .withIndex("by_clerk_id", q => q.eq("clerkId", args.clerkId!))
        .first();

      if (!user) {
        throw new Error("User not found");
      }
      userId = user._id;
    } else {
      // Client-side call with authentication - use auth helper
      const auth = await requireAuth(ctx);
      userId = auth.userId;
    }

    // Build query based on filters
    const filesQuery = ctx.db.query("files").withIndex("by_user", q => q.eq("userId", userId));

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
