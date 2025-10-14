import { v } from "convex/values";
import { mutation } from "../_generated/server";

export const updateReservationStatus = mutation({
  args: {
    reservationId: v.id("reservations"),
    status: v.string(),
    notes: v.optional(v.string()),
    skipEmailNotification: v.optional(v.boolean()), // For webhook updates to avoid duplicate emails
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

    // Store old status for email notification
    const oldStatus = reservation.status;

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

    // Send email notification if status changed and not skipped
    if (!args.skipEmailNotification && oldStatus !== args.status) {
      try {
        // Schedule the email to be sent via action (non-blocking)
        await ctx.scheduler.runAfter(
          0,
          "reservations/sendStatusUpdateEmail:sendReservationStatusUpdateEmail" as any,
          {
            reservationId: args.reservationId,
            oldStatus,
            newStatus: args.status,
          }
        );
        console.log(
          `📧 Status update email scheduled for reservation ${args.reservationId}: ${oldStatus} -> ${args.status}`
        );
      } catch (emailError) {
        console.error(
          `⚠️ Failed to schedule status update email for reservation ${args.reservationId}:`,
          emailError
        );
        // Don't fail the status update if email scheduling fails
      }
    }

    return { success: true, oldStatus, newStatus: args.status };
  },
});
