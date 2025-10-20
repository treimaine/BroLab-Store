/**
 * Optimized Dashboard Component
 *
 * Performance-optimized version of the dashboard with all optimizations applied:
 * - React.memo, useMemo, useCallback for render optimization
 * - Code splitting for dashboard tabs
 * - Virtual scrolling for large lists
 * - Reduced bundle size through optimized imports
 * - Performance monitoring
 *
 * Requirements addressed:
 * - 5.1: 50% faster loading times through performance optimization
 * - 5.2: Proper code splitting for dashboard tabs and heavy components
 * - 5.4: Virtual scrolling for large lists (orders, downloads, activity feed)
 * - 5.5: Reduce bundle size by removing unnecessary lazy loading and optimizing imports
 * - 2.1: Eliminate unnecessary lazy loading components
 */

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useIsMobile, useIsTablet } from "@/hooks/useBreakpoint";
import { useDashboardConfig } from "@/hooks/useDashboardConfig";
import { useComponentPerformance } from "@/hooks/usePerformanceMonitoring";
import {
  useDashboardData,
  useDashboardError,
  useDashboardLoading,
  useDashboardStore,
} from "@/stores/useDashboardStore";
import { useUser } from "@clerk/clerk-react";
import { motion } from "framer-motion";
import {
  Activity,
  BarChart3,
  Download,
  Settings,
  ShoppingCart,
  Star,
  TrendingUp,
  User,
} from "lucide-react";
import { memo, useCallback, useMemo, useState } from "react";
import { DashboardErrorBoundary } from "./DashboardErrorBoundary";
import { DashboardHeader } from "./DashboardLayout";
import { LoadingWithRetry, StatsCardsSkeleton } from "./DashboardSkeletons";
import LazyDashboardTabs from "./LazyDashboardTabs";
import { StatsCards } from "./StatsCards";

// Tab configuration - memoized to prevent recreation
const TAB_CONFIG = [
  { value: "overview", label: "Overview", icon: TrendingUp },
  { value: "activity", label: "Activity", icon: Activity },
  { value: "analytics", label: "Analytics", icon: BarChart3 },
  { value: "orders", label: "Orders", icon: ShoppingCart },
  { value: "downloads", label: "Downloads", icon: Download },
  { value: "reservations", label: "Reservations", icon: Star },
  { value: "profile", label: "Profile", icon: User },
  { value: "settings", label: "Settings", icon: Settings },
] as const;

// Memoized tab trigger component
const TabTrigger = memo<{
  tab: (typeof TAB_CONFIG)[number];
  isMobile: boolean;
  isActive: boolean;
}>(({ tab, isMobile, isActive }) => {
  const Icon = tab.icon;

  return (
    <TabsTrigger
      value={tab.value}
      className="px-2 sm:px-4 py-2 rounded-md whitespace-nowrap flex-shrink-0 data-[state=active]:bg-purple-600 data-[state=active]:text-white text-xs sm:text-sm transition-all duration-200"
    >
      <Icon className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
      {tab.label}
    </TabsTrigger>
  );
});

TabTrigger.displayName = "TabTrigger";

// Main optimized dashboard component
export const OptimizedDashboard = memo(() => {
  const { user } = useUser();
  const isMobile = useIsMobile();
  const isTablet = useIsTablet();
  const { config } = useDashboardConfig();

  // Performance monitoring
  const { renderTime, renderCount, performanceScore } =
    useComponentPerformance("OptimizedDashboard");

  // Dashboard state
  const [activeTab, setActiveTab] = useState("overview");
  const [convexError, setConvexError] = useState<string | null>(null);

  // Unified store data - single source of truth for all dashboard data
  const dashboardData = useDashboardData();
  const isLoading = useDashboardLoading();
  const error = useDashboardError();
  const { forceSync, clearError } = useDashboardStore();

  // Create a compatible interface for LazyDashboardTabs
  const compatibleDashboardData = useMemo(
    () => ({
      ...dashboardData,
      isLoading,
      error,
      refetch: forceSync,
    }),
    [dashboardData, isLoading, error, forceSync]
  );

  // Memoize tab triggers to prevent unnecessary re-renders
  const tabTriggers = useMemo(() => {
    return TAB_CONFIG.map(tab => (
      <TabTrigger
        key={tab.value}
        tab={tab}
        isMobile={isMobile}
        isActive={activeTab === tab.value}
      />
    ));
  }, [isMobile, activeTab]);

  // Handle tab change with performance optimization
  const handleTabChange = useCallback((value: string) => {
    setActiveTab(value);
  }, []);

  // Handle refresh with error clearing
  const handleRefresh = useCallback(async () => {
    setConvexError(null);
    clearError();
    await forceSync();
  }, [forceSync, clearError]);

  // Handle retry with error handling
  const handleRetry = useCallback(async () => {
    setConvexError(null);
    await handleRefresh();
  }, [handleRefresh]);

  // Handle error with proper error state management
  const handleError = useCallback((error: Error) => {
    console.error("Dashboard error:", error);
    setConvexError(error.message);
  }, []);

  // Early return for unauthenticated users
  if (!user) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="pt-16 sm:pt-20 min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-violet-800 flex items-center justify-center px-4"
      >
        <LoadingWithRetry onRetry={handleRefresh} />
      </motion.div>
    );
  }

  return (
    <DashboardErrorBoundary onError={handleError}>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: config.ui.animationDuration / 1000 }}
        className="pt-16 sm:pt-20 min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-violet-800"
      >
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8 space-y-4 sm:space-y-6">
          {/* Dashboard Header */}
          <DashboardHeader user={user} />

          {/* Performance Debug Info (only in development) */}
          {process.env.NODE_ENV === "development" && (
            <Card className="bg-gray-900/20 border-gray-700/30 p-2 text-xs">
              <div className="flex items-center justify-between text-gray-400">
                <span>Render: {renderTime.toFixed(2)}ms</span>
                <span>Count: {renderCount}</span>
                <span>Score: {performanceScore}/100</span>
              </div>
            </Card>
          )}

          {/* Statistics */}
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{
              duration: config.ui.animationDuration / 1000,
              delay: 0.1,
            }}
          >
            {isLoading ? (
              <StatsCardsSkeleton />
            ) : (
              <StatsCards
                stats={
                  dashboardData?.stats || {
                    totalFavorites: 0,
                    totalDownloads: 0,
                    totalOrders: 0,
                    totalSpent: 0,
                  }
                }
                isLoading={isLoading}
                className="mb-6 sm:mb-8"
              />
            )}
          </motion.div>

          {/* Dashboard Tabs with Code Splitting */}
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{
              duration: config.ui.animationDuration / 1000,
              delay: 0.2,
            }}
          >
            <Tabs
              value={activeTab}
              onValueChange={handleTabChange}
              className="space-y-4 sm:space-y-6"
            >
              {/* Tab Navigation */}
              <div className="overflow-x-auto">
                <TabsList
                  aria-label="User dashboard tabs"
                  className="flex w-full min-w-max bg-gray-900/50 border-gray-700/50 backdrop-blur-sm gap-2 sm:gap-4 px-2 sm:px-4 py-1 sm:py-2"
                >
                  {tabTriggers}
                </TabsList>
              </div>

              {/* Tab Content with Code Splitting */}
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: config.ui.animationDuration / 1000,
                  ease: "easeOut",
                }}
              >
                <LazyDashboardTabs activeTab={activeTab} dashboardData={compatibleDashboardData} />
              </motion.div>
            </Tabs>
          </motion.div>

          {/* Error Handling */}
          {convexError && (
            <Card className="border-red-200 bg-red-50">
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-red-500 rounded-full" />
                  <p className="text-red-700 text-xs sm:text-sm">Dashboard error: {convexError}</p>
                  <Button
                    onClick={handleRetry}
                    size="sm"
                    className="ml-auto bg-red-600 hover:bg-red-700 text-xs"
                  >
                    Retry
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </motion.div>
    </DashboardErrorBoundary>
  );
});

OptimizedDashboard.displayName = "OptimizedDashboard";

export default OptimizedDashboard;
