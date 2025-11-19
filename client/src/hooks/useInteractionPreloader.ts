import { preloadComponent } from "@/utils/lazyLoading";
import { ComponentType, useEffect } from "react";

/**
 * Hook to preload components on user interaction
 * Preloads heavy components on first meaningful user interaction with throttling
 * to prevent excessive CPU/network churn before meaningful engagement
 */
export function useInteractionPreloader(): void {
  useEffect(() => {
    let hasPreloaded = false;
    let interactionCount = 0;
    let debounceTimer: NodeJS.Timeout | null = null;

    const preloadAudioPlayer = (): Promise<{ default: ComponentType<unknown> }> => {
      return import("@/components/audio/EnhancedGlobalAudioPlayer").then(module => ({
        default: module.EnhancedGlobalAudioPlayer,
      }));
    };

    const preloadHeavyComponents = (): void => {
      // Check if user has session before preloading authenticated features
      const hasSession =
        document.cookie.includes("__session") ||
        document.cookie.includes("__clerk") ||
        localStorage.getItem("clerk-db-jwt");

      // Preload audio player for all users
      preloadComponent(preloadAudioPlayer);

      // Only preload dashboard for authenticated users
      if (hasSession) {
        preloadComponent(() => import("@/pages/dashboard"));
      }
    };

    const handleInteraction = (): void => {
      if (hasPreloaded) return;

      // Increment interaction count
      interactionCount++;

      // Clear existing debounce timer
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }

      // Only trigger preload after first meaningful input with debounce
      // This prevents preloading on accidental touches or mouse movements
      debounceTimer = setTimeout(() => {
        if (interactionCount > 0 && !hasPreloaded) {
          hasPreloaded = true;
          preloadHeavyComponents();
          removeListeners();
        }
      }, 300); // 300ms debounce to ensure meaningful engagement
    };

    const removeListeners = (): void => {
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }
      document.removeEventListener("mousedown", handleInteraction);
      document.removeEventListener("touchstart", handleInteraction);
      document.removeEventListener("keydown", handleInteraction);
    };

    // Add event listeners for user interaction
    document.addEventListener("mousedown", handleInteraction, { passive: true });
    document.addEventListener("touchstart", handleInteraction, { passive: true });
    document.addEventListener("keydown", handleInteraction, { passive: true });

    return removeListeners;
  }, []);
}
