/**
 * React Hook for Connection Manager
 *
 * Provides easy-to-use interface for managing real-time connections in React components
 * with automatic cleanup, status monitoring, and error handling.
 *
 * FIX: Auto-connect is disabled in production (Vercel) because:
 * 1. Vercel serverless doesn't support WebSockets
 * 2. WebSocket reconnection loops cause browser freezes
 * 3. The polling fallback still creates unnecessary server load
 */

import {
  ConnectionConfig,
  ConnectionManager,
  ConnectionMessage,
  ConnectionMetrics,
  getConnectionManager,
} from "@/services/ConnectionManager";
import type { ConnectionStatus, RecoveryAction, SyncError } from "@shared/types/sync";
import { useCallback, useEffect, useRef, useState } from "react";

// FIX: Detect if running on Vercel production (no WebSocket support)
const isVercelProduction =
  globalThis.window !== undefined &&
  (globalThis.window.location.hostname.includes("vercel.app") ||
    globalThis.window.location.hostname.includes("brolab") ||
    import.meta.env.PROD);

export interface UseConnectionManagerOptions {
  /** Connection configuration */
  config?: Partial<ConnectionConfig>;
  /** Whether to auto-connect on mount (disabled in production by default) */
  autoConnect?: boolean;
  /** Whether to auto-reconnect on errors */
  autoReconnect?: boolean;
  /** Custom error handler */
  onError?: (error: SyncError) => void;
  /** Custom connection status handler */
  onStatusChange?: (status: ConnectionStatus) => void;
  /** Custom message handler */
  onMessage?: (message: ConnectionMessage) => void;
}

export interface UseConnectionManagerReturn {
  /** Connection manager instance */
  connectionManager: ConnectionManager;
  /** Current connection status */
  status: ConnectionStatus;
  /** Connection metrics */
  metrics: ConnectionMetrics;
  /** Whether connection is active */
  isConnected: boolean;
  /** Whether reconnection is in progress */
  isReconnecting: boolean;
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
  /** Current error (if any) */
  error: SyncError | null;
  /** Clear current error */
  clearError: () => void;
  /** Available recovery actions */
  recoveryActions: RecoveryAction[];
}

/**
 * Hook for managing real-time connections with automatic integration
 *
 * FIX: Auto-connect is disabled by default in production to prevent
 * WebSocket reconnection loops that cause browser freezes on Vercel.
 */
export const useConnectionManager = (
  options: UseConnectionManagerOptions = {}
): UseConnectionManagerReturn => {
  const {
    config,
    // FIX: Disable auto-connect in production (Vercel doesn't support WebSockets)
    autoConnect = !isVercelProduction,
    autoReconnect: _autoReconnect = true,
    onError,
    onStatusChange,
    onMessage,
  } = options;

  const managerRef = useRef<ConnectionManager | null>(null);
  const [status, setStatus] = useState<ConnectionStatus>({
    type: "offline",
    connected: false,
    reconnecting: false,
    lastConnected: 0,
    reconnectAttempts: 0,
    maxReconnectAttempts: 10,
  });
  const [metrics, setMetrics] = useState<ConnectionMetrics>({
    status,
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
  });
  const [error, setError] = useState<SyncError | null>(null);
  const [recoveryActions, setRecoveryActions] = useState<RecoveryAction[]>([]);

  // Initialize connection manager
  useEffect(() => {
    if (managerRef.current) {
      return undefined;
    }

    managerRef.current = getConnectionManager(config);
    const manager = managerRef.current;

    // Status change handler
    const handleStatusChange = (newStatus: ConnectionStatus): void => {
      setStatus(newStatus);
      onStatusChange?.(newStatus);
    };

    // Message handler
    const handleMessage = (message: ConnectionMessage): void => {
      onMessage?.(message);
    };

    // Error handler
    const handleSyncError = (errorEvent: { error: SyncError }): void => {
      setError(errorEvent.error);
      onError?.(errorEvent.error);
      const actions = generateRecoveryActions(errorEvent.error, manager);
      setRecoveryActions(actions);
    };

    // Connected handler
    const handleConnected = (): void => {
      setError(null);
      setRecoveryActions([]);
    };

    // Metrics update handler
    const handleMetricsUpdate = (): void => {
      if (managerRef.current) {
        setMetrics(managerRef.current.getConnectionMetrics());
      }
    };

    // Set up event listeners
    const statusUnsubscribe = manager.onStatusChange(handleStatusChange);
    const messageUnsubscribe = manager.onMessage(handleMessage);
    manager.on("sync_error", handleSyncError);
    manager.on("connected", handleConnected);

    // Auto-connect if enabled
    // FIX: Skip auto-connect in production to prevent WebSocket reconnection loops
    if (autoConnect && !isVercelProduction) {
      manager.connect().catch(err => {
        console.error("Auto-connect failed:", err);
      });
    } else if (isVercelProduction && import.meta.env.DEV) {
      console.log("[useConnectionManager] Auto-connect disabled in production (Vercel)");
    }

    // Update metrics periodically - REDUCED frequency to prevent performance issues
    // 10 seconds is sufficient for metrics display, 1 second was causing freezes
    const metricsInterval = setInterval(handleMetricsUpdate, 10000);

    return () => {
      statusUnsubscribe();
      messageUnsubscribe();
      manager.off("sync_error", handleSyncError);
      manager.off("connected", handleConnected);
      clearInterval(metricsInterval);
    };
  }, [config, autoConnect, onError, onStatusChange, onMessage]);

  // Connect function
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

  // Disconnect function
  const disconnect = useCallback(() => {
    if (managerRef.current) {
      managerRef.current.disconnect();
      setError(null);
      setRecoveryActions([]);
    }
  }, []);

  // Reconnect function
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

  // Send message function
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

  // Enable fallback function
  const enableFallback = useCallback(
    (strategy: "immediate" | "gradual" | "quality_based" | "manual") => {
      if (managerRef.current) {
        managerRef.current.enableFallback(strategy);
      }
    },
    []
  );

  // Get current strategy function
  const getCurrentStrategy = useCallback(() => {
    return managerRef.current?.getCurrentStrategy() || "offline";
  }, []);

  // Clear error function
  const clearError = useCallback(() => {
    setError(null);
    setRecoveryActions([]);
  }, []);

  return {
    connectionManager: managerRef.current!,
    status,
    metrics,
    isConnected: status.connected,
    isReconnecting: status.reconnecting,
    connect,
    disconnect,
    reconnect,
    sendMessage,
    enableFallback,
    getCurrentStrategy,
    error,
    clearError,
    recoveryActions,
  };
};

/**
 * Hook for monitoring connection status with callbacks
 */
export const useConnectionStatus = (
  onStatusChange?: (status: ConnectionStatus) => void,
  onConnected?: () => void,
  onDisconnected?: () => void,
  onReconnecting?: () => void
) => {
  const { status, isConnected, isReconnecting } = useConnectionManager({
    onStatusChange,
  });

  useEffect(() => {
    if (isConnected && onConnected) {
      onConnected();
    }
  }, [isConnected, onConnected]);

  useEffect(() => {
    if (!isConnected && !isReconnecting && onDisconnected) {
      onDisconnected();
    }
  }, [isConnected, isReconnecting, onDisconnected]);

  useEffect(() => {
    if (isReconnecting && onReconnecting) {
      onReconnecting();
    }
  }, [isReconnecting, onReconnecting]);

  return {
    status,
    isConnected,
    isReconnecting,
    isOffline: status.type === "offline",
    connectionType: status.type,
  };
};

// Helper to delay execution
const delay = (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms));

// Helper to queue a message
const queueMessage = (
  message: ConnectionMessage,
  setPendingMessages: React.Dispatch<React.SetStateAction<ConnectionMessage[]>>
): void => {
  setPendingMessages(prev => [...prev, message]);
};

// Helper to remove message from queue
const removeFromQueue = (
  messageId: string,
  setPendingMessages: React.Dispatch<React.SetStateAction<ConnectionMessage[]>>
): void => {
  setPendingMessages(prev => prev.filter(m => m.id !== messageId));
};

// Helper to handle failed message send
const handleFailedSend = (
  message: ConnectionMessage,
  err: unknown,
  setPendingMessages: React.Dispatch<React.SetStateAction<ConnectionMessage[]>>
): void => {
  console.error("Failed to send pending message:", err);
  queueMessage(message, setPendingMessages);
};

/**
 * Hook for sending messages with automatic retry
 */
export const useConnectionMessaging = () => {
  const { sendMessage, isConnected } = useConnectionManager();
  const [pendingMessages, setPendingMessages] = useState<ConnectionMessage[]>([]);

  const sendWithRetry = useCallback(
    async (message: ConnectionMessage, maxRetries = 3) => {
      let retries = 0;

      while (retries < maxRetries) {
        try {
          if (!isConnected) {
            queueMessage(message, setPendingMessages);
            throw new Error("Not connected - message queued");
          }

          await sendMessage(message);
          removeFromQueue(message.id, setPendingMessages);
          return;
        } catch (err) {
          retries++;
          if (retries >= maxRetries) {
            throw err;
          }
          await delay(1000 * retries);
        }
      }
    },
    [sendMessage, isConnected]
  );

  // Send pending messages when connection is restored
  useEffect(() => {
    if (!isConnected || pendingMessages.length === 0) return;

    const messagesToSend = [...pendingMessages];
    setPendingMessages([]);

    for (const message of messagesToSend) {
      sendMessage(message).catch(err => handleFailedSend(message, err, setPendingMessages));
    }
  }, [isConnected, pendingMessages, sendMessage]);

  return {
    sendWithRetry,
    pendingMessages,
    hasPendingMessages: pendingMessages.length > 0,
  };
};

/**
 * Hook for connection metrics monitoring
 * FIX: Reduced default update interval from 1s to 5s to prevent performance issues
 */
export const useConnectionMetrics = (updateInterval = 5000) => {
  const { metrics } = useConnectionManager();
  const [history, setHistory] = useState<ConnectionMetrics[]>([]);

  useEffect(() => {
    const interval = setInterval(() => {
      setHistory(prev => {
        const newHistory = [...prev, metrics];
        // Keep only last 50 entries (reduced from 100 to save memory)
        return newHistory.slice(-50);
      });
    }, updateInterval);

    return () => clearInterval(interval);
  }, [metrics, updateInterval]);

  const getAverageLatency = useCallback(
    (period = 10) => {
      const recentMetrics = history.slice(-period);
      if (recentMetrics.length === 0) return 0;

      return (
        recentMetrics.reduce((sum, m) => sum + m.stats.averageLatency, 0) / recentMetrics.length
      );
    },
    [history]
  );

  const getErrorRate = useCallback(
    (period = 10) => {
      const recentMetrics = history.slice(-period);
      if (recentMetrics.length === 0) return 0;

      return recentMetrics.reduce((sum, m) => sum + m.errorRate, 0) / recentMetrics.length;
    },
    [history]
  );

  return {
    current: metrics,
    history,
    getAverageLatency,
    getErrorRate,
    qualityScore: metrics.stats.qualityScore,
    isHealthy: metrics.stats.qualityScore > 0.7,
  };
};

// Helper function to generate recovery actions
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

  return actions;
}
