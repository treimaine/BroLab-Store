import { v } from "convex/values";
import { mutation } from "../_generated/server";

/**
 * Save/update the invoice PDF URL for an order
 */
export const saveInvoiceUrl = mutation({
  args: {
    orderId: v.id("orders"),
    invoiceUrl: v.string(),
  },
  handler: async (ctx, args) => {
    const order = await ctx.db.get(args.orderId);
    if (!order) {
      throw new Error("Order not found");
    }

    await ctx.db.patch(args.orderId, {
      invoiceUrl: args.invoiceUrl,
      updatedAt: Date.now(),
    });

    return { success: true, orderId: args.orderId };
  },
});

/**
 * Get invoice data for an order (order + items for PDF generation)
 */
export const getOrderInvoiceData = mutation({
  args: {
    orderId: v.id("orders"),
  },
  handler: async (ctx, args) => {
    const order = await ctx.db.get(args.orderId);
    if (!order) {
      throw new Error("Order not found");
    }

    // Get order items from orderItems table
    const orderItems = await ctx.db
      .query("orderItems")
      .withIndex("by_order", q => q.eq("orderId", args.orderId))
      .collect();

    // Get user info if available
    let user = null;
    if (order.userId) {
      user = await ctx.db.get(order.userId);
    }

    // Get invoice record if exists
    let invoice = null;
    if (order.invoiceId) {
      invoice = await ctx.db.get(order.invoiceId);
    }

    return {
      order,
      items: orderItems.length > 0 ? orderItems : order.items || [],
      user,
      invoice,
    };
  },
});
