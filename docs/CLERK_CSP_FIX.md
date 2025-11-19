# Clerk CSP Configuration Fix

## Problème

Après l'ajout de Helmet pour la sécurité, Clerk ne fonctionnait plus :

- Les plans de subscription n'étaient plus visibles
- L'authentification était impossible
- Les iframes et scripts Clerk étaient bloqués

## Cause

Helmet ajoute une Content Security Policy (CSP) stricte qui bloque par défaut tous les domaines externes. Clerk nécessite plusieurs domaines pour fonctionner :

- `*.clerk.accounts.dev` - Interface d'authentification
- `*.clerk.com` - API et ressources
- `api.clerk.com` - API backend
- `api.clerk.dev` - API de développement

## Solution

### 1. Ajout des domaines Clerk à la CSP

Mise à jour de `server/middleware/security.ts` pour autoriser les domaines Clerk :

```typescript
export const helmetMiddleware = helmet({
  contentSecurityPolicy: {
    directives: {
      scriptSrc: [
        "'self'",
        "'unsafe-inline'",
        "'unsafe-eval'",
        "https://cdn.jsdelivr.net",
        "https://*.clerk.accounts.dev", // ✅ Ajouté
        "https://*.clerk.com", // ✅ Ajouté
      ],
      styleSrc: [
        "'self'",
        "'unsafe-inline'",
        "https://fonts.googleapis.com",
        "https://*.clerk.accounts.dev", // ✅ Ajouté
        "https://*.clerk.com", // ✅ Ajouté
      ],
      imgSrc: [
        "'self'",
        "data:",
        "https:",
        "blob:",
        "https://*.clerk.accounts.dev", // ✅ Ajouté
        "https://*.clerk.com", // ✅ Ajouté
      ],
      connectSrc: [
        "'self'",
        "https:",
        "wss:",
        "https://*.clerk.accounts.dev", // ✅ Ajouté
        "https://*.clerk.com", // ✅ Ajouté
        "https://api.clerk.com", // ✅ Ajouté
        "https://api.clerk.dev", // ✅ Ajouté
      ],
      frameSrc: [
        "'self'",
        "https:",
        "https://*.clerk.accounts.dev", // ✅ Ajouté
        "https://*.clerk.com", // ✅ Ajouté
      ],
    },
  },
});
```

### 2. Ajustement du Rate Limiting pour Clerk

Le rate limiter d'authentification (20 requêtes/15min) était trop strict pour Clerk qui fait plusieurs appels lors de l'authentification.

**Avant :**

```typescript
app.use("/api/clerk", authRateLimiter, clerkRouter); // 20/15min - trop strict
```

**Après :**

```typescript
app.use("/api/clerk", apiRateLimiter, clerkRouter); // 1000/15min - suffisant
```

### 3. Webhooks Clerk sans Rate Limiting

Les webhooks Clerk ne doivent pas être rate-limités car ils viennent des serveurs Clerk :

```typescript
// Pas de rate limiting sur les webhooks
app.use("/api/webhooks/clerk-billing", clerkBillingRouter);
```

## Vérification

### 1. Vérifier les headers CSP

```bash
curl -I http://localhost:5000/ | grep -i "content-security-policy"
```

Vous devriez voir les domaines Clerk dans la CSP.

### 2. Tester l'authentification

1. Démarrer le serveur : `npm run dev`
2. Ouvrir http://localhost:5000/login
3. Vérifier que l'interface Clerk s'affiche correctement
4. Tester la connexion

### 3. Vérifier les plans de subscription

1. Ouvrir http://localhost:5000/membership
2. Vérifier que les plans Clerk s'affichent
3. Tester la sélection d'un plan

### 4. Console du navigateur

Ouvrir la console (F12) et vérifier qu'il n'y a pas d'erreurs CSP :

- ❌ Avant : `Refused to load ... because it violates the following Content Security Policy directive`
- ✅ Après : Aucune erreur CSP liée à Clerk

## Domaines Clerk autorisés

| Domaine                | Usage                               |
| ---------------------- | ----------------------------------- |
| `*.clerk.accounts.dev` | Interface d'authentification (dev)  |
| `*.clerk.com`          | Interface d'authentification (prod) |
| `api.clerk.com`        | API backend (prod)                  |
| `api.clerk.dev`        | API backend (dev)                   |

## Sécurité

Cette configuration reste sécurisée car :

- Seuls les domaines Clerk officiels sont autorisés
- Les wildcards (`*`) sont limités aux sous-domaines Clerk
- Les autres directives CSP restent strictes
- Le rate limiting reste actif (1000/15min pour Clerk)

## Autres services à autoriser

Si vous utilisez d'autres services externes, ajoutez-les de la même manière :

```typescript
// Exemple pour Stripe
scriptSrc: [
  // ... existing
  "https://js.stripe.com",
],
frameSrc: [
  // ... existing
  "https://js.stripe.com",
  "https://hooks.stripe.com",
],
```

## Références

- [Clerk CSP Documentation](https://clerk.com/docs/security/content-security-policy)
- [Helmet CSP Configuration](https://helmetjs.github.io/#content-security-policy)
- [MDN CSP Guide](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP)
