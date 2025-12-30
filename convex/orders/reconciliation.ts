import { v } from "convex/values";
import { mutation, query } from "../_generated/server";

/**
 * Get order by Stripe checkout session ID
 */
export const getOrderByCheckoutSession = query({
  args: {
    checkoutSessionId: v.string(),
  },
  handler: async (ctx, args) => {
    const order = await ctx.db
      .query("orders")
      .withIndex("by_checkout_session", q => q.eq("checkoutSessionId", args.checkoutSessionId))
      .first();

    return order;
  },
});

/**
 * Get order by Stripe payment intent ID
 */
export const getOrderByPaymentIntent = query({
  args: {
    paymentIntentId: v.string(),
  },
  handler: async (ctx, args) => {
    const order = await ctx.db
      .query("orders")
      .withIndex("by_payment_intent", q => q.eq("paymentIntentId", args.paymentIntentId))
      .first();

    return order;
  },
});

/**
 * Get orders by status (for reconciliation)
 */
export const getOrdersByStatus = query({
  args: {
    status: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = Math.min(args.limit || 100, 500);

    const orders = await ctx.db
      .query("orders")
      .withIndex("by_status", q => q.eq("status", args.status))
      .take(limit);

    return orders;
  },
});

/**
 * Update order status for system/admin reconciliation (no auth required)
 *
 * NOTE: This is different from orders.updateOrderStatus which requires user auth.
 * Use this for webhook handlers and admin reconciliation tools.
 */
export const updateOrderStatusAdmin = mutation({
  args: {
    orderId: v.id("orders"),
    status: v.string(),
    paymentStatus: v.optional(v.string()),
    paymentIntentId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    const updateData: Record<string, unknown> = {
      status: args.status,
      updatedAt: now,
    };

    if (args.paymentStatus) {
      updateData.paymentStatus = args.paymentStatus;
    }

    if (args.paymentIntentId) {
      updateData.paymentIntentId = args.paymentIntentId;
    }

    await ctx.db.patch(args.orderId, updateData);

    // Log to audit
    await ctx.db.insert("auditLogs", {
      action: "order_status_updated",
      resource: "orders",
      details: {
        operation: "reconciliation",
        resource: "orders",
        resourceId: args.orderId,
        newStatus: args.status,
        paymentStatus: args.paymentStatus,
      },
      timestamp: now,
    });

    console.log(`✅ Order ${args.orderId} status updated to ${args.status} (admin)`);

    return args.orderId;
  },
});
