# 🚀 COMMENCEZ ICI - BroLab Entertainment

## 📋 Guide de Démarrage Rapide

Bienvenue dans BroLab Entertainment! Ce guide vous aidera à configurer et démarrer l'application rapidement.

## 🏗️ Architecture Actuelle

### Stack Technique Principal

- **Frontend**: React 18 + TypeScript + Vite
- **Backend**: Node.js + Express + TypeScript
- **Base de données**: Convex (temps réel)
- **Authentification**: Clerk
- **Paiements**: Stripe + PayPal
- **CMS Externe**: WordPress/WooCommerce (catalogue produits)

### ⚠️ Important: Systèmes Dépréciés

- **Supabase**: N'est plus utilisé, toutes les fonctionnalités ont été migrées vers Convex
- **Authentification personnalisée**: Remplacée par Clerk

## ✅ Configuration Initiale

### Étape 1: Installation des Dépendances

```bash
# Cloner le projet
git clone <repository-url> brolab-entertainment
cd brolab-entertainment

# Installer les dépendances
npm install
```

### Étape 2: Configuration de l'Environnement

1. **Copier le fichier d'environnement**

   ```bash
   cp .env.example .env
   ```

2. **Configurer les variables essentielles**

   Éditez `.env` et configurez:

   ```env
   # Convex (Base de données temps réel)
   CONVEX_DEPLOYMENT=dev:votre-deployment
   VITE_CONVEX_URL=https://votre-deployment.convex.cloud

   # Clerk (Authentification)
   VITE_CLERK_PUBLISHABLE_KEY=pk_test_...
   CLERK_SECRET_KEY=sk_test_...
   CLERK_WEBHOOK_SECRET=whsec_...

   # WordPress/WooCommerce (Catalogue produits)
   WOOCOMMERCE_API_URL=https://votre-site.com/wp-json/wc/v3
   WOOCOMMERCE_CONSUMER_KEY=ck_...
   WOOCOMMERCE_CONSUMER_SECRET=cs_...

   # Stripe (Paiements)
   VITE_STRIPE_PUBLIC_KEY=pk_test_...
   STRIPE_SECRET_KEY=sk_test_...
   STRIPE_WEBHOOK_SECRET=whsec_...

   # PayPal (Paiements alternatifs)
   PAYPAL_CLIENT_ID=...
   PAYPAL_CLIENT_SECRET=...
   PAYPAL_MODE=sandbox
   ```

### Étape 3: Démarrer Convex

```bash
# Démarrer le serveur de développement Convex
npx convex dev
```

### Étape 4: Démarrer l'Application

```bash
# Dans un nouveau terminal
npm run dev
```

L'application sera accessible sur:

- **Frontend**: http://localhost:5000
- **Backend API**: http://localhost:5000/api
- **Convex Dashboard**: Accessible via `npx convex dashboard`

## 📚 Documentation Complète

### Guides Essentiels

1. **`docs/development/LOCAL_DEVELOPMENT_GUIDE.md`** ⭐
   - Guide complet de configuration locale
   - Dépannage et résolution de problèmes
   - Meilleures pratiques de développement

2. **`docs/deployment/DEPLOYMENT_CHECKLIST.md`**
   - Liste de vérification pour le déploiement en production
   - Configuration des webhooks
   - Optimisations de performance

3. **`docs/testing/TESTING_GUIDE.md`**
   - Stratégies de test
   - Exécution des tests
   - Couverture de code

4. **`docs/AUTHENTICATION_GUIDE.md`**
   - Configuration de Clerk
   - Gestion des utilisateurs
   - Intégration de la facturation

5. **`docs/README.md`**
   - Index complet de la documentation
   - Navigation rapide
   - Structure du projet

### Commandes Utiles

```bash
# Développement
npm run dev              # Démarrer le serveur de développement
npm run client           # Frontend uniquement
npx convex dev           # Serveur Convex

# Tests
npm test                 # Exécuter les tests
npm run type-check       # Vérification TypeScript
npm run lint             # Vérification ESLint
npm run lint:fix         # Correction automatique

# Build
npm run build            # Build de production
npm run start            # Démarrer en production

# Convex
npx convex dashboard     # Ouvrir le dashboard Convex
npx convex deploy        # Déployer les fonctions Convex
npx convex import        # Importer des données
npx convex export        # Exporter des données

# Nettoyage
npm run clean            # Nettoyer node_modules
npm run clean:all        # Nettoyage complet
npm run clean:logs       # Nettoyer les logs
```

## 🎯 Prochaines Étapes

### Pour les Nouveaux Développeurs

1. **Lire la documentation**: Commencez par `docs/development/LOCAL_DEVELOPMENT_GUIDE.md`
2. **Explorer le code**: Familiarisez-vous avec la structure du projet
3. **Exécuter les tests**: Assurez-vous que tout fonctionne avec `npm test`
4. **Créer une branche**: Utilisez Git pour vos modifications

### Pour le Déploiement

1. **Vérifier la configuration**: Assurez-vous que toutes les variables d'environnement sont définies
2. **Tester localement**: Exécutez `npm run build` et `npm run start`
3. **Suivre la checklist**: Consultez `docs/deployment/DEPLOYMENT_CHECKLIST.md`
4. **Configurer les webhooks**: Stripe, PayPal, et Clerk

## 🆘 Besoin d'Aide?

### Ressources

1. **Documentation locale**: Dossier `docs/`
2. **README principal**: `README.md`
3. **Guides de dépannage**: `docs/development/TROUBLESHOOTING.md`

### Dashboards Externes

- **Convex**: https://dashboard.convex.dev
- **Clerk**: https://dashboard.clerk.com
- **Stripe**: https://dashboard.stripe.com
- **PayPal**: https://developer.paypal.com/dashboard

## 📞 Configuration des Services Externes

### Clerk Dashboard

**URL**: https://dashboard.clerk.com

1. **Plans de facturation** (Billing → Plans)

   | Plan ID    | Nom           | Prix        |
   | ---------- | ------------- | ----------- |
   | `free`     | Free          | $0          |
   | `basic`    | Basic         | $9.99/mois  |
   | `artist`   | Artist        | $19.99/mois |
   | `ultimate` | Ultimate Pass | $49.99/mois |

2. **Webhooks** (Webhooks → Add Endpoint)
   - **URL**: `https://votre-domaine.com/api/webhooks/clerk`
   - **Événements**: `user.*`, `session.*`, `subscription.*`, `invoice.*`

### Stripe Dashboard

**URL**: https://dashboard.stripe.com

1. **Webhooks** (Developers → Webhooks)
   - **URL**: `https://votre-domaine.com/api/webhooks/stripe`
   - **Événements**: `payment_intent.*`, `checkout.session.*`

### PayPal Dashboard

**URL**: https://developer.paypal.com/dashboard

1. **Webhooks** (Apps & Credentials → Webhooks)
   - **URL**: `https://votre-domaine.com/api/webhooks/paypal`
   - **Événements**: `PAYMENT.CAPTURE.COMPLETED`, `PAYMENT.CAPTURE.DENIED`

### Convex Dashboard

**URL**: https://dashboard.convex.dev

- Gérer les fonctions et les données en temps réel
- Surveiller les performances
- Consulter les logs

---

**Temps estimé**: 30-45 minutes (configuration complète)
**Difficulté**: Moyenne
**Prérequis**: Comptes créés sur Clerk, Stripe, PayPal, et Convex
