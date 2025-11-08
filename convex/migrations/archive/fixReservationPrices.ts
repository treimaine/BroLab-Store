import { mutation, type MutationCtx } from "../../_generated/server";

/**
 * Migration pour corriger les prix des réservations
 * basé sur les tarifs standards de BroLab Entertainment
 */

// Tarifs standards par service (en centimes)
const SERVICE_RATES = {
  recording: 15000, // $150/heure
  mixing: 10000, // $100/heure
  mastering: 8000, // $80/heure
  consultation: 15000, // $150/heure
  custom_beat: 20000, // $200 forfait
  beat_remake: 15000, // $150/heure
  full_production: 50000, // $500/heure
} as const;

export const fixReservationPrices = mutation({
  args: {},
  handler: async (ctx: MutationCtx) => {
    console.log("🔧 Fixing reservation prices based on standard rates...");

    const reservations = await ctx.db.query("reservations").collect();
    let updatedCount = 0;
    let errorCount = 0;

    for (const reservation of reservations) {
      try {
        const serviceType = reservation.serviceType as keyof typeof SERVICE_RATES;
        const duration = reservation.durationMinutes || 60;
        const currentPrice = reservation.totalPrice;

        // Calculer le prix correct
        let correctPrice: number;

        if (serviceType === "custom_beat") {
          // Prix forfaitaire
          correctPrice = SERVICE_RATES.custom_beat;
        } else {
          // Prix horaire
          const rate = SERVICE_RATES[serviceType] || SERVICE_RATES.consultation;
          const hours = duration / 60;
          correctPrice = Math.round(rate * hours);
        }

        // Vérifier si le prix doit être corrigé
        if (Math.abs(currentPrice - correctPrice) > 100) {
          // Tolérance de 1€
          console.log(
            `Fixing ${serviceType} (${duration}min): ${currentPrice / 100}€ → ${correctPrice / 100}€`
          );

          await ctx.db.patch(reservation._id, {
            totalPrice: correctPrice,
            updatedAt: Date.now(),
          });

          updatedCount++;
        }
      } catch (error) {
        console.error(`Error fixing reservation ${reservation._id}:`, error);
        errorCount++;
      }
    }

    console.log(`✅ Fixed ${updatedCount} reservations, ${errorCount} errors`);

    return {
      success: true,
      message: `Fixed ${updatedCount} reservations with incorrect prices`,
      updatedCount,
      errorCount,
      totalReservations: reservations.length,
      serviceRates: SERVICE_RATES,
    };
  },
});

/**
 * Fonction pour lister les prix actuels des réservations
 */
export const listReservationPrices = mutation({
  args: {},
  handler: async (ctx: MutationCtx) => {
    const reservations = await ctx.db.query("reservations").collect();

    const priceAnalysis = reservations.map((reservation: any) => {
      const serviceType = reservation.serviceType as keyof typeof SERVICE_RATES;
      const duration = reservation.durationMinutes || 60;
      const currentPrice = reservation.totalPrice;

      // Calculer le prix attendu
      let expectedPrice: number;
      if (serviceType === "custom_beat") {
        expectedPrice = SERVICE_RATES.custom_beat;
      } else {
        const rate = SERVICE_RATES[serviceType] || SERVICE_RATES.consultation;
        const hours = duration / 60;
        expectedPrice = Math.round(rate * hours);
      }

      return {
        id: reservation._id,
        serviceType,
        duration,
        currentPrice: currentPrice / 100, // En euros
        expectedPrice: expectedPrice / 100, // En euros
        needsCorrection: Math.abs(currentPrice - expectedPrice) > 100,
        difference: (currentPrice - expectedPrice) / 100,
      };
    });

    return {
      reservations: priceAnalysis,
      summary: {
        total: reservations.length,
        needingCorrection: priceAnalysis.filter((r: any) => r.needsCorrection).length,
      },
    };
  },
});
