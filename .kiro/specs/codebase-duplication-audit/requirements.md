# Requirements Document

## Introduction

Ce document définit les exigences pour l'audit et la refactorisation des duplications de code dans l'application BroLab Entertainment. L'objectif est d'identifier, cartographier et éliminer les duplications pour améliorer la maintenabilité, réduire la dette technique et prévenir les bugs.

## Glossary

- **Duplication_Exacte**: Code copié-collé identique ou quasi-identique entre plusieurs fichiers
- **Near_Duplicate**: Code similaire avec des variations mineures (renommage de variables, conditions inversées)
- **Duplication_Structurelle**: Même structure/pattern répété (try-catch, validation, auth check)
- **Duplication_Fonctionnelle**: Même logique métier implémentée différemment à plusieurs endroits
- **Factorisation**: Processus d'extraction du code dupliqué vers une abstraction réutilisable
- **Auth_Guard**: Pattern de vérification d'authentification utilisateur
- **Validation_Schema**: Schéma Zod définissant les règles de validation des données

## Requirements

### Requirement 1: Consolidation des schémas de validation

**User Story:** As a developer, I want centralized validation schemas, so that I can maintain consistent validation rules across the application.

#### Acceptance Criteria

1. WHEN a validation schema is needed, THE System SHALL use schemas from `shared/validation/` exclusively
2. WHEN duplicate validation logic exists in `convex/lib/validation.ts`, `server/lib/validation.ts`, and `server/middleware/validation.ts`, THE System SHALL consolidate into a single source of truth
3. IF a validation function exists in multiple locations, THEN THE System SHALL remove duplicates and re-export from the central location
4. THE System SHALL provide type-safe validation middleware factories in a single location
5. WHEN validating email, THE System SHALL use a single `validateEmail` function across all layers

### Requirement 2: Unification des patterns d'authentification Convex

**User Story:** As a developer, I want a single authentication helper for Convex functions, so that I can avoid repeating auth checks in every function.

#### Acceptance Criteria

1. WHEN a Convex function requires authentication, THE System SHALL use a centralized `requireAuth` helper
2. THE System SHALL extract the repeated `ctx.auth.getUserIdentity()` pattern into a reusable utility
3. WHEN authentication fails, THE System SHALL return consistent error messages across all functions
4. IF a function needs optional authentication, THEN THE System SHALL provide an `optionalAuth` helper
5. THE System SHALL reduce the 50+ instances of duplicated auth checks to a single implementation

### Requirement 3: Centralisation de la gestion d'erreurs

**User Story:** As a developer, I want consistent error handling patterns, so that errors are logged and reported uniformly.

#### Acceptance Criteria

1. WHEN an error occurs in a try-catch block, THE System SHALL use a centralized error handler
2. THE System SHALL provide typed error classes for different error categories (ValidationError, AuthError, BusinessError)
3. WHEN logging errors, THE System SHALL use a single logging service instead of direct `console.error` calls
4. IF an error needs user-friendly messaging, THEN THE System SHALL map technical errors to user messages via a central mapping
5. THE System SHALL eliminate the 100+ instances of duplicated `catch (error) { console.error(...) }` patterns

### Requirement 4: Consolidation des utilitaires de formatage

**User Story:** As a developer, I want unified formatting utilities, so that prices, dates, and currencies are formatted consistently.

#### Acceptance Criteria

1. WHEN formatting currency amounts, THE System SHALL use a single `formatCurrency` function from `shared/utils/`
2. THE System SHALL consolidate the 15+ instances of `toFixed(2)` price formatting into a central utility
3. WHEN converting cents to dollars, THE System SHALL use a single `centsToDollars` function
4. IF currency formatting needs localization, THEN THE System SHALL use the i18n formatters from `client/src/i18n/`
5. THE System SHALL remove duplicate `formatCurrencyAmount` implementations

### Requirement 5: Unification de la configuration environnement

**User Story:** As a developer, I want a single source of truth for environment configuration, so that I don't have scattered env access.

#### Acceptance Criteria

1. WHEN accessing environment variables, THE System SHALL use centralized config modules
2. THE System SHALL consolidate `server/lib/env.ts`, `client/src/config/index.ts`, and scattered `process.env` accesses
3. WHEN a new environment variable is needed, THE System SHALL add it to the central schema with validation
4. IF an env variable is accessed directly via `process.env` or `import.meta.env`, THEN THE System SHALL refactor to use the config module
5. THE System SHALL provide type-safe access to all environment variables

### Requirement 6: Consolidation des patterns localStorage

**User Story:** As a developer, I want unified localStorage management, so that client-side storage is consistent and type-safe.

#### Acceptance Criteria

1. WHEN storing data in localStorage, THE System SHALL use a centralized storage service
2. THE System SHALL consolidate the 20+ direct `localStorage.getItem/setItem` calls into a typed storage manager
3. WHEN reading from localStorage, THE System SHALL handle JSON parsing errors consistently
4. IF localStorage is unavailable, THEN THE System SHALL provide graceful fallbacks
5. THE System SHALL provide typed getters/setters for each storage key

### Requirement 7: Unification des patterns fetch/API

**User Story:** As a developer, I want a single API client, so that HTTP requests are handled consistently.

#### Acceptance Criteria

1. WHEN making HTTP requests, THE System SHALL use a centralized API client
2. THE System SHALL consolidate the 30+ direct `fetch()` calls into a typed API service
3. WHEN handling API errors, THE System SHALL use consistent error parsing and retry logic
4. IF authentication is required, THEN THE System SHALL automatically include auth headers via the API client
5. THE System SHALL provide typed request/response handling for all API endpoints

### Requirement 8: Consolidation des patterns de toast/notification

**User Story:** As a developer, I want unified notification handling, so that user feedback is consistent.

#### Acceptance Criteria

1. WHEN showing user notifications, THE System SHALL use a centralized toast service
2. THE System SHALL consolidate the scattered `toast()` calls into a notification manager
3. WHEN an error occurs, THE System SHALL show user-friendly error messages via the notification service
4. IF multiple notifications are triggered, THEN THE System SHALL queue them appropriately
5. THE System SHALL provide typed notification methods (success, error, warning, info)

### Requirement 9: Élimination des fichiers de validation dupliqués

**User Story:** As a developer, I want a single validation module structure, so that I know where to find and add validation logic.

#### Acceptance Criteria

1. THE System SHALL maintain validation schemas in `shared/validation/` only
2. WHEN `convex/lib/validation.ts` contains duplicate logic, THE System SHALL migrate to shared and re-export
3. WHEN `server/lib/validation.ts` duplicates shared schemas, THE System SHALL remove duplicates
4. IF middleware-specific validation is needed, THEN THE System SHALL extend shared schemas in `server/middleware/validation.ts`
5. THE System SHALL remove the 3 duplicate `validateEmail` implementations

### Requirement 10: Consolidation des patterns de prix

**User Story:** As a developer, I want consistent price handling, so that monetary calculations are accurate and uniform.

#### Acceptance Criteria

1. WHEN handling prices, THE System SHALL use cents as the internal representation
2. THE System SHALL consolidate the 10+ instances of `(amount / 100).toFixed(2)` into a central utility
3. WHEN displaying prices, THE System SHALL use the `formatCurrency` utility with proper locale
4. IF currency conversion is needed, THEN THE System SHALL use the centralized currency service
5. THE System SHALL ensure all price calculations use integer arithmetic to avoid floating-point errors
