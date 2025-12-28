/**
 * Beat Metadata Service
 *
 * Handles fetching and caching of beat metadata from WooCommerce API.
 * Provides clean separation between data fetching logic and UI components.
 */

import type { Download as DashboardDownload } from "../../../shared/types/dashboard";
import { apiService } from "./ApiService";

// ================================
// TYPES
// ================================

interface BeatMetadata {
  title?: string;
  artist?: string;
  genre?: string;
  bpm?: number;
  price?: number;
}

interface WooCommerceProduct {
  id: number;
  name?: string;
  title?: string;
  beat?: {
    name?: string;
    artist?: string;
    genre?: string;
    bpm?: number;
  };
  price?: number;
}

// ================================
// METADATA CACHE
// ================================

class BeatMetadataCache {
  private cache = new Map<number, BeatMetadata>();
  private pendingRequests = new Map<number, Promise<BeatMetadata | null>>();

  /**
   * Get metadata from cache
   */
  get(beatId: number): BeatMetadata | undefined {
    return this.cache.get(beatId);
  }

  /**
   * Set metadata in cache
   */
  set(beatId: number, metadata: BeatMetadata): void {
    this.cache.set(beatId, metadata);
  }

  /**
   * Check if metadata is cached
   */
  has(beatId: number): boolean {
    return this.cache.has(beatId);
  }

  /**
   * Get pending request for beat ID
   */
  getPendingRequest(beatId: number): Promise<BeatMetadata | null> | undefined {
    return this.pendingRequests.get(beatId);
  }

  /**
   * Set pending request for beat ID
   */
  setPendingRequest(beatId: number, promise: Promise<BeatMetadata | null>): void {
    this.pendingRequests.set(beatId, promise);
  }

  /**
   * Remove pending request for beat ID
   */
  removePendingRequest(beatId: number): void {
    this.pendingRequests.delete(beatId);
  }

  /**
   * Clear all cache data
   */
  clear(): void {
    this.cache.clear();
    this.pendingRequests.clear();
  }

  /**
   * Get cache size
   */
  size(): number {
    return this.cache.size;
  }
}

// ================================
// SERVICE CLASS
// ================================

class BeatMetadataService {
  private cache = new BeatMetadataCache();

  /**
   * Fetch metadata for a single beat from WooCommerce API
   */
  private async fetchBeatMetadata(
    beatId: number,
    signal?: AbortSignal
  ): Promise<BeatMetadata | null> {
    try {
      const response = await apiService.get<WooCommerceProduct>(`/woocommerce/products/${beatId}`, {
        signal,
      });

      const data = response.data;

      const metadata: BeatMetadata = {
        title: data?.name || data?.title || data?.beat?.name,
        artist: data?.beat?.artist,
        genre: data?.beat?.genre,
        bpm: data?.beat?.bpm,
        price: data?.price,
      };

      return metadata;
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        console.log(`Request aborted for beat ${beatId}`);
      } else {
        console.warn(`Error fetching metadata for beat ${beatId}:`, error);
      }
      return null;
    }
  }

  /**
   * Get metadata for a beat, using cache when available
   */
  async getBeatMetadata(beatId: number, signal?: AbortSignal): Promise<BeatMetadata | null> {
    // Return cached data if available
    if (this.cache.has(beatId)) {
      return this.cache.get(beatId) || null;
    }

    // Return pending request if one exists
    const pendingRequest = this.cache.getPendingRequest(beatId);
    if (pendingRequest) {
      return pendingRequest;
    }

    // Create new request
    const request = this.fetchBeatMetadata(beatId, signal);
    this.cache.setPendingRequest(beatId, request);

    try {
      const metadata = await request;

      if (metadata) {
        this.cache.set(beatId, metadata);
      }

      return metadata;
    } finally {
      this.cache.removePendingRequest(beatId);
    }
  }

  /**
   * Batch fetch metadata for multiple beats
   */
  async getBatchBeatMetadata(
    beatIds: number[],
    signal?: AbortSignal
  ): Promise<Record<number, BeatMetadata>> {
    const result: Record<number, BeatMetadata> = {};

    // Get cached data first
    const uncachedIds: number[] = [];
    for (const beatId of beatIds) {
      const cached = this.cache.get(beatId);
      if (cached) {
        result[beatId] = cached;
      } else {
        uncachedIds.push(beatId);
      }
    }

    // Fetch uncached data in parallel
    if (uncachedIds.length > 0) {
      const promises = uncachedIds.map(async beatId => {
        const metadata = await this.getBeatMetadata(beatId, signal);
        return { beatId, metadata };
      });

      const results = await Promise.allSettled(promises);

      for (const promiseResult of results) {
        if (promiseResult.status === "fulfilled" && promiseResult.value.metadata) {
          result[promiseResult.value.beatId] = promiseResult.value.metadata;
        }
      }
    }

    return result;
  }

  /**
   * Enrich downloads with missing metadata
   */
  async enrichDownloadsWithMetadata(
    downloads: DashboardDownload[],
    signal?: AbortSignal
  ): Promise<Record<number, { title?: string }>> {
    const toFetch = new Set<number>();

    // Identify downloads that need metadata enrichment
    for (const download of downloads) {
      const beatId = Number(download.beatId);
      if (!download.beatTitle && Number.isFinite(beatId) && !this.cache.has(beatId)) {
        toFetch.add(beatId);
      }
    }

    if (toFetch.size === 0) {
      return {};
    }

    // Fetch metadata for missing titles
    const metadata = await this.getBatchBeatMetadata(Array.from(toFetch), signal);

    // Convert to the expected format
    const enrichmentData: Record<number, { title?: string }> = {};
    for (const [beatId, meta] of Object.entries(metadata)) {
      if (meta.title) {
        enrichmentData[Number(beatId)] = { title: meta.title };
      }
    }

    return enrichmentData;
  }

  /**
   * Preload metadata for a list of beat IDs
   */
  async preloadMetadata(beatIds: number[], signal?: AbortSignal): Promise<void> {
    const uncachedIds = beatIds.filter(id => !this.cache.has(id));

    if (uncachedIds.length > 0) {
      await this.getBatchBeatMetadata(uncachedIds, signal);
    }
  }

  /**
   * Clear all cached metadata
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number } {
    return {
      size: this.cache.size(),
    };
  }
}

// ================================
// SINGLETON INSTANCE
// ================================

export const beatMetadataService = new BeatMetadataService();

// ================================
// UTILITY FUNCTIONS
// ================================

/**
 * Extract beat IDs from downloads that need metadata enrichment
 */
export const extractBeatIdsNeedingMetadata = (downloads: DashboardDownload[]): number[] => {
  const beatIds: number[] = [];

  for (const download of downloads) {
    const beatId = Number(download.beatId);
    if (!download.beatTitle && Number.isFinite(beatId)) {
      beatIds.push(beatId);
    }
  }

  return beatIds;
};

/**
 * Check if a download needs metadata enrichment
 */
export const needsMetadataEnrichment = (download: DashboardDownload): boolean => {
  const beatId = Number(download.beatId);
  return !download.beatTitle && Number.isFinite(beatId);
};
