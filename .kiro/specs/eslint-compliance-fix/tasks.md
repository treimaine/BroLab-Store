# Implementation Plan: ESLint Compliance Fix

## Current Status

- **Total Issues**: 865 (2 errors, 863 warnings)
- **Phase 1 Progress**: 30 of 32 errors fixed (93.75% complete)
- **Remaining Critical Errors**: 2 parsing errors (shebang placement)
  - `scripts/audit_repo.ts` - Shebang on line 4 instead of line 1
  - `scripts/test_mail.ts` - Shebang on line 3 instead of line 1

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

- [ ] 6. Fix remaining Phase 1 critical errors (2 parsing errors)
  - Move shebang to line 1 in `scripts/audit_repo.ts` (currently on line 4)
  - Move shebang to line 1 in `scripts/test_mail.ts` (currently on line 3)
  - _Requirements: 2.1, 2.2, 2.3, 2.4_

- [ ] 7. Validate Phase 1 completion
  - Run `npm run lint` and verify 0 errors, ~863 warnings
  - Run `npm run type-check` to ensure no TypeScript errors
  - Run `npm test` to ensure all tests pass
  - Document results in `.kiro/specs/eslint-compliance-fix/phase1-results.md`
  - _Requirements: All Phase 1 requirements_

## Phase 2: Type Safety - Replace `any` Types (~863 → ~131 warnings)

- [ ] 8. Replace `any` types in test mock functions
  - Define proper jest mock types for all test mocks
  - Use `jest.MockedFunction<typeof fn>` pattern
  - Replace generic `any` mocks with typed mocks
  - Files: `__tests__/analytics-system.test.ts`, `__tests__/api-stripe-webhook.test.ts`, `__tests__/api-subscription.test.ts`, `__tests__/cache-manager.test.ts`, `__tests__/cliPort.test.ts`
  - _Requirements: 1.1, 1.2, 1.3_

- [ ] 9. Replace `any` types in connection manager tests
  - Create proper interfaces for connection manager test data
  - Define typed mock objects for WebSocket and polling tests
  - Files: `__tests__/connection-manager-basic.test.ts`, `__tests__/connection-manager.test.ts`
  - _Requirements: 1.1, 1.2, 1.3_

- [ ] 10. Replace `any` types in component tests
  - Define proper prop interfaces for test components
  - Create typed mock data for component rendering tests
  - Files: `__tests__/components/file-upload-error-handling.test.tsx`, `__tests__/integration/*.test.tsx`
  - _Requirements: 1.1, 1.2, 1.3_

- [ ] 11. Replace `any` types in Convex and database tests
  - Use proper Convex types from generated schema
  - Define interfaces for database query results
  - Files: `__tests__/convex-functions.test.ts`, `__tests__/dataConsistencyManager.test.ts`, `__tests__/dataSynchronizationManager.test.ts`
  - _Requirements: 1.1, 1.2, 1.3_

- [ ] 12. Replace `any` types in service and utility tests
  - Create proper interfaces for service method parameters and returns
  - Define typed mock responses for external API calls
  - Files: `__tests__/services/*.test.ts`, `__tests__/utils/*.test.ts`
  - _Requirements: 1.1, 1.2, 1.3_

- [ ] 13. Replace `any` types in client source files
  - Review and use existing types from `shared/types/`
  - Create new interfaces in appropriate type files
  - Files: `client/src/components/**/*.tsx`, `client/src/hooks/**/*.ts`, `client/src/services/**/*.ts`
  - _Requirements: 1.1, 1.3, 1.4_

- [ ] 14. Replace `any` types in server source files
  - Define proper Express request/response types
  - Create interfaces for API payloads and responses
  - Files: `server/routes/**/*.ts`, `server/services/**/*.ts`, `server/middleware/**/*.ts`
  - _Requirements: 1.1, 1.3, 1.4_

- [ ] 15. Replace `any` types in shared utilities
  - Define proper types for utility function parameters
  - Use generic types where appropriate for reusable utilities
  - Files: `shared/utils/analytics-manager.ts`, `shared/utils/cache-manager.ts`, `shared/types/dashboard.ts`
  - _Requirements: 1.1, 1.3, 1.4, 1.5_

- [ ] 16. Validate Phase 2 completion
  - Run `npm run lint` and verify 0 errors, ~131 warnings
  - Run `npm run type-check` to ensure no TypeScript errors
  - Run `npm test` to ensure all tests pass
  - Document results in `.kiro/specs/eslint-compliance-fix/phase2-results.md`
  - _Requirements: All Phase 2 requirements_

## Phase 3: Code Quality - Fix Unused Variables and Comments (~131 → ~4 warnings)

- [ ] 17. Fix unused variables in test files
  - Remove truly unused variables
  - Prefix intentionally unused variables with underscore
  - Use error parameters for logging where appropriate
  - Files: `__tests__/all-filters-server.test.ts`, `__tests__/api-stripe-webhook.test.ts`, `__tests__/api-subscription.test.ts`, `__tests__/cliPort.test.ts`, `__tests__/components/*.test.tsx`
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [ ] 18. Fix unused error parameters in catch blocks
  - Add error logging where errors are caught but not used
  - Prefix with underscore if error truly doesn't need handling
  - Files: `__tests__/components/ReservationErrorHandling.test.tsx`, `client/src/components/errors/*.tsx`, `client/src/pages/*.tsx`, `server/routes/*.ts`
  - _Requirements: 3.1, 3.2, 3.3_

- [ ] 19. Fix unused function parameters
  - Remove unused parameters if not required by interface
  - Prefix with underscore if required by interface but not used
  - Files: `__tests__/connection-manager-basic.test.ts`, `client/src/components/errors/EnhancedErrorHandling.tsx`, `server/middleware/*.ts`
  - _Requirements: 3.1, 3.4_

- [ ] 20. Fix unused assigned variables in source files
  - Remove assignments that are never read
  - Use the variables appropriately or remove them
  - Files: `client/src/components/errors/EnhancedErrorHandling.tsx`, `shared/utils/analytics-manager.ts`, `shared/utils/cache-manager.ts`, `shared/validation/sync.ts`
  - _Requirements: 3.1, 3.5_

- [ ] 21. Replace @ts-ignore with @ts-expect-error
  - Add explanatory comments for each expected error
  - Fix underlying type errors where possible
  - Files: `client/src/components/ui/sonner.tsx`, `client/src/pages/checkout.tsx`
  - _Requirements: 8.1, 8.2, 8.5_

- [ ] 22. Remove @ts-nocheck directives
  - Fix all type errors in files with @ts-nocheck
  - Remove the directive once all errors are resolved
  - Files: `client/src/lib/convexClient.ts`
  - _Requirements: 8.1, 8.3, 8.4_

- [ ] 23. Validate Phase 3 completion
  - Run `npm run lint` and verify 0 errors, ~4 warnings
  - Run `npm run type-check` to ensure no TypeScript errors
  - Run `npm test` to ensure all tests pass
  - Document results in `.kiro/specs/eslint-compliance-fix/phase3-results.md`
  - _Requirements: All Phase 3 requirements_

## Phase 4: Final Cleanup - Achieve Zero Warnings (~4 → 0 warnings)

- [ ] 24. Apply ESLint auto-fixes
  - Run `npm run lint:fix` to automatically fix remaining 4 warnings
  - Review all auto-applied changes
  - Verify no functionality changes
  - _Requirements: 9.1, 9.2, 9.3, 9.4_

- [ ] 25. Final validation and documentation
  - Run `npm run lint` and verify 0 errors, 0 warnings
  - Run `npm run type-check` to ensure no TypeScript errors
  - Run `npm test` to ensure all tests pass
  - Run `npm run build` to verify production build succeeds
  - Document final results in `.kiro/specs/eslint-compliance-fix/final-results.md`
  - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_

- [ ] 26. Update CI/CD and development workflows
  - Verify ESLint runs in CI/CD pipeline with `--max-warnings 0`
  - Update pre-commit hooks to run ESLint checks
  - Document linting requirements in contributing guidelines
  - Create validation script for tracking lint progress
  - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_

## Notes

- Each task should be completed and validated before moving to the next
- Run `npm run lint` after each file modification to track progress
- If tests fail after a fix, revert the specific file and investigate
- Preserve all existing functionality - only fix linting issues
- Use existing type definitions from `shared/types/` before creating new ones
