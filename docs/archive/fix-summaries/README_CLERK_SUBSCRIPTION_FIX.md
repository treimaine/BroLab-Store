# 📖 Documentation: Fix Souscription Clerk

## 🎯 Problème

Vous observez des incohérences dans l'interface de billing Clerk:

- Souscription réelle: **Free**
- Affichage: **"Ultimate Pass" marqué comme "Active"**
- Date: **"Aug 8, 2026"** (dans le futur!)

## 🚀 Solution Rapide (3 minutes)

Suivez le guide: **[QUICK_FIX_CLERK_SUBSCRIPTION.md](./QUICK_FIX_CLERK_SUBSCRIPTION.md)**

```bash
# 1. Diagnostiquer
npm run fix-subscriptions -- verify

# 2. Nettoyer
npm run fix-subscriptions -- clean

# 3. Vérifier
npm run fix-subscriptions -- verify
```

## 📚 Documentation Complète

### Pour les Utilisateurs

1. **[QUICK_FIX_CLERK_SUBSCRIPTION.md](./QUICK_FIX_CLERK_SUBSCRIPTION.md)**
   - Solution rapide en 3 commandes
   - Vérification dans l'interface
   - Commandes supplémentaires

2. **[EXPLICATION_PROBLEME_CLERK.md](./EXPLICATION_PROBLEME_CLERK.md)**
   - Diagnostic détaillé du problème
   - Cause racine
   - Solution en 3 étapes
   - Configuration Clerk Dashboard
   - Vérification des webhooks

### Pour les Développeurs

3. **[CLERK_SUBSCRIPTION_FIX.md](./CLERK_SUBSCRIPTION_FIX.md)**
   - État actuel vs attendu
   - Scripts de correction
   - Commandes à exécuter
   - Prévention future
   - Checklist de vérification

4. **[CLERK_SUBSCRIPTION_DEBUG_GUIDE.md](./CLERK_SUBSCRIPTION_DEBUG_GUIDE.md)**
   - Commandes de débogage
   - Interprétation des résultats
   - Workflow de correction complet
   - Configuration Clerk Dashboard
   - Debugging avancé
   - FAQ

## 🛠️ Outils Créés

### Scripts Convex

- **`convex/admin/cleanSubscriptions.ts`**
  - `cleanTestSubscriptions` - Nettoie les dates incorrectes
  - `resetAllToFree` - Réinitialise tout (développement uniquement)
  - `removeDuplicateSubscriptions` - Supprime les doublons

- **`convex/admin/verifySubscriptions.ts`**
  - `verifyAllSubscriptions` - Rapport complet
  - `listAllSubscriptions` - Liste détaillée
  - `verifyUserSubscriptions` - Vos souscriptions

### Script Node.js

- **`scripts/fix-subscriptions.ts`**
  - Interface CLI pour exécuter les commandes facilement
  - Commande npm: `npm run fix-subscriptions -- <command>`

## 📋 Commandes Disponibles

### Diagnostic

```bash
# Rapport complet
npm run fix-subscriptions -- verify

# Liste détaillée
npm run fix-subscriptions -- list

# Aide
npm run fix-subscriptions -- help
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
# Vérifier vos souscriptions
npx convex run admin/verifySubscriptions:verifyUserSubscriptions

# Rapport complet
npx convex run admin/verifySubscriptions:verifyAllSubscriptions

# Nettoyer
npx convex run admin/cleanSubscriptions:cleanTestSubscriptions
```

## 🔍 Diagnostic Rapide

### Symptômes

- ❌ Plan incorrect affiché
- ❌ Date dans le futur (2026)
- ❌ "Active" sur le mauvais plan
- ❌ Changement de plan affiche des dates incorrectes

### Cause

- Données de test corrompues dans Convex
- Webhooks Clerk non synchronisés
- Timestamps incorrects

### Solution

1. Nettoyer les données de test
2. Configurer correctement Clerk Dashboard
3. Vérifier les webhooks

## ✅ Checklist de Vérification

Après avoir appliqué le fix:

- [ ] `npm run fix-subscriptions -- verify` retourne `"healthy": true`
- [ ] Se déconnecter et se reconnecter
- [ ] Dashboard → Settings → Billing affiche le bon plan
- [ ] Les dates sont correctes (pas dans le futur)
- [ ] Changement de plan fonctionne correctement

## 🔧 Configuration Clerk

### Plans à Créer

Dans Clerk Dashboard → Billing → Plans:

| Plan ID    | Nom           | Prix        | Features                  |
| ---------- | ------------- | ----------- | ------------------------- |
| `free`     | Free          | $0          | Accès de base             |
| `basic`    | Basic         | $9.99/mois  | 5 téléchargements/mois    |
| `artist`   | Artist        | $19.99/mois | 20 téléchargements/mois   |
| `ultimate` | Ultimate Pass | $49.99/mois | Téléchargements illimités |

### Webhooks à Configurer

Dans Clerk Dashboard → Webhooks:

- **Endpoint**: `https://votre-domaine.com/api/webhooks/clerk`
- **Événements**:
  - ✅ `subscription.created`
  - ✅ `subscription.updated`
  - ✅ `subscription.deleted`
  - ✅ `invoice.created`
  - ✅ `invoice.paid`

## 🚨 Avertissements

### Mode Développement

Vous utilisez des clés de test Clerk (`pk_test_...`):

- ✅ Normal pour le développement
- ✅ Pas de vrais paiements
- ✅ Facile à réinitialiser

### Commandes Dangereuses

⚠️ **NE PAS UTILISER EN PRODUCTION:**

```bash
# Réinitialise TOUTES les souscriptions
npx convex run admin/cleanSubscriptions:resetAllToFree
```

## 📞 Support

### Problème Persistant?

1. Consultez la documentation complète
2. Vérifiez les logs Convex: https://dashboard.convex.dev
3. Vérifiez les logs serveur: `npm run dev`
4. Vérifiez Clerk Dashboard: https://dashboard.clerk.com

### Ressources

- **Documentation Clerk**: https://clerk.com/docs
- **Dashboard Convex**: https://dashboard.convex.dev
- **Dashboard Clerk**: https://dashboard.clerk.com

## 📝 Notes

- Ces outils sont pour le **développement uniquement**
- En **production**, les données doivent venir uniquement de Clerk via webhooks
- Toujours **tester** après avoir appliqué des corrections
- **Sauvegarder** les données importantes avant de nettoyer

## 🎓 Apprentissage

Ce problème vous a appris:

- Comment fonctionnent les webhooks Clerk
- Comment synchroniser Clerk et Convex
- Comment déboguer les problèmes de souscription
- Comment créer des outils de diagnostic

## 🔄 Prochaines Étapes

Après avoir corrigé le problème:

1. ✅ Configurer correctement les plans dans Clerk Dashboard
2. ✅ Vérifier que les webhooks fonctionnent
3. ✅ Tester le flow complet de souscription
4. ✅ Ajouter des validations dans le code
5. ✅ Mettre en place un monitoring

## 📊 Statistiques

- **Temps de fix**: ~3 minutes
- **Commandes nécessaires**: 3
- **Fichiers créés**: 7
- **Documentation**: 4 guides complets

---

**Dernière mise à jour**: October 23, 2025
**Version**: 1.0.0
**Auteur**: Kiro AI Assistant
