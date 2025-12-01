import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import {
  Activity,
  BarChart3,
  Calendar,
  Download,
  Music,
  ShoppingCart,
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
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

// Chart data types
interface ChartDataPoint {
  date: string;
  orders: number;
  downloads: number;
  revenue: number;
  beats: number;
}

interface TrendData {
  period: string;
  value: number;
  change: number;
  changePercent: number;
}

interface TrendChartsProps {
  data: ChartDataPoint[];
  trends: {
    orders: TrendData;
    downloads: TrendData;
    revenue: TrendData;
    beats: TrendData;
  };
  favoritesMonthly?: { label: string; count: number }[];
  isLoading?: boolean;
  className?: string;
}

// Trend indicator
function TrendIndicator({
  trend,
  label,
  icon: Icon,
  color,
}: Readonly<{
  trend: TrendData;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}>) {
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
          <span className="text-sm font-medium text-gray-300">{label}</span>
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

// Revenue area chart
function RevenueAreaChart({ data }: Readonly<{ data: ChartDataPoint[] }>) {
  return (
    <Card className="bg-gray-900/50 border-gray-700/50">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2 text-white">
          <BarChart3 className="h-5 w-5" />
          <span>Revenue growth</span>
        </CardTitle>
        <CardDescription className="text-gray-400">
          Monthly revenue for the last 6 months
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data}>
              <defs>
                <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
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
                formatter={(value: number) => [`$${value}`, "Revenue"]}
                labelStyle={{ color: "#d1d5db" }}
              />
              <Area
                type="monotone"
                dataKey="revenue"
                stroke="#8b5cf6"
                strokeWidth={2}
                fill="url(#revenueGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

// Activity line chart
function ActivityLineChart({ data }: Readonly<{ data: ChartDataPoint[] }>) {
  return (
    <Card className="bg-gray-900/50 border-gray-700/50">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2 text-white">
          <Activity className="h-5 w-5" />
          <span>User activity</span>
        </CardTitle>
        <CardDescription className="text-gray-400">Orders and downloads per month</CardDescription>
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
                dataKey="orders"
                stroke="#10b981"
                strokeWidth={2}
                dot={{ fill: "#10b981", strokeWidth: 2, r: 4 }}
                name="Orders"
              />
              <Line
                type="monotone"
                dataKey="downloads"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={{ fill: "#3b82f6", strokeWidth: 2, r: 4 }}
                name="Downloads"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

// Favorites bar chart (previously beats)
function BeatsBarChart({ data }: Readonly<{ data: ChartDataPoint[] }>) {
  return (
    <Card className="bg-gray-900/50 border-gray-700/50">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2 text-white">
          <Music className="h-5 w-5" />
          <span>Favorites added</span>
        </CardTitle>
        <CardDescription className="text-gray-400">Favorites added per month</CardDescription>
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
                formatter={(value: number) => [value, "Favorites"]}
                labelStyle={{ color: "#d1d5db" }}
              />
              <Bar dataKey="beats" fill="#f59e0b" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

// Main component
export function TrendCharts({
  data,
  trends,
  favoritesMonthly,
  isLoading = false,
  className,
}: Readonly<TrendChartsProps>) {
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

  // Use provided monthly favorites if available; map to chart shape for the bar chart
  const favoritesData = useMemo<ChartDataPoint[]>(() => {
    if (favoritesMonthly && favoritesMonthly.length > 0) {
      // When period is days-based, we still show up to the matching months window
      let monthsWindow: number;
      if (selectedPeriod === "7d") {
        monthsWindow = 1;
      } else if (selectedPeriod === "30d") {
        monthsWindow = 1;
      } else if (selectedPeriod === "90d") {
        monthsWindow = 3;
      } else {
        monthsWindow = 12;
      }
      const sliced = favoritesMonthly.slice(-monthsWindow);
      return sliced.map(m => ({
        date: m.label,
        orders: 0,
        downloads: 0,
        revenue: 0,
        beats: m.count,
      }));
    }
    return filteredData;
  }, [favoritesMonthly, filteredData, selectedPeriod]);

  if (isLoading) {
    return (
      <div className={cn("space-y-6", className)}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }, (_, i) => (
            <div
              key={`skeleton-trend-${i}`}
              className="bg-gray-800/50 rounded-lg p-4 animate-pulse"
            >
              <div className="h-4 bg-gray-700 rounded w-3/4 mb-2" />
              <div className="h-8 bg-gray-700 rounded w-1/2" />
            </div>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {Array.from({ length: 3 }, (_, i) => (
            <div
              key={`skeleton-chart-${i}`}
              className="bg-gray-900/50 rounded-lg p-6 animate-pulse"
            >
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
        <h2 className="text-xl font-semibold text-white">Analytics & Trends</h2>
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

      {/* Trend indicators */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <TrendIndicator
          trend={trends.orders}
          label="Orders"
          icon={ShoppingCart}
          color="bg-green-500/20 text-green-400"
        />
        <TrendIndicator
          trend={trends.downloads}
          label="Downloads"
          icon={Download}
          color="bg-blue-500/20 text-blue-400"
        />
        <TrendIndicator
          trend={trends.revenue}
          label="Revenue"
          icon={BarChart3}
          color="bg-purple-500/20 text-purple-400"
        />
        <TrendIndicator
          trend={trends.beats}
          label="Favorites"
          icon={Music}
          color="bg-yellow-500/20 text-yellow-400"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RevenueAreaChart data={filteredData} />
        <ActivityLineChart data={filteredData} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <BeatsBarChart data={favoritesData} />
        </div>

        {/* Quick stats */}
        <Card className="bg-gray-900/50 border-gray-700/50">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-white">
              <Calendar className="h-5 w-5" />
              <span>Summary</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-400">Total revenue</span>
                <span className="font-semibold text-white">
                  $
                  {filteredData
                    .reduce((sum, item) => sum + item.revenue, 0)
                    .toLocaleString("en-US")}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-400">Total orders</span>
                <span className="font-semibold text-white">
                  {filteredData.reduce((sum, item) => sum + item.orders, 0)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-400">Total downloads</span>
                <span className="font-semibold text-white">
                  {filteredData.reduce((sum, item) => sum + item.downloads, 0)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-400">Favorites</span>
                <span className="font-semibold text-white">
                  {filteredData.reduce((sum, item) => sum + item.beats, 0)}
                </span>
              </div>
            </div>

            <div className="pt-4 border-t border-gray-700">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-400">Avg revenue/order</span>
                <span className="font-semibold text-green-400">
                  {(
                    filteredData.reduce((sum, item) => sum + item.revenue, 0) /
                    Math.max(
                      filteredData.reduce((sum, item) => sum + item.orders, 0),
                      1
                    )
                  ).toFixed(2)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
