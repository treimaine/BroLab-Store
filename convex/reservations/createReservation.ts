import { v } from "convex/values";
import { mutation } from "../_generated/server";

export const createReservation = mutation({
  args: {
    serviceType: v.string(),
    details: v.any(),
    preferredDate: v.string(),
    durationMinutes: v.number(),
    totalPrice: v.number(),
    notes: v.optional(v.string()),
    clerkId: v.optional(v.string()), // For server-side calls
  },
  handler: async (ctx, args) => {
    let userId;

    if (args.clerkId) {
      // Server-side call with explicit clerkId
      const user = await ctx.db
        .query("users")
        .withIndex("by_clerk_id", q => q.eq("clerkId", args.clerkId))
        .first();

      if (!user) {
        throw new Error("User not found");
      }
      userId = user._id;
    } else {
      // Client-side call with authentication
      const identity = await ctx.auth.getUserIdentity();

      if (!identity) {
        throw new Error("Not authenticated");
      }

      const user = await ctx.db
        .query("users")
        .withIndex("by_clerk_id", q => q.eq("clerkId", identity.subject))
        .first();

      if (!user) {
        throw new Error("User not found");
      }
      userId = user._id;
    }

    const reservationId = await ctx.db.insert("reservations", {
      userId: userId,
      serviceType: args.serviceType,
      status: "pending",
      details: args.details,
      preferredDate: args.preferredDate,
      durationMinutes: args.durationMinutes,
      totalPrice: args.totalPrice,
      notes: args.notes,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    return reservationId;
  },
});
