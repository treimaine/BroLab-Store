import { v } from "convex/values";
import type { Id } from "../_generated/dataModel";
import { mutation } from "../_generated/server";
import { requireAuth } from "../lib/authHelpers";

export const updateOrder = mutation({
  args: {
    orderId: v.string(),
    status: v.string(),
    paymentId: v.optional(v.string()),
    paymentStatus: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuth(ctx);

    // Convertir l'orderId string en Id
    const orderId = args.orderId as Id<"orders">;

    // Vérifier que la commande existe et appartient à l'utilisateur
    const order = await ctx.db.get(orderId);
    if (!order) {
      throw new Error("Commande non trouvée");
    }

    // Vérifier que la commande appartient à l'utilisateur
    // Utiliser une vérification de type appropriée
    if (order.userId && order.userId !== userId) {
      throw new Error("Vous n'êtes pas autorisé à modifier cette commande");
    }

    // Mettre à jour la commande
    await ctx.db.patch(orderId, {
      status: args.status,
      paymentId: args.paymentId,
      paymentStatus: args.paymentStatus,
      updatedAt: Date.now(),
    });

    console.log(`✅ Order updated: ${orderId} - Status: ${args.status}`);

    return {
      success: true,
      message: "Order updated successfully",
    };
  },
});
