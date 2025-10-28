/**
 * Example: Using ConnectionManager with Clerk Authentication
 *
 * This file demonstrates how to integrate Clerk authentication
 * with the ConnectionManager for secure real-time sync.
 */

import { getConnectionManager } from "@/services/ConnectionManager";
import { useAuth } from "@clerk/clerk-react";
import { useEffect, useState } from "react";

// ============================================================================
// Example 1: Basic Setup with Clerk Token
// ============================================================================

export function DashboardWithAuth() {
  const { getToken, isSignedIn } = useAuth();
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!isSignedIn) {
      return; // Don't connect if not signed in
    }

    const initConnection = async () => {
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
        manager.onMessage(message => {
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

export function DashboardWithTokenRefresh() {
  const { getToken, isSignedIn } = useAuth();
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!isSignedIn) return;

    let manager: ReturnType<typeof getConnectionManager> | null = null;
    let refreshInterval: NodeJS.Timeout | null = null;

    const initConnection = async () => {
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

export function useAuthenticatedConnection() {
  const { getToken, isSignedIn } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isSignedIn) {
      setIsConnected(false);
      return;
    }

    let manager: ReturnType<typeof getConnectionManager> | null = null;

    const connect = async () => {
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
export function MyDashboard() {
  const { isConnected, error } = useAuthenticatedConnection();

  if (error) {
    return <div>Error: {error}</div>;
  }

  return <div>Status: {isConnected ? "Connected" : "Connecting..."}</div>;
}

// ============================================================================
// Example 4: Handling 401 Errors
// ============================================================================

export function DashboardWithErrorHandling() {
  const { getToken, isSignedIn, signOut } = useAuth();
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!isSignedIn) return;

    const manager = getConnectionManager();

    const initConnection = async () => {
      try {
        const token = await getToken();
        if (!token) return;

        manager.setAuthToken(token);
        await manager.connect();
        setIsConnected(true);

        // Listen for authentication errors
        manager.on("connection_error", async (event: { error: Error }) => {
          const error = event.error;

          // Check if it's a 401 error
          if (error.message.includes("401") || error.message.includes("Non autorisé")) {
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

import { ConnectionManagerProvider } from "@/providers/ConnectionManagerProvider";

export function AuthenticatedDashboardApp() {
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
      onError={error => {
        console.error("Dashboard connection error:", error);
      }}
    >
      <DashboardContent authToken={authToken} />
    </ConnectionManagerProvider>
  );
}

function DashboardContent({ authToken }: { authToken: string }) {
  const { connectionManager } = useConnectionManagerContext();

  useEffect(() => {
    // Set auth token when component mounts
    connectionManager.setAuthToken(authToken);
  }, [connectionManager, authToken]);

  return <div>Dashboard content...</div>;
}

// Mock import for documentation
function useConnectionManagerContext() {
  throw new Error("Use actual import from @/providers/ConnectionManagerProvider");
}

// ============================================================================
// Example 6: Testing with Mock Token
// ============================================================================

export function TestDashboard() {
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
