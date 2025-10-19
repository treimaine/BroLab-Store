/**
 * Sync Debug Panel Component
 *
 * Development and troubleshooting panel that shows real-time sync status,
 * data flow, consistency validation tools, manual sync triggers, and
 * event history viewer for debugging synchronization issues.
 */

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useSyncMonitoring } from "@/hooks/useSyncMonitoring";
import { useDashboardStore } from "@/store/useDashboardStore";
import type { DashboardEvent } from "@shared/types/sync";
import {
  Activity,
  AlertCircle,
  Bug,
  CheckCircle,
  Database,
  Eye,
  Play,
  RefreshCw,
  Settings,
  Trash2,
  Wifi,
  WifiOff,
  Zap,
} from "lucide-react";
import React, { useEffect, useState } from "react";

// ================================
// REAL-TIME STATUS PANEL
// ================================

const RealTimeStatusPanel: React.FC = () => {
  const syncStatus = useDashboardStore(state => state.syncStatus);
  const isLoading = useDashboardStore(state => state.isLoading);
  const error = useDashboardStore(state => state.error);
  const crossTabInfo = useDashboardStore(state => state.getCrossTabInfo());

  const getConnectionIcon = () => {
    if (!syncStatus.connected) return <WifiOff className="h-4 w-4 text-red-500" />;
    if (syncStatus.connectionType === "websocket")
      return <Wifi className="h-4 w-4 text-green-500" />;
    if (syncStatus.connectionType === "polling")
      return <Activity className="h-4 w-4 text-yellow-500" />;
    return <WifiOff className="h-4 w-4 text-gray-500" />;
  };

  const getStatusColor = () => {
    if (error) return "text-red-600";
    if (!syncStatus.connected) return "text-red-600";
    if (syncStatus.connectionType === "polling") return "text-yellow-600";
    return "text-green-600";
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          {getConnectionIcon()}
          <span>Real-time Status</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Connection Status */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-muted-foreground">Connection</p>
              <p className={`text-sm font-medium ${getStatusColor()}`}>
                {syncStatus.connected ? "Connected" : "Disconnected"}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Type</p>
              <p className="text-sm font-medium capitalize">{syncStatus.connectionType}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Last Sync</p>
              <p className="text-sm font-medium">
                {syncStatus.lastSync ? new Date(syncStatus.lastSync).toLocaleTimeString() : "Never"}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Sync Status</p>
              <p className="text-sm font-medium flex items-center space-x-1">
                {syncStatus.syncInProgress ? (
                  <>
                    <RefreshCw className="h-3 w-3 animate-spin" />
                    <span>In Progress</span>
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-3 w-3" />
                    <span>Idle</span>
                  </>
                )}
              </p>
            </div>
          </div>

          {/* Cross-tab Info */}
          <div className="border-t pt-4">
            <p className="text-xs text-muted-foreground mb-2">Cross-tab Sync</p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-muted-foreground">Active Tabs</p>
                <p className="text-sm font-medium">{crossTabInfo.activeTabs}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Current Tab</p>
                <p className="text-sm font-medium">
                  {crossTabInfo.currentTabFocused ? "Focused" : "Background"}
                </p>
              </div>
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <div className="border-t pt-4">
              <div className="flex items-start space-x-2 p-2 bg-red-50 border border-red-200 rounded-md">
                <AlertCircle className="h-4 w-4 text-red-600 mt-0.5" />
                <div className="flex-1">
                  <p className="text-xs font-medium text-red-800">Sync Error</p>
                  <p className="text-xs text-red-700">{error.message}</p>
                </div>
              </div>
            </div>
          )}

          {/* Loading Indicator */}
          {isLoading && (
            <div className="border-t pt-4">
              <div className="flex items-center space-x-2 p-2 bg-blue-50 border border-blue-200 rounded-md">
                <RefreshCw className="h-4 w-4 text-blue-600 animate-spin" />
                <p className="text-xs text-blue-800">Loading...</p>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

// ================================
// DATA CONSISTENCY PANEL
// ================================

const DataConsistencyPanel: React.FC = () => {
  const inconsistencies = useDashboardStore(state => state.inconsistencies);
  const validateData = useDashboardStore(state => state.validateData);
  const validateCrossSection = useDashboardStore(state => state.validateCrossSection);
  const detectInconsistencies = useDashboardStore(state => state.detectInconsistencies);
  const resolveInconsistency = useDashboardStore(state => state.resolveInconsistency);

  const [validationResult, setValidationResult] = useState<any>(null);
  const [crossValidationResult, setCrossValidationResult] = useState<any>(null);

  const handleValidateData = () => {
    const result = validateData();
    setValidationResult(result);
  };

  const handleValidateCrossSection = () => {
    const result = validateCrossSection();
    setCrossValidationResult(result);
  };

  const handleDetectInconsistencies = () => {
    detectInconsistencies();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Database className="h-4 w-4" />
          <span>Data Consistency</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Validation Controls */}
          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={handleValidateData}>
              <CheckCircle className="h-3 w-3 mr-1" />
              Validate Data
            </Button>
            <Button size="sm" onClick={handleValidateCrossSection}>
              <Database className="h-3 w-3 mr-1" />
              Cross-Section Check
            </Button>
            <Button size="sm" onClick={handleDetectInconsistencies}>
              <Bug className="h-3 w-3 mr-1" />
              Detect Issues
            </Button>
          </div>

          {/* Current Inconsistencies */}
          {inconsistencies.length > 0 && (
            <div>
              <h4 className="text-sm font-medium mb-2">Active Inconsistencies</h4>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {inconsistencies.map((inconsistency, index) => (
                  <div
                    key={index}
                    className={`p-2 rounded-md border ${
                      inconsistency.severity === "critical"
                        ? "border-red-200 bg-red-50"
                        : inconsistency.severity === "high"
                          ? "border-orange-200 bg-orange-50"
                          : "border-yellow-200 bg-yellow-50"
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="text-xs font-medium capitalize">{inconsistency.type}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {inconsistency.description}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Sections: {inconsistency.sections.join(", ")}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(inconsistency.detectedAt).toLocaleTimeString()}
                        </p>
                      </div>
                      {inconsistency.autoResolvable && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => resolveInconsistency(inconsistency.detectedAt.toString())}
                          className="h-6 w-6 p-0"
                        >
                          <CheckCircle className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Validation Results */}
          {validationResult && (
            <div>
              <h4 className="text-sm font-medium mb-2">Data Validation Result</h4>
              <div
                className={`p-2 rounded-md border ${
                  validationResult.valid
                    ? "border-green-200 bg-green-50"
                    : "border-red-200 bg-red-50"
                }`}
              >
                <p className="text-xs font-medium">
                  {validationResult.valid ? "✓ Data is valid" : "✗ Validation failed"}
                </p>
                {validationResult.errors?.length > 0 && (
                  <div className="mt-2">
                    <p className="text-xs text-muted-foreground">Errors:</p>
                    {validationResult.errors.map((error: any, index: number) => (
                      <p key={index} className="text-xs text-red-700">
                        • {error.field}: {error.message}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Cross-validation Results */}
          {crossValidationResult && (
            <div>
              <h4 className="text-sm font-medium mb-2">Cross-Section Validation</h4>
              <div
                className={`p-2 rounded-md border ${
                  crossValidationResult.consistent
                    ? "border-green-200 bg-green-50"
                    : "border-red-200 bg-red-50"
                }`}
              >
                <p className="text-xs font-medium">
                  {crossValidationResult.consistent
                    ? "✓ Sections are consistent"
                    : "✗ Inconsistencies found"}
                </p>
                {crossValidationResult.affectedSections?.length > 0 && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Affected: {crossValidationResult.affectedSections.join(", ")}
                  </p>
                )}
                <p className="text-xs text-muted-foreground">
                  Recommended: {crossValidationResult.recommendedAction}
                </p>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

// ================================
// MANUAL SYNC CONTROLS
// ================================

const ManualSyncControls: React.FC = () => {
  const forceSync = useDashboardStore(state => state.forceSync);
  const reset = useDashboardStore(state => state.reset);
  const cleanup = useDashboardStore(state => state.cleanup);
  const clearError = useDashboardStore(state => state.clearError);
  const { resetMetrics } = useSyncMonitoring();

  const [isForceSync, setIsForceSync] = useState(false);

  const handleForceSync = async () => {
    setIsForceSync(true);
    try {
      await forceSync();
    } finally {
      setIsForceSync(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Settings className="h-4 w-4" />
          <span>Manual Controls</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Sync Controls */}
          <div>
            <h4 className="text-sm font-medium mb-2">Sync Operations</h4>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" onClick={handleForceSync} disabled={isForceSync}>
                {isForceSync ? (
                  <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                ) : (
                  <Play className="h-3 w-3 mr-1" />
                )}
                Force Sync
              </Button>
              <Button size="sm" variant="outline" onClick={cleanup}>
                <Trash2 className="h-3 w-3 mr-1" />
                Cleanup
              </Button>
              <Button size="sm" variant="outline" onClick={clearError}>
                <CheckCircle className="h-3 w-3 mr-1" />
                Clear Errors
              </Button>
            </div>
          </div>

          {/* Reset Controls */}
          <div>
            <h4 className="text-sm font-medium mb-2">Reset Operations</h4>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="destructive" onClick={resetMetrics}>
                <Trash2 className="h-3 w-3 mr-1" />
                Reset Metrics
              </Button>
              <Button size="sm" variant="destructive" onClick={reset}>
                <RefreshCw className="h-3 w-3 mr-1" />
                Reset Store
              </Button>
            </div>
          </div>

          {/* Warning */}
          <div className="p-2 bg-yellow-50 border border-yellow-200 rounded-md">
            <p className="text-xs text-yellow-800">
              ⚠️ Reset operations will clear all data and metrics. Use with caution.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// ================================
// EVENT HISTORY VIEWER
// ================================

const EventHistoryViewer: React.FC = () => {
  const [events, setEvents] = useState<DashboardEvent[]>([]);
  const [filter, setFilter] = useState<string>("");
  const [maxEvents, setMaxEvents] = useState(50);

  // Subscribe to dashboard store events
  useEffect(() => {
    const dashboardStore = useDashboardStore.getState();

    const unsubscribe = dashboardStore.subscribe("*", (event: DashboardEvent) => {
      setEvents(prev => {
        const updated = [event, ...prev].slice(0, maxEvents);
        return updated;
      });
    });

    return unsubscribe;
  }, [maxEvents]);

  const filteredEvents = events.filter(event => {
    if (!filter) return true;
    return (
      event.type.toLowerCase().includes(filter.toLowerCase()) ||
      event.source.toLowerCase().includes(filter.toLowerCase()) ||
      JSON.stringify(event.payload).toLowerCase().includes(filter.toLowerCase())
    );
  });

  const getEventIcon = (event: DashboardEvent) => {
    switch (event.type) {
      case "data.updated":
        return <Database className="h-3 w-3 text-blue-500" />;
      case "error.sync":
        return <AlertCircle className="h-3 w-3 text-red-500" />;
      case "connection.status":
        return <Wifi className="h-3 w-3 text-green-500" />;
      case "optimistic.applied":
        return <Zap className="h-3 w-3 text-yellow-500" />;
      case "optimistic.rollback":
        return <RefreshCw className="h-3 w-3 text-orange-500" />;
      default:
        return <Activity className="h-3 w-3 text-gray-500" />;
    }
  };

  const getEventColor = (event: DashboardEvent) => {
    if (event.priority === "critical") return "border-red-200 bg-red-50";
    if (event.priority === "high") return "border-orange-200 bg-orange-50";
    if (event.type.includes("error")) return "border-red-200 bg-red-50";
    return "border-gray-200 bg-gray-50";
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Eye className="h-4 w-4" />
          <span>Event History</span>
        </CardTitle>
        <CardDescription>
          Real-time event stream for debugging synchronization issues
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Controls */}
          <div className="flex items-center space-x-4">
            <input
              type="text"
              placeholder="Filter events..."
              value={filter}
              onChange={e => setFilter(e.target.value)}
              className="flex-1 px-3 py-1 text-sm border rounded-md"
            />
            <select
              value={maxEvents}
              onChange={e => setMaxEvents(Number(e.target.value))}
              className="px-3 py-1 text-sm border rounded-md"
            >
              <option value={25}>25 events</option>
              <option value={50}>50 events</option>
              <option value={100}>100 events</option>
            </select>
            <Button size="sm" variant="outline" onClick={() => setEvents([])}>
              <Trash2 className="h-3 w-3 mr-1" />
              Clear
            </Button>
          </div>

          {/* Event List */}
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {filteredEvents.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No events to display</p>
            ) : (
              filteredEvents.map((event, index) => (
                <div
                  key={`${event.id}-${index}`}
                  className={`p-2 rounded-md border ${getEventColor(event)}`}
                >
                  <div className="flex items-start space-x-2">
                    {getEventIcon(event)}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-medium truncate">{event.type}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(event.timestamp).toLocaleTimeString()}
                        </p>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Source: {event.source}
                        {event.priority && ` • Priority: ${event.priority}`}
                      </p>
                      {event.payload != null && (
                        <details className="mt-1">
                          <summary className="text-xs text-muted-foreground cursor-pointer">
                            Payload
                          </summary>
                          <pre className="text-xs bg-white p-2 rounded border mt-1 overflow-x-auto">
                            {(() => {
                              try {
                                // Safely render payload as string
                                if (typeof event.payload === "string") {
                                  return event.payload;
                                }
                                if (
                                  typeof event.payload === "number" ||
                                  typeof event.payload === "boolean"
                                ) {
                                  return String(event.payload);
                                }
                                if (typeof event.payload === "object" && event.payload !== null) {
                                  return JSON.stringify(event.payload, null, 2);
                                }
                                if (event.payload === null) {
                                  return "null";
                                }
                                if (event.payload === undefined) {
                                  return "undefined";
                                }
                                return String(event.payload);
                              } catch {
                                return "[Non-serializable payload]";
                              }
                            })()}
                          </pre>
                        </details>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// ================================
// OPTIMISTIC UPDATES VIEWER
// ================================

const OptimisticUpdatesViewer: React.FC = () => {
  const pendingUpdates = useDashboardStore(state => state.pendingUpdates);
  const rollbackOptimisticUpdate = useDashboardStore(state => state.rollbackOptimisticUpdate);
  const confirmOptimisticUpdate = useDashboardStore(state => state.confirmOptimisticUpdate);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Zap className="h-4 w-4" />
          <span>Optimistic Updates</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {pendingUpdates.length === 0 ? (
            <p className="text-sm text-muted-foreground">No pending optimistic updates</p>
          ) : (
            <div className="space-y-2">
              {pendingUpdates.map(update => (
                <div
                  key={update.id}
                  className={`p-2 rounded-md border ${
                    update.confirmed
                      ? "border-green-200 bg-green-50"
                      : "border-yellow-200 bg-yellow-50"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="text-xs font-medium">
                        {update.type} in {update.section}
                      </p>
                      <p className="text-xs text-muted-foreground">ID: {update.id}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(update.timestamp).toLocaleTimeString()}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Status: {update.confirmed ? "Confirmed" : "Pending"}
                      </p>
                    </div>
                    {!update.confirmed && (
                      <div className="flex space-x-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => confirmOptimisticUpdate(update.id)}
                          className="h-6 w-6 p-0"
                        >
                          <CheckCircle className="h-3 w-3 text-green-600" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => rollbackOptimisticUpdate(update.id)}
                          className="h-6 w-6 p-0"
                        >
                          <RefreshCw className="h-3 w-3 text-red-600" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

// ================================
// MAIN DEBUG PANEL COMPONENT
// ================================

export const SyncDebugPanel: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* Status Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RealTimeStatusPanel />
        <DataConsistencyPanel />
      </div>

      {/* Detailed Tabs */}
      <Tabs defaultValue="events" className="space-y-4">
        <TabsList>
          <TabsTrigger value="events" className="flex items-center space-x-2">
            <Eye className="h-4 w-4" />
            <span>Events</span>
          </TabsTrigger>
          <TabsTrigger value="updates" className="flex items-center space-x-2">
            <Zap className="h-4 w-4" />
            <span>Updates</span>
          </TabsTrigger>
          <TabsTrigger value="controls" className="flex items-center space-x-2">
            <Settings className="h-4 w-4" />
            <span>Controls</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="events">
          <EventHistoryViewer />
        </TabsContent>

        <TabsContent value="updates">
          <OptimisticUpdatesViewer />
        </TabsContent>

        <TabsContent value="controls">
          <ManualSyncControls />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SyncDebugPanel;
