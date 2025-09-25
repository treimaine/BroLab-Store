/**
 * Lazy Dashboard Tabs Component
 *
 * Implements proper code splitting for dashboard tabs to reduce initial bundle size
 * and improve loading performance. Each tab is loaded only when accessed.
 *
 * Requirements addressed:
 * - 5.2: Proper code splitting for dashboard tabs and heavy components
 * - 5.5: Reduce bundle size by removing unnecessary lazy loading and optimizing imports
 * - 2.1: Eliminate unnecessary lazy loading components (but keep strategic ones)
 */

import { TabsContent } from "@/components/ui/tabs";
import { lazy, memo, Suspense } from "react";

// Lazy load dashboard tab components for code splitting
const OverviewTab = lazy(() => import("./tabs/OverviewTab"));
const ActivityTab = lazy(() => import("./tabs/ActivityTab"));
const AnalyticsTab = lazy(() => import("./tabs/AnalyticsTab"));
const OrdersTabLazy = lazy(() => import("./OrdersTab"));
const DownloadsTab = lazy(() => import("./tabs/DownloadsTab"));
const ReservationsTabLazy = lazy(() => import("./ReservationsTab"));
const ProfileTab = lazy(() => import("./tabs/ProfileTab"));
const SettingsTab = lazy(() => import("./tabs/SettingsTab"));

// Lightweight loading component for tab switching
const TabLoadingFallback = memo(() => (
  <div className="flex items-center justify-center py-8">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600" />
  </div>
));

TabLoadingFallback.displayName = "TabLoadingFallback";

interface LazyDashboardTabsProps {
  activeTab: string;
  dashboardData: any; // Replace with proper type
}

export const LazyDashboardTabs = memo<LazyDashboardTabsProps>(({ activeTab, dashboardData }) => {
  return (
    <>
      <TabsContent value="overview" className="space-y-4 sm:space-y-6">
        <Suspense fallback={<TabLoadingFallback />}>
          <OverviewTab data={dashboardData} />
        </Suspense>
      </TabsContent>

      <TabsContent value="activity" className="space-y-4 sm:space-y-6">
        <Suspense fallback={<TabLoadingFallback />}>
          <ActivityTab activities={dashboardData.activity} />
        </Suspense>
      </TabsContent>

      <TabsContent value="analytics" className="space-y-4 sm:space-y-6">
        <Suspense fallback={<TabLoadingFallback />}>
          <AnalyticsTab chartData={dashboardData.chartData} trends={dashboardData.trends} />
        </Suspense>
      </TabsContent>

      <TabsContent value="orders" className="space-y-4 sm:space-y-6">
        <Suspense fallback={<TabLoadingFallback />}>
          <OrdersTabLazy
            ordersData={dashboardData.orders}
            ordersLoading={dashboardData.isLoading}
          />
        </Suspense>
      </TabsContent>

      <TabsContent value="downloads" className="space-y-4 sm:space-y-6">
        <Suspense fallback={<TabLoadingFallback />}>
          <DownloadsTab downloads={dashboardData.downloads} />
        </Suspense>
      </TabsContent>

      <TabsContent value="reservations" className="space-y-4 sm:space-y-6">
        <Suspense fallback={<TabLoadingFallback />}>
          <ReservationsTabLazy reservations={dashboardData.reservations} />
        </Suspense>
      </TabsContent>

      <TabsContent value="profile" className="space-y-4 sm:space-y-6">
        <Suspense fallback={<TabLoadingFallback />}>
          <ProfileTab user={dashboardData.user} />
        </Suspense>
      </TabsContent>

      <TabsContent value="settings" className="space-y-4 sm:space-y-6">
        <Suspense fallback={<TabLoadingFallback />}>
          <SettingsTab user={dashboardData.user} />
        </Suspense>
      </TabsContent>
    </>
  );
});

LazyDashboardTabs.displayName = "LazyDashboardTabs";

export default LazyDashboardTabs;
