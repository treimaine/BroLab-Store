import { IncomingMessage, Server } from "node:http";
import { WebSocket, WebSocketServer } from "ws";

export interface WebSocketMessage {
  type: string;
  payload: unknown;
  timestamp: number;
  source: "client" | "server";
  id: string;
}

export interface ClientConnection {
  id: string;
  userId?: string;
  socket: WebSocket;
  lastHeartbeat: number;
  subscriptions: Set<string>;
}

/**
 * WebSocket Manager for real-time dashboard synchronization
 * Handles client connections, message broadcasting, and heartbeat monitoring
 *
 * FIX: Timers are disabled on Vercel/Lambda serverless to prevent
 * functions from staying alive indefinitely.
 */
export class WebSocketManager {
  private wss: WebSocketServer | null = null;
  private readonly clients = new Map<string, ClientConnection>();
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private readonly heartbeatTimeout = 60000; // 1 minute
  private readonly heartbeatCheckInterval = 30000; // 30 seconds
  private readonly disableTimers =
    Boolean(process.env.VERCEL) || Boolean(process.env.AWS_LAMBDA_FUNCTION_NAME);

  constructor() {
    // FIX: Don't start timers on serverless platforms
    if (!this.disableTimers) {
      this.setupHeartbeatMonitoring();
    }
  }

  /**
   * Initialize WebSocket server
   */
  public initialize(server: Server): void {
    this.wss = new WebSocketServer({
      server,
      path: "/ws",
      clientTracking: true,
    });

    this.wss.on("connection", (socket: WebSocket, request: IncomingMessage) => {
      this.handleConnection(socket, request);
    });

    this.wss.on("error", (error: Error) => {
      console.error("WebSocket server error:", error);
    });

    console.log("WebSocket server initialized on /ws");
  }

  /**
   * Handle new client connection
   */
  private handleConnection(socket: WebSocket, _request: IncomingMessage): void {
    const clientId = this.generateClientId();
    const client: ClientConnection = {
      id: clientId,
      socket,
      lastHeartbeat: Date.now(),
      subscriptions: new Set(),
    };

    this.clients.set(clientId, client);
    console.log(`Client connected: ${clientId} (${this.clients.size} total)`);

    // Send welcome message
    this.sendToClient(clientId, {
      type: "connected",
      payload: { clientId },
      timestamp: Date.now(),
      source: "server",
      id: this.generateMessageId(),
    });

    // Set up message handler
    socket.on("message", (data: Buffer) => {
      this.handleMessage(clientId, data);
    });

    // Handle client disconnect
    socket.on("close", (code: number, reason: Buffer) => {
      this.handleDisconnect(clientId, code, reason.toString());
    });

    // Handle socket errors
    socket.on("error", (error: Error) => {
      console.error(`Client ${clientId} error:`, error);
      this.handleDisconnect(clientId, 1006, "Socket error");
    });
  }

  /**
   * Handle incoming message from client
   */
  private handleMessage(clientId: string, data: Buffer): void {
    const client = this.clients.get(clientId);
    if (!client) return;

    try {
      const message: WebSocketMessage = JSON.parse(data.toString());

      // Update heartbeat
      client.lastHeartbeat = Date.now();

      console.log(`Message from ${clientId}:`, message.type);

      switch (message.type) {
        case "heartbeat":
          this.handleHeartbeat(clientId, message);
          break;

        case "subscribe":
          this.handleSubscription(clientId, message);
          break;

        case "unsubscribe":
          this.handleUnsubscription(clientId, message);
          break;

        case "force_sync":
          this.handleForceSync(clientId, message);
          break;

        case "data_update":
          this.handleDataUpdate(clientId, message);
          break;

        default:
          console.warn(`Unknown message type from ${clientId}: ${message.type}`);
      }
    } catch (error) {
      console.error(`Error parsing message from ${clientId}:`, error);
      this.sendError(clientId, "Invalid message format", "PARSE_ERROR");
    }
  }

  /**
   * Handle client disconnect
   */
  private handleDisconnect(clientId: string, code: number, _reason: string): void {
    const _client = this.clients.get(clientId);
    if (_client) {
      console.log(`Client disconnected: ${clientId} (code: ${code}, reason: ${_reason})`);
      this.clients.delete(clientId);
    }
  }

  /**
   * Handle heartbeat message
   */
  private handleHeartbeat(clientId: string, message: WebSocketMessage): void {
    this.sendToClient(clientId, {
      type: "heartbeat_ack",
      payload: { timestamp: message.timestamp },
      timestamp: Date.now(),
      source: "server",
      id: this.generateMessageId(),
    });
  }

  /**
   * Handle subscription request
   */
  private handleSubscription(clientId: string, message: WebSocketMessage): void {
    const client = this.clients.get(clientId);
    if (!client) return;

    const payload = message.payload as { topics?: string[] };
    const { topics } = payload;
    if (Array.isArray(topics)) {
      topics.forEach(topic => client.subscriptions.add(topic));
    }

    this.sendToClient(clientId, {
      type: "subscription_ack",
      payload: { topics, subscribed: Array.from(client.subscriptions) },
      timestamp: Date.now(),
      source: "server",
      id: this.generateMessageId(),
    });
  }

  /**
   * Handle unsubscription request
   */
  private handleUnsubscription(clientId: string, message: WebSocketMessage): void {
    const client = this.clients.get(clientId);
    if (!client) return;

    const payload = message.payload as { topics?: string[] };
    const { topics } = payload;
    if (Array.isArray(topics)) {
      topics.forEach(topic => client.subscriptions.delete(topic));
    }

    this.sendToClient(clientId, {
      type: "unsubscription_ack",
      payload: { topics, subscribed: Array.from(client.subscriptions) },
      timestamp: Date.now(),
      source: "server",
      id: this.generateMessageId(),
    });
  }

  /**
   * Handle force sync request
   */
  private async handleForceSync(clientId: string, message: WebSocketMessage): Promise<void> {
    try {
      // This would typically fetch fresh data from the database
      // For now, we'll simulate a sync response
      const syncData = await this.fetchDashboardData(clientId);

      this.sendToClient(clientId, {
        type: "sync_data",
        payload: syncData,
        timestamp: Date.now(),
        source: "server",
        id: message.id, // Use same ID to correlate request/response
      });
    } catch (error) {
      console.error(`Force sync error for ${clientId}:`, error);
      this.sendError(clientId, "Sync failed", "SYNC_ERROR", message.id);
    }
  }

  /**
   * Handle data update from client (optimistic updates)
   */
  private handleDataUpdate(clientId: string, message: WebSocketMessage): void {
    // Broadcast the update to other clients
    this.broadcastToOthers(clientId, {
      type: "data_updated",
      payload: message.payload,
      timestamp: Date.now(),
      source: "server",
      id: this.generateMessageId(),
    });

    // Acknowledge the update
    this.sendToClient(clientId, {
      type: "update_ack",
      payload: { success: true },
      timestamp: Date.now(),
      source: "server",
      id: message.id,
    });
  }

  /**
   * Send message to specific client
   */
  public sendToClient(clientId: string, message: WebSocketMessage): boolean {
    const client = this.clients.get(clientId);
    if (!client || client.socket.readyState !== WebSocket.OPEN) {
      return false;
    }

    try {
      client.socket.send(JSON.stringify(message));
      return true;
    } catch (error) {
      console.error(`Error sending message to ${clientId}:`, error);
      return false;
    }
  }

  /**
   * Broadcast message to all connected clients
   */
  public broadcast(message: WebSocketMessage, excludeClientId?: string): number {
    let sentCount = 0;

    for (const [clientId, _client] of this.clients) {
      if (excludeClientId && clientId === excludeClientId) continue;

      if (this.sendToClient(clientId, message)) {
        sentCount++;
      }
    }

    return sentCount;
  }

  /**
   * Broadcast to all clients except the sender
   */
  public broadcastToOthers(senderClientId: string, message: WebSocketMessage): number {
    return this.broadcast(message, senderClientId);
  }

  /**
   * Broadcast to clients subscribed to specific topics
   */
  public broadcastToSubscribers(topics: string[], message: WebSocketMessage): number {
    let sentCount = 0;

    for (const [clientId, client] of this.clients) {
      const hasSubscription = topics.some(topic => client.subscriptions.has(topic));
      if (hasSubscription && this.sendToClient(clientId, message)) {
        sentCount++;
      }
    }

    return sentCount;
  }

  /**
   * Send error message to client
   */
  private sendError(clientId: string, message: string, code: string, correlationId?: string): void {
    this.sendToClient(clientId, {
      type: "error",
      payload: { message, code, correlationId },
      timestamp: Date.now(),
      source: "server",
      id: this.generateMessageId(),
    });
  }

  /**
   * Set up heartbeat monitoring
   */
  private setupHeartbeatMonitoring(): void {
    this.heartbeatInterval = setInterval(() => {
      this.checkHeartbeats();
    }, this.heartbeatCheckInterval);
  }

  /**
   * Check for stale connections and clean them up
   */
  private checkHeartbeats(): void {
    const now = Date.now();
    const staleClients: string[] = [];

    for (const [clientId, client] of this.clients) {
      if (now - client.lastHeartbeat > this.heartbeatTimeout) {
        staleClients.push(clientId);
      }
    }

    staleClients.forEach(clientId => {
      console.log(`Removing stale client: ${clientId}`);
      const staleClient = this.clients.get(clientId);
      if (staleClient) {
        staleClient.socket.terminate();
        this.clients.delete(clientId);
      }
    });

    if (staleClients.length > 0) {
      console.log(`Cleaned up ${staleClients.length} stale connections`);
    }
  }

  /**
   * Fetch dashboard data for sync (placeholder implementation)
   */
  private async fetchDashboardData(_clientId: string): Promise<unknown> {
    // This would typically fetch real data from Convex or database
    // For now, return a placeholder structure
    return {
      user: { id: "user123", name: "Test User" },
      stats: {
        totalFavorites: 5,
        totalDownloads: 12,
        totalOrders: 3,
        totalSpent: 149.97,
        recentActivity: 8,
        quotaUsed: 12,
        quotaLimit: 50,
        calculatedAt: new Date().toISOString(),
        dataHash: this.generateDataHash(),
      },
      favorites: [],
      orders: [],
      downloads: [],
      reservations: [],
      activity: [],
      trends: {},
      chartData: [],
    };
  }

  /**
   * Generate unique client ID
   */
  private generateClientId(): string {
    return `client_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }

  /**
   * Generate unique message ID
   */
  private generateMessageId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }

  /**
   * Generate data hash for consistency validation
   */
  private generateDataHash(): string {
    return `hash_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }

  /**
   * Get connection statistics
   */
  public getStats(): {
    totalConnections: number;
    activeConnections: number;
    totalSubscriptions: number;
  } {
    let totalSubscriptions = 0;
    for (const client of this.clients.values()) {
      totalSubscriptions += client.subscriptions.size;
    }

    return {
      totalConnections: this.clients.size,
      activeConnections: Array.from(this.clients.values()).filter(
        client => client.socket.readyState === WebSocket.OPEN
      ).length,
      totalSubscriptions,
    };
  }

  /**
   * Shutdown the WebSocket manager
   */
  public shutdown(): void {
    console.log("Shutting down WebSocket manager...");

    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }

    // Close all client connections
    for (const client of this.clients.values()) {
      client.socket.close(1001, "Server shutdown");
    }
    this.clients.clear();

    // Close WebSocket server
    if (this.wss) {
      this.wss.close();
      this.wss = null;
    }
  }
}

// Export singleton instance
let wsManagerInstance: WebSocketManager | null = null;

export const getWebSocketManager = (): WebSocketManager => {
  wsManagerInstance ??= new WebSocketManager();
  return wsManagerInstance;
};

export const destroyWebSocketManager = (): void => {
  if (wsManagerInstance) {
    wsManagerInstance.shutdown();
    wsManagerInstance = null;
  }
};
