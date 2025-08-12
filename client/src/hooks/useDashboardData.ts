import { useUser } from "@clerk/clerk-react";
import { api } from "@convex/_generated/api";
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
  const userStats = useQuery(
    (api as any)["users/getUserStats"]?.getUserStats,
    clerkUser ? {} : "skip"
  );

  // Récupérer les favoris avec type casting pour éviter les erreurs
  const favorites = useQuery(
    (api as any)["favorites/getFavorites"]?.getFavorites,
    clerkUser ? {} : "skip"
  );

  // Récupérer les recommandations avec type casting pour éviter les erreurs
  const recommendations = useQuery(
    (api as any)["products/forYou"]?.getForYouBeats,
    clerkUser ? { limit: 6 } : "skip"
  );

  // Données par défaut si les requêtes échouent
  const defaultStats = {
    totalFavorites: 0,
    totalDownloads: 0,
    totalOrders: 0,
    totalSpent: 0,
    recentActivity: 0,
  };

  // État de chargement
  const isLoading = !isLoaded || (clerkUser && userStats === undefined);

  // Données utilisateur avec fallback
  const user =
    userStats?.user ||
    (clerkUser
      ? {
          id: clerkUser.id,
          email: clerkUser.emailAddresses[0]?.emailAddress,
          username: clerkUser.username,
          firstName: clerkUser.firstName,
          lastName: clerkUser.lastName,
        }
      : null);

  // Statistiques avec fallback
  const stats = userStats?.stats || defaultStats;

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
      totalFavorites: stats.totalFavorites,
      totalDownloads: stats.totalDownloads,
      totalOrders: stats.totalOrders,
      totalSpent: stats.totalSpent,
      recentActivity: stats.recentActivity,
    },

    // Données détaillées
    favorites: favoritesData as Favorite[],
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
    (api as any)["products/forYou"]?.getForYouBeats,
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

  const userStats = useQuery(
    (api as any)["users/getUserStats"]?.getUserStats,
    clerkUser ? {} : "skip"
  );

  return {
    activity: userStats?.recentActivity || [],
    isLoading: clerkUser && userStats === undefined,
    convexAvailable: true,
  };
}
