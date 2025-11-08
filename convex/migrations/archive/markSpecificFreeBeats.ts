import { mutation, type MutationCtx } from "../../_generated/server";

/**
 * Migration pour marquer des beats spécifiques comme gratuits
 * basé sur les noms exacts des beats qui sont gratuits dans le store
 */
export const markSpecificFreeBeats = mutation({
  args: {},
  handler: async (ctx: MutationCtx) => {
    console.log("🔧 Marking specific beats as free based on store data...");

    // Liste des beats qui sont gratuits dans le store
    const freeBeats = [
      "ELEVATE",
      "TRULY YOURS",
      "SERIAL Vol.1",
      "SERIAL", // Au cas où le nom serait différent
    ];

    const orders = await ctx.db.query("orders").collect();
    let updatedCount = 0;

    for (const order of orders) {
      let needsUpdate = false;
      const updatedItems = order.items?.map((item: any) => {
        // Vérifier si le nom du beat correspond à un beat gratuit
        const isFree = freeBeats.some(
          freeBeat =>
            item.name?.toLowerCase().includes(freeBeat.toLowerCase()) ||
            item.title?.toLowerCase().includes(freeBeat.toLowerCase())
        );

        if (isFree && item.price !== 0) {
          console.log(`Marking "${item.name || item.title}" as free (was $${item.price})`);
          needsUpdate = true;
          return {
            ...item,
            price: 0, // Marquer comme gratuit
          };
        }
        return item;
      });

      if (needsUpdate) {
        // Recalculer le total de la commande
        const newTotal =
          updatedItems?.reduce((sum: number, item: any) => {
            return sum + (item.price || 0) * (item.quantity || 1);
          }, 0) || 0;

        await ctx.db.patch(order._id, {
          items: updatedItems,
          total: newTotal,
          updatedAt: Date.now(),
        });
        updatedCount++;
        console.log(`Updated order ${order._id} - new total: $${newTotal}`);
      }
    }

    console.log(`✅ Marked free beats in ${updatedCount} orders`);

    return {
      success: true,
      message: `Marked free beats in ${updatedCount} orders`,
      updatedCount,
      freeBeatsChecked: freeBeats,
    };
  },
});

/**
 * Migration pour lister tous les noms de beats uniques
 * pour identifier lesquels devraient être gratuits
 */
export const listAllBeatNames = mutation({
  args: {},
  handler: async (ctx: MutationCtx) => {
    const orders = await ctx.db.query("orders").collect();
    const beatNames = new Set<string>();

    orders.forEach((order: any) => {
      order.items?.forEach((item: any) => {
        if (item.name) beatNames.add(item.name);
        if (item.title) beatNames.add(item.title);
      });
    });

    const uniqueBeats = Array.from(beatNames).sort();

    console.log("All unique beat names found:");
    uniqueBeats.forEach(name => console.log(`- ${name}`));

    return {
      uniqueBeats,
      totalCount: uniqueBeats.length,
    };
  },
});
