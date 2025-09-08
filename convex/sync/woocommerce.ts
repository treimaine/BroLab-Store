import { v } from "convex/values";
import { mutation, query } from "../_generated/server";

// Synchroniser les commandes WooCommerce avec Convex
export const syncWooCommerceOrders = mutation({
  args: {
    orders: v.array(
      v.object({
        id: v.number(),
        status: v.string(),
        total: v.string(),
        currency: v.string(),
        customerId: v.optional(v.number()),
        customerEmail: v.string(),
        items: v.array(
          v.object({
            productId: v.number(),
            name: v.string(),
            quantity: v.number(),
            total: v.string(),
            license: v.optional(v.string()),
          })
        ),
        createdAt: v.string(),
        updatedAt: v.string(),
      })
    ),
  },
  handler: async (ctx, { orders }) => {
    console.log(`🔄 Syncing ${orders.length} WooCommerce orders to Convex`);

    const results = [];

    for (const order of orders) {
      try {
        // Vérifier si la commande existe déjà
        const existingOrder = await ctx.db
          .query("orders")
          .withIndex("by_woocommerce_id", q => q.eq("woocommerceId", order.id))
          .first();

        if (existingOrder) {
          // Mettre à jour la commande existante
          await ctx.db.patch(existingOrder._id, {
            status: order.status,
            total: parseFloat(order.total) * 100, // Convertir en centimes
            items: order.items,
            updatedAt: Date.now(),
          });
          results.push({ id: order.id, action: "updated", success: true });
        } else {
          // Créer une nouvelle commande
          await ctx.db.insert("orders", {
            woocommerceId: order.id,
            userId: undefined, // Sera mis à jour si l'utilisateur est connecté
            email: order.customerEmail,
            total: parseFloat(order.total) * 100, // Convertir en centimes
            currency: "EUR", // Default currency for WooCommerce orders
            status: order.status,
            items: order.items,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          });
          results.push({ id: order.id, action: "created", success: true });
        }
      } catch (error) {
        console.error(`❌ Error syncing order ${order.id}:`, error);
        results.push({ id: order.id, action: "error", success: false, error: String(error) });
      }
    }

    return results;
  },
});

// Associer une commande à un utilisateur Clerk
export const linkOrderToUser = mutation({
  args: {
    orderId: v.number(),
    clerkId: v.string(),
  },
  handler: async (ctx, { orderId, clerkId }) => {
    // Trouver l'utilisateur par Clerk ID
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", q => q.eq("clerkId", clerkId))
      .first();

    if (!user) {
      throw new Error("User not found");
    }

    // Trouver la commande par WooCommerce ID
    const order = await ctx.db
      .query("orders")
      .withIndex("by_woocommerce_id", q => q.eq("woocommerceId", orderId))
      .first();

    if (!order) {
      throw new Error("Order not found");
    }

    // Associer la commande à l'utilisateur
    await ctx.db.patch(order._id, {
      userId: user._id,
      updatedAt: Date.now(),
    });

    return { success: true, message: "Order linked to user" };
  },
});

// Obtenir les commandes d'un utilisateur
export const getUserOrders = query({
  args: { clerkId: v.string() },
  handler: async (ctx, { clerkId }) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", q => q.eq("clerkId", clerkId))
      .first();

    if (!user) {
      return [];
    }

    const orders = await ctx.db
      .query("orders")
      .withIndex("by_user", q => q.eq("userId", user._id))
      .order("desc")
      .collect();

    return orders;
  },
});

// Obtenir toutes les commandes synchronisées
export const getSyncedOrders = query({
  args: {
    limit: v.optional(v.number()),
    offset: v.optional(v.number()),
    status: v.optional(v.string()),
  },
  handler: async (ctx, { limit = 50, offset = 0, status }) => {
    const orders = await ctx.db.query("orders").order("desc").collect();

    // Filtrer par statut si spécifié
    const filteredOrders = status ? orders.filter(order => order.status === status) : orders;

    return { page: filteredOrders.slice(0, limit), isDone: true, continueCursor: null };
  },
});
