import { v } from "convex/values";
import { internalQuery, query } from "../_generated/server";

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

export const getReservation = query({
  args: {
    reservationId: v.id("reservations"),
  },
  handler: async (ctx, args) => {
    // This is for webhook processing, so we don't require authentication
    // The webhook handler will validate the request authenticity
    const reservation = await ctx.db.get(args.reservationId);

    if (!reservation) {
      throw new Error("Reservation not found");
    }

    return reservation;
  },
});

// Internal query for system operations like reminder checks
export const getAllReservationsByStatus = internalQuery({
  args: {
    status: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let query = ctx.db.query("reservations");

    if (args.status) {
      query = query.filter(q => q.eq(q.field("status"), args.status));
    }

    const reservations = await query.collect();
    return reservations;
  },
});
