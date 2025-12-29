# Design Document: Codebase Duplication Audit & Refactoring

## Overview

Ce document présente l'architecture de refactorisation pour éliminer les duplications de code identifiées dans l'application BroLab Entertainment. L'objectif est de consolider les patterns répétés en abstractions réutilisables tout en maintenant la compatibilité avec le code existant.

**État d'avancement global:** 75% complété

| Module                   | Statut      | Notes                                        |
| ------------------------ | ----------- | -------------------------------------------- |
| Validation consolidation | ✅ Complété | `shared/validation/` est la source unique    |
| Auth helpers Convex      | 🔄 60%      | ~20 fonctions migrées, ~25 restantes         |
| Error handling           | 🔄 40%      | Classes d'erreur créées, adoption partielle  |
| Currency utilities       | ✅ Complété | `shared/utils/currency.ts`                   |
| Env config               | 🔄 70%      | Configs centralisées, accès directs restants |
| localStorage patterns    | ✅ Complété | `StorageManager.ts`                          |
| fetch/API patterns       | ✅ Complété | `ApiService.ts`                              |
| Toast/notification       | ⚠️ 20%      | NotificationService à créer                  |
| Price patterns           | ✅ Complété | Calculs en cents standardisés                |

## Architecture

### Stratégie de Consolidation

```
┌─────────────────────────────────────────────────────────────────┐
│                    COUCHE PARTAGÉE (shared/)                    │
├─────────────────────────────────────────────────────────────────┤
│  validation/     │  utils/          │  constants/               │
│  ✅ schemas      │  ✅ currency     │  🔄 errors                │
│  ✅ validators   │  ✅ formatters   │  ✅ config                │
│  ✅ sanitizers   │  🔄 errorHandler │  ✅ messages              │
└─────────────────────────────────────────────────────────────────┘
                              │
          ┌───────────────────┼───────────────────┐
          ▼                   ▼                   ▼
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│   CONVEX        │  │   SERVER        │  │   CLIENT        │
│   convex/lib/   │  │   server/lib/   │  │   client/src/   │
│   🔄 authHelpers│  │   🔄 errorHandler│  │   ✅ ApiService │
│   ✅ validation │  │   ✅ validation  │  │   ✅ Storage    │
│   (re-export)   │  │   (re-export)    │  │   ⚠️ Notif.    │
└─────────────────┘  └─────────────────┘  └─────────────────┘

Légende: ✅ Complété | 🔄 En cours | ⚠️ À faire
```

### Principe de Factorisation

1. **Single Source of Truth**: Chaque concept n'existe qu'à un seul endroit
2. **Re-export Pattern**: Les couches spécifiques ré-exportent depuis shared/
3. **Backward Compatibility**: Les anciens imports continuent de fonctionner via des re-exports

## Components and Interfaces

### 1. Convex Auth Helpers (`convex/lib/authHelpers.ts`)

```typescript
// Nouveau fichier centralisé pour l'authentification Convex
import { MutationCtx, QueryCtx } from "../_generated/server";
import { Id } from "../_generated/dataModel";

export interface AuthResult {
  identity: UserIdentity;
  userId: Id<"users">;
  clerkId: string;
}

export interface UserIdentity {
  subject: string;
  tokenIdentifier: string;
  email?: string;
  name?: string;
}

/**
 * Require authentication - throws if not authenticated
 * Replaces 50+ instances of ctx.auth.getUserIdentity() + null check
 */
export async function requireAuth(ctx: QueryCtx | MutationCtx): Promise<AuthResult> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new Error("Not authenticated");
  }

  const user = await ctx.db
    .query("users")
    .withIndex("by_clerkId", q => q.eq("clerkId", identity.subject))
    .first();

  if (!user) {
    throw new Error("User not found");
  }

  return {
    identity,
    userId: user._id,
    clerkId: identity.subject,
  };
}

/**
 * Optional authentication - returns null if not authenticated
 */
export async function optionalAuth(ctx: QueryCtx | MutationCtx): Promise<AuthResult | null> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) return null;

  const user = await ctx.db
    .query("users")
    .withIndex("by_clerkId", q => q.eq("clerkId", identity.subject))
    .first();

  if (!user) return null;

  return {
    identity,
    userId: user._id,
    clerkId: identity.subject,
  };
}

/**
 * Get user ID from various sources (args, auth, etc.)
 */
export async function resolveUserId(
  ctx: QueryCtx | MutationCtx,
  providedUserId?: string
): Promise<Id<"users"> | null> {
  if (providedUserId) {
    // Validate provided userId
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", q => q.eq("clerkId", providedUserId))
      .first();
    return user?._id ?? null;
  }

  const auth = await optionalAuth(ctx);
  return auth?.userId ?? null;
}
```

### 2. Unified Validation Module (`shared/validation/index.ts`)

```typescript
// Consolidation de tous les schémas de validation
export * from "./schemas/user";
export * from "./schemas/order";
export * from "./schemas/reservation";
export * from "./schemas/beat";
export * from "./schemas/file";

// Utilitaires de validation centralisés
export { validateEmail, validatePhone, validateUUID } from "./validators";
export { sanitizeInput, sanitizeEmail, sanitizeFilename } from "./sanitizers";

// Middleware factories
export { validateBody, validateQuery, validateParams } from "./middleware";

// Types
export type { ValidationResult, ValidationError } from "./types";
```

### 3. Centralized Error Handler (`shared/utils/errorHandler.ts`)

```typescript
import { ErrorType, ERROR_MESSAGES, ERROR_HTTP_STATUS } from "../constants/errors";

export interface AppError extends Error {
  type: ErrorType;
  statusCode: number;
  userMessage: string;
  details?: Record<string, unknown>;
  isOperational: boolean;
}

/**
 * Create a typed application error
 * Replaces scattered throw new Error() patterns
 */
export function createAppError(
  type: ErrorType,
  message?: string,
  details?: Record<string, unknown>
): AppError {
  const error = new Error(message || ERROR_MESSAGES[type]) as AppError;
  error.type = type;
  error.statusCode = ERROR_HTTP_STATUS[type];
  error.userMessage = ERROR_MESSAGES[type];
  error.details = details;
  error.isOperational = true;
  return error;
}

/**
 * Wrap async handlers with consistent error handling
 * Replaces try-catch boilerplate
 */
export function withErrorHandling<T>(fn: () => Promise<T>, context?: string): Promise<T> {
  return fn().catch((error: unknown) => {
    if (isAppError(error)) {
      throw error;
    }

    const message = error instanceof Error ? error.message : "Unknown error";
    console.error(`Error in ${context || "operation"}:`, error);

    throw createAppError(ErrorType.UNKNOWN_ERROR, message);
  });
}

export function isAppError(error: unknown): error is AppError {
  return error instanceof Error && "type" in error && "isOperational" in error;
}
```

### 4. Unified Currency Formatter (`shared/utils/currency.ts`)

```typescript
export interface CurrencyOptions {
  currency?: "USD" | "EUR" | "GBP";
  locale?: string;
  showSymbol?: boolean;
  minimumFractionDigits?: number;
}

const DEFAULT_OPTIONS: CurrencyOptions = {
  currency: "USD",
  locale: "en-US",
  showSymbol: true,
  minimumFractionDigits: 2,
};

/**
 * Convert cents to dollars
 * Replaces 15+ instances of (amount / 100)
 */
export function centsToDollars(cents: number): number {
  return cents / 100;
}

/**
 * Convert dollars to cents
 */
export function dollarsToCents(dollars: number): number {
  return Math.round(dollars * 100);
}

/**
 * Format currency amount from cents
 * Replaces scattered toFixed(2) patterns
 */
export function formatCurrency(amountInCents: number, options: CurrencyOptions = {}): string {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const dollars = centsToDollars(amountInCents);

  return new Intl.NumberFormat(opts.locale, {
    style: opts.showSymbol ? "currency" : "decimal",
    currency: opts.currency,
    minimumFractionDigits: opts.minimumFractionDigits,
  }).format(dollars);
}

/**
 * Format currency for display in templates
 * Replaces: ${(amount / 100).toFixed(2)} ${currency.toUpperCase()}
 */
export function formatCurrencyDisplay(amountInCents: number, currency: string = "USD"): string {
  const dollars = centsToDollars(amountInCents);
  return `${dollars.toFixed(2)} ${currency.toUpperCase()}`;
}
```

### 5. Client API Service (`client/src/services/ApiService.ts`)

```typescript
import { useAuth } from "@clerk/clerk-react";

export interface ApiOptions extends RequestInit {
  requireAuth?: boolean;
  retries?: number;
  timeout?: number;
}

export interface ApiResponse<T> {
  data: T;
  status: number;
  headers: Headers;
}

/**
 * Centralized API client
 * Replaces 30+ direct fetch() calls
 */
class ApiService {
  private baseUrl: string;
  private defaultOptions: ApiOptions;

  constructor(baseUrl: string = "/api") {
    this.baseUrl = baseUrl;
    this.defaultOptions = {
      requireAuth: false,
      retries: 3,
      timeout: 30000,
    };
  }

  async request<T>(endpoint: string, options: ApiOptions = {}): Promise<ApiResponse<T>> {
    const opts = { ...this.defaultOptions, ...options };
    const url = `${this.baseUrl}${endpoint}`;

    const headers = new Headers(opts.headers);
    headers.set("Content-Type", "application/json");

    // Auth header is added by useAuthenticatedFetch hook

    const response = await this.fetchWithRetry(url, {
      ...opts,
      headers,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw this.createApiError(response.status, error);
    }

    const data = await response.json();
    return { data, status: response.status, headers: response.headers };
  }

  private async fetchWithRetry(url: string, options: ApiOptions, attempt = 0): Promise<Response> {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), options.timeout || 30000);

      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });

      clearTimeout(timeout);
      return response;
    } catch (error) {
      if (attempt < (options.retries || 3) && this.isRetryable(error)) {
        await this.delay(Math.pow(2, attempt) * 1000);
        return this.fetchWithRetry(url, options, attempt + 1);
      }
      throw error;
    }
  }

  private isRetryable(error: unknown): boolean {
    return (
      error instanceof Error && (error.name === "AbortError" || error.message.includes("network"))
    );
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private createApiError(status: number, body: unknown): Error {
    const error = new Error(`API Error: ${status}`) as Error & { status: number; body: unknown };
    error.status = status;
    error.body = body;
    return error;
  }

  // Convenience methods
  get<T>(endpoint: string, options?: ApiOptions): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...options, method: "GET" });
  }

  post<T>(endpoint: string, data: unknown, options?: ApiOptions): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      ...options,
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  put<T>(endpoint: string, data: unknown, options?: ApiOptions): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      ...options,
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  delete<T>(endpoint: string, options?: ApiOptions): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...options, method: "DELETE" });
  }
}

export const apiService = new ApiService();
```

### 6. Client Storage Manager (`client/src/services/StorageManager.ts`)

**Statut:** ✅ Implémenté

```typescript
export interface StorageOptions {
  prefix?: string;
  ttl?: number; // Time to live in milliseconds
  serialize?: (value: unknown) => string;
  deserialize?: (value: string) => unknown;
}

interface StoredItem<T> {
  value: T;
  expiresAt?: number;
}

/**
 * Type-safe localStorage manager
 * Replaces 20+ direct localStorage calls
 */
class StorageManager {
  private prefix: string;
  private defaultTTL?: number;

  constructor(options: StorageOptions = {}) {
    this.prefix = options.prefix || "brolab_";
    this.defaultTTL = options.ttl;
  }

  private getKey(key: string): string {
    return `${this.prefix}${key}`;
  }

  get<T>(key: string, defaultValue?: T): T | undefined {
    try {
      const raw = localStorage.getItem(this.getKey(key));
      if (!raw) return defaultValue;

      const item: StoredItem<T> = JSON.parse(raw);

      // Check expiration
      if (item.expiresAt && Date.now() > item.expiresAt) {
        this.remove(key);
        return defaultValue;
      }

      return item.value;
    } catch (error) {
      console.warn(`Failed to read from storage: ${key}`, error);
      return defaultValue;
    }
  }

  set<T>(key: string, value: T, ttl?: number): void {
    try {
      const item: StoredItem<T> = {
        value,
        expiresAt: ttl || this.defaultTTL ? Date.now() + (ttl || this.defaultTTL!) : undefined,
      };

      localStorage.setItem(this.getKey(key), JSON.stringify(item));
    } catch (error) {
      console.warn(`Failed to write to storage: ${key}`, error);
    }
  }

  remove(key: string): void {
    try {
      localStorage.removeItem(this.getKey(key));
    } catch (error) {
      console.warn(`Failed to remove from storage: ${key}`, error);
    }
  }

  clear(): void {
    try {
      const keys = Object.keys(localStorage);
      keys.filter(key => key.startsWith(this.prefix)).forEach(key => localStorage.removeItem(key));
    } catch (error) {
      console.warn("Failed to clear storage", error);
    }
  }

  // Typed getters for common storage keys
  getCart(): CartItem[] {
    return this.get<CartItem[]>("cart", []) || [];
  }

  setCart(items: CartItem[]): void {
    this.set("cart", items, 7 * 24 * 60 * 60 * 1000); // 7 days
  }

  getLanguage(): string {
    return this.get<string>("language", "en") || "en";
  }

  setLanguage(lang: string): void {
    this.set("language", lang);
  }

  getRecentlyViewed(): string[] {
    return this.get<string[]>("recently_viewed", []) || [];
  }

  setRecentlyViewed(ids: string[]): void {
    this.set("recently_viewed", ids.slice(0, 20)); // Keep last 20
  }
}

export const storage = new StorageManager();
```

### 7. Notification Service (`client/src/services/NotificationService.ts`)

**Statut:** ⚠️ À implémenter (Requirement 8)

**Rationale:** Les ~40+ appels `toast()` dispersés dans le codebase doivent être centralisés pour:

- Uniformiser les messages utilisateur
- Permettre le queuing des notifications
- Faciliter l'internationalisation
- Centraliser la gestion des erreurs utilisateur

```typescript
import { toast } from "@/hooks/use-toast";

export type NotificationType = "success" | "error" | "warning" | "info";

export interface NotificationOptions {
  title?: string;
  description: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface QueuedNotification {
  type: NotificationType;
  options: NotificationOptions;
  timestamp: number;
}

/**
 * Centralized notification service
 * Replaces 40+ scattered toast() calls
 * Requirements: 8.1, 8.2, 8.3, 8.4, 8.5
 */
class NotificationService {
  private queue: QueuedNotification[] = [];
  private isProcessing = false;
  private readonly DEBOUNCE_MS = 300;

  /**
   * Show success notification
   */
  success(message: string, options?: Partial<NotificationOptions>): void {
    this.notify("success", { description: message, ...options });
  }

  /**
   * Show error notification with user-friendly message
   */
  error(message: string, options?: Partial<NotificationOptions>): void {
    this.notify("error", {
      description: this.getUserFriendlyMessage(message),
      ...options,
    });
  }

  /**
   * Show warning notification
   */
  warning(message: string, options?: Partial<NotificationOptions>): void {
    this.notify("warning", { description: message, ...options });
  }

  /**
   * Show info notification
   */
  info(message: string, options?: Partial<NotificationOptions>): void {
    this.notify("info", { description: message, ...options });
  }

  /**
   * Convert technical errors to user-friendly messages
   */
  private getUserFriendlyMessage(message: string): string {
    const errorMappings: Record<string, string> = {
      "Network Error": "Problème de connexion. Veuillez réessayer.",
      Unauthorized: "Session expirée. Veuillez vous reconnecter.",
      "Not Found": "Ressource non trouvée.",
      "Internal Server Error": "Une erreur est survenue. Veuillez réessayer.",
    };

    for (const [key, value] of Object.entries(errorMappings)) {
      if (message.includes(key)) return value;
    }
    return message;
  }

  private notify(type: NotificationType, options: NotificationOptions): void {
    this.queue.push({ type, options, timestamp: Date.now() });
    this.processQueue();
  }

  private async processQueue(): Promise<void> {
    if (this.isProcessing || this.queue.length === 0) return;

    this.isProcessing = true;

    while (this.queue.length > 0) {
      const notification = this.queue.shift();
      if (!notification) continue;

      const variant = notification.type === "error" ? "destructive" : "default";

      toast({
        variant,
        title: notification.options.title,
        description: notification.options.description,
        duration: notification.options.duration || 5000,
      });

      // Debounce between notifications
      if (this.queue.length > 0) {
        await new Promise(resolve => setTimeout(resolve, this.DEBOUNCE_MS));
      }
    }

    this.isProcessing = false;
  }
}

export const notificationService = new NotificationService();
```

### Fichiers à migrer vers NotificationService

| Fichier                                        | Appels toast | Priorité |
| ---------------------------------------------- | ------------ | -------- |
| `client/src/pages/shop.tsx`                    | ~5           | Haute    |
| `client/src/pages/product.tsx`                 | ~4           | Haute    |
| `client/src/pages/checkout-success.tsx`        | ~3           | Haute    |
| `client/src/pages/mixing-mastering.tsx`        | ~4           | Moyenne  |
| `client/src/pages/recording-sessions.tsx`      | ~3           | Moyenne  |
| `client/src/pages/production-consultation.tsx` | ~3           | Moyenne  |
| `client/src/pages/payment-*.tsx`               | ~8           | Haute    |
| `client/src/providers/CacheProvider.tsx`       | ~2           | Basse    |

## Data Models

### Duplication Map - État Actuel

| ID      | Type           | Fichiers Concernés                                                       | Score Similarité | Statut  | Effort |
| ------- | -------------- | ------------------------------------------------------------------------ | ---------------- | ------- | ------ |
| DUP-001 | Structural     | 50+ fichiers convex/\*.ts                                                | 95%              | 🔄 60%  | M      |
| DUP-002 | Structural     | server/lib/_.ts, convex/_.ts                                             | 90%              | 🔄 40%  | M      |
| DUP-003 | Exact          | shared/validation.ts, convex/lib/validation.ts, server/lib/validation.ts | 85%              | ✅ 100% | S      |
| DUP-004 | Functional     | client/src/\*_/_.ts (fetch calls)                                        | 80%              | ✅ 100% | L      |
| DUP-005 | Functional     | client/src/\*_/_.ts (localStorage)                                       | 85%              | ✅ 100% | M      |
| DUP-006 | Near-duplicate | server/templates/_.ts, server/services/_.ts                              | 90%              | 🔄 40%  | S      |
| DUP-007 | Exact          | shared/constants/errors.ts, shared/constants/ErrorMessages.ts            | 70%              | ✅ 100% | S      |
| DUP-008 | Functional     | client/src/\*_/_.ts (toast calls)                                        | 75%              | ⚠️ 20%  | S      |
| DUP-009 | Structural     | server/lib/env.ts, client/src/config/\*.ts                               | 60%              | 🔄 70%  | M      |
| DUP-010 | Exact          | validateEmail (3 implémentations)                                        | 100%             | ✅ 100% | S      |

### Fichiers Migrés vers requireAuth

Les fonctions Convex suivantes utilisent maintenant `requireAuth`:

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

### Fichiers à Migrer (instances directes restantes)

- `convex/dashboard.ts` (~3 instances de `ctx.auth.getUserIdentity()`)
- `convex/orders.ts` (~8 instances)
- `convex/downloads.ts` (~3 instances)
- `convex/auth/roles.ts` (~4 instances)

### Instances console.error à Centraliser

- `server/wordpress.ts`: ~15 instances
- `server/services/ReservationPaymentService.ts`: ~8 instances
- `server/services/mail.ts`: ~3 instances
- `shared/validation/index.ts`: ~3 instances
- `shared/utils/`: ~5 instances

## Correctness Properties

_A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees._

### Property 1: Validation Consolidation Consistency

_For any_ validation schema imported from `shared/validation/`, `convex/lib/validation`, or `server/lib/validation`, calling the same validation function with the same input SHALL produce identical results.

**Validates: Requirements 1.1, 1.2, 1.3, 1.5**

### Property 2: Email Validation Round-Trip

_For any_ valid email string, `validateEmail(email)` SHALL return `true`, and _for any_ invalid email string (missing @, invalid domain, etc.), `validateEmail(email)` SHALL return `false`, regardless of which module the function is imported from.

**Validates: Requirements 1.5, 9.5**

### Property 3: Auth Helper Correctness

_For any_ Convex context with valid authentication, `requireAuth(ctx)` SHALL return an `AuthResult` with valid `userId`, `clerkId`, and `identity`. _For any_ context without authentication, `requireAuth(ctx)` SHALL throw an error with message "Not authenticated".

**Validates: Requirements 2.1, 2.2, 2.3**

### Property 4: Optional Auth Null Safety

_For any_ Convex context, `optionalAuth(ctx)` SHALL return `AuthResult | null` without throwing. If authenticated, it returns valid auth data; if not authenticated, it returns `null`.

**Validates: Requirements 2.4**

### Property 5: Error Handler Type Preservation

_For any_ error created via `createAppError(type, message, details)`, the resulting error SHALL have `type`, `statusCode`, `userMessage`, and `isOperational` properties correctly set according to the error type mapping.

**Validates: Requirements 3.1, 3.2, 3.4**

### Property 6: Currency Formatting Round-Trip

_For any_ integer amount in cents, `dollarsToCents(centsToDollars(amount))` SHALL equal the original amount. This ensures no precision loss in currency conversions.

**Validates: Requirements 4.1, 4.3, 10.1, 10.5**

### Property 7: Currency Display Consistency

_For any_ amount in cents and locale, `formatCurrency(amount, { locale })` SHALL produce a string containing the correct dollar value with proper formatting for that locale.

**Validates: Requirements 4.1, 4.2, 4.4, 10.3**

### Property 8: Storage Manager Round-Trip

_For any_ serializable value `v` and key `k`, after calling `storage.set(k, v)`, calling `storage.get(k)` SHALL return a value equal to `v`.

**Validates: Requirements 6.1, 6.5**

### Property 9: Storage Manager Error Resilience

_For any_ corrupted or invalid JSON in localStorage, `storage.get(key, defaultValue)` SHALL return `defaultValue` without throwing an exception.

**Validates: Requirements 6.3, 6.4**

### Property 10: API Client Retry Behavior

_For any_ retryable error (network failure, timeout), the API client SHALL retry up to the configured number of times with exponential backoff before throwing.

**Validates: Requirements 7.3**

### Property 11: Price Calculation Integer Arithmetic

_For any_ sequence of price operations (addition, subtraction, multiplication by integer), all intermediate and final results SHALL be integers (cents), avoiding floating-point precision errors.

**Validates: Requirements 10.1, 10.5**

### Property 12: Notification Queue Processing

_For any_ sequence of notifications triggered in rapid succession, the NotificationService SHALL process them in order with appropriate debouncing, ensuring no notifications are lost.

**Validates: Requirements 8.1, 8.4**

### Property 13: Error Message User-Friendliness

_For any_ technical error message passed to `notificationService.error()`, the displayed message SHALL be a user-friendly translation that does not expose technical details.

**Validates: Requirements 8.3**

## Error Handling

### Error Categories

| Category       | Error Type         | HTTP Status | User Message                                  |
| -------------- | ------------------ | ----------- | --------------------------------------------- |
| Authentication | `AUTH_REQUIRED`    | 401         | "Veuillez vous connecter pour continuer"      |
| Authentication | `AUTH_INVALID`     | 401         | "Session expirée, veuillez vous reconnecter"  |
| Authorization  | `FORBIDDEN`        | 403         | "Vous n'avez pas accès à cette ressource"     |
| Validation     | `VALIDATION_ERROR` | 400         | "Données invalides: {details}"                |
| Not Found      | `NOT_FOUND`        | 404         | "Ressource non trouvée"                       |
| Business       | `BUSINESS_ERROR`   | 422         | "{specific message}"                          |
| Server         | `INTERNAL_ERROR`   | 500         | "Une erreur est survenue, veuillez réessayer" |

### Error Flow

```
┌─────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  Operation  │────▶│  Error Handler   │────▶│  Logger Service │
│   throws    │     │  (categorize)    │     │  (structured)   │
└─────────────┘     └──────────────────┘     └─────────────────┘
                            │
                            ▼
                    ┌──────────────────┐
                    │  User Message    │
                    │  (i18n mapped)   │
                    └──────────────────┘
```

### Error Handling Patterns

```typescript
// Pattern 1: Convex function with auth
export const myMutation = mutation({
  args: { ... },
  handler: async (ctx, args) => {
    const auth = await requireAuth(ctx); // Throws if not authenticated

    return withErrorHandling(async () => {
      // Business logic here
    }, "myMutation");
  },
});

// Pattern 2: Express route with validation
router.post("/api/resource",
  validateBody(resourceSchema),
  asyncHandler(async (req, res) => {
    // Handler logic - errors automatically caught
  })
);

// Pattern 3: Client-side API call
try {
  const result = await apiService.post("/resource", data);
} catch (error) {
  notificationService.error(getErrorMessage(error));
}
```

## Testing Strategy

### Dual Testing Approach

Cette stratégie combine tests unitaires et tests basés sur les propriétés pour une couverture complète:

- **Tests unitaires**: Vérifient des exemples spécifiques, cas limites et conditions d'erreur
- **Tests de propriétés**: Vérifient les propriétés universelles sur de nombreuses entrées générées

### Property-Based Testing Configuration

- **Framework**: `fast-check` pour TypeScript
- **Minimum iterations**: 100 par test de propriété
- **Tag format**: `Feature: codebase-duplication-audit, Property {number}: {property_text}`

### Test Structure

```typescript
// Property test example
describe("Currency Formatting", () => {
  // Feature: codebase-duplication-audit, Property 6: Currency Formatting Round-Trip
  it("should preserve value through cents/dollars conversion", () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 1000000000 }), cents => {
        const result = dollarsToCents(centsToDollars(cents));
        return result === cents;
      }),
      { numRuns: 100 }
    );
  });

  // Feature: codebase-duplication-audit, Property 7: Currency Display Consistency
  it("should format currency correctly for any amount", () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 1000000000 }), cents => {
        const formatted = formatCurrency(cents);
        const dollars = centsToDollars(cents);
        return formatted.includes(dollars.toFixed(2).replace(/\.?0+$/, ""));
      }),
      { numRuns: 100 }
    );
  });
});
```

### Unit Test Coverage - État Actuel

| Module                                       | Test File                                      | Coverage Target | Statut      |
| -------------------------------------------- | ---------------------------------------------- | --------------- | ----------- |
| `shared/validation/`                         | `__tests__/shared/validation.test.ts`          | 90%             | ✅ Existant |
| `convex/lib/authHelpers.ts`                  | `__tests__/convex/authHelpers.test.ts`         | 95%             | ⚠️ À créer  |
| `shared/utils/errorHandler.ts`               | `__tests__/shared/errorHandler.test.ts`        | 90%             | ⚠️ À créer  |
| `shared/utils/currency.ts`                   | `__tests__/shared/currency.test.ts`            | 95%             | ⚠️ À créer  |
| `client/src/services/ApiService.ts`          | `__tests__/client/ApiService.test.ts`          | 85%             | ⚠️ À créer  |
| `client/src/services/StorageManager.ts`      | `__tests__/client/StorageManager.test.ts`      | 90%             | ⚠️ À créer  |
| `client/src/services/NotificationService.ts` | `__tests__/client/NotificationService.test.ts` | 85%             | ⚠️ À créer  |

### Test Categories

1. **Consolidation Tests**: Verify that imports from different paths resolve to the same implementation
2. **Round-Trip Tests**: Verify data integrity through serialization/deserialization cycles
3. **Error Handling Tests**: Verify consistent error behavior across all modules
4. **Integration Tests**: Verify modules work together correctly

### Mocking Strategy

- Mock `localStorage` for StorageManager tests
- Mock `fetch` for ApiService tests
- Mock Convex `ctx` for auth helper tests
- Mock `toast` for NotificationService tests
- Use `fast-check` arbitraries for generating test data

## Prochaines Étapes de Design

### Priorité Haute (Requirement 8 - Toast/Notification)

1. **Créer NotificationService** - Implémenter le service centralisé de notifications
2. **Migrer les appels toast** - Remplacer les ~40 appels `toast()` dispersés
3. **Ajouter le mapping d'erreurs** - Traduire les erreurs techniques en messages utilisateur

### Priorité Moyenne (Requirements 2, 3)

4. **Compléter migration auth** - Migrer les ~25 instances `ctx.auth.getUserIdentity()` restantes
5. **Centraliser error handling** - Remplacer les ~35 `console.error` par le logger centralisé

### Priorité Basse (Requirement 5)

6. **Finaliser config env** - Éliminer les accès `process.env` directs restants

## Décisions de Design

### Rationale: Re-export Pattern

**Décision:** Utiliser des re-exports depuis `shared/` vers `convex/lib/` et `server/lib/` plutôt que de supprimer les anciens fichiers.

**Justification:**

- Maintient la compatibilité avec les imports existants
- Permet une migration progressive sans casser le code
- Facilite le rollback en cas de problème
- Évite les conflits de merge dans les branches parallèles

### Rationale: NotificationService avec Queue

**Décision:** Implémenter un système de queue avec debouncing pour les notifications.

**Justification:**

- Évite le spam de notifications lors d'erreurs multiples
- Garantit que toutes les notifications sont affichées
- Permet un contrôle fin sur le timing d'affichage
- Facilite les tests unitaires

### Rationale: Exclusion des Intégrations Critiques

**Décision:** Ne jamais modifier les fichiers d'intégration (Clerk, Stripe, PayPal, WordPress).

**Justification:**

- Ces intégrations sont testées et fonctionnelles
- Le risque de régression est trop élevé
- Les patterns d'auth dans ces fichiers sont spécifiques à chaque intégration
- La refactorisation n'apporte pas de valeur significative pour ces cas
