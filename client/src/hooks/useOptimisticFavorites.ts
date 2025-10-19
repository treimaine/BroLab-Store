/**
 * Optimistic Favorites Hook
 *
 * Provides optimistic updates for favorites with rollback capability.
 *
 * Requirements addressed:
 * - 4.2: Optimistic updates for favorites with rollback capability
 * - 4.1: Real-time updates without full page refreshes
 */

import { useOptimisticUpdates, useRealtimeContext } from "@/providers/DashboardRealtimeProvider";
import type { Favorite } from "@shared/types/dashboard";
import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useState } from "react";

export interface OptimisticFavoritesHook {
  // Actions
  addFavorite: (beatId: number, beatData?: Partial<Favorite>) => Promise<void>;
  removeFavorite: (favoriteId: string) => Promise<void>;

  // State
  pendingOperations: Set<string>;
  isOptimistic: (favoriteId: string) => boolean;

  // Error handling
  rollbackFavorite: (favoriteId: string) => void;
  clearPendingOperations: () => void;
}

export function useOptimisticFavorites(): OptimisticFavoritesHook {
  const queryClient = useQueryClient();
  const { addOptimisticUpdate, rollbackOptimisticUpdate } = useOptimisticUpdates();
  const { emit } = useRealtimeContext();
  const [pendingOperations, setPendingOperations] = useState<Set<string>>(new Set());
  const [optimisticIds, setOptimisticIds] = useState<Set<string>>(new Set());

  // Add favorite with optimistic update
  const addFavorite = useCallback(
    async (beatId: number, beatData?: Partial<Favorite>) => {
      const tempId = `temp-fav-${Date.now()}-${beatId}`;
      const optimisticFavorite: Favorite = {
        id: tempId,
        beatId,
        beatTitle: beatData?.beatTitle || `Beat ${beatId}`,
        beatArtist: beatData?.beatArtist,
        beatImageUrl: beatData?.beatImageUrl,
        beatGenre: beatData?.beatGenre,
        beatBpm: beatData?.beatBpm,
        beatPrice: beatData?.beatPrice,
        createdAt: new Date().toISOString(),
      };

      // Add to pending operations
      setPendingOperations(prev => new Set(prev).add(tempId));
      setOptimisticIds(prev => new Set(prev).add(tempId));

      // Apply optimistic update
      const updateId = addOptimisticUpdate({
        type: "favorite_added",
        data: optimisticFavorite,
        rollback: () => {
          // Remove from query cache
          queryClient.setQueryData(["convex", "dashboard.getDashboardData"], (oldData: any) => {
            if (!oldData) return oldData;
            return {
              ...oldData,
              favorites: oldData.favorites.filter((fav: Favorite) => fav.id !== tempId),
              stats: {
                ...oldData.stats,
                totalFavorites: Math.max(0, oldData.stats.totalFavorites - 1),
              },
            };
          });
        },
      });

      try {
        // Emit real-time event
        emit({
          type: "favorite_added",
          userId: "current-user", // This would come from useUser()
          data: { beatId, ...beatData },
        });

        // In a real implementation, this would call a Convex mutation
        // For now, we'll simulate the API call
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Success - remove from pending operations
        setPendingOperations(prev => {
          const newSet = new Set(prev);
          newSet.delete(tempId);
          return newSet;
        });

        // Invalidate queries to get the real data
        await queryClient.invalidateQueries({
          queryKey: ["convex", "favorites.getFavorites"],
        });
        await queryClient.invalidateQueries({
          queryKey: ["convex", "dashboard.getDashboardData"],
        });
      } catch (error) {
        console.error("Failed to add favorite:", error);

        // Rollback optimistic update
        rollbackOptimisticUpdate(updateId);

        // Remove from pending operations
        setPendingOperations(prev => {
          const newSet = new Set(prev);
          newSet.delete(tempId);
          return newSet;
        });
        setOptimisticIds(prev => {
          const newSet = new Set(prev);
          newSet.delete(tempId);
          return newSet;
        });

        throw error;
      }
    },
    [addOptimisticUpdate, rollbackOptimisticUpdate, emit, queryClient]
  );

  // Remove favorite with optimistic update
  const removeFavorite = useCallback(
    async (favoriteId: string) => {
      // Get current favorite data for rollback
      const currentData = queryClient.getQueryData(["convex", "dashboard.getDashboardData"]) as any;
      const favoriteToRemove = currentData?.favorites?.find(
        (fav: Favorite) => fav.id === favoriteId
      );

      if (!favoriteToRemove) {
        console.warn("Favorite not found for removal:", favoriteId);
        return;
      }

      // Add to pending operations
      setPendingOperations(prev => new Set(prev).add(favoriteId));

      // Apply optimistic update
      const updateId = addOptimisticUpdate({
        type: "favorite_removed",
        data: { id: favoriteId },
        rollback: () => {
          // Restore favorite in query cache
          queryClient.setQueryData(["convex", "dashboard.getDashboardData"], (oldData: any) => {
            if (!oldData) return oldData;
            return {
              ...oldData,
              favorites: [...oldData.favorites, favoriteToRemove],
              stats: {
                ...oldData.stats,
                totalFavorites: oldData.stats.totalFavorites + 1,
              },
            };
          });
        },
      });

      try {
        // Emit real-time event
        emit({
          type: "favorite_removed",
          userId: "current-user", // This would come from useUser()
          data: { id: favoriteId, beatId: favoriteToRemove.beatId },
        });

        // In a real implementation, this would call a Convex mutation
        // For now, we'll simulate the API call
        await new Promise(resolve => setTimeout(resolve, 500));

        // Success - remove from pending operations
        setPendingOperations(prev => {
          const newSet = new Set(prev);
          newSet.delete(favoriteId);
          return newSet;
        });

        // Invalidate queries to get the real data
        await queryClient.invalidateQueries({
          queryKey: ["convex", "favorites.getFavorites"],
        });
        await queryClient.invalidateQueries({
          queryKey: ["convex", "dashboard.getDashboardData"],
        });
      } catch (error) {
        console.error("Failed to remove favorite:", error);

        // Rollback optimistic update
        rollbackOptimisticUpdate(updateId);

        // Remove from pending operations
        setPendingOperations(prev => {
          const newSet = new Set(prev);
          newSet.delete(favoriteId);
          return newSet;
        });

        throw error;
      }
    },
    [addOptimisticUpdate, rollbackOptimisticUpdate, emit, queryClient]
  );

  // Check if a favorite is optimistic (temporary)
  const isOptimistic = useCallback(
    (favoriteId: string) => {
      return optimisticIds.has(favoriteId);
    },
    [optimisticIds]
  );

  // Rollback a specific favorite
  const rollbackFavorite = useCallback((favoriteId: string) => {
    // This would rollback the specific favorite update
    // For now, we'll just remove it from pending operations
    setPendingOperations(prev => {
      const newSet = new Set(prev);
      newSet.delete(favoriteId);
      return newSet;
    });
    setOptimisticIds(prev => {
      const newSet = new Set(prev);
      newSet.delete(favoriteId);
      return newSet;
    });
  }, []);

  // Clear all pending operations
  const clearPendingOperations = useCallback(() => {
    setPendingOperations(new Set());
    setOptimisticIds(new Set());
  }, []);

  return {
    addFavorite,
    removeFavorite,
    pendingOperations,
    isOptimistic,
    rollbackFavorite,
    clearPendingOperations,
  };
}

// Hook for checking if any favorites operations are pending
export function useFavoritesPendingState() {
  const { pendingOperations } = useOptimisticFavorites();

  return {
    hasPendingOperations: pendingOperations.size > 0,
    pendingCount: pendingOperations.size,
    isPending: (favoriteId: string) => pendingOperations.has(favoriteId),
  };
}
