import { preloadComponent } from "@/utils/lazyLoading";
import { isSlowConnection } from "@/utils/performance";
import { ComponentType, useEffect, useRef } from "react";

/** Debounce delay in milliseconds */
const DEBOUNCE_DELAY = 150;

/**
 * Check if the current network connection is slow or data-saving mode is enabled
 * Returns true if preloading should be skipped
 */
function shouldSkipPreloading(): boolean {
  // Skip on slow connections (2G or slow-2g)
  if (isSlowConnection()) {
    return true;
  }

  // Check for data saver mode
  const connection = (
    navigator as {
      connection?: {
        saveData?: boolean;
        effectiveType?: string;
      };
    }
  ).connection;

  if (connection?.saveData) {
    return true;
  }

  // Skip if user is offline
  if (!navigator.onLine) {
    return true;
  }

  return false;
}

/**
 * Hook to preload components on user interaction
 * Preloads heavy components on first user interaction (mousedown, touchstart, keydown)
 *
 * Features:
 * - Debounced to prevent multiple rapid triggers
 * - Network-aware: skips preloading on slow connections (2G, slow-2g)
 * - Respects data saver mode
 * - Skips when offline
 */
export function useInteractionPreloader(): void {
  const hasPreloadedRef = useRef(false);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const preloadAudioPlayer = (): Promise<{ default: ComponentType<Record<string, unknown>> }> => {
      return import("@/components/audio/EnhancedGlobalAudioPlayer").then(module => ({
        default: module.EnhancedGlobalAudioPlayer,
      }));
    };

    const preloadHeavyComponents = (): void => {
      // Preload heavy components on first user interaction
      preloadComponent(preloadAudioPlayer);
      preloadComponent(() => import("@/pages/dashboard"));
    };

    const executePreload = (): void => {
      // Skip if already preloaded
      if (hasPreloadedRef.current) return;

      // Skip on slow connections or data saver mode
      if (shouldSkipPreloading()) {
        return;
      }

      hasPreloadedRef.current = true;
      preloadHeavyComponents();

      // Remove event listeners after successful preload
      removeListeners();
    };

    const handleInteraction = (): void => {
      // Skip if already preloaded
      if (hasPreloadedRef.current) return;

      // Clear any existing debounce timer
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      // Debounce the preload execution
      debounceTimerRef.current = setTimeout(executePreload, DEBOUNCE_DELAY);
    };

    const removeListeners = (): void => {
      document.removeEventListener("mousedown", handleInteraction);
      document.removeEventListener("touchstart", handleInteraction);
      document.removeEventListener("keydown", handleInteraction);
    };

    // Add event listeners for user interaction
    document.addEventListener("mousedown", handleInteraction, { passive: true });
    document.addEventListener("touchstart", handleInteraction, { passive: true });
    document.addEventListener("keydown", handleInteraction, { passive: true });

    return () => {
      // Cleanup debounce timer
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      removeListeners();
    };
  }, []);
}
