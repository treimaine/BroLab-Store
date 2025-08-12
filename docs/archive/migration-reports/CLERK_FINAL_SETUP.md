# Guide Final - Configuration Clerk Billing Natif

## 🎯 Objectif

Configurer Clerk Billing pour utiliser **uniquement les composants natifs** (comme `PricingTable`) sans pages personnalisées.

## ✅ Système Actuel

Le système utilise maintenant :

- **Composants natifs Clerk** - `PricingTable` comme dans Membership
- **Pas de pages personnalisées** - Suppression de `/clerk-payment`
- **Pas d'APIs personnalisées** - Suppression de `/api/clerk`
- **Redirection vers Membership** - Interface native Clerk

## 🔧 Configuration Clerk Dashboard

### 1. Activer Clerk Billing

1. Allez sur [clerk.com](https://clerk.com)
2. Connectez-vous à votre compte
3. Sélectionnez votre projet **BroLab**
4. Dans le menu de gauche, cliquez sur **"Billing"**
5. Cliquez sur **"Enable Billing"**
6. Choisissez votre plan (Free, Pro, ou Enterprise)

### 2. Configurer les Plans

Dans **"Billing"** > **"Plans"**, créez les plans suivants :

#### Plan Basic

- **Nom** : Basic
- **Prix** : $9.99/mois ou $59.88/an
- **Features** :
  - `basic_license`
  - `mp3_format`
  - `email_support`
  - `5_downloads_per_month`

#### Plan Artist

- **Nom** : Artist
- **Prix** : $19.99/mois ou $199.94/an
- **Features** :
  - `premium_license`
  - `wav_format`
  - `trackouts_available`
  - `priority_support`
  - `20_downloads_per_month`
  - `early_access`

#### Plan Ultimate

- **Nom** : Ultimate Pass
- **Prix** : $49.99/mois ou $299.94/an
- **Features** :
  - `exclusive_license`
  - `all_formats`
  - `unlimited_downloads`
  - `custom_requests`
  - `direct_contact`
  - `24_7_support`
  - `mixing_discounts`
  - `exclusive_events`

### 3. Configurer les Features

Dans **"Features"**, créez les features suivantes :

#### Licenses

- `basic_license` - License standard
- `premium_license` - License commerciale
- `exclusive_license` - License exclusive

#### Formats

- `mp3_format` - Format MP3
- `wav_format` - Format WAV
- `all_formats` - Tous les formats (WAV, MP3, STEMS)

#### Support

- `email_support` - Support par email
- `priority_support` - Support prioritaire
- `24_7_support` - Support 24/7

#### Downloads

- `5_downloads_per_month` - 5 téléchargements/mois
- `20_downloads_per_month` - 20 téléchargements/mois
- `unlimited_downloads` - Téléchargements illimités

#### Autres

- `trackouts_available` - Trackouts disponibles
- `early_access` - Accès anticipé
- `custom_requests` - Demandes personnalisées
- `direct_contact` - Contact direct
- `mixing_discounts` - Remises mixing/mastering
- `exclusive_events` - Événements exclusifs

### 4. Configurer les Méthodes de Paiement

1. Dans **"Billing"** > **"Payment Methods"**
2. Activez les méthodes de paiement :
   - **Stripe** (recommandé)
   - **PayPal** (optionnel)
   - **Apple Pay** (optionnel)
   - **Google Pay** (optionnel)

### 5. Connecter Stripe

1. Allez sur [stripe.com](https://stripe.com)
2. Créez un compte ou connectez-vous
3. Récupérez vos clés API :

   - **Publishable Key** (commence par `pk_`)
   - **Secret Key** (commence par `sk_`)

4. Dans Clerk Dashboard > **"Billing"** > **"Payment Providers"**
5. Cliquez sur **"Connect Stripe"**
6. Entrez vos clés Stripe

## 🔑 Variables d'Environnement

### Mettre à jour votre fichier `.env`

```env
# Clerk Configuration
VITE_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...

# Stripe Configuration (via Clerk)
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...

# Webhook Configuration
CLERK_WEBHOOK_SECRET=whsec_...
```

## 🚀 Flux de Paiement

### 1. Flux Normal (Abonnements)

1. **Page Membership** → `/membership`
2. **Composant natif** → `<PricingTable>`
3. **Interface Clerk** → Interface native Clerk
4. **Paiement** → Traitement natif Clerk
5. **Confirmation** → Redirection automatique

### 2. Flux Achats Ponctuels

1. **Panier** → Ajouter des produits
2. **Checkout** → `/checkout`
3. **Clic "Pay with Clerk"** → Création commande Convex
4. **Redirection** → `/membership?orderId=...&amount=...&items=...`
5. **Composant natif** → `<PricingTable>` avec résumé achat
6. **Interface Clerk** → Interface native Clerk
7. **Paiement** → Traitement natif Clerk
8. **Confirmation** → Redirection automatique

## 🧪 Test du Système

### 1. Test Abonnements

1. Allez à `/membership`
2. Vérifiez que le `PricingTable` s'affiche
3. Cliquez sur un plan
4. Vérifiez l'interface native Clerk
5. Testez avec une carte de test

### 2. Test Achats Ponctuels

1. Ajoutez un produit au panier
2. Allez à `/checkout`
3. Cliquez sur "Pay with Clerk"
4. Vérifiez la redirection vers `/membership`
5. Vérifiez le résumé d'achat
6. Testez avec une carte de test

### 3. Cartes de Test Stripe

- **Succès** : `4242 4242 4242 4242`
- **Échec** : `4000 0000 0000 0002`
- **3D Secure** : `4000 0025 0000 3155`

## 📊 Monitoring

### 1. Vérifier les Logs

- **Clerk Dashboard** > **"Logs"**
- **Stripe Dashboard** > **"Logs"**
- **Convex Dashboard** > Logs

### 2. Alertes

Configurez des alertes pour :

- Échecs de paiement
- Webhooks non livrés
- Erreurs de synchronisation

## 🔄 Synchronisation Convex

### 1. Mutations Configurées

- `createOrder` - Créer une commande
- `updateOrder` - Mettre à jour une commande

### 2. Schéma Mis à Jour

Le schéma `orders` inclut maintenant :

- `paymentId` - ID du paiement Clerk
- `paymentStatus` - Statut du paiement

## 🎉 Résultat Final

Après cette configuration, vous aurez :

✅ **Composants natifs** - Interface native Clerk  
✅ **Pas de pages personnalisées** - Suppression des pages custom  
✅ **Pas d'APIs personnalisées** - Utilisation exclusive de Clerk  
✅ **Système unifié** - Même interface pour tout  
✅ **Sécurité** - Paiements sécurisés par Clerk  
✅ **Synchronisation** - Données synchronisées avec Convex  
✅ **Monitoring** - Logs et alertes configurés

## 🆘 Support

Si vous rencontrez des problèmes :

1. Vérifiez les logs dans Clerk Dashboard
2. Vérifiez les logs dans Stripe Dashboard
3. Vérifiez les logs Convex
4. Consultez la documentation Clerk

## 📚 Ressources

- [Documentation Clerk Billing](https://clerk.com/docs/billing)
- [Guide des Webhooks](https://clerk.com/docs/webhooks)
- [Composants Natifs Clerk](https://clerk.com/docs/components)
- [API Clerk Payments](https://clerk.com/docs/reference/backend-api/payment-intents)

## 🔧 Dépannage

### Erreur : "PricingTable not found"

- Vérifiez que Clerk Billing est activé
- Vérifiez les clés API dans `.env`

### Erreur : "Webhook signature invalid"

- Vérifiez le `CLERK_WEBHOOK_SECRET`
- Vérifiez l'URL du webhook

### Erreur : "Customer not found"

- Vérifiez que l'utilisateur est connecté
- Vérifiez la synchronisation Clerk-Convex
