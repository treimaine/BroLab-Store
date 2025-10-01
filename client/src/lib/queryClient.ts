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

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined
): Promise<Response> {
  const res = await fetch(url, {
    method,
    headers: data ? { "Content-Type": "application/json" } : {},
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: { on401: UnauthorizedBehavior }) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const res = await fetch(queryKey.join("/") as string, {
      credentials: "include",
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

// Query cache with error handling and logging
const queryCache = new QueryCache({
  onError: (error, query) => {
    console.error(`Query failed for key: ${JSON.stringify(query.queryKey)}`, error);

    // Track cache misses and errors for analytics
    if (typeof window !== "undefined" && window.gtag) {
      window.gtag("event", "query_error", {
        event_category: "cache",
        event_label: JSON.stringify(query.queryKey),
        value: 1,
      });
    }
  },
  onSuccess: (_data, query) => {
    // Track successful cache hits for analytics
    if (typeof window !== "undefined" && window.gtag && query.state.dataUpdatedAt > 0) {
      window.gtag("event", "cache_hit", {
        event_category: "cache",
        event_label: JSON.stringify(query.queryKey),
        value: 1,
      });
    }
  },
});

// Mutation cache with error handling
const mutationCache = new MutationCache({
  onError: (error, _variables, _context, mutation) => {
    console.error("Mutation failed:", error);

    // Track mutation errors for analytics
    if (typeof window !== "undefined" && window.gtag) {
      window.gtag("event", "mutation_error", {
        event_category: "cache",
        event_label: mutation.options.mutationKey?.join(".") || "unknown",
        value: 1,
      });
    }
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

// Cache warming for critical data
export const warmCache = async () => {
  try {
    // Warm cache with static data that's commonly accessed
    await Promise.all([
      queryClient.prefetchQuery({
        queryKey: ["subscription", "plans"],
        staleTime: CACHE_CONFIG.STATIC.staleTime,
      }),
      queryClient.prefetchQuery({
        queryKey: ["beats", "featured"],
        staleTime: CACHE_CONFIG.DYNAMIC.staleTime,
      }),
    ]);
  } catch (error) {
    console.warn("Cache warming failed:", error);
  }
};
