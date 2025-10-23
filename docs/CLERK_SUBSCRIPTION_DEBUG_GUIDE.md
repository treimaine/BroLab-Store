# Guide de Débogage: Souscriptions Clerk

## Commandes Rapides

### 1. Vérifier l'État Actuel

```bash
# Voir un rapport complet de toutes les souscriptions
npx convex run admin/verifySubscriptions:verifyAllSubscriptions

# Lister toutes les souscriptions avec détails
npx convex run admin/verifySubscriptions:listAllSubscriptions

# Vérifier vos propres souscriptions (nécessite d'être connecté)
npx convex run admin/verifySubscriptions:verifyUserSubscriptions
```

### 2. Nettoyer les Données Incorrectes

```bash
# Supprimer les souscriptions avec des dates dans le futur
npx convex run admin/cleanSubscriptions:cleanTestSubscriptions

# Supprimer les souscriptions en double
npx convex run admin/cleanSubscriptions:removeDuplicateSubscriptions

# ⚠️ ATTENTION: Réinitialiser TOUTES les souscriptions (développement uniquement!)
npx convex run admin/cleanSubscriptions:resetAllToFree
```

## Interprétation des Résultats

### Rapport de Vérification

```json
{
  "summary": {
    "total": 5,
    "byStatus": {
      "active": 2,
      "cancelled": 1,
      "past_due": 0,
      "unpaid": 0
    },
    "byPlan": {
      "free": 3,
      "ultimate": 2
    }
  },
  "issues": {
    "count": 2,
    "futureStart": 1,
    "pastEnd": 1,
    "details": [...]
  },
  "healthy": false
}
```

**Interprétation:**

- ✅ `healthy: true` = Aucun problème détecté
- ❌ `healthy: false` = Des problèmes ont été trouvés
- `futureStart` = Souscriptions qui commencent dans le futur (anormal)
- `pastEnd` = Souscriptions actives mais expirées (anormal)

### Problèmes Courants

#### 1. Date dans le Futur (Aug 8, 2026)

```json
{
  "issue": "Start date is more than 24h in the future",
  "planId": "ultimate",
  "status": "active",
  "dates": {
    "start": "2026-08-08T00:00:00.000Z",
    "end": "2026-09-08T00:00:00.000Z"
  }
}
```

**Solution:** Exécuter `cleanTestSubscriptions`

#### 2. Souscription Expirée mais Active

```json
{
  "issue": "End date is in the past but status is still active",
  "planId": "basic",
  "status": "active",
  "dates": {
    "start": "2024-10-01T00:00:00.000Z",
    "end": "2024-11-01T00:00:00.000Z"
  }
}
```

**Solution:** Webhook Clerk non reçu, vérifier la configuration

#### 3. Plusieurs Souscriptions pour un Utilisateur

```json
{
  "userId": "abc123",
  "subscriptionCount": 3,
  "subscriptions": [...]
}
```

**Solution:** Exécuter `removeDuplicateSubscriptions`

## Workflow de Correction Complet

### Étape 1: Diagnostic Initial

```bash
# 1. Vérifier l'état global
npx convex run admin/verifySubscriptions:verifyAllSubscriptions

# 2. Noter les problèmes détectés
# - Nombre de souscriptions avec dates futures
# - Nombre de souscriptions expirées
# - Nombre de doublons
```

### Étape 2: Nettoyage

```bash
# 1. Nettoyer les dates futures
npx convex run admin/cleanSubscriptions:cleanTestSubscriptions

# 2. Supprimer les doublons
npx convex run admin/cleanSubscriptions:removeDuplicateSubscriptions

# 3. Vérifier à nouveau
npx convex run admin/verifySubscriptions:verifyAllSubscriptions
```

### Étape 3: Vérification dans l'Interface

1. Se déconnecter de l'application
2. Se reconnecter
3. Aller dans Dashboard → Settings → Billing
4. Vérifier que:
   - ✅ Le plan affiché correspond à la réalité
   - ✅ Les dates sont correctes
   - ✅ Le statut est cohérent

### Étape 4: Test de Changement de Plan

1. Dans Billing, cliquer sur "Switch to this plan" pour un autre plan
2. Vérifier que:
   - ✅ La date de début est aujourd'hui ou dans le passé proche
   - ✅ Le statut change correctement
   - ✅ Pas de message d'erreur

## Configuration Clerk Dashboard

### Vérifier les Plans

1. Aller sur https://dashboard.clerk.com
2. Naviguer vers **Billing → Plans**
3. Vérifier que ces plans existent:

| Plan ID    | Nom           | Prix        | Features                  |
| ---------- | ------------- | ----------- | ------------------------- |
| `free`     | Free          | $0          | Accès de base             |
| `basic`    | Basic         | $9.99/mois  | 5 téléchargements/mois    |
| `artist`   | Artist        | $19.99/mois | 20 téléchargements/mois   |
| `ultimate` | Ultimate Pass | $49.99/mois | Téléchargements illimités |

### Vérifier les Webhooks

1. Dans Clerk Dashboard → **Webhooks**
2. Vérifier l'endpoint: `https://votre-domaine.com/api/webhooks/clerk`
3. Événements activés:
   - ✅ `subscription.created`
   - ✅ `subscription.updated`
   - ✅ `subscription.deleted`
   - ✅ `invoice.created`
   - ✅ `invoice.paid`

4. Tester le webhook:
   ```bash
   # Dans les logs du serveur, vous devriez voir:
   📥 Clerk webhook received: { type: 'subscription.created', ... }
   ```

## Debugging Avancé

### Vérifier les Logs Convex

1. Ouvrir le Dashboard Convex: https://dashboard.convex.dev
2. Aller dans **Logs**
3. Filtrer par fonction: `subscriptions/createOrUpdateFromClerk`
4. Chercher les erreurs ou warnings

### Vérifier les Logs Serveur

```bash
# Démarrer le serveur en mode debug
npm run server

# Chercher dans les logs:
# ✅ "📥 Clerk webhook received"
# ✅ "✅ Subscription upserted"
# ❌ "❌ Error processing webhook"
```

### Tester Manuellement un Webhook

```bash
# Utiliser curl pour simuler un webhook Clerk
curl -X POST http://localhost:5000/api/webhooks/clerk \
  -H "Content-Type: application/json" \
  -H "svix-id: msg_test" \
  -H "svix-timestamp: $(date +%s)" \
  -H "svix-signature: v1,test" \
  -d '{
    "type": "subscription.created",
    "data": {
      "id": "sub_test123",
      "user_id": "user_test",
      "plan": { "id": "basic" },
      "status": "active",
      "current_period_start": '$(date +%s)',
      "current_period_end": '$(date -d "+1 month" +%s)'
    }
  }'
```

## Prévention Future

### 1. Ajouter des Validations

Dans `convex/subscriptions/createOrUpdateFromClerk.ts`, ajouter:

```typescript
// Valider les dates
const now = Date.now();
if (currentPeriodStart > now + 86400000) {
  console.error("⚠️ Invalid start date (too far in future):", {
    received: new Date(currentPeriodStart),
    now: new Date(now),
  });
  currentPeriodStart = now;
}
```

### 2. Monitoring Automatique

Créer un cron job qui vérifie quotidiennement:

```typescript
// convex/crons.ts
import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

crons.daily(
  "check-subscription-health",
  { hourUTC: 2, minuteUTC: 0 },
  internal.admin.verifySubscriptions.verifyAllSubscriptions
);

export default crons;
```

### 3. Alertes

Configurer des alertes pour:

- Souscriptions avec dates futures
- Souscriptions expirées mais actives
- Utilisateurs avec plusieurs souscriptions
- Webhooks Clerk non reçus

## FAQ

### Q: Pourquoi "Ultimate Pass" est marqué comme actif alors que je suis en Free?

**R:** C'est un problème de données de test dans Convex. Exécutez `cleanTestSubscriptions` pour corriger.

### Q: Pourquoi la date affiche Aug 8, 2026?

**R:** Des données de test ont été créées avec des timestamps incorrects. Utilisez `cleanTestSubscriptions`.

### Q: Comment savoir quel est mon vrai plan?

**R:** Exécutez `verifyUserSubscriptions` pour voir vos souscriptions réelles dans Convex.

### Q: Les webhooks Clerk fonctionnent-ils?

**R:** Vérifiez les logs serveur pour voir si les webhooks sont reçus. Si non, vérifiez la configuration dans Clerk Dashboard.

### Q: Puis-je utiliser ces scripts en production?

**R:** ⚠️ **NON!** Ces scripts sont pour le développement uniquement. En production, les données doivent venir uniquement de Clerk via webhooks.

## Support

Si les problèmes persistent après avoir suivi ce guide:

1. Vérifier les logs Convex et serveur
2. Vérifier la configuration Clerk Dashboard
3. Tester les webhooks manuellement
4. Contacter le support Clerk si nécessaire
