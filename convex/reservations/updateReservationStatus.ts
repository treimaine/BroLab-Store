import { v } from "convex/values";
import type { Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";
import { mutation } from "../_generated/server";

type UpdateArgs = {
  reservationId: Id<"reservations">;
  status: string;
  notes?: string;
  skipEmailNotification?: boolean;
  paymentProvider?: string;
  paymentStatus?: string;
  stripeSessionId?: string;
  stripePaymentIntentId?: string;
  paypalTransactionId?: string;
  paypalOrderId?: string;
};

/**
 * Build update data object with payment metadata
 */
function buildUpdateData(args: UpdateArgs) {
  return {
    status: args.status,
    notes: args.notes,
    updatedAt: Date.now(),
    ...(args.paymentProvider && { paymentProvider: args.paymentProvider }),
    ...(args.paymentStatus && { paymentStatus: args.paymentStatus }),
    ...(args.stripeSessionId && { stripeSessionId: args.stripeSessionId }),
    ...(args.stripePaymentIntentId && { stripePaymentIntentId: args.stripePaymentIntentId }),
    ...(args.paypalTransactionId && { paypalTransactionId: args.paypalTransactionId }),
    ...(args.paypalOrderId && { paypalOrderId: args.paypalOrderId }),
  };
}

/**
 * Log reservation status update activity
 */
async function logActivity(
  ctx: MutationCtx,
  userId: Id<"users">,
  args: UpdateArgs,
  oldStatus: string
) {
  await ctx.db.insert("activityLog", {
    userId,
    action: "reservation_status_updated",
    details: {
      reservationId: args.reservationId,
      oldStatus,
      newStatus: args.status,
      paymentProvider: args.paymentProvider,
      paymentStatus: args.paymentStatus,
    },
    timestamp: Date.now(),
  });
}

/**
 * Schedule email notification for status change
 */
async function scheduleEmailNotification(
  ctx: MutationCtx,
  reservationId: Id<"reservations">,
  oldStatus: string,
  newStatus: string
) {
  try {
    await ctx.scheduler.runAfter(
      0,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      "reservations/sendStatusUpdateEmail:sendReservationStatusUpdateEmail" as any,
      { reservationId, oldStatus, newStatus }
    );
    console.log(
      `📧 Status update email scheduled for reservation ${reservationId}: ${oldStatus} -> ${newStatus}`
    );
  } catch (emailError) {
    console.error(
      `⚠️ Failed to schedule status update email for reservation ${reservationId}:`,
      emailError
    );
  }
}

/**
 * Validate status workflow transitions
 * Status workflow: Draft → Pending → Confirmed → Completed/Cancelled
 */
function validateStatusTransition(oldStatus: string, newStatus: string): boolean {
  const validTransitions: Record<string, string[]> = {
    draft: ["pending", "cancelled"],
    pending: ["confirmed", "cancelled"],
    confirmed: ["completed", "cancelled"],
    completed: [], // Terminal state
    cancelled: [], // Terminal state
  };

  const allowedTransitions = validTransitions[oldStatus.toLowerCase()] || [];
  return allowedTransitions.includes(newStatus.toLowerCase());
}

/**
 * Check if payment should be prevented for this status
 * Only confirmed reservations should be paid
 */
function shouldPreventPayment(status: string): boolean {
  const statusLower = status.toLowerCase();
  return statusLower === "draft" || statusLower === "pending" || statusLower === "cancelled";
}

/**
 * Update reservation status with optional payment metadata
 * Supports both manual status updates and webhook-triggered updates
 * Implements status workflow: Draft → Pending → Confirmed → Completed/Cancelled
 */
export const updateReservationStatus = mutation({
  args: {
    reservationId: v.id("reservations"),
    status: v.string(),
    notes: v.optional(v.string()),
    skipEmailNotification: v.optional(v.boolean()),
    paymentProvider: v.optional(v.string()),
    paymentStatus: v.optional(v.string()),
    stripeSessionId: v.optional(v.string()),
    stripePaymentIntentId: v.optional(v.string()),
    paypalTransactionId: v.optional(v.string()),
    paypalOrderId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const reservation = await ctx.db.get(args.reservationId);
    if (!reservation) throw new Error("Reservation not found");

    const oldStatus = reservation.status;

    // Validate status transition
    if (!validateStatusTransition(oldStatus, args.status)) {
      throw new Error(
        `Invalid status transition: ${oldStatus} → ${args.status}. ` +
          `Valid transitions from ${oldStatus}: ${
            {
              draft: "pending or cancelled",
              pending: "confirmed or cancelled",
              confirmed: "completed or cancelled",
              completed: "none (terminal state)",
              cancelled: "none (terminal state)",
            }[oldStatus.toLowerCase()] || "unknown"
          }`
      );
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", q => q.eq("clerkId", identity.subject))
      .unique();

    if (!user) throw new Error("User not found");

    const isOwner = reservation.userId === user._id;
    const isAdmin = user.role === "admin";

    if (!isOwner && !isAdmin) {
      throw new Error("Not authorized to update this reservation");
    }

    // Prevent payment processing for non-confirmed reservations
    if (args.paymentStatus && shouldPreventPayment(args.status)) {
      console.warn(
        `⚠️ Payment processing blocked for reservation ${args.reservationId} with status ${args.status}. ` +
          `Only confirmed reservations can be paid.`
      );
      throw new Error(
        `Cannot process payment for reservation with status ${args.status}. ` +
          `Reservation must be confirmed before payment can be processed.`
      );
    }

    // Log cancellation reason if provided
    if (args.status.toLowerCase() === "cancelled" && args.notes) {
      console.log(
        `📝 Reservation ${args.reservationId} cancelled. Reason: ${args.notes.substring(0, 100)}${args.notes.length > 100 ? "..." : ""}`
      );
    }

    const updateData = buildUpdateData(args);
    await ctx.db.patch(args.reservationId, updateData);

    if (reservation.userId) {
      await logActivity(ctx, reservation.userId, args, oldStatus);
    }

    const shouldSendEmail = !args.skipEmailNotification && oldStatus !== args.status;
    if (shouldSendEmail) {
      await scheduleEmailNotification(ctx, args.reservationId, oldStatus, args.status);
    }

    console.log(
      `✅ Reservation ${args.reservationId} status updated: ${oldStatus} → ${args.status}`
    );

    return { success: true, oldStatus, newStatus: args.status };
  },
});
