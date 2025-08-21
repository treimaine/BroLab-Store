#!/bin/bash

echo "🔧 Installation des dépendances Clerk et Stripe pour BroLab..."

# Vérifier que npm est installé
if ! command -v npm &> /dev/null; then
    echo "❌ npm n'est pas installé. Veuillez installer Node.js et npm d'abord."
    exit 1
fi

echo "📦 Installation des packages nécessaires..."

# Installer Stripe pour le serveur
echo "💳 Installation de Stripe..."
npm install stripe

# Installer Clerk SDK si pas déjà installé
echo "🔐 Vérification de Clerk SDK..."
if ! npm list @clerk/clerk-sdk-node &> /dev/null; then
    echo "📦 Installation de Clerk SDK..."
    npm install @clerk/clerk-sdk-node
else
    echo "✅ Clerk SDK déjà installé"
fi

# Vérifier les packages installés
echo "🔍 Vérification des packages installés..."
npm list stripe @clerk/clerk-sdk-node

echo ""
echo "✅ Installation terminée !"
echo ""
echo "📋 Prochaines étapes :"
echo "1. Créer un fichier .env.local avec vos clés Clerk et Stripe"
echo "2. Configurer Clerk Billing dans votre dashboard Clerk"
echo "3. Configurer Stripe dans votre dashboard Stripe"
echo "4. Tester le système de paiement"
echo ""
echo "📚 Documentation :"
echo "- Clerk Billing: https://clerk.com/docs/billing"
echo "- Stripe Checkout: https://stripe.com/docs/checkout"
echo ""
echo "🚀 Vous pouvez maintenant tester le système de paiement !"
