import { useUser } from "@clerk/clerk-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMutation as useConvexMutation, useQuery as useConvexQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";

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

// Hook pour les utilisateurs avec Realtime
export function useConvexUser(clerkId?: string) {
  const { user: clerkUser } = useUser();
  const userId = clerkId || clerkUser?.id;

  return useConvexQuery(api.users.getUserByClerkId, userId ? { clerkId: userId } : "skip");
}

// Hook pour créer/mettre à jour un utilisateur
export function useConvexUpsertUser() {
  const mutation = useConvexMutation(api.users.upsertUser);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (userData: { clerkId: string; email: string; username: string }) => {
      return mutation(userData);
    },
    onSuccess: (_, variables) => {
      // Invalider les requêtes utilisateur
      queryClient.invalidateQueries({ queryKey: ["convex", "user", variables.clerkId] });
    },
  });
}

// Hook pour les favoris avec Realtime
export function useConvexFavorites() {
  const { user: clerkUser } = useUser();
  const userId = clerkUser?.id;

  return useConvexQuery(api.favorites.getFavorites.getFavorites, userId ? {} : "skip");
}

// Hook pour ajouter un favori
export function useConvexAddFavorite() {
  const mutation = useConvexMutation(api.favorites.add.addToFavorites);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (beatId: number) => {
      return mutation({ beatId });
    },
    onSuccess: () => {
      // Invalider les requêtes favoris
      queryClient.invalidateQueries({ queryKey: ["convex", "favorites"] });
      // Émettre un événement pour les mises à jour en temps réel
      window.dispatchEvent(new CustomEvent("favorite-change"));
    },
  });
}

// Hook pour supprimer un favori
export function useConvexRemoveFavorite() {
  const mutation = useConvexMutation(api.favorites.remove.removeFromFavorites);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (beatId: number) => {
      return mutation({ beatId });
    },
    onSuccess: () => {
      // Invalider les requêtes favoris
      queryClient.invalidateQueries({ queryKey: ["convex", "favorites"] });
      // Émettre un événement pour les mises à jour en temps réel
      window.dispatchEvent(new CustomEvent("favorite-change"));
    },
  });
}

// Hook pour les téléchargements avec Realtime
export function useConvexDownloads() {
  const { user: clerkUser } = useUser();
  const userId = clerkUser?.id;

  return useConvexQuery(api.downloads.record.getUserDownloads, userId ? {} : "skip");
}

// Hook pour enregistrer un téléchargement
export function useConvexRecordDownload() {
  const mutation = useConvexMutation(api.downloads.record.recordDownload);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (downloadData: {
      beatId: number;
      licenseType: string;
      downloadUrl?: string;
    }) => {
      return mutation(downloadData);
    },
    onSuccess: () => {
      // Invalider les requêtes téléchargements
      queryClient.invalidateQueries({ queryKey: ["convex", "downloads"] });
      // Émettre un événement pour les mises à jour en temps réel
      window.dispatchEvent(new CustomEvent("download-success"));
    },
  });
}

// Hook pour les recommandations avec Realtime
export function useConvexRecommendations() {
  const { user: clerkUser } = useUser();
  const userId = clerkUser?.id;

  return useConvexQuery(api.products.forYou.getForYouBeats, userId ? { limit: 12 } : "skip");
}

// Hook pour les abonnements avec Realtime
export function useConvexSubscription() {
  const { user: clerkUser } = useUser();
  const userId = clerkUser?.id;

  return useConvexQuery(
    api.subscriptions.getSubscription.getCurrentUserSubscription,
    userId ? { clerkId: userId } : "skip"
  );
}

// Hook pour mettre à jour un abonnement
export function useConvexUpdateSubscription() {
  const mutation = useConvexMutation(api.subscriptions.updateSubscription.updateSubscription);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (subscriptionData: { clerkId: string; plan?: string; status?: string }) => {
      return mutation({
        userId: subscriptionData.clerkId as any,
        plan: subscriptionData.plan,
        stripeCustomerId: subscriptionData.clerkId,
      });
    },
    onSuccess: () => {
      // Invalider les requêtes abonnement
      queryClient.invalidateQueries({ queryKey: ["convex", "subscription"] });
    },
  });
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

// Hook pour les statistiques utilisateur
export function useConvexUserStats() {
  const { user: clerkUser } = useUser();
  const userId = clerkUser?.id;

  return useConvexQuery(api.users.getUserStats.getUserStats, userId ? {} : "skip");
}

// Hook pour les commandes avec Realtime
export function useConvexOrders() {
  const { user: clerkUser } = useUser();
  const userId = clerkUser?.id;

  return useConvexQuery(api.users.getUserStats.getUserStats, userId ? {} : "skip");
}

// Hook pour créer une commande
export function useConvexCreateOrder() {
  const mutation = useConvexMutation(api.orders.createOrder);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (orderData: {
      clerkId: string;
      items: Array<{
        beatId: number;
        licenseType: string;
        price: number;
      }>;
      total: number;
    }) => {
      return mutation({
        email: "",
        total: orderData.total,
        status: "pending",
        items: orderData.items.map(item => ({
          name: `Beat ${item.beatId}`,
          productId: item.beatId,
          price: item.price,
          license: item.licenseType,
          quantity: 1,
        })),
      });
    },
    onSuccess: () => {
      // Invalider les requêtes commandes
      queryClient.invalidateQueries({ queryKey: ["convex", "orders"] });
    },
  });
}

// Hook pour les messages avec Realtime
export function useConvexMessages() {
  // Messages functionality removed - no longer available
  return undefined;
}
