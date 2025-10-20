/**
 * Optimistic Download Button Example
 *
 * Demonstrates how to implement optimistic updates for downloads
 * with immediate UI feedback and quota management.
 */

import { useOptimisticDownloads } from "@/hooks/useOptimisticUpdates";
import { useDashboardSection } from "@/stores/useDashboardStore";
import type { Download as DownloadType } from "@shared/types/dashboard";
import { AlertCircle, Check, Download } from "lucide-react";
import React, { useState } from "react";

export interface OptimisticDownloadButtonProps {
  /** Beat ID to download */
  beatId: number;
  /** License type for the download */
  licenseType: string;
  /** Beat data for creating download record */
  beatData: {
    title: string;
    artist?: string;
    imageUrl?: string;
    fileSize?: number;
  };
  /** Custom CSS classes */
  className?: string;
  /** Button variant */
  variant?: "primary" | "secondary" | "outline";
  /** Button size */
  size?: "sm" | "md" | "lg";
  /** Whether button is disabled */
  disabled?: boolean;
}

/**
 * Download button with optimistic updates and quota checking
 */
export const OptimisticDownloadButton: React.FC<OptimisticDownloadButtonProps> = ({
  beatId,
  licenseType,
  beatData,
  className = "",
  variant = "primary",
  size = "md",
  disabled = false,
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [downloadState, setDownloadState] = useState<"idle" | "downloading" | "success" | "error">(
    "idle"
  );

  const { addDownload } = useOptimisticDownloads();

  // Get current downloads and user stats
  const downloads = useDashboardSection("downloads") || [];
  const userStats = useDashboardSection("stats");

  // Check if beat is already downloaded
  const existingDownload = downloads.find(
    (dl: DownloadType) => dl.beatId === beatId && dl.licenseType === licenseType
  );
  const isAlreadyDownloaded = !!existingDownload;

  // Check quota limits
  const quotaExceeded = userStats && userStats.quotaUsed >= userStats.quotaLimit;
  const canDownload = !isAlreadyDownloaded && !quotaExceeded && !disabled;

  // Handle download
  const handleDownload = async () => {
    if (!canDownload || isProcessing) return;

    setIsProcessing(true);
    setDownloadState("downloading");

    try {
      // Apply optimistic update
      await addDownload(beatId, licenseType, beatData);

      setDownloadState("success");

      // Reset state after showing success
      setTimeout(() => {
        setDownloadState("idle");
        setIsProcessing(false);
      }, 2000);
    } catch (error) {
      console.error("Failed to download:", error);
      setDownloadState("error");

      // Reset state after showing error
      setTimeout(() => {
        setDownloadState("idle");
        setIsProcessing(false);
      }, 3000);
    }
  };

  // Get button variant classes
  const getVariantClasses = () => {
    if (isAlreadyDownloaded) {
      return "bg-green-100 text-green-700 border-green-200";
    }

    if (!canDownload) {
      return "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed";
    }

    switch (variant) {
      case "primary":
        return "bg-blue-600 text-white border-blue-600 hover:bg-blue-700 hover:border-blue-700";
      case "secondary":
        return "bg-gray-600 text-white border-gray-600 hover:bg-gray-700 hover:border-gray-700";
      case "outline":
        return "bg-transparent text-blue-600 border-blue-600 hover:bg-blue-50";
      default:
        return "bg-blue-600 text-white border-blue-600 hover:bg-blue-700 hover:border-blue-700";
    }
  };

  // Get button size classes
  const getSizeClasses = () => {
    switch (size) {
      case "sm":
        return "px-3 py-1.5 text-sm";
      case "md":
        return "px-4 py-2 text-sm";
      case "lg":
        return "px-6 py-3 text-base";
      default:
        return "px-4 py-2 text-sm";
    }
  };

  // Get icon size classes
  const getIconSizeClasses = () => {
    switch (size) {
      case "sm":
        return "w-4 h-4";
      case "md":
        return "w-4 h-4";
      case "lg":
        return "w-5 h-5";
      default:
        return "w-4 h-4";
    }
  };

  // Get button content based on state
  const getButtonContent = () => {
    if (isAlreadyDownloaded) {
      return (
        <>
          <Check className={`${getIconSizeClasses()} mr-2`} />
          Downloaded
        </>
      );
    }

    if (quotaExceeded) {
      return (
        <>
          <AlertCircle className={`${getIconSizeClasses()} mr-2`} />
          Quota Exceeded
        </>
      );
    }

    switch (downloadState) {
      case "downloading":
        return (
          <>
            <div
              className={`${getIconSizeClasses()} mr-2 border-2 border-current border-t-transparent rounded-full animate-spin`}
            />
            Downloading...
          </>
        );
      case "success":
        return (
          <>
            <Check className={`${getIconSizeClasses()} mr-2`} />
            Downloaded!
          </>
        );
      case "error":
        return (
          <>
            <AlertCircle className={`${getIconSizeClasses()} mr-2`} />
            Failed
          </>
        );
      default:
        return (
          <>
            <Download className={`${getIconSizeClasses()} mr-2`} />
            Download ({licenseType})
          </>
        );
    }
  };

  return (
    <div className="flex flex-col gap-1">
      <button
        onClick={handleDownload}
        disabled={!canDownload || isProcessing}
        className={`
          inline-flex items-center justify-center
          border rounded-md font-medium
          transition-all duration-200
          ${getSizeClasses()}
          ${getVariantClasses()}
          ${className}
        `}
      >
        {getButtonContent()}
      </button>

      {/* Quota indicator */}
      {userStats && (
        <div className="text-xs text-gray-500">
          {userStats.quotaUsed}/{userStats.quotaLimit} downloads used
        </div>
      )}

      {/* Error message */}
      {downloadState === "error" && (
        <div className="text-xs text-red-600">Download failed. Please try again.</div>
      )}
    </div>
  );
};

export default OptimisticDownloadButton;
