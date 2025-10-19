/**
 * Mock Data Alert Component
 *
 * Dedicated component for displaying mock data detection alerts
 * with improved visibility and user experience.
 */

import { AlertTriangle, RefreshCw, X } from "lucide-react";
import React, { useState } from "react";

// ================================
// INTERFACES
// ================================

export interface MockDataIndicator {
  field: string;
  type: "placeholder_text" | "generic_value" | "test_data" | "hardcoded_value" | "lorem_ipsum";
  value: unknown;
  confidence: number;
  reason: string;
}

interface MockDataAlertProps {
  /** Mock data indicators detected */
  mockIndicators: MockDataIndicator[];
  /** Callback when alert is dismissed */
  onDismiss: () => void;
  /** Whether to show detailed information */
  showDetails?: boolean;
  /** Custom className */
  className?: string;
}

// ================================
// MAIN COMPONENT
// ================================

export const MockDataAlert: React.FC<MockDataAlertProps> = ({
  mockIndicators,
  onDismiss,
  showDetails = true,
  className = "",
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleReload = async () => {
    setIsRefreshing(true);
    try {
      // Add a small delay to show the loading state
      await new Promise(resolve => setTimeout(resolve, 500));
      window.location.reload();
    } catch (error) {
      console.error("Failed to reload page:", error);
      setIsRefreshing(false);
    }
  };

  const getIndicatorTypeLabel = (type: MockDataIndicator["type"]) => {
    switch (type) {
      case "placeholder_text":
        return "Placeholder Text";
      case "generic_value":
        return "Generic Value";
      case "test_data":
        return "Test Data";
      case "hardcoded_value":
        return "Hardcoded Value";
      case "lorem_ipsum":
        return "Lorem Ipsum";
      default:
        return "Unknown";
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return "text-red-600";
    if (confidence >= 0.6) return "text-orange-600";
    return "text-yellow-600";
  };

  const highConfidenceIndicators = mockIndicators.filter(indicator => indicator.confidence >= 0.7);
  const lowConfidenceIndicators = mockIndicators.filter(indicator => indicator.confidence < 0.7);

  return (
    <div
      className={`
        bg-red-50 dark:bg-red-900/20 
        border-2 border-red-200 dark:border-red-800 
        rounded-lg p-4 w-full 
        shadow-lg
        ${className}
      `}
      role="alert"
      aria-live="polite"
    >
      <div className="flex items-start gap-3">
        <AlertTriangle className="h-6 w-6 text-red-500 flex-shrink-0 mt-0.5" />

        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-start justify-between mb-3">
            <div>
              <h3 className="text-base font-semibold text-red-700 dark:text-red-300 mb-1">
                Mock Data Detected
              </h3>
              <p className="text-sm text-red-600 dark:text-red-400">
                The dashboard is displaying {mockIndicators.length} mock or placeholder data
                {mockIndicators.length === 1 ? " item" : " items"} instead of real user data.
              </p>
            </div>

            <button
              onClick={onDismiss}
              className="p-1 text-red-400 hover:text-red-600 transition-colors"
              aria-label="Dismiss alert"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Summary */}
          <div className="mb-4">
            <p className="text-sm text-red-600 dark:text-red-400">
              This may indicate a data loading issue or that you're viewing test data.
            </p>
          </div>

          {/* High Confidence Issues */}
          {showDetails && highConfidenceIndicators.length > 0 && (
            <div className="mb-4">
              <h4 className="text-sm font-medium text-red-700 dark:text-red-300 mb-2">
                Critical Issues ({highConfidenceIndicators.length})
              </h4>
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {highConfidenceIndicators.slice(0, 3).map((indicator, index) => (
                  <div
                    key={index}
                    className="bg-red-100 dark:bg-red-800/30 p-2 rounded border-l-4 border-red-500"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="text-xs font-medium text-red-800 dark:text-red-200">
                          {indicator.field}
                        </p>
                        <p className="text-xs text-red-700 dark:text-red-300 mt-1">
                          {indicator.reason}
                        </p>
                      </div>
                      <span
                        className={`text-xs font-medium ${getConfidenceColor(indicator.confidence)}`}
                      >
                        {Math.round(indicator.confidence * 100)}%
                      </span>
                    </div>
                  </div>
                ))}
                {highConfidenceIndicators.length > 3 && (
                  <button
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="text-xs text-red-600 hover:text-red-700 underline"
                  >
                    {isExpanded
                      ? "Show less"
                      : `Show ${highConfidenceIndicators.length - 3} more...`}
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Expanded View */}
          {isExpanded && lowConfidenceIndicators.length > 0 && (
            <div className="mb-4">
              <h4 className="text-sm font-medium text-red-700 dark:text-red-300 mb-2">
                Additional Issues ({lowConfidenceIndicators.length})
              </h4>
              <div className="space-y-1 max-h-24 overflow-y-auto">
                {lowConfidenceIndicators.map((indicator, index) => (
                  <div
                    key={index}
                    className="text-xs text-red-600 dark:text-red-400 flex justify-between"
                  >
                    <span>
                      • {indicator.field}: {indicator.reason}
                    </span>
                    <span className={getConfidenceColor(indicator.confidence)}>
                      {Math.round(indicator.confidence * 100)}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleReload}
              disabled={isRefreshing}
              className="
                px-4 py-2 text-sm font-medium
                bg-red-600 text-white rounded-md 
                hover:bg-red-700 disabled:opacity-50
                transition-colors flex items-center gap-2
              "
            >
              {isRefreshing ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Reloading...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4" />
                  Reload Page
                </>
              )}
            </button>

            <button
              onClick={onDismiss}
              className="
                px-4 py-2 text-sm font-medium
                text-red-600 border border-red-300 rounded-md
                hover:bg-red-50 hover:border-red-400
                transition-colors
              "
            >
              Dismiss
            </button>

            {showDetails && mockIndicators.length > 3 && (
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="text-sm text-red-600 hover:text-red-700 underline"
              >
                {isExpanded ? "Show Less Details" : "Show All Details"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MockDataAlert;
