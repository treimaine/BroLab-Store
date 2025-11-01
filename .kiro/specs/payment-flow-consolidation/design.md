# Design Document

## Overview

This design consolidates the fragmented payment processing system into a unified, secure, and maintainable architecture. The current system has 4 duplicate Stripe webhook handlers, 3 duplicate PayPal webhook handlers, and unnecessary Convex forwarding layers that create maintenance burden, potential race conditions, and security risks.

The consolidated architecture will:

- Use single webhook endpoints for each payment provider
- Implement proper signature verification for all webhooks
- Separate reservation payment logic from beat purchase logic
- Remove unnecessary network hops (Convex forwarding)
- Improve type safety and error handling
- Provide comprehensive testing and documentation

## Architecture

### High-Level Payment Flow

```
┌─────────────────────────────────────────────────────────────┐
│                  UNIFIED PAYMENT ARCHITECTURE                │
└─────────────────────────────────────────────────────────────┘

┌──────────────┐
│   Stripe     │──────┐
│   Dashboard  │      │
└──────────────┘      │
                      ▼
              /api/webhooks/stripe
                      │
                      ▼
┌──────────────┐  ┌──────────────────────┐
│   PayPal     │──│  PaymentService      │
│   Dashboard  │  │  (Unified Handler)   │
└──────────────┘  └──────────────────────┘
                      │
                      ├──► Signature Verification
                      ├──► Idempotency Check
                      ├──► Event Routing
                      │
                      ▼
              ┌───────────────┐
              │  Event Router │
              └───────────────┘
                      │
        ┌─────────────┼─────────────┐
        ▼             ▼             ▼
  ┌──────────┐  ┌──────────┐  ┌──────────┐
  │  Order   │  │Reservation│  │ Refund  │
  │ Handler  │  │  Handler  │  │ Handler │
  └──────────┘  └──────────┘  └──────────┘
        │             │             │
        └─────────────┼─────────────┘
                      ▼
              ┌───────────────┐
              │ Convex Mutations│
              │ - recordPayment │
              │ - confirmPayment│
              │ - updateStatus  │
              └───────────────┘
                      │
                      ▼
              ┌───────────────┐
              │  Side Effects │
              │ - Send Emails │
              │ - Generate PDF│
              │ - Audit Log   │
              └───────────────┘
```

### Component Responsibilities

#### 1. Webhook Entry Points (Express Routes)

**Location**: `server/routes/webhooks.ts`

**Responsibilities**:

- Receive webhook events from payment providers
- Extract signatures and headers
- Forward to PaymentService for processing
- Return appropriate HTTP status codes
- Implement retry logic with exponential backoff

**Endpoints**:

- `POST /api/webhooks/stripe` - Stripe webhook handler
- `POST /api/webhooks/paypal` - PayPal webhook handler
- `GET /api/webhooks/health` - Health check

#### 2. PaymentService (Core Business Logic)

**Location**: `server/services/PaymentService.ts`

**Responsibilities**:

- Verify webhook signatures (Stripe and PayPal)
- Check idempotency to prevent duplicate processing
- Route events to appropriate handlers
- Record payments in Convex
- Implement retry logic for transient failures
- Log all payment events to audit system

**Methods**:

```typescript
class PaymentService {
  // Stripe webhook processing
  async handleStripeWebhook(payload: Buffer, signature: string): Promise<WebhookResult>;

  // PayPal webhook processing
  async handlePayPalWebhook(payload: any, headers: Record<string, string>): Promise<WebhookResult>;

  // Event routing
  private async routeStripeEvent(event: Stripe.Event): Promise<void>;
  private async routePayPalEvent(event: PayPalEvent): Promise<void>;

  // Payment recording
  private async recordPayment(data: PaymentData): Promise<void>;

  // Retry logic
  async retryWebhookProcessing<T>(fn: () => Promise<T>, maxAttempts: number): Promise<T>;
}
```

#### 3. ReservationPaymentService (Reservation-Specific Logic)

**Location**: `server/services/ReservationPaymentService.ts` (NEW)

**Responsibilities**:

- Handle reservation payment success
- Handle reservation payment failure
- Update reservation status in Convex
- Generate reservation invoices
- Send reservation confirmation emails
- Send reservation failure notifications

**Methods**:

```typescript
class ReservationPaymentService {
  // Process successful reservation payment
  async handleReservationPaymentSuccess(
    reservationIds: string[],
    paymentData: PaymentData,
    session: Stripe.Checkout.Session
  ): Promise<void>;

  // Process failed reservation payment
  async handleReservationPaymentFailure(
    reservationIds: string[],
    paymentData: PaymentData,
    paymentIntent: Stripe.PaymentIntent
  ): Promise<void>;

  // Update reservation status
  private async updateReservationStatus(
    reservationId: string,
    status: ReservationStatus,
    notes?: string
  ): Promise<void>;

  // Send confirmation email
  private async sendConfirmationEmail(
    userEmail: string,
    reservations: ReservationData[],
    paymentData: PaymentData
  ): Promise<void>;
}
```

#### 4. InvoiceService (PDF Generation and Email)

**Location**: `server/services/InvoiceService.ts` (NEW)

**Responsibilities**:

- Generate invoice PDFs for orders and reservations
- Upload PDFs to Convex storage
- Send invoice emails to customers
- Track invoice generation in audit log

**Methods**:

```typescript
class InvoiceService {
  // Generate and upload invoice PDF
  async generateInvoice(
    order: Order,
    items: OrderItem[],
    paymentData: PaymentData
  ): Promise<InvoiceResult>;

  // Send invoice email
  async sendInvoiceEmail(email: string, invoiceUrl: string, invoiceNumber: string): Promise<void>;
}
```

#### 5. Convex Mutations (Data Layer)

**Location**: `convex/orders/`, `convex/reservations/`

**Responsibilities**:

- Store payment records in database
- Update order and reservation status
- Grant download access after successful payment
- Track processed webhook events for idempotency
- Log activity and audit trails

**Key Mutations**:

```typescript
// orders/recordPayment.ts
export const recordPayment = mutation({
  args: {
    orderId: v.id("orders"),
    provider: v.string(),
    status: v.string(),
    amount: v.number(),
    currency: v.string(),
    stripeEventId: v.optional(v.string()),
    stripePaymentIntentId: v.optional(v.string()),
    paypalTransactionId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Record payment in database
  },
});

// orders/confirmPayment.ts
export const confirmPayment = mutation({
  args: {
    orderId: v.id("orders"),
  },
  handler: async (ctx, args) => {
    // Update order status to "paid"
    // Grant download access
    // Log activity
  },
});

// orders/markProcessedEvent.ts
export const markProcessedEvent = mutation({
  args: {
    provider: v.string(),
    eventId: v.string(),
  },
  handler: async (ctx, args) => {
    // Check if event already processed
    // Mark event as processed
    // Return { alreadyProcessed: boolean }
  },
});

// reservations/updateReservationStatus.ts
export const updateReservationStatus = mutation({
  args: {
    reservationId: v.id("reservations"),
    status: v.string(),
    notes: v.optional(v.string()),
    skipEmailNotification: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    // Update reservation status
    // Log activity
  },
});
```

## Components and Interfaces

### Type Definitions

```typescript
// shared/types/Payment.ts

export interface PaymentData {
  provider: "stripe" | "paypal";
  status: "succeeded" | "failed" | "refunded" | "processing";
  amount: number;
  currency: string;
  paymentIntentId?: string;
  transactionId?: string;
  sessionId?: string;
  eventId: string;
}

export interface WebhookResult {
  success: boolean;
  message: string;
  eventId?: string;
  orderId?: string;
  reservationIds?: string[];
}

export interface ReservationPaymentData {
  reservationIds: string[];
  userEmail: string;
  amount: number;
  currency: string;
  paymentType: "reservation_payment";
}

export interface OrderPaymentData {
  orderId: string;
  items: OrderItem[];
  amount: number;
  currency: string;
  paymentType: "beats_only" | "mixed_cart";
}

export interface InvoiceResult {
  invoiceUrl: string;
  invoiceNumber: string;
  storageId: string;
}

export interface ReservationData {
  id: string;
  serviceType: string;
  date: string;
  time: string;
  duration: number;
  price: number;
  status: ReservationStatus;
}

export type ReservationStatus = "draft" | "pending" | "confirmed" | "completed" | "cancelled";
```

### Webhook Signature Verification

```typescript
// server/services/PaymentService.ts

private async verifyStripeSignature(
  payload: Buffer,
  signature: string
): Promise<Stripe.Event> {
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!endpointSecret) {
    throw new Error("STRIPE_WEBHOOK_SECRET not configured");
  }

  try {
    const event = this.stripe.webhooks.constructEvent(
      payload,
      signature,
      endpointSecret
    );

    console.log("✅ Stripe signature verified:", event.id);
    return event;
  } catch (error) {
    console.error("❌ Stripe signature verification failed:", error);
    throw new Error("Invalid Stripe signature");
  }
}

private async verifyPayPalSignature(
  payload: any,
  headers: Record<string, string>
): Promise<boolean> {
  const webhookId = process.env.PAYPAL_WEBHOOK_ID;

  if (!webhookId) {
    throw new Error("PAYPAL_WEBHOOK_ID not configured");
  }

  const {
    "paypal-transmission-id": transmissionId,
    "paypal-transmission-time": timestamp,
    "paypal-transmission-sig": signature,
    "paypal-cert-url": certUrl,
    "paypal-auth-algo": authAlgo,
  } = headers;

  if (!transmissionId || !timestamp || !signature || !certUrl || !authAlgo) {
    throw new Error("Missing PayPal webhook headers");
  }

  try {
    // Use PayPal SDK to verify signature
    const isValid = await this.paypalService.verifyWebhookSignature(
      webhookId,
      transmissionId,
      timestamp,
      certUrl,
      authAlgo,
      signature,
      JSON.stringify(payload)
    );

    if (!isValid) {
      throw new Error("Invalid PayPal signature");
    }

    console.log("✅ PayPal signature verified");
    return true;
  } catch (error) {
    console.error("❌ PayPal signature verification failed:", error);
    throw new Error("Invalid PayPal signature");
  }
}
```

### Idempotency Implementation

```typescript
// convex/orders/markProcessedEvent.ts

export const markProcessedEvent = mutation({
  args: {
    provider: v.string(),
    eventId: v.string(),
  },
  handler: async (ctx, args) => {
    const { provider, eventId } = args;

    // Check if event already processed
    const existing = await ctx.db
      .query("processedEvents")
      .withIndex("by_provider_eventId", q => q.eq("provider", provider).eq("eventId", eventId))
      .first();

    if (existing) {
      console.log(`⚠️ Event ${eventId} already processed`);
      return { alreadyProcessed: true };
    }

    // Mark event as processed
    await ctx.db.insert("processedEvents", {
      provider,
      eventId,
      processedAt: Date.now(),
    });

    console.log(`✅ Event ${eventId} marked as processed`);
    return { alreadyProcessed: false };
  },
});
```

### Event Routing Logic

```typescript
// server/services/PaymentService.ts

private async routeStripeEvent(event: Stripe.Event): Promise<void> {
  switch (event.type) {
    case "payment_intent.succeeded":
      await this.handlePaymentIntentSucceeded(event.data.object as Stripe.PaymentIntent);
      break;

    case "payment_intent.payment_failed":
      await this.handlePaymentIntentFailed(event.data.object as Stripe.PaymentIntent);
      break;

    case "checkout.session.completed":
      await this.handleCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session);
      break;

    case "charge.refunded":
      await this.handleChargeRefunded(event.data.object as Stripe.Charge);
      break;

    default:
      console.log(`ℹ️ Unhandled Stripe event type: ${event.type}`);
  }
}

private async handleCheckoutSessionCompleted(
  session: Stripe.Checkout.Session
): Promise<void> {
  const paymentType = session.metadata?.type;
  const reservationIds = session.metadata?.reservationIds;

  // Route to reservation handler if this is a reservation payment
  if (paymentType === "reservation_payment" && reservationIds) {
    const ids = JSON.parse(reservationIds);
    await this.reservationPaymentService.handleReservationPaymentSuccess(
      ids,
      {
        provider: "stripe",
        status: "succeeded",
        amount: session.amount_total || 0,
        currency: session.currency || "usd",
        sessionId: session.id,
        paymentIntentId: typeof session.payment_intent === "string"
          ? session.payment_intent
          : undefined,
        eventId: session.id,
      },
      session
    );
    return;
  }

  // Handle regular order payment
  const orderId = session.metadata?.orderId;
  if (orderId) {
    await this.recordPayment({
      orderId: orderId as Id<"orders">,
      provider: "stripe",
      status: "succeeded",
      amount: session.amount_total || 0,
      currency: session.currency || "usd",
      stripeEventId: session.id,
      stripePaymentIntentId: typeof session.payment_intent === "string"
        ? session.payment_intent
        : undefined,
    });

    // Confirm payment and grant downloads
    await this.convex.mutation(api.orders.confirmPayment, {
      orderId: orderId as Id<"orders">,
    });

    // Generate invoice
    await this.invoiceService.generateInvoice(orderId, session);
  }
}
```

## Data Models

### Convex Schema Updates

```typescript
// convex/schema.ts

export default defineSchema({
  // ... existing tables ...

  // New table for tracking processed webhook events (idempotency)
  processedEvents: defineTable({
    provider: v.string(), // "stripe" | "paypal"
    eventId: v.string(), // Unique event ID from provider
    processedAt: v.number(), // Timestamp
    metadata: v.optional(v.any()), // Additional event data
  })
    .index("by_provider_eventId", ["provider", "eventId"])
    .index("by_processedAt", ["processedAt"]),

  // Enhanced orders table
  orders: defineTable({
    // ... existing fields ...
    paymentProvider: v.optional(v.string()), // "stripe" | "paypal"
    paymentStatus: v.optional(v.string()), // "succeeded" | "failed" | "refunded"
    stripeEventId: v.optional(v.string()),
    stripePaymentIntentId: v.optional(v.string()),
    stripeChargeId: v.optional(v.string()),
    paypalTransactionId: v.optional(v.string()),
    paypalOrderId: v.optional(v.string()),
  }),

  // Enhanced reservations table
  reservations: defineTable({
    // ... existing fields ...
    paymentProvider: v.optional(v.string()), // "stripe" | "paypal"
    paymentStatus: v.optional(v.string()), // "succeeded" | "failed" | "refunded"
    stripeSessionId: v.optional(v.string()),
    stripePaymentIntentId: v.optional(v.string()),
    paypalTransactionId: v.optional(v.string()),
    paypalOrderId: v.optional(v.string()),
  }),
});
```

## Error Handling

### Error Response Format

```typescript
interface ErrorResponse {
  error: string;
  code: string;
  message: string;
  details?: Record<string, unknown>;
  timestamp: string;
  requestId?: string;
}
```

### Error Handling Strategy

1. **Signature Verification Failures**
   - Return HTTP 400
   - Log security event
   - Do not process webhook

2. **Idempotency Duplicates**
   - Return HTTP 204 (No Content)
   - Log duplicate event
   - Do not reprocess

3. **Transient Failures**
   - Implement retry logic with exponential backoff
   - Maximum 3 attempts
   - Log each attempt

4. **Permanent Failures**
   - Return HTTP 500
   - Send admin notification
   - Log full error context

5. **Partial Failures (Reservations)**
   - Process successful updates
   - Send admin notification for failures
   - Return HTTP 200 (webhook succeeded, but processing had issues)

### Retry Logic

```typescript
async retryWebhookProcessing<T>(
  fn: () => Promise<T>,
  maxAttempts: number = 3
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (attempt < maxAttempts) {
        const delay = Math.pow(2, attempt) * 1000; // Exponential backoff
        console.log(`⚠️ Attempt ${attempt} failed, retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError || new Error("Webhook processing failed after retries");
}
```

## Testing Strategy

### Unit Tests

**Location**: `__tests__/services/PaymentService.test.ts`

```typescript
describe("PaymentService", () => {
  describe("handleStripeWebhook", () => {
    it("should verify signature and process valid webhook", async () => {
      // Test signature verification
      // Test event routing
      // Test payment recording
    });

    it("should reject webhook with invalid signature", async () => {
      // Test signature verification failure
    });

    it("should handle duplicate events with idempotency", async () => {
      // Test idempotency check
    });
  });

  describe("handlePayPalWebhook", () => {
    it("should verify signature and process valid webhook", async () => {
      // Test PayPal signature verification
      // Test event routing
    });
  });

  describe("retryWebhookProcessing", () => {
    it("should retry failed operations with exponential backoff", async () => {
      // Test retry logic
    });
  });
});
```

### Integration Tests

**Location**: `__tests__/integration/payment-webhooks.test.ts`

```typescript
describe("Payment Webhook Integration", () => {
  it("should process Stripe checkout.session.completed webhook", async () => {
    // Mock Stripe webhook event
    // Send to /api/webhooks/stripe
    // Verify order status updated
    // Verify downloads granted
  });

  it("should process PayPal PAYMENT.CAPTURE.COMPLETED webhook", async () => {
    // Mock PayPal webhook event
    // Send to /api/webhooks/paypal
    // Verify payment recorded
  });

  it("should handle reservation payment success", async () => {
    // Mock reservation payment webhook
    // Verify reservation status updated to "confirmed"
    // Verify confirmation email sent
  });
});
```

### Test Coverage Goals

- PaymentService: 95%+ coverage
- ReservationPaymentService: 90%+ coverage
- Webhook routes: 90%+ coverage
- Convex mutations: 85%+ coverage

## Configuration

### Environment Variables

```bash
# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# PayPal Configuration
PAYPAL_CLIENT_ID=...
PAYPAL_CLIENT_SECRET=...
PAYPAL_WEBHOOK_ID=...
PAYPAL_MODE=sandbox # or "live"

# Clerk Configuration
CLERK_WEBHOOK_SECRET=whsec_...

# Convex Configuration
VITE_CONVEX_URL=https://...convex.cloud

# Email Configuration
RESEND_API_KEY=re_...
BRAND_EMAIL=billing@brolabentertainment.com
ADMIN_EMAIL=admin@brolabentertainment.com
```

### Webhook URL Configuration

**Stripe Dashboard**:

```
Webhook URL: https://yourdomain.com/api/webhooks/stripe
Events to send:
  - payment_intent.succeeded
  - payment_intent.payment_failed
  - checkout.session.completed
  - charge.refunded
```

**PayPal Dashboard**:

```
Webhook URL: https://yourdomain.com/api/webhooks/paypal
Events to send:
  - PAYMENT.CAPTURE.COMPLETED
  - PAYMENT.CAPTURE.DENIED
  - PAYMENT.CAPTURE.REFUNDED
```

**Clerk Dashboard**:

```
Webhook URL: https://yourdomain.com/api/payments/webhook
Events: subscription.*, invoice.*
```

## Migration Strategy

### Phase 1: Preparation (No Breaking Changes)

1. Create new `ReservationPaymentService` class
2. Create new `InvoiceService` class
3. Add `processedEvents` table to Convex schema
4. Update PaymentService with proper PayPal signature verification
5. Add comprehensive tests

### Phase 2: Consolidation (Breaking Changes)

1. Update `/api/webhooks/stripe` to handle all Stripe events
2. Update `/api/webhooks/paypal` to handle all PayPal events
3. Remove webhook handlers from `stripe.ts`, `clerk.ts`, `paypal.ts`
4. Remove Convex forwarding routes from `convex/http.ts`
5. Update Stripe and PayPal dashboard webhook URLs

### Phase 3: Cleanup

1. Remove duplicate code from route files
2. Update documentation
3. Run full test suite
4. Monitor webhook processing in production

### Rollback Plan

If issues arise during migration:

1. Revert webhook URL changes in Stripe/PayPal dashboards
2. Re-enable old webhook handlers temporarily
3. Fix issues in consolidated code
4. Re-attempt migration

## Performance Considerations

### Webhook Processing Time

- Target: < 2 seconds for 95% of webhooks
- Maximum: < 5 seconds (Stripe timeout)
- Implement async processing for non-critical tasks (emails, PDFs)

### Database Queries

- Use indexed queries for idempotency checks
- Batch reservation updates when possible
- Implement connection pooling for Convex

### Monitoring Metrics

- Webhook processing time (p50, p95, p99)
- Webhook failure rate
- Duplicate event rate
- Payment confirmation latency
- Email delivery rate

## Security Considerations

### Signature Verification

- Always verify webhook signatures before processing
- Use constant-time comparison for signature validation
- Log all signature verification failures
- Never bypass signature verification in production

### Idempotency

- Track all processed webhook events
- Prevent duplicate payment processing
- Clean up old processed events (> 30 days)

### Data Privacy

- Mask sensitive data in logs (emails, payment IDs)
- Use HTTPS for all webhook endpoints
- Implement rate limiting on webhook endpoints
- Validate all input data with Zod schemas

### Error Handling

- Never expose internal errors to webhook responses
- Log full error context for debugging
- Send admin notifications for critical failures
- Implement circuit breakers for external API calls

## Documentation

### API Documentation

- Document all webhook endpoints with OpenAPI spec
- Provide example webhook payloads
- Document error responses and status codes
- Include troubleshooting guide

### Architecture Diagrams

- Payment flow diagram (Mermaid)
- Event routing diagram
- Database schema diagram
- Deployment architecture

### Runbooks

- Webhook processing failure runbook
- Payment reconciliation runbook
- Signature verification failure runbook
- Idempotency issue runbook
