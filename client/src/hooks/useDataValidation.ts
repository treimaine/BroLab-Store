/**
 * Data Validation Hook
 *
 * React hook that provides easy access to data validation and integrity
 * checking functionality. Automatically validates dashboard data and
 * provides real-time validation status and freshness indicators.
 */

import {
  getDataFreshnessMonitor,
  type FreshnessEvent,
  type FreshnessMonitoringStatus,
} from "@/services/DataFreshnessMonitor";
import {
  getDataValidationService,
  type DataIntegrityReport,
} from "@/services/DataValidationService";
import { useDashboardStore } from "@/store/useDashboardStore";
import type { DashboardData } from "@shared/types/dashboard";
import { useCallback, useEffect, useRef, useState } from "react";

// ================================
// HOOK INTERFACES
// ================================

/**
 * Data validation hook options
 */
export interface UseDataValidationOptions {
  /** Whether to enable automatic validation */
  autoValidate?: boolean;
  /** Validation check interval in milliseconds */
  checkInterval?: number;
  /** Whether to enable freshness monitoring */
  enableFreshnessMonitoring?: boolean;
  /** Whether to auto-refresh stale data */
  autoRefresh?: boolean;
  /** Whether to validate on data changes */
  validateOnChange?: boolean;
  /** Whether to include source validation */
  includeSourceValidation?: boolean;
  /** Whether to include cross-section validation */
  includeCrossValidation?: boolean;
  /** Whether to include data validation */
  includeDataValidation?: boolean;
  /** Custom validation callback */
  onValidationComplete?: (report: DataIntegrityReport) => void;
  /** Custom freshness event callback */
  onFreshnessEvent?: (event: FreshnessEvent) => void;
}

/**
 * Data validation hook return value
 */
export interface UseDataValidationReturn {
  /** Current integrity report */
  integrityReport: DataIntegrityReport | null;
  /** Current freshness status */
  freshnessStatus: FreshnessMonitoringStatus | null;
  /** Whether validation is in progress */
  isValidating: boolean;
  /** Whether data is valid */
  isValid: boolean;
  /** Whether data is fresh */
  isFresh: boolean;
  /** Whether data contains mock/placeholder content */
  hasMockData: boolean;
  /** Whether data needs refresh */
  needsRefresh: boolean;
  /** Last validation timestamp */
  lastValidation: number;
  /** Validation error if any */
  validationError: Error | null;

  // Actions
  /** Manually trigger validation */
  validateNow: () => Promise<void>;
  /** Force data refresh */
  refreshData: () => Promise<void>;
  /** Clear validation cache */
  clearCache: () => void;
  /** Get freshness indicator for UI */
  getFreshnessIndicator: () => {
    status: "fresh" | "stale" | "outdated" | "unknown";
    color: "green" | "yellow" | "red" | "gray";
    message: string;
    lastUpdated: string;
  };
}

// ================================
// DATA VALIDATION HOOK
// ================================

export function useDataValidation(options: UseDataValidationOptions = {}): UseDataValidationReturn {
  const {
    autoValidate = true,
    checkInterval = 30000, // 30 seconds
    enableFreshnessMonitoring = true,
    autoRefresh = false,
    validateOnChange = true,
    includeSourceValidation = true,
    includeCrossValidation = true,
    includeDataValidation = true,
    onValidationComplete,
    onFreshnessEvent,
  } = options;

  // State
  const [integrityReport, setIntegrityReport] = useState<DataIntegrityReport | null>(null);
  const [freshnessStatus, setFreshnessStatus] = useState<FreshnessMonitoringStatus | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [lastValidation, setLastValidation] = useState(0);
  const [validationError, setValidationError] = useState<Error | null>(null);

  // Refs
  const validationTimeoutRef = useRef<NodeJS.Timeout>();
  const lastDataVersionRef = useRef(0);

  // Store data
  const data = useDashboardStore(state => state.data);
  const dataVersion = useDashboardStore(state => state.dataVersion);

  // Services
  const validationService = getDataValidationService();
  const freshnessMonitor = getDataFreshnessMonitor({
    autoRefresh,
    checkInterval,
  });

  // Validate data
  const validateData = useCallback(
    async (dashboardData?: DashboardData) => {
      if (isValidating) return;

      const dataToValidate = dashboardData || data;
      if (!dataToValidate) return;

      setIsValidating(true);
      setValidationError(null);

      try {
        const report = await validationService.validateDataIntegrity(dataToValidate, {
          includeSourceValidation,
          includeCrossValidation,
          includeDataValidation,
          cacheResults: true,
        });

        setIntegrityReport(report);
        setLastValidation(Date.now());

        // Call custom callback
        onValidationComplete?.(report);

        // Log validation results in development
        if (process.env.NODE_ENV === "development") {
          console.log("🔍 Data Validation Report:", {
            status: report.status,
            isRealData: report.sourceValidation.isRealData,
            isFresh: report.sourceValidation.isFresh,
            inconsistencies: report.inconsistencies.length,
            mockIndicators: report.sourceValidation.mockIndicators.length,
          });

          // Warn about mock data in development
          if (report.sourceValidation.hasMockData) {
            console.warn("⚠️ Mock data detected:", report.sourceValidation.mockIndicators);
          }

          // Warn about inconsistencies
          if (report.inconsistencies.length > 0) {
            console.warn("⚠️ Data inconsistencies detected:", report.inconsistencies);
          }
        }

        // Alert about mock data in production
        if (process.env.NODE_ENV === "production" && report.sourceValidation.hasMockData) {
          console.error("🚨 CRITICAL: Mock data detected in production!", {
            mockIndicators: report.sourceValidation.mockIndicators,
            reportId: report.reportId,
          });

          // Could trigger an alert to developers here
          if (typeof window !== "undefined" && "navigator" in window && "sendBeacon" in navigator) {
            try {
              navigator.sendBeacon(
                "/api/alerts/mock-data",
                JSON.stringify({
                  reportId: report.reportId,
                  mockIndicators: report.sourceValidation.mockIndicators,
                  timestamp: Date.now(),
                  userAgent: navigator.userAgent,
                  url: window.location.href,
                })
              );
            } catch (error) {
              console.error("Failed to send mock data alert:", error);
            }
          }
        }
      } catch (error) {
        console.error("Data validation failed:", error);
        setValidationError(error instanceof Error ? error : new Error("Unknown validation error"));
      } finally {
        setIsValidating(false);
      }
    },
    [
      data,
      isValidating,
      validationService,
      includeSourceValidation,
      includeCrossValidation,
      includeDataValidation,
      onValidationComplete,
    ]
  );

  // Update freshness status
  const updateFreshnessStatus = useCallback(async () => {
    if (!data || !enableFreshnessMonitoring) return;

    try {
      const status = await freshnessMonitor.checkFreshness(data);
      setFreshnessStatus(status);
    } catch (error) {
      console.error("Failed to update freshness status:", error);
    }
  }, [data, enableFreshnessMonitoring, freshnessMonitor]);

  // Force data refresh
  const refreshData = useCallback(async () => {
    try {
      await freshnessMonitor.forceRefresh();
      // Validation will be triggered automatically when data updates
    } catch (error) {
      console.error("Failed to refresh data:", error);
      throw error;
    }
  }, [freshnessMonitor]);

  // Clear validation cache
  const clearCache = useCallback(() => {
    setIntegrityReport(null);
    setFreshnessStatus(null);
    setLastValidation(0);
    setValidationError(null);
  }, []);

  // Get freshness indicator
  const getFreshnessIndicator = useCallback(() => {
    if (!integrityReport) {
      return {
        status: "unknown" as const,
        color: "gray" as const,
        message: "Validation pending",
        lastUpdated: "Unknown",
      };
    }

    return validationService.getDataFreshnessIndicator(integrityReport);
  }, [integrityReport, validationService]);

  // Set up automatic validation
  useEffect(() => {
    if (!autoValidate || !data) return;

    // Clear existing timeout
    if (validationTimeoutRef.current) {
      clearTimeout(validationTimeoutRef.current);
    }

    // Schedule validation
    validationTimeoutRef.current = setTimeout(() => {
      validateData();
    }, 100); // Small delay to debounce rapid changes

    return () => {
      if (validationTimeoutRef.current) {
        clearTimeout(validationTimeoutRef.current);
      }
    };
  }, [autoValidate, data, validateData]);

  // Validate on data version changes
  useEffect(() => {
    if (!validateOnChange || !data) return;

    // Only validate if data version actually changed
    if (dataVersion !== lastDataVersionRef.current) {
      lastDataVersionRef.current = dataVersion;
      validateData();
    }
  }, [validateOnChange, data, dataVersion, validateData]);

  // Set up freshness monitoring
  useEffect(() => {
    if (!enableFreshnessMonitoring || !data) return;

    // Start monitoring
    freshnessMonitor.startMonitoring();

    // Initial freshness check
    updateFreshnessStatus();

    // Listen for freshness events
    const unsubscribe = freshnessMonitor.addEventListener((event: FreshnessEvent) => {
      // Update freshness status on relevant events
      if (event.type === "refresh_completed" || event.type === "freshness_critical") {
        updateFreshnessStatus();
      }

      // Call custom callback
      onFreshnessEvent?.(event);

      // Auto-refresh on critical freshness issues
      if (autoRefresh && event.type === "freshness_critical") {
        refreshData().catch(console.error);
      }
    });

    return () => {
      unsubscribe();
    };
  }, [
    enableFreshnessMonitoring,
    data,
    freshnessMonitor,
    updateFreshnessStatus,
    onFreshnessEvent,
    autoRefresh,
    refreshData,
  ]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (validationTimeoutRef.current) {
        clearTimeout(validationTimeoutRef.current);
      }
    };
  }, []);

  // Computed values
  const isValid = integrityReport?.status === "valid";
  const isFresh = integrityReport?.sourceValidation.isFresh ?? true;
  const hasMockData = integrityReport?.sourceValidation.hasMockData ?? false;
  const needsRefresh = integrityReport
    ? validationService.shouldRefreshData(integrityReport)
    : false;

  return {
    integrityReport,
    freshnessStatus,
    isValidating,
    isValid,
    isFresh,
    hasMockData,
    needsRefresh,
    lastValidation,
    validationError,
    validateNow: validateData,
    refreshData,
    clearCache,
    getFreshnessIndicator,
  };
}

// ================================
// SPECIALIZED HOOKS
// ================================

/**
 * Hook for lightweight validation (source validation only)
 */
export function useDataSourceValidation() {
  return useDataValidation({
    includeSourceValidation: true,
    includeCrossValidation: false,
    includeDataValidation: false,
    enableFreshnessMonitoring: false,
  });
}

/**
 * Hook for freshness monitoring only
 */
export function useDataFreshnessMonitoring(autoRefresh = false) {
  return useDataValidation({
    includeSourceValidation: false,
    includeCrossValidation: false,
    includeDataValidation: false,
    enableFreshnessMonitoring: true,
    autoRefresh,
  });
}

/**
 * Hook for comprehensive validation with all checks
 */
export function useComprehensiveDataValidation() {
  return useDataValidation({
    includeSourceValidation: true,
    includeCrossValidation: true,
    includeDataValidation: true,
    enableFreshnessMonitoring: true,
    autoRefresh: false,
    validateOnChange: true,
  });
}

/**
 * Hook for production monitoring (alerts on mock data)
 */
export function useProductionDataMonitoring() {
  return useDataValidation({
    includeSourceValidation: true,
    includeCrossValidation: false,
    includeDataValidation: false,
    enableFreshnessMonitoring: true,
    autoRefresh: true,
    checkInterval: 60000, // 1 minute
    onValidationComplete: report => {
      // Alert on mock data in production
      if (process.env.NODE_ENV === "production" && report.sourceValidation.hasMockData) {
        console.error(
          "🚨 Mock data detected in production:",
          report.sourceValidation.mockIndicators
        );
      }
    },
  });
}
