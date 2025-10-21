# Guide de Configuration des Paiements Clerk

## Étape 1: Configuration du Dashboard Clerk

### 1.1 Accéder au Dashboard Clerk

1. Allez sur [clerk.com](https://clerk.com)
2. Connectez-vous à votre compte
3. Sélectionnez votre projet BroLab

### 1.2 Activer les Paiements

1. Dans le menu de gauche, cliquez sur **"Billing"**
2. Cliquez sur **"Enable Billing"**
3. Choisissez votre plan (Free, Pro, ou Enterprise)

### 1.3 Configurer les Méthodes de Paiement

1. Dans **"Billing"** > **"Payment Methods"**
2. Activez les méthodes de paiement souhaitées :
   - Stripe (recommandé)
   - PayPal
   - Apple Pay
   - Google Pay

## Étape 2: Configuration Stripe (Recommandé)

### 2.1 Créer un Compte Stripe

1. Allez sur [stripe.com](https://stripe.com)
2. Créez un compte ou connectez-vous
3. Récupérez vos clés API :
   - **Publishable Key** (commence par `pk_`)
   - **Secret Key** (commence par `sk_`)

### 2.2 Connecter Stripe à Clerk

1. Dans Clerk Dashboard > **"Billing"** > **"Payment Providers"**
2. Cliquez sur **"Connect Stripe"**
3. Entrez vos clés Stripe
4. Testez la connexion

## Étape 3: Configuration des Variables d'Environnement

### 3.1 Mettre à jour votre fichier `.env`

```env
# Clerk Configuration
VITE_CLERK_PUBLISHABLE_KEY=pk_test_votre_clé_clerk_ici
CLERK_SECRET_KEY=sk_test_votre_clé_secrète_clerk_ici

# Stripe Configuration (si vous utilisez Stripe)
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_votre_clé_stripe_ici
STRIPE_SECRET_KEY=sk_test_votre_clé_secrète_stripe_ici

# Convex Configuration
VITE_CONVEX_URL=https://votre_projet.convex.cloud
```

## Étape 4: Configuration des Webhooks

### 4.1 Configurer les Webhooks Clerk

1. Dans Clerk Dashboard > **"Webhooks"**
2. Cliquez sur **"Add Endpoint"**
3. URL: `https://votre-domaine.com/api/webhooks/clerk`
4. Événements à écouter :
   - `user.created`
   - `user.updated`
   - `session.created`
   - `session.ended`
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`

### 4.2 Créer l'Endpoint Webhook

Créez le fichier `server/routes/webhooks.ts` :

```typescript
import express from "express";
import { Webhook } from "svix";
import { headers } from "@clerk/nextjs/server";

const router = express.Router();

router.post("/clerk", async (req, res) => {
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;

  if (!WEBHOOK_SECRET) {
    throw new Error("Please add CLERK_WEBHOOK_SECRET from Clerk Dashboard to .env");
  }

  const headerPayload = headers();
  const svix_id = headerPayload["svix-id"];
  const svix_timestamp = headerPayload["svix-timestamp"];
  const svix_signature = headerPayload["svix-signature"];

  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new Response("Error occurred -- no svix headers", {
      status: 400,
    });
  }

  const svix = new Webhook(WEBHOOK_SECRET);
  let evt;

  try {
    evt = svix.verify(JSON.stringify(req.body), {
      "svix-id": svix_id,
      "svix-timestamp": svix_timestamp,
      "svix-signature": svix_signature,
    });
  } catch (err) {
    console.error("Error verifying webhook:", err);
    return res.status(400).json({ error: "Webhook verification failed" });
  }

  const { id } = evt.data;
  const eventType = evt.type;

  console.log(`Webhook with ID: ${id} and type: ${eventType}`);
  console.log("Webhook body:", evt.data);

  // Gérer les événements de paiement
  if (eventType === "payment_intent.succeeded") {
    // Traiter le paiement réussi
    console.log("Payment succeeded:", evt.data);
  }

  if (eventType === "payment_intent.payment_failed") {
    // Traiter l'échec de paiement
    console.log("Payment failed:", evt.data);
  }

  res.status(200).json({ success: true });
});

export default router;
```

## Étape 5: Mise à Jour du Code

### 5.1 Installer les Dépendances

```bash
npm install svix @clerk/nextjs
```

### 5.2 Mettre à jour le Composant de Paiement

Le composant `ClerkPaymentForm` utilise maintenant les vraies APIs de Clerk.

### 5.3 Configuration des Plans d'Abonnement

Dans Clerk Dashboard > **"Billing"** > **"Products"** :

1. **Créer un Produit** :
   - Nom: "BroLab Beats"
   - Description: "Premium beats and music production services"

2. **Créer des Prix** :
   - Basic License: $29.99
   - Premium License: $49.99
   - Unlimited License: $99.99

## Étape 6: Test des Paiements

### 6.1 Cartes de Test Stripe

Utilisez ces cartes pour tester :

- **Succès**: `4242 4242 4242 4242`
- **Échec**: `4000 0000 0000 0002`
- **CVC**: `123`
- **Date d'expiration**: `12/25`

### 6.2 Tester le Flux Complet

1. Ajoutez un produit au panier
2. Allez à la page de checkout
3. Remplissez les informations de paiement
4. Vérifiez que le paiement est traité
5. Vérifiez que la commande est créée dans Convex

## Étape 7: Monitoring et Logs

### 7.1 Vérifier les Logs

- Clerk Dashboard > **"Logs"**
- Stripe Dashboard > **"Logs"**
- Votre serveur > Console logs

### 7.2 Alertes

Configurez des alertes pour :

- Échecs de paiement
- Webhooks non livrés
- Erreurs de traitement

## Problèmes Courants

### Problème 1: Webhook non reçu

**Solution**: Vérifiez l'URL du webhook et les headers

### Problème 2: Paiement échoue

**Solution**: Vérifiez les clés API et la configuration Stripe

### Problème 3: Commande non créée

**Solution**: Vérifiez la connexion Convex et les mutations

## Support

Si vous rencontrez des problèmes :

1. Vérifiez les logs dans Clerk Dashboard
2. Vérifiez les logs dans Stripe Dashboard
3. Vérifiez les logs de votre serveur
4. Contactez le support Clerk si nécessaire

## Ressources

- [Documentation Clerk Billing](https://clerk.com/docs/billing)
- [Documentation Stripe](https://stripe.com/docs)
- [Guide des Webhooks](https://clerk.com/docs/webhooks)
