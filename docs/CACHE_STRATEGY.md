# Cache Strategy - BroLab Entertainment

> TanStack Query cache configuration for [brolabentertainment.com](https://brolabentertainment.com)

## Overview

This document describes the caching strategy for all data types in the application. Each configuration is optimized based on:

- **Update frequency**: How often the data changes
- **User impact**: How critical fresh data is for UX
- **Performance**: Balance between freshness and network requests

## Configuration Reference

| Config Key       | staleTime | gcTime | Use Case                                      |
| ---------------- | --------- | ------ | --------------------------------------------- |
| `STATIC`         | 24h       | 48h    | License tiers, plans, genres, moods, tags     |
| `BEATS`          | 5min      | 30min  | Beat listings, search results, filtered lists |
| `BEAT_DETAILS`   | 15min     | 1h     | Individual beat metadata, waveform, licenses  |
| `BEATS_FEATURED` | 10min     | 30min  | Featured beats, recommendations, trending     |
| `USER_PROFILE`   | 5min      | 30min  | User profile, preferences, metadata           |
| `FAVORITES`      | 1min      | 10min  | User favorites/wishlist                       |
| `DOWNLOADS`      | 3min      | 20min  | Download history and available downloads      |
| `ORDERS`         | 2min      | 15min  | Order history and order details               |
| `CART`           | 0         | 5min   | Shopping cart (always refetch)                |
| `SUBSCRIPTIONS`  | 10min     | 1h     | User subscription status and quotas           |
| `RESERVATIONS`   | 1min      | 10min  | Service reservations (mixing, mastering)      |
| `AVAILABILITY`   | 30s       | 2min   | Available time slots for booking              |
| `DASHBOARD`      | 5min      | 30min  | Dashboard stats, aggregations                 |
| `NOTIFICATIONS`  | 30s       | 5min   | Notifications and alerts                      |
| `MEDIA`          | 1h        | 24h    | Audio files, waveform data, preview URLs      |

## Usage Examples

### In Custom Hooks

```typescript
import { useQuery } from "@tanstack/react-query";
import { CACHE_CONFIG } from "@/lib/queryClient";

// Beats listing
export function useBeats(filters: BeatFilters) {
  return useQuery({
    queryKey: ["beats", "list", filters],
    queryFn: () => fetchBeats(filters),
    staleTime: CACHE_CONFIG.BEATS.staleTime,
    gcTime: CACHE_CONFIG.BEATS.gcTime,
  });
}

// User orders (needs freshness)
export function useOrders(userId: string) {
  return useQuery({
    queryKey: ["user", "orders", userId],
    queryFn: () => fetchOrders(userId),
    staleTime: CACHE_CONFIG.ORDERS.staleTime,
    gcTime: CACHE_CONFIG.ORDERS.gcTime,
  });
}

// Shopping cart (always fresh)
export function useCart() {
  return useQuery({
    queryKey: ["cart"],
    queryFn: fetchCart,
    staleTime: CACHE_CONFIG.CART.staleTime, // 0 - always refetch
    gcTime: CACHE_CONFIG.CART.gcTime,
  });
}
```

### Prefetching on Hover

```typescript
import { prefetchUtils } from "@/lib/queryClient";

function BeatCard({ beat }: { beat: Beat }) {
  const handleMouseEnter = () => {
    // Prefetch beat details for instant navigation
    prefetchUtils.prefetchBeatDetails(beat.id);
  };

  return (
    <div onMouseEnter={handleMouseEnter}>
      {/* Beat card content */}
    </div>
  );
}
```

### Dashboard Prefetch on Login

```typescript
import { prefetchUtils } from "@/lib/queryClient";

async function onUserLogin(userId: string) {
  // Prefetch all dashboard data in parallel
  await prefetchUtils.prefetchDashboard(userId);
}
```

## Decision Guidelines

### When to use short staleTime (< 2min)

- **Transactional data**: Cart, orders, reservations
- **Real-time status**: Notifications, availability slots
- **User actions**: Favorites (user expects immediate feedback)

### When to use medium staleTime (2-15min)

- **User data**: Profile, downloads, subscription status
- **Catalog data**: Beat listings, search results
- **Dashboard**: Stats and aggregations

### When to use long staleTime (> 1h)

- **Static reference data**: Genres, moods, license tiers, plans
- **Media assets**: Audio files, waveform data (rarely change)

## Cache Invalidation

Use the `cacheInvalidation` utilities after mutations:

```typescript
import { cacheInvalidation } from "@/lib/queryClient";

// After purchase completion
async function onPurchaseComplete(userId: string) {
  cacheInvalidation.invalidateCommerceData(userId);
  cacheInvalidation.invalidateUserData(userId);
}

// After adding to favorites
async function onAddToFavorites() {
  queryClient.invalidateQueries({ queryKey: ["user", "favorites"] });
}
```

## Performance Tips

1. **Use prefetching** on hover for beat details
2. **Warm cache** on app init for static data
3. **Invalidate selectively** - don't clear entire cache
4. **Use optimistic updates** for favorites and cart

## Legacy Configs (Deprecated)

These configs are kept for backward compatibility but should not be used in new code:

- `USER_DATA` → Use `USER_PROFILE`, `FAVORITES`, `DOWNLOADS`, etc.
- `DYNAMIC` → Use `BEATS`, `DASHBOARD`, etc.
- `REALTIME` → Use `CART`, `NOTIFICATIONS`, `AVAILABILITY`
