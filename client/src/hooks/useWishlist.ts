import { apiService, isApiError } from "@/services/ApiService";
import { notificationService } from "@/services/NotificationService";
import { useUser } from "@clerk/clerk-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import { WishlistItem } from "../../../shared/schema";

// Query keys
const WISHLIST_QUERY_KEY = "wishlist";

interface UseWishlistReturn {
  favorites: WishlistItem[];
  isLoading: boolean;
  isError: boolean;
  addFavorite: (beatId: number) => Promise<void>;
  removeFavorite: (beatId: number) => Promise<void>;
  isFavorite: (beatId: number) => boolean;
  refreshFavorites: () => Promise<void>;
}

export function useWishlist(): UseWishlistReturn {
  const { user: clerkUser } = useUser();
  const queryClient = useQueryClient();

  // Query to fetch favorites
  const {
    data: favorites = [],
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: [WISHLIST_QUERY_KEY, clerkUser?.id],
    queryFn: async (): Promise<WishlistItem[]> => {
      if (!clerkUser?.id) {
        return [];
      }

      const response = await apiService.get<WishlistItem[]>("/wishlist", {
        requireAuth: true,
      });
      return response.data;
    },
    enabled: !!clerkUser?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Mutation to add a favorite
  const addFavoriteMutation = useMutation({
    mutationFn: async (beatId: number): Promise<void> => {
      if (!clerkUser?.id) {
        throw new Error("User must be authenticated to add favorites");
      }

      await apiService.post("/wishlist", { beat_id: beatId }, { requireAuth: true });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [WISHLIST_QUERY_KEY, clerkUser?.id] });
      // Emit favorite change event for real-time updates
      globalThis.dispatchEvent(new CustomEvent("favorite-change"));
      notificationService.success("This beat has been added to your favorites.", {
        title: "Added to Wishlist",
      });
    },
    onError: (error: Error) => {
      const message = isApiError(error) ? String(error.body) : error.message;
      notificationService.error(message || "Failed to add to wishlist");
    },
  });

  // Mutation to remove a favorite
  const removeFavoriteMutation = useMutation({
    mutationFn: async (beatId: number): Promise<void> => {
      if (!clerkUser?.id) {
        throw new Error("User must be authenticated to remove favorites");
      }

      await apiService.delete(`/wishlist/${beatId}`, { requireAuth: true });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [WISHLIST_QUERY_KEY, clerkUser?.id] });
      // Emit favorite change event for real-time updates
      globalThis.dispatchEvent(new CustomEvent("favorite-change"));
      notificationService.success("This beat has been removed from your favorites.", {
        title: "Removed from Wishlist",
      });
    },
    onError: (error: Error) => {
      const message = isApiError(error) ? String(error.body) : error.message;
      notificationService.error(message || "Failed to remove from wishlist");
    },
  });

  // Public functions
  const addFavorite = useCallback(
    async (beatId: number): Promise<void> => {
      if (!clerkUser?.id) {
        notificationService.error("Please log in to add beats to your wishlist.", {
          title: "Authentication Required",
        });
        return;
      }
      await addFavoriteMutation.mutateAsync(beatId);
    },
    [clerkUser?.id, addFavoriteMutation]
  );

  const removeFavorite = useCallback(
    async (beatId: number): Promise<void> => {
      if (!clerkUser?.id) {
        notificationService.error("Please log in to manage your wishlist.", {
          title: "Authentication Required",
        });
        return;
      }
      await removeFavoriteMutation.mutateAsync(beatId);
    },
    [clerkUser?.id, removeFavoriteMutation]
  );

  const isFavorite = useCallback(
    (beatId: number): boolean => {
      return favorites.some(item => item.beat_id === beatId);
    },
    [favorites]
  );

  const refreshFavorites = useCallback(async (): Promise<void> => {
    await refetch();
  }, [refetch]);

  return {
    favorites,
    isLoading,
    isError,
    addFavorite,
    removeFavorite,
    isFavorite,
    refreshFavorites,
  };
}
