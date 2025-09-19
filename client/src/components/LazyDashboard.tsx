/**
 * Legacy Dashboard Component (Modernized)
 *
 * This component has been modernized to remove unnecessary lazy loading
 * and use the new dashboard architecture while maintaining backward compatibility.
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

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useIsMobile, useIsTablet } from "@/hooks/useBreakpoint";
import { useDashboardDataOptimized } from "@/hooks/useDashboardDataOptimized";
import { useClerk, useUser } from "@clerk/clerk-react";
import { api } from "@convex/_generated/api";
import { useQueryClient } from "@tanstack/react-query";
import { useQuery as useConvexQuery } from "convex/react";
import { motion } from "framer-motion";
import {
  Activity,
  BarChart3,
  Download,
  Music,
  Settings,
  ShoppingCart,
  Star,
  TrendingUp,
  User,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

// Import components directly (no lazy loading for better performance and simpler architecture)
import DownloadsTable from "@/components/DownloadsTable";
import UserProfile from "@/components/UserProfile";
import { ActivityFeed } from "@/components/dashboard/ActivityFeed";
import { DashboardErrorBoundary } from "@/components/dashboard/DashboardErrorBoundary";
import {
  ActivityFeedSkeleton,
  LoadingWithRetry,
  RecommendationsSkeleton,
  StatsCardsSkeleton,
} from "@/components/dashboard/DashboardSkeletons";
import OrdersTab from "@/components/dashboard/OrdersTab";
import ReservationsTab from "@/components/dashboard/ReservationsTab";
import { StatsCards } from "@/components/dashboard/StatsCards";
import { TrendCharts } from "@/components/dashboard/TrendCharts";

// Types locaux simplifiés (éviter les conflits avec les hooks)
type DashboardFavorite = {
  id?: string;
  beatId: string | number;
  beatTitle?: string;
  createdAt?: number | string;
};

type DashboardOrder = {
  id?: string | number;
  beatId?: string | number;
  beatTitle?: string;
  total?: number;
  status?: string;
  createdAt?: number | string;
  invoice_number?: string | number;
  email?: string;
  items?: any[];
};

type DashboardDownload = {
  id?: string;
  beatId: string | number;
  beatTitle?: string;
  downloadedAt?: string;
  downloadUrl?: string;
};

// Use modernized components (removed duplicate definitions)

// Skeleton components are now imported from DashboardSkeletons

// Composant principal du Dashboard
export function LazyDashboard() {
  const { user } = useUser();
  const { openUserProfile } = useClerk();
  const isMobile = useIsMobile();
  const isTablet = useIsTablet();
  // Active tab needs to be defined before realtime queries so we can conditionally enable them
  const [activeTab, setActiveTab] = useState("overview");
  const {
    stats,
    favorites,
    orders,
    downloads,
    reservations,
    recommendations,
    recentActivity,
    chartData,
    trends,
    isLoading,
    favoritesAddedPerMonth,
    refetch,
    loadMoreOrders,
  } = useDashboardDataOptimized();

  // Cache pour enrichir les téléchargements avec les titres WooCommerce si absents en base
  const [downloadBeatMeta, setDownloadBeatMeta] = useState<Record<number, { title?: string }>>({});

  useEffect(() => {
    const controller = new AbortController();
    async function fetchMissingTitles() {
      const toFetch = new Set<number>();
      (downloads || []).forEach((d: any) => {
        const idNum = Number(d.beatId);
        if (!d.beatTitle && Number.isFinite(idNum) && !downloadBeatMeta[idNum]) {
          toFetch.add(idNum);
        }
      });
      if (toFetch.size === 0) return;

      await Promise.all(
        Array.from(toFetch).map(async id => {
          try {
            const res = await fetch(`/api/woocommerce/products/${id}`, {
              signal: controller.signal,
            });
            if (!res.ok) return;
            const data = await res.json();
            const title = data?.name || data?.title || data?.beat?.name || undefined;
            if (title) {
              setDownloadBeatMeta(prev => ({ ...prev, [id]: { title } }));
            }
          } catch (_) {
            // Ignore network errors silently; UI already has a fallback name
          }
        })
      );
    }

    fetchMissingTitles();
    return () => controller.abort();
  }, [downloads, downloadBeatMeta]);

  // Real-time sources
  const queryClient = useQueryClient();
  // Only fetch realtime favorites when the overview tab (which renders the recommendations block) is active
  // Use lightweight any-casted function refs to avoid TS2589
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const uqAny: any = useConvexQuery as unknown as any;
  // Helper indirection to avoid deep generic instantiation on Convex generated `api`
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const apiAny = (a: unknown): any => a as any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const getFavoritesAny: any = apiAny(api)?.["favorites/getFavorites"]?.getFavorites as any;
  const rtFavorites = uqAny(getFavoritesAny, user && activeTab === "overview" ? {} : "skip");
  // Fetch activity in realtime only when Overview or Activity tab is active
  const shouldFetchActivity = activeTab === "overview" || activeTab === "activity";
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const getRecentActivityAny: any = apiAny(api)?.["activity/getRecent"]?.getRecent as any;
  const rtActivity = uqAny(getRecentActivityAny, user && shouldFetchActivity ? {} : "skip");

  // Prefer realtime favorites when available
  const favoritesEffective = useMemo(() => {
    return (rtFavorites || favorites || []) as any[];
  }, [rtFavorites, favorites]);

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [analyticsTimeRange, setAnalyticsTimeRange] = useState<"7d" | "30d" | "90d" | "1y">("30d");
  const [convexError, setConvexError] = useState<string | null>(null);

  const unreadCount = 3;

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refetch();
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  // Invalidate relevant queries on download-success events
  useEffect(() => {
    const onDownloadSuccess = () => {
      // Dashboard aggregate
      queryClient.invalidateQueries({ queryKey: ["dashboard-data"] });
      // Realtime-friendly keys used across hooks
      queryClient.invalidateQueries({ queryKey: ["convex", "downloads"] });
      queryClient.invalidateQueries({ queryKey: ["convex", "activity"] });
    };
    window.addEventListener("download-success", onDownloadSuccess);
    return () => window.removeEventListener("download-success", onDownloadSuccess);
  }, [queryClient]);

  // Invalidate after order creation/update events
  useEffect(() => {
    const invalidateOrders = () => {
      queryClient.invalidateQueries({ queryKey: ["dashboard-data"] });
      queryClient.invalidateQueries({ queryKey: ["convex", "orders"] });
      queryClient.invalidateQueries({ queryKey: ["convex", "activity"] });
    };
    window.addEventListener("order-created", invalidateOrders);
    window.addEventListener("order-updated", invalidateOrders);
    // Also listen to generic webhook signal (optional server-sent event via window dispatch)
    window.addEventListener("webhook-order-updated", invalidateOrders as any);
    return () => {
      window.removeEventListener("order-created", invalidateOrders);
      window.removeEventListener("order-updated", invalidateOrders);
      window.removeEventListener("webhook-order-updated", invalidateOrders as any);
    };
  }, [queryClient]);

  const handleRetry = async () => {
    setConvexError(null);
    await handleRefresh();
  };

  const handleError = (error: Error) => {
    console.error("Dashboard error:", error);
    setConvexError(error.message);
  };

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

  // Error state handled via convexError below

  return (
    <DashboardErrorBoundary onError={handleError}>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="pt-16 sm:pt-20 min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-violet-800"
      >
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8 space-y-4 sm:space-y-6">
          {/* En-tête du Dashboard */}
          <motion.div
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="space-y-2"
          >
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-2">
                  Hello, {user?.firstName || "User"} 👋
                </h1>
                <p className="text-sm sm:text-base text-gray-300">
                  Here is an overview of your activity on BroLab
                </p>
              </div>
              <div className="flex items-center space-x-2 sm:space-x-4">
                {/* Refresh button removed; realtime + auto invalidation covers updates. Use Retry in error card. */}
              </div>
            </div>
          </motion.div>

          {/* Statistics */}
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            {isLoading ? (
              <StatsCardsSkeleton />
            ) : (
              <StatsCards stats={stats} isLoading={Boolean(isLoading)} className="mb-6 sm:mb-8" />
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
                    {isMobile ? "Overview" : "Overview"}
                  </TabsTrigger>
                  <TabsTrigger
                    value="activity"
                    className="px-2 sm:px-4 py-2 rounded-md whitespace-nowrap flex-shrink-0 data-[state=active]:bg-purple-600 data-[state=active]:text-white text-xs sm:text-sm"
                  >
                    <Activity className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                    Activity
                  </TabsTrigger>
                  <TabsTrigger
                    value="analytics"
                    className="px-2 sm:px-4 py-2 rounded-md whitespace-nowrap flex-shrink-0 data-[state=active]:bg-purple-600 data-[state=active]:text-white text-xs sm:text-sm"
                  >
                    <BarChart3 className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                    Analytics
                  </TabsTrigger>
                  <TabsTrigger
                    value="orders"
                    className="px-2 sm:px-4 py-2 rounded-md whitespace-nowrap flex-shrink-0 data-[state=active]:bg-purple-600 data-[state=active]:text-white text-xs sm:text-sm"
                  >
                    <ShoppingCart className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                    Orders
                  </TabsTrigger>
                  <TabsTrigger
                    value="downloads"
                    className="px-2 sm:px-4 py-2 rounded-md whitespace-nowrap flex-shrink-0 data-[state=active]:bg-purple-600 data-[state=active]:text-white text-xs sm:text-sm"
                  >
                    <Download className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                    Downloads
                  </TabsTrigger>
                  <TabsTrigger
                    value="reservations"
                    className="px-2 sm:px-4 py-2 rounded-md whitespace-nowrap flex-shrink-0 data-[state=active]:bg-purple-600 data-[state=active]:text-white text-xs sm:text-sm"
                  >
                    <Star className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                    Reservations
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
                    {isLoading ? (
                      <ActivityFeedSkeleton />
                    ) : (
                      <ActivityFeed
                        activities={(rtActivity as any) || recentActivity || []}
                        isLoading={Boolean(isLoading)}
                        maxItems={isMobile ? 4 : isTablet ? 6 : 8}
                      />
                    )}
                  </div>
                  <Card className="bg-gray-900/50 border-gray-700/50 backdrop-blur-sm">
                    <CardHeader className="p-4 sm:p-6">
                      <CardTitle className="flex items-center space-x-2 text-white text-sm sm:text-base">
                        <Star className="h-4 w-4 sm:h-5 sm:w-5" />
                        <span>Recommendations</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 sm:p-6">
                      {isLoading ? (
                        <RecommendationsSkeleton />
                      ) : (
                        <div className="space-y-3">
                          {favoritesEffective &&
                            favoritesEffective.slice(0, isMobile ? 3 : 4).map((favorite, index) => (
                              <div
                                key={index}
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
                            ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="analytics" className="space-y-4 sm:space-y-6">
                {isLoading ? (
                  <div className="bg-gray-900/50 border-gray-700/50 rounded-lg p-6">
                    <div className="h-64 bg-gray-800/50 rounded animate-pulse" />
                  </div>
                ) : (
                  <TrendCharts
                    data={chartData || []}
                    trends={trends || {}}
                    favoritesMonthly={favoritesAddedPerMonth}
                    isLoading={Boolean(isLoading)}
                  />
                )}
              </TabsContent>

              <TabsContent value="activity" className="space-y-4 sm:space-y-6">
                {isLoading ? (
                  <ActivityFeedSkeleton />
                ) : (
                  <ActivityFeed
                    activities={(rtActivity as any) || recentActivity || []}
                    isLoading={Boolean(isLoading)}
                    maxItems={isMobile ? 10 : isTablet ? 15 : 20}
                    showHeader={false}
                  />
                )}
              </TabsContent>

              <TabsContent value="orders" className="space-y-4 sm:space-y-6">
                <OrdersTab
                  ordersData={orders}
                  ordersLoading={Boolean(isLoading)}
                  onLoadMore={loadMoreOrders}
                />
              </TabsContent>

              <TabsContent value="downloads" className="space-y-4 sm:space-y-6">
                <DownloadsTable
                  downloads={(downloads || []).map((d: any) => ({
                    id: d._id || d.id || `download-${d.beatId}`,
                    beatTitle:
                      downloadBeatMeta[Number(d.beatId)]?.title ||
                      d.beatTitle ||
                      `Beat ${d.beatId}`,
                    artist: d.artist,
                    fileSize: typeof d.fileSize === "number" ? d.fileSize : 0,
                    format: (d.format || "mp3") as unknown,
                    quality: d.quality || "320kbps",
                    downloadedAt: new Date(d.timestamp || Date.now()).toISOString(),
                    downloadCount: typeof d.quotaUsed === "number" ? d.quotaUsed : 0,
                    maxDownloads: typeof d.quotaLimit === "number" ? d.quotaLimit : undefined,
                    licenseType: d.licenseType,
                    downloadUrl: d.downloadUrl || "",
                  }))}
                  isLoading={Boolean(isLoading)}
                  onRefresh={handleRefresh}
                />
              </TabsContent>

              <TabsContent value="reservations" className="space-y-4 sm:space-y-6">
                <ReservationsTab reservations={reservations} />
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
                            Nom complet
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

          {/* Gestion des erreurs Convex */}
          {convexError && (
            <Card className="border-red-200 bg-red-50">
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-red-500 rounded-full" />
                  <p className="text-red-700 text-xs sm:text-sm">Convex error: {convexError}</p>
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
}

export default LazyDashboard;
