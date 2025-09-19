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
  TrendMetric,
  UserStats,
} from "../shared/types/dashboard";
import { query } from "./_generated/server";

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

function sanitizeCurrencyAmount(amount: number | undefined, fromCents = true): number {
  if (typeof amount !== "number" || isNaN(amount) || amount < 0) {
    return 0;
  }
  return fromCents ? Math.round(amount) / 100 : Math.round(amount * 100) / 100;
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

      // Calculate statistics
      const completedOrders = orders.filter(
        order => order.status === "completed" || order.status === "paid"
      );

      const totalSpent = completedOrders.reduce((sum, order) => sum + (order.total || 0), 0);

      // Get current month data for trends
      const now = new Date();
      const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

      const monthlyOrders = orders.filter(order => order.createdAt >= currentMonthStart);
      const monthlyDownloads = downloads.filter(
        download => download.timestamp >= currentMonthStart
      );
      const monthlyRevenue = monthlyOrders
        .filter(order => order.status === "completed" || order.status === "paid")
        .reduce((sum, order) => sum + (order.total || 0), 0);

      // Get quota information
      const downloadQuota = quotas.find(q => q.quotaType === "downloads");

      const stats: UserStats = {
        totalFavorites: favorites.length,
        totalDownloads: downloads.length,
        totalOrders: orders.length,
        totalSpent: sanitizeCurrencyAmount(totalSpent, true), // Convert cents to dollars
        recentActivity: activityLog.length,
        quotaUsed: downloadQuota?.used || 0,
        quotaLimit: downloadQuota?.limit || 0,
        monthlyDownloads: monthlyDownloads.length,
        monthlyOrders: monthlyOrders.length,
        monthlyRevenue: sanitizeCurrencyAmount(monthlyRevenue, true), // Convert cents to dollars
      };

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
          beatPrice: beat?.price ? sanitizeCurrencyAmount(beat.price, true) : undefined, // Convert cents to dollars
          createdAt: new Date(fav.createdAt).toISOString(),
        };
      });

      // Transform orders
      const enrichedOrders: Order[] = orders.map(order => ({
        id: order._id,
        orderNumber: order.invoiceNumber,
        items: (order.items || []).map(item => ({
          productId: item.productId,
          title: item.title,
          price: item.price ? item.price / 100 : undefined, // Convert cents to dollars
          quantity: item.quantity,
          license: item.license,
          type: item.type,
          sku: item.sku,
          metadata: item.metadata,
        })),
        total: (order.total || 0) / 100, // Convert cents to dollars
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
        totalPrice: reservation.totalPrice / 100, // Convert cents to dollars
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

      // Generate chart data if requested
      let chartData: ChartDataPoint[] = [];
      if (args.includeChartData) {
        chartData = await generateChartData(ctx, user._id);
      }

      // Generate trends if requested
      let trends: TrendData = {
        orders: { period: "30d", value: 0, change: 0, changePercent: 0, isPositive: true },
        downloads: { period: "30d", value: 0, change: 0, changePercent: 0, isPositive: true },
        revenue: { period: "30d", value: 0, change: 0, changePercent: 0, isPositive: true },
        favorites: { period: "30d", value: 0, change: 0, changePercent: 0, isPositive: true },
      };
      if (args.includeTrends) {
        trends = await generateTrends(ctx, user._id);
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
 * Generate chart data for analytics
 */
async function generateChartData(ctx: any, userId: string): Promise<ChartDataPoint[]> {
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  // Get data for the last 30 days
  const [orders, downloads, favorites] = await Promise.all([
    ctx.db
      .query("orders")
      .withIndex("by_user", (q: any) => q.eq("userId", userId))
      .filter((q: any) => q.gte(q.field("createdAt"), thirtyDaysAgo.getTime()))
      .collect(),

    ctx.db
      .query("downloads")
      .withIndex("by_user", (q: any) => q.eq("userId", userId))
      .filter((q: any) => q.gte(q.field("timestamp"), thirtyDaysAgo.getTime()))
      .collect(),

    ctx.db
      .query("favorites")
      .withIndex("by_user", (q: any) => q.eq("userId", userId))
      .filter((q: any) => q.gte(q.field("createdAt"), thirtyDaysAgo.getTime()))
      .collect(),
  ]);

  // Group by date
  const dataByDate = new Map<string, ChartDataPoint>();

  // Initialize all dates with zero values
  for (let i = 0; i < 30; i++) {
    const date = new Date(thirtyDaysAgo.getTime() + i * 24 * 60 * 60 * 1000);
    const dateStr = date.toISOString().split("T")[0];
    dataByDate.set(dateStr, {
      date: dateStr,
      orders: 0,
      downloads: 0,
      revenue: 0,
      favorites: 0,
    });
  }

  // Aggregate orders
  orders.forEach((order: any) => {
    const date = new Date(order.createdAt).toISOString().split("T")[0];
    const existing = dataByDate.get(date);
    if (existing) {
      existing.orders += 1;
      if (order.status === "completed" || order.status === "paid") {
        existing.revenue += (order.total || 0) / 100; // Convert cents to dollars
      }
    }
  });

  // Aggregate downloads
  downloads.forEach((download: any) => {
    const date = new Date(download.timestamp).toISOString().split("T")[0];
    const existing = dataByDate.get(date);
    if (existing) {
      existing.downloads += 1;
    }
  });

  // Aggregate favorites
  favorites.forEach((favorite: any) => {
    const date = new Date(favorite.createdAt).toISOString().split("T")[0];
    const existing = dataByDate.get(date);
    if (existing) {
      existing.favorites += 1;
    }
  });

  return Array.from(dataByDate.values()).sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Generate trend data with period-over-period comparisons
 */
async function generateTrends(ctx: any, userId: string): Promise<TrendData> {
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

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
      .filter((q: any) => q.gte(q.field("createdAt"), thirtyDaysAgo.getTime()))
      .collect(),

    // Previous period orders
    ctx.db
      .query("orders")
      .withIndex("by_user", (q: any) => q.eq("userId", userId))
      .filter((q: any) => q.gte(q.field("createdAt"), sixtyDaysAgo.getTime()))
      .filter((q: any) => q.lt(q.field("createdAt"), thirtyDaysAgo.getTime()))
      .collect(),

    // Current period downloads
    ctx.db
      .query("downloads")
      .withIndex("by_user", (q: any) => q.eq("userId", userId))
      .filter((q: any) => q.gte(q.field("timestamp"), thirtyDaysAgo.getTime()))
      .collect(),

    // Previous period downloads
    ctx.db
      .query("downloads")
      .withIndex("by_user", (q: any) => q.eq("userId", userId))
      .filter((q: any) => q.gte(q.field("timestamp"), sixtyDaysAgo.getTime()))
      .filter((q: any) => q.lt(q.field("timestamp"), thirtyDaysAgo.getTime()))
      .collect(),

    // Current period favorites
    ctx.db
      .query("favorites")
      .withIndex("by_user", (q: any) => q.eq("userId", userId))
      .filter((q: any) => q.gte(q.field("createdAt"), thirtyDaysAgo.getTime()))
      .collect(),

    // Previous period favorites
    ctx.db
      .query("favorites")
      .withIndex("by_user", (q: any) => q.eq("userId", userId))
      .filter((q: any) => q.gte(q.field("createdAt"), sixtyDaysAgo.getTime()))
      .filter((q: any) => q.lt(q.field("createdAt"), thirtyDaysAgo.getTime()))
      .collect(),
  ]);

  // Calculate metrics
  const currentRevenue =
    currentOrders
      .filter((order: any) => order.status === "completed" || order.status === "paid")
      .reduce((sum: number, order: any) => sum + (order.total || 0), 0) / 100; // Convert to dollars

  const previousRevenue =
    previousOrders
      .filter((order: any) => order.status === "completed" || order.status === "paid")
      .reduce((sum: number, order: any) => sum + (order.total || 0), 0) / 100; // Convert to dollars

  // Helper function to calculate trend metric
  const calculateTrend = (current: number, previous: number): TrendMetric => {
    const change = current - previous;
    const changePercent = previous > 0 ? (change / previous) * 100 : 0;

    return {
      period: "30d",
      value: current,
      change,
      changePercent,
      isPositive: change >= 0,
    };
  };

  return {
    orders: calculateTrend(currentOrders.length, previousOrders.length),
    downloads: calculateTrend(currentDownloads.length, previousDownloads.length),
    revenue: calculateTrend(currentRevenue, previousRevenue),
    favorites: calculateTrend(currentFavorites.length, previousFavorites.length),
  };
}

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
        .then((results: any[]) => results.length),

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
        .then((results: any[]) => results.length),
    ]);

    const completedOrders = orders.filter(
      (order: any) => order.status === "completed" || order.status === "paid"
    );

    const totalSpent = completedOrders.reduce(
      (sum: number, order: any) => sum + (order.total || 0),
      0
    );

    // Get current month data
    const now = new Date();
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

    const monthlyOrders = orders.filter((order: any) => order.createdAt >= currentMonthStart);
    const monthlyRevenue = monthlyOrders
      .filter((order: any) => order.status === "completed" || order.status === "paid")
      .reduce((sum: number, order: any) => sum + (order.total || 0), 0);

    const downloadQuota = quotas.find((q: any) => q.quotaType === "downloads");

    return {
      totalFavorites: favoritesCount,
      totalDownloads: downloadsCount,
      totalOrders: orders.length,
      totalSpent: sanitizeCurrencyAmount(totalSpent, true), // Convert cents to dollars
      recentActivity: activityCount,
      quotaUsed: downloadQuota?.used || 0,
      quotaLimit: downloadQuota?.limit || 0,
      monthlyDownloads: 0, // Would need additional query for monthly downloads
      monthlyOrders: monthlyOrders.length,
      monthlyRevenue: sanitizeCurrencyAmount(monthlyRevenue, true), // Convert cents to dollars
    };
  },
});
