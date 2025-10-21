---
inclusion: always
---

# Code Quality & Error Prevention

## Mandatory Error Fixing Rule

**After creating a new file or writing new lines of code, ALWAYS fix any errors or warnings in the file before proceeding.**

### Workflow

1. **Create/Modify** - Write or update code in a file
2. **Check** - Use Kiro's `getDiagnostics` tool on the modified file(s)
3. **Fix** - Resolve all TypeScript errors, linting warnings, and type issues
4. **Verify** - Re-run diagnostics to confirm all issues are resolved
5. **Proceed** - Only move to the next task after the file is error-free

### Why This Matters

- Prevents cascading errors across the codebase
- Ensures type safety and catches bugs early
- Maintains code quality standards
- Avoids broken builds and failed deployments
- Reduces technical debt accumulation

## Technology-Specific Best Practices

### Convex Best Practices

**Schema Design**

- Define all tables in `convex/schema.ts` with proper indexes
- Use `v.id("tableName")` for foreign keys, never plain strings
- Add indexes for frequently queried fields: `.index("by_userId", ["userId"])`
- Use `searchIndex` for full-text search capabilities
- Always validate with Zod schemas before mutations

**Query Patterns**

- Queries are reactive and cached automatically - no manual cache management
- Use `.filter()` for simple conditions, indexes for complex queries
- Paginate large result sets with `.paginate()` for performance
- Never expose sensitive data - filter by user permissions in every query

**Mutation Patterns**

- Always check `ctx.auth.getUserIdentity()` before writes
- Use transactions implicitly - mutations are atomic by default
- Return the created/updated document ID for optimistic updates
- Validate all inputs with Zod schemas at the handler entry point

**Action Patterns**

- Use actions for external API calls (Stripe, WordPress, file uploads)
- Actions can call mutations but not vice versa
- Handle errors gracefully with try-catch and user-friendly messages
- Use `ctx.runMutation()` to call mutations from actions

**Authentication with Clerk**

- Use `ctx.auth.getUserIdentity()` to get current user in Convex functions
- Store Clerk user ID as `userId` field in all user-owned documents
- Never trust client-provided user IDs - always use `ctx.auth`
- Implement Row-Level Security by filtering queries by `userId`

### Clerk Best Practices

**Authentication Setup**

- Use `<ClerkProvider>` at app root with `publishableKey`
- Protect routes with `<SignedIn>` and `<SignedOut>` components
- Use `useUser()` hook for current user data in components
- Use `useAuth()` hook for session tokens and sign-out functionality

**User Metadata**

- Store app-specific data in `publicMetadata` (visible to all)
- Store sensitive data in `privateMetadata` (server-only)
- Use `unsafeMetadata` for client-writable data (validate server-side)
- Sync Clerk user ID to Convex on first sign-in via webhook

**Session Management**

- Sessions are managed automatically - no manual token handling
- Use `getAuth()` in API routes to verify authentication
- Set session token in Convex client: `new ConvexReactClient(url, { auth: useAuth })`
- Handle session expiration gracefully with automatic refresh

### WordPress/WooCommerce Integration

**REST API Usage**

- Use WooCommerce REST API v3 with OAuth 1.0a authentication
- Never expose API keys in client code - proxy through Express
- Cache product data with TanStack Query (5-minute stale time)
- Implement rate limiting to respect API quotas (default: 10 req/sec)

**Data Sync Patterns**

- WordPress is read-only source of truth for beats catalog
- Sync to Convex on schedule (not real-time) for performance
- Store WordPress product ID as `wordpressId` in Convex
- Never write back to WordPress from the app

**Webhook Handling**

- Verify webhook signatures before processing
- Use idempotency keys to prevent duplicate processing
- Queue webhook processing for reliability (don't block response)
- Log all webhook events for debugging and audit trails

### Sonaar Music Player Plugin

**Integration Pattern**

- Sonaar provides audio URLs and metadata via WordPress API
- Use WaveSurfer.js for custom player UI (not Sonaar's player)
- Fetch audio files through CDN URLs from WordPress media library
- Implement audio preloading on hover for instant playback

**Audio File Handling**

- Validate audio MIME types: `audio/mpeg`, `audio/wav`, `audio/mp3`
- Implement progressive loading for large audio files
- Use Web Audio API for waveform visualization
- Clean up audio instances on component unmount to prevent memory leaks

### shadcn/ui Best Practices

**Component Installation**

- Install components individually: `npx shadcn-ui@latest add button`
- Components are copied to `components/ui/` - customize freely
- Never modify Radix UI primitives directly - wrap in shadcn components
- Use `cn()` utility for conditional className merging

**Customization**

- Modify `tailwind.config.js` for global theme changes
- Use CSS variables in `globals.css` for color tokens
- Extend components in feature folders, not in `components/ui/`
- Keep accessibility features intact when customizing

**Composition Pattern**

```typescript
// Good: Compose shadcn components
<Dialog>
  <DialogTrigger asChild>
    <Button>Open</Button>
  </DialogTrigger>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Title</DialogTitle>
    </DialogHeader>
  </DialogContent>
</Dialog>
```

### TweakCN Best Practices

**Component Variants**

- Use `cva()` (class-variance-authority) for component variants
- Define variants in component file, not scattered across codebase
- Use `cn()` for merging variant classes with custom classes
- Keep variant logic co-located with component

**Example Pattern**

```typescript
const buttonVariants = cva("inline-flex items-center justify-center rounded-md", {
  variants: {
    variant: {
      default: "bg-primary text-primary-foreground",
      destructive: "bg-destructive text-destructive-foreground",
    },
    size: {
      default: "h-10 px-4 py-2",
      sm: "h-9 px-3",
      lg: "h-11 px-8",
    },
  },
  defaultVariants: {
    variant: "default",
    size: "default",
  },
});
```

### KokonutUI Best Practices

**Component Library Usage**

- KokonutUI extends shadcn/ui with additional components
- Install via CLI: `npx kokonutui-cli@latest add [component]`
- Components follow same pattern as shadcn (copy to project)
- Maintain consistency with shadcn styling conventions

**Animation Components**

- Use KokonutUI for advanced animations and transitions
- Implement `framer-motion` for complex interactions
- Keep animations performant (use `transform` and `opacity` only)
- Provide `prefers-reduced-motion` alternatives for accessibility

## Code Quality Standards

### TypeScript Strict Mode

- Enable all strict flags in `tsconfig.json`
- No `any` types - use `unknown` with type guards
- Explicit return types on all functions and methods
- Use discriminated unions for complex state management

### Error Handling

```typescript
// Good: Typed error handling
type Result<T, E = Error> = { success: true; data: T } | { success: false; error: E };

async function fetchData(): Promise<Result<Data>> {
  try {
    const data = await api.getData();
    return { success: true, data };
  } catch (error) {
    logger.error("Failed to fetch data", { error });
    return {
      success: false,
      error: error instanceof Error ? error : new Error("Unknown error"),
    };
  }
}
```

### Input Validation

- Use Zod schemas for all external data (API, forms, webhooks)
- Validate at boundaries: API entry points, form submissions, webhooks
- Share schemas between client and server via `shared/validation.ts`
- Provide user-friendly error messages from validation failures

### Performance Optimization

- Lazy load routes: `const Page = lazy(() => import("./Page"))`
- Memoize expensive computations: `useMemo()`, `useCallback()`
- Virtualize long lists: `@tanstack/react-virtual` for 100+ items
- Debounce user input: 300ms minimum for search/filter
- Code split by route and feature for optimal bundle sizes

### Accessibility Requirements

- All interactive elements must be keyboard accessible
- Provide ARIA labels for screen readers
- Maintain focus management in modals and dialogs
- Use semantic HTML elements (`<button>`, `<nav>`, `<main>`)
- Test with keyboard navigation and screen readers
- Ensure color contrast meets WCAG AA standards (4.5:1 minimum)

### Security Checklist

- Validate all user inputs with Zod schemas
- Verify webhook signatures (Stripe, PayPal, WordPress)
- Never expose API keys or secrets in client code
- Use Clerk for authentication - never custom auth
- Implement CSRF protection on state-changing endpoints
- Sanitize user-generated content before rendering
- Use Content Security Policy (CSP) headers
- Scan file uploads with antivirus before storage

## Testing Standards

### Unit Tests

- Test business logic functions in isolation
- Mock external dependencies (APIs, databases)
- Use descriptive test names: `should [action] when [condition]`
- Aim for 80%+ code coverage on critical paths

### Integration Tests

- Test API endpoints with Supertest
- Mock Convex and Clerk in test environment
- Verify webhook signature validation
- Test error handling and edge cases

### Component Tests

- Use React Testing Library (not Enzyme)
- Test user interactions, not implementation details
- Mock API calls with MSW (Mock Service Worker)
- Verify accessibility with `@testing-library/jest-dom`

### E2E Tests (Optional)

- Use Playwright for critical user flows
- Test authentication flow with Clerk
- Test payment flow with Stripe test mode
- Run in CI/CD pipeline before deployment

## Pre-Commit Checklist

Before committing code, run these commands and verify:

```bash
# 1. Type check
npm run type-check
# ✅ No TypeScript errors

# 2. Lint and auto-fix
npm run lint:fix
# ✅ No linting errors

# 3. Run tests
npm test
# ✅ All tests pass

# 4. Pre-check (combines type-check + lint)
npm run pre-check
# ✅ All checks pass
```

**Code Quality Verification:**

5. ✅ No `any` types introduced
6. ✅ Import aliases used correctly (`@/`, `@shared/`, `@convex/`)
7. ✅ Zod schemas for all external data
8. ✅ Error boundaries for error-prone components
9. ✅ Accessibility features intact (ARIA labels, keyboard navigation)
10. ✅ User permissions checked in Convex functions (`ctx.auth.getUserIdentity()`)
11. ✅ No console.log statements in production code
12. ✅ All async operations have proper error handling

## Development Commands (Bash)

### Type Checking & Linting

```bash
npm run type-check       # Validate TypeScript across entire project
npm run lint             # Check for linting errors
npm run lint:fix         # Auto-fix linting issues
npm run pre-check        # Run type-check + lint together
```

### Testing

```bash
npm test                 # Run test suite once
npm run test:watch       # Run tests in watch mode
npm run test:coverage    # Generate coverage report
```

### Development

```bash
npm run dev              # Start full-stack dev server
npm run client           # Start frontend only (Vite)
npm run server           # Start backend only (Express)
```

### Build & Deploy

```bash
npm run build            # Production build
npm run start            # Start production server
npm run clean:all        # Clean all build artifacts and dependencies
```

### Convex Commands

```bash
npx convex dev           # Start Convex dev deployment
npx convex deploy        # Deploy to production
npx convex dashboard     # Open Convex dashboard
npx convex import        # Import data from file
npx convex export        # Export data to file
```

## Kiro IDE Tools

When working with Kiro AI assistant, use these tools:

- **getDiagnostics** - Check for TypeScript, linting, and semantic issues in files
- **strReplace** - Make precise code replacements
- **fsWrite** - Create new files
- **readFile** - Read file contents
- **grepSearch** - Search for patterns in codebase

**Never skip error checking, even for "small" changes. Quality is non-negotiable.**
