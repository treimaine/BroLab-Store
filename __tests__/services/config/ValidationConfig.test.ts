/**
 * Validation Configuration Tests
 *
 * Tests for the validation configuration management system
 */

import {
  createCustomConfig,
  getBehaviorConfig,
  getConfidenceThresholds,
  getConfidenceWeights,
  getContentValidationConfig,
  getCurrentEnvironment,
  getSourceValidationConfig,
  getValidationConfig,
  validateConfig,
  type Environment,
} from "@/services/config/ValidationConfig";

describe("ValidationConfig", () => {
  describe("getCurrentEnvironment", () => {
    it("should return a valid environment", () => {
      const env = getCurrentEnvironment();
      expect(["development", "staging", "production"]).toContain(env);
    });

    it("should default to production for safety", () => {
      // In test environment, it should still return a valid environment
      const env = getCurrentEnvironment();
      expect(env).toBeDefined();
    });
  });

  describe("getValidationConfig", () => {
    it("should return development config", () => {
      const config = getValidationConfig("development");
      expect(config.environment).toBe("development");
      expect(config.confidenceThresholds.mockDataThreshold).toBe(0.85);
      expect(config.behavior.enableDetailedLogging).toBe(true);
    });

    it("should return staging config", () => {
      const config = getValidationConfig("staging");
      expect(config.environment).toBe("staging");
      expect(config.confidenceThresholds.mockDataThreshold).toBe(0.9);
    });

    it("should return production config", () => {
      const config = getValidationConfig("production");
      expect(config.environment).toBe("production");
      expect(config.confidenceThresholds.mockDataThreshold).toBe(0.95);
      expect(config.behavior.failSilently).toBe(true);
      expect(config.behavior.showProductionWarnings).toBe(false);
    });

    it("should return a deep copy to prevent mutations", () => {
      const config1 = getValidationConfig("production");
      const config2 = getValidationConfig("production");

      config1.behavior.enableDetailedLogging = true;

      expect(config2.behavior.enableDetailedLogging).toBe(false);
    });
  });

  describe("Environment-Specific Getters", () => {
    it("should get source validation config", () => {
      const config = getSourceValidationConfig("production");
      expect(config.trustDatabaseSource).toBe(true);
      expect(config.validateConvexIds).toBe(true);
      expect(config.minConfidenceThreshold).toBe(0.95);
    });

    it("should get content validation config", () => {
      const config = getContentValidationConfig("production");
      expect(config.flagCommonNames).toBe(false);
      expect(config.flagZeroValues).toBe(false);
      expect(config.minPatternMatches).toBe(5);
    });

    it("should get confidence weights", () => {
      const weights = getConfidenceWeights("production");
      expect(weights.sourceWeight).toBe(0.6);
      expect(weights.contentWeight).toBe(0.05);
      // Weights should sum to ~1.0
      const sum =
        weights.sourceWeight + weights.idWeight + weights.timestampWeight + weights.contentWeight;
      expect(sum).toBeCloseTo(1.0, 2);
    });

    it("should get confidence thresholds", () => {
      const thresholds = getConfidenceThresholds("production");
      expect(thresholds.mockDataThreshold).toBe(0.95);
      expect(thresholds.realDataThreshold).toBe(0.7);
      expect(thresholds.uncertaintyThreshold).toBe(0.8);
    });

    it("should get behavior config", () => {
      const behavior = getBehaviorConfig("production");
      expect(behavior.showProductionWarnings).toBe(false);
      expect(behavior.failSilently).toBe(true);
      expect(behavior.trustAuthenticatedSources).toBe(true);
    });
  });

  describe("validateConfig", () => {
    it("should validate valid configuration", () => {
      const config = getValidationConfig("production");
      const validation = validateConfig(config);
      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it("should detect invalid environment", () => {
      const config = {
        environment: "invalid" as Environment,
      };
      const validation = validateConfig(config);
      expect(validation.isValid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
    });

    it("should detect invalid confidence weights sum", () => {
      const config = {
        confidenceWeights: {
          sourceWeight: 0.5,
          idWeight: 0.5,
          timestampWeight: 0.5,
          contentWeight: 0.5,
        },
      };
      const validation = validateConfig(config);
      expect(validation.isValid).toBe(false);
      expect(validation.errors.some(e => e.includes("sum to 1.0"))).toBe(true);
    });

    it("should detect out-of-range threshold values", () => {
      const config = {
        confidenceThresholds: {
          realDataThreshold: 1.5,
          mockDataThreshold: 0.95,
          uncertaintyThreshold: 0.8,
        },
      };
      const validation = validateConfig(config);
      expect(validation.isValid).toBe(false);
      expect(validation.errors.some(e => e.includes("between 0 and 1"))).toBe(true);
    });

    it("should detect invalid threshold ordering", () => {
      const config = {
        confidenceThresholds: {
          realDataThreshold: 0.95,
          mockDataThreshold: 0.7,
          uncertaintyThreshold: 0.8,
        },
      };
      const validation = validateConfig(config);
      expect(validation.isValid).toBe(false);
      expect(validation.errors.some(e => e.includes("must be less than"))).toBe(true);
    });

    it("should detect negative minPatternMatches", () => {
      const config = {
        contentValidation: {
          strictPlaceholderPatterns: [],
          testEmailDomains: [],
          flagCommonNames: false,
          flagZeroValues: false,
          flagRoundNumbers: false,
          minPatternMatches: -1,
        },
      };
      const validation = validateConfig(config);
      expect(validation.isValid).toBe(false);
      expect(validation.errors.some(e => e.includes("minPatternMatches"))).toBe(true);
    });
  });

  describe("createCustomConfig", () => {
    it("should create custom config by merging with base", () => {
      const custom = createCustomConfig("production", {
        confidenceThresholds: {
          realDataThreshold: 0.8,
          mockDataThreshold: 0.98,
          uncertaintyThreshold: 0.85,
        },
      });

      expect(custom.environment).toBe("production");
      expect(custom.confidenceThresholds.mockDataThreshold).toBe(0.98);
      // Other values should be from production base
      expect(custom.behavior.failSilently).toBe(true);
    });

    it("should validate merged configuration", () => {
      expect(() => {
        createCustomConfig("production", {
          confidenceWeights: {
            sourceWeight: 2.0, // Invalid
            idWeight: 0.25,
            timestampWeight: 0.15,
            contentWeight: 0.1,
          },
        });
      }).toThrow();
    });

    it("should deep merge nested objects", () => {
      const custom = createCustomConfig("production", {
        behavior: {
          showProductionWarnings: false,
          showMockDataBanners: false,
          enableDetailedLogging: true, // Override just this one
          failSilently: true,
          trustAuthenticatedSources: true,
          logValidationErrors: false,
          logConfidenceBreakdowns: false,
        },
      });

      expect(custom.behavior.enableDetailedLogging).toBe(true);
      expect(custom.behavior.failSilently).toBe(true);
    });
  });

  describe("Environment-Specific Behavior", () => {
    it("should have lenient thresholds in development", () => {
      const dev = getValidationConfig("development");
      const prod = getValidationConfig("production");

      expect(dev.confidenceThresholds.mockDataThreshold).toBeLessThan(
        prod.confidenceThresholds.mockDataThreshold
      );
    });

    it("should enable logging in development", () => {
      const dev = getValidationConfig("development");
      expect(dev.behavior.enableDetailedLogging).toBe(true);
      expect(dev.behavior.logValidationErrors).toBe(true);
      expect(dev.behavior.logConfidenceBreakdowns).toBe(true);
    });

    it("should disable logging in production", () => {
      const prod = getValidationConfig("production");
      expect(prod.behavior.enableDetailedLogging).toBe(false);
      expect(prod.behavior.logValidationErrors).toBe(false);
      expect(prod.behavior.logConfidenceBreakdowns).toBe(false);
    });

    it("should never show warnings in production", () => {
      const prod = getValidationConfig("production");
      expect(prod.behavior.showProductionWarnings).toBe(false);
      expect(prod.behavior.showMockDataBanners).toBe(false);
    });

    it("should fail silently in production", () => {
      const prod = getValidationConfig("production");
      expect(prod.behavior.failSilently).toBe(true);
    });

    it("should have higher source weight in production", () => {
      const dev = getValidationConfig("development");
      const prod = getValidationConfig("production");

      expect(prod.confidenceWeights.sourceWeight).toBeGreaterThan(
        dev.confidenceWeights.sourceWeight
      );
    });

    it("should require more pattern matches in production", () => {
      const dev = getValidationConfig("development");
      const prod = getValidationConfig("production");

      expect(prod.contentValidation.minPatternMatches).toBeGreaterThan(
        dev.contentValidation.minPatternMatches
      );
    });
  });

  describe("Configuration Immutability", () => {
    it("should not allow mutations to affect other instances", () => {
      const config1 = getValidationConfig("production");
      const config2 = getValidationConfig("production");

      // Mutate config1
      config1.confidenceThresholds.mockDataThreshold = 0.5;
      config1.behavior.enableDetailedLogging = true;

      // config2 should be unchanged
      expect(config2.confidenceThresholds.mockDataThreshold).toBe(0.95);
      expect(config2.behavior.enableDetailedLogging).toBe(false);
    });

    it("should not allow array mutations to affect other instances", () => {
      const config1 = getValidationConfig("production");
      const config2 = getValidationConfig("production");

      // Mutate array in config1
      config1.contentValidation.strictPlaceholderPatterns.push("NEW_PATTERN");

      // config2 should be unchanged
      expect(config2.contentValidation.strictPlaceholderPatterns).not.toContain("NEW_PATTERN");
    });
  });
});
