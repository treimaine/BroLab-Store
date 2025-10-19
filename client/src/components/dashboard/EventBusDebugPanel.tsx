import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useEventBus, useEventBusDebug } from "@/hooks/useEventBus";
import { EventHistory } from "@/services/EventBus";
import { Activity, AlertTriangle, Bug, Clock, Users, Zap } from "lucide-react";
import React, { useState } from "react";

interface EventBusDebugPanelProps {
  className?: string;
}

/**
 * Debug panel component for monitoring EventBus activity and troubleshooting
 * synchronization issues in the dashboard
 */
export const EventBusDebugPanel: React.FC<EventBusDebugPanelProps> = ({ className }) => {
  const { publishTyped, enableLogging, enableDebugMode } = useEventBus();
  const { eventHistory, metrics, getRecentEvents, getActiveEventTypes, getSubscriberCount } =
    useEventBusDebug();

  const [loggingEnabled, setLoggingEnabled] = useState(false);
  const [debugModeEnabled, setDebugModeEnabled] = useState(true);
  const [filterEventType, setFilterEventType] = useState("");
  const [testEventPayload, setTestEventPayload] = useState("{}");

  const handleLoggingToggle = (enabled: boolean) => {
    setLoggingEnabled(enabled);
    enableLogging(enabled);
  };

  const handleDebugModeToggle = (enabled: boolean) => {
    setDebugModeEnabled(enabled);
    enableDebugMode(enabled);
  };

  const handleTestEvent = () => {
    try {
      const payload = JSON.parse(testEventPayload);
      publishTyped("sync.forced", { trigger: "user", ...payload }, "system");
    } catch (error) {
      console.error("Invalid JSON payload:", error);
    }
  };

  const filteredEvents = filterEventType
    ? getRecentEvents(filterEventType, 50)
    : eventHistory.slice(-50);

  const activeEventTypes = getActiveEventTypes();

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  const formatDuration = (ms: number) => {
    return `${ms.toFixed(2)}ms`;
  };

  const getEventTypeColor = (eventType: string) => {
    if (eventType.startsWith("error")) return "destructive";
    if (eventType.startsWith("data")) return "default";
    if (eventType.startsWith("connection")) return "secondary";
    if (eventType.startsWith("sync")) return "outline";
    return "default";
  };

  const getSourceIcon = (source: string) => {
    switch (source) {
      case "user":
        return <Users className="h-3 w-3" />;
      case "server":
        return <Activity className="h-3 w-3" />;
      case "system":
        return <Zap className="h-3 w-3" />;
      default:
        return <Bug className="h-3 w-3" />;
    }
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bug className="h-5 w-5" />
          EventBus Debug Panel
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="events">Events</TabsTrigger>
            <TabsTrigger value="subscribers">Subscribers</TabsTrigger>
            <TabsTrigger value="testing">Testing</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <Activity className="h-4 w-4 text-blue-500" />
                    <div>
                      <p className="text-sm font-medium">Total Events</p>
                      <p className="text-2xl font-bold">{metrics.totalEvents}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <Zap className="h-4 w-4 text-green-500" />
                    <div>
                      <p className="text-sm font-medium">Events/sec</p>
                      <p className="text-2xl font-bold">{metrics.eventsPerSecond.toFixed(1)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-yellow-500" />
                    <div>
                      <p className="text-sm font-medium">Avg Time</p>
                      <p className="text-2xl font-bold">
                        {formatDuration(metrics.averageProcessingTime)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-red-500" />
                    <div>
                      <p className="text-sm font-medium">Errors</p>
                      <p className="text-2xl font-bold">{metrics.errorsCount}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardContent className="p-4">
                  <h4 className="font-medium mb-2">Configuration</h4>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="logging">Event Logging</Label>
                      <Switch
                        id="logging"
                        checked={loggingEnabled}
                        onCheckedChange={handleLoggingToggle}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="debug">Debug Mode</Label>
                      <Switch
                        id="debug"
                        checked={debugModeEnabled}
                        onCheckedChange={handleDebugModeToggle}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <h4 className="font-medium mb-2">Statistics</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Subscribers:</span>
                      <span>{metrics.subscriberCount}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Duplicates Filtered:</span>
                      <span>{metrics.duplicatesFiltered}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Active Event Types:</span>
                      <span>{activeEventTypes.length}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="events" className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="Filter by event type..."
                value={filterEventType}
                onChange={e => setFilterEventType(e.target.value)}
                className="flex-1"
              />
              <Button variant="outline" onClick={() => setFilterEventType("")}>
                Clear
              </Button>
            </div>

            <ScrollArea className="h-96">
              <div className="space-y-2">
                {filteredEvents.map((entry: EventHistory, index) => (
                  <Card key={`${entry.event.id}-${index}`} className="p-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          {getSourceIcon(entry.event.source)}
                          <Badge variant={getEventTypeColor(entry.event.type)}>
                            {entry.event.type}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {formatTimestamp(entry.event.timestamp)}
                          </span>
                        </div>
                        <div className="text-sm">
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <span>ID: {entry.event.id}</span>
                            <span>Subscribers: {entry.subscribers}</span>
                            <span>Time: {formatDuration(entry.processingTime)}</span>
                          </div>
                          {entry.event.correlationId && (
                            <div className="text-xs text-muted-foreground mt-1">
                              Correlation: {entry.event.correlationId}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    <details className="mt-2">
                      <summary className="text-xs cursor-pointer text-muted-foreground hover:text-foreground">
                        Show payload
                      </summary>
                      <pre className="text-xs mt-2 p-2 bg-muted rounded overflow-auto">
                        {JSON.stringify(entry.event.payload, null, 2)}
                      </pre>
                    </details>
                  </Card>
                ))}
                {filteredEvents.length === 0 && (
                  <div className="text-center text-muted-foreground py-8">
                    No events found
                    {filterEventType && ` for type "${filterEventType}"`}
                  </div>
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="subscribers" className="space-y-4">
            <ScrollArea className="h-96">
              <div className="space-y-2">
                {activeEventTypes.map(eventType => (
                  <Card key={eventType} className="p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <Badge variant="outline">{eventType}</Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium">
                          {getSubscriberCount(eventType)} subscribers
                        </span>
                      </div>
                    </div>
                  </Card>
                ))}
                {activeEventTypes.length === 0 && (
                  <div className="text-center text-muted-foreground py-8">
                    No active event subscriptions
                  </div>
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="testing" className="space-y-4">
            <Card>
              <CardContent className="p-4">
                <h4 className="font-medium mb-3">Test Event Publishing</h4>
                <div className="space-y-3">
                  <div>
                    <Label htmlFor="payload">Event Payload (JSON)</Label>
                    <textarea
                      id="payload"
                      className="w-full mt-1 p-2 border rounded text-sm font-mono"
                      rows={4}
                      value={testEventPayload}
                      onChange={e => setTestEventPayload(e.target.value)}
                      placeholder='{"key": "value"}'
                    />
                  </div>
                  <Button onClick={handleTestEvent} className="w-full">
                    Publish Test Event
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <h4 className="font-medium mb-3">Quick Actions</h4>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant="outline"
                    onClick={() =>
                      publishTyped("data.updated", { section: "debug", data: {} }, "system")
                    }
                  >
                    Debug Data Update
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() =>
                      publishTyped(
                        "connection.status",
                        { status: { connected: true, type: "websocket" } },
                        "system"
                      )
                    }
                  >
                    Test Connection
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() =>
                      publishTyped(
                        "error.sync",
                        { error: new Error("Test error"), context: "debug" },
                        "system"
                      )
                    }
                  >
                    Test Error
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => publishTyped("sync.forced", { trigger: "user" }, "system")}
                  >
                    Force Sync
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};
