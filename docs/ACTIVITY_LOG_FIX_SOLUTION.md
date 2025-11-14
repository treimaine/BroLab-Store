# Solution: Synchronisation activityLog en Temps Réel

## 🔍 Problème Identifié

La table `activityLog` dans Convex n'était plus mise à jour en temps réel lors des connexions utilisateur. Les dernières entrées dataient du 10/10/2025.

## 🎯 Cause Racine

Le webhook Clerk configuré dans le Dashboard pointait vers `/api/webhooks/clerk-billing` qui **ignorait** les événements `session.created`, `user.created`, et `user.updated`.

### Architecture du Problème

```
Clerk Dashboard Webhook
    ↓
https://sharell-untidying-kam.ngrok-free.dev/api/webhooks/clerk-billing
    ↓
server/routes/clerk-billing.ts
    ↓
Gère UNIQUEMENT: subscription.*, invoice.*
    ↓
❌ IGNORE: session.created, user.created, user.updated
    ↓
❌ syncClerkUser jamais appelé
    ↓
❌ activityLog jamais mis à jour
```

## ✅ Solution Implémentée

### Modifications Apportées

#### 1. **convex/http.ts** - Route Convex HTTP Complétée

**Avant:**

```typescript
if (evt.type === "session.created" && evt.data?.user_id) {
  console.log(`🔐 Session créée pour: ${evt.data.user_id}`);
  // Juste logger pour l'instant ← ❌ Ne fait rien
  console.log("✅ Session créée - webhook fonctionne !");
}
```

**Après:**

```typescript
if (evt.type === "session.created" && evt.data?.user_id) {
  console.log(`🔐 Session créée pour: ${evt.data.user_id}`);

  // ✅ Appelle maintenant syncClerkUser
  await ctx.runMutation("users/clerkSync:syncClerkUser" as any, {
    clerkId: evt.data.user_id,
    email: evt.data.email_addresses?.[0]?.email_address || "unknown@temp.com",
    username: evt.data.username,
    firstName: evt.data.first_name,
    lastName: evt.data.last_name,
    imageUrl: evt.data.image_url,
  });
  console.log(`✅ Session synchronisée pour: ${evt.data.user_id}`);
}
```

#### 2. **server/routes/clerk-billing.ts** - Support des Événements Utilisateur

**Ajout de la fonction `handleUserEvent`:**

```typescript
async function handleUserEvent(
  eventType: string,
  data: Record<string, unknown>,
  convexUrl: string,
  requestId: string
): Promise<void> {
  const userId = (data.user_id as string) || (data.id as string);
  const emailAddresses = data.email_addresses as Array<{ email_address: string }> | undefined;
  const email = emailAddresses?.[0]?.email_address || "unknown@temp.com";

  // Call syncClerkUser mutation
  await fetch(`${convexUrl}/api/mutation`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      path: "users/clerkSync:syncClerkUser",
      args: {
        clerkId: userId,
        email: email,
        username: data.username as string | undefined,
        firstName: data.first_name as string | undefined,
        lastName: data.last_name as string | undefined,
        imageUrl: data.image_url as string | undefined,
      },
      format: "json",
    }),
  });
}
```

**Modification de `processWebhookEvent`:**

```typescript
// Handle session.created events for activity logging
if (
  eventType === "session.created" ||
  eventType === "user.created" ||
  eventType === "user.updated"
) {
  await handleUserEvent(eventType, eventData, convexUrl, requestId);
  return {
    received: true,
    synced: true,
    handled: "user_session", // ✅ Nouveau type de handler
    eventType,
    requestId,
    timestamp: new Date().toISOString(),
  };
}
```

### Architecture Corrigée

```
Clerk Dashboard Webhook
    ↓
https://sharell-untidying-kam.ngrok-free.dev/api/webhooks/clerk-billing
    ↓
server/routes/clerk-billing.ts
    ↓
Gère MAINTENANT:
  - subscription.* (facturation)
  - invoice.* (facturation)
  - session.created ✅ (activité utilisateur)
  - user.created ✅ (création utilisateur)
  - user.updated ✅ (mise à jour utilisateur)
    ↓
Appelle: convex/users/clerkSync.ts:syncClerkUser
    ↓
Insère dans activityLog:
  {
    userId: user._id,
    action: "user_login",
    details: { source: "clerk_sync", updated: true },
    timestamp: Date.now()
  }
    ↓
✅ Dashboard affiche l'activité en temps réel
```

## 🧪 Tests

### Test 1: Webhook Express (Recommandé)

```bash
# Démarrer le serveur Express
npm run server

# Dans un autre terminal, tester le webhook
node scripts/test-clerk-billing-session.mjs
```

**Résultat attendu:**

```json
{
  "received": true,
  "synced": true,
  "handled": "user_session",
  "eventType": "session.created",
  "requestId": "...",
  "timestamp": "2025-11-13T..."
}
```

### Test 2: Webhook Convex HTTP (Alternative)

```bash
node scripts/test-session-webhook.mjs
```

**Note:** Nécessite de changer l'URL du webhook dans Clerk Dashboard vers:

```
https://amicable-lemming-546.convex.cloud/api/webhooks/clerk
```

### Test 3: Test Réel

1. Se déconnecter de l'application
2. Se reconnecter
3. Vérifier dans **Convex Dashboard → activityLog**:
   - Nouvelle entrée avec `action: "user_login"`
   - `timestamp` récent (maintenant)
   - `userId` correspondant à votre utilisateur

## 📊 Vérification dans Convex Dashboard

### Requête pour vérifier les connexions récentes

```javascript
// Dans Convex Dashboard → Data → activityLog
db.query("activityLog")
  .withIndex("by_action", q => q.eq("action", "user_login"))
  .filter(q => q.gte(q.field("timestamp"), Date.now() - 24 * 60 * 60 * 1000)) // Dernières 24h
  .order("desc")
  .take(10);
```

**Résultat attendu:**

```javascript
[
  {
    _id: "...",
    userId: "...",
    action: "user_login",
    details: { source: "clerk_sync", updated: true },
    timestamp: 1731519600000, // Timestamp récent
    _creationTime: 1731519600000,
  },
  // ... autres connexions
];
```

## 🚀 Déploiement

### Étape 1: Déployer Convex

```bash
npx convex deploy
```

**Résultat:**

```
✔ Deployed Convex functions to https://amicable-lemming-546.convex.cloud
```

### Étape 2: Redémarrer Express

```bash
# Arrêter le serveur actuel (Ctrl+C)
npm run server
```

### Étape 3: Vérifier ngrok

```bash
# S'assurer que ngrok pointe vers le bon port
ngrok http 5000
```

**URL attendue:** `https://sharell-untidying-kam.ngrok-free.dev`

### Étape 4: Vérifier Clerk Dashboard

1. Aller dans **Clerk Dashboard → Webhooks**
2. Vérifier l'endpoint: `https://sharell-untidying-kam.ngrok-free.dev/api/webhooks/clerk-billing`
3. Événements configurés:
   - ✅ `session.created`
   - ✅ `email.created`
   - ✅ `user.created`
   - ✅ `user.updated`

## 📈 Monitoring

### Logs à Surveiller

#### Express (server/routes/clerk-billing.ts)

```
📨 [requestId] Processing Clerk Billing webhook...
📋 [requestId] Event type: session.created
👤 [requestId] Handling user event: session.created
✅ [requestId] User synced successfully: user_xxx
```

#### Convex (convex/users/clerkSync.ts)

```
🔄 Syncing Clerk user: user_xxx (email@example.com)
✅ Updated user: user_xxx
```

#### Convex (convex/http.ts) - Si route HTTP utilisée

```
🔔 Webhook Clerk reçu !
📋 Événement: session.created
🔐 Session créée pour: user_xxx
✅ Session synchronisée pour: user_xxx
```

### Métriques de Succès

- ✅ Nouvelles connexions apparaissent dans `activityLog` en < 5 secondes
- ✅ Dashboard affiche la date correcte (aujourd'hui)
- ✅ Pas de cache obsolète côté client
- ✅ Webhooks Clerk montrent status "Succeeded" (200)

## 🔧 Dépannage

### Problème: Webhook retourne 404

**Cause:** Route non trouvée

**Solution:**

1. Vérifier que le serveur Express est démarré
2. Vérifier l'URL ngrok dans Clerk Dashboard
3. Tester manuellement: `curl -X POST https://votre-ngrok.ngrok-free.dev/api/webhooks/clerk-billing`

### Problème: Webhook retourne 500

**Cause:** Erreur de traitement

**Solution:**

1. Vérifier les logs Express pour l'erreur exacte
2. Vérifier que `VITE_CONVEX_URL` est configuré
3. Vérifier que `CLERK_WEBHOOK_SECRET` est configuré

### Problème: activityLog toujours pas mis à jour

**Cause:** Mutation Convex échoue

**Solution:**

1. Vérifier les logs Convex Dashboard
2. Vérifier que l'utilisateur existe dans la table `users`
3. Tester manuellement la mutation `syncClerkUser` dans Convex Dashboard

## 📝 Fichiers Modifiés

1. **convex/http.ts** - Ajout de l'appel à `syncClerkUser` pour `session.created`
2. **server/routes/clerk-billing.ts** - Ajout du support des événements utilisateur
3. **scripts/test-clerk-billing-session.mjs** - Script de test créé
4. **scripts/test-session-webhook.mjs** - Script de test créé
5. **docs/ACTIVITY_LOG_FIX_SOLUTION.md** - Documentation créée

## 🎯 Prochaines Étapes

1. **Tester immédiatement:**

   ```bash
   npm run server
   node scripts/test-clerk-billing-session.mjs
   ```

2. **Vérifier dans Convex Dashboard:**
   - Table `activityLog`
   - Rechercher `action: "user_login"`
   - Vérifier timestamp récent

3. **Test réel:**
   - Se déconnecter
   - Se reconnecter
   - Vérifier que l'activité apparaît

4. **Monitoring continu:**
   - Surveiller les logs Clerk Dashboard → Webhooks
   - Surveiller les logs Express
   - Surveiller les logs Convex Dashboard

## ✅ Résultat Final

Après ces modifications, **chaque connexion utilisateur** créera automatiquement une entrée dans `activityLog` avec:

```javascript
{
  userId: "user_xxx",
  action: "user_login",
  details: { source: "clerk_sync", updated: true },
  timestamp: Date.now(), // Timestamp actuel en millisecondes
  _creationTime: Date.now()
}
```

Le dashboard affichera alors les activités en temps réel avec les bonnes dates.
