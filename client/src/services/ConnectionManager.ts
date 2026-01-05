/**
 * Connection Manager with Fallback Strategies
 *
 * Manages WebSocket-first, HTTP-polling fallback strategy for real-time dashboard synchronization.
 * Provides connection health monitoring, automatic strategy switching, and graceful degradation.
 */

import BrowserEventEmitter from "@/utils/BrowserEventEmitter";
import { ServiceVisibilityManager } from "@/utils/ServiceVisibilityManager";
import type {
  ConnectionStatus,
  RecoveryAction,
  SyncError,
  SyncErrorType,
} from "@shared/types/sync";

// ================================
// CONNECTION INTERFACES
// ================================

export interface ConnectionConfig {
  /** WebSocket endpoint URL */
  websocketUrl: string;
  /** HTTP polling endpoint URL */
  pollingUrl: string;
  /** Initial connection timeout (ms) */
  connectionTimeout: number;
  /** Heartbeat interval for WebSocket (ms) */
  heartbeatInterval: number;
  /** Polling interval for HTTP fallback (ms) */
  pollingInterval: number;
  /** Maximum reconnection attempts */
  maxReconnectAttempts: number;
  /** Base delay for exponential backoff (ms) */
  reconnectDelayBase: number;
  /** Maximum reconnect delay (ms) */
  maxReconnectDelay: number;
  /** Connection quality check interval (ms) */
  qualityCheckInterval: number;
  /** Latency threshold for connection quality (ms) */
  latencyThreshold: number;
  /** Error rate threshold for fallback */
  errorRateThreshold: number;
  /** Enable debug mode logging */
  debugMode?: boolean;
}

export interface Connection {
  /** Connection type */
  type: "websocket" | "polling";
  /** Send message through connection */
  send: (message: ConnectionMessage) => Promise<void>;
  /** Close the connection */
  close: () => void;
  /** Register message handler */
  onMessage: (handler: (message: ConnectionMessage) => void) => void;
  /** Register error handler */
  onError: (handler: (error: Error) => void) => void;
  /** Register close handler */
  onClose: (handler: () => void) => void;
  /** Get connection statistics */
  getStats: () => ConnectionStats;
}

export interface ConnectionMessage {
  /** Message type */
  type: string;
  /** Message payload */
  payload: unknown;
  /** Message ID for tracking */
  id: string;
  /** Timestamp */
  timestamp: number;
  /** Correlation ID for request/response */
  correlationId?: string;
}

export interface ConnectionStats {
  /** Connection uptime (ms) */
  uptime: number;
  /** Messages sent */
  messagesSent: number;
  /** Messages received */
  messagesReceived: number;
  /** Average latency (ms) */
  averageLatency: number;
  /** Error count */
  errorCount: number;
  /** Last error timestamp */
  lastError?: number;
  /** Connection quality score (0-1) */
  qualityScore: number;
}

export interface ConnectionMetrics {
  /** Current connection status */
  status: ConnectionStatus;
  /** Connection statistics */
  stats: ConnectionStats;
  /** Strategy performance history */
  strategyPerformance: Map<string, StrategyMetrics>;
  /** Recent latency measurements */
  latencyHistory: number[];
  /** Error rate over time */
  errorRate: number;
}

export interface StrategyMetrics {
  /** Strategy name */
  name: string;
  /** Success rate (0-1) */
  successRate: number;
  /** Average latency (ms) */
  averageLatency: number;
  /** Total connection attempts */
  connectionAttempts: number;
  /** Successful connections */
  successfulConnections: number;
  /** Total uptime (ms) */
  totalUptime: number;
  /** Last used timestamp */
  lastUsed: number;
}

export type ConnectionStrategy = "websocket" | "polling" | "offline";

export type FallbackStrategy = "immediate" | "gradual" | "quality_based" | "manual";

// ================================
// CONNECTION IMPLEMENTATIONS
// ================================

/**
 * WebSocket connection implementation
 */
class WebSocketConnection implements Connection {
  public readonly type = "websocket" as const;
  private ws: WebSocket | null = null;
  private readonly messageHandlers = new Set<(message: ConnectionMessage) => void>();
  private readonly errorHandlers = new Set<(error: Error) => void>();
  private readonly closeHandlers = new Set<() => void>();
  private readonly stats: ConnectionStats;
  private readonly startTime: number;
  private readonly latencyMeasurements: number[] = [];
  private heartbeatInterval: NodeJS.Timeout | null = null;

  constructor(
    private readonly url: string,
    private readonly config: ConnectionConfig
  ) {
    this.startTime = Date.now();
    this.stats = {
      uptime: 0,
      messagesSent: 0,
      messagesReceived: 0,
      averageLatency: 0,
      errorCount: 0,
      qualityScore: 1,
    };
  }

  public async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(this.url);

        const timeout = setTimeout(() => {
          this.ws?.close();
          reject(new Error("WebSocket connection timeout"));
        }, this.config.connectionTimeout);

        this.ws.onopen = () => {
          clearTimeout(timeout);
          this.startHeartbeat();
          resolve();
        };

        this.ws.onmessage = event => {
          try {
            const message: ConnectionMessage = JSON.parse(event.data);
            this.stats.messagesReceived++;
            this.updateLatency(message);
            for (const handler of this.messageHandlers) {
              handler(message);
            }
          } catch (error) {
            this.handleError(new Error(`Failed to parse WebSocket message: ${error}`));
          }
        };

        this.ws.onerror = () => {
          clearTimeout(timeout);
          this.handleError(new Error("WebSocket connection error"));
          reject(new Error("WebSocket connection failed"));
        };

        this.ws.onclose = () => {
          clearTimeout(timeout);
          this.stopHeartbeat();
          for (const handler of this.closeHandlers) {
            handler();
          }
        };
      } catch (error) {
        reject(error instanceof Error ? error : new Error(String(error)));
      }
    });
  }

  public async send(message: ConnectionMessage): Promise<void> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error("WebSocket not connected");
    }

    try {
      this.ws.send(JSON.stringify(message));
      this.stats.messagesSent++;
    } catch (error) {
      this.handleError(error as Error);
      throw error;
    }
  }

  public close(): void {
    this.stopHeartbeat();
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  public onMessage(handler: (message: ConnectionMessage) => void): void {
    this.messageHandlers.add(handler);
  }

  public onError(handler: (error: Error) => void): void {
    this.errorHandlers.add(handler);
  }

  public onClose(handler: () => void): void {
    this.closeHandlers.add(handler);
  }

  public getStats(): ConnectionStats {
    this.stats.uptime = Date.now() - this.startTime;
    this.stats.averageLatency = this.calculateAverageLatency();
    this.stats.qualityScore = this.calculateQualityScore();
    return { ...this.stats };
  }

  private notifyErrorHandlers(error: Error): void {
    for (const handler of this.errorHandlers) {
      try {
        handler(error);
      } catch (handlerError) {
        console.error("WebSocket error handler failed:", handlerError);
      }
    }
  }

  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        const heartbeat: ConnectionMessage = {
          type: "heartbeat",
          payload: { timestamp: Date.now() },
          id: `hb_${Date.now()}`,
          timestamp: Date.now(),
        };
        this.send(heartbeat).catch(() => {
          // Heartbeat failed, connection might be dead
          this.handleError(new Error("Heartbeat failed"));
        });
      }
    }, this.config.heartbeatInterval);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  private updateLatency(message: ConnectionMessage): void {
    if (message.type === "heartbeat_response" && message.payload) {
      const sentTime = (message.payload as { timestamp: number }).timestamp;
      const latency = Date.now() - sentTime;
      this.latencyMeasurements.push(latency);

      // Keep only last 100 measurements
      if (this.latencyMeasurements.length > 100) {
        this.latencyMeasurements.shift();
      }
    }
  }

  private calculateAverageLatency(): number {
    if (this.latencyMeasurements.length === 0) return 0;
    return (
      this.latencyMeasurements.reduce((sum, lat) => sum + lat, 0) / this.latencyMeasurements.length
    );
  }

  private calculateQualityScore(): number {
    const latency = this.calculateAverageLatency();
    const errorRate = this.stats.errorCount / Math.max(this.stats.messagesSent, 1);

    // Quality score based on latency and error rate
    const latencyScore = Math.max(0, 1 - latency / this.config.latencyThreshold);
    const errorScore = Math.max(0, 1 - errorRate / this.config.errorRateThreshold);

    return (latencyScore + errorScore) / 2;
  }

  private handleError(error: Error): void {
    this.stats.errorCount++;
    this.stats.lastError = Date.now();
    if (this.config.debugMode) {
      console.error("[WebSocketConnection] Error:", error.message);
    }
    this.notifyErrorHandlers(error);
  }
}

/**
 * HTTP polling connection implementation
 */
class PollingConnection implements Connection {
  public readonly type = "polling" as const;
  private pollingInterval: NodeJS.Timeout | null = null;
  private readonly messageHandlers = new Set<(message: ConnectionMessage) => void>();
  private readonly errorHandlers = new Set<(error: Error) => void>();
  private readonly closeHandlers = new Set<() => void>();
  private readonly stats: ConnectionStats;
  private readonly startTime: number;
  private isActive = false;
  private lastPollTime = 0;
  private authToken?: string;

  constructor(
    private readonly url: string,
    private readonly config: ConnectionConfig
  ) {
    this.startTime = Date.now();
    this.stats = {
      uptime: 0,
      messagesSent: 0,
      messagesReceived: 0,
      averageLatency: 0,
      errorCount: 0,
      qualityScore: 0.8, // Lower than WebSocket by default
    };
  }

  /**
   * Set authentication token for requests
   */
  public setAuthToken(token: string): void {
    this.authToken = token;
  }

  public async connect(): Promise<void> {
    this.isActive = true;
    this.startPolling();
  }

  public async send(message: ConnectionMessage): Promise<void> {
    // Validate connection state before attempting to send
    if (!this.isActive) {
      const error = new Error(
        "PollingConnection: Cannot send message on inactive connection. " +
          "Call connect() first to establish a connection."
      );
      this.handleError(error);
      throw error;
    }

    let response: Response | undefined;

    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };

      if (this.authToken) {
        headers["Authorization"] = `Bearer ${this.authToken}`;
      }

      response = await fetch(`${this.url}/send`, {
        method: "POST",
        headers,
        body: JSON.stringify(message),
        credentials: "include", // Required for Clerk __session cookie
      });
    } catch (error) {
      // Network error or request abortion
      const networkError = new Error(
        `PollingConnection: Network request failed - ${
          error instanceof Error ? error.message : "Unknown network error"
        }. Check your internet connection and try again.`
      );
      this.handleError(networkError);
      throw networkError;
    }

    // Validate response exists and is a valid object
    if (!response || typeof response !== "object") {
      const invalidResponseError = new Error(
        "PollingConnection: Invalid or missing response received from server. " +
          "The server may be unavailable or returned an unexpected response format."
      );
      this.handleError(invalidResponseError);
      throw invalidResponseError;
    }

    // Check response status
    if (!response.ok) {
      let errorText = "Unknown error";
      try {
        errorText = await response.text();
      } catch {
        // If we can't read the error text, use the default
      }

      const statusError = new Error(
        `PollingConnection: Request failed with status ${response.status} (${response.statusText}) - ${errorText}. ` +
          "Please check the server logs for more details."
      );
      this.handleError(statusError);
      throw statusError;
    }

    this.stats.messagesSent++;
  }

  public close(): void {
    this.isActive = false;
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
    for (const handler of this.closeHandlers) {
      handler();
    }
  }

  public onMessage(handler: (message: ConnectionMessage) => void): void {
    this.messageHandlers.add(handler);
  }

  public onError(handler: (error: Error) => void): void {
    this.errorHandlers.add(handler);
  }

  public onClose(handler: () => void): void {
    this.closeHandlers.add(handler);
  }

  public getStats(): ConnectionStats {
    this.stats.uptime = Date.now() - this.startTime;
    return { ...this.stats };
  }

  private notifyErrorHandlers(error: Error): void {
    for (const handler of this.errorHandlers) {
      try {
        handler(error);
      } catch (handlerError) {
        console.error("Polling error handler failed:", handlerError);
      }
    }
  }

  private buildHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (this.authToken) {
      headers["Authorization"] = `Bearer ${this.authToken}`;
    }
    return headers;
  }

  private validateResponse(response: Response | undefined): void {
    if (!response || typeof response !== "object") {
      throw new Error(
        "PollingConnection: Invalid or missing response during polling. The server may be unavailable."
      );
    }
  }

  private async handleResponseError(response: Response): Promise<void> {
    let errorText = "Unknown error";
    try {
      errorText = await response.text();
    } catch {
      // If we can't read the error text, use the default
    }
    throw new Error(
      `PollingConnection: Polling failed with status ${response.status} (${response.statusText}) - ${errorText}`
    );
  }

  private processMessages(messages: ConnectionMessage[]): void {
    for (const message of messages) {
      this.stats.messagesReceived++;
      for (const handler of this.messageHandlers) {
        handler(message);
      }
    }
  }

  private async executePoll(): Promise<void> {
    const pollStart = Date.now();
    const headers = this.buildHeaders();

    const response = await fetch(`${this.url}/poll?since=${this.lastPollTime}`, {
      method: "GET",
      headers,
      credentials: "include", // Required for Clerk __session cookie
    });

    this.validateResponse(response);

    if (!response.ok) {
      await this.handleResponseError(response);
    }

    const data = await response.json();
    const latency = Date.now() - pollStart;

    this.stats.averageLatency = (this.stats.averageLatency + latency) / 2;

    if (data.messages && Array.isArray(data.messages)) {
      this.processMessages(data.messages as ConnectionMessage[]);
    }

    this.lastPollTime = Date.now();
  }

  private startPolling(): void {
    this.pollingInterval = setInterval(async () => {
      if (!this.isActive) return;

      try {
        await this.executePoll();
      } catch (error) {
        const pollingError =
          error instanceof Error
            ? error
            : new Error(
                `PollingConnection: Polling error - ${String(error)}. Connection quality may be degraded.`
              );
        this.handleError(pollingError);
      }
    }, this.config.pollingInterval);
  }

  private handleError(error: Error): void {
    this.stats.errorCount++;
    this.stats.lastError = Date.now();
    if (this.config.debugMode) {
      console.error("[PollingConnection] Error:", error.message);
    }
    this.notifyErrorHandlers(error);
  }
}

// ================================
// CONNECTION MANAGER
// ================================

/**
 * Connection Manager with WebSocket-first, HTTP-polling fallback strategy
 *
 * FIX: WebSocket is disabled on Vercel/serverless platforms because they
 * don't support persistent WebSocket connections. This prevents reconnection
 * loops that cause browser freezes.
 */
export class ConnectionManager extends BrowserEventEmitter {
  private readonly config: ConnectionConfig;
  private currentConnection: Connection | null = null;
  private connectionStatus: ConnectionStatus;
  private readonly metrics: ConnectionMetrics;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private fallbackStrategy: FallbackStrategy = "quality_based";
  private isDestroyed = false;
  private readonly webSocketEnabled: boolean;

  // FIX: Use visibility-aware interval management to prevent browser freezes
  private readonly visibilityManager = new ServiceVisibilityManager("ConnectionManager", {
    resumeBaseDelay: 500,
    resumeStaggerRange: 1000,
    minVisibleTime: 300,
  });

  constructor(config: Partial<ConnectionConfig> = {}) {
    super();

    // Determine base URL based on environment
    const isProduction =
      globalThis.window !== undefined && globalThis.window.location.hostname !== "localhost";
    const baseUrl = isProduction
      ? `${globalThis.window.location.protocol}//${globalThis.window.location.host}`
      : "http://localhost:5000";
    const wsProtocol = isProduction ? "wss:" : "ws:";
    const wsBaseUrl = isProduction
      ? `${wsProtocol}//${globalThis.window.location.host}`
      : "ws://localhost:5000";

    // FIX: Detect Vercel/serverless platforms and disable WebSocket
    const isVercelOrServerless =
      globalThis.window !== undefined &&
      (globalThis.window.location.hostname.includes("vercel.app") ||
        globalThis.window.location.hostname === "brolabentertainment.com" ||
        globalThis.window.location.hostname.includes("brolabentertainment"));
    const disableWebSocketEnv =
      import.meta !== undefined &&
      (import.meta as unknown as { env?: { VITE_DISABLE_WEBSOCKET?: string } }).env
        ?.VITE_DISABLE_WEBSOCKET === "true";
    this.webSocketEnabled = !isVercelOrServerless && !disableWebSocketEnv;

    this.config = {
      websocketUrl: config.websocketUrl || `${wsBaseUrl}/ws`,
      pollingUrl: config.pollingUrl || `${baseUrl}/api/sync`,
      connectionTimeout: config.connectionTimeout || 10000,
      heartbeatInterval: config.heartbeatInterval || 30000,
      pollingInterval: config.pollingInterval || 5000,
      maxReconnectAttempts: config.maxReconnectAttempts || 10,
      reconnectDelayBase: config.reconnectDelayBase || 1000,
      maxReconnectDelay: config.maxReconnectDelay || 30000,
      qualityCheckInterval: config.qualityCheckInterval || 60000,
      latencyThreshold: config.latencyThreshold || 1000,
      errorRateThreshold: config.errorRateThreshold || 0.1,
    };

    this.connectionStatus = {
      type: "offline",
      connected: false,
      reconnecting: false,
      lastConnected: 0,
      reconnectAttempts: 0,
      maxReconnectAttempts: this.config.maxReconnectAttempts,
    };

    this.metrics = {
      status: this.connectionStatus,
      stats: {
        uptime: 0,
        messagesSent: 0,
        messagesReceived: 0,
        averageLatency: 0,
        errorCount: 0,
        qualityScore: 0,
      },
      strategyPerformance: new Map(),
      latencyHistory: [],
      errorRate: 0,
    };

    this.initializeStrategyMetrics();
    this.startQualityMonitoring();
  }

  /**
   * Override on() to accept typed event callbacks
   * Wraps the listener to ensure it receives properly typed event data
   */
  public override on<T = unknown>(event: string, listener: (data: T) => void): this {
    // Wrap the listener to handle the event data properly
    const wrappedListener = (...args: unknown[]) => {
      // The first argument should be the event data
      const eventData = args[0] as T;
      listener(eventData);
    };
    // Store the original listener reference for removal
    (wrappedListener as { __originalListener?: (data: T) => void }).__originalListener = listener;
    return super.on(event, wrappedListener);
  }

  /**
   * Override once() to accept typed event callbacks
   * Wraps the listener to ensure it receives properly typed event data
   */
  public override once<T = unknown>(event: string, listener: (data: T) => void): this {
    // Wrap the listener to handle the event data properly
    const wrappedListener = (...args: unknown[]) => {
      // The first argument should be the event data
      const eventData = args[0] as T;
      listener(eventData);
    };
    // Store the original listener reference for removal
    (wrappedListener as { __originalListener?: (data: T) => void }).__originalListener = listener;
    return super.once(event, wrappedListener);
  }

  /**
   * Override off() to accept typed event callbacks
   * Handles removal of wrapped listeners by finding the original listener reference
   */
  public override off<T = unknown>(event: string, listener: (data: T) => void): this {
    // Access the private listeners map from BrowserEventEmitter
    const listenersMap = (
      this as unknown as { listeners: Map<string, Array<(...args: unknown[]) => void>> }
    ).listeners;
    const eventListeners = listenersMap?.get(event);

    if (eventListeners) {
      const wrappedListener = eventListeners.find(
        (l: (...args: unknown[]) => void) =>
          (l as { __originalListener?: (data: T) => void }).__originalListener === listener
      );
      if (wrappedListener) {
        return super.removeListener(event, wrappedListener);
      }
    }
    // Fallback to direct removal if no wrapped listener found
    return super.removeListener(event, listener as (...args: unknown[]) => void);
  }

  /**
   * Connect using the best available strategy
   */
  public async connect(): Promise<void> {
    if (this.isDestroyed) {
      throw new Error("ConnectionManager has been destroyed");
    }

    const strategy = this.selectBestStrategy();
    await this.connectWithStrategy(strategy);
  }

  /**
   * Disconnect current connection
   */
  public disconnect(): void {
    this.clearReconnectTimeout();

    if (this.currentConnection) {
      this.currentConnection.close();
      this.currentConnection = null;
    }

    this.updateConnectionStatus({
      connected: false,
      reconnecting: false,
      type: "offline",
    });
  }

  /**
   * Reconnect with exponential backoff
   */
  public async reconnect(): Promise<void> {
    if (this.connectionStatus.reconnecting) {
      return; // Already reconnecting
    }

    this.updateConnectionStatus({ reconnecting: true });

    const delay = this.calculateReconnectDelay();

    this.reconnectTimeout = setTimeout(async () => {
      try {
        await this.connect();
        this.connectionStatus.reconnectAttempts = 0; // Reset on success
      } catch {
        this.connectionStatus.reconnectAttempts++;

        if (this.connectionStatus.reconnectAttempts < this.config.maxReconnectAttempts) {
          // Try again with next strategy
          await this.reconnect();
        } else {
          // Max attempts reached, go offline
          this.updateConnectionStatus({
            connected: false,
            reconnecting: false,
            type: "offline",
          });

          this.emit("max_reconnect_attempts_reached");
        }
      }
    }, delay);

    this.updateConnectionStatus({ nextReconnectIn: delay });
  }

  /**
   * Send message through current connection
   */
  public async send(message: ConnectionMessage): Promise<void> {
    if (!this.currentConnection || !this.connectionStatus.connected) {
      throw new Error("No active connection");
    }

    try {
      await this.currentConnection.send(message);
      this.updateMetrics();
    } catch (error) {
      this.handleConnectionError(error as Error);
      throw error;
    }
  }

  /**
   * Enable fallback strategy
   */
  public enableFallback(strategy: FallbackStrategy): void {
    this.fallbackStrategy = strategy;
    this.emit("fallback_strategy_changed", { strategy });
  }

  /**
   * Fallback to polling connection method
   */
  public async fallbackToPolling(): Promise<void> {
    this.log("Falling back to polling connection");

    // Disconnect current connection if any
    if (this.currentConnection) {
      this.currentConnection.close();
      this.currentConnection = null;
    }

    // Update status to indicate fallback
    this.updateConnectionStatus({
      type: "polling",
      connected: false,
      reconnecting: true,
    });

    // Connect using polling strategy
    try {
      await this.connectWithStrategy("polling");
    } catch (error) {
      this.handleConnectionError(error as Error);
    }
  }

  /**
   * Get current connection strategy
   */
  public getCurrentStrategy(): ConnectionStrategy {
    return this.connectionStatus.type;
  }

  /**
   * Get connection metrics
   */
  public getConnectionMetrics(): ConnectionMetrics {
    this.updateMetrics();
    return { ...this.metrics };
  }

  /**
   * Register connection status change handler
   */
  public onStatusChange(callback: (status: ConnectionStatus) => void): () => void {
    this.on("status_change", callback);
    return () => this.off("status_change", callback);
  }

  /**
   * Register message handler
   */
  public onMessage(handler: (message: ConnectionMessage) => void): () => void {
    const wrappedHandler = (message: ConnectionMessage) => {
      try {
        handler(message);
      } catch (error) {
        this.emit("message_handler_error", { error, message });
      }
    };

    this.on("message", wrappedHandler);
    return () => this.off("message", wrappedHandler);
  }

  /**
   * Set authentication token for polling requests
   */
  public setAuthToken(token: string): void {
    if (this.currentConnection?.type === "polling") {
      (this.currentConnection as PollingConnection).setAuthToken(token);
    }
  }

  /**
   * Destroy the connection manager
   */
  public destroy(): void {
    this.isDestroyed = true;
    this.disconnect();
    this.clearQualityMonitoring();
    // FIX: Clean up visibility manager to prevent memory leaks
    this.visibilityManager.destroy();
    this.removeAllListeners();
  }

  // Private methods

  private async connectWithStrategy(strategy: ConnectionStrategy): Promise<void> {
    if (strategy === "offline") {
      throw new Error("Cannot connect in offline mode");
    }

    // FIX: Force polling if WebSocket is disabled (Vercel/serverless)
    if (strategy === "websocket" && !this.webSocketEnabled) {
      strategy = "polling";
    }

    // Disconnect current connection
    if (this.currentConnection) {
      this.currentConnection.close();
    }

    // Create new connection based on strategy
    const connection = this.createConnection(strategy);

    try {
      // Set up event handlers
      connection.onMessage(message => {
        this.emit("message", message);
      });

      connection.onError(error => {
        this.handleConnectionError(error);
      });

      connection.onClose(() => {
        this.handleConnectionClose();
      });

      // Attempt connection
      if (connection.type === "websocket") {
        await (connection as WebSocketConnection).connect();
      } else if (connection.type === "polling") {
        await (connection as PollingConnection).connect();
      }

      // Success - update state
      this.currentConnection = connection;
      this.updateConnectionStatus({
        type: strategy,
        connected: true,
        reconnecting: false,
        lastConnected: Date.now(),
        reconnectAttempts: 0,
      });

      // Update strategy metrics
      this.updateStrategyMetrics(strategy, true);

      this.emit("connected", { strategy });
    } catch (error) {
      // Connection failed
      this.updateStrategyMetrics(strategy, false);

      // Try fallback strategy if available
      const fallbackStrategy = this.getFallbackStrategy(strategy);
      if (fallbackStrategy && fallbackStrategy !== strategy) {
        await this.connectWithStrategy(fallbackStrategy);
      } else {
        throw error;
      }
    }
  }

  private createConnection(strategy: ConnectionStrategy): Connection {
    switch (strategy) {
      case "websocket":
        return new WebSocketConnection(this.config.websocketUrl, this.config);
      case "polling":
        return new PollingConnection(this.config.pollingUrl, this.config);
      default:
        throw new Error(`Unsupported connection strategy: ${strategy}`);
    }
  }

  private selectBestStrategy(): ConnectionStrategy {
    // FIX: Only include WebSocket if enabled (not on Vercel/serverless)
    const strategies: ConnectionStrategy[] = this.webSocketEnabled
      ? ["websocket", "polling"]
      : ["polling"];

    // Sort strategies by performance
    strategies.sort((a, b) => {
      const aMetrics = this.metrics.strategyPerformance.get(a);
      const bMetrics = this.metrics.strategyPerformance.get(b);

      if (!aMetrics && !bMetrics) return 0;
      if (!aMetrics) return 1;
      if (!bMetrics) return -1;

      // Score based on success rate and latency
      const aScore = aMetrics.successRate - aMetrics.averageLatency / 1000;
      const bScore = bMetrics.successRate - bMetrics.averageLatency / 1000;

      return bScore - aScore;
    });

    return strategies[0];
  }

  private getFallbackStrategy(currentStrategy: ConnectionStrategy): ConnectionStrategy | null {
    switch (this.fallbackStrategy) {
      case "immediate":
        return currentStrategy === "websocket" ? "polling" : null;

      case "gradual":
        return currentStrategy === "websocket" ? "polling" : "offline";

      case "quality_based": {
        // Check if current strategy quality is below threshold
        const metrics = this.metrics.strategyPerformance.get(currentStrategy);
        if (metrics && metrics.successRate < 0.5) {
          return currentStrategy === "websocket" ? "polling" : null;
        }
        return null;
      }

      case "manual":
        return null; // No automatic fallback

      default:
        return null;
    }
  }

  private calculateReconnectDelay(): number {
    const baseDelay = this.config.reconnectDelayBase;
    const attempts = this.connectionStatus.reconnectAttempts;
    const exponentialDelay = baseDelay * Math.pow(2, attempts);

    return Math.min(exponentialDelay, this.config.maxReconnectDelay);
  }

  private handleConnectionError(error: Error): void {
    this.emit("connection_error", { error });

    // Create sync error
    const syncError: SyncError = {
      type: "NETWORK_ERROR" as SyncErrorType,
      message: error.message,
      timestamp: Date.now(),
      context: { connectionType: this.connectionStatus.type },
      retryable: true,
      retryCount: this.connectionStatus.reconnectAttempts,
      maxRetries: this.config.maxReconnectAttempts,
      fingerprint: this.generateErrorFingerprint(error.message, "NETWORK_ERROR"),
    };

    this.emit("sync_error", { error: syncError });

    // Trigger reconnection if not already reconnecting
    if (!this.connectionStatus.reconnecting) {
      this.reconnect().catch(() => {
        // Reconnection failed, will be handled by reconnect logic
      });
    }
  }

  private handleConnectionClose(): void {
    this.updateConnectionStatus({
      connected: false,
      type: "offline",
    });

    this.emit("disconnected");

    // Auto-reconnect if not manually disconnected
    if (!this.isDestroyed && !this.connectionStatus.reconnecting) {
      this.reconnect().catch(() => {
        // Reconnection failed, will be handled by reconnect logic
      });
    }
  }

  private updateConnectionStatus(updates: Partial<ConnectionStatus>): void {
    this.connectionStatus = { ...this.connectionStatus, ...updates };
    this.metrics.status = this.connectionStatus;
    this.emit("status_change", this.connectionStatus);
  }

  private updateMetrics(): void {
    if (this.currentConnection) {
      const connectionStats = this.currentConnection.getStats();
      this.metrics.stats = connectionStats;

      // Update latency history
      this.metrics.latencyHistory.push(connectionStats.averageLatency);
      if (this.metrics.latencyHistory.length > 100) {
        this.metrics.latencyHistory.shift();
      }

      // Calculate error rate
      const totalMessages = connectionStats.messagesSent + connectionStats.messagesReceived;
      this.metrics.errorRate = totalMessages > 0 ? connectionStats.errorCount / totalMessages : 0;
    }
  }

  private updateStrategyMetrics(strategy: ConnectionStrategy, success: boolean): void {
    let metrics = this.metrics.strategyPerformance.get(strategy);

    if (!metrics) {
      metrics = {
        name: strategy,
        successRate: 0,
        averageLatency: 0,
        connectionAttempts: 0,
        successfulConnections: 0,
        totalUptime: 0,
        lastUsed: Date.now(),
      };
      this.metrics.strategyPerformance.set(strategy, metrics);
    }

    metrics.connectionAttempts++;
    if (success) {
      metrics.successfulConnections++;
    }
    metrics.successRate = metrics.successfulConnections / metrics.connectionAttempts;
    metrics.lastUsed = Date.now();
  }

  private initializeStrategyMetrics(): void {
    const strategies: ConnectionStrategy[] = ["websocket", "polling"];

    for (const strategy of strategies) {
      this.metrics.strategyPerformance.set(strategy, {
        name: strategy,
        successRate: 1, // Start optimistic
        averageLatency: strategy === "websocket" ? 100 : 500, // Estimated defaults
        connectionAttempts: 0,
        successfulConnections: 0,
        totalUptime: 0,
        lastUsed: 0,
      });
    }
  }

  private log(message: string, ...args: unknown[]): void {
    if (this.config.debugMode) {
      console.log(`[ConnectionManager] ${message}`, ...args);
    }
  }

  private generateErrorFingerprint(message: string, type: string): string {
    const fingerprintData = {
      type,
      message: message.substring(0, 100), // First 100 chars
    };

    return btoa(JSON.stringify(fingerprintData)).substring(0, 16);
  }

  /**
   * Start quality monitoring with visibility-aware intervals
   * FIX: Uses ServiceVisibilityManager to pause when tab is hidden
   */
  private startQualityMonitoring(): void {
    this.visibilityManager.createInterval(
      "qualityCheck",
      () => {
        if (this.currentConnection && this.connectionStatus.connected) {
          const stats = this.currentConnection.getStats();

          // Check if quality is below threshold
          if (stats.qualityScore < 0.5) {
            this.emit("connection_quality_degraded", { stats });

            // Consider switching strategy
            if (this.fallbackStrategy === "quality_based") {
              const fallback = this.getFallbackStrategy(this.connectionStatus.type);
              if (fallback) {
                this.connectWithStrategy(fallback).catch(() => {
                  // Fallback failed, stay with current connection
                });
              }
            }
          }
        }
      },
      this.config.qualityCheckInterval
    );
  }

  private clearQualityMonitoring(): void {
    this.visibilityManager.clearInterval("qualityCheck");
  }

  private clearReconnectTimeout(): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
  }
}

// ================================
// SINGLETON AND UTILITIES
// ================================

let connectionManagerInstance: ConnectionManager | null = null;

/**
 * Get the singleton ConnectionManager instance
 */
export const getConnectionManager = (config?: Partial<ConnectionConfig>): ConnectionManager => {
  connectionManagerInstance ??= new ConnectionManager(config);
  return connectionManagerInstance;
};

/**
 * Destroy the ConnectionManager instance
 */
export const destroyConnectionManager = (): void => {
  if (connectionManagerInstance) {
    connectionManagerInstance.destroy();
    connectionManagerInstance = null;
  }
};

/**
 * Create recovery actions for connection errors
 */
export const createConnectionRecoveryActions = (
  error: SyncError,
  connectionManager: ConnectionManager
): RecoveryAction[] => {
  const actions: RecoveryAction[] = [];

  // Always offer retry for retryable errors
  if (error.retryable && error.retryCount < error.maxRetries) {
    actions.push({
      type: "retry",
      delay: Math.min(1000 * Math.pow(2, error.retryCount), 30000),
    });
  }

  // Offer fallback strategy
  const currentStrategy = connectionManager.getCurrentStrategy();
  if (currentStrategy === "websocket") {
    actions.push({
      type: "fallback",
      strategy: "polling",
    });
  }

  // Force sync as last resort
  actions.push({
    type: "force_sync",
    sections: ["all"],
  });

  return actions;
};
