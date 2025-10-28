# Implémentation de la Synchronisation en Temps Réel

## Vue d'ensemble

Le système de synchronisation en temps réel supporte deux modes de connexion:

1. **WebSocket** - Connexion bidirectionnelle en temps réel (préféré)
2. **HTTP Polling** - Fallback pour les environnements où WebSocket n'est pas disponible

## Architecture

```
┌─────────────────┐
│   Client App    │
└────────┬────────┘
         │
    ┌────┴────┐
    │         │
┌───▼──┐  ┌──▼────┐
│  WS  │  │ Poll  │
└───┬──┘  └──┬────┘
    │        │
┌───▼────────▼───┐
│ RealtimeSync   │
│    Service     │
└───┬────────┬───┘
    │        │
┌───▼──┐  ┌──▼────────┐
│  WS  │  │  Message  │
│ Mgr  │  │   Queue   │
└──────┘  └───────────┘
```

## Services Backend

### 1. MessageQueueService

Gère les messages en mémoire pour les clients polling.

**Fonctionnalités:**

- Stockage temporaire des messages (TTL: 5 minutes)
- Filtrage par utilisateur et timestamp
- Nettoyage automatique des anciens messages
- Support du broadcast global

**Utilisation:**

```typescript
import { getMessageQueue } from './services/MessageQueueService';

const queue = getMessageQueue();

// Ajouter un message
queue.addMessage({
  id: 'msg_123',
  type: 'data.updated',
  payload: { section: 'orders', data: {...} },
  timestamp: Date.now(),
  userId: 'user_456'
});

// Récupérer les messages depuis un timestamp
const messages = queue.getMessagesSince('user_456', since);
```

### 2. RealtimeSyncService

Service de haut niveau qui coordonne WebSocket et polling.

**Fonctionnalités:**

- Publication unifiée vers tous les types de connexion
- Helpers pour les événements courants
- Statistiques globales

**Utilisation:**

```typescript
import { getRealtimeSync } from "./services/RealtimeSyncService";

const sync = getRealtimeSync();

// Publier une mise à jour de données
sync.publishDataUpdate("orders", orderData, userId);

// Publier une erreur
sync.publishError(
  {
    type: "SYNC_ERROR",
    message: "Failed to sync",
    context: { section: "orders" },
  },
  userId
);

// Obtenir les statistiques
const stats = sync.getStats();
```

## Endpoints API

### GET /api/sync/poll

Récupère les nouveaux messages depuis un timestamp.

**Query Parameters:**

- `since` (number): Timestamp en millisecondes

**Response:**

```json
{
  "success": true,
  "messages": [
    {
      "id": "msg_123",
      "type": "data.updated",
      "payload": {...},
      "timestamp": 1234567890,
      "userId": "user_456"
    }
  ],
  "timestamp": 1234567890,
  "count": 1
}
```

### POST /api/sync/send

Envoie un message via la connexion polling.

**Body:**

```json
{
  "type": "user.action",
  "payload": {...},
  "correlationId": "optional_correlation_id"
}
```

**Response:**

```json
{
  "success": true,
  "messageId": "msg_123",
  "timestamp": 1234567890
}
```

### GET /api/sync/status

Obtient le statut du système de synchronisation.

**Response:**

```json
{
  "success": true,
  "status": {
    "websocket": {
      "enabled": true,
      "connections": 5,
      "totalConnections": 10,
      "subscriptions": 15
    },
    "polling": {
      "enabled": true,
      "endpoint": "/api/sync/poll",
      "queues": 3,
      "messages": 12
    },
    "lastCheck": 1234567890
  }
}
```

### POST /api/sync/broadcast

Diffuse un message à tous les clients (admin uniquement).

**Body:**

```json
{
  "type": "announcement",
  "payload": {...},
  "topics": ["optional", "topic", "filters"]
}
```

## Intégration Client

### ConnectionManager

Le `ConnectionManager` côté client gère automatiquement:

- Tentative de connexion WebSocket en premier
- Fallback vers polling si WebSocket échoue
- Reconnexion automatique avec backoff exponentiel
- Monitoring de la qualité de connexion

**Configuration:**

```typescript
import { getConnectionManager } from "@/services/ConnectionManager";

const manager = getConnectionManager({
  websocketUrl: "ws://localhost:5000/ws",
  pollingUrl: "http://localhost:5000/api/sync",
  pollingInterval: 5000, // 5 secondes
  maxReconnectAttempts: 10,
});

// Se connecter
await manager.connect();

// Écouter les messages
manager.onMessage(message => {
  console.log("Message reçu:", message);
});

// Envoyer un message
await manager.send({
  type: "user.action",
  payload: { action: "click" },
  id: "msg_123",
  timestamp: Date.now(),
});
```

## Cas d'Usage

### 1. Mise à jour du Dashboard

```typescript
// Backend - Après une modification de données
import { getRealtimeSync } from "./services/RealtimeSyncService";

const sync = getRealtimeSync();
sync.publishDataUpdate("orders", updatedOrders, userId);
```

```typescript
// Frontend - Réception de la mise à jour
manager.onMessage(message => {
  if (message.type === "data.updated") {
    const { section, data } = message.payload;
    if (section === "orders") {
      updateOrdersUI(data);
    }
  }
});
```

### 2. Notifications en Temps Réel

```typescript
// Backend
sync.publish({
  type: "notification.new",
  payload: {
    title: "Nouvelle commande",
    message: "Vous avez reçu une nouvelle commande",
    priority: "high",
  },
  userId: "user_456",
});
```

### 3. Synchronisation Multi-Onglets

Les messages sont automatiquement distribués à toutes les connexions d'un même utilisateur, permettant la synchronisation entre onglets.

## Performance

### Optimisations

1. **Message Queue**
   - TTL de 5 minutes pour éviter la croissance infinie
   - Nettoyage automatique toutes les minutes
   - Limite de 1000 messages par queue

2. **Polling**
   - Intervalle par défaut: 5 secondes
   - Ajustable selon les besoins
   - Pas de polling si WebSocket actif

3. **WebSocket**
   - Heartbeat toutes les 30 secondes
   - Reconnexion automatique
   - Compression des messages (si supporté)

### Monitoring

```typescript
// Obtenir les statistiques
const stats = sync.getStats();

console.log("Queues actives:", stats.messageQueue.totalQueues);
console.log("Messages en attente:", stats.messageQueue.totalMessages);
console.log("Connexions WebSocket:", stats.websocket.activeConnections);
```

## Sécurité

1. **Authentication**
   - Tous les endpoints nécessitent une authentification
   - Les messages sont filtrés par userId

2. **Rate Limiting**
   - Limite de 1000 requêtes par 15 minutes sur `/api/*`
   - Protection contre les abus

3. **Validation**
   - Validation des types de messages
   - Sanitization des payloads

## Déploiement

### Variables d'Environnement

```env
PORT=5000
NODE_ENV=production
```

### Scaling

Pour un déploiement multi-instance:

1. Utiliser Redis pour le message queue (au lieu de la mémoire)
2. Utiliser Redis Pub/Sub pour la coordination WebSocket
3. Load balancer avec sticky sessions pour WebSocket

## Troubleshooting

### Le polling ne fonctionne pas

1. Vérifier que le serveur est démarré sur le bon port
2. Vérifier les logs serveur pour les erreurs
3. Tester l'endpoint manuellement: `curl http://localhost:5000/api/sync/poll?since=0`

### WebSocket ne se connecte pas

1. Vérifier que le WebSocketManager est initialisé
2. Vérifier les CORS si cross-origin
3. Vérifier les proxies/firewalls

### Messages non reçus

1. Vérifier que le userId est correct
2. Vérifier le timestamp `since`
3. Vérifier les logs du MessageQueue

## Prochaines Étapes

1. **Persistance Redis** - Pour le scaling multi-instance
2. **Compression** - Réduire la bande passante
3. **Encryption** - Chiffrement des messages sensibles
4. **Metrics** - Prometheus/Grafana pour le monitoring
5. **Tests** - Tests d'intégration end-to-end
