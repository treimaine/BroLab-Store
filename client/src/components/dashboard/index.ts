/**
 * Dashboard Components Index
 *
 * Centralized exports for all dashboard components with proper separation of concerns.
 * Requirements addressed:
 * - 2.2: Clear hierarchy with proper separation of concerns
 * - 2.4: Consistent patterns across all components
 */

// Main dashboard components
export { default as LazyDashboard } from "../LazyDashboard";
export { default as ModernDashboard } from "./ModernDashboard";

// Layout components
export {
  ContentSection,
  DashboardGrid,
  DashboardHeader,
  DashboardLayout,
  TabContentWrapper,
} from "./DashboardLayout";

// Error handling
export {
  DashboardErrorBoundary,
  useErrorReporting,
  withErrorBoundary,
} from "./DashboardErrorBoundary";

// Loading components
export {
  ActivityFeedSkeleton,
  ChartsSkeleton,
  DashboardHeaderSkeleton,
  DashboardSkeleton,
  DownloadsTableSkeleton,
  LoadingWithRetry,
  OrdersTableSkeleton,
  ProfileSkeleton,
  RecommendationsSkeleton,
  ReservationsSkeleton,
  StatsCardsSkeleton,
} from "./DashboardSkeletons";

// Feature components
export { ActivityFeed, CompactActivityFeed } from "./ActivityFeed";
export { default as OrdersTab } from "./OrdersTab";
export { default as ReservationsTab } from "./ReservationsTab";
export { DetailedStatsCard, StatsCards } from "./StatsCards";
export { TrendCharts } from "./TrendCharts";

// Re-export types for convenience
export type {
  Activity,
  ChartDataPoint,
  DashboardConfig,
  DashboardData,
  DashboardError,
  DashboardUser,
  Download,
  Favorite,
  Order,
  Reservation,
  TrendData,
  UserStats,
} from "@shared/types/dashboard";
