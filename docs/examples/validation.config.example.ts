/**
 * Example Custom Validation Configuration
 *
 * This file demonstrates how to create custom validation configurations
 * for specific use cases or testing scenarios.
 *
 * Copy this file and modify as needed for your environment.
 */

import {
  createCustomConfig,
  type EnvironmentValidationConfig,
} from "../../client/src/services/config/ValidationConfig";

// ================================
// EXAMPLE 1: Ultra-Conservative Production Config
// ================================

/**
 * Ultra-conservative configuration for production
 * - Even higher thresholds than default production
 * - Absolutely no false positives
 * - Always trusts authenticated sources
 */
export const ULTRA_CONSERVATIVE_CONFIG: EnvironmentValidationConfig = createCustomConfig(
  "production",
  {
    confidenceThresholds: {
      realDataThreshold: 0.8,
      mockDataThreshold: 0.98, // Extremely high threshold
      uncertaintyThreshold: 0.85,
    },
    contentValidation: {
      strictPlaceholderPatterns: ["Lorem ipsum", "PLACEHOLDER"],
      testEmailDomains: ["example.com", "test.com"],
      flagCommonNames: false,
      flagZeroValues: false,
      flagRoundNumbers: false,
      minPatternMatches: 10, // Require many indicators
    },
    behavior: {
      showProductionWarnings: false,
      showMockDataBanners: false,
      enableDetailedLogging: false,
      failSilently: true,
      trustAuthenticatedSources: true,
      logValidationErrors: false,
      logConfidenceBreakdowns: false,
    },
  }
);

// ================================
// EXAMPLE 2: Aggressive Development Config
// ================================

/**
 * Aggressive configuration for development
 * - Very sensitive to potential mock data
 * - Catches issues early
 * - Detailed logging for debugging
 */
export const AGGRESSIVE_DEV_CONFIG: EnvironmentValidationConfig = createCustomConfig(
  "development",
  {
    confidenceThresholds: {
      realDataThreshold: 0.4,
      mockDataThreshold: 0.75, // Lower threshold to catch more
      uncertaintyThreshold: 0.6,
    },
    contentValidation: {
      strictPlaceholderPatterns: [
        "Lorem ipsum",
        "PLACEHOLDER",
        "TODO",
        "TBD",
        "FIXME",
        "XXX",
        "Test",
        "Sample",
        "Example",
      ],
      testEmailDomains: ["example.com", "test.com", "example.org", "test.org", "localhost"],
      flagCommonNames: true, // Flag common names in dev
      flagZeroValues: true, // Flag zeros in dev
      flagRoundNumbers: true, // Flag round numbers in dev
      minPatternMatches: 1, // Very sensitive
    },
    behavior: {
      showProductionWarnings: true,
      showMockDataBanners: true,
      enableDetailedLogging: true,
      failSilently: false,
      trustAuthenticatedSources: false, // Don't trust anything in aggressive mode
      logValidationErrors: true,
      logConfidenceBreakdowns: true,
    },
  }
);

// ================================
// EXAMPLE 3: Testing/QA Config
// ================================

/**
 * Configuration optimized for testing and QA
 * - Balanced sensitivity
 * - Detailed reporting for test analysis
 * - Moderate thresholds
 */
export const TESTING_CONFIG: EnvironmentValidationConfig = createCustomConfig("staging", {
  confidenceThresholds: {
    realDataThreshold: 0.55,
    mockDataThreshold: 0.88,
    uncertaintyThreshold: 0.72,
  },
  contentValidation: {
    strictPlaceholderPatterns: ["Lorem ipsum", "PLACEHOLDER", "TODO", "TBD", "FIXME"],
    testEmailDomains: ["example.com", "test.com"],
    flagCommonNames: false,
    flagZeroValues: false,
    flagRoundNumbers: false,
    minPatternMatches: 2,
  },
  behavior: {
    showProductionWarnings: true,
    showMockDataBanners: true,
    enableDetailedLogging: true,
    failSilently: false,
    trustAuthenticatedSources: true,
    logValidationErrors: true,
    logConfidenceBreakdowns: true,
  },
});

// ================================
// EXAMPLE 4: Debug Mode Config
// ================================

/**
 * Configuration for debugging validation issues
 * - Maximum logging and reporting
 * - Shows all validation details
 * - Useful for troubleshooting false positives/negatives
 */
export const DEBUG_CONFIG: EnvironmentValidationConfig = createCustomConfig("development", {
  confidenceWeights: {
    sourceWeight: 0.4, // Lower source weight to see content validation
    idWeight: 0.2,
    timestampWeight: 0.2,
    contentWeight: 0.2, // Higher content weight for debugging
  },
  confidenceThresholds: {
    realDataThreshold: 0.5,
    mockDataThreshold: 0.85,
    uncertaintyThreshold: 0.7,
  },
  behavior: {
    showProductionWarnings: true,
    showMockDataBanners: true,
    enableDetailedLogging: true,
    failSilently: false,
    trustAuthenticatedSources: true,
    logValidationErrors: true,
    logConfidenceBreakdowns: true,
  },
});

// ================================
// EXAMPLE 5: Source-Only Validation Config
// ================================

/**
 * Configuration that relies almost entirely on source validation
 * - Minimal content validation
 * - Trusts database sources completely
 * - Useful when content patterns are unreliable
 */
export const SOURCE_ONLY_CONFIG: EnvironmentValidationConfig = createCustomConfig("production", {
  confidenceWeights: {
    sourceWeight: 0.8, // Very high source weight
    idWeight: 0.15,
    timestampWeight: 0.05,
    contentWeight: 0, // No content validation
  },
  sourceValidation: {
    trustDatabaseSource: true,
    validateConvexIds: true,
    validateTimestamps: true,
    minConfidenceThreshold: 0.9,
    useStrictPatterns: true,
  },
  contentValidation: {
    strictPlaceholderPatterns: [],
    testEmailDomains: [],
    flagCommonNames: false,
    flagZeroValues: false,
    flagRoundNumbers: false,
    minPatternMatches: 100, // Effectively disabled
  },
  behavior: {
    showProductionWarnings: false,
    showMockDataBanners: false,
    enableDetailedLogging: false,
    failSilently: true,
    trustAuthenticatedSources: true,
    logValidationErrors: false,
    logConfidenceBreakdowns: false,
  },
});

// ================================
// EXAMPLE 6: Content-Focused Config
// ================================

/**
 * Configuration that focuses on content validation
 * - Higher content weight
 * - More aggressive pattern matching
 * - Useful for catching hardcoded test data
 */
export const CONTENT_FOCUSED_CONFIG: EnvironmentValidationConfig = createCustomConfig(
  "development",
  {
    confidenceWeights: {
      sourceWeight: 0.3,
      idWeight: 0.2,
      timestampWeight: 0.1,
      contentWeight: 0.4, // High content weight
    },
    contentValidation: {
      strictPlaceholderPatterns: [
        "Lorem ipsum",
        "PLACEHOLDER",
        "TODO",
        "TBD",
        "FIXME",
        "XXX",
        "Test",
        "Sample",
        "Example",
        "Mock",
        "Dummy",
        "Fake",
      ],
      testEmailDomains: [
        "example.com",
        "test.com",
        "example.org",
        "test.org",
        "localhost",
        "fake.com",
        "dummy.com",
      ],
      flagCommonNames: true,
      flagZeroValues: true,
      flagRoundNumbers: true,
      minPatternMatches: 2,
    },
    behavior: {
      showProductionWarnings: true,
      showMockDataBanners: true,
      enableDetailedLogging: true,
      failSilently: false,
      trustAuthenticatedSources: false,
      logValidationErrors: true,
      logConfidenceBreakdowns: true,
    },
  }
);

// ================================
// USAGE EXAMPLES
// ================================

/**
 * Example: Using custom config in DataValidationService
 *
 * ```typescript
 * import { DataValidationService } from './DataValidationService';
 * import { ULTRA_CONSERVATIVE_CONFIG } from './config/validation.config.example';
 *
 * // Create service with custom config
 * const validationService = new DataValidationService(
 *   ULTRA_CONSERVATIVE_CONFIG.integrityCheck,
 *   ULTRA_CONSERVATIVE_CONFIG.environment
 * );
 * ```
 */

/**
 * Example: Switching configs based on feature flag
 *
 * ```typescript
 * import { getValidationConfig } from './config/ValidationConfig';
 * import { AGGRESSIVE_DEV_CONFIG, ULTRA_CONSERVATIVE_CONFIG } from './config/validation.config.example';
 *
 * const config = featureFlags.aggressiveValidation
 *   ? AGGRESSIVE_DEV_CONFIG
 *   : getValidationConfig();
 * ```
 */

/**
 * Example: Creating environment-specific override
 *
 * ```typescript
 * import { createCustomConfig } from './config/ValidationConfig';
 *
 * const myConfig = createCustomConfig('production', {
 *   confidenceThresholds: {
 *     mockDataThreshold: 0.97, // Slightly more conservative
 *   },
 * });
 * ```
 */
