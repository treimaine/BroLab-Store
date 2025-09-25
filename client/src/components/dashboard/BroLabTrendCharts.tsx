import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
  Star,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

// Enhanced BroLab-specific chart data types for music marketplace analytics
interface BroLabChartDataPoint {
  date: string;
  orders: number;
  downloads: number;
  revenue: number;
  beats?: number; // Optional for backward compatibility
  favorites?: number; // Optional for backward compatibility
  // Enhanced music marketplace metrics
  beatPlays?: number;
  listeningTime?: number; // in minutes
  uniqueBeatsPlayed?: number;
  averageSessionLength?: number; // in minutes
  licenseTypes?: {
    basic: number;
    premium: number;
    unlimited: number;
  };
  genreBreakdown?: {
    [genre: string]: number;
  };
  bpmRanges?: {
    slow: number; // 60-90 BPM
    medium: number; // 90-120 BPM
    fast: number; // 120+ BPM
  };
}

interface BroLabTrendData {
  period: string;
  value: number;
  change: number;
  changePercent: number;
}

/**
 * BroLab Trend Charts - Analytics and Performance Insights
 *
 * Business Value:
 * - Identifies trending genres for inventory optimization
 * - Tracks user engagement patterns for retention strategies
 * - Provides data for personalized marketing campaigns
 * - Measures platform performance and revenue growth
 *
 * @see docs/dashboard-component-business-value.md for detailed analysis
 */
interface BroLabTrendChartsProps {
  data: BroLabChartDataPoint[];
  trends: {
    orders: BroLabTrendData;
    downloads: BroLabTrendData;
    revenue: BroLabTrendData;
    beats?: BroLabTrendData; // Optional for backward compatibility
    favorites?: BroLabTrendData; // Optional for backward compatibility
  };
  favoritesMonthly?: { label: string; count: number }[];
  genreBreakdown?: { genre: string; count: number; percentage: number }[];
  isLoading?: boolean;
  className?: string;
}

// BroLab-specific trend indicator for music marketplace metrics
function BroLabTrendIndicator({
  trend,
  label,
  icon: Icon,
  color,
  subtitle,
}: {
  trend: BroLabTrendData;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  subtitle?: string;
}) {
  const isPositive = trend.changePercent > 0;
  const TrendIcon = isPositive ? TrendingUp : TrendingDown;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gray-800/50 rounded-lg p-4 border border-gray-700/50"
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-2">
          <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", color)}>
            <Icon className="w-4 h-4" />
          </div>
          <div>
            <span className="text-sm font-medium text-gray-300">{label}</span>
            {subtitle && <p className="text-xs text-gray-500">{subtitle}</p>}
          </div>
        </div>
        <Badge
          variant={isPositive ? "default" : "destructive"}
          className={cn(
            "text-xs",
            isPositive
              ? "bg-green-500/20 text-green-400 border-green-500/30"
              : "bg-red-500/20 text-red-400 border-red-500/30"
          )}
        >
          <TrendIcon className="w-3 h-3 mr-1" />
          {Math.abs(trend.changePercent).toFixed(1)}%
        </Badge>
      </div>

      <div className="space-y-1">
        <p className="text-2xl font-bold text-white">{trend.value.toLocaleString("en-US")}</p>
        <p className="text-xs text-gray-400">
          {isPositive ? "+" : ""}
          {trend.change.toLocaleString("en-US")} this month
        </p>
      </div>
    </motion.div>
  );
}

// Beat revenue area chart with music-specific styling
function BeatRevenueChart({ data }: { data: BroLabChartDataPoint[] }) {
  return (
    <Card className="bg-gray-900/50 border-gray-700/50">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2 text-white">
          <DollarSign className="h-5 w-5" />
          <span>Beat Revenue Growth</span>
        </CardTitle>
        <CardDescription className="text-gray-400">
          Monthly revenue from beat sales and licensing
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data}>
              <defs>
                <linearGradient id="beatRevenueGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis
                dataKey="date"
                stroke="#9ca3af"
                fontSize={12}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                stroke="#9ca3af"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                tickFormatter={value => `$${value}`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#1f2937",
                  border: "1px solid #374151",
                  borderRadius: "8px",
                  color: "#f9fafb",
                }}
                formatter={(value: number) => [`$${value}`, "Beat Revenue"]}
                labelStyle={{ color: "#d1d5db" }}
              />
              <Area
                type="monotone"
                dataKey="revenue"
                stroke="#8b5cf6"
                strokeWidth={2}
                fill="url(#beatRevenueGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

// Enhanced beat interaction chart with music marketplace metrics
function BeatInteractionChart({ data }: { data: BroLabChartDataPoint[] }) {
  return (
    <Card className="bg-gray-900/50 border-gray-700/50">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2 text-white">
          <Headphones className="h-5 w-5" />
          <span>Beat Engagement Analytics</span>
        </CardTitle>
        <CardDescription className="text-gray-400">
          Track your beat interaction patterns and listening behavior
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis
                dataKey="date"
                stroke="#9ca3af"
                fontSize={12}
                tickLine={false}
                axisLine={false}
              />
              <YAxis stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#1f2937",
                  border: "1px solid #374151",
                  borderRadius: "8px",
                  color: "#f9fafb",
                }}
                labelStyle={{ color: "#d1d5db" }}
              />
              <Line
                type="monotone"
                dataKey="downloads"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={{ fill: "#3b82f6", strokeWidth: 2, r: 4 }}
                name="Beat Downloads"
              />
              <Line
                type="monotone"
                dataKey="favorites"
                stroke="#ef4444"
                strokeWidth={2}
                dot={{ fill: "#ef4444", strokeWidth: 2, r: 4 }}
                name="Beat Favorites"
              />
              {data.some(d => d.beatPlays !== undefined) && (
                <Line
                  type="monotone"
                  dataKey="beatPlays"
                  stroke="#10b981"
                  strokeWidth={2}
                  dot={{ fill: "#10b981", strokeWidth: 2, r: 4 }}
                  name="Beat Plays"
                />
              )}
              {data.some(d => d.uniqueBeatsPlayed !== undefined) && (
                <Line
                  type="monotone"
                  dataKey="uniqueBeatsPlayed"
                  stroke="#8b5cf6"
                  strokeWidth={2}
                  dot={{ fill: "#8b5cf6", strokeWidth: 2, r: 4 }}
                  name="Unique Beats"
                />
              )}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

// New listening time analytics chart
function ListeningTimeChart({ data }: { data: BroLabChartDataPoint[] }) {
  return (
    <Card className="bg-gray-900/50 border-gray-700/50">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2 text-white">
          <Clock className="h-5 w-5" />
          <span>Listening Analytics</span>
        </CardTitle>
        <CardDescription className="text-gray-400">
          Your music consumption patterns and session insights
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data}>
              <defs>
                <linearGradient id="listeningTimeGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis
                dataKey="date"
                stroke="#9ca3af"
                fontSize={12}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                stroke="#9ca3af"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                tickFormatter={value => `${value}m`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#1f2937",
                  border: "1px solid #374151",
                  borderRadius: "8px",
                  color: "#f9fafb",
                }}
                formatter={(value: number) => [`${value} minutes`, "Listening Time"]}
                labelStyle={{ color: "#d1d5db" }}
              />
              <Area
                type="monotone"
                dataKey="listeningTime"
                stroke="#06b6d4"
                strokeWidth={2}
                fill="url(#listeningTimeGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

// Beat purchases bar chart
function BeatPurchasesChart({ data }: { data: BroLabChartDataPoint[] }) {
  return (
    <Card className="bg-gray-900/50 border-gray-700/50">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2 text-white">
          <ShoppingCart className="h-5 w-5" />
          <span>Beat Purchases</span>
        </CardTitle>
        <CardDescription className="text-gray-400">
          Monthly beat orders and licensing
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis
                dataKey="date"
                stroke="#9ca3af"
                fontSize={12}
                tickLine={false}
                axisLine={false}
              />
              <YAxis stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#1f2937",
                  border: "1px solid #374151",
                  borderRadius: "8px",
                  color: "#f9fafb",
                }}
                formatter={(value: number) => [value, "Beat Orders"]}
                labelStyle={{ color: "#d1d5db" }}
              />
              <Bar dataKey="orders" fill="#10b981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

// Genre breakdown pie chart
function GenreBreakdownChart({
  genreData,
}: {
  genreData: { genre: string; count: number; percentage: number }[];
}) {
  const COLORS = ["#8b5cf6", "#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#6366f1"];

  return (
    <Card className="bg-gray-900/50 border-gray-700/50">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2 text-white">
          <Music className="h-5 w-5" />
          <span>Music Taste Profile</span>
        </CardTitle>
        <CardDescription className="text-gray-400">
          Your preferred genres and styles
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={genreData}
                cx="50%"
                cy="50%"
                innerRadius={40}
                outerRadius={80}
                paddingAngle={5}
                dataKey="count"
              >
                {genreData.map((_entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: "#1f2937",
                  border: "1px solid #374151",
                  borderRadius: "8px",
                  color: "#f9fafb",
                }}
                formatter={(
                  value: number,
                  _name: string,
                  props: { payload?: { percentage?: number; genre?: string } }
                ) => [
                  `${value} beats (${props?.payload?.percentage || 0}%)`,
                  props?.payload?.genre || "Unknown",
                ]}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-4 space-y-2">
          {genreData.slice(0, 4).map((genre, index) => (
            <div key={genre.genre} className="flex items-center justify-between text-sm">
              <div className="flex items-center space-x-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: COLORS[index % COLORS.length] }}
                />
                <span className="text-gray-300">{genre.genre}</span>
              </div>
              <span className="text-gray-400">{genre.percentage}%</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// BPM preference analytics chart
function BpmPreferenceChart({
  bpmData,
}: {
  bpmData?: {
    slow: number; // 60-90 BPM
    medium: number; // 90-120 BPM
    fast: number; // 120+ BPM
  };
}) {
  if (!bpmData) return null;

  const chartData = [
    { range: "Slow (60-90)", count: bpmData.slow, color: "#3b82f6" },
    { range: "Medium (90-120)", count: bpmData.medium, color: "#8b5cf6" },
    { range: "Fast (120+)", count: bpmData.fast, color: "#ef4444" },
  ];

  return (
    <Card className="bg-gray-900/50 border-gray-700/50">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2 text-white">
          <TrendingUp className="h-5 w-5" />
          <span>BPM Preferences</span>
        </CardTitle>
        <CardDescription className="text-gray-400">
          Your tempo preferences breakdown
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} layout="horizontal">
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis
                type="number"
                stroke="#9ca3af"
                fontSize={12}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                type="category"
                dataKey="range"
                stroke="#9ca3af"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                width={80}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#1f2937",
                  border: "1px solid #374151",
                  borderRadius: "8px",
                  color: "#f9fafb",
                }}
                formatter={(value: number) => [value, "Beats"]}
                labelStyle={{ color: "#d1d5db" }}
              />
              <Bar dataKey="count" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

// Main BroLab trend charts component
export function BroLabTrendCharts({
  data,
  trends,
  genreBreakdown = [],
  isLoading = false,
  className,
}: BroLabTrendChartsProps) {
  const [selectedPeriod, setSelectedPeriod] = useState<"7d" | "30d" | "90d" | "1y">("30d");

  const filteredData = useMemo(() => {
    const now = new Date();
    const daysToSubtract = {
      "7d": 7,
      "30d": 30,
      "90d": 90,
      "1y": 365,
    }[selectedPeriod];

    const cutoffDate = new Date(now.getTime() - daysToSubtract * 24 * 60 * 60 * 1000);

    return data.filter(item => new Date(item.date) >= cutoffDate);
  }, [data, selectedPeriod]);

  if (isLoading) {
    return (
      <div className={cn("space-y-6", className)}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-gray-800/50 rounded-lg p-4 animate-pulse">
              <div className="h-4 bg-gray-700 rounded w-3/4 mb-2" />
              <div className="h-8 bg-gray-700 rounded w-1/2" />
            </div>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-gray-900/50 rounded-lg p-6 animate-pulse">
              <div className="h-6 bg-gray-700 rounded w-1/3 mb-4" />
              <div className="h-64 bg-gray-700 rounded" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={cn("space-y-6", className)}>
      {/* Period selector */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-white flex items-center space-x-2">
          <Music className="w-5 h-5" />
          <span>Beat Analytics & Trends</span>
        </h2>
        <div className="flex space-x-2">
          {(["7d", "30d", "90d", "1y"] as const).map(period => (
            <Button
              key={period}
              variant={selectedPeriod === period ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedPeriod(period)}
              className={cn(
                "text-xs",
                selectedPeriod === period
                  ? "bg-purple-600 hover:bg-purple-700 text-white"
                  : "border-gray-600 text-gray-300 hover:bg-gray-800"
              )}
            >
              {period === "7d" && "7 days"}
              {period === "30d" && "30 days"}
              {period === "90d" && "3 months"}
              {period === "1y" && "1 year"}
            </Button>
          ))}
        </div>
      </div>

      {/* BroLab-specific trend indicators */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <BroLabTrendIndicator
          trend={trends.orders}
          label="Beat Orders"
          subtitle="Licensed beats"
          icon={ShoppingCart}
          color="bg-green-500/20 text-green-400"
        />
        <BroLabTrendIndicator
          trend={trends.downloads}
          label="Beat Downloads"
          subtitle="Downloaded tracks"
          icon={Download}
          color="bg-blue-500/20 text-blue-400"
        />
        <BroLabTrendIndicator
          trend={trends.revenue}
          label="Music Investment"
          subtitle="Total spent on beats"
          icon={DollarSign}
          color="bg-purple-500/20 text-purple-400"
        />
        <BroLabTrendIndicator
          trend={
            trends.favorites ||
            trends.beats || { period: "30d", value: 0, change: 0, changePercent: 0 }
          }
          label="Beat Favorites"
          subtitle="Liked tracks"
          icon={Heart}
          color="bg-red-500/20 text-red-400"
        />
      </div>

      {/* Main revenue and engagement charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <BeatRevenueChart data={filteredData} />
        <BeatInteractionChart data={filteredData} />
      </div>

      {/* Secondary analytics charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <BeatPurchasesChart data={filteredData} />
        {filteredData.some(d => d.listeningTime !== undefined) && (
          <ListeningTimeChart data={filteredData} />
        )}
      </div>

      {/* Music preference analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Genre breakdown */}
        {genreBreakdown.length > 0 && <GenreBreakdownChart genreData={genreBreakdown} />}

        {/* BPM preferences */}
        {filteredData.some(d => d.bpmRanges !== undefined) && (
          <BpmPreferenceChart bpmData={filteredData[filteredData.length - 1]?.bpmRanges} />
        )}

        {/* Music marketplace summary */}
        <Card className="bg-gray-900/50 border-gray-700/50">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-white">
              <Star className="h-5 w-5" />
              <span>Music Collection Insights</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-400">Collection value</span>
                <span className="font-semibold text-white">
                  $
                  {filteredData
                    .reduce((sum, item) => sum + item.revenue, 0)
                    .toLocaleString("en-US")}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-400">Licensed beats</span>
                <span className="font-semibold text-white">
                  {filteredData.reduce((sum, item) => sum + item.orders, 0)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-400">Beat downloads</span>
                <span className="font-semibold text-white">
                  {filteredData.reduce((sum, item) => sum + item.downloads, 0)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-400">Beat plays</span>
                <span className="font-semibold text-white">
                  {filteredData.reduce((sum, item) => sum + (item.beatPlays || 0), 0)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-400">Listening time</span>
                <span className="font-semibold text-white">
                  {Math.round(
                    filteredData.reduce((sum, item) => sum + (item.listeningTime || 0), 0)
                  )}
                  m
                </span>
              </div>
            </div>

            <div className="pt-4 border-t border-gray-700">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-400">Avg beat price</span>
                <span className="font-semibold text-green-400">
                  $
                  {(
                    filteredData.reduce((sum, item) => sum + item.revenue, 0) /
                    Math.max(
                      filteredData.reduce((sum, item) => sum + item.orders, 0),
                      1
                    )
                  ).toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-400">Engagement rate</span>
                <span className="font-semibold text-purple-400">
                  {(
                    (filteredData.reduce((sum, item) => sum + (item.beatPlays || 0), 0) /
                      Math.max(
                        filteredData.reduce((sum, item) => sum + item.downloads, 0),
                        1
                      )) *
                    100
                  ).toFixed(1)}
                  %
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
