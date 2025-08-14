import { v } from "convex/values";
import { mutation } from "../_generated/server";

export const updateReservationStatus = mutation({
  args: {
    reservationId: v.id("reservations"),
    status: v.string(),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();

    if (!identity) {
      throw new Error("Not authenticated");
    }

    const reservation = await ctx.db.get(args.reservationId);

    if (!reservation) {
      throw new Error("Reservation not found");
    }

    // Vérifier que l'utilisateur est propriétaire de la réservation ou admin
    const userId = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", q => q.eq("clerkId", identity.subject))
      .unique();

    if (!userId) {
      throw new Error("User not found");
    }

    if (reservation.userId !== userId._id) {
      // TODO: Vérifier si l'utilisateur est admin
      throw new Error("Not authorized to update this reservation");
    }

    await ctx.db.patch(args.reservationId, {
      status: args.status,
      notes: args.notes,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});
