/**
 * Feature Flags Store
 * Zustand store for reactive feature flags with localStorage persistence
 * Replaces the mutable object pattern to ensure React components re-render on flag changes
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";

/**
 * Feature flags interface for conditional feature enablement
 */
export interface FeatureFlags {
  // Route chunking flags
  enableLazyRoutes: boolean;
  enableRoutePreloading: boolean;
  enableRouteGrouping: boolean;

  // Route group flags
  enableLegalRoutes: boolean;
  enableAdminRoutes: boolean;
  enableServiceRoutes: boolean;

  // Feature-specific flags
  enableNewsletter: boolean;
  enableOfflineMode: boolean;
  enablePerformanceMonitoring: boolean;
  enableBundleAnalyzer: boolean;

  // Audio player flags
  enableSonaarModernPlayer: boolean;

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

/**
 * Default feature flags values
 */
export const defaultFeatureFlags: FeatureFlags = {
  // Route chunking - enabled by default for better performance
  enableLazyRoutes: true,
  enableRoutePreloading: true,
  enableRouteGrouping: true,

  // Route groups - all enabled by default
  enableLegalRoutes: true,
  enableAdminRoutes: globalThis.window !== undefined && import.meta.env.DEV,
  enableServiceRoutes: true,

  // Core features - enabled by default
  enableNewsletter: true,
  enableOfflineMode: true,
  enablePerformanceMonitoring: globalThis.window !== undefined && import.meta.env.DEV,
  enableBundleAnalyzer: globalThis.window !== undefined && import.meta.env.DEV,

  // Audio player - new Sonaar Modern Player enabled by default
  enableSonaarModernPlayer: true,

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
 * Load flags from environment variables
 */
function loadEnvFlags(): Partial<FeatureFlags> {
  if (globalThis.window === undefined) return {};

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

  if (import.meta.env.VITE_ENABLE_SONAAR_MODERN_PLAYER !== undefined) {
    envFlags.enableSonaarModernPlayer = import.meta.env.VITE_ENABLE_SONAAR_MODERN_PLAYER === "true";
  }

  return envFlags;
}

interface FeatureFlagsState {
  flags: FeatureFlags;
}

interface FeatureFlagsActions {
  updateFlags: (updates: Partial<FeatureFlags>) => void;
  resetFlags: () => void;
  isEnabled: (feature: keyof FeatureFlags) => boolean;
}

/**
 * Feature Flags Zustand Store
 * Provides reactive state management for feature flags with automatic persistence
 */
export const useFeatureFlagsStore = create<FeatureFlagsState & FeatureFlagsActions>()(
  persist(
    (set, get) => ({
      // Initial state: merge defaults with env overrides
      flags: {
        ...defaultFeatureFlags,
        ...loadEnvFlags(),
      },

      // Update flags immutably - triggers React re-renders
      updateFlags: (updates: Partial<FeatureFlags>) => {
        set(state => ({
          flags: { ...state.flags, ...updates },
        }));
      },

      // Reset to defaults
      resetFlags: () => {
        set({
          flags: {
            ...defaultFeatureFlags,
            ...loadEnvFlags(),
          },
        });
      },

      // Check if a specific feature is enabled
      isEnabled: (feature: keyof FeatureFlags) => {
        return get().flags[feature];
      },
    }),
    {
      name: "feature-flags",
      // Only persist user-modified flags, not env-based ones
      partialize: state => ({ flags: state.flags }),
    }
  )
);

// Selector hooks for ergonomic usage

/**
 * Get all feature flags
 */
export function useFeatureFlags(): FeatureFlags {
  return useFeatureFlagsStore(state => state.flags);
}

/**
 * Check if a specific feature is enabled (reactive)
 */
export function useIsFeatureEnabled(feature: keyof FeatureFlags): boolean {
  return useFeatureFlagsStore(state => state.flags[feature]);
}

/**
 * Get feature flag actions
 */
export function useFeatureFlagActions(): Pick<FeatureFlagsActions, "updateFlags" | "resetFlags"> {
  return useFeatureFlagsStore(state => ({
    updateFlags: state.updateFlags,
    resetFlags: state.resetFlags,
  }));
}

/**
 * Non-reactive getter for use outside React components
 * Use sparingly - prefer hooks in components
 */
export function getFeatureFlag(feature: keyof FeatureFlags): boolean {
  return useFeatureFlagsStore.getState().flags[feature];
}

/**
 * Non-reactive update for use outside React components
 */
export function setFeatureFlags(updates: Partial<FeatureFlags>): void {
  useFeatureFlagsStore.getState().updateFlags(updates);
}
