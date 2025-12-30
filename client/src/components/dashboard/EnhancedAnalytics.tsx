/**
 * Enhanced Analytics Component
 *
 * Interactive analytics dashboard with comprehensive statistics,
 * trend analysis, and multiple time period support.
 *
 * Requirements addressed:
 * - 8.1: Show favorites, downloads, orders, and revenue metrics
 * - 8.2: Provide period-over-period comparisons
 * - 8.3: Display interactive analytics with multiple time periods
 * - 8.4: Accurate calculations without hardcoded values
 * - 7.1: Proper currency formatting with symbols
 * - 7.4: Handle cents vs dollars consistently
 */

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAnalyticsData } from "@/hooks/useDashboardData";
import { cn } from "@/lib/utils";
import type { ChartDataPoint, TrendData } from "@shared/types/dashboard";
import {
  Activity,
  Calendar,
  DollarSign,
  Download,
  Heart,
  Percent,
  ShoppingCart,
  Target,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

// Time period options
type TimePeriod = "7d" | "30d" | "90d" | "1y";

interface PeriodOption {
  value: TimePeriod;
  label: string;
  shortLabel: string;
}

const PERIOD_OPTIONS: PeriodOption[] = [
  { value: "7d", label: "Last 7 days", shortLabel: "7D" },
  { value: "30d", label: "Last 30 days", shortLabel: "30D" },
  { value: "90d", label: "Last 90 days", shortLabel: "90D" },
  { value: "1y", label: "Last year", shortLabel: "1Y" },
];

// Chart colors
const CHART_COLORS = {
  orders: "#3b82f6",
  downloads: "#10b981",
  revenue: "#f59e0b",
  favorites: "#ef4444",
};

// Currency formatter
const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
};

// Number formatter
const formatNumber = (value: number): string => {
  return new Intl.NumberFormat("en-US").format(value);
};

// Percentage formatter
const formatPercent = (value: number): string => {
  return `${value >= 0 ? "+" : ""}${value.toFixed(1)}%`;
};

interface TrendCardProps {
  readonly title: string;
  readonly value: number;
  readonly trend: {
    value: number;
    change: number;
    changePercent: number;
    isPositive: boolean;
  };
  readonly icon: React.ReactNode;
  readonly color: string;
  readonly formatter?: (value: number) => string;
  /** Indicates this shows total count, not limited data */
  readonly showTotalIndicator?: boolean;
}

function TrendCard({
  title,
  value,
  trend,
  icon,
  color,
  formatter = formatNumber,
  showTotalIndicator = true,
}: TrendCardProps) {
  return (
    <Card className="bg-gray-900/50 border-gray-700/50 backdrop-blur-sm">
      <CardContent className="p-4 sm:p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className={cn("p-2 rounded-lg", color)}>
              <div className="w-5 h-5 text-white">{icon}</div>
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <p className="text-sm font-medium text-gray-400">{title}</p>
                {showTotalIndicator && (
                  <span className="text-xs text-gray-500 bg-gray-800/50 px-2 py-0.5 rounded">
                    Total
                  </span>
                )}
              </div>
              <p className="text-2xl font-bold text-white">{formatter(value)}</p>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div
            className={cn(
              "flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium",
              trend.isPositive ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"
            )}
          >
            {trend.isPositive ? (
              <TrendingUp className="w-3 h-3" />
            ) : (
              <TrendingDown className="w-3 h-3" />
            )}
            <span>{formatPercent(trend.changePercent)}</span>
          </div>
          <p className="text-xs text-gray-500">
            {trend.isPositive ? "+" : ""}
            {formatter(trend.change)} vs previous period
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

interface AdvancedMetricsProps {
  readonly metrics: {
    conversionRates: {
      favoriteToDownload: number;
      downloadToOrder: number;
    };
    averageOrderValue: number;
    dailyAverages: {
      orders: number;
      downloads: number;
      favorites: number;
      revenue: number;
    };
    totalRevenue: number;
    periodDays: number;
  };
}

function AdvancedMetrics({ metrics }: AdvancedMetricsProps) {
  const conversionData = [
    {
      name: "Favorites to Downloads",
      value: metrics.conversionRates.favoriteToDownload,
      color: CHART_COLORS.favorites,
    },
    {
      name: "Downloads to Orders",
      value: metrics.conversionRates.downloadToOrder,
      color: CHART_COLORS.orders,
    },
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Conversion Rates */}
      <Card className="bg-gray-900/50 border-gray-700/50 backdrop-blur-sm">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center space-x-2 text-white">
            <Target className="w-5 h-5" />
            <span>Conversion Rates</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {conversionData.map(item => (
              <div key={item.name} className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-sm text-gray-300">{item.name}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Percent className="w-4 h-4 text-gray-400" />
                  <span className="text-sm font-medium text-white">{item.value.toFixed(1)}%</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Key Metrics */}
      <Card className="bg-gray-900/50 border-gray-700/50 backdrop-blur-sm">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center space-x-2 text-white">
            <Activity className="w-5 h-5" />
            <span>Key Metrics</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-300">Average Order Value</span>
              <span className="text-sm font-medium text-white">
                {formatCurrency(metrics.averageOrderValue)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-300">Daily Revenue</span>
              <span className="text-sm font-medium text-white">
                {formatCurrency(metrics.dailyAverages.revenue)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-300">Daily Orders</span>
              <span className="text-sm font-medium text-white">
                {metrics.dailyAverages.orders.toFixed(1)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-300">Daily Downloads</span>
              <span className="text-sm font-medium text-white">
                {metrics.dailyAverages.downloads.toFixed(1)}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

interface EnhancedAnalyticsProps {
  readonly data?: ChartDataPoint[];
  readonly trends?: TrendData;
  readonly advancedMetrics?: {
    conversionRates: {
      favoriteToDownload: number;
      downloadToOrder: number;
    };
    averageOrderValue: number;
    dailyAverages: {
      orders: number;
      downloads: number;
      favorites: number;
      revenue: number;
    };
    totalRevenue: number;
    periodDays: number;
  };
  readonly isLoading?: boolean;
  readonly className?: string;
}

export function EnhancedAnalytics({
  data = [],
  trends,
  advancedMetrics,
  isLoading = false,
  className,
}: EnhancedAnalyticsProps) {
  const [selectedPeriod, setSelectedPeriod] = useState<TimePeriod>("30d");
  const [chartType, setChartType] = useState<"line" | "bar">("line");

  // Fetch analytics data for the selected period from backend
  const { data: analyticsData, isLoading: isAnalyticsLoading } = useAnalyticsData(selectedPeriod);

  // Use backend data for chart when available, otherwise fall back to props
  const chartData = analyticsData?.chartData || data;
  const displayTrends = analyticsData?.trends || trends;
  const loading = isAnalyticsLoading || isLoading;

  // Keep advancedMetrics from props only (don't show backend advancedMetrics)
  const displayAdvancedMetrics = advancedMetrics;

  // Filter data based on selected period (client-side filtering as backup)
  const filteredData = useMemo(() => {
    if (!chartData.length) return [];

    const getPeriodDays = (period: TimePeriod): number => {
      switch (period) {
        case "7d":
          return 7;
        case "30d":
          return 30;
        case "90d":
          return 90;
        case "1y":
          return 365;
        default:
          return 30;
      }
    };

    const days = getPeriodDays(selectedPeriod);
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    return chartData.filter((item: ChartDataPoint) => new Date(item.date) >= cutoffDate);
  }, [chartData, selectedPeriod]);

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header with Period Selection */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white mb-2">Analytics Dashboard</h2>
          <p className="text-gray-400">Comprehensive insights into your performance</p>
        </div>

        <div className="flex items-center space-x-2">
          <Calendar className="w-4 h-4 text-gray-400" />
          <div className="flex bg-gray-800 rounded-lg p-1">
            {PERIOD_OPTIONS.map(option => (
              <Button
                key={option.value}
                variant={selectedPeriod === option.value ? "default" : "ghost"}
                size="sm"
                onClick={() => setSelectedPeriod(option.value)}
                className={cn(
                  "text-xs px-3 py-1",
                  selectedPeriod === option.value
                    ? "bg-blue-600 text-white"
                    : "text-gray-400 hover:text-white hover:bg-gray-700"
                )}
              >
                {option.shortLabel}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* Trend Cards */}
      {(() => {
        if (loading) {
          return (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {Array.from({ length: 4 }, (_, i) => `trend-loading-${i}`).map(key => (
                <div key={key} className="bg-gray-800/50 rounded-lg p-6 animate-pulse">
                  <div className="h-4 bg-gray-700 rounded w-3/4 mb-2" />
                  <div className="h-8 bg-gray-700 rounded w-1/2" />
                </div>
              ))}
            </div>
          );
        }

        if (displayTrends) {
          return (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <TrendCard
                title="Orders (30d)"
                value={displayTrends.orders.value}
                trend={displayTrends.orders}
                icon={<ShoppingCart className="w-full h-full" />}
                color="bg-blue-500/20"
                showTotalIndicator={false}
              />
              <TrendCard
                title="Downloads (30d)"
                value={displayTrends.downloads.value}
                trend={displayTrends.downloads}
                icon={<Download className="w-full h-full" />}
                color="bg-green-500/20"
                showTotalIndicator={false}
              />
              <TrendCard
                title="Revenue (30d)"
                value={displayTrends.revenue.value}
                trend={displayTrends.revenue}
                icon={<DollarSign className="w-full h-full" />}
                color="bg-yellow-500/20"
                formatter={formatCurrency}
                showTotalIndicator={false}
              />
              <TrendCard
                title="Favorites (30d)"
                value={displayTrends.favorites.value}
                trend={displayTrends.favorites}
                icon={<Heart className="w-full h-full" />}
                color="bg-red-500/20"
                showTotalIndicator={false}
              />
            </div>
          );
        }

        return (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-gray-800/50 rounded-lg p-6">
              <p className="text-gray-400 text-center">No trend data available</p>
            </div>
          </div>
        );
      })()}

      {/* Main Chart */}
      <Card className="bg-gray-900/50 border-gray-700/50 backdrop-blur-sm">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-white">Performance Overview</CardTitle>
            <div className="flex bg-gray-800 rounded-lg p-1">
              <Button
                variant={chartType === "line" ? "default" : "ghost"}
                size="sm"
                onClick={() => setChartType("line")}
                className={cn(
                  "text-xs px-3 py-1",
                  chartType === "line"
                    ? "bg-blue-600 text-white"
                    : "text-gray-400 hover:text-white hover:bg-gray-700"
                )}
              >
                Line
              </Button>
              <Button
                variant={chartType === "bar" ? "default" : "ghost"}
                size="sm"
                onClick={() => setChartType("bar")}
                className={cn(
                  "text-xs px-3 py-1",
                  chartType === "bar"
                    ? "bg-blue-600 text-white"
                    : "text-gray-400 hover:text-white hover:bg-gray-700"
                )}
              >
                Bar
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {(() => {
            if (loading) {
              return <div className="h-80 bg-gray-800/50 rounded animate-pulse" />;
            }

            if (filteredData.length === 0) {
              return (
                <div className="h-80 flex items-center justify-center">
                  <div className="text-center">
                    <Activity className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                    <p className="text-gray-400">
                      No analytics data available for the selected period
                    </p>
                  </div>
                </div>
              );
            }

            return (
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  {chartType === "line" ? (
                    <LineChart data={filteredData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                      <XAxis
                        dataKey="date"
                        stroke="#9ca3af"
                        fontSize={12}
                        tickFormatter={value =>
                          new Date(value).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                          })
                        }
                      />
                      <YAxis stroke="#9ca3af" fontSize={12} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#1f2937",
                          border: "1px solid #374151",
                          borderRadius: "8px",
                          color: "#fff",
                        }}
                        formatter={(value, name) => {
                          if (name === "revenue")
                            return [formatCurrency(value as number), "Revenue"];
                          return [formatNumber(value as number), name];
                        }}
                        labelFormatter={label =>
                          new Date(label).toLocaleDateString("en-US", {
                            weekday: "short",
                            month: "short",
                            day: "numeric",
                          })
                        }
                      />
                      <Line
                        type="monotone"
                        dataKey="orders"
                        stroke={CHART_COLORS.orders}
                        strokeWidth={2}
                      />
                      <Line
                        type="monotone"
                        dataKey="downloads"
                        stroke={CHART_COLORS.downloads}
                        strokeWidth={2}
                      />
                      <Line
                        type="monotone"
                        dataKey="favorites"
                        stroke={CHART_COLORS.favorites}
                        strokeWidth={2}
                      />
                    </LineChart>
                  ) : (
                    <BarChart data={filteredData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                      <XAxis
                        dataKey="date"
                        stroke="#9ca3af"
                        fontSize={12}
                        tickFormatter={value =>
                          new Date(value).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                          })
                        }
                      />
                      <YAxis stroke="#9ca3af" fontSize={12} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#1f2937",
                          border: "1px solid #374151",
                          borderRadius: "8px",
                          color: "#fff",
                        }}
                        formatter={(value, name) => {
                          if (name === "revenue")
                            return [formatCurrency(value as number), "Revenue"];
                          return [formatNumber(value as number), name];
                        }}
                        labelFormatter={label =>
                          new Date(label).toLocaleDateString("en-US", {
                            weekday: "short",
                            month: "short",
                            day: "numeric",
                          })
                        }
                      />
                      <Bar dataKey="orders" fill={CHART_COLORS.orders} />
                      <Bar dataKey="downloads" fill={CHART_COLORS.downloads} />
                      <Bar dataKey="favorites" fill={CHART_COLORS.favorites} />
                    </BarChart>
                  )}
                </ResponsiveContainer>
              </div>
            );
          })()}
        </CardContent>
      </Card>

      {/* Advanced Metrics */}
      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {Array.from({ length: 2 }, (_, i) => `metrics-loading-${i}`).map(key => (
            <div key={key} className="bg-gray-900/50 rounded-lg p-6 animate-pulse">
              <div className="h-6 bg-gray-700 rounded w-1/3 mb-4" />
              <div className="space-y-3">
                {Array.from({ length: 4 }, (_, j) => `metric-item-${j}`).map(itemKey => (
                  <div key={itemKey} className="flex justify-between">
                    <div className="h-4 bg-gray-700 rounded w-1/2" />
                    <div className="h-4 bg-gray-700 rounded w-1/4" />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        displayAdvancedMetrics && <AdvancedMetrics metrics={displayAdvancedMetrics} />
      )}
    </div>
  );
}

export default EnhancedAnalytics;
