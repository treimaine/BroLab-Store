import { internalAction } from "../_generated/server";

export const checkAndSendReminders = internalAction({
  args: {},
  handler: async (
    ctx
  ): Promise<{
    success: boolean;
    remindersSent?: number;
    errors?: number;
    totalReservationsChecked?: number;
    error?: string;
  }> => {
    console.log("🔔 Starting daily reminder check...");

    try {
      // Get all confirmed reservations
      const reservations = await ctx.runQuery(
        "reservations/listReservations:getAllReservationsByStatus" as any,
        {
          status: "confirmed",
        }
      );

      const now = new Date();
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);

      // Set time range for tomorrow (24 hours from now, with some buffer)
      const tomorrowStart = new Date(tomorrow);
      tomorrowStart.setHours(0, 0, 0, 0);

      const tomorrowEnd = new Date(tomorrow);
      tomorrowEnd.setHours(23, 59, 59, 999);

      let remindersSent = 0;
      let errors = 0;

      for (const reservation of reservations) {
        try {
          const reservationDate = new Date(reservation.preferredDate);

          // Check if reservation is tomorrow
          if (reservationDate >= tomorrowStart && reservationDate <= tomorrowEnd) {
            console.log(
              `📅 Sending reminder for reservation ${reservation._id} scheduled for ${reservationDate.toISOString()}`
            );

            const result = await ctx.runAction(
              "reservations/sendReminderEmail:sendReservationReminderEmail" as any,
              {
                reservationId: reservation._id,
              }
            );

            if (result.success) {
              remindersSent++;
              console.log(`✅ Reminder sent for reservation ${reservation._id}`);
            } else {
              errors++;
              console.error(
                `❌ Failed to send reminder for reservation ${reservation._id}:`,
                result.error
              );
            }
          }
        } catch (error) {
          errors++;
          console.error(`❌ Error processing reservation ${reservation._id}:`, error);
        }
      }

      console.log(`🔔 Reminder check completed: ${remindersSent} sent, ${errors} errors`);

      return {
        success: true,
        remindersSent,
        errors,
        totalReservationsChecked: reservations.length,
      };
    } catch (error) {
      console.error("❌ Failed to run reminder check:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  },
});
