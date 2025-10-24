import { v } from "convex/values";
import type {
  Activity,
  ChartDataPoint,
  DashboardData,
  DashboardUser,
  Download,
  Favorite,
  Order,
  Reservation,
  TrendData,
  UserStats,
} from "../shared/types/dashboard";
import { query } from "./_generated/server";
import {
  CurrencyCalculator,
  DateCalculator,
  StatisticsCalculator,
  TimePeriod,
} from "./lib/statisticsCalculator";

// Inline utility functions
function sanitizeDashboardLimits(args: {
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

class DashboardError extends Error {
  constructor(
    message: string,
    public code: string,
    public retryable: boolean = false
  ) {
    super(message);
    this.name = "DashboardError";
  }
}

async function executeDashboardQuery<T>(queryFn: () => Promise<T>, operation: string): Promise<T> {
  try {
    return await queryFn();
  } catch (error) {
    console.error(`Dashboard ${operation} error:`, error);

    if (error instanceof Error) {
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

/**
 * Unified Dashboard API - Single optimized query for all dashboard data
 * This replaces multiple separate queries with a single efficient call
 */
export const getDashboardData = query({
  args: {
    includeChartData: v.optional(v.boolean()),
    includeTrends: v.optional(v.boolean()),
    activityLimit: v.optional(v.number()),
    ordersLimit: v.optional(v.number()),
    downloadsLimit: v.optional(v.number()),
    favoritesLimit: v.optional(v.number()),
    reservationsLimit: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<DashboardData> => {
    return executeDashboardQuery(async () => {
      const identity = await ctx.auth.getUserIdentity();
      if (!identity) {
        throw new DashboardError("Not authenticated", "auth_error", false);
      }

      const clerkId = identity.subject;

      // Sanitize query limits
      const limits = sanitizeDashboardLimits({
        activityLimit: args.activityLimit,
        ordersLimit: args.ordersLimit,
        downloadsLimit: args.downloadsLimit,
        favoritesLimit: args.favoritesLimit,
        reservationsLimit: args.reservationsLimit,
      });

      // Get or create user with single query
      const user = await ctx.db
        .query("users")
        .withIndex("by_clerk_id", q => q.eq("clerkId", clerkId))
        .first();

      if (!user) {
        // Return empty dashboard data for users not yet in database
        return {
          user: {
            id: clerkId,
            clerkId,
            email: identity.email || "",
            firstName: identity.givenName || "",
            lastName: identity.familyName || "",
            imageUrl: identity.pictureUrl || "",
            username: identity.name || `user_${clerkId.slice(-8)}`,
          },
          stats: {
            totalFavorites: 0,
            totalDownloads: 0,
            totalOrders: 0,
            totalSpent: 0,
            recentActivity: 0,
            quotaUsed: 0,
            quotaLimit: 0,
            monthlyDownloads: 0,
            monthlyOrders: 0,
            monthlyRevenue: 0,
          },
          favorites: [],
          orders: [],
          downloads: [],
          reservations: [],
          activity: [],
          chartData: [],
          trends: {
            orders: { period: "30d", value: 0, change: 0, changePercent: 0, isPositive: true },
            downloads: { period: "30d", value: 0, change: 0, changePercent: 0, isPositive: true },
            revenue: { period: "30d", value: 0, change: 0, changePercent: 0, isPositive: true },
            favorites: { period: "30d", value: 0, change: 0, changePercent: 0, isPositive: true },
          },
        };
      }

      // Parallel data fetching with optimized queries
      const [
        favorites,
        orders,
        downloads,
        reservations,
        activityLog,
        subscription,
        quotas,
        beats, // For enriching favorites and downloads
      ] = await Promise.all([
        // Favorites with limit
        ctx.db
          .query("favorites")
          .withIndex("by_user_created", q => q.eq("userId", user._id))
          .order("desc")
          .take(limits.favoritesLimit),

        // Orders with limit
        ctx.db
          .query("orders")
          .withIndex("by_user", q => q.eq("userId", user._id))
          .order("desc")
          .take(limits.ordersLimit),

        // Downloads with limit
        ctx.db
          .query("downloads")
          .withIndex("by_user_timestamp", q => q.eq("userId", user._id))
          .order("desc")
          .take(limits.downloadsLimit),

        // Reservations with limit
        ctx.db
          .query("reservations")
          .withIndex("by_user", q => q.eq("userId", user._id))
          .order("desc")
          .take(limits.reservationsLimit),

        // Recent activity with limit
        ctx.db
          .query("activityLog")
          .withIndex("by_user_timestamp", q => q.eq("userId", user._id))
          .order("desc")
          .take(limits.activityLimit),

        // Current subscription
        ctx.db
          .query("subscriptions")
          .withIndex("by_user", q => q.eq("userId", user._id))
          .filter(q => q.eq(q.field("status"), "active"))
          .first(),

        // User quotas
        ctx.db
          .query("quotas")
          .withIndex("by_user", q => q.eq("userId", user._id))
          .filter(q => q.eq(q.field("isActive"), true))
          .collect(),

        // Beats for enrichment (get unique beat IDs from favorites and downloads)
        ctx.db.query("beats").collect(),
      ]);

      // Create beat lookup map for efficient joins
      const beatMap = new Map(beats.map(beat => [beat.wordpressId, beat]));

      // Transform user data
      const dashboardUser: DashboardUser = {
        id: user._id,
        clerkId: user.clerkId,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        imageUrl: user.imageUrl,
        username: user.username,
        role: user.role,
        isActive: user.isActive,
        lastLoginAt: user.lastLoginAt,
        preferences: user.preferences,
        subscription: subscription
          ? {
              id: subscription._id,
              planId: subscription.planId,
              status: subscription.status as any,
              currentPeriodStart: subscription.currentPeriodStart,
              currentPeriodEnd: subscription.currentPeriodEnd,
              cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
              features: subscription.features,
              downloadQuota: subscription.downloadQuota,
              downloadUsed: subscription.downloadUsed,
            }
          : undefined,
      };

      // Calculate comprehensive statistics with REAL totals (not limited arrays)
      const [totalFavoritesCount, totalDownloadsCount, totalOrdersCount] = await Promise.all([
        // Count ALL favorites (not limited)
        ctx.db
          .query("favorites")
          .withIndex("by_user_created", q => q.eq("userId", user._id))
          .collect()
          .then(results => results.length),

        // Count ALL downloads (not limited)
        ctx.db
          .query("downloads")
          .withIndex("by_user_timestamp", q => q.eq("userId", user._id))
          .collect()
          .then(results => results.length),

        // Count ALL orders (not limited)
        ctx.db
          .query("orders")
          .withIndex("by_user", q => q.eq("userId", user._id))
          .collect()
          .then(results => results.length),
      ]);

      // Calculate statistics with real totals - no mock arrays
      const stats: UserStats = StatisticsCalculator.calculateUserStats({
        favorites: new Array(totalFavoritesCount).fill({}), // Array with correct length for counting
        downloads: new Array(totalDownloadsCount).fill({}), // Array with correct length for counting
        orders: orders, // Use real orders for revenue calculation
        quotas,
        activityLog,
      });

      // Override with real totals
      stats.totalFavorites = totalFavoritesCount;
      stats.totalDownloads = totalDownloadsCount;
      stats.totalOrders = totalOrdersCount;

      // Transform favorites with beat enrichment
      const enrichedFavorites: Favorite[] = favorites.map(fav => {
        const beat = beatMap.get(fav.beatId);
        return {
          id: fav._id,
          beatId: fav.beatId,
          beatTitle: beat?.title || `Beat ${fav.beatId}`,
          beatArtist: beat?.genre || undefined,
          beatImageUrl: beat?.imageUrl || undefined,
          beatGenre: beat?.genre || undefined,
          beatBpm: beat?.bpm || undefined,
          beatPrice: beat?.price ? CurrencyCalculator.centsToDollars(beat.price) : undefined,
          createdAt: new Date(fav.createdAt).toISOString(),
        };
      });

      // Transform orders
      const enrichedOrders: Order[] = orders.map(order => ({
        id: order._id,
        orderNumber: order.invoiceNumber,
        items: (order.items || []).map(item => ({
          productId: item.productId,
          title: item.title || item.name || `Product ${item.productId || "Unknown"}`,
          price: item.price || undefined, // Les prix sont déjà en dollars dans la DB
          quantity: item.quantity,
          license: item.license,
          type: item.type,
          sku: item.sku,
          metadata: item.metadata,
        })),
        total: order.total || 0, // Les totaux sont déjà en dollars dans la DB
        currency: order.currency || "USD",
        status: order.status as any,
        paymentMethod: order.paymentProvider,
        paymentStatus: order.paymentStatus,
        createdAt: new Date(order.createdAt).toISOString(),
        updatedAt: new Date(order.updatedAt).toISOString(),
        invoiceUrl: order.invoiceUrl,
      }));

      // Transform downloads with beat enrichment
      const enrichedDownloads: Download[] = downloads.map(download => {
        const beat = beatMap.get(download.beatId);
        return {
          id: download._id,
          beatId: download.beatId,
          beatTitle: beat?.title || `Beat ${download.beatId}`,
          beatArtist: beat?.genre || undefined,
          beatImageUrl: beat?.imageUrl || undefined,
          fileSize: download.fileSize,
          format: "mp3", // Default format, could be enhanced
          quality: download.licenseType,
          licenseType: download.licenseType,
          downloadedAt: new Date(download.timestamp).toISOString(),
          downloadCount: download.downloadCount || 1,
          maxDownloads: undefined, // Field not available in current schema
          downloadUrl: download.downloadUrl,
          expiresAt: download.expiresAt ? new Date(download.expiresAt).toISOString() : undefined,
        };
      });

      // Transform reservations
      const enrichedReservations: Reservation[] = reservations.map(reservation => ({
        id: reservation._id,
        serviceType: reservation.serviceType as any,
        preferredDate: reservation.preferredDate,
        duration: reservation.durationMinutes,
        totalPrice: CurrencyCalculator.centsToDollars(reservation.totalPrice),
        status: reservation.status as any,
        details: reservation.details as any,
        notes: reservation.notes,
        assignedTo: reservation.assignedTo,
        priority: reservation.priority as any,
        createdAt: new Date(reservation.createdAt).toISOString(),
        updatedAt: new Date(reservation.updatedAt).toISOString(),
        completedAt: reservation.completedAt
          ? new Date(reservation.completedAt).toISOString()
          : undefined,
        cancelledAt: reservation.cancelledAt
          ? new Date(reservation.cancelledAt).toISOString()
          : undefined,
        cancellationReason: reservation.cancellationReason,
      }));

      // Transform activity
      const enrichedActivity: Activity[] = activityLog.map(activity => ({
        id: activity._id,
        type: activity.action as any,
        description: activity.details?.description || activity.action,
        timestamp: new Date(activity.timestamp).toISOString(),
        metadata: activity.details || {},
        beatId: activity.details?.beatId,
        beatTitle: activity.details?.beatTitle,
        severity: activity.details?.severity || "info",
      }));

      // Generate chart data if requested (default to 30 days)
      let chartData: ChartDataPoint[] = [];
      if (args.includeChartData) {
        chartData = await generateChartData(ctx, user._id, "30d");
      }

      // Generate trends if requested (default to 30 days)
      let trends: TrendData = {
        orders: { period: "30d", value: 0, change: 0, changePercent: 0, isPositive: true },
        downloads: { period: "30d", value: 0, change: 0, changePercent: 0, isPositive: true },
        revenue: { period: "30d", value: 0, change: 0, changePercent: 0, isPositive: true },
        favorites: { period: "30d", value: 0, change: 0, changePercent: 0, isPositive: true },
      };
      if (args.includeTrends) {
        trends = await generateTrends(ctx, user._id, "30d");
      }

      return {
        user: dashboardUser,
        stats,
        favorites: enrichedFavorites,
        orders: enrichedOrders,
        downloads: enrichedDownloads,
        reservations: enrichedReservations,
        activity: enrichedActivity,
        chartData,
        trends,
      };
    }, "fetch dashboard data");
  },
});

/**
 * Generate chart data for analytics with enhanced statistics
 */
async function generateChartData(
  ctx: any,
  userId: string,
  period: TimePeriod = "30d"
): Promise<ChartDataPoint[]> {
  const { start, end } = DateCalculator.getPeriodRange(period);

  // Get data for the specified period
  const [orders, downloads, favorites] = await Promise.all([
    ctx.db
      .query("orders")
      .withIndex("by_user", (q: any) => q.eq("userId", userId))
      .filter((q: any) => q.gte(q.field("createdAt"), start.getTime()))
      .filter((q: any) => q.lte(q.field("createdAt"), end.getTime()))
      .collect(),

    ctx.db
      .query("downloads")
      .withIndex("by_user", (q: any) => q.eq("userId", userId))
      .filter((q: any) => q.gte(q.field("timestamp"), start.getTime()))
      .filter((q: any) => q.lte(q.field("timestamp"), end.getTime()))
      .collect(),

    ctx.db
      .query("favorites")
      .withIndex("by_user", (q: any) => q.eq("userId", userId))
      .filter((q: any) => q.gte(q.field("createdAt"), start.getTime()))
      .filter((q: any) => q.lte(q.field("createdAt"), end.getTime()))
      .collect(),
  ]);

  // Use enhanced statistics calculator to generate chart data
  return StatisticsCalculator.generateChartData(orders, downloads, favorites, period);
}

/**
 * Generate trend data with period-over-period comparisons using enhanced statistics
 */
async function generateTrends(
  ctx: any,
  userId: string,
  period: TimePeriod = "30d"
): Promise<TrendData> {
  const { start: currentStart, end: currentEnd } = DateCalculator.getPeriodRange(period);
  const { start: previousStart, end: previousEnd } = DateCalculator.getPreviousPeriodRange(period);

  // Get current and previous period data
  const [
    currentOrders,
    previousOrders,
    currentDownloads,
    previousDownloads,
    currentFavorites,
    previousFavorites,
  ] = await Promise.all([
    // Current period orders
    ctx.db
      .query("orders")
      .withIndex("by_user", (q: any) => q.eq("userId", userId))
      .filter((q: any) => q.gte(q.field("createdAt"), currentStart.getTime()))
      .filter((q: any) => q.lte(q.field("createdAt"), currentEnd.getTime()))
      .collect(),

    // Previous period orders
    ctx.db
      .query("orders")
      .withIndex("by_user", (q: any) => q.eq("userId", userId))
      .filter((q: any) => q.gte(q.field("createdAt"), previousStart.getTime()))
      .filter((q: any) => q.lte(q.field("createdAt"), previousEnd.getTime()))
      .collect(),

    // Current period downloads
    ctx.db
      .query("downloads")
      .withIndex("by_user", (q: any) => q.eq("userId", userId))
      .filter((q: any) => q.gte(q.field("timestamp"), currentStart.getTime()))
      .filter((q: any) => q.lte(q.field("timestamp"), currentEnd.getTime()))
      .collect(),

    // Previous period downloads
    ctx.db
      .query("downloads")
      .withIndex("by_user", (q: any) => q.eq("userId", userId))
      .filter((q: any) => q.gte(q.field("timestamp"), previousStart.getTime()))
      .filter((q: any) => q.lte(q.field("timestamp"), previousEnd.getTime()))
      .collect(),

    // Current period favorites
    ctx.db
      .query("favorites")
      .withIndex("by_user", (q: any) => q.eq("userId", userId))
      .filter((q: any) => q.gte(q.field("createdAt"), currentStart.getTime()))
      .filter((q: any) => q.lte(q.field("createdAt"), currentEnd.getTime()))
      .collect(),

    // Previous period favorites
    ctx.db
      .query("favorites")
      .withIndex("by_user", (q: any) => q.eq("userId", userId))
      .filter((q: any) => q.gte(q.field("createdAt"), previousStart.getTime()))
      .filter((q: any) => q.lte(q.field("createdAt"), previousEnd.getTime()))
      .collect(),
  ]);

  // Calculate revenue using enhanced currency calculator
  const currentRevenue = CurrencyCalculator.addAmounts(
    currentOrders
      .filter((order: any) => order.status === "completed" || order.status === "paid")
      .map((order: any) => order.total || 0),
    true // fromCents
  );

  const previousRevenue = CurrencyCalculator.addAmounts(
    previousOrders
      .filter((order: any) => order.status === "completed" || order.status === "paid")
      .map((order: any) => order.total || 0),
    true // fromCents
  );

  // Use enhanced statistics calculator for trend analysis
  return StatisticsCalculator.calculateTrendData(
    {
      orders: currentOrders,
      downloads: currentDownloads,
      favorites: currentFavorites,
      revenue: currentRevenue,
    },
    {
      orders: previousOrders,
      downloads: previousDownloads,
      favorites: previousFavorites,
      revenue: previousRevenue,
    },
    period
  );
}

/**
 * Get analytics data for specific time period
 */
export const getAnalyticsData = query({
  args: {
    period: v.optional(
      v.union(v.literal("7d"), v.literal("30d"), v.literal("90d"), v.literal("1y"))
    ),
  },
  handler: async (
    ctx,
    args
  ): Promise<{
    chartData: ChartDataPoint[];
    trends: TrendData;
    advancedMetrics: any;
  }> => {
    return executeDashboardQuery(async () => {
      const identity = await ctx.auth.getUserIdentity();
      if (!identity) {
        throw new DashboardError("Not authenticated", "auth_error", false);
      }

      const user = await ctx.db
        .query("users")
        .withIndex("by_clerk_id", q => q.eq("clerkId", identity.subject))
        .first();

      if (!user) {
        return {
          chartData: [],
          trends: {
            orders: {
              period: args.period || "30d",
              value: 0,
              change: 0,
              changePercent: 0,
              isPositive: true,
            },
            downloads: {
              period: args.period || "30d",
              value: 0,
              change: 0,
              changePercent: 0,
              isPositive: true,
            },
            revenue: {
              period: args.period || "30d",
              value: 0,
              change: 0,
              changePercent: 0,
              isPositive: true,
            },
            favorites: {
              period: args.period || "30d",
              value: 0,
              change: 0,
              changePercent: 0,
              isPositive: true,
            },
          },
          advancedMetrics: {},
        };
      }

      const period: TimePeriod = args.period || "30d";
      const { start, end } = DateCalculator.getPeriodRange(period);

      // Get all data for the period
      const [orders, downloads, favorites] = await Promise.all([
        ctx.db
          .query("orders")
          .withIndex("by_user", q => q.eq("userId", user._id))
          .filter(q => q.gte(q.field("createdAt"), start.getTime()))
          .filter(q => q.lte(q.field("createdAt"), end.getTime()))
          .collect(),

        ctx.db
          .query("downloads")
          .withIndex("by_user", q => q.eq("userId", user._id))
          .filter(q => q.gte(q.field("timestamp"), start.getTime()))
          .filter(q => q.lte(q.field("timestamp"), end.getTime()))
          .collect(),

        ctx.db
          .query("favorites")
          .withIndex("by_user", q => q.eq("userId", user._id))
          .filter(q => q.gte(q.field("createdAt"), start.getTime()))
          .filter(q => q.lte(q.field("createdAt"), end.getTime()))
          .collect(),
      ]);

      // Generate analytics data
      const chartData = StatisticsCalculator.generateChartData(
        orders,
        downloads,
        favorites,
        period
      );
      const trends = await generateTrends(ctx, user._id, period);
      const advancedMetrics = StatisticsCalculator.calculateAdvancedMetrics({
        orders,
        downloads,
        favorites,
        period,
      });

      return {
        chartData,
        trends,
        advancedMetrics,
      };
    }, "fetch analytics data");
  },
});

/**
 * Get dashboard statistics only (lightweight version)
 */
export const getDashboardStats = query({
  args: {},
  handler: async (ctx): Promise<UserStats> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", q => q.eq("clerkId", identity.subject))
      .first();

    if (!user) {
      return {
        totalFavorites: 0,
        totalDownloads: 0,
        totalOrders: 0,
        totalSpent: 0,
        recentActivity: 0,
        quotaUsed: 0,
        quotaLimit: 0,
        monthlyDownloads: 0,
        monthlyOrders: 0,
        monthlyRevenue: 0,
      };
    }

    // Get counts efficiently
    const [favoritesCount, downloadsCount, orders, quotas, activityCount] = await Promise.all([
      ctx.db
        .query("favorites")
        .withIndex("by_user", q => q.eq("userId", user._id))
        .collect()
        .then((results: any[]) => results.length),

      ctx.db
        .query("downloads")
        .withIndex("by_user", q => q.eq("userId", user._id))
        .collect()
        .then((results: unknown[]) => results.length),

      ctx.db
        .query("orders")
        .withIndex("by_user", q => q.eq("userId", user._id))
        .collect(),

      ctx.db
        .query("quotas")
        .withIndex("by_user", q => q.eq("userId", user._id))
        .filter(q => q.eq(q.field("isActive"), true))
        .collect(),

      ctx.db
        .query("activityLog")
        .withIndex("by_user", q => q.eq("userId", user._id))
        .collect()
        .then((results: unknown[]) => results.length),
    ]);

    // Use enhanced statistics calculator for consistent calculations
    return StatisticsCalculator.calculateUserStats({
      favorites: new Array(favoritesCount).fill({}), // Array for count calculation
      downloads: new Array(downloadsCount).fill({}), // Array for count calculation
      orders,
      quotas,
      activityLog: new Array(activityCount).fill({}), // Array for count calculation
    });
  },
});
