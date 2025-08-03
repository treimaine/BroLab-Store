import { OrderList } from "@/components/orders/OrderList";
import { RecentlyViewedBeats } from "@/components/RecentlyViewedBeats";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useDownloadInvoice, useOrder, useOrderInvoice } from "@/hooks/useOrders";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Clock,
  Download,
  Eye,
  Gift,
  Heart,
  Music,
  Package,
  Settings,
  ShoppingCart,
  TrendingUp,
  Trophy,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useLocation } from "wouter";

interface UserStats {
  totalPurchases: number;
  totalSpent: number;
  favoriteGenre: string;
  joinDate: string;
  loyaltyPoints: number;
  nextRewardAt: number;
}

interface RecentActivity {
  id: string;
  type: "purchase" | "favorite" | "download" | "view";
  beatTitle: string;
  date: string;
  amount?: number;
}

interface Recommendation {
  id: string;
  title: string;
  artist: string;
  genre: string;
  price: number;
  imageUrl: string;
  matchScore: number;
  reason: string;
}

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState("overview");
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Check if user is authenticated
  const {
    data: user,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["/api/auth/user"],
    retry: false,
  });

  // Fetch user orders for stats
  const {
    data: ordersData,
    error: ordersError,
    isLoading: ordersLoading,
  } = useQuery({
    queryKey: ["orders", "stats"],
    queryFn: async () => {
      const response = await fetch("/api/orders/me");
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to fetch orders");
      }
      return response.json();
    },
    enabled: !!user,
    retry: 1,
  });

  // Fetch user favorites
  const { data: favoritesData } = useQuery({
    queryKey: ["favorites"],
    queryFn: async () => {
      const response = await fetch("/api/wishlist");
      if (!response.ok) throw new Error("Failed to fetch favorites");
      return response.json();
    },
    enabled: !!user,
  });

  // Fetch all products for recommendations
  const { data: allProducts } = useQuery({
    queryKey: ["products", "recommendations"],
    queryFn: async () => {
      const response = await fetch("/api/products?per_page=100");
      if (!response.ok) throw new Error("Failed to fetch products");
      return response.json();
    },
    enabled: !!user,
  });

  // Fetch selected order details
  const { data: orderData, isLoading: isLoadingOrder } = useOrder(selectedOrderId || 0);
  const { data: invoiceData } = useOrderInvoice(selectedOrderId || 0);
  const downloadInvoice = useDownloadInvoice(selectedOrderId || 0);

  // Type guard for user object
  const typedUser = (user as any)?.user as {
    id?: number;
    username?: string;
    email?: string;
    avatar?: string;
    name?: string;
    subscription?: string;
    memberSince?: string;
  } | null;

  // Calculate real stats from orders data
  const calculateStats = (): UserStats => {
    const orders = ordersData?.orders || [];
    const totalPurchases = orders.length;
    const totalSpent = orders.reduce((sum: number, order: any) => sum + (order.total || 0), 0);

    // Calculate favorite genre from orders
    const genreCounts: { [key: string]: number } = {};
    orders.forEach((order: any) => {
      if (order.items) {
        order.items.forEach((item: any) => {
          if (item.genre) {
            genreCounts[item.genre] = (genreCounts[item.genre] || 0) + 1;
          }
        });
      }
    });

    const favoriteGenre =
      Object.keys(genreCounts).length > 0
        ? Object.entries(genreCounts).sort(([, a], [, b]) => b - a)[0][0]
        : "Hip Hop";

    return {
      totalPurchases,
      totalSpent: totalSpent / 100, // Convert from cents
      favoriteGenre,
      joinDate: typedUser?.memberSince || "2023-03-15",
      loyaltyPoints: Math.floor(totalSpent / 10), // 1 point per $10 spent
      nextRewardAt: 500,
    };
  };

  const stats = calculateStats();

  // Generate real activity from orders and favorites
  const generateActivity = (): RecentActivity[] => {
    const activities: RecentActivity[] = [];

    // Add purchase activities from orders
    if (ordersData?.orders) {
      ordersData.orders.slice(0, 5).forEach((order: any) => {
        activities.push({
          id: `order-${order.id}`,
          type: "purchase",
          beatTitle: order.items?.[0]?.name || "Unknown Beat",
          date: order.created_at,
          amount: order.total / 100,
        });
      });
    }

    // Add favorite activities
    if (favoritesData?.favorites) {
      favoritesData.favorites.slice(0, 3).forEach((favorite: any) => {
        activities.push({
          id: `favorite-${favorite.id}`,
          type: "favorite",
          beatTitle: favorite.name || "Unknown Beat",
          date: favorite.created_at || new Date().toISOString(),
        });
      });
    }

    // Sort by date and take the most recent 5
    return activities
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 5);
  };

  const recentActivity = generateActivity();

  // Generate personalized recommendations based on user data
  const generateRecommendations = (): Recommendation[] => {
    if (!allProducts?.products || !user) {
      return [];
    }

    const products = allProducts.products;
    const userPreferences = {
      genres: new Set<string>(),
      priceRange: { min: 0, max: 0 },
      favoriteArtists: new Set<string>(),
    };

    // Analyze user preferences from orders
    if (ordersData?.orders) {
      ordersData.orders.forEach((order: any) => {
        if (order.items) {
          order.items.forEach((item: any) => {
            if (item.genre) userPreferences.genres.add(item.genre);
            if (item.artist) userPreferences.favoriteArtists.add(item.artist);
            const price = item.price || 0;
            userPreferences.priceRange.max = Math.max(userPreferences.priceRange.max, price);
            userPreferences.priceRange.min = Math.min(userPreferences.priceRange.min, price);
          });
        }
      });
    }

    // Analyze user preferences from favorites
    if (favoritesData?.favorites) {
      favoritesData.favorites.forEach((favorite: any) => {
        if (favorite.genre) userPreferences.genres.add(favorite.genre);
        if (favorite.artist) userPreferences.favoriteArtists.add(favorite.artist);
      });
    }

    // Generate recommendations based on preferences
    const recommendations: Recommendation[] = [];
    const seenIds = new Set<string>();

    // Filter products based on user preferences
    const filteredProducts = products.filter((product: any) => {
      const productGenre = product.categories?.[0]?.name;
      const productPrice = parseFloat(product.price) || 0;

      // Skip if already seen or if user already owns/favorited
      if (seenIds.has(product.id.toString())) return false;

      // Check if product matches user preferences
      const genreMatch =
        userPreferences.genres.size === 0 ||
        (productGenre && userPreferences.genres.has(productGenre));

      const priceMatch =
        userPreferences.priceRange.max === 0 ||
        (productPrice >= userPreferences.priceRange.min * 0.8 &&
          productPrice <= userPreferences.priceRange.max * 1.2);

      return genreMatch && priceMatch;
    });

    // Create recommendations with match scores
    filteredProducts.slice(0, 6).forEach((product: any, index: number) => {
      const productGenre = product.categories?.[0]?.name;
      const productPrice = parseFloat(product.price) || 0;

      // Calculate match score
      let matchScore = 50; // Base score

      // Genre match (40% weight)
      if (productGenre && userPreferences.genres.has(productGenre)) {
        matchScore += 40;
      }

      // Price match (20% weight)
      if (userPreferences.priceRange.max > 0) {
        const priceDiff = Math.abs(
          productPrice - (userPreferences.priceRange.max + userPreferences.priceRange.min) / 2
        );
        const maxPriceDiff = userPreferences.priceRange.max - userPreferences.priceRange.min;
        if (maxPriceDiff > 0) {
          const priceScore = Math.max(0, 20 - (priceDiff / maxPriceDiff) * 20);
          matchScore += priceScore;
        }
      }

      // Artist match (20% weight)
      if (product.meta_data) {
        const artistMeta = product.meta_data.find((meta: any) => meta.key === "artist");
        if (artistMeta && userPreferences.favoriteArtists.has(artistMeta.value)) {
          matchScore += 20;
        }
      }

      // Popularity bonus (10% weight)
      const downloads = product.total_sales || 0;
      if (downloads > 100) matchScore += 10;

      // Generate reason
      let reason = "Based on your preferences";
      if (productGenre && userPreferences.genres.has(productGenre)) {
        reason = `Similar to your ${productGenre} favorites`;
      } else if (userPreferences.genres.size > 0) {
        reason = "New genre you might like";
      }

      recommendations.push({
        id: product.id.toString(),
        title: product.name,
        artist: product.meta_data?.find((meta: any) => meta.key === "artist")?.value || "Producer",
        genre: productGenre || "Unknown",
        price: productPrice,
        imageUrl: product.images?.[0]?.src || "/api/placeholder/200/200",
        matchScore: Math.min(100, Math.max(0, matchScore)),
        reason,
      });

      seenIds.add(product.id.toString());
    });

    // If not enough personalized recommendations, add popular items
    if (recommendations.length < 3) {
      const popularProducts = products
        .filter((product: any) => !seenIds.has(product.id.toString()))
        .sort((a: any, b: any) => (b.total_sales || 0) - (a.total_sales || 0))
        .slice(0, 3 - recommendations.length);

      popularProducts.forEach((product: any) => {
        recommendations.push({
          id: product.id.toString(),
          title: product.name,
          artist:
            product.meta_data?.find((meta: any) => meta.key === "artist")?.value || "Producer",
          genre: product.categories?.[0]?.name || "Unknown",
          price: parseFloat(product.price) || 0,
          imageUrl: product.images?.[0]?.src || "/api/placeholder/200/200",
          matchScore: 75,
          reason: "Popular among our users",
        });
      });
    }

    return recommendations.sort((a, b) => b.matchScore - a.matchScore);
  };

  const recommendations = generateRecommendations();

  // Handle recommendation click
  const handleRecommendationClick = (recommendation: Recommendation) => {
    // Navigate to the product page
    setLocation(`/product/${recommendation.id}`);
  };

  // Handle order details modal
  const handleOrderClick = (orderId: number) => {
    setSelectedOrderId(orderId);
    setIsOrderModalOpen(true);
  };

  const handleCloseOrderModal = () => {
    setIsOrderModalOpen(false);
    setSelectedOrderId(null);
  };

  const handleDownloadInvoice = async () => {
    if (!selectedOrderId) return;

    try {
      await downloadInvoice();
      toast({
        title: "Succès",
        description: "Facture téléchargée avec succès",
      });
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de télécharger la facture",
        variant: "destructive",
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "completed":
      case "paid":
        return "bg-green-500/20 text-green-400 border-green-500/50";
      case "pending":
      case "processing":
        return "bg-yellow-500/20 text-yellow-400 border-yellow-500/50";
      case "cancelled":
      case "failed":
        return "bg-red-500/20 text-red-400 border-red-500/50";
      default:
        return "bg-gray-500/20 text-gray-400 border-gray-500/50";
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatOrderDate = (date: string) => {
    return new Date(date).toLocaleDateString("fr-FR", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const handleAvatarUpload = async (url: string) => {
    // Invalider le cache utilisateur pour forcer le rechargement
    queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });

    toast({
      title: "Succès",
      description: "Avatar mis à jour avec succès",
    });
  };

  // Redirect if not authenticated
  useEffect(() => {
    if (!isLoading && (error || !typedUser)) {
      toast({
        title: "Authentication Required",
        description: "Please log in to access the dashboard",
        variant: "destructive",
      });
      setTimeout(() => {
        setLocation("/login");
      }, 1000);
    }
  }, [isLoading, error, user, setLocation, toast]);

  // Show loading state
  if (isLoading) {
    return (
      <div className="pt-16 bg-[var(--deep-black)] min-h-screen">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="animate-pulse">
            <div className="h-8 bg-[var(--medium-gray)] rounded w-1/4 mb-8"></div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="card-dark h-32"></div>
              ))}
            </div>
            <div className="card-dark h-96"></div>
          </div>
        </div>
      </div>
    );
  }

  // Show error state or redirect
  if (error || !user) {
    return (
      <div className="pt-16 bg-[var(--deep-black)] min-h-screen">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-white mb-4">Access Denied</h1>
            <p className="text-gray-300 mb-4">You need to be logged in to access this page</p>
            <p className="text-gray-400">Redirecting to login...</p>
          </div>
        </div>
      </div>
    );
  }

  const getActivityIcon = (type: string) => {
    switch (type) {
      case "purchase":
        return <ShoppingCart className="w-4 h-4 text-[var(--accent-green)]" />;
      case "favorite":
        return <Heart className="w-4 h-4 text-red-400" />;
      case "download":
        return <Download className="w-4 h-4 text-[var(--accent-purple)]" />;
      case "view":
        return <Eye className="w-4 h-4 text-blue-400" />;
      default:
        return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  return (
    <div className="pt-16 bg-[var(--dark-gray)] min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center space-x-4 mb-4">
            <Avatar
              src={typedUser?.avatar}
              alt={typedUser?.username || "User"}
              size="lg"
              editable={true}
              onUpload={handleAvatarUpload}
            />
            <div>
              <h1 className="text-3xl font-bold text-white">
                Welcome back, {typedUser?.username || "User"}
              </h1>
              <p className="text-gray-300">
                {typedUser?.subscription || "Free"} Member since{" "}
                {typedUser?.memberSince || "Recently"}
              </p>
            </div>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-5 bg-[var(--medium-gray)] mb-8">
            <TabsTrigger
              value="overview"
              className="text-gray-400 data-[state=active]:text-white data-[state=active]:bg-[var(--accent-purple)]"
            >
              Overview
            </TabsTrigger>
            <TabsTrigger
              value="activity"
              className="text-gray-400 data-[state=active]:text-white data-[state=active]:bg-[var(--accent-purple)]"
            >
              Activity
            </TabsTrigger>
            <TabsTrigger
              value="orders"
              className="text-gray-400 data-[state=active]:text-white data-[state=active]:bg-[var(--accent-purple)]"
            >
              Commandes
            </TabsTrigger>
            <TabsTrigger
              value="recommendations"
              className="text-gray-400 data-[state=active]:text-white data-[state=active]:bg-[var(--accent-purple)]"
            >
              For You
            </TabsTrigger>
            <TabsTrigger
              value="settings"
              className="text-gray-400 data-[state=active]:text-white data-[state=active]:bg-[var(--accent-purple)]"
            >
              Settings
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card className="bg-[var(--medium-gray)] border-[var(--medium-gray)]">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-400 text-sm">Total Purchases</p>
                      <p className="text-2xl font-bold text-white">{stats.totalPurchases}</p>
                    </div>
                    <ShoppingCart className="w-8 h-8 text-[var(--accent-purple)]" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-[var(--medium-gray)] border-[var(--medium-gray)]">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-400 text-sm">Total Spent</p>
                      <p className="text-2xl font-bold text-white">
                        ${stats.totalSpent.toFixed(2)}
                      </p>
                    </div>
                    <TrendingUp className="w-8 h-8 text-[var(--accent-green)]" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-[var(--medium-gray)] border-[var(--medium-gray)]">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-400 text-sm">Favorite Genre</p>
                      <p className="text-2xl font-bold text-white">{stats.favoriteGenre}</p>
                    </div>
                    <Music className="w-8 h-8 text-[var(--accent-cyan)]" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-[var(--medium-gray)] border-[var(--medium-gray)]">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-400 text-sm">Loyalty Points</p>
                      <p className="text-2xl font-bold text-white">{stats.loyaltyPoints}</p>
                    </div>
                    <Trophy className="w-8 h-8 text-yellow-400" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Loyalty Program */}
            <Card className="bg-[var(--medium-gray)] border-[var(--medium-gray)]">
              <CardHeader>
                <CardTitle className="text-white flex items-center">
                  <Gift className="w-5 h-5 mr-2 text-[var(--accent-purple)]" />
                  Loyalty Program
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-gray-300">Progress to next reward</span>
                  <span className="text-white font-bold">
                    {stats.loyaltyPoints} / {stats.nextRewardAt} points
                  </span>
                </div>
                <Progress
                  value={(stats.loyaltyPoints / stats.nextRewardAt) * 100}
                  className="h-2"
                />
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-400">
                    {stats.nextRewardAt - stats.loyaltyPoints} points to next reward
                  </span>
                  <Badge className="bg-[var(--accent-purple)]">Free Beat Coming!</Badge>
                </div>
              </CardContent>
            </Card>

            {/* Recent Activity Preview */}
            <Card className="bg-[var(--medium-gray)] border-[var(--medium-gray)]">
              <CardHeader>
                <CardTitle className="text-white flex items-center justify-between">
                  <span className="flex items-center">
                    <Clock className="w-5 h-5 mr-2 text-[var(--accent-purple)]" />
                    Recent Activity
                  </span>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setActiveTab("orders")}
                      className="text-[var(--accent-purple)] hover:text-white"
                    >
                      Commandes
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setActiveTab("activity")}
                      className="text-[var(--accent-purple)] hover:text-white"
                    >
                      View All
                    </Button>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {recentActivity.slice(0, 3).map(activity => (
                    <div
                      key={activity.id}
                      className="flex items-center justify-between p-3 bg-[var(--dark-gray)] rounded-lg"
                    >
                      <div className="flex items-center space-x-3">
                        {getActivityIcon(activity.type)}
                        <div>
                          <p className="text-white font-medium">{activity.beatTitle}</p>
                          <p className="text-gray-400 text-sm">
                            {activity.type.charAt(0).toUpperCase() + activity.type.slice(1)}
                            {activity.amount && ` - $${activity.amount}`}
                          </p>
                        </div>
                      </div>
                      <span className="text-gray-400 text-sm">{formatDate(activity.date)}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Recently Viewed Beats */}
            <Card className="bg-[var(--medium-gray)] border-[var(--medium-gray)]">
              <CardHeader>
                <CardTitle className="text-white flex items-center">
                  <Clock className="w-5 h-5 mr-2 text-[var(--accent-purple)]" />
                  Recently Viewed Beats
                </CardTitle>
              </CardHeader>
              <CardContent>
                <RecentlyViewedBeats />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Activity Tab */}
          <TabsContent value="activity" className="space-y-6">
            <Card className="bg-[var(--medium-gray)] border-[var(--medium-gray)]">
              <CardHeader>
                <CardTitle className="text-white">Complete Activity History</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {recentActivity.map(activity => (
                    <div
                      key={activity.id}
                      className="flex items-center justify-between p-4 bg-[var(--dark-gray)] rounded-lg hover:bg-gray-700 transition-colors"
                    >
                      <div className="flex items-center space-x-4">
                        {getActivityIcon(activity.type)}
                        <div>
                          <p className="text-white font-medium">{activity.beatTitle}</p>
                          <p className="text-gray-400 text-sm">
                            {activity.type.charAt(0).toUpperCase() + activity.type.slice(1)}
                            {activity.amount && ` - $${activity.amount}`}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-gray-400 text-sm">{formatDate(activity.date)}</p>
                        {activity.amount && (
                          <p className="text-[var(--accent-green)] font-medium">
                            ${activity.amount}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Orders Tab */}
          <TabsContent value="orders" className="space-y-6">
            <Card className="bg-[var(--medium-gray)] border-[var(--medium-gray)]">
              <CardHeader>
                <CardTitle className="text-white flex items-center">
                  <Package className="w-5 h-5 mr-2 text-[var(--accent-purple)]" />
                  Historique des commandes
                </CardTitle>
                <p className="text-gray-400">Consultez et gérez vos commandes passées</p>
              </CardHeader>
              <CardContent>
                <OrderList
                  page={1}
                  limit={10}
                  onPageChange={() => {}}
                  onOrderClick={handleOrderClick}
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Recommendations Tab */}
          <TabsContent value="recommendations" className="space-y-6">
            <Card className="bg-[var(--medium-gray)] border-[var(--medium-gray)]">
              <CardHeader>
                <CardTitle className="text-white">Personalized Recommendations</CardTitle>
                <p className="text-gray-400">Based on your listening history and preferences</p>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {recommendations.map(beat => (
                    <div
                      key={beat.id}
                      className="bg-[var(--dark-gray)] rounded-lg p-4 hover:bg-gray-700 transition-colors"
                    >
                      <div className="aspect-square bg-gradient-to-br from-purple-600 to-blue-600 rounded-lg mb-4 flex items-center justify-center overflow-hidden">
                        <img
                          src={beat.imageUrl}
                          alt={beat.title}
                          className="w-full h-full object-cover"
                        />
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <h3 className="text-white font-bold truncate">{beat.title}</h3>
                          <Badge className="bg-[var(--accent-green)]">
                            {beat.matchScore}% match
                          </Badge>
                        </div>

                        <p className="text-gray-400 text-sm">by {beat.artist}</p>
                        <p className="text-gray-400 text-xs">{beat.reason}</p>

                        <div className="flex items-center justify-between pt-2">
                          <span className="text-[var(--accent-purple)] font-bold">
                            ${beat.price}
                          </span>
                          <Button
                            size="sm"
                            className="btn-primary"
                            onClick={() => handleRecommendationClick(beat)}
                          >
                            Listen
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings" className="space-y-6">
            <Card className="bg-[var(--medium-gray)] border-[var(--medium-gray)]">
              <CardHeader>
                <CardTitle className="text-white flex items-center">
                  <Settings className="w-5 h-5 mr-2 text-[var(--accent-purple)]" />
                  Account Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div>
                    <label className="text-gray-400 text-sm block mb-2">Email</label>
                    <div className="text-white bg-[var(--dark-gray)] p-3 rounded-lg">
                      {typedUser?.email || "user@example.com"}
                    </div>
                  </div>

                  <div>
                    <label className="text-gray-400 text-sm block mb-2">Subscription</label>
                    <div className="flex items-center justify-between bg-[var(--dark-gray)] p-3 rounded-lg">
                      <span className="text-white">{typedUser?.subscription || "Free"} Plan</span>
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-[var(--accent-purple)] text-[var(--accent-purple)]"
                        onClick={() => setLocation("/membership")}
                      >
                        Manage
                      </Button>
                    </div>
                  </div>

                  <div>
                    <label className="text-gray-400 text-sm block mb-2">Notifications</label>
                    <div className="bg-[var(--dark-gray)] p-3 rounded-lg space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-white">New releases</span>
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-[var(--medium-gray)] text-white"
                        >
                          Enabled
                        </Button>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-white">Personalized recommendations</span>
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-[var(--medium-gray)] text-white"
                        >
                          Enabled
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="text-gray-400 text-sm block mb-2">Quick Actions</label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <Button
                        variant="outline"
                        className="border-[var(--medium-gray)] text-white hover:bg-[var(--accent-purple)]"
                        onClick={() => setLocation("/wishlist")}
                      >
                        <Heart className="w-4 h-4 mr-2" />
                        My Wishlist
                      </Button>
                      <Button
                        variant="outline"
                        className="border-[var(--medium-gray)] text-white hover:bg-[var(--accent-purple)]"
                        onClick={() => setLocation("/cart")}
                      >
                        <ShoppingCart className="w-4 h-4 mr-2" />
                        My Cart
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Order Details Modal */}
      <Dialog open={isOrderModalOpen} onOpenChange={setIsOrderModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-[var(--medium-gray)] border-[var(--medium-gray)]">
          <DialogHeader>
            <DialogTitle className="flex justify-between items-center text-white">
              <span>Détails de la commande</span>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleCloseOrderModal}
                className="text-gray-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </Button>
            </DialogTitle>
          </DialogHeader>

          {isLoadingOrder ? (
            <div className="flex justify-center items-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--accent-purple)]"></div>
            </div>
          ) : orderData?.order ? (
            <div className="space-y-6">
              {/* Order Header */}
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-white">
                    Commande #{orderData.order.invoice_number || orderData.order.id}
                  </h2>
                  <p className="text-sm text-gray-400 mt-1">
                    {formatOrderDate(orderData.order.created_at)}
                  </p>
                </div>

                {invoiceData?.url && (
                  <Button
                    variant="outline"
                    onClick={handleDownloadInvoice}
                    className="border-gray-600 text-gray-300 hover:text-white"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Télécharger la facture
                  </Button>
                )}
              </div>

              {/* Order Status */}
              <Card className="bg-[var(--dark-gray)] border-gray-700">
                <CardHeader className="pb-3">
                  <CardTitle className="flex justify-between items-center text-white">
                    <span>Statut de la commande</span>
                    <Badge className={getStatusColor(orderData.order.status)}>
                      {orderData.order.status}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4">
                  <div>
                    <h3 className="font-medium text-gray-300 mb-1">Email</h3>
                    <p className="text-gray-400">{orderData.order.email}</p>
                  </div>
                  {orderData.order.shipping_address && (
                    <div>
                      <h3 className="font-medium text-gray-300 mb-1">Adresse de livraison</h3>
                      <p className="text-gray-400 whitespace-pre-line">
                        {orderData.order.shipping_address}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Order Items */}
              <Card className="bg-[var(--dark-gray)] border-gray-700">
                <CardHeader className="pb-3">
                  <CardTitle className="text-white">Détails de la commande</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="divide-y divide-gray-700">
                    {orderData.items.map((item, index) => (
                      <div
                        key={index}
                        className="py-4 first:pt-0 last:pb-0 flex justify-between items-center"
                      >
                        <div>
                          <p className="text-gray-200">{item.name}</p>
                          <p className="text-sm text-gray-400">
                            Quantité: {item.quantity} × {item.price.toFixed(2)} €
                          </p>
                        </div>
                        <p className="text-gray-200 font-medium">{item.total.toFixed(2)} €</p>
                      </div>
                    ))}
                  </div>

                  <div className="mt-6 pt-6 border-t border-gray-700">
                    <div className="flex justify-between items-center text-lg font-bold">
                      <span className="text-gray-200">Total</span>
                      <span className="text-gray-100">{orderData.order.total.toFixed(2)} €</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-red-400">
                Une erreur est survenue lors du chargement de la commande
              </p>
              <Button
                variant="outline"
                className="mt-4 border-gray-600 text-gray-300 hover:text-white"
                onClick={() => window.location.reload()}
              >
                Réessayer
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
