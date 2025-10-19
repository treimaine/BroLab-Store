---
inclusion: always
---

# Technology Stack & Development Guidelines

## Core Stack

### Frontend (client/)

- **React 18 + TypeScript** - Functional components only, strict typing, no `any` types
- **Vite 5.4+** - Development server and build tool
- **Wouter** - Routing (not React Router)
- **Zustand** - Client state (not Redux/Context API)
- **TanStack Query** - Server state caching with stale-while-revalidate
- **Tailwind CSS** - Utility-first styling
- **shadcn/ui + Radix UI** - Accessible component primitives
- **WaveSurfer.js** - Audio waveform visualization (business-critical)

### Backend (server/)

- **Node.js 20+ + Express** - RESTful API server
- **TypeScript strict mode** - Explicit return types, no `any`
- **Convex** - Real-time database (preferred for new features)
- **Supabase** - Legacy PostgreSQL (maintain only, do not extend)
- **Clerk** - Authentication (never custom auth)
- **Stripe + PayPal** - Payment processing

### Development Tools

- **npm** - Package manager (no yarn/pnpm)
- **ESLint** - Linting with React and TypeScript rules
- **Jest + React Testing Library** - Testing framework
- **Supertest** - API endpoint testing

## Required Import Aliases

Always use these path aliases:

```typescript
import { Component } from "@/components/Component"; // client/src/
import { validateUser } from "@shared/validation"; // shared/
import { getUserById } from "@convex/users"; // convex/
```

## Architecture Patterns

### Database Selection

- **New features** → Convex (real-time mutations/queries)
- **Legacy features** → Supabase (maintain, don't extend)
- **Data flow** → Client → Convex (real-time) OR Client → Express → External APIs

### State Management

- **Client state** → Zustand stores in `client/src/stores/`
- **Server state** → TanStack Query with appropriate stale times
- **Form state** → React Hook Form + Zod validation
- **Avoid** → Redux, Context API for global state, prop drilling

### Component Patterns

- Functional components with hooks only (no class components)
- Props as interfaces (not types): `interface ComponentProps { ... }`
- Error boundaries for robust error handling
- Lazy loading with `React.lazy()` for code splitting
- One component per file, co-locate related sub-components

## TypeScript Standards

### Strict Rules

- No `any` types - use `unknown` and type guards if needed
- Explicit return types on all functions
- Proper error handling with typed exceptions
- Runtime validation with Zod schemas for external data

### Example Pattern

```typescript
// Good
export function processData(input: Input): Result<Output, Error> {
  // Implementation
}

// Bad
export function processData(input: any): any {
  // Implementation
}
```

## Testing Requirements

### Test Coverage

- Unit tests for business logic functions
- Integration tests for API endpoints
- Component tests with React Testing Library
- Mock external dependencies (Stripe, WordPress, Clerk)

### Test Structure

```typescript
describe("FeatureName", () => {
  beforeEach(() => {
    // Setup
  });

  it("should perform action when condition is met", () => {
    // Arrange, Act, Assert
  });
});
```

## Essential Commands

```bash
# Development
npm run dev              # Full-stack dev server
npm run client           # Frontend only
npm run type-check       # TypeScript validation
npm run lint:fix         # Auto-fix linting

# Testing
npm test                 # Run test suite
npm run test:watch       # Watch mode
npm run pre-check        # Type-check + lint

# Build
npm run build            # Production build
npm run start            # Start production server
npm run clean:all        # Full cleanup
```

## Performance Standards

- Lazy load routes and heavy components with `React.lazy()`
- Use TanStack Query for efficient data fetching and caching
- Implement error boundaries to prevent full app crashes
- Code splitting with Vite for optimized bundles
- Virtual scrolling for lists with 100+ items
- Debounce user input (search/filter) with 300ms minimum

## Security Requirements

- Validate all user inputs with Zod schemas
- Verify webhook signatures before processing (Stripe, PayPal)
- Use Clerk for authentication (never custom auth)
- Implement Row-Level Security (RLS) for database access
- Antivirus scan all file uploads before storage
- Check user permissions in both client and server

## Error Handling Patterns

- Use Result types for error-prone operations
- Implement error boundaries in React components
- Log errors with context for debugging
- Provide user-friendly error messages (not technical stack traces)
- Handle async errors with try-catch and proper typing

### Example Pattern

```typescript
try {
  const result = await riskyOperation();
  return { success: true, data: result };
} catch (error) {
  logger.error("Operation failed", { error, context });
  return { success: false, error: "User-friendly message" };
}
```

## Code Quality Checklist

Before committing code:

1. Run `npm run type-check` - no TypeScript errors
2. Run `npm run lint:fix` - no linting errors
3. Run `npm test` - all tests pass
4. Verify no `any` types introduced
5. Check import aliases are used correctly
6. Ensure proper error handling exists
