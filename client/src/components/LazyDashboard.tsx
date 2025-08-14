import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useIsMobile, useIsTablet } from "@/hooks/useBreakpoint";
import { useDashboardDataOptimized } from "@/hooks/useDashboardDataOptimized";
import { useClerk, useUser } from "@clerk/clerk-react";
import { motion } from "framer-motion";
import {
  Activity,
  BarChart3,
  Download,
  Music,
  RefreshCw,
  Settings,
  ShoppingCart,
  Star,
  TrendingUp,
  User,
} from "lucide-react";
import { lazy, Suspense, useState } from "react";

// Lazy-load heavy dashboard subcomponents
const StatsCards = lazy(() =>
  import("@/components/dashboard/StatsCards").then(m => ({ default: m.StatsCards }))
);
const ActivityFeed = lazy(() =>
  import("@/components/dashboard/ActivityFeed").then(m => ({ default: m.ActivityFeed }))
);
const TrendCharts = lazy(() =>
  import("@/components/dashboard/TrendCharts").then(m => ({ default: m.TrendCharts }))
);
const OrdersTab = lazy(() => import("@/components/dashboard/OrdersTab"));
const ReservationsTab = lazy(() => import("@/components/dashboard/ReservationsTab"));
const DownloadsTable = lazy(() => import("@/components/DownloadsTable"));
const UserProfile = lazy(() => import("@/components/UserProfile"));
// SubscriptionManager supprimé - gestion via interface Clerk native

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

// Composants de chargement
function LoadingWithRetry({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      <p className="text-gray-400">Chargement du tableau de bord...</p>
      <Button onClick={onRetry} variant="outline" size="sm">
        Réessayer
      </Button>
    </div>
  );
}

function ErrorBoundary({
  children,
  onError,
}: {
  children: React.ReactNode;
  onError: (error: Error) => void;
}) {
  return <div>{children}</div>;
}

// Squelettes de chargement
function StatsSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="bg-gray-900/50 rounded-lg p-4 sm:p-6 h-24 sm:h-32">
          <Skeleton className="h-4 w-20 mb-2" />
          <Skeleton className="h-6 sm:h-8 w-16 mb-1" />
          <Skeleton className="h-3 w-24" />
        </div>
      ))}
    </div>
  );
}

function ActivitySkeleton() {
  return (
    <Card className="bg-gray-900/50 border-gray-700/50">
      <CardHeader className="p-4 sm:p-6">
        <Skeleton className="h-6 w-32" />
      </CardHeader>
      <CardContent className="space-y-4 p-4 sm:p-6">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex items-center space-x-3">
            <Skeleton className="h-8 w-8 sm:h-10 sm:w-10 rounded-full" />
            <div className="space-y-2 flex-1">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function RecommendationsSkeleton() {
  return (
    <div className="space-y-3">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="flex items-center space-x-3 p-3 rounded-lg bg-gray-800/50">
          <Skeleton className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
          <Skeleton className="h-6 w-12" />
        </div>
      ))}
    </div>
  );
}

function ChartsSkeleton() {
  return (
    <Card className="bg-gray-900/50 border-gray-700/50">
      <CardHeader className="p-4 sm:p-6">
        <Skeleton className="h-6 w-40" />
      </CardHeader>
      <CardContent className="p-4 sm:p-6">
        <div className="h-48 sm:h-64 w-full">
          <div className="h-full w-full bg-gray-800/50 rounded animate-pulse" />
        </div>
      </CardContent>
    </Card>
  );
}

// Composant principal du Dashboard
export function LazyDashboard() {
  const { user } = useUser();
  const { openUserProfile } = useClerk();
  const isMobile = useIsMobile();
  const isTablet = useIsTablet();
  const {
    stats,
    favorites,
    orders,
    downloads,
    recommendations,
    recentActivity,
    chartData,
    trends,
    isLoading,
    error,
    refetch,
  } = useDashboardDataOptimized();

  const [activeTab, setActiveTab] = useState("overview");
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

  if (error) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="pt-16 sm:pt-20 min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-violet-800 flex items-center justify-center px-4"
      >
        <div className="text-center space-y-4">
          <p className="text-red-400">Erreur lors du chargement du tableau de bord</p>
          <Button onClick={handleRefresh} variant="outline">
            Réessayer
          </Button>
        </div>
      </motion.div>
    );
  }

  return (
    <ErrorBoundary onError={handleError}>
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
                  Bonjour, {user?.firstName || "Utilisateur"} 👋
                </h1>
                <p className="text-sm sm:text-base text-gray-300">
                  Voici un aperçu de votre activité sur BroLab
                </p>
              </div>
              <div className="flex items-center space-x-2 sm:space-x-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRefresh}
                  disabled={isRefreshing}
                  className="border-gray-600 text-gray-300 hover:bg-gray-800 text-xs sm:text-sm"
                >
                  <RefreshCw
                    className={`w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2 ${isRefreshing ? "animate-spin" : ""}`}
                  />
                  {isRefreshing ? "Actualisation..." : "Actualiser"}
                </Button>
              </div>
            </div>
          </motion.div>

          {/* Statistiques */}
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <Suspense fallback={<StatsSkeleton />}>
              <StatsCards stats={stats} isLoading={isLoading} className="mb-6 sm:mb-8" />
            </Suspense>
          </motion.div>

          {/* Onglets du Dashboard */}
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4 sm:space-y-6">
              <div className="overflow-x-auto">
                <TabsList className="flex w-full min-w-max bg-gray-900/50 border-gray-700/50 backdrop-blur-sm gap-2 sm:gap-4 px-2 sm:px-4 py-1 sm:py-2">
                  <TabsTrigger
                    value="overview"
                    className="px-2 sm:px-4 py-2 rounded-md whitespace-nowrap flex-shrink-0 data-[state=active]:bg-purple-600 data-[state=active]:text-white text-xs sm:text-sm"
                  >
                    <TrendingUp className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                    {isMobile ? "Vue" : "Vue d'ensemble"}
                  </TabsTrigger>
                  <TabsTrigger
                    value="activity"
                    className="px-2 sm:px-4 py-2 rounded-md whitespace-nowrap flex-shrink-0 data-[state=active]:bg-purple-600 data-[state=active]:text-white text-xs sm:text-sm"
                  >
                    <Activity className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                    Activité
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
                    Commandes
                  </TabsTrigger>
                  <TabsTrigger
                    value="downloads"
                    className="px-2 sm:px-4 py-2 rounded-md whitespace-nowrap flex-shrink-0 data-[state=active]:bg-purple-600 data-[state=active]:text-white text-xs sm:text-sm"
                  >
                    <Download className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                    Téléchargements
                  </TabsTrigger>
                  <TabsTrigger
                    value="reservations"
                    className="px-2 sm:px-4 py-2 rounded-md whitespace-nowrap flex-shrink-0 data-[state=active]:bg-purple-600 data-[state=active]:text-white text-xs sm:text-sm"
                  >
                    <Star className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                    Réservations
                  </TabsTrigger>
                  <TabsTrigger
                    value="profile"
                    className="px-2 sm:px-4 py-2 rounded-md whitespace-nowrap flex-shrink-0 data-[state=active]:bg-purple-600 data-[state=active]:text-white text-xs sm:text-sm"
                  >
                    <User className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                    Profil
                  </TabsTrigger>
                  <TabsTrigger
                    value="settings"
                    className="px-2 sm:px-4 py-2 rounded-md whitespace-nowrap flex-shrink-0 data-[state=active]:bg-purple-600 data-[state=active]:text-white text-xs sm:text-sm"
                  >
                    <Settings className="h-4 w-4 sm:h-5 sm:w-5" />
                    Paramètres
                  </TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value="overview" className="space-y-4 sm:space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
                  <div className="lg:col-span-2">
                    <Suspense fallback={<ActivitySkeleton />}>
                      <ActivityFeed
                        activities={recentActivity || []}
                        isLoading={isLoading}
                        maxItems={isMobile ? 4 : isTablet ? 6 : 8}
                      />
                    </Suspense>
                  </div>
                  <Card className="bg-gray-900/50 border-gray-700/50 backdrop-blur-sm">
                    <CardHeader className="p-4 sm:p-6">
                      <CardTitle className="flex items-center space-x-2 text-white text-sm sm:text-base">
                        <Star className="h-4 w-4 sm:h-5 sm:w-5" />
                        <span>Recommandations</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 sm:p-6">
                      <Suspense fallback={<RecommendationsSkeleton />}>
                        <div className="space-y-3">
                          {favorites &&
                            favorites.slice(0, isMobile ? 3 : 4).map((favorite, index) => (
                              <div
                                key={index}
                                className="flex items-center space-x-3 p-3 rounded-lg bg-gray-800/50"
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
                      </Suspense>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="analytics" className="space-y-4 sm:space-y-6">
                <Suspense fallback={<ChartsSkeleton />}>
                  <TrendCharts data={chartData || []} trends={trends || {}} isLoading={isLoading} />
                </Suspense>
              </TabsContent>

              <TabsContent value="activity" className="space-y-4 sm:space-y-6">
                <Suspense fallback={<ActivitySkeleton />}>
                  <ActivityFeed
                    activities={recentActivity || []}
                    isLoading={isLoading}
                    maxItems={isMobile ? 10 : isTablet ? 15 : 20}
                    showHeader={false}
                  />
                </Suspense>
              </TabsContent>

              <TabsContent value="orders" className="space-y-4 sm:space-y-6">
                <OrdersTab ordersData={orders} />
              </TabsContent>

              <TabsContent value="downloads" className="space-y-4 sm:space-y-6">
                <DownloadsTable
                  downloads={
                    downloads?.map((download: any) => ({
                      id: download.id || download._id || `download-${download.beatId}`,
                      beatTitle: download.beatTitle || `Beat ${download.beatId}`,
                      artist: "Artiste inconnu",
                      fileSize: 5.2,
                      format: "mp3" as const,
                      quality: "320kbps",
                      downloadedAt: new Date().toISOString(),
                      downloadCount: 1,
                      maxDownloads: 3,
                      licenseType: "Standard",
                      downloadUrl: download.downloadUrl || "/download/beat",
                    })) || []
                  }
                  isLoading={isLoading}
                  onRefresh={handleRefresh}
                />
              </TabsContent>

              <TabsContent value="reservations" className="space-y-4 sm:space-y-6">
                <Suspense fallback={<ActivitySkeleton />}>
                  <ReservationsTab reservations={[]} />
                </Suspense>
              </TabsContent>

              <TabsContent value="profile" className="space-y-4 sm:space-y-6">
                <Suspense fallback={<ActivitySkeleton />}>
                  <UserProfile className="max-w-4xl mx-auto" />
                </Suspense>
              </TabsContent>

              <TabsContent value="settings" className="space-y-4 sm:space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                  <Card className="bg-gray-900 border-gray-700">
                    <CardHeader className="p-4 sm:p-6">
                      <CardTitle className="flex items-center space-x-2 text-white text-sm sm:text-base">
                        <User className="h-4 w-4 sm:h-5 sm:w-5" />
                        <span>Profil utilisateur</span>
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
                          // Ouvrir l'interface Clerk pour modifier le profil
                          openUserProfile();
                        }}
                      >
                        Modifier le profil
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
                  <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                  <p className="text-red-700 text-xs sm:text-sm">Erreur Convex: {convexError}</p>
                  <Button
                    onClick={handleRetry}
                    size="sm"
                    className="ml-auto bg-red-600 hover:bg-red-700 text-xs"
                  >
                    Réessayer
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </motion.div>
    </ErrorBoundary>
  );
}

export default LazyDashboard;
