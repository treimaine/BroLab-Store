# Implementation Plan: Clerk Webhook Security Enhancement

## Phase 1: Core Security Infrastructure

- [x] 1. Create LRU Cache utility
- [x] 1.1 Implement LRUCache class with generic types
  - Create `server/utils/LRUCache.ts`
  - Implement `get`, `set`, `has`, `delete`, `clear` methods
  - Add TTL support for automatic expiration
  - Implement LRU eviction when max size reached
  - _Requirements: 3.2, 3.3_

- [ ]\* 1.2 Write property test for LRU cache eviction
  - **Property 3: LRU cache eviction maintains bounded memory**
  - **Validates: Requirements 3.3**

- [ ] 2. Create WebhookSecurityService
- [x] 2.1 Implement timestamp validation
  - Create `server/services/WebhookSecurityService.ts`
  - Add `validateTimestamp(timestamp: string)` method
  - Reject timestamps older than 300 seconds
  - Reject timestamps more than 60 seconds in the future
  - Return structured ValidationResult
  - _Requirements: 2.1, 2.2, 2.3_

- [x] 2.2 Write property test for timestamp validation
  - **Property 1: Timestamp validation rejects out-of-window requests**
  - **Validates: Requirements 2.1, 2.2, 2.3**

- [x] 2.3 Implement idempotency checking
  - Add `checkIdempotency(svixId: string)` method
  - Add `recordProcessed(svixId: string, eventType: string)` method
  - Use LRUCache with 5-minute TTL and 10000 max entries
  - Return IdempotencyResult with duplicate detection
  - _Requirements: 3.1, 3.2_

- [x] 2.4 Write property test for idempotency
  - **Property 2: Idempotency prevents duplicate processing**
  - **Validates: Requirements 3.1, 3.2**

- [x] 2.5 Implement IP failure tracking
  - Add `trackSignatureFailure(ip: string)` method
  - Add `shouldWarnAboutIP(ip: string)` method
  - Track failures within 5-minute sliding window
  - Trigger warning after 5 failures from same IP
  - _Requirements: 4.4_

## Phase 2: Audit Logging

- [x] 3. Create WebhookAuditLogger
- [x] 3.1 Implement structured audit logging
  - Create `server/services/WebhookAuditLogger.ts`
  - Define WebhookAuditEntry interface
  - Implement `log(entry: WebhookAuditEntry)` method
  - Format logs as JSON for easy parsing
  - Include all required fields: requestId, timestamp, eventType, sourceIp, svixId, signatureValid, processingTimeMs, outcome
  - _Requirements: 4.1, 4.2, 4.3_

- [x] 3.2 Write property test for audit log completeness
  - **Property 4: Audit logs contain all required fields**
  - **Validates: Requirements 4.1, 4.2, 4.3**

- [x] 3.3 Implement security warning logging
  - Add `logSecurityWarning(ip: string, failureCount: number)` method
  - Log with elevated severity for monitoring systems
  - _Requirements: 4.4_

## Phase 3: Webhook Handler Integration

- [x] 4. Integrate security services into webhook handler
- [x] 4.1 Add timestamp validation to webhook flow
  - Modify `server/routes/clerk-billing.ts`
  - Extract timestamp from svix-timestamp header
  - Call WebhookSecurityService.validateTimestamp()
  - Reject with 400 if invalid, log rejection
  - _Requirements: 2.1, 2.2, 2.3_

- [x] 4.2 Add idempotency check to webhook flow
  - Check idempotency before signature verification
  - Return 200 for duplicates without processing
  - Record processed webhooks after successful handling
  - _Requirements: 3.1, 3.2_

- [x] 4.3 Add IP failure tracking
  - Extract source IP from request
  - Track failures on signature verification failure
  - Log security warning when threshold exceeded
  - _Requirements: 4.4_

- [x] 4.4 Add audit logging throughout flow
  - Log audit entry at end of each request
  - Include processing time measurement
  - Include rejection reasons for failed requests
  - _Requirements: 4.1, 4.2, 4.3_

- [-] 4.5 Write property test for response format compatibility
  - **Property 5: Response format backward compatibility**
  - **Validates: Requirements 5.1, 5.2, 5.3**

## Phase 4: Validation and Testing

- [ ] 5. Comprehensive validation

- [ ] 5.1 Run TypeScript compilation
  - Execute `npx tsc --noEmit`
  - Verify zero TypeScript errors
  - _Requirements: 1.1, 1.2, 1.3, 1.4_

- [ ] 5.2 Run all tests
  - Execute `npm test`
  - Verify all existing tests pass
  - Verify new security tests pass
  - _Requirements: 5.1, 5.2, 5.3_

- [ ]\* 5.3 Run linting
  - Execute `npm run lint`
  - Fix any linting issues
  - _Requirements: 5.1, 5.2, 5.3_

- [ ] 6. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Success Criteria

### Phase Completion Gates

1. **Phase 1 Completion**: LRUCache and WebhookSecurityService implemented with property tests
2. **Phase 2 Completion**: WebhookAuditLogger implemented with structured logging
3. **Phase 3 Completion**: All security features integrated into webhook handler
4. **Phase 4 Completion**: All tests pass, no TypeScript errors

### Quality Metrics

- **TypeScript**: `npx tsc --noEmit` passes with zero errors
- **Tests**: All unit and property tests pass
- **Backward Compatibility**: Existing webhook functionality unchanged
- **Security**: Replay attacks blocked, duplicates detected, audit trail complete

## File Structure

```
server/
  utils/
    LRUCache.ts              # New - LRU cache implementation
  services/
    WebhookSecurityService.ts # New - Security validation logic
    WebhookAuditLogger.ts     # New - Structured audit logging
  routes/
    clerk-billing.ts          # Modified - Integrate security services

__tests__/
  webhook-security/
    LRUCache.test.ts                    # Unit tests
    WebhookSecurityService.test.ts      # Unit tests
    WebhookAuditLogger.test.ts          # Unit tests
    webhook-security.property.test.ts   # Property-based tests
```
