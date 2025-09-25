import { useUser } from "@clerk/clerk-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useMutation as useConvexMutation, useQuery } from "convex/react";
import { api } from "../lib/convex-api";

// Type definitions for favorites
interface Favorite {
  _id: string;
  beatId: number;
  userId: string;
}

interface FavoriteWithBeat extends Favorite {
  beat?: {
    id: number;
    title: string;
    artist: string;
    // Add other beat properties as needed
  };
}

export const useFavorites = () => {
  const queryClient = useQueryClient();
  const { user: clerkUser, isLoaded } = useUser();

  // Use Convex queries with proper error handling
  const favorites = useQuery(
    api.favorites.getFavorites.getFavorites,
    clerkUser && isLoaded ? {} : "skip"
  ) as Favorite[] | undefined;

  const favoritesWithBeats = useQuery(
    api.favorites.getFavorites.getFavoritesWithBeats,
    clerkUser && isLoaded ? {} : "skip"
  ) as FavoriteWithBeat[] | undefined;

  // Convex mutations
  const addToFavoritesMutation = useConvexMutation(api.favorites.add.addToFavorites);
  const removeFromFavoritesMutation = useConvexMutation(api.favorites.remove.removeFromFavorites);

  const addToFavorites = useMutation({
    mutationFn: async (beatId: number) => {
      return await addToFavoritesMutation({ beatId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["favorites"] });
      queryClient.invalidateQueries({ queryKey: ["favoritesWithBeats"] });
      queryClient.invalidateQueries({ queryKey: ["forYouBeats"] });
    },
  });

  const removeFromFavorites = useMutation({
    mutationFn: async (beatId: number) => {
      return await removeFromFavoritesMutation({ beatId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["favorites"] });
      queryClient.invalidateQueries({ queryKey: ["favoritesWithBeats"] });
      queryClient.invalidateQueries({ queryKey: ["forYouBeats"] });
    },
  });

  const isFavorite = (beatId: number): boolean => {
    return (favorites || []).some((fav: Favorite) => fav.beatId === beatId);
  };

  return {
    favorites: favorites || [],
    favoritesWithBeats: favoritesWithBeats || [],
    isLoading:
      !isLoaded || (clerkUser && (favorites === undefined || favoritesWithBeats === undefined)),
    addToFavorites: addToFavorites.mutate,
    removeFromFavorites: removeFromFavorites.mutate,
    isAdding: addToFavorites.isPending,
    isRemoving: removeFromFavorites.isPending,
    isFavorite,
  };
};
