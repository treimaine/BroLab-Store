---
inclusion: always
---

---

## inclusion: always

# Project Structure & Code Organization

Full-stack TypeScript application: React (Vite) + Express + Convex real-time database.

## Directory Structure

```
client/src/          # React frontend
  components/        # Feature-based UI components
  pages/            # Route pages
  hooks/            # Custom React hooks
  stores/           # Zustand state stores
  services/         # Client-side business logic
  types/            # Frontend-only types
server/             # Express backend
  routes/           # API route handlers
  services/         # Business logic layer
  middleware/       # Express middleware
  utils/            # Server utilities
convex/             # Convex database
  schema.ts         # Database schema (single source)
  [feature]/        # Feature-specific functions
shared/             # Cross-platform code
  types/            # Shared TypeScript interfaces
  validation.ts     # Zod schemas
  constants/        # Enums, API endpoints
  utils/            # Pure utility functions
components/         # shadcn/ui components
__tests__/          # Test files and mocks
scripts/            # Build and deployment scripts
```

## File Naming Conventions

- **Components**: `PascalCase.tsx` (AudioPlayer.tsx, BeatCard.tsx)
- **Hooks**: `useCamelCase.ts` (useAudioPlayer.ts, useDashboardData.ts)
- **Services**: `PascalCaseService.ts` (PaymentService.ts, SyncManager.ts)
- **Stores**: `useCamelCaseStore.ts` (useCartStore.ts, useDashboardStore.ts)
- **Utils**: `camelCase.ts` (formatPrice.ts, validateEmail.ts)
- **Types**: `PascalCase.ts` (User.ts, Beat.ts, Order.ts)
- **Tests**: `*.test.ts` or `*.test.tsx` (adjacent to source or in **tests**/)

## Import Aliases (Required)

Always use these path aliases:

```typescript
import { Component } from "@/components/Component"; // client/src/
import { validateUser } from "@shared/validation"; // shared/
import { getUserById } from "@convex/users"; // convex/
```

## Component Organization

### Feature-Based Structure

Group related components by domain feature:

```
client/src/components/
  audio/          # AudioPlayer, WaveForm, PlayButton
  beats/          # BeatCard, BeatGrid, BeatFilters
  cart/           # CartItem, CartSummary, Checkout
  dashboard/      # ModernDashboard, UserStats, DownloadHistory
  ui/             # Button, Input, Modal (shadcn/ui primitives)
```

### Component Rules

- One component per file
- Co-locate related sub-components in feature folders
- Separate container (logic) from presentation when complex
- Export via index.ts: `export { default } from './Component'`
- Use TypeScript interfaces for props (not types)

## State Management Patterns

### Client State (Zustand)

Location: `client/src/stores/`

```typescript
// useFeatureStore.ts
import { create } from "zustand";

interface FeatureState {
  data: Data[];
  setData: (data: Data[]) => void;
}

export const useFeatureStore = create<FeatureState>(set => ({
  data: [],
  setData: data => set({ data }),
}));
```

### Server State (TanStack Query)

Use for API data caching with stale-while-revalidate:

```typescript
const { data, isLoading } = useQuery({
  queryKey: ["feature", id],
  queryFn: () => fetchFeature(id),
  staleTime: 5 * 60 * 1000, // 5 minutes
});
```

### Real-Time State (Convex)

Use Convex subscriptions for live data:

```typescript
const data = useQuery(api.feature.list, { userId });
```

## Database Layer Patterns

### Convex Functions

Location: `convex/[feature]/functionName.ts`

```typescript
// Query (read-only, no side effects)
export const list = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    // Always filter to user-accessible data
    return await ctx.db
      .query("items")
      .filter(q => q.eq(q.field("userId"), args.userId))
      .collect();
  },
});

// Mutation (write operations)
export const create = mutation({
  args: {
    /* ... */
  },
  handler: async (ctx, args) => {
    // Validate user permissions first
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    return await ctx.db.insert("items", args);
  },
});

// Action (external API calls)
export const processPayment = action({
  args: {
    /* ... */
  },
  handler: async (ctx, args) => {
    // Call external APIs (Stripe, PayPal, etc.)
  },
});
```

### Express Routes

Location: `server/routes/featureName.ts`

```typescript
router.post(
  "/api/feature",
  authMiddleware, // Validate Clerk session
  validateRequest, // Zod schema validation
  rateLimiter, // Rate limiting
  async (req, res) => {
    try {
      const result = await FeatureService.process(req.body);
      res.json(result);
    } catch (error) {
      res.status(500).json({
        error: error.message,
        code: "FEATURE_ERROR",
      });
    }
  }
);
```

## Data Flow Architecture

1. **Real-time features** → Client → Convex (dashboard, notifications, cart sync)
2. **External APIs** → Client → Express → External Service (payments, WordPress)
3. **Validation** → Shared Zod schemas for type safety across layers

## Service Layer Pattern

Location: `client/src/services/` or `server/services/`

```typescript
// Client service example
export class FeatureService {
  private static instance: FeatureService;

  static getInstance(): FeatureService {
    if (!this.instance) {
      this.instance = new FeatureService();
    }
    return this.instance;
  }

  async processData(input: Input): Promise<Output> {
    // Business logic here
  }
}
```

## Testing Organization

### Test Placement

- **Unit tests**: Adjacent to source (`Component.test.tsx`)
- **Integration tests**: `__tests__/integration/`
- **API tests**: `__tests__/server/`
- **Component tests**: `__tests__/components/`
- **Shared utilities**: `__tests__/test-utils.tsx`, `__tests__/factories.ts`

### Test Structure

```typescript
describe("FeatureName", () => {
  beforeEach(() => {
    // Setup
  });

  it("should perform action when condition is met", () => {
    // Arrange
    // Act
    // Assert
  });

  it("should handle error when invalid input provided", () => {
    // Test error cases
  });
});
```

## Code Organization Best Practices

### When Creating New Features

1. Define types in `shared/types/` if used by multiple layers
2. Create Zod schema in `shared/validation.ts`
3. Add Convex schema definition in `convex/schema.ts`
4. Implement Convex functions in `convex/[feature]/`
5. Create React components in `client/src/components/[feature]/`
6. Add custom hooks in `client/src/hooks/`
7. Create Zustand store if needed in `client/src/stores/`
8. Write tests in `__tests__/`

### When Modifying Existing Features

1. Check if types exist in `shared/types/` before creating new ones
2. Update Zod schemas if validation changes
3. Update Convex schema if database structure changes
4. Maintain backward compatibility for API endpoints
5. Update tests to reflect changes
6. Run `npm run type-check` before committing

### File Size Guidelines

- Components: < 300 lines (split if larger)
- Services: < 500 lines (extract utilities if larger)
- Hooks: < 150 lines (compose multiple hooks if needed)
- Utils: Single responsibility, < 100 lines per function
