# Design Document

## Overview

This design addresses five critical infrastructure issues that prevent reliable testing and cause false positives in production validation. The solution implements environment-aware validation, expands the DataValidationService API, adds lazy initialization for Convex, creates import path compatibility layers, and strengthens PollingConnection error handling.

## Architecture

### High-Level Design

```
┌─────────────────────────────────────────────────────────────┐
│                    Application Layer                         │
├─────────────────────────────────────────────────────────────┤
│  Tests  │  Components  │  Services  │  Convex Functions     │
└────┬────┴──────┬───────┴─────┬──────┴──────────┬───────────┘
     │           │             │                  │
     ▼           ▼             ▼                  ▼
┌─────────────────────────────────────────────────────────────┐
│              Enhanced Infrastructure Layer                   │
├─────────────────────────────────────────────────────────────┤
│  • Environment-Aware ConsistencyChecker                     │
│  • Extended DataValidationService API                       │
│  • Lazy Convex Client Initialization                        │
│  • Import Path Compatibility Layer                          │
│  • Robust PollingConnection Error Handling                  │
└─────────────────────────────────────────────────────────────┘
```

### Design Principles

1. **Environment Awareness**: Validation logic adapts to test vs. production contexts
2. **Graceful Degradation**: Services initialize successfully even with missing configuration
3. **Backward Compatibility**: Legacy import paths continue to work during migration
4. **Fail-Fast with Context**: Errors occur at usage time with descriptive messages
5. **Zero Breaking Changes**: Existing functionality remains intact

## Components and Interfaces

### 1. Environment-Aware ConsistencyChecker

**Location**: `server/services/ConsistencyChecker.ts` (or equivalent)

**Interface Changes**:

```typescript
interface ConsistencyCheckOptions {
  skipTimeBasedValidations?: boolean;
  skipHashValidation?: boolean;
  environment?: "test" | "development" | "production";
  allowTestHashes?: boolean;
}

interface ConsistencyChecker {
  validate(data: DashboardData, options?: ConsistencyCheckOptions): ValidationResult;
}
```

**Implementation Strategy**:

1. Add optional configuration parameter to validation methods
2. Detect test environment via `NODE_ENV` or explicit option
3. Skip monthly statistics validation when `skipTimeBasedValidations` is true
4. Accept test hash values (e.g., "test-hash") when `allowTestHashes` is true
5. Provide factory method for test-friendly checker instances

**Validation Logic**:

```typescript
// Production mode: Full validation
if (options.environment === "production") {
  validateMonthlyOrders();
  validateMonthlyDownloads();
  validateDataHash();
}

// Test mode: Structural validation only
if (options.environment === "test") {
  validateStructure();
  validateCrossFieldConsistency();
  // Skip time-based and hash validations
}
```

### 2. Extended DataValidationService API

**Location**: `server/services/DataValidationService.ts`

**New Public Methods**:

```typescript
class DataValidationService {
  // Existing methods...

  /**
   * Validates a single Convex ID format
   * @param id - The ID string to validate
   * @returns Validation result with success flag and error details
   */
  public validateConvexId(id: string): ValidationResult {
    return this.sourceValidator.validateConvexId(id);
  }

  /**
   * Validates all Convex IDs in a data structure
   * @param data - Object containing ID fields
   * @returns Validation result with list of invalid IDs
   */
  public validateAllIds(data: Record<string, any>): ValidationResult {
    return this.sourceValidator.validateAllIds(data);
  }

  /**
   * Validates data structure integrity
   * @param data - Data object to validate
   * @returns Validation result with anomalies
   */
  public validateDataIds(data: any): ValidationResult {
    return this.sourceValidator.validateDataIds(data);
  }
}
```

**Integration with SourceValidator**:

- DataValidationService maintains reference to SourceValidator instance
- Public methods delegate to SourceValidator while adding logging/metrics
- Preserve existing internal validation logic
- Add JSDoc documentation for all public methods

### 3. Lazy Convex Client Initialization

**Location**: `server/lib/convex.ts`

**Current Problem**:

```typescript
// Fails immediately on import
if (!process.env.VITE_CONVEX_URL) {
  throw new Error("VITE_CONVEX_URL is required");
}
export const convex = new ConvexHttpClient(process.env.VITE_CONVEX_URL);
```

**New Implementation**:

```typescript
let convexClient: ConvexHttpClient | null = null;
let initializationError: Error | null = null;

function getConvexClient(): ConvexHttpClient {
  // Return existing client if already initialized
  if (convexClient) return convexClient;

  // Throw cached error if initialization previously failed
  if (initializationError) throw initializationError;

  // Test environment: return mock client
  if (process.env.NODE_ENV === "test") {
    return createMockConvexClient();
  }

  // Production: validate configuration and initialize
  const url = process.env.VITE_CONVEX_URL;
  if (!url) {
    initializationError = new Error("VITE_CONVEX_URL is required. Set it in your .env file.");
    throw initializationError;
  }

  try {
    convexClient = new ConvexHttpClient(url);
    return convexClient;
  } catch (error) {
    initializationError = error as Error;
    throw initializationError;
  }
}

// Export getter function instead of direct client
export const getConvex = getConvexClient;

// For backward compatibility, export lazy-initialized client
export const convex = new Proxy({} as ConvexHttpClient, {
  get(target, prop) {
    const client = getConvexClient();
    return client[prop as keyof ConvexHttpClient];
  },
});
```

**Mock Client for Tests**:

```typescript
function createMockConvexClient(): ConvexHttpClient {
  return {
    query: jest.fn().mockResolvedValue(null),
    mutation: jest.fn().mockResolvedValue(null),
    action: jest.fn().mockResolvedValue(null),
  } as any;
}
```

### 4. Import Path Compatibility Layer

**Strategy**: Create re-export files at legacy paths

**File Structure**:

```
client/src/
  components/
    ReservationErrorBoundary.tsx  # Re-export
    kokonutui/
      file-upload.tsx              # Re-export
  store/
    useDashboardStore.ts           # Re-export
```

**Re-export Implementation**:

```typescript
// client/src/components/ReservationErrorBoundary.tsx
export { default } from "./reservations/ReservationErrorBoundary";
export * from "./reservations/ReservationErrorBoundary";

// client/src/components/kokonutui/file-upload.tsx
export { default } from "../ui/file-upload";
export * from "../ui/file-upload";

// client/src/store/useDashboardStore.ts
export { default } from "../stores/useDashboardStore";
export * from "../stores/useDashboardStore";
```

**Jest Configuration Update**:

```javascript
// jest.config.cjs
module.exports = {
  moduleNameMapper: {
    "^@/components/ReservationErrorBoundary$":
      "<rootDir>/client/src/components/reservations/ReservationErrorBoundary",
    "^@/components/kokonutui/(.*)$": "<rootDir>/client/src/components/ui/$1",
    "^@/store/(.*)$": "<rootDir>/client/src/stores/$1",
    // Existing mappings...
  },
};
```

### 5. Robust PollingConnection Error Handling

**Location**: `client/src/services/PollingConnection.ts` (or equivalent)

**Current Problem**:

```typescript
async send(request: Request): Promise<Response> {
  const response = await fetch(this.url, { /* ... */ });
  if (!response.ok) {  // TypeError if response is undefined
    throw new Error('Request failed');
  }
  return response;
}
```

**Enhanced Implementation**:

```typescript
class PollingConnection {
  private isActive: boolean = false;

  async connect(): Promise<void> {
    this.isActive = true;
    // Connection logic...
  }

  async send(request: Request): Promise<Response> {
    // Validate connection state
    if (!this.isActive) {
      throw new Error(
        "PollingConnection: Cannot send request on inactive connection. " + "Call connect() first."
      );
    }

    let response: Response | undefined;

    try {
      response = await fetch(this.url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(request),
        signal: this.abortController.signal,
      });
    } catch (error) {
      // Network error or abort
      throw new Error(
        `PollingConnection: Request failed - ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }

    // Validate response exists
    if (!response || typeof response !== "object") {
      throw new Error("PollingConnection: Invalid response received from server");
    }

    // Check response status
    if (!response.ok) {
      const errorText = await response.text().catch(() => "Unknown error");
      throw new Error(
        `PollingConnection: Request failed with status ${response.status} - ${errorText}`
      );
    }

    return response;
  }

  disconnect(): void {
    this.isActive = false;
    this.abortController.abort();
  }
}
```

**Error Handling Flow**:

```
send() called
    ↓
Check isActive → NO → Throw "inactive connection" error
    ↓ YES
Execute fetch()
    ↓
Catch network errors → Throw descriptive error
    ↓
Validate response exists → NO → Throw "invalid response" error
    ↓ YES
Check response.ok → NO → Throw status error with details
    ↓ YES
Return response
```

## Data Models

### ValidationResult

```typescript
interface ValidationResult {
  success: boolean;
  errors?: ValidationError[];
  warnings?: ValidationWarning[];
  metadata?: {
    environment: string;
    timestamp: number;
    validationsSkipped?: string[];
  };
}

interface ValidationError {
  field: string;
  message: string;
  code: string;
  severity: "error" | "warning";
}
```

### ConsistencyCheckResult

```typescript
interface ConsistencyCheckResult {
  isConsistent: boolean;
  anomalies: Anomaly[];
  checksPerformed: string[];
  checksSkipped: string[];
  environment: "test" | "development" | "production";
}
```

## Error Handling

### Error Categories

1. **Configuration Errors**: Missing environment variables (Convex URL)
   - Thrown at usage time, not import time
   - Include setup instructions in error message

2. **Validation Errors**: Invalid data structures or IDs
   - Return structured ValidationResult
   - Include field-level error details

3. **Network Errors**: Failed HTTP requests in PollingConnection
   - Wrap fetch errors with context
   - Include status codes and response text

4. **State Errors**: Operations on inactive connections
   - Fail fast with clear state requirements
   - Suggest corrective action (call connect())

### Error Message Standards

```typescript
// Good: Descriptive with context and solution
throw new Error(
  "VITE_CONVEX_URL is required. Add it to your .env file:\n" +
    "VITE_CONVEX_URL=https://your-deployment.convex.cloud"
);

// Bad: Vague without context
throw new Error("Missing configuration");
```

## Testing Strategy

### Unit Tests

1. **ConsistencyChecker**:
   - Test with `environment: 'test'` option
   - Verify time-based validations are skipped
   - Confirm test hashes are accepted
   - Validate structural checks still run

2. **DataValidationService**:
   - Test new public methods (validateConvexId, validateAllIds)
   - Verify delegation to SourceValidator
   - Test with valid and invalid Convex IDs

3. **Convex Initialization**:
   - Test lazy initialization in test environment
   - Verify error thrown on first use without config
   - Test mock client functionality

4. **PollingConnection**:
   - Test error handling for inactive connections
   - Mock fetch to return undefined/null
   - Verify descriptive error messages

### Integration Tests

1. Import server modules in test environment without Convex URL
2. Run full test suite with new import paths
3. Validate consistency checks on production-like data
4. Test PollingConnection with real network conditions

### Test Fixtures

```typescript
// Test-friendly dashboard data
export const testDashboardData = {
  totalDownloads: 10,
  totalOrders: 5,
  monthlyDownloads: 3, // Static value, not time-based
  monthlyOrders: 2, // Static value, not time-based
  dataHash: "test-hash", // Recognized test hash
  // ... other fields
};

// Consistency checker for tests
export const testConsistencyChecker = new ConsistencyChecker({
  environment: "test",
  skipTimeBasedValidations: true,
  allowTestHashes: true,
});
```

## Migration Plan

### Phase 1: Non-Breaking Additions (Safe to deploy)

1. Add optional parameters to ConsistencyChecker
2. Add public methods to DataValidationService
3. Create re-export files for import compatibility
4. Update Jest moduleNameMapper

### Phase 2: Convex Lazy Initialization (Requires testing)

1. Implement lazy initialization in server/lib/convex.ts
2. Update all imports to use getter function
3. Add mock client for test environment
4. Test in development environment

### Phase 3: PollingConnection Hardening (Low risk)

1. Add connection state validation
2. Enhance error handling with null checks
3. Improve error messages
4. Add integration tests

### Phase 4: Test Updates (Validation)

1. Update tests to use new ConsistencyChecker options
2. Update tests to use DataValidationService public API
3. Remove workarounds for import path issues
4. Verify all tests pass

## Performance Considerations

- **Lazy Initialization**: Minimal overhead, only initializes on first use
- **Re-export Files**: No runtime cost, resolved at build time
- **Validation Options**: Negligible performance impact, simple boolean checks
- **Error Handling**: Additional checks add <1ms per request

## Security Considerations

- **Environment Detection**: Use NODE_ENV, not user-controlled input
- **Error Messages**: Don't expose sensitive configuration in production errors
- **Mock Client**: Only available in test environment, never in production
- **Validation Bypass**: Test mode only enabled via environment variable

## Backward Compatibility

All changes are backward compatible:

- Existing ConsistencyChecker calls work without options
- DataValidationService adds methods, doesn't remove any
- Convex client maintains same interface via Proxy
- Legacy import paths continue to work via re-exports
- PollingConnection maintains existing public API
