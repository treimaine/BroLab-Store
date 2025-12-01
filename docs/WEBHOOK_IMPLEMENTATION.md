# Webhook Implementation Guide

## Overview

Comprehensive webhook handling for payments, subscriptions, and invoices integrated with Clerk Billing and Convex database.

## Architecture

### Webhook Flow

```
Clerk Billing Webhook → Express Route → Handler Function → Convex Mutation/Query → Database Update
```

### Handler Functions

#### 1. Subscription Webhooks (`handleSubscriptionWebhook`)

**Events Handled:**

- `subscription.created` - New subscription created
- `subscription.updated` - Subscription status/period changed
- `subscription.deleted` - Subscription cancelled

**Data Flow:**

1. Extract subscription data from webhook payload
2. Find user by Clerk ID
3. Create/update/cancel subscription in Convex
4. Update download quotas based on plan

**Plan Quotas:**

- `basic`: 10 downloads/month
- `artist`: 50 downloads/month
- `ultimate`: Unlimited (999999)

#### 2. Invoice Webhooks (`handleInvoiceWebhook`)

**Events Handled:**

- `invoice.created` - New invoice generated
- `invoice.paid` - Invoice payment succeeded
- `invoice.payment_failed` - Invoice payment failed

**Data Flow:**

1. Extract invoice data from webhook payload
2. Find subscription by Clerk subscription ID
3. Create/update invoice record in Convex
4. Handle payment failures with retry logic

**Retry Logic:**

- Increments attempt count on failure
- Schedules next retry in 24 hours
- Maintains invoice status as "open" for retries

#### 3. Order Webhooks (`handleOrderWebhook`)

**Events Handled:**

- Generic payment events for one-time purchases

**Data Flow:**

1. Extract payment data from webhook payload
2. Find order by session ID or payment intent ID
3. Record payment in Convex
4. Confirm payment and grant download access on success

## Convex Functions

### Subscriptions (`convex/subscriptions.ts`)

```typescript
// Query functions
getByClerkId(clerkSubscriptionId: string) → Subscription | null
getUserSubscription(userId: Id<"users">) → Subscription | null

// Mutation functions
create({
  userId, clerkSubscriptionId, planId, status,
  currentPeriodStart, currentPeriodEnd, downloadQuota,
  downloadUsed, features
}) → Id<"subscriptions">

update({
  clerkSubscriptionId, status, currentPeriodStart,
  currentPeriodEnd, downloadQuota
}) → Id<"subscriptions">

cancel(clerkSubscriptionId: string) → Id<"subscriptions">
```

### Invoices (`convex/invoices.ts`)

```typescript
// Query functions
getByClerkId(clerkInvoiceId: string) → Invoice | null
getBySubscription(subscriptionId: Id<"subscriptions">) → Invoice[]

// Mutation functions
create({
  subscriptionId, clerkInvoiceId, amount,
  currency, status, dueDate
}) → Id<"invoices">

markPaid({
  clerkInvoiceId, paidAt
}) → Id<"invoices">

markFailed(clerkInvoiceId: string) → Id<"invoices">
```

## Security

### Webhook Signature Verification

```typescript
// Production: Verify with Svix
if (WEBHOOK_SECRET) {
  const { Webhook } = await import("svix");
  const svix = new Webhook(WEBHOOK_SECRET);
  payload = svix.verify(JSON.stringify(req.body), req.headers);
}

// Development: Allow raw body (with warning)
if (!isProd) {
  console.warn("⚠️ Using raw body in dev mode");
  payload = req.body;
}
```

### Environment Variables Required

- `CLERK_WEBHOOK_SECRET` - Webhook signature verification (production)
- `VITE_CONVEX_URL` - Convex deployment URL
- `NODE_ENV` - Environment (production/development)

## Error Handling

### Idempotency

All webhook handlers check for existing records before creating:

- Subscriptions: Check by `clerkSubscriptionId`
- Invoices: Check by `clerkInvoiceId`
- Orders: Check by `sessionId` or `paymentIntentId`

### Fallback Behavior

If subscription/invoice webhook fails, falls through to order handling:

```typescript
try {
  if (eventType.startsWith("subscription.")) {
    await handleSubscriptionWebhook(...);
    return;
  }
} catch (err) {
  console.error("Failed to sync subscription webhook:", err);
  // Falls through to order handling
}
```

### Logging

All webhook events are logged with:

- Event type and ID
- Processing status (success/failure)
- Error messages with stack traces
- Audit trail in Convex

## Testing

### Local Testing

1. Start Convex dev deployment:

```bash
npx convex dev
```

2. Start Express server:

```bash
npm run server
```

3. Use Clerk webhook testing tool or curl:

```bash
curl -X POST http://localhost:3000/api/payments/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "type": "subscription.created",
    "data": {
      "id": "sub_123",
      "user_id": "user_123",
      "plan_id": "artist",
      "status": "active",
      "current_period_start": 1234567890000,
      "current_period_end": 1237159890000
    }
  }'
```

### Production Testing

1. Configure webhook endpoint in Clerk Dashboard
2. Set `CLERK_WEBHOOK_SECRET` environment variable
3. Monitor logs for webhook processing
4. Verify database updates in Convex dashboard

## Troubleshooting

### Common Issues

**Issue: "User not found for Clerk ID"**

- Ensure user exists in Convex `users` table
- Check Clerk ID matches between systems
- Verify user sync is working

**Issue: "Subscription not found for invoice"**

- Ensure subscription webhook processed first
- Check `clerkSubscriptionId` matches
- Verify subscription exists in database

**Issue: "Order not found for session/payment ID"**

- Ensure order created before webhook
- Check session ID or payment intent ID matches
- Verify order exists in database

**Issue: "Webhook signature verification failed"**

- Verify `CLERK_WEBHOOK_SECRET` is correct
- Check webhook is from Clerk (not replay attack)
- Ensure request body is raw (not parsed)

## Future Improvements

- [ ] Implement full Clerk Billing integration for payment sessions
- [ ] Add type-safe Convex API imports (after regenerating API)
- [ ] Reduce cognitive complexity of main webhook handler
- [ ] Add webhook event replay mechanism
- [ ] Implement webhook event archiving
- [ ] Add metrics and monitoring for webhook processing
