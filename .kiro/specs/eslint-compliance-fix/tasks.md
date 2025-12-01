# Implementation Plan: ESLint Compliance Fix

## Current Status

- **Total Issues**: 671 warnings, 0 errors
- **Phase 1**: ✅ Complete - All critical errors fixed
- **Phase 2**: 🔄 In Progress - Type safety improvements (tasks 8, 13 complete)
- **Phase 3**: ⏳ Not Started - Code quality fixes
- **Phase 4**: ⏳ Not Started - Final cleanup

## Phase 1: Critical Errors - Fix All ESLint Errors (32 → 0)

- [x] 1. Convert CommonJS require() to ES6 imports in test files
  - Convert all `require()` statements to `import` statements in test files
  - Update dynamic requires to use `import()` expressions
  - Verify module resolution paths are correct
  - Files: `__tests__/bpm-filter-server.test.ts`, `__tests__/config-dashboard.test.ts`, `__tests__/convex-integration-type-safety.test.ts`, `__tests__/data-validation-cache.test.ts`, `__tests__/enhanced-statistics.test.ts`, `__tests__/integration/*.test.tsx`, `__tests__/server/*.test.ts`
  - _Requirements: 2.1, 2.2, 2.3, 2.4_

- [x] 2. Fix switch case lexical declaration issues
  - Add block scopes (curly braces) around case blocks with `const`/`let` declarations
  - Ensure proper scoping in switch statements
  - Files: `client/src/lib/errorTracker.ts`, `server/routes/reservations.ts`
  - _Requirements: 4.1, 4.2, 4.3, 4.4_

- [x] 3. Remove useless try-catch wrappers
  - Identify try-catch blocks that only re-throw without adding value
  - Remove unnecessary wrappers while preserving error propagation
  - Keep try-catch blocks that add logging or error transformation
  - Files: `client/src/lib/convexClient.ts` (5 instances)
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

- [x] 4. Fix unused expression violations
  - Convert unused expressions to assignments or remove them
  - Use void operator for intentional side-effect expressions
  - Files: `client/src/components/errors/OptimisticUpdateFeedback.tsx`
  - _Requirements: 6.1, 6.2, 6.3, 6.4_

- [x] 5. Replace empty interface declarations
  - Convert empty interfaces to type aliases or add proper members
  - Document marker interfaces with explanatory comments
  - Files: `client/src/components/ui/sonner.tsx`
  - _Requirements: 7.1, 7.2, 7.3, 7.4_

- [x] 6. Fix remaining Phase 1 critical errors (2 parsing errors)
  - Move shebang to line 1 in `scripts/audit_repo.ts` (currently on line 4)
  - Move shebang to line 1 in `scripts/test_mail.ts` (currently on line 3)
  - _Requirements: 2.1, 2.2, 2.3, 2.4_

- [x] 7. Validate Phase 1 completion
  - Run `npm run lint` and verify 0 errors, ~863 warnings
  - Run `npm run type-check` to ensure no TypeScript errors
  - Run `npm test` to ensure all tests pass
  - Document results in `.kiro/specs/eslint-compliance-fix/phase1-results.md`
  - _Requirements: All Phase 1 requirements_
  - **Status**: ✅ Complete - 0 errors, 671 warnings remaining

## Phase 2: Type Safety - Replace `any` Types (~863 → ~131 warnings)

- [x] 8. Replace `any` types in test mock functions
  - Define proper jest mock types for all test mocks
  - Use `jest.MockedFunction<typeof fn>` pattern
  - Replace generic `any` mocks with typed mocks
  - Files: `__tests__/analytics-system.test.ts`, `__tests__/api-stripe-webhook.test.ts`, `__tests__/api-subscription.test.ts`, `__tests__/cache-manager.test.ts`, `__tests__/cliPort.test.ts`
  - _Requirements: 1.1, 1.2, 1.3_

- [ ] 9. Replace `any` types in hooks and utilities
  - Fix `any` types in `client/src/hooks/useDownloads.ts` (remove @ts-nocheck)
  - Fix `any` types in `client/src/hooks/useErrorHandling.ts`
  - Fix `any` types in `client/src/hooks/useFormValidation.ts`
  - Fix `any` types in `client/src/lib/api.ts`
  - Fix `any` types in `client/src/lib/clerkConfig.ts`
  - Fix `any` types in `client/src/lib/convexRealtime.ts`
  - Fix `any` types in `client/src/lib/emergency-cart-reset.ts`
  - Fix `any` types in `client/src/lib/logger.ts`
  - Fix `any` types in `client/src/lib/performanceMonitor.ts`
  - Fix `any` types in `client/src/lib/unifiedFilters.ts` (40+ instances)
  - _Requirements: 1.1, 1.2, 1.3, 1.4_

- [ ] 10. Replace `any` types in components and pages
  - Fix `any` types in `client/src/components/loading/IntersectionLazyLoader.tsx`
  - Fix `any` types in `client/src/components/loading/LazyComponents.tsx`
  - Fix `any` types in `client/src/components/payments/ClerkPaymentTest.tsx`
  - Fix `any` types in `client/src/pages/cart.tsx`
  - Fix `any` types in `client/src/pages/contact.tsx`
  - Fix `any` types in `client/src/pages/reset-password.tsx`
  - Fix `any` types in `client/src/utils/lazyLoading.ts`
  - Fix `any` types in `client/src/utils/lazyLoadingMonitor.ts`
  - Fix `any` types in `client/src/utils/tracking.ts`
  - _Requirements: 1.1, 1.2, 1.3, 1.4_

- [ ] 11. Replace `any` types in providers
  - Fix `any` types in `client/src/providers/ConnectionManagerProvider.tsx`
  - Fix `any` types in `client/src/providers/DashboardRealtimeProvider.tsx`
  - Fix `any` types in `client/src/providers/OptimisticUpdatesProvider.tsx`
  - Fix `any` types in `client/src/services/paypal.ts`
  - Fix `any` types in `client/src/utils/configValidator.ts`
  - _Requirements: 1.1, 1.2, 1.3, 1.4_

- [ ] 12. Replace `any` types in Convex functions
  - Fix `any` types in `convex/activity/getRecent.ts`
  - Fix `any` types in `convex/auth/roles.ts`
  - Fix `any` types in `convex/data.ts`
  - Fix `any` types in `convex/downloads/enriched.ts`
  - Fix `any` types in `convex/lib/dashboardValidation.ts`
  - Fix `any` types in `convex/lib/validation.ts`
  - Fix `any` types in `convex/orders/createOrder.ts`
  - Fix `any` types in `convex/orders/updateOrder.ts`
  - Fix `any` types in `convex/quotas/*.ts`
  - Fix `any` types in `convex/rateLimits.ts`
  - Fix `any` types in `convex/reservations/sendPaymentConfirmation.ts`
  - Fix `any` types in `convex/subscriptions/*.ts`
  - _Requirements: 1.1, 1.2, 1.3_

- [x] 13. Replace `any` types in client source files
  - Review and use existing types from `shared/types/`
  - Create new interfaces in appropriate type files
  - Files: `client/src/components/**/*.tsx`, `client/src/hooks/**/*.ts`, `client/src/services/**/*.ts`
  - _Requirements: 1.1, 1.3, 1.4_

- [ ] 14. Replace `any` types in server lib and middleware
  - Fix `any` types in `server/lib/accessControl.ts`
  - Fix `any` types in `server/lib/audit.ts`
  - Fix `any` types in `server/lib/dataConsistencyManager.ts`
  - Fix `any` types in `server/lib/errorResponses.ts`
  - Fix `any` types in `server/lib/findFreePort.ts`
  - Fix `any` types in `server/lib/logger.ts`
  - Fix `any` types in `server/lib/openGraphGenerator.ts`
  - Fix `any` types in `server/lib/rollbackManager.ts`
  - Fix `any` types in `server/lib/validation.ts`
  - Fix `any` types in `server/middleware/clerkAuth.ts`
  - _Requirements: 1.1, 1.3, 1.4_

- [ ] 15. Replace `any` types in server routes and services
  - Fix `any` types in `server/config/paypal.ts`
  - Fix `any` types in `server/routes/internal.ts`
  - Fix `any` types in `server/routes/uploads.ts`
  - Fix `any` types in `server/services/WebSocketManager.ts`
  - Fix `any` types in `server/services/cacheWarmingService.ts`
  - Fix `any` types in `server/services/wp.ts`
  - Fix `any` types in `server/types/json2csv.d.ts`
  - _Requirements: 1.1, 1.3, 1.4_

- [ ] 15a. Replace `any` types in shared utilities
  - Fix `any` types in `shared/types/ConvexOrder.ts`
  - Fix `any` types in `shared/types/dashboard.ts`
  - Fix `any` types in `shared/utils/analytics-manager.ts`
  - _Requirements: 1.1, 1.3, 1.4, 1.5_

- [ ] 15b. Replace `any` types in migration scripts (optional)
  - Fix `any` types in `convex/migrations/archive/*.ts`
  - Fix `any` types in `scripts/test_mail.ts`
  - Note: These are archive/utility scripts, lower priority
  - _Requirements: 1.1, 1.3, 1.4_

- [ ] 16. Validate Phase 2 completion
  - Run `npm run lint` and verify 0 errors, significantly reduced warnings
  - Run `npm run type-check` to ensure no TypeScript errors
  - Run `npm test` to ensure all tests pass
  - Document results in `.kiro/specs/eslint-compliance-fix/phase2-results.md`
  - _Requirements: All Phase 2 requirements_
  - **Target**: Reduce from 671 warnings to ~200-300 warnings

## Phase 3: Code Quality - Fix Unused Variables and Comments (~131 → ~4 warnings)

- [x] 17. Fix unused variables in components and pages
  - Fix unused imports: `Button` in `LicensePicker.tsx`, `X` in `license-preview.tsx`
  - Fix unused variables in `client/src/components/layout/footer.tsx` (getFooterOpacity, opacity, borderOpacity)
  - Fix unused variables in `client/src/components/orders/OrderCard.tsx` (setLocation, error)
  - Fix unused variables in `client/src/pages/cart.tsx` (refreshCartPricing)
  - Fix unused variables in `client/src/pages/clerk-checkout.tsx` (user)
  - Fix unused variables in `client/src/pages/contact.tsx` (Send, Clock, page)
  - Fix unused variables in `client/src/pages/payment-dashboard.tsx` (selectedPlan, setSelectedPlan)
  - Fix unused variables in `client/src/pages/production-consultation.tsx` (error)
  - Fix unused variables in `client/src/pages/shop.tsx` (categories)
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [x] 18. Fix unused variables in hooks and utilities
  - Fix unused variables in `client/src/hooks/use-loyalty.ts` (userId, rewardId parameters)
  - Fix unused variables in `client/src/hooks/use-toast.ts` (actionTypes)
  - Fix unused variables in `client/src/hooks/use-wordpress.ts` (WordPressPage, WordPressPost)
  - Fix unused variables in `client/src/hooks/useBreakpoint.ts` (key parameter)
  - Fix unused variables in `client/src/hooks/useConnectionManager.ts` (autoReconnect, error)
  - Fix unused variables in `client/src/hooks/useErrorHandling.ts` (autoRetry, maxRetries)
  - Fix unused variables in `client/src/hooks/useEventBus.ts` (deps parameter)
  - Fix unused variables in `client/src/lib/performanceMonitor.ts` (latest)
  - Fix unused variables in `client/src/lib/unifiedFilters.ts` (filters, extractIsFree, extractHasVocals, extractStems)
  - Fix unused variables in `client/src/utils/configValidator.ts` (options)
  - Fix unused variables in `client/src/utils/lazyLoading.ts` (preloadOnHover)
  - Fix unused variables in `client/src/utils/lazyLoadingMonitor.ts` (preloadDelay)
  - _Requirements: 3.1, 3.2, 3.3, 3.4_

- [ ] 19. Fix unused variables in providers and services
  - Fix unused variables in `client/src/providers/ConnectionManagerProvider.tsx` (showStatus)
  - Fix unused variables in `client/src/providers/DashboardDataProvider.tsx` (isLoading)
  - Fix unused variables in `client/src/providers/OptimisticUpdatesProvider.tsx` (reason, error, action)
  - Fix unused variables in `client/src/services/CrossTabSyncManager.ts` (error)
  - Fix unused variables in `client/src/components/monitoring/PerformanceMonitor.tsx` (PerformanceMetrics)
  - Fix unused variables in `client/src/components/payments/PayPalButton.tsx` (onPaymentSuccess)
  - Fix unused variables in `client/src/providers/AnalyticsProvider.tsx` (consentGiven)
  - _Requirements: 3.1, 3.4, 3.5_

- [ ] 20. Fix unused variables in Convex and server files
  - Fix unused variables in `convex/data.ts` (tableName)
  - Fix unused variables in `convex/lib/dashboardConfig.ts` (ctx, user, identity)
  - Fix unused variables in `convex/sync/woocommerce.ts` (offset)
  - Fix unused variables in `convex/sync/wordpress.ts` (offset)
  - Fix unused variables in `convex/users.ts` (userId)
  - Fix unused variables in `server/lib/audit.ts` (convex, limit)
  - Fix unused variables in `server/lib/cliPort.ts` (\_err)
  - Fix unused variables in `server/lib/dataConsistencyManager.ts` (resourceType, resourceId)
  - Fix unused variables in `server/lib/errorResponses.ts` (next)
  - Fix unused variables in `server/lib/findFreePort.ts` (err, maxTries)
  - Fix unused variables in `server/lib/invoices.ts` (buffer)
  - Fix unused variables in `server/lib/storage.ts` (options, expiresIn, bucket, path)
  - Fix unused variables in `server/middleware/fileUploadSecurity.ts` (quarantineThreats, format)
  - Fix unused variables in `server/routes.ts` (url)
  - Fix unused variables in `server/routes/storage.ts` (filters)
  - Fix unused variables in `server/services/WebSocketManager.ts` (request, client, clientId)
  - Fix unused variables in `server/services/woo-types.ts` (tracks)
  - Fix unused variables in `server/wordpress.ts` (extractInstruments, extractTags, extractTimeSignature, extractDuration, extractHasVocals, extractStems, errorMessage, e)
  - Fix unused variables in `server/types/json2csv.d.ts` (T)
  - Fix unused variables in `shared/constants/errors.ts` (locale)
  - Fix unused variables in `shared/utils/analytics-manager.ts` (filteredInteractions)
  - Fix unused variables in `shared/utils/cache-manager.ts` (totalRequests)
  - Fix unused variables in `shared/validation/sync.ts` (SubscriptionOptionsSchema)
  - _Requirements: 3.1, 3.2, 3.3, 3.5_

- [ ] 21. Replace @ts-ignore with @ts-expect-error and fix TypeScript directives
  - Replace `@ts-ignore` with `@ts-expect-error` in `client/src/hooks/useClerkSync.ts`
  - Replace `@ts-ignore` with `@ts-expect-error` in `client/src/hooks/useOrders.ts`
  - Add explanatory comments for each expected error
  - Fix underlying type errors where possible
  - _Requirements: 8.1, 8.2, 8.5_

- [ ] 22. Remove @ts-nocheck directive from useDownloads.ts
  - Fix all type errors in `client/src/hooks/useDownloads.ts`
  - Remove the `@ts-nocheck` directive once all errors are resolved
  - Replace `any` types with proper Convex types
  - _Requirements: 8.1, 8.3, 8.4_

- [ ] 23. Fix React Hook dependency warnings
  - Fix missing dependencies in `client/src/components/orders/OrderStatusHistory.tsx`
  - Fix missing dependencies in `client/src/components/providers/CurrencyLanguageProvider.tsx`
  - Fix missing dependencies in `client/src/hooks/useClerkSync.ts`
  - Fix missing dependencies in `client/src/hooks/useErrorHandling.ts`
  - Fix missing dependencies in `client/src/hooks/useEventBus.ts`
  - Fix missing dependencies in `client/src/hooks/useSyncManager.ts`
  - Fix missing dependencies in `client/src/pages/payment-success.tsx`
  - Fix missing dependencies in `client/src/providers/ConnectionManagerProvider.tsx`
  - Fix missing dependencies in `client/src/providers/DashboardRealtimeProvider.tsx`
  - _Requirements: 3.1, 3.2, 3.3_

- [ ] 24. Fix React unescaped entities warnings
  - Fix apostrophes and quotes in multiple page files
  - Use proper HTML entities (`&apos;`, `&quot;`) or escape characters
  - Files: Multiple pages and components with unescaped `'` and `"` characters
  - Note: ~50+ instances across the codebase
  - _Requirements: 3.1, 3.2_

- [ ] 25. Fix react-refresh/only-export-components warnings
  - Move exported constants and functions to separate files
  - Keep component files focused on component exports only
  - Files: Multiple files with mixed exports (~30+ instances)
  - Note: This is a code organization improvement
  - _Requirements: 3.1, 3.5_

- [ ] 26. Fix remaining test file issues
  - Convert remaining `require()` to ES6 imports in test files
  - Fix unused variables in `docs/queryHelpers.example.tsx`
  - Remove unused eslint-disable directives in `convex/_generated/*.js`
  - _Requirements: 2.1, 2.2, 3.1_

- [ ] 27. Validate Phase 3 completion
  - Run `npm run lint` and verify 0 errors, minimal warnings
  - Run `npm run type-check` to ensure no TypeScript errors
  - Run `npm test` to ensure all tests pass
  - Document results in `.kiro/specs/eslint-compliance-fix/phase3-results.md`
  - _Requirements: All Phase 3 requirements_
  - **Target**: Reduce from ~200-300 warnings to <50 warnings

## Phase 4: Final Cleanup - Achieve Zero Warnings (~4 → 0 warnings)

- [ ] 28. Apply ESLint auto-fixes
  - Run `npm run lint:fix` to automatically fix remaining auto-fixable warnings
  - Review all auto-applied changes
  - Verify no functionality changes
  - _Requirements: 9.1, 9.2, 9.3, 9.4_

- [ ] 29. Final validation and documentation
  - Run `npm run lint` and verify 0 errors, 0 warnings
  - Run `npm run type-check` to ensure no TypeScript errors
  - Run `npm test` to ensure all tests pass
  - Run `npm run build` to verify production build succeeds
  - Document final results in `.kiro/specs/eslint-compliance-fix/final-results.md`
  - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_

- [ ] 30. Update CI/CD and development workflows
  - Verify ESLint runs in CI/CD pipeline with `--max-warnings 0`
  - Update pre-commit hooks to run ESLint checks
  - Document linting requirements in contributing guidelines
  - Create validation script for tracking lint progress
  - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_

## Implementation Priority

### High Priority (Complete First)

1. **Tasks 9-12**: Replace `any` types - These provide the most value for type safety
2. **Task 22**: Remove `@ts-nocheck` from useDownloads.ts - Critical for type checking
3. **Tasks 17-20**: Fix unused variables - Clean up dead code

### Medium Priority

4. **Tasks 14-15**: Replace `any` types in server code
5. **Task 21**: Fix TypeScript directive comments
6. **Task 23**: Fix React Hook dependency warnings

### Low Priority (Can be deferred)

7. **Task 24**: Fix unescaped entities - Cosmetic issue
8. **Task 25**: Fix react-refresh warnings - Development experience improvement
9. **Task 26**: Fix remaining test file issues
10. **Task 15b**: Migration scripts (archive code)

## Notes

- Each task should be completed and validated before moving to the next
- Run `npm run lint` after each file modification to track progress
- If tests fail after a fix, revert the specific file and investigate
- Preserve all existing functionality - only fix linting issues
- Use existing type definitions from `shared/types/` before creating new ones
- Focus on high-impact changes first (type safety over cosmetic fixes)

## Progress Tracking

- **Phase 1**: ✅ Complete (0 errors)
- **Phase 2**: 🔄 In Progress (2/8 tasks complete)
  - ✅ Task 8: Test mock types
  - ✅ Task 13: Client source files
  - ⏳ Tasks 9-12, 14-16: Remaining type safety work
- **Phase 3**: ⏳ Not Started (0/10 tasks complete)
- **Phase 4**: ⏳ Not Started (0/3 tasks complete)

**Current**: 671 warnings → **Target**: 0 warnings
