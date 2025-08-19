import { useUser } from "@clerk/clerk-react";
import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useMemo } from "react";

// Types pour les données
export interface Activity {
  id: string;
  type: string;
  description: string;
  timestamp: string;
  beatTitle?: string;
  date: string;
  severity: string;
}

export interface Favorite {
  id: string;
  beatId: number;
  beatTitle?: string;
  createdAt?: number;
}

export interface Order {
  id: string;
  beatId: number;
  beatTitle?: string;
  amount?: number;
  total?: number;
  status?: string;
  createdAt?: number;
  items?: any[];
}

export interface UserStats {
  totalFavorites: number;
  totalDownloads: number;
  totalOrders: number;
  totalSpent: number;
  recentActivity: number;
}

export interface DashboardUser {
  id: string;
  email?: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  imageUrl?: string;
  clerkId?: string;
}

// Hook principal optimisé pour les données du dashboard avec données de développement
export function useDashboardDataOptimized() {
  const { user: clerkUser, isLoaded } = useUser();
  const queryClient = useQueryClient();

  // Données de développement temporaires pour faire fonctionner Analytics
  const mockRecentOrders = useMemo(() => [
    { _id: "1", beatId: 1, beatTitle: "Beat 1", total: 29.99, status: "completed", createdAt: Date.now() - 86400000 },
    { _id: "2", beatId: 2, beatTitle: "Beat 2", total: 19.99, status: "pending", createdAt: Date.now() - 172800000 },
  ], []);

  const mockUserFavorites = useMemo(() => [
    { _id: "f1", beatId: 1, beat: { title: "Favorite Beat 1" }, createdAt: Date.now() - 86400000 },
    { _id: "f2", beatId: 2, beat: { title: "Favorite Beat 2" }, createdAt: Date.now() - 172800000 },
  ], []);

  const mockUserDownloads = useMemo(() => [
    { _id: "d1", beatId: 1, beatTitle: "Downloaded Beat 1", downloadedAt: Date.now() - 86400000 },
  ], []);

  const mockReservations = useMemo(() => [
    { _id: "r1", serviceType: "Mixing", status: "confirmed", createdAt: Date.now() - 86400000 },
  ], []);

  const mockAuditLogs = useMemo(() => [
    { _id: "a1", action: "login", timestamp: Date.now() - 3600000, details: { description: "Connexion utilisateur" } },
    { _id: "a2", action: "purchase", timestamp: Date.now() - 7200000, details: { description: "Achat d'un beat" } },
  ], []);

  // État de chargement optimisé
  const isLoading = useMemo(() => {
    return !isLoaded;
  }, [isLoaded]);

  // Données utilisateur avec fallback Clerk
  const user: DashboardUser | null = useMemo(() => {
    if (!clerkUser) return null;

    return {
      id: clerkUser.id,
      email: clerkUser.emailAddresses[0]?.emailAddress,
      username: clerkUser.username || undefined,
      firstName: clerkUser.firstName || undefined,
      lastName: clerkUser.lastName || undefined,
      imageUrl: clerkUser.imageUrl || undefined,
      clerkId: clerkUser.id,
    };
  }, [clerkUser]);

  // Statistiques calculées à partir des données de développement
  const stats: UserStats = useMemo(() => {
    const favoritesCount = mockUserFavorites?.length || 0;
    const ordersCount = mockRecentOrders?.length || 0;
    const downloadsCount = mockUserDownloads?.length || 0;
    const totalSpent = mockRecentOrders?.reduce((sum, order) => {
      if (order.status === "completed" || order.status === "paid") {
        return sum + (order.total || 0);
      }
      return sum;
    }, 0) || 0;

    return {
      totalFavorites: favoritesCount,
      totalDownloads: downloadsCount,
      totalOrders: ordersCount,
      totalSpent,
      recentActivity: Math.max(favoritesCount, ordersCount, downloadsCount),
    };
  }, [mockUserFavorites, mockRecentOrders, mockUserDownloads]);

  // Activité récente calculée à partir des données de développement
  const recentActivity: Activity[] = useMemo(() => {
    const activities: Activity[] = [];

    // Ajouter les logs d'audit récents
    mockAuditLogs.forEach((log: any) => {
      activities.push({
        id: log._id,
        type: log.action,
        description: log.details?.description || log.action,
        timestamp: new Date(log.timestamp).toISOString(),
        date: new Date(log.timestamp).toLocaleDateString(),
        severity: log.details?.severity || "info",
      });
    });

    // Ajouter les commandes récentes
    mockRecentOrders.forEach((order: any, index: number) => {
      activities.push({
        id: `order-${order._id || index}`,
        type: "order",
        description: `Commande ${order.status === 'completed' ? 'complétée' : 'créée'} - ${order.total}€`,
        timestamp: new Date(order.createdAt).toISOString(),
        date: new Date(order.createdAt).toLocaleDateString(),
        severity: "info",
      });
    });

    // Ajouter les réservations récentes
    mockReservations.forEach((reservation: any, index: number) => {
      activities.push({
        id: `reservation-${reservation._id || index}`,
        type: "reservation",
        description: `Réservation ${reservation.serviceType} - ${reservation.status}`,
        timestamp: new Date(reservation.createdAt).toISOString(),
        date: new Date(reservation.createdAt).toLocaleDateString(),
        severity: "info",
      });
    });

    // Ajouter les favoris récents
    mockUserFavorites.forEach((favorite: any, index: number) => {
      activities.push({
        id: `favorite-${favorite._id || index}`,
        type: "favorite",
        description: `Beat ajouté aux favoris: ${favorite.beat?.title || 'Beat'}`,
        timestamp: new Date(favorite.createdAt).toISOString(), 
        date: new Date(favorite.createdAt).toLocaleDateString(),
        severity: "info",
      });
    });

    return activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 10);
  }, [mockAuditLogs, mockRecentOrders, mockReservations, mockUserFavorites]);

  // Favoris récents avec données de développement
  const favorites: Favorite[] = useMemo(() => {
    return mockUserFavorites.map((favorite: any) => ({
      id: favorite._id,
      beatId: favorite.beatId,
      beatTitle: favorite.beat?.title,
      createdAt: favorite.createdAt,
    }));
  }, [mockUserFavorites]);

  // Téléchargements récents avec données de développement
  const downloads = useMemo(() => {
    return mockUserDownloads.map((download: any) => ({
      id: download._id,
      beatId: download.beatId,
      beatTitle: download.beatTitle,
      downloadedAt: new Date(download.downloadedAt).toISOString(),
      downloadUrl: download.downloadUrl,
    }));
  }, [mockUserDownloads]);

  // Commandes récentes avec données de développement
  const orders: Order[] = useMemo(() => {
    return mockRecentOrders.map((order: any) => ({
      id: order._id,
      beatId: order.beatId,
      beatTitle: order.beatTitle,
      amount: order.total,
      total: order.total,
      status: order.status,
      createdAt: order.createdAt,
      items: order.items,
    }));
  }, [mockRecentOrders]);

  // Données pour les graphiques
  const chartData = useMemo(() => {
    const now = new Date();
    const months = [];

    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthOrders = orders.filter((order: any) => {
        const orderDate = new Date(order.createdAt || 0);
        return (
          orderDate.getMonth() === date.getMonth() &&
          orderDate.getFullYear() === date.getFullYear()
        );
      });

      const monthDownloads = downloads.filter((download: any) => {
        const downloadDate = new Date(download.downloadedAt || 0);
        return (
          downloadDate.getMonth() === date.getMonth() &&
          downloadDate.getFullYear() === date.getFullYear()
        );
      });

      months.push({
        date: date.toLocaleDateString("fr-FR", { month: "short", year: "numeric" }),
        orders: monthOrders.length,
        downloads: monthDownloads.length,
        revenue: monthOrders.reduce((sum: number, order: any) => sum + (order.total || 0), 0),
        beats: Math.floor(Math.random() * 10) + 5, // Données simulées pour les beats
      });
    }

    return months;
  }, [orders, downloads]);

  // Tendances calculées
  const trends = useMemo(() => {
    const currentMonth = chartData[chartData.length - 1];
    const previousMonth = chartData[chartData.length - 2];

    const calculateTrend = (current: number, previous: number) => {
      const change = current - previous;
      const changePercent = previous > 0 ? (change / previous) * 100 : 0;
      return { change, changePercent };
    };

    if (!currentMonth || !previousMonth) {
      return {
        orders: { period: "30d", value: stats.totalOrders, change: 0, changePercent: 0 },
        downloads: { period: "30d", value: stats.totalDownloads, change: 0, changePercent: 0 },
        revenue: { period: "30d", value: stats.totalSpent, change: 0, changePercent: 0 },
        beats: { period: "30d", value: stats.totalFavorites, change: 0, changePercent: 0 },
      };
    }

    return {
      orders: {
        period: "30d",
        value: currentMonth.orders,
        ...calculateTrend(currentMonth.orders, previousMonth.orders),
      },
      downloads: {
        period: "30d",
        value: currentMonth.downloads,
        ...calculateTrend(currentMonth.downloads, previousMonth.downloads),
      },
      revenue: {
        period: "30d",
        value: currentMonth.revenue,
        ...calculateTrend(currentMonth.revenue, previousMonth.revenue),
      },
      beats: {
        period: "30d",
        value: currentMonth.beats,
        ...calculateTrend(currentMonth.beats, previousMonth.beats),
      },
    };
  }, [chartData, stats]);

  // Récupérer les recommandations from WordPress/WooCommerce
  const recommendations: any[] = useMemo(() => {
    // TODO: Intégrer les recommandations depuis WooCommerce
    return [];
  }, []);

  // Fonction de rafraîchissement optimisée
  const refetch = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ["dashboard-data"] });
  }, [queryClient]);

  return {
    user,
    stats,
    recentActivity,
    favorites,
    downloads,
    orders,
    recommendations,
    chartData,
    trends,
    isLoading,
    refetch,
  };
}