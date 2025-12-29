# Requirements Document

## Introduction

Ce document définit les exigences pour l'audit et la refactorisation des duplications de code dans l'application BroLab Entertainment. L'objectif est d'identifier, cartographier et éliminer les duplications pour améliorer la maintenabilité, réduire la dette technique et prévenir les bugs.

**Dernière mise à jour:** 29 décembre 2025

## Glossary

- **Duplication_Exacte**: Code copié-collé identique ou quasi-identique entre plusieurs fichiers
- **Near_Duplicate**: Code similaire avec des variations mineures (renommage de variables, conditions inversées)
- **Duplication_Structurelle**: Même structure/pattern répété (try-catch, validation, auth check)
- **Duplication_Fonctionnelle**: Même logique métier implémentée différemment à plusieurs endroits
- **Factorisation**: Processus d'extraction du code dupliqué vers une abstraction réutilisable
- **Auth_Guard**: Pattern de vérification d'authentification utilisateur
- **Validation_Schema**: Schéma Zod définissant les règles de validation des données

## État d'avancement global

| Requirement                      | Statut      | Progression |
| -------------------------------- | ----------- | ----------- |
| 1. Consolidation validation      | ✅ COMPLÉTÉ | 100%        |
| 2. Auth patterns Convex          | 🔄 EN COURS | 60%         |
| 3. Gestion d'erreurs             | 🔄 EN COURS | 40%         |
| 4. Utilitaires formatage         | ✅ COMPLÉTÉ | 100%        |
| 5. Config environnement          | 🔄 EN COURS | 70%         |
| 6. Patterns localStorage         | ✅ COMPLÉTÉ | 100%        |
| 7. Patterns fetch/API            | ✅ COMPLÉTÉ | 100%        |
| 8. Toast/notification            | ⚠️ À FAIRE  | 20%         |
| 9. Fichiers validation dupliqués | ✅ COMPLÉTÉ | 100%        |
| 10. Patterns de prix             | ✅ COMPLÉTÉ | 100%        |

## Requirements

### Requirement 1: Consolidation des schémas de validation

**Statut:** ✅ COMPLÉTÉ

**User Story:** As a developer, I want centralized validation schemas, so that I can maintain consistent validation rules across the application.

#### Acceptance Criteria

1. ✅ WHEN a validation schema is needed, THE System SHALL use schemas from `shared/validation/` exclusively
   - **Implémenté:** Module centralisé dans `shared/validation/` avec sous-modules spécialisés
2. ✅ WHEN duplicate validation logic exists, THE System SHALL consolidate into a single source of truth
   - **Implémenté:** `convex/lib/validation.ts` et `server/lib/validation.ts` réexportent depuis `shared/validation/`
3. ✅ IF a validation function exists in multiple locations, THEN THE System SHALL remove duplicates and re-export from the central location
   - **Implémenté:** Pattern de réexportation en place
4. ✅ THE System SHALL provide type-safe validation middleware factories in a single location
   - **Implémenté:** `shared/validation/index.ts` contient `validateBody`, `validateQuery`, `validateParams`
5. ✅ WHEN validating email, THE System SHALL use a single `validateEmail` function across all layers
   - **Implémenté:** Source unique dans `shared/validation/validators.ts`, réexportée partout

#### Structure actuelle

```
shared/validation/
├── index.ts              # Point d'entrée principal
├── validators.ts         # validateEmail, validateUUID, etc.
├── sanitizers.ts         # sanitizeInput, sanitizeEmail, etc.
├── BeatValidation.ts     # Schémas spécifiques beats
├── OrderValidation.ts    # Schémas spécifiques commandes
├── ReservationValidation.ts
├── UserValidation.ts
├── ErrorValidation.ts
└── sync.ts
```

---

### Requirement 2: Unification des patterns d'authentification Convex

**Statut:** 🔄 EN COURS (60%)

**User Story:** As a developer, I want a single authentication helper for Convex functions, so that I can avoid repeating auth checks in every function.

#### Acceptance Criteria

1. ✅ WHEN a Convex function requires authentication, THE System SHALL use a centralized `requireAuth` helper
   - **Implémenté:** `convex/lib/authHelpers.ts` avec `requireAuth` et `optionalAuth`
2. ✅ THE System SHALL extract the repeated `ctx.auth.getUserIdentity()` pattern into a reusable utility
   - **Implémenté:** Helpers centralisés disponibles
3. ✅ WHEN authentication fails, THE System SHALL return consistent error messages across all functions
   - **Implémenté:** `AuthenticationError` et `UserNotFoundError` classes
4. ✅ IF a function needs optional authentication, THEN THE System SHALL provide an `optionalAuth` helper
   - **Implémenté:** `optionalAuth` disponible dans `authHelpers.ts`
5. 🔄 THE System SHALL reduce the 50+ instances of duplicated auth checks to a single implementation
   - **Partiellement complété:** ~20 fonctions utilisent `requireAuth`, mais ~25 instances directes de `ctx.auth.getUserIdentity()` persistent

#### Fichiers utilisant requireAuth (adoptés)

- `convex/users/getUserStats.ts`
- `convex/subscriptions/incrementDownloadUsage.ts`
- `convex/subscriptions/updateSubscription.ts`
- `convex/reservations/*.ts` (4 fichiers)
- `convex/orders/updateOrder.ts`
- `convex/files/*.ts` (4 fichiers)
- `convex/favorites/*.ts` (2 fichiers)
- `convex/downloads/record.ts`
- `convex/cartItems.ts`
- `convex/activity/logActivity.ts`

#### Fichiers à migrer (instances directes restantes)

- `convex/dashboard.ts` (~3 instances)
- `convex/orders.ts` (~8 instances)
- `convex/downloads.ts` (~3 instances)
- `convex/auth/roles.ts` (~4 instances)

---

### Requirement 3: Centralisation de la gestion d'erreurs

**Statut:** 🔄 EN COURS (40%)

**User Story:** As a developer, I want consistent error handling patterns, so that errors are logged and reported uniformly.

#### Acceptance Criteria

1. 🔄 WHEN an error occurs in a try-catch block, THE System SHALL use a centralized error handler
   - **Partiellement implémenté:** `shared/utils/errorUtils.ts` existe mais pas universellement adopté
2. ✅ THE System SHALL provide typed error classes for different error categories
   - **Implémenté:** `AppError`, `ValidationError`, `AuthError` dans `shared/utils/errorUtils.ts`
3. 🔄 WHEN logging errors, THE System SHALL use a single logging service instead of direct `console.error` calls
   - **Partiellement implémenté:** `server/lib/secureLogger.ts` existe, mais ~50+ `console.error` directs persistent
4. ⚠️ IF an error needs user-friendly messaging, THEN THE System SHALL map technical errors to user messages via a central mapping
   - **À faire:** Pas de mapping centralisé
5. ⚠️ THE System SHALL eliminate the 100+ instances of duplicated `catch (error) { console.error(...) }` patterns
   - **À faire:** Nombreuses instances dans `server/wordpress.ts`, `server/services/`, etc.

#### Instances console.error restantes (principales)

- `server/wordpress.ts`: ~15 instances
- `server/services/ReservationPaymentService.ts`: ~8 instances
- `server/services/mail.ts`: ~3 instances
- `shared/validation/index.ts`: ~3 instances
- `shared/utils/`: ~5 instances

---

### Requirement 4: Consolidation des utilitaires de formatage

**Statut:** ✅ COMPLÉTÉ

**User Story:** As a developer, I want unified formatting utilities, so that prices, dates, and currencies are formatted consistently.

#### Acceptance Criteria

1. ✅ WHEN formatting currency amounts, THE System SHALL use a single `formatCurrency` function from `shared/utils/`
   - **Implémenté:** `shared/utils/currency.ts` avec `formatCurrency`, `formatCurrencyDisplay`, `formatCurrencyCompact`
2. ✅ THE System SHALL consolidate the 15+ instances of `toFixed(2)` price formatting into a central utility
   - **Implémenté:** Utilitaires centralisés, instances restantes sont des cas spécifiques (PDF, validation)
3. ✅ WHEN converting cents to dollars, THE System SHALL use a single `centsToDollars` function
   - **Implémenté:** `centsToDollars` dans `shared/utils/currency.ts`, utilisé partout
4. ✅ IF currency formatting needs localization, THEN THE System SHALL use the i18n formatters
   - **Implémenté:** Support multi-locale dans `formatCurrency`
5. ✅ THE System SHALL remove duplicate `formatCurrencyAmount` implementations
   - **Implémenté:** Une seule implémentation dans `shared/utils/business-logic.ts`

#### Module currency actuel

```typescript
// shared/utils/currency.ts
export function centsToDollars(cents: number): number;
export function dollarsToCents(dollars: number): number;
export function formatCurrency(amountInCents: number, options?: CurrencyOptions): string;
export function formatCurrencyDisplay(
  amountInCents: number,
  options?: CurrencyDisplayOptions
): string;
export function formatCurrencyCompact(amountInCents: number, options?: CurrencyOptions): string;
```

---

### Requirement 5: Unification de la configuration environnement

**Statut:** 🔄 EN COURS (70%)

**User Story:** As a developer, I want a single source of truth for environment configuration, so that I don't have scattered env access.

#### Acceptance Criteria

1. ✅ WHEN accessing environment variables, THE System SHALL use centralized config modules
   - **Implémenté:** `client/src/config/index.ts` et `server/config/` existent
2. 🔄 THE System SHALL consolidate scattered `process.env` accesses
   - **Partiellement complété:** Certains accès directs persistent
3. ✅ WHEN a new environment variable is needed, THE System SHALL add it to the central schema with validation
   - **Implémenté:** Validation Zod dans les configs
4. 🔄 IF an env variable is accessed directly via `process.env` or `import.meta.env`, THEN THE System SHALL refactor to use the config module
   - **En cours:** Migration progressive
5. ✅ THE System SHALL provide type-safe access to all environment variables
   - **Implémenté:** Types définis dans les modules config

---

### Requirement 6: Consolidation des patterns localStorage

**Statut:** ✅ COMPLÉTÉ

**User Story:** As a developer, I want unified localStorage management, so that client-side storage is consistent and type-safe.

#### Acceptance Criteria

1. ✅ WHEN storing data in localStorage, THE System SHALL use a centralized storage service
   - **Implémenté:** `client/src/services/StorageManager.ts`
2. ✅ THE System SHALL consolidate the 20+ direct `localStorage.getItem/setItem` calls into a typed storage manager
   - **Implémenté:** Seules 6 instances directes restent (CrossTabSyncManager pour raisons techniques)
3. ✅ WHEN reading from localStorage, THE System SHALL handle JSON parsing errors consistently
   - **Implémenté:** Gestion d'erreurs dans StorageManager
4. ✅ IF localStorage is unavailable, THEN THE System SHALL provide graceful fallbacks
   - **Implémenté:** Détection de disponibilité et fallbacks
5. ✅ THE System SHALL provide typed getters/setters for each storage key
   - **Implémenté:** API typée avec génériques

---

### Requirement 7: Unification des patterns fetch/API

**Statut:** ✅ COMPLÉTÉ

**User Story:** As a developer, I want a single API client, so that HTTP requests are handled consistently.

#### Acceptance Criteria

1. ✅ WHEN making HTTP requests, THE System SHALL use a centralized API client
   - **Implémenté:** `client/src/services/ApiService.ts`
2. ✅ THE System SHALL consolidate the 30+ direct `fetch()` calls into a typed API service
   - **Implémenté:** ApiService avec retry logic et timeout handling
3. ✅ WHEN handling API errors, THE System SHALL use consistent error parsing and retry logic
   - **Implémenté:** Exponential backoff et error handling standardisé
4. ✅ IF authentication is required, THEN THE System SHALL automatically include auth headers via the API client
   - **Implémenté:** `client/src/lib/auth-fetch.ts` et intégration dans ApiService
5. ✅ THE System SHALL provide typed request/response handling for all API endpoints
   - **Implémenté:** Types dans `shared/types/apiEndpoints.ts`

#### Services API actuels

```
client/src/services/
├── ApiService.ts         # Client HTTP centralisé
├── ConnectionManager.ts  # Gestion connexion WebSocket/polling
├── SyncManager.ts        # Synchronisation données
└── ErrorLoggingService.ts # Logging erreurs remote
```

---

### Requirement 8: Consolidation des patterns de toast/notification

**Statut:** ⚠️ À FAIRE (20%)

**User Story:** As a developer, I want unified notification handling, so that user feedback is consistent.

#### Acceptance Criteria

1. ⚠️ WHEN showing user notifications, THE System SHALL use a centralized toast service
   - **À faire:** Appels `toast()` directs dispersés (~40+ instances)
2. ⚠️ THE System SHALL consolidate the scattered `toast()` calls into a notification manager
   - **À faire:** Pas de NotificationManager centralisé
3. ⚠️ WHEN an error occurs, THE System SHALL show user-friendly error messages via the notification service
   - **À faire:** Messages hardcodés dans chaque composant
4. ⚠️ IF multiple notifications are triggered, THEN THE System SHALL queue them appropriately
   - **À faire:** Pas de système de queue
5. ✅ THE System SHALL provide typed notification methods (success, error, warning, info)
   - **Partiellement implémenté:** Hook `useToast` avec variants

#### Fichiers avec appels toast directs (à migrer)

- `client/src/pages/shop.tsx`
- `client/src/pages/product.tsx`
- `client/src/pages/checkout-success.tsx`
- `client/src/pages/mixing-mastering.tsx`
- `client/src/pages/recording-sessions.tsx`
- `client/src/pages/production-consultation.tsx`
- `client/src/pages/payment-*.tsx`
- `client/src/providers/CacheProvider.tsx`

---

### Requirement 9: Élimination des fichiers de validation dupliqués

**Statut:** ✅ COMPLÉTÉ

**User Story:** As a developer, I want a single validation module structure, so that I know where to find and add validation logic.

#### Acceptance Criteria

1. ✅ THE System SHALL maintain validation schemas in `shared/validation/` only
   - **Implémenté:** Source unique de vérité
2. ✅ WHEN `convex/lib/validation.ts` contains duplicate logic, THE System SHALL migrate to shared and re-export
   - **Implémenté:** Réexportation avec notice de dépréciation
3. ✅ WHEN `server/lib/validation.ts` duplicates shared schemas, THE System SHALL remove duplicates
   - **Implémenté:** Réexportation depuis shared
4. ✅ IF middleware-specific validation is needed, THEN THE System SHALL extend shared schemas in `server/middleware/validation.ts`
   - **Implémenté:** Extensions spécifiques au middleware
5. ✅ THE System SHALL remove the 3 duplicate `validateEmail` implementations
   - **Implémenté:** Source unique dans `shared/validation/validators.ts`

#### Architecture de validation finale

```
shared/validation/validators.ts    # Source unique (validateEmail, etc.)
    ↓ réexporte
shared/validation/index.ts         # Point d'entrée principal
    ↓ réexporte
convex/lib/validation.ts           # Backward compatibility (deprecated)
server/lib/validation.ts           # Backward compatibility (deprecated)
```

---

### Requirement 10: Consolidation des patterns de prix

**Statut:** ✅ COMPLÉTÉ

**User Story:** As a developer, I want consistent price handling, so that monetary calculations are accurate and uniform.

#### Acceptance Criteria

1. ✅ WHEN handling prices, THE System SHALL use cents as the internal representation
   - **Implémenté:** Convention cents partout
2. ✅ THE System SHALL consolidate the 10+ instances of `(amount / 100).toFixed(2)` into a central utility
   - **Implémenté:** `centsToDollars` + `formatCurrency`
3. ✅ WHEN displaying prices, THE System SHALL use the `formatCurrency` utility with proper locale
   - **Implémenté:** Support multi-locale
4. ✅ IF currency conversion is needed, THEN THE System SHALL use the centralized currency service
   - **Implémenté:** `shared/utils/currency.ts`
5. ✅ THE System SHALL ensure all price calculations use integer arithmetic to avoid floating-point errors
   - **Implémenté:** Calculs en cents, conversion uniquement pour affichage

#### Utilitaires prix disponibles

```typescript
// shared/utils/currency.ts
centsToDollars(cents: number): number
dollarsToCents(dollars: number): number
formatCurrency(amountInCents: number, options?: CurrencyOptions): string

// convex/lib/statisticsCalculator.ts
CurrencyCalculator.centsToDollars(cents: number): number
CurrencyCalculator.formatDollars(amount: number): string
```

---

## Prochaines étapes recommandées

### Priorité haute

1. **Migrer les instances auth restantes** - Convertir les ~25 `ctx.auth.getUserIdentity()` directs vers `requireAuth`
2. **Créer NotificationManager** - Centraliser les ~40 appels `toast()` dispersés

### Priorité moyenne

3. **Centraliser error handling** - Remplacer les `console.error` par le logger centralisé
4. **Compléter migration env config** - Éliminer les accès `process.env` directs restants

### Priorité basse

5. **Documentation** - Mettre à jour les guides développeur avec les nouveaux patterns
