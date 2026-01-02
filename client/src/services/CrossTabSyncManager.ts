/**
 * Cross-Tab Synchronization Manager
 *
 * Implements BroadcastChannel API for cross-tab communication of data changes
 * with localStorage event listeners as fallback for older browsers.
 * Includes tab focus detection and conflict resolution for simultaneous actions.
 */

import BrowserEventEmitter from "@/utils/BrowserEventEmitter";
import { ServiceVisibilityManager } from "@/utils/ServiceVisibilityManager";
import type { DashboardData } from "@shared/types/dashboard";
import type { OptimisticUpdate } from "@shared/types/sync";

// ================================
// CROSS-TAB INTERFACES
// ================================

export interface CrossTabMessage {
  /** Message type */
  type: CrossTabMessageType;
  /** Message payload */
  payload: unknown;
  /** Message ID for deduplication */
  id: string;
  /** Timestamp when message was sent */
  timestamp: number;
  /** Tab ID that sent the message */
  tabId: string;
  /** User ID for multi-user scenarios */
  userId?: string;
  /** Correlation ID for related messages */
  correlationId?: string;
}

export enum CrossTabMessageType {
  DATA_UPDATE = "data_update",
  OPTIMISTIC_UPDATE = "optimistic_update",
  OPTIMISTIC_ROLLBACK = "optimistic_rollback",
  SYNC_STATUS = "sync_status",
  TAB_FOCUS = "tab_focus",
  TAB_BLUR = "tab_blur",
  CONFLICT_DETECTED = "conflict_detected",
  CONFLICT_RESOLVED = "conflict_resolved",
  HEARTBEAT = "heartbeat",
  SYNC_REQUEST = "sync_request",
}

export interface TabInfo {
  /** Unique tab identifier */
  id: string;
  /** Tab creation timestamp */
  createdAt: number;
  /** Last activity timestamp */
  lastActivity: number;
  /** Whether tab is currently focused */
  focused: boolean;
  /** Tab URL */
  url: string;
  /** User agent for debugging */
  userAgent: string;
}

export interface ConflictInfo {
  /** Conflict ID */
  id: string;
  /** Conflicting updates */
  updates: OptimisticUpdate[];
  /** Tabs involved in conflict */
  tabIds: string[];
  /** Conflict detection timestamp */
  detectedAt: number;
  /** Conflict type */
  type: "concurrent_update" | "version_mismatch" | "timing_conflict";
  /** Affected data section */
  section: string;
}

export interface CrossTabSyncConfig {
  /** BroadcastChannel name */
  channelName: string;
  /** localStorage key prefix */
  storagePrefix: string;
  /** Heartbeat interval (ms) */
  heartbeatInterval: number;
  /** Tab timeout for cleanup (ms) */
  tabTimeout: number;
  /** Message deduplication window (ms) */
  deduplicationWindow: number;
  /** Maximum stored messages for fallback */
  maxStoredMessages: number;
  /** Conflict resolution timeout (ms) */
  conflictResolutionTimeout: number;
  /** Enable debug logging */
  debug: boolean;
}

// ================================
// CROSS-TAB SYNC MANAGER
// ================================

export class CrossTabSyncManager extends BrowserEventEmitter {
  private readonly config: CrossTabSyncConfig;
  private readonly tabId: string;
  private readonly userId: string;

  // Communication channels
  private broadcastChannel: BroadcastChannel | null = null;
  private storageListener: ((event: StorageEvent) => void) | null = null;

  // State management
  private readonly activeTabs = new Map<string, TabInfo>();
  private readonly messageHistory = new Map<string, number>(); // messageId -> timestamp
  private readonly pendingConflicts = new Map<string, ConflictInfo>();
  private isDestroyed = false;

  // FIX: Use visibility-aware interval management to prevent browser freezes
  private readonly visibilityManager = new ServiceVisibilityManager("CrossTabSyncManager", {
    resumeBaseDelay: 800,
    resumeStaggerRange: 1600,
    minVisibleTime: 400,
  });

  // Focus detection
  private isFocused = true;

  constructor(config: Partial<CrossTabSyncConfig> = {}, userId: string = "anonymous") {
    super();

    // FIX: Increase intervals in production to reduce CPU usage
    const isProduction =
      globalThis.window !== undefined && globalThis.window.location.hostname !== "localhost";

    this.config = {
      channelName: config.channelName || "brolab-dashboard-sync",
      storagePrefix: config.storagePrefix || "brolab_sync_",
      // Increase heartbeat interval in production (60s vs 30s)
      heartbeatInterval: config.heartbeatInterval || (isProduction ? 60000 : 30000),
      // Increase tab timeout in production (120s vs 60s)
      tabTimeout: config.tabTimeout || (isProduction ? 120000 : 60000),
      // Increase deduplication window in production (10s vs 5s)
      deduplicationWindow: config.deduplicationWindow || (isProduction ? 10000 : 5000),
      maxStoredMessages: config.maxStoredMessages || 100,
      conflictResolutionTimeout: config.conflictResolutionTimeout || 10000,
      debug: config.debug || false,
    };

    this.tabId = this.generateTabId();
    this.userId = userId;

    this.initialize();
  }

  // ================================
  // PUBLIC API
  // ================================

  /**
   * Broadcast data update to all tabs
   */
  public broadcastDataUpdate(section: string, data: Partial<DashboardData>): void {
    this.sendMessage({
      type: CrossTabMessageType.DATA_UPDATE,
      payload: { section, data },
      id: this.generateMessageId(),
      timestamp: Date.now(),
    });
  }

  /**
   * Broadcast optimistic update to all tabs
   */
  public broadcastOptimisticUpdate(update: OptimisticUpdate): void {
    this.sendMessage({
      type: CrossTabMessageType.OPTIMISTIC_UPDATE,
      payload: update,
      id: this.generateMessageId(),
      timestamp: Date.now(),
      correlationId: update.id,
    });
  }

  /**
   * Broadcast optimistic rollback to all tabs
   */
  public broadcastOptimisticRollback(updateId: string, reason: string): void {
    this.sendMessage({
      type: CrossTabMessageType.OPTIMISTIC_ROLLBACK,
      payload: { updateId, reason },
      id: this.generateMessageId(),
      timestamp: Date.now(),
      correlationId: updateId,
    });
  }

  /**
   * Request sync from other tabs
   */
  public requestSync(sections?: string[]): void {
    this.sendMessage({
      type: CrossTabMessageType.SYNC_REQUEST,
      payload: { sections },
      id: this.generateMessageId(),
      timestamp: Date.now(),
    });
  }

  /**
   * Get information about all active tabs
   */
  public getActiveTabs(): TabInfo[] {
    return Array.from(this.activeTabs.values());
  }

  /**
   * Get current tab information
   */
  public getCurrentTab(): TabInfo {
    return this.activeTabs.get(this.tabId) || this.createTabInfo();
  }

  /**
   * Check if tab is currently focused
   */
  public isFocusedTab(): boolean {
    return this.isFocused;
  }

  /**
   * Get pending conflicts
   */
  public getPendingConflicts(): ConflictInfo[] {
    return Array.from(this.pendingConflicts.values());
  }

  /**
   * Resolve a conflict manually
   */
  public resolveConflict(conflictId: string, resolution: "accept" | "reject" | "merge"): void {
    const conflict = this.pendingConflicts.get(conflictId);
    if (!conflict) return;

    this.sendMessage({
      type: CrossTabMessageType.CONFLICT_RESOLVED,
      payload: { conflictId, resolution, resolvedBy: this.tabId },
      id: this.generateMessageId(),
      timestamp: Date.now(),
      correlationId: conflictId,
    });

    this.pendingConflicts.delete(conflictId);
    this.emit("conflict_resolved", { conflict, resolution });
  }

  /**
   * Destroy the sync manager and cleanup resources
   */
  public destroy(): void {
    if (this.isDestroyed) return;

    this.isDestroyed = true;

    // FIX: Clean up visibility manager (handles all intervals)
    this.visibilityManager.destroy();

    // Remove event listeners
    if (this.storageListener) {
      globalThis.removeEventListener("storage", this.storageListener);
      this.storageListener = null;
    }

    globalThis.removeEventListener("focus", this.handleFocus);
    globalThis.removeEventListener("blur", this.handleBlur);
    globalThis.removeEventListener("beforeunload", this.handleBeforeUnload);

    // Close broadcast channel
    if (this.broadcastChannel) {
      this.broadcastChannel.close();
      this.broadcastChannel = null;
    }

    // Remove tab from active tabs
    this.activeTabs.delete(this.tabId);
    this.updateActiveTabsStorage();

    // Clear all listeners
    this.removeAllListeners();

    this.log("CrossTabSyncManager destroyed");
  }

  // ================================
  // PRIVATE METHODS
  // ================================

  /**
   * Initialize the sync manager
   */
  private initialize(): void {
    this.log("Initializing CrossTabSyncManager", { tabId: this.tabId, userId: this.userId });

    // Register current tab
    this.registerTab();

    // Setup communication channels
    this.setupBroadcastChannel();
    this.setupStorageFallback();

    // Setup focus detection
    this.setupFocusDetection();

    // Start periodic tasks
    this.startHeartbeat();
    this.startCleanup();

    // Load existing tabs
    this.loadActiveTabs();

    this.log("CrossTabSyncManager initialized successfully");
  }

  /**
   * Generate unique tab ID
   */
  private generateTabId(): string {
    return `tab_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }

  /**
   * Generate unique message ID
   */
  private generateMessageId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }

  /**
   * Create tab info for current tab
   */
  private createTabInfo(): TabInfo {
    return {
      id: this.tabId,
      createdAt: Date.now(),
      lastActivity: Date.now(),
      focused: this.isFocused,
      url: globalThis.location.href,
      userAgent: navigator.userAgent,
    };
  }

  /**
   * Register current tab
   */
  private registerTab(): void {
    const tabInfo = this.createTabInfo();
    this.activeTabs.set(this.tabId, tabInfo);
    this.updateActiveTabsStorage();
  }

  /**
   * Setup BroadcastChannel for modern browsers
   */
  private setupBroadcastChannel(): void {
    if (typeof BroadcastChannel === "undefined") {
      this.log("BroadcastChannel not supported, using localStorage fallback only");
      return;
    }

    try {
      this.broadcastChannel = new BroadcastChannel(this.config.channelName);
      this.broadcastChannel.addEventListener("message", this.handleBroadcastMessage);
      this.log("BroadcastChannel setup successful");
    } catch (error) {
      this.log("BroadcastChannel setup failed", error);
      this.broadcastChannel = null;
    }
  }

  /**
   * Setup localStorage fallback for older browsers
   */
  private setupStorageFallback(): void {
    this.storageListener = (event: StorageEvent): void => {
      if (event.key?.startsWith(this.config.storagePrefix + "message_")) {
        try {
          const message = JSON.parse(event.newValue || "{}") as CrossTabMessage;
          this.handleMessage(message, "storage");
        } catch (error) {
          this.log("Failed to parse storage message", error);
        }
      }
    };

    globalThis.addEventListener("storage", this.storageListener);
    this.log("Storage fallback setup successful");
  }

  /**
   * Setup focus detection with visibility-aware interval
   * FIX: Uses ServiceVisibilityManager to pause when tab is hidden
   */
  private setupFocusDetection(): void {
    globalThis.addEventListener("focus", this.handleFocus);
    globalThis.addEventListener("blur", this.handleBlur);
    globalThis.addEventListener("beforeunload", this.handleBeforeUnload);

    // Check focus state periodically with visibility-aware interval
    const isProduction =
      globalThis.window !== undefined && globalThis.window.location.hostname !== "localhost";
    const focusCheckInterval = isProduction ? 15000 : 10000;

    this.visibilityManager.createInterval(
      "focusCheck",
      () => {
        this.updateTabActivity();
      },
      focusCheckInterval
    );
  }

  /**
   * Start heartbeat with visibility-aware interval
   * FIX: Uses ServiceVisibilityManager to pause when tab is hidden
   */
  private startHeartbeat(): void {
    this.visibilityManager.createInterval(
      "heartbeat",
      () => {
        if (!this.isDestroyed) {
          this.sendHeartbeat();
        }
      },
      this.config.heartbeatInterval
    );
  }

  /**
   * Start cleanup with visibility-aware interval
   * FIX: Uses ServiceVisibilityManager to pause when tab is hidden
   */
  private startCleanup(): void {
    this.visibilityManager.createInterval(
      "cleanup",
      () => {
        if (!this.isDestroyed) {
          this.cleanupInactiveTabs();
        }
      },
      this.config.tabTimeout / 2
    );
  }

  /**
   * Send message via available channels
   */
  private sendMessage(
    message: Pick<CrossTabMessage, "type" | "payload" | "id"> &
      Partial<Pick<CrossTabMessage, "timestamp" | "correlationId">>
  ): void {
    if (this.isDestroyed) return;

    const fullMessage: CrossTabMessage = {
      ...message,
      timestamp: message.timestamp || Date.now(),
      tabId: this.tabId,
      userId: this.userId,
    };

    // Check for message deduplication
    if (this.isDuplicateMessage(fullMessage.id)) {
      return;
    }

    // Add to message history
    this.messageHistory.set(fullMessage.id, fullMessage.timestamp);

    // Send via BroadcastChannel if available
    if (this.broadcastChannel) {
      try {
        this.broadcastChannel.postMessage(fullMessage);
        this.log("Message sent via BroadcastChannel", { type: message.type, id: message.id });
      } catch (error) {
        this.log("Failed to send via BroadcastChannel", error);
      }
    }

    // Send via localStorage as fallback
    try {
      const storageKey = `${this.config.storagePrefix}message_${fullMessage.id}`;
      localStorage.setItem(storageKey, JSON.stringify(fullMessage));

      // Clean up storage message after a delay
      setTimeout(() => {
        try {
          localStorage.removeItem(storageKey);
        } catch {
          // Ignore cleanup errors
        }
      }, this.config.deduplicationWindow);

      this.log("Message sent via localStorage", { type: message.type, id: message.id });
    } catch (error) {
      this.log("Failed to send via localStorage", error);
    }

    // Clean up old message history
    this.cleanupMessageHistory();
  }

  /**
   * Handle BroadcastChannel message
   */
  private readonly handleBroadcastMessage = (event: MessageEvent<CrossTabMessage>): void => {
    this.handleMessage(event.data, "broadcast");
  };

  /**
   * Handle message from any source
   */
  private handleMessage(message: CrossTabMessage, source: "broadcast" | "storage"): void {
    if (this.isDestroyed) return;

    // Ignore messages from same tab
    if (message.tabId === this.tabId) return;

    // Check for duplicate messages
    if (this.isDuplicateMessage(message.id)) return;

    // Add to message history
    this.messageHistory.set(message.id, message.timestamp);

    this.log("Received message", {
      type: message.type,
      id: message.id,
      source,
      fromTab: message.tabId,
    });

    // Update sender tab info
    this.updateTabFromMessage(message);

    // Handle message based on type
    switch (message.type) {
      case CrossTabMessageType.DATA_UPDATE:
        this.handleDataUpdate(message);
        break;
      case CrossTabMessageType.OPTIMISTIC_UPDATE:
        this.handleOptimisticUpdate(message);
        break;
      case CrossTabMessageType.OPTIMISTIC_ROLLBACK:
        this.handleOptimisticRollback(message);
        break;
      case CrossTabMessageType.SYNC_REQUEST:
        this.handleSyncRequest(message);
        break;
      case CrossTabMessageType.TAB_FOCUS:
        this.handleTabFocus(message);
        break;
      case CrossTabMessageType.TAB_BLUR:
        this.handleTabBlur(message);
        break;
      case CrossTabMessageType.HEARTBEAT:
        this.handleHeartbeat(message);
        break;
      case CrossTabMessageType.CONFLICT_DETECTED:
        this.handleConflictDetected(message);
        break;
      case CrossTabMessageType.CONFLICT_RESOLVED:
        this.handleConflictResolved(message);
        break;
      default:
        this.log("Unknown message type", message.type);
    }
  }

  /**
   * Handle data update message
   */
  private handleDataUpdate(message: CrossTabMessage): void {
    const payload = message.payload as { section: string; data: Partial<DashboardData> };
    this.emit("data_update", {
      section: payload.section,
      data: payload.data,
      fromTab: message.tabId,
      timestamp: message.timestamp,
    });
  }

  /**
   * Handle optimistic update message
   */
  private handleOptimisticUpdate(message: CrossTabMessage): void {
    const update = message.payload as OptimisticUpdate;

    // Check for conflicts with pending updates
    const conflict = this.detectConflict(update);
    if (conflict) {
      this.handleConflict(conflict);
      return;
    }

    this.emit("optimistic_update", {
      update,
      fromTab: message.tabId,
      timestamp: message.timestamp,
    });
  }

  /**
   * Handle optimistic rollback message
   */
  private handleOptimisticRollback(message: CrossTabMessage): void {
    const payload = message.payload as { updateId: string; reason: string };
    this.emit("optimistic_rollback", {
      updateId: payload.updateId,
      reason: payload.reason,
      fromTab: message.tabId,
      timestamp: message.timestamp,
    });
  }

  /**
   * Handle sync request message
   */
  private handleSyncRequest(message: CrossTabMessage): void {
    const payload = message.payload as { sections?: string[] };
    this.emit("sync_request", {
      sections: payload.sections,
      fromTab: message.tabId,
      timestamp: message.timestamp,
    });
  }

  /**
   * Handle tab focus message
   */
  private handleTabFocus(message: CrossTabMessage): void {
    this.updateTabFocus(message.tabId, true);
    this.emit("tab_focus", {
      tabId: message.tabId,
      timestamp: message.timestamp,
    });
  }

  /**
   * Handle tab blur message
   */
  private handleTabBlur(message: CrossTabMessage): void {
    this.updateTabFocus(message.tabId, false);
    this.emit("tab_blur", {
      tabId: message.tabId,
      timestamp: message.timestamp,
    });
  }

  /**
   * Handle heartbeat message
   */
  private handleHeartbeat(message: CrossTabMessage): void {
    // Update tab activity
    const tab = this.activeTabs.get(message.tabId);
    if (tab) {
      tab.lastActivity = message.timestamp;
      this.activeTabs.set(message.tabId, tab);
    }
  }

  /**
   * Handle conflict detected message
   */
  private handleConflictDetected(message: CrossTabMessage): void {
    const conflict = message.payload as ConflictInfo;
    this.pendingConflicts.set(conflict.id, conflict);
    this.emit("conflict_detected", conflict);
  }

  /**
   * Handle conflict resolved message
   */
  private handleConflictResolved(message: CrossTabMessage): void {
    const payload = message.payload as {
      conflictId: string;
      resolution: string;
      resolvedBy: string;
    };

    const conflict = this.pendingConflicts.get(payload.conflictId);
    if (conflict) {
      this.pendingConflicts.delete(payload.conflictId);
      this.emit("conflict_resolved", {
        conflict,
        resolution: payload.resolution,
        resolvedBy: payload.resolvedBy,
      });
    }
  }

  /**
   * Handle window focus
   */
  private readonly handleFocus = (): void => {
    this.isFocused = true;
    this.updateTabActivity();

    this.sendMessage({
      type: CrossTabMessageType.TAB_FOCUS,
      payload: {},
      id: this.generateMessageId(),
      timestamp: Date.now(),
    });

    this.emit("focus", { tabId: this.tabId });
  };

  /**
   * Handle window blur
   */
  private readonly handleBlur = (): void => {
    this.isFocused = false;
    this.updateTabActivity();

    this.sendMessage({
      type: CrossTabMessageType.TAB_BLUR,
      payload: {},
      id: this.generateMessageId(),
      timestamp: Date.now(),
    });

    this.emit("blur", { tabId: this.tabId });
  };

  /**
   * Handle before unload
   */
  private readonly handleBeforeUnload = (): void => {
    this.destroy();
  };

  /**
   * Send heartbeat to other tabs
   */
  private sendHeartbeat(): void {
    this.updateTabActivity();

    this.sendMessage({
      type: CrossTabMessageType.HEARTBEAT,
      payload: { tabInfo: this.getCurrentTab() },
      id: this.generateMessageId(),
      timestamp: Date.now(),
    });
  }

  /**
   * Update tab activity
   */
  private updateTabActivity(): void {
    const tab = this.activeTabs.get(this.tabId);
    if (tab) {
      tab.lastActivity = Date.now();
      tab.focused = this.isFocused;
      tab.url = globalThis.location.href;
      this.activeTabs.set(this.tabId, tab);
      this.updateActiveTabsStorage();
    }
  }

  /**
   * Update tab focus state
   */
  private updateTabFocus(tabId: string, focused: boolean): void {
    const tab = this.activeTabs.get(tabId);
    if (tab) {
      tab.focused = focused;
      tab.lastActivity = Date.now();
      this.activeTabs.set(tabId, tab);
      this.updateActiveTabsStorage();
    }
  }

  /**
   * Update tab info from message
   */
  private updateTabFromMessage(message: CrossTabMessage): void {
    const existingTab = this.activeTabs.get(message.tabId);
    const tab: TabInfo = existingTab
      ? { ...existingTab, lastActivity: message.timestamp }
      : {
          id: message.tabId,
          createdAt: message.timestamp,
          lastActivity: message.timestamp,
          focused: false,
          url: "",
          userAgent: "",
        };

    this.activeTabs.set(message.tabId, tab);
    this.updateActiveTabsStorage();
  }

  /**
   * Load active tabs from storage
   */
  private loadActiveTabs(): void {
    try {
      const stored = localStorage.getItem(this.config.storagePrefix + "active_tabs");
      if (stored) {
        const tabs = JSON.parse(stored) as TabInfo[];
        const now = Date.now();

        tabs.forEach(tab => {
          // Only load tabs that are not too old
          if (now - tab.lastActivity < this.config.tabTimeout) {
            this.activeTabs.set(tab.id, tab);
          }
        });
      }
    } catch (error) {
      this.log("Failed to load active tabs", error);
    }
  }

  /**
   * Update active tabs in storage
   */
  private updateActiveTabsStorage(): void {
    try {
      const tabs = Array.from(this.activeTabs.values());
      localStorage.setItem(this.config.storagePrefix + "active_tabs", JSON.stringify(tabs));
    } catch (error) {
      this.log("Failed to update active tabs storage", error);
    }
  }

  /**
   * Cleanup inactive tabs
   */
  private cleanupInactiveTabs(): void {
    const now = Date.now();
    const toRemove: string[] = [];

    this.activeTabs.forEach((tab, tabId) => {
      if (now - tab.lastActivity > this.config.tabTimeout) {
        toRemove.push(tabId);
      }
    });

    if (toRemove.length > 0) {
      toRemove.forEach(tabId => {
        this.activeTabs.delete(tabId);
      });
      this.updateActiveTabsStorage();
      this.log("Cleaned up inactive tabs", toRemove);
    }
  }

  /**
   * Check if message is duplicate
   */
  private isDuplicateMessage(messageId: string): boolean {
    return this.messageHistory.has(messageId);
  }

  /**
   * Cleanup old message history
   */
  private cleanupMessageHistory(): void {
    const now = Date.now();
    const toRemove: string[] = [];

    this.messageHistory.forEach((timestamp, messageId) => {
      if (now - timestamp > this.config.deduplicationWindow) {
        toRemove.push(messageId);
      }
    });

    toRemove.forEach(messageId => {
      this.messageHistory.delete(messageId);
    });
  }

  /**
   * Detect conflicts between updates
   */
  private detectConflict(update: OptimisticUpdate): ConflictInfo | null {
    // Simple conflict detection based on timing and section
    const recentUpdates = Array.from(this.messageHistory.entries())
      .filter(([, timestamp]) => Date.now() - timestamp < 1000)
      .map(([messageId]) => messageId);

    if (recentUpdates.length > 1) {
      return {
        id: this.generateMessageId(),
        updates: [update],
        tabIds: [this.tabId, update.id], // Simplified
        detectedAt: Date.now(),
        type: "concurrent_update",
        section: update.section,
      };
    }

    return null;
  }

  /**
   * Handle detected conflict
   */
  private handleConflict(conflict: ConflictInfo): void {
    this.pendingConflicts.set(conflict.id, conflict);

    this.sendMessage({
      type: CrossTabMessageType.CONFLICT_DETECTED,
      payload: conflict,
      id: this.generateMessageId(),
      timestamp: Date.now(),
    });

    this.emit("conflict_detected", conflict);

    // Auto-resolve after timeout
    setTimeout(() => {
      if (this.pendingConflicts.has(conflict.id)) {
        this.resolveConflict(conflict.id, "accept");
      }
    }, this.config.conflictResolutionTimeout);
  }

  /**
   * Log debug messages
   */
  private log(message: string, data?: unknown): void {
    if (this.config.debug) {
      console.log(`[CrossTabSync:${this.tabId}] ${message}`, data || "");
    }
  }
}

// ================================
// EXPORT DEFAULT
// ================================

export default CrossTabSyncManager;
