import { mutation, type MutationCtx } from "../../_generated/server";

/**
 * Migration pour corriger les prix des commandes existantes
 *
 * Cette migration corrige les prix des items qui ont été mal calculés
 * en utilisant item.total / quantity au lieu du prix unitaire réel.
 */
export const fixOrderPrices = mutation({
  args: {},
  handler: async (ctx: MutationCtx) => {
    console.log("🔧 Starting order prices migration...");

    // Récupérer toutes les commandes
    const orders = await ctx.db.query("orders").collect();

    let updatedCount = 0;
    let errorCount = 0;

    for (const order of orders) {
      try {
        // Vérifier si la commande a des items avec des prix suspects
        const hasIncorrectPrices = order.items?.some((item: any) => {
          // Si le prix est très petit (< 10 dollars en centimes = 1000)
          // c'est probablement un prix mal calculé
          return item.price && item.price < 1000;
        });

        if (hasIncorrectPrices && order.woocommerceId) {
          console.log(`Fixing order ${order.woocommerceId} with suspicious prices`);

          // Pour les commandes avec des prix suspects, on peut essayer de les recalculer
          // basé sur les prix standards des beats
          const fixedItems = order.items?.map((item: any) => {
            if (item.price && item.price < 1000) {
              // Essayer de déduire le prix correct basé sur des prix standards
              let correctPrice: number;

              // Si c'est un beat gratuit
              if (
                item.title?.toLowerCase().includes("free") ||
                item.title?.toLowerCase().includes("gratuit")
              ) {
                correctPrice = 0;
              }
              // Sinon, utiliser des prix standards basés sur le type de licence
              else if (item.license === "basic") {
                correctPrice = 2999; // $29.99
              } else if (item.license === "premium") {
                correctPrice = 4999; // $49.99
              } else if (item.license === "unlimited") {
                correctPrice = 14999; // $149.99
              } else {
                // Prix par défaut si on ne peut pas déterminer
                correctPrice = 5000; // $50.00
              }

              return {
                ...item,
                price: correctPrice,
              };
            }
            return item;
          });

          // Mettre à jour la commande
          await ctx.db.patch(order._id, {
            items: fixedItems,
            updatedAt: Date.now(),
          });

          updatedCount++;
        }
      } catch (error) {
        console.error(`Error fixing order ${order._id}:`, error);
        errorCount++;
      }
    }

    console.log(`✅ Migration completed: ${updatedCount} orders updated, ${errorCount} errors`);

    return {
      success: true,
      message: `Fixed ${updatedCount} orders with incorrect prices`,
      updatedCount,
      errorCount,
      totalOrders: orders.length,
    };
  },
});

/**
 * Migration pour marquer les beats gratuits avec un prix de 0
 */
export const markFreeBeats = mutation({
  args: {},
  handler: async (ctx: MutationCtx) => {
    console.log("🔧 Marking free beats with correct pricing...");

    const orders = await ctx.db.query("orders").collect();
    let updatedCount = 0;

    for (const order of orders) {
      let needsUpdate = false;
      const updatedItems = order.items?.map((item: any) => {
        // Identifier les beats gratuits par leur nom
        const isFree =
          item.title?.toLowerCase().includes("free") ||
          item.title?.toLowerCase().includes("gratuit") ||
          item.title?.toLowerCase().includes("elevate") ||
          item.title?.toLowerCase().includes("truly yours") ||
          item.title?.toLowerCase().includes("serial");

        if (isFree && item.price !== 0) {
          needsUpdate = true;
          return {
            ...item,
            price: 0, // Marquer comme gratuit
          };
        }
        return item;
      });

      if (needsUpdate) {
        await ctx.db.patch(order._id, {
          items: updatedItems,
          updatedAt: Date.now(),
        });
        updatedCount++;
      }
    }

    console.log(`✅ Marked ${updatedCount} orders with free beats`);

    return {
      success: true,
      message: `Marked free beats in ${updatedCount} orders`,
      updatedCount,
    };
  },
});
