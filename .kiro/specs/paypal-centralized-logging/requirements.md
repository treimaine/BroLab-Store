# Requirements Document

## Introduction

This feature migrates the PayPal routes logging from direct `console.log`/`console.error` calls to the centralized `secureLogger` utility. The current implementation bypasses the structured logging system, resulting in inconsistent log formats, missing request ID correlation, and no automatic PII sanitization. This migration ensures PayPal route logs follow the same standards as other server routes.

## Glossary

- **secureLogger**: The centralized logging utility (`server/lib/secureLogger.ts`) that provides structured logging with automatic PII sanitization, request ID correlation, and environment-aware formatting
- **PayPal Routes**: The Express router handling PayPal payment operations (`server/routes/paypal.ts`)
- **Request ID**: A unique identifier assigned to each HTTP request for log correlation and debugging
- **PII Sanitization**: The automatic redaction or hashing of personally identifiable information in log output
- **Contextual Metadata**: Structured key-value pairs attached to log entries for filtering and analysis

## Requirements

### Requirement 1

**User Story:** As a DevOps engineer, I want PayPal route logs to use the centralized logger, so that I can correlate logs across the request lifecycle and aggregate them consistently.

#### Acceptance Criteria

1. WHEN the PayPal routes module loads THEN the system SHALL import the secureLogger from the centralized logging library
2. WHEN a PayPal order creation starts THEN the system SHALL log an info message with userId, serviceType, and reservationId metadata
3. WHEN a PayPal order creation succeeds THEN the system SHALL log an info message with the orderId metadata
4. WHEN a PayPal order creation fails THEN the system SHALL log an error message with the error details

### Requirement 2

**User Story:** As a DevOps engineer, I want PayPal payment capture logs to include contextual metadata, so that I can trace payment flows through the system.

#### Acceptance Criteria

1. WHEN a PayPal payment capture starts THEN the system SHALL log an info message with userId and orderId metadata
2. WHEN a PayPal payment capture succeeds THEN the system SHALL log an info message with transactionId and orderId metadata
3. WHEN a PayPal payment capture fails THEN the system SHALL log an error message with error details and orderId metadata

### Requirement 3

**User Story:** As a DevOps engineer, I want PayPal auto-capture redirect logs to use structured logging, so that I can debug redirect flow issues effectively.

#### Acceptance Criteria

1. WHEN a PayPal auto-capture starts THEN the system SHALL log an info message with userId and token metadata
2. WHEN a PayPal auto-capture succeeds THEN the system SHALL log an info message with transactionId and token metadata
3. WHEN a PayPal auto-capture fails THEN the system SHALL log an error message with error details and token metadata
4. WHEN an exception occurs in auto-capture THEN the system SHALL log an error with the Error object and token metadata

### Requirement 4

**User Story:** As a DevOps engineer, I want PayPal order details retrieval to be logged consistently, so that I can monitor API usage patterns.

#### Acceptance Criteria

1. WHEN a PayPal order details request starts THEN the system SHALL log an info message with userId and orderId metadata

### Requirement 5

**User Story:** As a security engineer, I want all PayPal logs to pass through the secure logger, so that PII is automatically sanitized before output.

#### Acceptance Criteria

1. WHEN any PayPal route logs user data THEN the system SHALL use secureLogger which automatically sanitizes PII fields
2. WHEN any PayPal route logs are output THEN the system SHALL NOT use direct console.log or console.error calls
