/**
 * Sync Monitoring Integration Example
 *
 * Example component showing how to integrate the performance monitoring
 * system with dashboard components for real-time sync tracking.
 */

import { SyncDebugPanel } from "@/components/debug/SyncDebugPanel";
import { PerformanceMonitoringDashboard } from "@/components/monitoring/PerformanceMonitoringDashboard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { usePerformanceAlerts, useSyncMetrics, useSyncMonitoring } from "@/hooks/useSyncMonitoring";
import { SyncErrorType } from "@/services";
import { useDashboardStore } from "@/store/useDashboardStore";
import { AlertTriangle, BarChart3, Bug, CheckCircle, Play, Settings } from "lucide-react";
import React, { useState } from "react";

// ================================
// MONITORING STATUS WIDGET
// ================================

const MonitoringStatusWidget: React.FC = () => {
  const { metrics, isHealthy, performanceScore } = useSyncMetrics();
  const { alertCount, hasCriticalAlerts } = usePerformanceAlerts();
  const { isMonitoring, startMonitoring, stopMonitoring } = useSyncMonitoring();

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Sync Monitoring</CardTitle>
        <div className="flex items-center space-x-2">
          {hasCriticalAlerts && <AlertTriangle className="h-4 w-4 text-red-500" />}
          {isHealthy ? (
            <CheckCircle className="h-4 w-4 text-green-500" />
          ) : (
            <AlertTriangle className="h-4 w-4 text-yellow-500" />
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Performance Score */}
          <div>
            <div className="flex items-center justify-between text-sm">
              <span>Performance Score</span>
              <span className="font-medium">{performanceScore}/100</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
              <div
                className={`h-2 rounded-full ${
                  performanceScore >= 80
                    ? "bg-green-500"
                    : performanceScore >= 60
                      ? "bg-yellow-500"
                      : "bg-red-500"
                }`}
                style={{ width: `${performanceScore}%` }}
              />
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Latency</p>
              <p className="font-medium">{metrics.averageLatency.toFixed(0)}ms</p>
            </div>
            <div>
              <p className="text-muted-foreground">Success Rate</p>
              <p className="font-medium">{metrics.successRate.toFixed(1)}%</p>
            </div>
            <div>
              <p className="text-muted-foreground">Errors</p>
              <p className="font-medium text-red-600">{metrics.errorCount}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Alerts</p>
              <p className="font-medium text-yellow-600">{alertCount}</p>
            </div>
          </div>

          {/* Controls */}
          <div className="flex space-x-2">
            {isMonitoring ? (
              <Button size="sm" variant="outline" onClick={stopMonitoring}>
                Stop Monitoring
              </Button>
            ) : (
              <Button size="sm" onClick={startMonitoring}>
                <Play className="h-3 w-3 mr-1" />
                Start Monitoring
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// ================================
// SYNC OPERATION SIMULATOR
// ================================

const SyncOperationSimulator: React.FC = () => {
  const { trackSyncLatency, trackSyncOperation, trackSyncError } = useSyncMonitoring();
  const forceSync = useDashboardStore(state => state.forceSync);
  const addSyncError = useDashboardStore(state => state.addSyncError);
  const [isSimulating, setIsSimulating] = useState(false);

  const simulateSuccessfulSync = async () => {
    setIsSimulating(true);
    try {
      const startTime = Date.now();

      // Simulate sync operation
      await new Promise(resolve => setTimeout(resolve, Math.random() * 2000 + 500));

      const duration = Date.now() - startTime;
      trackSyncLatency(duration);
      trackSyncOperation(true, duration);

      // Trigger actual sync
      await forceSync();
    } finally {
      setIsSimulating(false);
    }
  };

  const simulateFailedSync = async () => {
    setIsSimulating(true);
    try {
      const startTime = Date.now();

      // Simulate failed operation
      await new Promise(resolve => setTimeout(resolve, Math.random() * 1000 + 200));

      const duration = Date.now() - startTime;
      const timestamp = Date.now();
      const error = {
        type: SyncErrorType.NETWORK_ERROR,
        message: "Simulated network error",
        timestamp,
        context: { simulation: true },
        retryable: true,
        retryCount: 0,
        maxRetries: 3,
        fingerprint: `${SyncErrorType.NETWORK_ERROR}-simulated-${timestamp}`,
      };

      trackSyncOperation(false, duration);
      trackSyncError(error);
      addSyncError(error);
    } finally {
      setIsSimulating(false);
    }
  };

  const simulateHighLatency = async () => {
    setIsSimulating(true);
    try {
      const startTime = Date.now();

      // Simulate high latency operation
      await new Promise(resolve => setTimeout(resolve, Math.random() * 8000 + 5000)); // 5-13 seconds

      const duration = Date.now() - startTime;
      trackSyncLatency(duration);
      trackSyncOperation(true, duration);
    } finally {
      setIsSimulating(false);
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="text-sm font-medium">Sync Simulator</CardTitle>
        <CardDescription>Simulate different sync scenarios to test monitoring</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <Button
            size="sm"
            className="w-full"
            onClick={simulateSuccessfulSync}
            disabled={isSimulating}
          >
            {isSimulating ? "Simulating..." : "Successful Sync"}
          </Button>
          <Button
            size="sm"
            variant="destructive"
            className="w-full"
            onClick={simulateFailedSync}
            disabled={isSimulating}
          >
            {isSimulating ? "Simulating..." : "Failed Sync"}
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="w-full"
            onClick={simulateHighLatency}
            disabled={isSimulating}
          >
            {isSimulating ? "Simulating..." : "High Latency Sync"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

// ================================
// MAIN EXAMPLE COMPONENT
// ================================

export const SyncMonitoringExample: React.FC = () => {
  const [activeTab, setActiveTab] = useState<"overview" | "dashboard" | "debug">("overview");

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="flex space-x-4 border-b">
        <button
          onClick={() => setActiveTab("overview")}
          className={`pb-2 px-1 border-b-2 font-medium text-sm ${
            activeTab === "overview"
              ? "border-blue-500 text-blue-600"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          <BarChart3 className="h-4 w-4 inline mr-2" />
          Overview
        </button>
        <button
          onClick={() => setActiveTab("dashboard")}
          className={`pb-2 px-1 border-b-2 font-medium text-sm ${
            activeTab === "dashboard"
              ? "border-blue-500 text-blue-600"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          <Settings className="h-4 w-4 inline mr-2" />
          Dashboard
        </button>
        <button
          onClick={() => setActiveTab("debug")}
          className={`pb-2 px-1 border-b-2 font-medium text-sm ${
            activeTab === "debug"
              ? "border-blue-500 text-blue-600"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          <Bug className="h-4 w-4 inline mr-2" />
          Debug
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <MonitoringStatusWidget />
            <SyncOperationSimulator />
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Integration Guide</CardTitle>
              <CardDescription>
                How to integrate sync monitoring into your dashboard components
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-medium mb-2">1. Add Monitoring Hook</h4>
                  <pre className="text-xs bg-gray-100 p-2 rounded overflow-x-auto">
                    {`import { useSyncMonitoring } from "@/hooks/useSyncMonitoring";

const MyComponent = () => {
  const { metrics, alerts, generateReport } = useSyncMonitoring();
  // Use metrics and alerts in your component
};`}
                  </pre>
                </div>

                <div>
                  <h4 className="text-sm font-medium mb-2">2. Track Sync Operations</h4>
                  <pre className="text-xs bg-gray-100 p-2 rounded overflow-x-auto">
                    {`const { trackSyncLatency, trackSyncOperation } = useSyncMonitoring();

const performSync = async () => {
  const startTime = Date.now();
  try {
    await syncData();
    const duration = Date.now() - startTime;
    trackSyncLatency(duration);
    trackSyncOperation(true, duration);
  } catch (error) {
    trackSyncOperation(false, Date.now() - startTime);
  }
};`}
                  </pre>
                </div>

                <div>
                  <h4 className="text-sm font-medium mb-2">3. Display Performance Metrics</h4>
                  <pre className="text-xs bg-gray-100 p-2 rounded overflow-x-auto">
                    {`const { metrics, isHealthy } = useSyncMetrics();

return (
  <div>
    <span>Latency: {metrics.averageLatency}ms</span>
    <span>Success Rate: {metrics.successRate}%</span>
    <span>Status: {isHealthy ? "Healthy" : "Issues"}</span>
  </div>
);`}
                  </pre>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === "dashboard" && <PerformanceMonitoringDashboard />}

      {activeTab === "debug" && <SyncDebugPanel />}
    </div>
  );
};

export default SyncMonitoringExample;
