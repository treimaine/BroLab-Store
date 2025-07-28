import { useQuery } from "@tanstack/react-query";
import { useAuth } from "./useAuth";

interface SubscriptionStatus {
  isActive: boolean;
  plan: string | null;
  renewalDate: string | null;
  status: 'active' | 'canceled' | 'past_due' | 'unpaid' | null;
}

interface WooCommerceCustomer {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  date_created: string;
  orders_count: number;
  total_spent: string;
}

interface CurrentUser {
  // Auth data
  id: number;
  email: string;
  username: string;
  
  // WooCommerce customer data
  wooCustomer: WooCommerceCustomer | null;
  
  // Subscription data
  subscription: SubscriptionStatus;
  
  // Computed properties
  displayName: string;
  isSubscribed: boolean;
  isPremium: boolean;
  totalSpent: number;
  ordersCount: number;
}

async function fetchSubscriptionStatus(email: string): Promise<SubscriptionStatus> {
  try {
    const response = await fetch(`/api/subscription/status?email=${encodeURIComponent(email)}`);
    if (!response.ok) {
      throw new Error('Failed to fetch subscription status');
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching subscription status:', error);
    return {
      isActive: false,
      plan: null,
      renewalDate: null,
      status: null,
    };
  }
}

async function fetchWooCustomer(email: string): Promise<WooCommerceCustomer | null> {
  try {
    const response = await fetch(`/api/woocommerce/customers?email=${encodeURIComponent(email)}`);
    if (!response.ok) {
      if (response.status === 404) {
        return null; // Customer not found in WooCommerce
      }
      throw new Error('Failed to fetch WooCommerce customer');
    }
    const customers = await response.json();
    return customers.length > 0 ? customers[0] : null;
  } catch (error) {
    console.error('Error fetching WooCommerce customer:', error);
    return null;
  }
}

export function useCurrentUser() {
  const { user, isLoading: authLoading } = useAuth();

  const {
    data: subscription,
    isLoading: subscriptionLoading,
    error: subscriptionError,
  } = useQuery({
    queryKey: ['subscription', user?.email],
    queryFn: () => fetchSubscriptionStatus(user!.email),
    enabled: !!user?.email,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const {
    data: wooCustomer,
    isLoading: customerLoading,
    error: customerError,
  } = useQuery({
    queryKey: ['woo-customer', user?.email],
    queryFn: () => fetchWooCustomer(user!.email),
    enabled: !!user?.email,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });

  const isLoading = authLoading || subscriptionLoading || customerLoading;

  if (!user) {
    return {
      user: null,
      isLoading: authLoading,
      error: null,
    };
  }

  const currentUser: CurrentUser = {
    // Auth data
    id: user.id,
    email: user.email,
    username: user.username,
    
    // WooCommerce customer data
    wooCustomer: wooCustomer || null,
    
    // Subscription data
    subscription: subscription || {
      isActive: false,
      plan: null,
      renewalDate: null,
      status: null,
    },
    
    // Computed properties
    displayName: wooCustomer?.first_name 
      ? `${wooCustomer.first_name} ${wooCustomer.last_name || ''}`.trim()
      : user.username,
    isSubscribed: subscription?.isActive || false,
    isPremium: subscription?.plan === 'premium' || subscription?.plan === 'vip' || false,
    totalSpent: wooCustomer ? parseFloat(wooCustomer.total_spent) : 0,
    ordersCount: wooCustomer?.orders_count || 0,
  };

  return {
    user: currentUser,
    isLoading,
    error: subscriptionError || customerError,
    
    // Utility functions
    refreshData: () => {
      // This would trigger a refetch of all queries
      // Implementation depends on your query client setup
    },
  };
}

// Convenience hooks for specific data
export function useSubscriptionStatus() {
  const { user } = useCurrentUser();
  return {
    isSubscribed: user?.isSubscribed || false,
    isPremium: user?.isPremium || false,
    plan: user?.subscription.plan,
    status: user?.subscription.status,
    renewalDate: user?.subscription.renewalDate,
  };
}

export function useWooCustomer() {
  const { user } = useCurrentUser();
  return {
    customer: user?.wooCustomer,
    totalSpent: user?.totalSpent || 0,
    ordersCount: user?.ordersCount || 0,
  };
}