import { v } from "convex/values";
import { action } from "../_generated/server";

export const sendAdminNotificationEmail = action({
  args: {
    reservationId: v.id("reservations"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    // Get reservation details using proper API reference
    const reservation = await ctx.runQuery("reservations/listReservations:getReservation" as any, {
      reservationId: args.reservationId,
    });

    if (!reservation) {
      throw new Error("Reservation not found");
    }

    // Get user details using proper API reference
    const user = await ctx.runQuery("users:getUserById" as any, {
      id: args.userId,
    });

    if (!user) {
      throw new Error("User not found");
    }

    // Call the email service via HTTP
    const emailServiceUrl =
      process.env.EMAIL_SERVICE_URL || "http://localhost:3000/api/internal/send-admin-notification";

    try {
      const response = await fetch(emailServiceUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.INTERNAL_API_KEY}`,
        },
        body: JSON.stringify({
          user: {
            id: user._id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            fullName: `${user.firstName || ""} ${user.lastName || ""}`.trim() || user.email,
          },
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

      console.log(`✅ Admin notification email sent for reservation ${args.reservationId}`);
      return { success: true };
    } catch (error) {
      console.error(
        `❌ Failed to send admin notification email for reservation ${args.reservationId}:`,
        error
      );
      // Don't throw to avoid failing the mutation
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  },
});
