import { RenderOptions, render } from "@testing-library/react";
import React, { ReactElement } from "react";

/**
 * Test utilities for React components with providers
 * Enhanced to handle ES module imports and exports properly
 */

// ================================
// MOCK QUERY CLIENT
// ================================

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

// Use mocks instead of real imports to avoid constructor issues
const QueryClient = MockQueryClient;

// ================================
// TYPE DEFINITIONS
// ================================

interface MockConvexClient {
  query: jest.Mock;
  mutation: jest.Mock;
  action: jest.Mock;
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

// ================================
// MOCK INSTANCES
// ================================

/**
 * Mock Convex client with proper methods for testing
 */
const mockConvexClient: MockConvexClient = {
  query: jest.fn().mockResolvedValue(null),
  mutation: jest.fn().mockResolvedValue(null),
  action: jest.fn().mockResolvedValue(null),
  close: jest.fn(),
  connectionState: jest.fn(() => ({ isWebSocketConnected: true })),
  setAuth: jest.fn(),
  clearAuth: jest.fn(),
};

/**
 * Mock Clerk instance for authentication testing
 */
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

// ================================
// PROVIDER COMPONENTS
// ================================

/**
 * Mock QueryClient Provider for testing
 * Wraps children with a test-friendly query client
 */
function MockQueryClientProvider({
  children,
  client,
}: {
  children: React.ReactNode;
  client: MockQueryClient;
}): React.ReactElement {
  // Store client reference to avoid unused variable warning
  const _clientRef = client;
  return (
    <div data-testid="query-client-provider" data-client={_clientRef ? "initialized" : "none"}>
      {children}
    </div>
  );
}

/**
 * Mock Clerk Provider for authentication testing
 */
function MockClerkProvider({ children }: { children: React.ReactNode }): React.ReactElement {
  return <div data-testid="clerk-provider">{children}</div>;
}

/**
 * Mock Convex Provider for real-time data testing
 */
function MockConvexProvider({ children }: { children: React.ReactNode }): React.ReactElement {
  return <div data-testid="convex-provider">{children}</div>;
}

// ================================
// RENDER UTILITIES
// ================================

/**
 * Custom render function that includes all necessary providers
 * Use this instead of @testing-library/react's render for component tests
 *
 * @example
 * ```typescript
 * import { render } from '@/__tests__/test-utils';
 *
 * render(<MyComponent />);
 * ```
 */
function customRender(ui: ReactElement, options?: Omit<RenderOptions, "wrapper">) {
  const queryClient = new QueryClient();

  function AllTheProviders({ children }: { children: React.ReactNode }): React.ReactElement {
    return (
      <MockClerkProvider>
        <MockConvexProvider>
          <MockQueryClientProvider client={queryClient}>{children}</MockQueryClientProvider>
        </MockConvexProvider>
      </MockClerkProvider>
    );
  }

  return render(ui, { wrapper: AllTheProviders, ...options });
}

/**
 * Create a wrapper component for renderHook from @testing-library/react
 * Use this for testing custom hooks that need providers
 *
 * @example
 * ```typescript
 * import { renderHook } from '@testing-library/react';
 * import { createWrapper } from '@/__tests__/test-utils';
 *
 * const { result } = renderHook(() => useMyHook(), {
 *   wrapper: createWrapper(),
 * });
 * ```
 */
function createWrapper() {
  const queryClient = new QueryClient();

  return function Wrapper({ children }: { children: React.ReactNode }): React.ReactElement {
    return (
      <MockClerkProvider>
        <MockConvexProvider>
          <MockQueryClientProvider client={queryClient}>{children}</MockQueryClientProvider>
        </MockConvexProvider>
      </MockClerkProvider>
    );
  };
}

// ================================
// TEST UTILITIES OBJECT
// ================================

/**
 * Enhanced test utilities for ES module compatibility
 * Provides helper functions for creating test environments
 */
const testUtilsObject = {
  /**
   * Create a new QueryClient instance for testing
   */
  createQueryClient: () => new QueryClient(),

  /**
   * Mock Convex client instance
   */
  mockConvexClient,

  /**
   * Mock Clerk instance
   */
  mockClerk,

  /**
   * Create an isolated wrapper with optional custom query client
   * Useful for testing components in isolation
   *
   * @param customQueryClient - Optional custom query client
   * @returns Wrapper component for testing
   */
  createIsolatedWrapper: (customQueryClient?: MockQueryClient) => {
    const queryClient = customQueryClient || testUtilsObject.createQueryClient();

    return function IsolatedWrapper({
      children,
    }: {
      children: React.ReactNode;
    }): React.ReactElement {
      return (
        <MockClerkProvider>
          <MockConvexProvider>
            <MockQueryClientProvider client={queryClient}>{children}</MockQueryClientProvider>
          </MockConvexProvider>
        </MockClerkProvider>
      );
    };
  },
};

// ================================
// EXPORTS
// ================================

// Re-export testing library utilities (excluding render to avoid conflicts)
export {
  act,
  cleanup,
  fireEvent,
  renderHook,
  screen,
  waitFor,
  waitForElementToBeRemoved,
  within,
} from "@testing-library/react";

// Export custom render that includes providers
export { customRender as render };

// Export wrapper utilities for hooks
export { createWrapper };

// Export mock instances
export { mockClerk, mockConvexClient };

// Export test utilities object
export { testUtilsObject as testUtils };

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
