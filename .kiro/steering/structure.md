# Project Structure

## Root Level Organization

```
brolab-beats/
├── client/                 # React frontend application
├── server/                 # Express backend application
├── convex/                 # Convex database functions
├── shared/                 # Shared TypeScript definitions
├── scripts/                # Development and deployment scripts
├── __tests__/              # Test files
├── docs/                   # Documentation files
└── components/             # Shared UI components
```

## Frontend Structure (client/)

```
client/
├── src/
│   ├── components/         # Reusable UI components
│   ├── pages/             # Route components
│   ├── hooks/             # Custom React hooks
│   ├── lib/               # Utilities and configurations
│   ├── stores/            # Zustand state stores
│   └── types/             # Frontend-specific types
├── public/                # Static assets
└── index.html             # Entry HTML file
```

## Backend Structure (server/)

```
server/
├── routes/                # API route handlers
├── lib/                   # Core libraries and utilities
├── middleware/            # Express middleware
├── services/              # Business logic services
├── types/                 # Backend-specific types
├── templates/             # Email templates
└── utils/                 # Server utilities
```

## Database Structure (convex/)

```
convex/
├── schema.ts              # Database schema definition
├── auth/                  # Authentication functions
├── orders/                # Order management functions
├── products/              # Product/beats functions
├── users/                 # User management functions
└── _generated/            # Auto-generated Convex files
```

## Shared Code (shared/)

```
shared/
├── types/                 # Common TypeScript interfaces
├── constants/             # Application constants
├── utils/                 # Shared utility functions
├── validation.ts          # Zod validation schemas
└── schema.ts              # Database schema types
```

## Key Conventions

### File Naming

- **Components**: PascalCase (e.g., `AudioPlayer.tsx`)
- **Hooks**: camelCase with `use` prefix (e.g., `useAudioPlayer.ts`)
- **Utilities**: camelCase (e.g., `formatPrice.ts`)
- **Types**: PascalCase interfaces (e.g., `User`, `Beat`)
- **Constants**: UPPER_SNAKE_CASE (e.g., `API_ENDPOINTS`)

### Import Aliases

- `@/` → `client/src/`
- `@shared/` → `shared/`
- `@convex/` → `convex/`

### Component Organization

- One component per file
- Co-locate related components in feature folders
- Separate presentation and logic components
- Use index.ts files for clean imports

### API Structure

- RESTful endpoints in `server/routes/`
- Convex functions for real-time features
- Shared validation schemas in `shared/validation.ts`
- Type-safe API contracts using shared types

### Testing Structure

- Test files adjacent to source files or in `__tests__/`
- Integration tests in `__tests__/integration/`
- Mocks and factories in `__tests__/mocks/`
- Test utilities in `__tests__/test-utils.tsx`
