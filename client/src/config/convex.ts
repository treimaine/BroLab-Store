// Configuration Convex
export const CONVEX_CONFIG = {
  // Activer/désactiver Convex
  enabled: true, // Réactivé pour utiliser les vraies données

  // URL Convex
  url: import.meta.env.VITE_CONVEX_URL || "https://agile-boar-163.convex.cloud",

  // Configuration des fonctions
  functions: {
    getUserStats: "users:getUserStats",
    getRecentActivity: "users:getRecentActivity",
    getFavorites: "favorites:getFavorites",
    getDownloads: "downloads:record",
    getRecommendations: "products:forYou",
  },

  // Timeout pour les requêtes
  timeout: 10000,

  // Nombre de tentatives
  retries: 3,
};

// Fonction pour vérifier si Convex est disponible
export function isConvexAvailable(): boolean {
  return CONVEX_CONFIG.enabled && !!CONVEX_CONFIG.url;
}

// Fonction pour obtenir l'URL Convex
export function getConvexUrl(): string {
  return CONVEX_CONFIG.url;
}

// Fonction pour activer Convex
export function enableConvex(): void {
  CONVEX_CONFIG.enabled = true;
}

// Fonction pour désactiver Convex
export function disableConvex(): void {
  CONVEX_CONFIG.enabled = false;
}
