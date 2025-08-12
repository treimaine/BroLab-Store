import { useAuth, useUser } from "@clerk/clerk-react";
import { useMutation } from "convex/react";
import { useState } from "react";
import { api } from "../../../convex/_generated/api";

export interface BillingPlan {
  id: string;
  name: string;
  price: number;
  interval: "month" | "year";
  features: string[];
}

export interface CheckoutSession {
  id: string;
  url: string;
  status: "open" | "complete" | "expired";
}

export function useClerkBilling() {
  const { user } = useUser();
  const { has } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createOrderMutation = useMutation(api.orders.createOrder);

  // Vérifier si l'utilisateur a un plan spécifique
  const hasPlan = (plan: string) => {
    return has && has({ plan });
  };

  // Vérifier si l'utilisateur a une feature spécifique
  const hasFeature = (feature: string) => {
    return has && has({ feature });
  };

  // Créer une session de paiement pour un produit unique
  const createCheckoutSession = async (
    items: Array<{
      productId: number;
      name: string;
      price: number;
      license: string;
      quantity: number;
    }>
  ) => {
    if (!user) {
      throw new Error("User must be authenticated");
    }

    setIsLoading(true);
    setError(null);

    try {
      // Créer la commande dans Convex
      const orderData = {
        items: items.map(item => ({
          productId: item.productId,
          name: item.name,
          price: item.price,
          license: item.license,
          quantity: item.quantity,
        })),
        total: items.reduce((sum, item) => sum + item.price * item.quantity, 0),
        email: user.emailAddresses[0]?.emailAddress || "",
        status: "pending",
      };

      const orderResult = await createOrderMutation(orderData);

      if (!orderResult.success) {
        throw new Error("Failed to create order");
      }

      // Pour l'instant, on simule le processus de paiement
      console.log("Order created:", orderResult.orderId);

      return {
        id: orderResult.orderId,
        url: `/order-confirmation?orderId=${orderResult.orderId}`,
        status: "open" as const,
      };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Payment failed";
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  // S'abonner à un plan (simulation)
  const subscribeToPlan = async (planId: string) => {
    if (!user) {
      throw new Error("User must be authenticated");
    }

    setIsLoading(true);
    setError(null);

    try {
      // Simulation d'abonnement
      console.log("Subscribing to plan:", planId);

      // Dans une vraie implémentation, vous utiliseriez Clerk's subscription API
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulation

      return {
        id: `sub_${Date.now()}`,
        url: `/dashboard?subscription=active`,
        status: "complete" as const,
      };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Subscription failed";
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  // Annuler un abonnement (simulation)
  const cancelSubscription = async () => {
    if (!user) {
      throw new Error("User must be authenticated");
    }

    setIsLoading(true);
    setError(null);

    try {
      // Simulation d'annulation
      console.log("Cancelling subscription");

      // Dans une vraie implémentation, vous utiliseriez Clerk's subscription API
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulation

      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Cancellation failed";
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  // Vérifier les permissions de téléchargement
  // Pour l'instant, permettre tous les téléchargements
  const canDownload = (licenseType: string) => {
    // TODO: Implémenter la logique de vérification des plans
    // Pour l'instant, permettre tous les téléchargements
    return true;
  };

  // Vérifier les limites de téléchargement
  const getDownloadQuota = () => {
    // TODO: Implémenter les quotas réels
    return { remaining: Infinity, total: Infinity };
  };

  return {
    // État
    isLoading,
    error,

    // Plans et features
    hasPlan,
    hasFeature,
    canDownload,
    getDownloadQuota,

    // Actions
    createCheckoutSession,
    subscribeToPlan,
    cancelSubscription,

    // Données utilisateur
    user,
    isAuthenticated: !!user,
  };
}
