# Résolution de l'erreur 404 - Webhook Clerk Billing

## Problème

```
POST /api/webhooks/clerk-billing 404 Not Found
```

## Cause

Le serveur Express n'a pas chargé la nouvelle route `clerk-billing`.

## Solution

### Étape 1: Arrêter le serveur Express

Dans le terminal où `npm run dev` tourne, appuyez sur `Ctrl+C`

### Étape 2: Redémarrer le serveur

```bash
npm run dev
```

### Étape 3: Vérifier que la route est chargée

Vous devriez voir dans les logs au démarrage:

```
Server running on port 5000
Routes registered successfully
```

### Étape 4: Tester à nouveau

1. Gardez ngrok actif (ne pas redémarrer)
2. Dans Clerk Dashboard, cliquez sur "Send Test Event"
3. Vérifiez les logs du serveur Express

## Vérification Rapide

Testez manuellement avec curl:

```bash
curl -X POST "http://localhost:5000/api/webhooks/clerk-billing" \
  -H "Content-Type: application/json" \
  -d '{"type":"test","data":{"id":"test"}}'
```

**Résultat attendu:**

```json
{
  "received": true,
  "synced": false,
  "message": "Event type test not handled",
  "requestId": "uuid-here"
}
```

Si vous obtenez toujours 404, vérifiez:

### 1. Le fichier clerk-billing.ts existe

```bash
ls server/routes/clerk-billing.ts
```

### 2. Le fichier est bien importé dans index.ts

```bash
grep "clerk-billing" server/routes/index.ts
```

Vous devriez voir:

```typescript
import clerkBillingRouter from "./clerk-billing";
app.use("/api/webhooks/clerk-billing", clerkBillingRouter);
```

### 3. Pas d'erreurs TypeScript

```bash
npm run type-check
```

## Test Complet

Une fois le serveur redémarré:

1. **Test local (sans ngrok)**

```bash
curl -X POST "http://localhost:5000/api/webhooks/clerk-billing" \
  -H "Content-Type: application/json" \
  -H "svix-id: msg_test" \
  -H "svix-timestamp: 1234567890" \
  -H "svix-signature: v1,test" \
  -d '{
    "type": "subscription.created",
    "data": {
      "id": "sub_test",
      "user_id": "user_test",
      "plan_id": "basic",
      "status": "active"
    }
  }'
```

2. **Test via ngrok**
   Utilisez l'URL ngrok dans Clerk Dashboard

## Logs Attendus

Dans le terminal Express, vous devriez voir:

```
📨 [uuid] Processing Clerk Billing webhook...
⚠️ [uuid] CLERK_WEBHOOK_SECRET not set; using raw body in dev
📋 [uuid] Event type: subscription.created
🔔 [uuid] Handling subscription event: subscription.created
📊 [uuid] Subscription details: { ... }
✨ [uuid] New subscription created for user user_test
```

## Si le problème persiste

1. Vérifiez que le port 5000 n'est pas utilisé par un autre processus
2. Vérifiez les logs d'erreur au démarrage du serveur
3. Essayez de nettoyer et redémarrer:

```bash
# Arrêter tous les processus
Ctrl+C (dans tous les terminaux)

# Nettoyer
npm run clean

# Réinstaller
npm install

# Redémarrer
npm run dev
```

## Checklist de Débogage

- [ ] Serveur Express redémarré
- [ ] Aucune erreur dans les logs au démarrage
- [ ] Test curl local fonctionne (200 OK)
- [ ] ngrok toujours actif
- [ ] URL Clerk Dashboard correcte
- [ ] Endpoint Clerk activé (Enabled)
