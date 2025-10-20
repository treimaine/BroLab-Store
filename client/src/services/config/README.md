# Validation Configuration System

This directory contains the configuration management system for the Data Validation Service. The configuration system provides environment-specific settings that control how data validation behaves across different deployment environments.

## Overview

The validation configuration system supports:

- **Environment-specific settings** (development, staging, production)
- **Source validation configuration** (database authentication, ID validation, timestamps)
- **Content validation configuration** (pattern matching, placeholder detection)
- **Confidence calculation** (weights and thresholds for scoring)
- **Behavior settings** (logging, warnings, error handling)

## Files

### ValidationConfig.ts

Main configuration file that exports:

- Type definitions for all configuration interfaces
- Default configurations for each environment
- Configuration loading and validation functions
- Utility functions for accessing specific config sections

## Configuration Structure

### EnvironmentValidationConfig

The main configuration interface that contains all validation settings:

```typescript
interface EnvironmentValidationConfig {
  environment: Environment;
  sourceValidation: SourceValidationConfig;
  contentValidation: ContentValidationConfig;
  confidenceWeights: ConfidenceWeights;
  confidenceThresholds: ConfidenceThresholds;
  integrityCheck: IntegrityCheckConfig;
  behavior: ValidationBehaviorConfig;
}
```

## Environment-Specific Configurations

### Development Environment

**Purpose**: Catch issues early during development

**Characteristics**:

- More lenient thresholds (mockDataThreshold: 0.85)
- Detailed logging enabled
- Shows all warnings and banners
- More sensitive pattern matching (minPatternMatches: 2)
- Fails loudly on errors

**Use Case**: Local development, debugging validation issues

### Staging Environment

**Purpose**: Test validation behavior before production

**Characteristics**:

- Balanced thresholds (mockDataThreshold: 0.9)
- Moderate logging
- Shows warnings but less aggressive than development
- Standard pattern matching (minPatternMatches: 3)
- Fails loudly on errors

**Use Case**: Pre-production testing, QA validation

### Production Environment

**Purpose**: Provide reliable validation without false positives

**Characteristics**:

- Very conservative thresholds (mockDataThreshold: 0.95)
- Minimal logging (errors only)
- Silent failures (no user-facing errors)
- Always trusts authenticated sources
- Requires many indicators to flag data (minPatternMatches: 5)
- Never shows warnings to users

**Use Case**: Live production environment serving real users

## Configuration Options

### Source Validation

Controls how data sources are validated:

```typescript
interface SourceValidationConfig {
  trustDatabaseSource: boolean; // Trust authenticated DB sources
  validateConvexIds: boolean; // Validate Convex document IDs
  validateTimestamps: boolean; // Check timestamp authenticity
  minConfidenceThreshold: number; // Min confidence to flag (0-1)
  useStrictPatterns: boolean; // Use strict pattern matching
}
```

**Defaults**:

- `trustDatabaseSource`: `true` (always trust authenticated sources)
- `validateConvexIds`: `true` (validate ID formats)
- `validateTimestamps`: `true` (check timestamp validity)
- `minConfidenceThreshold`: `0.95` (very high threshold)
- `useStrictPatterns`: `true` (strict matching only)

### Content Validation

Controls how content is analyzed for mock data:

```typescript
interface ContentValidationConfig {
  strictPlaceholderPatterns: string[]; // Exact text matches
  testEmailDomains: string[]; // Test email domains
  flagCommonNames: boolean; // Flag common names
  flagZeroValues: boolean; // Flag zero values
  flagRoundNumbers: boolean; // Flag round numbers
  minPatternMatches: number; // Min indicators required
}
```

**Defaults**:

- `flagCommonNames`: `false` (don't flag "John Smith", etc.)
- `flagZeroValues`: `false` (don't flag legitimate zeros)
- `flagRoundNumbers`: `false` (don't flag 10, 100, etc.)
- `minPatternMatches`: `3` (require multiple indicators)

### Confidence Weights

Controls how different validation components are weighted:

```typescript
interface ConfidenceWeights {
  sourceWeight: number; // Weight for source validation
  idWeight: number; // Weight for ID validation
  timestampWeight: number; // Weight for timestamp validation
  contentWeight: number; // Weight for content validation
}
```

**Defaults** (must sum to 1.0):

- `sourceWeight`: `0.5` (50% - highest priority)
- `idWeight`: `0.25` (25% - strong indicator)
- `timestampWeight`: `0.15` (15% - authenticity check)
- `contentWeight`: `0.1` (10% - lowest priority)

**Production Overrides**:

- `sourceWeight`: `0.6` (60% - even higher priority)
- `contentWeight`: `0.05` (5% - even lower priority)

### Confidence Thresholds

Controls when data is flagged as mock:

```typescript
interface ConfidenceThresholds {
  realDataThreshold: number; // Min confidence for real data
  mockDataThreshold: number; // Max confidence to flag as mock
  uncertaintyThreshold: number; // Threshold for uncertain data
}
```

**Environment-Specific Values**:

| Environment | realDataThreshold | mockDataThreshold | uncertaintyThreshold |
| ----------- | ----------------- | ----------------- | -------------------- |
| Development | 0.5               | 0.85              | 0.7                  |
| Staging     | 0.6               | 0.9               | 0.75                 |
| Production  | 0.7               | 0.95              | 0.8                  |

### Behavior Configuration

Controls validation behavior and user experience:

```typescript
interface ValidationBehaviorConfig {
  showProductionWarnings: boolean; // Show warnings in production
  showMockDataBanners: boolean; // Show mock data banners
  enableDetailedLogging: boolean; // Enable detailed logs
  failSilently: boolean; // Fail silently on errors
  trustAuthenticatedSources: boolean; // Trust authenticated sources
}
```

**Production Settings**:

- `showProductionWarnings`: `false` (never show to users)
- `showMockDataBanners`: `false` (never show to users)
- `enableDetailedLogging`: `false` (errors only)
- `failSilently`: `true` (don't crash on validation errors)
- `trustAuthenticatedSources`: `true` (always trust DB sources)

## Usage

### Basic Usage

```typescript
import { getValidationConfig, getCurrentEnvironment } from "./config/ValidationConfig";

// Get current environment
const env = getCurrentEnvironment(); // 'development' | 'staging' | 'production'

// Get full configuration for current environment
const config = getValidationConfig();

// Get configuration for specific environment
const prodConfig = getValidationConfig("production");
```

### Accessing Specific Sections

```typescript
import {
  getSourceValidationConfig,
  getContentValidationConfig,
  getConfidenceWeights,
  getConfidenceThresholds,
  getBehaviorConfig,
} from "./config/ValidationConfig";

// Get specific configuration sections
const sourceConfig = getSourceValidationConfig();
const contentConfig = getContentValidationConfig();
const weights = getConfidenceWeights();
const thresholds = getConfidenceThresholds();
const behavior = getBehaviorConfig();
```

### Creating Custom Configuration

```typescript
import { createCustomConfig } from "./config/ValidationConfig";

// Create custom configuration based on production
const customConfig = createCustomConfig("production", {
  confidenceThresholds: {
    mockDataThreshold: 0.98, // Even more conservative
  },
  behavior: {
    enableDetailedLogging: true, // Enable logging in production
  },
});
```

### Validating Configuration

```typescript
import { validateConfig } from "./config/ValidationConfig";

const customConfig = {
  confidenceWeights: {
    sourceWeight: 0.6,
    idWeight: 0.2,
    timestampWeight: 0.15,
    contentWeight: 0.05,
  },
};

const validation = validateConfig(customConfig);
if (!validation.isValid) {
  console.error("Invalid configuration:", validation.errors);
}
```

## Integration with DataValidationService

The DataValidationService automatically loads the appropriate configuration based on the current environment:

```typescript
// In DataValidationService constructor
constructor(config: Partial<IntegrityCheckConfig> = {}, environment?: Environment) {
  // Get environment-specific configuration
  this.environment = environment || getCurrentEnvironment();
  this.envConfig = getValidationConfig(this.environment);
  this.behaviorConfig = this.envConfig.behavior;

  // Initialize validators with environment config
  this.sourceValidator = new SourceValidator({
    ...this.envConfig.sourceValidation,
    trustDatabaseSource: this.behaviorConfig.trustAuthenticatedSources,
  });

  this.confidenceCalculator = new ConfidenceCalculator(
    this.environment,
    this.envConfig.confidenceWeights,
    this.envConfig.confidenceThresholds
  );
}
```

## Environment Detection

The configuration system automatically detects the current environment using:

1. **Vite environment** (`import.meta.env.MODE`)
2. **Node.js environment** (`process.env.NODE_ENV`)
3. **Fallback**: `production` (safest default)

### Setting Environment

**Development**:

```bash
# Vite automatically sets MODE=development
npm run dev
```

**Staging**:

```bash
# Set MODE in .env.staging
MODE=staging
npm run build
```

**Production**:

```bash
# Set MODE in .env.production or NODE_ENV
NODE_ENV=production npm run build
```

## Configuration Validation

The system validates configurations to ensure:

- Confidence weights sum to 1.0 (±0.01)
- All threshold values are between 0 and 1
- `realDataThreshold` < `mockDataThreshold`
- `minConfidenceThreshold` is between 0 and 1
- `minPatternMatches` is >= 0
- `maxDataAge` is >= 0

Invalid configurations will throw an error with detailed validation messages.

## Best Practices

### 1. Use Environment-Specific Configs

Always use the appropriate configuration for your environment:

```typescript
// Good: Use environment-specific config
const config = getValidationConfig();

// Avoid: Hardcoding production config in development
const config = getValidationConfig("production"); // Only if intentional
```

### 2. Don't Mutate Configurations

Configurations are deep-cloned to prevent mutations:

```typescript
const config = getValidationConfig();
config.behavior.enableDetailedLogging = true; // This won't affect other instances
```

### 3. Validate Custom Configurations

Always validate custom configurations before use:

```typescript
const customConfig = createCustomConfig("production", overrides);
// Automatically validated, throws on invalid config
```

### 4. Use Specific Getters

Use specific getter functions for better type safety:

```typescript
// Good: Type-safe access
const behavior = getBehaviorConfig();

// Less ideal: Manual access
const behavior = getValidationConfig().behavior;
```

### 5. Test with Different Environments

Test your validation logic with different environment configs:

```typescript
describe("Validation", () => {
  it("should be lenient in development", () => {
    const devConfig = getValidationConfig("development");
    expect(devConfig.confidenceThresholds.mockDataThreshold).toBe(0.85);
  });

  it("should be conservative in production", () => {
    const prodConfig = getValidationConfig("production");
    expect(prodConfig.confidenceThresholds.mockDataThreshold).toBe(0.95);
  });
});
```

## Troubleshooting

### Issue: Wrong environment detected

**Solution**: Explicitly set environment variable:

```bash
# For Vite
MODE=production npm run build

# For Node.js
NODE_ENV=production npm start
```

### Issue: Configuration validation errors

**Solution**: Check that custom configurations follow validation rules:

- Weights sum to 1.0
- Thresholds are between 0 and 1
- Threshold ordering is correct

### Issue: Too many false positives

**Solution**: Adjust thresholds or use production config:

```typescript
const config = createCustomConfig("production", {
  confidenceThresholds: {
    mockDataThreshold: 0.98, // Even more conservative
  },
});
```

### Issue: Not catching mock data

**Solution**: Use development config or lower thresholds:

```typescript
const config = createCustomConfig("development", {
  confidenceThresholds: {
    mockDataThreshold: 0.8, // More sensitive
  },
});
```

## Related Files

- `client/src/services/DataValidationService.ts` - Main validation service
- `client/src/components/dashboard/ValidatedDashboard.tsx` - Uses validation config
- `.kiro/specs/dashboard-mock-data-detection-fix/` - Specification documents

## References

- Requirements: 6.5, 10.1 (from requirements.md)
- Design: Configuration Management section (from design.md)
- Tasks: Task 17 (from tasks.md)
