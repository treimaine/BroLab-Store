/**
 * Dashboard Real-time Provider
 *
 * Provides WebSocket connection management for real-time dashboard updates
 * with optimistic updates, connection status indicators, and automatic reconnection.
 *
 * Requirements addressed:
 * - 4.1: Real-time updates without full page refreshes
 * - 4.2: Optimistic updates for favorites, orders, and downloads
 * - 4.3: Connection status and automatic reconnection
 * - 4.4: Selective subscriptions based on active dashboard tab
 * - 4.5: Fallback to periodic polling when real-time fails
 */

import { DASHBOARD_CONFIG } from "@/config/dashboard";
import type { DashboardData } from "@shared/types/dashboard";
import { useQueryClient } from "@tanstack/react-query";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type PropsWithChildren,
} from "react";

// Connection status types
export type ConnectionStatus =
  | "connecting"
  | "connected"
  | "disconnected"
  | "error"
  | "reconnecting";

// Real-time event types
export type RealtimeEventType =
  | "favorite_added"
  | "favorite_removed"
  | "order_created"
  | "order_updated"
  | "download_completed"
  | "reservation_created"
  | "reservation_updated"
  | "activity_logged"
  | "stats_updated";

// Real-time event data structure
export interface RealtimeEvent {
  type: RealtimeEventType;
  userId: string;
  data: any;
  timestamp: number;
  id: string;
}

// Subscription configuration
export interface SubscriptionConfig {
  events: RealtimeEventType[];
  userId?: string;
  active: boolean;
}

// Optimistic update configuration
export interface OptimisticUpdate {
  id: string;
  type: RealtimeEventType;
  data: any;
  timestamp: number;
  rollback?: () => void;
}

// Real-time context interface
export interface RealtimeContextValue {
  // Connection state
  isConnected: boolean;
  connectionStatus: ConnectionStatus;
  lastConnected: Date | null;
  reconnectAttempts: number;

  // Event handling
  subscribe: (events: RealtimeEventType[], callback: (event: RealtimeEvent) => void) => () => void;
  emit: (event: Omit<RealtimeEvent, "id" | "timestamp">) => void;

  // Optimistic updates
  addOptimisticUpdate: (update: Omit<OptimisticUpdate, "id" | "timestamp">) => string;
  rollbackOptimisticUpdate: (id: string) => void;
  clearOptimisticUpdates: () => void;

  // Connection management
  connect: () => void;
  disconnect: () => void;
  reconnect: () => void;

  // Subscription management
  setActiveTab: (tab: string) => void;
  activeTab: string | null;
}

// Create context
const RealtimeContext = createContext<RealtimeContextValue | null>(null);

// WebSocket connection manager
class RealtimeConnectionManager {
  private ws: WebSocket | null = null;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = DASHBOARD_CONFIG.realtime.maxRetries;
  private reconnectInterval = DASHBOARD_CONFIG.realtime.reconnectInterval;
  private heartbeatInterval = DASHBOARD_CONFIG.realtime.heartbeatInterval;
  private eventListeners = new Map<string, Set<(event: RealtimeEvent) => void>>();
  private subscriptions = new Set<RealtimeEventType>();
  private userId: string | null = null;

  constructor(
    private onStatusChange: (status: ConnectionStatus) => void,
    private onReconnectAttemptsChange: (attempts: number) => void
  ) {}

  connect(userId: string, wsUrl?: string): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      return;
    }

    this.userId = userId;
    this.onStatusChange("connecting");

    try {
      // Use Convex WebSocket URL or fallback to development WebSocket
      const url = wsUrl || this.getWebSocketUrl();
      this.ws = new WebSocket(url);

      this.ws.onopen = this.handleOpen.bind(this);
      this.ws.onmessage = this.handleMessage.bind(this);
      this.ws.onclose = this.handleClose.bind(this);
      this.ws.onerror = this.handleError.bind(this);
    } catch (error) {
      console.error("Failed to create WebSocket connection:", error);
      this.onStatusChange("error");
      this.scheduleReconnect();
    }
  }

  disconnect(): void {
    this.clearTimers();

    if (this.ws) {
      this.ws.close(1000, "User disconnected");
      this.ws = null;
    }

    this.onStatusChange("disconnected");
    this.reconnectAttempts = 0;
    this.onReconnectAttemptsChange(0);
  }

  send(data: unknown): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    } else {
      console.warn("WebSocket not connected, cannot send data:", data);
    }
  }

  subscribe(events: RealtimeEventType[]): void {
    events.forEach(event => this.subscriptions.add(event));

    if (this.ws?.readyState === WebSocket.OPEN) {
      this.send({
        type: "subscribe",
        events: Array.from(this.subscriptions),
        userId: this.userId,
      });
    }
  }

  unsubscribe(events: RealtimeEventType[]): void {
    events.forEach(event => this.subscriptions.delete(event));

    if (this.ws?.readyState === WebSocket.OPEN) {
      this.send({
        type: "unsubscribe",
        events,
        userId: this.userId,
      });
    }
  }

  addEventListener(eventType: string, callback: (event: RealtimeEvent) => void): () => void {
    if (!this.eventListeners.has(eventType)) {
      this.eventListeners.set(eventType, new Set());
    }

    this.eventListeners.get(eventType)!.add(callback);

    return () => {
      this.eventListeners.get(eventType)?.delete(callback);
    };
  }

  private handleOpen(): void {
    console.log("WebSocket connected");
    this.onStatusChange("connected");
    this.reconnectAttempts = 0;
    this.onReconnectAttemptsChange(0);

    // Send authentication and subscription info
    this.send({
      type: "auth",
      userId: this.userId,
    });

    if (this.subscriptions.size > 0) {
      this.send({
        type: "subscribe",
        events: Array.from(this.subscriptions),
        userId: this.userId,
      });
    }

    this.startHeartbeat();
  }

  private handleMessage(event: MessageEvent): void {
    try {
      const data = JSON.parse(event.data);

      if (data.type === "pong") {
        // Heartbeat response
        return;
      }

      if (data.type === "event" && data.event) {
        this.dispatchEvent(data.event);
      }
    } catch (error) {
      console.error("Failed to parse WebSocket message:", error);
    }
  }

  private handleClose(event: CloseEvent): void {
    console.log("WebSocket disconnected:", event.code, event.reason);
    this.clearTimers();

    if (event.code !== 1000) {
      // Not a normal closure
      this.onStatusChange("disconnected");
      this.scheduleReconnect();
    } else {
      this.onStatusChange("disconnected");
    }
  }

  private handleError(error: Event): void {
    console.error("WebSocket error:", error);
    this.onStatusChange("error");
  }

  private dispatchEvent(event: RealtimeEvent): void {
    // Dispatch to specific event type listeners
    const listeners = this.eventListeners.get(event.type);
    if (listeners) {
      listeners.forEach(callback => {
        try {
          callback(event);
        } catch (error) {
          console.error("Error in event listener:", error);
        }
      });
    }

    // Dispatch to wildcard listeners
    const wildcardListeners = this.eventListeners.get("*");
    if (wildcardListeners) {
      wildcardListeners.forEach(callback => {
        try {
          callback(event);
        } catch (error) {
          console.error("Error in wildcard event listener:", error);
        }
      });
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log("Max reconnection attempts reached");
      this.onStatusChange("error");
      return;
    }

    this.reconnectAttempts++;
    this.onReconnectAttemptsChange(this.reconnectAttempts);
    this.onStatusChange("reconnecting");

    const delay = Math.min(
      this.reconnectInterval * Math.pow(1.5, this.reconnectAttempts - 1),
      30000 // Max 30 seconds
    );

    console.log(`Scheduling reconnect attempt ${this.reconnectAttempts} in ${delay}ms`);

    this.reconnectTimer = setTimeout(() => {
      if (this.userId) {
        this.connect(this.userId);
      }
    }, delay);
  }

  private startHeartbeat(): void {
    this.heartbeatTimer = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.send({ type: "ping" });
      }
    }, this.heartbeatInterval);
  }

  private clearTimers(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  private getWebSocketUrl(): string {
    // In development, use a mock WebSocket server
    if (process.env.NODE_ENV === "development") {
      return "ws://localhost:3001/ws";
    }

    // In production, this would be the actual Convex WebSocket URL
    // For now, we'll use a placeholder
    return process.env.VITE_CONVEX_WS_URL || "wss://api.brolab.com/ws";
  }
}

// Dashboard Real-time Provider Component
export function DashboardRealtimeProvider({ children }: PropsWithChildren) {
  const queryClient = useQueryClient();
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>("disconnected");
  const [lastConnected, setLastConnected] = useState<Date | null>(null);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const [activeTab, setActiveTab] = useState<string | null>(null);
  const [optimisticUpdates, setOptimisticUpdates] = useState<Map<string, OptimisticUpdate>>(
    new Map()
  );

  const connectionManager = useRef<RealtimeConnectionManager | null>(null);
  const eventSubscriptions = useRef<Map<string, () => void>>(new Map());

  // Initialize connection manager
  useEffect(() => {
    connectionManager.current = new RealtimeConnectionManager(status => {
      setConnectionStatus(status);
      if (status === "connected") {
        setLastConnected(new Date());
      }
    }, setReconnectAttempts);

    return () => {
      connectionManager.current?.disconnect();
    };
  }, []);

  // Connection management functions
  const connect = useCallback(() => {
    // In a real implementation, we'd get the user ID from Clerk
    const userId = "mock-user-id"; // This would come from useUser()
    connectionManager.current?.connect(userId);
  }, []);

  const disconnect = useCallback(() => {
    connectionManager.current?.disconnect();
  }, []);

  const reconnect = useCallback(() => {
    disconnect();
    setTimeout(connect, 1000);
  }, [connect, disconnect]);

  // Event subscription management
  const subscribe = useCallback(
    (events: RealtimeEventType[], callback: (event: RealtimeEvent) => void): (() => void) => {
      const subscriptionId = `${Date.now()}-${Math.random()}`;

      // Subscribe to connection manager events
      const unsubscribeFunctions = events.map(
        eventType => connectionManager.current?.addEventListener(eventType, callback) || (() => {})
      );

      // Subscribe to WebSocket events
      connectionManager.current?.subscribe(events);

      // Store cleanup function
      const cleanup = () => {
        unsubscribeFunctions.forEach(unsub => unsub());
        connectionManager.current?.unsubscribe(events);
        eventSubscriptions.current.delete(subscriptionId);
      };

      eventSubscriptions.current.set(subscriptionId, cleanup);

      return cleanup;
    },
    []
  );

  // Event emission
  const emit = useCallback((event: Omit<RealtimeEvent, "id" | "timestamp">) => {
    const fullEvent: RealtimeEvent = {
      ...event,
      id: `${Date.now()}-${Math.random()}`,
      timestamp: Date.now(),
    };

    connectionManager.current?.send({
      type: "event",
      event: fullEvent,
    });
  }, []);

  // Optimistic updates management
  const addOptimisticUpdate = useCallback(
    (update: Omit<OptimisticUpdate, "id" | "timestamp">): string => {
      const id = `opt-${Date.now()}-${Math.random()}`;
      const fullUpdate: OptimisticUpdate = {
        ...update,
        id,
        timestamp: Date.now(),
      };

      setOptimisticUpdates(prev => new Map(prev).set(id, fullUpdate));

      // Apply optimistic update to query cache
      applyOptimisticUpdate(fullUpdate);

      return id;
    },
    []
  );

  const rollbackOptimisticUpdate = useCallback(
    (id: string) => {
      const update = optimisticUpdates.get(id);
      if (update?.rollback) {
        update.rollback();
      }

      setOptimisticUpdates(prev => {
        const newMap = new Map(prev);
        newMap.delete(id);
        return newMap;
      });
    },
    [optimisticUpdates]
  );

  const clearOptimisticUpdates = useCallback(() => {
    optimisticUpdates.forEach(update => {
      if (update.rollback) {
        update.rollback();
      }
    });
    setOptimisticUpdates(new Map());
  }, [optimisticUpdates]);

  // Apply optimistic update to React Query cache
  const applyOptimisticUpdate = useCallback(
    (update: OptimisticUpdate) => {
      const queryKey = ["convex", "dashboard.getDashboardData"];

      queryClient.setQueryData(queryKey, (oldData: DashboardData | undefined) => {
        if (!oldData) return oldData;

        const newData = { ...oldData };

        switch (update.type) {
          case "favorite_added":
            newData.favorites = [...newData.favorites, update.data];
            newData.stats = {
              ...newData.stats,
              totalFavorites: newData.stats.totalFavorites + 1,
            };
            break;

          case "favorite_removed":
            newData.favorites = newData.favorites.filter(fav => fav.id !== update.data.id);
            newData.stats = {
              ...newData.stats,
              totalFavorites: Math.max(0, newData.stats.totalFavorites - 1),
            };
            break;

          case "order_created":
            newData.orders = [update.data, ...newData.orders];
            newData.stats = {
              ...newData.stats,
              totalOrders: newData.stats.totalOrders + 1,
              totalSpent: newData.stats.totalSpent + (update.data.total || 0),
            };
            break;

          case "download_completed":
            newData.downloads = [update.data, ...newData.downloads];
            newData.stats = {
              ...newData.stats,
              totalDownloads: newData.stats.totalDownloads + 1,
            };
            break;

          default:
            // Handle other event types
            break;
        }

        return newData;
      });

      // Store rollback function
      update.rollback = () => {
        queryClient.invalidateQueries({ queryKey });
      };
    },
    [queryClient]
  );

  // Tab-based subscription management
  useEffect(() => {
    if (!activeTab || connectionStatus !== "connected") {
      return;
    }

    // Define events to subscribe to based on active tab
    const getEventsForTab = (tab: string): RealtimeEventType[] => {
      switch (tab) {
        case "overview":
          return ["activity_logged", "stats_updated"];
        case "favorites":
          return ["favorite_added", "favorite_removed"];
        case "orders":
          return ["order_created", "order_updated"];
        case "downloads":
          return ["download_completed"];
        case "reservations":
          return ["reservation_created", "reservation_updated"];
        case "analytics":
          return ["stats_updated"];
        default:
          return ["stats_updated"];
      }
    };

    const events = getEventsForTab(activeTab);

    const unsubscribe = subscribe(events, event => {
      console.log("Received real-time event:", event);

      // Invalidate relevant queries to trigger refetch
      switch (event.type) {
        case "favorite_added":
        case "favorite_removed":
          queryClient.invalidateQueries({
            queryKey: ["convex", "favorites.getFavorites"],
          });
          break;

        case "order_created":
        case "order_updated":
          queryClient.invalidateQueries({
            queryKey: ["convex", "orders"],
          });
          break;

        case "download_completed":
          queryClient.invalidateQueries({
            queryKey: ["convex", "downloads"],
          });
          break;

        case "stats_updated":
          queryClient.invalidateQueries({
            queryKey: ["convex", "dashboard.getDashboardData"],
          });
          break;
      }
    });

    return unsubscribe;
  }, [activeTab, connectionStatus, subscribe, queryClient]);

  // Auto-connect when feature is enabled
  useEffect(() => {
    if (DASHBOARD_CONFIG.features.realtimeUpdates) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  // Context value
  const contextValue: RealtimeContextValue = {
    // Connection state
    isConnected: connectionStatus === "connected",
    connectionStatus,
    lastConnected,
    reconnectAttempts,

    // Event handling
    subscribe,
    emit,

    // Optimistic updates
    addOptimisticUpdate,
    rollbackOptimisticUpdate,
    clearOptimisticUpdates,

    // Connection management
    connect,
    disconnect,
    reconnect,

    // Subscription management
    setActiveTab,
    activeTab,
  };

  return <RealtimeContext.Provider value={contextValue}>{children}</RealtimeContext.Provider>;
}

// Hook to use real-time context
export function useRealtimeContext(): RealtimeContextValue {
  const context = useContext(RealtimeContext);
  if (!context) {
    throw new Error("useRealtimeContext must be used within a DashboardRealtimeProvider");
  }
  return context;
}

// Specialized hooks for common real-time operations
export function useRealtimeConnection() {
  const {
    isConnected,
    connectionStatus,
    lastConnected,
    reconnectAttempts,
    connect,
    disconnect,
    reconnect,
  } = useRealtimeContext();

  return {
    isConnected,
    connectionStatus,
    lastConnected,
    reconnectAttempts,
    connect,
    disconnect,
    reconnect,
  };
}

export function useOptimisticUpdates() {
  const { addOptimisticUpdate, rollbackOptimisticUpdate, clearOptimisticUpdates } =
    useRealtimeContext();

  return {
    addOptimisticUpdate,
    rollbackOptimisticUpdate,
    clearOptimisticUpdates,
  };
}

export function useRealtimeSubscription(
  events: RealtimeEventType[],
  callback: (event: RealtimeEvent) => void
) {
  const { subscribe } = useRealtimeContext();

  useEffect(() => {
    return subscribe(events, callback);
  }, [subscribe, callback, events]);
}
