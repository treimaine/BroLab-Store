# Fix: Incohérences Clerk Subscription

## Problème Identifié

Les incohérences dans l'affichage des souscriptions viennent de:

1. **Plans Clerk mal configurés** - Les plans dans le Dashboard Clerk ne correspondent pas au code
2. **Données de test corrompues** - Souscriptions avec dates futures (Aug 8, 2026)
3. **Synchronisation Clerk → Convex défaillante** - Les webhooks ne mettent pas à jour Convex

## État Actuel

### Plans Attendus (selon le code)

- **Free** - $0/mois - Toujours gratuit
- **Basic** - $9.99/mois - 5 téléchargements/mois
- **Artist** - $19.99/mois - 20 téléchargements/mois
- **Ultimate Pass** - $49.99/mois - Téléchargements illimités

### Problèmes Observés

- ✅ Souscription réelle: Free
- ❌ Affichage: "Ultimate Pass" marqué comme "Active"
- ❌ Date de début: Aug 8, 2026 (dans le futur!)
- ❌ Changement de plan vers "Artist" affiche aussi Aug 8, 2026

## Solution en 3 Étapes

### Étape 1: Nettoyer les Données de Test dans Convex

Supprimer toutes les souscriptions de test avec des dates incorrectes.

### Étape 2: Configurer Correctement les Plans dans Clerk Dashboard

1. Aller sur https://dashboard.clerk.com
2. Naviguer vers **Billing → Plans**
3. Créer/Vérifier les plans suivants:

#### Plan Free

- **ID**: `free`
- **Prix**: $0
- **Features**: Accès de base

#### Plan Basic

- **ID**: `basic`
- **Prix**: $9.99/mois
- **Features**: 5 téléchargements/mois, Licence Basic, Format MP3

#### Plan Artist

- **ID**: `artist`
- **Prix**: $19.99/mois
- **Features**: 20 téléchargements/mois, Licence Premium, Formats WAV + MP3

#### Plan Ultimate Pass

- **ID**: `ultimate`
- **Prix**: $49.99/mois
- **Features**: Téléchargements illimités, Licence Exclusive, Tous formats

### Étape 3: Vérifier la Configuration des Webhooks

1. Dans Clerk Dashboard → **Webhooks**
2. Vérifier que l'endpoint est configuré: `https://votre-domaine.com/api/webhooks/clerk`
3. Événements à activer:
   - `subscription.created`
   - `subscription.updated`
   - `subscription.deleted`
   - `invoice.created`
   - `invoice.paid`

## Scripts de Correction

### 1. Script de Nettoyage Convex

Créer un fichier `convex/admin/cleanSubscriptions.ts`:

```typescript
import { mutation } from "../_generated/server";

export const cleanTestSubscriptions = mutation({
  handler: async ctx => {
    const now = Date.now();

    // Trouver toutes les souscriptions avec des dates dans le futur
    const futureSubscriptions = await ctx.db
      .query("subscriptions")
      .filter(q => q.gt(q.field("currentPeriodStart"), now))
      .collect();

    console.log(`Found ${futureSubscriptions.length} subscriptions with future dates`);

    // Supprimer ces souscriptions
    for (const sub of futureSubscriptions) {
      await ctx.db.delete(sub._id);
      console.log(`Deleted subscription ${sub._id} with date ${new Date(sub.currentPeriodStart)}`);
    }

    return {
      deleted: futureSubscriptions.length,
      message: `Cleaned ${futureSubscriptions.length} test subscriptions`,
    };
  },
});
```

### 2. Script de Vérification

Créer un fichier `convex/admin/verifySubscriptions.ts`:

```typescript
import { query } from "../_generated/server";

export const verifyAllSubscriptions = query({
  handler: async ctx => {
    const now = Date.now();

    const allSubscriptions = await ctx.db.query("subscriptions").collect();

    const report = {
      total: allSubscriptions.length,
      active: 0,
      cancelled: 0,
      futureStart: 0,
      pastEnd: 0,
      byPlan: {} as Record<string, number>,
    };

    for (const sub of allSubscriptions) {
      // Compter par statut
      if (sub.status === "active") report.active++;
      if (sub.status === "cancelled") report.cancelled++;

      // Compter par plan
      report.byPlan[sub.planId] = (report.byPlan[sub.planId] || 0) + 1;

      // Vérifier les dates
      if (sub.currentPeriodStart > now) report.futureStart++;
      if (sub.currentPeriodEnd < now && sub.status === "active") report.pastEnd++;
    }

    return report;
  },
});
```

## Commandes à Exécuter

### 1. Vérifier l'état actuel

```bash
# Dans la console Convex Dashboard
npx convex run admin/verifySubscriptions:verifyAllSubscriptions
```

### 2. Nettoyer les données de test

```bash
# Dans la console Convex Dashboard
npx convex run admin/cleanSubscriptions:cleanTestSubscriptions
```

### 3. Vérifier après nettoyage

```bash
npx convex run admin/verifySubscriptions:verifyAllSubscriptions
```

## Vérification Post-Fix

Après avoir appliqué les corrections:

1. ✅ Se déconnecter et se reconnecter
2. ✅ Aller dans Dashboard → Settings → Billing
3. ✅ Vérifier que "Free" est marqué comme actif
4. ✅ Essayer de changer de plan
5. ✅ Vérifier que la date affichée est correcte (aujourd'hui ou dans le passé)

## Prévention Future

### 1. Validation des Dates

Ajouter une validation dans `convex/subscriptions/createOrUpdateFromClerk.ts`:

```typescript
// Valider que les dates ne sont pas dans le futur
const now = Date.now();
if (currentPeriodStart > now + 86400000) {
  // Plus de 24h dans le futur
  console.error("⚠️ Invalid subscription date detected:", {
    currentPeriodStart,
    now,
    diff: currentPeriodStart - now,
  });
  // Utiliser la date actuelle à la place
  currentPeriodStart = now;
}
```

### 2. Logging Amélioré

Ajouter des logs détaillés dans les webhooks:

```typescript
console.log("📥 Clerk webhook received:", {
  type: event.type,
  subscriptionId: data.id,
  planId: data.plan?.id,
  status: data.status,
  dates: {
    start: new Date(data.current_period_start * 1000),
    end: new Date(data.current_period_end * 1000),
  },
});
```

## Notes Importantes

- **Mode Développement**: Vous utilisez des clés de test Clerk (`pk_test_...`)
- **Données de Test**: Normal d'avoir des incohérences en développement
- **Production**: Ces problèmes ne devraient pas se produire avec les vraies clés Clerk
- **Webhooks**: Vérifier que les webhooks Clerk sont bien reçus (logs serveur)

## Checklist de Vérification

- [ ] Plans créés dans Clerk Dashboard avec les bons IDs
- [ ] Webhooks configurés et testés
- [ ] Données de test nettoyées dans Convex
- [ ] Validation des dates ajoutée dans le code
- [ ] Logs améliorés pour le debugging
- [ ] Test complet du flow de souscription
