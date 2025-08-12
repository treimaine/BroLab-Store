import { useUser } from "@clerk/clerk-react";
import { api } from "@convex/_generated/api";
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMutation as useConvexMutation, useQuery as useConvexQuery } from "convex/react";
import { useCallback, useMemo } from "react";

// Configuration des requêtes optimisées
const QUERY_CONFIG = {
  // Temps de fraîcheur par défaut (5 minutes)
  defaultStaleTime: 5 * 60 * 1000,

  // Temps de fraîcheur pour les données critiques (1 minute)
  criticalStaleTime: 1 * 60 * 1000,

  // Temps de fraîcheur pour les données statiques (30 minutes)
  staticStaleTime: 30 * 60 * 1000,

  // Intervalle de refetch pour les données en temps réel (10 secondes)
  realtimeRefetchInterval: 10 * 1000,

  // Nombre de tentatives par défaut
  defaultRetry: 3,

  // Délai entre les tentatives
  retryDelay: 1000,
};

// Hook pour les requêtes Convex optimisées avec React Query
export function useOptimizedConvexQuery<T>(
  convexQuery: () => T | undefined,
  queryKey: string[],
  options?: {
    enabled?: boolean;
    staleTime?: number;
    refetchInterval?: number;
    retry?: number;
    retryDelay?: number;
    select?: (data: T) => any;
  }
) {
  const convexData = convexQuery();

  return useQuery({
    queryKey,
    queryFn: async () => {
      if (convexData === undefined) {
        throw new Error("Data not available");
      }
      return convexData;
    },
    enabled: (options?.enabled ?? true) && convexData !== undefined,
    staleTime: options?.staleTime ?? QUERY_CONFIG.defaultStaleTime,
    refetchInterval: options?.refetchInterval,
    retry: options?.retry ?? QUERY_CONFIG.defaultRetry,
    retryDelay: options?.retryDelay ?? QUERY_CONFIG.retryDelay,
    initialData: convexData,
    select: options?.select,
  });
}

// Hook pour les requêtes infinies optimisées
export function useOptimizedInfiniteQuery<T>(
  queryKey: string[],
  queryFn: (pageParam: any) => Promise<T>,
  options?: {
    enabled?: boolean;
    staleTime?: number;
    pageSize?: number;
    getNextPageParam?: (lastPage: T, allPages: T[]) => any;
  }
) {
  return useInfiniteQuery({
    queryKey,
    queryFn: ({ pageParam }) => queryFn(pageParam),
    enabled: options?.enabled ?? true,
    staleTime: options?.staleTime ?? QUERY_CONFIG.defaultStaleTime,
    getNextPageParam: options?.getNextPageParam ?? (() => undefined),
    initialPageParam: 0,
  });
}

// Hook pour les mutations optimisées
export function useOptimizedMutation<TData, TVariables>(
  mutationFn: (variables: TVariables) => Promise<TData>,
  options?: {
    onSuccess?: (data: TData, variables: TVariables) => void;
    onError?: (error: Error, variables: TVariables) => void;
    invalidateQueries?: string[][];
  }
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn,
    onSuccess: (data, variables) => {
      // Invalider les requêtes spécifiées
      if (options?.invalidateQueries) {
        options.invalidateQueries.forEach(queryKey => {
          queryClient.invalidateQueries({ queryKey });
        });
      }

      // Appeler le callback onSuccess
      options?.onSuccess?.(data, variables);
    },
    onError: (error, variables) => {
      options?.onError?.(error, variables);
    },
  });
}

// Hook pour les données utilisateur optimisées
export function useOptimizedUserData() {
  const { user: clerkUser, isLoaded: isUserLoaded } = useUser();

  // Requête pour l'utilisateur
  const convexUser = useConvexQuery(
    api.users.getUserByClerkId,
    clerkUser?.id ? { clerkId: clerkUser.id } : "skip"
  );

  // Requête pour les favoris
  const favorites = useConvexQuery(
    api.favorites.getFavorites.getFavorites,
    clerkUser?.id ? {} : "skip"
  );

  // Requête pour les téléchargements
  const downloads = useConvexQuery(
    api.downloads.record.getUserDownloads,
    clerkUser?.id ? {} : "skip"
  );

  // Requête pour l'abonnement
  const subscription = useConvexQuery(
    api.subscriptions.getSubscription.getCurrentUserSubscription,
    clerkUser?.id ? { clerkId: clerkUser.id } : "skip"
  );

  // Calculer les statistiques
  const stats = useMemo(() => {
    if (!clerkUser) return null;

    return {
      totalFavorites: favorites?.length || 0,
      totalDownloads: downloads?.length || 0,
      isSubscribed: subscription?.status === "active",
      plan: subscription?.plan || "free",
      memberSince: clerkUser.createdAt,
      lastActivity: downloads?.[0]?.timestamp || null,
    };
  }, [clerkUser, favorites, downloads, subscription]);

  return {
    user: convexUser,
    favorites,
    downloads,
    subscription,
    stats,
    isLoading: !isUserLoaded || !convexUser || !favorites || !downloads || !subscription,
  };
}

// Hook pour les recommandations optimisées
export function useOptimizedRecommendations(limit = 12) {
  const { user: clerkUser } = useUser();

  return useOptimizedConvexQuery(
    () => useConvexQuery(api.products.forYou.getForYouBeats, clerkUser?.id ? { limit } : "skip"),
    ["convex", "recommendations", clerkUser?.id || "", limit.toString()],
    {
      staleTime: QUERY_CONFIG.criticalStaleTime,
      refetchInterval: QUERY_CONFIG.realtimeRefetchInterval,
      enabled: !!clerkUser?.id,
    }
  );
}

// Hook pour l'activité utilisateur optimisée
export function useOptimizedUserActivity(limit = 20) {
  const { user: clerkUser } = useUser();

  return useOptimizedConvexQuery(
    () => useConvexQuery(api.downloads.record.getUserDownloads, clerkUser?.id ? {} : "skip"),
    ["convex", "activity", clerkUser?.id || "", limit.toString()],
    {
      staleTime: QUERY_CONFIG.criticalStaleTime,
      refetchInterval: QUERY_CONFIG.realtimeRefetchInterval,
      enabled: !!clerkUser?.id,
    }
  );
}

// Hook pour les commandes optimisées
export function useOptimizedOrders(page = 1, limit = 10) {
  const { user: clerkUser } = useUser();

  return useOptimizedConvexQuery(
    () => useConvexQuery(api.users.getUserStats.getUserStats, clerkUser?.id ? {} : "skip"),
    ["convex", "orders", clerkUser?.id || "", page.toString(), limit.toString()],
    {
      staleTime: QUERY_CONFIG.defaultStaleTime,
      enabled: !!clerkUser?.id,
    }
  );
}

// Hook pour les mutations de favoris optimisées
export function useOptimizedFavoriteMutations() {
  const queryClient = useQueryClient();
  const { user: clerkUser } = useUser();

  const addFavoriteMutation = useConvexMutation(api.favorites.add.addToFavorites);
  const removeFavoriteMutation = useConvexMutation(api.favorites.remove.removeFromFavorites);

  const addFavorite = useOptimizedMutation(
    async (beatId: number) => {
      if (!clerkUser?.id) throw new Error("User not authenticated");
      return addFavoriteMutation({ beatId });
    },
    {
      invalidateQueries: [
        ["convex", "favorites", clerkUser?.id || ""],
        ["convex", "recommendations", clerkUser?.id || ""],
      ],
      onSuccess: () => {
        window.dispatchEvent(new CustomEvent("favorite-change"));
      },
    }
  );

  const removeFavorite = useOptimizedMutation(
    async (beatId: number) => {
      if (!clerkUser?.id) throw new Error("User not authenticated");
      return removeFavoriteMutation({ beatId });
    },
    {
      invalidateQueries: [
        ["convex", "favorites", clerkUser?.id || ""],
        ["convex", "recommendations", clerkUser?.id || ""],
      ],
      onSuccess: () => {
        window.dispatchEvent(new CustomEvent("favorite-change"));
      },
    }
  );

  return {
    addFavorite,
    removeFavorite,
  };
}

// Hook pour les mutations de téléchargement optimisées
export function useOptimizedDownloadMutations() {
  const queryClient = useQueryClient();
  const { user: clerkUser } = useUser();

  const recordDownloadMutation = useConvexMutation(api.downloads.record.recordDownload);

  const recordDownload = useOptimizedMutation(
    async (downloadData: { beatId: number; licenseType: string; downloadUrl: string }) => {
      if (!clerkUser?.id) throw new Error("User not authenticated");
      return recordDownloadMutation(downloadData);
    },
    {
      invalidateQueries: [
        ["convex", "downloads", clerkUser?.id || ""],
        ["convex", "activity", clerkUser?.id || ""],
        ["convex", "user-stats", clerkUser?.id || ""],
      ],
      onSuccess: () => {
        window.dispatchEvent(new CustomEvent("download-success"));
      },
    }
  );

  return {
    recordDownload,
  };
}

// Hook pour la synchronisation des données
export function useDataSync() {
  const queryClient = useQueryClient();
  const { user: clerkUser } = useUser();

  const syncUserData = useCallback(async () => {
    if (!clerkUser?.id) return;

    // Invalider toutes les requêtes utilisateur
    await queryClient.invalidateQueries({
      queryKey: ["convex", "user", clerkUser.id],
    });
    await queryClient.invalidateQueries({
      queryKey: ["convex", "favorites", clerkUser.id],
    });
    await queryClient.invalidateQueries({
      queryKey: ["convex", "downloads", clerkUser.id],
    });
    await queryClient.invalidateQueries({
      queryKey: ["convex", "subscription", clerkUser.id],
    });
  }, [queryClient, clerkUser?.id]);

  return {
    syncUserData,
  };
}
