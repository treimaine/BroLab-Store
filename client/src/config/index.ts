/**
 * Configuration System Exports
 * Central export point for all configuration-related functionality
 */

// Main configuration
export {
  API_CONFIG,
  CURRENCY_CONFIG,
  DASHBOARD_CONFIG,
  DEV_CONFIG,
  ERROR_CONFIG,
  FEATURE_FLAGS,
  PAGINATION_CONFIG,
  PERFORMANCE_CONFIG,
  UI_CONFIG,
  getDashboardConfig,
  isFeatureEnabled,
  validateConfig,
} from "./dashboard";

// Convex configuration (existing)
export {
  CONVEX_CONFIG,
  disableConvex,
  enableConvex,
  getConvexUrl,
  isConvexAvailable,
} from "./convex";

// PayPal configuration (existing)
export * from "./paypal";

// Configuration hooks
export {
  useApiConfig,
  useCurrencyConfig,
  useDashboardConfig,
  useDevConfig,
  useErrorConfig,
  useFeatureFlags,
  usePaginationConfig,
  usePerformanceConfig,
  useUIConfig,
} from "../hooks/useDashboardConfig";

// Configuration context
export {
  ConfigProvider,
  useConfig,
  useConfigContext,
  useConfigReady,
  useConfigValidation,
  withConfig,
} from "../contexts/ConfigContext";

// Configuration management
export {
  configManager,
  exportConfig,
  getConfig,
  importConfig,
  isFeatureEnabled as isFeatureEnabledRuntime,
  resetConfig,
  subscribeToConfig,
  toggleFeature,
  updateConfig,
  useConfigManager,
} from "../utils/configManager";

// Configuration validation
export {
  getConfigurationHealth,
  validateAllConfigurations,
  validateCurrencyConfig,
  validateDashboardConfig,
  validateEnvironmentVariables,
  validatePerformanceConfig,
} from "../utils/configValidator";

// Currency utilities
export {
  CurrencyFormatter,
  convertCentsToDollars,
  convertDollarsToCents,
  currencyFormatter,
  formatCompactCurrency,
  formatCurrency,
  formatCurrencyFromCents,
  formatCurrencyUSD,
  formatPercentageChange,
  getCurrencySymbol,
  isValidCurrencyAmount,
  parseCurrency,
} from "../utils/currency";

// Type exports
export type { DashboardConfig } from "@shared/types/dashboard";
export type { ConfigContextValue, ConfigProviderProps } from "../contexts/ConfigContext";
export type { ConfigSubscriber, ConfigUpdateOptions } from "../utils/configManager";
export type { ConfigValidationOptions, ValidationResult } from "../utils/configValidator";
export type { CurrencyFormatterOptions } from "../utils/currency";
