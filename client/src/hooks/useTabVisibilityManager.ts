/**
 * Centralized Tab Visibility Manager
 *
 * Provides a single source of truth for tab visibility state to prevent
 * multiple event listeners and coordinate staggered resumption of services
 * when the tab becomes visible again.
 *
 * This prevents the "freeze on tab return" bug caused by:
 * 1. Multiple visibility event listeners firing simultaneously
 * 2. All timers/animations restarting at once
 * 3. Network requests flooding when tab regains focus
 */

import { useCallback, useEffect, useRef, useSyncExternalStore } from "react";

// Singleton state for tab visibility
let isTabVisible = typeof document === "undefined" ? true : document.hidden === false;
let lastVisibilityChange = Date.now();
const listeners = new Set<() => void>();

// Notify all subscribers when visibility changes
function notifyListeners(): void {
  listeners.forEach(listener => listener());
}

// Initialize the global visibility listener (runs once)
if (typeof document !== "undefined") {
  document.addEventListener(
    "visibilitychange",
    () => {
      const wasVisible = isTabVisible;
      isTabVisible = document.hidden === false;
      lastVisibilityChange = Date.now();

      // Only notify if state actually changed
      if (wasVisible !== isTabVisible) {
        notifyListeners();
      }
    },
    { passive: true }
  );
}

// Subscribe function for useSyncExternalStore
function subscribe(callback: () => void): () => void {
  listeners.add(callback);
  return () => listeners.delete(callback);
}

// Snapshot function for useSyncExternalStore
function getSnapshot(): boolean {
  return isTabVisible;
}

// Server snapshot (SSR)
function getServerSnapshot(): boolean {
  return true;
}

/**
 * Hook to get current tab visibility state
 * Uses useSyncExternalStore for optimal React 18 compatibility
 */
export function useTabVisible(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

/**
 * Hook to get time since last visibility change
 * Useful for debouncing rapid tab switches
 */
export function useTimeSinceVisibilityChange(): number {
  useTabVisible(); // Subscribe to changes to trigger re-renders
  return Date.now() - lastVisibilityChange;
}

interface StaggeredResumeOptions {
  /** Base delay before resuming (ms) - increased default to prevent freeze */
  baseDelay?: number;
  /** Additional random delay to stagger multiple consumers (ms) */
  staggerRange?: number;
  /** Minimum time tab must be visible before resuming (ms) */
  minVisibleTime?: number;
  /** Callback when ready to resume */
  onResume?: () => void;
  /** Callback when tab becomes hidden */
  onHide?: () => void;
}

/**
 * Hook for staggered service resumption when tab becomes visible
 *
 * Prevents the "thundering herd" problem where all services restart
 * simultaneously when the user returns to the tab.
 *
 * @example
 * ```tsx
 * const { isReady, scheduleResume } = useStaggeredResume({
 *   baseDelay: 100,
 *   staggerRange: 500,
 *   onResume: () => startMyTimer(),
 *   onHide: () => stopMyTimer(),
 * });
 * ```
 */
export function useStaggeredResume(options: StaggeredResumeOptions = {}): {
  isReady: boolean;
  isVisible: boolean;
  scheduleResume: (callback: () => void) => void;
} {
  // Increased defaults to prevent "thundering herd" freeze on tab return
  const { baseDelay = 300, staggerRange = 800, minVisibleTime = 500, onResume, onHide } = options;

  const isVisible = useTabVisible();
  const isReadyRef = useRef(isVisible);
  const resumeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onResumeRef = useRef(onResume);
  const onHideRef = useRef(onHide);

  // Keep refs updated
  onResumeRef.current = onResume;
  onHideRef.current = onHide;

  // Clear any pending resume timeout
  const clearResumeTimeout = useCallback(() => {
    if (resumeTimeoutRef.current) {
      clearTimeout(resumeTimeoutRef.current);
      resumeTimeoutRef.current = null;
    }
  }, []);

  // Schedule a callback with staggered delay
  const scheduleResume = useCallback(
    (callback: () => void) => {
      clearResumeTimeout();

      // Calculate staggered delay
      const staggerDelay = Math.random() * staggerRange;
      const totalDelay = baseDelay + staggerDelay;

      resumeTimeoutRef.current = setTimeout(() => {
        // Verify tab is still visible and has been for minimum time
        if (isTabVisible && Date.now() - lastVisibilityChange >= minVisibleTime) {
          callback();
        }
      }, totalDelay);
    },
    [baseDelay, staggerRange, minVisibleTime, clearResumeTimeout]
  );

  useEffect(() => {
    if (isVisible) {
      // Tab became visible - schedule staggered resume
      const staggerDelay = Math.random() * staggerRange;
      const totalDelay = baseDelay + staggerDelay;

      resumeTimeoutRef.current = setTimeout(() => {
        // Verify tab is still visible
        if (isTabVisible && Date.now() - lastVisibilityChange >= minVisibleTime) {
          isReadyRef.current = true;
          onResumeRef.current?.();
        }
      }, totalDelay);
    } else {
      // Tab became hidden - immediately pause
      clearResumeTimeout();
      isReadyRef.current = false;
      onHideRef.current?.();
    }

    return clearResumeTimeout;
  }, [isVisible, baseDelay, staggerRange, minVisibleTime, clearResumeTimeout]);

  return {
    isReady: isReadyRef.current && isVisible,
    isVisible,
    scheduleResume,
  };
}

/**
 * Hook to debounce visibility changes
 * Prevents rapid fire when user quickly switches tabs
 */
export function useDebouncedVisibility(debounceMs: number = 150): boolean {
  const isVisible = useTabVisible();
  const debouncedRef = useRef(isVisible);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      debouncedRef.current = isVisible;
    }, debounceMs);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [isVisible, debounceMs]);

  return debouncedRef.current;
}

// Export singleton state accessors for non-React code
export const TabVisibilityManager = {
  get isVisible(): boolean {
    return isTabVisible;
  },
  isVisibleFn: (): boolean => isTabVisible,
  getLastChangeTime: (): number => lastVisibilityChange,
  getTimeSinceChange: (): number => Date.now() - lastVisibilityChange,
};
