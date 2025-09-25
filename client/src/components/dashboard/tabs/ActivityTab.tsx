/**
 * Activity Tab Component
 *
 * Code-split activity tab showing full activity feed with virtual scrolling for performance.
 * This component is lazy-loaded to improve initial bundle size.
 */

import { useIsMobile, useIsTablet } from "@/hooks/useBreakpoint";
import type { Activity } from "@shared/types/dashboard";
import { memo } from "react";
import { VirtualActivityFeed } from "../VirtualActivityFeed";

interface ActivityTabProps {
  activities: Activity[];
  isLoading?: boolean;
}

const ActivityTab = memo<ActivityTabProps>(({ activities, isLoading = false }) => {
  const isMobile = useIsMobile();
  const isTablet = useIsTablet();

  // Use virtual scrolling for better performance with large activity lists
  const containerHeight = isMobile ? 400 : isTablet ? 500 : 600;

  return (
    <VirtualActivityFeed
      activities={activities}
      isLoading={isLoading}
      showHeader={false}
      containerHeight={containerHeight}
    />
  );
});

ActivityTab.displayName = "ActivityTab";

export default ActivityTab;
