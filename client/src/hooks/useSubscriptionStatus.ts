import { useQuery } from "@tanstack/react-query";
import { useAuth } from "./useAuth";

interface SubscriptionData {
  id: string;
  plan: string;
  status: string;
  current_period_end: string;
  created_at: string;
  cancel_at_period_end?: boolean;
}

interface SubscriptionStatus {
  subscription: SubscriptionData | null;
  status: 'none' | 'active' | 'pending' | 'canceled' | 'inactive' | 'trialing' | 'canceled_pending';
}

async function fetchSubscriptionStatus(): Promise<SubscriptionStatus> {
  try {
    const response = await fetch('/api/subscription/status');
    if (!response.ok) {
      throw new Error('Failed to fetch subscription status');
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching subscription status:', error);
    return {
      subscription: null,
      status: 'none'
    };
  }
}

export function useSubscriptionStatus() {
  const { isAuthenticated } = useAuth();

  const {
    data: subscriptionData,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['subscription-status'],
    queryFn: fetchSubscriptionStatus,
    enabled: isAuthenticated,
    staleTime: 5 * 60 * 1000, // 5 minutes (300,000 ms)
    retry: 2,
  });

  return {
    subscription: subscriptionData?.subscription || null,
    status: subscriptionData?.status || 'none',
    isLoading,
    error,
    refetch
  };
} 