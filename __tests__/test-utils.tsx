import { RenderOptions, render } from "@testing-library/react";
import React, { ReactElement } from "react";

/**
 * Test utilities for React components with providers
 * Enhanced to handle ES module imports and exports properly
 */

// Mock QueryClient and QueryClientProvider for testing
class MockQueryClient {
  invalidateQueries(): Promise<void> {
    return Promise.resolve();
  }

  setQueryData(): void {
    // Mock implementation
  }

  getQueryData(): unknown {
    return undefined;
  }

  clear(): void {
    // Mock implementation
  }
}

const MockQueryClientProvider = ({
  children,
  client: _client,
}: {
  children: React.ReactNode;
  client?: MockQueryClient;
}) => <div data-testid="query-client-provider">{children}</div>;

// Use mocks instead of real imports to avoid constructor issues
const QueryClient = MockQueryClient;
const QueryClientProvider = MockQueryClientProvider;

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
  connectionState: jest.fn(() => ({ isWebSocketConnected: true })),
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
const MockClerkProvider = ({ children }: { children: React.ReactNode }) => {
  return <div data-testid="clerk-provider">{children}</div>;
};

const MockConvexProvider = ({ children }: { children: React.ReactNode }) => {
  return <div data-testid="convex-provider">{children}</div>;
};

// Create a custom render function that includes providers
function customRender(ui: ReactElement, options?: Omit<RenderOptions, "wrapper">) {
  const queryClient = new QueryClient();

  function AllTheProviders({ children }: { children: React.ReactNode }) {
    return (
      <MockClerkProvider>
        <MockConvexProvider>
          <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
        </MockConvexProvider>
      </MockClerkProvider>
    );
  }

  return render(ui, { wrapper: AllTheProviders, ...options });
}

// Create a wrapper component for renderHook
function createWrapper() {
  const queryClient = new QueryClient();

  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <MockClerkProvider>
        <MockConvexProvider>
          <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
        </MockConvexProvider>
      </MockClerkProvider>
    );
  };
}

// Enhanced test utilities for ES module compatibility
const testUtilsObject = {
  createQueryClient: () => new QueryClient(),

  mockConvexClient,
  mockClerk,

  // Helper for creating isolated test environments
  createIsolatedWrapper: (customQueryClient?: MockQueryClient) => {
    const queryClient = customQueryClient || testUtilsObject.createQueryClient();

    return function IsolatedWrapper({ children }: { children: React.ReactNode }) {
      return (
        <MockClerkProvider>
          <MockConvexProvider>
            <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
          </MockConvexProvider>
        </MockClerkProvider>
      );
    };
  },
};

// Re-export everything
export * from "@testing-library/react";

// Override render method
export { customRender as render };

// Export utilities for tests
export { createWrapper, mockClerk, mockConvexClient, testUtilsObject as testUtils };

// ================================
// DATA VALIDATION TEST UTILITIES
// ================================

/**
 * Export test fixtures for dashboard data validation
 * These fixtures provide static test data that doesn't depend on current date/time
 */
export {
  createDuplicateDashboardData,
  createInconsistentDashboardData,
  createMinimalDashboardData,
  createTestConsistencyOptions,
  createTestDashboardData,
  testActivity,
  testChartData,
  testConsistencyCheckOptions,
  testDashboardData,
  testDownloads,
  testFavorites,
  testOrders,
  testReservations,
  testStats,
  testTrends,
  testUser,
} from "./fixtures/dashboardData";

/**
 * Create a test-friendly ConsistencyChecker instance
 * Pre-configured to skip time-based validations and allow test hashes
 *
 * @example
 * ```typescript
 * import { createTestConsistencyChecker } from '@/__tests__/test-utils';
 *
 * const checker = createTestConsistencyChecker();
 * const result = checker.validate(testData);
 * expect(result.inconsistencies).toHaveLength(0);
 * ```
 */
export async function createTestConsistencyChecker() {
  // Import ConsistencyChecker dynamically to avoid circular dependencies
  const { ConsistencyChecker } = await import("../client/src/utils/dataConsistency");
  return ConsistencyChecker.createTestChecker();
}
