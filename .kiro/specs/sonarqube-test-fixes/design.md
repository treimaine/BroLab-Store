# Design Document: SonarQube Test Fixes

## Overview

This design document outlines the approach to fix SonarQube warnings and TypeScript errors in the test files. The fixes involve replacing deprecated global references, reducing function nesting, fixing type definitions, and cleaning up unused code.

## Architecture

The changes are localized to test files and test type definitions. No changes to production code are required.

### Files to Modify

1. `__tests__/dataSynchronizationManager.test.ts` - 9+ issues
2. `__tests__/enhanced-checkout-redirect.test.ts` - 6 issues
3. `__tests__/components/ReservationErrorHandling.test.tsx` - 8 issues
4. `__tests__/types/test-types.ts` - 4 issues

## Components and Interfaces

### Type Definitions to Add/Fix

The following types need to be properly exported from `__tests__/types/test-types.ts`:

```typescript
// Already defined but need to be imported in test files:
-SyncOperation - IntegrityViolation - ConsistencyMetrics - IntegrityRule - TimedOperation;
```

### MockWebSocketInstance Interface Fix

The `readyState` property needs to use `number` type instead of literal `0`:

```typescript
export interface MockWebSocketInstance {
  readyState: number; // Changed from implicit 0 to number
  // ... rest of interface
}
```

## Data Models

No data model changes required - this is a test infrastructure fix.

## Correctness Properties

_A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees._

Since all acceptance criteria are testable as examples (specific code transformations), the correctness is verified through:

1. **TypeScript Compilation**: All files must compile without errors
2. **SonarQube Analysis**: No S7764 (globalThis) or S2004 (nesting) warnings
3. **Test Execution**: All existing tests must continue to pass

**Property 1: Code Compiles Without Errors**
_For any_ modified test file, running `tsc --noEmit` SHALL produce zero errors.
**Validates: Requirements 3.1, 3.2, 3.3, 5.1, 5.2, 5.3**

**Property 2: No SonarQube Warnings**
_For any_ modified test file, SonarQube analysis SHALL report zero S7764 and S2004 warnings.
**Validates: Requirements 1.1, 1.2, 1.3, 2.1, 2.2, 2.3**

**Property 3: Tests Pass**
_For any_ modified test file, running `npm test` SHALL result in all tests passing.
**Validates: Requirements 2.2, 4.1, 4.2**

## Error Handling

No error handling changes required - this is a code quality fix.

## Testing Strategy

### Verification Approach

1. **Pre-fix**: Run `npm run type-check` to document current errors
2. **Post-fix**: Run `npm run type-check` to verify zero errors
3. **Post-fix**: Run affected tests to verify functionality preserved
4. **Post-fix**: Verify SonarQube warnings are resolved

### Test Commands

```bash
# Type checking
npm run type-check

# Run specific test files
npm test -- __tests__/dataSynchronizationManager.test.ts
npm test -- __tests__/enhanced-checkout-redirect.test.ts
npm test -- __tests__/components/ReservationErrorHandling.test.tsx
```

## Implementation Details

### Fix 1: Replace `global` with `globalThis`

**Before:**

```typescript
global.fetch = jest.fn();
global.setInterval = mockSetInterval;
```

**After:**

```typescript
globalThis.fetch = jest.fn() as jest.MockedFunction<typeof fetch>;
globalThis.setInterval = mockSetInterval as unknown as typeof setInterval;
```

### Fix 2: Replace `window` with `globalThis`

**Before:**

```typescript
Object.defineProperty(window, "sessionStorage", { value: mockSessionStorage });
```

**After:**

```typescript
Object.defineProperty(globalThis, "sessionStorage", { value: mockSessionStorage });
```

### Fix 3: Fix WebSocket readyState Type

**Before:**

```typescript
export interface MockWebSocketInstance {
  readyState: number;  // But assigned WebSocket.CONNECTING (0)
}

// In class:
public readyState = WebSocket.CONNECTING;  // Type error: 0 not assignable to number
```

**After:**

```typescript
export interface MockWebSocketInstance {
  readyState: number;
}

// In class - use number literals:
public readyState: number = 0;  // CONNECTING
// Later: this.readyState = 1;  // OPEN
// Later: this.readyState = 3;  // CLOSED
```

### Fix 4: Import Missing Types

Add imports to `dataSynchronizationManager.test.ts`:

```typescript
import {
  SyncOperation,
  IntegrityViolation,
  ConsistencyMetrics,
  IntegrityRule,
  TimedOperation,
} from "./types/test-types";
```

### Fix 5: Fix Mock Fetch Type

**Before:**

```typescript
global.fetch = jest.fn();
```

**After:**

```typescript
globalThis.fetch = jest.fn() as jest.MockedFunction<typeof fetch>;
```

### Fix 6: Reduce Nesting in Callbacks

Extract deeply nested callbacks into helper functions:

**Before:**

```typescript
await waitFor(
  () => {
    const isSubmitting = screen.getByTestId("is-submitting").textContent;
    const hasError = screen.getByTestId("has-error").textContent;
    expect(isSubmitting === "false" || hasError === "true").toBe(true);
  },
  { timeout: 5000 }
);
```

**After:**

```typescript
const verifySubmissionComplete = (): void => {
  const isSubmitting = screen.getByTestId("is-submitting").textContent;
  const hasError = screen.getByTestId("has-error").textContent;
  expect(isSubmitting === "false" || hasError === "true").toBe(true);
};

await waitFor(verifySubmissionComplete, { timeout: 5000 });
```

### Fix 7: Remove/Fix Unused Variables

- Remove `_updatedServices` or use it
- Keep `_consoleSpy` with underscore prefix (intentionally unused for suppression)
- Remove `_error` or use it
