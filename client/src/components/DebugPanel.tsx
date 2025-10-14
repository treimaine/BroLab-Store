/**
 * Debug panel component for viewing comprehensive logging and debugging information
 * Only available in development mode
 */

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  errorTracker,
  getBreadcrumbs,
  getDebugInfo,
  getErrorPatterns,
  getErrorReports,
} from "@/lib/errorTracker";
import { debugUtils } from "@/lib/logger";
import {
  getPerformanceMetrics,
  getPerformanceSummary,
  performanceMonitor,
} from "@/lib/performanceMonitor";
import type { ErrorSummary, LoggerSummary, PerformanceSummary } from "@/types/debug";
import { Bug, Download, EyeOff, RefreshCw, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";

interface DebugPanelProps {
  readonly isVisible?: boolean;
  readonly onToggle?: (visible: boolean) => void;
}

export function DebugPanel({ isVisible = false, onToggle }: DebugPanelProps) {
  const [isOpen, setIsOpen] = useState(isVisible);
  const [refreshKey, setRefreshKey] = useState(0);
  const [autoRefresh, setAutoRefresh] = useState(false);

  useEffect(() => {
    if (onToggle) {
      onToggle(isOpen);
    }
  }, [isOpen, onToggle]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (autoRefresh) {
      interval = setInterval(() => {
        setRefreshKey(prev => prev + 1);
      }, 5000);
    }
    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [autoRefresh]);

  // Only render in development
  if (process.env.NODE_ENV !== "development") {
    return null;
  }

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
  };

  const handleClearAll = () => {
    errorTracker.clearErrorReports();
    performanceMonitor.clearMetrics();
    handleRefresh();
  };

  const handleExportData = () => {
    const debugData = {
      timestamp: new Date().toISOString(),
      logger: debugUtils.getSummary(),
      errors: getDebugInfo(),
      performance: getPerformanceSummary(),
      errorReports: getErrorReports({ limit: 50 }),
      errorPatterns: getErrorPatterns(),
      breadcrumbs: getBreadcrumbs(50),
      performanceMetrics: getPerformanceMetrics({ limit: 100 }),
    };

    const blob = new Blob([JSON.stringify(debugData, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `mixing-mastering-debug-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (!isOpen) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <Button
          onClick={() => setIsOpen(true)}
          className="bg-purple-600 hover:bg-purple-700 text-white shadow-lg"
          size="sm"
        >
          <Bug className="w-4 h-4 mr-2" />
          Debug
        </Button>
      </div>
    );
  }

  return (
    <div className="fixed inset-4 z-50 bg-black/80 backdrop-blur-sm">
      <Card className="h-full bg-zinc-900 border-zinc-700 text-white overflow-hidden">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center">
              <Bug className="w-5 h-5 mr-2 text-purple-400" />
              Debug Panel - Mixing & Mastering
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button
                onClick={() => setAutoRefresh(!autoRefresh)}
                variant={autoRefresh ? "default" : "outline"}
                size="sm"
              >
                <RefreshCw className={`w-4 h-4 mr-1 ${autoRefresh ? "animate-spin" : ""}`} />
                Auto
              </Button>
              <Button onClick={handleRefresh} variant="outline" size="sm">
                <RefreshCw className="w-4 h-4 mr-1" />
                Refresh
              </Button>
              <Button onClick={handleExportData} variant="outline" size="sm">
                <Download className="w-4 h-4 mr-1" />
                Export
              </Button>
              <Button onClick={handleClearAll} variant="outline" size="sm">
                <Trash2 className="w-4 h-4 mr-1" />
                Clear
              </Button>
              <Button onClick={() => setIsOpen(false)} variant="outline" size="sm">
                <EyeOff className="w-4 h-4 mr-1" />
                Hide
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="h-full overflow-hidden p-0">
          <Tabs defaultValue="overview" className="h-full flex flex-col">
            <TabsList className="grid w-full grid-cols-6 bg-zinc-800">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="errors">Errors</TabsTrigger>
              <TabsTrigger value="performance">Performance</TabsTrigger>
              <TabsTrigger value="breadcrumbs">Breadcrumbs</TabsTrigger>
              <TabsTrigger value="patterns">Patterns</TabsTrigger>
              <TabsTrigger value="metrics">Metrics</TabsTrigger>
            </TabsList>

            <div className="flex-1 overflow-hidden">
              <TabsContent value="overview" className="h-full overflow-auto p-4">
                <OverviewTab key={refreshKey} />
              </TabsContent>
              <TabsContent value="errors" className="h-full overflow-auto p-4">
                <ErrorsTab key={refreshKey} />
              </TabsContent>
              <TabsContent value="performance" className="h-full overflow-auto p-4">
                <PerformanceTab key={refreshKey} />
              </TabsContent>
              <TabsContent value="breadcrumbs" className="h-full overflow-auto p-4">
                <BreadcrumbsTab key={refreshKey} />
              </TabsContent>
              <TabsContent value="patterns" className="h-full overflow-auto p-4">
                <PatternsTab key={refreshKey} />
              </TabsContent>
              <TabsContent value="metrics" className="h-full overflow-auto p-4">
                <MetricsTab key={refreshKey} />
              </TabsContent>
            </div>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

function OverviewTab() {
  const loggerSummary = debugUtils.getSummary() as unknown as LoggerSummary;
  const errorSummary = getDebugInfo() as unknown as ErrorSummary;
  const performanceSummary = getPerformanceSummary() as unknown as PerformanceSummary;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-zinc-800 border-zinc-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-zinc-300">Logger Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <div>
                Session ID:{" "}
                <code className="text-purple-400">{String(loggerSummary.sessionId)}</code>
              </div>
              <div>
                Error Count:{" "}
                <span className="text-red-400">{String(loggerSummary.errorCount)}</span>
              </div>
              <div>
                Page Load:{" "}
                <span className="text-green-400">{String(loggerSummary.pageLoadTime ?? 0)}ms</span>
              </div>
              <div>
                Debug Mode:{" "}
                <span className={loggerSummary.debugMode ? "text-green-400" : "text-yellow-400"}>
                  {loggerSummary.debugMode ? "Enabled" : "Disabled"}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-zinc-800 border-zinc-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-zinc-300">Error Tracking</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <div>
                Total Errors:{" "}
                <span className="text-red-400">{String(errorSummary.totalErrors)}</span>
              </div>
              <div>
                API Errors:{" "}
                <span className="text-orange-400">
                  {String(errorSummary.errorsByType?.api || 0)}
                </span>
              </div>
              <div>
                Auth Errors:{" "}
                <span className="text-yellow-400">
                  {String(errorSummary.errorsByType?.authentication || 0)}
                </span>
              </div>
              <div>
                Critical Errors:{" "}
                <span className="text-red-500">
                  {String(errorSummary.errorsBySeverity?.critical || 0)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-zinc-800 border-zinc-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-zinc-300">Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <div>
                Total Metrics:{" "}
                <span className="text-blue-400">{String(performanceSummary.totalMetrics)}</span>
              </div>
              <div>
                API Calls:{" "}
                <span className="text-green-400">{String(performanceSummary.apiCallsCount)}</span>
              </div>
              <div>
                Avg API Time:{" "}
                <span className="text-purple-400">
                  {Math.round(performanceSummary.averageApiResponseTime || 0)}ms
                </span>
              </div>
              <div>
                Components:{" "}
                <span className="text-cyan-400">{String(performanceSummary.componentCount)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-zinc-800 border-zinc-700">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-zinc-300">Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-xs">
            {getBreadcrumbs(10).map((crumb, index) => {
              const levelClass = getBreadcrumbLevelClass(crumb.level);
              return (
                <div
                  key={`breadcrumb-${crumb.timestamp}-${index}`}
                  className="flex items-center justify-between border-b border-zinc-700 pb-1"
                >
                  <span className={`px-2 py-1 rounded text-xs ${levelClass}`}>
                    {crumb.category}
                  </span>
                  <span className="flex-1 mx-2 text-zinc-300">{crumb.message}</span>
                  <span className="text-zinc-500">
                    {new Date(crumb.timestamp).toLocaleTimeString()}
                  </span>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function ErrorsTab() {
  const errorReports = getErrorReports({ limit: 20 });

  return (
    <div className="space-y-4">
      <div className="text-sm text-zinc-400">Showing {errorReports.length} most recent errors</div>
      {errorReports.map((report, index) => {
        const severityClass = getSeverityClass(report.severity);
        return (
          <Card key={`error-${report.id}-${index}`} className="bg-zinc-800 border-zinc-700">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm text-red-400">{report.context.errorType}</CardTitle>
                <span className={`px-2 py-1 rounded text-xs ${severityClass}`}>
                  {report.severity}
                </span>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <div>
                  <strong>Message:</strong>{" "}
                  {report.error instanceof Error ? report.error.message : String(report.error)}
                </div>
                <div>
                  <strong>Component:</strong> {report.context.component}
                </div>
                <div>
                  <strong>Action:</strong> {report.context.action}
                </div>
                <div>
                  <strong>Time:</strong> {new Date(report.timestamp).toLocaleString()}
                </div>
                {report.context.errorCode && (
                  <div>
                    <strong>Code:</strong> {report.context.errorCode}
                  </div>
                )}
                {report.recoveryActions.length > 0 && (
                  <div>
                    <strong>Recovery Actions:</strong>
                    <ul className="list-disc list-inside ml-2">
                      {report.recoveryActions.slice(0, 3).map((action, actionIndex) => (
                        <li
                          key={`recovery-${report.id}-${actionIndex}`}
                          className="text-xs text-zinc-400"
                        >
                          {action.description}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

function PerformanceTab() {
  const performanceMetrics = getPerformanceMetrics({ limit: 50 });
  const summary = getPerformanceSummary() as unknown as PerformanceSummary;

  return (
    <div className="space-y-4">
      <Card className="bg-zinc-800 border-zinc-700">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-zinc-300">Performance Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>Total Metrics: {String(summary.totalMetrics)}</div>
            <div>API Calls: {String(summary.apiCallsCount)}</div>
            <div>Components: {String(summary.componentCount)}</div>
            <div>User Interactions: {String(summary.userInteractionsCount)}</div>
            <div>Avg API Response: {Math.round(summary.averageApiResponseTime)}ms</div>
            <div>Recent Errors: {String(summary.recentErrors)}</div>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-2">
        <div className="text-sm text-zinc-400">Recent Performance Metrics</div>
        {performanceMetrics.map((metric, index) => (
          <div
            key={`metric-${metric.name}-${metric.timestamp}-${index}`}
            className="flex items-center justify-between bg-zinc-800 p-2 rounded border border-zinc-700 text-sm"
          >
            <span className="text-zinc-300">{metric.name}</span>
            <span className="text-purple-400">
              {metric.value}
              {metric.unit}
            </span>
            <span className="text-zinc-500">{new Date(metric.timestamp).toLocaleTimeString()}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function BreadcrumbsTab() {
  const breadcrumbs = getBreadcrumbs(50);

  return (
    <div className="space-y-2">
      <div className="text-sm text-zinc-400">Showing {breadcrumbs.length} breadcrumbs</div>
      {breadcrumbs.map((crumb, index) => {
        const levelClass = getBreadcrumbLevelClass(crumb.level);
        return (
          <div
            key={`breadcrumb-detail-${crumb.timestamp}-${index}`}
            className="bg-zinc-800 p-3 rounded border border-zinc-700"
          >
            <div className="flex items-center justify-between mb-2">
              <span className={`px-2 py-1 rounded text-xs ${levelClass}`}>{crumb.category}</span>
              <span className="text-zinc-500 text-xs">
                {new Date(crumb.timestamp).toLocaleString()}
              </span>
            </div>
            <div className="text-sm text-zinc-300 mb-2">{crumb.message}</div>
            {crumb.data && (
              <details className="text-xs text-zinc-400">
                <summary className="cursor-pointer">Data</summary>
                <pre className="mt-1 p-2 bg-zinc-900 rounded overflow-auto">
                  {JSON.stringify(crumb.data, null, 2)}
                </pre>
              </details>
            )}
          </div>
        );
      })}
    </div>
  );
}

// Helper functions for CSS classes
function getBreadcrumbLevelClass(level: "info" | "warning" | "error"): string {
  switch (level) {
    case "error":
      return "bg-red-900 text-red-300";
    case "warning":
      return "bg-yellow-900 text-yellow-300";
    default:
      return "bg-blue-900 text-blue-300";
  }
}

function getSeverityClass(severity: "low" | "medium" | "high" | "critical"): string {
  switch (severity) {
    case "critical":
      return "bg-red-900 text-red-300";
    case "high":
      return "bg-orange-900 text-orange-300";
    case "medium":
      return "bg-yellow-900 text-yellow-300";
    default:
      return "bg-blue-900 text-blue-300";
  }
}

function PatternsTab() {
  const patterns = getErrorPatterns();

  return (
    <div className="space-y-4">
      <div className="text-sm text-zinc-400">Error patterns detected: {patterns.length}</div>
      {patterns.map((pattern, index) => (
        <Card key={`pattern-${pattern.type}-${index}`} className="bg-zinc-800 border-zinc-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-orange-400">{pattern.type}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <div>
                Count: <span className="text-red-400">{pattern.count}</span>
              </div>
              <div>
                Frequency:{" "}
                <span className="text-yellow-400">{pattern.frequency.toFixed(2)}/min</span>
              </div>
              <div>
                First Seen:{" "}
                <span className="text-zinc-400">
                  {new Date(pattern.firstSeen).toLocaleString()}
                </span>
              </div>
              <div>
                Last Seen:{" "}
                <span className="text-zinc-400">{new Date(pattern.lastSeen).toLocaleString()}</span>
              </div>
              <details className="text-xs">
                <summary className="cursor-pointer text-zinc-400">Common Context</summary>
                <pre className="mt-1 p-2 bg-zinc-900 rounded overflow-auto">
                  {JSON.stringify(pattern.commonContext, null, 2)}
                </pre>
              </details>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function MetricsTab() {
  const metrics = getPerformanceMetrics({ limit: 100 });
  const groupedMetrics = metrics.reduce(
    (acc, metric) => {
      if (!acc[metric.name]) {
        acc[metric.name] = [];
      }
      acc[metric.name].push(metric);
      return acc;
    },
    {} as Record<string, typeof metrics>
  );

  return (
    <div className="space-y-4">
      {Object.entries(groupedMetrics).map(([name, metricList]) => (
        <Card key={name} className="bg-zinc-800 border-zinc-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-cyan-400">{name}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1 text-xs">
              {metricList.slice(0, 10).map((metric, index) => (
                <div
                  key={`${name}-metric-${metric.timestamp}-${index}`}
                  className="flex items-center justify-between"
                >
                  <span className="text-zinc-300">
                    {metric.value}
                    {metric.unit}
                  </span>
                  <span className="text-zinc-500">
                    {new Date(metric.timestamp).toLocaleTimeString()}
                  </span>
                </div>
              ))}
              {metricList.length > 10 && (
                <div className="text-zinc-500 text-center">
                  ... and {metricList.length - 10} more
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
