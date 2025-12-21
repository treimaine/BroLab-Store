# Implementation Plan: SonarQube Test Fixes

## Overview

Fix SonarQube warnings (S7764, S2004) and TypeScript errors in test files by replacing deprecated global references, fixing type definitions, and reducing function nesting.

## Tasks

- [x] 1. Fix test-types.ts WebSocket readyState type
  - Change readyState to use number type with number literals
  - Fix type assignments in MockWebSocket class
  - _Requirements: 3.3, 5.3_

- [x] 2. Fix dataSynchronizationManager.test.ts
  - [x] 2.1 Replace `global` with `globalThis` for setInterval
    - Update mock setInterval assignment
    - _Requirements: 1.2_
  - [x] 2.2 Import missing types from test-types.ts
    - Add imports for SyncOperation, IntegrityViolation, ConsistencyMetrics, IntegrityRule, TimedOperation
    - _Requirements: 3.1_
  - [x] 2.3 Extract deeply nested callbacks to reduce nesting
    - Refactor monitoring callback tests
    - _Requirements: 2.1, 2.2, 2.3_

- [x] 3. Fix enhanced-checkout-redirect.test.ts
  - [x] 3.1 Replace `global.fetch` with `globalThis.fetch`
    - Add proper type assertion for mock fetch
    - _Requirements: 1.1, 5.1_
  - [x] 3.2 Replace `window` with `globalThis` for sessionStorage
    - Update Object.defineProperty call
    - _Requirements: 1.3_
  - [x] 3.3 Fix mock sessionStorage return types
    - Ensure getItem returns string type
    - _Requirements: 5.2_
  - [x] 3.4 Remove unused variable `_updatedServices`
    - Clean up or use the variable
    - _Requirements: 4.1_

- [x] 4. Fix ReservationErrorHandling.test.tsx
  - [x] 4.1 Replace `global.fetch` with `globalThis.fetch`
    - Update all occurrences in beforeEach and tests
    - _Requirements: 1.1, 5.1_
  - [x] 4.2 Extract deeply nested callbacks to helper functions
    - Refactor waitFor callbacks
    - Refactor act callbacks
    - _Requirements: 2.1, 2.2, 2.3_
  - [x] 4.3 Fix unused variable `_error`
    - Remove or use the destructured error variable
    - _Requirements: 4.1_

- [x] 5. Checkpoint - Verify all fixes
  - Run `npm run type-check` to verify no TypeScript errors
  - Run affected tests to verify functionality preserved
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- All tasks involve modifying test files only, no production code changes
- Each fix should be verified with TypeScript compilation before moving to next
- The `_consoleSpy` variable with underscore prefix is intentionally unused (for suppression)
