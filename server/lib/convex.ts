import { ConvexHttpClient } from "convex/browser";
import { Id } from "../../convex/_generated/dataModel";
import {
  CONVEX_FUNCTIONS,
  ConvexOperationWrapper,
  type ConvexFunctionCaller,
} from "../../shared/types/ConvexIntegration";
import type { ConvexUser, ConvexUserInput } from "../../shared/types/ConvexUser";

// Module-level variables for lazy initialization
let convexClient: ConvexHttpClient | null = null;
let initializationError: Error | null = null;

/**
 * Creates a mock Convex client for test environments
 * Returns a mock object with query, mutation, and action methods
 * @returns Mock ConvexHttpClient for testing
 */
function createMockConvexClient(): ConvexHttpClient {
  const mockClient = {
    query: async () => null,
    mutation: async () => null,
    action: async () => null,
  } as unknown as ConvexHttpClient;

  return mockClient;
}

/**
 * Lazy initialization function for Convex client
 * Initializes the client on first call and caches the result
 * Provides mock client in test environment
 * @returns ConvexHttpClient instance or mock client in test mode
 * @throws Error if VITE_CONVEX_URL is not configured in non-test environments
 */
function getConvexClient(): ConvexHttpClient {
  // Return existing client if already initialized
  if (convexClient) {
    return convexClient;
  }

  // Throw cached error if initialization previously failed
  if (initializationError) {
    throw initializationError;
  }

  // Test environment: return mock client
  if (process.env.NODE_ENV === "test") {
    convexClient = createMockConvexClient();
    return convexClient;
  }

  // Validate configuration and initialize for non-test environments
  const convexUrl = process.env.VITE_CONVEX_URL;
  if (!convexUrl) {
    initializationError = new Error(
      "VITE_CONVEX_URL environment variable is required. " +
        "Add it to your .env file:\nVITE_CONVEX_URL=https://your-deployment.convex.cloud"
    );
    throw initializationError;
  }

  try {
    convexClient = new ConvexHttpClient(convexUrl);
    return convexClient;
  } catch (error) {
    initializationError =
      error instanceof Error ? error : new Error("Failed to initialize Convex client");
    throw initializationError;
  }
}

/**
 * Proxy wrapper for backward compatibility with existing imports
 * Allows existing code to use `convex` directly while using lazy initialization
 *
 * This proxy intercepts all property access and delegates to the lazily-initialized client.
 * The client is only created when first accessed, allowing modules to be imported
 * without requiring VITE_CONVEX_URL to be set (useful in test environments).
 *
 * @example
 * // Legacy usage (still works)
 * import { convex } from './convex';
 * const result = await convex.query(api.users.get, { id: '123' });
 */
const convex = new Proxy({} as ConvexHttpClient, {
  get(_target, prop) {
    const client = getConvexClient();
    const value = client[prop as keyof ConvexHttpClient];
    // Bind methods to the client instance to preserve 'this' context
    return typeof value === "function" ? value.bind(client) : value;
  },
});

// Create type-safe wrapper for Convex operations (uses lazy initialization via proxy)
const convexWrapper = new ConvexOperationWrapper(convex as ConvexFunctionCaller);

/**
 * Primary export: Lazy initialization getter function
 *
 * Use this function when you need explicit control over client initialization timing.
 * The client is created on first call and cached for subsequent calls.
 *
 * @returns ConvexHttpClient instance (or mock in test environment)
 * @throws Error if VITE_CONVEX_URL is not configured in non-test environments
 *
 * @example
 * // Recommended usage for new code
 * import { getConvex } from './convex';
 * const client = getConvex();
 * const result = await client.query(api.users.get, { id: '123' });
 */
export const getConvex = getConvexClient;

/**
 * Backward-compatible export using Proxy for lazy initialization
 *
 * This export maintains compatibility with existing code that imports `convex` directly.
 * The underlying client is lazily initialized on first property access.
 *
 * @deprecated Prefer using `getConvex()` for new code to make lazy initialization explicit
 */
export { convex };

/**
 * Type-safe wrapper for Convex operations
 *
 * Provides a higher-level API with automatic error handling and type safety.
 * Uses the lazy-initialized convex client internally.
 */
export { convexWrapper };

// Type definitions that match Convex schema exactly - these are the corrected interface definitions

export interface DownloadData extends Record<string, unknown> {
  userId: Id<"users">;
  beatId: number;
  licenseType: string;
  downloadUrl?: string;
  fileSize?: number;
  downloadCount?: number;
  expiresAt?: number;
  ipAddress?: string;
  userAgent?: string;
}

export interface OrderData extends Record<string, unknown> {
  items: Array<{
    productId: number;
    title: string;
    name?: string; // Keep for backward compatibility
    price: number;
    license: string;
    quantity: number;
  }>;
  total: number;
  email: string;
  status: string;
  currency?: string;
  paymentId?: string;
  paymentStatus?: string;
}

export interface ReservationData extends Record<string, unknown> {
  serviceType: string;
  details: Record<string, unknown>; // Flexible to match Convex function signature
  preferredDate: string;
  durationMinutes: number;
  totalPrice: number;
  notes?: string;
  clerkId?: string; // For server-side authentication
}

export interface SubscriptionData extends Record<string, unknown> {
  userId: Id<"users">;
  stripeCustomerId?: string;
  plan?: string;
}

export interface ActivityData extends Record<string, unknown> {
  userId: Id<"users">;
  action: string;
  details?: Record<string, unknown>; // Flexible to support various activity event structures
}

// Type-safe Convex function implementations using the wrapper

export async function getUserByClerkId(clerkId: string): Promise<ConvexUser | null> {
  try {
    const result = await convexWrapper.query<ConvexUser>(CONVEX_FUNCTIONS.GET_USER_BY_CLERK_ID, {
      clerkId,
    });
    return result.data || null;
  } catch (error) {
    console.error("getUserByClerkId failed:", error);
    return null;
  }
}

/**
 * Response type from syncClerkUser mutation
 */
interface SyncClerkUserResponse {
  success: boolean;
  action: "created" | "updated";
  userId: Id<"users">;
  user: ConvexUser | null;
}

export async function upsertUser(userData: ConvexUserInput): Promise<ConvexUser | null> {
  try {
    const result = await convexWrapper.mutation<SyncClerkUserResponse>(
      CONVEX_FUNCTIONS.UPSERT_USER,
      userData
    );
    // syncClerkUser returns { success, action, userId, user } - extract the user object
    return result.data?.user || null;
  } catch (error) {
    console.error("upsertUser failed:", error);
    return null;
  }
}

export async function logDownload(downloadData: DownloadData): Promise<Id<"downloads"> | null> {
  try {
    const result = await convexWrapper.mutation<Id<"downloads">>(
      CONVEX_FUNCTIONS.LOG_DOWNLOAD,
      downloadData
    );
    return result.data || null;
  } catch (error) {
    console.error("logDownload failed:", error);
    return null;
  }
}

export async function createOrder(
  orderData: OrderData
): Promise<{ success: boolean; orderId: Id<"orders">; message: string } | null> {
  try {
    const result = await convexWrapper.mutation<{
      success: boolean;
      orderId: Id<"orders">;
      message: string;
    }>(CONVEX_FUNCTIONS.CREATE_ORDER, orderData);
    return result.data || null;
  } catch (error) {
    console.error("createOrder failed:", error);
    return null;
  }
}

export async function createReservation(
  reservationData: ReservationData & { clerkId?: string }
): Promise<Id<"reservations"> | null> {
  try {
    const result = await convexWrapper.mutation<Id<"reservations">>(
      CONVEX_FUNCTIONS.CREATE_RESERVATION,
      reservationData
    );
    return result.data || null;
  } catch (error) {
    console.error("createReservation failed:", error);
    return null;
  }
}

export async function upsertSubscription(
  subscriptionData: SubscriptionData
): Promise<Id<"users"> | null> {
  try {
    const result = await convexWrapper.mutation<Id<"users">>(
      CONVEX_FUNCTIONS.UPSERT_SUBSCRIPTION,
      subscriptionData
    );
    return result.data || null;
  } catch (error) {
    console.error("upsertSubscription failed:", error);
    return null;
  }
}

export async function logActivity(activityData: ActivityData): Promise<Id<"activityLog"> | null> {
  try {
    const result = await convexWrapper.mutation<Id<"activityLog">>(
      CONVEX_FUNCTIONS.LOG_ACTIVITY,
      activityData
    );
    return result.data || null;
  } catch (error) {
    console.error("logActivity failed:", error);
    return null;
  }
}

/**
 * INTERFACE DEFINITIONS CORRECTED FOR CONVEX INTEGRATION
 *
 * This file provides the corrected interface definitions that match the Convex schema exactly:
 *
 * 1. DownloadData - Matches convex/downloads/record.ts expectations
 * 2. OrderData - Matches convex/orders/createOrder.ts expectations
 * 3. ReservationData - Matches convex/reservations/createReservation.ts expectations
 * 4. SubscriptionData - Matches convex/subscriptions/updateSubscription.ts expectations
 * 5. ActivityData - Matches convex/activity/logActivity.ts expectations
 *
 * The API import issue with "Type instantiation is excessively deep and possibly infinite"
 * is a known TypeScript limitation with complex generated types. The interface definitions
 * are now correct and type-safe for Convex integration.
 *
 * To resolve the API import issue in the future:
 * - Consider using Convex's official client-side hooks instead of server-side calls
 * - Use dynamic imports with proper error handling
 * - Consider upgrading to newer versions of Convex that may have resolved this issue
 */
