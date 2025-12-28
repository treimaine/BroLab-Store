import { v } from "convex/values";
import { query } from "../_generated/server";
import { requireAuth } from "../lib/authHelpers";

// Get comprehensive user statistics
export const getUserStats = query({
  args: {},
  handler: async ctx => {
    const auth = await requireAuth(ctx);

    // Fetch user from database using the userId from auth
    const user = await ctx.db.get(auth.userId);

    if (!user) {
      // Return default stats for new users (shouldn't happen since requireAuth validates user exists)
      return {
        user: {
          id: auth.clerkId,
          email: auth.identity.email || "",
          username: auth.identity.name || `user_${auth.clerkId.slice(-8)}`,
          firstName: auth.identity.givenName || "",
          lastName: auth.identity.familyName || "",
          imageUrl: auth.identity.pictureUrl || "",
        },
        stats: {
          totalFavorites: 0,
          totalDownloads: 0,
          totalOrders: 0,
          totalSpent: 0,
          recentActivity: 0,
        },
        favorites: [],
        downloads: [],
        orders: [],
        recentActivity: [],
      };
    }

    // Get user statistics
    const [favorites, downloads, orders, activityLog] = await Promise.all([
      // Get favorites count and data
      ctx.db
        .query("favorites")
        .withIndex("by_user", q => q.eq("userId", user._id))
        .collect(),

      // Get downloads count and data
      ctx.db
        .query("downloads")
        .withIndex("by_user", q => q.eq("userId", user._id))
        .collect(),

      // Get orders count and data
      ctx.db
        .query("orders")
        .withIndex("by_user", q => q.eq("userId", user._id))
        .collect(),

      // Get recent activity
      ctx.db
        .query("activityLog")
        .withIndex("by_user", q => q.eq("userId", user._id))
        .order("desc")
        .take(10),
    ]);

    // Collect unique beat IDs from favorites and downloads for batch lookup
    const beatIds = new Set<number>();
    for (const fav of favorites) {
      if (fav.beatId) beatIds.add(fav.beatId);
    }
    for (const download of downloads) {
      if (download.beatId) beatIds.add(download.beatId);
    }

    // Batch fetch beats by wordpressId for title lookup
    const beatTitleMap = new Map<number, string>();
    for (const beatId of beatIds) {
      const beat = await ctx.db
        .query("beats")
        .withIndex("by_wordpress_id", q => q.eq("wordpressId", beatId))
        .first();
      if (beat?.title) {
        beatTitleMap.set(beatId, beat.title);
      }
    }

    // Calculate total spent
    const totalSpent = orders.reduce((sum, order) => {
      if (order.status === "completed" || order.status === "paid") {
        return sum + order.total;
      }
      return sum;
    }, 0);

    // Format recent activity
    const recentActivity = activityLog.map(activity => ({
      id: activity._id,
      type: activity.action,
      description: activity.details?.description || activity.action,
      timestamp: new Date(activity.timestamp).toISOString(),
      date: new Date(activity.timestamp).toLocaleDateString(),
      severity: activity.details?.severity || "info",
      beatTitle: activity.details?.beatTitle,
    }));

    // Format favorites with beat titles from lookup
    const favoritesData = favorites.map(fav => ({
      id: fav._id,
      beatId: fav.beatId,
      beatTitle: beatTitleMap.get(fav.beatId) || `Beat ${fav.beatId}`,
    }));

    // Format downloads with beat titles from lookup
    const downloadsData = downloads.map(download => ({
      id: download._id,
      beatId: download.beatId,
      licenseType: download.licenseType,
      timestamp: download.timestamp,
      beatTitle: beatTitleMap.get(download.beatId) || `Beat ${download.beatId}`,
    }));

    // Format orders
    const ordersData = orders.map(order => ({
      id: order._id,
      beatId: order.items?.[0]?.productId || 0,
      beatTitle: order.items?.[0]?.title || `Order ${order._id.slice(-8)}`,
      amount: order.total,
      total: order.total,
      status: order.status,
    }));

    return {
      user: {
        id: user._id,
        clerkId: user.clerkId,
        email: user.email,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        imageUrl: user.imageUrl,
        role: user.role,
        isActive: user.isActive,
        lastLoginAt: user.lastLoginAt,
      },
      stats: {
        totalFavorites: favorites.length,
        totalDownloads: downloads.length,
        totalOrders: orders.length,
        totalSpent: totalSpent / 100, // Convert from cents to dollars
        recentActivity: activityLog.length,
      },
      favorites: favoritesData,
      downloads: downloadsData,
      orders: ordersData,
      recentActivity,
    };
  },
});

// Get user statistics by Clerk ID (alternative version)
export const getUserStatsByClerkId = query({
  args: { clerkId: v.string() },
  handler: async (ctx, { clerkId }) => {
    // Get user from database
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", q => q.eq("clerkId", clerkId))
      .first();

    if (!user) {
      return null;
    }

    // Get basic statistics
    const [favoritesCount, downloadsCount, ordersCount] = await Promise.all([
      ctx.db
        .query("favorites")
        .withIndex("by_user", q => q.eq("userId", user._id))
        .collect()
        .then(results => results.length),

      ctx.db
        .query("downloads")
        .withIndex("by_user", q => q.eq("userId", user._id))
        .collect()
        .then(results => results.length),

      ctx.db
        .query("orders")
        .withIndex("by_user", q => q.eq("userId", user._id))
        .collect(),
    ]);

    // Calculate total spent
    const totalSpent = ordersCount.reduce((sum, order) => {
      if (order.status === "completed" || order.status === "paid") {
        return sum + order.total;
      }
      return sum;
    }, 0);

    return {
      user,
      stats: {
        totalFavorites: favoritesCount,
        totalDownloads: downloadsCount,
        totalOrders: ordersCount.length,
        totalSpent: totalSpent / 100, // Convert from cents to dollars
      },
    };
  },
});
