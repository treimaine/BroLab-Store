import { query } from "../_generated/server";

/**
 * Health check query for monitoring
 * Returns basic database connectivity status
 */
export const checkHealth = query({
  args: {},
  handler: async ctx => {
    try {
      // Simple query to verify database connectivity
      const userSample = await ctx.db.query("users").take(1);

      return {
        status: "healthy",
        timestamp: Date.now(),
        usersAccessible: Array.isArray(userSample),
      };
    } catch (error) {
      return {
        status: "unhealthy",
        timestamp: Date.now(),
        usersAccessible: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  },
});

/**
 * Get basic system stats for monitoring
 */
export const getSystemStats = query({
  args: {},
  handler: async ctx => {
    try {
      const [usersCount, ordersCount, beatsCount] = await Promise.all([
        ctx.db
          .query("users")
          .collect()
          .then(r => r.length),
        ctx.db
          .query("orders")
          .collect()
          .then(r => r.length),
        ctx.db
          .query("beats")
          .collect()
          .then(r => r.length),
      ]);

      return {
        status: "healthy",
        timestamp: Date.now(),
        stats: {
          users: usersCount,
          orders: ordersCount,
          beats: beatsCount,
        },
      };
    } catch (error) {
      return {
        status: "unhealthy",
        timestamp: Date.now(),
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  },
});
