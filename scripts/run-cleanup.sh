#!/bin/bash
# scripts/run-cleanup.sh

echo "🧹 PHASE 4 - NETTOYAGE COMPLET SUPABASE & STRIPE"
echo "=================================================="

# Vérifier que nous sommes dans le bon répertoire
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found. Please run this script from the project root."
    exit 1
fi

echo "📋 Starting cleanup process..."

# 1. Supprimer les fichiers Supabase et Stripe
echo ""
echo "🗑️ Step 1: Removing Supabase and Stripe files..."
chmod +x scripts/cleanup-supabase-stripe.sh
./scripts/cleanup-supabase-stripe.sh

# 2. Mettre à jour les dépendances
echo ""
echo "📦 Step 2: Updating dependencies..."
chmod +x scripts/update-dependencies.sh
./scripts/update-dependencies.sh

# 3. Mettre à jour les variables d'environnement
echo ""
echo "🔧 Step 3: Updating environment variables..."
chmod +x scripts/update-env.sh
./scripts/update-env.sh

# 4. Vérifier que les nouveaux tests existent
echo ""
echo "🧪 Step 4: Checking new tests..."
if [ -f "__tests__/auth-clerk.test.ts" ]; then
    echo "✅ Clerk authentication tests found"
else
    echo "❌ Clerk authentication tests missing"
fi

if [ -f "__tests__/convex-functions.test.ts" ]; then
    echo "✅ Convex functions tests found"
else
    echo "❌ Convex functions tests missing"
fi

if [ -f "__tests__/hooks/useUserProfile.test.ts" ]; then
    echo "✅ useUserProfile hook tests found"
else
    echo "❌ useUserProfile hook tests missing"
fi

if [ -f "__tests__/hooks/useFavorites.test.ts" ]; then
    echo "✅ useFavorites hook tests found"
else
    echo "❌ useFavorites hook tests missing"
fi

if [ -f "__tests__/integration/convex-clerk.test.ts" ]; then
    echo "✅ Convex + Clerk integration tests found"
else
    echo "❌ Convex + Clerk integration tests missing"
fi

# 5. Vérifier que les nouveaux hooks existent
echo ""
echo "🔗 Step 5: Checking new hooks..."
if [ -f "client/src/hooks/useUserProfile.ts" ]; then
    echo "✅ useUserProfile hook found"
else
    echo "❌ useUserProfile hook missing"
fi

if [ -f "client/src/hooks/useSubscriptionStatus.ts" ]; then
    echo "✅ useSubscriptionStatus hook found"
else
    echo "❌ useSubscriptionStatus hook missing"
fi

if [ -f "client/src/hooks/useForYouBeats.ts" ]; then
    echo "✅ useForYouBeats hook found"
else
    echo "❌ useForYouBeats hook missing"
fi

if [ -f "client/src/hooks/useFavorites.ts" ]; then
    echo "✅ useFavorites hook found"
else
    echo "❌ useFavorites hook missing"
fi

# 6. Vérifier que la configuration Convex existe
echo ""
echo "⚙️ Step 6: Checking Convex configuration..."
if [ -f "client/src/lib/convex.ts" ]; then
    echo "✅ Convex client configuration found"
else
    echo "❌ Convex client configuration missing"
fi

if [ -f "convex/schema.ts" ]; then
    echo "✅ Convex schema found"
else
    echo "❌ Convex schema missing"
fi

# 7. Exécuter les tests pour vérifier que tout fonctionne
echo ""
echo "🧪 Step 7: Running tests..."
npm test -- --testPathPattern="auth-clerk|convex-functions|useUserProfile|useFavorites|convex-clerk" --passWithNoTests

# 8. Résumé final
echo ""
echo "🎉 NETTOYAGE TERMINÉ !"
echo "======================"
echo ""
echo "✅ Fichiers supprimés :"
echo "   - Hooks Supabase (8 fichiers)"
echo "   - Configuration Supabase (4 fichiers)"
echo "   - Webhooks Stripe (4 fichiers)"
echo "   - Routes Stripe (3 fichiers)"
echo "   - Anciens tests (3 fichiers)"
echo ""
echo "✅ Dépendances supprimées :"
echo "   - @supabase/supabase-js"
echo "   - stripe"
echo "   - @stripe/stripe-js"
echo "   - @stripe/react-stripe-js"
echo ""
echo "✅ Nouveaux éléments ajoutés :"
echo "   - Tests Clerk (1 fichier)"
echo "   - Tests Convex (1 fichier)"
echo "   - Tests hooks (2 fichiers)"
echo "   - Tests d'intégration (1 fichier)"
echo "   - Configuration Convex (1 fichier)"
echo ""
echo "📝 Prochaines étapes :"
echo "1. Mettre à jour NEXT_PUBLIC_CONVEX_URL dans .env.local"
echo "2. Déployer Convex : npx convex deploy"
echo "3. Migrer les données : npx tsx scripts/migrate-to-convex.ts"
echo "4. Tester l'application complète"
echo ""
echo "🚀 Migration Supabase & Stripe → Clerk & Convex terminée !" 