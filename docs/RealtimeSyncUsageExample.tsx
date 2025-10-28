/**
 * Example: Using Realtime Sync in Dashboard Components
 *
 * This file demonstrates how to integrate the realtime sync system
 * into your React components for live data updates.
 *
 * NOTE: This is a documentation file with examples.
 * Copy the relevant parts to your actual components.
 */

import { useEffect, useState } from "react";

// Mock types for documentation purposes
interface ConnectionMessage {
  type: string;
  payload: unknown;
  id: string;
  timestamp: number;
  correlationId?: string;
}

interface UseConnectionManagerReturn {
  isConnected: boolean;
  isReconnecting: boolean;
  status: {
    reconnectAttempts: number;
    maxReconnectAttempts: number;
  };
  error: { message: string } | null;
  recoveryActions: Array<{ type: string }>;
  onMessage: (handler: (message: ConnectionMessage) => void) => () => void;
  sendMessage: (message: ConnectionMessage) => Promise<void>;
  getCurrentStrategy: () => "websocket" | "polling" | "offline";
  clearError: () => void;
  executeRecoveryAction: (action: { type: string }) => Promise<void>;
}

// Mock hook - replace with actual import in your code
// import { useConnectionManager } from "@/hooks/useConnectionManager";
function useConnectionManager(_options?: { autoConnect?: boolean }): UseConnectionManagerReturn {
  // This is a mock implementation for documentation purposes
  return {
    isConnected: false,
    isReconnecting: false,
    status: {
      reconnectAttempts: 0,
      maxReconnectAttempts: 10,
    },
    error: null,
    recoveryActions: [],
    onMessage: () => () => {},
    sendMessage: async () => {},
    getCurrentStrategy: () => "offline",
    clearError: () => {},
    executeRecoveryAction: async () => {},
  };
}

// ============================================================================
// Example 1: Basic Message Listening
// ============================================================================

interface Order {
  id: string;
  name: string;
  status: string;
}

export function DashboardWithRealtimeUpdates() {
  const { isConnected, onMessage } = useConnectionManager({
    autoConnect: true,
  });

  const [orders, setOrders] = useState<Order[]>([]);

  useEffect(() => {
    // Listen for data updates
    const unsubscribe = onMessage(message => {
      if (message.type === "data.updated") {
        const payload = message.payload as { section: string; data: Order[] };
        const { section, data } = payload;

        if (section === "orders") {
          setOrders(data);
        }
      }
    });

    return unsubscribe;
  }, [onMessage]);

  return (
    <div>
      <div>Status: {isConnected ? "Connected" : "Disconnected"}</div>
      <div>Orders: {orders.length}</div>
    </div>
  );
}

// ============================================================================
// Example 2: Sending Messages
// ============================================================================

export function InteractiveDashboard() {
  const { sendMessage, isConnected } = useConnectionManager();

  const handleUserAction = async () => {
    if (!isConnected) {
      console.warn("Not connected, action will be queued");
      return;
    }

    try {
      await sendMessage({
        type: "user.action",
        payload: {
          action: "refresh_data",
          section: "orders",
        },
        id: `action_${Date.now()}`,
        timestamp: Date.now(),
      });
    } catch (error) {
      console.error("Failed to send message:", error);
    }
  };

  return (
    <button onClick={handleUserAction} disabled={!isConnected}>
      Refresh Data
    </button>
  );
}

// ============================================================================
// Example 3: Connection Status Monitoring
// ============================================================================

export function ConnectionStatusIndicator() {
  const { isConnected, isReconnecting, status, getCurrentStrategy } = useConnectionManager();

  const strategy = getCurrentStrategy();

  return (
    <div className="connection-status">
      {isReconnecting && <span>Reconnecting...</span>}
      {isConnected && (
        <span>Connected via {strategy === "websocket" ? "WebSocket" : "Polling"}</span>
      )}
      {!isConnected && !isReconnecting && <span>Offline</span>}

      {status.reconnectAttempts > 0 && (
        <span>
          Attempt {status.reconnectAttempts}/{status.maxReconnectAttempts}
        </span>
      )}
    </div>
  );
}

// ============================================================================
// Example 4: Error Handling
// ============================================================================

export function DashboardWithErrorHandling() {
  const { error, clearError, executeRecoveryAction, recoveryActions } = useConnectionManager();

  if (error) {
    return (
      <div className="error-panel">
        <h3>Connection Error</h3>
        <p>{error.message}</p>

        <div className="recovery-actions">
          {recoveryActions.map(action => (
            <button key={action.type} onClick={() => executeRecoveryAction(action)}>
              {action.type === "retry" && "Retry Connection"}
              {action.type === "fallback" && "Switch to Polling"}
              {action.type === "force_sync" && "Force Sync"}
            </button>
          ))}
          <button onClick={clearError}>Dismiss</button>
        </div>
      </div>
    );
  }

  return <div>Dashboard content...</div>;
}

// ============================================================================
// Example 5: Custom Hook for Specific Data Types
// ============================================================================

// Custom hook for realtime orders
function useRealtimeOrders() {
  const { onMessage, isConnected } = useConnectionManager();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Initial fetch
    fetchOrders()
      .then(data => {
        setOrders(data);
        setLoading(false);
      })
      .catch(error => {
        console.error("Failed to fetch orders:", error);
        setLoading(false);
      });

    // Listen for updates
    const unsubscribe = onMessage(message => {
      if (message.type === "data.updated") {
        const payload = message.payload as { section: string; data: Order[] };
        const { section, data } = payload;

        if (section === "orders") {
          setOrders(data);
        }
      }
    });

    return unsubscribe;
  }, [onMessage]);

  return { orders, loading, isConnected };
}

// Usage
export function OrdersList() {
  const { orders, loading, isConnected } = useRealtimeOrders();

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      {!isConnected && <div className="warning">Offline mode</div>}
      <ul>
        {orders.map(order => (
          <li key={order.id}>{order.name}</li>
        ))}
      </ul>
    </div>
  );
}

// ============================================================================
// Example 6: Provider Pattern for Dashboard
// ============================================================================

// Mock provider - replace with actual import in your code
// import { ConnectionManagerProvider } from "@/providers/ConnectionManagerProvider";
function ConnectionManagerProvider({
  children,
  autoConnect,
  showStatus,
  onError,
  onConnected,
}: {
  children: React.ReactNode;
  autoConnect?: boolean;
  showStatus?: boolean;
  onError?: (error: unknown) => void;
  onConnected?: () => void;
}) {
  // Mock implementation - use actual provider in your code
  console.log("Mock provider initialized", { autoConnect, showStatus, onError, onConnected });
  return <>{children}</>;
}

export function DashboardApp() {
  return (
    <ConnectionManagerProvider
      autoConnect={true}
      showStatus={true}
      onError={error => {
        console.error("Dashboard sync error:", error);
        // Send to error tracking service
      }}
      onConnected={() => {
        console.log("Dashboard connected");
      }}
    >
      <DashboardContent />
    </ConnectionManagerProvider>
  );
}

function DashboardContent() {
  // All child components can now use useConnectionManagerContext
  return (
    <div>
      <ConnectionStatusIndicator />
      <OrdersList />
      <InteractiveDashboard />
    </div>
  );
}

// ============================================================================
// Helper Functions
// ============================================================================

async function fetchOrders(): Promise<Order[]> {
  const response = await fetch("/api/orders");
  return response.json() as Promise<Order[]>;
}
