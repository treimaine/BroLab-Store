import { v } from "convex/values";
import { action } from "../_generated/server";

export const sendReservationReminderEmail = action({
  args: {
    reservationId: v.id("reservations"),
  },
  handler: async (ctx, args) => {
    // Get reservation details
    const reservation = await ctx.runQuery("reservations/listReservations:getReservation" as any, {
      reservationId: args.reservationId,
    });

    if (!reservation) {
      throw new Error("Reservation not found");
    }

    // Get user email from the reservation details
    const userEmail = reservation.details?.email;
    if (!userEmail) {
      throw new Error("No email found in reservation details");
    }

    // Call the email service via HTTP
    const emailServiceUrl =
      process.env.EMAIL_SERVICE_URL ||
      "http://localhost:3000/api/internal/send-reservation-reminder";

    try {
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
        }),
      });

      if (!response.ok) {
        throw new Error(`Email service responded with status ${response.status}`);
      }

      console.log(`✅ Reservation reminder email sent for reservation ${args.reservationId}`);
      return { success: true };
    } catch (error) {
      console.error(
        `❌ Failed to send reservation reminder email for reservation ${args.reservationId}:`,
        error
      );
      // Don't throw to avoid failing the mutation
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  },
});
