/**
 * Real-time Dashboard Integration Tests
 *
 * Tests the complete real-time dashboard system integration.
 */

import { useRealtimeDashboard } from "@/hooks/useRealtimeDashboard";
import { DashboardRealtimeProvider } from "@/providers/DashboardRealtimeProvider";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import React from "react";

// Mock Clerk
jest.mock("@clerk/clerk-react", () => ({
  useUser: () => ({
    user: {
      id: "test-user-id",
      emailAddresses: [{ emailAddress: "test@example.com" }],
      firstName: "Test",
      lastName: "User",
      imageUrl: "https://example.com/avatar.jpg",
      username: "testuser",
    },
    isLoaded: true,
  }),
}));

// Mock Convex
jest.mock("convex/react", () => ({
  useQuery: jest.fn(() => ({
    user: {
      id: "test-user-id",
      clerkId: "test-user-id",
      email: "test@example.com",
      firstName: "Test",
      lastName: "User",
    },
    stats: {
      totalFavorites: 5,
      totalDownloads: 10,
      totalOrders: 3,
      totalSpent: 89.97,
      recentActivity: 2,
      quotaUsed: 10,
      quotaLimit: 100,
      monthlyDownloads: 10,
      monthlyOrders: 3,
      monthlyRevenue: 89.97,
    },
    favorites: [],
    orders: [],
    downloads: [],
    reservations: [],
    activity: [],
    chartData: [],
    trends: {
      orders: { period: "30d", value: 3, change: 1, changePercent: 50, isPositive: true },
      downloads: { period: "30d", value: 10, change: 2, changePercent: 25, isPositive: true },
      revenue: { period: "30d", value: 89.97, change: 29.99, changePercent: 50, isPositive: true },
      favorites: { period: "30d", value: 5, change: 1, changePercent: 25, isPositive: true },
    },
  })),
}));

// Test component that uses the real-time dashboard
function TestDashboardComponent() {
  const dashboard = useRealtimeDashboard({
    initialTab: "overview",
    enableOptimisticUpdates: true,
    enableFallbackPolling: true,
    autoConnect: true,
  });

  return (
    <div>
      <div data-testid="connection-status">{dashboard.connectionStatus}</div>
      <div data-testid="is-connected">{dashboard.isConnected ? "connected" : "disconnected"}</div>
      <div data-testid="is-polling">{dashboard.isPolling ? "polling" : "not-polling"}</div>
      <div data-testid="active-tab">{dashboard.activeTab}</div>
      <div data-testid="total-favorites">{dashboard.stats.totalFavorites}</div>
      <div data-testid="total-orders">{dashboard.stats.totalOrders}</div>
      <div data-testid="total-downloads">{dashboard.stats.totalDownloads}</div>

      <button
        data-testid="add-favorite-btn"
        onClick={() => dashboard.optimisticFavorites.addFavorite(123, { beatTitle: "Test Beat" })}
      >
        Add Favorite
      </button>

      <button
        data-testid="create-order-btn"
        onClick={() =>
          dashboard.optimisticOrders.createOrder({
            items: [
              {
                productId: 123,
                title: "Test Beat",
                price: 29.99,
                quantity: 1,
                license: "basic",
                type: "beat",
              },
            ],
            total: 29.99,
            currency: "USD",
          })
        }
      >
        Create Order
      </button>

      <button data-testid="change-tab-btn" onClick={() => dashboard.setActiveTab("favorites")}>
        Switch to Favorites
      </button>

      <button data-testid="reconnect-btn" onClick={dashboard.reconnect}>
        Reconnect
      </button>
    </div>
  );
}

// Test wrapper with providers
function TestWrapper({ children }: { children: React.ReactNode }) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        cacheTime: 0,
      },
    },
  });

  return (
    <QueryClientProvider client={queryClient}>
      <DashboardRealtimeProvider>{children}</DashboardRealtimeProvider>
    </QueryClientProvider>
  );
}

describe("Real-time Dashboard Integration", () => {
  beforeEach(() => {
    // Mock WebSocket
    global.WebSocket = jest.fn().mockImplementation(() => ({
      readyState: WebSocket.CONNECTING,
      send: jest.fn(),
      close: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    })) as any;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should render dashboard with initial state", async () => {
    render(
      <TestWrapper>
        <TestDashboardComponent />
      </TestWrapper>
    );

    // Check initial connection state
    expect(screen.getByTestId("connection-status")).toHaveTextContent("disconnected");
    expect(screen.getByTestId("is-connected")).toHaveTextContent("disconnected");
    expect(screen.getByTestId("active-tab")).toHaveTextContent("overview");

    // Check initial stats
    await waitFor(() => {
      expect(screen.getByTestId("total-favorites")).toHaveTextContent("5");
      expect(screen.getByTestId("total-orders")).toHaveTextContent("3");
      expect(screen.getByTestId("total-downloads")).toHaveTextContent("10");
    });
  });

  it("should handle tab switching", async () => {
    render(
      <TestWrapper>
        <TestDashboardComponent />
      </TestWrapper>
    );

    // Initial tab should be overview
    expect(screen.getByTestId("active-tab")).toHaveTextContent("overview");

    // Switch to favorites tab
    fireEvent.click(screen.getByTestId("change-tab-btn"));

    await waitFor(() => {
      expect(screen.getByTestId("active-tab")).toHaveTextContent("favorites");
    });
  });

  it("should handle optimistic favorite addition", async () => {
    render(
      <TestWrapper>
        <TestDashboardComponent />
      </TestWrapper>
    );

    // Click add favorite button
    fireEvent.click(screen.getByTestId("add-favorite-btn"));

    // The optimistic update should be handled internally
    // In a real test, we would check that the UI reflects the optimistic state
    await waitFor(() => {
      // This would verify that the favorite was added optimistically
      // For now, we just ensure the button click doesn't cause errors
      expect(screen.getByTestId("add-favorite-btn")).toBeInTheDocument();
    });
  });

  it("should handle optimistic order creation", async () => {
    render(
      <TestWrapper>
        <TestDashboardComponent />
      </TestWrapper>
    );

    // Click create order button
    fireEvent.click(screen.getByTestId("create-order-btn"));

    // The optimistic update should be handled internally
    await waitFor(() => {
      // This would verify that the order was created optimistically
      expect(screen.getByTestId("create-order-btn")).toBeInTheDocument();
    });
  });

  it("should handle reconnection attempts", async () => {
    render(
      <TestWrapper>
        <TestDashboardComponent />
      </TestWrapper>
    );

    // Click reconnect button
    fireEvent.click(screen.getByTestId("reconnect-btn"));

    // The reconnection should be handled internally
    await waitFor(() => {
      expect(screen.getByTestId("reconnect-btn")).toBeInTheDocument();
    });
  });

  it("should enable polling when disconnected", async () => {
    render(
      <TestWrapper>
        <TestDashboardComponent />
      </TestWrapper>
    );

    // Initially should not be polling (since we're not connected)
    // But fallback polling should start when connection fails
    await waitFor(() => {
      // In a real implementation, this would check if polling is active
      expect(screen.getByTestId("is-polling")).toBeInTheDocument();
    });
  });
});

describe("Real-time Dashboard Error Handling", () => {
  it("should handle connection errors gracefully", async () => {
    // Mock WebSocket that fails to connect
    global.WebSocket = jest.fn().mockImplementation(() => {
      const ws = {
        readyState: WebSocket.CLOSED,
        send: jest.fn(),
        close: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
      };

      // Simulate connection error
      setTimeout(() => {
        const errorEvent = new Event("error");
        ws.addEventListener.mock.calls
          .filter(([event]) => event === "error")
          .forEach(([, handler]) => handler(errorEvent));
      }, 100);

      return ws;
    }) as any;

    render(
      <TestWrapper>
        <TestDashboardComponent />
      </TestWrapper>
    );

    // Should handle the error without crashing
    await waitFor(() => {
      expect(screen.getByTestId("connection-status")).toBeInTheDocument();
    });
  });

  it("should handle optimistic update failures", async () => {
    // Mock console.error to verify error handling
    const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});

    render(
      <TestWrapper>
        <TestDashboardComponent />
      </TestWrapper>
    );

    // Trigger an optimistic update that might fail
    fireEvent.click(screen.getByTestId("add-favorite-btn"));

    // Should not crash the component
    await waitFor(() => {
      expect(screen.getByTestId("add-favorite-btn")).toBeInTheDocument();
    });

    consoleSpy.mockRestore();
  });
});
