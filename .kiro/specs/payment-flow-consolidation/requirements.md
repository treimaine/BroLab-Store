# Requirements Document

## Introduction

This specification addresses the critical architectural issues in the BroLab Entertainment payment processing system. The current implementation has multiple conflicting webhook handlers, duplicated payment logic, and incomplete security implementations that create maintenance burden, potential race conditions, and data inconsistency risks.

The goal is to consolidate all payment processing into a unified, secure, and maintainable architecture that handles Stripe payments, PayPal payments, and Clerk Billing webhooks through dedicated, non-overlapping endpoints.

## Glossary

- **Payment System**: The complete infrastructure for processing payments from Stripe, PayPal, and Clerk Billing
- **Webhook Handler**: Server endpoint that receives and processes payment provider notifications
- **PaymentService**: Unified service class responsible for all payment processing logic
- **Idempotency**: Mechanism to prevent duplicate processing of the same payment event
- **Signature Verification**: Security validation of webhook authenticity using provider-specific signatures
- **Order**: Payment transaction containing beats, licenses, and payment intent
- **Reservation**: Service booking (mixing, mastering, recording) with payment processing
- **Convex**: Real-time database used for order and reservation storage
- **Express**: Node.js server framework handling HTTP routes and middleware

## Requirements

### Requirement 1: Consolidate Stripe Webhook Handlers

**User Story:** As a system administrator, I want a single Stripe webhook endpoint so that payment events are processed consistently without duplication or race conditions.

#### Acceptance Criteria

1. WHEN a Stripe webhook event is received, THE Payment System SHALL process the event through exactly one endpoint at `/api/webhooks/stripe`
2. THE Payment System SHALL remove all duplicate Stripe webhook handlers from `server/routes/stripe.ts`, `server/routes/clerk.ts`, and `convex/http.ts`
3. THE Payment System SHALL verify Stripe webhook signatures before processing any event
4. THE Payment System SHALL implement idempotency checks using `orders.markProcessedEvent` to prevent duplicate processing
5. THE Payment System SHALL handle the following Stripe events: `payment_intent.succeeded`, `payment_intent.payment_failed`, `checkout.session.completed`, `charge.refunded`

### Requirement 2: Consolidate PayPal Webhook Handlers

**User Story:** As a system administrator, I want a single PayPal webhook endpoint so that PayPal payments are processed reliably and securely.

#### Acceptance Criteria

1. WHEN a PayPal webhook event is received, THE Payment System SHALL process the event through exactly one endpoint at `/api/webhooks/paypal`
2. THE Payment System SHALL remove all duplicate PayPal webhook handlers from `server/routes/paypal.ts` and `convex/http.ts`
3. THE Payment System SHALL implement proper PayPal webhook signature verification using the PayPal SDK
4. THE Payment System SHALL remove the development-mode signature verification bypass in production environments
5. THE Payment System SHALL handle the following PayPal events: `PAYMENT.CAPTURE.COMPLETED`, `PAYMENT.CAPTURE.DENIED`, `PAYMENT.CAPTURE.REFUNDED`

### Requirement 3: Implement Secure Webhook Signature Verification

**User Story:** As a security engineer, I want all webhook events to be cryptographically verified so that only legitimate payment provider notifications are processed.

#### Acceptance Criteria

1. THE Payment System SHALL verify Stripe webhook signatures using `stripe.webhooks.constructEvent()` with the configured webhook secret
2. THE Payment System SHALL verify PayPal webhook signatures using the PayPal SDK verification method with proper certificate validation
3. IF signature verification fails, THEN THE Payment System SHALL return HTTP 400 status and log the security event
4. THE Payment System SHALL NOT process any webhook event that fails signature verification
5. THE Payment System SHALL log all signature verification failures with timestamp, provider, and event ID for security auditing

### Requirement 4: Separate Reservation Payment Logic

**User Story:** As a developer, I want reservation payment processing separated from beat purchase processing so that each payment type has clear, maintainable logic.

#### Acceptance Criteria

1. THE Payment System SHALL create a dedicated `ReservationPaymentService` class for reservation-specific payment logic
2. WHEN a `checkout.session.completed` event contains `metadata.type === "reservation_payment"`, THE Payment System SHALL route the event to `ReservationPaymentService`
3. THE ReservationPaymentService SHALL update reservation status to "confirmed" after successful payment
4. THE ReservationPaymentService SHALL generate invoice PDFs for completed reservations
5. THE ReservationPaymentService SHALL send confirmation emails to customers and admin notifications

### Requirement 5: Implement Unified Payment Processing Flow

**User Story:** As a developer, I want a consistent payment processing flow so that all payment types follow the same validation, recording, and confirmation steps.

#### Acceptance Criteria

1. THE Payment System SHALL process all successful payments through the following sequence: signature verification → idempotency check → payment recording → order confirmation → audit logging
2. THE Payment System SHALL call `orders.recordPayment` for all payment events (success, failure, refund)
3. THE Payment System SHALL call `orders.confirmPayment` only for successful payments to grant download access
4. THE Payment System SHALL complete payment processing within 5 seconds to meet Stripe webhook timeout requirements
5. THE Payment System SHALL implement retry logic with exponential backoff for transient failures

### Requirement 6: Remove Convex Webhook Forwarding

**User Story:** As a performance engineer, I want to eliminate unnecessary network hops so that webhook processing is fast and reliable.

#### Acceptance Criteria

1. THE Payment System SHALL remove all webhook forwarding routes from `convex/http.ts`
2. THE Payment System SHALL configure Stripe to send webhooks directly to `https://yourdomain.com/api/webhooks/stripe`
3. THE Payment System SHALL configure PayPal to send webhooks directly to `https://yourdomain.com/api/webhooks/paypal`
4. THE Payment System SHALL maintain Clerk Billing webhooks at `/api/payments/webhook` as a separate endpoint
5. THE Payment System SHALL reduce webhook processing latency by at least 50% compared to the forwarding architecture

### Requirement 7: Improve Type Safety in Payment Processing

**User Story:** As a developer, I want strict TypeScript types in payment code so that type errors are caught at compile time rather than runtime.

#### Acceptance Criteria

1. THE Payment System SHALL remove all `any` type casts from `PaymentService.ts`
2. THE Payment System SHALL use proper Convex mutation types with explicit return type annotations
3. THE Payment System SHALL define TypeScript interfaces for all Stripe and PayPal webhook event payloads
4. THE Payment System SHALL enable strict TypeScript checks for all payment-related files
5. THE Payment System SHALL pass `npm run type-check` without errors after refactoring

### Requirement 8: Standardize Error Handling and Logging

**User Story:** As a support engineer, I want consistent error handling and logging so that payment issues can be quickly diagnosed and resolved.

#### Acceptance Criteria

1. THE Payment System SHALL return standardized error responses with format `{ error: string, code: string, details?: object }`
2. THE Payment System SHALL log all payment events to the audit system with timestamp, user ID, order ID, and event type
3. THE Payment System SHALL log webhook processing failures with full error context for debugging
4. THE Payment System SHALL send admin notifications for critical payment failures (payment_failed, capture_denied)
5. THE Payment System SHALL track webhook processing metrics: processing time, failure rate, duplicate events

### Requirement 9: Implement Comprehensive Payment Testing

**User Story:** As a QA engineer, I want comprehensive tests for payment flows so that payment processing changes can be validated without risk.

#### Acceptance Criteria

1. THE Payment System SHALL include unit tests for `PaymentService` covering all event types
2. THE Payment System SHALL include integration tests for webhook endpoints with mocked Stripe and PayPal events
3. THE Payment System SHALL test signature verification with valid and invalid signatures
4. THE Payment System SHALL test idempotency by sending duplicate webhook events
5. THE Payment System SHALL achieve at least 90% code coverage for payment-related code

### Requirement 10: Document Payment Configuration and Architecture

**User Story:** As a developer, I want clear documentation of the payment architecture so that I can understand and maintain the system.

#### Acceptance Criteria

1. THE Payment System SHALL provide documentation of webhook endpoint configuration for Stripe, PayPal, and Clerk dashboards
2. THE Payment System SHALL include architecture diagrams showing the unified payment flow
3. THE Payment System SHALL document all environment variables required for payment processing
4. THE Payment System SHALL provide a troubleshooting guide for common payment issues
5. THE Payment System SHALL document the idempotency mechanism and how to handle duplicate events
