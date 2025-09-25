/**
 * BroLab Dashboard Component - Music Marketplace Focused
 *
 * This component provides a comprehensive dashboard experience specifically
 * designed for BroLab Entertainment's music marketplace, featuring:
 *
 * BroLab-Specific Features:
 * - Beat-focused statistics and analytics
 * - Music marketplace activity tracking
 * - Beat licensing workflow management
 * - Genre-based recommendations
 * - Studio session booking integration
 * - Download quota management
 *
 * Architecture improvements:
 * - Clean separation between UI and business logic
 * - BroLab-specific data transformation and metadata enrichment
 * - Music marketplace-focused error handling
 * - Type-safe data flow with beat-specific validation
 * - Component structure optimized for music producers and artists
 *
 * Business Value Documentation:
 * @see docs/dashboard-component-business-value.md for detailed business value analysis
 * Each component serves specific BroLab business objectives including revenue tracking,
 * user engagement, studio services promotion, and data-driven insights.
 */

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useIsMobile, useIsTablet } from "@/hooks/useBreakpoint";
import { useDashboardDataOptimized } from "@/hooks/useDashboardDataOptimized";
import { useClerk, useUser } from "@clerk/clerk-react";
import { motion } from "framer-motion";
import {
  Activity as ActivityIcon,
  BarChart3,
  Calendar,
  DollarSign,
  Download,
  Music,
  Settings,
  ShoppingCart,
  Star,
  TrendingUp,
  User,
} from "lucide-react";
import { memo, useCallback, useMemo, useState } from "react";
import { useDashboardDataTransform } from "../hooks/useDashboardDataTransform";
import {
  formatErrorForDisplay,
  handleDashboardError,
  type DashboardError,
} from "../utils/dashboardErrorHandling";

// Import BroLab-specific components for music marketplace functionality
import DownloadsTable from "@/components/DownloadsTable";
import UserProfile from "@/components/UserProfile";
import { BroLabActivityFeed } from "@/components/dashboard/BroLabActivityFeed";
import BroLabRecommendations from "@/components/dashboard/BroLabRecommendations";
import { BroLabStatsCards } from "@/components/dashboard/BroLabStatsCards";
import { BroLabTrendCharts } from "@/components/dashboard/BroLabTrendCharts";
import { DashboardErrorBoundary } from "@/components/dashboard/DashboardErrorBoundary";
import {
  ActivityFeedSkeleton,
  LoadingWithRetry,
  RecommendationsSkeleton,
  StatsCardsSkeleton,
} from "@/components/dashboard/DashboardSkeletons";
import OrdersTab from "@/components/dashboard/OrdersTab";
import ReservationsTab from "@/components/dashboard/ReservationsTab";

// Main Dashboard Component - focused on UI presentation with clean separation of concerns
export const LazyDashboard = memo(() => {
  const { user } = useUser();
  const { openUserProfile } = useClerk();
  const isMobile = useIsMobile();
  const isTablet = useIsTablet();
  const [activeTab, setActiveTab] = useState("overview");

  // Get raw dashboard data
  const { stats, chartData, trends, favoritesAddedPerMonth, loadMoreOrders } =
    useDashboardDataOptimized();

  // Enhanced music marketplace metrics calculated from actual data
  const enhancedStats = useMemo(() => {
    return {
      ...stats,
      // Calculate real metrics from actual data
      averageBeatPrice: stats.totalOrders > 0 ? stats.totalSpent / stats.totalOrders : 0,
    };
  }, [stats]);

  // Get transformed data with proper type safety
  const {
    transformedOrders,
    transformedReservations,
    transformedActivities,
    transformedFavorites,
    transformedDownloadsForTable,
    isTransforming,
    isEnrichingMetadata,
    transformError,
    refreshTransformedData,
    clearTransformError,
  } = useDashboardDataTransform();

  // Error handling with user-friendly messages
  const [displayError, setDisplayError] = useState<string | null>(null);

  const handleError = useCallback((error: Error) => {
    handleDashboardError(error, "LazyDashboard", (err: DashboardError) => {
      const formatted = formatErrorForDisplay(err);
      setDisplayError(formatted.message);
    });
  }, []);

  const handleRetry = useCallback(async () => {
    setDisplayError(null);
    clearTransformError();
    await refreshTransformedData();
  }, [clearTransformError, refreshTransformedData]);

  if (!user) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="pt-16 sm:pt-20 min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-violet-800 flex items-center justify-center px-4"
      >
        <LoadingWithRetry onRetry={handleRetry} />
      </motion.div>
    );
  }

  return (
    <DashboardErrorBoundary onError={handleError}>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="pt-16 sm:pt-20 min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-violet-800"
      >
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8 space-y-4 sm:space-y-6">
          {/* Dashboard Header */}
          <motion.div
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="space-y-2"
          >
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-2">
                  Welcome back, {user?.firstName || "Producer"} 🎵
                </h1>
                <p className="text-sm sm:text-base text-gray-300">
                  Your beat collection and music marketplace activity
                </p>
              </div>
              <div className="flex items-center space-x-2 sm:space-x-4">
                {/* Actions can be added here if needed */}
              </div>
            </div>
          </motion.div>

          {/* BroLab-specific Statistics for Music Marketplace */}
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            {isTransforming ? (
              <StatsCardsSkeleton />
            ) : (
              <BroLabStatsCards
                stats={enhancedStats}
                isLoading={isTransforming}
                className="mb-6 sm:mb-8"
              />
            )}
          </motion.div>

          {/* Dashboard tabs */}
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4 sm:space-y-6">
              <div className="overflow-x-auto">
                <TabsList
                  aria-label="User dashboard tabs"
                  className="flex w-full min-w-max bg-gray-900/50 border-gray-700/50 backdrop-blur-sm gap-2 sm:gap-4 px-2 sm:px-4 py-1 sm:py-2"
                >
                  <TabsTrigger
                    value="overview"
                    className="px-2 sm:px-4 py-2 rounded-md whitespace-nowrap flex-shrink-0 data-[state=active]:bg-purple-600 data-[state=active]:text-white text-xs sm:text-sm"
                  >
                    <TrendingUp className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                    {isMobile ? "Overview" : "Beat Overview"}
                  </TabsTrigger>
                  <TabsTrigger
                    value="activity"
                    className="px-2 sm:px-4 py-2 rounded-md whitespace-nowrap flex-shrink-0 data-[state=active]:bg-purple-600 data-[state=active]:text-white text-xs sm:text-sm"
                  >
                    <ActivityIcon className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                    Beat Activity
                  </TabsTrigger>
                  <TabsTrigger
                    value="analytics"
                    className="px-2 sm:px-4 py-2 rounded-md whitespace-nowrap flex-shrink-0 data-[state=active]:bg-purple-600 data-[state=active]:text-white text-xs sm:text-sm"
                  >
                    <BarChart3 className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                    Music Analytics
                  </TabsTrigger>
                  <TabsTrigger
                    value="orders"
                    className="px-2 sm:px-4 py-2 rounded-md whitespace-nowrap flex-shrink-0 data-[state=active]:bg-purple-600 data-[state=active]:text-white text-xs sm:text-sm"
                  >
                    <ShoppingCart className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                    Beat Orders
                  </TabsTrigger>
                  <TabsTrigger
                    value="downloads"
                    className="px-2 sm:px-4 py-2 rounded-md whitespace-nowrap flex-shrink-0 data-[state=active]:bg-purple-600 data-[state=active]:text-white text-xs sm:text-sm"
                  >
                    <Download className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                    Beat Downloads
                  </TabsTrigger>
                  <TabsTrigger
                    value="recommendations"
                    className="px-2 sm:px-4 py-2 rounded-md whitespace-nowrap flex-shrink-0 data-[state=active]:bg-purple-600 data-[state=active]:text-white text-xs sm:text-sm"
                  >
                    <Star className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                    Beat Picks
                  </TabsTrigger>
                  <TabsTrigger
                    value="reservations"
                    className="px-2 sm:px-4 py-2 rounded-md whitespace-nowrap flex-shrink-0 data-[state=active]:bg-purple-600 data-[state=active]:text-white text-xs sm:text-sm"
                  >
                    <Calendar className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                    Studio Sessions
                  </TabsTrigger>
                  <TabsTrigger
                    value="profile"
                    className="px-2 sm:px-4 py-2 rounded-md whitespace-nowrap flex-shrink-0 data-[state=active]:bg-purple-600 data-[state=active]:text-white text-xs sm:text-sm"
                  >
                    <User className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                    Profile
                  </TabsTrigger>
                  <TabsTrigger
                    value="settings"
                    className="px-2 sm:px-4 py-2 rounded-md whitespace-nowrap flex-shrink-0 data-[state=active]:bg-purple-600 data-[state=active]:text-white text-xs sm:text-sm"
                  >
                    <Settings className="h-4 w-4 sm:h-5 sm:w-5" />
                    Settings
                  </TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value="overview" className="space-y-4 sm:space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
                  <div className="lg:col-span-2">
                    {isTransforming ? (
                      <ActivityFeedSkeleton />
                    ) : (
                      <BroLabActivityFeed
                        activities={transformedActivities}
                        isLoading={isTransforming}
                        maxItems={isMobile ? 4 : isTablet ? 6 : 8}
                      />
                    )}
                  </div>
                  <div className="space-y-4">
                    {/* Enhanced Music Marketplace Metrics */}
                    <Card className="bg-gray-900/50 border-gray-700/50 backdrop-blur-sm">
                      <CardHeader className="p-4 sm:p-6">
                        <CardTitle className="flex items-center space-x-2 text-white text-sm sm:text-base">
                          <Music className="h-4 w-4 sm:h-5 sm:w-5" />
                          <span>Music Analytics</span>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-4 sm:p-6">
                        <div className="space-y-4">
                          <div className="bg-gray-800/50 rounded-lg p-3">
                            <div className="flex items-center space-x-2 mb-1">
                              <DollarSign className="w-3 h-3 text-green-400" />
                              <span className="text-xs text-gray-400">Avg Beat Price</span>
                            </div>
                            <p className="text-sm font-semibold text-white">
                              ${enhancedStats.averageBeatPrice?.toFixed(2) || "0.00"}
                            </p>
                          </div>
                          <div className="bg-gray-800/50 rounded-lg p-3">
                            <div className="flex items-center space-x-2 mb-1">
                              <ShoppingCart className="w-3 h-3 text-purple-400" />
                              <span className="text-xs text-gray-400">Total Orders</span>
                            </div>
                            <p className="text-sm font-semibold text-white">
                              {stats.totalOrders || 0}
                            </p>
                          </div>
                          <div className="bg-gray-800/50 rounded-lg p-3">
                            <div className="flex items-center space-x-2 mb-1">
                              <Download className="w-3 h-3 text-blue-400" />
                              <span className="text-xs text-gray-400">Downloads</span>
                            </div>
                            <p className="text-sm font-semibold text-white">
                              {stats.totalDownloads || 0}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Beat Collection Preview */}
                    <Card className="bg-gray-900/50 border-gray-700/50 backdrop-blur-sm">
                      <CardHeader className="p-4 sm:p-6">
                        <CardTitle className="flex items-center space-x-2 text-white text-sm sm:text-base">
                          <Star className="h-4 w-4 sm:h-5 sm:w-5" />
                          <span>Recent Favorites</span>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-4 sm:p-6">
                        {isTransforming ? (
                          <RecommendationsSkeleton />
                        ) : (
                          <div className="space-y-3">
                            {transformedFavorites &&
                              transformedFavorites.slice(0, isMobile ? 2 : 3).map(favorite => (
                                <div
                                  key={favorite.id}
                                  className="flex items-center space-x-3 p-3 rounded-lg bg-gray-800/50 hover:bg-gray-800/70 transition-colors cursor-pointer"
                                  onClick={() =>
                                    (window.location.href = `/beat/${favorite.beatId}`)
                                  }
                                >
                                  <div className="w-8 h-8 bg-gradient-to-br from-purple-600 to-pink-600 rounded-lg flex items-center justify-center">
                                    <Music className="w-4 h-4 text-white" />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-xs font-medium text-white truncate">
                                      {favorite.beatTitle || `Beat ${favorite.beatId}`}
                                    </p>
                                    <p className="text-xs text-gray-400">
                                      {favorite.beatGenre || "Hip Hop"}
                                    </p>
                                  </div>
                                </div>
                              ))}
                            {(!transformedFavorites || transformedFavorites.length === 0) && (
                              <div className="text-center py-4">
                                <Music className="w-6 h-6 text-gray-600 mx-auto mb-2" />
                                <p className="text-gray-400 text-xs">No favorites yet</p>
                                <button
                                  onClick={() => (window.location.href = "/shop")}
                                  className="mt-2 px-3 py-1 bg-purple-600 text-white rounded text-xs hover:bg-purple-700 transition-colors"
                                >
                                  Explore Beats
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="analytics" className="space-y-4 sm:space-y-6">
                {isTransforming ? (
                  <div className="bg-gray-900/50 border-gray-700/50 rounded-lg p-6">
                    <div className="h-64 bg-gray-800/50 rounded animate-pulse" />
                  </div>
                ) : (
                  <BroLabTrendCharts
                    data={chartData || []}
                    trends={trends || {}}
                    favoritesMonthly={favoritesAddedPerMonth}
                    isLoading={isTransforming}
                  />
                )}
              </TabsContent>

              <TabsContent value="activity" className="space-y-4 sm:space-y-6">
                {isTransforming ? (
                  <ActivityFeedSkeleton />
                ) : (
                  <BroLabActivityFeed
                    activities={transformedActivities}
                    isLoading={isTransforming}
                    maxItems={isMobile ? 10 : isTablet ? 15 : 20}
                    showHeader={false}
                  />
                )}
              </TabsContent>

              <TabsContent value="orders" className="space-y-4 sm:space-y-6">
                <OrdersTab
                  ordersData={{
                    items: transformedOrders,
                    hasMore: false, // Will be handled by the transform hook
                  }}
                  ordersLoading={isTransforming}
                  onLoadMore={loadMoreOrders}
                />
              </TabsContent>

              <TabsContent value="downloads" className="space-y-4 sm:space-y-6">
                <DownloadsTable
                  downloads={transformedDownloadsForTable}
                  isLoading={isTransforming || isEnrichingMetadata}
                  onRefresh={handleRetry}
                />
              </TabsContent>

              <TabsContent value="recommendations" className="space-y-4 sm:space-y-6">
                <BroLabRecommendations
                  isLoading={isTransforming}
                  onRefreshRecommendations={refreshTransformedData}
                />
              </TabsContent>

              <TabsContent value="reservations" className="space-y-4 sm:space-y-6">
                <ReservationsTab reservations={transformedReservations} />
              </TabsContent>

              <TabsContent value="profile" className="space-y-4 sm:space-y-6">
                <UserProfile className="max-w-4xl mx-auto" />
              </TabsContent>

              <TabsContent value="settings" className="space-y-4 sm:space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                  <Card className="bg-gray-900 border-gray-700">
                    <CardHeader className="p-4 sm:p-6">
                      <CardTitle className="flex items-center space-x-2 text-white text-sm sm:text-base">
                        <User className="h-4 w-4 sm:h-5 sm:w-5" />
                        <span>User profile</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4 p-4 sm:p-6">
                      <div className="space-y-3">
                        <div>
                          <label className="text-xs sm:text-sm font-medium text-white">
                            Full Name
                          </label>
                          <p className="text-muted-foreground text-xs sm:text-sm">
                            {user?.firstName} {user?.lastName}
                          </p>
                        </div>
                        <div>
                          <label className="text-xs sm:text-sm font-medium text-white">Email</label>
                          <p className="text-muted-foreground text-xs sm:text-sm">
                            {user?.primaryEmailAddress?.emailAddress}
                          </p>
                        </div>
                      </div>
                      <Button
                        className="w-full bg-purple-600 hover:bg-purple-700 text-xs sm:text-sm"
                        onClick={() => {
                          // Open Clerk profile interface
                          openUserProfile();
                        }}
                      >
                        Edit profile
                      </Button>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
            </Tabs>
          </motion.div>

          {/* Error Handling */}
          {(displayError || transformError) && (
            <Card className="border-red-200 bg-red-50">
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-red-500 rounded-full" />
                  <p className="text-red-700 text-xs sm:text-sm">
                    {displayError || transformError}
                  </p>
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

LazyDashboard.displayName = "LazyDashboard";

export default LazyDashboard;
