/**
 * Validation Configuration Management
 *
 * Provides environment-specific validation configuration with defaults,
 * validation, and loading based on NODE_ENV.
 *
 * This configuration system supports:
 * - Environment-specific settings (development, staging, production)
 * - Source validation configuration
 * - Content validation configuration
 * - Confidence calculation weights and thresholds
 * - Behavior settings for different environments
 */

// ================================
// TYPES
// ================================

/** Environment type */
export type Environment = "development" | "staging" | "production";

/**
 * Source validation configuration
 */
export interface SourceValidationConfig {
  /** Whether to trust authenticated database sources */
  trustDatabaseSource: boolean;
  /** Whether to validate Convex document IDs */
  validateConvexIds: boolean;
  /** Whether to check timestamp authenticity */
  validateTimestamps: boolean;
  /** Minimum confidence required to flag as mock */
  minConfidenceThreshold: number;
  /** Whether to use strict pattern matching */
  useStrictPatterns: boolean;
}

/**
 * Content validation configuration
 */
export interface ContentValidationConfig {
  /** Strict placeholder text patterns (exact matches only) */
  strictPlaceholderPatterns: string[];
  /** Test email domains to flag */
  testEmailDomains: string[];
  /** Whether to flag common names */
  flagCommonNames: boolean;
  /** Whether to flag zero values */
  flagZeroValues: boolean;
  /** Whether to flag round numbers */
  flagRoundNumbers: boolean;
  /** Minimum pattern matches required */
  minPatternMatches: number;
}

/**
 * Confidence weights for different validation components
 */
export interface ConfidenceWeights {
  /** Weight for source validation (highest priority) */
  sourceWeight: number;
  /** Weight for ID validation */
  idWeight: number;
  /** Weight for timestamp validation */
  timestampWeight: number;
  /** Weight for content validation (lowest priority) */
  contentWeight: number;
}

/**
 * Environment-specific confidence thresholds
 */
export interface ConfidenceThresholds {
  /** Minimum confidence to consider data real */
  realDataThreshold: number;
  /** Maximum confidence to flag as mock (>= this value = mock) */
  mockDataThreshold: number;
  /** Threshold for uncertain data */
  uncertaintyThreshold: number;
}

/**
 * Integrity check configuration
 */
export interface IntegrityCheckConfig {
  /** Maximum acceptable data age in milliseconds */
  maxDataAge: number;
  /** Whether to check for mock data indicators */
  checkMockData: boolean;
  /** Whether to validate cross-section consistency */
  checkCrossSection: boolean;
  /** Whether to validate data source authenticity */
  checkDataSource: boolean;
}

/**
 * Validation behavior configuration
 */
export interface ValidationBehaviorConfig {
  /** Whether to show warnings in production */
  showProductionWarnings: boolean;
  /** Whether to show mock data banners */
  showMockDataBanners: boolean;
  /** Whether to log validation details */
  enableDetailedLogging: boolean;
  /** Whether to fail silently on errors */
  failSilently: boolean;
  /** Whether to trust authenticated sources */
  trustAuthenticatedSources: boolean;
  /** Whether to log validation errors */
  logValidationErrors: boolean;
  /** Whether to log confidence breakdowns */
  logConfidenceBreakdowns: boolean;
}

/**
 * Complete environment-specific validation configuration
 */
export interface EnvironmentValidationConfig {
  /** Environment name */
  environment: Environment;
  /** Source validation settings */
  sourceValidation: SourceValidationConfig;
  /** Content validation settings */
  contentValidation: ContentValidationConfig;
  /** Confidence calculation weights */
  confidenceWeights: ConfidenceWeights;
  /** Confidence thresholds */
  confidenceThresholds: ConfidenceThresholds;
  /** Integrity check settings */
  integrityCheck: IntegrityCheckConfig;
  /** Behavior settings */
  behavior: ValidationBehaviorConfig;
}

// ================================
// DEFAULT CONFIGURATIONS
// ================================

/**
 * Default source validation configuration
 */
const DEFAULT_SOURCE_VALIDATION: SourceValidationConfig = {
  trustDatabaseSource: true,
  validateConvexIds: true,
  validateTimestamps: true,
  minConfidenceThreshold: 0.95,
  useStrictPatterns: true,
};

/**
 * Default content validation configuration
 */
const DEFAULT_CONTENT_VALIDATION: ContentValidationConfig = {
  strictPlaceholderPatterns: ["Lorem ipsum", "PLACEHOLDER", "TODO", "TBD", "FIXME", "XXX"],
  testEmailDomains: ["example.com", "test.com", "example.org", "test.org"],
  flagCommonNames: false, // Don't flag common names
  flagZeroValues: false, // Don't flag zero values
  flagRoundNumbers: false, // Don't flag round numbers
  minPatternMatches: 3, // Require multiple indicators
};

/**
 * Default confidence weights
 * Source validation has highest priority
 */
const DEFAULT_CONFIDENCE_WEIGHTS: ConfidenceWeights = {
  sourceWeight: 0.5, // 50% - Source is most important
  idWeight: 0.25, // 25% - IDs are strong indicators
  timestampWeight: 0.15, // 15% - Timestamps provide authenticity
  contentWeight: 0.1, // 10% - Content is lowest priority
};

/**
 * Default integrity check configuration
 */
const DEFAULT_INTEGRITY_CHECK: IntegrityCheckConfig = {
  maxDataAge: 5 * 60 * 1000, // 5 minutes
  checkMockData: true,
  checkCrossSection: true,
  checkDataSource: true,
};

// ================================
// ENVIRONMENT-SPECIFIC CONFIGURATIONS
// ================================

/**
 * Development environment configuration
 * - More lenient thresholds to catch issues early
 * - Detailed logging enabled
 * - Shows all warnings and banners
 */
const DEVELOPMENT_CONFIG: EnvironmentValidationConfig = {
  environment: "development",
  sourceValidation: {
    ...DEFAULT_SOURCE_VALIDATION,
    minConfidenceThreshold: 0.85, // Lower threshold to catch more issues
  },
  contentValidation: {
    ...DEFAULT_CONTENT_VALIDATION,
    minPatternMatches: 2, // More sensitive in development
  },
  confidenceWeights: DEFAULT_CONFIDENCE_WEIGHTS,
  confidenceThresholds: {
    realDataThreshold: 0.5, // More lenient
    mockDataThreshold: 0.85, // Lower threshold to catch more issues
    uncertaintyThreshold: 0.7,
  },
  integrityCheck: DEFAULT_INTEGRITY_CHECK,
  behavior: {
    showProductionWarnings: true,
    showMockDataBanners: true,
    enableDetailedLogging: true,
    failSilently: false,
    trustAuthenticatedSources: true,
    logValidationErrors: true,
    logConfidenceBreakdowns: true,
  },
};

/**
 * Staging environment configuration
 * - Balanced thresholds for testing
 * - Moderate logging
 * - Shows warnings but not as aggressive as development
 */
const STAGING_CONFIG: EnvironmentValidationConfig = {
  environment: "staging",
  sourceValidation: {
    ...DEFAULT_SOURCE_VALIDATION,
    minConfidenceThreshold: 0.9,
  },
  contentValidation: {
    ...DEFAULT_CONTENT_VALIDATION,
    minPatternMatches: 3,
  },
  confidenceWeights: DEFAULT_CONFIDENCE_WEIGHTS,
  confidenceThresholds: {
    realDataThreshold: 0.6,
    mockDataThreshold: 0.9,
    uncertaintyThreshold: 0.75,
  },
  integrityCheck: DEFAULT_INTEGRITY_CHECK,
  behavior: {
    showProductionWarnings: true,
    showMockDataBanners: true,
    enableDetailedLogging: true,
    failSilently: false,
    trustAuthenticatedSources: true,
    logValidationErrors: true,
    logConfidenceBreakdowns: true,
  },
};

/**
 * Production environment configuration
 * - Very conservative thresholds to avoid false positives
 * - Minimal logging (errors only)
 * - Silent failures
 * - Always trusts authenticated sources
 * - Only shows warnings for very high confidence mock data
 */
const PRODUCTION_CONFIG: EnvironmentValidationConfig = {
  environment: "production",
  sourceValidation: {
    ...DEFAULT_SOURCE_VALIDATION,
    minConfidenceThreshold: 0.95, // Very high threshold
    trustDatabaseSource: true, // Always trust database in production
  },
  contentValidation: {
    ...DEFAULT_CONTENT_VALIDATION,
    minPatternMatches: 5, // Require many indicators
    flagCommonNames: false,
    flagZeroValues: false,
    flagRoundNumbers: false,
  },
  confidenceWeights: {
    sourceWeight: 0.6, // Even higher source priority in production
    idWeight: 0.2, // Adjusted to maintain sum of 1.0
    timestampWeight: 0.15,
    contentWeight: 0.05, // Lower content weight
  },
  confidenceThresholds: {
    realDataThreshold: 0.7, // Stricter
    mockDataThreshold: 0.95, // Very high threshold to avoid false positives
    uncertaintyThreshold: 0.8,
  },
  integrityCheck: {
    ...DEFAULT_INTEGRITY_CHECK,
    maxDataAge: 10 * 60 * 1000, // 10 minutes - more lenient in production
  },
  behavior: {
    showProductionWarnings: false, // Never show warnings to users
    showMockDataBanners: false, // Never show banners to users
    enableDetailedLogging: false, // Only log errors
    failSilently: true, // Fail silently, don't crash
    trustAuthenticatedSources: true, // Always trust authenticated sources
    logValidationErrors: false, // Don't log validation errors in production
    logConfidenceBreakdowns: false, // Don't log confidence breakdowns in production
  },
};

// ================================
// CONFIGURATION REGISTRY
// ================================

/**
 * Configuration registry mapping environments to their configs
 */
const CONFIG_REGISTRY: Record<Environment, EnvironmentValidationConfig> = {
  development: DEVELOPMENT_CONFIG,
  staging: STAGING_CONFIG,
  production: PRODUCTION_CONFIG,
};

// ================================
// PUBLIC API
// ================================

/**
 * Get current environment from NODE_ENV or Vite environment
 * Falls back to 'production' for safety
 */
export function getCurrentEnvironment(): Environment {
  // Check NODE_ENV first (works in all contexts including Jest)
  if (typeof process !== "undefined" && process.env?.NODE_ENV) {
    const nodeEnv = process.env.NODE_ENV;
    if (nodeEnv === "development" || nodeEnv === "staging" || nodeEnv === "production") {
      return nodeEnv as Environment;
    }
  }

  // Check for Vite environment (only available in browser/Vite build)
  // Use globalThis to avoid import.meta syntax issues in Jest
  const viteEnv = (globalThis as Record<string, unknown>).__VITE_ENV__;
  if (viteEnv && typeof viteEnv === "string") {
    if (viteEnv === "development" || viteEnv === "staging" || viteEnv === "production") {
      return viteEnv as Environment;
    }
  }

  // Default to production for safety (most conservative settings)
  return "production";
}

/**
 * Get validation configuration for a specific environment
 * Returns a deep copy to prevent accidental mutations
 *
 * @param environment - Target environment (defaults to current)
 * @returns Environment-specific validation configuration
 */
export function getValidationConfig(environment?: Environment): EnvironmentValidationConfig {
  const env = environment || getCurrentEnvironment();
  const config = CONFIG_REGISTRY[env];

  if (!config) {
    console.warn(
      `[ValidationConfig] Unknown environment "${env}", falling back to production config`
    );
    return deepClone(PRODUCTION_CONFIG);
  }

  return deepClone(config);
}

/**
 * Get source validation configuration for current environment
 */
export function getSourceValidationConfig(environment?: Environment): SourceValidationConfig {
  const config = getValidationConfig(environment);
  return config.sourceValidation;
}

/**
 * Get content validation configuration for current environment
 */
export function getContentValidationConfig(environment?: Environment): ContentValidationConfig {
  const config = getValidationConfig(environment);
  return config.contentValidation;
}

/**
 * Get confidence weights for current environment
 */
export function getConfidenceWeights(environment?: Environment): ConfidenceWeights {
  const config = getValidationConfig(environment);
  return config.confidenceWeights;
}

/**
 * Get confidence thresholds for current environment
 */
export function getConfidenceThresholds(environment?: Environment): ConfidenceThresholds {
  const config = getValidationConfig(environment);
  return config.confidenceThresholds;
}

/**
 * Get behavior configuration for current environment
 */
export function getBehaviorConfig(environment?: Environment): ValidationBehaviorConfig {
  const config = getValidationConfig(environment);
  return config.behavior;
}

/**
 * Validate configuration object
 * Ensures all required fields are present and have valid values
 *
 * @param config - Configuration to validate
 * @returns Validation result with errors if any
 */
export function validateConfig(config: Partial<EnvironmentValidationConfig>): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  validateEnvironment(config, errors);
  validateConfidenceWeights(config, errors);
  validateConfidenceThresholds(config, errors);
  validateSourceValidation(config, errors);
  validateContentValidation(config, errors);
  validateIntegrityCheck(config, errors);

  return {
    isValid: errors.length === 0,
    errors,
  };
}

function validateEnvironment(config: Partial<EnvironmentValidationConfig>, errors: string[]): void {
  if (config.environment) {
    if (!["development", "staging", "production"].includes(config.environment)) {
      errors.push(
        `Invalid environment: ${config.environment}. Must be 'development', 'staging', or 'production'`
      );
    }
  }
}

function validateConfidenceWeights(
  config: Partial<EnvironmentValidationConfig>,
  errors: string[]
): void {
  if (!config.confidenceWeights) return;

  const weights = config.confidenceWeights;
  const sum =
    (weights.sourceWeight || 0) +
    (weights.idWeight || 0) +
    (weights.timestampWeight || 0) +
    (weights.contentWeight || 0);

  if (Math.abs(sum - 1) > 0.01) {
    errors.push(`Confidence weights should sum to 1.0, got ${sum.toFixed(2)}`);
  }

  // Validate individual weights are between 0 and 1
  for (const [key, value] of Object.entries(weights)) {
    if (value < 0 || value > 1) {
      errors.push(`${key} must be between 0 and 1, got ${value}`);
    }
  }
}

function validateConfidenceThresholds(
  config: Partial<EnvironmentValidationConfig>,
  errors: string[]
): void {
  if (!config.confidenceThresholds) return;

  const thresholds = config.confidenceThresholds;

  if (
    thresholds.realDataThreshold !== undefined &&
    (thresholds.realDataThreshold < 0 || thresholds.realDataThreshold > 1)
  ) {
    errors.push(`realDataThreshold must be between 0 and 1, got ${thresholds.realDataThreshold}`);
  }

  if (
    thresholds.mockDataThreshold !== undefined &&
    (thresholds.mockDataThreshold < 0 || thresholds.mockDataThreshold > 1)
  ) {
    errors.push(`mockDataThreshold must be between 0 and 1, got ${thresholds.mockDataThreshold}`);
  }

  if (
    thresholds.uncertaintyThreshold !== undefined &&
    (thresholds.uncertaintyThreshold < 0 || thresholds.uncertaintyThreshold > 1)
  ) {
    errors.push(
      `uncertaintyThreshold must be between 0 and 1, got ${thresholds.uncertaintyThreshold}`
    );
  }

  // Validate threshold ordering
  if (
    thresholds.realDataThreshold !== undefined &&
    thresholds.mockDataThreshold !== undefined &&
    thresholds.realDataThreshold >= thresholds.mockDataThreshold
  ) {
    errors.push(
      `realDataThreshold (${thresholds.realDataThreshold}) must be less than mockDataThreshold (${thresholds.mockDataThreshold})`
    );
  }
}

function validateSourceValidation(
  config: Partial<EnvironmentValidationConfig>,
  errors: string[]
): void {
  if (!config.sourceValidation) return;

  const sourceConfig = config.sourceValidation;

  if (
    sourceConfig.minConfidenceThreshold !== undefined &&
    (sourceConfig.minConfidenceThreshold < 0 || sourceConfig.minConfidenceThreshold > 1)
  ) {
    errors.push(
      `minConfidenceThreshold must be between 0 and 1, got ${sourceConfig.minConfidenceThreshold}`
    );
  }
}

function validateContentValidation(
  config: Partial<EnvironmentValidationConfig>,
  errors: string[]
): void {
  if (!config.contentValidation) return;

  const contentConfig = config.contentValidation;

  if (contentConfig.minPatternMatches !== undefined && contentConfig.minPatternMatches < 0) {
    errors.push(`minPatternMatches must be >= 0, got ${contentConfig.minPatternMatches}`);
  }
}

function validateIntegrityCheck(
  config: Partial<EnvironmentValidationConfig>,
  errors: string[]
): void {
  if (!config.integrityCheck) return;

  const integrityConfig = config.integrityCheck;

  if (integrityConfig.maxDataAge !== undefined && integrityConfig.maxDataAge < 0) {
    errors.push(`maxDataAge must be >= 0, got ${integrityConfig.maxDataAge}`);
  }
}

/**
 * Create custom configuration by merging with environment defaults
 * Validates the merged configuration before returning
 *
 * @param environment - Base environment to start from
 * @param overrides - Custom configuration overrides
 * @returns Merged and validated configuration
 * @throws Error if merged configuration is invalid
 */
export function createCustomConfig(
  environment: Environment,
  overrides: Partial<EnvironmentValidationConfig>
): EnvironmentValidationConfig {
  const baseConfig = getValidationConfig(environment);
  const mergedConfig = deepMerge(baseConfig, overrides);

  // Validate merged configuration
  const validation = validateConfig(mergedConfig);
  if (!validation.isValid) {
    throw new Error(`Invalid configuration: ${validation.errors.join(", ")}`);
  }

  return mergedConfig;
}

// ================================
// UTILITY FUNCTIONS
// ================================

/**
 * Deep clone an object to prevent mutations
 */
function deepClone<T>(obj: T): T {
  if (obj === null || typeof obj !== "object") {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => deepClone(item)) as unknown as T;
  }

  const cloned = {} as T;
  for (const key in obj) {
    if (Object.hasOwn(obj, key)) {
      cloned[key] = deepClone(obj[key]);
    }
  }

  return cloned;
}

/**
 * Deep merge two objects
 */
function deepMerge<T>(target: T, source: Partial<T>): T {
  const result = { ...target };

  for (const key in source) {
    if (Object.hasOwn(source, key)) {
      const sourceValue = source[key];
      const targetValue = result[key];

      if (
        sourceValue !== undefined &&
        typeof sourceValue === "object" &&
        !Array.isArray(sourceValue) &&
        targetValue !== undefined &&
        typeof targetValue === "object" &&
        !Array.isArray(targetValue)
      ) {
        result[key] = deepMerge(targetValue, sourceValue as Partial<typeof targetValue>);
      } else if (sourceValue !== undefined) {
        result[key] = sourceValue as T[Extract<keyof T, string>];
      }
    }
  }

  return result;
}

// ================================
// EXPORTS
// ================================

export {
  DEFAULT_CONFIDENCE_WEIGHTS,
  DEFAULT_CONTENT_VALIDATION,
  DEFAULT_INTEGRITY_CHECK,
  DEFAULT_SOURCE_VALIDATION,
  DEVELOPMENT_CONFIG,
  PRODUCTION_CONFIG,
  STAGING_CONFIG,
};
