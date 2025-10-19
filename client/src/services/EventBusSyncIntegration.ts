import { EventBus, getEventBus } from "./EventBus";
import { SyncData, SyncError, SyncManager, SyncStatus, getSyncManager } from "./SyncManager";

/**
 * Integration layer between EventBus and SyncManager
 * Bridges the gap between the event-driven architecture and sync operations
 */
export class EventBusSyncIntegration {
  private readonly eventBus: EventBus;
  private readonly syncManager: SyncManager;
  private isInitialized = false;
  private unsubscribeFunctions: (() => void)[] = [];

  constructor(eventBus?: EventBus, syncManager?: SyncManager) {
    this.eventBus = eventBus ?? getEventBus();
    this.syncManager = syncManager ?? getSyncManager();
  }

  /**
   * Initialize the integration between EventBus and SyncManager
   */
  public initialize(): void {
    if (this.isInitialized) {
      return;
    }

    this.setupSyncManagerEventForwarding();
    this.setupEventBusToSyncManagerBridge();
    this.isInitialized = true;

    console.log("[EventBusSyncIntegration] Integration initialized");
  }

  /**
   * Destroy the integration and clean up event listeners
   */
  public destroy(): void {
    if (!this.isInitialized) {
      return;
    }

    // Clean up all subscriptions
    this.unsubscribeFunctions.forEach(unsubscribe => unsubscribe());
    this.unsubscribeFunctions = [];

    this.isInitialized = false;

    console.log("[EventBusSyncIntegration] Integration destroyed");
  }

  /**
   * Forward SyncManager events to EventBus with proper typing
   */
  private setupSyncManagerEventForwarding(): void {
    // Connection status changes
    const statusHandler = (status: SyncStatus) => {
      this.eventBus.publishTyped("connection.status", { status }, "system");
    };
    this.syncManager.on("status_changed", statusHandler);

    // Data updates from sync operations
    const dataUpdateHandler = (data: SyncData) => {
      this.eventBus.publishTyped(
        "data.updated",
        {
          section: data.type,
          data: data.payload,
        },
        "server",
        data.id
      );
    };
    this.syncManager.on("data_updated", dataUpdateHandler);

    // Sync errors
    const syncErrorHandler = (error: SyncError) => {
      this.eventBus.publishTyped(
        "error.sync",
        {
          error: {
            type: error.type,
            message: error.message,
            code: error.code,
            timestamp: error.timestamp,
            retryable: error.retryable,
          },
          context: error.context,
        },
        "system"
      );
    };
    this.syncManager.on("sync_error", syncErrorHandler);

    // Connection events
    const connectedHandler = () => {
      this.eventBus.publishTyped(
        "connection.status",
        {
          status: {
            connected: true,
            connectionType: this.syncManager.getStatus().connectionType,
            timestamp: Date.now(),
          },
        },
        "system"
      );
    };
    this.syncManager.on("connected", connectedHandler);

    const disconnectedHandler = () => {
      this.eventBus.publishTyped(
        "connection.status",
        {
          status: {
            connected: false,
            connectionType: "offline",
            timestamp: Date.now(),
          },
        },
        "system"
      );
    };
    this.syncManager.on("disconnected", disconnectedHandler);

    const reconnectingHandler = (data: unknown) => {
      this.eventBus.publishTyped(
        "connection.status",
        {
          status: {
            connected: false,
            connectionType: "offline",
            reconnecting: true,
            reconnectData: data,
            timestamp: Date.now(),
          },
        },
        "system"
      );
    };
    this.syncManager.on("reconnecting", reconnectingHandler);

    // Store unsubscribe functions
    this.unsubscribeFunctions.push(
      () => this.syncManager.off("status_changed", statusHandler),
      () => this.syncManager.off("data_updated", dataUpdateHandler),
      () => this.syncManager.off("sync_error", syncErrorHandler),
      () => this.syncManager.off("connected", connectedHandler),
      () => this.syncManager.off("disconnected", disconnectedHandler),
      () => this.syncManager.off("reconnecting", reconnectingHandler)
    );
  }

  /**
   * Set up EventBus to SyncManager communication bridge
   */
  private setupEventBusToSyncManagerBridge(): void {
    // Handle force sync requests from EventBus
    const unsubscribeForcSync = this.eventBus.subscribeTyped(
      "sync.forced",
      async event => {
        try {
          console.log("[EventBusSyncIntegration] Force sync requested:", event.payload);
          await this.syncManager.forceSyncAll();

          // Publish success event
          this.eventBus.publishTyped(
            "sync.forced",
            {
              trigger: "system",
            },
            "system",
            event.correlationId
          );
        } catch (error) {
          console.error("[EventBusSyncIntegration] Force sync failed:", error);

          // Publish error event
          this.eventBus.publishTyped(
            "error.sync",
            {
              error: {
                type: "sync_error",
                message: error instanceof Error ? error.message : "Unknown sync error",
                timestamp: Date.now(),
                retryable: true,
              },
              context: {
                operation: "force_sync",
                trigger: event.payload.trigger,
              },
            },
            "system",
            event.correlationId
          );
        }
      },
      { priority: 1 }
    );

    // Handle data inconsistency detection
    const unsubscribeInconsistency = this.eventBus.subscribeTyped(
      "data.inconsistency",
      async event => {
        console.log("[EventBusSyncIntegration] Data inconsistency detected:", event.payload);

        try {
          // Validate data consistency through SyncManager
          const isConsistent = await this.syncManager.validateDataConsistency();

          if (!isConsistent) {
            // Force a sync to resolve inconsistencies
            await this.syncManager.forceSyncAll();

            this.eventBus.publishTyped(
              "data.updated",
              {
                section: "all",
                data: { inconsistencyResolved: true },
              },
              "system",
              event.correlationId
            );
          }
        } catch (error) {
          console.error("[EventBusSyncIntegration] Failed to resolve inconsistency:", error);

          this.eventBus.publishTyped(
            "error.sync",
            {
              error: {
                type: "consistency_error",
                message: error instanceof Error ? error.message : "Consistency check failed",
                timestamp: Date.now(),
                retryable: true,
              },
              context: {
                operation: "consistency_check",
                sections: event.payload.sections,
              },
            },
            "system",
            event.correlationId
          );
        }
      }
    );

    // Handle user actions that require sync
    const unsubscribeUserAction = this.eventBus.subscribeTyped("user.action", event => {
      const { action, data } = event.payload;

      // Determine if this action requires immediate sync
      const syncRequiredActions = [
        "favorite_added",
        "favorite_removed",
        "download_completed",
        "order_placed",
        "profile_updated",
      ];

      if (syncRequiredActions.includes(action)) {
        console.log("[EventBusSyncIntegration] User action requires sync:", action);

        // Trigger optimistic update through EventBus
        this.eventBus.publishTyped(
          "optimistic.applied",
          {
            update: {
              id: `optimistic_${Date.now()}`,
              action,
              data,
              timestamp: Date.now(),
            },
          },
          "system",
          event.correlationId
        );

        // The actual sync will be handled by the data store or other components
        // This integration just ensures the events are properly propagated
      }
    });

    // Store unsubscribe functions
    this.unsubscribeFunctions.push(
      unsubscribeForcSync,
      unsubscribeInconsistency,
      unsubscribeUserAction
    );
  }

  /**
   * Get current sync status and publish it as an event
   */
  public publishCurrentSyncStatus(): void {
    const status = this.syncManager.getStatus();
    this.eventBus.publishTyped("connection.status", { status }, "system");
  }

  /**
   * Get current sync metrics and publish them as an event
   */
  public publishCurrentSyncMetrics(): void {
    const metrics = this.syncManager.getMetrics();
    this.eventBus.publishTyped(
      "data.updated",
      {
        section: "sync_metrics",
        data: metrics,
      },
      "system"
    );
  }

  /**
   * Check if the integration is initialized
   */
  public isReady(): boolean {
    return this.isInitialized;
  }
}

// Singleton instance
let integrationInstance: EventBusSyncIntegration | null = null;

/**
 * Get the singleton EventBusSyncIntegration instance
 */
export const getEventBusSyncIntegration = (): EventBusSyncIntegration => {
  if (!integrationInstance) {
    integrationInstance = new EventBusSyncIntegration();
    integrationInstance.initialize();
  }
  return integrationInstance;
};

/**
 * Destroy the EventBusSyncIntegration instance
 */
export const destroyEventBusSyncIntegration = (): void => {
  if (integrationInstance) {
    integrationInstance.destroy();
    integrationInstance = null;
  }
};

/**
 * Initialize the integration automatically when this module is imported
 * This ensures the EventBus and SyncManager are connected from the start
 */
export const initializeEventBusSyncIntegration = (): void => {
  getEventBusSyncIntegration();
};
