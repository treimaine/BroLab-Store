/**
 * Connection Manager Provider
 *
 * Provides ConnectionManager context to the entire dashboard application
 * with automatic initialization, error handling, and graceful degradation.
 */

import {
  ConnectionConfig,
  ConnectionManager,
  ConnectionMessage,
  getConnectionManager,
} from "@/services/ConnectionManager";
import { useDashboardStore } from "@/store/useDashboardStore";
import type { ConnectionStatus, RecoveryAction, SyncError } from "@shared/types/sync";
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";

// ================================
// CONTEXT INTERFACES
// ================================

export interface ConnectionManagerContextValue {
  /** Connection manager instance */
  connectionManager: ConnectionManager;
  /** Current connection status */
  status: ConnectionStatus;
  /** Whether connection is active */
  isConnected: boolean;
  /** Whether reconnection is in progress */
  isReconnecting: boolean;
  /** Current error (if any) */
  error: SyncError | null;
  /** Available recovery actions */
  recoveryActions: RecoveryAction[];
  /** Connect manually */
  connect: () => Promise<void>;
  /** Disconnect manually */
  disconnect: () => void;
  /** Reconnect manually */
  reconnect: () => Promise<void>;
  /** Send message through connection */
  sendMessage: (message: ConnectionMessage) => Promise<void>;
  /** Enable fallback strategy */
  enableFallback: (strategy: "immediate" | "gradual" | "quality_based" | "manual") => void;
  /** Get current connection strategy */
  getCurrentStrategy: () => "websocket" | "polling" | "offline";
  /** Clear current error */
  clearError: () => void;
  /** Execute recovery action */
  executeRecoveryAction: (action: RecoveryAction) => Promise<void>;
}

export interface ConnectionManagerProviderProps {
  /** Connection configuration */
  config?: Partial<ConnectionConfig>;
  /** Whether to auto-connect on mount */
  autoConnect?: boolean;
  /** Whether to show connection status in UI */
  showStatus?: boolean;
  /** Custom error handler */
  onError?: (error: SyncError) => void;
  /** Custom connection handler */
  onConnected?: () => void;
  /** Custom disconnection handler */
  onDisconnected?: () => void;
  /** Children components */
  children: React.ReactNode;
}

// ================================
// CONTEXT CREATION
// ================================

const ConnectionManagerContext = createContext<ConnectionManagerContextValue | null>(null);

/**
 * Hook to use ConnectionManager context
 */
export const useConnectionManagerContext = (): ConnectionManagerContextValue => {
  const context = useContext(ConnectionManagerContext);
  if (!context) {
    throw new Error("useConnectionManagerContext must be used within ConnectionManagerProvider");
  }
  return context;
};

// ================================
// PROVIDER COMPONENT
// ================================

/**
 * ConnectionManager Provider Component
 */
export const ConnectionManagerProvider: React.FC<ConnectionManagerProviderProps> = ({
  config,
  autoConnect = true,
  showStatus = true,
  onError,
  onConnected,
  onDisconnected,
  children,
}) => {
  const managerRef = useRef<ConnectionManager | null>(null);
  const [status, setStatus] = useState<ConnectionStatus>({
    type: "offline",
    connected: false,
    reconnecting: false,
    lastConnected: 0,
    reconnectAttempts: 0,
    maxReconnectAttempts: 10,
  });
  const [error, setError] = useState<SyncError | null>(null);
  const [recoveryActions, setRecoveryActions] = useState<RecoveryAction[]>([]);

  // Dashboard store integration
  const { setSyncStatus, addSyncError, clearSyncErrors, publish } = useDashboardStore();

  // Initialize connection manager
  useEffect(() => {
    if (!managerRef.current) {
      managerRef.current = getConnectionManager(config);

      // Set up event listeners
      const statusUnsubscribe = managerRef.current.onStatusChange(newStatus => {
        setStatus(newStatus);

        // Update dashboard store sync status
        setSyncStatus({
          connected: newStatus.connected,
          connectionType: newStatus.type,
          lastSync: newStatus.lastConnected,
          syncInProgress: newStatus.reconnecting,
        });

        // Publish connection status event
        publish({
          type: "connection.status",
          payload: { status: newStatus },
          timestamp: Date.now(),
          source: "system",
          id: `connection-status-${Date.now()}`,
        });
      });

      const messageUnsubscribe = managerRef.current.onMessage(message => {
        handleIncomingMessage(message);
      });

      // Error handling
      const errorHandler = (errorEvent: { error: SyncError }) => {
        const syncError = errorEvent.error;
        setError(syncError);

        // Add to dashboard store
        addSyncError(syncError);

        // Generate recovery actions
        const actions = generateRecoveryActions(syncError, managerRef.current!);
        setRecoveryActions(actions);

        // Call custom error handler
        if (onError) {
          onError(syncError);
        }

        // Publish error event
        publish({
          type: "error.sync",
          payload: { error: syncError, context: {} },
          timestamp: Date.now(),
          source: "system",
          id: `sync-error-${Date.now()}`,
          priority: "high",
        });
      };

      managerRef.current.on("sync_error", errorHandler);

      // Connection events
      const connectedHandler = () => {
        setError(null);
        setRecoveryActions([]);
        clearSyncErrors();

        if (onConnected) {
          onConnected();
        }

        // Publish connected event
        publish({
          type: "connection.status",
          payload: { status: "connected" },
          timestamp: Date.now(),
          source: "system",
          id: `connected-${Date.now()}`,
        });
      };

      const disconnectedHandler = () => {
        if (onDisconnected) {
          onDisconnected();
        }

        // Publish disconnected event
        publish({
          type: "connection.status",
          payload: { status: "disconnected" },
          timestamp: Date.now(),
          source: "system",
          id: `disconnected-${Date.now()}`,
        });
      };

      managerRef.current.on("connected", connectedHandler);
      managerRef.current.on("disconnected", disconnectedHandler);

      // Auto-connect if enabled
      if (autoConnect) {
        managerRef.current.connect().catch(err => {
          console.error("Auto-connect failed:", err);
        });
      }

      return () => {
        statusUnsubscribe();
        messageUnsubscribe();
        managerRef.current?.off("sync_error", errorHandler);
        managerRef.current?.off("connected", connectedHandler);
        managerRef.current?.off("disconnected", disconnectedHandler);
      };
    }
    return undefined;
  }, [
    config,
    autoConnect,
    onError,
    onConnected,
    onDisconnected,
    setSyncStatus,
    addSyncError,
    clearSyncErrors,
    publish,
  ]);

  // Handle incoming messages
  const handleIncomingMessage = useCallback((message: ConnectionMessage) => {
    try {
      // Route messages based on type
      switch (message.type) {
        case "data_update":
          handleDataUpdate(message);
          break;
        case "sync_request":
          handleSyncRequest(message);
          break;
        case "heartbeat_response":
          // Handled by connection implementation
          break;
        default:
          console.log("Received unknown message type:", message.type);
      }
    } catch (err) {
      console.error("Error handling incoming message:", err);
    }
  }, []);

  // Handle data updates from server
  const handleDataUpdate = useCallback(
    (message: ConnectionMessage) => {
      const { payload } = message;

      if (payload && typeof payload === "object" && "section" in payload && "data" in payload) {
        // Update dashboard store with new data
        publish({
          type: "data.updated",
          payload: payload as { section: string; data: any },
          timestamp: Date.now(),
          source: "server",
          id: message.id,
          correlationId: message.correlationId,
        });
      }
    },
    [publish]
  );

  // Handle sync requests from server
  const handleSyncRequest = useCallback(
    (message: ConnectionMessage) => {
      // Trigger force sync
      publish({
        type: "sync.forced",
        payload: { trigger: "server" },
        timestamp: Date.now(),
        source: "server",
        id: message.id,
      });
    },
    [publish]
  );

  // Context methods
  const connect = useCallback(async () => {
    if (managerRef.current) {
      try {
        await managerRef.current.connect();
        setError(null);
        setRecoveryActions([]);
      } catch (err) {
        console.error("Connection failed:", err);
        throw err;
      }
    }
  }, []);

  const disconnect = useCallback(() => {
    if (managerRef.current) {
      managerRef.current.disconnect();
      setError(null);
      setRecoveryActions([]);
    }
  }, []);

  const reconnect = useCallback(async () => {
    if (managerRef.current) {
      try {
        await managerRef.current.reconnect();
        setError(null);
        setRecoveryActions([]);
      } catch (err) {
        console.error("Reconnection failed:", err);
        throw err;
      }
    }
  }, []);

  const sendMessage = useCallback(async (message: ConnectionMessage) => {
    if (managerRef.current) {
      try {
        await managerRef.current.send(message);
      } catch (err) {
        console.error("Send message failed:", err);
        throw err;
      }
    } else {
      throw new Error("Connection manager not initialized");
    }
  }, []);

  const enableFallback = useCallback(
    (strategy: "immediate" | "gradual" | "quality_based" | "manual") => {
      if (managerRef.current) {
        managerRef.current.enableFallback(strategy);
      }
    },
    []
  );

  const getCurrentStrategy = useCallback(() => {
    return managerRef.current?.getCurrentStrategy() || "offline";
  }, []);

  const clearError = useCallback(() => {
    setError(null);
    setRecoveryActions([]);
    clearSyncErrors();
  }, [clearSyncErrors]);

  const executeRecoveryAction = useCallback(
    async (action: RecoveryAction) => {
      try {
        switch (action.type) {
          case "retry":
            if (action.delay) {
              await new Promise(resolve => setTimeout(resolve, action.delay));
            }
            await reconnect();
            break;

          case "fallback":
            if (action.strategy === "polling") {
              enableFallback("immediate");
              await reconnect();
            }
            break;

          case "force_sync":
            // Trigger force sync through dashboard store
            publish({
              type: "sync.forced",
              payload: { trigger: "user" },
              timestamp: Date.now(),
              source: "user",
              id: `force-sync-${Date.now()}`,
            });
            break;

          case "reload":
            if (action.full) {
              window.location.reload();
            } else {
              // Soft reload - reconnect and refresh data
              await reconnect();
            }
            break;

          case "notify_user":
            // This would typically show a toast or notification
            console.log("User notification:", action.message);
            break;

          default:
            console.warn("Unknown recovery action:", action);
        }
      } catch (err) {
        console.error("Recovery action failed:", err);
        throw err;
      }
    },
    [reconnect, enableFallback, publish]
  );

  // Context value
  const contextValue: ConnectionManagerContextValue = {
    connectionManager: managerRef.current!,
    status,
    isConnected: status.connected,
    isReconnecting: status.reconnecting,
    error,
    recoveryActions,
    connect,
    disconnect,
    reconnect,
    sendMessage,
    enableFallback,
    getCurrentStrategy,
    clearError,
    executeRecoveryAction,
  };

  return (
    <ConnectionManagerContext.Provider value={contextValue}>
      {children}
    </ConnectionManagerContext.Provider>
  );
};

// ================================
// HELPER FUNCTIONS
// ================================

/**
 * Generate recovery actions for connection errors
 */
function generateRecoveryActions(
  error: SyncError,
  connectionManager: ConnectionManager
): RecoveryAction[] {
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

  // Offer reload for critical errors
  if (error.type === ("AUTHENTICATION_ERROR" as any)) {
    actions.push({
      type: "reload",
      full: true,
    });
  }

  return actions;
}

/**
 * Higher-order component to provide connection manager
 */
export function withConnectionManager<P extends object>(
  Component: React.ComponentType<P>,
  config?: Partial<ConnectionConfig>
) {
  return function WithConnectionManagerComponent(props: P) {
    return (
      <ConnectionManagerProvider config={config}>
        <Component {...props} />
      </ConnectionManagerProvider>
    );
  };
}
