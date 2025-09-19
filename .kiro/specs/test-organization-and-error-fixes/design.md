# Design Document

## Overview

This design addresses the systematic organization of test files and resolution of TypeScript compilation errors. The solution involves moving misplaced test files to the standard **tests** directory, updating import paths, and fixing type-related errors throughout the codebase.

## Architecture

### Test File Organization Strategy

The current codebase has test files in multiple locations:

- `shared/utils/__tests__/syncManager.test.ts`
- `server/__tests__/webhookValidator.test.ts`
- `server/__tests__/webhookSecurity.test.ts`
- `server/__tests__/reservations.test.ts`

These will be consolidated into the main `__tests__` directory with a clear structure that mirrors the source code organization.

### TypeScript Error Resolution Strategy

The TypeScript errors fall into several categories:

1. **Audit Schema Mismatches**: Custom properties in audit details objects that don't match the expected schema
2. **API Version Conflicts**: Outdated API versions in Clerk and Stripe configurations
3. **Missing Properties**: Required properties missing from objects or incorrect property access
4. **Type Compatibility Issues**: Objects not matching expected interfaces

## Components and Interfaces

### Test File Structure

```
__tests__/
├── shared/
│   └── utils/
│       └── syncManager.test.ts
├── server/
│   ├── webhookValidator.test.ts
│   ├── webhookSecurity.test.ts
│   └── reservations.test.ts
└── [existing test files remain]
```

### Audit Schema Updates

The audit system needs schema updates to accommodate custom properties:

```typescript
// Enhanced audit details interface
interface AuditDetails {
  context: {
    sessionId?: string;
    apiVersion?: string;
    clientVersion?: string;
    correlationId?: string;
    requestId: string;
  };
  resource: string;
  resourceId: string;
  changes: Array<{
    field: string;
    oldValue?: string;
    newValue?: string;
    changeType: "create" | "update" | "delete";
  }>;
  operation: string;
  // Custom properties for specific audit events
  [key: string]: any;
}
```

### Type Fixes Strategy

1. **Order Items Schema**: Add missing `title` property to order items
2. **API Versions**: Update to latest compatible versions
3. **Property Access**: Add proper null checks and optional chaining
4. **Iterator Compatibility**: Add proper TypeScript target configuration

## Data Models

### Updated Order Item Interface

```typescript
interface OrderItem {
  productId: number;
  title: string; // Added required property
  name?: string; // Keep for backward compatibility
  qty: number;
  unitPrice: number;
  totalPrice: number;
  license?: string;
  metadata?: {
    downloadFormat?: string;
    beatGenre?: string;
    beatBpm?: number;
    beatKey?: string;
    licenseTerms?: string;
  };
}
```

### Enhanced Audit Event Types

```typescript
interface AuditEvent {
  userId?: Id<"users">;
  ipAddress?: string;
  userAgent?: string;
  details?: {
    // Base audit properties
    context?: AuditContext;
    resource?: string;
    resourceId?: string;
    changes?: AuditChange[];
    operation?: string;
    // Extended properties for specific events
    event?: string;
    username?: string;
    error?: string;
    orderId?: string;
    quotaId?: string;
    clerkSubscriptionId?: string;
    planId?: string;
    source?: string;
    [key: string]: any;
  };
}
```

## Error Handling

### TypeScript Compilation Errors

1. **Graceful Degradation**: Ensure that fixing TypeScript errors doesn't break runtime functionality
2. **Backward Compatibility**: Maintain existing API contracts while fixing type issues
3. **Progressive Enhancement**: Fix errors incrementally without breaking existing functionality

### Test File Migration

1. **Import Path Validation**: Verify all import paths work after moving files
2. **Test Discovery**: Ensure Jest can find all moved test files
3. **Configuration Updates**: Update any test-specific configuration files

## Testing Strategy

### Validation Steps

1. **Pre-migration Testing**: Run existing tests to establish baseline
2. **Post-migration Testing**: Verify all tests still pass after file moves
3. **TypeScript Compilation**: Ensure clean compilation after fixes
4. **Integration Testing**: Verify that audit logging and other fixed components work correctly

### Test File Organization Validation

1. **File Location Verification**: Confirm all test files are in **tests** directory
2. **Import Path Verification**: Ensure all imports resolve correctly
3. **Test Runner Compatibility**: Verify Jest configuration works with new structure

### Error Fix Validation

1. **Compilation Success**: `npx tsc --noEmit --skipLibCheck` should complete without errors
2. **Runtime Functionality**: Ensure fixed components work correctly at runtime
3. **API Compatibility**: Verify that API version updates don't break existing integrations
