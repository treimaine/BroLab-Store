import { useUser } from "@clerk/clerk-react";
import { useQuery } from "convex/react";

// Types pour les données
interface Activity {
  id: string;
  type: string;
  description: string;
  timestamp: string;
  beatTitle?: string;
  date: string;
  severity: string;
}

interface Favorite {
  id: string;
  beatId: number;
  beatTitle?: string;
}

interface Order {
  id: string;
  beatId: number;
  beatTitle?: string;
  amount?: number;
  total?: number;
  status?: string;
}

export function useDashboardData() {
  const { user: clerkUser, isLoaded } = useUser();

  // Récupérer les statistiques utilisateur avec type casting pour éviter les erreurs
  const userStats = useQuery("users/getUserStats:getUserStats" as any, clerkUser ? {} : "skip");

  // Récupérer les favoris avec type casting pour éviter les erreurs
  const favorites = useQuery("favorites/getFavorites:getFavorites" as any, clerkUser ? {} : "skip");

  // Récupérer les recommandations avec type casting pour éviter les erreurs
  const recommendations = useQuery(
    "products/forYou:getForYouBeats" as any,
    clerkUser ? { limit: 6 } : "skip"
  );

  // Données par défaut si les requêtes échouent
  // defaults removed; UI should handle undefined gracefully

  // État de chargement
  const isLoading = !isLoaded || (clerkUser && userStats === undefined);

  // Données utilisateur avec fallback
  const user = userStats?.user || null;

  // Statistiques avec fallback
  const stats = userStats?.stats;

  // Données détaillées avec fallback
  const favoritesData = favorites || [];
  const downloadsData = userStats?.downloads || [];
  const ordersData = userStats?.orders || [];
  const activityData = userStats?.recentActivity || [];

  return {
    // État de chargement
    isLoading,

    // Données utilisateur
    user,

    // Statistiques
    stats: {
      totalFavorites: stats?.totalFavorites || 0,
      totalDownloads: stats?.totalDownloads || 0,
      totalOrders: stats?.totalOrders || 0,
      totalSpent: stats?.totalSpent || 0,
      recentActivity: stats?.recentActivity || 0,
    },

    // Données détaillées
    favorites: (favoritesData || []).map((fav: any) => ({
      id: fav._id || fav.id,
      beatId: fav.beatId,
      beatTitle: fav.beatTitle,
    })) as Favorite[],
    downloads: downloadsData as any[],
    orders: ordersData as Order[],
    recentActivity: activityData as Activity[],

    // État de l'utilisateur
    isAuthenticated: !!clerkUser,
    clerkUser,

    // État de Convex
    convexAvailable: true,
    convexError: null,
  };
}

// Hook pour les recommandations basées sur l'activité
export function useRecommendations() {
  const { user: clerkUser } = useUser();

  const recommendations = useQuery(
    "products/forYou:getForYouBeats" as any,
    clerkUser ? { limit: 6 } : "skip"
  );

  return {
    recommendations: recommendations || [],
    isLoading: clerkUser && recommendations === undefined,
    convexAvailable: true,
  };
}

// Hook pour l'activité utilisateur
export function useUserActivity() {
  const { user: clerkUser } = useUser();

  const userStats = useQuery("users/getUserStats:getUserStats" as any, clerkUser ? {} : "skip");

  return {
    activity: userStats?.recentActivity || [],
    isLoading: clerkUser && userStats === undefined,
    convexAvailable: true,
  };
}
