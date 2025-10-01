import { useAuth } from "@clerk/clerk-react";

export interface AuthenticatedFetchOptions extends RequestInit {
  headers?: Record<string, string>;
}

/**
 * Custom hook that provides an authenticated fetch function.
 * Automatically includes the Clerk authentication token in all requests.
 */
export function useAuthenticatedFetch() {
  const { getToken } = useAuth();

  const authenticatedFetch = async (url: string, options: AuthenticatedFetchOptions = {}) => {
    // Get authentication token from Clerk
    const token = await getToken();
    if (!token) {
      throw new Error("Authentication token not available. Please sign in again.");
    }

    // Merge headers with authentication
    const headers = {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`,
      ...(options.headers || {}),
    };

    // Make the request with authentication headers
    const response = await fetch(url, {
      ...options,
      headers,
    });

    return response;
  };

  return { authenticatedFetch };
}

/**
 * Utility function for making authenticated API requests
 * Note: This should be used inside a React component that has access to Clerk context
 */
export async function makeAuthenticatedRequest(
  getToken: () => Promise<string | null>,
  url: string,
  options: AuthenticatedFetchOptions = {}
) {
  // Get authentication token from Clerk
  const token = await getToken();
  if (!token) {
    throw new Error("Authentication token not available. Please sign in again.");
  }

  // Merge headers with authentication
  const headers = {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${token}`,
    ...(options.headers || {}),
  };

  // Make the request with authentication headers
  const response = await fetch(url, {
    ...options,
    headers,
  });

  return response;
}