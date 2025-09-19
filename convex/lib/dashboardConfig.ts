/**
 * Dashboard Configuration Management
 * Centralized configuration for dashboard settings and feature flags
 */

import { v } from "convex/values";
import type { DashboardConfig } from "../../shared/types/dashboard";
import { query } from "../_generated/server";

/**
 * Default dashboard configuration
 */
const DEFAULT_CONFIG: DashboardConfig = {
  ui: {
    animationDuration: 300,
    skeletonItems: 5,
    maxActivityItems: 20,
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
  features: {
    realtimeUpdates: true,
    analyticsCharts: true,
    advancedFilters: true,
  },
};

/**
 * Environment-based configuration overrides
 */
function getEnvironmentConfig(): Partial<DashboardConfig> {
  const env = process.env.NODE_ENV || "development";

  switch (env) {
    case "production":
      return {
        ui: {
          animationDuration: 200, // Faster animations in production
          skeletonItems: DEFAULT_CONFIG.ui.skeletonItems,
          maxActivityItems: DEFAULT_CONFIG.ui.maxActivityItems,
        },
        realtime: {
          reconnectInterval: 3000, // More aggressive reconnection
          maxRetries: 5,
          heartbeatInterval: DEFAULT_CONFIG.realtime.heartbeatInterval,
        },
      };

    case "development":
      return {
        ui: {
          animationDuration: 500, // Slower animations for debugging
          skeletonItems: DEFAULT_CONFIG.ui.skeletonItems,
          maxActivityItems: DEFAULT_CONFIG.ui.maxActivityItems,
        },
        features: {
          realtimeUpdates: false, // Disable realtime in development
          analyticsCharts: DEFAULT_CONFIG.features.analyticsCharts,
          advancedFilters: DEFAULT_CONFIG.features.advancedFilters,
        },
      };

    case "test":
      return {
        ui: {
          animationDuration: 0, // No animations in tests
          skeletonItems: DEFAULT_CONFIG.ui.skeletonItems,
          maxActivityItems: DEFAULT_CONFIG.ui.maxActivityItems,
        },
        features: {
          realtimeUpdates: false,
          analyticsCharts: false,
          advancedFilters: false,
        },
      };

    default:
      return {};
  }
}

/**
 * Get dashboard configuration with environment overrides
 */
export const getDashboardConfig = query({
  args: {},
  handler: async (ctx): Promise<DashboardConfig> => {
    const envConfig = getEnvironmentConfig();

    // Merge default config with environment-specific overrides
    return {
      ui: {
        ...DEFAULT_CONFIG.ui,
        ...envConfig.ui,
      },
      pagination: {
        ...DEFAULT_CONFIG.pagination,
        ...envConfig.pagination,
      },
      realtime: {
        ...DEFAULT_CONFIG.realtime,
        ...envConfig.realtime,
      },
      features: {
        ...DEFAULT_CONFIG.features,
        ...envConfig.features,
      },
    };
  },
});

/**
 * Get user-specific configuration overrides
 */
export const getUserDashboardConfig = query({
  args: {},
  handler: async (ctx): Promise<DashboardConfig> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      const envConfig = getEnvironmentConfig();
      return {
        ui: { ...DEFAULT_CONFIG.ui, ...envConfig.ui },
        pagination: { ...DEFAULT_CONFIG.pagination, ...envConfig.pagination },
        realtime: { ...DEFAULT_CONFIG.realtime, ...envConfig.realtime },
        features: { ...DEFAULT_CONFIG.features, ...envConfig.features },
      };
    }

    // Get user preferences
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", q => q.eq("clerkId", identity.subject))
      .first();

    const envConfig = getEnvironmentConfig();
    const baseConfig = {
      ui: { ...DEFAULT_CONFIG.ui, ...envConfig.ui },
      pagination: { ...DEFAULT_CONFIG.pagination, ...envConfig.pagination },
      realtime: { ...DEFAULT_CONFIG.realtime, ...envConfig.realtime },
      features: { ...DEFAULT_CONFIG.features, ...envConfig.features },
    };

    if (!user?.preferences) {
      return baseConfig;
    }

    // Apply user-specific overrides
    const userOverrides: Partial<DashboardConfig> = {};

    // Theme-based animation adjustments
    if (user.preferences.theme === "dark") {
      userOverrides.ui = {
        ...baseConfig.ui,
        animationDuration: baseConfig.ui.animationDuration * 0.8, // Slightly faster for dark theme
      };
    }

    // Audio preferences affecting UI
    if (user.preferences.audio?.autoplay === false) {
      userOverrides.features = {
        ...baseConfig.features,
        realtimeUpdates: false, // Disable realtime if user prefers manual control
      };
    }

    // Privacy preferences
    if (user.preferences.privacy?.allowAnalytics === false) {
      userOverrides.features = {
        ...baseConfig.features,
        analyticsCharts: false,
      };
    }

    return {
      ui: {
        ...baseConfig.ui,
        ...userOverrides.ui,
      },
      pagination: {
        ...baseConfig.pagination,
        ...userOverrides.pagination,
      },
      realtime: {
        ...baseConfig.realtime,
        ...userOverrides.realtime,
      },
      features: {
        ...baseConfig.features,
        ...userOverrides.features,
      },
    };
  },
});

/**
 * Feature flag utilities
 */
export const isFeatureEnabled = query({
  args: {
    feature: v.union(
      v.literal("realtimeUpdates"),
      v.literal("analyticsCharts"),
      v.literal("advancedFilters")
    ),
  },
  handler: async (ctx, { feature }): Promise<boolean> => {
    // Get user config inline to avoid circular calls
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      const envConfig = getEnvironmentConfig();
      const config = {
        ui: { ...DEFAULT_CONFIG.ui, ...envConfig.ui },
        pagination: { ...DEFAULT_CONFIG.pagination, ...envConfig.pagination },
        realtime: { ...DEFAULT_CONFIG.realtime, ...envConfig.realtime },
        features: { ...DEFAULT_CONFIG.features, ...envConfig.features },
      };
      return config.features[feature];
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", q => q.eq("clerkId", identity.subject))
      .first();

    const envConfig = getEnvironmentConfig();
    const config = {
      ui: { ...DEFAULT_CONFIG.ui, ...envConfig.ui },
      pagination: { ...DEFAULT_CONFIG.pagination, ...envConfig.pagination },
      realtime: { ...DEFAULT_CONFIG.realtime, ...envConfig.realtime },
      features: { ...DEFAULT_CONFIG.features, ...envConfig.features },
    };
    return config.features[feature];
  },
});

/**
 * Performance configuration based on user's device/connection
 */
export const getPerformanceConfig = query({
  args: {
    deviceType: v.optional(v.union(v.literal("desktop"), v.literal("mobile"), v.literal("tablet"))),
    connectionSpeed: v.optional(
      v.union(v.literal("slow"), v.literal("fast"), v.literal("unknown"))
    ),
  },
  handler: async (ctx, { deviceType, connectionSpeed }): Promise<Partial<DashboardConfig>> => {
    // Get base config inline
    const identity = await ctx.auth.getUserIdentity();
    const envConfig = getEnvironmentConfig();
    const baseConfig = {
      ui: { ...DEFAULT_CONFIG.ui, ...envConfig.ui },
      pagination: { ...DEFAULT_CONFIG.pagination, ...envConfig.pagination },
      realtime: { ...DEFAULT_CONFIG.realtime, ...envConfig.realtime },
      features: { ...DEFAULT_CONFIG.features, ...envConfig.features },
    };

    const performanceOverrides: Partial<DashboardConfig> = {};

    // Mobile optimizations
    if (deviceType === "mobile") {
      performanceOverrides.ui = {
        ...baseConfig.ui,
        animationDuration: Math.max(baseConfig.ui.animationDuration * 0.5, 100),
        maxActivityItems: Math.min(baseConfig.ui.maxActivityItems, 10),
      };

      performanceOverrides.pagination = {
        ...baseConfig.pagination,
        ordersPerPage: Math.min(baseConfig.pagination.ordersPerPage, 10),
        downloadsPerPage: Math.min(baseConfig.pagination.downloadsPerPage, 20),
      };
    }

    // Slow connection optimizations
    if (connectionSpeed === "slow") {
      performanceOverrides.features = {
        ...baseConfig.features,
        realtimeUpdates: false,
        analyticsCharts: false,
      };

      performanceOverrides.realtime = {
        ...baseConfig.realtime,
        reconnectInterval: baseConfig.realtime.reconnectInterval * 2,
        heartbeatInterval: baseConfig.realtime.heartbeatInterval * 2,
      };
    }

    return {
      ui: {
        ...baseConfig.ui,
        ...performanceOverrides.ui,
      },
      pagination: {
        ...baseConfig.pagination,
        ...performanceOverrides.pagination,
      },
      realtime: {
        ...baseConfig.realtime,
        ...performanceOverrides.realtime,
      },
      features: {
        ...baseConfig.features,
        ...performanceOverrides.features,
      },
    };
  },
});

/**
 * Currency formatting configuration
 */
export const getCurrencyConfig = query({
  args: {},
  handler: async ctx => {
    const identity = await ctx.auth.getUserIdentity();

    // Default to USD
    let currency = "USD";
    let locale = "en-US";

    if (identity) {
      const user = await ctx.db
        .query("users")
        .withIndex("by_clerk_id", q => q.eq("clerkId", identity.subject))
        .first();

      if (user?.preferences?.language) {
        // Map language to locale and currency
        const languageMap: Record<string, { locale: string; currency: string }> = {
          en: { locale: "en-US", currency: "USD" },
          fr: { locale: "fr-FR", currency: "EUR" },
          es: { locale: "es-ES", currency: "EUR" },
          de: { locale: "de-DE", currency: "EUR" },
          it: { locale: "it-IT", currency: "EUR" },
          pt: { locale: "pt-BR", currency: "BRL" },
        };

        const config = languageMap[user.preferences.language] || languageMap["en"];
        locale = config.locale;
        // Always use USD as base currency per requirements
        currency = "USD";
      }
    }

    return {
      currency,
      locale,
      symbol: "$", // Always use dollar symbol
      decimalPlaces: 2,
      thousandsSeparator: ",",
      decimalSeparator: ".",
    };
  },
});
