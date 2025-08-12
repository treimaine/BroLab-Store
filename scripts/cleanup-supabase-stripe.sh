#!/bin/bash
# scripts/cleanup-supabase-stripe.sh

echo "🧹 Starting cleanup of Supabase and Stripe code..."

# 1. Supprimer les hooks Supabase
echo "📁 Removing Supabase hooks..."
rm -f client/src/hooks/useSupabaseAuth.ts
rm -f client/src/hooks/useAuthSupabase.ts
rm -f client/src/hooks/useSupabaseUser.ts
rm -f client/src/hooks/useSupabaseData.ts
rm -f client/src/hooks/useSupabaseQuery.ts
rm -f client/src/hooks/useSupabaseMutation.ts
rm -f client/src/hooks/useSupabaseReservations.ts
rm -f client/src/hooks/useSupabaseOrders.ts

# 2. Supprimer la configuration Supabase
echo "⚙️ Removing Supabase configuration..."
rm -f server/lib/supabase.ts
rm -f server/lib/supabaseClient.ts
rm -f server/lib/supabaseAdmin.ts
rm -f server/lib/supabaseAuth.ts

# 3. Supprimer les webhooks Stripe
echo "💳 Removing Stripe webhooks..."
rm -f server/routes/stripeWebhook.ts
rm -f server/routes/subscription.ts
rm -f server/services/stripe.ts
rm -f server/services/stripeWebhook.ts

# 4. Supprimer les routes Stripe
echo "🛣️ Removing Stripe routes..."
rm -f server/routes/stripe.ts
rm -f server/routes/payment.ts
rm -f server/routes/billing.ts

# 5. Supprimer les anciens tests
echo "🧪 Removing old tests..."
rm -f __tests__/api-payment.test.ts
rm -f __tests__/api-subscription.test.ts
rm -f __tests__/api-order-status.test.ts

# 6. Supprimer les composants Stripe
echo "🎨 Removing Stripe components..."
rm -f client/src/components/StripeCheckoutForm.tsx
rm -f client/src/components/payment/EnhancedCheckoutForm.tsx
rm -f client/src/components/payment/SubscriptionBilling.tsx

# 7. Supprimer les pages Stripe
echo "📄 Removing Stripe pages..."
rm -f client/src/pages/enhanced-checkout.tsx

# 8. Supprimer les librairies Stripe
echo "📚 Removing Stripe libraries..."
rm -f client/src/lib/stripe.ts

echo "✅ Cleanup completed!" 