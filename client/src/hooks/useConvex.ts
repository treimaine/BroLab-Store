import { useUser } from "@clerk/clerk-react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../lib/convex";

/**
 * Custom hooks for Convex integration with proper TypeScript support
 * These hooks use the actual API structure from your Convex functions
 */

// User-related hooks
export function useCurrentUser() {
  const { user } = useUser();

  const convexUser = useQuery(api.users.getUserByClerkId, user?.id ? { clerkId: user.id } : "skip");

  return {
    clerkUser: user,
    convexUser,
    isLoading: !user || convexUser === undefined,
    isAuthenticated: !!user && !!convexUser,
  };
}

// Favorites hooks using the actual API structure
export function useFavorites() {
  const { convexUser } = useCurrentUser();

  return useQuery(
    api.favorites.getFavorites,
    convexUser?.id ? { userId: convexUser.id } : "skip"
  );
}

export function useAddToFavorites() {
  return useMutation(api.favorites.add.addToFavorites);
}

export function useRemoveFromFavorites() {
  return useMutation(api.favorites.remove.removeFromFavorites);
}

// User stats hook for dashboard
export function useUserStats() {
  const { user } = useUser();

  return useQuery(api.users.getUserStatsByClerkId, user?.id ? { clerkId: user.id } : "skip");
}

// Simplified hooks for common operations
export function useUpsertUser() {
  return useMutation(api.users.upsertUser);
}

export function useUpdateUserAvatar() {
  return useMutation(api.users.updateUserAvatar);
}
