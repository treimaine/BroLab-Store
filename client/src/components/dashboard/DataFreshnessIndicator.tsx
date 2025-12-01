/**
 * Data Freshness Indicator Component
 *
 * UI component that displays real-time data freshness status, provides
 * visual indicators for data age, and offers manual refresh capabilities.
 * Shows users when data was last updated and alerts about stale data.
 */

import { cn } from "@/lib/utils";
import {
  getDataFreshnessMonitor,
  type FreshnessEvent,
  type FreshnessMonitoringStatus,
} from "@/services/DataFreshnessMonitor";
import {
  getDataValidationService,
  type DataIntegrityReport,
} from "@/services/DataValidationService";
import { useDashboardStore } from "@/stores/useDashboardStore";
import { AlertCircle, CheckCircle, Clock, RefreshCw, Wifi, WifiOff } from "lucide-react";
import React, { useCallback, useEffect, useState } from "react";

// ================================
// COMPONENT INTERFACES
// ================================

interface DataFreshnessIndicatorProps {
  /** Whether to show detailed status */
  detailed?: boolean;
  /** Whether to show refresh button */
  showRefreshButton?: boolean;
  /** Whether to show section-specific indicators */
  showSections?: boolean;
  /** Custom className */
  className?: string;
  /** Callback when refresh is triggered */
  onRefresh?: () => void;
}

interface FreshnessStatusDisplayProps {
  status: FreshnessMonitoringStatus;
  integrityReport?: DataIntegrityReport;
  onRefresh: () => void;
  detailed: boolean;
  showRefreshButton: boolean;
  showSections: boolean;
}

// ================================
// MAIN COMPONENT
// ================================

export const DataFreshnessIndicator: React.FC<DataFreshnessIndicatorProps> = ({
  detailed = false,
  showRefreshButton = true,
  showSections = false,
  className,
  onRefresh,
}) => {
  const [freshnessStatus, setFreshnessStatus] = useState<FreshnessMonitoringStatus | null>(null);
  const [integrityReport, setIntegrityReport] = useState<DataIntegrityReport | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [_lastUpdateTime, setLastUpdateTime] = useState<string>("");

  const data = useDashboardStore(state => state.data);
  const syncStatus = useDashboardStore(state => state.syncStatus);

  // Initialize services
  const freshnessMonitor = getDataFreshnessMonitor();
  const validationService = getDataValidationService();

  // Update freshness status
  const updateFreshnessStatus = useCallback(async () => {
    if (!data) return;

    try {
      const status = await freshnessMonitor.checkFreshness(data);
      setFreshnessStatus(status);

      // Get integrity report for additional context
      const report = await validationService.validateDataIntegrity(data, {
        includeSourceValidation: true,
        includeCrossValidation: true,
        includeDataValidation: false,
        cacheResults: true,
      });
      setIntegrityReport(report);

      // Update last update time
      const freshness = validationService.getDataFreshnessIndicator(report);
      setLastUpdateTime(freshness.lastUpdated);
    } catch (error) {
      console.error("Failed to update freshness status:", error);
    }
  }, [data, freshnessMonitor, validationService]);

  // Handle refresh
  const handleRefresh = useCallback(async () => {
    if (isRefreshing) return;

    setIsRefreshing(true);
    try {
      await freshnessMonitor.forceRefresh();
      await updateFreshnessStatus();
      onRefresh?.();
    } catch (error) {
      console.error("Failed to refresh data:", error);
    } finally {
      setIsRefreshing(false);
    }
  }, [isRefreshing, freshnessMonitor, updateFreshnessStatus, onRefresh]);

  // Set up freshness monitoring
  useEffect(() => {
    if (!data) return;

    // Start monitoring
    freshnessMonitor.startMonitoring();

    // Initial status check
    updateFreshnessStatus();

    // Listen for freshness events
    const unsubscribe = freshnessMonitor.addEventListener((event: FreshnessEvent) => {
      if (event.type === "refresh_completed" || event.type === "freshness_critical") {
        updateFreshnessStatus();
      }
    });

    return () => {
      unsubscribe();
    };
  }, [data, freshnessMonitor, updateFreshnessStatus]);

  // Update status when sync status changes
  useEffect(() => {
    if (syncStatus.connected) {
      updateFreshnessStatus();
    }
  }, [syncStatus.connected, updateFreshnessStatus]);

  if (!freshnessStatus || !data) {
    return null;
  }

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <FreshnessStatusDisplay
        status={freshnessStatus}
        integrityReport={integrityReport || undefined}
        onRefresh={handleRefresh}
        detailed={detailed}
        showRefreshButton={showRefreshButton}
        showSections={showSections}
      />
      {isRefreshing && <RefreshCw className="h-4 w-4 animate-spin text-blue-500" />}
    </div>
  );
};

// ================================
// STATUS DISPLAY COMPONENT
// ================================

const FreshnessStatusDisplay: React.FC<FreshnessStatusDisplayProps> = ({
  status,
  integrityReport,
  onRefresh,
  detailed,
  showRefreshButton,
  showSections,
}) => {
  const getStatusColor = (statusType: string) => {
    switch (statusType) {
      case "fresh":
        return "text-green-500";
      case "warning":
        return "text-yellow-500";
      case "stale":
        return "text-orange-500";
      case "critical":
        return "text-red-500";
      default:
        return "text-gray-500";
    }
  };

  const getStatusIcon = (statusType: string) => {
    switch (statusType) {
      case "fresh":
        return <CheckCircle className="h-4 w-4" />;
      case "warning":
        return <Clock className="h-4 w-4" />;
      case "stale":
        return <AlertCircle className="h-4 w-4" />;
      case "critical":
        return <AlertCircle className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const getStatusMessage = () => {
    if (integrityReport) {
      const freshness = getDataValidationService().getDataFreshnessIndicator(integrityReport);
      return freshness.message;
    }

    switch (status.overallStatus) {
      case "fresh":
        return "Data is up to date";
      case "warning":
        return "Data may be slightly outdated";
      case "stale":
        return "Data is stale and should be refreshed";
      case "critical":
        return "Data is critically outdated";
      default:
        return "Data status unknown";
    }
  };

  const getLastUpdatedMessage = () => {
    if (integrityReport) {
      const freshness = getDataValidationService().getDataFreshnessIndicator(integrityReport);
      return freshness.lastUpdated;
    }

    const lastCheck = status.lastCheck;
    if (lastCheck === 0) return "Never";

    const now = Date.now();
    const age = now - lastCheck;
    const minutes = Math.floor(age / (1000 * 60));

    if (minutes === 0) return "Just now";
    if (minutes === 1) return "1 minute ago";
    if (minutes < 60) return `${minutes} minutes ago`;

    const hours = Math.floor(minutes / 60);
    if (hours === 1) return "1 hour ago";
    return `${hours} hours ago`;
  };

  return (
    <div className="flex items-center gap-2">
      {/* Connection Status */}
      <div className="flex items-center gap-1">
        {status.isActive ? (
          <Wifi className="h-4 w-4 text-green-500" />
        ) : (
          <WifiOff className="h-4 w-4 text-red-500" />
        )}
      </div>

      {/* Freshness Status */}
      <div className={cn("flex items-center gap-1", getStatusColor(status.overallStatus))}>
        {getStatusIcon(status.overallStatus)}
        {detailed && <span className="text-sm font-medium">{getStatusMessage()}</span>}
      </div>

      {/* Last Updated */}
      {detailed && <span className="text-xs text-gray-500">Updated {getLastUpdatedMessage()}</span>}

      {/* Mock Data Warning */}
      {integrityReport?.sourceValidation.hasMockData && (
        <div className="flex items-center gap-1 text-red-500">
          <AlertCircle className="h-4 w-4" />
          <span className="text-xs font-medium">Mock Data</span>
        </div>
      )}

      {/* Refresh Button */}
      {showRefreshButton && (
        <button
          onClick={onRefresh}
          className={cn(
            "flex items-center gap-1 px-2 py-1 text-xs rounded-md transition-colors",
            "hover:bg-gray-100 dark:hover:bg-gray-800",
            status.refreshInProgress && "opacity-50 cursor-not-allowed"
          )}
          disabled={status.refreshInProgress}
          title="Refresh data"
        >
          <RefreshCw className={cn("h-3 w-3", status.refreshInProgress && "animate-spin")} />
          Refresh
        </button>
      )}

      {/* Section Details */}
      {showSections && detailed && <SectionFreshnessDetails sections={status.sections} />}
    </div>
  );
};

// ================================
// SECTION DETAILS COMPONENT
// ================================

interface SectionFreshnessDetailsProps {
  sections: Record<string, unknown>;
}

const SectionFreshnessDetails: React.FC<SectionFreshnessDetailsProps> = ({ sections }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const getSectionStatusColor = (status: string) => {
    switch (status) {
      case "fresh":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      case "warning":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
      case "stale":
        return "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200";
      case "critical":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
    }
  };

  const formatAge = (age: number) => {
    const minutes = Math.floor(age / (1000 * 60));
    if (minutes === 0) return "Just now";
    if (minutes === 1) return "1m";
    if (minutes < 60) return `${minutes}m`;

    const hours = Math.floor(minutes / 60);
    if (hours === 1) return "1h";
    if (hours < 24) return `${hours}h`;

    const days = Math.floor(hours / 24);
    return `${days}d`;
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
      >
        Sections ({Object.keys(sections).length})
      </button>

      {isExpanded && (
        <div className="absolute top-full right-0 mt-1 p-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg z-10 min-w-48">
          <div className="space-y-1">
            {Object.entries(sections).map(([sectionName, sectionStatus]) => (
              <div key={sectionName} className="flex items-center justify-between gap-2">
                <span className="text-xs font-medium capitalize">{sectionName}</span>
                <div className="flex items-center gap-1">
                  <span
                    className={cn(
                      "px-1.5 py-0.5 text-xs rounded-full",
                      getSectionStatusColor(sectionStatus.status)
                    )}
                  >
                    {sectionStatus.status}
                  </span>
                  <span className="text-xs text-gray-500">{formatAge(sectionStatus.age)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// ================================
// COMPACT INDICATOR COMPONENT
// ================================

export const CompactDataFreshnessIndicator: React.FC<{
  className?: string;
  onClick?: () => void;
}> = ({ className, onClick }) => {
  return (
    <DataFreshnessIndicator
      detailed={false}
      showRefreshButton={false}
      showSections={false}
      className={cn("cursor-pointer", className)}
      onRefresh={onClick}
    />
  );
};

// ================================
// DETAILED INDICATOR COMPONENT
// ================================

export const DetailedDataFreshnessIndicator: React.FC<{
  className?: string;
  onRefresh?: () => void;
}> = ({ className, onRefresh }) => {
  return (
    <DataFreshnessIndicator
      detailed={true}
      showRefreshButton={true}
      showSections={true}
      className={className}
      onRefresh={onRefresh}
    />
  );
};

export default DataFreshnessIndicator;
