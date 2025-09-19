/**
 * Dashboard Configuration Management Hook
 *
 * Provides centralized configuration management for dashboard settings,
 * including UI parameters, pagination, performance settings, and feature flags.
 *
 * Requirements addressed:
 * - 6.1: Centralized configuration files
 * - 6.2: Environment-based feature flags
 * - 6.3: Consistent URL management
 * - 6.4: Configurable animation and display options
 */

import type { DashboardConfig } from "@shared/types/dashboard";
import { useMemo } from "react";

// Environment-based feature flags
const getFeatureFlags = () => {
  const isDevelopment = import.meta.env.DEV;
  const isProduction = import.meta.env.PROD;

  return {
    realtimeUpdates: import.meta.env.VITE_ENABLE_REALTIME !== "false",
    analyticsCharts: import.meta.env.VITE_ENABLE_ANALYTICS !== "false",
    advancedFilters: import.meta.env.VITE_ENABLE_ADVANCED_FILTERS !== "false",
    debugMode: isDevelopment,
    performanceMonitoring: isProduction,
  };
};

// Default configuration values
const DEFAULT_CONFIG: DashboardConfig = {
  ui: {
    animationDuration: 200,
    skeletonItems: 5,
    maxActivityItems: 50,
  },
  pagination: {
    ordersPerPage: 20,
    downloadsPerPage: 50,
    activityPerPage: 20,
  },
  realtime: {
    reconnectInterval: 5000,
    maxRetries: 3,
    heartbeatInterval: 30000,
  },
  features: getFeatureFlags(),
};

// Performance-based configuration adjustments
const getPerformanceConfig = (): Partial<DashboardConfig> => {
  // Check if user prefers reduced motion
  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Check connection type for performance adjustments
  const connection =
    (navigator as any).connection ||
    (navigator as any).mozConnection ||
    (navigator as any).webkitConnection;
  const isSlowConnection =
    connection && (connection.effectiveType === "slow-2g" || connection.effectiveType === "2g");

  return {
    ui: {
      animationDuration: prefersReducedMotion
        ? 0
        : isSlowConnection
          ? 100
          : DEFAULT_CONFIG.ui.animationDuration,
      skeletonItems: isSlowConnection ? 3 : DEFAULT_CONFIG.ui.skeletonItems,
      maxActivityItems: isSlowConnection ? 25 : DEFAULT_CONFIG.ui.maxActivityItems,
    },
    pagination: {
      ordersPerPage: isSlowConnection ? 10 : DEFAULT_CONFIG.pagination.ordersPerPage,
      downloadsPerPage: isSlowConnection ? 25 : DEFAULT_CONFIG.pagination.downloadsPerPage,
      activityPerPage: isSlowConnection ? 10 : DEFAULT_CONFIG.pagination.activityPerPage,
    },
    realtime: {
      reconnectInterval: isSlowConnection ? 10000 : DEFAULT_CONFIG.realtime.reconnectInterval,
      maxRetries: isSlowConnection ? 2 : DEFAULT_CONFIG.realtime.maxRetries,
      heartbeatInterval: isSlowConnection ? 60000 : DEFAULT_CONFIG.realtime.heartbeatInterval,
    },
  };
};

// Currency configuration
export const getCurrencyConfig = () => {
  return {
    baseCurrency: "USD",
    symbol: "$",
    decimalPlaces: 2,
    thousandsSeparator: ",",
    decimalSeparator: ".",
    symbolPosition: "before", // "before" | "after"
  };
};

// API endpoint configuration
export const getApiConfig = () => {
  const baseUrl = import.meta.env.VITE_API_BASE_URL || "";

  return {
    convex: {
      url: import.meta.env.VITE_CONVEX_URL || "",
      timeout: 10000,
    },
    wordpress: {
      baseUrl: import.meta.env.VITE_WORDPRESS_API_URL || "",
      timeout: 15000,
    },
    stripe: {
      publishableKey: import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || "",
    },
    clerk: {
      publishableKey: import.meta.env.VITE_CLERK_PUBLISHABLE_KEY || "",
    },
  };
};

// Cache configuration
export const getCacheConfig = () => {
  return {
    defaultStaleTime: 5 * 60 * 1000, // 5 minutes
    defaultCacheTime: 10 * 60 * 1000, // 10 minutes
    dashboardStaleTime: 2 * 60 * 1000, // 2 minutes for dashboard data
    statsStaleTime: 1 * 60 * 1000, // 1 minute for stats
    maxRetries: 3,
    retryDelay: (attemptIndex: number) => Math.min(1000 * 2 ** attemptIndex, 30000),
  };
};

/**
 * Dashboard Configuration Hook
 *
 * Provides access to all dashboard configuration settings with automatic
 * performance adjustments and environment-based feature flags.
 */
export function useDashboardConfig(): DashboardConfig & {
  currency: ReturnType<typeof getCurrencyConfig>;
  api: ReturnType<typeof getApiConfig>;
  cache: ReturnType<typeof getCacheConfig>;
} {
  const config = useMemo(() => {
    const performanceConfig = getPerformanceConfig();

    // Deep merge default config with performance adjustments
    const mergedConfig: DashboardConfig = {
      ui: {
        ...DEFAULT_CONFIG.ui,
        ...performanceConfig.ui,
      },
      pagination: {
        ...DEFAULT_CONFIG.pagination,
        ...performanceConfig.pagination,
      },
      realtime: {
        ...DEFAULT_CONFIG.realtime,
        ...performanceConfig.realtime,
      },
      features: {
        ...DEFAULT_CONFIG.features,
        // Disable realtime on slow connections
        realtimeUpdates: DEFAULT_CONFIG.features.realtimeUpdates && !performanceConfig.realtime,
      },
    };

    return {
      ...mergedConfig,
      currency: getCurrencyConfig(),
      api: getApiConfig(),
      cache: getCacheConfig(),
    };
  }, []);

  return config;
}

// Utility hook for feature flags only
export function useFeatureFlags() {
  return useMemo(() => getFeatureFlags(), []);
}

// Utility hook for currency formatting
export function useCurrencyFormatter() {
  const { currency } = useDashboardConfig();

  return useMemo(
    () => ({
      format: (amount: number, options?: { showSymbol?: boolean; precision?: number }) => {
        const { showSymbol = true, precision = currency.decimalPlaces } = options || {};

        const formatted = amount.toFixed(precision);
        const [integer, decimal] = formatted.split(".");

        // Add thousands separators
        const formattedInteger = integer.replace(
          /\B(?=(\d{3})+(?!\d))/g,
          currency.thousandsSeparator
        );

        const finalAmount = decimal
          ? `${formattedInteger}${currency.decimalSeparator}${decimal}`
          : formattedInteger;

        if (!showSymbol) return finalAmount;

        return currency.symbolPosition === "before"
          ? `${currency.symbol}${finalAmount}`
          : `${finalAmount}${currency.symbol}`;
      },

      parse: (formatted: string): number => {
        // Remove currency symbol and separators
        const cleaned = formatted
          .replace(currency.symbol, "")
          .replace(new RegExp(`\\${currency.thousandsSeparator}`, "g"), "")
          .replace(currency.decimalSeparator, ".");

        return parseFloat(cleaned) || 0;
      },

      convertFromCents: (cents: number): number => {
        return cents / 100;
      },

      convertToCents: (dollars: number): number => {
        return Math.round(dollars * 100);
      },

      getSymbol: () => currency.symbol,

      getCurrency: () => currency.baseCurrency,
    }),
    [currency]
  );
}

// Export configuration types
export type { DashboardConfig };
