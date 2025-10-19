# EventBus System Documentation

## Overview

The EventBus system provides a comprehensive event-driven architecture for dashboard-wide communication between components. It includes typed events, logging, debugging capabilities, and automatic deduplication to prevent duplicate updates.

## Key Features

- **Typed Event System**: Full TypeScript support with predefined event types
- **Event Deduplication**: Prevents duplicate events within a configurable time window
- **Logging & Debugging**: Comprehensive logging with debug mode for troubleshooting
- **Performance Monitoring**: Built-in metrics collection and performance tracking
- **Cross-Tab Communication**: Supports multi-tab synchronization
- **Integration with SyncManager**: Seamless integration with real-time sync operations

## Core Components

### 1. EventBus Class

The main EventBus class provides the core functionality:

```typescript
import { getEventBus } from "@/services/EventBus";

const eventBus = getEventBus();

// Publish a typed event
eventBus.publishTyped(
  "data.updated",
  {
    section: "favorites",
    data: { count: 5 },
  },
  "user"
);

// Subscribe to events
const unsubscribe = eventBus.subscribeTyped("data.updated", event => {
  console.log("Data updated:", event.payload);
});
```

### 2. React Hooks

#### useEventBus Hook

```typescript
import { useEventBus } from "@/hooks/useEventBus";

const MyComponent = () => {
  const { publishTyped, subscribeTyped } = useEventBus();

  const handleAction = () => {
    publishTyped("user.action", {
      action: "favorite_added",
      data: { beatId: "123" }
    }, "user");
  };

  return <button onClick={handleAction}>Add Favorite</button>;
};
```

#### useTypedEventSubscription Hook

```typescript
import { useTypedEventSubscription } from "@/hooks/useEventBus";

const MyComponent = () => {
  useTypedEventSubscription("data.updated", (event) => {
    console.log("Received update:", event.payload);
  }, {}, []); // Empty deps array for stable subscription

  return <div>Component content</div>;
};
```

### 3. EventBus Provider

Wrap your application with the EventBusProvider to initialize the system:

```typescript
import { EventBusProvider } from "@/providers/EventBusProvider";

function App() {
  return (
    <EventBusProvider enableLogging={true} enableDebugMode={false}>
      <YourAppComponents />
    </EventBusProvider>
  );
}
```

### 4. Debug Panel

Use the EventBusDebugPanel for troubleshooting:

```typescript
import { EventBusDebugPanel } from "@/components/dashboard/EventBusDebugPanel";

const DebugPage = () => {
  return (
    <div>
      <h1>Debug Dashboard</h1>
      <EventBusDebugPanel />
    </div>
  );
};
```

## Event Types

The system includes predefined typed events:

```typescript
interface DashboardEventTypes {
  "data.updated": { section: string; data: Partial<unknown> };
  "data.inconsistency": { sections: string[]; details: unknown };
  "connection.status": { status: unknown };
  "optimistic.applied": { update: unknown };
  "optimistic.rollback": { updateId: string; reason: string };
  "sync.forced": { trigger: "user" | "system" | "error" };
  "error.sync": { error: unknown; context: unknown };
  "user.action": { action: string; data: unknown };
  "ui.update": { component: string; state: unknown };
  "cache.invalidated": { keys: string[] };
  "network.status": { online: boolean; connectionType?: string };
}
```

## Integration with SyncManager

The EventBusSyncIntegration class automatically bridges EventBus and SyncManager:

```typescript
import { getEventBusSyncIntegration } from "@/services/EventBusSyncIntegration";

// Integration is automatically initialized
const integration = getEventBusSyncIntegration();

// Check if ready
if (integration.isReady()) {
  console.log("EventBus-SyncManager integration is active");
}
```

## Performance Features

### Event Deduplication

Events are automatically deduplicated within a 1-second window to prevent spam:

```typescript
// These events will be deduplicated if sent within 1 second
eventBus.publishTyped("data.updated", { section: "test", data: {} });
eventBus.publishTyped("data.updated", { section: "test", data: {} }); // Filtered out
```

### Metrics Collection

Built-in performance monitoring:

```typescript
const metrics = eventBus.getMetrics();
console.log({
  totalEvents: metrics.totalEvents,
  eventsPerSecond: metrics.eventsPerSecond,
  averageProcessingTime: metrics.averageProcessingTime,
  subscriberCount: metrics.subscriberCount,
  duplicatesFiltered: metrics.duplicatesFiltered,
  errorsCount: metrics.errorsCount,
});
```

### Memory Management

Automatic cleanup and memory management:

- Event history is limited to 1000 entries
- Processing time history is limited to 100 entries
- Duplicate filter entries are automatically cleaned up
- Subscriptions are properly cleaned up on component unmount

## Debugging

### Enable Debug Mode

```typescript
const eventBus = getEventBus();
eventBus.enableDebugMode(true); // Enables verbose console logging
```

### Event History

```typescript
const history = eventBus.getEventHistory();
const recentEvents = eventBus.getRecentEvents("data.updated", 10);
```

### Debug Panel

The EventBusDebugPanel provides a comprehensive debugging interface:

- Real-time event monitoring
- Metrics visualization
- Event history browser
- Test event publishing
- Subscriber monitoring

## Best Practices

### 1. Use Typed Events

Always use the typed event methods for better type safety:

```typescript
// Good
eventBus.publishTyped("data.updated", { section: "favorites", data: {} });

// Avoid
eventBus.publish({ type: "data.updated", payload: {}, ... });
```

### 2. Proper Subscription Cleanup

Use the provided hooks for automatic cleanup:

```typescript
// Good - automatic cleanup
useTypedEventSubscription("data.updated", handler, {}, []);

// Manual cleanup if needed
useEffect(() => {
  const unsubscribe = eventBus.subscribeTyped("data.updated", handler);
  return unsubscribe;
}, []);
```

### 3. Event Naming Convention

Follow the established naming patterns:

- `data.*` - Data-related events
- `connection.*` - Connection status events
- `sync.*` - Synchronization events
- `error.*` - Error events
- `user.*` - User action events
- `ui.*` - UI state events

### 4. Correlation IDs

Use correlation IDs to track related events:

```typescript
const correlationId = "user-action-123";

eventBus.publishTyped("user.action", { action: "favorite" }, "user", correlationId);
// Later, related events can use the same correlation ID
eventBus.publishTyped("data.updated", { section: "favorites" }, "server", correlationId);
```

## Error Handling

The EventBus includes comprehensive error handling:

- Invalid events are rejected with logging
- Handler errors are caught and logged without breaking other handlers
- Network errors are automatically classified and handled
- Error metrics are collected for monitoring

## Testing

Use the EventBusTest component for basic functionality testing:

```typescript
import { EventBusTest } from "@/components/dashboard/EventBusTest";

const TestPage = () => <EventBusTest />;
```

## Requirements Satisfied

This EventBus implementation satisfies the following requirements from the specification:

- **3.1**: Event-driven synchronization system that broadcasts changes to all dashboard sections
- **3.2**: Typed event system for data updates, connection status, and error handling
- **7.2**: Event logging and debugging capabilities for troubleshooting synchronization issues
- **7.3**: Event deduplication and ordering to prevent duplicate updates

The system provides a robust foundation for dashboard-wide communication and real-time data synchronization.
