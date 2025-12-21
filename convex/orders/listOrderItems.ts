import { v } from "convex/values";
import { query } from "../_generated/server";

/**
 * List all items for a specific order
 */
export const listOrderItems = query({
  args: {
    orderId: v.id("orders"),
  },
  handler: async (ctx, args) => {
    const items = await ctx.db
      .query("orderItems")
      .withIndex("by_order", q => q.eq("orderId", args.orderId))
      .collect();

    return items;
  },
});

/**
 * Get order with all its items (for invoice generation)
 */
export const getOrderWithItems = query({
  args: {
    orderId: v.id("orders"),
  },
  handler: async (ctx, args) => {
    const order = await ctx.db.get(args.orderId);
    if (!order) {
      throw new Error("Order not found");
    }

    const items = await ctx.db
      .query("orderItems")
      .withIndex("by_order", q => q.eq("orderId", args.orderId))
      .collect();

    return { order, items };
  },
});
