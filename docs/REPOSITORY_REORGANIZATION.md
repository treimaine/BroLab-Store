# Réorganisation du Repository - BroLab Entertainment

## Date

20 octobre 2025

## Objectif

Réorganiser la structure du repository selon les bonnes pratiques définies dans les règles de développement (tech.md, structure.md, product.md).

## Changements Effectués

### 1. Scripts de Debug et Utilitaires → `scripts/`

Déplacés de la racine vers `scripts/` :

- `debug-consistency.js`
- `debug-test.js`
- `debug-reservation-fix.cjs`
- `test-reservation-fix.js`
- `test-reservation-endpoint.js`
- `test-pages.js`
- `fix-all-imports.js`
- `fix-all-missing-imports.js`
- `fix-route-imports.js`
- `fix-syntax.js`
- `fix-zod-imports.js`
- `git-filter-repo.py`

### 2. Documentation et Summaries → `docs/`

Déplacés de la racine vers `docs/` :

- `AGENTS.md`
- `CLEANUP_SUMMARY.md`
- `CODE_SPLITTING_IMPLEMENTATION_SUMMARY.md`
- `CONVEX_CLERK_INTEGRATION_SUMMARY.md`
- `CONVEX_CLERK_MIGRATION.md`
- `CONVEX_INTEGRATION_TYPE_SAFETY_SUMMARY.md`
- `DASHBOARD_LIVE_DATA_VERIFICATION.md`
- `DEPENDENCY_CLEANUP_SUMMARY.md`
- `MIXING_MASTERING_CUSTOM_BEATS_FIX_SUMMARY.md`
- `MIXING_MASTERING_PAYMENT_CONSISTENCY_FIX.md`
- `OPTIMIZATION_SUMMARY.md`
- `RESERVATION_CHECKOUT_FIX_SUMMARY.md`
- `RESERVATION_SYSTEM_FIX_SUMMARY.md`
- `TASK_18_COMPLETION_SUMMARY.md`
- `TASK_2_IMPLEMENTATION_SUMMARY.md`
- `TASK_20_PERFORMANCE_OPTIMIZATION_SUMMARY.md`
- `TASK_4_2_COMPLETION_SUMMARY.md`
- `TASK_4_IMPLEMENTATION_SUMMARY.md`

### 3. Composants UI → `client/src/components/ui/`

- Déplacé `components/kokonutui/file-upload.tsx` vers `client/src/components/ui/`
- Supprimé le dossier `components/` à la racine (vide après déplacement)

### 4. Utilitaires → `client/src/lib/`

- Déplacé `lib/utils.ts` vers `client/src/lib/`
- Supprimé le dossier `lib/` à la racine (vide après déplacement)

### 5. Tests → `__tests__/testsprite/`

- Déplacé `testsprite_tests/` vers `__tests__/testsprite/`

### 6. Fichiers Temporaires

- Ajouté `attached_assets/` au `.gitignore` (contient des fichiers temporaires de développement)

### 7. Renommage de Dossiers

- Renommé `client/src/store/` → `client/src/stores/` (convention plurielle)
- Déplacé `client/src/layout/navbar.tsx` → `client/src/components/layout/`
- Déplacé `client/src/examples/*.tsx` → `client/src/components/examples/`
- Supprimé les dossiers vides `client/src/layout/` et `client/src/examples/`

### 8. Documentation des Specs → `docs/`

Déplacé les fichiers de summary des specs vers la documentation :

- `.kiro/specs/dashboard-mock-data-detection-fix/TASK_*_SUMMARY.md` → `docs/dashboard-mock-data-detection/`

Note : Les fichiers de spec (design.md, requirements.md, tasks.md) restent dans `.kiro/specs/` car c'est leur emplacement approprié.

### 9. Composants React → Organisation par Feature

Tous les composants ont été réorganisés dans des dossiers par feature dans `client/src/components/` :

- **auth/** - Composants d'authentification (Clerk, ProtectedRoute, UserProfile)
- **beats/** - Composants liés aux beats (BeatCard, BeatGrid, BeatCarousel)
- **cart/** - Composants du panier (AddToCartButton, CartProvider)
- **payments/** - Composants de paiement (PayPal, Stripe, PaymentForms)
- **audio/** - Lecteurs audio (WaveformPlayer, AudioPlayer, GlobalAudioPlayer)
- **dashboard/** - Composants du tableau de bord (Analytics, Downloads, Orders)
- **filters/** - Filtres de recherche (BPMFilter, UnifiedFilterPanel)
- **licenses/** - Composants de licences (LicensePicker, LicensePreview)
- **reservations/** - Système de réservation (ErrorBoundary, LoadingStates)
- **subscriptions/** - Gestion des abonnements (SubscriptionManager, Perks)
- **alerts/** - Bannières et notifications (AlertBanner, DiscountBanner)
- **layout/** - Composants de mise en page (MobileNav, SearchHero, ServicesStrip)
- **loading/** - États de chargement (LoadingSpinner, LazyComponents, VirtualScroll)
- **errors/** - Gestion des erreurs (ErrorBoundary, ErrorHandlers)
- **monitoring/** - Monitoring et performance (PerformanceMonitor, Analytics)
- **providers/** - Context providers (Currency, Geolocation, LoadingState)
- **seo/** - SEO et métadonnées (OpenGraph, SchemaMarkup)
- **newsletter/** - Newsletter (Signup, Modal)
- **ui/** - Composants primitives shadcn/ui

## Structure Finale Conforme

```
BroLab/
├── client/src/          # Frontend React
│   ├── components/      # Composants UI organisés par feature
│   │   ├── ui/         # Composants shadcn/ui et primitives
│   │   ├── audio/      # Composants audio
│   │   ├── dashboard/  # Composants dashboard
│   │   └── ...
│   ├── lib/            # Utilitaires client
│   ├── hooks/          # Custom hooks
│   ├── stores/         # Zustand stores
│   └── services/       # Business logic client
├── server/             # Backend Express
│   ├── routes/         # API routes
│   ├── services/       # Business logic serveur
│   └── middleware/     # Express middleware
├── convex/             # Base de données Convex
│   ├── schema.ts       # Schéma unique
│   └── [feature]/      # Fonctions par feature
├── shared/             # Code partagé
│   ├── types/          # Types TypeScript
│   ├── validation.ts   # Schémas Zod
│   └── utils/          # Utilitaires purs
├── __tests__/          # Tests
│   └── testsprite/     # Tests TestSprite
├── scripts/            # Scripts de build et debug
├── docs/               # Documentation
└── [fichiers config]   # Fichiers de configuration à la racine
```

## Bénéfices

1. **Clarté** : Structure plus claire et prévisible
2. **Maintenabilité** : Fichiers organisés par fonction
3. **Conformité** : Respect des bonnes pratiques définies
4. **Navigation** : Plus facile de trouver les fichiers
5. **Propreté** : Racine du projet épurée

## Résumé des Changements

### Fichiers Déplacés

- **12 scripts** de debug/fix → `scripts/`
- **17 documents** de summary → `docs/`
- **90+ composants** React réorganisés par feature
- **3 exemples** → `client/src/components/examples/`
- **1 navbar** → `client/src/components/layout/`
- **Tests TestSprite** → `__tests__/testsprite/`

### Dossiers Supprimés

- `components/` (racine)
- `lib/` (racine)
- `client/src/layout/`
- `client/src/examples/`

### Dossiers Renommés

- `client/src/store/` → `client/src/stores/`

### Nouveaux Dossiers Créés

- `client/src/components/auth/`
- `client/src/components/beats/`
- `client/src/components/cart/`
- `client/src/components/payments/`
- `client/src/components/reservations/`
- `client/src/components/subscriptions/`
- `client/src/components/licenses/`
- `client/src/components/loading/`
- `client/src/components/errors/`
- `client/src/components/newsletter/`
- `client/src/components/seo/`

## Prochaines Étapes Recommandées

1. **Mettre à jour les imports** : Les chemins d'import ont changé pour de nombreux composants
2. Exécuter `npm run type-check` pour identifier les imports cassés
3. Exécuter `npm run lint:fix` pour corriger automatiquement certains imports
4. Tester l'application : `npm run dev`
5. Vérifier les tests : `npm test`
6. Considérer la suppression du dossier `attached_assets/` si non nécessaire

## Impact sur les Imports

Les imports suivants doivent être mis à jour :

```typescript
// Avant
import { BeatCard } from "@/components/beat-card";
import { useCartStore } from "@/store/useCartStore";
import { Navbar } from "@/layout/navbar";

// Après
import { BeatCard } from "@/components/beats/beat-card";
import { useCartStore } from "@/stores/useCartStore";
import { Navbar } from "@/components/layout/navbar";
```
