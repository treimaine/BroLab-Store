/**
 * Configuration Validation Utilities
 * Validates dashboard configuration and environment variables
 */

import { CURRENCY_CONFIG, PERFORMANCE_CONFIG } from "@/config/dashboard";
import type { DashboardConfig } from "@shared/types/dashboard";

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface ConfigValidationOptions {
  strict?: boolean;
  checkEnvironment?: boolean;
  logResults?: boolean;
}

/**
 * Validate dashboard configuration
 */
export function validateDashboardConfig(
  config: DashboardConfig,
  options: ConfigValidationOptions = {}
): ValidationResult {
  const { strict = false, checkEnvironment = true, logResults = true } = options;
  const errors: string[] = [];
  const warnings: string[] = [];

  // Validate UI configuration
  if (config.ui.animationDuration < 0 || config.ui.animationDuration > 5000) {
    const message = `Invalid animation duration: ${config.ui.animationDuration}ms (should be 0-5000ms)`;
    if (strict) {
      errors.push(message);
    } else {
      warnings.push(message);
    }
  }

  if (config.ui.skeletonItems < 1 || config.ui.skeletonItems > 20) {
    const message = `Invalid skeleton items count: ${config.ui.skeletonItems} (should be 1-20)`;
    if (strict) {
      errors.push(message);
    } else {
      warnings.push(message);
    }
  }

  if (config.ui.maxActivityItems < 1 || config.ui.maxActivityItems > 100) {
    const message = `Invalid max activity items: ${config.ui.maxActivityItems} (should be 1-100)`;
    if (strict) {
      errors.push(message);
    } else {
      warnings.push(message);
    }
  }

  // Validate pagination configuration
  if (config.pagination.ordersPerPage < 1 || config.pagination.ordersPerPage > 100) {
    errors.push(`Invalid orders per page: ${config.pagination.ordersPerPage} (should be 1-100)`);
  }

  if (config.pagination.downloadsPerPage < 1 || config.pagination.downloadsPerPage > 100) {
    errors.push(
      `Invalid downloads per page: ${config.pagination.downloadsPerPage} (should be 1-100)`
    );
  }

  if (config.pagination.activityPerPage < 1 || config.pagination.activityPerPage > 100) {
    errors.push(
      `Invalid activity per page: ${config.pagination.activityPerPage} (should be 1-100)`
    );
  }

  // Validate real-time configuration
  if (config.realtime.reconnectInterval < 1000 || config.realtime.reconnectInterval > 60000) {
    const message = `Invalid reconnect interval: ${config.realtime.reconnectInterval}ms (should be 1000-60000ms)`;
    if (strict) {
      errors.push(message);
    } else {
      warnings.push(message);
    }
  }

  if (config.realtime.maxRetries < 0 || config.realtime.maxRetries > 50) {
    errors.push(`Invalid max retries: ${config.realtime.maxRetries} (should be 0-50)`);
  }

  if (config.realtime.heartbeatInterval < 5000 || config.realtime.heartbeatInterval > 300000) {
    const message = `Invalid heartbeat interval: ${config.realtime.heartbeatInterval}ms (should be 5000-300000ms)`;
    if (strict) {
      errors.push(message);
    } else {
      warnings.push(message);
    }
  }

  // Validate feature flags (ensure they are boolean)
  Object.entries(config.features).forEach(([key, value]) => {
    if (typeof value !== "boolean") {
      errors.push(`Feature flag '${key}' must be boolean, got ${typeof value}`);
    }
  });

  // Environment validation
  if (checkEnvironment) {
    const envValidation = validateEnvironmentVariables();
    errors.push(...envValidation.errors);
    warnings.push(...envValidation.warnings);
  }

  const result: ValidationResult = {
    isValid: errors.length === 0,
    errors,
    warnings,
  };

  if (logResults && (errors.length > 0 || warnings.length > 0)) {
    console.group("Dashboard Configuration Validation");

    if (errors.length > 0) {
      console.error("Configuration Errors:", errors);
    }

    if (warnings.length > 0) {
      console.warn("Configuration Warnings:", warnings);
    }

    console.groupEnd();
  }

  return result;
}

/**
 * Validate environment variables
 */
export function validateEnvironmentVariables(): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Required environment variables
  const requiredEnvVars = ["VITE_CONVEX_URL", "VITE_CLERK_PUBLISHABLE_KEY"];

  requiredEnvVars.forEach(envVar => {
    if (!import.meta.env[envVar]) {
      errors.push(`Missing required environment variable: ${envVar}`);
    }
  });

  // Optional but recommended environment variables
  const recommendedEnvVars = ["VITE_STRIPE_PUBLIC_KEY", "VITE_WC_KEY", "VITE_WC_SECRET"];

  recommendedEnvVars.forEach(envVar => {
    if (!import.meta.env[envVar]) {
      warnings.push(`Missing recommended environment variable: ${envVar}`);
    }
  });

  // Validate URL format for API endpoints
  if (import.meta.env.VITE_CONVEX_URL && !isValidUrl(import.meta.env.VITE_CONVEX_URL)) {
    errors.push(`Invalid VITE_CONVEX_URL format: ${import.meta.env.VITE_CONVEX_URL}`);
  }

  if (import.meta.env.VITE_API_BASE_URL && !isValidUrl(import.meta.env.VITE_API_BASE_URL)) {
    errors.push(`Invalid VITE_API_BASE_URL format: ${import.meta.env.VITE_API_BASE_URL}`);
  }

  // Validate numeric environment variables
  const numericEnvVars = [
    "VITE_ANIMATION_DURATION",
    "VITE_SKELETON_ITEMS",
    "VITE_MAX_ACTIVITY_ITEMS",
    "VITE_ORDERS_PER_PAGE",
    "VITE_DOWNLOADS_PER_PAGE",
    "VITE_ACTIVITY_PER_PAGE",
  ];

  numericEnvVars.forEach(envVar => {
    const value = import.meta.env[envVar];
    if (value && (isNaN(Number(value)) || Number(value) < 0)) {
      errors.push(`Invalid numeric value for ${envVar}: ${value}`);
    }
  });

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validate performance configuration
 */
export function validatePerformanceConfig(): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Validate cache TTL values
  Object.entries(PERFORMANCE_CONFIG.cache.ttl).forEach(([key, value]) => {
    if (value < 1000 || value > 24 * 60 * 60 * 1000) {
      // 1 second to 24 hours
      warnings.push(`Cache TTL for '${key}' is outside recommended range: ${value}ms`);
    }
  });

  // Validate request configuration
  if (PERFORMANCE_CONFIG.requests.timeout < 1000 || PERFORMANCE_CONFIG.requests.timeout > 60000) {
    warnings.push(
      `Request timeout outside recommended range: ${PERFORMANCE_CONFIG.requests.timeout}ms`
    );
  }

  if (PERFORMANCE_CONFIG.requests.retries < 0 || PERFORMANCE_CONFIG.requests.retries > 10) {
    warnings.push(
      `Request retries outside recommended range: ${PERFORMANCE_CONFIG.requests.retries}`
    );
  }

  if (
    PERFORMANCE_CONFIG.requests.maxConcurrent < 1 ||
    PERFORMANCE_CONFIG.requests.maxConcurrent > 20
  ) {
    warnings.push(
      `Max concurrent requests outside recommended range: ${PERFORMANCE_CONFIG.requests.maxConcurrent}`
    );
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validate currency configuration
 */
export function validateCurrencyConfig(): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Validate currency code
  if (CURRENCY_CONFIG.baseCurrency !== "USD") {
    errors.push(`Base currency must be USD, got: ${CURRENCY_CONFIG.baseCurrency}`);
  }

  // Validate formatting options
  if (
    CURRENCY_CONFIG.formatting.minimumFractionDigits < 0 ||
    CURRENCY_CONFIG.formatting.minimumFractionDigits > 4
  ) {
    warnings.push(
      `Minimum fraction digits outside recommended range: ${CURRENCY_CONFIG.formatting.minimumFractionDigits}`
    );
  }

  if (
    CURRENCY_CONFIG.formatting.maximumFractionDigits < 0 ||
    CURRENCY_CONFIG.formatting.maximumFractionDigits > 4
  ) {
    warnings.push(
      `Maximum fraction digits outside recommended range: ${CURRENCY_CONFIG.formatting.maximumFractionDigits}`
    );
  }

  // Validate conversion settings
  if (CURRENCY_CONFIG.conversion.centsPerDollar !== 100) {
    errors.push(`Cents per dollar must be 100, got: ${CURRENCY_CONFIG.conversion.centsPerDollar}`);
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validate all configurations
 */
export function validateAllConfigurations(options: ConfigValidationOptions = {}): ValidationResult {
  const results = [
    validateEnvironmentVariables(),
    validatePerformanceConfig(),
    validateCurrencyConfig(),
  ];

  const allErrors = results.flatMap(result => result.errors);
  const allWarnings = results.flatMap(result => result.warnings);

  return {
    isValid: allErrors.length === 0,
    errors: allErrors,
    warnings: allWarnings,
  };
}

/**
 * Helper function to validate URL format
 */
function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Get configuration health status
 */
export function getConfigurationHealth(): {
  status: "healthy" | "warning" | "error";
  message: string;
  details: ValidationResult;
} {
  const validation = validateAllConfigurations({ logResults: false });

  let status: "healthy" | "warning" | "error";
  let message: string;

  if (validation.errors.length > 0) {
    status = "error";
    message = `Configuration has ${validation.errors.length} error(s)`;
  } else if (validation.warnings.length > 0) {
    status = "warning";
    message = `Configuration has ${validation.warnings.length} warning(s)`;
  } else {
    status = "healthy";
    message = "Configuration is healthy";
  }

  return {
    status,
    message,
    details: validation,
  };
}
