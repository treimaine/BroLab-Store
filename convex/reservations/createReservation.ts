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

    const reservationId = await ctx.db.insert("reservations", {
      userId: userId._id,
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
