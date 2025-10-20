import { preloadComponent } from "@/utils/lazyLoading";
import React, { useEffect } from "react";
import { useLocation } from "wouter";

/**
 * Component that preloads other components based on current route
 * This improves perceived performance by loading likely-needed components
 */
export function ComponentPreloader() {
  const [location] = useLocation();

  useEffect(() => {
    // Preload components based on current route
    switch (location) {
      case "/":
        // On home page, preload shop and product pages
        preloadComponent(() => import("@/pages/shop"));
        preloadComponent(() => import("@/pages/product"));
        break;

      case "/shop":
        // On shop page, preload product and cart pages
        preloadComponent(() => import("@/pages/product"));
        preloadComponent(() => import("@/pages/cart"));
        break;

      case "/product":
        // On product page, preload cart and checkout
        preloadComponent(() => import("@/pages/cart"));
        preloadComponent(() => import("@/pages/checkout"));
        break;

      case "/cart":
        // On cart page, preload checkout and login
        preloadComponent(() => import("@/pages/checkout"));
        preloadComponent(() => import("@/pages/login"));
        break;

      default:
        // For other pages, preload common components
        preloadComponent(() =>
          import("@/components/audio/EnhancedGlobalAudioPlayer").then(module => ({
            default: module.EnhancedGlobalAudioPlayer,
          }))
        );
        break;
    }
  }, [location]);

  // This component doesn't render anything
  return null;
}

/**
 * Hook to preload components on user interaction
 */
export function useInteractionPreloader() {
  useEffect(() => {
    let hasPreloaded = false;

    const preloadOnInteraction = () => {
      if (hasPreloaded) return;
      hasPreloaded = true;

      // Preload heavy components on first user interaction
      preloadComponent(() =>
        import("@/components/audio/EnhancedGlobalAudioPlayer").then(module => ({
          default: module.EnhancedGlobalAudioPlayer,
        }))
      );
      preloadComponent(() => import("@/pages/dashboard"));

      // Remove event listeners
      document.removeEventListener("mousedown", preloadOnInteraction);
      document.removeEventListener("touchstart", preloadOnInteraction);
      document.removeEventListener("keydown", preloadOnInteraction);
    };

    // Add event listeners for user interaction
    document.addEventListener("mousedown", preloadOnInteraction, { passive: true });
    document.addEventListener("touchstart", preloadOnInteraction, { passive: true });
    document.addEventListener("keydown", preloadOnInteraction, { passive: true });

    return () => {
      document.removeEventListener("mousedown", preloadOnInteraction);
      document.removeEventListener("touchstart", preloadOnInteraction);
      document.removeEventListener("keydown", preloadOnInteraction);
    };
  }, []);
}

/**
 * Intersection Observer based preloader for components
 */
export function useIntersectionPreloader(
  ref: React.RefObject<HTMLElement>,
  importFn: () => Promise<unknown>
) {
  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            // Preload component when element comes into view
            importFn().catch(() => {
              // Silently handle preload failures
            });
            observer.unobserve(element);
          }
        });
      },
      { rootMargin: "100px" } // Start loading 100px before element is visible
    );

    observer.observe(element);

    return () => {
      observer.unobserve(element);
    };
  }, [ref, importFn]);
}
