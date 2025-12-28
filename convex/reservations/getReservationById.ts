import { v } from "convex/values";
import { query } from "../_generated/server";
import { requireAuth } from "../lib/authHelpers";

/**
 * Get a reservation by its ID
 * For authenticated users, verifies ownership
 * For server-side calls, returns the reservation directly
 */
export const getReservationById = query({
  args: {
    reservationId: v.id("reservations"),
    skipAuth: v.optional(v.boolean()), // For server-side/webhook calls
  },
  handler: async (ctx, args) => {
    const reservation = await ctx.db.get(args.reservationId);

    if (!reservation) {
      return null;
    }

    // Skip auth check for server-side calls (webhooks, etc.)
    if (args.skipAuth) {
      return reservation;
    }

    // Verify ownership for authenticated calls
    const { userId } = await requireAuth(ctx);
    const user = await ctx.db.get(userId);

    if (!user) {
      throw new Error("User not found");
    }

    // Check if user owns the reservation or is admin
    const isOwner = reservation.userId === user._id;
    const isAdmin = user.role === "admin";

    if (!isOwner && !isAdmin) {
      throw new Error("Access denied");
    }

    return reservation;
  },
});

/**
 * Get reservation by ID for server-side use (no auth)
 */
export const getReservationByIdServer = query({
  args: {
    reservationId: v.id("reservations"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.reservationId);
  },
});
