/**
 * Query Helpers - Secure and robust query utilities
 * Implements improvements from security audit:
 * - Safer global query function with key validation
 * - Credential handling with same-origin/no-credentials
 * - Retry logic with circuit breaking
 * - User-facing error feedback
 */

import { toast } from "@/hooks/use-toast";

// Circuit breaker state
interface CircuitBreakerState {
  failures: number;
  lastFailureTime: number;
  isOpen: boolean;
}

const circuitBreakers = new Map<string, CircuitBreakerState>();

const CIRCUIT_BREAKER_THRESHOLD = 5;
const CIRCUIT_BREAKER_TIMEOUT = 30000; // 30 seconds
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second

/**
 * Validates query key to prevent malformed URLs and path poisoning
 */
function validateQueryKey(queryKey: unknown): string[] {
  if (!Array.isArray(queryKey)) {
    throw new TypeError("Query key must be an array");
  }

  const validatedKey = queryKey.map(part => {
    if (typeof part !== "string" && typeof part !== "number") {
      throw new TypeError("Query key parts must be strings or numbers");
    }
    return String(part);
  });

  // Check for path traversal attempts
  for (const part of validatedKey) {
    if (part.includes("..") || part.includes("//")) {
      throw new TypeError("Invalid query key: path traversal detected");
    }
  }

  return validatedKey;
}

/**
 * Creates a circuit breaker key from query key
 */
function getCircuitBreakerKey(queryKey: string[]): string {
  return queryKey.join(":");
}

/**
 * Checks if circuit breaker is open for a given key
 */
function isCircuitBreakerOpen(key: string): boolean {
  const state = circuitBreakers.get(key);
  if (!state?.isOpen) {
    return false;
  }

  // Check if timeout has passed
  const now = Date.now();
  if (now - state.lastFailureTime > CIRCUIT_BREAKER_TIMEOUT) {
    // Reset circuit breaker
    circuitBreakers.delete(key);
    return false;
  }

  return true;
}

/**
 * Records a failure for circuit breaker
 */
function recordFailure(key: string): void {
  const state = circuitBreakers.get(key) || {
    failures: 0,
    lastFailureTime: 0,
    isOpen: false,
  };

  state.failures += 1;
  state.lastFailureTime = Date.now();

  if (state.failures >= CIRCUIT_BREAKER_THRESHOLD) {
    state.isOpen = true;
  }

  circuitBreakers.set(key, state);
}

/**
 * Records a success for circuit breaker
 */
function recordSuccess(key: string): void {
  circuitBreakers.delete(key);
}

/**
 * Delays execution for retry logic
 */
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Determines if an error should be retried
 */
function shouldRetryError(error: Error): boolean {
  // Don't retry on 4xx errors (client errors)
  return !error.message.includes("HTTP 4");
}

/**
 * Creates fetch options with appropriate credentials
 */
function createFetchOptions(url: string, options: RequestInit): RequestInit {
  const requestUrl = new URL(url, globalThis.location.origin);
  const isSameOrigin = requestUrl.origin === globalThis.location.origin;

  return {
    ...options,
    credentials: isSameOrigin ? "include" : "omit",
  };
}

/**
 * Performs a single fetch attempt
 */
async function performFetch<T>(url: string, options: RequestInit): Promise<T> {
  const fetchOptions = createFetchOptions(url, options);
  const response = await fetch(url, fetchOptions);

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  return response.json() as Promise<T>;
}

/**
 * Enhanced fetch with retry logic and circuit breaking
 */
export async function enhancedFetch<T>(url: string, options: RequestInit = {}): Promise<T> {
  const circuitKey = url;

  // Check circuit breaker
  if (isCircuitBreakerOpen(circuitKey)) {
    const error = new Error("Service temporarily unavailable");
    showUserFriendlyError(error, "fetch");
    throw error;
  }

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const data = await performFetch<T>(url, options);
      recordSuccess(circuitKey);
      return data;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error("Unknown error");

      // Handle non-retryable errors
      if (!shouldRetryError(lastError)) {
        recordFailure(circuitKey);
        showUserFriendlyError(lastError, "fetch");
        throw lastError;
      }

      // Retry with exponential backoff
      if (attempt < MAX_RETRIES) {
        await delay(RETRY_DELAY * (attempt + 1));
        continue;
      }

      // All retries exhausted
      recordFailure(circuitKey);
      showUserFriendlyError(lastError, "fetch");
      throw lastError;
    }
  }

  // Should never reach here, but TypeScript needs it
  throw lastError || new Error("Request failed");
}

/**
 * Shows user-friendly error messages with telemetry integration
 */
function showUserFriendlyError(error: Error, context: string): void {
  console.error(`[${context}] Error:`, error);

  // Map technical errors to user-friendly messages
  let userMessage = "An unexpected error occurred. Please try again.";
  let description = "";

  if (error.message.includes("Network")) {
    userMessage = "Network Error";
    description = "Please check your internet connection and try again.";
  } else if (error.message.includes("HTTP 401") || error.message.includes("HTTP 403")) {
    userMessage = "Authentication Required";
    description = "Please log in to continue.";
  } else if (error.message.includes("HTTP 404")) {
    userMessage = "Not Found";
    description = "The requested resource could not be found.";
  } else if (error.message.includes("HTTP 5")) {
    userMessage = "Server Error";
    description = "Our servers are experiencing issues. Please try again later.";
  } else if (error.message.includes("temporarily unavailable")) {
    userMessage = "Service Unavailable";
    description = "The service is temporarily unavailable. Please try again in a few moments.";
  }

  // Show toast notification
  toast({
    title: userMessage,
    description,
    variant: "destructive",
  });

  // Note: Telemetry integration can be added here in the future
  // Example: sendToTelemetry({ error, context, userMessage });
}

/**
 * Safer query function with validation and error handling
 */
export function createSafeQuery<T>(
  queryKey: unknown,
  queryFn: () => Promise<T>
): {
  queryKey: string[];
  queryFn: () => Promise<T>;
} {
  const validatedKey = validateQueryKey(queryKey);
  const circuitKey = getCircuitBreakerKey(validatedKey);

  return {
    queryKey: validatedKey,
    queryFn: async () => {
      // Check circuit breaker
      if (isCircuitBreakerOpen(circuitKey)) {
        const error = new Error("Service temporarily unavailable");
        showUserFriendlyError(error, "query");
        throw error;
      }

      try {
        const result = await queryFn();
        recordSuccess(circuitKey);
        return result;
      } catch (error) {
        recordFailure(circuitKey);
        showUserFriendlyError(error instanceof Error ? error : new Error("Unknown error"), "query");
        throw error;
      }
    },
  };
}

/**
 * Type-safe API helper with validation
 */
export function createApiUrl(
  baseUrl: string,
  path: string,
  params?: Record<string, string | number>
): string {
  // Validate base URL
  if (!baseUrl.startsWith("http://") && !baseUrl.startsWith("https://")) {
    throw new TypeError("Invalid base URL: must start with http:// or https://");
  }

  // Validate path
  if (path.includes("..") || path.includes("//")) {
    throw new TypeError("Invalid path: path traversal detected");
  }

  const url = new URL(path, baseUrl);

  // Add query parameters
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.append(key, String(value));
    }
  }

  return url.toString();
}
