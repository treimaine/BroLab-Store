import { useUser } from "@clerk/clerk-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import { WishlistItem } from "../../../shared/schema";
import { useToast } from "./use-toast";

// Clés de requête
const WISHLIST_QUERY_KEY = "wishlist";

interface UseWishlistReturn {
  favorites: WishlistItem[];
  isLoading: boolean;
  isError: boolean;
  addFavorite: (beatId: number) => Promise<void>;
  removeFavorite: (beatId: number) => Promise<void>;
  isFavorite: (beatId: number) => boolean;
  refreshFavorites: () => void;
}

export function useWishlist(): UseWishlistReturn {
  const { user: clerkUser } = useUser();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Requête pour récupérer les favoris
  const {
    data: favorites = [],
    isLoading,
    isError,
    refetch: refreshFavorites,
  } = useQuery({
    queryKey: [WISHLIST_QUERY_KEY, clerkUser?.id],
    queryFn: async (): Promise<WishlistItem[]> => {
      if (!clerkUser?.id) {
        return [];
      }

      const response = await fetch("/api/wishlist");
      if (!response.ok) {
        throw new Error("Failed to fetch wishlist");
      }

      return response.json();
    },
    enabled: !!clerkUser?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Mutation pour ajouter un favori
  const addFavoriteMutation = useMutation({
    mutationFn: async (beatId: number): Promise<void> => {
      if (!clerkUser?.id) {
        throw new Error("User must be authenticated to add favorites");
      }

      const response = await fetch("/api/wishlist", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ beat_id: beatId }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to add to wishlist");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [WISHLIST_QUERY_KEY, clerkUser?.id] });
      // Emit favorite change event for real-time updates
      window.dispatchEvent(new CustomEvent("favorite-change"));
      toast({
        title: "Added to Wishlist",
        description: "This beat has been added to your favorites.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add to wishlist",
        variant: "destructive",
      });
    },
  });

  // Mutation pour supprimer un favori
  const removeFavoriteMutation = useMutation({
    mutationFn: async (beatId: number): Promise<void> => {
      if (!clerkUser?.id) {
        throw new Error("User must be authenticated to remove favorites");
      }

      const response = await fetch(`/api/wishlist/${beatId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to remove from wishlist");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [WISHLIST_QUERY_KEY, clerkUser?.id] });
      // Emit favorite change event for real-time updates
      window.dispatchEvent(new CustomEvent("favorite-change"));
      toast({
        title: "Removed from Wishlist",
        description: "This beat has been removed from your favorites.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to remove from wishlist",
        variant: "destructive",
      });
    },
  });

  // Fonctions publiques
  const addFavorite = useCallback(
    async (beatId: number): Promise<void> => {
      if (!clerkUser?.id) {
        toast({
          title: "Authentication Required",
          description: "Please log in to add beats to your wishlist.",
          variant: "destructive",
        });
        return;
      }
      await addFavoriteMutation.mutateAsync(beatId);
    },
    [clerkUser?.id, addFavoriteMutation, toast]
  );

  const removeFavorite = useCallback(
    async (beatId: number): Promise<void> => {
      if (!clerkUser?.id) {
        toast({
          title: "Authentication Required",
          description: "Please log in to manage your wishlist.",
          variant: "destructive",
        });
        return;
      }
      await removeFavoriteMutation.mutateAsync(beatId);
    },
    [clerkUser?.id, removeFavoriteMutation, toast]
  );

  const isFavorite = useCallback(
    (beatId: number): boolean => {
      return favorites.some(item => item.beat_id === beatId);
    },
    [favorites]
  );

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
