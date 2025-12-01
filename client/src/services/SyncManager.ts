// Types and interfaces
export interface SyncStatus {
  connected: boolean;
  connectionType: "websocket" | "polling" | "offline";
  lastSync: number;
  syncInProgress: boolean;
  errors: SyncError[];
  metrics: SyncMetrics;
}

export interface SyncMetrics {
  averageLatency: number;
  successRate: number;
  errorCount: number;
  reconnectCount: number;
  dataInconsistencies: number;
  lastInconsistencyTime?: number;
  totalSyncs: number;
  failedSyncs: number;
}

export interface SyncError {
  type: SyncErrorType;
  message: string;
  code?: string;
  timestamp: number;
  context: Record<string, unknown>;
  retryable: boolean;
  retryCount: number;
  maxRetries: number;
  nextRetryAt?: number;
}

export enum SyncErrorType {
  NETWORK_ERROR = "network_error",
  WEBSOCKET_ERROR = "websocket_error",
  DATA_INCONSISTENCY = "data_inconsistency",
  VALIDATION_ERROR = "validation_error",
  CONFLICT_ERROR = "conflict_error",
  TIMEOUT_ERROR = "timeout_error",
  AUTHENTICATION_ERROR = "auth_error",
}

export type SyncEvent =
  | "connected"
  | "disconnected"
  | "reconnecting"
  | "data_updated"
  | "sync_error"
  | "metrics_updated"
  | "status_changed";

export interface ConnectionConfig {
  websocketUrl: string;
  pollingUrl: string;
  pollingInterval: number;
  maxReconnectAttempts: number;
  reconnectBackoffBase: number;
  reconnectBackoffMax: number;
  heartbeatInterval: number;
  connectionTimeout: number;
}

export interface SyncData {
  type: string;
  payload: Record<string, unknown>;
  timestamp: number;
  source: "server" | "client";
  id: string;
}

/**
 * Real-time Sync Manager with WebSocket connection management and automatic fallback to polling
 * Implements connection status tracking, automatic reconnection with exponential backoff,
 * and event-driven synchronization system for dashboard data
 */
import BrowserEventEmitter from "@/utils/BrowserEventEmitter";

export class SyncManager extends BrowserEventEmitter {
  private websocket: WebSocket | null = null;
  private pollingTimer: NodeJS.Timeout | null = null;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private reconnectTimer: NodeJS.Timeout | null = null;

  private status: SyncStatus;
  private readonly config: ConnectionConfig;
  private reconnectAttempts = 0;
  private isDestroyed = false;
  private debugMode = false;

  // Metrics tracking
  private readonly syncStartTimes = new Map<string, number>();
  private readonly latencyHistory: number[] = [];
  private readonly maxLatencyHistory = 100;

  constructor(config: Partial<ConnectionConfig> = {}) {
    super();

    this.config = {
      websocketUrl: config.websocketUrl || "ws://localhost:3001/ws",
      pollingUrl: config.pollingUrl || "/api/sync",
      pollingInterval: config.pollingInterval || 5000,
      maxReconnectAttempts: config.maxReconnectAttempts || 10,
      reconnectBackoffBase: config.reconnectBackoffBase || 1000,
      reconnectBackoffMax: config.reconnectBackoffMax || 30000,
      heartbeatInterval: config.heartbeatInterval || 30000,
      connectionTimeout: config.connectionTimeout || 10000,
    };

    this.status = {
      connected: false,
      connectionType: "offline",
      lastSync: 0,
      syncInProgress: false,
      errors: [],
      metrics: {
        averageLatency: 0,
        successRate: 100,
        errorCount: 0,
        reconnectCount: 0,
        dataInconsistencies: 0,
        totalSyncs: 0,
        failedSyncs: 0,
      },
    };

    this.setupErrorHandling();
  }

  /**
   * Start the sync manager - attempts WebSocket first, falls back to polling
   */
  public async startSync(): Promise<void> {
    if (this.isDestroyed) {
      throw new Error("SyncManager has been destroyed");
    }

    this.log("Starting sync manager...");

    try {
      await this.connectWebSocket();
    } catch (error) {
      this.log("WebSocket connection failed, falling back to polling", error);
      this.startPolling();
    }
  }

  /**
   * Stop all sync operations
   */
  public stopSync(): void {
    this.log("Stopping sync manager...");

    this.clearTimers();
    this.closeWebSocket();
    this.updateStatus({
      connected: false,
      connectionType: "offline",
      syncInProgress: false,
    });
  }

  /**
   * Force a complete synchronization of all data
   */
  public async forceSyncAll(): Promise<void> {
    this.log("Forcing complete sync...");

    this.updateStatus({ syncInProgress: true });

    try {
      const syncId = this.generateSyncId();
      this.trackSyncStart(syncId);

      if (
        this.status.connectionType === "websocket" &&
        this.websocket?.readyState === WebSocket.OPEN
      ) {
        await this.sendWebSocketMessage({
          type: "force_sync",
          payload: { all: true },
          timestamp: Date.now(),
          source: "client",
          id: syncId,
        });
      } else {
        await this.performPollingSync(true);
      }

      this.trackSyncSuccess(syncId);
      this.emit("data_updated", { type: "force_sync", success: true });
    } catch (error) {
      this.handleSyncError(error as Error, "force_sync");
    } finally {
      this.updateStatus({ syncInProgress: false });
    }
  }

  /**
   * Validate data consistency across dashboard sections
   */
  public async validateDataConsistency(): Promise<boolean> {
    this.log("Validating data consistency...");

    const syncId = this.generateSyncId();
    this.trackSyncStart(syncId);

    try {
      const response = await fetch(`${this.config.pollingUrl}/validate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error(`Validation failed: ${response.statusText}`);
      }

      const result = await response.json();

      this.trackSyncSuccess(syncId);

      if (!result.consistent) {
        this.status.metrics.dataInconsistencies++;
        this.status.metrics.lastInconsistencyTime = Date.now();
        this.emit("data_inconsistency", result);
        return false;
      }

      return true;
    } catch (error) {
      this.trackSyncFailure(syncId);
      this.handleSyncError(error as Error, "validation");
      return false;
    }
  }

  /**
   * Get current sync metrics
   */
  public getMetrics(): SyncMetrics {
    return { ...this.status.metrics };
  }

  /**
   * Enable or disable debug mode
   */
  public enableDebugMode(enabled: boolean): void {
    this.debugMode = enabled;
    this.log(`Debug mode ${enabled ? "enabled" : "disabled"}`);
  }

  /**
   * Get current sync status
   */
  public getStatus(): SyncStatus {
    return { ...this.status };
  }

  /**
   * Destroy the sync manager and clean up resources
   */
  public destroy(): void {
    this.log("Destroying sync manager...");

    this.isDestroyed = true;
    this.stopSync();
    this.removeAllListeners();
  }

  // Private methods

  private async connectWebSocket(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.websocket = new WebSocket(this.config.websocketUrl);

        const timeout = setTimeout(() => {
          this.websocket?.close();
          reject(new Error("WebSocket connection timeout"));
        }, this.config.connectionTimeout);

        this.websocket.onopen = () => {
          clearTimeout(timeout);
          this.log("WebSocket connected");

          this.reconnectAttempts = 0;
          this.updateStatus({
            connected: true,
            connectionType: "websocket",
            lastSync: Date.now(),
          });

          this.startHeartbeat();
          this.emit("connected");
          resolve();
        };

        this.websocket.onmessage = event => {
          this.handleWebSocketMessage(event);
        };

        this.websocket.onclose = event => {
          clearTimeout(timeout);
          this.handleWebSocketClose(event);
        };

        this.websocket.onerror = error => {
          clearTimeout(timeout);
          this.handleWebSocketError(error);
          reject(new Error("WebSocket connection error"));
        };
      } catch (error) {
        reject(error);
      }
    });
  }

  private closeWebSocket(): void {
    if (this.websocket) {
      this.websocket.close();
      this.websocket = null;
    }
  }

  private handleWebSocketMessage(event: MessageEvent): void {
    try {
      const data: SyncData = JSON.parse(event.data);
      this.log("Received WebSocket message:", data);

      // Track sync completion if this is a response to our request
      if (data.id && this.syncStartTimes.has(data.id)) {
        this.trackSyncSuccess(data.id);
      }

      this.updateStatus({ lastSync: Date.now() });
      this.emit("data_updated", data);
    } catch (error) {
      this.handleSyncError(error as Error, "websocket_message");
    }
  }

  private handleWebSocketClose(event: CloseEvent): void {
    this.log("WebSocket closed:", event.code, event.reason);

    this.updateStatus({
      connected: false,
      connectionType: "offline",
    });

    this.clearTimers();
    this.emit("disconnected");

    if (!this.isDestroyed && event.code !== 1000) {
      this.scheduleReconnect();
    }
  }

  private handleWebSocketError(error: Event): void {
    this.log("WebSocket error:", error);

    const syncError: SyncError = {
      type: SyncErrorType.WEBSOCKET_ERROR,
      message: "WebSocket connection error",
      timestamp: Date.now(),
      context: { error },
      retryable: true,
      retryCount: this.reconnectAttempts,
      maxRetries: this.config.maxReconnectAttempts,
    };

    this.addError(syncError);
  }

  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.config.maxReconnectAttempts) {
      this.log("Max reconnect attempts reached, falling back to polling");
      this.startPolling();
      return;
    }

    const backoffDelay = Math.min(
      this.config.reconnectBackoffBase * Math.pow(2, this.reconnectAttempts),
      this.config.reconnectBackoffMax
    );

    this.log(`Scheduling reconnect in ${backoffDelay}ms (attempt ${this.reconnectAttempts + 1})`);

    this.updateStatus({ connectionType: "offline" });
    this.emit("reconnecting", { attempt: this.reconnectAttempts + 1, delay: backoffDelay });

    this.reconnectTimer = setTimeout(async () => {
      this.reconnectAttempts++;
      this.status.metrics.reconnectCount++;

      try {
        await this.connectWebSocket();
      } catch (error) {
        this.log("Reconnect failed:", error);
        this.scheduleReconnect();
      }
    }, backoffDelay);
  }

  private startPolling(): void {
    this.log("Starting polling mode");

    this.clearTimers();
    this.updateStatus({
      connected: true,
      connectionType: "polling",
      lastSync: Date.now(),
    });

    this.emit("connected");

    // Immediate sync
    this.performPollingSync();

    // Schedule regular polling
    this.pollingTimer = setInterval(() => {
      this.performPollingSync();
    }, this.config.pollingInterval);
  }

  private async performPollingSync(force = false): Promise<void> {
    if (this.status.syncInProgress && !force) {
      return;
    }

    const syncId = this.generateSyncId();
    this.trackSyncStart(syncId);

    try {
      const response = await fetch(this.config.pollingUrl, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error(`Polling failed: ${response.statusText}`);
      }

      const data = await response.json();

      this.trackSyncSuccess(syncId);
      this.updateStatus({ lastSync: Date.now() });
      this.emit("data_updated", {
        type: "polling_sync",
        payload: data,
        timestamp: Date.now(),
        source: "server",
        id: syncId,
      });
    } catch (error) {
      this.trackSyncFailure(syncId);
      this.handleSyncError(error as Error, "polling");
    }
  }

  private startHeartbeat(): void {
    this.heartbeatTimer = setInterval(() => {
      if (this.websocket?.readyState === WebSocket.OPEN) {
        this.sendWebSocketMessage({
          type: "heartbeat",
          payload: {},
          timestamp: Date.now(),
          source: "client",
          id: this.generateSyncId(),
        });
      }
    }, this.config.heartbeatInterval);
  }

  private async sendWebSocketMessage(data: SyncData): Promise<void> {
    if (this.websocket?.readyState === WebSocket.OPEN) {
      this.websocket.send(JSON.stringify(data));
    } else {
      throw new Error("WebSocket not connected");
    }
  }

  private clearTimers(): void {
    if (this.pollingTimer) {
      clearInterval(this.pollingTimer);
      this.pollingTimer = null;
    }

    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  private updateStatus(updates: Partial<SyncStatus>): void {
    const oldStatus = { ...this.status };
    this.status = { ...this.status, ...updates };

    if (JSON.stringify(oldStatus) !== JSON.stringify(this.status)) {
      this.emit("status_changed", this.status);
      this.emit("metrics_updated", this.status.metrics);
    }
  }

  private handleSyncError(error: Error, context: string): void {
    this.log(`Sync error in ${context}:`, error);

    const syncError: SyncError = {
      type: this.classifyError(error),
      message: error.message,
      timestamp: Date.now(),
      context: { source: context, error: error.stack },
      retryable: this.isRetryableError(error),
      retryCount: 0,
      maxRetries: 3,
    };

    this.addError(syncError);
    this.emit("sync_error", syncError);
  }

  private classifyError(error: Error): SyncErrorType {
    const message = error.message.toLowerCase();

    if (message.includes("timeout")) {
      return SyncErrorType.TIMEOUT_ERROR;
    }
    if (message.includes("websocket")) {
      return SyncErrorType.WEBSOCKET_ERROR;
    }
    if (message.includes("auth") || message.includes("unauthorized")) {
      return SyncErrorType.AUTHENTICATION_ERROR;
    }
    if (message.includes("network") || message.includes("fetch")) {
      return SyncErrorType.NETWORK_ERROR;
    }

    return SyncErrorType.NETWORK_ERROR;
  }

  private isRetryableError(error: Error): boolean {
    const message = error.message.toLowerCase();
    return !message.includes("unauthorized") && !message.includes("forbidden");
  }

  private addError(error: SyncError): void {
    this.status.errors.push(error);
    this.status.metrics.errorCount++;

    // Keep only last 10 errors
    if (this.status.errors.length > 10) {
      this.status.errors = this.status.errors.slice(-10);
    }

    this.updateMetrics();
  }

  private trackSyncStart(syncId: string): void {
    this.syncStartTimes.set(syncId, Date.now());
  }

  private trackSyncSuccess(syncId: string): void {
    const startTime = this.syncStartTimes.get(syncId);
    if (startTime) {
      const latency = Date.now() - startTime;
      this.addLatencyMeasurement(latency);
      this.syncStartTimes.delete(syncId);
    }

    this.status.metrics.totalSyncs++;
    this.updateMetrics();
  }

  private trackSyncFailure(syncId: string): void {
    this.syncStartTimes.delete(syncId);
    this.status.metrics.totalSyncs++;
    this.status.metrics.failedSyncs++;
    this.updateMetrics();
  }

  private addLatencyMeasurement(latency: number): void {
    this.latencyHistory.push(latency);

    if (this.latencyHistory.length > this.maxLatencyHistory) {
      this.latencyHistory.shift();
    }
  }

  private updateMetrics(): void {
    const metrics = this.status.metrics;

    // Calculate average latency
    if (this.latencyHistory.length > 0) {
      metrics.averageLatency =
        this.latencyHistory.reduce((sum, latency) => sum + latency, 0) / this.latencyHistory.length;
    }

    // Calculate success rate
    if (metrics.totalSyncs > 0) {
      metrics.successRate = ((metrics.totalSyncs - metrics.failedSyncs) / metrics.totalSyncs) * 100;
    }
  }

  private generateSyncId(): string {
    return `sync_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }

  private setupErrorHandling(): void {
    // Handle uncaught errors
    this.on("error", error => {
      this.log("Uncaught sync manager error:", error);
    });
  }

  private log(message: string, ...args: unknown[]): void {
    if (this.debugMode) {
      console.log(`[SyncManager] ${message}`, ...args);
    }
  }
}

// Export singleton instance
let syncManagerInstance: SyncManager | null = null;

export const getSyncManager = (config?: Partial<ConnectionConfig>): SyncManager => {
  syncManagerInstance ??= new SyncManager(config);
  return syncManagerInstance;
};

export const destroySyncManager = (): void => {
  if (syncManagerInstance) {
    syncManagerInstance.destroy();
    syncManagerInstance = null;
  }
};
