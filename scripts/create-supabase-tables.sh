#!/bin/bash

# Script de création des tables Supabase
# Usage: ./scripts/create-supabase-tables.sh

echo "🚀 Démarrage de la création des tables Supabase..."

# Vérifier que les variables d'environnement sont présentes
if [ -z "$SUPABASE_URL" ] || [ -z "$SUPABASE_SERVICE_ROLE_KEY" ]; then
    echo "❌ Variables d'environnement manquantes:"
    echo "   - SUPABASE_URL: ${SUPABASE_URL:-'Non défini'}"
    echo "   - SUPABASE_SERVICE_ROLE_KEY: ${SUPABASE_SERVICE_ROLE_KEY:-'Non défini'}"
    echo ""
    echo "💡 Ajoutez ces variables dans votre fichier .env:"
    echo "   SUPABASE_URL=https://your-project-ref.supabase.co"
    echo "   SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
    exit 1
fi

echo "✅ Variables d'environnement détectées"
echo "📋 SUPABASE_URL: $SUPABASE_URL"
echo ""

# Test de connexion basique d'abord
echo "🔍 Test de connexion à Supabase..."
node scripts/test-supabase-connection.js

if [ $? -ne 0 ]; then
    echo "❌ Échec du test de connexion. Vérifiez vos credentials Supabase."
    exit 1
fi

echo ""
echo "✅ Connexion Supabase confirmée!"
echo ""

# Note: Pour exécuter le SQL, nous aurions besoin de psql ou d'une autre méthode
# Ici, nous fournissons les instructions à l'utilisateur
echo "📋 ÉTAPES SUIVANTES POUR CRÉER LES TABLES:"
echo ""
echo "1. Connectez-vous à votre dashboard Supabase:"
echo "   https://app.supabase.com/project/YOUR_PROJECT_ID/editor"
echo ""
echo "2. Allez dans SQL Editor et exécutez le contenu du fichier:"
echo "   scripts/supabase-schema.sql"
echo ""
echo "3. Ou utilisez psql si vous avez DATABASE_URL:"
echo "   psql \$DATABASE_URL -f scripts/supabase-schema.sql"
echo ""
echo "🎯 Contenu du fichier schema SQL créé:"
echo "   - ✅ 8 tables (users, beats, cart_items, orders, subscriptions, downloads, service_orders, activity_log)"
echo "   - ✅ Index de performance"
echo "   - ✅ Contraintes de sécurité"
echo "   - ✅ Types compatibles avec TypeScript schema"
echo ""
echo "Une fois les tables créées, relancez le test:"
echo "   node scripts/test-supabase-connection.js"
echo ""
echo "✅ Script terminé!"