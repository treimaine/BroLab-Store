import { v } from "convex/values";
import { query } from "../_generated/server";

/**
 * Get orders by email address
 * Used for guest checkout download verification
 *
 * @param email - Customer email address
 * @param status - Optional status filter (e.g., "paid")
 * @param limit - Maximum number of orders to return
 */
export const getOrdersByEmail = query({
  args: {
    email: v.string(),
    status: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = Math.min(args.limit || 50, 200);

    let ordersQuery = ctx.db
      .query("orders")
      .withIndex("by_email", q => q.eq("email", args.email.toLowerCase()));

    if (args.status) {
      ordersQuery = ordersQuery.filter(q => q.eq(q.field("status"), args.status));
    }

    const orders = await ordersQuery.order("desc").take(limit);

    return orders;
  },
});
