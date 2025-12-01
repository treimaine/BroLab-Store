# Implementation Plan: ESLint Compliance Fix

## Current Status

- **Total Issues**: 392 warnings, 0 errors (as of latest lint run)
- **Phase 1**: ✅ Complete - All critical errors fixed
- **Phase 2**: 🔄 In Progress - Type safety improvements
- **Phase 3**: 🔄 In Progress - Code quality fixes (some tasks complete)
- **Phase 4**: ⏳ Not Started - Final cleanup

## Phase 1: Critical Errors - Fix All ESLint Errors (32 → 0)

- [x] 1. Convert CommonJS require() to ES6 imports in test files
  - Convert all `require()` statements to `import` statements in test files
  - Update dynamic requires to use `import()` expressions
  - Verify module resolution paths are correct
  - _Requirements: 2.1, 2.2, 2.3, 2.4_

- [x] 2. Fix switch case lexical declaration issues
  - Add block scopes (curly braces) around case blocks with `const`/`let` declarations
  - _Requirements: 4.1, 4.2, 4.3, 4.4_

- [x] 3. Remove useless try-catch wrappers
  - Remove unnecessary wrappers while preserving error propagation
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

- [x] 4. Fix unused expression violations
  - _Requirements: 6.1, 6.2, 6.3, 6.4_

- [x] 5. Replace empty interface declarations
  - _Requirements: 7.1, 7.2, 7.3, 7.4_

- [x] 6. Fix remaining Phase 1 critical errors (parsing errors)
  - _Requirements: 2.1, 2.2, 2.3, 2.4_

- [x] 7. Validate Phase 1 completion
  - **Status**: ✅ Complete - 0 errors

## Phase 2: Type Safety - Replace `any` Types

- [x] 8. Replace `any` types in test mock functions (partial)
  - _Requirements: 1.1, 1.2, 1.3_

- [ ] 9. Replace `any` types in hooks and utilities
  - Fix `any` types in `client/src/hooks/useDownloads.ts` (5 instances + @ts-nocheck)
  - Fix `any` types in `client/src/hooks/useFormValidation.ts` (1 instance)
  - Fix `any` types in `client/src/lib/api.ts` (2 instances)
  - Fix `any` types in `client/src/lib/clerkConfig.ts` (1 instance)
  - Fix `any` types in `client/src/lib/convexRealtime.ts` (2 instances)
  - Fix `any` types in `client/src/lib/emergency-cart-reset.ts` (3 instances)
  - Fix `any` types in `client/src/lib/logger.ts` (1 instance)
  - Fix `any` types in `client/src/lib/performanceMonitor.ts` (5 instances)
  - _Requirements: 1.1, 1.2, 1.3, 1.4_

- [ ] 10. Replace `any` types in components
  - Fix `any` types in `client/src/components/loading/IntersectionLazyLoader.tsx` (8 instances)
  - Fix `any` types in `client/src/components/loading/LazyComponents.tsx` (9 instances)
  - Fix `any` types in `client/src/components/payments/ClerkPaymentTest.tsx` (1 instance)
  - Fix `any` types in `client/src/components/audio/WaveformPlayer.tsx` (1 instance)
  - Fix `any` types in `client/src/components/dashboard/DataFreshnessIndicator.tsx` (1 instance)
  - Fix `any` types in `client/src/components/admin/FileManager.tsx` (5 instances)
  - _Requirements: 1.1, 1.2, 1.3, 1.4_

- [ ] 11. Replace `any` types in pages and services
  - Fix `any` types in `client/src/pages/reset-password.tsx` (1 instance)
  - Fix `any` types in `client/src/services/paypal.ts` (1 instance)
  - Fix `any` types in `client/src/utils/tracking.ts` (2 instances)
  - _Requirements: 1.1, 1.2, 1.3, 1.4_

- [ ] 12. Replace `any` types in Convex functions
  - Fix `any` types in `convex/activity/getRecent.ts` (2 instances)
  - Fix `any` types in `convex/auth/roles.ts` (4 instances)
  - Fix `any` types in `convex/downloads/enriched.ts` (2 instances)
  - Fix `any` types in `convex/lib/dashboardValidation.ts` (1 instance)
  - Fix `any` types in `convex/lib/validation.ts` (3 instances)
  - Fix `any` types in `convex/orders/createOrder.ts` (1 instance)
  - Fix `any` types in `convex/orders/updateOrder.ts` (2 instances)
  - Fix `any` types in `convex/quotas/getUserQuotas.ts` (2 instances)
  - Fix `any` types in `convex/quotas/updateQuota.ts` (1 instance)
  - Fix `any` types in `convex/rateLimits.ts` (2 instances)
  - Fix `any` types in `convex/reservations/sendPaymentConfirmation.ts` (2 instances)
  - Fix `any` types in `convex/subscriptions/createOrUpdateFromClerk.ts` (1 instance)
  - Fix `any` types in `convex/subscriptions/getCurrentSubscription.ts` (2 instances)
  - Fix `any` types in `convex/subscriptions/invoices.ts` (1 instance)
  - _Requirements: 1.1, 1.2, 1.3_

- [x] 13. Replace `any` types in client source files (partial)
  - _Requirements: 1.1, 1.3, 1.4_

- [ ] 14. Replace `any` types in server lib and middleware
  - Fix `any` types in `server/lib/accessControl.ts` (7 instances)
  - Fix `any` types in `server/lib/logger.ts` (1 instance)
  - Fix `any` types in `server/lib/openGraphGenerator.ts` (2 instances)
  - Fix `any` types in `server/lib/rollbackManager.ts` (13 instances)
  - Fix `any` types in `server/lib/validation.ts` (3 instances)
  - Fix `any` types in `server/middleware/clerkAuth.ts` (4 instances)
  - _Requirements: 1.1, 1.3, 1.4_

- [ ] 15. Replace `any` types in server routes and services
  - Fix `any` types in `server/config/paypal.ts` (1 instance)
  - Fix `any` types in `server/routes/internal.ts` (1 instance)
  - Fix `any` types in `server/routes/uploads.ts` (1 instance)
  - Fix `any` types in `server/services/WebSocketManager.ts` (1 instance)
  - Fix `any` types in `server/services/cacheWarmingService.ts` (1 instance)
  - Fix `any` types in `server/services/wp.ts` (8 instances)
  - _Requirements: 1.1, 1.3, 1.4_

- [ ] 15a. Replace `any` types in shared utilities
  - Fix `any` types in `shared/types/ConvexOrder.ts` (6 instances)
  - Fix `any` types in `shared/types/dashboard.ts` (1 instance)
  - _Requirements: 1.1, 1.3, 1.4, 1.5_

- [ ] 15b. Replace `any` types in test files (remaining)
  - Fix `any` types in `__tests__/components/file-upload-error-handling.test.tsx` (3 instances)
  - Fix `any` types in `__tests__/connection-manager-basic.test.ts` (11 instances)
  - Fix `any` types in `__tests__/connection-manager.test.ts` (30 instances)
  - Fix `any` types in `__tests__/convex-functions.test.ts` (6 instances)
  - Fix `any` types in `__tests__/convex-integration-type-safety.test.ts` (3 instances)
  - Fix `any` types in `__tests__/dataSynchronizationManager.test.ts` (12 instances)
  - Fix `any` types in `__tests__/dbUser.test.ts` (1 instance)
  - Fix `any` types in `__tests__/enhanced-statistics.test.ts` (2 instances)
  - Fix `any` types in `__tests__/hooks/useDashboard.test.ts` (6 instances)
  - Fix `any` types in `__tests__/hooks/useOfflineManager.test.tsx` (10 instances)
  - Fix `any` types in `__tests__/integration/*.test.tsx` (4 instances)
  - Fix `any` types in `__tests__/jest-environment.test.ts` (1 instance)
  - Fix `any` types in `__tests__/offline-manager.test.ts` (4 instances)
  - Fix `any` types in `__tests__/optimistic-updates.test.ts` (3 instances)
  - Fix `any` types in `__tests__/rate-limiter.test.ts` (1 instance)
  - Fix `any` types in `__tests__/rollbackManager.test.ts` (16 instances)
  - Fix `any` types in `__tests__/securityEnhancer.test.ts` (8 instances)
  - Fix `any` types in `__tests__/server/reservations.test.ts` (1 instance)
  - Fix `any` types in `__tests__/services/*.test.ts` (9 instances)
  - Fix `any` types in `__tests__/stubs/woocommerce-stubs.ts` (2 instances)
  - Fix `any` types in `__tests__/utils/dataConsistency.integration.test.ts` (1 instance)
  - _Requirements: 1.1, 1.2, 1.3_

- [ ] 15c. Replace `any` types in migration scripts (optional)
  - Fix `any` types in `convex/migrations/archive/cleanOrders.ts` (12 instances)
  - Fix `any` types in `convex/migrations/archive/cleanupGenericDownloads.ts` (3 instances)
  - Fix `any` types in `convex/migrations/archive/fixOrderPrices.ts` (3 instances)
  - Fix `any` types in `convex/migrations/archive/fixReservationPrices.ts` (2 instances)
  - Fix `any` types in `convex/migrations/archive/markSpecificFreeBeats.ts` (4 instances)
  - Fix `any` types in `scripts/test_mail.ts` (1 instance)
  - Note: These are archive/utility scripts, lower priority
  - _Requirements: 1.1, 1.3, 1.4_

- [ ] 16. Validate Phase 2 completion
  - Run `npm run lint` and verify significantly reduced warnings
  - Run `npm run type-check` to ensure no TypeScript errors
  - Run `npm test` to ensure all tests pass
  - _Requirements: All Phase 2 requirements_

## Phase 3: Code Quality - Fix Unused Variables and Other Issues

- [x] 17. Fix unused variables in components
  - Fix unused `result` in `client/src/components/admin/FileManager.tsx`
  - Fix unused `refetch` in `client/src/components/admin/FileManager.tsx`
  - Fix unused `user` in `client/src/components/alerts/NotificationCenter.tsx`
  - Fix unused `bpm` in `client/src/components/audio/EnhancedWaveformPlayer.tsx`
  - Fix unused `setIsLoading` in `client/src/components/audio/HoverPlayButton.tsx`
  - Fix unused `SkipForward`, `SkipBack`, `autoPlay` in `client/src/components/audio/SonaarAudioPlayer.tsx`
  - Fix unused `autoPlay`, `animationRef`, `handleSeek`, `progress` in `client/src/components/audio/WaveformAudioPlayer.tsx`
  - Fix unused `title` in `client/src/components/audio/audio-player.tsx`
  - Fix unused `isSynced`, `isLoading` in `client/src/components/auth/ClerkSyncProvider.tsx`
  - Fix unused `index`, `isMobile` in `client/src/components/beats/OptimizedBeatGrid.tsx`
  - Fix unused `productId`, `productName` in `client/src/components/beats/ResponsiveBeatCard.tsx`
  - Fix unused `LicenseTypeEnum` in `client/src/components/cart/cart-provider.tsx`
  - Fix unused `status`, `getCurrentStrategy` in `client/src/components/dashboard/DashboardConnectionStatus.tsx`
  - Fix unused `lastUpdateTime` in `client/src/components/dashboard/DataFreshnessIndicator.tsx`
  - Fix unused `index` in `client/src/components/dashboard/VirtualActivityFeed.tsx`
  - Fix unused `index` in `client/src/components/dashboard/VirtualDownloadsTable.tsx`
  - Fix unused `filters`, `onFiltersChange` in `client/src/components/filters/AdvancedFilters.tsx`
  - Fix unused `ExtendedEnhancedWaveformPlayerProps` in `client/src/components/loading/LazyComponents.tsx`
  - Fix unused `user` in `client/src/components/layout/MobileBottomNav.tsx`
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [x] 18. Fix unused variables in Convex files
  - Fix unused `ctx` in `convex/lib/dashboardConfig.ts`
  - Fix unused `user` in `convex/lib/dashboardConfig.ts`
  - Fix unused `identity` in `convex/lib/dashboardConfig.ts`
  - _Requirements: 3.1, 3.2, 3.3_

- [x] 19. Fix unused variables in server files
  - Fix unused `client` in `server/services/WebSocketManager.ts`
  - _Requirements: 3.1, 3.2, 3.3_

- [ ] 20. Fix unused variables in test files
  - Fix unused `app` in `__tests__/all-filters-server.test.ts`
  - Fix unused `args` in `__tests__/api-stripe-webhook.test.ts` (4 instances)
  - Fix unused `findFreePortMock`, `promptMock` in `__tests__/cliPort.test.ts`
  - Fix unused `error` in `__tests__/components/ReservationErrorHandling.test.tsx` (2 instances)
  - Fix unused `data` in `__tests__/connection-manager-basic.test.ts`
  - Fix unused `report1`, `report2` in `__tests__/data-validation-cache.test.ts` (3 instances)
  - Fix unused `supabaseAdmin` in `__tests__/dbUser.test.ts`
  - Fix unused `updatedServices`, `error` in `__tests__/enhanced-checkout-redirect.test.ts`
  - Fix unused `req` in `__tests__/openGraph.test.ts` (2 instances)
  - Fix unused `update1`, `update2` in `__tests__/optimistic-updates.test.ts`
  - Fix unused `mockConvex` in `__tests__/rate-limiter.test.ts`
  - Fix unused `rollbackId1`, `rollbackId2` in `__tests__/rollbackManager.test.ts` (3 instances)
  - Fix unused `listenerCount` in `__tests__/services/ErrorHandlingManager.test.ts`
  - Fix unused `data` in `__tests__/utils/dataConsistency.*.test.ts` (3 instances)
  - _Requirements: 3.1, 3.2, 3.3_

- [ ] 21. Replace @ts-ignore with @ts-expect-error
  - Replace `@ts-ignore` with `@ts-expect-error` in `client/src/hooks/useOrders.ts`
  - Add explanatory comments for each expected error
  - _Requirements: 8.1, 8.2, 8.5_

- [ ] 22. Remove @ts-nocheck directive from useDownloads.ts
  - Fix all type errors in `client/src/hooks/useDownloads.ts`
  - Remove the `@ts-nocheck` directive once all errors are resolved
  - Replace `any` types with proper Convex types
  - _Requirements: 8.1, 8.3, 8.4_

- [x] 23. Fix React Hook dependency warnings
  - Fix missing dependency `mockNotifications` in `client/src/components/alerts/NotificationCenter.tsx`
  - Fix missing dependency `currentTrack` in `client/src/components/audio/GlobalAudioPlayer.tsx` (2 instances)
  - Fix missing dependencies in `client/src/components/audio/SimpleAudioPlayer.tsx` (2 instances)
  - _Requirements: 3.1, 3.2, 3.3_

- [x] 24. Fix React unescaped entities warnings
  - _Requirements: 3.1, 3.2_

- [x] 25. Fix react-refresh/only-export-components warnings
  - Fix in `__tests__/test-utils.tsx` (3 instances)
  - Fix in `client/src/components/cart/cart-provider.tsx` (2 instances)
  - Fix in `client/src/components/kokonutui/file-upload.tsx` (1 instance)
  - Fix in `client/src/components/loading/IntersectionLazyLoader.tsx` (4 instances)
  - Fix in `client/src/components/loading/LazyComponents.tsx` (1 instance)
  - Fix in `client/src/components/loading/VirtualScrollList.tsx` (2 instances)
  - Fix in `client/src/components/newsletter/NewsletterModal.tsx` (1 instance)
  - Fix in `client/src/components/providers/GeolocationProvider.tsx` (2 instances)
  - Fix in `client/src/components/ui/badge.tsx` (1 instance)
  - Fix in `client/src/components/ui/button.tsx` (1 instance)
  - Fix in `client/src/components/ui/form.tsx` (1 instance)
  - Fix in `client/src/components/ui/sidebar.tsx` (1 instance)
  - Fix in `client/src/providers/CacheProvider.tsx` (1 instance)
  - Fix in `client/src/providers/ConnectionManagerProvider.tsx` (2 instances)
  - Fix in `client/src/providers/EventBusProvider.tsx` (3 instances)
  - Fix in `docs/ConnectionManagerWithAuth.example.tsx` (1 instance)
  - Fix in `docs/queryHelpers.example.tsx` (4 instances)
  - _Requirements: 3.1, 3.5_

- [ ] 26. Fix remaining test and docs file issues
  - Fix unused variables in `docs/queryHelpers.example.tsx` (10 instances)
  - Remove unused eslint-disable directives in `convex/_generated/api.js`
  - Remove unused eslint-disable directives in `convex/_generated/dataModel.d.ts`
  - Remove unused eslint-disable directives in `convex/_generated/server.d.ts`
  - Remove unused eslint-disable directives in `convex/_generated/server.js`
  - _Requirements: 2.1, 2.2, 3.1_

- [ ] 27. Validate Phase 3 completion
  - Run `npm run lint` and verify minimal warnings
  - Run `npm run type-check` to ensure no TypeScript errors
  - Run `npm test` to ensure all tests pass
  - _Requirements: All Phase 3 requirements_

## Phase 4: Final Cleanup - Achieve Zero Warnings

- [ ] 28. Apply ESLint auto-fixes
  - Run `npm run lint:fix` to automatically fix remaining 4 auto-fixable warnings
  - Review all auto-applied changes
  - Verify no functionality changes
  - _Requirements: 9.1, 9.2, 9.3, 9.4_

- [ ] 29. Final validation and documentation
  - Run `npm run lint` and verify 0 errors, 0 warnings
  - Run `npm run type-check` to ensure no TypeScript errors
  - Run `npm test` to ensure all tests pass
  - Run `npm run build` to verify production build succeeds
  - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_

- [ ] 30. Update CI/CD and development workflows
  - Verify ESLint runs in CI/CD pipeline with `--max-warnings 0`
  - Update pre-commit hooks to run ESLint checks
  - Document linting requirements in contributing guidelines
  - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_

## Implementation Priority

### High Priority (Complete First)

1. **Tasks 9-12**: Replace `any` types in source files - Most value for type safety
2. **Task 22**: Remove `@ts-nocheck` from useDownloads.ts - Critical for type checking
3. **Tasks 14-15**: Replace `any` types in server code

### Medium Priority

4. **Tasks 17-20**: Fix unused variables - Clean up dead code
5. **Task 21**: Fix TypeScript directive comments
6. **Task 23**: Fix React Hook dependency warnings

### Low Priority (Can be deferred)

7. **Task 25**: Fix react-refresh warnings - Development experience improvement
8. **Task 15b-15c**: Test files and migration scripts
9. **Task 26**: Fix remaining test/docs file issues

## Notes

- Each task should be completed and validated before moving to the next
- Run `npm run lint` after each file modification to track progress
- If tests fail after a fix, revert the specific file and investigate
- Preserve all existing functionality - only fix linting issues
- Use existing type definitions from `shared/types/` before creating new ones

## Progress Tracking

- **Phase 1**: ✅ Complete (0 errors)
- **Phase 2**: 🔄 In Progress
  - ✅ Task 8: Test mock types (partial)
  - ✅ Task 13: Client source files (partial)
  - ⏳ Tasks 9-12, 14-16: Remaining type safety work
- **Phase 3**: 🔄 In Progress
  - ✅ Task 24: Unescaped entities
  - ⏳ Tasks 17-23, 25-27: Remaining code quality work
- **Phase 4**: ⏳ Not Started

**Current**: 392 warnings → **Target**: 0 warnings
