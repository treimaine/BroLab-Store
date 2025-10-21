# Requirements Document

## Introduction

This specification addresses critical issues in the data validation layer and test infrastructure that prevent reliable testing and cause false positives in consistency checks. The problems span the ConsistencyChecker validation logic, DataValidationService API surface, Convex initialization strategy, import path resolution, and HTTP connection error handling.

## Glossary

- **ConsistencyChecker**: Service that validates data integrity by comparing calculated statistics against stored values
- **DataValidationService**: Public API for validating data structures, IDs, and integrity across the application
- **SourceValidator**: Internal validator containing Convex ID validation logic
- **PollingConnection**: HTTP fallback connection mechanism for real-time data synchronization
- **Convex**: Real-time database system requiring URL configuration for initialization
- **Test Fixtures**: Static data structures used in automated tests

## Requirements

### Requirement 1: ConsistencyChecker Validation Accuracy

**User Story:** As a developer, I want consistency checks to accurately validate data without false positives on static test fixtures, so that I can trust the test results and identify real data integrity issues.

#### Acceptance Criteria

1. WHEN the ConsistencyChecker validates monthly statistics against static test fixtures, THE ConsistencyChecker SHALL skip time-based validations that require current date context
2. WHEN the ConsistencyChecker encounters a test environment hash value, THE ConsistencyChecker SHALL skip hash validation or accept test-specific hash values
3. WHEN the ConsistencyChecker runs in test mode, THE ConsistencyChecker SHALL provide configuration options to disable time-sensitive validations
4. WHERE test fixtures are provided, THE ConsistencyChecker SHALL validate only structural integrity and cross-field consistency
5. WHEN validation completes on valid test data, THE ConsistencyChecker SHALL return zero anomalies

### Requirement 2: DataValidationService API Completeness

**User Story:** As a developer, I want DataValidationService to expose all necessary validation methods including Convex ID validation, so that I can validate data consistently across the application without accessing internal validators.

#### Acceptance Criteria

1. THE DataValidationService SHALL expose a public validateConvexId method that accepts an ID string and returns a validation result
2. THE DataValidationService SHALL expose a public validateAllIds method that validates all Convex IDs in a data structure
3. WHEN a test calls service.validateConvexId with a valid Convex ID, THE DataValidationService SHALL return a success result
4. WHEN a test calls service.validateConvexId with an invalid ID, THE DataValidationService SHALL return a failure result with error details
5. THE DataValidationService SHALL delegate to SourceValidator for ID validation while maintaining the public API contract

### Requirement 3: Convex Initialization Resilience

**User Story:** As a developer, I want the Convex client initialization to defer errors until actual use, so that I can import server modules in test and development environments without requiring production configuration.

#### Acceptance Criteria

1. WHEN server/lib/convex.ts is imported without VITE_CONVEX_URL, THE module SHALL load successfully without throwing errors
2. WHEN a Convex client method is invoked without valid configuration, THE client SHALL throw a descriptive error at invocation time
3. WHERE NODE_ENV is "test", THE Convex initialization SHALL provide a mock client or skip initialization
4. THE Convex client SHALL implement lazy initialization that defers connection until first use
5. WHEN tests import modules that depend on Convex, THE tests SHALL execute without configuration errors

### Requirement 4: Import Path Consistency

**User Story:** As a developer, I want all import paths to resolve correctly after code reorganization, so that tests and application code can locate components and services without module resolution errors.

#### Acceptance Criteria

1. THE codebase SHALL provide re-export files at legacy import paths for backward compatibility
2. WHEN tests import @/components/ReservationErrorBoundary, THE import SHALL resolve to components/reservations/ReservationErrorBoundary
3. WHEN tests import from ../../components/kokonutui/file-upload, THE import SHALL resolve to components/ui/file-upload
4. WHEN tests import @/store/useDashboardStore, THE import SHALL resolve to stores/useDashboardStore
5. THE Jest configuration SHALL include moduleNameMapper entries for all reorganized paths

### Requirement 5: PollingConnection Error Handling

**User Story:** As a developer, I want PollingConnection to handle missing responses and inactive connections gracefully, so that the application provides clear error messages instead of crashing with TypeErrors.

#### Acceptance Criteria

1. WHEN PollingConnection.send is invoked on an inactive connection, THE method SHALL return an error result without attempting the request
2. WHEN fetch returns undefined or null, THE PollingConnection SHALL handle the missing response without accessing undefined properties
3. WHEN a network request fails, THE PollingConnection SHALL return a descriptive error message
4. THE PollingConnection SHALL validate connection state before executing send operations
5. WHEN response.ok is accessed, THE PollingConnection SHALL verify that response exists and is an object
