/**
 * Convex Realtime Integration
 *
 * Bridges Convex database changes with the realtime sync system.
 * Automatically publishes data updates to all connected clients.
 */

import { getRealtimeSync } from "./RealtimeSyncService";

/**
 * Publish a Convex data change to all connected clients
 */
export function publishConvexUpdate(
  table: string,
  operation: "create" | "update" | "delete",
  data: unknown,
  userId?: string
): string {
  const sync = getRealtimeSync();

  return sync.publish({
    type: "convex.update",
    payload: {
      table,
      operation,
      data,
    },
    userId,
    topics: [`convex.${table}`, `convex.${table}.${operation}`],
  });
}

/**
 * Publish dashboard data update
 */
export function publishDashboardUpdate(
  section: "orders" | "downloads" | "favorites" | "stats" | "activity",
  data: unknown,
  userId: string
): string {
  const sync = getRealtimeSync();

  return sync.publishDataUpdate(section, data, userId);
}

/**
 * Publish user stats update
 */
export function publishUserStatsUpdate(stats: unknown, userId: string): string {
  const sync = getRealtimeSync();

  return sync.publish({
    type: "user.stats.updated",
    payload: stats,
    userId,
    topics: ["user.stats"],
  });
}

/**
 * Publish order status change
 */
export function publishOrderStatusChange(orderId: string, status: string, userId: string): string {
  const sync = getRealtimeSync();

  return sync.publish({
    type: "order.status.changed",
    payload: {
      orderId,
      status,
      timestamp: Date.now(),
    },
    userId,
    topics: ["orders", `order.${orderId}`],
  });
}

/**
 * Publish download quota update
 */
export function publishQuotaUpdate(quotaUsed: number, quotaLimit: number, userId: string): string {
  const sync = getRealtimeSync();

  return sync.publish({
    type: "quota.updated",
    payload: {
      quotaUsed,
      quotaLimit,
      percentage: (quotaUsed / quotaLimit) * 100,
    },
    userId,
    topics: ["quota"],
  });
}

/**
 * Publish notification
 */
export function publishNotification(
  notification: {
    title: string;
    message: string;
    type: "info" | "success" | "warning" | "error";
    action?: { label: string; url: string };
  },
  userId: string
): string {
  const sync = getRealtimeSync();

  return sync.publish({
    type: "notification.new",
    payload: notification,
    userId,
    topics: ["notifications"],
  });
}

/**
 * Example: Convex mutation wrapper that publishes updates
 */
export function withRealtimeSync<T extends (...args: never[]) => Promise<unknown>>(
  mutationFn: T,
  options: {
    table: string;
    operation: "create" | "update" | "delete";
    getUserId: (...args: Parameters<T>) => string;
    getData: (result: unknown) => unknown;
  }
): T {
  return (async (...args: Parameters<T>) => {
    const result = await mutationFn(...args);
    const userId = options.getUserId(...args);
    const data = options.getData(result);

    publishConvexUpdate(options.table, options.operation, data, userId);

    return result;
  }) as T;
}

/**
 * Example usage in Convex mutations:
 *
 * ```typescript
 * // In your Convex mutation file
 * import { withRealtimeSync } from '@/server/services/ConvexRealtimeIntegration';
 *
 * const createOrderMutation = mutation({
 *   args: { userId: v.string(), items: v.array(v.any()) },
 *   handler: async (ctx, args) => {
 *     const orderId = await ctx.db.insert("orders", {
 *       userId: args.userId,
 *       items: args.items,
 *       status: "pending",
 *       createdAt: Date.now(),
 *     });
 *
 *     return { orderId, userId: args.userId };
 *   },
 * });
 *
 * // Wrap with realtime sync
 * export const createOrder = withRealtimeSync(
 *   createOrderMutation,
 *   {
 *     table: "orders",
 *     operation: "create",
 *     getUserId: (ctx, args) => args.userId,
 *     getData: (result) => result,
 *   }
 * );
 * ```
 */

/**
 * Batch publish multiple updates
 */
export function publishBatchUpdate(
  updates: Array<{
    type: string;
    payload: unknown;
    userId?: string;
    topics?: string[];
  }>
): string[] {
  const sync = getRealtimeSync();
  return updates.map(update => sync.publish(update));
}

/**
 * Publish system-wide announcement
 */
export function publishAnnouncement(announcement: {
  title: string;
  message: string;
  priority: "low" | "medium" | "high";
  expiresAt?: number;
}): string {
  const sync = getRealtimeSync();

  return sync.publish({
    type: "system.announcement",
    payload: announcement,
    topics: ["announcements"],
  });
}
