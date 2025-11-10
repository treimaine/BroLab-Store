# Explication du Problème de Souscription Clerk

## 🔍 Diagnostic du Problème

Vous avez observé plusieurs incohérences dans l'interface de billing Clerk:

### Symptômes Observés

1. **Souscription réelle**: Free (gratuit)
2. **Affichage incorrect**: "Ultimate Pass" marqué comme "Active"
3. **Date incorrecte**: "Starts Aug 8, 2026" (dans le futur!)
4. **Changement de plan**: Affiche aussi "Aug 8, 2026" pour le plan Artist

### Cause Racine

Le problème vient de **données de test corrompues** dans votre base de données Convex:

```
┌─────────────────────────────────────────────────────────────┐
│                    FLUX DE DONNÉES                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Clerk Dashboard (Source de vérité)                        │
│         │                                                   │
│         │ Webhooks                                          │
│         ▼                                                   │
│  Convex Database (Copie locale)                            │
│         │                                                   │
│         │ Queries                                           │
│         ▼                                                   │
│  Interface Utilisateur                                      │
│                                                             │
│  ❌ PROBLÈME: Données de test dans Convex avec dates       │
│     futures qui ne correspondent pas à Clerk               │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Pourquoi Cela Arrive?

1. **Mode Développement**: Vous utilisez des clés de test Clerk (`pk_test_...`)
2. **Données de Test**: Des souscriptions de test ont été créées manuellement dans Convex
3. **Timestamps Incorrects**: Ces données de test utilisent des dates futures (2026)
4. **Webhooks Non Synchronisés**: Les webhooks Clerk n'ont pas écrasé ces données de test

## ✅ Solution en 3 Étapes

### Étape 1: Diagnostiquer

Vérifiez l'état actuel de vos souscriptions:

```bash
npm run fix-subscriptions -- verify
```

Vous devriez voir quelque chose comme:

```json
{
  "summary": {
    "total": 2,
    "byStatus": {
      "active": 1
    },
    "byPlan": {
      "ultimate": 1
    }
  },
  "issues": {
    "count": 1,
    "futureStart": 1,
    "details": [
      {
        "issue": "Start date is more than 24h in the future",
        "planId": "ultimate",
        "dates": {
          "start": "2026-08-08T00:00:00.000Z"
        }
      }
    ]
  },
  "healthy": false
}
```

### Étape 2: Nettoyer

Supprimez les données de test incorrectes:

```bash
# Supprimer les souscriptions avec dates futures
npm run fix-subscriptions -- clean

# Supprimer les doublons (si nécessaire)
npm run fix-subscriptions -- duplicates
```

### Étape 3: Vérifier

Confirmez que tout est corrigé:

```bash
# Vérifier à nouveau
npm run fix-subscriptions -- verify

# Devrait afficher:
# "healthy": true
# "issues": { "count": 0 }
```

Puis dans l'interface:

1. Se déconnecter
2. Se reconnecter
3. Aller dans Dashboard → Settings → Billing
4. Vérifier que "Free" est maintenant marqué comme actif

## 🔧 Configuration Clerk Dashboard

Pour éviter ces problèmes à l'avenir, assurez-vous que vos plans sont correctement configurés dans Clerk:

### 1. Accéder au Dashboard Clerk

Allez sur: https://dashboard.clerk.com

### 2. Configurer les Plans

Naviguez vers **Billing → Plans** et créez ces plans:

#### Plan Free

- **Plan ID**: `free`
- **Nom**: Free
- **Prix**: $0
- **Description**: Accès de base gratuit

#### Plan Basic

- **Plan ID**: `basic`
- **Nom**: Basic
- **Prix**: $9.99/mois
- **Features**:
  - 5 téléchargements par mois
  - Licence Basic incluse
  - Format MP3

#### Plan Artist

- **Plan ID**: `artist`
- **Nom**: Artist
- **Prix**: $19.99/mois
- **Features**:
  - 20 téléchargements par mois
  - Licence Premium incluse
  - Formats WAV + MP3

#### Plan Ultimate Pass

- **Plan ID**: `ultimate`
- **Nom**: Ultimate Pass
- **Prix**: $49.99/mois
- **Features**:
  - Téléchargements illimités
  - Licence Exclusive incluse
  - Tous formats (WAV, MP3, STEMS)

### 3. Configurer les Webhooks

Naviguez vers **Webhooks** et configurez:

- **Endpoint URL**: `https://votre-domaine.com/api/webhooks/clerk`
- **Événements à activer**:
  - ✅ `subscription.created`
  - ✅ `subscription.updated`
  - ✅ `subscription.deleted`
  - ✅ `invoice.created`
  - ✅ `invoice.paid`

## 🎯 Pourquoi Utiliser des Clés de Développement?

Vous utilisez actuellement des clés de test Clerk:

```env
CLERK_PUBLISHABLE_KEY=pk_test_cmVsaWV2ZWQtY3JheWZpc2gtNy5jbGVyay5hY2NvdW50cy5kZXYk
```

C'est **normal et recommandé** pour le développement car:

- ✅ Pas de vrais paiements
- ✅ Données de test isolées
- ✅ Facile à réinitialiser
- ✅ Pas de risque financier

### Quand Passer en Production?

Passez aux clés de production (`pk_live_...`) uniquement quand:

1. ✅ Tous les tests sont passés
2. ✅ Les webhooks fonctionnent correctement
3. ✅ Les plans sont configurés correctement
4. ✅ L'application est déployée en production

## 📊 Commandes Utiles

### Diagnostic

```bash
# Voir un rapport complet
npm run fix-subscriptions -- verify

# Lister toutes les souscriptions
npm run fix-subscriptions -- list
```

### Nettoyage

```bash
# Nettoyer les dates incorrectes
npm run fix-subscriptions -- clean

# Supprimer les doublons
npm run fix-subscriptions -- duplicates
```

### Commandes Convex Directes

```bash
# Vérifier vos propres souscriptions
npx convex run admin/verifySubscriptions:verifyUserSubscriptions

# Voir toutes les souscriptions avec détails
npx convex run admin/verifySubscriptions:listAllSubscriptions
```

## 🚨 Commandes Dangereuses

⚠️ **NE PAS UTILISER EN PRODUCTION!**

```bash
# Réinitialiser TOUTES les souscriptions (développement uniquement)
npx convex run admin/cleanSubscriptions:resetAllToFree
```

## 🔍 Vérification des Webhooks

Pour vérifier que les webhooks Clerk fonctionnent:

### 1. Démarrer le Serveur

```bash
npm run dev
```

### 2. Créer une Souscription de Test

Dans l'interface Clerk, créez une souscription de test.

### 3. Vérifier les Logs

Vous devriez voir dans les logs du serveur:

```
📥 Clerk webhook received: {
  type: 'subscription.created',
  subscriptionId: 'sub_xxx',
  planId: 'basic',
  status: 'active'
}
✅ Subscription upserted in Convex
```

Si vous ne voyez pas ces logs:

1. Vérifiez que l'endpoint webhook est correct dans Clerk Dashboard
2. Vérifiez que `CLERK_WEBHOOK_SECRET` est configuré dans `.env`
3. Vérifiez que le serveur est accessible depuis l'extérieur (ngrok en développement)

## 📝 Résumé

### Problème

- Données de test avec dates futures dans Convex
- Pas de synchronisation avec Clerk Dashboard
- Affichage incorrect dans l'interface

### Solution

1. Nettoyer les données de test: `npm run fix-subscriptions -- clean`
2. Configurer correctement les plans dans Clerk Dashboard
3. Vérifier les webhooks
4. Tester le flow complet

### Prévention

- Utiliser uniquement les webhooks Clerk pour créer/modifier des souscriptions
- Ne pas créer de données de test manuellement dans Convex
- Valider les dates avant insertion
- Monitorer les webhooks en production

## 🆘 Support

Si le problème persiste après avoir suivi ce guide:

1. Vérifiez les logs Convex: https://dashboard.convex.dev
2. Vérifiez les logs serveur: `npm run dev`
3. Vérifiez la configuration Clerk Dashboard
4. Consultez la documentation: `docs/CLERK_SUBSCRIPTION_DEBUG_GUIDE.md`
