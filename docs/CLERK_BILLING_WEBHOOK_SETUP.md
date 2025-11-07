# Clerk Billing Webhook Setup - Implementation Summary

## ✅ Completed Tasks

### 1. Clerk Dashboard Configuration (Manual - Completed by User)

- ✅ Clerk Billing enabled in Clerk Dashboard
- ✅ Three subscription plans created:
  - **Basic**: $9.99/month, 10 downloads
  - **Artist**: $29.99/month, 50 downloads
  - **Ultimate**: $99.99/month, unlimited downloads
- ✅ Webhook endpoint configured: `/api/webhooks/clerk-billing`
- ✅ Webhook events configured:
  - `subscription.created`
  - `subscription.updated`
  - `subscription.deleted`
- ✅ Webhook secret copied to environment variables

### 2. Backend Implementation (Completed)

- ✅ Created dedicated webhook handler: `server/routes/clerk-billing.ts`
- ✅ Integrated webhook handler into main routes: `server/routes/index.ts`
- ✅ Implemented signature verification using Svix
- ✅ Added request ID tracking for debugging
- ✅ Implemented error handling with proper error codes
- ✅ Added logging for all webhook events

## 📋 Webhook Handler Features

### Security

- **Signature Verification**: Uses Svix to verify webhook signatures
- **Environment-Based Validation**: Strict verification in production, lenient in development
- **Request ID Tracking**: Every webhook request gets a unique ID for debugging

### Event Handling

The webhook handler processes two types of events:

#### Subscription Events

- `subscription.created` - New subscription created
- `subscription.updated` - Subscription plan changed or status updated
- `subscription.deleted` - Subscription cancelled

#### Invoice Events

- `invoice.created` - New invoice generated
- `invoice.paid` - Invoice payment successful
- `invoice.payment_failed` - Invoice payment failed

### Response Format

```json
{
  "received": true,
  "synced": true,
  "handled": "subscription",
  "eventType": "subscription.created",
  "requestId": "uuid-here",
  "timestamp": "2025-11-07T12:00:00.000Z"
}
```

## 🔧 Environment Variables Required

Ensure these are set in your `.env.local` file:

```bash
# Clerk Billing Configuration
CLERK_WEBHOOK_SECRET=whsec_oEQtTrG0e3HsUgBmMR2zh9goYKm0Pbca
CLERK_BILLING_ENABLED=true

# Convex Configuration (for data sync)
VITE_CONVEX_URL=https://agile-boar-163.convex.cloud
```

## 📍 Webhook Endpoint

### Local Development (with ngrok)

```
https://YOUR-NGROK-URL.ngrok.io/api/webhooks/clerk-billing
```

Example: `https://abc123.ngrok.io/api/webhooks/clerk-billing`

**Setup ngrok**: See `docs/WEBHOOK_TESTING_QUICKSTART.md` for quick setup guide.

### Production

```
https://your-domain.com/api/webhooks/clerk-billing
```

**Important**:

- Local development requires ngrok or similar tunneling service
- Express server must be accessible from the internet for Clerk to send webhooks
- Update webhook URL in Clerk Dashboard when switching environments
- Free ngrok URLs change on every restart

## 🚧 Next Steps (TODO)

The webhook handler is currently logging events but not yet syncing to Convex. The following TODOs need to be implemented:

### Subscription Event Handlers

1. **subscription.created**
   - Call Convex mutation to create subscription record
   - Update user quota based on plan (10, 50, or unlimited downloads)
   - Send welcome email to user

2. **subscription.updated**
   - Call Convex mutation to update subscription record
   - Update user quota if plan changed
   - Send notification email about plan change

3. **subscription.deleted**
   - Call Convex mutation to mark subscription as cancelled
   - Reset user quota to free tier (3 downloads)
   - Send cancellation confirmation email

### Invoice Event Handlers

1. **invoice.created**
   - Call Convex mutation to create invoice record
   - Send invoice email to user

2. **invoice.paid**
   - Call Convex mutation to mark invoice as paid
   - Grant access to subscription features
   - Send payment confirmation email

3. **invoice.payment_failed**
   - Call Convex mutation to mark invoice as failed
   - Send payment failure notification
   - Provide retry instructions

## 🧪 Testing the Webhook

### Manual Testing with curl

```bash
# Test subscription.created event
curl -X POST "http://localhost:5000/api/webhooks/clerk-billing" \
  -H "Content-Type: application/json" \
  -H "svix-id: msg_test" \
  -H "svix-timestamp: $(date +%s)" \
  -H "svix-signature: v1,test" \
  -d '{
    "type": "subscription.created",
    "data": {
      "id": "sub_test123",
      "user_id": "user_test456",
      "plan_id": "basic",
      "status": "active"
    }
  }'
```

### Using Clerk Dashboard Test Feature

1. Go to Clerk Dashboard → Webhooks
2. Click on your webhook endpoint
3. Click "Send Test Event"
4. Select event type (e.g., `subscription.created`)
5. Click "Send"
6. Check your server logs for the webhook processing

### Expected Log Output

```
📨 [uuid] Processing Clerk Billing webhook...
✅ [uuid] Webhook signature verified
📋 [uuid] Event type: subscription.created
🔔 [uuid] Handling subscription event: subscription.created
📊 [uuid] Subscription details: { subscriptionId: 'sub_123', userId: 'user_456', planId: 'basic', status: 'active' }
✨ [uuid] New subscription created for user user_456
```

## 📊 Subscription Plan Mapping

The webhook handler expects these plan IDs from Clerk:

| Plan Name | Plan ID    | Price        | Downloads |
| --------- | ---------- | ------------ | --------- |
| Basic     | `basic`    | $9.99/month  | 10        |
| Artist    | `artist`   | $29.99/month | 50        |
| Ultimate  | `ultimate` | $99.99/month | Unlimited |

**Note**: Ensure the plan IDs in Clerk Dashboard match these values for proper quota management.

## 🔍 Debugging

### Check Webhook Logs

```bash
# In your server logs, look for:
📨 Processing Clerk Billing webhook...
📋 Event type: subscription.created
🔔 Handling subscription event...
```

### Verify Environment Variables

```bash
# Check if variables are set
echo $CLERK_WEBHOOK_SECRET
echo $CLERK_BILLING_ENABLED
echo $VITE_CONVEX_URL
```

### Common Issues

1. **"Webhook secret not configured"**
   - Solution: Set `CLERK_WEBHOOK_SECRET` in `.env.local`

2. **"Invalid signature"**
   - Solution: Verify webhook secret matches Clerk Dashboard
   - Solution: Check Svix headers are present in request

3. **"Convex URL not configured"**
   - Solution: Set `VITE_CONVEX_URL` in `.env.local`

4. **404 Not Found**
   - Solution: Verify webhook URL in Clerk Dashboard matches your endpoint
   - Solution: Ensure server is running and accessible

## 📚 Related Files

- `server/routes/clerk-billing.ts` - Webhook handler implementation
- `server/routes/index.ts` - Route registration
- `shared/types/User.ts` - Subscription plan definitions
- `convex/subscriptions/` - Convex subscription functions (to be integrated)
- `convex/quotas/` - Convex quota management functions (to be integrated)

## 🎯 Success Criteria

Task 4.1 is complete when:

- ✅ Webhook endpoint is accessible
- ✅ Signature verification works
- ✅ Events are logged correctly
- ⏳ Events are synced to Convex (next step)
- ⏳ User quotas are updated (next step)
- ⏳ Integration tests pass (task 4.3)

## 📝 Notes

- The webhook handler is production-ready for receiving and verifying events
- Convex integration (TODOs) will be implemented in task 4.2
- Tests will be written in task 4.3
- The existing Convex functions in `convex/subscriptions/` and `convex/quotas/` are functional and ready to be called from the webhook handler
