# Payment Flow Analysis - BroLab Entertainment

**Date**: October 29, 2025  
**Status**: 🚨 CRITICAL - Multiple Conflicting Implementations Detected

## Executive Summary

The payment processing system has **significant architectural duplication** with 4 separate webhook implementations, 7 different payment-related route files, and conflicting responsibilities. This creates maintenance burden, potential race conditions, and inconsistent behavior.

---

## 🔴 Critical Issues Identified

### 1. Multiple Webhook Endpoints for Same Provider

#### Stripe Webhooks (4 Different Handlers)

```
1. /api/webhooks/stripe          → server/routes/webhooks.ts (uses PaymentService)
2. /api/stripe/webhook           → server/routes/stripe.ts (direct Stripe SDK)
3. /api/clerk/webhooks           → server/routes/clerk.ts (Clerk Billing)
4. /api/webhooks/stripe (Convex) → convex/http.ts (forwards to Express)
```

**Problem**: Stripe can only be configured with ONE webhook URL. Having 4 different handlers means:

- Only one is actually receiving events
- Others are dead code or causing confusion
- Developers don't know which one to use

#### PayPal Webhooks (3 Different Handlers)

```
1. /api/webhooks/paypal          → server/routes/webhooks.ts (uses PaymentService)
2. /api/paypal/webhook           → server/routes/paypal.ts (direct PayPal SDK)
3. /api/webhooks/paypal (Convex) → convex/http.ts (forwards to Express)
```

**Problem**: Same issue - PayPal can only send to ONE endpoint.

---

## 📊 Payment Flow Comparison

### Current State (Fragmented)

```
┌─────────────────────────────────────────────────────────────┐
│                    STRIPE PAYMENT FLOW                       │
└─────────────────────────────────────────────────────────────┘

Option A: Via PaymentService
  Stripe → /api/webhooks/stripe → PaymentService.handleStripeWebhook()
    → orders.markProcessedEvent (idempotency)
    → orders.recordPayment
    → audit.log

Option B: Via Direct Stripe Route
  Stripe → /api/stripe/webhook → validateWebhookSignature()
    → handleCheckoutSessionCompleted()
    → orders.markProcessedEvent (idempotency)
    → orders.recordPayment
    → generateInvoicePdf()
    → sendMail()

Option C: Via Clerk Route
  Stripe → /api/clerk/webhooks → stripe.webhooks.constructEvent()
    → handleCheckoutCompleted()
    → TODO: Implement reservation updates

Option D: Via Convex (Forwarding)
  Stripe → Convex /api/webhooks/stripe → Forward to Express
    → /api/stripe/webhook (back to Option B)

┌─────────────────────────────────────────────────────────────┐
│                    PAYPAL PAYMENT FLOW                       │
└─────────────────────────────────────────────────────────────┘

Option A: Via PaymentService
  PayPal → /api/webhooks/paypal → PaymentService.handlePayPalWebhook()
    → orders.markProcessedEvent (idempotency)
    → orders.recordPayment
    → audit.log

Option B: Via Direct PayPal Route
  PayPal → /api/paypal/webhook → PayPalService.verifyWebhookSignature()
    → PayPalService.processWebhookEvent()
    → TODO: Update reservation status

Option C: Via Convex (Forwarding)
  PayPal → Convex /api/webhooks/paypal → Forward to Express
    → /api/paypal/webhook (back to Option B)
```

---

## 🔍 Detailed File Analysis

### 1. server/services/PaymentService.ts

**Purpose**: Unified payment processing service  
**Status**: ✅ Well-structured, but underutilized

**Features**:

- ✅ Stripe webhook handling with signature verification
- ✅ PayPal webhook handling (basic)
- ✅ Idempotency via `orders.markProcessedEvent`
- ✅ Retry logic with exponential backoff
- ✅ Audit logging
- ⚠️ PayPal signature verification is stubbed (returns true in dev)
- ⚠️ Uses `any` type casts for Convex mutations

**Handles**:

- `payment_intent.succeeded`
- `payment_intent.payment_failed`
- `charge.refunded`
- `PAYMENT.CAPTURE.COMPLETED` (PayPal)
- `PAYMENT.CAPTURE.DENIED` (PayPal)

---

### 2. server/routes/webhooks.ts

**Purpose**: Dedicated webhook routes  
**Status**: ✅ Clean implementation, uses PaymentService

**Routes**:

- `POST /api/webhooks/stripe` → Calls `PaymentService.handleStripeWebhook()`
- `POST /api/webhooks/paypal` → Calls `PaymentService.handlePayPalWebhook()`
- `GET /api/webhooks/health` → Health check

**Features**:

- ✅ Signature verification via PaymentService
- ✅ Retry logic (3 attempts with exponential backoff)
- ✅ Proper error handling
- ✅ Returns 200/400/500 status codes appropriately

---

### 3. server/routes/stripe.ts

**Purpose**: Stripe-specific payment routes  
**Status**: ⚠️ Overlaps with PaymentService, handles reservations

**Routes**:

- `GET /api/stripe/health`
- `POST /api/stripe/checkout` → Create checkout session
- `POST /api/stripe/webhook` → **DUPLICATE WEBHOOK HANDLER**

**Features**:

- ✅ Handles reservation payments (not in PaymentService)
- ✅ Generates invoice PDFs
- ✅ Sends confirmation emails
- ✅ Updates reservation status to "confirmed"
- ⚠️ Duplicate webhook signature verification
- ⚠️ Duplicate idempotency check
- ⚠️ Duplicate `orders.recordPayment` calls

**Handles**:

- `checkout.session.completed` (with reservation logic)
- `payment_intent.succeeded`
- `payment_intent.payment_failed` (with reservation rollback)
- `charge.refunded`

**Unique Logic**:

- Reservation payment processing
- Email notifications for reservations
- Admin notifications on failures

---

### 4. server/routes/paypal.ts

**Purpose**: PayPal-specific payment routes  
**Status**: ⚠️ Overlaps with PaymentService

**Routes**:

- `GET /api/paypal/test`
- `GET /api/paypal/test-auth`
- `POST /api/paypal/create-order` → Create PayPal order
- `POST /api/paypal/capture-payment` → Capture payment
- `GET /api/paypal/capture/:token` → Auto-capture on return
- `POST /api/paypal/webhook` → **DUPLICATE WEBHOOK HANDLER**
- `GET /api/paypal/order/:orderId` → Get order details
- `GET /api/paypal/health`

**Features**:

- ✅ PayPal order creation with SDK
- ✅ Payment capture
- ✅ Auto-capture on user return
- ⚠️ Webhook signature verification (calls PayPalService.verifyWebhookSignature)
- ⚠️ Webhook processing (calls PayPalService.processWebhookEvent)
- ⚠️ TODO comments for reservation status updates

---

### 5. server/routes/payments.ts

**Purpose**: Clerk Billing webhook handler  
**Status**: ⚠️ Incomplete, mostly TODOs

**Routes**:

- `POST /api/payments/create-payment-session` → Generic payment session
- `POST /api/payments/webhook` → **CLERK BILLING WEBHOOK**

**Features**:

- ✅ Svix signature verification for Clerk webhooks
- ⚠️ Subscription webhooks → TODO
- ⚠️ Invoice webhooks → TODO
- ⚠️ Order webhooks → Fallback mapping (incomplete)

**Purpose**: Handle Clerk Billing events (subscriptions, invoices)  
**Status**: Separate from Stripe payment intents

---

### 6. server/routes/clerk.ts

**Purpose**: Clerk integration with Stripe  
**Status**: ⚠️ Another Stripe webhook handler

**Routes**:

- `GET /api/clerk/health`
- `POST /api/clerk/create-checkout-session` → Create Stripe checkout
- `GET /api/clerk/checkout-session/:id` → Get session status
- `POST /api/clerk/webhooks` → **ANOTHER STRIPE WEBHOOK HANDLER**

**Features**:

- ✅ Enhanced logging for payment events
- ✅ Detailed error responses
- ✅ Handles checkout.session.completed
- ✅ Handles checkout.session.expired
- ✅ Handles invoice.payment_succeeded
- ✅ Handles invoice.payment_failed
- ⚠️ All handlers have TODO comments (not implemented)

---

### 7. convex/http.ts

**Purpose**: Convex HTTP routes  
**Status**: ⚠️ Unnecessary forwarding layer

**Routes**:

- `POST /api/webhooks/clerk` → Simple Clerk webhook
- `POST /api/webhooks/stripe` → **FORWARDS TO EXPRESS**
- `POST /api/webhooks/paypal` → **FORWARDS TO EXPRESS**

**Features**:

- ⚠️ Forwards Stripe webhooks to `${serverUrl}/api/stripe/webhook`
- ⚠️ Forwards PayPal webhooks to `${serverUrl}/api/paypal/webhook`
- ⚠️ Adds unnecessary network hop
- ⚠️ Duplicates signature extraction

**Problem**: Why have Convex routes that just forward to Express? This adds latency and complexity.

---

### 8. convex/orders/confirmPayment.ts

**Purpose**: Finalize order after payment verification  
**Status**: ✅ Core business logic

**Features**:

- ✅ Updates order status to "paid"
- ✅ Grants download access (creates download records)
- ✅ Idempotency check (skips if already paid)
- ✅ Activity logging
- ✅ Audit logging
- ✅ Completes within 5 seconds (performance target)

**Called By**:

- Not directly called by webhooks (should be!)
- Currently called via `orders.recordPayment` mutation

---

### 9. server/services/paypal.ts

**Purpose**: PayPal SDK wrapper service  
**Status**: ⚠️ Incomplete webhook verification

**Features**:

- ✅ Create PayPal order
- ✅ Capture payment
- ✅ Get order details
- ⚠️ Webhook signature verification → **STUBBED OUT** (returns true in dev)
- ⚠️ Webhook event processing → **TODO comments** for reservation updates

---

## 🎯 Recommended Architecture

### Consolidate to Single Webhook Entry Point

```
┌─────────────────────────────────────────────────────────────┐
│                  UNIFIED PAYMENT FLOW                        │
└─────────────────────────────────────────────────────────────┘

Stripe → /api/webhooks/stripe → PaymentService.handleStripeWebhook()
  → Signature verification
  → Idempotency check (orders.markProcessedEvent)
  → Route by event type:
    ├─ payment_intent.succeeded → handlePaymentSuccess()
    │   ├─ orders.recordPayment
    │   ├─ orders.confirmPayment (grants downloads)
    │   └─ audit.log
    ├─ payment_intent.payment_failed → handlePaymentFailure()
    │   ├─ orders.recordPayment (status: failed)
    │   └─ audit.log
    ├─ checkout.session.completed → handleCheckoutCompleted()
    │   ├─ Check metadata.type
    │   ├─ If "reservation_payment" → updateReservationStatus()
    │   ├─ If "beats_only" → orders.recordPayment
    │   ├─ generateInvoicePdf()
    │   └─ sendConfirmationEmail()
    └─ charge.refunded → handleRefund()
        ├─ orders.recordPayment (status: refunded)
        └─ audit.log

PayPal → /api/webhooks/paypal → PaymentService.handlePayPalWebhook()
  → Signature verification (IMPLEMENT PROPERLY)
  → Idempotency check (orders.markProcessedEvent)
  → Route by event type:
    ├─ PAYMENT.CAPTURE.COMPLETED → handlePayPalPaymentSuccess()
    │   ├─ orders.recordPayment
    │   ├─ orders.confirmPayment (grants downloads)
    │   └─ audit.log
    └─ PAYMENT.CAPTURE.DENIED → handlePayPalPaymentFailure()
        ├─ orders.recordPayment (status: failed)
        └─ audit.log

Clerk Billing → /api/payments/webhook → Clerk-specific handler
  → Svix signature verification
  → Route by event type:
    ├─ subscription.* → handleSubscriptionEvent()
    └─ invoice.* → handleInvoiceEvent()
```

---

## 📋 Action Items

### Phase 1: Immediate Fixes (High Priority)

1. **Consolidate Stripe Webhooks**
   - [ ] Keep `/api/webhooks/stripe` as primary endpoint
   - [ ] Move reservation logic from `stripe.ts` to `PaymentService`
   - [ ] Remove webhook handler from `stripe.ts` (keep only checkout creation)
   - [ ] Remove webhook handler from `clerk.ts` (keep only checkout creation)
   - [ ] Remove Convex forwarding routes

2. **Consolidate PayPal Webhooks**
   - [ ] Keep `/api/webhooks/paypal` as primary endpoint
   - [ ] Implement proper signature verification in `PaymentService`
   - [ ] Move reservation logic from `paypal.ts` to `PaymentService`
   - [ ] Remove webhook handler from `paypal.ts` (keep only order creation/capture)
   - [ ] Remove Convex forwarding routes

3. **Fix PayPal Signature Verification**
   - [ ] Implement real PayPal webhook signature verification
   - [ ] Use PayPal SDK's verification method
   - [ ] Remove dev-mode bypass in production

### Phase 2: Architecture Improvements (Medium Priority)

4. **Separate Concerns**
   - [ ] Create `ReservationPaymentService` for reservation-specific logic
   - [ ] Keep `PaymentService` for generic payment processing
   - [ ] Create `InvoiceService` for PDF generation and email sending

5. **Improve Type Safety**
   - [ ] Remove `any` type casts in `PaymentService`
   - [ ] Use proper Convex mutation types
   - [ ] Add strict TypeScript checks

6. **Enhance Error Handling**
   - [ ] Standardize error responses across all routes
   - [ ] Implement circuit breaker for external API calls
   - [ ] Add retry logic for transient failures

### Phase 3: Testing & Documentation (Low Priority)

7. **Add Tests**
   - [ ] Unit tests for `PaymentService`
   - [ ] Integration tests for webhook flows
   - [ ] Mock Stripe/PayPal webhook events

8. **Update Documentation**
   - [ ] Document webhook configuration
   - [ ] Create payment flow diagrams
   - [ ] Add troubleshooting guide

---

## 🔧 Configuration Changes Needed

### Stripe Dashboard

```
Current (Incorrect):
  Webhook URL: ??? (multiple endpoints exist)

Recommended:
  Webhook URL: https://yourdomain.com/api/webhooks/stripe
  Events to send:
    - payment_intent.succeeded
    - payment_intent.payment_failed
    - checkout.session.completed
    - charge.refunded
```

### PayPal Dashboard

```
Current (Incorrect):
  Webhook URL: ??? (multiple endpoints exist)

Recommended:
  Webhook URL: https://yourdomain.com/api/webhooks/paypal
  Events to send:
    - PAYMENT.CAPTURE.COMPLETED
    - PAYMENT.CAPTURE.DENIED
    - PAYMENT.CAPTURE.REFUNDED
```

### Clerk Dashboard

```
Current:
  Webhook URL: https://yourdomain.com/api/payments/webhook
  Events: subscription.*, invoice.*

Recommended: Keep as-is (separate from Stripe payment intents)
```

---

## 🚨 Risk Assessment

### High Risk

- **Race Conditions**: Multiple webhook handlers could process same event
- **Data Inconsistency**: Different handlers update different fields
- **Lost Payments**: If wrong endpoint is configured, payments may not be recorded

### Medium Risk

- **Security**: PayPal signature verification is not implemented
- **Performance**: Convex forwarding adds unnecessary latency
- **Maintenance**: Developers confused about which code to modify

### Low Risk

- **Type Safety**: `any` casts could hide bugs
- **Testing**: Lack of tests makes refactoring risky

---

## 📊 Metrics to Track

After consolidation, monitor:

- Webhook processing time (target: <2 seconds)
- Webhook failure rate (target: <1%)
- Duplicate event processing (target: 0%)
- Payment confirmation latency (target: <5 seconds)
- Audit log completeness (target: 100%)

---

## 🎓 Lessons Learned

1. **Single Responsibility**: Each route file should have ONE clear purpose
2. **DRY Principle**: Don't duplicate webhook handlers
3. **Configuration Management**: Document which webhook URLs are actually configured
4. **Type Safety**: Avoid `any` casts, especially for critical payment logic
5. **Testing**: Payment flows MUST have comprehensive tests

---

## 📚 References

- [Stripe Webhook Best Practices](https://stripe.com/docs/webhooks/best-practices)
- [PayPal Webhook Verification](https://developer.paypal.com/docs/api-basics/notifications/webhooks/notification-messages/)
- [Idempotency in Distributed Systems](https://stripe.com/docs/api/idempotent_requests)

---

**Next Steps**: Review this analysis with the team and prioritize Phase 1 action items.
