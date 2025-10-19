/**
 * Dashboard Data Provider
 *
 * This provider initializes real data fetching from Convex and ensures
 * the dashboard store is populated with actual user data instead of mock data.
 */

import { useDashboardData } from "@/hooks/useDashboardData";
import { useUser } from "@clerk/clerk-react";
import { ReactNode, useEffect } from "react";

interface DashboardDataProviderProps {
  children: ReactNode;
}

export function DashboardDataProvider({ children }: DashboardDataProviderProps) {
  const { user } = useUser();

  // Initialize real data fetching when user is authenticated
  const { isLoading, hasError, isInitialized } = useDashboardData({
    includeChartData: true,
    includeTrends: true,
    activityLimit: 50,
    ordersLimit: 50,
    downloadsLimit: 100,
    favoritesLimit: 100,
    reservationsLimit: 50,
    enableRealTimeSync: true,
  });

  useEffect(() => {
    if (user && isInitialized) {
      console.log(
        "✅ Dashboard data provider initialized with real data for user:",
        user.emailAddresses[0]?.emailAddress
      );
    }
  }, [user, isInitialized]);

  useEffect(() => {
    if (hasError) {
      console.error("❌ Dashboard data provider error - falling back to empty state");
    }
  }, [hasError]);

  // Always render children - the dashboard components will handle loading/error states
  return <>{children}</>;
}
