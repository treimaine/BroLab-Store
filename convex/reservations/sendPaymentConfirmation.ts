import { v } from "convex/values";
import { action } from "../_generated/server";

export const sendPaymentConfirmationEmail = action({
  args: {
    userEmail: v.string(),
    reservationIds: v.array(v.id("reservations")),
    payment: v.object({
      amount: v.number(),
      currency: v.string(),
      paymentIntentId: v.optional(v.string()),
      sessionId: v.optional(v.string()),
      paymentMethod: v.optional(v.string()),
    }),
  },
  handler: async (ctx, args) => {
    // Get reservation details for all reservations
    // Type for reservation query result
    type ReservationResult = {
      _id: string;
      serviceType: string;
      preferredDate: string;
      durationMinutes: number;
      totalPrice: number;
      status: string;
      notes?: string;
      details: Record<string, unknown>;
    };

    const reservations = await Promise.all(
      args.reservationIds.map(async reservationId => {
        const reservation = (await ctx.runQuery(
          // @ts-expect-error - Dynamic query path for internal reservation lookup
          "reservations/listReservations:getReservation",
          {
            reservationId,
          }
        )) as ReservationResult | null;
        if (!reservation) {
          throw new Error(`Reservation ${reservationId} not found`);
        }
        return reservation;
      })
    );

    // Call the email service via HTTP
    const emailServiceUrl =
      process.env.EMAIL_SERVICE_URL ||
      "http://localhost:3000/api/internal/send-payment-confirmation";

    try {
      const response = await fetch(emailServiceUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.INTERNAL_API_KEY}`,
        },
        body: JSON.stringify({
          userEmail: args.userEmail,
          reservations: reservations.map(reservation => ({
            id: reservation._id,
            serviceType: reservation.serviceType,
            preferredDate: reservation.preferredDate,
            durationMinutes: reservation.durationMinutes,
            totalPrice: reservation.totalPrice,
            status: reservation.status,
            notes: reservation.notes,
            details: reservation.details,
          })),
          payment: args.payment,
        }),
      });

      if (!response.ok) {
        throw new Error(`Email service responded with status ${response.status}`);
      }

      console.log(
        `✅ Payment confirmation email sent for reservations ${args.reservationIds.join(", ")}`
      );
      return { success: true };
    } catch (error) {
      console.error(
        `❌ Failed to send payment confirmation email for reservations ${args.reservationIds.join(", ")}:`,
        error
      );
      // Don't throw to avoid failing the mutation
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  },
});
