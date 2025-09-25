---
inclusion: always
---

# Project Structure & Code Organization

## Architecture Overview

This is a full-stack TypeScript application with React frontend, Express backend, and Convex real-time database. Follow these structural patterns when creating or modifying code.

### Root Directory Structure

```
├── client/                 # React frontend (Vite + TypeScript)
├── server/                 # Express backend API
├── convex/                 # Convex database functions & schema
├── shared/                 # Shared types, utils, validation
├── components/             # Shared UI components (shadcn/ui)
├── __tests__/              # Test files and utilities
├── scripts/                # Build, deployment, maintenance scripts
└── docs/                   # Documentation and reports
```

## File Placement Rules

### Frontend Files (client/src/)

- **Components**: `client/src/components/[feature]/ComponentName.tsx`
- **Pages**: `client/src/pages/PageName.tsx`
- **Hooks**: `client/src/hooks/useFeatureName.ts`
- **Stores**: `client/src/stores/featureStore.ts` (Zustand)
- **Types**: `client/src/types/` (frontend-specific only)

### Backend Files (server/)

- **Routes**: `server/routes/featureName.ts` (Express routers)
- **Services**: `server/services/FeatureService.ts` (business logic)
- **Middleware**: `server/middleware/middlewareName.ts`
- **Utils**: `server/utils/utilityName.ts`

### Database Files (convex/)

- **Schema**: `convex/schema.ts` (single source of truth)
- **Functions**: `convex/[feature]/functionName.ts`
- **Mutations**: Use for data writes, always validate permissions
- **Queries**: Use for data reads, implement proper filtering

### Shared Code (shared/)

- **Types**: `shared/types/FeatureName.ts` (cross-platform interfaces)
- **Validation**: `shared/validation.ts` (Zod schemas)
- **Constants**: `shared/constants/` (API endpoints, enums)
- **Utils**: `shared/utils/` (pure functions used by client/server)

## Naming Conventions

### Files & Directories

- **Components**: PascalCase (`AudioPlayer.tsx`, `BeatCard.tsx`)
- **Hooks**: camelCase with `use` prefix (`useAudioPlayer.ts`)
- **Services**: PascalCase with Service suffix (`PaymentService.ts`)
- **Utils**: camelCase (`formatPrice.ts`, `validateEmail.ts`)
- **Types**: PascalCase (`User.ts`, `Beat.ts`, `Order.ts`)
- **Constants**: UPPER_SNAKE_CASE (`API_ENDPOINTS.ts`)

### Code Elements

- **Interfaces**: PascalCase (`User`, `Beat`, `PaymentIntent`)
- **Enums**: PascalCase (`OrderStatus`, `LicenseType`)
- **Functions**: camelCase (`getUserById`, `processPayment`)
- **Variables**: camelCase (`currentUser`, `beatList`)

## Import Aliases (tsconfig.json)

```typescript
// Use these exact aliases in imports
import { Component } from "@/components/Component"; // client/src/
import { validateUser } from "@shared/validation"; // shared/
import { getUserById } from "@convex/users"; // convex/
```

## Component Organization Patterns

### Feature-Based Grouping

```
client/src/components/
├── audio/              # AudioPlayer, WaveForm, PlayButton
├── beats/              # BeatCard, BeatGrid, BeatFilters
├── cart/               # CartItem, CartSummary, Checkout
├── dashboard/          # UserStats, DownloadHistory
└── ui/                 # Button, Input, Modal (shadcn/ui)
```

### Component Structure

- One component per file
- Co-locate related components in feature folders
- Separate container (logic) from presentation components
- Use index.ts for clean imports: `export { default } from './Component'`

## API & Database Patterns

### Convex Functions

- **Queries**: Read operations, no side effects
- **Mutations**: Write operations, validate user permissions
- **Actions**: External API calls, file uploads

### Express Routes

- RESTful endpoints: `/api/beats`, `/api/orders/:id`
- Use middleware for auth, validation, rate limiting
- Return consistent error responses

### Data Flow

1. Client → Convex (real-time features)
2. Client → Express → External APIs (payments, WordPress)
3. Shared validation schemas for type safety

## Testing Organization

### Test File Placement

- **Unit tests**: Adjacent to source files (`Component.test.tsx`)
- **Integration tests**: `__tests__/integration/`
- **API tests**: `__tests__/server/`
- **Utilities**: `__tests__/test-utils.tsx`, `__tests__/factories.ts`

### Test Naming

- Test files: `FeatureName.test.ts`
- Test suites: `describe('FeatureName', () => {})`
- Test cases: `it('should do something when condition', () => {})`
