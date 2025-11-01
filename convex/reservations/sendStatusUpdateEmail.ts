import type { FunctionReference } from "convex/server";
import { v } from "convex/values";
import { action } from "../_generated/server";

export const sendReservationStatusUpdateEmail = action({
  args: {
    reservationId: v.id("reservations"),
    oldStatus: v.string(),
    newStatus: v.string(),
  },
  handler: async (ctx, args) => {
    // Get reservation details using string-based reference with proper typing
    const getReservationRef =
      "reservations/listReservations:getReservation" as unknown as FunctionReference<
        "query",
        "public"
      >;
    const reservation = await ctx.runQuery(getReservationRef, {
      reservationId: args.reservationId,
    });

    if (!reservation) {
      throw new Error("Reservation not found");
    }

    // Get user details - we'll use the user ID from the reservation
    if (!reservation.userId) {
      throw new Error("Reservation has no associated user");
    }

    // Get user email from the reservation details
    const userEmail = reservation.details?.email;
    if (!userEmail) {
      throw new Error("No email found in reservation details");
    }

    // Call the email service via HTTP with retry logic (3 attempts with exponential backoff)
    const emailServiceUrl =
      process.env.EMAIL_SERVICE_URL ||
      "http://localhost:3000/api/internal/send-reservation-status-email";

    const maxRetries = 3;
    const baseDelay = 1000; // 1 second

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(
          `📧 Sending status update email (attempt ${attempt}/${maxRetries}) for reservation ${args.reservationId}`
        );

        const response = await fetch(emailServiceUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.INTERNAL_API_KEY}`,
          },
          body: JSON.stringify({
            userEmail: userEmail,
            reservation: {
              id: reservation._id,
              serviceType: reservation.serviceType,
              preferredDate: reservation.preferredDate,
              durationMinutes: reservation.durationMinutes,
              totalPrice: reservation.totalPrice,
              status: reservation.status,
              notes: reservation.notes,
              details: reservation.details,
            },
            oldStatus: args.oldStatus,
            newStatus: args.newStatus,
          }),
        });

        if (!response.ok) {
          throw new Error(`Email service responded with status ${response.status}`);
        }

        console.log(
          `✅ Status update email sent successfully for reservation ${args.reservationId} on attempt ${attempt}`
        );
        return { success: true, attempts: attempt };
      } catch (error) {
        const isLastAttempt = attempt === maxRetries;
        const errorMessage = error instanceof Error ? error.message : String(error);

        console.error(
          `❌ Failed to send status update email for reservation ${args.reservationId} (attempt ${attempt}/${maxRetries}):`,
          errorMessage
        );

        // Log to audit trail
        try {
          await ctx.runMutation("audit:logActivity" as any, {
            userId: reservation.userId,
            action: "email_send_failed",
            details: {
              reservationId: args.reservationId,
              emailType: "status_update",
              attempt,
              maxRetries,
              oldStatus: args.oldStatus,
              newStatus: args.newStatus,
              error: errorMessage,
            },
          });
        } catch (auditError) {
          console.error("Failed to log email failure to audit:", auditError);
        }

        if (isLastAttempt) {
          // Don't throw to avoid failing the mutation
          return {
            success: false,
            error: errorMessage,
            attempts: attempt,
          };
        }

        // Exponential backoff: 1s, 2s, 4s
        const delay = baseDelay * Math.pow(2, attempt - 1);
        console.log(`⏳ Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    // This should never be reached, but TypeScript requires it
    return { success: false, error: "Max retries exceeded", attempts: maxRetries };
  },
});
