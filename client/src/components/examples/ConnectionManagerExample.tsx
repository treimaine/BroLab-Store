/**
 * Connection Manager Integration Example
 *
 * Example component showing how to integrate ConnectionManager with dashboard components
 * for real-time data synchronization with fallback strategies.
 */

import {
  ConnectionQualityBar,
  ConnectionStatusBadge,
  ConnectionStatusIndicator,
} from "@/components/dashboard/ConnectionStatusIndicator";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useConnectionManager, useConnectionMetrics } from "@/hooks/useConnectionManager";
import { useDashboardStore } from "@/stores/useDashboardStore";
import React, { useCallback, useEffect, useState } from "react";

/**
 * Example dashboard component with connection management
 */
export const ConnectionManagerExample: React.FC = () => {
  const {
    isConnected,
    isReconnecting,
    connect,
    disconnect,
    reconnect,
    sendMessage,
    enableFallback,
    getCurrentStrategy,
    error,
    clearError,
    recoveryActions,
  } = useConnectionManager({
    autoConnect: true,
    autoReconnect: true,
  });

  const { current: metrics, isHealthy, qualityScore } = useConnectionMetrics();
  const [messageLog, setMessageLog] = useState<string[]>([]);
  const { publish } = useDashboardStore();

  // Handle incoming messages
  useEffect(() => {
    const { connectionManager } = useConnectionManager();

    const unsubscribe = connectionManager.onMessage(message => {
      setMessageLog(prev => [
        ...prev.slice(-9), // Keep last 9 messages
        `Received: ${message.type} - ${JSON.stringify(message.payload)}`,
      ]);
    });

    return unsubscribe;
  }, []);

  // Send test message
  const handleSendMessage = useCallback(async () => {
    try {
      const message = {
        type: "test_message",
        payload: { timestamp: Date.now(), data: "Hello from dashboard!" },
        id: `msg_${Date.now()}`,
        timestamp: Date.now(),
      };

      await sendMessage(message);

      setMessageLog(prev => [
        ...prev.slice(-9),
        `Sent: ${message.type} - ${JSON.stringify(message.payload)}`,
      ]);
    } catch (err) {
      console.error("Failed to send message:", err);
    }
  }, [sendMessage]);

  // Execute recovery action
  const handleRecoveryAction = useCallback(
    async (action: unknown) => {
      try {
        // Type guard for action object
        if (typeof action !== "object" || action === null) {
          console.warn("Invalid recovery action:", action);
          return;
        }

        const actionObj = action as Record<string, unknown>;

        // Type guard for action.type
        if (typeof actionObj.type !== "string") {
          console.warn("Recovery action missing type:", action);
          return;
        }

        switch (actionObj.type) {
          case "retry":
            await reconnect();
            break;
          case "fallback":
            enableFallback("immediate");
            await reconnect();
            break;
          case "force_sync":
            publish({
              type: "sync.forced",
              payload: { trigger: "user" },
              timestamp: Date.now(),
              source: "user",
              id: `force-sync-${Date.now()}`,
            });
            break;
          default:
            console.warn("Unknown recovery action:", action);
        }
        clearError();
      } catch (err) {
        console.error("Recovery action failed:", err);
      }
    },
    [reconnect, enableFallback, publish, clearError]
  );

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Connection Manager Example</h2>
        <ConnectionStatusIndicator showDetails showMetrics />
      </div>

      {/* Connection Status Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Connection Status
            <ConnectionStatusBadge />
          </CardTitle>
          <CardDescription>Real-time connection status and quality monitoring</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <div className="text-sm text-muted-foreground">Strategy</div>
              <div className="font-medium capitalize">{getCurrentStrategy()}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Status</div>
              <div className="font-medium">
                {isReconnecting ? "Reconnecting" : isConnected ? "Connected" : "Offline"}
              </div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Latency</div>
              <div className="font-medium">{Math.round(metrics.stats.averageLatency)}ms</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Health</div>
              <div className={`font-medium ${isHealthy ? "text-green-600" : "text-yellow-600"}`}>
                {isHealthy ? "Good" : "Degraded"}
              </div>
            </div>
          </div>

          <ConnectionQualityBar score={qualityScore} />

          <div className="flex gap-2">
            <Button onClick={connect} disabled={isConnected || isReconnecting} size="sm">
              Connect
            </Button>
            <Button onClick={disconnect} disabled={!isConnected} variant="outline" size="sm">
              Disconnect
            </Button>
            <Button onClick={reconnect} disabled={isReconnecting} variant="outline" size="sm">
              Reconnect
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Error Handling */}
      {error && (
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="text-destructive">Connection Error</CardTitle>
            <CardDescription>{error.message}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="text-sm">
                <span className="font-medium">Type:</span> {error.type}
              </div>
              <div className="text-sm">
                <span className="font-medium">Retryable:</span> {error.retryable ? "Yes" : "No"}
              </div>
              <div className="text-sm">
                <span className="font-medium">Retry Count:</span> {error.retryCount}/
                {error.maxRetries}
              </div>
            </div>

            {recoveryActions.length > 0 && (
              <div className="mt-4">
                <div className="text-sm font-medium mb-2">Recovery Actions:</div>
                <div className="flex gap-2">
                  {recoveryActions.map((action, index) => (
                    <Button
                      key={index}
                      onClick={() => handleRecoveryAction(action)}
                      variant="outline"
                      size="sm"
                    >
                      {getActionLabel(action)}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-4">
              <Button onClick={clearError} variant="outline" size="sm">
                Clear Error
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Fallback Strategy Controls */}
      <Card>
        <CardHeader>
          <CardTitle>Fallback Strategy</CardTitle>
          <CardDescription>Configure how the connection manager handles failures</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Button onClick={() => enableFallback("immediate")} variant="outline" size="sm">
              Immediate
            </Button>
            <Button onClick={() => enableFallback("gradual")} variant="outline" size="sm">
              Gradual
            </Button>
            <Button onClick={() => enableFallback("quality_based")} variant="outline" size="sm">
              Quality Based
            </Button>
            <Button onClick={() => enableFallback("manual")} variant="outline" size="sm">
              Manual
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Message Testing */}
      <Card>
        <CardHeader>
          <CardTitle>Message Testing</CardTitle>
          <CardDescription>Test real-time message sending and receiving</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button onClick={handleSendMessage} disabled={!isConnected}>
            Send Test Message
          </Button>

          <div className="space-y-2">
            <div className="text-sm font-medium">Message Log:</div>
            <div className="bg-muted p-3 rounded-md text-sm font-mono max-h-40 overflow-y-auto">
              {messageLog.length === 0 ? (
                <div className="text-muted-foreground">No messages yet...</div>
              ) : (
                messageLog.map((msg, index) => (
                  <div key={index} className="mb-1">
                    {msg}
                  </div>
                ))
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Connection Metrics */}
      <Card>
        <CardHeader>
          <CardTitle>Connection Metrics</CardTitle>
          <CardDescription>Detailed connection performance metrics</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <div className="text-sm text-muted-foreground">Messages Sent</div>
              <div className="font-medium">{metrics.stats.messagesSent}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Messages Received</div>
              <div className="font-medium">{metrics.stats.messagesReceived}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Error Count</div>
              <div className="font-medium">{metrics.stats.errorCount}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Uptime</div>
              <div className="font-medium">{formatUptime(metrics.stats.uptime)}</div>
            </div>
          </div>

          <div className="mt-4">
            <div className="text-sm font-medium mb-2">Strategy Performance:</div>
            <div className="space-y-2">
              {Array.from(metrics.strategyPerformance.entries()).map(([strategy, perf]) => (
                <div key={strategy} className="flex justify-between items-center">
                  <span className="capitalize">{strategy}</span>
                  <div className="text-sm text-muted-foreground">
                    Success: {Math.round(perf.successRate * 100)}% | Latency:{" "}
                    {Math.round(perf.averageLatency)}ms
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// Helper functions
function getActionLabel(action: unknown): string {
  // Type guard for action object
  if (typeof action !== "object" || action === null) {
    return "Unknown";
  }

  const actionObj = action as Record<string, unknown>;

  // Type guard for action.type
  if (typeof actionObj.type !== "string") {
    return "Unknown";
  }

  switch (actionObj.type) {
    case "retry": {
      const delay = typeof actionObj.delay === "number" ? actionObj.delay : 0;
      return `Retry (${Math.round(delay / 1000)}s)`;
    }
    case "fallback": {
      const strategy = typeof actionObj.strategy === "string" ? actionObj.strategy : "unknown";
      return `Switch to ${strategy}`;
    }
    case "force_sync":
      return "Force Sync";
    default:
      return "Unknown";
  }
}

function formatUptime(uptime: number): string {
  const seconds = Math.floor(uptime / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  }
  return `${seconds}s`;
}
