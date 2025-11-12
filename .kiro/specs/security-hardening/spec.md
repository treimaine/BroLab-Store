# Security Hardening - Corrections Critiques

## Objectif

Corriger les 10 vulnérabilités de sécurité critiques identifiées dans l'audit de sécurité.

## Problèmes Identifiés

### 1. Secret de Session par Défaut

**Problème**: Utilisation d'un secret par défaut "brolab-secret-key" si SESSION_SECRET n'est pas défini
**Impact**: Compromission potentielle de toutes les sessions
**Fichier**: `server/auth.ts:37`

### 2. MemoryStore en Production

**Problème**: Utilisation de MemoryStore pour les sessions (perte au redémarrage)
**Impact**: Sessions perdues à chaque redémarrage, ne scale pas
**Fichier**: `server/auth.ts:46`

### 3. Routes PayPal Sans Authentification

**Problème**: Routes critiques sans middleware d'authentification

- `/api/paypal/capture-payment` (ligne 150)
- `/api/paypal/capture/:token` (ligne 193)
- `/api/paypal/order/:orderId` (ligne 246)
  **Impact**: N'importe qui peut capturer ou consulter des paiements
  **Fichier**: `server/routes/paypal.ts`

### 4. Logs PayPal Sensibles

**Problème**: Journalisation de données sensibles (réservations, montants, requestBody)
**Impact**: Exposition de données clients dans les logs
**Fichier**: `server/routes/paypal.ts`

### 5. Initialisation Convex Non Sécurisée

**Problème**: Utilisation de l'opérateur non-null `!` sans validation
**Impact**: Crash serveur si VITE_CONVEX_URL manque
**Fichiers**:

- `server/services/paypal.ts:14`
- `server/services/ReservationPaymentService.ts:26`
- `server/services/PaymentService.ts:49`
- `server/routes/orders.ts:50`
- `server/routes/stripe.ts:112`

### 6. Validation Email Token Faible

**Problème**: Accepte n'importe quelle chaîne de 36 caractères
**Impact**: Confirmation arbitraire de comptes
**Fichier**: `server/routes/email.ts:80`

### 7. Tokens de Réinitialisation Non Persistés

**Problème**: Tokens générés mais jamais stockés/validés
**Impact**: Système de reset de mot de passe non fonctionnel et non sécurisé
**Fichier**: `server/routes/email.ts:195-250`

### 8. Routes Admin Non Protégées

**Problème**: Routes admin sans authentification ni contrôle de rôle
**Impact**: Accès admin ouvert à tous
**Fichier**: `server/routes/security.ts`

### 9. Endpoints de Diagnostic Exposés

**Problème**: Logs d'entêtes Authorization et corps complets
**Impact**: Exposition de secrets dans les logs
**Fichier**: `server/routes/paypal.ts` (routes /test, /test-auth)

### 10. Fallback URLs Convex Non Sécurisés

**Problème**: URLs hardcodées en fallback
**Impact**: Connexion à mauvais environnement si variable manque
**Fichiers**:

- `server/routes/downloads.ts:26`
- `server/lib/audit.ts:4`

## Solution Proposée

### Phase 1: Corrections Critiques Immédiates

1. Forcer SESSION_SECRET obligatoire
2. Réactiver authentification sur routes PayPal
3. Sécuriser initialisation Convex
4. Supprimer logs sensibles

### Phase 2: Implémentation Sécurité

5. Implémenter stockage tokens email
6. Implémenter stockage tokens reset password
7. Protéger routes admin
8. Supprimer/protéger endpoints diagnostic

### Phase 3: Infrastructure

9. Configurer Redis pour sessions (production)
10. Audit complet des logs

## Priorité

🔴 CRITIQUE - À corriger immédiatement avant tout déploiement
