import { query } from "../_generated/server";
import { CurrencyCalculator } from "../lib/statisticsCalculator";

/**
 * Test function to check reservation price transformation
 */
export const checkReservationTransform = query({
  args: {},
  handler: async ctx => {
    // Get a few reservations to check
    const reservations = await ctx.db.query("reservations").take(3);

    const results = reservations.map(reservation => {
      const rawPrice = reservation.totalPrice; // En centimes
      const transformedPrice = CurrencyCalculator.centsToDollars(reservation.totalPrice); // En euros

      return {
        id: reservation._id,
        serviceType: reservation.serviceType,
        duration: reservation.durationMinutes,
        rawPrice: rawPrice, // Centimes dans la DB
        transformedPrice: transformedPrice, // Euros après transformation
        expectedDisplay: `${transformedPrice.toFixed(2)}€`, // Ce qui devrait s'afficher
        previousIncorrectDisplay: `${(transformedPrice / 100).toFixed(2)}€`, // Ce qui s'affichait avant
      };
    });

    return {
      message: "Reservation price transformation check",
      results,
      summary: {
        totalReservations: reservations.length,
      },
    };
  },
});
