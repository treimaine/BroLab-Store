# 🚀 Fix Rapide: Problème de Souscription Clerk

## ⚡ Solution en 3 Commandes

### 1️⃣ Diagnostiquer le Problème

```bash
npm run fix-subscriptions -- verify
```

**Résultat attendu:**

```json
{
  "issues": {
    "count": 1,
    "futureStart": 1
  },
  "healthy": false
}
```

### 2️⃣ Nettoyer les Données

```bash
npm run fix-subscriptions -- clean
```

**Résultat attendu:**

```json
{
  "success": true,
  "deleted": 1,
  "message": "Cleaned 1 test subscriptions with invalid dates"
}
```

### 3️⃣ Vérifier la Correction

```bash
npm run fix-subscriptions -- verify
```

**Résultat attendu:**

```json
{
  "issues": {
    "count": 0
  },
  "healthy": true
}
```

## ✅ Vérification dans l'Interface

1. **Se déconnecter** de l'application
2. **Se reconnecter**
3. Aller dans **Dashboard → Settings → Billing**
4. Vérifier que:
   - ✅ "Free" est marqué comme actif
   - ✅ Les dates sont correctes (pas Aug 8, 2026)
   - ✅ Pas de "Ultimate Pass" actif si vous êtes en Free

## 🔧 Commandes Supplémentaires

### Lister Toutes les Souscriptions

```bash
npm run fix-subscriptions -- list
```

### Supprimer les Doublons

```bash
npm run fix-subscriptions -- duplicates
```

### Aide

```bash
npm run fix-subscriptions -- help
```

## 📚 Documentation Complète

Pour plus de détails, consultez:

- **Explication du problème**: `docs/EXPLICATION_PROBLEME_CLERK.md`
- **Guide de débogage**: `docs/CLERK_SUBSCRIPTION_DEBUG_GUIDE.md`
- **Solution détaillée**: `docs/CLERK_SUBSCRIPTION_FIX.md`

## 🆘 Problème Persistant?

Si le problème persiste après ces étapes:

1. Vérifiez les logs Convex: https://dashboard.convex.dev
2. Vérifiez les logs serveur: `npm run dev`
3. Vérifiez la configuration Clerk: https://dashboard.clerk.com
4. Consultez la documentation complète ci-dessus
