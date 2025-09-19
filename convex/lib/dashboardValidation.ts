/**
 * Dashboard Data Validation Utilities
 * Provides validation and sanitization for dashboard data
 */

import { v } from "convex/values";

// Validation schemas for dashboard queries
export const dashboardQueryArgsValidator = v.object({
  includeChartData: v.optional(v.boolean()),
  includeTrends: v.optional(v.boolean()),
  activityLimit: v.optional(v.number()),
  ordersLimit: v.optional(v.number()),
  downloadsLimit: v.optional(v.number()),
  favoritesLimit: v.optional(v.number()),
  reservationsLimit: v.optional(v.number()),
});

// Validation for pagination parameters
export const paginationArgsValidator = v.object({
  limit: v.optional(v.number()),
  offset: v.optional(v.number()),
  cursor: v.optional(v.string()),
});

// Validation for date range queries
export const dateRangeArgsValidator = v.object({
  startDate: v.optional(v.number()),
  endDate: v.optional(v.number()),
  period: v.optional(v.union(v.literal("7d"), v.literal("30d"), v.literal("90d"), v.literal("1y"))),
});

/**
 * Sanitize and validate dashboard query limits
 */
export function sanitizeDashboardLimits(args: {
  activityLimit?: number;
  ordersLimit?: number;
  downloadsLimit?: number;
  favoritesLimit?: number;
  reservationsLimit?: number;
}) {
  const maxLimit = 100;
  const defaultLimit = 20;

  return {
    activityLimit: Math.min(Math.max(args.activityLimit || defaultLimit, 1), maxLimit),
    ordersLimit: Math.min(Math.max(args.ordersLimit || defaultLimit, 1), maxLimit),
    downloadsLimit: Math.min(Math.max(args.downloadsLimit || 50, 1), maxLimit),
    favoritesLimit: Math.min(Math.max(args.favoritesLimit || 50, 1), maxLimit),
    reservationsLimit: Math.min(Math.max(args.reservationsLimit || defaultLimit, 1), maxLimit),
  };
}

/**
 * Validate and sanitize currency amounts
 * Ensures all amounts are properly converted between cents and dollars
 */
export function sanitizeCurrencyAmount(amount: number | undefined, fromCents = true): number {
  if (typeof amount !== "number" || isNaN(amount) || amount < 0) {
    return 0;
  }

  // Convert cents to dollars if needed
  return fromCents ? Math.round(amount) / 100 : Math.round(amount * 100) / 100;
}

/**
 * Validate order status
 */
export function validateOrderStatus(status: string): boolean {
  const validStatuses = [
    "draft",
    "pending",
    "processing",
    "paid",
    "completed",
    "cancelled",
    "refunded",
    "payment_failed",
  ];

  return validStatuses.includes(status);
}

/**
 * Validate reservation status
 */
export function validateReservationStatus(status: string): boolean {
  const validStatuses = ["pending", "confirmed", "in_progress", "completed", "cancelled"];

  return validStatuses.includes(status);
}

/**
 * Validate activity type
 */
export function validateActivityType(type: string): boolean {
  const validTypes = [
    "favorite_added",
    "favorite_removed",
    "download",
    "order_placed",
    "reservation_made",
    "subscription_updated",
  ];

  return validTypes.includes(type);
}

/**
 * Sanitize beat data for dashboard display
 */
export function sanitizeBeatData(beat: any) {
  if (!beat) return null;

  return {
    id: beat.wordpressId || beat._id,
    title: beat.title || `Beat ${beat.wordpressId || beat._id}`,
    artist: beat.genre || undefined,
    imageUrl: beat.imageUrl || undefined,
    genre: beat.genre || undefined,
    bpm: typeof beat.bpm === "number" ? beat.bpm : undefined,
    price: sanitizeCurrencyAmount(beat.price, true), // Convert cents to dollars
    isActive: beat.isActive !== false,
  };
}

/**
 * Validate and format date ranges for queries
 */
export function validateDateRange(startDate?: number, endDate?: number) {
  const now = Date.now();
  const maxRangeMs = 365 * 24 * 60 * 60 * 1000; // 1 year

  // Default to last 30 days if no dates provided
  if (!startDate && !endDate) {
    return {
      startDate: now - 30 * 24 * 60 * 60 * 1000,
      endDate: now,
    };
  }

  // Validate start date
  const validStartDate = startDate && startDate > 0 ? startDate : now - maxRangeMs;

  // Validate end date
  const validEndDate = endDate && endDate > validStartDate ? Math.min(endDate, now) : now;

  // Ensure range is not too large
  if (validEndDate - validStartDate > maxRangeMs) {
    return {
      startDate: validEndDate - maxRangeMs,
      endDate: validEndDate,
    };
  }

  return {
    startDate: validStartDate,
    endDate: validEndDate,
  };
}

/**
 * Error handling for dashboard queries
 */
export class DashboardError extends Error {
  constructor(
    message: string,
    public code: string,
    public retryable: boolean = false
  ) {
    super(message);
    this.name = "DashboardError";
  }
}

/**
 * Wrap dashboard query execution with error handling
 */
export async function executeDashboardQuery<T>(
  queryFn: () => Promise<T>,
  operation: string
): Promise<T> {
  try {
    return await queryFn();
  } catch (error) {
    console.error(`Dashboard ${operation} error:`, error);

    if (error instanceof Error) {
      // Network or temporary errors are retryable
      const isRetryable =
        error.message.includes("network") ||
        error.message.includes("timeout") ||
        error.message.includes("temporarily");

      throw new DashboardError(
        `Failed to ${operation}: ${error.message}`,
        `dashboard_${operation}_error`,
        isRetryable
      );
    }

    throw new DashboardError(`Failed to ${operation}`, `dashboard_${operation}_error`, false);
  }
}
