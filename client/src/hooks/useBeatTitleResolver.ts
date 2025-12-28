/**
 * Hook to resolve beat titles from WooCommerce when not found in Convex
 *
 * This hook provides a fallback mechanism to fetch beat titles from the
 * WooCommerce API when they are missing from the Convex database.
 */

import { apiService } from "@/services/ApiService";
import { useCallback, useEffect, useRef, useState } from "react";

interface BeatTitleCache {
  [beatId: number]: {
    title: string;
    fetchedAt: number;
  };
}

interface UseBeatTitleResolverOptions {
  /** Cache TTL in milliseconds (default: 1 hour) */
  cacheTTL?: number;
  /** Whether to auto-fetch missing titles */
  autoFetch?: boolean;
}

interface UseBeatTitleResolverReturn {
  /** Resolve a beat title, returning cached value or fetching from API */
  resolveTitle: (beatId: number, fallbackTitle?: string) => string;
  /** Fetch titles for multiple beat IDs */
  fetchMissingTitles: (beatIds: number[]) => Promise<void>;
  /** Check if a title is being fetched */
  isLoading: (beatId: number) => boolean;
  /** Get all resolved titles */
  resolvedTitles: BeatTitleCache;
  /** Whether any fetch is in progress */
  isFetching: boolean;
}

// Global cache to persist across component remounts
const globalCache: BeatTitleCache = {};
const pendingFetches = new Set<number>();

/**
 * Hook to resolve beat titles from WooCommerce API
 */
export function useBeatTitleResolver(
  options: UseBeatTitleResolverOptions = {}
): UseBeatTitleResolverReturn {
  const { cacheTTL = 60 * 60 * 1000, autoFetch = true } = options;

  const [resolvedTitles, setResolvedTitles] = useState<BeatTitleCache>(globalCache);
  const [isFetching, setIsFetching] = useState(false);
  const fetchQueueRef = useRef<Set<number>>(new Set());
  const fetchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /**
   * Check if a cached title is still valid
   */
  const isCacheValid = useCallback(
    (beatId: number): boolean => {
      const cached = globalCache[beatId];
      if (!cached) return false;
      return Date.now() - cached.fetchedAt < cacheTTL;
    },
    [cacheTTL]
  );

  /**
   * Fetch a single beat title from WooCommerce API
   */
  const fetchBeatTitle = useCallback(async (beatId: number): Promise<string | null> => {
    if (pendingFetches.has(beatId)) {
      return null;
    }

    pendingFetches.add(beatId);

    try {
      console.log(`🔄 Fetching beat title for ID: ${beatId}`); // Debug log
      const response = await apiService.get<{
        beat?: { name?: string; title?: string };
        name?: string;
        title?: string;
      }>(`/woocommerce/products/${beatId}`);

      const data = response.data;
      // API returns { beat: {...} } or direct product object
      const product = data.beat || data;
      const title = product.name || product.title || `Beat ${beatId}`;

      console.log(`✅ Resolved beat ${beatId} title: "${title}"`); // Debug log

      globalCache[beatId] = {
        title,
        fetchedAt: Date.now(),
      };

      return title;
    } catch (error) {
      // Check if it's a 404 error
      if (
        error &&
        typeof error === "object" &&
        "status" in error &&
        (error as { status: number }).status === 404
      ) {
        // Product not found, cache as "Beat {id}" to avoid repeated fetches
        const fallbackTitle = `Beat ${beatId}`;
        globalCache[beatId] = {
          title: fallbackTitle,
          fetchedAt: Date.now(),
        };
        return fallbackTitle;
      }
      console.error(`Failed to fetch beat ${beatId} title:`, error);
      return null;
    } finally {
      pendingFetches.delete(beatId);
    }
  }, []);

  /**
   * Fetch titles for multiple beat IDs in batch
   */
  const fetchMissingTitles = useCallback(
    async (beatIds: number[]): Promise<void> => {
      // Filter out already cached or pending IDs
      const missingIds = beatIds.filter(id => !isCacheValid(id) && !pendingFetches.has(id));

      if (missingIds.length === 0) {
        return;
      }

      setIsFetching(true);

      try {
        // Fetch in parallel with rate limiting (max 5 concurrent)
        const batchSize = 5;
        for (let i = 0; i < missingIds.length; i += batchSize) {
          const batch = missingIds.slice(i, i + batchSize);
          await Promise.all(batch.map(fetchBeatTitle));
        }

        // Update state with new cache
        setResolvedTitles({ ...globalCache });
      } finally {
        setIsFetching(false);
      }
    },
    [fetchBeatTitle, isCacheValid]
  );

  /**
   * Queue a beat ID for fetching (debounced)
   */
  const queueFetch = useCallback(
    (beatId: number): void => {
      if (!autoFetch || isCacheValid(beatId) || pendingFetches.has(beatId)) {
        return;
      }

      fetchQueueRef.current.add(beatId);

      // Debounce the fetch to batch multiple requests
      if (fetchTimeoutRef.current) {
        clearTimeout(fetchTimeoutRef.current);
      }

      fetchTimeoutRef.current = setTimeout(() => {
        const queuedIds = Array.from(fetchQueueRef.current);
        fetchQueueRef.current.clear();

        if (queuedIds.length > 0) {
          fetchMissingTitles(queuedIds);
        }
      }, 100);
    },
    [autoFetch, fetchMissingTitles, isCacheValid]
  );

  /**
   * Resolve a beat title, returning cached value or triggering fetch
   */
  const resolveTitle = useCallback(
    (beatId: number, fallbackTitle?: string): string => {
      // Check cache first
      if (isCacheValid(beatId)) {
        return globalCache[beatId].title;
      }

      // Check if title looks like a fallback (Beat {id})
      const isFallbackTitle = fallbackTitle && /^Beat \d+$/.test(fallbackTitle);

      if (isFallbackTitle) {
        // Queue fetch for missing title
        queueFetch(beatId);
      }

      // Return fallback while fetching
      return fallbackTitle || `Beat ${beatId}`;
    },
    [isCacheValid, queueFetch]
  );

  /**
   * Check if a specific beat ID is being fetched
   */
  const isLoading = useCallback((beatId: number): boolean => {
    return pendingFetches.has(beatId);
  }, []);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (fetchTimeoutRef.current) {
        clearTimeout(fetchTimeoutRef.current);
      }
    };
  }, []);

  return {
    resolveTitle,
    fetchMissingTitles,
    isLoading,
    resolvedTitles,
    isFetching,
  };
}

/**
 * Utility function to check if a title is a fallback
 */
export function isFallbackTitle(title: string): boolean {
  return /^Beat \d+$/.test(title);
}

/**
 * Extract beat ID from fallback title
 */
export function extractBeatIdFromFallback(title: string): number | null {
  const regex = /^Beat (\d+)$/;
  const match = regex.exec(title);
  return match ? Number.parseInt(match[1], 10) : null;
}

export default useBeatTitleResolver;
