/**
 * Dashboard Tabs Hook
 *
 * Manages dashboard tab state and selective real-time subscriptions.
 *
 * Requirements addressed:
 * - 4.4: Selective real-time subscriptions based on active dashboard tab
 * - 4.1: Real-time updates without full page refreshes
 */

import { useRealtimeContext, type RealtimeEventType } from "@/providers/DashboardRealtimeProvider";
import { useCallback, useEffect, useState } from "react";

export type DashboardTab =
  | "overview"
  | "favorites"
  | "orders"
  | "downloads"
  | "reservations"
  | "analytics"
  | "activity";

export interface DashboardTabsHook {
  // Current tab state
  activeTab: DashboardTab;
  setActiveTab: (tab: DashboardTab) => void;

  // Tab configuration
  getTabConfig: (tab: DashboardTab) => TabConfig;
  getActiveEvents: () => RealtimeEventType[];

  // Tab history
  tabHistory: DashboardTab[];
  goBack: () => void;
  canGoBack: boolean;
}

export interface TabConfig {
  label: string;
  description: string;
  events: RealtimeEventType[];
  refreshInterval?: number; // Fallback polling interval in ms
  priority: "high" | "medium" | "low";
}

// Tab configurations with their real-time event subscriptions
const TAB_CONFIGS: Record<DashboardTab, TabConfig> = {
  overview: {
    label: "Overview",
    description: "Dashboard summary and recent activity",
    events: ["activity_logged", "stats_updated"],
    refreshInterval: 30000, // 30 seconds
    priority: "high",
  },
  favorites: {
    label: "Favorites",
    description: "Your favorite beats and tracks",
    events: ["favorite_added", "favorite_removed"],
    refreshInterval: 60000, // 1 minute
    priority: "medium",
  },
  orders: {
    label: "Orders",
    description: "Purchase history and order status",
    events: ["order_created", "order_updated"],
    refreshInterval: 45000, // 45 seconds
    priority: "high",
  },
  downloads: {
    label: "Downloads",
    description: "Downloaded files and licenses",
    events: ["download_completed"],
    refreshInterval: 60000, // 1 minute
    priority: "medium",
  },
  reservations: {
    label: "Reservations",
    description: "Studio bookings and service appointments",
    events: ["reservation_created", "reservation_updated"],
    refreshInterval: 120000, // 2 minutes
    priority: "medium",
  },
  analytics: {
    label: "Analytics",
    description: "Usage statistics and trends",
    events: ["stats_updated"],
    refreshInterval: 300000, // 5 minutes
    priority: "low",
  },
  activity: {
    label: "Activity",
    description: "Recent actions and system events",
    events: ["activity_logged"],
    refreshInterval: 15000, // 15 seconds
    priority: "high",
  },
};

export function useDashboardTabs(initialTab: DashboardTab = "overview"): DashboardTabsHook {
  const [activeTab, setActiveTabState] = useState<DashboardTab>(initialTab);
  const [tabHistory, setTabHistory] = useState<DashboardTab[]>([initialTab]);
  const { setActiveTab: setRealtimeActiveTab } = useRealtimeContext();

  // Set active tab with history tracking
  const setActiveTab = useCallback((tab: DashboardTab) => {
    setActiveTabState(prevTab => {
      if (prevTab === tab) return prevTab;

      // Update tab history
      setTabHistory(prev => {
        const newHistory = [...prev];
        // Remove the tab if it already exists in history
        const existingIndex = newHistory.indexOf(tab);
        if (existingIndex !== -1) {
          newHistory.splice(existingIndex, 1);
        }
        // Add to the end
        newHistory.push(tab);
        // Keep only last 10 tabs
        return newHistory.slice(-10);
      });

      return tab;
    });
  }, []);

  // Go back to previous tab
  const goBack = useCallback(() => {
    if (tabHistory.length > 1) {
      const newHistory = [...tabHistory];
      newHistory.pop(); // Remove current tab
      const previousTab = newHistory[newHistory.length - 1];

      setTabHistory(newHistory);
      setActiveTabState(previousTab);
    }
  }, [tabHistory]);

  // Check if can go back
  const canGoBack = tabHistory.length > 1;

  // Get tab configuration
  const getTabConfig = useCallback((tab: DashboardTab): TabConfig => {
    return TAB_CONFIGS[tab];
  }, []);

  // Get active events for current tab
  const getActiveEvents = useCallback((): RealtimeEventType[] => {
    return TAB_CONFIGS[activeTab].events;
  }, [activeTab]);

  // Update real-time context when active tab changes
  useEffect(() => {
    setRealtimeActiveTab(activeTab);
  }, [activeTab, setRealtimeActiveTab]);

  return {
    activeTab,
    setActiveTab,
    getTabConfig,
    getActiveEvents,
    tabHistory,
    goBack,
    canGoBack,
  };
}

// Hook for tab-specific polling fallback
export function useTabPolling(tab: DashboardTab, callback: () => void, enabled: boolean = true) {
  const config = TAB_CONFIGS[tab];

  useEffect(() => {
    if (!enabled || !config.refreshInterval) {
      return;
    }

    const interval = setInterval(callback, config.refreshInterval);

    return () => clearInterval(interval);
  }, [callback, config.refreshInterval, enabled]);
}

// Hook for managing tab visibility and focus
export function useTabVisibility() {
  const [isVisible, setIsVisible] = useState(!document.hidden);
  const [isFocused, setIsFocused] = useState(document.hasFocus());

  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsVisible(!document.hidden);
    };

    const handleFocus = () => {
      setIsFocused(true);
    };

    const handleBlur = () => {
      setIsFocused(false);
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", handleFocus);
    window.addEventListener("blur", handleBlur);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("blur", handleBlur);
    };
  }, []);

  return {
    isVisible,
    isFocused,
    isActive: isVisible && isFocused,
  };
}

// Hook for smart tab subscriptions with visibility awareness
export function useSmartTabSubscriptions(tab: DashboardTab) {
  const { isActive } = useTabVisibility();
  const config = TAB_CONFIGS[tab];

  // Determine if we should use real-time or polling based on tab priority and visibility
  const shouldUseRealtime =
    isActive && (config.priority === "high" || config.priority === "medium");
  const shouldUsePoll = !shouldUseRealtime && config.refreshInterval;

  return {
    shouldUseRealtime,
    shouldUsePoll,
    events: config.events,
    pollInterval: config.refreshInterval,
    priority: config.priority,
  };
}

// Export tab configurations for external use
export { TAB_CONFIGS };
