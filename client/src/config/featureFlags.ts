/**
 * Feature flags for conditional route loading and feature enablement
 * Allows for progressive rollout and A/B testing
 */

export interface FeatureFlags {
  // Route chunking flags
  enableLazyRoutes: boolean;
  enableRoutePreloading: boolean;
  enableRouteGrouping: boolean; // Group low-traffic routes into single chunks

  // Route group flags - control which route groups are enabled
  enableLegalRoutes: boolean; // /terms, /privacy, /licensing, /refund, /copyright
  enableAdminRoutes: boolean; // /admin/*, /test-*
  enableServiceRoutes: boolean; // /mixing-mastering, /recording-sessions, etc.

  // Feature-specific flags
  enableNewsletter: boolean;
  enableOfflineMode: boolean;
  enablePerformanceMonitoring: boolean;
  enableBundleAnalyzer: boolean;

  // Service flags
  enableMixingMastering: boolean;
  enableRecordingSessions: boolean;
  enableCustomBeats: boolean;
  enableProductionConsultation: boolean;

  // Payment flags
  enableStripeCheckout: boolean;
  enablePayPalCheckout: boolean;

  // Experimental features
  enableExperimentalFeatures: boolean;
}

// Default feature flags
const defaultFlags: FeatureFlags = {
  // Route chunking - enabled by default for better performance
  enableLazyRoutes: true,
  enableRoutePreloading: true,
  enableRouteGrouping: true, // Group low-traffic routes for smaller initial bundle

  // Route groups - all enabled by default
  enableLegalRoutes: true,
  enableAdminRoutes: import.meta.env.DEV, // Admin routes only in development by default
  enableServiceRoutes: true,

  // Core features - enabled by default
  enableNewsletter: true,
  enableOfflineMode: true,
  enablePerformanceMonitoring: import.meta.env.DEV,
  enableBundleAnalyzer: import.meta.env.DEV,

  // Services - enabled by default
  enableMixingMastering: true,
  enableRecordingSessions: true,
  enableCustomBeats: true,
  enableProductionConsultation: true,

  // Payment - enabled by default
  enableStripeCheckout: true,
  enablePayPalCheckout: true,

  // Experimental - disabled by default
  enableExperimentalFeatures: false,
};

/**
 * Check if window is available (browser environment)
 */
function isBrowser(): boolean {
  return globalThis.window !== undefined;
}

/**
 * Load flags from localStorage
 */
function loadStoredFlags(): Partial<FeatureFlags> | null {
  if (!isBrowser()) {
    return null;
  }

  const storedFlags = globalThis.localStorage.getItem("featureFlags");
  if (!storedFlags) {
    return null;
  }

  try {
    return JSON.parse(storedFlags) as Partial<FeatureFlags>;
  } catch (error) {
    console.warn("Failed to parse feature flags from localStorage:", error);
    return null;
  }
}

/**
 * Load flags from environment variables
 */
function loadEnvFlags(): Partial<FeatureFlags> {
  const envFlags: Partial<FeatureFlags> = {};

  if (import.meta.env.VITE_ENABLE_LAZY_ROUTES !== undefined) {
    envFlags.enableLazyRoutes = import.meta.env.VITE_ENABLE_LAZY_ROUTES === "true";
  }

  if (import.meta.env.VITE_ENABLE_ROUTE_PRELOADING !== undefined) {
    envFlags.enableRoutePreloading = import.meta.env.VITE_ENABLE_ROUTE_PRELOADING === "true";
  }

  if (import.meta.env.VITE_ENABLE_ROUTE_GROUPING !== undefined) {
    envFlags.enableRouteGrouping = import.meta.env.VITE_ENABLE_ROUTE_GROUPING === "true";
  }

  if (import.meta.env.VITE_ENABLE_ADMIN_ROUTES !== undefined) {
    envFlags.enableAdminRoutes = import.meta.env.VITE_ENABLE_ADMIN_ROUTES === "true";
  }

  if (import.meta.env.VITE_ENABLE_EXPERIMENTAL !== undefined) {
    envFlags.enableExperimentalFeatures = import.meta.env.VITE_ENABLE_EXPERIMENTAL === "true";
  }

  return envFlags;
}

/**
 * Load feature flags from environment or localStorage
 */
function loadFeatureFlags(): FeatureFlags {
  const storedFlags = loadStoredFlags();
  const envFlags = loadEnvFlags();

  if (storedFlags) {
    return {
      ...defaultFlags,
      ...storedFlags,
      ...envFlags,
    };
  }

  return {
    ...defaultFlags,
    ...envFlags,
  };
}

// Export feature flags instance
export const featureFlags = loadFeatureFlags();

// Helper to check if a feature is enabled
export function isFeatureEnabled(feature: keyof FeatureFlags): boolean {
  return featureFlags[feature];
}

/**
 * Persist flags to localStorage
 */
function persistFlags(flags: FeatureFlags): void {
  if (isBrowser()) {
    globalThis.localStorage.setItem("featureFlags", JSON.stringify(flags));
  }
}

/**
 * Clear flags from localStorage
 */
function clearPersistedFlags(): void {
  if (isBrowser()) {
    globalThis.localStorage.removeItem("featureFlags");
  }
}

/**
 * Update feature flags at runtime (for testing)
 */
export function updateFeatureFlags(updates: Partial<FeatureFlags>): void {
  Object.assign(featureFlags, updates);
  persistFlags(featureFlags);
}

/**
 * Reset feature flags to defaults
 */
export function resetFeatureFlags(): void {
  Object.assign(featureFlags, defaultFlags);
  clearPersistedFlags();
}
