import { v } from "convex/values";
import { query } from "../_generated/server";

/**
 * List all orders for a user (server-side, uses userId directly)
 */
export const listUserOrders = query({
  args: {
    userId: v.id("users"),
    limit: v.optional(v.number()),
    status: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const limit = Math.min(args.limit || 50, 200);

    let ordersQuery = ctx.db.query("orders").withIndex("by_user", q => q.eq("userId", args.userId));

    if (args.status) {
      ordersQuery = ordersQuery.filter(q => q.eq(q.field("status"), args.status));
    }

    const orders = await ordersQuery.order("desc").take(limit);

    return orders;
  },
});

/**
 * List orders by clerkId (for authenticated calls)
 */
export const listOrdersByClerkId = query({
  args: {
    clerkId: v.string(),
    limit: v.optional(v.number()),
    status: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", q => q.eq("clerkId", args.clerkId))
      .first();

    if (!user) return [];

    const limit = Math.min(args.limit || 50, 200);

    let ordersQuery = ctx.db.query("orders").withIndex("by_user", q => q.eq("userId", user._id));

    if (args.status) {
      ordersQuery = ordersQuery.filter(q => q.eq(q.field("status"), args.status));
    }

    const orders = await ordersQuery.order("desc").take(limit);

    return orders;
  },
});
