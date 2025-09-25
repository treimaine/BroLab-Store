/**
 * Dashboard Configuration Hook
 * Provides access to dashboard configuration with runtime updates
 */

import {
  API_CONFIG,
  CURRENCY_CONFIG,
  DEV_CONFIG,
  ERROR_CONFIG,
  FEATURE_FLAGS,
  PAGINATION_CONFIG,
  PERFORMANCE_CONFIG,
  UI_CONFIG,
  getDashboardConfig,
  isFeatureEnabled,
  validateConfig,
} from "@/config/dashboard";
import type { DashboardConfig } from "@shared/types/dashboard";
import { useCallback, useMemo } from "react";

export interface DashboardConfigHook {
  // Main configuration
  config: DashboardConfig;

  // Individual configuration sections
  ui: typeof UI_CONFIG;
  pagination: typeof PAGINATION_CONFIG;
  performance: typeof PERFORMANCE_CONFIG;
  api: typeof API_CONFIG;
  currency: typeof CURRENCY_CONFIG;
  error: typeof ERROR_CONFIG;
  dev: typeof DEV_CONFIG;

  // Feature flags
  features: typeof FEATURE_FLAGS;
  isFeatureEnabled: (feature: keyof typeof FEATURE_FLAGS) => boolean;

  // Validation
  isConfigValid: boolean;
  validateConfig: () => boolean;

  // Getters for specific values
  getAnimationDuration: (type?: "fast" | "normal" | "slow") => number;
  getPaginationSize: (section: "orders" | "downloads" | "activity") => number;
  getCacheTimeout: (type: keyof typeof PERFORMANCE_CONFIG.cache.ttl) => number;
  getApiEndpoint: (endpoint: keyof typeof API_CONFIG.endpoints) => string;
}

export function useDashboardConfig(): DashboardConfigHook {
  // Memoize the main configuration
  const config = useMemo(() => getDashboardConfig(), []);

  // Memoize validation result
  const isConfigValid = useMemo(() => validateConfig().isValid, []);

  // Validation function wrapper for backward compatibility
  const validateConfigLegacy = useCallback(() => validateConfig().isValid, []);

  // Feature flag checker
  const checkFeatureEnabled = useCallback((feature: keyof typeof FEATURE_FLAGS) => {
    return isFeatureEnabled(feature);
  }, []);

  // Animation duration getter
  const getAnimationDuration = useCallback((type: "fast" | "normal" | "slow" = "normal") => {
    switch (type) {
      case "fast":
        return UI_CONFIG.animations.fast;
      case "slow":
        return UI_CONFIG.animations.slow;
      default:
        return UI_CONFIG.animations.normal;
    }
  }, []);

  // Pagination size getter
  const getPaginationSize = useCallback(
    (section: "orders" | "downloads" | "activity") => {
      switch (section) {
        case "orders":
          return config.pagination.ordersPerPage;
        case "downloads":
          return config.pagination.downloadsPerPage;
        case "activity":
          return config.pagination.activityPerPage;
        default:
          return PAGINATION_CONFIG.ordersPerPage;
      }
    },
    [config.pagination]
  );

  // Cache timeout getter
  const getCacheTimeout = useCallback((type: keyof typeof PERFORMANCE_CONFIG.cache.ttl) => {
    return PERFORMANCE_CONFIG.cache.ttl[type];
  }, []);

  // API endpoint getter
  const getApiEndpoint = useCallback((endpoint: keyof typeof API_CONFIG.endpoints) => {
    const baseUrl = API_CONFIG.baseUrl;
    const path = API_CONFIG.endpoints[endpoint];
    return `${baseUrl}${path}`;
  }, []);

  return {
    // Main configuration
    config,

    // Individual sections
    ui: UI_CONFIG,
    pagination: PAGINATION_CONFIG,
    performance: PERFORMANCE_CONFIG,
    api: API_CONFIG,
    currency: CURRENCY_CONFIG,
    error: ERROR_CONFIG,
    dev: DEV_CONFIG,

    // Feature flags
    features: FEATURE_FLAGS,
    isFeatureEnabled: checkFeatureEnabled,

    // Validation
    isConfigValid,
    validateConfig: validateConfigLegacy,

    // Getters
    getAnimationDuration,
    getPaginationSize,
    getCacheTimeout,
    getApiEndpoint,
  };
}

// Specialized hooks for specific configuration sections
export function useUIConfig() {
  const { ui, getAnimationDuration } = useDashboardConfig();
  return { ...ui, getAnimationDuration };
}

export function usePaginationConfig() {
  const { pagination, getPaginationSize } = useDashboardConfig();
  return { ...pagination, getPaginationSize };
}

export function usePerformanceConfig() {
  const { performance, getCacheTimeout } = useDashboardConfig();
  return { ...performance, getCacheTimeout };
}

export function useFeatureFlags() {
  const { features, isFeatureEnabled } = useDashboardConfig();
  return { features, isFeatureEnabled };
}

export function useCurrencyConfig() {
  const { currency } = useDashboardConfig();
  return currency;
}

export function useApiConfig() {
  const { api, getApiEndpoint } = useDashboardConfig();
  return { ...api, getApiEndpoint };
}

export function useErrorConfig() {
  const { error } = useDashboardConfig();
  return error;
}

export function useDevConfig() {
  const { dev } = useDashboardConfig();
  return dev;
}
