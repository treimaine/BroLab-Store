#!/bin/bash
# scripts/update-dependencies.sh

echo "📦 Updating dependencies..."

# Supprimer les dépendances Supabase et Stripe
echo "🗑️ Removing Supabase and Stripe dependencies..."
npm uninstall @supabase/supabase-js
npm uninstall stripe
npm uninstall @stripe/stripe-js
npm uninstall @stripe/react-stripe-js

# Ajouter les dépendances Convex si pas déjà présentes
echo "➕ Adding Convex dependencies..."
npm install convex

# Vérifier que les dépendances sont bien installées
echo "✅ Checking installed dependencies..."
npm list convex

echo "✅ Dependencies updated!" 