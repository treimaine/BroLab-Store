# Guide de Correction Rapide - Synchronisation des Activités

## 🚨 Problème

Dashboard affiche des connexions du **19 octobre** au lieu du **24 octobre**.

## ⚡ Solution Rapide (5 minutes)

### Étape 1: Vérifier les Webhooks Clerk

1. Aller sur https://dashboard.clerk.com/
2. Sélectionner votre application
3. Cliquer sur **"Webhooks"** dans le menu de gauche
4. Vérifier les événements configurés

### Étape 2: Ajouter l'Événement Manquant

Si `session.created` n'est pas dans la liste :

1. Cliquer **"Add Endpoint"**
2. **URL:** `https://votre-domaine.com/api/webhooks/clerk`
3. **Événements:** Cocher `session.created`
4. Cliquer **"Create"**

### Étape 3: Tester Immédiatement

1. Se déconnecter de votre application
2. Se reconnecter
3. Vérifier si la date dans le dashboard est mise à jour

## 🔧 Si le Problème Persiste

### Option A: Test Manuel

```bash
# Exécuter le diagnostic
node scripts/diagnose-activity-sync.mjs

# Tester clerkSync manuellement
npx convex run users.clerkSync --clerkId=your_clerk_id
```

### Option B: Vérifier les Logs

1. Ouvrir la console de votre serveur
2. Se reconnecter à l'application
3. Chercher des logs de webhooks Clerk
4. Vérifier si `clerkSync` est appelé

### Option C: Forcer le Rafraîchissement

```bash
# Vider le cache et redémarrer
npm run clean:all
npm run dev
```

## 📊 Composant de Diagnostic

Ajoutez temporairement ce composant à votre dashboard :

```tsx
import QuickActivityFix from "@/components/dashboard/QuickActivityFix";

// Dans votre dashboard
<QuickActivityFix className="mb-6" />;
```

## ✅ Validation

Après correction, vous devriez voir :

- ✅ Nouvelles connexions enregistrées immédiatement
- ✅ Date correcte (24 octobre) dans le dashboard
- ✅ Activités en temps réel

## 🎯 Cause Probable

Le webhook `session.created` n'est pas configuré dans Clerk, donc les nouvelles connexions ne déclenchent pas la fonction `clerkSync` qui enregistre l'activité dans Convex.

---

**Temps estimé:** 5 minutes  
**Difficulté:** Facile  
**Impact:** Résout immédiatement le problème
