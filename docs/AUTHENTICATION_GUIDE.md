# Guide d'Authentification - Synchronisation en Temps Réel

## 🔐 Vue d'ensemble

Toutes les routes de synchronisation sont maintenant protégées par l'authentification Clerk. Cela garantit que:

- Seuls les utilisateurs authentifiés peuvent accéder aux données
- Chaque utilisateur ne voit que ses propres messages
- Les actions admin sont réservées aux administrateurs

## Architecture d'Authentification

```
Client (Browser)
    │
    ├─ Clerk Session Token
    │   └─ Stocké dans cookies/localStorage
    │
    └─ Requête HTTP
        │
        ├─ Header: Authorization: Bearer <token>
        │
        └─ Server
            │
            ├─ Middleware: clerkMiddleware()
            │   └─ Vérifie le token Clerk
            │
            ├─ Middleware: requireAuth
            │   ├─ Extrait userId de Clerk
            │   ├─ Récupère user depuis Convex
            │   └─ Ajoute req.user
            │
            └─ Route Handler
                └─ Accès à req.user.id
```

## Routes Protégées

### 1. GET /api/sync/poll

**Protection**: Authentification requise  
**Accès**: Utilisateur authentifié uniquement

```bash
# ❌ Sans authentification - Échoue
curl http://localhost:5000/api/sync/poll?since=0

# ✅ Avec authentification - Réussit
curl http://localhost:5000/api/sync/poll?since=0 \
  -H "Authorization: Bearer <clerk_token>"
```

**Comportement**:

- Retourne uniquement les messages de l'utilisateur authentifié
- Filtre automatiquement par `userId`

### 2. POST /api/sync/send

**Protection**: Authentification requise  
**Accès**: Utilisateur authentifié uniquement

```bash
# ✅ Avec authentification
curl -X POST http://localhost:5000/api/sync/send \
  -H "Authorization: Bearer <clerk_token>" \
  -H "Content-Type: application/json" \
  -d '{"type":"test","payload":{"message":"Hello"}}'
```

**Comportement**:

- Le message est automatiquement associé à l'utilisateur authentifié
- Impossible d'envoyer des messages pour un autre utilisateur

### 3. GET /api/sync

**Protection**: Authentification requise  
**Accès**: Utilisateur authentifié uniquement

```bash
# ✅ Récupère les données du dashboard de l'utilisateur
curl http://localhost:5000/api/sync \
  -H "Authorization: Bearer <clerk_token>"
```

### 4. POST /api/sync/validate

**Protection**: Authentification requise  
**Accès**: Utilisateur authentifié uniquement

```bash
# ✅ Valide les données de l'utilisateur
curl -X POST http://localhost:5000/api/sync/validate \
  -H "Authorization: Bearer <clerk_token>"
```

### 5. POST /api/sync/force

**Protection**: Authentification requise  
**Accès**: Utilisateur authentifié uniquement

```bash
# ✅ Force la synchronisation pour l'utilisateur
curl -X POST http://localhost:5000/api/sync/force \
  -H "Authorization: Bearer <clerk_token>"
```

### 6. GET /api/sync/status

**Protection**: Authentification requise  
**Accès**: Utilisateur authentifié uniquement

```bash
# ✅ Obtient le statut du système
curl http://localhost:5000/api/sync/status \
  -H "Authorization: Bearer <clerk_token>"
```

### 7. POST /api/sync/broadcast

**Protection**: Authentification + Rôle Admin  
**Accès**: Administrateurs uniquement

```bash
# ✅ Broadcast (admin uniquement)
curl -X POST http://localhost:5000/api/sync/broadcast \
  -H "Authorization: Bearer <admin_clerk_token>" \
  -H "Content-Type: application/json" \
  -d '{"type":"announcement","payload":{"message":"System update"}}'
```

**Comportement**:

- Vérifie que `req.user.role === "admin"` ou `"service_role"`
- Retourne 403 si l'utilisateur n'est pas admin

## Intégration Client

### Avec Clerk React

```typescript
import { useAuth } from "@clerk/clerk-react";

function MyComponent() {
  const { getToken } = useAuth();

  const fetchData = async () => {
    // Obtenir le token Clerk
    const token = await getToken();

    // Faire la requête avec le token
    const response = await fetch("http://localhost:5000/api/sync/poll?since=0", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await response.json();
    return data;
  };

  // ...
}
```

### Avec ConnectionManager

Le `ConnectionManager` doit être configuré pour inclure le token:

```typescript
import { useAuth } from "@clerk/clerk-react";
import { getConnectionManager } from "@/services/ConnectionManager";

function DashboardWithAuth() {
  const { getToken } = useAuth();

  useEffect(() => {
    const initConnection = async () => {
      const token = await getToken();

      const manager = getConnectionManager({
        pollingUrl: "http://localhost:5000/api/sync",
        // Le token sera ajouté automatiquement aux requêtes
      });

      // Configurer le token pour les requêtes
      manager.setAuthToken(token);

      await manager.connect();
    };

    initConnection();
  }, [getToken]);
}
```

## Mise à jour du ConnectionManager

Pour que le `ConnectionManager` envoie automatiquement le token, nous devons le modifier:

### 1. Ajouter le support du token dans PollingConnection

```typescript
class PollingConnection implements Connection {
  private authToken?: string;

  public setAuthToken(token: string): void {
    this.authToken = token;
  }

  private async startPolling(): void {
    // ...
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (this.authToken) {
      headers["Authorization"] = `Bearer ${this.authToken}`;
    }

    response = await fetch(`${this.url}/poll?since=${this.lastPollTime}`, {
      method: "GET",
      headers,
    });
    // ...
  }
}
```

### 2. Ajouter setAuthToken au ConnectionManager

```typescript
export class ConnectionManager extends BrowserEventEmitter {
  public setAuthToken(token: string): void {
    if (this.currentConnection?.type === "polling") {
      (this.currentConnection as PollingConnection).setAuthToken(token);
    }
  }
}
```

## Gestion des Erreurs d'Authentification

### Erreur 401 - Non authentifié

```json
{
  "error": "Non autorisé"
}
```

**Causes possibles**:

- Token Clerk manquant
- Token expiré
- Token invalide

**Solution**:

1. Vérifier que l'utilisateur est connecté
2. Rafraîchir le token avec `getToken({ skipCache: true })`
3. Rediriger vers la page de connexion si nécessaire

### Erreur 403 - Accès refusé

```json
{
  "error": "Admin access required",
  "code": "ACCESS_DENIED"
}
```

**Causes possibles**:

- Utilisateur non-admin essayant d'accéder à une route admin
- Rôle insuffisant

**Solution**:

- Vérifier les permissions de l'utilisateur
- Afficher un message d'erreur approprié

## Sécurité Avancée

### 1. Rate Limiting

Le serveur applique déjà un rate limiting:

- 1000 requêtes par 15 minutes sur `/api/*`
- Protection contre les abus

### 2. Audit Logging

Toutes les actions sont loggées:

- Authentification réussie/échouée
- Tentatives d'accès non autorisé
- Actions admin

### 3. IP Tracking

Le système track:

- Adresse IP de l'utilisateur
- User-Agent
- Tentatives de connexion échouées

### 4. Brute Force Protection

Protection automatique contre:

- Tentatives de connexion répétées
- Requêtes excessives
- Comportements suspects

## Tests

### Test avec Token de Test

Pour les tests automatisés:

```bash
# Utiliser le token de test
curl http://localhost:5000/api/sync/poll?since=0 \
  -H "Authorization: Bearer mock-test-token"
```

### Test avec Clerk Token Réel

```typescript
// Dans vos tests
import { useAuth } from "@clerk/clerk-react";

test("should fetch messages with auth", async () => {
  const { getToken } = useAuth();
  const token = await getToken();

  const response = await fetch("http://localhost:5000/api/sync/poll?since=0", {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  expect(response.status).toBe(200);
});
```

## Troubleshooting

### Problème: "Non autorisé" même avec token

**Solution**:

1. Vérifier que le token n'est pas expiré
2. Vérifier que Clerk est correctement configuré
3. Vérifier les logs serveur pour plus de détails

### Problème: Token non envoyé

**Solution**:

1. Vérifier que `getToken()` retourne bien un token
2. Vérifier que le header `Authorization` est bien ajouté
3. Vérifier les CORS si cross-origin

### Problème: 403 sur route admin

**Solution**:

1. Vérifier que l'utilisateur a le rôle `admin` ou `service_role`
2. Vérifier dans Clerk Dashboard que le rôle est bien assigné
3. Vérifier que le rôle est bien synchronisé dans Convex

## Prochaines Étapes

1. ✅ Authentification ajoutée à toutes les routes
2. ⏳ Mettre à jour ConnectionManager pour envoyer le token
3. ⏳ Ajouter des tests d'authentification
4. ⏳ Documenter la gestion des rôles
5. ⏳ Implémenter le refresh automatique du token

## Ressources

- [Clerk Documentation](https://clerk.com/docs)
- [Express Middleware](https://expressjs.com/en/guide/using-middleware.html)
- [JWT Best Practices](https://tools.ietf.org/html/rfc8725)
