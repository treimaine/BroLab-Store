import { preloadComponent } from "@/utils/lazyLoading";
import { useEffect } from "react";
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
        preloadComponent(async () => {
          const module = await import("@/components/audio/EnhancedGlobalAudioPlayer");
          return { default: module.EnhancedGlobalAudioPlayer };
        });
        break;
    }
  }, [location]);

  // This component doesn't render anything
  return null;
}

// This component doesn't export hooks to avoid Fast Refresh warnings
// Hooks are exported from separate files in client/src/hooks/
