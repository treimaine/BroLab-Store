/**
 * Dashboard Configuration Management System
 * Centralized configuration for UI settings, pagination, performance parameters,
 * and environment-based feature flags
 */

import type { DashboardConfig } from "@shared/types/dashboard";

// Environment-based feature flags
export const FEATURE_FLAGS = {
  realtimeUpdates: import.meta.env.VITE_FEATURE_REALTIME_UPDATES !== "false",
  analyticsCharts: import.meta.env.VITE_FEATURE_ANALYTICS_CHARTS !== "false",
  advancedFilters: import.meta.env.VITE_FEATURE_ADVANCED_FILTERS !== "false",
  performanceMonitoring: import.meta.env.VITE_FEATURE_PERFORMANCE_MONITORING !== "false",
  errorTracking: import.meta.env.VITE_FEATURE_ERROR_TRACKING !== "false",
  offlineSupport: import.meta.env.VITE_FEATURE_OFFLINE_SUPPORT !== "false",
} as const;

// UI Configuration
export const UI_CONFIG = {
  // Animation durations (in milliseconds)
  animations: {
    fast: 150,
    normal: 300,
    slow: 500,
    skeleton: 1200,
    transition: 200,
    hover: 100,
  },

  // Loading states
  loading: {
    skeletonItems: 6,
    maxActivityItems: 20,
    debounceDelay: 300,
    retryDelay: 1000,
  },

  // Layout settings
  layout: {
    sidebarWidth: 280,
    headerHeight: 64,
    footerHeight: 48,
    contentPadding: 24,
    cardSpacing: 16,
  },

  // Responsive breakpoints
  breakpoints: {
    mobile: 768,
    tablet: 1024,
    desktop: 1280,
    wide: 1536,
  },
} as const;

// Pagination Configuration
export const PAGINATION_CONFIG = {
  // Items per page for different sections
  ordersPerPage: 10,
  downloadsPerPage: 15,
  activityPerPage: 20,
  favoritesPerPage: 12,
  reservationsPerPage: 8,

  // Pagination UI settings
  maxVisiblePages: 5,
  showSizeSelector: true,
  availableSizes: [5, 10, 15, 20, 25, 50] as const,

  // Infinite scroll settings
  infiniteScroll: {
    threshold: 0.8, // Load more when 80% scrolled
    batchSize: 10,
    maxItems: 1000,
  },
} as const;

// Performance Configuration
export const PERFORMANCE_CONFIG = {
  // Cache settings
  cache: {
    ttl: {
      userStats: 5 * 60 * 1000, // 5 minutes
      favorites: 10 * 60 * 1000, // 10 minutes
      orders: 15 * 60 * 1000, // 15 minutes
      downloads: 30 * 60 * 1000, // 30 minutes
      activity: 2 * 60 * 1000, // 2 minutes
      chartData: 60 * 60 * 1000, // 1 hour
    },
    maxSize: 100, // Maximum number of cached items
    cleanupInterval: 10 * 60 * 1000, // Cleanup every 10 minutes
  },

  // Request limits and timeouts
  requests: {
    timeout: 10000, // 10 seconds
    retries: 3,
    retryDelay: 1000, // 1 second
    maxConcurrent: 5,
    rateLimitWindow: 60 * 1000, // 1 minute
    rateLimitMax: 100, // Max requests per window
  },

  // Real-time connection settings
  realtime: {
    reconnectInterval: 5000, // 5 seconds
    maxRetries: 10,
    heartbeatInterval: 30000, // 30 seconds
    connectionTimeout: 15000, // 15 seconds
    backoffMultiplier: 1.5,
    maxBackoffDelay: 30000, // 30 seconds
  },

  // Virtual scrolling settings
  virtualScroll: {
    itemHeight: 80,
    overscan: 5,
    threshold: 100, // Enable virtual scrolling for lists > 100 items
  },
} as const;

// API Configuration
export const API_CONFIG = {
  // Base URLs
  baseUrl: import.meta.env.VITE_API_BASE_URL || "/api",
  convexUrl: import.meta.env.VITE_CONVEX_URL,

  // Endpoints
  endpoints: {
    dashboard: "/dashboard",
    stats: "/dashboard/stats",
    activity: "/dashboard/activity",
    favorites: "/favorites",
    orders: "/orders",
    downloads: "/downloads",
    reservations: "/reservations",
    analytics: "/analytics",
  },

  // Request configuration
  defaultHeaders: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
} as const;

// Currency Configuration
export const CURRENCY_CONFIG = {
  // Base currency (always dollars)
  baseCurrency: "USD" as const,

  // Formatting options
  formatting: {
    locale: "en-US",
    style: "currency" as const,
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  },

  // Conversion settings
  conversion: {
    centsPerDollar: 100,
    roundingMode: "round" as const, // 'round' | 'floor' | 'ceil'
  },

  // Display settings
  display: {
    showSymbol: true,
    showCode: false,
    compactThreshold: 1000000, // Use compact notation for amounts >= 1M
  },
} as const;

// Error Handling Configuration
export const ERROR_CONFIG = {
  // Error types and their retry settings
  retryableErrors: ["network_error", "timeout_error", "server_error", "rate_limit_error"] as const,

  // Error display settings
  display: {
    showStackTrace: import.meta.env.NODE_ENV === "development",
    autoHideDelay: 5000, // Auto-hide error messages after 5 seconds
    maxErrorsShown: 3, // Maximum number of errors to show simultaneously
  },

  // Error reporting
  reporting: {
    enabled: FEATURE_FLAGS.errorTracking,
    sampleRate: 0.1, // Report 10% of errors
    includeUserContext: true,
    includeBreadcrumbs: true,
  },
} as const;

// Development Configuration
export const DEV_CONFIG = {
  // Debug settings
  debug: {
    enabled: import.meta.env.NODE_ENV === "development",
    logLevel: import.meta.env.VITE_LOG_LEVEL || "info",
    showPerformanceMetrics: import.meta.env.VITE_SHOW_PERFORMANCE === "true",
    mockData: import.meta.env.VITE_USE_MOCK_DATA === "true",
  },

  // Development tools
  tools: {
    reactDevTools: import.meta.env.NODE_ENV === "development",
    reduxDevTools: import.meta.env.NODE_ENV === "development",
    performanceProfiler: import.meta.env.VITE_PERFORMANCE_PROFILER === "true",
  },
} as const;

// Main Dashboard Configuration
export const DASHBOARD_CONFIG: DashboardConfig = {
  ui: {
    animationDuration: getEnvNumber(
      "VITE_ANIMATION_DURATION",
      UI_CONFIG.animations.normal,
      0,
      2000
    ),
    skeletonItems: getEnvNumber("VITE_SKELETON_ITEMS", UI_CONFIG.loading.skeletonItems, 1, 20),
    maxActivityItems: getEnvNumber(
      "VITE_MAX_ACTIVITY_ITEMS",
      UI_CONFIG.loading.maxActivityItems,
      5,
      100
    ),
  },
  pagination: {
    ordersPerPage: getEnvNumber("VITE_ORDERS_PER_PAGE", PAGINATION_CONFIG.ordersPerPage, 1, 100),
    downloadsPerPage: getEnvNumber(
      "VITE_DOWNLOADS_PER_PAGE",
      PAGINATION_CONFIG.downloadsPerPage,
      1,
      100
    ),
    activityPerPage: getEnvNumber(
      "VITE_ACTIVITY_PER_PAGE",
      PAGINATION_CONFIG.activityPerPage,
      1,
      50
    ),
  },
  realtime: {
    reconnectInterval: getEnvNumber(
      "VITE_REALTIME_RECONNECT_INTERVAL",
      PERFORMANCE_CONFIG.realtime.reconnectInterval,
      1000,
      60000
    ),
    maxRetries: getEnvNumber(
      "VITE_REALTIME_MAX_RETRIES",
      PERFORMANCE_CONFIG.realtime.maxRetries,
      1,
      50
    ),
    heartbeatInterval: getEnvNumber(
      "VITE_REALTIME_HEARTBEAT_INTERVAL",
      PERFORMANCE_CONFIG.realtime.heartbeatInterval,
      5000,
      300000
    ),
  },
  features: {
    realtimeUpdates: getEnvBoolean("VITE_FEATURE_REALTIME_UPDATES", FEATURE_FLAGS.realtimeUpdates),
    analyticsCharts: getEnvBoolean("VITE_FEATURE_ANALYTICS_CHARTS", FEATURE_FLAGS.analyticsCharts),
    advancedFilters: getEnvBoolean("VITE_FEATURE_ADVANCED_FILTERS", FEATURE_FLAGS.advancedFilters),
  },
};

// Helper functions for environment variable parsing with validation
function getEnvNumber(key: string, defaultValue: number, min?: number, max?: number): number {
  const value = import.meta.env[key];
  if (!value) return defaultValue;

  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed)) {
    console.warn(`Invalid number format for ${key}: "${value}". Using default: ${defaultValue}`);
    return defaultValue;
  }

  if (min !== undefined && parsed < min) {
    console.warn(`Value for ${key} (${parsed}) is below minimum (${min}). Using minimum value.`);
    return min;
  }

  if (max !== undefined && parsed > max) {
    console.warn(`Value for ${key} (${parsed}) is above maximum (${max}). Using maximum value.`);
    return max;
  }

  return parsed;
}

function getEnvBoolean(key: string, defaultValue: boolean): boolean {
  const value = import.meta.env[key];
  if (!value) return defaultValue;

  const lowerValue = value.toLowerCase();
  if (lowerValue !== "true" && lowerValue !== "false") {
    console.warn(
      `Invalid boolean format for ${key}: "${value}". Expected "true" or "false". Using default: ${defaultValue}`
    );
    return defaultValue;
  }

  return lowerValue === "true";
}

// Validate individual configuration sections
export function validateUIConfig(config: DashboardConfig["ui"]): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (config.animationDuration < 0 || config.animationDuration > 2000) {
    errors.push(`Animation duration must be between 0-2000ms, got: ${config.animationDuration}ms`);
  }

  if (config.skeletonItems < 1 || config.skeletonItems > 20) {
    errors.push(`Skeleton items must be between 1-20, got: ${config.skeletonItems}`);
  }

  if (config.maxActivityItems < 5 || config.maxActivityItems > 100) {
    errors.push(`Max activity items must be between 5-100, got: ${config.maxActivityItems}`);
  }

  return { isValid: errors.length === 0, errors };
}

export function validatePaginationConfig(config: DashboardConfig["pagination"]): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (config.ordersPerPage < 1 || config.ordersPerPage > 100) {
    errors.push(`Orders per page must be between 1-100, got: ${config.ordersPerPage}`);
  }

  if (config.downloadsPerPage < 1 || config.downloadsPerPage > 100) {
    errors.push(`Downloads per page must be between 1-100, got: ${config.downloadsPerPage}`);
  }

  if (config.activityPerPage < 1 || config.activityPerPage > 50) {
    errors.push(`Activity per page must be between 1-50, got: ${config.activityPerPage}`);
  }

  return { isValid: errors.length === 0, errors };
}

export function validateRealtimeConfig(config: DashboardConfig["realtime"]): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (config.reconnectInterval < 1000 || config.reconnectInterval > 60000) {
    errors.push(
      `Reconnect interval must be between 1000-60000ms, got: ${config.reconnectInterval}ms`
    );
  }

  if (config.maxRetries < 1 || config.maxRetries > 50) {
    errors.push(`Max retries must be between 1-50, got: ${config.maxRetries}`);
  }

  if (config.heartbeatInterval < 5000 || config.heartbeatInterval > 300000) {
    errors.push(
      `Heartbeat interval must be between 5000-300000ms, got: ${config.heartbeatInterval}ms`
    );
  }

  return { isValid: errors.length === 0, errors };
}

// Configuration getters with environment overrides and validation
export function getDashboardConfig(): DashboardConfig {
  // Return the pre-configured dashboard config which already includes environment variable validation
  return { ...DASHBOARD_CONFIG };
}

// Feature flag checker
export function isFeatureEnabled(feature: keyof typeof FEATURE_FLAGS): boolean {
  return FEATURE_FLAGS[feature];
}

// Configuration validation result interface
interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

// Helper: Validate required environment variables
function validateRequiredEnvVars(): string[] {
  const errors: string[] = [];
  const requiredEnvVars = [
    { key: "VITE_CONVEX_URL", description: "Convex database URL for real-time functionality" },
  ];

  for (const { key, description } of requiredEnvVars) {
    const value = import.meta.env[key];
    if (!value) {
      errors.push(`Missing required environment variable: ${key} - ${description}`);
    } else if (key === "VITE_CONVEX_URL" && !value.startsWith("https://")) {
      errors.push(`Invalid ${key}: Must be a valid HTTPS URL, got: ${value}`);
    }
  }

  return errors;
}

// Helper: Validate optional environment variables
function validateOptionalEnvVars(): string[] {
  const warnings: string[] = [];
  const optionalEnvVars = [
    { key: "VITE_API_BASE_URL", description: "API base URL for backend communication" },
    { key: "VITE_LOG_LEVEL", description: "Logging level for development" },
  ];

  for (const { key, description } of optionalEnvVars) {
    const value = import.meta.env[key];
    if (!value && import.meta.env.NODE_ENV === "development") {
      warnings.push(`Optional environment variable not set: ${key} - ${description}`);
    }
  }

  return warnings;
}

// Helper: Validate UI configuration with detailed errors and warnings
function validateUIConfigDetailed(config: DashboardConfig["ui"]): {
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (config.animationDuration < 0 || config.animationDuration > 2000) {
    errors.push(
      `Invalid animation duration: ${config.animationDuration}ms. Must be between 0-2000ms for optimal user experience.`
    );
  } else if (config.animationDuration > 1000) {
    warnings.push(
      `Animation duration is quite long: ${config.animationDuration}ms. Consider values under 500ms for better perceived performance.`
    );
  }

  if (config.skeletonItems < 1 || config.skeletonItems > 20) {
    errors.push(
      `Invalid skeleton items count: ${config.skeletonItems}. Must be between 1-20 items.`
    );
  }

  if (config.maxActivityItems < 5 || config.maxActivityItems > 100) {
    errors.push(
      `Invalid max activity items: ${config.maxActivityItems}. Must be between 5-100 items for performance reasons.`
    );
  }

  return { errors, warnings };
}

// Helper: Validate pagination configuration with detailed errors and warnings
function validatePaginationConfigDetailed(config: DashboardConfig["pagination"]): {
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (config.ordersPerPage < 1 || config.ordersPerPage > 100) {
    errors.push(
      `Invalid orders per page: ${config.ordersPerPage}. Must be between 1-100 for optimal loading performance.`
    );
  } else if (config.ordersPerPage > 50) {
    warnings.push(
      `Large orders per page setting (${config.ordersPerPage}) may impact loading performance. Consider values under 25.`
    );
  }

  if (config.downloadsPerPage < 1 || config.downloadsPerPage > 100) {
    errors.push(
      `Invalid downloads per page: ${config.downloadsPerPage}. Must be between 1-100 for optimal loading performance.`
    );
  }

  if (config.activityPerPage < 1 || config.activityPerPage > 50) {
    errors.push(
      `Invalid activity per page: ${config.activityPerPage}. Must be between 1-50 for real-time performance.`
    );
  }

  return { errors, warnings };
}

// Helper: Validate realtime configuration with detailed errors and warnings
function validateRealtimeConfigDetailed(config: DashboardConfig["realtime"]): {
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (config.reconnectInterval < 1000 || config.reconnectInterval > 60000) {
    errors.push(
      `Invalid reconnect interval: ${config.reconnectInterval}ms. Must be between 1000-60000ms (1-60 seconds).`
    );
  } else if (config.reconnectInterval < 3000) {
    warnings.push(
      `Short reconnect interval (${config.reconnectInterval}ms) may cause excessive server load. Consider 5000ms or higher.`
    );
  }

  if (config.maxRetries < 1 || config.maxRetries > 50) {
    errors.push(`Invalid max retries: ${config.maxRetries}. Must be between 1-50 attempts.`);
  }

  if (config.heartbeatInterval < 5000 || config.heartbeatInterval > 300000) {
    errors.push(
      `Invalid heartbeat interval: ${config.heartbeatInterval}ms. Must be between 5000-300000ms (5 seconds - 5 minutes).`
    );
  }

  return { errors, warnings };
}

// Helper: Log validation results
function logValidationResults(errors: string[], warnings: string[]): void {
  if (errors.length > 0) {
    console.error("Configuration validation errors:", errors);
  }

  if (warnings.length > 0) {
    console.warn("Configuration validation warnings:", warnings);
  }

  if (errors.length === 0 && warnings.length === 0) {
    console.info("Configuration validation passed successfully");
  }
}

// Configuration validator with detailed error reporting
export function validateConfig(): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  try {
    // Validate environment variables
    errors.push(...validateRequiredEnvVars());
    warnings.push(...validateOptionalEnvVars());

    // Validate configuration sections
    const config = getDashboardConfig();

    const uiValidation = validateUIConfigDetailed(config.ui);
    errors.push(...uiValidation.errors);
    warnings.push(...uiValidation.warnings);

    const paginationValidation = validatePaginationConfigDetailed(config.pagination);
    errors.push(...paginationValidation.errors);
    warnings.push(...paginationValidation.warnings);

    const realtimeValidation = validateRealtimeConfigDetailed(config.realtime);
    errors.push(...realtimeValidation.errors);
    warnings.push(...realtimeValidation.warnings);

    logValidationResults(errors, warnings);

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  } catch (error) {
    const errorMessage = `Configuration validation failed with exception: ${error instanceof Error ? error.message : String(error)}`;
    console.error(errorMessage);
    return {
      isValid: false,
      errors: [errorMessage],
      warnings,
    };
  }
}

// Legacy boolean validator for backward compatibility
export function validateConfigLegacy(): boolean {
  const result = validateConfig();
  return result.isValid;
}

// Comprehensive configuration health check
export function performConfigHealthCheck(): {
  isHealthy: boolean;
  summary: string;
  details: {
    environment: { isValid: boolean; errors: string[]; warnings: string[] };
    ui: { isValid: boolean; errors: string[] };
    pagination: { isValid: boolean; errors: string[] };
    realtime: { isValid: boolean; errors: string[] };
  };
} {
  const config = getDashboardConfig();

  // Check environment variables
  const envErrors: string[] = [];
  const envWarnings: string[] = [];

  if (!import.meta.env.VITE_CONVEX_URL) {
    envErrors.push("VITE_CONVEX_URL is required for database connectivity");
  }

  if (!import.meta.env.VITE_API_BASE_URL && import.meta.env.NODE_ENV === "production") {
    envWarnings.push("VITE_API_BASE_URL not set in production environment");
  }

  // Validate individual sections
  const uiValidation = validateUIConfig(config.ui);
  const paginationValidation = validatePaginationConfig(config.pagination);
  const realtimeValidation = validateRealtimeConfig(config.realtime);

  const allErrors = [
    ...envErrors,
    ...uiValidation.errors,
    ...paginationValidation.errors,
    ...realtimeValidation.errors,
  ];

  const isHealthy = allErrors.length === 0;

  let summary = "";
  if (isHealthy) {
    summary = "Configuration is healthy and ready for use";
  } else {
    summary = `Configuration has ${allErrors.length} error(s) that need attention`;
  }

  if (envWarnings.length > 0) {
    summary += ` with ${envWarnings.length} warning(s)`;
  }

  return {
    isHealthy,
    summary,
    details: {
      environment: {
        isValid: envErrors.length === 0,
        errors: envErrors,
        warnings: envWarnings,
      },
      ui: uiValidation,
      pagination: paginationValidation,
      realtime: realtimeValidation,
    },
  };
}

// Initialize configuration with validation on module load
let configInitialized = false;

export function initializeConfig(): ValidationResult {
  if (configInitialized) {
    console.info("Configuration already initialized");
    return { isValid: true, errors: [], warnings: [] };
  }

  console.info("Initializing dashboard configuration...");
  const validation = validateConfig();

  if (validation.isValid) {
    console.info("✅ Configuration initialized successfully");
  } else {
    console.error("❌ Configuration initialization failed");
    console.error("Errors:", validation.errors);
  }

  if (validation.warnings.length > 0) {
    console.warn("⚠️ Configuration warnings:", validation.warnings);
  }

  configInitialized = true;
  return validation;
}

// Auto-initialize configuration in development mode
if (import.meta.env.NODE_ENV === "development") {
  initializeConfig();
}
