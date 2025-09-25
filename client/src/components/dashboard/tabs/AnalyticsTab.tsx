/**
 * Analytics Tab Component
 *
 * Code-split analytics tab showing charts and trends.
 * This component is lazy-loaded to improve initial bundle size.
 */

import type { ChartDataPoint, TrendData } from "@shared/types/dashboard";
import { memo } from "react";
import { TrendCharts } from "../TrendCharts";

interface AnalyticsTabProps {
  chartData: ChartDataPoint[];
  trends: TrendData | null | undefined;
  isLoading?: boolean;
}

const AnalyticsTab = memo<AnalyticsTabProps>(({ chartData, trends, isLoading = false }) => {
  if (isLoading) {
    return (
      <div className="bg-gray-900/50 border-gray-700/50 rounded-lg p-6">
        <div className="h-64 bg-gray-800/50 rounded animate-pulse" />
      </div>
    );
  }

  // Transform data to match expected interface
  const transformedData = (chartData || []).map(item => ({
    ...item,
    beats: item.favorites || 0, // Map favorites to beats for compatibility
  }));

  const transformedTrends = {
    orders: trends?.orders || {
      period: "30d" as const,
      value: 0,
      change: 0,
      changePercent: 0,
      isPositive: false,
    },
    downloads: trends?.downloads || {
      period: "30d" as const,
      value: 0,
      change: 0,
      changePercent: 0,
      isPositive: false,
    },
    revenue: trends?.revenue || {
      period: "30d" as const,
      value: 0,
      change: 0,
      changePercent: 0,
      isPositive: false,
    },
    beats: trends?.favorites || {
      period: "30d" as const,
      value: 0,
      change: 0,
      changePercent: 0,
      isPositive: false,
    },
  };

  return <TrendCharts data={transformedData} trends={transformedTrends} isLoading={isLoading} />;
});

AnalyticsTab.displayName = "AnalyticsTab";

export default AnalyticsTab;
