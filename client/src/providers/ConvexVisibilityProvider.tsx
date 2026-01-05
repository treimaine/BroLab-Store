/**
 * Convex Visibility Provider
 *
 * Prevents the "thundering herd" problem when tab becomes visible by:
 * 1. Pausing Convex subscriptions when tab is hidden
 * 2. Resuming them with staggered delays when tab becomes visible
 *
 * This prevents the browser freeze that occurs when all Convex subscriptions
 * try to reconnect and resync simultaneously.
 */

import { useTabVisible } from "@/hooks/useTabVisibilityManager";
import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

interface ConvexVisibilityContextValue {
  /** Whether Convex subscriptions should be active */
  isConvexEnabled: boolean;
  /** Whether the tab is currently visible */
  isTabVisible: boolean;
  /** Force enable Convex (bypass visibility check) */
  forceEnable: () => void;
  /** Force disable Convex */
  forceDisable: () => void;
}

const ConvexVisibilityContext = createContext<ConvexVisibilityContextValue>({
  isConvexEnabled: true,
  isTabVisible: true,
  forceEnable: () => {},
  forceDisable: () => {},
});

interface ConvexVisibilityProviderProps {
  children: ReactNode;
  /** Base delay before enabling Convex after tab becomes visible (ms) */
  resumeDelay?: number;
  /** Additional random delay to stagger multiple components (ms) */
  staggerRange?: number;
  /** Minimum time tab must be visible before enabling Convex (ms) */
  minVisibleTime?: number;
}

/**
 * Provider that controls Convex subscription activity based on tab visibility.
 *
 * When the tab is hidden, Convex subscriptions are disabled to prevent
 * unnecessary network activity and memory accumulation.
 *
 * When the tab becomes visible again, subscriptions are re-enabled after
 * a staggered delay to prevent the "thundering herd" problem.
 */
export function ConvexVisibilityProvider({
  children,
  resumeDelay = 500,
  staggerRange = 1000,
  minVisibleTime = 300,
}: Readonly<ConvexVisibilityProviderProps>): JSX.Element {
  const isTabVisible = useTabVisible();
  const [isConvexEnabled, setIsConvexEnabled] = useState(isTabVisible);
  const [isForced, setIsForced] = useState(false);
  const resumeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastVisibilityChangeRef = useRef(Date.now());

  // Clear any pending resume timeout
  const clearResumeTimeout = useCallback(() => {
    if (resumeTimeoutRef.current) {
      clearTimeout(resumeTimeoutRef.current);
      resumeTimeoutRef.current = null;
    }
  }, []);

  // Handle visibility changes
  useEffect(() => {
    // Don't change state if forced
    if (isForced) {
      return;
    }

    if (isTabVisible) {
      // Tab became visible - schedule staggered resume
      lastVisibilityChangeRef.current = Date.now();

      // Calculate staggered delay
      const staggerDelay = Math.random() * staggerRange;
      const totalDelay = resumeDelay + staggerDelay;

      clearResumeTimeout();

      resumeTimeoutRef.current = setTimeout(() => {
        // Verify tab is still visible and has been for minimum time
        const visibleDuration = Date.now() - lastVisibilityChangeRef.current;
        if (visibleDuration >= minVisibleTime) {
          setIsConvexEnabled(true);
          if (import.meta.env.DEV) {
            console.log(
              `[ConvexVisibilityProvider] Convex enabled after ${Math.round(totalDelay)}ms delay`
            );
          }
        }
      }, totalDelay);
    } else {
      // Tab became hidden - immediately disable Convex
      clearResumeTimeout();
      setIsConvexEnabled(false);
      if (import.meta.env.DEV) {
        console.log("[ConvexVisibilityProvider] Convex disabled (tab hidden)");
      }
    }

    return clearResumeTimeout;
  }, [isTabVisible, isForced, resumeDelay, staggerRange, minVisibleTime, clearResumeTimeout]);

  // Force enable/disable functions
  const forceEnable = useCallback(() => {
    setIsForced(true);
    setIsConvexEnabled(true);
  }, []);

  const forceDisable = useCallback(() => {
    setIsForced(true);
    setIsConvexEnabled(false);
  }, []);

  // Memoize context value to prevent unnecessary re-renders
  const contextValue = useMemo<ConvexVisibilityContextValue>(
    () => ({
      isConvexEnabled,
      isTabVisible,
      forceEnable,
      forceDisable,
    }),
    [isConvexEnabled, isTabVisible, forceEnable, forceDisable]
  );

  return (
    <ConvexVisibilityContext.Provider value={contextValue}>
      {children}
    </ConvexVisibilityContext.Provider>
  );
}

/**
 * Hook to access Convex visibility state
 */
export function useConvexVisibility(): ConvexVisibilityContextValue {
  return useContext(ConvexVisibilityContext);
}

/**
 * Hook that returns whether a Convex query should be active
 * Use this to conditionally skip Convex queries when tab is hidden
 */
export function useConvexQueryEnabled(): boolean {
  const { isConvexEnabled } = useConvexVisibility();
  return isConvexEnabled;
}
