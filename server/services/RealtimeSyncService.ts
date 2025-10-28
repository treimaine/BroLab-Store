/**
 * Realtime Sync Service
 *
 * Integrates Convex events with the message queue and WebSocket system
 * for seamless real-time synchronization across all connection types.
 */

import { getMessageQueue, type QueuedMessage } from "./MessageQueueService";
import { getWebSocketManager } from "./WebSocketManager";

export interface SyncEvent {
  type: string;
  payload: unknown;
  userId?: string;
  topics?: string[];
  correlationId?: string;
}

/**
 * Realtime Sync Manager
 * Coordinates message distribution across WebSocket and polling connections
 */
class RealtimeSyncManager {
  /**
   * Publish an event to all connected clients
   */
  public publish(event: SyncEvent): string {
    const messageId = this.generateMessageId();
    const timestamp = Date.now();

    // Create queued message for polling clients
    const queuedMessage: QueuedMessage = {
      id: messageId,
      type: event.type,
      payload: event.payload,
      timestamp,
      correlationId: event.correlationId,
      userId: event.userId,
      topics: event.topics,
    };

    // Add to message queue
    const messageQueue = getMessageQueue();
    if (event.userId) {
      messageQueue.addMessage(queuedMessage);
    } else {
      messageQueue.broadcast(queuedMessage);
    }

    // Broadcast via WebSocket
    const wsManager = getWebSocketManager();
    const wsMessage = {
      type: event.type,
      payload: event.payload,
      timestamp,
      source: "server" as const,
      id: messageId,
    };

    if (event.topics && event.topics.length > 0) {
      wsManager.broadcastToSubscribers(event.topics, wsMessage);
    } else {
      wsManager.broadcast(wsMessage);
    }

    return messageId;
  }

  /**
   * Publish a data update event
   */
  public publishDataUpdate(section: string, data: unknown, userId?: string): string {
    return this.publish({
      type: "data.updated",
      payload: { section, data },
      userId,
      topics: [`data.${section}`],
    });
  }

  /**
   * Publish a sync complete event
   */
  public publishSyncComplete(data: unknown, userId?: string): string {
    return this.publish({
      type: "sync.complete",
      payload: data,
      userId,
    });
  }

  /**
   * Publish an error event
   */
  public publishError(
    error: { type: string; message: string; context?: unknown },
    userId?: string
  ): string {
    return this.publish({
      type: "error.sync",
      payload: { error, context: error.context || {} },
      userId,
    });
  }

  /**
   * Publish a connection status event
   */
  public publishConnectionStatus(status: string, userId?: string): string {
    return this.publish({
      type: "connection.status",
      payload: { status },
      userId,
    });
  }

  /**
   * Get sync statistics
   */
  public getStats(): {
    messageQueue: ReturnType<ReturnType<typeof getMessageQueue>["getStats"]>;
    websocket: ReturnType<ReturnType<typeof getWebSocketManager>["getStats"]>;
  } {
    const messageQueue = getMessageQueue();
    const wsManager = getWebSocketManager();

    return {
      messageQueue: messageQueue.getStats(),
      websocket: wsManager.getStats(),
    };
  }

  /**
   * Generate unique message ID
   */
  private generateMessageId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }
}

// Singleton instance
let realtimeSyncInstance: RealtimeSyncManager | null = null;

/**
 * Get the singleton RealtimeSyncManager instance
 */
export const getRealtimeSync = (): RealtimeSyncManager => {
  realtimeSyncInstance ??= new RealtimeSyncManager();
  return realtimeSyncInstance;
};

/**
 * Destroy the RealtimeSyncManager instance
 */
export const destroyRealtimeSync = (): void => {
  realtimeSyncInstance = null;
};
