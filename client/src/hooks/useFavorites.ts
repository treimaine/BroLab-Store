import { api } from "@/lib/convex-api";
import { useUser } from "@clerk/clerk-react";
import { useMutation, useQuery } from "convex/react";

interface Favorite {
  beat_id: number;
  userId?: string;
  createdAt?: string;
}

/**
 * Hook for managing user favorites using Convex
 */
export function useFavorites() {
  const { user } = useUser();

  // Query favorites - skip query if user is not authenticated
  const favorites = useQuery(api.favorites.getFavorites.getFavorites, user ? {} : undefined) as
    | Favorite[]
    | undefined;

  // Mutations
  const addToFavorites = useMutation(api.favorites.add.addToFavorites);
  const removeFromFavorites = useMutation(api.favorites.remove.removeFromFavorites);

  // Helper to check if a beat is favorited
  const isFavorite = (beatId: number): boolean => {
    if (!favorites) return false;
    return favorites.some((fav: Favorite) => fav.beat_id === beatId);
  };

  // Toggle favorite status
  const toggleFavorite = async (beatId: number) => {
    if (!user) {
      throw new Error("User must be authenticated to manage favorites");
    }

    if (isFavorite(beatId)) {
      await removeFromFavorites({ beatId });
    } else {
      await addToFavorites({ beatId });
    }
  };

  return {
    favorites: favorites || [],
    isLoading: favorites === undefined,
    isFavorite,
    addToFavorites: async (beatId: number) => {
      if (!user) throw new Error("User must be authenticated");
      await addToFavorites({ beatId });
    },
    removeFromFavorites: async (beatId: number) => {
      if (!user) throw new Error("User must be authenticated");
      await removeFromFavorites({ beatId });
    },
    toggleFavorite,
  };
}
