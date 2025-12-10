# Implementation Plan

- [ ] 1. Create request ID utility module
  - [x] 1.1 Create `server/utils/requestId.ts` with generateSecureRequestId function
    - Implement using crypto.randomUUID()
    - Return format "req\_<uuid-v4>"
    - _Requirements: 1.1, 1.3, 2.1_
  - [x] 1.2 Write property test for UUID format compliance
    - **Property 1: UUID v4 Format Compliance**
    - **Validates: Requirements 1.1, 3.2**
  - [x] 1.3 Implement isValidRequestId validation function
    - Accept pattern `req_[a-zA-Z0-9_-]+`
    - Support both legacy and new formats
    - _Requirements: 2.2, 3.3, 5.1_
  - [x] 1.4 Write property test for validation accepts valid formats
    - **Property 4: Validation Accepts Valid Formats**
    - **Validates: Requirements 2.2, 3.3**
  - [x] 1.5 Write property test for validation rejects invalid formats
    - **Property 5: Validation Rejects Invalid Formats**
    - **Validates: Requirements 2.2, 2.3**
  - [x] 1.6 Add deprecated generateRequestId alias for backward compatibility
    - Export as alias to generateSecureRequestId
    - Add @deprecated JSDoc annotation
    - _Requirements: 5.2_

- [x] 2. Create request ID middleware
  - [x] 2.1 Create `server/middleware/requestId.ts` middleware
    - Check for x-request-id header
    - Validate header format using isValidRequestId
    - Generate new ID if missing or invalid
    - Attach to req.requestId
    - _Requirements: 2.2, 2.3, 4.1_
  - [x] 2.2 Add X-Request-ID response header
    - Set header before response is sent
    - _Requirements: 4.3_
  - [x] 2.3 Write property test for uniqueness under concurrent generation
    - **Property 2: Uniqueness Under Concurrent Generation**
    - **Validates: Requirements 1.2**
  - [x] 2.4 Write property test for consistent prefix format
    - **Property 3: Consistent Prefix Format**
    - **Validates: Requirements 1.3**
  - [x] 2.5 Write unit tests for middleware behavior
    - Test valid header passthrough
    - Test invalid header replacement
    - Test missing header generation
    - Test response header setting
    - _Requirements: 4.1, 4.3_

- [x] 3. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Update server/app.ts to use new middleware
  - [x] 4.1 Import requestIdMiddleware from new module
    - Replace inline middleware with imported function
    - _Requirements: 3.1_
  - [x] 4.2 Remove inline Date.now() request ID generation
    - Delete the existing inline middleware code
    - _Requirements: 1.1_

- [x] 5. Update validation middleware to use centralized utility
  - [x] 5.1 Update `server/middleware/validation.ts` imports
    - Import generateSecureRequestId from utils/requestId
    - _Requirements: 3.1_
  - [x] 5.2 Replace all Date.now() fallbacks in validation.ts
    - Update createValidationMiddleware fallback
    - Update validateFileUpload fallback
    - Update validatePermissions fallback
    - Update validateSubscriptionQuota fallback
    - _Requirements: 1.1, 3.1_
  - [x] 5.3 Update generateRequestId export to use new implementation
    - Re-export from utils/requestId for backward compatibility
    - _Requirements: 5.2_

- [x] 6. Update file upload security middleware
  - [x] 6.1 Update `server/middleware/fileUploadSecurity.ts` imports
    - Import generateSecureRequestId from utils/requestId
    - _Requirements: 3.1_
  - [x] 6.2 Replace all Date.now() fallbacks in fileUploadSecurity.ts
    - Update all requestId fallback generations
    - _Requirements: 1.1, 3.1_

- [ ] 7. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 8. Add backward compatibility property test
  - [ ]\* 8.1 Write property test for legacy format acceptance
    - **Property 6: Backward Compatibility with Legacy Formats**
    - **Validates: Requirements 5.1**

- [x] 9. Final verification and cleanup
  - [x] 9.1 Run grep to verify no remaining Date.now() request ID patterns
    - Search for `req_\${Date.now` patterns
    - _Requirements: 1.1_
  - [x] 9.2 Verify TypeScript compilation passes
    - Run npm run type-check
    - _Requirements: 5.2, 5.3_

- [ ] 10. Final Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.
