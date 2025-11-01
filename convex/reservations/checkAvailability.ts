import { v } from "convex/values";
import { query } from "../_generated/server";

/**
 * Check if a time slot is available for a given service type and date
 * Returns true if the slot is available, false if it's already booked
 */
export const checkTimeSlotAvailability = query({
  args: {
    serviceType: v.string(),
    preferredDate: v.string(),
  },
  handler: async (ctx, args) => {
    console.log(`🔍 Checking availability for ${args.serviceType} on ${args.preferredDate}`);

    // Query all reservations for the same service type and date
    const existingReservations = await ctx.db
      .query("reservations")
      .filter(q =>
        q.and(
          q.eq(q.field("serviceType"), args.serviceType),
          q.eq(q.field("preferredDate"), args.preferredDate),
          // Only check non-cancelled reservations
          q.neq(q.field("status"), "cancelled")
        )
      )
      .collect();

    const isAvailable = existingReservations.length === 0;

    console.log(
      `${isAvailable ? "✅" : "❌"} Time slot ${isAvailable ? "available" : "already booked"} (${existingReservations.length} existing reservations)`
    );

    return {
      available: isAvailable,
      existingReservationsCount: existingReservations.length,
    };
  },
});
