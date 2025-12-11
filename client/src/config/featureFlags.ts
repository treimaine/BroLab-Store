/**
 * Feature flags for conditional route loading and feature enablement
 * Allows for progressive rollout and A/B testing
 *
 * @deprecated Use useFeatureFlagsStore from '@/stores' for reactive feature flags.
 * This module is kept for backward compatibility with non-React code.
 * For React components, use:
 *   - useFeatureFlags() - get all flags reactively
 *   - useIsFeatureEnabled(flag) - check single flag reactively
 *   - useFeatureFlagActions() - update/reset flags
 */

// Re-export types and defaults from the store for backward compatibility
export { defaultFeatureFlags as defaultFlags } from "@/stores/useFeatureFlagsStore";
export type { FeatureFlags } from "@/stores/useFeatureFlagsStore";

import {
  getFeatureFlag,
  setFeatureFlags,
  useFeatureFlagsStore,
  type FeatureFlags,
} from "@/stores/useFeatureFlagsStore";

/**
 * Proxy object that reads from the Zustand store
 * Provides backward compatibility for code that reads featureFlags directly
 * @deprecated Use useFeatureFlags() hook in React components
 */
export const featureFlags: FeatureFlags = new Proxy({} as FeatureFlags, {
  get(_target, prop: string) {
    const state = useFeatureFlagsStore.getState();
    return state.flags[prop as keyof FeatureFlags];
  },
  set(_target, prop: string, value: boolean) {
    setFeatureFlags({ [prop]: value } as Partial<FeatureFlags>);
    return true;
  },
});

/**
 * Helper to check if a feature is enabled
 * @deprecated Use useIsFeatureEnabled() hook in React components for reactive updates
 */
export function isFeatureEnabled(feature: keyof FeatureFlags): boolean {
  return getFeatureFlag(feature);
}

/**
 * Update feature flags at runtime
 * Now properly triggers React re-renders via Zustand store
 */
export function updateFeatureFlags(updates: Partial<FeatureFlags>): void {
  setFeatureFlags(updates);
}

/**
 * Reset feature flags to defaults
 */
export function resetFeatureFlags(): void {
  useFeatureFlagsStore.getState().resetFlags();
}
