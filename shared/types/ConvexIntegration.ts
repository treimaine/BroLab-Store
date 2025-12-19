/**
 * Convex Integration Type Safety Module
 *
 * This module provides type-safe wrappers and utilities for Convex integration
 * that avoid the "Type instantiation is excessively deep" error while maintaining
 * full type safety for all Convex operations.
 */

// Base types for Convex integration
export type ConvexId<T extends string> = `${T}:${string}`;

// Type-safe function name constants to avoid string typos
export const CONVEX_FUNCTIONS = {
  // User management
  GET_USER_BY_CLERK_ID: "users/clerkSync:getUserByClerkId",
  UPSERT_USER: "users/clerkSync:syncClerkUser",
  UPDATE_USER_AVATAR: "users/clerkSync:updateUserAvatar",

  // Downloads
  LOG_DOWNLOAD: "downloads/record:logDownload",
  GET_USER_DOWNLOADS: "downloads/record:getUserDownloads",

  // Orders
  CREATE_ORDER: "orders/createOrder:createOrder",
  GET_USER_ORDERS: "orders/createOrder:getUserOrders",
  UPDATE_ORDER_STATUS: "orders/createOrder:updateOrderStatus",

  // Reservations
  CREATE_RESERVATION: "reservations/createReservation:createReservation",
  GET_USER_RESERVATIONS: "reservations/createReservation:getUserReservations",
  UPDATE_RESERVATION_STATUS: "reservations/createReservation:updateReservationStatus",

  // Subscriptions
  UPSERT_SUBSCRIPTION: "subscriptions/updateSubscription:upsertSubscription",
  GET_USER_SUBSCRIPTION: "subscriptions/updateSubscription:getUserSubscription",

  // Activity
  LOG_ACTIVITY: "activity/logActivity:logActivity",
  GET_USER_ACTIVITY: "activity/logActivity:getUserActivity",

  // Sync operations
  SYNC_WORDPRESS_PRODUCTS: "sync/wordpress:syncWordPressProducts",
  SYNC_WOOCOMMERCE_ORDERS: "sync/woocommerce:syncWooCommerceOrders",
  GET_SYNCED_PRODUCTS: "sync/wordpress:getSyncedProducts",
  GET_SYNCED_ORDERS: "sync/woocommerce:getSyncedOrders",
} as const;

// Type-safe result wrappers
export interface ConvexResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface ConvexMutationResult<T = unknown> extends ConvexResult<T> {
  id?: ConvexId<string>;
}

export interface ConvexQueryResult<T = unknown> extends ConvexResult<T> {
  page?: T[];
  total?: number;
  hasMore?: boolean;
}

// Input validation helpers
export function validateConvexInput<T>(
  input: T,
  requiredFields: (keyof T)[]
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  for (const field of requiredFields) {
    if (input[field] === undefined || input[field] === null) {
      errors.push(`Required field '${String(field)}' is missing`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

// Type-safe ID conversion utilities
export function createConvexId<T extends string>(table: T, value: string | number): ConvexId<T> {
  const idString = typeof value === "number" ? value.toString() : value;
  return `${table}:${idString}` as ConvexId<T>;
}

export function extractIdValue(convexId: ConvexId<string>): string {
  const parts = convexId.split(":");
  return parts[1] || parts[0];
}

export function extractNumericIdValue(convexId: ConvexId<string>): number {
  const value = extractIdValue(convexId);
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? 0 : parsed;
}

// Error handling utilities
export class ConvexIntegrationError extends Error {
  constructor(
    message: string,
    public functionName: string,
    public originalError?: unknown
  ) {
    super(`Convex ${functionName}: ${message}`);
    this.name = "ConvexIntegrationError";
  }
}

export function handleConvexError(
  error: unknown,
  functionName: string,
  context?: Record<string, unknown>
): ConvexIntegrationError {
  const message = error instanceof Error ? error.message : String(error);
  const convexError = new ConvexIntegrationError(message, functionName, error);

  // Log error with context for debugging
  console.error("Convex Integration Error:", {
    functionName,
    message,
    context,
    originalError: error,
  });

  return convexError;
}

// Type guards for Convex results
export function isConvexResult<T>(obj: unknown): obj is ConvexResult<T> {
  return (
    typeof obj === "object" &&
    obj !== null &&
    "success" in obj &&
    typeof (obj as Record<string, unknown>).success === "boolean"
  );
}

export function isConvexMutationResult<T>(obj: unknown): obj is ConvexMutationResult<T> {
  return isConvexResult<T>(obj) && ("id" in obj || "data" in obj);
}

export function isConvexQueryResult<T>(obj: unknown): obj is ConvexQueryResult<T> {
  return isConvexResult<T>(obj) && ("page" in obj || "data" in obj);
}

// Retry mechanism for Convex operations
export interface RetryOptions {
  maxAttempts: number;
  delayMs: number;
  backoffMultiplier: number;
}

export const DEFAULT_RETRY_OPTIONS: RetryOptions = {
  maxAttempts: 3,
  delayMs: 1000,
  backoffMultiplier: 2,
};

export async function withRetry<T>(
  operation: () => Promise<T>,
  options: Partial<RetryOptions> = {}
): Promise<T> {
  const { maxAttempts, delayMs, backoffMultiplier } = {
    ...DEFAULT_RETRY_OPTIONS,
    ...options,
  };

  let lastError: unknown;
  let currentDelay = delayMs;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;

      if (attempt === maxAttempts) {
        break;
      }

      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, currentDelay));
      currentDelay *= backoffMultiplier;
    }
  }

  throw lastError;
}

// Type-safe function caller interface
export interface ConvexFunctionCaller {
  mutation<T>(functionName: string, args: Record<string, unknown>): Promise<T>;
  query<T>(functionName: string, args: Record<string, unknown>): Promise<T>;
}

// Validation schemas for common Convex operations
export const CONVEX_VALIDATION_SCHEMAS = {
  USER_INPUT: ["clerkId", "email"] as const,
  DOWNLOAD_DATA: ["userId", "beatId", "licenseType"] as const,
  ORDER_DATA: ["items", "total", "email", "status"] as const,
  RESERVATION_DATA: ["serviceType", "preferredDate", "durationMinutes", "totalPrice"] as const,
  SUBSCRIPTION_DATA: ["userId"] as const,
  ACTIVITY_DATA: ["userId", "action"] as const,
} as const;

// Type-safe wrapper for all Convex operations
export class ConvexOperationWrapper {
  constructor(private client: ConvexFunctionCaller) {}

  async mutation<T>(
    functionName: string,
    args: Record<string, unknown>,
    options?: Partial<RetryOptions>
  ): Promise<ConvexMutationResult<T>> {
    try {
      const result = await withRetry(() => this.client.mutation<T>(functionName, args), options);

      return {
        success: true,
        data: result,
      };
    } catch (error) {
      throw handleConvexError(error, functionName, args);
    }
  }

  async query<T>(
    functionName: string,
    args: Record<string, unknown>,
    options?: Partial<RetryOptions>
  ): Promise<ConvexQueryResult<T>> {
    try {
      const result = await withRetry(() => this.client.query<T>(functionName, args), options);

      return {
        success: true,
        data: result,
      };
    } catch (error) {
      throw handleConvexError(error, functionName, args);
    }
  }
}

/**
 * Type Safety Documentation
 *
 * This module addresses the following Convex integration type safety concerns:
 *
 * 1. **Deep Type Instantiation**: Uses string-based function names and generic wrappers
 *    to avoid the "Type instantiation is excessively deep" error.
 *
 * 2. **Runtime Validation**: Provides validation helpers to ensure data integrity
 *    at runtime, complementing TypeScript's compile-time checks.
 *
 * 3. **Error Handling**: Comprehensive error handling with proper error types
 *    and context preservation for debugging.
 *
 * 4. **ID Management**: Type-safe utilities for converting between Convex IDs
 *    and application-specific ID formats.
 *
 * 5. **Retry Logic**: Built-in retry mechanism for handling transient failures
 *    in Convex operations.
 *
 * 6. **Function Name Constants**: Centralized function name constants to prevent
 *    typos and ensure consistency across the application.
 *
 * Usage Example:
 * ```typescript
 * import { ConvexOperationWrapper, CONVEX_FUNCTIONS } from './ConvexIntegration';
 *
 * const wrapper = new ConvexOperationWrapper(convexClient);
 * const result = await wrapper.mutation(
 *   CONVEX_FUNCTIONS.UPSERT_USER,
 *   { clerkId: 'user_123', email: 'user@example.com' }
 * );
 * ```
 */
