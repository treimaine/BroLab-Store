# Convex and Clerk Integration Migration Guide

## What was changed:

### ✅ Added:
- `convex/clerk/webhooks.ts` - Proper Clerk webhook handler
- `convex/sync/woocommerce.ts` - WooCommerce to Convex sync
- `server/services/WooCommerceService.ts` - Clean WooCommerce integration
- `client/src/hooks/useConvex.ts` - TypeScript-safe Convex hooks
- `client/src/lib/convex.ts` - Centralized Convex configuration

### 🔄 Updated:
- `convex/users.ts` - Added internal mutations for Clerk webhooks
- `convex/http.ts` - Proper webhook routing
- `convex/auth.config.ts` - Environment-aware configuration
- `server/routes/woo.ts` - Added sync endpoints
- `client/src/main.tsx` - Cleaner Convex/Clerk setup

### ❌ Removed:
- Redundant Clerk route handlers
- Old Supabase integration files
- Duplicate subscription management (using Clerk Billing)

## Next Steps:

1. **Update your Clerk webhook URL** to point to:
   - Development: `https://your-convex-url.convex.cloud/clerk-webhook`
   - Production: `https://your-convex-url.convex.cloud/clerk-webhook`

2. **Test the integration**:
   ```bash
   # Sync products from WooCommerce to Convex
   curl -X POST http://localhost:5000/api/woo/sync/products \
     -H "Content-Type: application/json" \
     -d '{"page": 1, "perPage": 10}'
   ```

3. **Update your environment variables**:
   - Ensure `CLERK_WEBHOOK_SECRET` is set
   - Verify `VITE_CONVEX_URL` points to correct deployment
   - Check WooCommerce API credentials

4. **Deploy Convex functions**:
   ```bash
   npx convex deploy
   ```

## Benefits:

- ✅ Proper TypeScript support throughout
- ✅ Real-time data synchronization with Convex
- ✅ Clean separation of concerns
- ✅ Maintained WooCommerce compatibility
- ✅ Reduced code duplication
- ✅ Better error handling and logging

## Troubleshooting:

If you encounter issues:
1. Check Convex deployment status: `npx convex dev`
2. Verify Clerk webhook configuration
3. Test WooCommerce API connectivity
4. Check browser console for client-side errors
