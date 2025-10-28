# Test de la Synchronisation en Temps Réel

## Prérequis

1. Serveur démarré: `npm run dev`
2. Client démarré: `npm run client`

## Tests Manuels

### 1. Test du Polling Endpoint

```bash
# Test basique - devrait retourner un tableau vide
curl http://localhost:5000/api/sync/poll?since=0

# Réponse attendue:
# {
#   "success": true,
#   "messages": [],
#   "timestamp": 1234567890,
#   "count": 0
# }
```

### 2. Test d'Envoi de Message

```bash
# Envoyer un message
curl -X POST http://localhost:5000/api/sync/send \
  -H "Content-Type: application/json" \
  -d '{
    "type": "test.message",
    "payload": {"data": "Hello World"}
  }'

# Réponse attendue:
# {
#   "success": true,
#   "messageId": "msg_...",
#   "timestamp": 1234567890
# }
```

### 3. Test de Récupération des Messages

```bash
# Récupérer les messages depuis un timestamp
curl "http://localhost:5000/api/sync/poll?since=0"

# Devrait maintenant contenir le message envoyé précédemment
```

### 4. Test du Status

```bash
curl http://localhost:5000/api/sync/status

# Réponse attendue:
# {
#   "success": true,
#   "status": {
#     "websocket": {...},
#     "polling": {
#       "enabled": true,
#       "endpoint": "/api/sync/poll",
#       "queues": 1,
#       "messages": 1
#     },
#     "lastCheck": 1234567890
#   }
# }
```

## Tests dans le Navigateur

### Console du Navigateur

```javascript
// 1. Vérifier que le ConnectionManager se connecte
// Ouvrir la console et regarder les logs

// 2. Envoyer un message de test
fetch("http://localhost:5000/api/sync/send", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    type: "test.browser",
    payload: { message: "Test from browser" },
  }),
})
  .then(r => r.json())
  .then(console.log);

// 3. Vérifier la réception
fetch("http://localhost:5000/api/sync/poll?since=0")
  .then(r => r.json())
  .then(console.log);
```

## Tests Automatisés

### Test de Charge

```bash
# Installer Apache Bench si nécessaire
# sudo apt-get install apache2-utils

# Test de 100 requêtes avec 10 connexions concurrentes
ab -n 100 -c 10 "http://localhost:5000/api/sync/poll?since=0"
```

### Test de Latence

```bash
# Mesurer le temps de réponse
time curl -s "http://localhost:5000/api/sync/poll?since=0" > /dev/null
```

## Vérification des Logs

### Logs Serveur

Rechercher dans les logs:

- `[ConnectionManager]` - Logs du gestionnaire de connexion
- `Poll API error` - Erreurs de polling
- `Send API error` - Erreurs d'envoi

### Logs Client

Dans la console du navigateur:

- Erreurs de connexion
- Messages reçus
- Tentatives de reconnexion

## Scénarios de Test

### Scénario 1: Connexion Normale

1. Démarrer le serveur
2. Ouvrir l'application dans le navigateur
3. Vérifier dans la console: "Connected via polling" ou "Connected via websocket"
4. Envoyer un message via l'API
5. Vérifier que le message est reçu dans le navigateur

### Scénario 2: Reconnexion

1. Application connectée
2. Arrêter le serveur
3. Vérifier: "Reconnecting..." dans la console
4. Redémarrer le serveur
5. Vérifier: "Connected" dans la console

### Scénario 3: Fallback WebSocket → Polling

1. Désactiver WebSocket dans le navigateur (via DevTools)
2. Recharger la page
3. Vérifier: "Connected via polling"
4. Tester l'envoi/réception de messages

### Scénario 4: Multi-Onglets

1. Ouvrir l'application dans 2 onglets
2. Envoyer un message depuis l'onglet 1
3. Vérifier que l'onglet 2 reçoit le message

## Métriques à Surveiller

### Performance

- Latence de polling: < 100ms
- Temps de reconnexion: < 5s
- Utilisation mémoire: stable (pas de fuite)

### Fiabilité

- Taux de succès des messages: > 99%
- Taux de reconnexion: > 95%
- Perte de messages: 0%

## Troubleshooting

### Problème: 404 sur /api/sync/poll

**Solution:**

1. Vérifier que le serveur est démarré
2. Vérifier que la route est bien montée dans `server/app.ts`
3. Redémarrer le serveur

### Problème: Messages non reçus

**Solution:**

1. Vérifier le timestamp `since`
2. Vérifier les logs du MessageQueue
3. Vérifier que le userId est correct

### Problème: Reconnexion infinie

**Solution:**

1. Vérifier les logs d'erreur
2. Augmenter `maxReconnectAttempts`
3. Vérifier la configuration réseau

## Prochaines Étapes

1. Ajouter des tests unitaires pour MessageQueueService
2. Ajouter des tests d'intégration pour les routes
3. Implémenter le monitoring avec Prometheus
4. Ajouter des alertes pour les erreurs critiques
