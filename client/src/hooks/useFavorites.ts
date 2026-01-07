import { useConvexQueryEnabled } from "@/hooks/useConvexVisibility";
import { api } from "@/lib/convex-api";
import { useUser } from "@clerk/clerk-react";
import { useMutation, useQuery } from "convex/react";

/**
 * Favorite item returned from Convex
 */
export interface Favorite {
  _id: string;
  _creationTime: number;
  userId: string;
  beatId: number;
  createdAt: number;
}

/**
 * Beat metadata for enrichment when adding to favorites
 */
export interface BeatMetadata {
  title?: string;
  genre?: string;
  imageUrl?: string;
  audioUrl?: string;
  price?: number;
  bpm?: number;
}

/**
 * Hook for managing user favorites using Convex
 * Provides real-time synchronization of favorite beats
 */
export function useFavorites() {
  const { user, isLoaded } = useUser();
  const isAuthenticated = Boolean(user && isLoaded);

  // FIX: Check if Convex queries should be active (visibility-aware)
  const isConvexEnabled = useConvexQueryEnabled();

  // Query favorites - skip query if user is not authenticated or tab is hidden
  const favorites = useQuery(
    api.favorites.getFavorites.getFavorites as never,
    isAuthenticated && isConvexEnabled ? {} : "skip"
  ) as Favorite[] | undefined;

  // Mutations - typed as any to avoid Convex type instantiation issues
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const addToFavoritesMutation = useMutation(api.favorites.add.addToFavorites as any);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const removeFromFavoritesMutation = useMutation(api.favorites.remove.removeFromFavorites as any);

  /**
   * Check if a beat is in the user's favorites
   */
  const isFavorite = (beatId: number): boolean => {
    if (!favorites || !Array.isArray(favorites)) return false;
    return favorites.some((fav: Favorite) => fav.beatId === beatId);
  };

  /**
   * Add a beat to favorites with optional metadata for enrichment
   */
  const addToFavorites = async (beatId: number, metadata?: BeatMetadata): Promise<void> => {
    if (!isAuthenticated) {
      throw new Error("User must be authenticated to add favorites");
    }

    await addToFavoritesMutation({
      beatId,
      beatTitle: metadata?.title,
      beatGenre: metadata?.genre,
      beatImageUrl: metadata?.imageUrl,
      beatAudioUrl: metadata?.audioUrl,
      beatPrice: metadata?.price,
      beatBpm: metadata?.bpm,
    });
  };

  /**
   * Remove a beat from favorites
   */
  const removeFromFavorites = async (beatId: number): Promise<void> => {
    if (!isAuthenticated) {
      throw new Error("User must be authenticated to remove favorites");
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await removeFromFavoritesMutation({ beatId } as any);
  };

  /**
   * Toggle favorite status for a beat
   */
  const toggleFavorite = async (beatId: number): Promise<void> => {
    if (!isAuthenticated) {
      throw new Error("User must be authenticated to manage favorites");
    }

    if (isFavorite(beatId)) {
      await removeFromFavorites(beatId);
    } else {
      await addToFavorites(beatId);
    }
  };

  return {
    favorites: favorites || [],
    isLoading: favorites === undefined && isAuthenticated,
    isAuthenticated,
    isFavorite,
    addToFavorites,
    removeFromFavorites,
    toggleFavorite,
    // Loading states for mutations (for UI feedback)
    isAdding: false,
    isRemoving: false,
  };
}
