import { toast } from "@/hooks/use-toast";
import { clientLogger } from "@/lib/clientLogger";
import { MutationCache, QueryCache, QueryClient, QueryFunction } from "@tanstack/react-query";

// Extend Window interface for Google Analytics
declare global {
  interface Window {
    gtag?: (
      command: string,
      action: string,
      parameters?: {
        event_category?: string;
        event_label?: string;
        value?: number;
      }
    ) => void;
  }
}

/**
 * Generate a unique request ID for error tracking and support
 * Uses crypto.getRandomValues() for collision-resistant randomness
 * Format: REQ-{16 hex characters}
 */
function generateRequestId(): string {
  const array = new Uint8Array(8);
  crypto.getRandomValues(array);
  const random = Array.from(array)
    .map(b => b.toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase();
  return `REQ-${random}`;
}

/**
 * Get user-friendly error message based on error type
 */
function getUserFriendlyErrorMessage(error: unknown): {
  title: string;
  description: string;
  isRetryable: boolean;
} {
  const errorWithStatus = error as { status?: number; message?: string };
  const status = errorWithStatus?.status;
  const message = errorWithStatus?.message || (error instanceof Error ? error.message : "");

  // Network errors
  if (message.includes("Failed to fetch") || message.includes("NetworkError")) {
    return {
      title: "Connection Error",
      description: "Unable to connect to the server. Please check your internet connection.",
      isRetryable: true,
    };
  }

  // Timeout errors
  if (message.includes("timeout") || message.includes("AbortError")) {
    return {
      title: "Request Timeout",
      description: "The request took too long. Please try again.",
      isRetryable: true,
    };
  }

  // HTTP status-based messages
  if (status) {
    switch (status) {
      case 401:
        return {
          title: "Authentication Required",
          description: "Please sign in to continue.",
          isRetryable: false,
        };
      case 403:
        return {
          title: "Access Denied",
          description: "You don't have permission to perform this action.",
          isRetryable: false,
        };
      case 404:
        return {
          title: "Not Found",
          description: "The requested resource could not be found.",
          isRetryable: false,
        };
      case 429:
        return {
          title: "Too Many Requests",
          description: "Please wait a moment before trying again.",
          isRetryable: true,
        };
      case 500:
      case 502:
      case 503:
      case 504:
        return {
          title: "Server Error",
          description: "Our servers are experiencing issues. Please try again later.",
          isRetryable: true,
        };
    }

    // Generic client errors (4xx)
    if (status >= 400 && status < 500) {
      return {
        title: "Request Error",
        description: "There was a problem with your request. Please try again.",
        isRetryable: false,
      };
    }
  }

  // Default error message
  return {
    title: "Something Went Wrong",
    description: "An unexpected error occurred. Please try again.",
    isRetryable: true,
  };
}

/**
 * Show error toast with request ID for support
 * Uses structured logging with PII sanitization instead of raw console.error
 */
function showErrorToast(error: unknown, context: string, requestId: string): void {
  const { title, description } = getUserFriendlyErrorMessage(error);

  toast({
    variant: "destructive",
    title,
    description: `${description}\n\nRef: ${requestId}`,
  });

  // Log error through secure logger with sanitization
  const errorObj = error instanceof Error ? error : new Error(String(error));
  const errorContext: Record<string, unknown> = {
    context,
  };

  // Extract safe metadata from error if available
  const errorWithMeta = error as { status?: number; statusText?: string };
  if (errorWithMeta?.status) {
    errorContext.status = errorWithMeta.status;
  }
  if (errorWithMeta?.statusText) {
    errorContext.statusText = errorWithMeta.statusText;
  }

  clientLogger.error("Request failed", errorObj, errorContext, requestId);
}

/**
 * Structured error body from API responses
 * Allows extraction of actionable details for retries and user-facing toasts
 */
interface StructuredErrorBody {
  error?: string;
  message?: string;
  code?: string;
  details?: Record<string, unknown>;
  field?: string;
}

/**
 * Throws an ApiError if the response is not OK
 * Parses JSON error bodies when possible to surface actionable details
 */
async function throwIfResNotOk(res: Response): Promise<void> {
  if (!res.ok) {
    const text = await res.text();
    let errorData: StructuredErrorBody | undefined;
    let errorMessage = text || res.statusText;

    // Attempt to parse JSON for structured error details
    if (text) {
      try {
        const parsed = JSON.parse(text) as StructuredErrorBody;
        errorData = parsed;
        // Use structured message if available
        errorMessage = parsed.error || parsed.message || text;
      } catch {
        // Keep raw text if not valid JSON
      }
    }

    throw new ApiError(res.status, errorMessage, res, errorData);
  }
}

/**
 * Credential mode for fetch requests
 * - "same-origin": Only send credentials for same-origin requests (default, more secure)
 * - "include": Send credentials for all requests including cross-origin (opt-in)
 * - "omit": Never send credentials
 */
export type CredentialsMode = "same-origin" | "include" | "omit";

export interface BaseRequestOptions {
  credentials?: CredentialsMode;
  signal?: AbortSignal;
  timeout?: number;
}

const DEFAULT_API_TIMEOUT = 30000; // 30 seconds

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown,
  options: BaseRequestOptions = {}
): Promise<Response> {
  const {
    credentials = "same-origin",
    signal: externalSignal,
    timeout = DEFAULT_API_TIMEOUT,
  } = options;
  const requestId = generateRequestId();

  // Check if already aborted before starting
  if (externalSignal?.aborted) {
    throw new AbortError("Request was aborted");
  }

  // Create internal controller for timeout and combined abort handling
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  // Track if abort was from timeout
  let abortedByTimeout = false;

  const handleTimeout = (): void => {
    abortedByTimeout = true;
    controller.abort();
  };

  const handleExternalAbort = (): void => {
    controller.abort();
  };

  // Listen to external signal if provided
  if (externalSignal) {
    externalSignal.addEventListener("abort", handleExternalAbort, { once: true });
  }

  // Replace setTimeout with proper tracking
  clearTimeout(timeoutId);
  const trackedTimeoutId = setTimeout(handleTimeout, timeout);

  const headers: Record<string, string> = {
    "X-Request-ID": requestId,
  };
  if (data) {
    headers["Content-Type"] = "application/json";
  }

  try {
    const res = await fetch(url, {
      method,
      headers,
      body: data ? JSON.stringify(data) : undefined,
      credentials,
      signal: controller.signal,
    });

    await throwIfResNotOk(res);
    return res;
  } catch (error) {
    // Transform DOMException AbortError into typed AbortError
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new AbortError(abortedByTimeout ? "Request timed out" : "Request was aborted");
    }
    throw error;
  } finally {
    clearTimeout(trackedTimeoutId);
    if (externalSignal) {
      externalSignal.removeEventListener("abort", handleExternalAbort);
    }
  }
}

// Enhanced API request with retry mechanism and better error handling
export interface ApiRequestOptions extends BaseRequestOptions {
  retries?: number;
  retryDelay?: number;
  timeout?: number;
  onRetry?: (attempt: number, error: Error) => void;
  headers?: Record<string, string>;
}

export class ApiError extends Error {
  constructor(
    public status: number,
    public statusText: string,
    public response?: Response,
    public data?: unknown
  ) {
    super(`${status}: ${statusText}`);
    this.name = "ApiError";
  }
}

export class AbortError extends Error {
  constructor(message = "Request was aborted") {
    super(message);
    this.name = "AbortError";
  }
}

export class CircuitBreakerError extends Error {
  constructor(
    public endpoint: string,
    public resetTime: number
  ) {
    super(`Circuit breaker open for ${endpoint}. Retry after ${Math.ceil(resetTime / 1000)}s`);
    this.name = "CircuitBreakerError";
  }
}

// Circuit Breaker implementation
interface CircuitBreakerState {
  failures: number;
  lastFailure: number;
  state: "closed" | "open" | "half-open";
}

const circuitBreakers = new Map<string, CircuitBreakerState>();

const CIRCUIT_BREAKER_CONFIG = {
  failureThreshold: 5, // Open circuit after 5 failures
  resetTimeout: 30000, // Try again after 30 seconds
  halfOpenRequests: 1, // Allow 1 request in half-open state
} as const;

function getCircuitBreakerKey(url: string): string {
  // Group by base endpoint (e.g., /api/beats, /api/users)
  const urlPath = new URL(url, globalThis.location?.origin || "http://localhost").pathname;
  const segments = urlPath.split("/").filter(Boolean);
  return segments.slice(0, 2).join("/") || urlPath;
}

function getCircuitBreaker(key: string): CircuitBreakerState {
  if (!circuitBreakers.has(key)) {
    circuitBreakers.set(key, { failures: 0, lastFailure: 0, state: "closed" });
  }
  return circuitBreakers.get(key)!;
}

function checkCircuitBreaker(url: string): void {
  const key = getCircuitBreakerKey(url);
  const breaker = getCircuitBreaker(key);
  const now = Date.now();

  if (breaker.state === "open") {
    const timeSinceLastFailure = now - breaker.lastFailure;
    if (timeSinceLastFailure >= CIRCUIT_BREAKER_CONFIG.resetTimeout) {
      breaker.state = "half-open";
    } else {
      const resetTime = CIRCUIT_BREAKER_CONFIG.resetTimeout - timeSinceLastFailure;
      throw new CircuitBreakerError(key, resetTime);
    }
  }
}

function recordSuccess(url: string): void {
  const key = getCircuitBreakerKey(url);
  const breaker = getCircuitBreaker(key);
  breaker.failures = 0;
  breaker.state = "closed";
}

function recordFailure(url: string): void {
  const key = getCircuitBreakerKey(url);
  const breaker = getCircuitBreaker(key);
  breaker.failures++;
  breaker.lastFailure = Date.now();

  if (breaker.failures >= CIRCUIT_BREAKER_CONFIG.failureThreshold) {
    breaker.state = "open";
  }
}

// Reset circuit breaker for testing or manual recovery
export function resetCircuitBreaker(url: string): void {
  const key = getCircuitBreakerKey(url);
  circuitBreakers.delete(key);
}

export function getCircuitBreakerStatus(url: string): CircuitBreakerState | undefined {
  const key = getCircuitBreakerKey(url);
  return circuitBreakers.get(key);
}

// Helper: Build request headers
function buildRequestHeaders(
  data: unknown,
  customHeaders?: Record<string, string>,
  requestId?: string
): Record<string, string> {
  const headers: Record<string, string> = {};
  if (requestId) {
    headers["X-Request-ID"] = requestId;
  }
  if (data) {
    headers["Content-Type"] = "application/json";
  }
  if (customHeaders) {
    Object.assign(headers, customHeaders);
  }
  return headers;
}

// Helper: Parse error response
async function parseErrorResponse(res: Response): Promise<ApiError> {
  const errorText = await res.text().catch(() => res.statusText);
  let errorData: unknown = errorText;
  try {
    errorData = JSON.parse(errorText);
  } catch {
    // Keep as text
  }
  return new ApiError(res.status, res.statusText, res, errorData);
}

// Helper: Check if status is a non-retryable client error
function isNonRetryableClientError(status: number): boolean {
  return status >= 400 && status < 500 && ![408, 429].includes(status);
}

// Helper: Process caught error and determine if retryable
function processError(error: unknown, url: string): { error: Error; shouldThrow: boolean } {
  // AbortError (timeout)
  if (error instanceof DOMException && error.name === "AbortError") {
    recordFailure(url);
    return { error: new AbortError("Request timed out or was aborted"), shouldThrow: false };
  }

  // CircuitBreakerError - always throw immediately
  if (error instanceof CircuitBreakerError) {
    return { error, shouldThrow: true };
  }

  // ApiError - check if retryable
  if (error instanceof ApiError) {
    if (isNonRetryableClientError(error.status)) {
      return { error, shouldThrow: true };
    }
    return { error, shouldThrow: false };
  }

  // Generic error
  recordFailure(url);
  const genericError = error instanceof Error ? error : new Error(String(error));
  return { error: genericError, shouldThrow: false };
}

// Helper: Execute single fetch attempt
async function executeFetchAttempt(
  url: string,
  method: string,
  data: unknown,
  customHeaders: Record<string, string> | undefined,
  timeout: number,
  credentials: CredentialsMode = "same-origin",
  requestId?: string
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const res = await fetch(url, {
      method,
      headers: buildRequestHeaders(data, customHeaders, requestId),
      body: data ? JSON.stringify(data) : undefined,
      credentials,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    // Handle non-retryable client errors (4xx except 408, 429)
    if (isNonRetryableClientError(res.status)) {
      throw await parseErrorResponse(res);
    }

    // Handle server errors (5xx) or retryable errors
    if (!res.ok) {
      recordFailure(url);
      throw await parseErrorResponse(res);
    }

    recordSuccess(url);
    return res;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

export async function enhancedApiRequest(
  method: string,
  url: string,
  data?: unknown,
  options: ApiRequestOptions = {}
): Promise<Response> {
  const {
    retries = 3,
    retryDelay = 1000,
    timeout = 30000,
    onRetry,
    headers: customHeaders,
    credentials = "same-origin",
  } = options;

  checkCircuitBreaker(url);

  // Generate request ID once for all retry attempts (correlation)
  const requestId = generateRequestId();
  let lastError: Error = new Error("Request failed");

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await executeFetchAttempt(
        url,
        method,
        data,
        customHeaders,
        timeout,
        credentials,
        requestId
      );
    } catch (error) {
      const { error: processedError, shouldThrow } = processError(error, url);
      lastError = processedError;

      if (shouldThrow || attempt === retries) {
        throw lastError;
      }

      onRetry?.(attempt + 1, lastError);

      const delay = retryDelay * Math.pow(2, attempt);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}

type UnauthorizedBehavior = "returnNull" | "throw";

export interface QueryFnOptions {
  on401: UnauthorizedBehavior;
  credentials?: CredentialsMode;
}

// Trusted API URL prefixes for security validation
const TRUSTED_API_PREFIXES = ["/api/", "/api"] as const;

/**
 * Validates that a URL path is safe for API requests
 * - Must start with a trusted prefix
 * - Must not contain path traversal attempts
 * - All query key parts must be valid strings
 */
function validateApiPath(queryKey: readonly unknown[]): string {
  // Validate all parts are strings or numbers (safe to join)
  const validatedParts = queryKey.map((part, index) => {
    if (typeof part === "string") {
      // Check for path traversal attempts
      if (part.includes("..") || part.includes("//")) {
        throw new Error(`Invalid query key part at index ${index}: path traversal detected`);
      }
      return part;
    }
    if (typeof part === "number") {
      return String(part);
    }
    throw new Error(
      `Invalid query key part at index ${index}: expected string or number, got ${typeof part}`
    );
  });

  const path = validatedParts.join("/");

  // Validate the path starts with a trusted prefix
  const isTrustedPath = TRUSTED_API_PREFIXES.some(prefix => path.startsWith(prefix));
  if (!isTrustedPath) {
    throw new Error(
      `Untrusted API path: ${path}. Path must start with ${TRUSTED_API_PREFIXES.join(" or ")}`
    );
  }

  return path;
}

export const getQueryFn: <T>(options: QueryFnOptions) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior, credentials = "same-origin" }) =>
  async ({ queryKey }) => {
    // Validate and build the API path securely
    const apiPath = validateApiPath(queryKey);
    const requestId = generateRequestId();

    const res = await fetch(apiPath, {
      credentials,
      headers: {
        "X-Request-ID": requestId,
      },
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

// Cache configuration for different data types
export const CACHE_CONFIG = {
  // Static data that rarely changes
  STATIC: {
    staleTime: 24 * 60 * 60 * 1000, // 24 hours
    gcTime: 48 * 60 * 60 * 1000, // 48 hours
  },
  // User-specific data
  USER_DATA: {
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
  },
  // Frequently changing data
  DYNAMIC: {
    staleTime: 1 * 60 * 1000, // 1 minute
    gcTime: 5 * 60 * 1000, // 5 minutes
  },
  // Real-time data
  REALTIME: {
    staleTime: 0, // Always stale
    gcTime: 1 * 60 * 1000, // 1 minute
  },
  // Audio/media data
  MEDIA: {
    staleTime: 60 * 60 * 1000, // 1 hour
    gcTime: 24 * 60 * 60 * 1000, // 24 hours
  },
} as const;

// Helper: Track analytics event safely
function trackAnalyticsEvent(
  eventName: string,
  category: string,
  label: string,
  value: number = 1
): void {
  globalThis.window?.gtag?.("event", eventName, {
    event_category: category,
    event_label: label,
    value,
  });
}

// Query cache with error handling, logging, and user-facing toast notifications
const queryCache = new QueryCache({
  onError: (error, query) => {
    const requestId = generateRequestId();
    const queryKeyStr = JSON.stringify(query.queryKey);

    // Track analytics
    trackAnalyticsEvent("query_error", "cache", queryKeyStr);

    // Show user-facing toast with request ID
    showErrorToast(error, `Query failed for key: ${queryKeyStr}`, requestId);
  },
  onSuccess: (_data, query) => {
    if (query.state.dataUpdatedAt > 0) {
      trackAnalyticsEvent("cache_hit", "cache", JSON.stringify(query.queryKey));
    }
  },
});

// Mutation cache with error handling and user-facing toast notifications
const mutationCache = new MutationCache({
  onError: (error, _variables, _context, mutation) => {
    const requestId = generateRequestId();
    const mutationKey = mutation.options.mutationKey?.join(".") || "unknown";

    // Track analytics
    trackAnalyticsEvent("mutation_error", "cache", mutationKey);

    // Show user-facing toast with request ID
    showErrorToast(error, `Mutation failed: ${mutationKey}`, requestId);
  },
});

export const queryClient = new QueryClient({
  queryCache,
  mutationCache,
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: CACHE_CONFIG.USER_DATA.staleTime, // Default to user data config
      gcTime: CACHE_CONFIG.USER_DATA.gcTime,
      retry: (failureCount, error: unknown) => {
        // Don't retry on 4xx errors except 408, 429
        const errorWithStatus = error as { status?: number };
        if (
          errorWithStatus?.status &&
          errorWithStatus.status >= 400 &&
          errorWithStatus.status < 500 &&
          ![408, 429].includes(errorWithStatus.status)
        ) {
          return false;
        }
        // Retry up to 3 times with exponential backoff
        return failureCount < 3;
      },
      retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
      // Enable background refetching for better UX
      refetchOnReconnect: true,
      refetchIntervalInBackground: false,
    },
    mutations: {
      retry: (failureCount, error: unknown) => {
        // Don't retry mutations on client errors
        const errorWithStatus = error as { status?: number };
        if (
          errorWithStatus?.status &&
          errorWithStatus.status >= 400 &&
          errorWithStatus.status < 500
        ) {
          return false;
        }
        // Retry once for server errors
        return failureCount < 1;
      },
      retryDelay: 1000,
    },
  },
});

// Cache invalidation utilities
export const cacheInvalidation = {
  // Invalidate all user-related data
  invalidateUserData: (userId?: string) => {
    const patterns = [
      ["user", "profile"],
      ["user", "favorites"],
      ["user", "downloads"],
      ["user", "orders"],
      ["dashboard"],
    ];

    if (userId) {
      patterns.forEach(pattern => {
        queryClient.invalidateQueries({ queryKey: [...pattern, userId] });
      });
    } else {
      patterns.forEach(pattern => {
        queryClient.invalidateQueries({ queryKey: pattern });
      });
    }
  },

  // Invalidate beats-related data
  invalidateBeatsData: () => {
    queryClient.invalidateQueries({ queryKey: ["beats"] });
    queryClient.invalidateQueries({ queryKey: ["search"] });
    queryClient.invalidateQueries({ queryKey: ["recommendations"] });
  },

  // Invalidate commerce data
  invalidateCommerceData: (userId?: string) => {
    queryClient.invalidateQueries({ queryKey: ["cart"] });
    queryClient.invalidateQueries({ queryKey: ["orders"] });
    queryClient.invalidateQueries({ queryKey: ["subscriptions"] });

    if (userId) {
      queryClient.invalidateQueries({ queryKey: ["user", "subscription", userId] });
    }
  },

  // Clear all cache
  clearAll: () => {
    queryClient.clear();
  },
};

// Prefetching utilities for better UX
export const prefetchUtils = {
  // Prefetch user dashboard data
  prefetchDashboard: async (userId: string) => {
    await Promise.all([
      queryClient.prefetchQuery({
        queryKey: ["dashboard", "stats", userId],
        staleTime: CACHE_CONFIG.USER_DATA.staleTime,
      }),
      queryClient.prefetchQuery({
        queryKey: ["user", "favorites", userId],
        staleTime: CACHE_CONFIG.USER_DATA.staleTime,
      }),
      queryClient.prefetchQuery({
        queryKey: ["user", "downloads", userId],
        staleTime: CACHE_CONFIG.USER_DATA.staleTime,
      }),
    ]);
  },

  // Prefetch beats list
  prefetchBeats: async (filters?: Record<string, unknown>) => {
    await queryClient.prefetchQuery({
      queryKey: ["beats", "list", filters],
      staleTime: CACHE_CONFIG.DYNAMIC.staleTime,
    });
  },

  // Prefetch beat details
  prefetchBeatDetails: async (beatId: string) => {
    await queryClient.prefetchQuery({
      queryKey: ["beats", "details", beatId],
      staleTime: CACHE_CONFIG.MEDIA.staleTime,
    });
  },
};

// Cache warming for critical data with abort support
export const warmCache = async (signal?: AbortSignal): Promise<void> => {
  // Check if already aborted before starting
  if (signal?.aborted) {
    return;
  }

  try {
    // Warm cache with static data that's commonly accessed
    await Promise.all([
      queryClient.prefetchQuery({
        queryKey: ["/api/subscription/plans"],
        staleTime: CACHE_CONFIG.STATIC.staleTime,
        queryFn: async () => {
          const response = await fetch("/api/subscription/plans", { signal });
          if (!response.ok) throw new Error("Failed to fetch subscription plans");
          return response.json();
        },
      }),
      queryClient.prefetchQuery({
        queryKey: ["/api/beats/featured"],
        staleTime: CACHE_CONFIG.DYNAMIC.staleTime,
        queryFn: async () => {
          const response = await fetch("/api/beats/featured", { signal });
          if (!response.ok) throw new Error("Failed to fetch featured beats");
          return response.json();
        },
      }),
    ]);
  } catch (error) {
    // Silently ignore abort errors
    if (error instanceof Error && error.name === "AbortError") {
      return;
    }
    console.warn("Cache warming failed:", error);
  }
};

// Clear user-specific cache entries (for sign-out cleanup)
export const clearUserCache = (): void => {
  queryClient.removeQueries({
    predicate: query => {
      const key = query.queryKey;
      // Remove user-specific and dashboard queries
      return key.some(
        k =>
          typeof k === "string" &&
          (k.includes("user") ||
            k.includes("dashboard") ||
            k.includes("favorites") ||
            k.includes("downloads") ||
            k.includes("orders") ||
            k.includes("subscription"))
      );
    },
  });
};
