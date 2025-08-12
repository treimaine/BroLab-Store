# Guide - Paiements Directs Clerk

## 🎯 Objectif

Configurer Clerk pour gérer les **paiements directs** (achats ponctuels) sans redirection vers la page Membership.

## ✅ Système Actuel

Le système utilise maintenant :

- **Paiement direct** - Pas de redirection vers `/membership`
- **Composant natif** - `ClerkPaymentForm` pour les achats ponctuels
- **Interface unifiée** - Même style que les autres composants
- **Processus direct** - Checkout → Paiement → Confirmation

## 🔧 Configuration Clerk Dashboard

### 1. Activer Clerk Billing

1. Allez sur [clerk.com](https://clerk.com)
2. Connectez-vous à votre compte
3. Sélectionnez votre projet **BroLab**
4. Dans le menu de gauche, cliquez sur **"Billing"**
5. Cliquez sur **"Enable Billing"**
6. Choisissez votre plan (Free, Pro, ou Enterprise)

### 2. Configurer les Produits pour Achats Ponctuels

Dans **"Billing"** > **"Products"**, créez des produits pour vos beats :

#### Produit Beat Basic

- **Nom** : "Beat - Basic License"
- **Description** : "Basic license for beat usage"
- **Prix** : $29.99
- **Type** : One-time purchase

#### Produit Beat Premium

- **Nom** : "Beat - Premium License"
- **Description** : "Premium license for commercial use"
- **Prix** : $49.99
- **Type** : One-time purchase

#### Produit Beat Unlimited

- **Nom** : "Beat - Unlimited License"
- **Description** : "Unlimited license for all uses"
- **Prix** : $149.99
- **Type** : One-time purchase

### 3. Configurer les Méthodes de Paiement

1. Dans **"Billing"** > **"Payment Methods"**
2. Activez les méthodes de paiement :
   - **Stripe** (recommandé)
   - **PayPal** (optionnel)
   - **Apple Pay** (optionnel)
   - **Google Pay** (optionnel)

### 4. Connecter Stripe

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

## 🚀 Flux de Paiement Direct

### Flux Achats Ponctuels

1. **Panier** → Ajouter des produits
2. **Checkout** → `/checkout`
3. **Clic "Pay with Clerk"** → Création commande Convex
4. **Formulaire de paiement** → `ClerkPaymentForm` natif
5. **Paiement** → Traitement direct Clerk
6. **Confirmation** → Redirection vers `/order-confirmation`

## 🧪 Test du Système

### Test Achats Ponctuels

1. Ajoutez un produit au panier
2. Allez à `/checkout`
3. Cliquez sur "Pay with Clerk"
4. Vérifiez l'affichage du formulaire de paiement
5. Testez avec une carte de test
6. Vérifiez la redirection vers la confirmation

### Cartes de Test Stripe

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

✅ **Paiements directs** - Pas de redirection vers Membership  
✅ **Interface native** - Composants Clerk natifs  
✅ **Processus simple** - Checkout → Paiement → Confirmation  
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

### Erreur : "Payment form not found"

- Vérifiez que Clerk Billing est activé
- Vérifiez les clés API dans `.env`

### Erreur : "Webhook signature invalid"

- Vérifiez le `CLERK_WEBHOOK_SECRET`
- Vérifiez l'URL du webhook

### Erreur : "Customer not found"

- Vérifiez que l'utilisateur est connecté
- Vérifiez la synchronisation Clerk-Convex
