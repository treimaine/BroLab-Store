# Server Crash Fix - Summary

## Issue

The development server was crashing with the error:

```
Pre-transform error: Failed to resolve import "../../convex/_generated/api" from "client/src/hooks/useFavorites.ts". Does the file exist?
```

## Root Cause

1. **Incorrect import paths**: The import path `../../convex/_generated/api` was incorrect from the client directory structure
2. **Deep type instantiation**: The Convex generated API types were causing "Type instantiation is excessively deep" errors
3. **Missing imports**: Some files were missing the API imports after the autofix

## Solution Applied

### 1. Fixed Import Paths

**Correct path structure:**

- From `client/src/hooks/` to `convex/_generated/api` should be `../../../convex/_generated/api`
- Updated all affected files with the correct path

### 2. Created API Wrapper

Created `client/src/lib/convex-api.ts` to avoid deep type instantiation:

```typescript
export const api = {
  favorites: {
    getFavorites: {
      getFavorites: "favorites/getFavorites:getFavorites" as any,
      getFavoritesWithBeats: "favorites/getFavorites:getFavoritesWithBeats" as any,
    },
    add: {
      addToFavorites: "favorites/add:addToFavorites" as any,
    },
    remove: {
      removeFromFavorites: "favorites/remove:removeFromFavorites" as any,
    },
  },
  users: {
    getUserStats: {
      getUserStats: "users/getUserStats:getUserStats" as any,
    },
  },
  products: {
    forYou: {
      getForYouBeats: "products/forYou:getForYouBeats" as any,
    },
  },
};
```

### 3. Updated Hook Imports

Fixed imports in:

- `client/src/hooks/useFavorites.ts`
- `client/src/hooks/useDashboardData.ts`
- `client/src/pages/test-convex.tsx`
- `client/src/lib/convex.ts`
- `client/src/hooks/useOptimizedQueries.ts`

### 4. Deployed Convex Functions

Ensured all Convex functions are properly deployed:

```bash
npx convex dev --once
```

## Files Fixed

- ✅ `client/src/hooks/useFavorites.ts` - Fixed imports and API calls
- ✅ `client/src/hooks/useDashboardData.ts` - Fixed imports and API calls
- ✅ `client/src/lib/convex-api.ts` - Created API wrapper
- ✅ `client/src/lib/convex.ts` - Fixed import path
- ✅ `client/src/pages/test-convex.tsx` - Fixed import path
- ✅ `client/src/hooks/useOptimizedQueries.ts` - Fixed import path

## Verification

- ✅ TypeScript compilation: `npm run type-check` passes
- ✅ Development server: `npm run client` starts successfully
- ✅ Convex functions: Properly deployed and accessible
- ✅ Import paths: All corrected to proper relative paths

## Result

The development server now starts without crashing, and the Beats page should be accessible without the "Could not find public function" error. The application can now run in development mode successfully.

## Next Steps

1. Test the Beats page functionality in the browser
2. Verify that favorites functionality works for authenticated users
3. Test other Convex-dependent features like dashboard and user stats
