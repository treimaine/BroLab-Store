/**
 * Virtual Downloads Table Component
 *
 * Optimized version of DownloadsTable that uses virtual scrolling for large download lists.
 * This component provides better performance when dealing with hundreds of downloads.
 *
 * Requirements addressed:
 * - 5.4: Virtual scrolling for large lists (downloads)
 * - 5.1: 50% faster loading times through performance optimization
 * - 2.1: Eliminate unnecessary lazy loading and optimize rendering
 */

import { VirtualScrollList } from "@/components/loading/VirtualScrollList";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { AlertCircle, CheckCircle, Clock, Download, FileAudio, RefreshCw } from "lucide-react";
import { memo, useCallback, useMemo } from "react";
import { toast } from "sonner";

interface DownloadItem {
  id: string;
  beatTitle: string;
  artist?: string;
  fileSize: number; // en MB
  format: "mp3" | "wav" | "flac";
  quality: string; // ex: "320kbps", "24bit/96kHz"
  downloadedAt: string;
  downloadCount: number;
  maxDownloads?: number;
  licenseType?: string;
  downloadUrl: string;
  isExpired?: boolean;
  expiresAt?: string;
}

interface VirtualDownloadsTableProps {
  downloads: DownloadItem[];
  isLoading?: boolean;
  onRefresh?: () => void;
  className?: string;
  containerHeight?: number;
}

// Memoized download row component for virtual scrolling
const VirtualDownloadRow = memo<{
  download: DownloadItem;
  index: number;
  onDownload: (download: DownloadItem) => void;
}>(({ download, index: _index, onDownload }) => {
  const isExpired =
    download.isExpired || (download.expiresAt && new Date(download.expiresAt) < new Date());
  const isAtLimit = download.maxDownloads && download.downloadCount >= download.maxDownloads;
  const isAvailable = !isExpired && !isAtLimit;

  const handleClick = useCallback(() => {
    onDownload(download);
  }, [download, onDownload]);

  const getStatusBadge = () => {
    if (isExpired) {
      return (
        <Badge variant="destructive" className="text-xs">
          <AlertCircle className="w-3 h-3 mr-1" />
          Expired
        </Badge>
      );
    }

    if (isAtLimit) {
      return (
        <Badge variant="secondary" className="text-xs">
          <Clock className="w-3 h-3 mr-1" />
          Limit reached
        </Badge>
      );
    }

    return (
      <Badge variant="default" className="text-xs">
        <CheckCircle className="w-3 h-3 mr-1" />
        Available
      </Badge>
    );
  };

  const getDownloadProgress = () => {
    if (!download.maxDownloads) return null;

    const percentage = Math.min((download.downloadCount / download.maxDownloads) * 100, 100);
    const isNearLimit = percentage >= 80;

    const getProgressColor = (): string => {
      if (isAtLimit) return "bg-red-500";
      if (isNearLimit) return "bg-orange-500";
      return "bg-green-500";
    };

    return (
      <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1">
        <div
          className={`h-1.5 rounded-full ${getProgressColor()}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    );
  };

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        onDownload(download);
      }
    },
    [download, onDownload]
  );

  return (
    <button
      type="button"
      className={cn(
        "flex items-center justify-between p-3 sm:p-4 border-b border-gray-700/30 hover:bg-gray-800/30 transition-colors cursor-pointer w-full text-left",
        !isAvailable && "opacity-60"
      )}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
    >
      {/* Beat Info */}
      <div className="flex items-center space-x-3 flex-1 min-w-0">
        <div className="flex-shrink-0">
          <FileAudio className="w-8 h-8 text-blue-500" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-white truncate text-sm sm:text-base">
            {download.beatTitle}
          </p>
          {download.artist && (
            <p className="text-xs sm:text-sm text-gray-400 truncate">by {download.artist}</p>
          )}
        </div>
      </div>

      {/* Format & Quality */}
      <div className="hidden sm:flex flex-col items-center space-y-1 px-4">
        <Badge variant="outline" className="uppercase font-mono text-xs">
          {download.format}
        </Badge>
        <span className="text-xs text-gray-400">{download.quality}</span>
      </div>

      {/* File Size */}
      <div className="hidden md:block px-4">
        <span className="text-sm font-mono text-gray-300">
          {download.fileSize < 1
            ? `${(download.fileSize * 1024).toFixed(0)} KB`
            : `${download.fileSize.toFixed(1)} MB`}
        </span>
      </div>

      {/* License */}
      <div className="hidden lg:block px-4">
        <Badge variant="secondary" className="capitalize text-xs">
          {download.licenseType || "Standard"}
        </Badge>
      </div>

      {/* Download Count */}
      <div className="flex flex-col items-center px-4">
        <div className="flex items-center gap-1">
          <span
            className={cn(
              "font-medium text-sm",
              isAtLimit && "text-red-600",
              !isAtLimit &&
                download.maxDownloads &&
                download.downloadCount >= download.maxDownloads * 0.8 &&
                "text-orange-600",
              !isAtLimit &&
                !(download.maxDownloads && download.downloadCount >= download.maxDownloads * 0.8) &&
                "text-green-600"
            )}
          >
            {download.downloadCount}
          </span>
          {download.maxDownloads && (
            <span className="text-gray-400 text-sm">/ {download.maxDownloads}</span>
          )}
        </div>
        {getDownloadProgress()}
      </div>

      {/* Status */}
      <div className="flex flex-col items-end space-y-1 px-4">
        {getStatusBadge()}
        <span className="text-xs text-gray-400">
          {new Date(download.downloadedAt).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
          })}
        </span>
      </div>
    </button>
  );
});

VirtualDownloadRow.displayName = "VirtualDownloadRow";

export const VirtualDownloadsTable = memo<VirtualDownloadsTableProps>(
  ({ downloads, isLoading = false, onRefresh, className, containerHeight = 500 }) => {
    // Download handling
    const handleDownload = useCallback((download: DownloadItem) => {
      const isExpired =
        download.isExpired || (download.expiresAt && new Date(download.expiresAt) < new Date());
      const isAtLimit = download.maxDownloads && download.downloadCount >= download.maxDownloads;

      if (isExpired) {
        toast.error("This download has expired");
        return;
      }

      if (isAtLimit) {
        toast.error("Download limit reached");
        return;
      }

      // Simulate download
      const link = document.createElement("a");
      link.href = download.downloadUrl;
      link.download = `${download.beatTitle}.${download.format}`;
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      link.remove();

      toast.success(`Downloading "${download.beatTitle}" started`);
    }, []);

    // Render function for virtual scrolling
    const renderDownload = useCallback(
      (download: DownloadItem, index: number) => {
        return <VirtualDownloadRow download={download} index={index} onDownload={handleDownload} />;
      },
      [handleDownload]
    );

    // Get unique key for each download
    const getDownloadKey = useCallback((download: DownloadItem) => {
      return download.id;
    }, []);

    // Quick stats - memoized for performance
    const stats = useMemo(
      () => ({
        total: downloads.length,
        available: downloads.filter(
          d => !d.isExpired && (!d.maxDownloads || d.downloadCount < d.maxDownloads)
        ).length,
        expired: downloads.filter(
          d => d.isExpired || (d.expiresAt && new Date(d.expiresAt) < new Date())
        ).length,
        totalSize: downloads.reduce((acc, d) => acc + d.fileSize, 0),
      }),
      [downloads]
    );

    if (isLoading) {
      return (
        <Card className={cn("bg-gray-900/50 border-gray-700/50", className)}>
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="flex items-center space-x-2 text-white">
              <Download className="h-5 w-5" />
              <span>Downloads</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-6">
            <div className="space-y-3">
              {Array.from({ length: 5 }, (_, i) => (
                <div
                  key={`skeleton-download-${i}`}
                  className="flex items-center space-x-3 animate-pulse"
                >
                  <div className="w-8 h-8 bg-gray-700 rounded" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-gray-700 rounded w-3/4" />
                    <div className="h-3 bg-gray-700 rounded w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      );
    }

    return (
      <div className={className}>
        {/* Quick stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card className="bg-gray-900/20 backdrop-blur-sm border-gray-700/30">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <FileAudio className="w-5 h-5 text-blue-500" />
                <div>
                  <p className="text-2xl font-bold text-white">{stats.total}</p>
                  <p className="text-sm text-gray-400">Total</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-900/20 backdrop-blur-sm border-gray-700/30">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-500" />
                <div>
                  <p className="text-2xl font-bold text-green-600">{stats.available}</p>
                  <p className="text-sm text-gray-400">Available</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-900/20 backdrop-blur-sm border-gray-700/30">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-red-500" />
                <div>
                  <p className="text-2xl font-bold text-red-600">{stats.expired}</p>
                  <p className="text-sm text-gray-400">Expired</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-900/20 backdrop-blur-sm border-gray-700/30">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Download className="w-5 h-5 text-purple-500" />
                <div>
                  <p className="text-2xl font-bold text-purple-600">
                    {stats.totalSize.toFixed(1)} MB
                  </p>
                  <p className="text-sm text-gray-400">Total size</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Downloads table */}
        <Card className="bg-gray-900/50 border-gray-700/50 backdrop-blur-sm">
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="flex items-center justify-between text-white">
              <div className="flex items-center space-x-2">
                <Download className="h-5 w-5" />
                <span>Downloads</span>
              </div>
              <Button variant="outline" size="sm" onClick={onRefresh} disabled={isLoading}>
                <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
                Refresh
              </Button>
            </CardTitle>
          </CardHeader>

          <CardContent className="p-0">
            {downloads.length > 0 ? (
              <>
                {/* Table Header */}
                <div className="hidden sm:flex items-center justify-between p-3 sm:p-4 border-b border-gray-700/30 bg-gray-800/30 text-sm font-medium text-gray-300">
                  <div className="flex-1">Beat</div>
                  <div className="hidden sm:block px-4">Format</div>
                  <div className="hidden md:block px-4">Size</div>
                  <div className="hidden lg:block px-4">License</div>
                  <div className="px-4">Downloads</div>
                  <div className="px-4">Status</div>
                </div>

                {/* Virtual scrolled content */}
                <VirtualScrollList
                  items={downloads}
                  itemHeight={80} // Approximate height of each download row
                  containerHeight={containerHeight}
                  renderItem={renderDownload}
                  getItemKey={getDownloadKey}
                  overscan={3}
                />
              </>
            ) : (
              <div className="text-center py-8 sm:py-12 px-4 sm:px-6">
                <Download className="w-12 h-12 sm:w-16 sm:h-16 text-gray-600 mx-auto mb-3 sm:mb-4" />
                <p className="text-gray-400 text-sm sm:text-base mb-2">No downloads found</p>
                <p className="text-gray-500 text-xs sm:text-sm">Your downloads will appear here</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }
);

VirtualDownloadsTable.displayName = "VirtualDownloadsTable";

export default VirtualDownloadsTable;
