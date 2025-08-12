import { v } from "convex/values";
import { mutation } from "../_generated/server";

export const updateOrder = mutation({
  args: {
    orderId: v.string(),
    status: v.string(),
    paymentId: v.optional(v.string()),
    paymentStatus: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Vous devez être connecté pour mettre à jour une commande");
    }

    // Convertir l'orderId string en Id
    const orderId = args.orderId as any;

    // Vérifier que la commande existe et appartient à l'utilisateur
    const order = await ctx.db.get(orderId);
    if (!order) {
      throw new Error("Commande non trouvée");
    }

    // Vérifier que l'utilisateur est propriétaire de la commande
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", q => q.eq("clerkId", identity.subject))
      .first();

    // Vérifier que l'utilisateur existe et que la commande lui appartient
    if (!user) {
      throw new Error("Utilisateur non trouvé");
    }

    // Vérifier que la commande appartient à l'utilisateur
    // Utiliser une vérification de type appropriée
    const orderData = order as any;
    if (orderData.userId && orderData.userId !== user._id) {
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
