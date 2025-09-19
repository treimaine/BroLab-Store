# Dashboard Hook Migration Guide

This guide explains how to migrate from the existing multiple dashboard hooks to the new unified `useDashboard` hook.

## Overview

The new `useDashboard` hook replaces the following existing hooks:

- `useDashboardData`
- `useDashboardDataOptimized`
- `useOrders`
- `useDownloads`
- `useFavorites`
- Individual stat hooks

## Migration Examples

### Before: Multiple Hooks

```typescript
// Old approach - multiple hooks with overlapping data
import { useDashboardDataOptimized } from "@/hooks/useDashboardDataOptimized";
import { useOrders } from "@/hooks/useOrders";
import { useDownloads } from "@/hooks/useDownloads";
import { useFavorites } from "@/hooks/useFavorites";

function DashboardComponent() {
  const { user, stats, isLoading: dashboardLoading } = useDashboardDataOptimized();
  const { orders, isLoading: ordersLoading } = useOrders();
  const { downloads, isLoading: downloadsLoading } = useDownloads();
  const { favorites, isLoading: favoritesLoading } = useFavorites();

  const isLoading = dashboardLoading || ordersLoading || downloadsLoading || favoritesLoading;

  // Multiple loading states, potential data inconsistencies
  // Type casting issues with (data as any)
  // No unified error handling
}
```

### After: Unified Hook

```typescript
// New approach - single unified hook
import { useDashboard } from "@/hooks/useDashboard";

function DashboardComponent() {
  const {
    user,
    stats,
    orders,
    downloads,
    favorites,
    reservations,
    activity,
    chartData,
    trends,
    isLoading,
    error,
    isAuthenticated,
    refetch,
    optimisticUpdate,
    retry,
    clearError,
  } = useDashboard({
    includeChartData: true,
    includeTrends: true,
    activityLimit: 20,
  });

  // Single loading state, consistent data, proper TypeScript types
  // Comprehensive error handling with recovery strategies
  // Intelligent caching with automatic invalidation
}
```

## Configuration Options

The unified hook accepts configuration options:

```typescript
const dashboardData = useDashboard({
  includeChartData: true, // Include analytics chart data
  includeTrends: true, // Include trend calculations
  activityLimit: 20, // Limit recent activity items
  ordersLimit: 20, // Limit orders returned
  downloadsLimit: 50, // Limit downloads returned
  favoritesLimit: 50, // Limit favorites returned
  reservationsLimit: 20, // Limit reservations returned
  enableRealtime: true, // Enable real-time updates
  cacheTime: 5 * 60 * 1000, // Cache time in milliseconds
});
```

## Error Handling

The new hook provides comprehensive error handling:

```typescript
function DashboardComponent() {
  const { error, retry, clearError, isAuthenticated } = useDashboard();

  if (error) {
    switch (error.type) {
      case 'auth_error':
        return <AuthenticationRequired />;

      case 'network_error':
        return (
          <ErrorMessage
            message={error.message}
            onRetry={error.retryable ? retry : undefined}
          />
        );

      case 'data_error':
        return (
          <ErrorMessage
            message="Data loading failed"
            onRetry={retry}
            onClear={clearError}
          />
        );

      default:
        return <GenericError error={error} />;
    }
  }

  // Normal dashboard rendering
}
```

## Optimistic Updates

The hook supports optimistic updates for better UX:

```typescript
function FavoriteButton({ beatId }: { beatId: number }) {
  const { favorites, optimisticUpdate } = useDashboard();

  const handleToggleFavorite = async () => {
    // Optimistic update - immediate UI feedback
    optimisticUpdate({
      favorites: [
        ...favorites,
        {
          id: `temp_${beatId}`,
          beatId,
          beatTitle: 'Loading...',
          createdAt: new Date().toISOString(),
        }
      ]
    });

    try {
      // Actual API call
      await addToFavorites(beatId);
      // Cache will be automatically invalidated
    } catch (error) {
      // Optimistic update will be reverted automatically
      console.error('Failed to add favorite:', error);
    }
  };

  return (
    <button onClick={handleToggleFavorite}>
      Add to Favorites
    </button>
  );
}
```

## Cache Management

The hook integrates with the cache management system:

```typescript
import { useDashboardCache } from "@/hooks/useDashboardCache";

function DashboardActions() {
  const { refetch } = useDashboard();
  const { invalidateCache, clearCache, triggers } = useDashboardCache();

  const handleOrderPlaced = async () => {
    // Invalidate relevant cache after order placement
    await invalidateCache(triggers.ORDER_PLACED);
  };

  const handleRefreshAll = async () => {
    // Force refresh all dashboard data
    await refetch();
  };

  const handleClearCache = async () => {
    // Clear all cached data
    await clearCache();
  };
}
```

## Lightweight Stats Hook

For components that only need statistics:

```typescript
import { useDashboardStats } from '@/hooks/useDashboard';

function StatsWidget() {
  const { stats, isLoading, error, refetch } = useDashboardStats();

  if (isLoading) return <StatsSkeleton />;
  if (error) return <StatsError onRetry={refetch} />;

  return (
    <div>
      <StatCard label="Total Orders" value={stats.totalOrders} />
      <StatCard label="Total Downloads" value={stats.totalDownloads} />
      <StatCard label="Total Spent" value={`$${stats.totalSpent}`} />
    </div>
  );
}
```

## TypeScript Benefits

The unified hook provides proper TypeScript typing:

```typescript
// No more type casting or 'any' types
const { user, orders, downloads } = useDashboard();

// Proper type inference
user.email; // string
orders[0].total; // number (in dollars)
downloads[0].downloadedAt; // string (ISO date)

// Compile-time error checking
orders[0].invalidProperty; // TypeScript error
```

## Performance Benefits

1. **Single Query**: One optimized database query instead of multiple separate queries
2. **Intelligent Caching**: Automatic cache invalidation based on user actions
3. **Reduced Re-renders**: Optimized dependency arrays and memoization
4. **Bundle Size**: Eliminates duplicate code and unnecessary lazy loading

## Migration Checklist

- [ ] Replace multiple hook imports with single `useDashboard` import
- [ ] Update component props to use unified data structure
- [ ] Replace manual loading state management with hook's `isLoading`
- [ ] Update error handling to use hook's error system
- [ ] Remove type casting and replace with proper TypeScript types
- [ ] Update cache invalidation logic to use new cache management
- [ ] Test optimistic updates for user actions
- [ ] Verify performance improvements

## Breaking Changes

1. **Data Structure**: Some field names may have changed for consistency
2. **Loading States**: Single loading state instead of multiple
3. **Error Handling**: New error structure with recovery strategies
4. **Cache Keys**: New cache invalidation system

## Rollback Plan

If issues arise, the old hooks can be temporarily restored:

1. Keep old hook files until migration is complete
2. Use feature flags to switch between old and new implementations
3. Monitor error rates and performance metrics
4. Have rollback procedures ready for production deployment
