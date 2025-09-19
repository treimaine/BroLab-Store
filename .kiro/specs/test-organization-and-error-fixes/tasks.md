# Implementation Plan

- [x] 1. Move misplaced test files to **tests** directory
  - Move `shared/utils/__tests__/syncManager.test.ts` to `__tests__/shared/utils/syncManager.test.ts`
  - Move `server/__tests__/webhookValidator.test.ts` to `__tests__/server/webhookValidator.test.ts`
  - Move `server/__tests__/webhookSecurity.test.ts` to `__tests__/server/webhookSecurity.test.ts`
  - Move `server/__tests__/reservations.test.ts` to `__tests__/server/reservations.test.ts`
  - Update import paths in moved test files to reflect new locations
  - _Requirements: 1.1, 1.2, 1.3_

- [ ] 2. Fix TypeScript compilation errors in convex/orders.ts
  - Fix order object type issues in `markOrderFromWebhook` function - add proper type annotation for order variable
  - Ensure order properties (\_id, notes, userId, paymentIntentId) are properly typed
  - _Requirements: 2.1, 2.2, 2.5_

- [ ] 2.1 Fix TypeScript compilation errors in server/lib/dataConsistencyManager.ts
  - Fix Convex function reference type casting in `getAllResources` method
  - Use proper Convex API types instead of string casting
  - _Requirements: 2.1, 2.2, 2.5_

- [ ] 3. Fix Jest configuration for import.meta environment variables
  - Fix import.meta.env handling in Jest configuration to support Vite environment variables
  - Add proper module transformation for client-side code in Jest
  - Update Jest configuration to handle ES modules and Vite-specific syntax
  - _Requirements: 3.1, 3.2, 3.3_

- [ ] 3.1 Fix React hook test provider setup
  - Fix QueryClient and Convex provider setup in `__tests__/hooks/useFavorites.test.tsx`
  - Fix test wrapper configuration in `__tests__/hooks/useUserProfile.test.tsx`
  - Fix cache hook test provider setup in `__tests__/hooks/useCache.test.tsx`
  - _Requirements: 3.1, 3.2, 3.3_

- [ ] 4. Fix Convex mock setup in rate limiter tests
  - Fix Convex client mock configuration in `__tests__/rate-limiter.test.ts` to properly mock mutation and query methods
  - Fix mockConvex object initialization and method mocking
  - Update test setup to properly initialize Convex client mocks
  - _Requirements: 2.1, 2.2, 3.1_

- [ ] 5. Fix service order API test authentication
  - Fix authentication setup in `__tests__/api-service-orders.test.ts` to properly authenticate test requests
  - Update test authentication middleware to handle test scenarios
  - Fix service order validation and error handling in tests
  - _Requirements: 2.1, 2.2, 3.1_

- [ ] 5.1 Fix data consistency manager test function references
  - Fix function name mismatches in `__tests__/dataConsistencyManager.test.ts` (data:update vs dataConsistency:update)
  - Update test expectations to match actual Convex function names
  - Fix pre-sync check error handling in `__tests__/dataSynchronizationManager.test.ts`
  - _Requirements: 2.1, 2.2, 3.1_

- [ ] 5.2 Fix enhanced error tracking test metrics
  - Fix error resolution metrics tracking in `__tests__/enhanced-error-tracking.test.ts`
  - Fix error statistics calculation and test expectations
  - Update error boundary manager test setup
  - _Requirements: 2.1, 2.2, 3.1_

- [ ] 6. Validate test organization and compilation success
  - Run TypeScript compilation to verify all errors are resolved
  - Run test suite to ensure all tests pass after fixes
  - Verify that all moved test files are discoverable by Jest
  - _Requirements: 3.1, 3.2, 3.3, 3.4_
