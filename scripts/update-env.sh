#!/bin/bash
# scripts/update-env.sh

echo "🔧 Updating environment variables..."

# Vérifier si le fichier .env.local existe
if [ ! -f .env.local ]; then
    echo "❌ .env.local file not found. Creating it..."
    touch .env.local
fi

# Créer un backup
echo "💾 Creating backup..."
cp .env.local .env.local.backup
echo "✅ Backup created: .env.local.backup"

# Supprimer les variables Supabase et Stripe
echo "🗑️ Removing Supabase and Stripe variables..."

# Supprimer les lignes contenant SUPABASE_
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    sed -i '' '/SUPABASE_/d' .env.local
    sed -i '' '/STRIPE_/d' .env.local
else
    # Linux
    sed -i '/SUPABASE_/d' .env.local
    sed -i '/STRIPE_/d' .env.local
fi

# Ajouter les variables Convex
echo "➕ Adding Convex variables..."
echo "" >> .env.local
echo "# Convex Configuration" >> .env.local
echo "NEXT_PUBLIC_CONVEX_URL=your_convex_url" >> .env.local

echo "✅ Environment variables updated!"
echo "📝 Please update NEXT_PUBLIC_CONVEX_URL with your actual Convex URL" 