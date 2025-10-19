/**
 * Status Indicator Component
 *
 * Component to display connection status, data validation status,
 * and other important dashboard indicators in a clear, visible way.
 */

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useDashboardStore } from "@/store/useDashboardStore";
import { AlertTriangle, CheckCircle, Wifi, WifiOff, XCircle } from "lucide-react";
import React from "react";

// ================================
// INTERFACES
// ================================

interface StatusIndicatorProps {
  /** Whether to show connection status */
  showConnection?: boolean;
  /** Whether to show data validation status */
  showValidation?: boolean;
  /** Whether to show mock data detection */
  showMockData?: boolean;
  /** Custom className */
  className?: string;
  /** Layout variant */
  variant?: "horizontal" | "vertical" | "compact";
}

// ================================
// MAIN COMPONENT
// ================================

export const StatusIndicator: React.FC<StatusIndicatorProps> = ({
  showConnection = true,
  showValidation = true,
  showMockData = true,
  className = "",
  variant = "horizontal",
}) => {
  const syncStatus = useDashboardStore(state => state.syncStatus);
  const error = useDashboardStore(state => state.error);
  const data = useDashboardStore(state => state.data);

  // Mock data detection (simplified)
  const hasMockData =
    data?.user?.email?.includes("test") ||
    data?.user?.email?.includes("example") ||
    data?.stats?.totalFavorites === 100; // Example detection

  const getConnectionStatus = () => {
    if (!syncStatus.connected) {
      return {
        icon: <WifiOff className="h-4 w-4" />,
        label: "Disconnected",
        color: "bg-red-100 text-red-800 border-red-200",
      };
    }

    return {
      icon: <Wifi className="h-4 w-4" />,
      label: "Connected",
      color: "bg-green-100 text-green-800 border-green-200",
    };
  };

  const getValidationStatus = () => {
    if (error) {
      return {
        icon: <XCircle className="h-4 w-4" />,
        label: "Issues Detected",
        color: "bg-red-100 text-red-800 border-red-200",
      };
    }

    return {
      icon: <CheckCircle className="h-4 w-4" />,
      label: "All Good",
      color: "bg-green-100 text-green-800 border-green-200",
    };
  };

  const getMockDataStatus = () => {
    if (hasMockData) {
      return {
        icon: <AlertTriangle className="h-4 w-4" />,
        label: "Mock or placeholder data detected",
        color: "bg-yellow-100 text-yellow-800 border-yellow-200",
      };
    }

    return null;
  };

  const connectionStatus = getConnectionStatus();
  const validationStatus = getValidationStatus();
  const mockDataStatus = getMockDataStatus();

  const getLayoutClasses = () => {
    switch (variant) {
      case "vertical":
        return "flex flex-col gap-2";
      case "compact":
        return "flex flex-wrap gap-1";
      case "horizontal":
      default:
        return "flex flex-wrap items-center gap-2";
    }
  };

  return (
    <Card className={cn("border-gray-200 bg-white/50 backdrop-blur-sm", className)}>
      <CardContent className="p-3">
        <div className={getLayoutClasses()}>
          {/* Connection Status */}
          {showConnection && (
            <Badge
              variant="outline"
              className={cn("flex items-center gap-1 text-xs", connectionStatus.color)}
            >
              {connectionStatus.icon}
              {connectionStatus.label}
            </Badge>
          )}

          {/* Mock Data Status */}
          {showMockData && mockDataStatus && (
            <Badge
              variant="outline"
              className={cn("flex items-center gap-1 text-xs", mockDataStatus.color)}
            >
              {mockDataStatus.icon}
              {mockDataStatus.label}
            </Badge>
          )}

          {/* Validation Status */}
          {showValidation && (
            <Badge
              variant="outline"
              className={cn("flex items-center gap-1 text-xs", validationStatus.color)}
            >
              {validationStatus.icon}
              {validationStatus.label}
            </Badge>
          )}

          {/* Additional Info */}
          {syncStatus.lastSync && (
            <Badge variant="outline" className="text-xs text-gray-600">
              Updated: {new Date(syncStatus.lastSync).toLocaleTimeString()}
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default StatusIndicator;
