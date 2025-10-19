/**
 * Performance Monitoring Dashboard Component
 *
 * Comprehensive dashboard for displaying sync performance metrics, alerts,
 * memory usage, and performance reports with real-time updates.
 */

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  useMemoryMonitoring,
  usePerformanceAlerts,
  usePerformanceReports,
  useSyncMetrics,
  useThresholdManagement,
} from "@/hooks/useSyncMonitoring";
import type { PerformanceThreshold } from "@/services/SyncMonitoring";
import type { TimePeriod } from "@shared/types/sync";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  CheckCircle,
  Download,
  HardDrive,
  Settings,
  TrendingDown,
  TrendingUp,
  XCircle,
} from "lucide-react";
import React, { useState } from "react";

// ================================
// PERFORMANCE METRICS CARD
// ================================

const PerformanceMetricsCard: React.FC = () => {
  const { metrics, isHealthy, performanceScore } = useSyncMetrics();

  const getLatencyColor = (latency: number) => {
    if (latency < 1000) return "text-green-600";
    if (latency < 3000) return "text-yellow-600";
    return "text-red-600";
  };

  const getSuccessRateColor = (rate: number) => {
    if (rate >= 95) return "text-green-600";
    if (rate >= 90) return "text-yellow-600";
    return "text-red-600";
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Sync Performance</CardTitle>
        {isHealthy ? (
          <CheckCircle className="h-4 w-4 text-green-600" />
        ) : (
          <XCircle className="h-4 w-4 text-red-600" />
        )}
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Performance Score */}
          <div>
            <div className="flex items-center justify-between text-sm">
              <span>Performance Score</span>
              <span className="font-medium">{performanceScore}/100</span>
            </div>
            <Progress value={performanceScore} className="mt-2" />
          </div>

          {/* Metrics Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Avg Latency</p>
              <p className={`text-sm font-medium ${getLatencyColor(metrics.averageLatency)}`}>
                {metrics.averageLatency.toFixed(0)}ms
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Success Rate</p>
              <p className={`text-sm font-medium ${getSuccessRateColor(metrics.successRate)}`}>
                {metrics.successRate.toFixed(1)}%
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Errors</p>
              <p className="text-sm font-medium text-red-600">{metrics.errorCount}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Reconnects</p>
              <p className="text-sm font-medium text-yellow-600">{metrics.reconnectCount}</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// ================================
// ALERTS CARD
// ================================

const AlertsCard: React.FC = () => {
  const { alerts, criticalAlerts, warningAlerts, alertCount, resolveAlert } =
    usePerformanceAlerts();

  if (alertCount === 0) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Performance Alerts</CardTitle>
          <CheckCircle className="h-4 w-4 text-green-600" />
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No active alerts</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Performance Alerts</CardTitle>
        <div className="flex items-center space-x-2">
          {criticalAlerts.length > 0 && (
            <span className="flex items-center text-xs text-red-600">
              <XCircle className="h-3 w-3 mr-1" />
              {criticalAlerts.length}
            </span>
          )}
          {warningAlerts.length > 0 && (
            <span className="flex items-center text-xs text-yellow-600">
              <AlertTriangle className="h-3 w-3 mr-1" />
              {warningAlerts.length}
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {alerts.map(alert => (
            <div
              key={alert.id}
              className={`p-2 rounded-md border ${
                alert.severity === "critical"
                  ? "border-red-200 bg-red-50"
                  : "border-yellow-200 bg-yellow-50"
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-xs font-medium">{alert.threshold.name}</p>
                  <p className="text-xs text-muted-foreground mt-1">{alert.message}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(alert.timestamp).toLocaleTimeString()}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => resolveAlert(alert.id)}
                  className="h-6 w-6 p-0"
                >
                  <XCircle className="h-3 w-3" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

// ================================
// MEMORY MONITORING CARD
// ================================

const MemoryMonitoringCard: React.FC = () => {
  const { memoryStats, memoryTrend, memoryGrowthRate, isMemoryHealthy } = useMemoryMonitoring();

  if (!memoryStats) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Memory Usage</CardTitle>
          <HardDrive className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No memory data available</p>
        </CardContent>
      </Card>
    );
  }

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  };

  const memoryUsagePercent = Math.min(
    100,
    (memoryStats.totalMemoryUsage / (100 * 1024 * 1024)) * 100
  );

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Memory Usage</CardTitle>
        <div className="flex items-center space-x-2">
          {memoryTrend === "increasing" ? (
            <TrendingUp className="h-4 w-4 text-red-600" />
          ) : memoryTrend === "decreasing" ? (
            <TrendingDown className="h-4 w-4 text-green-600" />
          ) : (
            <Activity className="h-4 w-4 text-muted-foreground" />
          )}
          {isMemoryHealthy ? (
            <CheckCircle className="h-4 w-4 text-green-600" />
          ) : (
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Total Memory Usage */}
          <div>
            <div className="flex items-center justify-between text-sm">
              <span>Total Usage</span>
              <span className="font-medium">{formatBytes(memoryStats.totalMemoryUsage)}</span>
            </div>
            <Progress value={memoryUsagePercent} className="mt-2" />
          </div>

          {/* Memory Breakdown */}
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div className="space-y-1">
              <p className="text-muted-foreground">Cache</p>
              <p className="font-medium">{formatBytes(memoryStats.cacheSize)}</p>
            </div>
            <div className="space-y-1">
              <p className="text-muted-foreground">Events</p>
              <p className="font-medium">{formatBytes(memoryStats.eventHistorySize)}</p>
            </div>
            <div className="space-y-1">
              <p className="text-muted-foreground">Subscriptions</p>
              <p className="font-medium">{memoryStats.subscriptionCount}</p>
            </div>
            <div className="space-y-1">
              <p className="text-muted-foreground">Pending</p>
              <p className="font-medium">{memoryStats.pendingUpdatesCount}</p>
            </div>
          </div>

          {/* Growth Rate */}
          {memoryGrowthRate !== 0 && (
            <div className="text-xs">
              <p className="text-muted-foreground">Growth Rate</p>
              <p
                className={`font-medium ${memoryGrowthRate > 0 ? "text-red-600" : "text-green-600"}`}
              >
                {memoryGrowthRate > 0 ? "+" : ""}
                {formatBytes(Math.abs(memoryGrowthRate))}/sample
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

// ================================
// REPORTS TAB
// ================================

const ReportsTab: React.FC = () => {
  const { latestReport, isGenerating, generateReport, exportReport, exportReportCSV } =
    usePerformanceReports();
  const [selectedPeriod, setSelectedPeriod] = useState<TimePeriod>("7d");

  const handleGenerateReport = async () => {
    await generateReport(selectedPeriod);
  };

  const handleExportJSON = () => {
    if (!latestReport) return;

    const json = exportReport(latestReport);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `sync-report-${latestReport.period}-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportCSV = () => {
    if (!latestReport) return;

    const csv = exportReportCSV(latestReport);
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `sync-report-${latestReport.period}-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Report Generation */}
      <Card>
        <CardHeader>
          <CardTitle>Generate Performance Report</CardTitle>
          <CardDescription>
            Generate comprehensive performance analysis for the selected time period
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-4">
            <select
              value={selectedPeriod}
              onChange={e => setSelectedPeriod(e.target.value as TimePeriod)}
              className="px-3 py-2 border rounded-md"
            >
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
              <option value="90d">Last 90 days</option>
              <option value="1y">Last year</option>
            </select>
            <Button onClick={handleGenerateReport} disabled={isGenerating}>
              {isGenerating ? "Generating..." : "Generate Report"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Latest Report */}
      {latestReport && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Performance Report</CardTitle>
                <CardDescription>
                  Generated {new Date(latestReport.generatedAt).toLocaleString()} •{" "}
                  {latestReport.period}
                </CardDescription>
              </div>
              <div className="flex space-x-2">
                <Button size="sm" variant="outline" onClick={handleExportJSON}>
                  <Download className="h-4 w-4 mr-2" />
                  JSON
                </Button>
                <Button size="sm" variant="outline" onClick={handleExportCSV}>
                  <Download className="h-4 w-4 mr-2" />
                  CSV
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* Health Score */}
              <div>
                <h4 className="text-sm font-medium mb-2">Overall Health Score</h4>
                <div className="flex items-center space-x-4">
                  <Progress value={latestReport.summary.healthScore} className="flex-1" />
                  <span className="text-2xl font-bold">{latestReport.summary.healthScore}/100</span>
                </div>
              </div>

              {/* Key Performance Indicators */}
              <div>
                <h4 className="text-sm font-medium mb-3">Key Performance Indicators</h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {Object.entries(latestReport.summary.kpis).map(([key, value]) => (
                    <div key={key} className="p-3 border rounded-md">
                      <p className="text-xs text-muted-foreground capitalize">
                        {key.replace(/([A-Z])/g, " $1").toLowerCase()}
                      </p>
                      <p className="text-lg font-semibold">
                        {typeof value === "number" ? value.toFixed(2) : value}
                        {key.includes("Rate") || key.includes("uptime") ? "%" : ""}
                        {key.includes("Latency") ? "ms" : ""}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Top Issues */}
              {latestReport.summary.topIssues.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium mb-3">Top Issues</h4>
                  <div className="space-y-2">
                    {latestReport.summary.topIssues.map((issue, index) => (
                      <div
                        key={index}
                        className="flex items-center space-x-2 p-2 bg-yellow-50 border border-yellow-200 rounded-md"
                      >
                        <AlertTriangle className="h-4 w-4 text-yellow-600" />
                        <span className="text-sm">{issue}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Recommendations */}
              {latestReport.recommendations.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium mb-3">Recommendations</h4>
                  <div className="space-y-3">
                    {latestReport.recommendations.map(rec => (
                      <div key={rec.id} className="p-3 border rounded-md">
                        <div className="flex items-start justify-between mb-2">
                          <h5 className="text-sm font-medium">{rec.title}</h5>
                          <span
                            className={`px-2 py-1 text-xs rounded-full ${
                              rec.priority === "critical"
                                ? "bg-red-100 text-red-800"
                                : rec.priority === "high"
                                  ? "bg-orange-100 text-orange-800"
                                  : rec.priority === "medium"
                                    ? "bg-yellow-100 text-yellow-800"
                                    : "bg-blue-100 text-blue-800"
                            }`}
                          >
                            {rec.priority}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mb-2">{rec.description}</p>
                        <p className="text-xs">
                          <strong>Expected Impact:</strong> {rec.expectedImpact}
                        </p>
                        <p className="text-xs">
                          <strong>Effort:</strong> {rec.effort}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

// ================================
// THRESHOLDS TAB
// ================================

const ThresholdsTab: React.FC = () => {
  const { thresholds, addThreshold, deleteThreshold } = useThresholdManagement();

  const handleAddThreshold = () => {
    const newThreshold: PerformanceThreshold = {
      name: `threshold_${Date.now()}`,
      metric: "latency",
      value: 5000,
      operator: ">",
      severity: "warning",
      enabled: true,
      windowMs: 60000,
      minSamples: 5,
    };

    addThreshold(newThreshold);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Performance Thresholds</CardTitle>
              <CardDescription>
                Configure performance thresholds to trigger alerts when metrics exceed limits
              </CardDescription>
            </div>
            <Button onClick={handleAddThreshold}>Add Threshold</Button>
          </div>
        </CardHeader>
        <CardContent>
          {thresholds.length === 0 ? (
            <p className="text-sm text-muted-foreground">No thresholds configured</p>
          ) : (
            <div className="space-y-4">
              {thresholds.map(threshold => (
                <div key={threshold.name} className="p-4 border rounded-md">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-medium">{threshold.name}</h4>
                    <div className="flex items-center space-x-2">
                      <span
                        className={`px-2 py-1 text-xs rounded-full ${
                          threshold.severity === "critical"
                            ? "bg-red-100 text-red-800"
                            : "bg-yellow-100 text-yellow-800"
                        }`}
                      >
                        {threshold.severity}
                      </span>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => deleteThreshold(threshold.name)}
                      >
                        <XCircle className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Metric</p>
                      <p className="font-medium">{threshold.metric}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Condition</p>
                      <p className="font-medium">
                        {threshold.operator} {threshold.value}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Window</p>
                      <p className="font-medium">{threshold.windowMs / 1000}s</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Status</p>
                      <p
                        className={`font-medium ${threshold.enabled ? "text-green-600" : "text-red-600"}`}
                      >
                        {threshold.enabled ? "Enabled" : "Disabled"}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

// ================================
// MAIN DASHBOARD COMPONENT
// ================================

export const PerformanceMonitoringDashboard: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <PerformanceMetricsCard />
        <AlertsCard />
        <MemoryMonitoringCard />
      </div>

      {/* Detailed Tabs */}
      <Tabs defaultValue="reports" className="space-y-4">
        <TabsList>
          <TabsTrigger value="reports" className="flex items-center space-x-2">
            <BarChart3 className="h-4 w-4" />
            <span>Reports</span>
          </TabsTrigger>
          <TabsTrigger value="thresholds" className="flex items-center space-x-2">
            <Settings className="h-4 w-4" />
            <span>Thresholds</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="reports">
          <ReportsTab />
        </TabsContent>

        <TabsContent value="thresholds">
          <ThresholdsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default PerformanceMonitoringDashboard;
