import { ConvexHttpClient } from "convex/browser";
import { Id } from "../../convex/_generated/dataModel";
import {
  CONVEX_FUNCTIONS,
  ConvexOperationWrapper,
  type ConvexFunctionCaller,
} from "../../shared/types/ConvexIntegration";
import type { ConvexUser, ConvexUserInput } from "../../shared/types/ConvexUser";

// ============================================================================
// RETRY WRAPPER FOR CRITICAL OPERATIONS
// ============================================================================

/**
 * Configuration options for retry behavior
 */
export interface RetryOptions {
  /** Maximum number of retry attempts (default: 3) */
  maxRetries?: number;
  /** Base delay in milliseconds for exponential backoff (default: 1000) */
  baseDelayMs?: number;
  /** Maximum delay cap in milliseconds (default: 10000) */
  maxDelayMs?: number;
  /** Operation name for logging */
  operationName?: string;
  /** Whether to retry on this specific error (default: checks for retryable errors) */
  shouldRetry?: (error: Error) => boolean;
}

/**
 * Default retry options
 */
const DEFAULT_RETRY_OPTIONS: Required<Omit<RetryOptions, "shouldRetry">> = {
  maxRetries: 3,
  baseDelayMs: 1000,
  maxDelayMs: 10000,
  operationName: "operation",
};

/**
 * Error codes that are safe to retry (transient errors)
 */
const RETRYABLE_ERROR_PATTERNS = [
  "ECONNRESET",
  "ETIMEDOUT",
  "ECONNREFUSED",
  "ENOTFOUND",
  "EAI_AGAIN",
  "EPIPE",
  "EHOSTUNREACH",
  "ENETUNREACH",
  "fetch failed",
  "network error",
  "timeout",
  "socket hang up",
  "503",
  "502",
  "504",
  "429", // Rate limiting
  "service unavailable",
  "bad gateway",
  "gateway timeout",
];

/**
 * Error codes that should NOT be retried (permanent errors)
 */
const NON_RETRYABLE_ERROR_PATTERNS = [
  "400", // Bad request - validation error
  "401", // Unauthorized
  "403", // Forbidden
  "404", // Not found
  "422", // Unprocessable entity
  "invalid argument",
  "validation error",
  "unauthorized",
  "forbidden",
  "not found",
];

/**
 * Checks if error string matches any pattern in the given list
 */
function matchesAnyPattern(errorString: string, patterns: readonly string[]): boolean {
  return patterns.some(pattern => errorString.includes(pattern.toLowerCase()));
}

/**
 * Determines if an error is retryable based on error message/code
 */
function isRetryableError(error: Error): boolean {
  const errorString =
    `${error.message} ${error.name} ${(error as NodeJS.ErrnoException).code || ""}`.toLowerCase();

  // Non-retryable errors take precedence
  if (matchesAnyPattern(errorString, NON_RETRYABLE_ERROR_PATTERNS)) {
    return false;
  }

  // Check if it matches retryable patterns
  return matchesAnyPattern(errorString, RETRYABLE_ERROR_PATTERNS);
}

/**
 * Calculates delay with exponential backoff and jitter
 */
function calculateDelay(attempt: number, baseDelayMs: number, maxDelayMs: number): number {
  // Exponential backoff: baseDelay * 2^attempt
  const exponentialDelay = baseDelayMs * Math.pow(2, attempt);
  // Add jitter (±25%) to prevent thundering herd
  const jitter = exponentialDelay * 0.25 * (Math.random() * 2 - 1);
  const delay = Math.min(exponentialDelay + jitter, maxDelayMs);
  return Math.round(delay);
}

/**
 * Sleep for specified milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Executes an async operation with retry logic and exponential backoff
 *
 * @param operation - The async function to execute
 * @param options - Retry configuration options
 * @returns The result of the operation
 * @throws The last error if all retries fail
 *
 * @example
 * const result = await withRetry(
 *   () => convex.mutation(api.orders.recordPayment, args),
 *   { operationName: "recordPayment", maxRetries: 3 }
 * );
 */
/**
 * Logs retry success message
 */
function logRetrySuccess(operationName: string, attempt: number): void {
  if (attempt > 0) {
    console.log(`✅ ${operationName} succeeded after ${attempt} retry(ies)`);
  }
}

/**
 * Logs retry warning message before retrying
 */
function logRetryWarning(
  operationName: string,
  attempt: number,
  maxRetries: number,
  delay: number,
  errorMessage: string
): void {
  console.warn(
    `⚠️ ${operationName} failed (attempt ${attempt + 1}/${maxRetries + 1}), ` +
      `retrying in ${delay}ms: ${errorMessage}`
  );
}

/**
 * Logs final failure message after all retries exhausted
 */
function logFinalFailure(operationName: string, attempt: number, errorMessage: string): void {
  if (attempt > 0) {
    console.error(`❌ ${operationName} failed after ${attempt + 1} attempt(s): ${errorMessage}`);
  }
}

/**
 * Normalizes an error to an Error instance
 */
function normalizeError(error: unknown): Error {
  return error instanceof Error ? error : new Error(String(error));
}

/**
 * Handles retry logic for a failed attempt
 * @returns true if should continue retrying, false if should stop
 */
async function handleRetryAttempt(
  error: Error,
  attempt: number,
  config: Required<Omit<RetryOptions, "shouldRetry">>,
  shouldRetry: (error: Error) => boolean
): Promise<boolean> {
  const canRetry = attempt < config.maxRetries && shouldRetry(error);

  if (canRetry) {
    const delay = calculateDelay(attempt, config.baseDelayMs, config.maxDelayMs);
    logRetryWarning(config.operationName, attempt, config.maxRetries, delay, error.message);
    await sleep(delay);
    return true;
  }

  logFinalFailure(config.operationName, attempt, error.message);
  return false;
}

export async function withRetry<T>(
  operation: () => Promise<T>,
  options?: RetryOptions
): Promise<T> {
  const config = { ...DEFAULT_RETRY_OPTIONS, ...options };
  const shouldRetry = options?.shouldRetry ?? isRetryableError;

  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    try {
      const result = await operation();
      logRetrySuccess(config.operationName, attempt);
      return result;
    } catch (error) {
      lastError = normalizeError(error);
      const shouldContinue = await handleRetryAttempt(lastError, attempt, config, shouldRetry);
      if (!shouldContinue) {
        break;
      }
    }
  }

  throw lastError || new Error(`${config.operationName} failed after retries`);
}

/**
 * Creates a retry-wrapped version of a Convex mutation
 * Useful for critical operations like payment processing
 *
 * @param mutationFn - The Convex mutation function reference
 * @param operationName - Name for logging purposes
 * @param customOptions - Optional custom retry configuration
 * @returns A function that executes the mutation with retry logic
 */
export function createRetryableMutation<TArgs, TResult>(
  mutationFn: (args: TArgs) => Promise<TResult>,
  operationName: string,
  customOptions?: Partial<RetryOptions>
): (args: TArgs) => Promise<TResult> {
  return (args: TArgs) =>
    withRetry(() => mutationFn(args), {
      operationName,
      ...customOptions,
    });
}

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

// ============================================================================
// EXTENDED CONVEX QUERY AND MUTATION FUNCTIONS
// ============================================================================

/**
 * Get user by email
 */
export async function getUserByEmail(email: string): Promise<ConvexUser | null> {
  try {
    // Uses convex/users.ts:getUserByEmail
    const result = await convexWrapper.query<ConvexUser>("users:getUserByEmail", { email });
    return result.data || null;
  } catch (error) {
    console.error("getUserByEmail failed:", error);
    return null;
  }
}

/**
 * Get user by username
 */
export async function getUserByUsername(username: string): Promise<ConvexUser | null> {
  try {
    // Uses convex/users.ts:getUserByUsername
    const result = await convexWrapper.query<ConvexUser>("users:getUserByUsername", { username });
    return result.data || null;
  } catch (error) {
    console.error("getUserByUsername failed:", error);
    return null;
  }
}

/**
 * Get user by ID
 */
export async function getUserById(userId: Id<"users">): Promise<ConvexUser | null> {
  try {
    // Uses convex/users.ts:getUserById
    const result = await convexWrapper.query<ConvexUser>("users:getUserById", { id: userId });
    return result.data || null;
  } catch (error) {
    console.error("getUserById failed:", error);
    return null;
  }
}

/**
 * Update user avatar
 */
export async function updateUserAvatar(
  clerkId: string,
  avatarUrl: string
): Promise<ConvexUser | null> {
  try {
    // Uses convex/users.ts:updateUserAvatar
    const result = await convexWrapper.mutation<ConvexUser>("users:updateUserAvatar", {
      clerkId,
      avatarUrl,
    });
    return result.data || null;
  } catch (error) {
    console.error("updateUserAvatar failed:", error);
    return null;
  }
}

/**
 * List downloads for a user
 */
export interface ConvexDownload {
  _id: Id<"downloads">;
  userId: Id<"users">;
  beatId: number;
  licenseType: string;
  downloadUrl?: string;
  downloadCount?: number;
  timestamp: number;
}

export async function listDownloads(userId: Id<"users">): Promise<ConvexDownload[]> {
  try {
    // Uses convex/downloads/listDownloads.ts:listDownloadsServer (new file we created)
    const result = await convexWrapper.query<ConvexDownload[]>(
      "downloads/listDownloads:listDownloadsServer",
      { userId }
    );
    return result.data || [];
  } catch (error) {
    console.error("listDownloads failed:", error);
    return [];
  }
}

/**
 * Get subscription for a user
 */
export interface ConvexSubscription {
  plan: string;
  status: string;
  currentPeriodEnd: number | null;
  cancelAtPeriodEnd: boolean;
  userId: Id<"users">;
}

export async function getSubscription(userId: Id<"users">): Promise<ConvexSubscription | null> {
  try {
    // Uses convex/subscriptions/getSubscription.ts:getSubscription
    const result = await convexWrapper.query<ConvexSubscription>(
      "subscriptions/getSubscription:getSubscription",
      { userId }
    );
    return result.data || null;
  } catch (error) {
    console.error("getSubscription failed:", error);
    return null;
  }
}

/**
 * Get subscription status helper
 */
export async function getSubscriptionStatus(userId: Id<"users">): Promise<string> {
  try {
    const subscription = await getSubscription(userId);
    return subscription?.status || "none";
  } catch (error) {
    console.error("getSubscriptionStatus failed:", error);
    return "none";
  }
}

/**
 * File management types and functions
 */
/**
 * File role type alias for consistent usage across file operations
 */
export type FileRole = "upload" | "deliverable" | "invoice";

export interface ConvexFile {
  _id: Id<"files">;
  userId: Id<"users">;
  filename: string;
  originalName: string;
  storagePath: string;
  mimeType: string;
  size: number;
  role: FileRole;
  reservationId?: Id<"reservations">;
  orderId?: Id<"orders">;
  ownerId: Id<"users">;
  createdAt: number;
}

export async function createFileRecord(fileData: {
  filename: string;
  originalName: string;
  storagePath: string;
  mimeType: string;
  size: number;
  role: FileRole;
  reservationId?: Id<"reservations">;
  orderId?: Id<"orders">;
  clerkId: string;
}): Promise<string | null> {
  try {
    const result = await convexWrapper.mutation<string>("files/createFile:createFile", fileData);
    return result.data || null;
  } catch (error) {
    console.error("createFileRecord failed:", error);
    return null;
  }
}

export async function getFileById(
  fileId: Id<"files">,
  clerkId: string
): Promise<ConvexFile | null> {
  try {
    const result = await convexWrapper.query<ConvexFile>("files/getFile:getFile", {
      fileId,
      clerkId,
    });
    return result.data || null;
  } catch (error) {
    console.error("getFileById failed:", error);
    return null;
  }
}

export async function listUserFiles(
  clerkId: string,
  filters?: {
    role?: FileRole;
    reservationId?: Id<"reservations">;
    orderId?: Id<"orders">;
  }
): Promise<ConvexFile[]> {
  try {
    const result = await convexWrapper.query<ConvexFile[]>("files/listFiles:listFiles", {
      clerkId,
      ...filters,
    });
    return result.data || [];
  } catch (error) {
    console.error("listUserFiles failed:", error);
    return [];
  }
}

export async function deleteFileRecord(fileId: Id<"files">, clerkId: string): Promise<boolean> {
  try {
    await convexWrapper.mutation("files/deleteFile:deleteFile", { fileId, clerkId });
    return true;
  } catch (error) {
    console.error("deleteFileRecord failed:", error);
    return false;
  }
}

/**
 * Invoice functions
 */
export async function saveInvoiceUrl(orderId: Id<"orders">, invoiceUrl: string): Promise<boolean> {
  try {
    await convexWrapper.mutation("invoices/updateInvoiceUrl:saveInvoiceUrl", {
      orderId,
      invoiceUrl,
    });
    return true;
  } catch (error) {
    console.error("saveInvoiceUrl failed:", error);
    return false;
  }
}

export async function generateInvoiceNumber(orderId: Id<"orders">): Promise<string | null> {
  try {
    const result = await convexWrapper.mutation<string>(
      "invoices/generateInvoiceNumber:generateInvoiceNumber",
      { orderId }
    );
    return result.data || null;
  } catch (error) {
    console.error("generateInvoiceNumber failed:", error);
    return null;
  }
}

export interface OrderInvoiceData {
  order: Record<string, unknown>;
  items: Array<Record<string, unknown>>;
  user: Record<string, unknown> | null;
  invoice: Record<string, unknown> | null;
}

export async function getOrderInvoiceData(orderId: Id<"orders">): Promise<OrderInvoiceData | null> {
  try {
    const result = await convexWrapper.mutation<OrderInvoiceData>(
      "invoices/updateInvoiceUrl:getOrderInvoiceData",
      { orderId }
    );
    return result.data || null;
  } catch (error) {
    console.error("getOrderInvoiceData failed:", error);
    return null;
  }
}

/**
 * Order functions
 */
export interface ConvexOrder {
  _id: Id<"orders">;
  userId?: Id<"users">;
  email: string;
  status: string;
  total: number;
  items: Array<Record<string, unknown>>;
  createdAt: number;
  updatedAt: number;
}

export async function listUserOrders(userId: Id<"users">): Promise<ConvexOrder[]> {
  try {
    const result = await convexWrapper.query<ConvexOrder[]>(
      "orders/listUserOrders:listUserOrders",
      { userId }
    );
    return result.data || [];
  } catch (error) {
    console.error("listUserOrders failed:", error);
    return [];
  }
}

export interface ConvexOrderItem {
  _id: Id<"orderItems">;
  orderId: Id<"orders">;
  productId: number;
  type: string;
  title: string;
  qty: number;
  unitPrice: number;
  totalPrice: number;
}

export async function listOrderItems(orderId: Id<"orders">): Promise<ConvexOrderItem[]> {
  try {
    const result = await convexWrapper.query<ConvexOrderItem[]>(
      "orders/listOrderItems:listOrderItems",
      { orderId }
    );
    return result.data || [];
  } catch (error) {
    console.error("listOrderItems failed:", error);
    return [];
  }
}

/**
 * Reservation functions
 */
export interface ConvexReservation {
  _id: Id<"reservations">;
  userId?: Id<"users">;
  serviceType: string;
  status: string;
  details: Record<string, unknown>;
  preferredDate: string;
  durationMinutes: number;
  totalPrice: number;
  notes?: string;
  createdAt: number;
  updatedAt: number;
}

export async function getReservationById(
  reservationId: Id<"reservations">,
  skipAuth = true
): Promise<ConvexReservation | null> {
  try {
    const result = await convexWrapper.query<ConvexReservation>(
      "reservations/getReservationById:getReservationById",
      { reservationId, skipAuth }
    );
    return result.data || null;
  } catch (error) {
    console.error("getReservationById failed:", error);
    return null;
  }
}

export async function getUserReservations(_clerkId: string): Promise<ConvexReservation[]> {
  try {
    // Use the authenticated query which gets user from clerkId
    const result = await convexWrapper.query<ConvexReservation[]>(
      "reservations/listReservations:getUserReservations",
      {}
    );
    return result.data || [];
  } catch (error) {
    console.error("getUserReservations failed:", error);
    return [];
  }
}

export async function updateReservationStatus(
  reservationId: Id<"reservations">,
  status: string,
  notes?: string
): Promise<{ success: boolean; oldStatus: string; newStatus: string } | null> {
  try {
    const result = await convexWrapper.mutation<{
      success: boolean;
      oldStatus: string;
      newStatus: string;
    }>("reservations/updateReservationStatus:updateReservationStatus", {
      reservationId,
      status,
      notes,
    });
    return result.data || null;
  } catch (error) {
    console.error("updateReservationStatus failed:", error);
    return null;
  }
}

export async function getReservationsByDateRange(
  startDate: string,
  endDate: string,
  status?: string
): Promise<ConvexReservation[]> {
  try {
    const result = await convexWrapper.query<ConvexReservation[]>(
      "reservations/getByDateRange:getByDateRange",
      { startDate, endDate, status }
    );
    return result.data || [];
  } catch (error) {
    console.error("getReservationsByDateRange failed:", error);
    return [];
  }
}

// ============================================================================
// CRITICAL PAYMENT MUTATIONS WITH RETRY LOGIC
// ============================================================================

/**
 * Arguments for recordPayment mutation
 */
export interface RecordPaymentArgs {
  orderId: Id<"orders">;
  provider: string;
  status: string;
  amount: number;
  currency: string;
  stripeEventId?: string;
  stripePaymentIntentId?: string;
  stripeChargeId?: string;
  paypalTransactionId?: string;
}

/**
 * Arguments for confirmPayment mutation
 */
export interface ConfirmPaymentArgs {
  orderId: Id<"orders">;
  paymentIntentId: string;
  status: string;
}

/**
 * Arguments for markProcessedEvent mutation
 */
export interface MarkProcessedEventArgs {
  provider: string;
  eventId: string;
}

/**
 * Arguments for saveStripeCheckoutSession mutation
 */
export interface SaveStripeCheckoutSessionArgs {
  orderId: Id<"orders">;
  checkoutSessionId: string;
  paymentIntentId: string;
}

/**
 * Arguments for audit log mutation
 */
export interface AuditLogArgs {
  action: string;
  resource: string;
  userId?: string;
  details?: Record<string, unknown>;
}

/**
 * Record payment with automatic retry on transient failures
 * Critical for webhook processing - ensures payment is recorded even with network issues
 */
export async function recordPaymentWithRetry(
  args: RecordPaymentArgs
): Promise<{ success: boolean }> {
  const client = getConvexClient();
  // Dynamic import to avoid circular dependency and type instantiation issues
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore - Convex API deep type instantiation limitation
  const { api } = await import("../../convex/_generated/api");

  return withRetry(
    async () => {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore - Convex API deep type instantiation limitation
      const result = await client.mutation(api.orders.recordPayment, args);
      return result as { success: boolean };
    },
    { operationName: `recordPayment(${args.orderId})`, maxRetries: 3 }
  );
}

/**
 * Confirm payment with automatic retry on transient failures
 * Critical for granting download access after successful payment
 */
export async function confirmPaymentWithRetry(
  args: ConfirmPaymentArgs
): Promise<{ success: boolean }> {
  const client = getConvexClient();
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore - Convex API deep type instantiation limitation
  const { api } = await import("../../convex/_generated/api");

  return withRetry(
    async () => {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore - Convex API deep type instantiation limitation
      const result = await client.mutation(api.orders.confirmPayment.confirmPayment, args);
      return result as { success: boolean };
    },
    { operationName: `confirmPayment(${args.orderId})`, maxRetries: 3 }
  );
}

/**
 * Mark event as processed with automatic retry (idempotency check)
 * Important for preventing duplicate webhook processing
 */
export async function markProcessedEventWithRetry(
  args: MarkProcessedEventArgs
): Promise<{ alreadyProcessed: boolean } | null> {
  const client = getConvexClient();
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore - Convex API deep type instantiation limitation
  const { api } = await import("../../convex/_generated/api");

  return withRetry(
    async () => {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore - Convex API deep type instantiation limitation
      const result = await client.mutation(api.orders.markProcessedEvent, args);
      return result as { alreadyProcessed: boolean } | null;
    },
    { operationName: `markProcessedEvent(${args.eventId})`, maxRetries: 3 }
  );
}

/**
 * Save Stripe checkout session with automatic retry
 * Important for linking payment intent to order
 */
export async function saveStripeCheckoutSessionWithRetry(
  args: SaveStripeCheckoutSessionArgs
): Promise<void> {
  const client = getConvexClient();
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore - Convex API deep type instantiation limitation
  const { api } = await import("../../convex/_generated/api");

  return withRetry(
    async () => {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore - Convex API deep type instantiation limitation
      await client.mutation(api.orders.saveStripeCheckoutSession, args);
    },
    { operationName: `saveStripeCheckoutSession(${args.orderId})`, maxRetries: 3 }
  );
}

/**
 * Log to audit trail with automatic retry
 * Non-critical but important for compliance and debugging
 */
export async function logAuditWithRetry(args: AuditLogArgs): Promise<void> {
  const client = getConvexClient();
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore - Convex API deep type instantiation limitation
  const { api } = await import("../../convex/_generated/api");

  try {
    await withRetry(
      async () => {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore - Convex API deep type instantiation limitation
        await client.mutation(api.audit.log, args);
      },
      { operationName: `auditLog(${args.action})`, maxRetries: 2 }
    );
  } catch (error) {
    // Don't throw - audit logging failure shouldn't break main operations
    console.error("❌ Audit logging failed after retries:", error);
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
