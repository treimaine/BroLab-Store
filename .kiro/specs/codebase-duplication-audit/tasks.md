# Implementation Plan: Codebase Duplication Audit & Refactoring

## Overview

Ce plan d'implémentation guide la refactorisation des duplications de code identifiées dans l'application BroLab Entertainment. L'approche est incrémentale, en commençant par les modules partagés fondamentaux, puis en migrant progressivement les consommateurs.

## ⚠️ Garanties de Non-Régression

### Intégrations Protégées (NE PAS MODIFIER)

Les fichiers et intégrations suivants sont **critiques** et ne doivent **PAS** être modifiés par cette refactorisation:

| Intégration             | Fichiers Protégés                                                                                  | Raison                                      |
| ----------------------- | -------------------------------------------------------------------------------------------------- | ------------------------------------------- |
| **Clerk Auth**          | `client/src/main.tsx` (ClerkProvider, ConvexProviderWithClerk), `client/src/hooks/useAuthState.ts` | Configuration racine de l'authentification  |
| **Convex-Clerk Bridge** | `convex/users/clerkSync.ts`, pattern `ctx.auth.getUserIdentity()`                                  | Synchronisation utilisateurs Clerk ↔ Convex |
| **WooCommerce API**     | `server/routes/woo.ts`, `server/services/woo.ts`                                                   | Intégration catalogue produits              |
| **WordPress API**       | `server/routes/wp.ts`, `server/services/wp.ts`                                                     | Intégration contenu CMS                     |
| **WooCommerce Sync**    | `convex/sync/woocommerce.ts`, `convex/sync/wordpress.ts`                                           | Synchronisation commandes/produits          |
| **Stripe/PayPal**       | `server/routes/stripe.ts`, `server/routes/paypal.ts`, `server/routes/webhooks.ts`                  | Paiements - NE JAMAIS TOUCHER               |
| **Clerk Webhooks**      | `server/routes/clerk.ts`, `server/routes/clerk-billing.ts`                                         | Webhooks authentification                   |

### Règles de Sécurité

1. **Pattern Re-export**: Les nouveaux helpers (`requireAuth`, `optionalAuth`) **encapsulent** `ctx.auth.getUserIdentity()` sans le remplacer
2. **Backward Compatibility**: Tous les anciens imports continuent de fonctionner via re-exports
3. **Pas de modification des webhooks**: Les routes de webhooks (Stripe, PayPal, Clerk) restent intactes
4. **Tests avant migration**: Chaque migration est testée individuellement avant de passer à la suivante
5. **Rollback possible**: Chaque tâche peut être annulée indépendamment

## Tasks

- [x] 1. Set up shared validation module structure
  - [x] 1.1 Create `shared/validation/index.ts` as the central export point
    - Consolidate exports from existing validation files
    - Create barrel exports for all schemas
    - _Requirements: 1.1, 1.2, 9.1_

  - [x] 1.2 Migrate `validateEmail` to single implementation
    - Create `shared/validation/validators.ts` with unified validateEmail
    - Remove duplicate implementations from convex/lib and server/lib
    - Update all imports to use shared/validation
    - _Requirements: 1.5, 9.5_

  - [x] 1.3 Write property test for email validation consistency
    - **Property 2: Email Validation Round-Trip**
    - **Validates: Requirements 1.5, 9.5**

  - [x] 1.4 Create re-exports in `convex/lib/validation.ts` and `server/lib/validation.ts`
    - Replace duplicate code with re-exports from shared/validation
    - Maintain backward compatibility for existing imports
    - _Requirements: 1.3, 9.2, 9.3_

- [ ] 2. Checkpoint - Validation consolidation complete
  - Ensure all tests pass, ask the user if questions arise.

- [x] 3. Implement Convex auth helpers
  - [x] 3.1 Create `convex/lib/authHelpers.ts` with requireAuth and optionalAuth
    - Implement AuthResult interface
    - Implement requireAuth function that **wraps** `ctx.auth.getUserIdentity()` (ne remplace pas)
    - Implement optionalAuth function returning null for unauthenticated
    - Implement resolveUserId helper
    - **⚠️ NE PAS modifier** `convex/users/clerkSync.ts` - c'est le pont Clerk ↔ Convex
    - _Requirements: 2.1, 2.2, 2.3, 2.4_

  - [ ]\* 3.2 Write property tests for auth helpers
    - **Property 3: Auth Helper Correctness**
    - **Property 4: Optional Auth Null Safety**
    - **Validates: Requirements 2.1, 2.2, 2.3, 2.4**

  - [x] 3.3 Migrate first batch of Convex functions to use auth helpers
    - Update 10 most-used Convex mutations to use requireAuth
    - **⚠️ EXCLURE**: `convex/users/clerkSync.ts`, `convex/sync/*.ts`, `convex/auth/*.ts`
    - Verify backward compatibility
    - _Requirements: 2.1, 2.5_

- [ ] 4. Checkpoint - Auth helpers implemented
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Implement centralized error handling
  - [x] 5.1 Create `shared/utils/errorHandler.ts`
    - Implement AppError interface and createAppError function
    - Implement withErrorHandling wrapper
    - Implement isAppError type guard
    - _Requirements: 3.1, 3.2_

  - [x] 5.2 Create error type mappings in `shared/constants/errors.ts`
    - Define ErrorType enum with all error categories
    - Create ERROR_MESSAGES mapping for user-friendly messages
    - Create ERROR_HTTP_STATUS mapping for HTTP status codes
    - _Requirements: 3.4_

  - [ ]\* 5.3 Write property test for error handler
    - **Property 5: Error Handler Type Preservation**
    - **Validates: Requirements 3.1, 3.2, 3.4**

- [x] 6. Implement currency utilities
  - [x] 6.1 Create `shared/utils/currency.ts`
    - Implement centsToDollars and dollarsToCents functions
    - Implement formatCurrency with locale support
    - Implement formatCurrencyDisplay for templates
    - _Requirements: 4.1, 4.3, 10.1_

  - [ ]\* 6.2 Write property tests for currency utilities
    - **Property 6: Currency Formatting Round-Trip**
    - **Property 7: Currency Display Consistency**
    - **Property 11: Price Calculation Integer Arithmetic**
    - **Validates: Requirements 4.1, 4.3, 10.1, 10.5**

  - [x] 6.3 Migrate price formatting calls to use currency utilities
    - Replace scattered toFixed(2) patterns with formatCurrency
    - Replace (amount / 100) patterns with centsToDollars
    - _Requirements: 4.2, 10.2_

- [ ] 7. Checkpoint - Core utilities complete
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 8. Implement client-side services
  - [ ] 8.1 Create `client/src/services/StorageManager.ts`
    - Implement StorageManager class with typed get/set methods
    - Implement TTL support for expiring items
    - Implement typed getters for common keys (cart, language, recentlyViewed)
    - Add error handling for localStorage unavailability
    - _Requirements: 6.1, 6.3, 6.4, 6.5_

  - [ ]\* 8.2 Write property tests for StorageManager
    - **Property 8: Storage Manager Round-Trip**
    - **Property 9: Storage Manager Error Resilience**
    - **Validates: Requirements 6.1, 6.3, 6.4, 6.5**

  - [ ] 8.3 Create `client/src/services/ApiService.ts`
    - Implement ApiService class with typed request methods
    - Implement retry logic with exponential backoff
    - Implement timeout handling
    - Add convenience methods (get, post, put, delete)
    - _Requirements: 7.1, 7.3, 7.5_

  - [ ]\* 8.4 Write property test for API client retry behavior
    - **Property 10: API Client Retry Behavior**
    - **Validates: Requirements 7.3**

- [ ] 9. Checkpoint - Client services complete
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 10. Migrate existing code to use new utilities
  - [ ] 10.1 Migrate localStorage calls to StorageManager
    - Search for direct localStorage.getItem/setItem calls
    - Replace with storage.get/set calls
    - Update cart-related storage to use typed methods
    - **⚠️ NE PAS modifier** le comportement du panier existant
    - _Requirements: 6.2_

  - [ ] 10.2 Migrate fetch calls to ApiService
    - Identify direct fetch() calls in client code
    - Replace with apiService methods
    - Ensure auth headers are properly handled
    - **⚠️ EXCLURE**: `client/src/api/woocommerce.ts` - intégration WooCommerce existante
    - _Requirements: 7.2, 7.4_

  - [ ] 10.3 Migrate remaining Convex functions to auth helpers
    - Update remaining mutations to use requireAuth/optionalAuth
    - Remove duplicated ctx.auth.getUserIdentity() patterns
    - **⚠️ EXCLURE**: `convex/users/clerkSync.ts`, `convex/sync/*.ts`, `convex/auth/*.ts`
    - _Requirements: 2.5_

- [ ] 11. Implement notification service consolidation
  - [ ] 11.1 Create `client/src/services/NotificationService.ts`
    - Implement typed notification methods (success, error, warning, info)
    - Implement notification queuing
    - Integrate with existing toast system
    - _Requirements: 8.1, 8.4, 8.5_

  - [ ] 11.2 Migrate toast calls to NotificationService
    - Replace scattered toast() calls with notificationService methods
    - Ensure error messages are user-friendly
    - _Requirements: 8.2, 8.3_

- [ ] 12. Final cleanup and documentation
  - [ ] 12.1 Remove deprecated duplicate files
    - Delete or mark as deprecated: convex/lib/validation.ts (if fully migrated)
    - Delete or mark as deprecated: server/lib/validation.ts (if fully migrated)
    - Update any remaining imports
    - _Requirements: 9.3, 9.5_

  - [ ] 12.2 Update import paths across codebase
    - Ensure all imports use the new consolidated paths
    - Verify no circular dependencies introduced
    - _Requirements: 1.2, 1.3_

- [ ] 13. Final checkpoint - All refactoring complete
  - Ensure all tests pass, ask the user if questions arise.
  - Run full test suite
  - Verify no TypeScript errors
  - Verify no linting errors

## Notes

- Tasks marked with `*` are optional property-based tests that can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties
- Unit tests validate specific examples and edge cases
- Migration tasks (10.x) can be done incrementally to minimize risk

## Fichiers Exclus de la Refactorisation

Ces fichiers ne seront **JAMAIS** modifiés par cette refactorisation:

```
# Clerk Integration
client/src/main.tsx                    # ClerkProvider setup
client/src/hooks/useAuthState.ts       # Clerk auth state hook
server/routes/clerk.ts                 # Clerk webhooks
server/routes/clerk-billing.ts         # Clerk billing webhooks

# Convex-Clerk Bridge
convex/users/clerkSync.ts              # User sync between Clerk and Convex
convex/auth/*.ts                       # Auth-related Convex functions

# WooCommerce/WordPress Integration
server/routes/woo.ts                   # WooCommerce API routes
server/routes/wp.ts                    # WordPress API routes
server/services/woo.ts                 # WooCommerce service
server/services/wp.ts                  # WordPress service
client/src/api/woocommerce.ts          # Client WooCommerce API
convex/sync/woocommerce.ts             # WooCommerce sync
convex/sync/wordpress.ts               # WordPress sync

# Payment Integration
server/routes/stripe.ts                # Stripe payments
server/routes/paypal.ts                # PayPal payments
server/routes/webhooks.ts              # Payment webhooks
server/routes/payments.ts              # Payment processing
```
