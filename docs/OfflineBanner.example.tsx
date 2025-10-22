/**
 * OfflineBanner Integration Example
 *
 * This file demonstrates how to integrate the OfflineBanner component
 * into the ModernDashboard or any other dashboard component.
 */

import {
  CompactOfflineIndicator,
  InlineOfflineMessage,
  OfflineBanner,
} from "../client/src/components/dashboard/OfflineBanner";

/**
 * Example 1: Full-width banner at the top of the dashboard
 *
 * Add this at the top of your dashboard layout, before the main content.
 * It will automatically show/hide based on connection status.
 */
export function DashboardWithTopBanner() {
  return (
    <div className="min-h-screen">
      {/* Offline banner - automatically shows when offline */}
      <OfflineBanner position="top" showDataAge={true} />

      {/* Rest of your dashboard content */}
      <div className="container mx-auto p-4">
        <h1>Dashboard Content</h1>
        {/* Your dashboard components here */}
      </div>
    </div>
  );
}

/**
 * Example 2: Banner at the bottom of the dashboard
 *
 * Useful if you want the banner to be less intrusive.
 */
export function DashboardWithBottomBanner() {
  return (
    <div className="min-h-screen">
      {/* Your dashboard content */}
      <div className="container mx-auto p-4">
        <h1>Dashboard Content</h1>
        {/* Your dashboard components here */}
      </div>

      {/* Offline banner at bottom */}
      <OfflineBanner position="bottom" showDataAge={true} />
    </div>
  );
}

/**
 * Example 3: Compact indicator in header/toolbar
 *
 * Use this for a minimal offline indicator that doesn't take up much space.
 */
export function DashboardHeaderWithIndicator() {
  return (
    <header className="flex items-center justify-between p-4 border-b">
      <h1 className="text-2xl font-bold">Dashboard</h1>

      <div className="flex items-center gap-4">
        {/* Other header items */}
        <CompactOfflineIndicator showLabel={true} />
      </div>
    </header>
  );
}

/**
 * Example 4: Inline message within content area
 *
 * Use this to show offline status within a specific section or card.
 */
export function DashboardCardWithOfflineMessage() {
  return (
    <div className="p-6 bg-white rounded-lg shadow">
      <h2 className="text-xl font-semibold mb-4">Recent Activity</h2>

      {/* Inline offline message */}
      <InlineOfflineMessage showRefreshButton={true} className="mb-4" />

      {/* Card content */}
      <div className="space-y-2">{/* Your content here */}</div>
    </div>
  );
}

/**
 * Example 5: Custom refresh handler
 *
 * You can provide a custom refresh handler if you need special logic.
 */
export function DashboardWithCustomRefresh() {
  const handleCustomRefresh = async () => {
    console.log("Custom refresh logic");
    // Your custom refresh logic here
    // e.g., refetch specific queries, clear cache, etc.
  };

  return (
    <div className="min-h-screen">
      <OfflineBanner position="top" onRefresh={handleCustomRefresh} />

      <div className="container mx-auto p-4">
        <h1>Dashboard Content</h1>
      </div>
    </div>
  );
}

/**
 * Example 6: Integration with ModernDashboard
 *
 * Here's how you would integrate it into the existing ModernDashboard component:
 *
 * 1. Import the component:
 *    import { OfflineBanner } from "./OfflineBanner";
 *
 * 2. Add it at the top of your dashboard layout:
 *
 *    export function ModernDashboard() {
 *      return (
 *        <DashboardLayout>
 *          <OfflineBanner position="top" showDataAge={true} />
 *
 *          <DashboardHeader>
 *            // ... header content
 *          </DashboardHeader>
 *
 *          // ... rest of dashboard
 *        </DashboardLayout>
 *      );
 *    }
 *
 * 3. Or add it inside the DashboardLayout component if you want it
 *    to be part of the scrollable content area.
 */

/**
 * Example 7: Force show for testing
 *
 * Use forceShow prop to test the banner appearance without being offline.
 */
export function DashboardWithForcedBanner() {
  return (
    <div className="min-h-screen">
      {/* Force show for testing/demo purposes */}
      <OfflineBanner position="top" forceShow={true} showDataAge={true} />

      <div className="container mx-auto p-4">
        <h1>Dashboard Content</h1>
      </div>
    </div>
  );
}
