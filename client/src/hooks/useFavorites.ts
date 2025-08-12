import { api } from "@convex/_generated/api";
import { useMutation as useConvexMutation, useQuery as useConvexQuery } from "convex/react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useUser } from "@clerk/clerk-react";

export const useFavorites = () => {
  const queryClient = useQueryClient();
  const { user: clerkUser } = useUser();

  const favorites = useConvexQuery(
    api.favorites.getFavorites.getFavorites,
    clerkUser?.id ? {} : "skip"
  );

  const favoritesWithBeats = useConvexQuery(
    api.favorites.getFavorites.getFavoritesWithBeats,
    clerkUser?.id ? {} : "skip"
  );

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

  const isFavorite = (beatId: number) => {
    return (favorites || []).some(fav => fav.beatId === beatId);
  };

  return {
    favorites: favorites || [],
    favoritesWithBeats: favoritesWithBeats || [],
    isLoading: favorites === undefined || favoritesWithBeats === undefined,
    addToFavorites: addToFavorites.mutate,
    removeFromFavorites: removeFromFavorites.mutate,
    isAdding: addToFavorites.isPending,
    isRemoving: removeFromFavorites.isPending,
    isFavorite,
  };
};
