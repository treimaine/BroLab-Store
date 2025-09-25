import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import {
  Clock,
  DollarSign,
  Download,
  Headphones,
  Heart,
  Music,
  ShoppingCart,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { useMemo } from "react";

interface BroLabStatCardProps {
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
  subtitle?: string;
}

function BroLabStatCard({
  title,
  value,
  icon,
  trend,
  color,
  delay = 0,
  formatValue,
  subtitle,
}: BroLabStatCardProps) {
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
                {subtitle && <p className="text-xs text-gray-500 truncate">{subtitle}</p>}
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

/**
 * BroLab Stats Cards - Revenue Tracking and User Engagement Metrics
 *
 * Business Value:
 * - Tracks customer lifetime value through music investment
 * - Monitors subscription value via download quotas
 * - Encourages platform engagement through collection metrics
 * - Provides key performance indicators for business analytics
 *
 * @see docs/dashboard-component-business-value.md for detailed analysis
 */
interface BroLabStatsCardsProps {
  stats: {
    totalFavorites: number;
    totalDownloads: number;
    totalOrders: number;
    totalSpent: number;
    quotaUsed?: number;
    quotaLimit?: number;
    monthlyDownloads?: number;
    monthlyOrders?: number;
    // Enhanced music marketplace metrics
    totalBeatPlays?: number;
    totalListeningTime?: number; // in minutes
    averageBeatPrice?: number;
    favoriteGenres?: string[];
    preferredBpmRange?: { min: number; max: number };
    licenseTypeBreakdown?: {
      basic: number;
      premium: number;
      unlimited: number;
    };
  };
  previousStats?: {
    totalFavorites: number;
    totalDownloads: number;
    totalOrders: number;
    totalSpent: number;
    totalBeatPlays?: number;
    totalListeningTime?: number;
  };
  isLoading?: boolean;
  className?: string;
}

export function BroLabStatsCards({
  stats,
  previousStats,
  isLoading,
  className,
}: BroLabStatsCardsProps) {
  const calculateTrend = (current: number, previous?: number) => {
    if (!previous || previous === 0) return null;
    const change = ((current - previous) / previous) * 100;
    return {
      value: Math.round(Math.abs(change)),
      isPositive: change >= 0,
    };
  };

  const formatCurrency = (value: number | string) => {
    const num = typeof value === "string" ? parseFloat(value) : value;
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(num);
  };

  const formatQuota = (used: number, limit: number) => {
    return `${used}/${limit}`;
  };

  // Enhanced BroLab-specific stats configuration focused on music marketplace metrics
  const broLabStatsConfig = [
    {
      title: "Beat Collection",
      value: stats.totalFavorites,
      icon: <Heart className="w-full h-full text-white" />,
      color: "bg-red-500/20",
      trend: calculateTrend(stats.totalFavorites, previousStats?.totalFavorites),
      subtitle: "Curated beats library",
    },
    {
      title: "Licensed Beats",
      value: stats.totalOrders,
      icon: <Music className="w-full h-full text-white" />,
      color: "bg-purple-500/20",
      trend: calculateTrend(stats.totalOrders, previousStats?.totalOrders),
      subtitle: "Owned beat licenses",
    },
    {
      title: "Beat Downloads",
      value:
        stats.quotaUsed !== undefined && stats.quotaLimit !== undefined
          ? formatQuota(stats.quotaUsed, stats.quotaLimit)
          : stats.totalDownloads,
      icon: <Download className="w-full h-full text-white" />,
      color: "bg-blue-500/20",
      trend: calculateTrend(stats.totalDownloads, previousStats?.totalDownloads),
      subtitle: stats.quotaUsed !== undefined ? "Monthly quota usage" : "Total downloads",
    },
    {
      title: "Music Investment",
      value: stats.totalSpent,
      icon: <DollarSign className="w-full h-full text-white" />,
      color: "bg-green-500/20",
      trend: calculateTrend(stats.totalSpent, previousStats?.totalSpent),
      formatValue: formatCurrency,
      subtitle: "Beat licensing budget",
    },
  ];

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="bg-gray-900/50 border-gray-700/50 animate-pulse">
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
        "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6",
        className
      )}
    >
      {broLabStatsConfig.map((stat, index) => (
        <BroLabStatCard
          key={stat.title}
          title={stat.title}
          value={stat.value}
          icon={stat.icon}
          color={stat.color}
          trend={stat.trend}
          delay={index * 0.1}
          formatValue={stat.formatValue}
          subtitle={stat.subtitle}
        />
      ))}
    </div>
  );
}

// BroLab-specific detailed stats for music marketplace insights
export function BroLabDetailedStatsCard({
  title,
  children,
  className,
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className={className}
    >
      <Card className="bg-gray-900/50 border-gray-700/50 backdrop-blur-sm">
        <CardContent className="p-4 sm:p-6">
          <h3 className="text-base sm:text-lg font-semibold text-white mb-4 flex items-center space-x-2">
            <Music className="w-4 h-4 sm:w-5 sm:h-5" />
            <span>{title}</span>
          </h3>
          {children}
        </CardContent>
      </Card>
    </motion.div>
  );
}

// Enhanced music marketplace metrics component
export function BroLabMusicMetrics({
  stats,
  className,
}: {
  stats: BroLabStatsCardsProps["stats"];
  className?: string;
}) {
  const formatListeningTime = (minutes: number) => {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}m`;
  };

  const musicMetrics = [
    {
      label: "Beat Engagement",
      items: [
        {
          label: "Total Plays",
          value: stats.totalBeatPlays || 0,
          icon: <Headphones className="w-3 h-3" />,
          color: "text-purple-400",
        },
        {
          label: "Listening Time",
          value: stats.totalListeningTime ? formatListeningTime(stats.totalListeningTime) : "0m",
          icon: <Clock className="w-3 h-3" />,
          color: "text-blue-400",
        },
      ],
    },
    {
      label: "Purchase Analytics",
      items: [
        {
          label: "Avg Beat Price",
          value: stats.averageBeatPrice ? `$${stats.averageBeatPrice.toFixed(2)}` : "$0.00",
          icon: <DollarSign className="w-3 h-3" />,
          color: "text-green-400",
        },
        {
          label: "Collection Value",
          value: `$${stats.totalSpent.toFixed(2)}`,
          icon: <Music className="w-3 h-3" />,
          color: "text-yellow-400",
        },
      ],
    },
    {
      label: "Download Quota",
      items: [
        {
          label: "Used",
          value: stats.quotaUsed || 0,
          icon: <Download className="w-3 h-3" />,
          color: "text-orange-400",
        },
        {
          label: "Remaining",
          value: (stats.quotaLimit || 0) - (stats.quotaUsed || 0),
          icon: <ShoppingCart className="w-3 h-3" />,
          color: "text-cyan-400",
        },
      ],
    },
  ];

  return (
    <div className={cn("space-y-4", className)}>
      {musicMetrics.map((section, _sectionIndex) => (
        <div key={section.label} className="space-y-2">
          <h4 className="text-sm font-medium text-gray-400">{section.label}</h4>
          <div className="grid grid-cols-2 gap-3">
            {section.items.map((item, _itemIndex) => (
              <div
                key={item.label}
                className="bg-gray-800/50 rounded-lg p-3 flex items-center space-x-2"
              >
                <div className={cn("flex-shrink-0", item.color)}>{item.icon}</div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-gray-400">{item.label}</p>
                  <p className="text-sm font-semibold text-white">{item.value}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// License type breakdown component for music marketplace
export function BroLabLicenseBreakdown({
  licenseData,
  className,
}: {
  licenseData?: {
    basic: number;
    premium: number;
    unlimited: number;
  };
  className?: string;
}) {
  if (!licenseData) return null;

  const total = licenseData.basic + licenseData.premium + licenseData.unlimited;
  if (total === 0) return null;

  const licenses = [
    {
      type: "Basic License",
      count: licenseData.basic,
      percentage: Math.round((licenseData.basic / total) * 100),
      color: "bg-blue-500",
      description: "Non-profit use",
    },
    {
      type: "Premium License",
      count: licenseData.premium,
      percentage: Math.round((licenseData.premium / total) * 100),
      color: "bg-purple-500",
      description: "Commercial use",
    },
    {
      type: "Unlimited License",
      count: licenseData.unlimited,
      percentage: Math.round((licenseData.unlimited / total) * 100),
      color: "bg-green-500",
      description: "Exclusive rights",
    },
  ];

  return (
    <div className={cn("space-y-4", className)}>
      <h4 className="text-sm font-medium text-gray-400">License Distribution</h4>
      <div className="space-y-3">
        {licenses.map(license => (
          <div key={license.type} className="space-y-2">
            <div className="flex justify-between items-center">
              <div>
                <span className="text-sm text-white font-medium">{license.type}</span>
                <p className="text-xs text-gray-500">{license.description}</p>
              </div>
              <div className="text-right">
                <span className="text-sm font-semibold text-white">{license.count}</span>
                <p className="text-xs text-gray-400">{license.percentage}%</p>
              </div>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-2">
              <div
                className={cn("h-2 rounded-full", license.color)}
                style={{ width: `${license.percentage}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Quick stats for music-specific metrics (legacy component for backward compatibility)
export function BroLabQuickStats({
  stats,
  className,
}: {
  stats: BroLabStatsCardsProps["stats"];
  className?: string;
}) {
  return <BroLabMusicMetrics stats={stats} className={className} />;
}
