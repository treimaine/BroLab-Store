// Simple wrapper to avoid deep type instantiation issues
// Using dynamic import to avoid TypeScript compilation issues
export const api = {
  favorites: {
    getFavorites: {
      getFavorites: "favorites/getFavorites:getFavorites" as any,
      getFavoritesWithBeats: "favorites/getFavorites:getFavoritesWithBeats" as any,
    },
    add: {
      addToFavorites: "favorites/add:addToFavorites" as any,
    },
    remove: {
      removeFromFavorites: "favorites/remove:removeFromFavorites" as any,
    },
  },
  users: {
    getUserStats: {
      getUserStats: "users/getUserStats:getUserStats" as any,
    },
  },
  products: {
    forYou: {
      getForYouBeats: "products/forYou:getForYouBeats" as any,
    },
  },
  dashboard: {
    getDashboardData: "dashboard:getDashboardData" as any,
    getDashboardStats: "dashboard:getDashboardStats" as any,
    getAnalyticsData: "dashboard:getAnalyticsData" as any,
  },
};
