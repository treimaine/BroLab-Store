# Guide de Configuration Clerk Billing - Sans Stripe

## 🎯 Objectif

Configurer Clerk Billing pour gérer tous les paiements de l'application **sans Stripe**, en utilisant uniquement les APIs natives de Clerk.

## 📋 Prérequis

- Compte Clerk configuré
- Accès au dashboard Clerk
- Projet BroLab configuré

## 🔧 Configuration Clerk Dashboard

### 1. Activer Clerk Billing

1. Allez sur [clerk.com](https://clerk.com)
2. Connectez-vous à votre compte
3. Sélectionnez votre projet **BroLab**
4. Dans le menu de gauche, cliquez sur **"Billing"**
5. Cliquez sur **"Enable Billing"**
6. Choisissez votre plan (Free, Pro, ou Enterprise)

### 2. Configurer les Méthodes de Paiement Natives

1. Dans **"Billing"** > **"Payment Methods"**
2. Activez les méthodes de paiement natives de Clerk :
   - **Clerk Payments** (méthode native)
   - **PayPal** (optionnel)
   - **Apple Pay** (optionnel)
   - **Google Pay** (optionnel)

### 3. Configurer les Produits

1. Dans **"Billing"** > **"Products"**
2. Créez des produits pour vos beats :
   - **Nom** : "AURORA Vol.1"
   - **Description** : "Premium beat with unlimited license"
   - **Prix** : $29.99 (Basic), $49.99 (Premium), $149.99 (Unlimited)

### 4. Configurer les Webhooks

1. Dans **"Webhooks"**
2. Cliquez sur **"Add Endpoint"**
3. URL : `https://votre-domaine.com/api/clerk/webhook`
4. Sélectionnez les événements :
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `customer.subscription.created`
   - `customer.subscription.updated`

## 🔑 Variables d'Environnement

### Mettre à jour votre fichier `.env`

```env
# Clerk Configuration
VITE_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...

# Webhook Configuration
CLERK_WEBHOOK_SECRET=whsec_...

# Supprimer les variables Stripe (plus nécessaires)
# STRIPE_PUBLISHABLE_KEY=pk_test_...
# STRIPE_SECRET_KEY=sk_test_...
```

## 🚀 Test du Système

### 1. Test du Flux Complet

1. **Ajoutez un produit au panier**
2. **Allez à `/checkout`**
3. **Cliquez sur "Pay with Clerk"**
4. **Vous serez redirigé vers `/clerk-payment`**
5. **L'interface native Clerk s'affichera**
6. **Entrez les détails de paiement**
7. **Confirmez le paiement**
8. **Redirection vers la confirmation**

### 2. Vérification des Logs

- **Clerk Dashboard** > **"Logs"**
- **Votre serveur** > Console logs
- **Convex Dashboard** > Logs

## 📊 Monitoring

### 1. Vérifier les Logs

- **Clerk Dashboard** > **"Logs"**
- **Votre serveur** > Console logs
- **Convex Dashboard** > Logs

### 2. Alertes

Configurez des alertes pour :

- Échecs de paiement
- Webhooks non livrés
- Erreurs de synchronisation

## 🔄 Synchronisation Convex

### 1. Vérifier les Mutations

Les mutations Convex sont déjà configurées :

- `createOrder` - Créer une commande
- `updateOrder` - Mettre à jour une commande

### 2. Webhook Handler

Le webhook handler est configuré dans `server/routes/clerk-payments.ts`

## 🎉 Résultat Final

Après cette configuration, vous aurez :

✅ **Paiements natifs Clerk** - Interface native Clerk  
✅ **Sans Stripe** - Utilisation exclusive de Clerk  
✅ **Système unifié** - Même système que Membership  
✅ **Sécurité** - Paiements sécurisés par Clerk  
✅ **Synchronisation** - Données synchronisées avec Convex  
✅ **Monitoring** - Logs et alertes configurés

## 🆘 Support

Si vous rencontrez des problèmes :

1. Vérifiez les logs dans Clerk Dashboard
2. Vérifiez les logs de votre serveur
3. Vérifiez les logs Convex
4. Consultez la documentation Clerk

## 📚 Ressources

- [Documentation Clerk Billing](https://clerk.com/docs/billing)
- [Guide des Webhooks](https://clerk.com/docs/webhooks)
- [Composants Natifs Clerk](https://clerk.com/docs/components)
- [API Clerk Payments](https://clerk.com/docs/reference/backend-api/payment-intents)

## 🔧 Dépannage

### Erreur : "Payment intent not found"

- Vérifiez que Clerk Billing est activé
- Vérifiez les clés API dans `.env`

### Erreur : "Webhook signature invalid"

- Vérifiez le `CLERK_WEBHOOK_SECRET`
- Vérifiez l'URL du webhook

### Erreur : "Customer not found"

- Vérifiez que l'utilisateur est connecté
- Vérifiez la synchronisation Clerk-Convex
