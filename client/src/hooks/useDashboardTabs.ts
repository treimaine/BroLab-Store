/**
 * Dashboard Tabs Hook
 *
 * Manages dashboard tab state and selective real-time subscriptions.
 *
 * Requirements addressed:
 * - 4.4: Selective real-time subscriptions based on active dashboard tab
 * - 4.1: Real-time updates without full page refreshes
 */

import { useTabVisible } from "@/hooks/useTabVisibilityManager";
import { RealtimeContext, type RealtimeEventType } from "@/providers/DashboardRealtimeProvider";
import { useCallback, useContext, useEffect, useState, useSyncExternalStore } from "react";

// Local hook to access RealtimeContext
function useRealtimeContext(): { setActiveTab: (tab: string) => void } {
  const context = useContext(RealtimeContext);
  if (!context) {
    // Return a mock context when not inside provider
    return {
      setActiveTab: (_tab: string) => {},
    };
  }
  return context;
}

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
  const [currentTab, setCurrentTab] = useState<DashboardTab>(initialTab);
  const [tabHistory, setTabHistory] = useState<DashboardTab[]>([initialTab]);
  const { setActiveTab: setRealtimeActiveTab } = useRealtimeContext();

  // Set active tab with history tracking
  const setActiveTab = useCallback((tab: DashboardTab) => {
    setCurrentTab(prevTab => {
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
      const previousTab = newHistory.at(-1);

      if (previousTab) {
        setTabHistory(newHistory);
        setCurrentTab(previousTab);
      }
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
    return TAB_CONFIGS[currentTab].events;
  }, [currentTab]);

  // Update real-time context when active tab changes
  useEffect(() => {
    setRealtimeActiveTab(currentTab);
  }, [currentTab, setRealtimeActiveTab]);

  return {
    activeTab: currentTab,
    setActiveTab,
    getTabConfig,
    getActiveEvents,
    tabHistory,
    goBack,
    canGoBack,
  };
}

// Hook for tab-specific polling fallback
// FIX: Added visibility awareness to prevent polling when tab is hidden
// This prevents CPU usage and potential freezes from background polling
export function useTabPolling(tab: DashboardTab, callback: () => void, enabled: boolean = true) {
  const config = TAB_CONFIGS[tab];
  const isTabVisible = useTabVisible();

  useEffect(() => {
    // FIX: Don't poll when tab is hidden or disabled
    if (!enabled || !config.refreshInterval || !isTabVisible) {
      return;
    }

    // FIX: Use visibility-aware interval to prevent browser freezes
    let interval: ReturnType<typeof setInterval> | null = null;

    const startInterval = (): void => {
      if (interval) return;
      interval = setInterval(() => {
        if (!document.hidden) {
          callback();
        }
      }, config.refreshInterval);
    };

    const stopInterval = (): void => {
      if (interval) {
        clearInterval(interval);
        interval = null;
      }
    };

    const handleVisibilityChange = (): void => {
      if (document.hidden) {
        stopInterval();
      } else {
        // Stagger restart to prevent thundering herd
        setTimeout(
          () => {
            startInterval();
          },
          Math.random() * 500 + 250
        );
      }
    };

    // Start interval if tab is visible
    if (!document.hidden) {
      startInterval();
    }

    document.addEventListener("visibilitychange", handleVisibilityChange, { passive: true });

    return () => {
      stopInterval();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [callback, config.refreshInterval, enabled, isTabVisible]);
}

// Singleton state for window focus (prevents duplicate event listeners)
let isWindowFocused = document === undefined ? true : document.hasFocus();
const focusListeners = new Set<() => void>();

// Initialize the global focus listener (runs once)
if (globalThis.window !== undefined) {
  globalThis.window.addEventListener(
    "focus",
    () => {
      if (!isWindowFocused) {
        isWindowFocused = true;
        focusListeners.forEach(listener => listener());
      }
    },
    { passive: true }
  );
  globalThis.window.addEventListener(
    "blur",
    () => {
      if (isWindowFocused) {
        isWindowFocused = false;
        focusListeners.forEach(listener => listener());
      }
    },
    { passive: true }
  );
}

// Subscribe function for useSyncExternalStore
function subscribeFocus(callback: () => void): () => void {
  focusListeners.add(callback);
  return () => focusListeners.delete(callback);
}

function getFocusSnapshot(): boolean {
  return isWindowFocused;
}

function getServerFocusSnapshot(): boolean {
  return true;
}

// Hook for managing tab visibility and focus
// Uses centralized singleton pattern to prevent duplicate event listeners
export function useTabVisibility() {
  const isVisible = useTabVisible();
  const isFocused = useSyncExternalStore(subscribeFocus, getFocusSnapshot, getServerFocusSnapshot);

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
