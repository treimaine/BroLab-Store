import { useAuth } from "@clerk/clerk-react";
import { useState } from "react";
import { useClerkSync } from "./useClerkSync";
import {
  useOptimizedDownloadMutations,
  useOptimizedFavoriteMutations,
} from "./useOptimizedQueries";

export interface SyncStatus {
  isLoading: boolean;
  isSuccess: boolean;
  isError: boolean;
  error?: string;
  data?: any;
}

export function useConvexSync() {
  const { userId } = useAuth();
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    isLoading: false,
    isSuccess: false,
    isError: false,
  });

  // Use shared optimized mutation hooks to avoid deep type instantiation here
  const { recordDownload: optimizedRecordDownload } = useOptimizedDownloadMutations();
  const { addFavorite: optimizedAddFavorite, removeFavorite: optimizedRemoveFavorite } =
    useOptimizedFavoriteMutations();
  const { syncUser: runClerkSync } = useClerkSync();

  // Queries Convex (casts légers pour éviter la profondeur de types)
  // Simplification pour éviter la profondeur de types; non bloquant pour la sync
  const userStats: any = null;
  // Keep queries lightweight by deferring to other hooks or casting to any
  const userDownloads: any = undefined;
  const userFavorites: any = undefined;
  const userOrders: any = null;

  // Synchroniser l'utilisateur Clerk avec Convex
  const syncUser = async (userData: {
    email: string;
    username?: string;
    firstName?: string;
    lastName?: string;
    imageUrl?: string;
  }) => {
    if (!userId) return;

    setSyncStatus({ isLoading: true, isSuccess: false, isError: false });

    try {
      const result = await runClerkSync();

      setSyncStatus({
        isLoading: false,
        isSuccess: true,
        isError: false,
        data: result,
      });

      return result;
    } catch (error) {
      setSyncStatus({
        isLoading: false,
        isSuccess: false,
        isError: true,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  };

  // Enregistrer un téléchargement
  const recordDownload = async (downloadData: {
    productId: number;
    license: string;
    productName: string;
    price: number;
  }) => {
    if (!userId) return;

    try {
      const result = await optimizedRecordDownload.mutateAsync({
        beatId: downloadData.productId,
        licenseType: downloadData.license,
        downloadUrl: `/downloads/${downloadData.productId}`,
      } as any);

      return result;
    } catch (error) {
      console.error("Failed to record download:", error);
      throw error;
    }
  };

  // Ajouter aux favoris
  const addFavorite = async (beatId: number) => {
    if (!userId) return;

    try {
      const result = await optimizedAddFavorite.mutateAsync(beatId as any);

      return result;
    } catch (error) {
      console.error("Failed to add favorite:", error);
      throw error;
    }
  };

  // Retirer des favoris
  const removeFavorite = async (beatId: number) => {
    if (!userId) return;

    try {
      const result = await optimizedRemoveFavorite.mutateAsync(beatId as any);

      return result;
    } catch (error) {
      console.error("Failed to remove favorite:", error);
      throw error;
    }
  };

  // Vérifier si un produit est dans les favoris
  const isFavorite = (beatId: number): boolean => {
    const list = (userFavorites as unknown as Array<any>) || [];
    return list.some((fav: any) => fav.beatId === beatId);
  };

  // Vérifier si un produit a été téléchargé
  const hasDownloaded = (beatId: number): boolean => {
    const list = (userDownloads as unknown as Array<any>) || [];
    return list.some((download: any) => download.beatId === beatId);
  };

  return {
    // État
    syncStatus,
    userStats,
    userDownloads,
    userFavorites,
    userOrders,

    // Actions
    syncUser,
    recordDownload,
    addFavorite,
    removeFavorite,
    isFavorite,
    hasDownloaded,

    // Utilitaires
    isLoading: syncStatus.isLoading,
    isAuthenticated: !!userId,
  };
}

// Hook pour la synchronisation côté serveur
export function useServerSync() {
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    isLoading: false,
    isSuccess: false,
    isError: false,
  });

  // Synchroniser WordPress
  const syncWordPress = async () => {
    setSyncStatus({ isLoading: true, isSuccess: false, isError: false });

    try {
      const response = await fetch("/api/sync/wordpress", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      const result = await response.json();

      if (result.success) {
        setSyncStatus({
          isLoading: false,
          isSuccess: true,
          isError: false,
          data: result,
        });
      } else {
        setSyncStatus({
          isLoading: false,
          isSuccess: false,
          isError: true,
          error: result.message,
        });
      }

      return result;
    } catch (error) {
      setSyncStatus({
        isLoading: false,
        isSuccess: false,
        isError: true,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  };

  // Synchroniser WooCommerce
  const syncWooCommerce = async () => {
    setSyncStatus({ isLoading: true, isSuccess: false, isError: false });

    try {
      const response = await fetch("/api/sync/woocommerce", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      const result = await response.json();

      if (result.success) {
        setSyncStatus({
          isLoading: false,
          isSuccess: true,
          isError: false,
          data: result,
        });
      } else {
        setSyncStatus({
          isLoading: false,
          isSuccess: false,
          isError: true,
          error: result.message,
        });
      }

      return result;
    } catch (error) {
      setSyncStatus({
        isLoading: false,
        isSuccess: false,
        isError: true,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  };

  // Synchronisation complète
  const syncAll = async () => {
    setSyncStatus({ isLoading: true, isSuccess: false, isError: false });

    try {
      const response = await fetch("/api/sync/full", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      const result = await response.json();

      if (result.success) {
        setSyncStatus({
          isLoading: false,
          isSuccess: true,
          isError: false,
          data: result,
        });
      } else {
        setSyncStatus({
          isLoading: false,
          isSuccess: false,
          isError: true,
          error: result.message,
        });
      }

      return result;
    } catch (error) {
      setSyncStatus({
        isLoading: false,
        isSuccess: false,
        isError: true,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  };

  // Obtenir les statistiques
  const getStats = async () => {
    try {
      const response = await fetch("/api/sync/stats");
      const result = await response.json();
      return result;
    } catch (error) {
      console.error("Failed to get sync stats:", error);
      throw error;
    }
  };

  return {
    syncStatus,
    syncWordPress,
    syncWooCommerce,
    syncAll,
    getStats,
    isLoading: syncStatus.isLoading,
  };
}
