/**
 * Centralized Notification Service
 *
 * Provides typed notification methods (success, error, warning, info)
 * with notification queuing and integration with the existing toast system.
 *
 * @module NotificationService
 * @requirements 8.1, 8.4, 8.5
 */

import type { ToastActionElement } from "@/components/ui/toast";
import { toast } from "@/hooks/use-toast";
import { ERROR_MESSAGES, ErrorType } from "@shared/constants/errors";

// ================================
// TYPES AND INTERFACES
// ================================

/**
 * Notification types for visual styling
 */
export type NotificationType = "success" | "error" | "warning" | "info";

/**
 * Notification priority levels for queue ordering
 */
export type NotificationPriority = "low" | "normal" | "high" | "urgent";

/**
 * Configuration options for individual notifications
 */
export interface NotificationOptions {
  /** Notification title */
  title?: string;
  /** Notification description/message */
  description?: string;
  /** Auto-dismiss duration in milliseconds (0 = no auto-dismiss) */
  duration?: number;
  /** Priority level for queue ordering */
  priority?: NotificationPriority;
  /** Optional action element */
  action?: ToastActionElement;
  /** Whether to deduplicate similar notifications */
  deduplicate?: boolean;
  /** Custom deduplication key */
  deduplicationKey?: string;
}

/**
 * Internal notification item for queue management
 */
interface QueuedNotification {
  id: string;
  type: NotificationType;
  options: NotificationOptions;
  timestamp: number;
  priority: NotificationPriority;
}

/**
 * Notification service configuration
 */
export interface NotificationServiceConfig {
  /** Maximum notifications to show at once */
  maxVisible: number;
  /** Default auto-dismiss duration (ms) */
  defaultDuration: number;
  /** Deduplication window (ms) */
  deduplicationWindow: number;
  /** Maximum queue size */
  maxQueueSize: number;
  /** Minimum delay between notifications (ms) */
  minDelay: number;
}

// ================================
// DEFAULT CONFIGURATION
// ================================

const DEFAULT_CONFIG: NotificationServiceConfig = {
  maxVisible: 3,
  defaultDuration: 5000,
  deduplicationWindow: 3000,
  maxQueueSize: 20,
  minDelay: 300,
};

// ================================
// NOTIFICATION SERVICE CLASS
// ================================

/**
 * Centralized notification service that wraps the toast system
 * with typed methods, queuing, and deduplication.
 */
class NotificationServiceImpl {
  private config: NotificationServiceConfig;
  private queue: QueuedNotification[] = [];
  private readonly activeNotifications: Set<string> = new Set();
  private readonly recentFingerprints: Map<string, number> = new Map();
  private isProcessing = false;
  private notificationCount = 0;
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor(config: Partial<NotificationServiceConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.startCleanupInterval();
  }

  // ================================
  // PUBLIC NOTIFICATION METHODS
  // ================================

  /**
   * Show a success notification
   */
  public success(message: string, options: Omit<NotificationOptions, "description"> = {}): string {
    return this.notify("success", {
      ...options,
      title: options.title ?? "Success",
      description: message,
    });
  }

  /**
   * Show an error notification
   */
  public error(message: string, options: Omit<NotificationOptions, "description"> = {}): string {
    return this.notify("error", {
      ...options,
      title: options.title ?? "Error",
      description: message,
      priority: options.priority ?? "high",
    });
  }

  /**
   * Show a warning notification
   */
  public warning(message: string, options: Omit<NotificationOptions, "description"> = {}): string {
    return this.notify("warning", {
      ...options,
      title: options.title ?? "Warning",
      description: message,
    });
  }

  /**
   * Show an info notification
   */
  public info(message: string, options: Omit<NotificationOptions, "description"> = {}): string {
    return this.notify("info", {
      ...options,
      title: options.title ?? "Info",
      description: message,
    });
  }

  /**
   * Show an error notification from an ErrorType
   */
  public errorFromType(
    errorType: ErrorType,
    options: Omit<NotificationOptions, "description"> = {}
  ): string {
    const message = ERROR_MESSAGES[errorType] ?? ERROR_MESSAGES[ErrorType.UNKNOWN_ERROR];
    return this.error(message, options);
  }

  /**
   * Show an error notification from an Error object
   */
  public errorFromException(
    error: unknown,
    fallbackMessage = "An unexpected error occurred"
  ): string {
    const message = error instanceof Error ? error.message : fallbackMessage;
    return this.error(message);
  }

  // ================================
  // CORE NOTIFICATION LOGIC
  // ================================

  /**
   * Core notification method that handles queuing and deduplication
   */
  private notify(type: NotificationType, options: NotificationOptions): string {
    const id = this.generateId();
    const priority = options.priority ?? "normal";

    // Check for deduplication
    if (options.deduplicate !== false) {
      const fingerprint = this.generateFingerprint(type, options);
      if (this.isDuplicate(fingerprint)) {
        return ""; // Skip duplicate notification
      }
      this.recentFingerprints.set(fingerprint, Date.now());
    }

    const notification: QueuedNotification = {
      id,
      type,
      options,
      timestamp: Date.now(),
      priority,
    };

    // Add to queue with priority ordering
    this.addToQueue(notification);

    // Process queue
    this.processQueue();

    return id;
  }

  /**
   * Add notification to queue with priority ordering
   */
  private addToQueue(notification: QueuedNotification): void {
    // Enforce max queue size
    if (this.queue.length >= this.config.maxQueueSize) {
      // Remove lowest priority item
      const lowestPriorityIndex = this.findLowestPriorityIndex();
      if (lowestPriorityIndex !== -1) {
        this.queue.splice(lowestPriorityIndex, 1);
      }
    }

    // Insert based on priority
    const priorityOrder: Record<NotificationPriority, number> = {
      urgent: 4,
      high: 3,
      normal: 2,
      low: 1,
    };

    const insertIndex = this.queue.findIndex(
      item => priorityOrder[item.priority] < priorityOrder[notification.priority]
    );

    if (insertIndex === -1) {
      this.queue.push(notification);
    } else {
      this.queue.splice(insertIndex, 0, notification);
    }
  }

  /**
   * Process the notification queue
   */
  private processQueue(): void {
    if (this.isProcessing || this.queue.length === 0) {
      return;
    }

    // Check if we can show more notifications
    if (this.activeNotifications.size >= this.config.maxVisible) {
      return;
    }

    this.isProcessing = true;

    const notification = this.queue.shift();
    if (notification) {
      this.showNotification(notification);
    }

    // Schedule next processing with minimum delay
    setTimeout(() => {
      this.isProcessing = false;
      this.processQueue();
    }, this.config.minDelay);
  }

  /**
   * Show a notification using the toast system
   */
  private showNotification(notification: QueuedNotification): void {
    const { id, type, options } = notification;

    this.activeNotifications.add(id);

    const variant = type === "error" ? "destructive" : "default";

    const toastResult = toast({
      variant,
      title: options.title,
      description: options.description,
      action: options.action,
    });

    // Track dismissal
    const duration = options.duration ?? this.config.defaultDuration;
    if (duration > 0) {
      setTimeout(() => {
        toastResult.dismiss();
        this.activeNotifications.delete(id);
        this.processQueue(); // Process next in queue
      }, duration);
    }
  }

  // ================================
  // UTILITY METHODS
  // ================================

  /**
   * Generate unique notification ID
   */
  private generateId(): string {
    this.notificationCount = (this.notificationCount + 1) % Number.MAX_SAFE_INTEGER;
    return `notification-${Date.now()}-${this.notificationCount}`;
  }

  /**
   * Generate fingerprint for deduplication
   */
  private generateFingerprint(type: NotificationType, options: NotificationOptions): string {
    if (options.deduplicationKey) {
      return options.deduplicationKey;
    }
    return `${type}:${options.title ?? ""}:${options.description ?? ""}`;
  }

  /**
   * Check if notification is a duplicate
   */
  private isDuplicate(fingerprint: string): boolean {
    const lastShown = this.recentFingerprints.get(fingerprint);
    if (!lastShown) {
      return false;
    }
    return Date.now() - lastShown < this.config.deduplicationWindow;
  }

  /**
   * Find index of lowest priority item in queue
   */
  private findLowestPriorityIndex(): number {
    const priorityOrder: Record<NotificationPriority, number> = {
      urgent: 4,
      high: 3,
      normal: 2,
      low: 1,
    };

    let lowestIndex = -1;
    let lowestPriority = Infinity;

    for (let i = 0; i < this.queue.length; i++) {
      const priority = priorityOrder[this.queue[i].priority];
      if (priority < lowestPriority) {
        lowestPriority = priority;
        lowestIndex = i;
      }
    }

    return lowestIndex;
  }

  // FIX: Visibility handler for pausing intervals when tab is hidden
  private visibilityHandler: (() => void) | null = null;

  /**
   * Start cleanup interval for expired fingerprints
   * FIX: Uses visibility-aware interval to prevent browser freezes
   */
  private startCleanupInterval(): void {
    const startInterval = (): void => {
      if (this.cleanupInterval) return;

      this.cleanupInterval = setInterval(() => {
        if (document.hidden) return;

        const now = Date.now();
        for (const [fingerprint, timestamp] of this.recentFingerprints.entries()) {
          if (now - timestamp > this.config.deduplicationWindow * 2) {
            this.recentFingerprints.delete(fingerprint);
          }
        }
      }, 60000); // Clean up every minute
    };

    const stopInterval = (): void => {
      if (this.cleanupInterval) {
        clearInterval(this.cleanupInterval);
        this.cleanupInterval = null;
      }
    };

    this.visibilityHandler = (): void => {
      if (document.hidden) {
        stopInterval();
      } else {
        // Stagger restart to prevent thundering herd
        setTimeout(
          () => {
            startInterval();
          },
          Math.random() * 500 + 250
        );
      }
    };

    // Start interval if tab is visible
    if (!document.hidden) {
      startInterval();
    }

    document.addEventListener("visibilitychange", this.visibilityHandler, { passive: true });
  }

  // ================================
  // QUEUE MANAGEMENT
  // ================================

  /**
   * Get current queue status
   */
  public getQueueStatus(): {
    queueSize: number;
    activeCount: number;
    isProcessing: boolean;
  } {
    return {
      queueSize: this.queue.length,
      activeCount: this.activeNotifications.size,
      isProcessing: this.isProcessing,
    };
  }

  /**
   * Clear all queued notifications
   */
  public clearQueue(): void {
    this.queue = [];
  }

  /**
   * Dismiss all active notifications
   */
  public dismissAll(): void {
    this.activeNotifications.clear();
    this.queue = [];
  }

  /**
   * Update service configuration
   */
  public configure(config: Partial<NotificationServiceConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Destroy the notification service and clean up resources
   */
  public destroy(): void {
    // FIX: Remove visibility listener to prevent memory leaks
    if (this.visibilityHandler) {
      document.removeEventListener("visibilitychange", this.visibilityHandler);
      this.visibilityHandler = null;
    }

    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.queue = [];
    this.activeNotifications.clear();
    this.recentFingerprints.clear();
  }
}

// ================================
// SINGLETON INSTANCE
// ================================

let notificationServiceInstance: NotificationServiceImpl | null = null;

/**
 * Get the singleton NotificationService instance
 */
export function getNotificationService(): NotificationServiceImpl {
  notificationServiceInstance ??= new NotificationServiceImpl();
  return notificationServiceInstance;
}

/**
 * Destroy the NotificationService instance (for cleanup on app unmount)
 */
export function destroyNotificationService(): void {
  if (notificationServiceInstance) {
    notificationServiceInstance.destroy();
    notificationServiceInstance = null;
  }
}

/**
 * Singleton notification service instance for direct import
 */
export const notificationService = getNotificationService();

// ================================
// CONVENIENCE EXPORTS
// ================================

/**
 * Show a success notification
 */
export function showSuccess(
  message: string,
  options?: Omit<NotificationOptions, "description">
): string {
  return notificationService.success(message, options);
}

/**
 * Show an error notification
 */
export function showError(
  message: string,
  options?: Omit<NotificationOptions, "description">
): string {
  return notificationService.error(message, options);
}

/**
 * Show a warning notification
 */
export function showWarning(
  message: string,
  options?: Omit<NotificationOptions, "description">
): string {
  return notificationService.warning(message, options);
}

/**
 * Show an info notification
 */
export function showInfo(
  message: string,
  options?: Omit<NotificationOptions, "description">
): string {
  return notificationService.info(message, options);
}

/**
 * Show an error notification from an ErrorType
 */
export function showErrorFromType(
  errorType: ErrorType,
  options?: Omit<NotificationOptions, "description">
): string {
  return notificationService.errorFromType(errorType, options);
}

/**
 * Show an error notification from an Error object
 */
export function showErrorFromException(error: unknown, fallbackMessage?: string): string {
  return notificationService.errorFromException(error, fallbackMessage);
}

export type { NotificationServiceImpl as NotificationService };
