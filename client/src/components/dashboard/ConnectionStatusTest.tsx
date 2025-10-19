/**
 * Connection Status Test Component
 *
 * Simple test component to verify connection status indicators work correctly.
 * This can be used for testing and demonstration purposes.
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import React, { useState } from "react";
import { ConnectionStatusIndicator } from "./ConnectionStatusIndicator";
import { ConnectionStatusPanel } from "./ConnectionStatusPanel";
import { DashboardConnectionStatus } from "./DashboardConnectionStatus";
import { DataSyncIndicator } from "./DataSyncIndicator";

export const ConnectionStatusTest: React.FC = () => {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    // Simulate refresh delay
    await new Promise(resolve => setTimeout(resolve, 2000));
    setIsRefreshing(false);
  };

  return (
    <div className="p-6 space-y-6 bg-gray-100 min-h-screen">
      <h1 className="text-2xl font-bold text-gray-900">Connection Status Components Test</h1>

      {/* Connection Status Indicator - Compact */}
      <Card>
        <CardHeader>
          <CardTitle>Connection Status Indicator - Compact</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <ConnectionStatusIndicator compact />
            <span className="text-sm text-gray-600">Compact version for headers</span>
          </div>
        </CardContent>
      </Card>

      {/* Connection Status Indicator - Full */}
      <Card>
        <CardHeader>
          <CardTitle>Connection Status Indicator - Full</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <ConnectionStatusIndicator
              showDetails
              showMetrics
              showDataFreshness
              lastSyncTime={new Date().toLocaleTimeString()}
              onRefresh={handleRefresh}
            />
            <span className="text-sm text-gray-600">Full version with dropdown</span>
          </div>
        </CardContent>
      </Card>

      {/* Dashboard Connection Status */}
      <Card>
        <CardHeader>
          <CardTitle>Dashboard Connection Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <DashboardConnectionStatus
              onRefresh={handleRefresh}
              lastSyncTime={new Date().toLocaleTimeString()}
            />
            <span className="text-sm text-gray-600">Dashboard header version</span>
          </div>
        </CardContent>
      </Card>

      {/* Enhanced Data Sync Indicator */}
      <Card>
        <CardHeader>
          <CardTitle>Enhanced Data Sync Indicator</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <DataSyncIndicator
              isLoading={isRefreshing}
              onRefresh={handleRefresh}
              lastSyncTime={new Date().toLocaleTimeString()}
              showConnectionStatus
              showDataFreshness
            />
            <span className="text-sm text-gray-600">Enhanced sync indicator</span>
          </div>
        </CardContent>
      </Card>

      {/* Connection Status Panel - Inline */}
      <Card>
        <CardHeader>
          <CardTitle>Connection Status Panel - Inline</CardTitle>
        </CardHeader>
        <CardContent>
          <ConnectionStatusPanel
            variant="inline"
            showMetrics={false}
            showQuality
            showDataFreshness
            onRefresh={handleRefresh}
            lastSyncTime={new Date().toLocaleTimeString()}
          />
        </CardContent>
      </Card>

      {/* Connection Status Panel - Compact */}
      <Card>
        <CardHeader>
          <CardTitle>Connection Status Panel - Compact</CardTitle>
        </CardHeader>
        <CardContent>
          <ConnectionStatusPanel
            variant="compact"
            onRefresh={handleRefresh}
            lastSyncTime={new Date().toLocaleTimeString()}
          />
        </CardContent>
      </Card>

      {/* Connection Status Panel - Full Card */}
      <div className="max-w-md">
        <ConnectionStatusPanel
          variant="card"
          showMetrics
          showQuality
          showDataFreshness
          onRefresh={handleRefresh}
          lastSyncTime={new Date().toLocaleTimeString()}
        />
      </div>
    </div>
  );
};

export default ConnectionStatusTest;
