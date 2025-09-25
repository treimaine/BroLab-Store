/**
 * Downloads Tab Component
 *
 * Code-split downloads tab using virtual scrolling for performance.
 * This component is lazy-loaded to improve initial bundle size.
 */

import { memo } from "react";
import { VirtualDownloadsTable } from "../VirtualDownloadsTable";

interface DownloadItem {
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
}

interface DownloadsTabProps {
  downloads: DownloadItem[];
  isLoading?: boolean;
  onRefresh?: () => void;
}

const DownloadsTab = memo<DownloadsTabProps>(({ downloads, isLoading = false, onRefresh }) => {
  return (
    <VirtualDownloadsTable
      downloads={downloads}
      isLoading={isLoading}
      onRefresh={onRefresh}
      containerHeight={500}
    />
  );
});

DownloadsTab.displayName = "DownloadsTab";

export default DownloadsTab;
