# Guide de Configuration Clerk Billing - BroLab

## 🎯 Objectif

Configurer Clerk Billing pour gérer les paiements et abonnements de BroLab Entertainment.

## 📋 Étapes de Configuration

### 1. Activer Clerk Billing

1. **Connectez-vous au Dashboard Clerk**

   - Allez sur [https://dashboard.clerk.com](https://dashboard.clerk.com)
   - Sélectionnez votre projet BroLab

2. **Naviguez vers Billing Settings**

   - Dans le menu de gauche, cliquez sur **"Billing"**
   - Cliquez sur **"Get Started"** ou **"Enable Billing"**

3. **Choisissez votre passerelle de paiement**
   - **Pour les tests** : Utilisez "Clerk development gateway"
   - **Pour la production** : Connectez votre compte Stripe

### 2. Créer les Plans d'Abonnement

Dans le Dashboard Clerk, allez dans **"Plans"** et créez les plans suivants :

#### Plan Basic - $9.99/mois

```json
{
  "name": "Basic",
  "price": 999, // en centimes
  "interval": "month",
  "features": ["basic_license", "mp3_format", "email_support", "5_downloads_per_month"]
}
```

#### Plan Artist - $19.99/mois

```json
{
  "name": "Artist",
  "price": 1999, // en centimes
  "interval": "month",
  "features": [
    "premium_license",
    "wav_format",
    "trackouts_available",
    "priority_support",
    "20_downloads_per_month",
    "early_access"
  ]
}
```

#### Plan Ultimate - $49.99/mois

```json
{
  "name": "Ultimate",
  "price": 4999, // en centimes
  "interval": "month",
  "features": [
    "exclusive_license",
    "all_formats",
    "unlimited_downloads",
    "custom_requests",
    "direct_contact",
    "24_7_support",
    "mixing_discounts",
    "exclusive_events"
  ]
}
```

### 3. Créer les Features

Dans **"Features"**, créez les features suivantes :

#### Licenses

- `basic_license` - License standard MP3
- `premium_license` - License commerciale WAV
- `exclusive_license` - License exclusive tous formats

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

### 4. Configuration du Code

#### Variables d'Environnement

Ajoutez ces variables dans votre `.env` :

```env
# Clerk Billing
VITE_CLERK_PUBLISHABLE_KEY=pk_test_...
VITE_CLERK_SECRET_KEY=sk_test_...

# Convex
VITE_CONVEX_URL=https://...
```

#### Mise à jour du Hook useClerkBilling

Une fois Clerk Billing configuré, mettez à jour le hook :

```typescript
// Dans client/src/hooks/useClerkBilling.ts

// Vérifier les permissions de téléchargement
const canDownload = (licenseType: string) => {
  switch (licenseType) {
    case "basic":
      return hasPlan("basic") || hasPlan("artist") || hasPlan("ultimate");
    case "premium":
      return hasPlan("artist") || hasPlan("ultimate");
    case "unlimited":
      return hasPlan("ultimate");
    default:
      return false;
  }
};

// Vérifier les limites de téléchargement
const getDownloadQuota = () => {
  if (hasPlan("ultimate")) {
    return { remaining: Infinity, total: Infinity };
  } else if (hasPlan("artist")) {
    return { remaining: 20, total: 20 };
  } else if (hasPlan("basic")) {
    return { remaining: 5, total: 5 };
  } else {
    return { remaining: 0, total: 0 };
  }
};
```

### 5. Intégration des Paiements

#### Utiliser Clerk Checkout

```typescript
import { useClerk } from "@clerk/clerk-react";

const { client } = useClerk();

const handleCheckout = async () => {
  const session = await client.sessions.createCheckoutSession({
    mode: "payment",
    lineItems: [
      {
        price: "price_basic_plan",
        quantity: 1,
      },
    ],
    successUrl: `${window.location.origin}/dashboard?subscription=active`,
    cancelUrl: `${window.location.origin}/membership`,
  });

  window.location.href = session.url;
};
```

#### Gérer les Webhooks

Créer un endpoint pour gérer les webhooks Clerk :

```typescript
// Dans server/routes/webhooks.ts
app.post("/api/webhooks/clerk", async (req, res) => {
  const event = req.body;

  switch (event.type) {
    case "subscription.created":
      // Mettre à jour l'abonnement dans Convex
      break;
    case "subscription.updated":
      // Mettre à jour l'abonnement dans Convex
      break;
    case "subscription.cancelled":
      // Annuler l'abonnement dans Convex
      break;
    case "payment.succeeded":
      // Marquer le paiement comme réussi
      break;
    case "payment.failed":
      // Gérer l'échec de paiement
      break;
  }

  res.json({ received: true });
});
```

### 6. Test de la Configuration

#### Tests Fonctionnels

1. **Test de connexion**

   ```bash
   # Vérifier que l'utilisateur peut se connecter
   npm run dev
   # Aller sur http://localhost:5000
   # Se connecter avec un compte test
   ```

2. **Test d'abonnement**

   ```bash
   # Aller sur http://localhost:5000/membership
   # Tester l'abonnement avec un plan
   ```

3. **Test de téléchargement**
   ```bash
   # Aller sur http://localhost:5000/product/1
   # Tester le téléchargement avec différents plans
   ```

#### Tests de Paiement

1. **Mode Test**

   - Utilisez les cartes de test Stripe
   - Carte réussie : `4242 4242 4242 4242`
   - Carte échouée : `4000 0000 0000 0002`

2. **Mode Production**
   - Utilisez de vraies cartes de crédit
   - Testez avec de petits montants

### 7. Monitoring et Analytics

#### Dashboard Clerk

- Surveillez les abonnements dans le Dashboard Clerk
- Consultez les analytics de conversion
- Gérez les remboursements et annulations

#### Métriques Importantes

- Taux de conversion des abonnements
- Taux de rétention
- Revenu mensuel récurrent (MRR)
- Churn rate

### 8. Déploiement

#### Préparation Production

1. **Configurer Stripe Production**

   - Créer un compte Stripe production
   - Configurer les webhooks production
   - Tester avec de vrais paiements

2. **Mettre à jour les Variables d'Environnement**

   ```env
   VITE_CLERK_PUBLISHABLE_KEY=pk_live_...
   VITE_CLERK_SECRET_KEY=sk_live_...
   ```

3. **Configurer les Domaines**
   - Ajouter votre domaine dans Clerk
   - Configurer les redirections

#### Checklist de Déploiement

- [ ] Clerk Billing activé
- [ ] Plans créés
- [ ] Features configurées
- [ ] Webhooks configurés
- [ ] Tests effectués
- [ ] Variables d'environnement mises à jour
- [ ] Domaines configurés
- [ ] Monitoring activé

## 🆘 Support

### Ressources Utiles

- [Documentation Clerk Billing](https://clerk.com/docs/react/billing/b2c-saas)
- [Documentation Stripe](https://stripe.com/docs)
- [Support Clerk](https://clerk.com/support)
- [Discord Clerk](https://discord.gg/clerk)

### Problèmes Courants

1. **Erreur "Plan not found"**

   - Vérifiez que le plan existe dans Clerk
   - Vérifiez l'ID du plan dans le code

2. **Erreur "Feature not found"**

   - Vérifiez que la feature existe dans Clerk
   - Vérifiez le nom de la feature dans le code

3. **Paiement échoué**

   - Vérifiez la configuration Stripe
   - Vérifiez les logs dans le Dashboard Clerk

4. **Webhooks non reçus**
   - Vérifiez l'URL du webhook
   - Vérifiez la signature du webhook

## ✅ Statut

- [x] Guide de configuration créé
- [ ] Clerk Billing à activer
- [ ] Plans à créer
- [ ] Features à configurer
- [ ] Tests à effectuer
- [ ] Déploiement à finaliser

---

**Prochaine étape** : Suivre ce guide pour configurer Clerk Billing dans votre dashboard Clerk.
