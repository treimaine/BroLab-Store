# Rapport de Migration Supabase vers Convex

## Résumé

Ce rapport documente la migration de Supabase vers Convex dans l'application BroLab. La migration vise à remplacer complètement l'utilisation de Supabase par Convex pour la gestion des données.

## Fichiers Migrés ✅

### 1. `server/routes/downloads.ts`

- **Avant** : Utilisait `supabaseAdmin` pour les opérations CRUD
- **Après** : Utilise `ConvexHttpClient` avec les fonctions Convex
- **Fonctions migrées** :
  - `logDownload` → `api.downloads.logDownload`
  - `getUserDownloads` → `api.downloads.getUserDownloads`
  - `checkDownloadQuota` → `api.downloads.checkDownloadQuota`
- **Routes corrigées** :
  - `POST /api/downloads` - Log des téléchargements
  - `GET /api/downloads` - Liste des téléchargements utilisateur
  - `GET /api/downloads/export` - Export CSV
  - `GET /api/downloads/quota` - Quota de téléchargements
  - `GET /api/downloads/debug` - Debug des données

### 2. `server/lib/dbUser.ts`

- **Avant** : Utilisait `supabaseAdmin` pour récupérer les utilisateurs
- **Après** : Utilise Convex (fonction à implémenter pour la recherche par email)
- **Note** : La fonction `getUserByEmail` nécessite une implémentation dans Convex

### 3. `server/lib/audit.ts`

- **Avant** : Utilisait `supabaseAdmin` pour les logs d'audit
- **Après** : Utilise `ConvexHttpClient` avec les fonctions audit Convex
- **Fonctions migrées** :
  - `logAuditEvent` → `api.audit.logAuditEvent`
  - `getUserAuditLogs` → `api.audit.getUserAuditLogs`
  - `getSecurityEvents` → `api.audit.getSecurityEvents`

### 4. `convex/schema.ts`

- **Ajouté** : Table `auditLogs` pour remplacer `audit_logs` Supabase
- **Structure** :
  ```typescript
  auditLogs: defineTable({
    userId: v.optional(v.id("users")),
    clerkId: v.optional(v.string()),
    action: v.string(),
    resource: v.string(),
    details: v.optional(v.any()),
    ipAddress: v.optional(v.string()),
    userAgent: v.optional(v.string()),
    timestamp: v.number(),
  });
  ```

### 5. `convex/audit.ts` (Nouveau)

- **Créé** : Nouvelles fonctions Convex pour l'audit
- **Fonctions** :
  - `logAuditEvent` - Log d'événements d'audit
  - `getUserAuditLogs` - Récupération des logs utilisateur
  - `getSecurityEvents` - Événements de sécurité
  - `logRegistration` - Log d'inscription
  - `logLogin` - Log de connexion
  - `logFailedLogin` - Log d'échec de connexion

## Fichiers à Corriger ⚠️

### 1. Tests (`__tests__/`)

- `api-auth.test.ts` - Utilise encore `supabaseAdmin`
- `api-payment.test.ts` - Utilise encore `supabaseAdmin`
- `api-order-status.test.ts` - Utilise encore `supabaseAdmin`
- `api-subscription.test.ts` - Utilise encore `supabaseAdmin`
- `dbUser.test.ts` - Utilise encore `supabaseAdmin`

### 2. Scripts (`scripts/`)

- `clear-database.js` - Importe `supabaseAdmin`
- `clear-database-final.js` - Utilise Supabase
- `clean-all.js` - Utilise Supabase
- `test-supabase-connection.js` - Test de connexion Supabase
- `sync-beats-wordpress-to-supabase.js` - Sync vers Supabase
- `migrate-to-convex.ts` - Script de migration

### 3. Fichiers avec Imports Commentés

- `server/middleware/rateLimiter.ts` - Import Supabase commenté
- `server/lib/upload.ts` - Import Supabase commenté
- `server/lib/storage.ts` - Import Supabase commenté
- `server/lib/monitoring.ts` - Import Supabase commenté
- `server/lib/invoices.ts` - Import Supabase commenté
- `server/routes/storage.ts` - Import Supabase commenté
- `server/routes/wishlist.ts` - Import Supabase commenté

## Prochaines Étapes

### 1. Corriger les Tests

- Remplacer les mocks Supabase par des mocks Convex
- Mettre à jour les tests pour utiliser l'API Convex
- Adapter les assertions aux nouvelles structures de données

### 2. Nettoyer les Scripts

- Supprimer ou adapter les scripts de migration Supabase
- Créer de nouveaux scripts pour Convex si nécessaire
- Mettre à jour les scripts de nettoyage de base de données

### 3. Implémenter les Fonctions Manquantes

- Fonction de recherche d'utilisateur par email dans Convex
- Fonctions de gestion des fichiers (upload/storage)
- Fonctions de monitoring et métriques

### 4. Vérifier les Imports Commentés

- Déterminer si les fonctionnalités sont encore nécessaires
- Implémenter les équivalents Convex si nécessaire
- Supprimer le code inutilisé

## Avantages de la Migration

1. **Performance** : Convex offre de meilleures performances avec sa base de données optimisée
2. **Simplicité** : API plus simple et cohérente
3. **Sécurité** : Authentification intégrée avec Clerk
4. **Temps réel** : Synchronisation automatique des données
5. **Déploiement** : Pas de configuration complexe de base de données

## Risques et Considérations

1. **Données existantes** : Nécessité de migrer les données existantes
2. **Tests** : Tous les tests doivent être adaptés
3. **Fonctionnalités manquantes** : Certaines fonctionnalités Supabase n'ont pas d'équivalent direct
4. **Apprentissage** : L'équipe doit s'adapter à la nouvelle API

## Conclusion

La migration de Supabase vers Convex est en cours et progresse bien. Les routes principales et les fonctions d'audit ont été migrées avec succès. Les prochaines étapes consistent à corriger les tests et nettoyer les scripts restants.
