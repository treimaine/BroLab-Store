import { api } from "@/lib/convex";
import { useUser } from "@clerk/clerk-react";
import { useQuery } from "convex/react";

export const useSubscriptionStatus = () => {
  const { user } = useUser();

  // Récupérer l'utilisateur Convex d'abord
  const convexUser = useQuery(
    api.users.getUserByClerkId,
    user ? { clerkId: user.id } : "skip"
  );

  // Récupérer l'abonnement si l'utilisateur existe
  const subscription = useQuery(
    api.subscriptions.getSubscription.getSubscription,
    convexUser ? { userId: convexUser._id } : "skip"
  );

  return subscription;
};
