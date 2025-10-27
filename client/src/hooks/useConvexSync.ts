import { useState } from "react";

/**
 * Placeholder hooks for Convex sync functionality
 * These are minimal implementations to prevent import errors
 */
export function useConvexSync() {
  return {
    isSyncing: false,
    lastSyncTime: null,
    syncNow: async () => {},
    error: null,
  };
}

interface SyncStatus {
  isSuccess: boolean;
  isError: boolean;
  error?: string;
  data?: {
    message?: string;
  };
}

interface SyncStats {
  products: {
    total: number;
    active: number;
    featured: number;
  };
  orders: {
    total: number;
    byStatus: Record<string, number>;
  };
}

export function useServerSync() {
  const [isLoading, setIsLoading] = useState(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    isSuccess: false,
    isError: false,
  });

  const syncWordPress = async (): Promise<void> => {
    setIsLoading(true);
    try {
      // Placeholder implementation - would call actual sync endpoint
      await new Promise(resolve => setTimeout(resolve, 1000));
      setSyncStatus({
        isSuccess: true,
        isError: false,
        data: { message: "WordPress synchronisé avec succès" },
      });
    } catch (err) {
      setSyncStatus({
        isSuccess: false,
        isError: true,
        error: err instanceof Error ? err.message : "Erreur de synchronisation WordPress",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const syncWooCommerce = async (): Promise<void> => {
    setIsLoading(true);
    try {
      // Placeholder implementation - would call actual sync endpoint
      await new Promise(resolve => setTimeout(resolve, 1000));
      setSyncStatus({
        isSuccess: true,
        isError: false,
        data: { message: "WooCommerce synchronisé avec succès" },
      });
    } catch (err) {
      setSyncStatus({
        isSuccess: false,
        isError: true,
        error: err instanceof Error ? err.message : "Erreur de synchronisation WooCommerce",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const syncAll = async (): Promise<void> => {
    setIsLoading(true);
    try {
      // Placeholder implementation - would call actual sync endpoint
      await new Promise(resolve => setTimeout(resolve, 2000));
      setSyncStatus({
        isSuccess: true,
        isError: false,
        data: { message: "Synchronisation complète réussie" },
      });
    } catch (err) {
      setSyncStatus({
        isSuccess: false,
        isError: true,
        error: err instanceof Error ? err.message : "Erreur de synchronisation complète",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getStats = async (): Promise<{ success: boolean; stats?: SyncStats }> => {
    // Placeholder implementation - would fetch actual stats
    return {
      success: true,
      stats: {
        products: {
          total: 0,
          active: 0,
          featured: 0,
        },
        orders: {
          total: 0,
          byStatus: {},
        },
      },
    };
  };

  return {
    syncStatus,
    syncWordPress,
    syncWooCommerce,
    syncAll,
    getStats,
    isLoading,
  };
}
