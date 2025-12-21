import { useAuth } from "@clerk/clerk-react";

export interface AuthenticatedFetchOptions extends RequestInit {
  headers?: Record<string, string>;
}

/**
 * Build headers with authentication token
 */
function buildAuthHeaders(
  token: string,
  customHeaders?: Record<string, string>
): Record<string, string> {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
    ...customHeaders,
  };
}

/**
 * Core authenticated fetch implementation
 */
async function executeAuthenticatedFetch(
  url: string,
  token: string,
  options: AuthenticatedFetchOptions = {}
): Promise<Response> {
  const headers = buildAuthHeaders(token, options.headers);

  return fetch(url, {
    ...options,
    headers,
    credentials: "include",
  });
}

/**
 * Validate token and throw if missing
 */
function validateToken(token: string | null, context: string): asserts token is string {
  if (!token) {
    throw new Error(`Authentication token not available (${context}). Please sign in again.`);
  }
}

/**
 * Custom hook that provides an authenticated fetch function.
 * Automatically includes the Clerk authentication token in all requests.
 */
export function useAuthenticatedFetch() {
  const { getToken } = useAuth();

  const authenticatedFetch = async (
    url: string,
    options: AuthenticatedFetchOptions = {}
  ): Promise<Response> => {
    const token = await getToken();
    validateToken(token, "hook");
    return executeAuthenticatedFetch(url, token, options);
  };

  return { authenticatedFetch };
}

/**
 * Utility function for making authenticated API requests.
 * Use inside a React component that has access to Clerk context.
 * @param getToken - Function to retrieve the authentication token
 * @param url - The URL to fetch
 * @param options - Fetch options
 */
export async function makeAuthenticatedRequest(
  getToken: () => Promise<string | null>,
  url: string,
  options: AuthenticatedFetchOptions = {}
): Promise<Response> {
  const token = await getToken();
  validateToken(token, "utility");
  return executeAuthenticatedFetch(url, token, options);
}
