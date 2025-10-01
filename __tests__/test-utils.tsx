import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RenderOptions, render } from "@testing-library/react";
import React, { ReactElement } from "react";
/**
 * Test utilities for React components with providers
 */


interface MockConvexClient {
  query: jest.Mock;
  mutation: jest.Mock;
  action: jest.Mock;
  subscribe: jest.Mock;
  close: jest.Mock;
  connectionState: jest.Mock;
  setAuth: jest.Mock;
  clearAuth: jest.Mock;
}

interface MockClerkUser {
  id: string;
  emailAddresses: Array<{ emailAddress: string }>;
  firstName: string;
  lastName: string;
}

interface MockClerkInstance {
  user: MockClerkUser;
  session: { id: string };
  isLoaded: boolean;
  isSignedIn: boolean;
}

// Mock Convex client with proper methods
const mockConvexClient: MockConvexClient = {
  query: jest.fn().mockResolvedValue(null),
  mutation: jest.fn().mockResolvedValue(null),
  action: jest.fn().mockResolvedValue(null),
  subscribe: jest.fn().mockReturnValue({ unsubscribe: jest.fn() }),
  close: jest.fn(),
  connectionState: jest.fn_(() => ({ isWebSocketConnected: true })),
  setAuth: jest.fn(),
  clearAuth: jest.fn(),
};

// Mock Clerk for authentication
const mockClerk: MockClerkInstance = {
  user: {
    id: "user_test123",
    emailAddresses: [{ emailAddress: "test@example.com" }],
    firstName: "Test",
    lastName: "User",
  },
  session: {
    id: "session_test123",
  },
  isLoaded: true,
  isSignedIn: true,
};

// Mock providers as simple components
const MockClerkProvider = ({
  children,
}: {
  children: React.ReactNode;
  publishableKey?: string;
  clerk?: MockClerkInstance;
}) => {
  return <div data-testid="clerk-provider">{children}</div>;
};

const MockConvexProvider = ({
  children,
}: {
  children: React.ReactNode;
  client?: MockConvexClient;
}) => {
  return <div data-testid="convex-provider">{children}</div>;
};

// Create a custom render function that includes providers
function customRender(ui: ReactElement, options?: Omit<RenderOptions, "wrapper">) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
        staleTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  });

  function AllTheProviders({ children }: { children: React.ReactNode }) {
    return (
      <MockClerkProvider publishableKey="pk_test_mock_key" clerk={mockClerk}>
        <MockConvexProvider client={mockConvexClient}>
          <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
        </MockConvexProvider>
      </MockClerkProvider>
    );
  }

  return render(ui, { wrapper: AllTheProviders, ...options });
}

// Create a wrapper component for renderHook
function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
        staleTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  });

  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <MockClerkProvider publishableKey="pk_test_mock_key" clerk={mockClerk}>
        <MockConvexProvider client={mockConvexClient}>
          <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
        </MockConvexProvider>
      </MockClerkProvider>
    );
  };
}

// Re-export everything
export * from "@testing-library/react";

// Override render method
export { customRender as render };

// Export utilities for tests
export { createWrapper, mockClerk, mockConvexClient };
