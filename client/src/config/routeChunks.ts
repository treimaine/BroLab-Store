/**
 * Route chunking configuration for optimized bundle splitting
 * Groups low-traffic routes together to reduce initial router setup
 */

import { createRouteLazyComponent } from "@/utils/lazyLoading";
import { ComponentType, LazyExoticComponent } from "react";
import { featureFlags } from "./featureFlags";

export type RoutePriority = "high" | "medium" | "low";

export interface RouteChunk {
  name: string;
  routes: string[];
  priority: RoutePriority;
  preload?: boolean;
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
    preload: false, // Only preload when user shows intent to authenticate
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
  },
];

// Helper to get chunk for a route
export function getRouteChunk(path: string): RouteChunk | undefined {
  return routeChunks.find(chunk =>
    chunk.routes.some(route => {
      // Simple pattern matching (can be enhanced with path-to-regexp)
      const pattern = route.replaceAll(/:[^/]+/g, "[^/]+");
      const regex = new RegExp(`^${pattern}$`);
      return regex.test(path);
    })
  );
}

// Helper to preload route chunks based on priority
export function preloadRouteChunks(priority: RoutePriority): void {
  if (!featureFlags.enableRoutePreloading) return;

  const chunksToPreload = routeChunks.filter(chunk => chunk.priority === priority && chunk.preload);

  for (const chunk of chunksToPreload) {
    for (const route of chunk.routes) {
      // Preload logic would go here
      // This is a placeholder for actual preloading implementation
      if (process.env.NODE_ENV === "development") {
        console.log(`Preloading route chunk: ${chunk.name} - ${route}`);
      }
    }
  }
}

// Helper to create lazy route with chunk awareness
export function createChunkedRoute<T extends ComponentType<unknown>>(
  importFn: () => Promise<{ default: T }>,
  routePath: string
): LazyExoticComponent<T> {
  if (!featureFlags.enableLazyRoutes) {
    // If lazy routes are disabled, load immediately
    return createRouteLazyComponent(importFn, routePath);
  }

  // Create lazy component with chunk-aware preloading
  // Future enhancement: use chunk info for smarter preloading
  return createRouteLazyComponent(importFn, routePath);
}

// Helper to get routes by priority for progressive loading
export function getRoutesByPriority(priority: RoutePriority): string[] {
  return routeChunks.filter(chunk => chunk.priority === priority).flatMap(chunk => chunk.routes);
}
