/**
 * Environment-Specific Validation Configuration
 *
 * Provides environment-specific settings for data validation to ensure:
 * - Production: Conservative thresholds, silent failures, minimal logging
 * - Development: Lenient thresholds, detailed logging, verbose errors
 * - Staging: Balanced approach between production and development
 */

import type {
  ConfidenceThresholds,
  ConfidenceWeights,
  Environment,
  IntegrityCheckConfig,
  SourceValidationConfig,
} from "../DataValidationService";

/**
 * Validation behavior configuration
 */
export interface ValidationBehaviorConfig {
  /** Whether to show warnings in the UI */
  showWarnings: boolean;
  /** Whether to show warnings in production */
  showProductionWarnings: boolean;
  /** Whether to enable detailed logging */
  enableDetailedLogging: boolean;
  /** Whether to fail silently on errors */
  failSilently: boolean;
  /** Whether to trust authenticated sources */
  trustAuthenticatedSources: boolean;
  /** Whether to log validation errors */
  logValidationErrors: boolean;
  /** Whether to log confidence breakdowns */
  logConfidenceBreakdowns: boolean;
  /** Whether to show mock data banners */
  showMockDataBanners: boolean;
}

/**
 * Complete environment-specific validation configuration
 */
export interface EnvironmentValidationConfig {
  /** Environment name */
  environment: Environment;
  /** Source validation configuration */
  sourceValidation: SourceValidationConfig;
  /** Confidence calculation weights */
  confidenceWeights: ConfidenceWeights;
  /** Confidence thresholds */
  confidenceThresholds: ConfidenceThresholds;
  /** Integrity check configuration */
  integrityCheck: Partial<IntegrityCheckConfig>;
  /** Behavior configuration */
  behavior: ValidationBehaviorConfig;
}

/**
 * Production validation configuration
 * - Very conservative thresholds to avoid false positives
 * - Silent failure mode
 * - Minimal logging
 * - Trust authenticated sources
 */
const PRODUCTION_CONFIG: EnvironmentValidationConfig = {
  environment: "production",
  sourceValidation: {
    trustDatabaseSource: true, // Always trust database sources
    validateConvexIds: true,
    validateTimestamps: true,
    minConfidenceThreshold: 0.95, // Very high threshold
    useStrictPatterns: true,
  },
  confidenceWeights: {
    sourceWeight: 0.6, // Highest priority on source
    idWeight: 0.25,
    timestampWeight: 0.1,
    contentWeight: 0.05, // Lowest priority on content
  },
  confidenceThresholds: {
    realDataThreshold: 0.7, // Stricter threshold
    mockDataThreshold: 0.95, // Very high to avoid false positives
    uncertaintyThreshold: 0.8,
  },
  integrityCheck: {
    maxDataAge: 10 * 60 * 1000, // 10 minutes (more lenient)
    checkMockData: true,
    checkCrossSection: true,
    checkDataSource: true,
  },
  behavior: {
    showWarnings: false, // Don't show warnings to users
    showProductionWarnings: false, // Never show in production
    enableDetailedLogging: false, // Minimal logging
    failSilently: true, // Fail silently, don't crash
    trustAuthenticatedSources: true, // Always trust authenticated sources
    logValidationErrors: true, // Log errors for monitoring
    logConfidenceBreakdowns: false, // No detailed breakdowns
    showMockDataBanners: false, // Don't show mock data warnings
  },
};

/**
 * Staging validation configuration
 * - Balanced thresholds
 * - Some logging enabled
 * - Show warnings but not to end users
 */
const STAGING_CONFIG: EnvironmentValidationConfig = {
  environment: "staging",
  sourceValidation: {
    trustDatabaseSource: true,
    validateConvexIds: true,
    validateTimestamps: true,
    minConfidenceThreshold: 0.9,
    useStrictPatterns: true,
  },
  confidenceWeights: {
    sourceWeight: 0.55,
    idWeight: 0.25,
    timestampWeight: 0.15,
    contentWeight: 0.05,
  },
  confidenceThresholds: {
    realDataThreshold: 0.6,
    mockDataThreshold: 0.9,
    uncertaintyThreshold: 0.75,
  },
  integrityCheck: {
    maxDataAge: 7 * 60 * 1000, // 7 minutes
    checkMockData: true,
    checkCrossSection: true,
    checkDataSource: true,
  },
  behavior: {
    showWarnings: true, // Show warnings for testing
    showProductionWarnings: false,
    enableDetailedLogging: true, // Enable for debugging
    failSilently: false, // Show errors for debugging
    trustAuthenticatedSources: true,
    logValidationErrors: true,
    logConfidenceBreakdowns: true, // Show breakdowns for analysis
    showMockDataBanners: true, // Show for testing
  },
};

/**
 * Development validation configuration
 * - Lenient thresholds to catch issues early
 * - Detailed logging enabled
 * - Show all warnings and errors
 */
const DEVELOPMENT_CONFIG: EnvironmentValidationConfig = {
  environment: "development",
  sourceValidation: {
    trustDatabaseSource: true,
    validateConvexIds: true,
    validateTimestamps: true,
    minConfidenceThreshold: 0.85, // Lower threshold to catch more issues
    useStrictPatterns: true,
  },
  confidenceWeights: {
    sourceWeight: 0.5,
    idWeight: 0.25,
    timestampWeight: 0.15,
    contentWeight: 0.1,
  },
  confidenceThresholds: {
    realDataThreshold: 0.5, // More lenient
    mockDataThreshold: 0.85, // Lower to catch more potential issues
    uncertaintyThreshold: 0.7,
  },
  integrityCheck: {
    maxDataAge: 5 * 60 * 1000, // 5 minutes
    checkMockData: true,
    checkCrossSection: true,
    checkDataSource: true,
  },
  behavior: {
    showWarnings: true, // Show all warnings
    showProductionWarnings: false, // Not applicable in dev
    enableDetailedLogging: true, // Full logging
    failSilently: false, // Show all errors
    trustAuthenticatedSources: true,
    logValidationErrors: true,
    logConfidenceBreakdowns: true, // Show detailed breakdowns
    showMockDataBanners: true, // Show all mock data warnings
  },
};

/**
 * Get environment from NODE_ENV or default to production
 */
export function getCurrentEnvironment(): Environment {
  const env = process.env.NODE_ENV;

  if (env === "development") {
    return "development";
  }
  if (env === "staging" || env === "test") {
    return "staging";
  }
  // Default to production for safety
  return "production";
}

/**
 * Get validation configuration for current environment
 */
export function getValidationConfig(environment?: Environment): EnvironmentValidationConfig {
  const env = environment || getCurrentEnvironment();

  switch (env) {
    case "development":
      return DEVELOPMENT_CONFIG;
    case "staging":
      return STAGING_CONFIG;
    case "production":
      return PRODUCTION_CONFIG;
    default:
      // Default to production for safety
      return PRODUCTION_CONFIG;
  }
}

/**
 * Get validation configuration with custom overrides
 */
export function getValidationConfigWithOverrides(
  environment?: Environment,
  overrides?: Partial<EnvironmentValidationConfig>
): EnvironmentValidationConfig {
  const baseConfig = getValidationConfig(environment);

  if (!overrides) {
    return baseConfig;
  }

  return {
    ...baseConfig,
    ...overrides,
    sourceValidation: {
      ...baseConfig.sourceValidation,
      ...overrides.sourceValidation,
    },
    confidenceWeights: {
      ...baseConfig.confidenceWeights,
      ...overrides.confidenceWeights,
    },
    confidenceThresholds: {
      ...baseConfig.confidenceThresholds,
      ...overrides.confidenceThresholds,
    },
    integrityCheck: {
      ...baseConfig.integrityCheck,
      ...overrides.integrityCheck,
    },
    behavior: {
      ...baseConfig.behavior,
      ...overrides.behavior,
    },
  };
}

/**
 * Check if current environment is production
 */
export function isProduction(): boolean {
  return getCurrentEnvironment() === "production";
}

/**
 * Check if current environment is development
 */
export function isDevelopment(): boolean {
  return getCurrentEnvironment() === "development";
}

/**
 * Check if current environment is staging
 */
export function isStaging(): boolean {
  return getCurrentEnvironment() === "staging";
}

/**
 * Get behavior config for current environment
 */
export function getBehaviorConfig(environment?: Environment): ValidationBehaviorConfig {
  return getValidationConfig(environment).behavior;
}

/**
 * Check if detailed logging is enabled for current environment
 */
export function isDetailedLoggingEnabled(environment?: Environment): boolean {
  return getBehaviorConfig(environment).enableDetailedLogging;
}

/**
 * Check if should fail silently in current environment
 */
export function shouldFailSilently(environment?: Environment): boolean {
  return getBehaviorConfig(environment).failSilently;
}

/**
 * Check if should trust authenticated sources in current environment
 */
export function shouldTrustAuthenticatedSources(environment?: Environment): boolean {
  return getBehaviorConfig(environment).trustAuthenticatedSources;
}

/**
 * Check if should show mock data banners in current environment
 */
export function shouldShowMockDataBanners(environment?: Environment): boolean {
  return getBehaviorConfig(environment).showMockDataBanners;
}

/**
 * Export all configurations for testing
 */
export const VALIDATION_CONFIGS = {
  production: PRODUCTION_CONFIG,
  staging: STAGING_CONFIG,
  development: DEVELOPMENT_CONFIG,
};
