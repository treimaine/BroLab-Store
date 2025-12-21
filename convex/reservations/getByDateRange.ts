import { v } from "convex/values";
import { query } from "../_generated/server";

/**
 * Get reservations within a date range
 * Used for availability checking and calendar views
 */
export const getByDateRange = query({
  args: {
    startDate: v.string(), // ISO date string
    endDate: v.string(), // ISO date string
    status: v.optional(v.string()),
    serviceType: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Build base query
    let reservationsQuery = ctx.db.query("reservations");

    // Filter by status if provided
    if (args.status) {
      reservationsQuery = reservationsQuery.filter(q => q.eq(q.field("status"), args.status));
    }

    // Filter by service type if provided
    if (args.serviceType) {
      reservationsQuery = reservationsQuery.filter(q =>
        q.eq(q.field("serviceType"), args.serviceType)
      );
    }

    const allReservations = await reservationsQuery.collect();

    // Filter by date range (preferredDate is stored as ISO string)
    const filtered = allReservations.filter(reservation => {
      const reservationDate = reservation.preferredDate;
      return reservationDate >= args.startDate && reservationDate <= args.endDate;
    });

    // Sort by preferred date
    filtered.sort((a, b) => a.preferredDate.localeCompare(b.preferredDate));

    return filtered;
  },
});

/**
 * Get available time slots for a specific date
 * Excludes already booked slots
 */
export const getAvailableSlots = query({
  args: {
    date: v.string(), // ISO date string (YYYY-MM-DD)
    serviceType: v.string(),
    durationMinutes: v.number(),
  },
  handler: async (ctx, args) => {
    // Get all reservations for the date that are not cancelled
    const reservations = await ctx.db
      .query("reservations")
      .filter(q =>
        q.and(q.neq(q.field("status"), "cancelled"), q.eq(q.field("serviceType"), args.serviceType))
      )
      .collect();

    // Filter to only reservations on the requested date
    const dateReservations = reservations.filter(r => r.preferredDate.startsWith(args.date));

    // Define business hours (9 AM to 6 PM)
    const businessHours = {
      start: 9,
      end: 18,
    };

    // Generate all possible slots
    const slots: { time: string; available: boolean }[] = [];
    const slotDuration = args.durationMinutes;

    for (let hour = businessHours.start; hour < businessHours.end; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const slotTime = `${args.date}T${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00`;
        const slotEnd = new Date(new Date(slotTime).getTime() + slotDuration * 60000);

        // Check if slot end is within business hours
        if (slotEnd.getHours() > businessHours.end) continue;

        // Check if slot conflicts with existing reservations
        const isAvailable = !dateReservations.some(r => {
          const resStart = new Date(r.preferredDate);
          const resEnd = new Date(resStart.getTime() + r.durationMinutes * 60000);
          const slotStart = new Date(slotTime);

          return (
            (slotStart >= resStart && slotStart < resEnd) ||
            (slotEnd > resStart && slotEnd <= resEnd) ||
            (slotStart <= resStart && slotEnd >= resEnd)
          );
        });

        slots.push({ time: slotTime, available: isAvailable });
      }
    }

    return slots;
  },
});
