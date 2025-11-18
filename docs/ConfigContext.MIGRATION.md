# ConfigContext Migration Guide

## Overview

The `ConfigContext` has been refactored from React Context API to Zustand for better performance and consistency with the project's state management patterns.

## What Changed

### Before (React Context)

```typescript
import { ConfigProvider, useConfigContext } from "@/contexts/ConfigContext";

function App() {
  return (
    <ConfigProvider onConfigError={handleError}>
      <Dashboard />
    </ConfigProvider>
  );
}

function Dashboard() {
  const { config, isLoading, refreshConfig } = useConfigContext();
  // ...
}
```

### After (Zustand Store)

```typescript
import { useConfig, useConfigActions } from "@/stores/useConfigStore";

function App() {
  const { initialize } = useConfigActions();

  useEffect(() => {
    initialize({ onConfigError: handleError });
  }, []);

  return <Dashboard />;
}

function Dashboard() {
  const config = useConfig();
  const { refreshConfig } = useConfigActions();
  // ...
}
```

## Migration Paths

### Option 1: Keep Using ConfigProvider (Backward Compatible)

No changes needed! The `ConfigProvider` now initializes the Zustand store internally:

```typescript
import { ConfigProvider, useConfigContext } from "@/contexts/ConfigContext";

// This still works - ConfigProvider now wraps useConfigStore
<ConfigProvider onConfigError={handleError}>
  <App />
</ConfigProvider>
```

### Option 2: Migrate to Zustand (Recommended)

Use the new Zustand store directly for better performance:

```typescript
import { useConfig, useConfigReady, useConfigActions } from "@/stores/useConfigStore";

function MyComponent() {
  const config = useConfig(); // Optimized selector
  const isReady = useConfigReady();
  const { refreshConfig } = useConfigActions();

  // Component logic
}
```

## API Reference

### Zustand Store Hooks

#### `useConfig()`

Returns the dashboard configuration object.

```typescript
const config = useConfig();
// config: DashboardConfig
```

#### `useConfigReady()`

Returns whether the configuration is loaded and valid.

```typescript
const isReady = useConfigReady();
// isReady: boolean
```

#### `useConfigValidation()`

Returns validation status and health information.

```typescript
const { isValid, errors, warnings, health } = useConfigValidation();
```

#### `useConfigActions()`

Returns configuration actions.

```typescript
const { refreshConfig, validateConfiguration, initialize } = useConfigActions();
```

#### `useConfigStore()`

Direct access to the Zustand store (advanced usage).

```typescript
const config = useConfigStore(state => state.config);
const isLoading = useConfigStore(state => state.isLoading);
```

### Backward Compatibility Hooks

#### `useConfigContext()` (Deprecated)

Provides the same API as the old Context-based hook.

```typescript
const { config, isLoading, isValid, validation, health, refreshConfig } = useConfigContext();
```

## Benefits of Migration

1. **Better Performance**: Zustand selectors prevent unnecessary re-renders
2. **No Provider Needed**: Access config from anywhere without wrapping components
3. **Consistent Pattern**: Follows the project's Zustand-based state management
4. **Simpler Code**: No Context boilerplate, just import and use
5. **TypeScript Support**: Full type inference with selectors

## File Structure

```
client/src/
├── stores/
│   └── useConfigStore.ts          # Main Zustand store
├── hooks/
│   └── useConfigContext.ts        # Backward compatibility hook
└── contexts/
    ├── ConfigContext.tsx          # Provider component (wrapper)
    ├── ConfigContextTypes.ts      # Shared types
    ├── withConfig.tsx             # HOC component
    └── index.ts                   # Centralized exports
```

## Breaking Changes

None! All existing code continues to work. The refactor maintains full backward compatibility.

## Deprecation Timeline

- **Now**: Both APIs work (Context wrapper + Zustand store)
- **Future**: Consider migrating to Zustand for new code
- **No removal planned**: ConfigProvider will remain for backward compatibility

## Examples

### Example 1: Simple Config Access

```typescript
// Old way (still works)
const { config } = useConfigContext();

// New way (recommended)
const config = useConfig();
```

### Example 2: Conditional Rendering

```typescript
// Old way
const { isLoading, isValid } = useConfigContext();
if (isLoading) return <Spinner />;
if (!isValid) return <Error />;

// New way
const isReady = useConfigReady();
if (!isReady) return <Spinner />;
```

### Example 3: Validation Check

```typescript
// Old way
const { validation, health } = useConfigContext();

// New way
const { isValid, errors, warnings, health } = useConfigValidation();
```

### Example 4: Refresh Configuration

```typescript
// Old way
const { refreshConfig } = useConfigContext();

// New way
const { refreshConfig } = useConfigActions();
```

## Troubleshooting

### Issue: "useConfigContext must be used within a ConfigProvider"

**Solution**: Either wrap your app with `ConfigProvider` or migrate to `useConfig()` which doesn't require a provider.

### Issue: Component re-renders too often

**Solution**: Use specific selectors instead of `useConfigContext()`:

```typescript
// Instead of this (re-renders on any config change)
const { config } = useConfigContext();

// Use this (only re-renders when config changes)
const config = useConfig();
```

## Questions?

Check the implementation in:

- `client/src/stores/useConfigStore.ts` - Main store
- `client/src/contexts/ConfigContext.tsx` - Provider wrapper
- `client/src/hooks/useConfigContext.ts` - Backward compatibility
