/* eslint-disable react-refresh/only-export-components -- Example file demonstrates multiple usage patterns */
/**
 * Example: Using ConnectionManager with Clerk Authentication
 *
 * This file demonstrates how to integrate Clerk authentication
 * with the ConnectionManager for secure real-time sync.
 *
 * NOTE: This is an example/documentation file. The mock functions below
 * intentionally throw errors - replace them with actual implementations
 * from @/services/ConnectionManager and @/providers/ConnectionManagerProvider
 */

import { useAuth } from "@clerk/clerk-react";
import { useEffect, useState } from "react";

// Type definitions for the ConnectionManager (implement in your project)
interface ConnectionManagerConfig {
  pollingUrl?: string;
  websocketUrl?: string;
}

interface ConnectionManager {
  setAuthToken: (token: string) => void;
  connect: () => Promise<void>;
  disconnect: () => void;
  reconnect: () => Promise<void>;
  onMessage: (callback: (message: unknown) => void) => void;
  on: (event: string, callback: (data: { error: Error }) => void) => void;
}

/**
 * Mock function - replace with actual implementation from @/services/ConnectionManager
 * In production, import: import { getConnectionManager } from "@/services/ConnectionManager";
 */
function getConnectionManager(_config?: ConnectionManagerConfig): ConnectionManager {
  // Example implementation - replace with actual service
  return {
    setAuthToken: (_token: string) => {
      /* Set auth token */
    },
    connect: async () => {
      /* Connect to server */
    },
    disconnect: () => {
      /* Disconnect from server */
    },
    reconnect: async () => {
      /* Reconnect to server */
    },
    onMessage: (_callback: (message: unknown) => void) => {
      /* Register message handler */
    },
    on: (_event: string, _callback: (data: { error: Error }) => void) => {
      /* Register event handler */
    },
  };
}

// ============================================================================
// Example 1: Basic Setup with Clerk Token
// ============================================================================

export function DashboardWithAuth(): JSX.Element {
  const { getToken, isSignedIn } = useAuth();
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!isSignedIn) {
      return; // Don't connect if not signed in
    }

    const initConnection = async (): Promise<void> => {
      try {
        // Get Clerk token
        const token = await getToken();

        if (!token) {
          console.error("No token available");
          return;
        }

        // Initialize connection manager
        const manager = getConnectionManager({
          pollingUrl: "http://localhost:5000/api/sync",
          websocketUrl: "ws://localhost:5000/ws",
        });

        // Set auth token for polling requests
        manager.setAuthToken(token);

        // Connect
        await manager.connect();
        setIsConnected(true);

        // Listen for messages
        manager.onMessage((message: unknown) => {
          console.log("Message received:", message);
        });
      } catch (error) {
        console.error("Connection failed:", error);
      }
    };

    initConnection();

    return () => {
      const manager = getConnectionManager();
      manager.disconnect();
    };
  }, [isSignedIn, getToken]);

  return (
    <div>
      <div>Status: {isConnected ? "Connected" : "Disconnected"}</div>
      <div>Auth: {isSignedIn ? "Signed In" : "Signed Out"}</div>
    </div>
  );
}

// ============================================================================
// Example 2: Auto Token Refresh
// ============================================================================

export function DashboardWithTokenRefresh(): JSX.Element {
  const { getToken, isSignedIn } = useAuth();
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!isSignedIn) return;

    let manager: ConnectionManager | null = null;
    let refreshInterval: NodeJS.Timeout | null = null;

    const initConnection = async (): Promise<void> => {
      const token = await getToken();
      if (!token) return;

      manager = getConnectionManager({
        pollingUrl: "http://localhost:5000/api/sync",
      });

      manager.setAuthToken(token);
      await manager.connect();
      setIsConnected(true);

      // Refresh token every 50 minutes (Clerk tokens expire after 60 minutes)
      refreshInterval = setInterval(
        async () => {
          try {
            const newToken = await getToken({ skipCache: true });
            if (newToken && manager) {
              manager.setAuthToken(newToken);
              console.log("Token refreshed");
            }
          } catch (error) {
            console.error("Token refresh failed:", error);
          }
        },
        50 * 60 * 1000
      ); // 50 minutes
    };

    initConnection();

    return () => {
      if (refreshInterval) clearInterval(refreshInterval);
      if (manager) manager.disconnect();
    };
  }, [isSignedIn, getToken]);

  return <div>Connected: {isConnected ? "Yes" : "No"}</div>;
}

// ============================================================================
// Example 3: Custom Hook with Auth
// ============================================================================

export function useAuthenticatedConnection(): { isConnected: boolean; error: string | null } {
  const { getToken, isSignedIn } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isSignedIn) {
      setIsConnected(false);
      return;
    }

    let manager: ConnectionManager | null = null;

    const connect = async (): Promise<void> => {
      try {
        const token = await getToken();
        if (!token) {
          setError("No authentication token available");
          return;
        }

        manager = getConnectionManager();
        manager.setAuthToken(token);

        await manager.connect();
        setIsConnected(true);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Connection failed");
        setIsConnected(false);
      }
    };

    connect();

    return () => {
      if (manager) {
        manager.disconnect();
      }
    };
  }, [isSignedIn, getToken]);

  return { isConnected, error };
}

// Usage
export function MyDashboard(): JSX.Element {
  const { isConnected, error } = useAuthenticatedConnection();

  if (error) {
    return <div>Error: {error}</div>;
  }

  return <div>Status: {isConnected ? "Connected" : "Connecting..."}</div>;
}

// ============================================================================
// Example 4: Handling 401 Errors
// ============================================================================

export function DashboardWithErrorHandling(): JSX.Element {
  const { getToken, isSignedIn, signOut } = useAuth();
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!isSignedIn) return;

    const manager = getConnectionManager();

    const initConnection = async (): Promise<void> => {
      try {
        const token = await getToken();
        if (!token) return;

        manager.setAuthToken(token);
        await manager.connect();
        setIsConnected(true);

        // Listen for authentication errors
        manager.on("connection_error", async (event: { error: Error }) => {
          const error = event.error;

          // Check if it's a 401 error (Unauthorized)
          if (error.message.includes("401") || error.message.includes("Unauthorized")) {
            console.log("Authentication failed, trying to refresh token...");

            try {
              // Try to refresh token
              const newToken = await getToken({ skipCache: true });
              if (newToken) {
                manager.setAuthToken(newToken);
                await manager.reconnect();
              } else {
                // Token refresh failed, sign out
                console.error("Token refresh failed, signing out");
                await signOut();
              }
            } catch (refreshError) {
              console.error("Token refresh error:", refreshError);
              await signOut();
            }
          }
        });
      } catch (error) {
        console.error("Connection error:", error);
      }
    };

    initConnection();

    return () => {
      manager.disconnect();
    };
  }, [isSignedIn, getToken, signOut]);

  return <div>Connected: {isConnected ? "Yes" : "No"}</div>;
}

// ============================================================================
// Example 5: Provider Pattern with Auth
// ============================================================================

// NOTE: ConnectionManagerProvider should be implemented in @/providers/ConnectionManagerProvider
// This example shows the expected usage pattern

interface ConnectionManagerProviderProps {
  autoConnect?: boolean;
  config?: ConnectionManagerConfig;
  onConnected?: () => void;
  onError?: (error: Error) => void;
  children: React.ReactNode;
}

/**
 * Mock provider component - implement in your project
 * In production, import: import { ConnectionManagerProvider } from "@/providers/ConnectionManagerProvider";
 */
function ConnectionManagerProvider({
  children,
  autoConnect: _autoConnect,
  config: _config,
  onConnected: _onConnected,
  onError: _onError,
}: ConnectionManagerProviderProps): JSX.Element {
  return <>{children}</>;
}

/**
 * Mock context hook - implement in your project
 * In production, import: import { useConnectionManagerContext } from "@/providers/ConnectionManagerProvider";
 */
function useConnectionManagerContext(): { connectionManager: ConnectionManager } {
  // Return mock connection manager for example purposes
  return { connectionManager: getConnectionManager() };
}

export function AuthenticatedDashboardApp(): JSX.Element {
  const { getToken, isSignedIn } = useAuth();
  const [authToken, setAuthToken] = useState<string | null>(null);

  useEffect(() => {
    if (isSignedIn) {
      getToken().then(setAuthToken);
    }
  }, [isSignedIn, getToken]);

  if (!isSignedIn) {
    return <div>Please sign in to access the dashboard</div>;
  }

  if (!authToken) {
    return <div>Loading...</div>;
  }

  return (
    <ConnectionManagerProvider
      autoConnect={true}
      config={{
        pollingUrl: "http://localhost:5000/api/sync",
      }}
      onConnected={() => {
        console.log("Dashboard connected with authentication");
      }}
      onError={(error: Error) => {
        console.error("Dashboard connection error:", error);
      }}
    >
      <DashboardContent authToken={authToken} />
    </ConnectionManagerProvider>
  );
}

function DashboardContent({ authToken }: Readonly<{ authToken: string }>): JSX.Element {
  const { connectionManager } = useConnectionManagerContext();

  useEffect(() => {
    // Set auth token when component mounts
    connectionManager.setAuthToken(authToken);
  }, [connectionManager, authToken]);

  return <div>Dashboard content...</div>;
}

// ============================================================================
// Example 6: Testing with Mock Token
// ============================================================================

export function TestDashboard(): JSX.Element {
  useEffect(() => {
    const manager = getConnectionManager();

    // For testing, use mock token
    if (process.env.NODE_ENV === "test") {
      manager.setAuthToken("mock-test-token");
    }

    manager.connect();

    return () => {
      manager.disconnect();
    };
  }, []);

  return <div>Test Dashboard</div>;
}
