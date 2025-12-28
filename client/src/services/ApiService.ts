/**
 * ApiService - Centralized HTTP client with retry logic and type safety
 *
 * Replaces 30+ direct fetch() calls with a typed, error-resilient interface.
 * Implements exponential backoff retry logic and timeout handling.
 *
 * @see Requirements 7.1, 7.3, 7.5
 */

export interface ApiOptions extends Omit<RequestInit, "body"> {
  /** Whether this request requires authentication */
  requireAuth?: boolean;
  /** Number of retry attempts for failed requests (default: 3) */
  retries?: number;
  /** Request timeout in milliseconds (default: 30000) */
  timeout?: number;
  /** Base delay for exponential backoff in ms (default: 1000) */
  retryDelay?: number;
  /** Custom headers to merge with defaults */
  headers?: Record<string, string>;
}

export interface ApiResponse<T> {
  data: T;
  status: number;
  headers: Headers;
  ok: boolean;
}

export interface ApiError extends Error {
  status: number;
  statusText: string;
  body: unknown;
  isApiError: true;
}

interface ApiServiceConfig {
  baseUrl: string;
  defaultTimeout: number;
  defaultRetries: number;
  defaultRetryDelay: number;
}

const DEFAULT_CONFIG: ApiServiceConfig = {
  baseUrl: "/api",
  defaultTimeout: 30000,
  defaultRetries: 3,
  defaultRetryDelay: 1000,
};

/**
 * Check if an error is retryable
 */
function isRetryableError(error: unknown): boolean {
  // Network errors
  if (error instanceof TypeError && error.message.includes("fetch")) {
    return true;
  }

  // Abort errors (timeout)
  if (error instanceof DOMException && error.name === "AbortError") {
    return true;
  }

  // Check for network-related error messages
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    return (
      message.includes("network") ||
      message.includes("timeout") ||
      message.includes("connection") ||
      message.includes("failed to fetch")
    );
  }

  return false;
}

/**
 * Check if an HTTP status code is retryable
 */
function isRetryableStatus(status: number): boolean {
  // Retry on server errors (5xx) and rate limiting (429)
  return status >= 500 || status === 429;
}

/**
 * Create a typed API error
 */
function createApiError(status: number, statusText: string, body: unknown): ApiError {
  const error = new Error(`API Error: ${status} ${statusText}`) as ApiError;
  error.status = status;
  error.statusText = statusText;
  error.body = body;
  error.isApiError = true;
  return error;
}

/**
 * Type guard for API errors
 */
export function isApiError(error: unknown): error is ApiError {
  return error instanceof Error && "isApiError" in error && (error as ApiError).isApiError === true;
}

/**
 * Delay helper for retry backoff
 */
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Centralized API client
 * Replaces 30+ direct fetch() calls with consistent error handling and retry logic
 */
class ApiServiceClass {
  private readonly config: ApiServiceConfig;
  private authTokenGetter?: () => Promise<string | null>;

  constructor(config: Partial<ApiServiceConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Set the auth token getter function
   * This should be called once during app initialization with Clerk's getToken
   */
  setAuthTokenGetter(getter: () => Promise<string | null>): void {
    this.authTokenGetter = getter;
  }

  /**
   * Build the full URL for a request
   */
  private buildUrl(endpoint: string): string {
    // If endpoint is already a full URL, use it as-is
    if (endpoint.startsWith("http://") || endpoint.startsWith("https://")) {
      return endpoint;
    }
    // Ensure endpoint starts with /
    const normalizedEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
    return `${this.config.baseUrl}${normalizedEndpoint}`;
  }

  /**
   * Build headers for a request
   */
  private async buildHeaders(options: ApiOptions, hasBody: boolean): Promise<Headers> {
    const headers = new Headers(options.headers);

    // Set content type for requests with body
    if (hasBody && !headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }

    // Add auth header if required and getter is available
    if (options.requireAuth && this.authTokenGetter) {
      try {
        const token = await this.authTokenGetter();
        if (token) {
          headers.set("Authorization", `Bearer ${token}`);
        }
      } catch (error) {
        console.warn("[ApiService] Failed to get auth token:", error);
      }
    }

    return headers;
  }

  /**
   * Execute a fetch with timeout
   */
  private async fetchWithTimeout(
    url: string,
    init: RequestInit,
    timeout: number
  ): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        ...init,
        signal: controller.signal,
      });
      return response;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Execute a fetch with retry logic
   */
  private async fetchWithRetry(
    url: string,
    init: RequestInit,
    options: Required<Pick<ApiOptions, "retries" | "timeout" | "retryDelay">>
  ): Promise<Response> {
    let lastError: unknown;

    for (let attempt = 0; attempt <= options.retries; attempt++) {
      try {
        const response = await this.fetchWithTimeout(url, init, options.timeout);

        // If response is OK or not retryable, return it
        if (response.ok || !isRetryableStatus(response.status)) {
          return response;
        }

        // For retryable status codes, throw to trigger retry
        if (attempt < options.retries) {
          const backoffDelay = options.retryDelay * Math.pow(2, attempt);
          console.warn(
            `[ApiService] Retrying request to ${url} (attempt ${attempt + 1}/${options.retries}) after ${backoffDelay}ms`
          );
          await delay(backoffDelay);
          continue;
        }

        // Last attempt, return the response even if it's an error
        return response;
      } catch (error) {
        lastError = error;

        // Only retry on retryable errors
        if (!isRetryableError(error) || attempt >= options.retries) {
          throw error;
        }

        const backoffDelay = options.retryDelay * Math.pow(2, attempt);
        console.warn(
          `[ApiService] Retrying request to ${url} (attempt ${attempt + 1}/${options.retries}) after ${backoffDelay}ms due to error:`,
          error
        );
        await delay(backoffDelay);
      }
    }

    // Should not reach here, but throw last error just in case
    throw lastError;
  }

  /**
   * Make an HTTP request with full options
   */
  async request<T>(
    endpoint: string,
    options: ApiOptions & { body?: unknown } = {}
  ): Promise<ApiResponse<T>> {
    const url = this.buildUrl(endpoint);
    const hasBody = options.body !== undefined;
    const headers = await this.buildHeaders(options, hasBody);

    const retryOptions = {
      retries: options.retries ?? this.config.defaultRetries,
      timeout: options.timeout ?? this.config.defaultTimeout,
      retryDelay: options.retryDelay ?? this.config.defaultRetryDelay,
    };

    const init: RequestInit = {
      method: options.method || "GET",
      headers,
      credentials: options.credentials,
      mode: options.mode,
      cache: options.cache,
      redirect: options.redirect,
      referrer: options.referrer,
      referrerPolicy: options.referrerPolicy,
      integrity: options.integrity,
      keepalive: options.keepalive,
    };

    // Add body if present
    if (hasBody) {
      init.body = typeof options.body === "string" ? options.body : JSON.stringify(options.body);
    }

    const response = await this.fetchWithRetry(url, init, retryOptions);

    // Parse response body
    let data: T;
    const contentType = response.headers.get("content-type");

    if (contentType?.includes("application/json")) {
      data = await response.json();
    } else {
      // For non-JSON responses, return text as unknown and cast
      data = (await response.text()) as unknown as T;
    }

    // Throw error for non-OK responses
    if (!response.ok) {
      throw createApiError(response.status, response.statusText, data);
    }

    return {
      data,
      status: response.status,
      headers: response.headers,
      ok: response.ok,
    };
  }

  // ============================================
  // Convenience methods
  // ============================================

  /**
   * Make a GET request
   */
  get<T>(endpoint: string, options?: ApiOptions): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...options, method: "GET" });
  }

  /**
   * Make a POST request
   */
  post<T>(endpoint: string, data?: unknown, options?: ApiOptions): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      ...options,
      method: "POST",
      body: data,
    });
  }

  /**
   * Make a PUT request
   */
  put<T>(endpoint: string, data?: unknown, options?: ApiOptions): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      ...options,
      method: "PUT",
      body: data,
    });
  }

  /**
   * Make a PATCH request
   */
  patch<T>(endpoint: string, data?: unknown, options?: ApiOptions): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      ...options,
      method: "PATCH",
      body: data,
    });
  }

  /**
   * Make a DELETE request
   */
  delete<T>(endpoint: string, options?: ApiOptions): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...options, method: "DELETE" });
  }

  // ============================================
  // Utility methods
  // ============================================

  /**
   * Create a new instance with a different base URL
   */
  withBaseUrl(baseUrl: string): ApiServiceClass {
    const instance = new ApiServiceClass({ ...this.config, baseUrl });
    instance.authTokenGetter = this.authTokenGetter;
    return instance;
  }

  /**
   * Get the current configuration
   */
  getConfig(): Readonly<ApiServiceConfig> {
    return { ...this.config };
  }
}

// Export singleton instance
export const apiService = new ApiServiceClass();

// Export class for custom instances
export { ApiServiceClass as ApiService };

// Default export for convenience
export default apiService;
