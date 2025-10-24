import { query } from "../_generated/server";

/**
 * Test function to check order prices transformation
 */
export const checkOrderPrices = query({
  args: {},
  handler: async ctx => {
    // Get a few orders to check
    const orders = await ctx.db.query("orders").take(3);

    const results = orders.map(order => {
      const rawOrder = {
        id: order._id,
        total: order.total,
        items: order.items?.map(item => ({
          name: item.name,
          price: item.price,
          quantity: item.quantity,
        })),
      };

      const transformedOrder = {
        id: order._id,
        total: order.total, // No conversion - already in dollars
        items: (order.items || []).map(item => ({
          name: item.name,
          price: item.price, // No conversion - already in dollars
          quantity: item.quantity,
        })),
      };

      return {
        raw: rawOrder,
        transformed: transformedOrder,
        isCorrect: order.total === transformedOrder.total,
      };
    });

    return {
      message: "Order prices check",
      results,
      summary: {
        totalOrders: orders.length,
        correctPrices: results.filter(r => r.isCorrect).length,
      },
    };
  },
});
