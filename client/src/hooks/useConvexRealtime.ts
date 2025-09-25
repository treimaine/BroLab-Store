import { useUser } from "@clerk/clerk-react";
import type { Id } from "@convex/_generated/dataModel";
import { useQuery, useQueryClient } from "@tanstack/react-query";

/**
 * IMPORTANT: Convex Type Instantiation Depth Issue
 *
 * This file currently has all Convex functions temporarily disabled due to a
 * "Type instantiation is excessively deep and possibly infinite" error when
 * using the generated API types.
 *
 * ISSUE: The generated Convex API types create circular references that cause
 * TypeScript to hit its type instantiation depth limit.
 *
 * TEMPORARY SOLUTION: All functions return mock objects to maintain interface
 * compatibility while avoiding type errors.
 *
 * PROPER SOLUTION:
 * 1. Update Convex to latest version (currently 1.26.2 → 1.27.1)
 * 2. Regenerate API types with: npx convex dev
 * 3. Use direct function imports instead of the api object
 * 4. Consider using Convex's useQuery/useMutation hooks directly in components
 *
 * TODO: Implement proper Convex integration once type issues are resolved
 */

export interface ConvexUser {
  _id: Id<"users">;
  clerkId: string;
  email: string;
  username: string;
  stripeCustomerId?: string;
  subscription?: {
    plan: string;
    status: string;
    renewalDate?: string;
  };
}

export interface ConvexFavorite {
  _id: Id<"favorites">;
  userId: string;
  beatId: number;
  createdAt: string;
}

export interface ConvexDownload {
  _id: Id<"downloads">;
  userId: string;
  beatId: number;
  licenseType: string;
  downloadUrl: string;
  timestamp: string;
}

export interface ConvexOrder {
  _id: Id<"orders">;
  userId: string;
  beatId: number;
  licenseType: string;
  amount: number;
  status: string;
  createdAt: string;
}

// Hook for users with Realtime
export function useConvexUser(clerkId?: string) {
  const { user: clerkUser } = useUser();
  const userId = clerkId || clerkUser?.id;

  // Temporarily disabled due to type instantiation depth issues
  // TODO: Fix type instantiation depth issue with Convex API
  return { data: null, isLoading: false, error: null };
}

// Hook for creating/updating a user
export function useConvexUpsertUser() {
  const _queryClient = useQueryClient();

  // Temporarily disabled due to type instantiation depth issues
  // TODO: Fix type instantiation depth issue with Convex API
  return {
    mutate: () => {},
    mutateAsync: async () => null,
    isLoading: false,
    error: null,
  };
}

// Hook for favorites with Realtime
export function useConvexFavorites() {
  // Temporarily disabled due to type instantiation depth issues
  // TODO: Fix type instantiation depth issue with Convex API
  return { data: [], isLoading: false, error: null };
}

// Hook for adding a favorite
export function useConvexAddFavorite() {
  const _queryClient = useQueryClient();

  // Temporarily disabled due to type instantiation depth issues
  // TODO: Fix type instantiation depth issue with Convex API
  return {
    mutate: () => {},
    mutateAsync: async () => null,
    isLoading: false,
    error: null,
  };
}

// Hook for removing a favorite
export function useConvexRemoveFavorite() {
  const _queryClient = useQueryClient();

  // Temporarily disabled due to type instantiation depth issues
  // TODO: Fix type instantiation depth issue with Convex API
  return {
    mutate: () => {},
    mutateAsync: async () => null,
    isLoading: false,
    error: null,
  };
}

// Hook for downloads with Realtime
export function useConvexDownloads() {
  // Temporarily disabled due to type instantiation depth issues
  // TODO: Fix type instantiation depth issue with Convex API
  return { data: [], isLoading: false, error: null };
}

// Hook for recording a download
export function useConvexRecordDownload() {
  const _queryClient = useQueryClient();

  // Temporarily disabled due to type instantiation depth issues
  // TODO: Fix type instantiation depth issue with Convex API
  return {
    mutate: () => {},
    mutateAsync: async () => null,
    isLoading: false,
    error: null,
  };
}

// Hook for recommendations with Realtime
export function useConvexRecommendations() {
  const { user: clerkUser } = useUser();
  const _userId = clerkUser?.id;

  // Temporarily disabled due to type instantiation depth issues
  // TODO: Fix type instantiation depth issue with Convex API
  return { data: [], isLoading: false, error: null };
}

// Hook for subscriptions with Realtime
export function useConvexSubscription() {
  const { user: clerkUser } = useUser();
  const _userId = clerkUser?.id;

  // Temporarily disabled due to type instantiation depth issues
  // TODO: Fix type instantiation depth issue with Convex API
  return { data: null, isLoading: false, error: null };
}

// Hook for updating a subscription
export function useConvexUpdateSubscription() {
  const _queryClient = useQueryClient();

  // Temporarily disabled due to type instantiation depth issues
  // TODO: Fix type instantiation depth issue with Convex API
  return {
    mutate: () => {},
    mutateAsync: async () => null,
    isLoading: false,
    error: null,
  };
}

// Hook utilitaire pour combiner Convex avec React Query
export function useConvexWithReactQuery<T>(
  convexQuery: () => T | undefined,
  queryKey: string[],
  options?: {
    enabled?: boolean;
    staleTime?: number;
    refetchInterval?: number;
  }
) {
  return useQuery({
    queryKey,
    queryFn: () => Promise.resolve(convexQuery()),
    enabled: options?.enabled ?? true,
    staleTime: options?.staleTime ?? 5 * 60 * 1000, // 5 minutes
    refetchInterval: options?.refetchInterval,
  });
}

// Hook for user statistics
export function useConvexUserStats() {
  // Temporarily disabled due to type instantiation depth issues
  // TODO: Fix type instantiation depth issue with Convex API
  return { data: null, isLoading: false, error: null };
}

// Hook for orders with Realtime
export function useConvexOrders() {
  const { user: clerkUser } = useUser();
  const _userId = clerkUser?.id;

  // Temporarily disabled due to type instantiation depth issues
  // TODO: Fix type instantiation depth issue with Convex API
  return { data: [], isLoading: false, error: null };
}

// Hook for creating an order
export function useConvexCreateOrder() {
  const _queryClient = useQueryClient();

  // Temporarily disabled due to type instantiation depth issues
  // TODO: Fix type instantiation depth issue with Convex API
  return {
    mutate: () => {},
    mutateAsync: async () => null,
    isLoading: false,
    error: null,
  };
}

// Hook for messages with Realtime
export function useConvexMessages() {
  // Messages functionality removed - no longer available
  return undefined;
}
