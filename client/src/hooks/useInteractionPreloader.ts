import { preloadComponent } from "@/utils/lazyLoading";
import { ComponentType, useEffect } from "react";

/**
 * Hook to preload components on user interaction
 * Preloads heavy components on first user interaction (mousedown, touchstart, keydown)
 */
export function useInteractionPreloader(): void {
  useEffect(() => {
    let hasPreloaded = false;

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

    const handleInteraction = (): void => {
      if (hasPreloaded) return;
      hasPreloaded = true;

      preloadHeavyComponents();

      // Remove event listeners after first interaction
      removeListeners();
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

    return removeListeners;
  }, []);
}
