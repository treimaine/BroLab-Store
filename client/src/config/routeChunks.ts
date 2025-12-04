/**
 * Route chunking configuration for optimized bundle splitting
 * Groups low-traffic routes together to reduce initial router setup
 */

import { createRouteLazyComponent } from "@/utils/lazyLoading";
import { ComponentType, lazy, LazyExoticComponent } from "react";
import { featureFlags, isFeatureEnabled } from "./featureFlags";

export type RoutePriority = "high" | "medium" | "low";
export type RouteGroup =
  | "core"
  | "commerce"
  | "auth"
  | "services"
  | "info"
  | "legal"
  | "payment"
  | "admin";

export interface RouteChunk {
  name: RouteGroup;
  routes: string[];
  priority: RoutePriority;
  preload?: boolean;
  featureFlag?: keyof typeof featureFlags;
}

// Define route chunks by priority and usage patterns
export const routeChunks: RouteChunk[] = [
  {
    name: "core",
    routes: ["/", "/shop", "/product/:id"],
    priority: "high",
    preload: true,
  },
  {
    name: "commerce",
    routes: ["/cart", "/checkout", "/checkout-success", "/order-confirmation"],
    priority: "high",
    preload: true,
  },
  {
    name: "auth",
    routes: ["/login", "/signup", "/dashboard", "/verify-email", "/reset-password"],
    priority: "high",
    preload: false,
  },
  {
    name: "services",
    routes: [
      "/mixing-mastering",
      "/recording-sessions",
      "/custom-beats",
      "/production-consultation",
    ],
    priority: "medium",
    preload: false,
    featureFlag: "enableServiceRoutes",
  },
  {
    name: "info",
    routes: ["/about", "/contact", "/faq", "/membership", "/wishlist"],
    priority: "medium",
    preload: false,
  },
  {
    name: "legal",
    routes: ["/terms", "/privacy", "/licensing", "/refund", "/copyright"],
    priority: "low",
    preload: false,
    featureFlag: "enableLegalRoutes",
  },
  {
    name: "payment",
    routes: ["/payment/success", "/payment/cancel", "/clerk-checkout"],
    priority: "medium",
    preload: false,
  },
  {
    name: "admin",
    routes: ["/admin/files", "/test-convex", "/test-mock-alert"],
    priority: "low",
    preload: false,
    featureFlag: "enableAdminRoutes",
  },
];

/**
 * Check if a route group is enabled based on feature flags
 */
export function isRouteGroupEnabled(group: RouteGroup): boolean {
  const chunk = routeChunks.find(c => c.name === group);
  if (!chunk?.featureFlag) return true;
  return isFeatureEnabled(chunk.featureFlag);
}

/**
 * Get chunk for a route path
 */
export function getRouteChunk(path: string): RouteChunk | undefined {
  return routeChunks.find(chunk =>
    chunk.routes.some(route => {
      const pattern = route.replaceAll(/:[^/]+/g, "[^/]+");
      const regex = new RegExp(`^${pattern}$`);
      return regex.test(path);
    })
  );
}

/**
 * Preload route chunks based on priority
 */
export function preloadRouteChunks(priority: RoutePriority): void {
  if (!featureFlags.enableRoutePreloading) return;

  const chunksToPreload = routeChunks.filter(
    chunk => chunk.priority === priority && chunk.preload && isRouteGroupEnabled(chunk.name)
  );

  for (const chunk of chunksToPreload) {
    for (const route of chunk.routes) {
      if (import.meta.env.DEV) {
        console.log(`Preloading route chunk: ${chunk.name} - ${route}`);
      }
    }
  }
}

/**
 * Create lazy route with chunk awareness
 */
export function createChunkedRoute<P = object>(
  importFn: () => Promise<{ default: ComponentType<P> }>,
  routePath: string
): LazyExoticComponent<ComponentType<P>> {
  if (!featureFlags.enableLazyRoutes) {
    return createRouteLazyComponent<P>(importFn, routePath);
  }

  return createRouteLazyComponent<P>(importFn, routePath);
}

/**
 * Get routes by priority for progressive loading
 */
export function getRoutesByPriority(priority: RoutePriority): string[] {
  return routeChunks
    .filter(chunk => chunk.priority === priority && isRouteGroupEnabled(chunk.name))
    .flatMap(chunk => chunk.routes);
}

// ============================================================================
// GROUPED ROUTE COMPONENTS - Low-traffic routes bundled together
// ============================================================================

/**
 * Legal pages grouped into a single chunk for reduced bundle size
 * These pages are rarely visited and can share a single lazy boundary
 */
export const LegalRoutes = {
  Terms: lazy(() =>
    featureFlags.enableRouteGrouping
      ? import("@/pages/terms").then(m => ({ default: m.default }))
      : import("@/pages/terms")
  ),
  Privacy: lazy(() =>
    featureFlags.enableRouteGrouping
      ? import("@/pages/privacy").then(m => ({ default: m.default }))
      : import("@/pages/privacy")
  ),
  Licensing: lazy(() =>
    featureFlags.enableRouteGrouping
      ? import("@/pages/licensing").then(m => ({ default: m.default }))
      : import("@/pages/licensing")
  ),
  Refund: lazy(() =>
    featureFlags.enableRouteGrouping
      ? import("@/pages/refund").then(m => ({ default: m.default }))
      : import("@/pages/refund")
  ),
  Copyright: lazy(() =>
    featureFlags.enableRouteGrouping
      ? import("@/pages/copyright").then(m => ({ default: m.default }))
      : import("@/pages/copyright")
  ),
};

/**
 * Admin/Test pages grouped into a single chunk
 * Only loaded in development or when explicitly enabled
 */
export const AdminRoutes = {
  AdminFiles: lazy(() => import("@/pages/admin/files")),
  TestConvex: lazy(() => import("@/pages/test-convex")),
  TestMockAlert: lazy(() => import("@/pages/test-mock-alert")),
};

/**
 * Service pages grouped for medium-traffic optimization
 */
export const ServiceRoutes = {
  MixingMastering: lazy(() => import("@/pages/mixing-mastering")),
  RecordingSessions: lazy(() => import("@/pages/recording-sessions")),
  CustomBeats: lazy(() => import("@/pages/custom-beats")),
  ProductionConsultation: lazy(() => import("@/pages/production-consultation")),
  PremiumDownloads: lazy(() => import("@/pages/premium-downloads")),
};

/**
 * Hook to check if grouped routes should be rendered
 */
export function useRouteGrouping(): {
  isLegalEnabled: boolean;
  isAdminEnabled: boolean;
  isServiceEnabled: boolean;
  isGroupingEnabled: boolean;
} {
  return {
    isLegalEnabled: isFeatureEnabled("enableLegalRoutes"),
    isAdminEnabled: isFeatureEnabled("enableAdminRoutes"),
    isServiceEnabled: isFeatureEnabled("enableServiceRoutes"),
    isGroupingEnabled: isFeatureEnabled("enableRouteGrouping"),
  };
}

/**
 * Get all enabled routes for sitemap generation
 */
export function getEnabledRoutes(): string[] {
  return routeChunks
    .filter(chunk => isRouteGroupEnabled(chunk.name))
    .flatMap(chunk => chunk.routes);
}

/**
 * Preload a specific route group on demand
 */
export async function preloadRouteGroup(group: RouteGroup): Promise<void> {
  if (!isRouteGroupEnabled(group)) return;

  switch (group) {
    case "legal":
      await Promise.all([
        import("@/pages/terms"),
        import("@/pages/privacy"),
        import("@/pages/licensing"),
        import("@/pages/refund"),
        import("@/pages/copyright"),
      ]);
      break;
    case "admin":
      await Promise.all([
        import("@/pages/admin/files"),
        import("@/pages/test-convex"),
        import("@/pages/test-mock-alert"),
      ]);
      break;
    case "services":
      await Promise.all([
        import("@/pages/mixing-mastering"),
        import("@/pages/recording-sessions"),
        import("@/pages/custom-beats"),
        import("@/pages/production-consultation"),
        import("@/pages/premium-downloads"),
      ]);
      break;
    default:
      break;
  }
}
