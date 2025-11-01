import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { DollarSign, Download, Heart, ShoppingCart, TrendingDown, TrendingUp } from "lucide-react";
import { useMemo } from "react";

interface StatCardProps {
  title: string;
  value: number | string;
  icon: React.ReactNode;
  trend?: {
    value: number;
    isPositive: boolean;
  } | null;
  color: string;
  delay?: number;
  formatValue?: (value: number | string) => string;
}

function StatCard({
  title,
  value,
  icon,
  trend,
  color,
  delay = 0,
  formatValue,
}: Readonly<StatCardProps>) {
  const formattedValue = useMemo(() => {
    if (formatValue && typeof value === "number") {
      return formatValue(value);
    }
    return value.toString();
  }, [value, formatValue]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      whileHover={{ scale: 1.02 }}
      className="h-full"
    >
      <Card className="bg-gray-900/50 border-gray-700/50 backdrop-blur-sm hover:bg-gray-900/70 transition-all duration-300 h-full">
        <CardContent className="p-3 sm:p-4 lg:p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 sm:space-x-3">
              <div className={cn("p-2 sm:p-3 rounded-lg", color)}>
                <div className="w-4 h-4 sm:w-5 sm:h-5">{icon}</div>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm font-medium text-gray-400 truncate">{title}</p>
                <motion.p
                  className="text-lg sm:text-xl lg:text-2xl font-bold text-white truncate"
                  initial={{ scale: 0.8 }}
                  animate={{ scale: 1 }}
                  transition={{ duration: 0.3, delay: delay + 0.2 }}
                >
                  {formattedValue}
                </motion.p>
              </div>
            </div>
            {trend && (
              <motion.div
                className={cn(
                  "flex items-center space-x-1 px-1.5 sm:px-2 py-1 rounded-full text-xs font-medium flex-shrink-0",
                  trend.isPositive ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"
                )}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3, delay: delay + 0.4 }}
              >
                {trend.isPositive ? (
                  <TrendingUp className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                ) : (
                  <TrendingDown className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                )}
                <span className="text-xs">{Math.abs(trend.value)}%</span>
              </motion.div>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

interface StatsCardsProps {
  stats: {
    totalFavorites: number;
    totalDownloads: number;
    totalOrders: number;
    totalSpent: number;
  };
  previousStats?: {
    totalFavorites: number;
    totalDownloads: number;
    totalOrders: number;
    totalSpent: number;
  };
  isLoading?: boolean;
  className?: string;
}

export function StatsCards({
  stats,
  previousStats,
  isLoading,
  className,
}: Readonly<StatsCardsProps>) {
  const calculateTrend = (current: number, previous?: number) => {
    if (!previous || previous === 0) return null;
    const change = ((current - previous) / previous) * 100;
    return {
      value: Math.round(Math.abs(change)),
      isPositive: change >= 0,
    };
  };

  const formatCurrency = (value: number | string) => {
    const num = typeof value === "string" ? Number.parseFloat(value) : value;
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(num);
  };

  const statsConfig = [
    {
      title: "Favorites",
      value: stats.totalFavorites,
      icon: <Heart className="w-full h-full text-white" />,
      color: "bg-red-500/20",
      trend: calculateTrend(stats.totalFavorites, previousStats?.totalFavorites),
    },
    {
      title: "Downloads",
      value: stats.totalDownloads,
      icon: <Download className="w-full h-full text-white" />,
      color: "bg-blue-500/20",
      trend: calculateTrend(stats.totalDownloads, previousStats?.totalDownloads),
    },
    {
      title: "Orders",
      value: stats.totalOrders,
      icon: <ShoppingCart className="w-full h-full text-white" />,
      color: "bg-green-500/20",
      trend: calculateTrend(stats.totalOrders, previousStats?.totalOrders),
    },
    {
      title: "Total spent",
      value: stats.totalSpent,
      icon: <DollarSign className="w-full h-full text-white" />,
      color: "bg-yellow-500/20",
      trend: calculateTrend(stats.totalSpent, previousStats?.totalSpent),
      formatValue: formatCurrency,
    },
  ];

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-5 lg:gap-6">
        {Array.from({ length: 4 }, (_, i) => `stats-skeleton-${Date.now()}-${i}`).map(key => (
          <Card key={key} className="bg-gray-900/50 border-gray-700/50 animate-pulse">
            <CardContent className="p-3 sm:p-4 lg:p-6">
              <div className="flex items-center space-x-2 sm:space-x-3">
                <div className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 bg-gray-700 rounded-lg" />
                <div className="space-y-2 flex-1">
                  <div className="h-3 sm:h-4 bg-gray-700 rounded w-16 sm:w-20" />
                  <div className="h-4 sm:h-6 lg:h-8 bg-gray-700 rounded w-12 sm:w-16" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-5 lg:gap-6",
        className
      )}
    >
      {statsConfig.map((stat, index) => (
        <StatCard
          key={stat.title}
          title={stat.title}
          value={stat.value}
          icon={stat.icon}
          color={stat.color}
          trend={stat.trend}
          delay={index * 0.1}
          formatValue={stat.formatValue}
        />
      ))}
    </div>
  );
}

// Composant pour les statistiques détaillées
export function DetailedStatsCard({
  title,
  children,
  className,
}: Readonly<{
  title: string;
  children: React.ReactNode;
  className?: string;
}>) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className={className}
    >
      <Card className="bg-gray-900/50 border-gray-700/50 backdrop-blur-sm">
        <CardContent className="p-4 sm:p-6">
          <h3 className="text-base sm:text-lg font-semibold text-white mb-4">{title}</h3>
          {children}
        </CardContent>
      </Card>
    </motion.div>
  );
}
