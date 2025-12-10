# Design Document

## Overview

This feature migrates the PayPal routes (`server/routes/paypal.ts`) from direct `console.log`/`console.error` calls to the centralized `secureLogger` utility. The migration involves replacing 11 logging statements with structured logging calls that include contextual metadata for better observability.

## Architecture

The change is localized to a single file and follows the existing logging architecture:

```
┌─────────────────────────────────────────────────────────────┐
│                    PayPal Routes                            │
│                 server/routes/paypal.ts                     │
│                                                             │
│  Before:  console.log("🚀 Creating...", userId)            │
│  After:   secureLogger.info("Creating...", { userId })     │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Secure Logger                            │
│                server/lib/secureLogger.ts                   │
│                                                             │
│  • Automatic PII sanitization                               │
│  • Request ID correlation                                   │
│  • Environment-aware formatting (JSON prod, readable dev)   │
│  • Structured metadata support                              │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Console Output                           │
│                                                             │
│  Production: {"level":"info","timestamp":"...","message":..}│
│  Development: ℹ️ [INFO] Creating PayPal order              │
└─────────────────────────────────────────────────────────────┘
```

## Components and Interfaces

### Modified Component: PayPal Routes

**File:** `server/routes/paypal.ts`

**Changes:**

1. Add import for `secureLogger`
2. Replace all `console.log` calls with `secureLogger.info`
3. Replace all `console.error` calls with `secureLogger.error`

### Existing Component: Secure Logger (No Changes)

**File:** `server/lib/secureLogger.ts`

**Interface used:**

```typescript
interface SecureLogger {
  info(message: string, context?: Record<string, unknown>): void;
  error(message: string, error?: Error, context?: Record<string, unknown>): void;
}
```

## Data Models

No new data models are introduced. The logging context objects follow this structure:

```typescript
// Order creation context
interface OrderCreationLogContext {
  userId: string;
  serviceType?: string;
  reservationId?: string;
  orderId?: string;
  error?: string;
}

// Payment capture context
interface PaymentCaptureLogContext {
  userId?: string;
  orderId: string;
  transactionId?: string;
  error?: string;
}

// Auto-capture context
interface AutoCaptureLogContext {
  userId?: string;
  token: string;
  transactionId?: string;
  error?: string;
}

// Order details context
interface OrderDetailsLogContext {
  userId?: string;
  orderId: string;
}
```

## Correctness Properties

_A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees._

### Property 1: Logging method consistency

_For any_ PayPal route handler execution, the logging calls SHALL use secureLogger methods (info or error) and SHALL NOT use direct console methods.

**Validates: Requirements 5.2**

### Property 2: Success operation logging includes result identifiers

_For any_ successful PayPal operation (order creation, payment capture, auto-capture), the info log SHALL include the operation result identifier (orderId or transactionId) in the context metadata.

**Validates: Requirements 1.3, 2.2, 3.2**

### Property 3: Failed operation logging includes error and context

_For any_ failed PayPal operation, the error log SHALL include both the error details and the relevant operation identifier (orderId or token) in the context metadata.

**Validates: Requirements 1.4, 2.3, 3.3, 3.4**

### Property 4: Operation start logging includes user context

_For any_ PayPal operation start (create-order, capture-payment, auto-capture, get-order), the info log SHALL include the userId in the context metadata.

**Validates: Requirements 1.2, 2.1, 3.1, 4.1**

## Error Handling

Error handling remains unchanged. The migration only affects how errors are logged:

- **Before:** `console.error("❌ Failed to create PayPal order:", result.error)`
- **After:** `secureLogger.error("Failed to create PayPal order", undefined, { error: result.error })`

For caught exceptions:

- **Before:** `console.error("❌ Error in auto-capture endpoint:", error)`
- **After:** `secureLogger.error("Error in PayPal auto-capture endpoint", error instanceof Error ? error : undefined, { token })`

## Testing Strategy

### Dual Testing Approach

This feature uses both unit tests and property-based tests:

1. **Unit tests** verify specific logging scenarios with mocked dependencies
2. **Property-based tests** verify that logging behavior holds across various input combinations

### Property-Based Testing Framework

**Framework:** fast-check (already available in the project via Jest)

**Configuration:** Each property test runs a minimum of 100 iterations.

### Test Structure

```typescript
// Property test annotation format
// **Feature: paypal-centralized-logging, Property {number}: {property_text}**
```

### Unit Test Cases

1. **Import verification**: Verify secureLogger is imported and no console calls exist
2. **Create order logging**: Mock PayPalService, verify secureLogger.info called with correct metadata
3. **Capture payment logging**: Mock PayPalService, verify logging on success/failure
4. **Auto-capture logging**: Mock PayPalService, verify logging including exception handling
5. **Order details logging**: Mock PayPalService, verify logging with userId and orderId

### Property Test Cases

1. **Property 1**: For any route handler, verify no console.log/console.error in source
2. **Property 2**: For any successful operation mock, verify result identifier in log context
3. **Property 3**: For any failed operation mock, verify error and identifier in log context
4. **Property 4**: For any operation start, verify userId in log context
