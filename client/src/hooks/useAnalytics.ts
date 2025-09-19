// React hook for user behavior analytics

import { useCallback, useEffect, useRef, useState } from "react";
import {
  AnalyticsDashboardData,
  AnalyticsEvent,
  FunnelAnalysis,
  InteractionType,
  PrivacySettings,
  RealTimeMetrics,
  TimeRange,
  UserBehaviorInsight,
} from "../../../shared/types/analytics";
import { analyticsManager } from "../../../shared/utils/analytics-manager";

export interface UseAnalyticsOptions {
  autoTrackPageViews?: boolean;
  autoTrackClicks?: boolean;
  realTimeUpdates?: boolean;
  privacyCompliant?: boolean;
}

export interface UseAnalyticsReturn {
  // Tracking methods
  trackInteraction: (
    type: InteractionType,
    component: string,
    action: string,
    metadata?: Record<string, unknown>
  ) => Promise<void>;
  trackPageView: (page?: string, metadata?: Record<string, unknown>) => Promise<void>;
  trackConversion: (funnelId: string, stepId: string, value?: number) => Promise<void>;
  trackClick: (target: string, metadata?: Record<string, unknown>) => Promise<void>;
  trackSearch: (query: string, results?: number) => Promise<void>;
  trackError: (error: Error, component: string) => Promise<void>;

  // Data retrieval
  getDashboardData: (timeRange: TimeRange) => Promise<AnalyticsDashboardData>;
  getFunnelAnalysis: (funnelId: string, timeRange: TimeRange) => Promise<FunnelAnalysis>;
  getInsights: (timeRange: TimeRange) => Promise<UserBehaviorInsight[]>;

  // Real-time data
  realTimeMetrics: RealTimeMetrics | null;
  isLoading: boolean;
  error: Error | null;

  // Privacy controls
  privacySettings: PrivacySettings | null;
  setPrivacySettings: (settings: Partial<PrivacySettings>) => Promise<void>;
  isTrackingEnabled: boolean;

  // Session management
  sessionId: string | null;
  startNewSession: () => Promise<void>;
}

export function useAnalytics(options: UseAnalyticsOptions = {}): UseAnalyticsReturn {
  const { autoTrackPageViews = true, autoTrackClicks = true, realTimeUpdates = true } = options;

  const [realTimeMetrics, setRealTimeMetrics] = useState<RealTimeMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [privacySettings, setPrivacySettingsState] = useState<PrivacySettings | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isTrackingEnabled, setIsTrackingEnabled] = useState(true);

  const currentPageRef = useRef<string>("");
  const unsubscribeRef = useRef<(() => void) | null>(null);

  // Initialize analytics
  useEffect(() => {
    const initializeAnalytics = async () => {
      try {
        setIsLoading(true);

        // Get privacy settings
        const settings = await analyticsManager.getPrivacySettings();
        setPrivacySettingsState(settings);
        setIsTrackingEnabled(analyticsManager.isTrackingAllowed());

        // Start session if tracking is enabled
        if (analyticsManager.isTrackingAllowed()) {
          const newSessionId = await analyticsManager.startSession();
          setSessionId(newSessionId);
        }

        // Set up real-time updates
        if (realTimeUpdates && analyticsManager.isTrackingAllowed()) {
          const updateMetrics = async () => {
            try {
              const metrics = await analyticsManager.getRealTimeMetrics();
              setRealTimeMetrics(metrics);
            } catch (err) {
              console.error("Failed to update real-time metrics:", err);
            }
          };

          // Initial load
          await updateMetrics();

          // Set up event listener for real-time updates
          const unsubscribe = analyticsManager.onEvent((event: AnalyticsEvent) => {
            if (event.type === "interaction") {
              updateMetrics();
            }
          });

          unsubscribeRef.current = unsubscribe;
        }
      } catch (err) {
        setError(err as Error);
        console.error("Failed to initialize analytics:", err);
      } finally {
        setIsLoading(false);
      }
    };

    initializeAnalytics();

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
    };
  }, [realTimeUpdates]);

  // Auto-track page views
  useEffect(() => {
    if (!autoTrackPageViews || !analyticsManager.isTrackingAllowed()) return;

    const currentPage = window.location.pathname + window.location.search;
    if (currentPage !== currentPageRef.current) {
      currentPageRef.current = currentPage;
      analyticsManager.trackPageView(currentPage, {
        title: document.title,
        referrer: document.referrer,
      });
    }
  }, [autoTrackPageViews]);

  // Auto-track clicks
  useEffect(() => {
    if (!autoTrackClicks || !analyticsManager.isTrackingAllowed()) return;

    const handleClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target) return;

      const tagName = target.tagName.toLowerCase();
      const targetInfo = {
        tag: tagName,
        id: target.id,
        className: target.className,
        text: target.textContent?.slice(0, 100) || "",
        href: tagName === "a" ? (target as HTMLAnchorElement).href : undefined,
      };

      analyticsManager.trackInteraction({
        sessionId: sessionId || "unknown",
        type: "click",
        component: "ui",
        action: "click",
        target: target.id || target.className || tagName,
        url: window.location.href,
        metadata: targetInfo,
      });
    };

    document.addEventListener("click", handleClick, { passive: true });

    return () => {
      document.removeEventListener("click", handleClick);
    };
  }, [autoTrackClicks]);

  // Tracking methods
  const trackInteraction = useCallback(
    async (
      type: InteractionType,
      component: string,
      action: string,
      metadata: Record<string, unknown> = {}
    ) => {
      if (!analyticsManager.isTrackingAllowed()) return;

      try {
        await analyticsManager.trackInteraction({
          sessionId: sessionId || "unknown",
          type,
          component,
          action,
          url: window.location.href,
          metadata,
        });
      } catch (err) {
        console.error("Failed to track interaction:", err);
        setError(err as Error);
      }
    },
    []
  );

  const trackPageView = useCallback(
    async (page?: string, metadata: Record<string, unknown> = {}) => {
      if (!analyticsManager.isTrackingAllowed()) return;

      try {
        const currentPage = page || window.location.pathname + window.location.search;
        await analyticsManager.trackPageView(currentPage, {
          title: document.title,
          referrer: document.referrer,
          ...metadata,
        });
        currentPageRef.current = currentPage;
      } catch (err) {
        console.error("Failed to track page view:", err);
        setError(err as Error);
      }
    },
    []
  );

  const trackConversion = useCallback(async (funnelId: string, stepId: string, value?: number) => {
    if (!analyticsManager.isTrackingAllowed()) return;

    try {
      await analyticsManager.trackConversion(funnelId, stepId, value);
    } catch (err) {
      console.error("Failed to track conversion:", err);
      setError(err as Error);
    }
  }, []);

  const trackClick = useCallback(
    async (target: string, metadata: Record<string, unknown> = {}) => {
      await trackInteraction("click", "ui", "click", { target, ...metadata });
    },
    [trackInteraction]
  );

  const trackSearch = useCallback(
    async (query: string, results?: number) => {
      await trackInteraction("search", "search", "query", { query, results });
    },
    [trackInteraction]
  );

  const trackError = useCallback(
    async (error: Error, component: string) => {
      await trackInteraction("error", component, "error", {
        message: error.message,
        stack: error.stack,
        name: error.name,
      });
    },
    [trackInteraction]
  );

  // Data retrieval methods
  const getDashboardData = useCallback(
    async (timeRange: TimeRange): Promise<AnalyticsDashboardData> => {
      try {
        setIsLoading(true);
        return await analyticsManager.getDashboardData(timeRange);
      } catch (err) {
        setError(err as Error);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const getFunnelAnalysis = useCallback(
    async (funnelId: string, timeRange: TimeRange): Promise<FunnelAnalysis> => {
      try {
        setIsLoading(true);
        return await analyticsManager.getFunnelAnalysis(funnelId, timeRange);
      } catch (err) {
        setError(err as Error);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const getInsights = useCallback(async (timeRange: TimeRange): Promise<UserBehaviorInsight[]> => {
    try {
      setIsLoading(true);
      return await analyticsManager.getUserBehaviorInsights(timeRange);
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Privacy controls
  const setPrivacySettings = useCallback(async (settings: Partial<PrivacySettings>) => {
    try {
      await analyticsManager.setPrivacySettings(settings);
      const updatedSettings = await analyticsManager.getPrivacySettings();
      setPrivacySettingsState(updatedSettings);
      setIsTrackingEnabled(analyticsManager.isTrackingAllowed());
    } catch (err) {
      setError(err as Error);
      throw err;
    }
  }, []);

  // Session management
  const startNewSession = useCallback(async () => {
    try {
      const newSessionId = await analyticsManager.startSession();
      setSessionId(newSessionId);
    } catch (err) {
      setError(err as Error);
      throw err;
    }
  }, []);

  return {
    // Tracking methods
    trackInteraction,
    trackPageView,
    trackConversion,
    trackClick,
    trackSearch,
    trackError,

    // Data retrieval
    getDashboardData,
    getFunnelAnalysis,
    getInsights,

    // Real-time data
    realTimeMetrics,
    isLoading,
    error,

    // Privacy controls
    privacySettings,
    setPrivacySettings,
    isTrackingEnabled,

    // Session management
    sessionId,
    startNewSession,
  };
}

export default useAnalytics;
