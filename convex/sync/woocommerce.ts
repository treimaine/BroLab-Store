import { v } from "convex/values";
import { mutation, query } from "../_generated/server";

// Sync WooCommerce orders with Convex
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
            price: v.optional(v.number()), // Unit price of the product
            license: v.optional(v.string()),
          })
        ),
        createdAt: v.string(),
        updatedAt: v.string(),
      })
    ),
  },
  handler: async (ctx, { orders }) => {
    console.log(`Syncing ${orders.length} WooCommerce orders to Convex`);

    const results = [];

    for (const order of orders) {
      try {
        // Check if order already exists
        const existingOrder = await ctx.db
          .query("orders")
          .withIndex("by_woocommerce_id", q => q.eq("woocommerceId", order.id))
          .first();

        if (existingOrder) {
          // Update existing order
          await ctx.db.patch(existingOrder._id, {
            status: order.status,
            total: Number.parseFloat(order.total) * 100, // Convert to cents
            items: order.items.map(item => ({
              productId: item.productId,
              title: item.name,
              price: item.price ? item.price * 100 : 0, // Use unit price and convert to cents
              quantity: item.quantity,
              license: item.license || "basic",
              type: "beat",
              sku: `woo-${item.productId}`,
              metadata: {
                beatGenre: undefined,
                beatBpm: undefined,
                beatKey: undefined,
                downloadFormat: "mp3",
                licenseTerms: item.license || "basic",
              },
            })),
            updatedAt: Date.now(),
          });
          results.push({ id: order.id, action: "updated", success: true });
        } else {
          // Create new order
          await ctx.db.insert("orders", {
            woocommerceId: order.id,
            userId: undefined, // Will be updated if user is connected
            email: order.customerEmail,
            total: Number.parseFloat(order.total) * 100, // Convert to cents
            currency: "EUR", // Default currency for WooCommerce orders
            status: order.status,
            items: order.items.map(item => ({
              productId: item.productId,
              title: item.name,
              price: item.price ? item.price * 100 : 0, // Use unit price and convert to cents
              quantity: item.quantity,
              license: item.license || "basic",
              type: "beat",
              sku: `woo-${item.productId}`,
              metadata: {
                beatGenre: undefined,
                beatBpm: undefined,
                beatKey: undefined,
                downloadFormat: "mp3",
                licenseTerms: item.license || "basic",
              },
            })),
            createdAt: Date.now(),
            updatedAt: Date.now(),
          });
          results.push({ id: order.id, action: "created", success: true });
        }
      } catch (error) {
        console.error(`Error syncing order ${order.id}:`, error);
        results.push({ id: order.id, action: "error", success: false, error: String(error) });
      }
    }

    return results;
  },
});

// Link an order to a Clerk user
export const linkOrderToUser = mutation({
  args: {
    orderId: v.number(),
    clerkId: v.string(),
  },
  handler: async (ctx, { orderId, clerkId }) => {
    // Find user by Clerk ID
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", q => q.eq("clerkId", clerkId))
      .first();

    if (!user) {
      throw new Error("User not found");
    }

    // Find order by WooCommerce ID
    const order = await ctx.db
      .query("orders")
      .withIndex("by_woocommerce_id", q => q.eq("woocommerceId", orderId))
      .first();

    if (!order) {
      throw new Error("Order not found");
    }

    // Link order to user
    await ctx.db.patch(order._id, {
      userId: user._id,
      updatedAt: Date.now(),
    });

    return { success: true, message: "Order linked to user" };
  },
});

// Get user orders
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

// Get all synced orders
export const getSyncedOrders = query({
  args: {
    limit: v.optional(v.number()),
    offset: v.optional(v.number()),
    status: v.optional(v.string()),
  },
  handler: async (ctx, { limit = 50, offset: _offset = 0, status }) => {
    const orders = await ctx.db.query("orders").order("desc").collect();

    // Filter by status if specified
    const filteredOrders = status ? orders.filter(order => order.status === status) : orders;

    return { page: filteredOrders.slice(0, limit), isDone: true, continueCursor: null };
  },
});
