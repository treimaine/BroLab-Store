# Implementation Plan

- [x] 1. Create ReservationPaymentService for reservation-specific payment logic
  - Create new service class at `server/services/ReservationPaymentService.ts`
  - Implement `handleReservationPaymentSuccess` method to process successful reservation payments
  - Implement `handleReservationPaymentFailure` method to handle failed reservation payments
  - Implement `updateReservationStatus` private method to update reservation status in Convex
  - Implement `sendConfirmationEmail` private method using existing email templates
  - Implement `sendFailureEmail` private method for payment failure notifications
  - Add proper TypeScript types with no `any` casts
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

- [x] 2. Create InvoiceService for PDF generation and email delivery
  - Create new service class at `server/services/InvoiceService.ts`
  - Implement `generateInvoice` method to create PDF and upload to Convex storage
  - Implement `sendInvoiceEmail` method to send invoice to customers
  - Extract PDF generation logic from `server/routes/stripe.ts`
  - Add proper error handling for PDF generation failures
  - Add audit logging for invoice generation
  - _Requirements: 4.5, 8.1, 8.2, 8.3_

- [x] 3. Implement proper PayPal webhook signature verification
  - Update `server/services/paypal.ts` to implement real PayPal signature verification
  - Use PayPal SDK's `verifyWebhookSignature` method with proper certificate validation
  - Remove development-mode bypass that returns `true` in all cases
  - Add error handling for signature verification failures
  - Add security logging for failed verification attempts
  - Test with PayPal sandbox webhook events
  - _Requirements: 2.3, 2.4, 3.2, 3.3, 3.5_

- [x] 4. Add processedEvents table to Convex schema for idempotency
  - Update `convex/schema.ts` to add `processedEvents` table definition
  - Add indexes for `by_provider_eventId` and `by_processedAt`
  - Add optional metadata field for storing event details
  - Deploy schema changes to Convex
  - _Requirements: 1.4, 2.4, 5.1_

- [x] 5. Enhance PaymentService with consolidated webhook handling
  - Update `server/services/PaymentService.ts` to use ReservationPaymentService
  - Update `server/services/PaymentService.ts` to use InvoiceService
  - Implement `routeStripeEvent` method to route events to appropriate handlers
  - Implement `routePayPalEvent` method for PayPal event routing
  - Update `handleStripeWebhook` to check metadata.type for reservation payments
  - Update `handlePayPalWebhook` to check event type for reservation payments
  - Remove all `any` type casts and use proper Convex mutation types
  - Add comprehensive error logging with event context
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 2.1, 2.2, 2.5, 5.1, 5.2, 5.3, 5.4, 5.5, 7.1, 7.2, 7.3, 7.4, 7.5_

- [x] 6. Update webhook routes to use consolidated PaymentService
  - Verify `server/routes/webhooks.ts` uses updated PaymentService methods
  - Ensure proper error responses with standardized format
  - Add request ID tracking for debugging
  - Implement health check endpoint enhancements
  - _Requirements: 1.1, 2.1, 8.1, 8.2_

- [x] 7. Remove duplicate Stripe webhook handler from stripe.ts
  - Remove `stripeWebhook` function from `server/routes/stripe.ts`
  - Remove `handleCheckoutSessionCompleted` function (moved to PaymentService)
  - Remove `handlePaymentIntentSucceeded` function (moved to PaymentService)
  - Remove `handlePaymentIntentFailed` function (moved to PaymentService)
  - Remove `validateWebhookSignature` function (handled by PaymentService)
  - Remove `generateInvoicePdf` function (moved to InvoiceService)
  - Remove `sendReservationConfirmationEmail` function (moved to ReservationPaymentService)
  - Remove `sendReservationPaymentFailureEmail` function (moved to ReservationPaymentService)
  - Keep only `/api/stripe/checkout` and `/api/stripe/create-payment-intent` routes
  - _Requirements: 1.2_

- [x] 8. Remove duplicate PayPal webhook handler from paypal.ts
  - Remove `POST /api/paypal/webhook` route from `server/routes/paypal.ts`
  - Keep only order creation, capture, and details routes
  - Update route comments to clarify webhook handling is in webhooks.ts
  - _Requirements: 2.2_

- [x] 9. Remove duplicate Stripe webhook handler from clerk.ts
  - Remove `POST /api/clerk/webhooks` route from `server/routes/clerk.ts`
  - Keep only `/api/clerk/create-checkout-session` and `/api/clerk/checkout-session/:id` routes
  - Update route comments to clarify Stripe webhooks are handled in webhooks.ts
  - _Requirements: 1.2_

- [x] 10. Remove Convex webhook forwarding routes
  - Remove `stripeWebhook` handler from `convex/http.ts`
  - Remove `paypalWebhook` handler from `convex/http.ts`
  - Keep only `clerkWebhook` handler for Clerk-specific events
  - Update comments to document that Stripe/PayPal webhooks go directly to Express
  - _Requirements: 6.1, 6.2, 6.3, 6.5_

- [x] 11. Enhance Convex mutations for payment processing
  - Update `convex/orders/recordPayment.ts` to accept PayPal transaction IDs
  - Update `convex/orders/confirmPayment.ts` to handle both Stripe and PayPal payments
  - Verify `convex/orders/markProcessedEvent.ts` implements proper idempotency
  - Update `convex/reservations/updateReservationStatus.ts` to accept payment metadata
  - Add proper TypeScript types to all mutation handlers
  - _Requirements: 5.2, 5.3, 7.1, 7.2, 7.3, 7.4, 7.5_

- [x] 12. Add comprehensive error handling and logging
  - Implement standardized error response format across all payment routes
  - Add audit logging for all payment events (success, failure, refund)
  - Add security logging for signature verification failures
  - Implement admin notifications for critical payment failures
  - Add request ID tracking for debugging webhook issues
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

- [ ]\* 13. Create unit tests for PaymentService
  - Create `__tests__/services/PaymentService.test.ts`
  - Test Stripe signature verification with valid and invalid signatures
  - Test PayPal signature verification with valid and invalid signatures
  - Test idempotency check prevents duplicate processing
  - Test event routing for all Stripe event types
  - Test event routing for all PayPal event types
  - Test retry logic with exponential backoff
  - Mock Convex mutations and external API calls
  - Achieve 95%+ code coverage for PaymentService
  - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_

- [ ]\* 14. Create unit tests for ReservationPaymentService
  - Create `__tests__/services/ReservationPaymentService.test.ts`
  - Test successful reservation payment processing
  - Test failed reservation payment processing
  - Test reservation status updates
  - Test confirmation email sending
  - Test failure email sending
  - Mock Convex mutations and email service
  - Achieve 90%+ code coverage for ReservationPaymentService
  - _Requirements: 9.1, 9.2, 9.5_

- [ ]\* 15. Create integration tests for webhook endpoints
  - Create `__tests__/integration/payment-webhooks.test.ts`
  - Test Stripe `checkout.session.completed` webhook end-to-end
  - Test Stripe `payment_intent.succeeded` webhook end-to-end
  - Test Stripe `payment_intent.payment_failed` webhook end-to-end
  - Test PayPal `PAYMENT.CAPTURE.COMPLETED` webhook end-to-end
  - Test PayPal `PAYMENT.CAPTURE.DENIED` webhook end-to-end
  - Test reservation payment success flow
  - Test reservation payment failure flow
  - Test idempotency with duplicate webhook events
  - Mock Stripe and PayPal webhook events with proper signatures
  - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_

- [ ]\* 16. Update webhook configuration documentation
  - Create `docs/PAYMENT_WEBHOOK_CONFIGURATION.md`
  - Document Stripe webhook URL and required events
  - Document PayPal webhook URL and required events
  - Document Clerk webhook URL and required events
  - Document all required environment variables
  - Provide step-by-step setup instructions for each provider
  - Include troubleshooting guide for common webhook issues
  - _Requirements: 10.1, 10.3, 10.4_

- [ ]\* 17. Create payment flow architecture diagrams
  - Update `docs/PAYMENT_FLOW_ANALYSIS.md` with consolidated architecture
  - Create Mermaid diagram showing unified payment flow
  - Create Mermaid diagram showing event routing logic
  - Document webhook processing sequence
  - Document idempotency mechanism
  - _Requirements: 10.2, 10.5_

- [ ] 18. Update Stripe dashboard webhook configuration
  - Log in to Stripe Dashboard
  - Navigate to Developers > Webhooks
  - Update webhook URL to `https://yourdomain.com/api/webhooks/stripe`
  - Configure events: `payment_intent.succeeded`, `payment_intent.payment_failed`, `checkout.session.completed`, `charge.refunded`
  - Copy webhook signing secret to `STRIPE_WEBHOOK_SECRET` environment variable
  - Test webhook delivery with Stripe CLI
  - _Requirements: 1.1, 6.2_

- [ ] 19. Update PayPal dashboard webhook configuration
  - Log in to PayPal Developer Dashboard
  - Navigate to Apps & Credentials > Webhooks
  - Update webhook URL to `https://yourdomain.com/api/webhooks/paypal`
  - Configure events: `PAYMENT.CAPTURE.COMPLETED`, `PAYMENT.CAPTURE.DENIED`, `PAYMENT.CAPTURE.REFUNDED`
  - Copy webhook ID to `PAYPAL_WEBHOOK_ID` environment variable
  - Test webhook delivery with PayPal sandbox
  - _Requirements: 2.1, 6.3_

- [ ] 20. Deploy and monitor consolidated payment system
  - Deploy updated code to staging environment
  - Run full test suite in staging
  - Monitor webhook processing metrics (latency, failure rate)
  - Verify idempotency prevents duplicate processing
  - Test reservation payment flow end-to-end
  - Test beat purchase payment flow end-to-end
  - Deploy to production with monitoring
  - Set up alerts for webhook processing failures
  - _Requirements: 5.4, 6.5, 8.5_
