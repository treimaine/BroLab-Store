/**
 * Modern Dashboard Component
 *
 * Modernized dashboard implementation with simplified component hierarchy,
 * removed unnecessary lazy loading, and proper error boundaries.
 *
 * Requirements addressed:
 * - 2.1: Eliminate unnecessary lazy loading components
 * - 2.2: Clear hierarchy with proper separation of concerns
 * - 2.4: Consistent patterns across all components
 * - 3.1: Consistent skeleton components
 * - 3.2: Clear loading indicators
 * - 9.3: Actionable error messages with retry mechanisms
 * - 9.4: Escalation paths or support contact
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useIsMobile, useIsTablet } from "@/hooks/useBreakpoint";
import { useDashboard } from "@/hooks/useDashboard";
import { useDashboardConfig } from "@/hooks/useDashboardConfig";
import { useUser } from "@clerk/clerk-react";
import { motion } from "framer-motion";
import { Music, Star } from "lucide-react";
import { memo, useCallback, useMemo, useState } from "react";

// Import dashboard components (no lazy loading for better performance and simpler architecture)
import { ActivityFeed } from "./ActivityFeed";
import { DashboardErrorBoundary } from "./DashboardErrorBoundary";
import {
  ContentSection,
  DashboardGrid,
  DashboardHeader,
  DashboardLayout,
  TabContentWrapper,
} from "./DashboardLayout";
import {
  ActivityFeedSkeleton,
  DashboardSkeleton,
  RecommendationsSkeleton,
  StatsCardsSkeleton,
} from "./DashboardSkeletons";
import { StatsCards } from "./StatsCards";

// Import other dashboard tabs (removed lazy loading)
import AnalyticsDashboard from "../AnalyticsDashboard";
import DownloadsTable from "../DownloadsTable";
import UserProfile from "../UserProfile";
import OrdersTab from "./OrdersTab";
import ReservationsTab from "./ReservationsTab";

// Recommendations component (simplified, no lazy loading)
const RecommendationsPanel = memo(
  ({ favorites, isLoading }: { favorites: any[]; isLoading: boolean }) => {
    const isMobile = useIsMobile();

    if (isLoading) {
      return <RecommendationsSkeleton />;
    }

    return (
      <Card className="bg-gray-900/50 border-gray-700/50 backdrop-blur-sm">
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="flex items-center space-x-2 text-white text-sm sm:text-base">
            <Star className="h-4 w-4 sm:h-5 sm:w-5" />
            <span>Recommendations</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 sm:p-6">
          <div className="space-y-3">
            {favorites && favorites.length > 0 ? (
              favorites.slice(0, isMobile ? 3 : 4).map((favorite, index) => (
                <div
                  key={`${favorite.id}-${index}`}
                  className="flex items-center space-x-3 p-3 rounded-lg bg-gray-800/50 hover:bg-gray-800/70 transition-colors"
                >
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-purple-600 to-pink-600 rounded-lg flex items-center justify-center">
                    <Music className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs sm:text-sm font-medium text-white truncate">
                      {favorite.beatTitle || `Beat ${favorite.beatId}`}
                    </p>
                    <p className="text-xs text-gray-400">Hip Hop</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-6">
                <Star className="w-8 h-8 text-gray-600 mx-auto mb-2" />
                <p className="text-gray-400 text-xs sm:text-sm">No recommendations yet</p>
                <p className="text-gray-500 text-xs mt-1">Add some favorites to get started</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }
);

RecommendationsPanel.displayName = "RecommendationsPanel";

// Main dashboard component
export const ModernDashboard = memo(() => {
  const { user: clerkUser } = useUser();
  const isMobile = useIsMobile();
  const isTablet = useIsTablet();
  const config = useDashboardConfig();

  // State management
  const [activeTab, setActiveTab] = useState("overview");

  // Dashboard data with comprehensive error handling
  const {
    user,
    stats,
    favorites,
    orders,
    downloads,
    reservations,
    activity,
    chartData,
    trends,
    isLoading,
    error,
    isAuthenticated,
    refetch,
    retry,
    clearError,
  } = useDashboard({
    includeChartData: activeTab === "analytics",
    includeTrends: activeTab === "analytics" || activeTab === "overview",
    activityLimit: activeTab === "activity" ? config.pagination.activityPerPage : 10,
    ordersLimit: activeTab === "orders" ? config.pagination.ordersPerPage : 5,
    downloadsLimit: activeTab === "downloads" ? config.pagination.downloadsPerPage : 10,
    favoritesLimit: 50,
    reservationsLimit: activeTab === "reservations" ? 20 : 5,
    enableRealtime:
      config.features.realtimeUpdates && (activeTab === "overview" || activeTab === "activity"),
  });

  // Handle tab changes
  const handleTabChange = useCallback((tab: string) => {
    setActiveTab(tab);
  }, []);

  // Handle refresh
  const handleRefresh = useCallback(async () => {
    try {
      await refetch();
      clearError();
    } catch (err) {
      console.error("Failed to refresh dashboard:", err);
    }
  }, [refetch, clearError]);

  // Handle retry
  const handleRetry = useCallback(() => {
    retry();
  }, [retry]);

  // Memoized components for performance
  const statsComponent = useMemo(() => {
    if (isLoading && !stats) {
      return <StatsCardsSkeleton />;
    }

    return (
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: config.ui.animationDuration / 1000, delay: 0.2 }}
      >
        <StatsCards stats={stats} isLoading={isLoading} className="mb-6 sm:mb-8" />
      </motion.div>
    );
  }, [stats, isLoading, config.ui.animationDuration]);

  // Error handling
  if (!isAuthenticated && !isLoading) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="pt-16 sm:pt-20 min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-violet-800 flex items-center justify-center px-4"
      >
        <Card className="w-full max-w-md bg-gray-900/50 border-gray-700/50">
          <CardContent className="p-6 text-center">
            <h2 className="text-xl font-semibold text-white mb-2">Authentication Required</h2>
            <p className="text-gray-300 mb-4">Please sign in to access your dashboard.</p>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  // Loading state
  if (isLoading && !user) {
    return <DashboardSkeleton />;
  }

  return (
    <DashboardErrorBoundary onError={error => console.error("Dashboard error:", error)}>
      <div className="pt-16 sm:pt-20 min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-violet-800">
        <DashboardLayout activeTab={activeTab} onTabChange={handleTabChange}>
          {/* Dashboard Header */}
          <DashboardHeader user={user || clerkUser} className="space-y-2" />

          {/* Statistics Cards */}
          {statsComponent}

          {/* Tab Content */}
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: config.ui.animationDuration / 1000, delay: 0.3 }}
          >
            {/* Overview Tab */}
            <TabContentWrapper value="overview">
              <DashboardGrid>
                <ContentSection span="2">
                  {isLoading ? (
                    <ActivityFeedSkeleton />
                  ) : (
                    <ActivityFeed
                      activities={activity}
                      isLoading={isLoading}
                      maxItems={isMobile ? 4 : isTablet ? 6 : 8}
                    />
                  )}
                </ContentSection>
                <ContentSection>
                  <RecommendationsPanel favorites={favorites} isLoading={isLoading} />
                </ContentSection>
              </DashboardGrid>
            </TabContentWrapper>

            {/* Analytics Tab */}
            <TabContentWrapper value="analytics">
              {config.features.analyticsCharts ? (
                <AnalyticsDashboard />
              ) : (
                <Card className="bg-gray-900/50 border-gray-700/50">
                  <CardContent className="p-6 text-center">
                    <p className="text-gray-400">Analytics features are currently disabled.</p>
                  </CardContent>
                </Card>
              )}
            </TabContentWrapper>

            {/* Activity Tab */}
            <TabContentWrapper value="activity">
              {isLoading ? (
                <ActivityFeedSkeleton />
              ) : (
                <ActivityFeed
                  activities={activity}
                  isLoading={isLoading}
                  maxItems={isMobile ? 10 : isTablet ? 15 : 20}
                  showHeader={false}
                />
              )}
            </TabContentWrapper>

            {/* Orders Tab */}
            <TabContentWrapper value="orders">
              <OrdersTab
                ordersData={{ items: orders, hasMore: false }}
                ordersLoading={isLoading}
                onLoadMore={() => {
                  // Implement load more functionality
                  console.log("Load more orders");
                }}
              />
            </TabContentWrapper>

            {/* Downloads Tab */}
            <TabContentWrapper value="downloads">
              <DownloadsTable
                downloads={downloads.map((d: unknown) => ({
                  id: d.id || `download-${d.beatId}`,
                  beatTitle: d.beatTitle || `Beat ${d.beatId}`,
                  artist: d.beatArtist,
                  fileSize: d.fileSize || 0,
                  format: d.format || "mp3",
                  quality: d.quality || "320kbps",
                  downloadedAt: d.downloadedAt || new Date().toISOString(),
                  downloadCount: d.downloadCount || 0,
                  maxDownloads: d.maxDownloads,
                  licenseType: d.licenseType || "Basic",
                  downloadUrl: d.downloadUrl || "",
                }))}
                isLoading={isLoading}
                onRefresh={handleRefresh}
              />
            </TabContentWrapper>

            {/* Reservations Tab */}
            <TabContentWrapper value="reservations">
              <ReservationsTab reservations={reservations} />
            </TabContentWrapper>

            {/* Profile Tab */}
            <TabContentWrapper value="profile">
              <UserProfile className="max-w-4xl mx-auto" />
            </TabContentWrapper>

            {/* Settings Tab */}
            <TabContentWrapper value="settings">
              <DashboardGrid columns="2">
                <Card className="bg-gray-900 border-gray-700">
                  <CardHeader className="p-4 sm:p-6">
                    <CardTitle className="flex items-center space-x-2 text-white text-sm sm:text-base">
                      <span>Dashboard Settings</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4 p-4 sm:p-6">
                    <div className="space-y-3">
                      <div>
                        <label className="text-xs sm:text-sm font-medium text-white">
                          Real-time Updates
                        </label>
                        <p className="text-muted-foreground text-xs sm:text-sm">
                          {config.features.realtimeUpdates ? "Enabled" : "Disabled"}
                        </p>
                      </div>
                      <div>
                        <label className="text-xs sm:text-sm font-medium text-white">
                          Analytics Charts
                        </label>
                        <p className="text-muted-foreground text-xs sm:text-sm">
                          {config.features.analyticsCharts ? "Enabled" : "Disabled"}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </DashboardGrid>
            </TabContentWrapper>
          </motion.div>

          {/* Error Display */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-4"
            >
              <Card className="border-red-200 bg-red-50/10 border-red-500/20">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-red-500 rounded-full" />
                      <p className="text-red-400 text-xs sm:text-sm">{error.message}</p>
                    </div>
                    <div className="flex space-x-2">
                      {error.retryable && (
                        <button
                          onClick={handleRetry}
                          className="px-3 py-1 text-xs bg-red-600 hover:bg-red-700 text-white rounded transition-colors"
                        >
                          Retry
                        </button>
                      )}
                      <button
                        onClick={clearError}
                        className="px-3 py-1 text-xs bg-gray-600 hover:bg-gray-700 text-white rounded transition-colors"
                      >
                        Dismiss
                      </button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </DashboardLayout>
      </div>
    </DashboardErrorBoundary>
  );
});

ModernDashboard.displayName = "ModernDashboard";

export default ModernDashboard;
