# Design Document: ESLint Compliance Fix

## Overview

This design outlines a systematic approach to resolve 963 linting problems (32 errors, 931 warnings) across the BroLab Entertainment codebase. The solution prioritizes critical errors first, then addresses warnings in batches by category, ensuring type safety and code quality improvements without breaking existing functionality.

## Architecture

### Phased Approach

The fix will be executed in 4 phases to minimize risk and allow for incremental validation:

1. **Phase 1: Critical Errors** - Fix 32 ESLint errors that block builds
2. **Phase 2: Type Safety** - Replace all `any` types with proper TypeScript types
3. **Phase 3: Code Quality** - Fix unused variables, expressions, and structural issues
4. **Phase 4: Validation** - Apply auto-fixes and verify zero-warning compliance

### Priority Matrix

| Priority | Issue Type              | Count | Impact | Risk   |
| -------- | ----------------------- | ----- | ------ | ------ |
| P0       | `no-require-imports`    | ~20   | High   | Low    |
| P0       | `no-case-declarations`  | ~3    | High   | Low    |
| P0       | `no-useless-catch`      | ~5    | Medium | Low    |
| P0       | `no-unused-expressions` | ~1    | Medium | Low    |
| P0       | `no-empty-object-type`  | ~1    | Low    | Low    |
| P1       | `no-explicit-any`       | ~800  | High   | Medium |
| P2       | `no-unused-vars`        | ~100  | Medium | Low    |
| P3       | `ban-ts-comment`        | ~30   | Medium | Medium |
| P4       | Auto-fixable            | 4     | Low    | Low    |

## Components and Interfaces

### 1. Type Definition System

**Purpose**: Replace `any` types with proper TypeScript interfaces and types.

**Location**:

- Test files: `__tests__/**/*.test.ts(x)`
- Source files: `client/src/`, `server/`, `shared/`, `convex/`

**Pattern**:

```typescript
// Before (Bad)
function processData(data: any): any {
  return data.map((item: any) => item.value);
}

// After (Good)
interface DataItem {
  value: string;
  id: number;
}

function processData(data: DataItem[]): string[] {
  return data.map((item: DataItem) => item.value);
}
```

**Mock Type Pattern for Tests**:

```typescript
// Before
const mockFn = jest.fn() as any;

// After
const mockFn = jest.fn() as jest.MockedFunction<typeof originalFunction>;
```

### 2. Import Conversion System

**Purpose**: Convert CommonJS `require()` to ES6 `import` statements.

**Affected Files**:

- `__tests__/bpm-filter-server.test.ts`
- `__tests__/config-dashboard.test.ts`
- `__tests__/convex-integration-type-safety.test.ts`
- Multiple integration test files

**Pattern**:

```typescript
// Before (Bad)
const module = require("./module");
const { func } = require("./utils");

// After (Good)
import module from "./module";
import { func } from "./utils";

// For dynamic imports
const module = await import("./module");
```

### 3. Variable Cleanup System

**Purpose**: Handle unused variables and parameters according to ESLint rules.

**Patterns**:

**Unused Variables**:

```typescript
// Before
const result = await fetchData();
// result never used

// After - Option 1: Remove
await fetchData();

// After - Option 2: Use it
const result = await fetchData();
console.log("Fetched:", result);
```

**Unused Parameters**:

```typescript
// Before
function handler(req, res, next) {
  // next never used
}

// After - Option 1: Remove
function handler(req, res) {
  // ...
}

// After - Option 2: Prefix with underscore
function handler(req, res, _next) {
  // Indicates intentionally unused
}
```

**Unused Error Parameters**:

```typescript
// Before
try {
  await operation();
} catch (error) {
  // error not used
  return { success: false };
}

// After - Option 1: Use for logging
try {
  await operation();
} catch (error) {
  logger.error("Operation failed", { error });
  return { success: false };
}

// After - Option 2: Prefix if truly unused
try {
  await operation();
} catch (_error) {
  return { success: false };
}
```

### 4. Switch Case Scoping System

**Purpose**: Fix lexical declarations in switch case blocks.

**Affected Files**:

- `client/src/lib/errorTracker.ts`
- `server/routes/reservations.ts`

**Pattern**:

```typescript
// Before (Bad)
switch (type) {
  case "A":
    const value = getValue();
    process(value);
    break;
  case "B":
    const value = getOtherValue(); // Error: duplicate declaration
    break;
}

// After (Good)
switch (type) {
  case "A": {
    const value = getValue();
    process(value);
    break;
  }
  case "B": {
    const value = getOtherValue();
    break;
  }
}
```

### 5. Error Handling Optimization System

**Purpose**: Remove useless try-catch wrappers that only re-throw errors.

**Affected Files**:

- `client/src/lib/convexClient.ts` (5 instances)

**Pattern**:

```typescript
// Before (Bad - Useless)
async function fetchData() {
  try {
    return await api.getData();
  } catch (error) {
    throw error; // Just re-throwing, no value added
  }
}

// After (Good - Removed)
async function fetchData() {
  return await api.getData();
}

// Keep if adding value (Good)
async function fetchData() {
  try {
    return await api.getData();
  } catch (error) {
    logger.error("Failed to fetch data", { error });
    throw new Error("Data fetch failed", { cause: error });
  }
}
```

### 6. TypeScript Comment Directive System

**Purpose**: Replace suppression comments with proper error handling.

**Affected Files**:

- `client/src/components/ui/sonner.tsx`
- `client/src/lib/convexClient.ts`
- `client/src/pages/checkout.tsx`

**Pattern**:

```typescript
// Before (Bad)
// @ts-ignore
const value = dangerousOperation();

// After (Good - Fix the type error)
const value = dangerousOperation() as ExpectedType;

// Or if error is expected
// @ts-expect-error - Known issue with library types, see issue #123
const value = dangerousOperation();

// Before (Bad)
// @ts-nocheck

// After (Good - Remove and fix all type errors in file)
```

## Data Models

### Linting Issue Tracking

```typescript
interface LintingIssue {
  file: string;
  line: number;
  column: number;
  rule: string;
  severity: "error" | "warning";
  message: string;
  fixable: boolean;
}

interface FixProgress {
  phase: 1 | 2 | 3 | 4;
  totalIssues: number;
  fixedIssues: number;
  remainingIssues: number;
  filesModified: string[];
}
```

## Error Handling

### Validation Strategy

After each batch of fixes:

1. **Type Check**: Run `npm run type-check` to ensure no TypeScript errors
2. **Lint Check**: Run `npm run lint` to verify issue reduction
3. **Test Suite**: Run `npm test` to ensure no functionality broken
4. **Build Verification**: Run `npm run build` to ensure production build succeeds

### Rollback Strategy

If a batch of fixes causes test failures:

1. Identify the specific file causing issues
2. Revert that file only
3. Fix the underlying issue
4. Re-apply the linting fix with proper types/logic

### Risk Mitigation

- **Test Files First**: Start with test files (lower risk) before source files
- **Small Batches**: Fix 10-20 files at a time, validate between batches
- **Preserve Functionality**: Never change logic, only fix linting issues
- **Type Safety**: When replacing `any`, use proper types from existing interfaces

## Testing Strategy

### Pre-Fix Baseline

```bash
# Capture current state
npm run lint > .reports/lint-baseline.txt
npm run type-check > .reports/typecheck-baseline.txt
npm test > .reports/test-baseline.txt
```

### Per-Phase Validation

After each phase:

```bash
# Verify improvements
npm run lint 2>&1 | tee .reports/lint-phase-{N}.txt
npm run type-check
npm test

# Compare counts
# Phase 1: Should have 0 errors, ~931 warnings
# Phase 2: Should have 0 errors, ~131 warnings (800 any types fixed)
# Phase 3: Should have 0 errors, ~30 warnings
# Phase 4: Should have 0 errors, 0 warnings
```

### Automated Validation

Create a validation script:

```typescript
// scripts/validate-lint-progress.ts
import { execSync } from "child_process";

interface LintStats {
  errors: number;
  warnings: number;
  files: number;
}

function getLintStats(): LintStats {
  const output = execSync("npm run lint 2>&1", { encoding: "utf-8" });
  const match = output.match(/(\d+) problems \((\d+) errors, (\d+) warnings\)/);

  if (!match) return { errors: 0, warnings: 0, files: 0 };

  return {
    errors: parseInt(match[2]),
    warnings: parseInt(match[3]),
    files: 0, // Parse from output
  };
}

function validatePhase(phase: number, expectedErrors: number, maxWarnings: number): void {
  const stats = getLintStats();

  if (stats.errors > expectedErrors) {
    throw new Error(`Phase ${phase} failed: ${stats.errors} errors (expected ${expectedErrors})`);
  }

  if (stats.warnings > maxWarnings) {
    throw new Error(`Phase ${phase} failed: ${stats.warnings} warnings (max ${maxWarnings})`);
  }

  console.log(`✅ Phase ${phase} validation passed`);
}
```

## Implementation Phases

### Phase 1: Critical Errors (Priority P0)

**Goal**: Reduce errors from 32 to 0

**Files to Fix**:

1. Convert all `require()` to `import` (~20 files)
2. Add block scopes to switch cases (~3 files)
3. Remove useless try-catch blocks (~5 files)
4. Fix unused expressions (~1 file)
5. Replace empty interfaces (~1 file)

**Validation**: `npm run lint` should show 0 errors, ~931 warnings

### Phase 2: Type Safety (Priority P1)

**Goal**: Reduce warnings from ~931 to ~131

**Strategy**:

1. **Test Files First** (~600 warnings)
   - Replace mock `any` types with proper jest types
   - Define interfaces for test data
   - Use `unknown` with type guards where needed

2. **Source Files** (~200 warnings)
   - Review existing type definitions in `shared/types/`
   - Create new interfaces where needed
   - Replace `any` with proper types

**Validation**: `npm run lint` should show 0 errors, ~131 warnings

### Phase 3: Code Quality (Priority P2-P3)

**Goal**: Reduce warnings from ~131 to ~4

**Tasks**:

1. Fix unused variables (~100 warnings)
   - Remove truly unused variables
   - Prefix intentionally unused with `_`
   - Use error parameters for logging

2. Replace TypeScript comment directives (~30 warnings)
   - Fix underlying type errors
   - Replace `@ts-ignore` with `@ts-expect-error`
   - Remove `@ts-nocheck` and fix errors

**Validation**: `npm run lint` should show 0 errors, ~4 warnings

### Phase 4: Final Cleanup (Priority P4)

**Goal**: Achieve zero warnings

**Tasks**:

1. Run `npm run lint:fix` to auto-fix remaining 4 warnings
2. Manual review of all changes
3. Final validation suite

**Validation**: `npm run lint` should show 0 errors, 0 warnings

## File Organization

### Modified Files Tracking

Create a log file to track all modifications:

```
.kiro/specs/eslint-compliance-fix/modified-files.md

# Phase 1: Critical Errors
- [x] __tests__/bpm-filter-server.test.ts - Convert require to import
- [x] __tests__/config-dashboard.test.ts - Convert require to import
- [x] client/src/lib/errorTracker.ts - Add case block scopes
...

# Phase 2: Type Safety
- [x] __tests__/analytics-system.test.ts - Replace any types
- [x] __tests__/connection-manager.test.ts - Replace any types
...
```

## Success Criteria

1. ✅ Zero ESLint errors
2. ✅ Zero ESLint warnings
3. ✅ All tests passing
4. ✅ TypeScript strict mode compliance
5. ✅ Production build succeeds
6. ✅ No functionality regressions
7. ✅ CI/CD pipeline passes with `--max-warnings 0`

## Maintenance Plan

### Preventing Future Violations

1. **Pre-commit Hooks**: Add ESLint check to git pre-commit hook
2. **CI/CD Enforcement**: Fail builds on any linting issues
3. **IDE Configuration**: Ensure all developers have ESLint enabled
4. **Code Review**: Require lint-free code before PR approval
5. **Documentation**: Update contributing guidelines with linting requirements
