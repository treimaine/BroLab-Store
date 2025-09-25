# Dashboard Configuration Management System

This document describes the comprehensive configuration management system implemented for the BroLab Entertainment dashboard modernization.

## Overview

The configuration system provides centralized management of:

- UI settings (animations, loading states, layout)
- Pagination parameters
- Performance settings (cache TTL, request limits)
- Feature flags (environment-based)
- Currency formatting (always USD-based)
- Real-time connection settings
- Error handling configuration

## Key Features

### 1. Environment-Based Configuration

- Feature flags controlled via environment variables
- Runtime configuration overrides
- Development vs production settings
- Validation and fallback values

### 2. Centralized Configuration Files

- `client/src/config/dashboard.ts` - Main configuration
- `client/src/config/index.ts` - Unified exports
- `.env.dashboard.example` - Environment variable template

### 3. React Integration

- Configuration hooks (`useDashboardConfig`)
- Context provider (`ConfigProvider`)
- Runtime configuration management
- Validation and health monitoring

### 4. Currency System

- Always uses USD as base currency
- Comprehensive formatting utilities
- Cents-to-dollars conversion
- Locale-aware formatting

## Usage Examples

### Basic Configuration Usage

```typescript
import { useDashboardConfig } from '@/config';

function MyComponent() {
  const { config, isFeatureEnabled } = useDashboardConfig();

  const animationDuration = config.ui.animationDuration;
  const showCharts = isFeatureEnabled('analyticsCharts');

  return (
    <div style={{
      transition: `all ${animationDuration}ms ease-in-out`
    }}>
      {showCharts && <AnalyticsChart />}
    </div>
  );
}
```

### Currency Formatting

```typescript
import { formatCurrency, formatCurrencyFromCents } from "@/utils/currency";

// Format dollars
const price = formatCurrency(29.99); // "$29.99"

// Format from cents
const priceFromCents = formatCurrencyFromCents(2999); // "$29.99"

// Compact formatting for large amounts
const largeAmount = formatCompactCurrency(1500000); // "$1.5M"
```

### Feature Flags

```typescript
import { isFeatureEnabled } from "@/config";

// Check feature availability
if (isFeatureEnabled("realtimeUpdates")) {
  // Enable real-time functionality
}

// Environment variable: VITE_FEATURE_REALTIME_UPDATES=true
```

### Configuration Provider

```typescript
import { ConfigProvider } from '@/config';

function App() {
  return (
    <ConfigProvider
      onConfigError={(error) => console.error('Config error:', error)}
      onValidationError={(validation) => console.warn('Config validation:', validation)}
    >
      <Dashboard />
    </ConfigProvider>
  );
}
```

## Environment Variables

### Feature Flags

```bash
# Enable/disable features
VITE_FEATURE_REALTIME_UPDATES=true
VITE_FEATURE_ANALYTICS_CHARTS=true
VITE_FEATURE_ADVANCED_FILTERS=true
VITE_FEATURE_PERFORMANCE_MONITORING=false
VITE_FEATURE_ERROR_TRACKING=false
```

### UI Configuration

```bash
# Animation and UI settings
VITE_ANIMATION_DURATION=300
VITE_SKELETON_ITEMS=6
VITE_MAX_ACTIVITY_ITEMS=20
```

### Pagination

```bash
# Items per page
VITE_ORDERS_PER_PAGE=10
VITE_DOWNLOADS_PER_PAGE=15
VITE_ACTIVITY_PER_PAGE=20
```

### Performance

```bash
# Cache TTL (milliseconds)
VITE_CACHE_TTL_USER_STATS=300000    # 5 minutes
VITE_CACHE_TTL_FAVORITES=600000     # 10 minutes
VITE_CACHE_TTL_ORDERS=900000        # 15 minutes

# Request settings
VITE_REQUEST_TIMEOUT=10000          # 10 seconds
VITE_REQUEST_RETRIES=3
VITE_MAX_CONCURRENT_REQUESTS=5
```

## Configuration Structure

### Main Configuration Object

```typescript
interface DashboardConfig {
  ui: {
    animationDuration: number;
    skeletonItems: number;
    maxActivityItems: number;
  };
  pagination: {
    ordersPerPage: number;
    downloadsPerPage: number;
    activityPerPage: number;
  };
  realtime: {
    reconnectInterval: number;
    maxRetries: number;
    heartbeatInterval: number;
  };
  features: {
    realtimeUpdates: boolean;
    analyticsCharts: boolean;
    advancedFilters: boolean;
  };
}
```

### Currency Configuration

```typescript
const CURRENCY_CONFIG = {
  baseCurrency: "USD",
  formatting: {
    locale: "en-US",
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  },
  conversion: {
    centsPerDollar: 100,
    roundingMode: "round",
  },
};
```

## Validation and Health Monitoring

### Configuration Validation

```typescript
import { validateAllConfigurations, getConfigurationHealth } from "@/utils/configValidator";

// Validate all configurations
const validation = validateAllConfigurations();
if (!validation.isValid) {
  console.error("Configuration errors:", validation.errors);
}

// Get health status
const health = getConfigurationHealth();
console.log(`Configuration status: ${health.status}`); // 'healthy' | 'warning' | 'error'
```

### Runtime Configuration Management

```typescript
import { configManager } from "@/utils/configManager";

// Update configuration at runtime
configManager.updateConfig(
  {
    ui: { animationDuration: 500 },
  },
  { persist: true, validate: true }
);

// Subscribe to configuration changes
const unsubscribe = configManager.subscribe("myComponent", config => {
  console.log("Configuration updated:", config);
});

// Toggle feature flags
configManager.toggleFeature("realtimeUpdates");
```

## File Structure

```
client/src/
├── config/
│   ├── dashboard.ts          # Main configuration
│   ├── index.ts             # Unified exports
│   ├── convex.ts            # Convex configuration (existing)
│   └── paypal.ts            # PayPal configuration (existing)
├── hooks/
│   └── useDashboardConfig.ts # Configuration hooks
├── contexts/
│   └── ConfigContext.tsx     # Configuration context
├── utils/
│   ├── currency.ts          # Currency utilities
│   ├── configValidator.ts   # Configuration validation
│   └── configManager.ts     # Runtime configuration management
└── types/
    └── env.d.ts             # Environment variable types
```

## Best Practices

### 1. Environment Variables

- Always provide default values
- Use descriptive variable names with VITE\_ prefix
- Document all variables in `.env.dashboard.example`
- Validate environment variables on startup

### 2. Feature Flags

- Default to `true` for existing features
- Use `false` only to explicitly disable features
- Test both enabled and disabled states
- Document feature flag dependencies

### 3. Performance Settings

- Set reasonable cache TTL values
- Monitor and adjust based on usage patterns
- Use different TTL for different data types
- Implement cache invalidation strategies

### 4. Currency Handling

- Always use USD as base currency
- Handle cents-to-dollars conversion consistently
- Provide formatting options for different contexts
- Validate currency amounts before processing

### 5. Configuration Updates

- Validate configuration changes
- Persist important overrides
- Notify components of configuration changes
- Provide rollback mechanisms

## Migration Guide

### From Hardcoded Values

1. Identify hardcoded configuration values
2. Move to appropriate configuration section
3. Add environment variable override
4. Update components to use configuration hooks
5. Test with different configuration values

### Adding New Configuration

1. Add to appropriate configuration section
2. Update TypeScript interfaces
3. Add environment variable (if needed)
4. Update validation rules
5. Document the new configuration option

## Testing

The configuration system includes comprehensive tests:

- Currency formatting validation
- Configuration structure validation
- Type definition availability
- Environment variable handling

Run tests with:

```bash
npm test __tests__/config-dashboard.test.ts
```

## Troubleshooting

### Common Issues

1. **Import.meta.env errors in tests**
   - Use mocked environment variables
   - Test configuration logic separately from environment dependencies

2. **Configuration validation failures**
   - Check environment variable formats
   - Ensure required variables are set
   - Review validation rules in `configValidator.ts`

3. **Feature flags not working**
   - Verify environment variable names (VITE\_ prefix required)
   - Check boolean string values ('true'/'false')
   - Ensure configuration is properly loaded

4. **Currency formatting issues**
   - Verify locale settings
   - Check cents-to-dollars conversion
   - Ensure USD currency is used consistently

### Debug Configuration

```typescript
import { getConfigurationHealth, validateAllConfigurations } from "@/utils/configValidator";

// Check configuration health
const health = getConfigurationHealth();
console.log("Configuration Health:", health);

// Detailed validation
const validation = validateAllConfigurations({ logResults: true });
console.log("Validation Results:", validation);
```

This configuration system provides a robust foundation for managing dashboard settings while maintaining flexibility and type safety.
