---
inclusion: always
---

# Technology Stack & Development Guidelines

## Core Technology Stack

### Frontend (client/)

- **React 18** with TypeScript - Component-based UI with strict typing
- **Vite 5.4+** - Fast development server and optimized builds
- **Wouter** - Lightweight client-side routing (prefer over React Router)
- **Zustand** - Client-side state management (prefer over Redux/Context)
- **TanStack Query** - Server state management and caching
- **Tailwind CSS** - Utility-first styling with custom design tokens
- **shadcn/ui + Radix UI** - Accessible component primitives
- **WaveSurfer.js** - Audio waveform visualization (core business feature)

### Backend (server/)

- **Node.js 20+** with Express - RESTful API server
- **TypeScript strict mode** - No `any` types, full type safety
- **Convex** - Real-time database for new features (preferred)
- **Supabase** - Legacy PostgreSQL support (maintain, don't extend)
- **Clerk** - Authentication and user management
- **Stripe + PayPal** - Payment processing with error handling

### Development Tools

- **npm 9+** - Package management (no yarn/pnpm)
- **ESLint** - Code linting with React and TypeScript rules
- **Jest + React Testing Library** - Unit and integration testing
- **Supertest** - API endpoint testing

## Architecture Patterns

### Database Strategy

- **New features**: Use Convex mutations/queries for real-time capabilities
- **Legacy features**: Maintain Supabase integration, don't extend
- **Data flow**: Client → Convex (real-time) or Client → Express → External APIs

### State Management Rules

- **Client state**: Zustand stores in `client/src/stores/`
- **Server state**: TanStack Query for caching and synchronization
- **Form state**: React Hook Form with Zod validation
- **Global state**: Minimize usage, prefer component composition

### Import Aliases (Required)

```typescript
import { Component } from "@/components/Component"; // client/src/
import { validateUser } from "@shared/validation"; // shared/
import { getUserById } from "@convex/users"; // convex/
```

## Code Quality Requirements

### TypeScript Standards

- Strict mode enabled - no `any` types allowed
- Explicit return types for functions
- Proper error handling with typed exceptions
- Use Zod schemas for runtime validation

### Component Patterns

- Functional components with hooks only
- Props interfaces with descriptive names
- Error boundaries for robust UX
- Lazy loading for performance optimization

### Testing Requirements

- Unit tests for business logic functions
- Integration tests for API endpoints
- Component tests with React Testing Library
- Mock external dependencies (Stripe, WordPress)

## Essential Commands

### Development Workflow

```bash
npm run dev              # Full-stack development server
npm run client           # Frontend-only development
npm run type-check       # TypeScript validation
npm run lint:fix         # Auto-fix linting issues
npm run verify           # Pre-commit validation
```

### Testing & Quality

```bash
npm test                 # Run Jest test suite
npm run test:watch       # Watch mode for development
npm run pre-check        # Type-check + lint validation
```

### Build & Deployment

```bash
npm run build            # Production build (client + server)
npm run start            # Start production server
npm run clean:all        # Full cleanup and reinstall
```

## Performance & Security Guidelines

### Performance Rules

- Lazy load components with React.lazy()
- Use TanStack Query for efficient data fetching
- Implement proper error boundaries
- Optimize bundle size with Vite code splitting

### Security Requirements

- Validate all user inputs with Zod schemas
- Implement Row-Level Security (RLS) for data access
- Use Clerk for authentication, never roll custom auth
- Sanitize file uploads with antivirus scanning

### Error Handling Patterns

- Use Result types for error-prone operations
- Implement comprehensive error boundaries
- Log errors with proper context for debugging
- Provide user-friendly error messages
