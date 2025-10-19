/**
 * Validated Dashboard Component
 *
 * Enhanced dashboard wrapper that integrates real-time data validation,
 * freshness monitoring, and integrity checks. Provides visual indicators
 * for data quality and automatic refresh capabilities.
 */

import {
  DataFreshnessIndicator,
  DetailedDataFreshnessIndicator,
} from "@/components/dashboard/DataFreshnessIndicator";
import { useDataValidation, useProductionDataMonitoring } from "@/hooks/useDataValidation";
import { cn } from "@/lib/utils";
import { useDashboardStore } from "@/store/useDashboardStore";
import { AlertTriangle, CheckCircle, RefreshCw, Shield, Wifi, WifiOff } from "lucide-react";
import React, { useState } from "react";
import MockDataBanner from "../alerts/MockDataBanner";

// ================================
// COMPONENT INTERFACES
// ================================

interface ValidatedDashboardProps {
  /** Child components to render */
  children: React.ReactNode;
  /** Whether to show validation status in header */
  showValidationStatus?: boolean;
  /** Whether to show freshness indicators */
  showFreshnessIndicators?: boolean;
  /** Whether to enable automatic refresh */
  enableAutoRefresh?: boolean;
  /** Whether to show detailed validation info */
  showDetailedValidation?: boolean;
  /** Custom className */
  className?: string;
  /** Callback when validation status changes */
  onValidationChange?: (isValid: boolean, hasMockData: boolean) => void;
}

interface ValidationStatusBarProps {
  isValid: boolean;
  isFresh: boolean;
  hasMockData: boolean;
  needsRefresh: boolean;
  isValidating: boolean;
  onRefresh: () => void;
  showDetailed: boolean;
}

// ================================
// MAIN COMPONENT
// ================================

export const ValidatedDashboard: React.FC<ValidatedDashboardProps> = ({
  children,
  showValidationStatus = true,
  showFreshnessIndicators = true,
  enableAutoRefresh = false,
  showDetailedValidation = false,
  className,
  onValidationChange,
}) => {
  const [showMockDataAlert, setShowMockDataAlert] = useState(false);
  const [dismissedMockAlert, setDismissedMockAlert] = useState(false);

  // Use comprehensive validation for full monitoring
  const validation = useDataValidation({
    includeSourceValidation: true,
    includeCrossValidation: true,
    includeDataValidation: true,
    enableFreshnessMonitoring: true,
    autoRefresh: enableAutoRefresh,
    validateOnChange: true,
    onValidationComplete: report => {
      // Show mock data alert if detected and not dismissed
      if (report.sourceValidation.hasMockData && !dismissedMockAlert) {
        setShowMockDataAlert(true);
      }

      // Notify parent of validation changes
      onValidationChange?.(report.status === "valid", report.sourceValidation.hasMockData);
    },
  });

  // Use production monitoring for alerts
  useProductionDataMonitoring();

  const {
    integrityReport,
    isValid,
    isFresh,
    hasMockData,
    needsRefresh,
    isValidating,
    refreshData,
  } = validation;

  // Get dashboard data and sync status
  const data = useDashboardStore(state => state.data);
  const syncStatus = useDashboardStore(state => state.syncStatus);
  const isLoading = useDashboardStore(state => state.isLoading);

  // Handle refresh
  const handleRefresh = async () => {
    try {
      await refreshData();
    } catch (error) {
      console.error("Failed to refresh dashboard data:", error);
    }
  };

  // Handle mock data alert dismissal
  const handleDismissMockAlert = () => {
    setShowMockDataAlert(false);
    setDismissedMockAlert(true);
  };

  // Show loading state
  if (isLoading || !data) {
    return (
      <div className={cn("flex items-center justify-center p-8", className)}>
        <div className="flex items-center gap-2 text-gray-500">
          <RefreshCw className="h-5 w-5 animate-spin" />
          <span>Loading dashboard data...</span>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Mock Data Banner - Fixed positioning below navbar */}
      <MockDataBanner
        mockIndicators={integrityReport?.sourceValidation.mockIndicators || []}
        onDismiss={handleDismissMockAlert}
        isVisible={showMockDataAlert && !!integrityReport?.sourceValidation.mockIndicators}
      />

      <div className={cn("space-y-4 navbar-spacing pb-20", className)}>
        {/* Validation Status Bar */}
        {showValidationStatus && (
          <ValidationStatusBar
            isValid={isValid}
            isFresh={isFresh}
            hasMockData={hasMockData}
            needsRefresh={needsRefresh}
            isValidating={isValidating}
            onRefresh={handleRefresh}
            showDetailed={showDetailedValidation}
          />
        )}

        {/* Freshness Indicators */}
        {showFreshnessIndicators && (
          <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                {syncStatus.connected ? (
                  <Wifi className="h-4 w-4 text-green-500" />
                ) : (
                  <WifiOff className="h-4 w-4 text-red-500" />
                )}
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {syncStatus.connected ? "Connected" : "Disconnected"}
                </span>
              </div>

              {showDetailedValidation ? (
                <DetailedDataFreshnessIndicator onRefresh={handleRefresh} />
              ) : (
                <DataFreshnessIndicator
                  detailed={false}
                  showRefreshButton={true}
                  onRefresh={handleRefresh}
                />
              )}
            </div>

            {/* Data Quality Indicator */}
            <div className="flex items-center gap-2">
              {isValid ? (
                <div className="flex items-center gap-1 text-green-600">
                  <Shield className="h-4 w-4" />
                  <span className="text-sm font-medium">Validated</span>
                </div>
              ) : (
                <div className="flex items-center gap-1 text-red-600">
                  <AlertTriangle className="h-4 w-4" />
                  <span className="text-sm font-medium">Issues Detected</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Dashboard Content */}
        <div className="relative">
          {/* Validation Overlay for Critical Issues */}
          {integrityReport?.status === "critical" && (
            <div className="absolute inset-0 bg-red-50 dark:bg-red-900/20 border-2 border-red-200 dark:border-red-800 rounded-lg z-10 flex items-center justify-center">
              <div className="text-center p-6">
                <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-red-700 dark:text-red-300 mb-2">
                  Critical Data Issues Detected
                </h3>
                <p className="text-red-600 dark:text-red-400 mb-4">
                  The dashboard data has critical integrity issues that need immediate attention.
                </p>
                <button
                  onClick={handleRefresh}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
                  disabled={isValidating}
                >
                  {isValidating ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin inline mr-2" />
                      Refreshing...
                    </>
                  ) : (
                    "Refresh Data"
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Dashboard Content */}
          {children}

          {/* Detailed Validation Info */}
          {showDetailedValidation && integrityReport && (
            <ValidationDetailsPanel report={integrityReport} />
          )}
        </div>
      </div>
    </>
  );
};

// ================================
// VALIDATION STATUS BAR
// ================================

const ValidationStatusBar: React.FC<ValidationStatusBarProps> = ({
  isValid,
  isFresh,
  hasMockData,
  needsRefresh,
  isValidating,
  onRefresh,
  showDetailed: _showDetailed,
}) => {
  const getStatusColor = () => {
    if (hasMockData) return "bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800";
    if (!isValid)
      return "bg-orange-50 border-orange-200 dark:bg-orange-900/20 dark:border-orange-800";
    if (!isFresh)
      return "bg-yellow-50 border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-800";
    return "bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800";
  };

  const getStatusIcon = () => {
    if (hasMockData || !isValid) return <AlertTriangle className="h-4 w-4 text-red-500" />;
    if (!isFresh) return <RefreshCw className="h-4 w-4 text-yellow-500" />;
    return <CheckCircle className="h-4 w-4 text-green-500" />;
  };

  const getStatusMessage = () => {
    if (hasMockData) return "Mock or placeholder data detected";
    if (!isValid) return "Data validation issues found";
    if (!isFresh) return "Data may be outdated";
    return "Data is valid and up to date";
  };

  return (
    <div
      className={cn("flex items-center justify-between p-3 border rounded-lg", getStatusColor())}
    >
      <div className="flex items-center gap-2">
        {getStatusIcon()}
        <span className="text-sm font-medium">{getStatusMessage()}</span>
        {isValidating && <RefreshCw className="h-4 w-4 animate-spin text-blue-500" />}
      </div>

      {(needsRefresh || !isFresh) && (
        <button
          onClick={onRefresh}
          className="px-3 py-1 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50"
          disabled={isValidating}
        >
          {isValidating ? "Refreshing..." : "Refresh"}
        </button>
      )}
    </div>
  );
};

// ================================
// VALIDATION DETAILS PANEL
// ================================

interface ValidationDetailsPanelProps {
  report: any; // DataIntegrityReport type would be imported
}

const ValidationDetailsPanel: React.FC<ValidationDetailsPanelProps> = ({ report }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-3 text-left hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
      >
        <span className="text-sm font-medium">Validation Details</span>
        <RefreshCw className={cn("h-4 w-4 transition-transform", isExpanded && "rotate-180")} />
      </button>

      {isExpanded && (
        <div className="border-t border-gray-200 dark:border-gray-700 p-3 space-y-3">
          {/* Overall Status */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium">Overall Status:</span>
              <span
                className={cn("ml-2 capitalize", {
                  "text-green-600": (report as any).status === "valid",
                  "text-yellow-600": (report as any).status === "warning",
                  "text-orange-600": (report as any).status === "error",
                  "text-red-600": (report as any).status === "critical",
                })}
              >
                {(report as any).status}
              </span>
            </div>
            <div>
              <span className="font-medium">Report ID:</span>
              <span className="ml-2 text-gray-600 dark:text-gray-400 font-mono text-xs">
                {(report as any).reportId}
              </span>
            </div>
          </div>

          {/* Source Validation */}
          <div>
            <h4 className="text-sm font-medium mb-2">Data Source</h4>
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div
                className={cn("p-2 rounded", {
                  "bg-green-100 text-green-800": (report as any).sourceValidation?.isRealData,
                  "bg-red-100 text-red-800": !(report as any).sourceValidation?.isRealData,
                })}
              >
                {(report as any).sourceValidation?.isRealData ? "Real Data" : "Mock Data"}
              </div>
              <div
                className={cn("p-2 rounded", {
                  "bg-green-100 text-green-800": (report as any).sourceValidation?.isFresh,
                  "bg-yellow-100 text-yellow-800": !(report as any).sourceValidation?.isFresh,
                })}
              >
                {(report as any).sourceValidation?.isFresh ? "Fresh" : "Stale"}
              </div>
              <div className="p-2 rounded bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200">
                {(report as any).sourceValidation?.source || "Unknown"}
              </div>
            </div>
          </div>

          {/* Inconsistencies */}
          {(report as any).inconsistencies?.length > 0 && (
            <div>
              <h4 className="text-sm font-medium mb-2">
                Inconsistencies ({(report as any).inconsistencies.length})
              </h4>
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {(report as any).inconsistencies.map((inconsistency: any, index: number) => (
                  <div key={index} className="text-xs p-2 bg-gray-50 dark:bg-gray-800 rounded">
                    <div className="font-medium">{inconsistency.type}</div>
                    <div className="text-gray-600 dark:text-gray-400">
                      {inconsistency.description}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recommendations */}
          {(report as any).recommendations?.length > 0 && (
            <div>
              <h4 className="text-sm font-medium mb-2">Recommendations</h4>
              <div className="space-y-1">
                {(report as any).recommendations.map((rec: unknown, index: number) => {
                  // Type guard for recommendation object
                  const isValidRec = (
                    obj: unknown
                  ): obj is { type?: string; description?: string } => {
                    return typeof obj === "object" && obj !== null;
                  };

                  if (!isValidRec(rec)) {
                    return null;
                  }

                  return (
                    <div key={index} className="text-xs p-2 bg-blue-50 dark:bg-blue-900/20 rounded">
                      <div className="font-medium capitalize">
                        {rec.type?.replaceAll("_", " ") || "Unknown"}
                      </div>
                      <div className="text-gray-600 dark:text-gray-400">
                        {rec.description || "No description available"}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ValidatedDashboard;
