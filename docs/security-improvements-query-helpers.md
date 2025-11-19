# Security Improvements - Query Helpers

## Overview

This document describes the security improvements implemented in `client/src/utils/queryHelpers.ts` based on the security audit recommendations.

## Improvements Implemented

### 1. Safer Global Query Function

**Problem**: Query keys could contain malformed URLs or path traversal attempts.

**Solution**: Implemented `validateQueryKey()` function that:

- Validates query keys are arrays
- Ensures all parts are strings or numbers
- Detects path traversal attempts (`..`, `//`)
- Throws `TypeError` for invalid keys

```typescript
function validateQueryKey(queryKey: unknown): string[] {
  if (!Array.isArray(queryKey)) {
    throw new TypeError("Query key must be an array");
  }

  for (const part of validatedKey) {
    if (part.includes("..") || part.includes("//")) {
      throw new TypeError("Invalid query key: path traversal detected");
    }
  }

  return validatedKey;
}
```

### 2. Credential Handling in Fetch Helpers

**Problem**: All API helpers defaulted to `credentials: "include"`, causing unnecessary cookie sends and cross-site leakage for public data.

**Solution**: Implemented automatic credential handling based on origin:

- Same-origin requests: `credentials: "include"`
- Cross-origin requests: `credentials: "omit"`

```typescript
function createFetchOptions(url: string, options: RequestInit): RequestInit {
  const requestUrl = new URL(url, globalThis.location.origin);
  const isSameOrigin = requestUrl.origin === globalThis.location.origin;

  return {
    ...options,
    credentials: isSameOrigin ? "include" : "omit",
  };
}
```

### 3. Retry Logic with Circuit Breaking

**Problem**: `enhancedApiRequest` retries any non-4xx error with exponential backoff, causing long UI stalls on network aborts or persistent failures.

**Solution**: Implemented circuit breaker pattern:

- Tracks failures per endpoint
- Opens circuit after 5 consecutive failures
- Prevents requests for 30 seconds when open
- Resets on successful request

```typescript
const CIRCUIT_BREAKER_THRESHOLD = 5;
const CIRCUIT_BREAKER_TIMEOUT = 30000; // 30 seconds
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second

// Circuit breaker checks before each request
if (isCircuitBreakerOpen(circuitKey)) {
  throw new Error("Service temporarily unavailable");
}

// Exponential backoff on retries
await delay(RETRY_DELAY * (attempt + 1));
```

### 4. User-Facing Query Error Feedback

**Problem**: Query errors only log to console, users see silent failures with no observability linkage.

**Solution**: Implemented `showUserFriendlyError()` function:

- Maps technical errors to user-friendly messages
- Shows toast notifications with clear descriptions
- Logs errors with context for debugging
- Prepared for telemetry integration

```typescript
function showUserFriendlyError(error: Error, context: string): void {
  if (error.message.includes("HTTP 401") || error.message.includes("HTTP 403")) {
    toast({
      title: "Authentication Required",
      description: "Please log in to continue.",
      variant: "destructive",
    });
  } else if (error.message.includes("HTTP 5")) {
    toast({
      title: "Server Error",
      description: "Our servers are experiencing issues. Please try again later.",
      variant: "destructive",
    });
  }

  // Future: sendToTelemetry({ error, context, userMessage });
}
```

## API Reference

### `enhancedFetch<T>(url: string, options?: RequestInit): Promise<T>`

Enhanced fetch with retry logic and circuit breaking.

**Features**:

- Automatic credential handling (same-origin vs cross-origin)
- Circuit breaker protection
- Exponential backoff retry (max 3 attempts)
- User-friendly error messages
- No retry on 4xx client errors

**Example**:

```typescript
const data = await enhancedFetch<Product>("/api/products/123");
```

### `createSafeQuery<T>(queryKey: unknown, queryFn: () => Promise<T>)`

Creates a safe query with validation and error handling for TanStack Query.

**Features**:

- Query key validation
- Circuit breaker integration
- Automatic error handling

**Example**:

```typescript
const safeQuery = createSafeQuery(["products", id], async () => {
  return enhancedFetch(`/api/products/${id}`);
});

const { data } = useQuery(safeQuery);
```

### `createApiUrl(baseUrl: string, path: string, params?: Record<string, string | number>): string`

Type-safe API URL builder with validation.

**Features**:

- Base URL validation (must start with http:// or https://)
- Path traversal detection
- Automatic query parameter encoding

**Example**:

```typescript
const url = createApiUrl("https://api.example.com", "/products", { category: "beats", page: 1 });
// Returns: https://api.example.com/products?category=beats&page=1
```

## Circuit Breaker Behavior

### States

1. **Closed** (Normal): All requests pass through
2. **Open** (Failure): Requests fail immediately without attempting
3. **Half-Open** (Recovery): After timeout, allows one request to test

### Configuration

- **Threshold**: 5 consecutive failures
- **Timeout**: 30 seconds
- **Max Retries**: 3 attempts
- **Retry Delay**: 1 second (exponential backoff)

### Example Flow

```
Request 1: Success → Circuit Closed
Request 2: Failure (500) → Retry → Success → Circuit Closed
Request 3-7: Failures → Circuit Opens
Request 8: Immediate failure (circuit open)
... 30 seconds pass ...
Request 9: Attempt → Success → Circuit Closed
```

## Error Mapping

| Technical Error | User Message            | Description                               |
| --------------- | ----------------------- | ----------------------------------------- |
| Network error   | Network Error           | Please check your internet connection     |
| HTTP 401/403    | Authentication Required | Please log in to continue                 |
| HTTP 404        | Not Found               | The requested resource could not be found |
| HTTP 5xx        | Server Error            | Our servers are experiencing issues       |
| Circuit open    | Service Unavailable     | Please try again in a few moments         |

## Migration Guide

### Before (Unsafe)

```typescript
const { data } = useQuery({
  queryKey: ["products", id],
  queryFn: async () => {
    const response = await fetch(`/api/products/${id}`);
    return response.json();
  },
});
```

### After (Safe)

```typescript
const safeQuery = createSafeQuery(["products", id], async () => {
  return enhancedFetch(`/api/products/${id}`);
});

const { data } = useQuery(safeQuery);
```

## Testing

### Unit Tests

```typescript
describe("validateQueryKey", () => {
  it("should reject path traversal attempts", () => {
    expect(() => validateQueryKey(["..", "admin"])).toThrow(TypeError);
  });
});

describe("enhancedFetch", () => {
  it("should open circuit after 5 failures", async () => {
    // Simulate 5 failures
    for (let i = 0; i < 5; i++) {
      await expect(enhancedFetch("/api/fail")).rejects.toThrow();
    }

    // Circuit should be open
    await expect(enhancedFetch("/api/fail")).rejects.toThrow("temporarily unavailable");
  });
});
```

## Future Improvements

1. **Telemetry Integration**: Add Sentry or LogRocket for error tracking
2. **Configurable Circuit Breaker**: Allow per-endpoint configuration
3. **Request Deduplication**: Prevent duplicate in-flight requests
4. **Offline Detection**: Detect offline state and show appropriate UI
5. **Request Cancellation**: Support AbortController for cancellable requests

## References

- [Circuit Breaker Pattern](https://martinfowler.com/bliki/CircuitBreaker.html)
- [Fetch API Credentials](https://developer.mozilla.org/en-US/docs/Web/API/fetch#credentials)
- [Path Traversal Prevention](https://owasp.org/www-community/attacks/Path_Traversal)
