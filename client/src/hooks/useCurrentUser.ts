import { useUser } from "@clerk/clerk-react";
import { useQuery } from "@tanstack/react-query";

interface SubscriptionStatus {
  isActive: boolean;
  plan: string | null;
  renewalDate: string | null;
  status: "active" | "canceled" | "past_due" | "unpaid" | null;
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
      throw new Error("Failed to fetch subscription status");
    }
    return await response.json();
  } catch (error) {
    console.error("Error fetching subscription status:", error);
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
      throw new Error("Failed to fetch WooCommerce customer");
    }
    const customers = await response.json();
    return customers.length > 0 ? customers[0] : null;
  } catch (error) {
    console.error("Error fetching WooCommerce customer:", error);
    return null;
  }
}

export function useCurrentUser() {
  const { user: clerkUser, isLoaded: authLoading } = useUser();

  const {
    data: subscription,
    isLoading: subscriptionLoading,
    error: subscriptionError,
  } = useQuery({
    queryKey: ["subscription", clerkUser?.emailAddresses[0]?.emailAddress],
    queryFn: () => fetchSubscriptionStatus(clerkUser!.emailAddresses[0]!.emailAddress),
    enabled: !!clerkUser?.emailAddresses[0]?.emailAddress,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const {
    data: wooCustomer,
    isLoading: customerLoading,
    error: customerError,
  } = useQuery({
    queryKey: ["woo-customer", clerkUser?.emailAddresses[0]?.emailAddress],
    queryFn: () => fetchWooCustomer(clerkUser!.emailAddresses[0]!.emailAddress),
    enabled: !!clerkUser?.emailAddresses[0]?.emailAddress,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });

  const isLoading = !authLoading || subscriptionLoading || customerLoading;

  if (!clerkUser) {
    return {
      user: null,
      isLoading: !authLoading,
      error: null,
    };
  }

  const currentUser: CurrentUser = {
    // Auth data
    id: parseInt(clerkUser.id) || 0,
    email: clerkUser.emailAddresses[0]?.emailAddress || "",
    username: clerkUser.username || clerkUser.emailAddresses[0]?.emailAddress || "",

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
      ? `${wooCustomer.first_name} ${wooCustomer.last_name || ""}`.trim()
      : clerkUser.username || clerkUser.emailAddresses[0]?.emailAddress || "",
    isSubscribed: subscription?.isActive || false,
    isPremium: subscription?.plan === "premium" || subscription?.plan === "vip" || false,
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
