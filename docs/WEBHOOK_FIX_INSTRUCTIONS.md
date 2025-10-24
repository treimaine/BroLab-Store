# Instructions de Correction du Webhook Clerk

## 🚨 Problème Résolu

Le webhook Clerk était **désactivé** dans `convex/http.ts` et remplacé par un stub. Je l'ai **réactivé**.

## ⚡ Actions Immédiates

### 1. Mettre à Jour l'URL du Webhook dans Clerk

**URL actuelle (incorrecte):** `https://amicable-lemming-546.convex.cloud/api/webhooks/clerk`  
**URL correcte (développement):** `https://agile-boar-163.convex.cloud/api/webhooks/clerk`

#### Étapes:

1. Aller sur https://dashboard.clerk.com/
2. Sélectionner votre application
3. Aller dans **"Webhooks"**
4. Cliquer sur votre endpoint existant
5. **Modifier l'URL** pour: `https://agile-boar-163.convex.cloud/api/webhooks/clerk`
6. Sauvegarder

### 2. Vérifier les Variables d'Environnement

Assurez-vous que `CLERK_WEBHOOK_SECRET` est configuré dans votre environnement Convex :

```bash
# Dans le dashboard Convex → Settings → Environment Variables
CLERK_WEBHOOK_SECRET=whsec_votre_secret_ici
```

Le secret est disponible dans Clerk Dashboard → Webhooks → Votre endpoint → "Signing Secret"

### 3. Tester Immédiatement

1. **Se déconnecter** complètement de votre application
2. **Se reconnecter**
3. **Vérifier** dans Clerk Dashboard → Webhooks → Logs
4. **Chercher** des événements `session.created` avec status **SUCCESS** ✅
5. **Contrôler** dans votre dashboard si la date est mise à jour (24 octobre)

## 🔧 Changements Appliqués

### Fichier `convex/http.ts` - AVANT:

```typescript
// Clerk webhook temporarily disabled in dev to unblock Convex deploy.
const okStub = httpAction(async () => new Response("OK", { status: 200 }));

http.route({
  path: "/api/webhooks/clerk",
  method: "POST",
  handler: okStub, // ❌ Stub qui ne fait rien
});
```

### Fichier `convex/http.ts` - APRÈS:

```typescript
// Clerk webhook handler - RÉACTIVÉ pour corriger la synchronisation des activités
http.route({
  path: "/api/webhooks/clerk",
  method: "POST",
  handler: clerkWebhook, // ✅ Vrai handler qui traite les événements
});
```

## 📊 Validation

Après correction, vous devriez voir :

- ✅ **Webhooks SUCCESS** dans Clerk Dashboard
- ✅ **Nouvelles connexions** enregistrées dans Convex `activityLog`
- ✅ **Date correcte** (24 octobre) dans le dashboard utilisateur
- ✅ **Synchronisation en temps réel** des activités

## 🚨 Si Ça Ne Fonctionne Toujours Pas

### Vérification 1: Logs Convex

1. Aller dans Convex Dashboard → Logs
2. Se reconnecter à l'application
3. Chercher des logs du webhook Clerk
4. Vérifier s'il y a des erreurs

### Vérification 2: Test Manuel

```bash
# Tester le webhook directement
curl -X POST "https://agile-boar-163.convex.cloud/api/webhooks/clerk" \
  -H "Content-Type: application/json" \
  -d '{"type":"test","data":{"id":"test"}}'
```

### Vérification 3: Variables d'Environnement

Vérifier dans Convex Dashboard → Settings → Environment Variables :

- `CLERK_WEBHOOK_SECRET` est défini
- La valeur correspond au secret dans Clerk

## 🎯 Résultat Attendu

Une fois corrigé :

1. **Chaque connexion** créera automatiquement une entrée dans `activityLog`
2. **Le dashboard** affichera les bonnes dates (24 octobre au lieu de 19 octobre)
3. **La synchronisation** sera en temps réel

---

**Temps estimé:** 5 minutes  
**Statut:** Correction appliquée, test requis  
**Priorité:** CRITIQUE - Résout le problème principal
