/**
 * Dashboard Data Transform Hook
 *
 * Custom hook that handles all data transformation logic for the dashboard.
 * Provides clean separation between raw data fetching and transformed business objects.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import type {
  Activity,
  Download as DashboardDownload,
  Favorite,
  Order,
  Reservation,
} from "../../../shared/types/dashboard";

import { useDashboard } from "@/hooks/useDashboard";
import {
  beatMetadataService,
  extractBeatIdsNeedingMetadata,
} from "../services/beatMetadataService";
import {
  transformActivitiesData,
  transformDownloadsData,
  transformDownloadsForTable,
  transformFavoritesData,
  transformOrdersData,
  transformReservationsData,
} from "../services/dashboardDataTransform";

// ================================
// HOOK INTERFACE
// ================================

interface UseDashboardDataTransformResult {
  // Transformed data
  transformedOrders: Order[];
  transformedReservations: Reservation[];
  transformedActivities: Activity[];
  transformedFavorites: Favorite[];
  transformedDownloads: DashboardDownload[];
  transformedDownloadsForTable: Array<{
    id: string;
    beatTitle: string;
    artist?: string;
    fileSize: number;
    format: "mp3" | "wav" | "flac";
    quality: string;
    downloadedAt: string;
    downloadCount: number;
    maxDownloads?: number;
    licenseType?: string;
    downloadUrl: string;
    isExpired?: boolean;
    expiresAt?: string;
  }>;

  // Loading states
  isTransforming: boolean;
  isEnrichingMetadata: boolean;

  // Error handling
  transformError: string | null;

  // Actions
  refreshTransformedData: () => Promise<void>;
  clearTransformError: () => void;
}

// ================================
// HOOK IMPLEMENTATION
// ================================

export const useDashboardDataTransform = (): UseDashboardDataTransformResult => {
  // Get raw data from the unified dashboard hook
  const {
    orders,
    reservations,
    activity: recentActivity,
    favorites,
    downloads,
    isLoading,
    refetch,
  } = useDashboard();

  // Local state for transformation
  const [isTransforming, setIsTransforming] = useState(false);
  const [isEnrichingMetadata, setIsEnrichingMetadata] = useState(false);
  const [transformError, setTransformError] = useState<string | null>(null);
  const [downloadBeatMetadata, setDownloadBeatMetadata] = useState<
    Record<number, { title?: string }>
  >({});

  // Transform orders data
  const transformedOrders = useMemo(() => {
    try {
      if (!orders) return [];
      return transformOrdersData(orders);
    } catch (error) {
      console.error("Error transforming orders:", error);
      setTransformError("Failed to transform orders data");
      return [];
    }
  }, [orders]);

  // Transform reservations data
  const transformedReservations = useMemo(() => {
    try {
      if (!reservations) return [];
      return transformReservationsData(reservations);
    } catch (error) {
      console.error("Error transforming reservations:", error);
      setTransformError("Failed to transform reservations data");
      return [];
    }
  }, [reservations]);

  // Transform activities data
  const transformedActivities = useMemo(() => {
    try {
      if (!recentActivity) return [];
      return transformActivitiesData(recentActivity);
    } catch (error) {
      console.error("Error transforming activities:", error);
      setTransformError("Failed to transform activities data");
      return [];
    }
  }, [recentActivity]);

  // Transform favorites data
  const transformedFavorites = useMemo(() => {
    try {
      if (!favorites) return [];
      return transformFavoritesData(favorites);
    } catch (error) {
      console.error("Error transforming favorites:", error);
      setTransformError("Failed to transform favorites data");
      return [];
    }
  }, [favorites]);

  // Transform downloads data with metadata enrichment
  const transformedDownloads = useMemo(() => {
    try {
      if (!downloads) return [];
      return transformDownloadsData(downloads, downloadBeatMetadata);
    } catch (error) {
      console.error("Error transforming downloads:", error);
      setTransformError("Failed to transform downloads data");
      return [];
    }
  }, [downloads, downloadBeatMetadata]);

  // Transform downloads data specifically for table component
  const transformedDownloadsForTable = useMemo(() => {
    try {
      if (!downloads) return [];
      return transformDownloadsForTable(downloads, downloadBeatMetadata);
    } catch (error) {
      console.error("Error transforming downloads for table:", error);
      setTransformError("Failed to transform downloads data for table");
      return [];
    }
  }, [downloads, downloadBeatMetadata]);

  // Enrich downloads with missing metadata
  useEffect(() => {
    const controller = new AbortController();

    const enrichMetadata = async () => {
      if (!downloads || downloads.length === 0) return;

      const beatIdsNeedingMetadata = extractBeatIdsNeedingMetadata(downloads);
      if (beatIdsNeedingMetadata.length === 0) return;

      setIsEnrichingMetadata(true);

      try {
        const enrichmentData = await beatMetadataService.enrichDownloadsWithMetadata(
          downloads,
          controller.signal
        );

        if (Object.keys(enrichmentData).length > 0) {
          setDownloadBeatMetadata(prev => ({
            ...prev,
            ...enrichmentData,
          }));
        }
      } catch (error) {
        if (error instanceof Error && error.name !== "AbortError") {
          console.warn("Failed to enrich download metadata:", error);
          // Don't set transform error for metadata enrichment failures
          // as the UI has fallbacks for missing titles
        }
      } finally {
        setIsEnrichingMetadata(false);
      }
    };

    enrichMetadata();

    return () => {
      controller.abort();
    };
  }, [downloads]);

  // Refresh all transformed data
  const refreshTransformedData = useCallback(async () => {
    setIsTransforming(true);
    setTransformError(null);

    try {
      await refetch();
      // Clear metadata cache to ensure fresh data
      beatMetadataService.clearCache();
      setDownloadBeatMetadata({});
    } catch (error) {
      console.error("Error refreshing dashboard data:", error);
      setTransformError("Failed to refresh dashboard data");
    } finally {
      setIsTransforming(false);
    }
  }, [refetch]);

  // Clear transform error
  const clearTransformError = useCallback(() => {
    setTransformError(null);
  }, []);

  return {
    // Transformed data
    transformedOrders,
    transformedReservations,
    transformedActivities,
    transformedFavorites,
    transformedDownloads,
    transformedDownloadsForTable,

    // Loading states
    isTransforming: isTransforming || Boolean(isLoading),
    isEnrichingMetadata,

    // Error handling
    transformError,

    // Actions
    refreshTransformedData,
    clearTransformError,
  };
};

// ================================
// UTILITY HOOKS
// ================================

/**
 * Hook for getting transformed orders only
 */
export const useTransformedOrders = (): {
  orders: Order[];
  isLoading: boolean;
  error: string | null;
} => {
  const { transformedOrders, isTransforming, transformError } = useDashboardDataTransform();

  return {
    orders: transformedOrders,
    isLoading: isTransforming,
    error: transformError,
  };
};

/**
 * Hook for getting transformed downloads only
 */
export const useTransformedDownloads = (): {
  downloads: DashboardDownload[];
  isLoading: boolean;
  isEnrichingMetadata: boolean;
  error: string | null;
} => {
  const { transformedDownloads, isTransforming, isEnrichingMetadata, transformError } =
    useDashboardDataTransform();

  return {
    downloads: transformedDownloads,
    isLoading: isTransforming,
    isEnrichingMetadata,
    error: transformError,
  };
};

/**
 * Hook for getting transformed activities only
 */
export const useTransformedActivities = (): {
  activities: Activity[];
  isLoading: boolean;
  error: string | null;
} => {
  const { transformedActivities, isTransforming, transformError } = useDashboardDataTransform();

  return {
    activities: transformedActivities,
    isLoading: isTransforming,
    error: transformError,
  };
};
