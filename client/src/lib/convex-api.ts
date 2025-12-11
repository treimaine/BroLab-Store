/**
 * Simple wrapper to avoid deep type instantiation issues
 * Using string literals to reference Convex functions dynamically
 *
 * Each string represents a path to a Convex function that will be resolved at runtime
 */
export const api = {
  favorites: {
    getFavorites: {
      getFavorites: "favorites/getFavorites:getFavorites" as string,
      getFavoritesWithBeats: "favorites/getFavorites:getFavoritesWithBeats" as string,
    },
    add: {
      addToFavorites: "favorites/add:addToFavorites" as string,
    },
    remove: {
      removeFromFavorites: "favorites/remove:removeFromFavorites" as string,
    },
  },
  users: {
    getUserStats: {
      getUserStats: "users/getUserStats:getUserStats" as string,
    },
    clerkSync: {
      forceSyncCurrentUser: "users/clerkSync:forceSyncCurrentUser" as string,
    },
  },
  products: {
    forYou: {
      getForYouBeats: "products/forYou:getForYouBeats" as string,
    },
  },
  dashboard: {
    getDashboardData: "dashboard:getDashboardData" as string,
    getDashboardStats: "dashboard:getDashboardStats" as string,
    getAnalyticsData: "dashboard:getAnalyticsData" as string,
  },
  orders: {
    regenerateDownloadsFromOrders: "orders:regenerateDownloadsFromOrders" as string,
  },
  beats: {
    trackView: {
      incrementView: "beats/trackView:incrementView" as string,
    },
    trending: {
      getTrendingBeats: "beats/trending:getTrendingBeats" as string,
      getViewCount: "beats/trending:getViewCount" as string,
    },
  },
} as const;
