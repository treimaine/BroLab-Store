import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertCircle, CheckCircle, Clock, Download, FileAudio, RefreshCw } from "lucide-react";
import { memo, useCallback, useMemo } from "react";
import { toast } from "sonner";
import InteractiveDataTable, { TableColumn, TableData } from "./InteractiveDataTable";

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

interface DownloadsTableProps {
  downloads: DownloadItem[];
  isLoading?: boolean;
  onRefresh?: () => void;
  className?: string;
}

const DownloadsTable = memo<DownloadsTableProps>(
  ({ downloads, isLoading = false, onRefresh, className }) => {
    // Configuration of columns - memoized to prevent recreation on every render
    const columns: TableColumn[] = useMemo(
      () => [
        {
          key: "beatTitle",
          label: "Beat",
          sortable: true,
          filterable: true,
          render: (value: string, row: DownloadItem) => (
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <FileAudio className="w-4 h-4 text-blue-500" />
                <p className="font-medium">{value}</p>
              </div>
              {row.artist && <p className="text-sm text-muted-foreground">par {row.artist}</p>}
            </div>
          ),
        },
        {
          key: "format",
          label: "Format",
          sortable: true,
          filterable: true,
          render: (value: string, row: DownloadItem) => (
            <div className="space-y-1">
              <Badge variant="outline" className="uppercase font-mono">
                {value}
              </Badge>
              <p className="text-xs text-muted-foreground">{row.quality}</p>
            </div>
          ),
        },
        {
          key: "fileSize",
          label: "Size",
          sortable: true,
          render: (value: number) => (
            <span className="text-sm font-mono">
              {value < 1 ? `${(value * 1024).toFixed(0)} KB` : `${value.toFixed(1)} MB`}
            </span>
          ),
        },
        {
          key: "licenseType",
          label: "License",
          filterable: true,
          render: (value: string) => (
            <Badge variant="secondary" className="capitalize">
              {value || "Standard"}
            </Badge>
          ),
        },
        {
          key: "downloadCount",
          label: "Downloads",
          sortable: true,
          render: (value: number, row: DownloadItem) => {
            const isLimited = row.maxDownloads && row.maxDownloads > 0;
            const isNearLimit = isLimited && value >= row.maxDownloads! * 0.8;
            const isAtLimit = isLimited && value >= row.maxDownloads!;

            const getTextColor = () => {
              if (isAtLimit) return "text-red-600";
              if (isNearLimit) return "text-orange-600";
              return "text-green-600";
            };

            const getProgressColor = () => {
              if (isAtLimit) return "bg-red-500";
              if (isNearLimit) return "bg-orange-500";
              return "bg-green-500";
            };

            return (
              <div className="space-y-1">
                <div className="flex items-center gap-1">
                  <span className={`font-medium ${getTextColor()}`}>{value}</span>
                  {isLimited && <span className="text-muted-foreground">/ {row.maxDownloads}</span>}
                </div>
                {isLimited && (
                  <div className="w-full bg-gray-200 rounded-full h-1.5">
                    <div
                      className={`h-1.5 rounded-full ${getProgressColor()}`}
                      style={{ width: `${Math.min((value / row.maxDownloads!) * 100, 100)}%` }}
                    />
                  </div>
                )}
              </div>
            );
          },
        },
        {
          key: "downloadedAt",
          label: "First download",
          type: "date",
          sortable: true,
          render: (value: string) => (
            <div className="space-y-1">
              <p className="text-sm">{new Date(value).toLocaleDateString("en-US")}</p>
              <p className="text-xs text-muted-foreground">
                {new Date(value).toLocaleTimeString("en-US", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </div>
          ),
        },
        {
          key: "status",
          label: "Status",
          render: (_, row: DownloadItem) => {
            const isExpired =
              row.isExpired || (row.expiresAt && new Date(row.expiresAt) < new Date());
            const isAtLimit = row.maxDownloads && row.downloadCount >= row.maxDownloads;

            if (isExpired) {
              return (
                <Badge variant="destructive">
                  <AlertCircle className="w-3 h-3 mr-1" />
                  Expired
                </Badge>
              );
            }

            if (isAtLimit) {
              return (
                <Badge variant="secondary">
                  <Clock className="w-3 h-3 mr-1" />
                  Limit reached
                </Badge>
              );
            }

            return (
              <Badge variant="default">
                <CheckCircle className="w-3 h-3 mr-1" />
                Available
              </Badge>
            );
          },
        },
      ],
      []
    );

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

    // Row actions
    const handleRowClick = useCallback(
      (row: TableData) => {
        const download = row as DownloadItem;
        handleDownload(download);
      },
      [handleDownload]
    );

    // Data export
    const handleExport = useCallback(
      (format: "csv" | "pdf") => {
        if (format === "csv") {
          const csvHeaders = columns.map(col => col.label).join(",");
          const csvData = downloads
            .map(download =>
              [
                download.beatTitle,
                download.format,
                download.fileSize,
                download.licenseType || "Standard",
                download.downloadCount,
                download.maxDownloads || "Unlimited",
                new Date(download.downloadedAt).toLocaleDateString("en-US"),
              ].join(",")
            )
            .join("\n");

          const csvContent = `${csvHeaders}\n${csvData}`;
          const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
          const link = document.createElement("a");
          const url = URL.createObjectURL(blob);
          link.setAttribute("href", url);
          link.setAttribute("download", `downloads_${new Date().toISOString().split("T")[0]}.csv`);
          link.style.visibility = "hidden";
          document.body.appendChild(link);
          link.click();
          link.remove();

          toast.success("CSV export downloaded");
        } else {
          toast.info("PDF export under development");
        }
      },
      [downloads, columns]
    );

    // Données formatées pour le tableau - memoized to prevent recreation
    const tableData: TableData[] = useMemo(
      () =>
        downloads.map(download => ({
          id: download.id,
          beatTitle: download.beatTitle,
          artist: download.artist,
          fileSize: download.fileSize,
          format: download.format,
          quality: download.quality,
          downloadedAt: download.downloadedAt,
          downloadCount: download.downloadCount,
          maxDownloads: download.maxDownloads,
          licenseType: download.licenseType,
          downloadUrl: download.downloadUrl,
          isExpired: download.isExpired,
          expiresAt: download.expiresAt,
        })),
      [downloads]
    );

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

    return (
      <div className={className}>
        {/* Quick stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-4 sm:mb-6">
          <div className="bg-gray-900/20 backdrop-blur-sm border border-gray-700/30 p-3 sm:p-4 rounded-lg">
            <div className="flex items-center gap-2">
              <FileAudio className="w-4 h-4 sm:w-5 sm:h-5 text-blue-500" />
              <div>
                <p className="text-xl sm:text-2xl font-bold">{stats.total}</p>
                <p className="text-xs sm:text-sm text-muted-foreground">Total</p>
              </div>
            </div>
          </div>

          <div className="bg-gray-900/20 backdrop-blur-sm border border-gray-700/30 p-3 sm:p-4 rounded-lg">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-green-500" />
              <div>
                <p className="text-xl sm:text-2xl font-bold text-green-600">{stats.available}</p>
                <p className="text-xs sm:text-sm text-muted-foreground">Available</p>
              </div>
            </div>
          </div>

          <div className="bg-gray-900/20 backdrop-blur-sm border border-gray-700/30 p-3 sm:p-4 rounded-lg">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 text-red-500" />
              <div>
                <p className="text-xl sm:text-2xl font-bold text-red-600">{stats.expired}</p>
                <p className="text-xs sm:text-sm text-muted-foreground">Expired</p>
              </div>
            </div>
          </div>

          <div className="bg-gray-900/20 backdrop-blur-sm border border-gray-700/30 p-3 sm:p-4 rounded-lg">
            <div className="flex items-center gap-2">
              <Download className="w-4 h-4 sm:w-5 sm:h-5 text-purple-500" />
              <div>
                <p className="text-xl sm:text-2xl font-bold text-purple-600">
                  {stats.totalSize.toFixed(1)} MB
                </p>
                <p className="text-xs sm:text-sm text-muted-foreground">Total size</p>
              </div>
            </div>
          </div>
        </div>

        <InteractiveDataTable
          title="Downloads"
          description="Access all your downloaded beats"
          columns={columns}
          data={tableData}
          isLoading={isLoading}
          searchPlaceholder="Search by beat, format, or artist..."
          onRowClick={handleRowClick}
          onExport={handleExport}
        />

        {/* Quick actions */}
        <div className="mt-4 flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={onRefresh} disabled={isLoading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const availableDownloads = downloads.filter(
                d => !d.isExpired && (!d.maxDownloads || d.downloadCount < d.maxDownloads)
              );
              if (availableDownloads.length > 0) {
                toast.success(`${availableDownloads.length} downloads available`);
              } else {
                toast.info("No downloads available");
              }
            }}
          >
            <Download className="w-4 h-4 mr-2" />
            Check availability
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const expiringSoon = downloads.filter(d => {
                if (!d.expiresAt) return false;
                const expiryDate = new Date(d.expiresAt);
                const now = new Date();
                const daysDiff = (expiryDate.getTime() - now.getTime()) / (1000 * 3600 * 24);
                return daysDiff <= 7 && daysDiff > 0;
              });

              if (expiringSoon.length > 0) {
                toast.warning(`${expiringSoon.length} download(s) expiring soon`);
              } else {
                toast.success("No downloads expiring soon");
              }
            }}
          >
            <Clock className="w-4 h-4 mr-2" />
            Check expirations
          </Button>
        </div>
      </div>
    );
  }
);

DownloadsTable.displayName = "DownloadsTable";

export default DownloadsTable;
