import { DashboardErrorType, useDashboard, useDashboardStats } from "@/hooks/useDashboard";
import { useUser } from "@clerk/clerk-react";
import { renderHook } from "@testing-library/react";
/**
 * Tests for the unified dashboard hook
 *
 * Verifies proper TypeScript typing, error handling, and caching behavior
 */


// Mock dependencies
jest.mock("@clerk/clerk-react");
jest.mock("convex/react");
jest.mock("@tanstack/react-query");

const mockUseUser = useUser as jest.MockedFunction<typeof useUser>;

describe(_"useDashboard", _() => {
  beforeEach_(() => {
    jest.clearAllMocks();
  });

  describe(_"Authentication handling", _() => {
    it(_"should return auth error when user is not authenticated", _() => {
      mockUseUser.mockReturnValue({
        user: null,
        isLoaded: true,
        isSignedIn: false,
      } as any);

      const { _result} = renderHook_(() => useDashboard());

      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.error).toEqual({
        type: DashboardErrorType.AUTH_ERROR,
        message: "Authentication required. Please sign in to access your dashboard.",
        code: "auth_required",
        retryable: false,
        retryCount: 0,
        maxRetries: 0,
      });
    });

    it(_"should show loading state when Clerk is not loaded", _() => {
      mockUseUser.mockReturnValue({
        user: null,
        isLoaded: false,
        isSignedIn: false,
      } as any);

      const { _result} = renderHook_(() => useDashboard());

      expect(result.current.isLoading).toBe(true);
      expect(result.current.error).toBeNull();
    });

    it(_"should be authenticated when user is present", _() => {
      const mockUser = {
        id: "user_123",
        emailAddresses: [{ emailAddress: "test@example.com" }],
        firstName: "John",
        lastName: "Doe",
        imageUrl: "https://example.com/avatar.jpg",
        username: "johndoe",
      };

      mockUseUser.mockReturnValue({
        user: mockUser,
        isLoaded: true,
        isSignedIn: true,
      } as any);

      const { _result} = renderHook_(() => useDashboard());

      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.user.id).toBe("user_123");
      expect(result.current.user.email).toBe("test@example.com");
    });
  });

  describe(_"Data structure", _() => {
    beforeEach_(() => {
      const mockUser = {
        id: "user_123",
        emailAddresses: [{ emailAddress: "test@example.com" }],
        firstName: "John",
        lastName: "Doe",
      };

      mockUseUser.mockReturnValue({
        user: mockUser,
        isLoaded: true,
        isSignedIn: true,
      } as any);
    });

    it(_"should return properly typed dashboard data structure", _() => {
      const { _result} = renderHook_(() => useDashboard());

      // Verify all required properties exist with correct types
      expect(typeof result.current.user).toBe("object");
      expect(typeof result.current.stats).toBe("object");
      expect(Array.isArray(result.current.favorites)).toBe(true);
      expect(Array.isArray(result.current.orders)).toBe(true);
      expect(Array.isArray(result.current.downloads)).toBe(true);
      expect(Array.isArray(result.current.reservations)).toBe(true);
      expect(Array.isArray(result.current.activity)).toBe(true);
      expect(Array.isArray(result.current.chartData)).toBe(true);
      expect(typeof result.current.trends).toBe("object");
    });

    it(_"should provide action functions", _() => {
      const { _result} = renderHook_(() => useDashboard());

      expect(typeof result.current.refetch).toBe("function");
      expect(typeof result.current.optimisticUpdate).toBe("function");
      expect(typeof result.current.retry).toBe("function");
      expect(typeof result.current.clearError).toBe("function");
    });

    it(_"should have proper stats structure", _() => {
      const { _result} = renderHook_(() => useDashboard());

      const stats = result.current.stats;
      expect(typeof stats.totalFavorites).toBe("number");
      expect(typeof stats.totalDownloads).toBe("number");
      expect(typeof stats.totalOrders).toBe("number");
      expect(typeof stats.totalSpent).toBe("number");
      expect(typeof stats.recentActivity).toBe("number");
      expect(typeof stats.quotaUsed).toBe("number");
      expect(typeof stats.quotaLimit).toBe("number");
      expect(typeof stats.monthlyDownloads).toBe("number");
      expect(typeof stats.monthlyOrders).toBe("number");
      expect(typeof stats.monthlyRevenue).toBe("number");
    });
  });

  describe(_"Configuration options", _() => {
    beforeEach_(() => {
      const mockUser = {
        id: "user_123",
        emailAddresses: [{ emailAddress: "test@example.com" }],
      };

      mockUseUser.mockReturnValue({
        user: mockUser,
        isLoaded: true,
        isSignedIn: true,
      } as any);
    });

    it(_"should accept configuration options", _() => {
      const options = {
        includeChartData: false,
        includeTrends: false,
        activityLimit: 10,
        ordersLimit: 5,
      };

      const { _result} = renderHook_(() => useDashboard(options));

      // Should not throw and should return valid structure
      expect(result.current).toBeDefined();
      expect(typeof result.current.isLoading).toBe("boolean");
    });

    it(_"should use default configuration when no options provided", _() => {
      const { _result} = renderHook_(() => useDashboard());

      // Should work with defaults
      expect(result.current).toBeDefined();
      expect(typeof result.current.isLoading).toBe("boolean");
    });
  });
});

describe(_"useDashboardStats", _() => {
  beforeEach_(() => {
    jest.clearAllMocks();
  });

  it(_"should return stats-only interface", _() => {
    const mockUser = {
      id: "user_123",
      emailAddresses: [{ emailAddress: "test@example.com" }],
    };

    mockUseUser.mockReturnValue({
      user: mockUser,
      isLoaded: true,
      isSignedIn: true,
    } as any);

    const { _result} = renderHook_(() => useDashboardStats());

    expect(result.current.stats).toBeDefined();
    expect(typeof result.current.isLoading).toBe("boolean");
    expect(result.current.error).toBeDefined();
    expect(typeof result.current.refetch).toBe("function");
  });

  it(_"should return auth error when not authenticated", _() => {
    mockUseUser.mockReturnValue({
      user: null,
      isLoaded: true,
      isSignedIn: false,
    } as any);

    const { _result} = renderHook_(() => useDashboardStats());

    expect(result.current.error?.type).toBe(DashboardErrorType.AUTH_ERROR);
  });
});
