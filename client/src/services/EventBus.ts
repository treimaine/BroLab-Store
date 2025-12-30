import BrowserEventEmitter from "@/utils/BrowserEventEmitter";

// Core event interfaces
export type EventSource = "user" | "server" | "system";

export interface DashboardEvent<T = unknown> {
  type: string;
  payload: T;
  timestamp: number;
  source: EventSource;
  id: string;
  correlationId?: string;
}

// Internal interface for wrapped listeners
interface WrappedListener {
  (...args: unknown[]): void;
  __originalListener?: (event: DashboardEvent<unknown>) => void;
}

export interface SubscriptionOptions {
  once?: boolean;
  priority?: number;
  filter?: (event: DashboardEvent<unknown>) => boolean;
}

// Typed event definitions for dashboard
export interface DashboardEventTypes {
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

export interface EventHistory {
  event: DashboardEvent<unknown>;
  subscribers: number;
  processingTime: number;
}

export interface EventMetrics {
  totalEvents: number;
  eventsPerSecond: number;
  averageProcessingTime: number;
  subscriberCount: number;
  duplicatesFiltered: number;
  errorsCount: number;
}

/**
 * EventBus class for dashboard-wide event communication between components
 * Provides typed event system with logging, debugging, and deduplication capabilities
 */
export class EventBus extends BrowserEventEmitter {
  private eventHistory: EventHistory[] = [];
  private readonly maxHistorySize = 1000;
  private readonly duplicateFilter = new Map<string, number>();
  private readonly duplicateTimeWindow = 1000; // 1 second
  private loggingEnabled = false;
  private debugMode = false;
  private metrics: EventMetrics = {
    totalEvents: 0,
    eventsPerSecond: 0,
    averageProcessingTime: 0,
    subscriberCount: 0,
    duplicatesFiltered: 0,
    errorsCount: 0,
  };
  private processingTimes: number[] = [];
  private readonly maxProcessingTimeHistory = 100;
  private metricsInterval: NodeJS.Timeout | null = null;

  constructor() {
    super();
    this.setMaxListeners(100); // Increase max listeners for dashboard components
    this.setupErrorHandling();
    this.startMetricsCollection();
  }

  /**
   * Override on() to accept typed event callbacks
   * Wraps the listener to ensure it receives a properly typed DashboardEvent
   */
  public override on<T = unknown>(
    event: string,
    listener: (event: DashboardEvent<T>) => void
  ): this {
    // Wrap the listener to handle the event properly
    const wrappedListener: WrappedListener = (...args: unknown[]) => {
      // The first argument should be the DashboardEvent
      const dashboardEvent = args[0] as DashboardEvent<T>;
      listener(dashboardEvent);
    };
    // Store the original listener reference for removal
    wrappedListener.__originalListener = listener as (event: DashboardEvent<unknown>) => void;
    return super.on(event, wrappedListener);
  }

  /**
   * Override once() to accept typed event callbacks
   * Wraps the listener to ensure it receives a properly typed DashboardEvent
   */
  public override once<T = unknown>(
    event: string,
    listener: (event: DashboardEvent<T>) => void
  ): this {
    // Wrap the listener to handle the event properly
    const wrappedListener: WrappedListener = (...args: unknown[]) => {
      // The first argument should be the DashboardEvent
      const dashboardEvent = args[0] as DashboardEvent<T>;
      listener(dashboardEvent);
    };
    // Store the original listener reference for removal
    wrappedListener.__originalListener = listener as (event: DashboardEvent<unknown>) => void;
    return super.once(event, wrappedListener);
  }

  /**
   * Override prependListener() to accept typed event callbacks
   * Wraps the listener to ensure it receives a properly typed DashboardEvent
   */
  public override prependListener<T = unknown>(
    event: string,
    listener: (event: DashboardEvent<T>) => void
  ): this {
    // Wrap the listener to handle the event properly
    const wrappedListener: WrappedListener = (...args: unknown[]) => {
      // The first argument should be the DashboardEvent
      const dashboardEvent = args[0] as DashboardEvent<T>;
      listener(dashboardEvent);
    };
    // Store the original listener reference for removal
    wrappedListener.__originalListener = listener as (event: DashboardEvent<unknown>) => void;
    return super.prependListener(event, wrappedListener);
  }

  /**
   * Override addListener() to accept typed event callbacks
   * Wraps the listener to ensure it receives a properly typed DashboardEvent
   */
  public override addListener<T = unknown>(
    event: string,
    listener: (event: DashboardEvent<T>) => void
  ): this {
    // Wrap the listener to handle the event properly
    const wrappedListener: WrappedListener = (...args: unknown[]) => {
      // The first argument should be the DashboardEvent
      const dashboardEvent = args[0] as DashboardEvent<T>;
      listener(dashboardEvent);
    };
    // Store the original listener reference for removal
    wrappedListener.__originalListener = listener as (event: DashboardEvent<unknown>) => void;
    return super.addListener(event, wrappedListener);
  }

  /**
   * Override removeListener() to accept typed event callbacks
   * Handles removal of wrapped listeners by finding the original listener reference
   */
  public override removeListener<T = unknown>(
    event: string,
    listener: (event: DashboardEvent<T>) => void
  ): this {
    // Access the private listeners map from BrowserEventEmitter
    const listenersMap = (this as unknown as { listeners: Map<string, WrappedListener[]> })
      .listeners;
    const eventListeners = listenersMap?.get(event);

    if (eventListeners) {
      const wrappedListener = eventListeners.find(
        (l: WrappedListener) => l.__originalListener === listener
      );
      if (wrappedListener) {
        return super.removeListener(event, wrappedListener);
      }
    }
    // Fallback to direct removal if no wrapped listener found
    return super.removeListener(event, listener as (...args: unknown[]) => void);
  }

  /**
   * Publish an event to all subscribers with deduplication and logging
   */
  public publish<T>(event: DashboardEvent<T>): void {
    const startTime = performance.now();

    try {
      // Validate event structure
      if (!this.validateEvent(event)) {
        this.logError("Invalid event structure", event);
        return;
      }

      // Check for duplicates
      if (this.isDuplicate(event)) {
        this.metrics.duplicatesFiltered++;
        this.log("Duplicate event filtered", event);
        return;
      }

      // Add to duplicate filter
      this.addToDuplicateFilter(event);

      // Get subscriber count before emission
      const subscriberCount = this.listenerCount(event.type);

      // Emit the event
      this.emit(event.type, event);

      // Track processing time
      const processingTime = performance.now() - startTime;
      this.trackProcessingTime(processingTime);

      // Add to history
      this.addToHistory({
        event,
        subscribers: subscriberCount,
        processingTime,
      });

      // Update metrics
      this.metrics.totalEvents++;
      this.updateMetrics();

      this.log("Event published", {
        type: event.type,
        id: event.id,
        subscribers: subscriberCount,
        processingTime: `${processingTime.toFixed(2)}ms`,
      });
    } catch (error) {
      this.metrics.errorsCount++;
      this.logError("Error publishing event", { event, error });
    }
  }

  /**
   * Subscribe to events with optional filtering and priority
   */
  public subscribe<T>(
    eventType: string,
    handler: (event: DashboardEvent<T>) => void,
    options: SubscriptionOptions = {}
  ): () => void {
    const { once = false, priority = 0, filter } = options;

    // Wrap handler with filtering and error handling
    const wrappedHandler = (event: DashboardEvent<T>) => {
      try {
        // Apply filter if provided
        if (filter && !filter(event as DashboardEvent<unknown>)) {
          return;
        }

        handler(event);
      } catch (error) {
        this.metrics.errorsCount++;
        this.logError("Error in event handler", { eventType, event, error });
      }
    };

    // Store reference to the wrapped handler for unsubscribe
    const handlerRef = wrappedHandler;

    // Add listener with priority support
    if (once) {
      this.once(eventType, wrappedHandler);
    } else if (priority > 0) {
      this.prependListener(eventType, wrappedHandler);
    } else {
      this.addListener(eventType, wrappedHandler);
    }

    this.updateSubscriberMetrics();

    this.log("Event subscription added", {
      eventType,
      priority,
      hasFilter: !!filter,
      once,
    });

    // Return unsubscribe function
    return () => {
      this.removeListener(eventType, handlerRef);
      this.updateSubscriberMetrics();
      this.log("Event subscription removed", { eventType });
    };
  }

  /**
   * Subscribe to multiple event types with a single handler
   */
  public subscribeToMultiple<T>(
    eventTypes: string[],
    handler: (event: DashboardEvent<T>) => void,
    options: SubscriptionOptions = {}
  ): () => void {
    const unsubscribeFunctions = eventTypes.map(eventType =>
      this.subscribe(eventType, handler, options)
    );

    return () => {
      unsubscribeFunctions.forEach(unsubscribe => unsubscribe());
    };
  }

  /**
   * Publish and wait for all handlers to complete (for async handlers)
   */
  public async publishAndWait<T>(event: DashboardEvent<T>): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.publish(event);
        // Use nextTick to ensure all synchronous handlers have completed
        process.nextTick(resolve);
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Clear all event listeners and reset state
   */
  public clear(): void {
    if (this.metricsInterval) {
      clearInterval(this.metricsInterval);
      this.metricsInterval = null;
    }
    this.removeAllListeners();
    this.eventHistory = [];
    this.duplicateFilter.clear();
    this.processingTimes = [];
    this.resetMetrics();
    this.log("EventBus cleared");
  }

  /**
   * Get number of subscribers for a specific event type
   */
  public getSubscribers(eventType: string): number {
    return this.listenerCount(eventType);
  }

  /**
   * Get all event types that have subscribers
   */
  public getActiveEventTypes(): string[] {
    return this.eventNames();
  }

  /**
   * Enable or disable event logging
   */
  public enableLogging(enabled: boolean): void {
    this.loggingEnabled = enabled;
    this.log(`Event logging ${enabled ? "enabled" : "disabled"}`);
  }

  /**
   * Enable or disable debug mode (more verbose logging)
   */
  public enableDebugMode(enabled: boolean): void {
    this.debugMode = enabled;
    this.loggingEnabled = enabled; // Debug mode implies logging
    this.log(`Debug mode ${enabled ? "enabled" : "disabled"}`);
  }

  /**
   * Get event history for debugging
   */
  public getEventHistory(): EventHistory[] {
    return [...this.eventHistory];
  }

  /**
   * Get recent events of a specific type
   */
  public getRecentEvents(eventType?: string, limit = 10): EventHistory[] {
    let events = this.eventHistory;

    if (eventType) {
      events = events.filter(entry => entry.event.type === eventType);
    }

    return events.slice(-limit);
  }

  /**
   * Get current metrics
   */
  public getMetrics(): EventMetrics {
    return { ...this.metrics };
  }

  /**
   * Create a typed event with automatic ID generation
   */
  public createEvent<K extends keyof DashboardEventTypes>(
    type: K,
    payload: DashboardEventTypes[K],
    source: EventSource = "system",
    correlationId?: string
  ): DashboardEvent<DashboardEventTypes[K]> {
    return {
      type,
      payload,
      timestamp: Date.now(),
      source,
      id: this.generateEventId(),
      correlationId,
    };
  }

  /**
   * Publish a typed event with automatic creation
   */
  public publishTyped<K extends keyof DashboardEventTypes>(
    type: K,
    payload: DashboardEventTypes[K],
    source: EventSource = "system",
    correlationId?: string
  ): void {
    const event = this.createEvent(type, payload, source, correlationId);
    this.publish(event);
  }

  /**
   * Subscribe to typed events
   */
  public subscribeTyped<K extends keyof DashboardEventTypes>(
    eventType: K,
    handler: (event: DashboardEvent<DashboardEventTypes[K]>) => void,
    options: SubscriptionOptions = {}
  ): () => void {
    return this.subscribe(eventType, handler, options);
  }

  // Private methods

  private validateEvent(event: DashboardEvent<unknown>): boolean {
    return !!(
      event &&
      typeof event === "object" &&
      event.type &&
      typeof event.type === "string" &&
      event.id &&
      typeof event.id === "string" &&
      event.timestamp &&
      typeof event.timestamp === "number" &&
      event.source &&
      ["user", "server", "system"].includes(event.source)
    );
  }

  private isDuplicate(event: DashboardEvent<unknown>): boolean {
    const key = this.getDuplicateKey(event);
    const lastTimestamp = this.duplicateFilter.get(key);

    if (!lastTimestamp) {
      return false;
    }

    return event.timestamp - lastTimestamp < this.duplicateTimeWindow;
  }

  private addToDuplicateFilter(event: DashboardEvent<unknown>): void {
    const key = this.getDuplicateKey(event);
    this.duplicateFilter.set(key, event.timestamp);

    // Clean up old entries
    this.cleanupDuplicateFilter();
  }

  private getDuplicateKey(event: DashboardEvent<unknown>): string {
    // Create a key based on event type and a hash of the payload
    const payloadHash = this.hashObject(event.payload);
    return `${event.type}:${payloadHash}`;
  }

  private hashObject(obj: unknown): string {
    // Simple hash function for object comparison
    const str = JSON.stringify(obj);
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.codePointAt(i) ?? 0;
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString();
  }

  private cleanupDuplicateFilter(): void {
    const now = Date.now();
    const cutoff = now - this.duplicateTimeWindow * 2; // Keep entries for 2x the window

    for (const [key, timestamp] of this.duplicateFilter.entries()) {
      if (timestamp < cutoff) {
        this.duplicateFilter.delete(key);
      }
    }
  }

  private addToHistory(entry: EventHistory): void {
    this.eventHistory.push(entry);

    if (this.eventHistory.length > this.maxHistorySize) {
      this.eventHistory.shift();
    }
  }

  private trackProcessingTime(time: number): void {
    this.processingTimes.push(time);

    if (this.processingTimes.length > this.maxProcessingTimeHistory) {
      this.processingTimes.shift();
    }
  }

  private updateMetrics(): void {
    // Calculate average processing time
    if (this.processingTimes.length > 0) {
      this.metrics.averageProcessingTime =
        this.processingTimes.reduce((sum, time) => sum + time, 0) / this.processingTimes.length;
    }

    // Calculate events per second (based on last 10 seconds of history)
    const tenSecondsAgo = Date.now() - 10000;
    const recentEvents = this.eventHistory.filter(entry => entry.event.timestamp > tenSecondsAgo);
    this.metrics.eventsPerSecond = recentEvents.length / 10;
  }

  private updateSubscriberMetrics(): void {
    this.metrics.subscriberCount = this.eventNames().reduce(
      (total, eventName) => total + this.listenerCount(eventName),
      0
    );
  }

  private resetMetrics(): void {
    this.metrics = {
      totalEvents: 0,
      eventsPerSecond: 0,
      averageProcessingTime: 0,
      subscriberCount: 0,
      duplicatesFiltered: 0,
      errorsCount: 0,
    };
  }

  private generateEventId(): string {
    return `evt_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  private setupErrorHandling(): void {
    this.on("error", error => {
      this.metrics.errorsCount++;
      this.logError("EventBus internal error", error);
    });
  }

  private startMetricsCollection(): void {
    // Update metrics every 5 seconds
    this.metricsInterval = setInterval(() => {
      this.updateMetrics();
      this.cleanupDuplicateFilter();
    }, 5000);
  }

  private log(message: string, data?: unknown): void {
    if (this.loggingEnabled) {
      const timestamp = new Date().toISOString();
      if (this.debugMode && data) {
        console.log(`[EventBus ${timestamp}] ${message}`, data);
      } else {
        console.log(`[EventBus ${timestamp}] ${message}`);
      }
    }
  }

  private logError(message: string, data?: unknown): void {
    if (this.loggingEnabled) {
      const timestamp = new Date().toISOString();
      console.error(`[EventBus ERROR ${timestamp}] ${message}`, data);
    }
  }
}

// Singleton instance
let eventBusInstance: EventBus | null = null;

/**
 * Get the singleton EventBus instance
 */
export const getEventBus = (): EventBus => {
  eventBusInstance ??= new EventBus();
  return eventBusInstance;
};

/**
 * Destroy the EventBus instance (for testing or cleanup)
 */
export const destroyEventBus = (): void => {
  if (eventBusInstance) {
    eventBusInstance.clear();
    eventBusInstance = null;
  }
};

// Convenience functions for common operations
export const publishEvent = <T>(event: DashboardEvent<T>): void => {
  getEventBus().publish(event);
};

export const subscribeToEvent = <T>(
  eventType: string,
  handler: (event: DashboardEvent<T>) => void,
  options?: SubscriptionOptions
): (() => void) => {
  return getEventBus().subscribe(eventType, handler, options);
};

export const publishTypedEvent = <K extends keyof DashboardEventTypes>(
  type: K,
  payload: DashboardEventTypes[K],
  source: EventSource = "system",
  correlationId?: string
): void => {
  getEventBus().publishTyped(type, payload, source, correlationId);
};

export const subscribeToTypedEvent = <K extends keyof DashboardEventTypes>(
  eventType: K,
  handler: (event: DashboardEvent<DashboardEventTypes[K]>) => void,
  options?: SubscriptionOptions
): (() => void) => {
  return getEventBus().subscribeTyped(eventType, handler, options);
};
