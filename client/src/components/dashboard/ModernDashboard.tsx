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
import { isFallbackTitle, useBeatTitleResolver } from "@/hooks/useBeatTitleResolver";
import { useIsMobile, useIsTablet } from "@/hooks/useBreakpoint";
import { useDashboardConfig } from "@/hooks/useDashboardConfig";
import { useDashboardStore, useSyncStatus } from "@/stores/useDashboardStore";
import { useClerk, useUser } from "@clerk/clerk-react";
import type { Download, Favorite } from "@shared/types/dashboard";
import { motion } from "framer-motion";
import { Music, Star } from "lucide-react";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useSearch } from "wouter";

// Import dashboard components (no lazy loading for better performance and simpler architecture)
import { ActivityFeed } from "./ActivityFeed";
import ConnectionStatusPanel from "./ConnectionStatusPanel";
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
import DataConsistencyInfo from "./DataConsistencyInfo";
import DataSyncIndicator from "./DataSyncIndicator";
import { StatsCards } from "./StatsCards";
import StatusIndicator from "./StatusIndicator";
import { ValidatedDashboard } from "./ValidatedDashboard";

// Import unified dashboard hook
import { useDashboard } from "@/hooks/useDashboard";

// Import Convex mutation for user sync
import { useMutation } from "convex/react";

// Import other dashboard tabs (removed lazy loading)
import UserProfile from "@/components/auth/UserProfile";
import DownloadsRegenerator from "@/components/dashboard/DownloadsRegenerator";
import DownloadsTable from "@/components/dashboard/DownloadsTable";
import AnalyticsFixInfo from "./AnalyticsFixInfo";
import EnhancedAnalytics from "./EnhancedAnalytics";
import OrdersTab from "./OrdersTab";
import ReservationsTab from "./ReservationsTab";

// Import shared types

// Recommendations component (using real favorites data)
const RecommendationsPanel = memo(
  ({ favorites, isLoading }: { favorites: Favorite[]; isLoading: boolean }) => {
    const isMobile = useIsMobile();
    const maxRecommendations = isMobile ? 3 : 4;

    // Hook to resolve missing beat titles from WooCommerce
    const { fetchMissingTitles, resolvedTitles } = useBeatTitleResolver();

    // Auto-fetch missing titles when favorites change
    useEffect(() => {
      const missingTitleIds = favorites
        .filter(f => f.beatId && isFallbackTitle(f.beatTitle))
        .map(f => f.beatId);

      if (missingTitleIds.length > 0) {
        fetchMissingTitles(missingTitleIds);
      }
    }, [favorites, fetchMissingTitles]);

    // Transform favorites with resolved titles
    const favoritesWithResolvedTitles = useMemo(() => {
      return favorites.map(f => ({
        ...f,
        beatTitle:
          f.beatId && resolvedTitles[f.beatId] ? resolvedTitles[f.beatId].title : f.beatTitle,
      }));
    }, [favorites, resolvedTitles]);

    if (isLoading) {
      return <RecommendationsSkeleton />;
    }

    // Use only real favorites data - no fallbacks or mock data
    const displayFavorites = favoritesWithResolvedTitles?.slice(0, maxRecommendations) || [];

    return (
      <Card className="bg-gray-900/50 border-gray-700/50 backdrop-blur-sm">
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="flex items-center space-x-2 text-white text-sm sm:text-base">
            <Star className="h-4 w-4 sm:h-5 sm:w-5" />
            <span>Your Favorites</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 sm:p-6">
          <div className="space-y-3">
            {displayFavorites.length > 0 ? (
              displayFavorites.map((favorite, index) => (
                <div
                  key={`${favorite.id}-${index}`}
                  className="flex items-center space-x-3 p-3 rounded-lg bg-gray-800/50 hover:bg-gray-800/70 transition-colors"
                >
                  <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-lg flex items-center justify-center overflow-hidden flex-shrink-0">
                    {favorite.beatImageUrl ? (
                      <img
                        src={favorite.beatImageUrl}
                        alt={favorite.beatTitle}
                        className="w-full h-full object-cover rounded-lg"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center rounded-lg">
                        <Music className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs sm:text-sm font-medium text-white truncate">
                      {favorite.beatTitle}
                    </p>
                    <div className="flex items-center space-x-2 text-xs text-gray-400">
                      {favorite.beatGenre && <span>{favorite.beatGenre}</span>}
                      {favorite.beatBpm && (
                        <>
                          <span>•</span>
                          <span>{favorite.beatBpm} BPM</span>
                        </>
                      )}
                      {favorite.beatPrice && (
                        <>
                          <span>•</span>
                          <span>${favorite.beatPrice}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-6">
                <Star className="w-8 h-8 text-gray-600 mx-auto mb-2" />
                <p className="text-gray-400 text-xs sm:text-sm">No favorites yet</p>
                <p className="text-gray-500 text-xs mt-1">Start exploring beats to add favorites</p>
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
  const { user: clerkUser, isLoaded: isClerkLoaded } = useUser();
  const { openUserProfile } = useClerk();
  const isMobile = useIsMobile();
  const isTablet = useIsTablet();
  const { config } = useDashboardConfig();

  // Convex mutation for forcing user sync - using string reference to avoid circular dependency
  const forceSyncUser = useMutation("users/clerkSync:forceSyncCurrentUser" as never);
  const [hasSyncedUser, setHasSyncedUser] = useState(false);

  // URL-based tab management for mobile menu navigation
  const [, setLocation] = useLocation();
  const searchString = useSearch();
  const urlParams = new URLSearchParams(searchString);
  const tabFromUrl = urlParams.get("tab");

  // State management - initialize from URL if present
  const [activeTab, setActiveTab] = useState(tabFromUrl || "overview");

  // Sync tab state with URL changes
  useEffect(() => {
    if (tabFromUrl && tabFromUrl !== activeTab) {
      setActiveTab(tabFromUrl);
    }
  }, [tabFromUrl, activeTab]);
  // Only show debug panels in development mode
  const [showConsistencyInfo, setShowConsistencyInfo] = useState(
    process.env.NODE_ENV === "development"
  );
  const [showAnalyticsFixInfo, setShowAnalyticsFixInfo] = useState(
    process.env.NODE_ENV === "development"
  );

  // Use unified dashboard hook - single source of truth for all dashboard data
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
    clearError: clearDashboardError,
  } = useDashboard({
    includeChartData: true,
    includeTrends: true,
    activityLimit: (() => {
      if (isMobile) return 10;
      if (isTablet) return 15;
      return 20;
    })(),
    ordersLimit: 20,
    downloadsLimit: 50,
    favoritesLimit: 50,
    reservationsLimit: 20,
    enableRealtime: true,
  });

  // Get sync status from store for connection indicators
  const syncStatus = useSyncStatus();

  // Store actions for cross-tab sync
  const { initializeCrossTabSync, destroyCrossTabSync } = useDashboardStore();

  // Initialize cross-tab synchronization when user is authenticated
  useEffect(() => {
    if (clerkUser?.id) {
      initializeCrossTabSync(clerkUser.id);
    }

    return () => {
      destroyCrossTabSync();
    };
  }, [clerkUser?.id, initializeCrossTabSync, destroyCrossTabSync]);

  // Force sync user data from Clerk on first load if user data is missing or invalid
  useEffect(() => {
    const shouldSync =
      isClerkLoaded &&
      clerkUser &&
      !hasSyncedUser &&
      user &&
      (!user.firstName ||
        !user.lastName ||
        user.email?.includes("unknown") ||
        user.email?.includes("temp"));

    if (shouldSync) {
      console.log("🔄 Auto-syncing user data from Clerk...");
      forceSyncUser()
        .then(() => {
          console.log("✅ User data synced successfully");
          setHasSyncedUser(true);
          // Refresh dashboard data after sync
          setTimeout(() => refetch(), 1000);
        })
        .catch((error: Error) => {
          console.error("❌ Failed to sync user data:", error);
        });
    }
  }, [isClerkLoaded, clerkUser, user, hasSyncedUser, forceSyncUser, refetch]);

  // Use real stats from unified hook - no fallbacks or recalculation needed
  const consistentStats = useMemo(() => {
    if (!stats) {
      return null;
    }

    // The unified hook provides real, validated stats from Convex
    console.log("Real Dashboard Stats:", {
      totalFavorites: stats.totalFavorites,
      totalDownloads: stats.totalDownloads,
      totalOrders: stats.totalOrders,
      totalSpent: stats.totalSpent,
      dataArrays: {
        favorites: favorites?.length || 0,
        orders: orders?.length || 0,
        downloads: downloads?.length || 0,
      },
    });

    return stats;
  }, [stats, favorites?.length, orders?.length, downloads?.length]);

  // Handle tab changes - update both state and URL with debouncing to prevent rapid clicks
  const pendingTabRef = useRef<string | null>(null);
  const tabChangeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleTabChange = useCallback(
    (tab: string) => {
      // Prevent rapid tab switching - debounce with 100ms
      if (pendingTabRef.current === tab) return;

      pendingTabRef.current = tab;
      setActiveTab(tab);

      // Debounce URL update to prevent excessive history entries
      if (tabChangeTimeoutRef.current) {
        clearTimeout(tabChangeTimeoutRef.current);
      }

      tabChangeTimeoutRef.current = setTimeout(() => {
        // Update URL without full page reload
        setLocation(`/dashboard?tab=${tab}`, { replace: true });
        pendingTabRef.current = null;
      }, 100);
    },
    [setLocation]
  );

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (tabChangeTimeoutRef.current) {
        clearTimeout(tabChangeTimeoutRef.current);
      }
    };
  }, []);

  // Handle refresh using unified hook
  const handleRefresh = useCallback(async () => {
    try {
      await refetch();
      clearDashboardError();
    } catch (err) {
      console.error("Failed to refresh dashboard:", err);
    }
  }, [refetch, clearDashboardError]);

  // Handle retry using unified hook
  const handleRetry = useCallback(() => {
    try {
      retry();
    } catch (err) {
      console.error("Failed to retry dashboard sync:", err);
    }
  }, [retry]);

  // Memoized components for performance
  const statsComponent = useMemo(() => {
    const shouldShowSkeleton = isLoading || !consistentStats;

    if (shouldShowSkeleton) {
      return <StatsCardsSkeleton />;
    }

    return (
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: config.ui.animationDuration / 1000, delay: 0.2 }}
      >
        <StatsCards stats={consistentStats} isLoading={isLoading} className="mb-6 sm:mb-8" />
      </motion.div>
    );
  }, [consistentStats, isLoading, config.ui.animationDuration]);

  // Error handling
  const shouldShowAuthError = !isAuthenticated && !isLoading;
  if (shouldShowAuthError) {
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
  const shouldShowLoadingSkeleton = isLoading && !user;
  if (shouldShowLoadingSkeleton) {
    return <DashboardSkeleton />;
  }

  return (
    <DashboardErrorBoundary onError={error => console.error("Dashboard error:", error)}>
      <ValidatedDashboard
        showValidationStatus={process.env.NODE_ENV === "development"}
        showFreshnessIndicators={process.env.NODE_ENV === "development"}
        enableAutoRefresh={false}
        showDetailedValidation={process.env.NODE_ENV === "development"}
        onValidationChange={(isValid, hasMockData) => {
          if (process.env.NODE_ENV === "production" && hasMockData) {
            console.error("🚨 CRITICAL: Mock data detected in production dashboard!");
          }
        }}
      >
        <div className="pt-16 sm:pt-20 min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-violet-800 overflow-x-hidden">
          <div className="space-y-3 sm:space-y-4 md:space-y-6">
            <DashboardLayout activeTab={activeTab} onTabChange={handleTabChange}>
              {/* Dashboard Header with Enhanced Connection Status */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 mb-3 sm:mb-4 md:mb-6">
                {(() => {
                  // Prioritize Clerk data for real-time updates, with Convex as fallback
                  let userToPass = user || null;

                  // Always use Clerk data when available (it's the source of truth for user profile)
                  if (clerkUser) {
                    const baseUser = userToPass || {
                      id: clerkUser.id,
                      clerkId: clerkUser.id,
                      email: "",
                    };
                    userToPass = {
                      ...baseUser,
                      id: userToPass?.id || clerkUser.id,
                      clerkId: userToPass?.clerkId || clerkUser.id,
                      email: clerkUser.primaryEmailAddress?.emailAddress || userToPass?.email || "",
                      firstName: clerkUser.firstName || userToPass?.firstName || undefined,
                      lastName: clerkUser.lastName || userToPass?.lastName || undefined,
                      imageUrl: clerkUser.imageUrl || userToPass?.imageUrl || undefined,
                      // Always use Clerk username for real-time updates
                      username: clerkUser.username || userToPass?.username || undefined,
                    };
                  }

                  return (
                    <DashboardHeader
                      user={userToPass}
                      className="space-y-1 sm:space-y-2 flex-1 w-full sm:w-auto"
                    />
                  );
                })()}

                {/* Enhanced Data Sync Status with Connection Indicators */}
                <DataSyncIndicator
                  isLoading={isLoading}
                  onRefresh={handleRefresh}
                  lastSyncTime={
                    syncStatus?.lastSync
                      ? new Date(syncStatus.lastSync).toLocaleTimeString()
                      : undefined
                  }
                  showConnectionStatus={true}
                  showDataFreshness={true}
                  className="flex-shrink-0 w-full sm:w-auto"
                />
              </div>

              {/* Analytics Fix Information */}
              <AnalyticsFixInfo
                isVisible={showAnalyticsFixInfo}
                onDismiss={() => setShowAnalyticsFixInfo(false)}
              />

              {/* Data Consistency Information */}
              <DataConsistencyInfo
                isVisible={showConsistencyInfo}
                onDismiss={() => setShowConsistencyInfo(false)}
              />

              {/* Status Indicator - Only visible in development mode */}
              {process.env.NODE_ENV === "development" && (
                <StatusIndicator
                  showConnection={true}
                  showValidation={true}
                  showMockData={true}
                  variant="horizontal"
                  className="mb-4"
                />
              )}

              {/* Debug Data Panel removed - no mock data in production */}

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
                          activities={activity || []}
                          isLoading={isLoading}
                          maxItems={(() => {
                            if (isMobile) return 4;
                            if (isTablet) return 6;
                            return 8;
                          })()}
                        />
                      )}
                    </ContentSection>
                    <ContentSection>
                      <RecommendationsPanel favorites={favorites || []} isLoading={isLoading} />
                    </ContentSection>
                  </DashboardGrid>
                </TabContentWrapper>

                {/* Analytics Tab */}
                <TabContentWrapper value="analytics">
                  {(() => {
                    const hasAnalyticsData = config.features.analyticsCharts && trends;

                    if (hasAnalyticsData) {
                      return (
                        <EnhancedAnalytics
                          data={chartData || []}
                          trends={trends}
                          isLoading={isLoading}
                        />
                      );
                    }

                    if (isLoading) {
                      return (
                        <Card className="bg-gray-900/50 border-gray-700/50">
                          <CardContent className="p-6 text-center">
                            <div className="animate-pulse">
                              <div className="h-4 bg-gray-700 rounded w-1/2 mx-auto mb-2" />
                              <div className="h-3 bg-gray-700 rounded w-1/3 mx-auto" />
                            </div>
                          </CardContent>
                        </Card>
                      );
                    }

                    const message = config.features.analyticsCharts
                      ? "No analytics data available yet. Start using the platform to see your trends."
                      : "Analytics features are currently disabled.";

                    return (
                      <Card className="bg-gray-900/50 border-gray-700/50">
                        <CardContent className="p-6 text-center">
                          <p className="text-gray-400">{message}</p>
                        </CardContent>
                      </Card>
                    );
                  })()}
                </TabContentWrapper>

                {/* Activity Tab */}
                <TabContentWrapper value="activity">
                  {isLoading ? (
                    <ActivityFeedSkeleton />
                  ) : (
                    <ActivityFeed
                      activities={activity || []}
                      isLoading={isLoading}
                      maxItems={(() => {
                        if (isMobile) return 10;
                        if (isTablet) return 15;
                        return 20;
                      })()}
                      showHeader={false}
                    />
                  )}
                </TabContentWrapper>

                {/* Orders Tab */}
                <TabContentWrapper value="orders">
                  <OrdersTab
                    ordersData={{ items: orders || [], hasMore: false }}
                    ordersLoading={isLoading}
                    onLoadMore={() => {
                      // Implement load more functionality
                      console.log("Load more orders");
                    }}
                  />
                </TabContentWrapper>

                {/* Downloads Tab */}
                <TabContentWrapper value="downloads">
                  <div className="space-y-6">
                    {/* Downloads Regenerator - Only show if user has few or no downloads but has orders */}
                    {(!downloads || downloads.length === 0) && orders && orders.length > 0 && (
                      <DownloadsRegenerator onRegenerateComplete={handleRefresh} className="mb-6" />
                    )}

                    <DownloadsTable
                      downloads={
                        downloads?.map((d: Download) => ({
                          id: d.id,
                          beatId: d.beatId,
                          beatTitle: d.beatTitle,
                          artist: d.beatArtist,
                          fileSize: d.fileSize || 0,
                          format: d.format,
                          quality: d.quality || "",
                          downloadedAt: d.downloadedAt,
                          downloadCount: d.downloadCount,
                          maxDownloads: d.maxDownloads,
                          licenseType: d.licenseType,
                          downloadUrl: d.downloadUrl || "",
                        })) || []
                      }
                      isLoading={isLoading}
                      onRefresh={handleRefresh}
                    />
                  </div>
                </TabContentWrapper>

                {/* Reservations Tab */}
                <TabContentWrapper value="reservations">
                  <ReservationsTab reservations={reservations || []} />
                </TabContentWrapper>

                {/* Profile Tab */}
                <TabContentWrapper value="profile">
                  <UserProfile className="max-w-4xl mx-auto" />
                </TabContentWrapper>

                {/* Settings Tab */}
                <TabContentWrapper value="settings">
                  <DashboardGrid columns="2">
                    {/* User Profile Section */}
                    <Card className="bg-gray-900/50 border-gray-700/50 backdrop-blur-sm">
                      <CardHeader className="p-4 sm:p-6">
                        <CardTitle className="flex items-center space-x-2 text-white text-sm sm:text-base">
                          <span>User Profile</span>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4 p-4 sm:p-6">
                        <div className="space-y-3">
                          <div>
                            <p className="text-xs sm:text-sm font-medium text-white">Full Name</p>
                            <p className="text-muted-foreground text-xs sm:text-sm">
                              {(() => {
                                // Prioritize Clerk data for name
                                if (clerkUser?.fullName) return clerkUser.fullName;
                                if (clerkUser?.firstName && clerkUser?.lastName) {
                                  return `${clerkUser.firstName} ${clerkUser.lastName}`;
                                }
                                if (user?.firstName && user?.lastName) {
                                  return `${user.firstName} ${user.lastName}`;
                                }
                                if (clerkUser?.firstName) return clerkUser.firstName;
                                if (user?.firstName) return user.firstName;
                                return "Not set";
                              })()}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs sm:text-sm font-medium text-white">Email</p>
                            <p className="text-muted-foreground text-xs sm:text-sm">
                              {(() => {
                                // Prioritize Clerk email over invalid Convex email
                                const clerkEmail = clerkUser?.primaryEmailAddress?.emailAddress;
                                const convexEmail = user?.email;

                                // If Convex email is invalid/temp, use Clerk email
                                if (
                                  convexEmail &&
                                  !convexEmail.includes("unknown") &&
                                  !convexEmail.includes("temp")
                                ) {
                                  return convexEmail;
                                }
                                return clerkEmail || convexEmail || "Not set";
                              })()}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs sm:text-sm font-medium text-white">Username</p>
                            <p className="text-muted-foreground text-xs sm:text-sm">
                              {clerkUser?.username || user?.username || "Not set"}
                            </p>
                          </div>
                          {user?.subscription && (
                            <div>
                              <p className="text-xs sm:text-sm font-medium text-white">
                                Subscription
                              </p>
                              <p className="text-muted-foreground text-xs sm:text-sm">
                                {user.subscription.planId} - {user.subscription.status}
                              </p>
                              <p className="text-xs text-gray-500">
                                Downloads: {user.subscription.downloadUsed}/
                                {user.subscription.downloadQuota}
                              </p>
                            </div>
                          )}
                          <button
                            onClick={() => openUserProfile()}
                            className="w-full bg-purple-600 hover:bg-purple-700 text-white py-2 px-4 rounded-lg transition-colors text-sm font-medium"
                          >
                            Edit Profile
                          </button>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Dashboard Settings Section */}
                    <Card className="bg-gray-900/50 border-gray-700/50 backdrop-blur-sm">
                      <CardHeader className="p-4 sm:p-6">
                        <CardTitle className="flex items-center space-x-2 text-white text-sm sm:text-base">
                          <span>Dashboard Settings</span>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4 p-4 sm:p-6">
                        <div className="space-y-3">
                          <div>
                            <p className="text-xs sm:text-sm font-medium text-white">
                              Real-time Updates
                            </p>
                            <p className="text-muted-foreground text-xs sm:text-sm">
                              {config.features.realtimeUpdates ? "Enabled" : "Disabled"}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs sm:text-sm font-medium text-white">
                              Analytics Charts
                            </p>
                            <p className="text-muted-foreground text-xs sm:text-sm">
                              {config.features.analyticsCharts ? "Enabled" : "Disabled"}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </DashboardGrid>

                  {/* Connection Status Panel - Only visible in development mode */}
                  {process.env.NODE_ENV === "development" && (
                    <div className="mt-6">
                      <ConnectionStatusPanel
                        showMetrics={true}
                        showQuality={true}
                        showDataFreshness={true}
                        onRefresh={handleRefresh}
                        lastSyncTime={
                          syncStatus?.lastSync
                            ? new Date(syncStatus.lastSync).toISOString()
                            : undefined
                        }
                        className="bg-gray-900/50 border-gray-700/50 backdrop-blur-sm"
                      />
                    </div>
                  )}
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
                            onClick={clearDashboardError}
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
        </div>
      </ValidatedDashboard>
    </DashboardErrorBoundary>
  );
});

ModernDashboard.displayName = "ModernDashboard";

export default ModernDashboard;
