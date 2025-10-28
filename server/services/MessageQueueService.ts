/**
 * Message Queue Service
 *
 * Manages real-time message queuing and delivery for polling clients.
 * Provides in-memory message storage with automatic cleanup.
 */

interface QueuedMessage {
  id: string;
  type: string;
  payload: unknown;
  timestamp: number;
  correlationId?: string;
  userId?: string;
  topics?: string[];
}

interface MessageQueue {
  messages: QueuedMessage[];
  lastCleanup: number;
}

/**
 * Message Queue Manager
 * Singleton service for managing real-time messages
 */
class MessageQueueManager {
  private readonly queues: Map<string, MessageQueue> = new Map();
  private readonly MESSAGE_TTL = 5 * 60 * 1000; // 5 minutes
  private readonly CLEANUP_INTERVAL = 60 * 1000; // 1 minute
  private cleanupTimer: NodeJS.Timeout | null = null;

  constructor() {
    this.startCleanupTimer();
  }

  /**
   * Add a message to the queue
   */
  public addMessage(message: QueuedMessage): void {
    const userId = message.userId || "global";

    if (!this.queues.has(userId)) {
      this.queues.set(userId, {
        messages: [],
        lastCleanup: Date.now(),
      });
    }

    const queue = this.queues.get(userId)!;
    queue.messages.push(message);

    // Limit queue size to prevent memory issues
    if (queue.messages.length > 1000) {
      queue.messages = queue.messages.slice(-500);
    }
  }

  /**
   * Get messages since a specific timestamp
   */
  public getMessagesSince(userId: string, since: number): QueuedMessage[] {
    const queue = this.queues.get(userId);
    if (!queue) {
      return [];
    }

    return queue.messages.filter(msg => msg.timestamp > since);
  }

  /**
   * Get all messages for a user
   */
  public getAllMessages(userId: string): QueuedMessage[] {
    const queue = this.queues.get(userId);
    return queue ? [...queue.messages] : [];
  }

  /**
   * Clear messages for a user
   */
  public clearMessages(userId: string): void {
    this.queues.delete(userId);
  }

  /**
   * Broadcast a message to all users
   */
  public broadcast(message: Omit<QueuedMessage, "userId">): void {
    const broadcastMessage: QueuedMessage = {
      ...message,
      userId: "global",
    };

    // Add to global queue
    this.addMessage(broadcastMessage);

    // Add to all user queues
    for (const [userId, _queue] of this.queues) {
      if (userId !== "global") {
        this.addMessage({ ...broadcastMessage, userId });
      }
    }
  }

  /**
   * Get queue statistics
   */
  public getStats(): {
    totalQueues: number;
    totalMessages: number;
    queueSizes: Record<string, number>;
  } {
    const queueSizes: Record<string, number> = {};
    let totalMessages = 0;

    for (const [userId, queue] of this.queues) {
      queueSizes[userId] = queue.messages.length;
      totalMessages += queue.messages.length;
    }

    return {
      totalQueues: this.queues.size,
      totalMessages,
      queueSizes,
    };
  }

  /**
   * Clean up old messages
   */
  private cleanup(): void {
    const now = Date.now();
    const cutoff = now - this.MESSAGE_TTL;

    for (const [userId, queue] of this.queues) {
      // Remove old messages
      queue.messages = queue.messages.filter(msg => msg.timestamp > cutoff);
      queue.lastCleanup = now;

      // Remove empty queues
      if (queue.messages.length === 0 && userId !== "global") {
        this.queues.delete(userId);
      }
    }
  }

  /**
   * Start automatic cleanup timer
   */
  private startCleanupTimer(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanup();
    }, this.CLEANUP_INTERVAL);
  }

  /**
   * Stop cleanup timer
   */
  public destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
    this.queues.clear();
  }
}

// Singleton instance
let messageQueueInstance: MessageQueueManager | null = null;

/**
 * Get the singleton MessageQueueManager instance
 */
export const getMessageQueue = (): MessageQueueManager => {
  messageQueueInstance ??= new MessageQueueManager();
  return messageQueueInstance;
};

/**
 * Destroy the MessageQueueManager instance
 */
export const destroyMessageQueue = (): void => {
  if (messageQueueInstance) {
    messageQueueInstance.destroy();
    messageQueueInstance = null;
  }
};

export type { QueuedMessage };
