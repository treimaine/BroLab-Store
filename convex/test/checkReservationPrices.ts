import { query } from "../_generated/server";

/**
 * Test function to check reservation prices
 */
export const checkReservationPrices = query({
  args: {},
  handler: async ctx => {
    // Get reservations to check
    const reservations = await ctx.db.query("reservations").take(5);

    const results = reservations.map(reservation => ({
      id: reservation._id,
      serviceType: reservation.serviceType,
      duration: reservation.durationMinutes,
      totalPrice: reservation.totalPrice,
      status: reservation.status,
      details: reservation.details,
      createdAt: new Date(reservation.createdAt).toISOString(),
    }));

    return {
      message: "Reservation prices check",
      results,
      summary: {
        totalReservations: reservations.length,
      },
    };
  },
});
