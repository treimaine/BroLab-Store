# Guide de Configuration Clerk - Système de Paiement Unifié

## 🎯 Objectif

Configurer Clerk pour gérer tous les paiements de l'application (achats, abonnements, téléchargements) avec le même système que la page Membership.

## 📋 Prérequis

- Compte Clerk configuré
- Compte Stripe (recommandé) ou PayPal
- Accès au dashboard Clerk

## 🔧 Configuration Clerk Dashboard

### 1. Activer Clerk Billing

1. Allez sur [clerk.com](https://clerk.com)
2. Connectez-vous à votre compte
3. Sélectionnez votre projet BroLab
4. Dans le menu de gauche, cliquez sur **"Billing"**
5. Cliquez sur **"Enable Billing"**
6. Choisissez votre plan (Free, Pro, ou Enterprise)

### 2. Configurer les Méthodes de Paiement

1. Dans **"Billing"** > **"Payment Methods"**
2. Activez les méthodes de paiement souhaitées :
   - **Stripe** (recommandé)
   - **PayPal**
   - **Apple Pay**
   - **Google Pay**

### 3. Connecter Stripe

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

# Stripe Configuration (si utilisé)
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...

# Webhook Configuration
CLERK_WEBHOOK_SECRET=whsec_...
```

## 🚀 Intégration dans le Code

### 1. Remplacer la Simulation par les Vraies APIs

Dans `client/src/components/ClerkPayment.tsx`, remplacer la simulation par les vraies APIs :

```typescript
import { useUser } from "@clerk/clerk-react";
import { useState } from "react";

export function ClerkPayment({ amount, onSuccess, onError, orderId, description }) {
  const { user } = useUser();
  const [isProcessing, setIsProcessing] = useState(false);

  const handlePayment = async () => {
    if (!user) {
      onError({ message: "User must be authenticated" });
      return;
    }

    setIsProcessing(true);

    try {
      // Créer un PaymentIntent avec Clerk
      const response = await fetch("/api/create-payment-intent", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount: amount * 100, // Stripe utilise les centimes
          currency: "usd",
          customer: user.id,
          orderId,
          description,
        }),
      });

      const { clientSecret } = await response.json();

      // Confirmer le paiement avec Stripe
      const { error, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: elements.getElement("card"),
          billing_details: {
            name: user.fullName,
            email: user.emailAddresses[0]?.emailAddress,
          },
        },
      });

      if (error) {
        onError(error);
      } else {
        onSuccess(paymentIntent);
      }
    } catch (error) {
      onError(error);
    } finally {
      setIsProcessing(false);
    }
  };

  // ... reste du composant
}
```

### 2. Créer l'API Backend

Créer `server/routes/payments.ts` :

```typescript
import express from "express";
import Stripe from "stripe";

const router = express.Router();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

router.post("/create-payment-intent", async (req, res) => {
  try {
    const { amount, currency, customer, orderId, description } = req.body;

    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency,
      customer,
      metadata: {
        orderId,
        description,
      },
    });

    res.json({ clientSecret: paymentIntent.client_secret });
  } catch (error) {
    console.error("Error creating payment intent:", error);
    res.status(500).json({ error: "Failed to create payment intent" });
  }
});

export default router;
```

### 3. Configurer les Webhooks

Dans Clerk Dashboard > **"Webhooks"** :

1. Cliquez sur **"Add Endpoint"**
2. URL : `https://votre-domaine.com/api/webhooks/clerk`
3. Sélectionnez les événements :
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `customer.subscription.created`
   - `customer.subscription.updated`

## 🧪 Test du Système

### 1. Cartes de Test Stripe

Utilisez ces cartes pour tester :

- **Succès** : `4242 4242 4242 4242`
- **Échec** : `4000 0000 0000 0002`
- **3D Secure** : `4000 0025 0000 3155`

### 2. Test du Flux Complet

1. Ajoutez un produit au panier
2. Allez à la page de checkout
3. Cliquez sur "Pay"
4. Entrez les détails de la carte de test
5. Confirmez le paiement
6. Vérifiez la redirection vers la confirmation

## 📊 Monitoring

### 1. Vérifier les Logs

- **Clerk Dashboard** > **"Logs"**
- **Stripe Dashboard** > **"Logs"**
- **Votre serveur** > Console logs

### 2. Alertes

Configurez des alertes pour :

- Échecs de paiement
- Webhooks non livrés
- Erreurs de synchronisation

## 🔄 Synchronisation Convex

### 1. Mettre à jour les Mutations

Dans `convex/orders/createOrder.ts` :

```typescript
export const createOrder = mutation({
  args: {
    items: v.array(
      v.object({
        productId: v.string(),
        name: v.string(),
        price: v.number(),
        license: v.string(),
        quantity: v.number(),
      })
    ),
    total: v.number(),
    email: v.string(),
    status: v.string(),
    paymentId: v.optional(v.string()),
    paymentStatus: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const order = await ctx.db.insert("orders", {
      userId: identity.subject,
      items: args.items,
      total: args.total,
      email: args.email,
      status: args.status,
      paymentId: args.paymentId,
      paymentStatus: args.paymentStatus,
      createdAt: new Date().toISOString(),
    });

    return { success: true, orderId: order };
  },
});
```

### 2. Webhook Handler

Dans `server/routes/webhooks.ts` :

```typescript
router.post("/clerk", async (req, res) => {
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;

  if (!WEBHOOK_SECRET) {
    throw new Error("Please add CLERK_WEBHOOK_SECRET from Clerk Dashboard to .env");
  }

  const svix_id = req.headers["svix-id"] as string;
  const svix_timestamp = req.headers["svix-timestamp"] as string;
  const svix_signature = req.headers["svix-signature"] as string;

  if (!svix_id || !svix_timestamp || !svix_signature) {
    return res.status(400).json({ error: "Missing svix headers" });
  }

  const evt = svix.verify(
    JSON.stringify(req.body),
    {
      "svix-id": svix_id,
      "svix-timestamp": svix_timestamp,
      "svix-signature": svix_signature,
    },
    WEBHOOK_SECRET
  );

  const { id } = evt.data;
  const eventType = evt.type;

  console.log(`Webhook with ID: ${id} and type: ${eventType}`);

  // Gérer les événements de paiement
  if (eventType === "payment_intent.succeeded") {
    const paymentIntent = evt.data;
    console.log("Payment succeeded:", paymentIntent);

    // Mettre à jour la commande dans Convex
    // await updateOrderStatus(paymentIntent.metadata.orderId, "completed");
  }

  if (eventType === "payment_intent.payment_failed") {
    const paymentIntent = evt.data;
    console.log("Payment failed:", paymentIntent);

    // Mettre à jour la commande dans Convex
    // await updateOrderStatus(paymentIntent.metadata.orderId, "failed");
  }

  res.json({ success: true });
});
```

## 🎉 Résultat Final

Après cette configuration, vous aurez :

✅ **Système unifié** - Tous les paiements passent par Clerk  
✅ **Interface native** - Composants Clerk natifs  
✅ **Sécurité** - Paiements sécurisés par Stripe  
✅ **Synchronisation** - Données synchronisées avec Convex  
✅ **Monitoring** - Logs et alertes configurés

## 🆘 Support

Si vous rencontrez des problèmes :

1. Vérifiez les logs dans Clerk Dashboard
2. Vérifiez les logs dans Stripe Dashboard
3. Vérifiez les logs de votre serveur
4. Consultez la documentation Clerk et Stripe

## 📚 Ressources

- [Documentation Clerk Billing](https://clerk.com/docs/billing)
- [Documentation Stripe](https://stripe.com/docs)
- [Guide des Webhooks](https://clerk.com/docs/webhooks)
