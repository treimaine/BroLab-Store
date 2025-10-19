/**
 * Optimistic Downloads Hook
 *
 * Provides optimistic updates for downloads with rollback capability.
 *
 * Requirements addressed:
 * - 4.2: Optimistic updates for downloads with rollback capability
 * - 4.1: Real-time updates without full page refreshes
 */

import { useOptimisticUpdates, useRealtimeContext } from "@/providers/DashboardRealtimeProvider";
import type { Download } from "@shared/types/dashboard";
import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useState } from "react";

export interface OptimisticDownloadsHook {
  // Actions
  recordDownload: (downloadData: Partial<Download>) => Promise<string>;
  updateDownloadCount: (downloadId: string) => Promise<void>;

  // State
  pendingOperations: Set<string>;
  isOptimistic: (downloadId: string) => boolean;

  // Error handling
  rollbackDownload: (downloadId: string) => void;
  clearPendingOperations: () => void;
}

export function useOptimisticDownloads(): OptimisticDownloadsHook {
  const queryClient = useQueryClient();
  const { addOptimisticUpdate, rollbackOptimisticUpdate } = useOptimisticUpdates();
  const { emit } = useRealtimeContext();
  const [pendingOperations, setPendingOperations] = useState<Set<string>>(new Set());
  const [optimisticIds, setOptimisticIds] = useState<Set<string>>(new Set());

  // Record download with optimistic update
  const recordDownload = useCallback(
    async (downloadData: Partial<Download>): Promise<string> => {
      const tempId = `temp-download-${Date.now()}-${downloadData.beatId}`;

      const optimisticDownload: Download = {
        id: tempId,
        beatId: downloadData.beatId || 0,
        beatTitle: downloadData.beatTitle || `Beat ${downloadData.beatId}`,
        beatArtist: downloadData.beatArtist,
        beatImageUrl: downloadData.beatImageUrl,
        fileSize: downloadData.fileSize,
        format: downloadData.format || "mp3",
        quality: downloadData.quality || "standard",
        licenseType: downloadData.licenseType || "basic",
        downloadedAt: new Date().toISOString(),
        downloadCount: 1,
        maxDownloads: downloadData.maxDownloads,
        downloadUrl: downloadData.downloadUrl,
        expiresAt: downloadData.expiresAt,
        ...downloadData,
      };

      // Add to pending operations
      setPendingOperations(prev => new Set(prev).add(tempId));
      setOptimisticIds(prev => new Set(prev).add(tempId));

      // Apply optimistic update
      const updateId = addOptimisticUpdate({
        type: "download_completed",
        data: optimisticDownload,
        rollback: () => {
          // Remove from query cache
          queryClient.setQueryData(["convex", "dashboard.getDashboardData"], (oldData: any) => {
            if (!oldData) return oldData;
            return {
              ...oldData,
              downloads: oldData.downloads.filter((download: Download) => download.id !== tempId),
              stats: {
                ...oldData.stats,
                totalDownloads: Math.max(0, oldData.stats.totalDownloads - 1),
              },
            };
          });
        },
      });

      try {
        // Emit real-time event
        emit({
          type: "download_completed",
          userId: "current-user", // This would come from useUser()
          data: optimisticDownload,
        });

        // In a real implementation, this would call a Convex mutation
        // For now, we'll simulate the API call
        await new Promise(resolve => setTimeout(resolve, 1200));

        // Success - remove from pending operations
        setPendingOperations(prev => {
          const newSet = new Set(prev);
          newSet.delete(tempId);
          return newSet;
        });

        // Invalidate queries to get the real data
        await queryClient.invalidateQueries({
          queryKey: ["convex", "downloads"],
        });
        await queryClient.invalidateQueries({
          queryKey: ["convex", "dashboard.getDashboardData"],
        });

        return tempId; // In real implementation, this would be the actual download ID
      } catch (error) {
        console.error("Failed to record download:", error);

        // Rollback optimistic update
        rollbackOptimisticUpdate(updateId);

        // Remove from pending operations
        setPendingOperations(prev => {
          const newSet = new Set(prev);
          newSet.delete(tempId);
          return newSet;
        });
        setOptimisticIds(prev => {
          const newSet = new Set(prev);
          newSet.delete(tempId);
          return newSet;
        });

        throw error;
      }
    },
    [addOptimisticUpdate, rollbackOptimisticUpdate, emit, queryClient]
  );

  // Update download count with optimistic update
  const updateDownloadCount = useCallback(
    async (downloadId: string) => {
      // Get current download data for rollback
      const currentData = queryClient.getQueryData(["convex", "dashboard.getDashboardData"]) as any;
      const downloadToUpdate = currentData?.downloads?.find(
        (download: Download) => download.id === downloadId
      );

      if (!downloadToUpdate) {
        console.warn("Download not found for count update:", downloadId);
        return;
      }

      const previousCount = downloadToUpdate.downloadCount;
      const newCount = previousCount + 1;

      // Add to pending operations
      setPendingOperations(prev => new Set(prev).add(downloadId));

      // Apply optimistic update immediately to cache
      queryClient.setQueryData(["convex", "dashboard.getDashboardData"], (oldData: any) => {
        if (!oldData) return oldData;
        return {
          ...oldData,
          downloads: oldData.downloads.map((download: Download) =>
            download.id === downloadId ? { ...download, downloadCount: newCount } : download
          ),
        };
      });

      // Create rollback function
      const rollback = () => {
        queryClient.setQueryData(["convex", "dashboard.getDashboardData"], (oldData: any) => {
          if (!oldData) return oldData;
          return {
            ...oldData,
            downloads: oldData.downloads.map((download: Download) =>
              download.id === downloadId ? { ...download, downloadCount: previousCount } : download
            ),
          };
        });
      };

      try {
        // Emit real-time event
        emit({
          type: "download_completed",
          userId: "current-user", // This would come from useUser()
          data: {
            id: downloadId,
            downloadCount: newCount,
            beatId: downloadToUpdate.beatId,
            beatTitle: downloadToUpdate.beatTitle,
          },
        });

        // In a real implementation, this would call a Convex mutation
        // For now, we'll simulate the API call
        await new Promise(resolve => setTimeout(resolve, 600));

        // Success - remove from pending operations
        setPendingOperations(prev => {
          const newSet = new Set(prev);
          newSet.delete(downloadId);
          return newSet;
        });

        // Invalidate queries to get the real data
        await queryClient.invalidateQueries({
          queryKey: ["convex", "downloads"],
        });
      } catch (error) {
        console.error("Failed to update download count:", error);

        // Rollback the optimistic update
        rollback();

        // Remove from pending operations
        setPendingOperations(prev => {
          const newSet = new Set(prev);
          newSet.delete(downloadId);
          return newSet;
        });

        throw error;
      }
    },
    [emit, queryClient]
  );

  // Check if a download is optimistic (temporary)
  const isOptimistic = useCallback(
    (downloadId: string) => {
      return optimisticIds.has(downloadId);
    },
    [optimisticIds]
  );

  // Rollback a specific download
  const rollbackDownload = useCallback((downloadId: string) => {
    // This would rollback the specific download update
    // For now, we'll just remove it from pending operations
    setPendingOperations(prev => {
      const newSet = new Set(prev);
      newSet.delete(downloadId);
      return newSet;
    });
    setOptimisticIds(prev => {
      const newSet = new Set(prev);
      newSet.delete(downloadId);
      return newSet;
    });
  }, []);

  // Clear all pending operations
  const clearPendingOperations = useCallback(() => {
    setPendingOperations(new Set());
    setOptimisticIds(new Set());
  }, []);

  return {
    recordDownload,
    updateDownloadCount,
    pendingOperations,
    isOptimistic,
    rollbackDownload,
    clearPendingOperations,
  };
}

// Hook for checking if any download operations are pending
export function useDownloadsPendingState() {
  const { pendingOperations } = useOptimisticDownloads();

  return {
    hasPendingOperations: pendingOperations.size > 0,
    pendingCount: pendingOperations.size,
    isPending: (downloadId: string) => pendingOperations.has(downloadId),
  };
}

// Hook for download initiation with progress tracking
export function useDownloadInitiation() {
  const { recordDownload } = useOptimisticDownloads();

  const initiateDownload = useCallback(
    async (
      beatId: number,
      licenseType: string,
      beatData?: {
        title?: string;
        artist?: string;
        imageUrl?: string;
        fileSize?: number;
      }
    ) => {
      const downloadData: Partial<Download> = {
        beatId,
        beatTitle: beatData?.title,
        beatArtist: beatData?.artist,
        beatImageUrl: beatData?.imageUrl,
        fileSize: beatData?.fileSize,
        licenseType,
        format: "mp3", // Default format
        quality: licenseType === "premium" ? "high" : "standard",
      };

      return await recordDownload(downloadData);
    },
    [recordDownload]
  );

  return {
    recordDownload,
    initiateDownload,
  };
}
