import { useAuthErrorHandler } from "@/hooks/useAuthErrorHandler";
import { act, renderHook } from "@testing-library/react";

// Mock the toast hook
jest.mock("@/hooks/use-toast", () => ({
  useToast: () => ({
    toast: jest.fn(),
  }),
}));

describe("useAuthErrorHandler", () => {
  beforeEach(() => {
    // Clear console.error mock
    jest.clearAllMocks();
    console.error = jest.fn();
  });

  it("initializes with correct default state", () => {
    const { result } = renderHook(() => useAuthErrorHandler());

    expect(result.current.hasAuthError).toBe(false);
    expect(result.current.authErrorMessage).toBe(null);
    expect(result.current.isAuthLoading).toBe(false);
  });

  it("handles authentication errors correctly", () => {
    const { result } = renderHook(() => useAuthErrorHandler());

    act(() => {
      const authError = new Error("Authentication failed");
      result.current.handleAuthError(authError, "test-context");
    });

    expect(result.current.hasAuthError).toBe(true);
    expect(result.current.authErrorMessage).toContain("Authentication is required");
    expect(result.current.isAuthLoading).toBe(false);
  });

  it("identifies authentication errors correctly", () => {
    const { result } = renderHook(() => useAuthErrorHandler());

    act(() => {
      const authError = new Error("Clerk authentication failed");
      const errorType = result.current.handleApiError(authError, "test");
      expect(errorType).toBe("authentication");
    });

    expect(result.current.hasAuthError).toBe(true);
  });

  it("identifies network errors correctly", () => {
    const { result } = renderHook(() => useAuthErrorHandler());

    act(() => {
      const networkError = new Error("Network request failed");
      const errorType = result.current.handleApiError(networkError, "test");
      expect(errorType).toBe("network");
    });

    expect(result.current.hasAuthError).toBe(false);
  });

  it("handles generic API errors", () => {
    const { result } = renderHook(() => useAuthErrorHandler());

    act(() => {
      const apiError = new Error("Server error");
      const errorType = result.current.handleApiError(apiError, "test");
      expect(errorType).toBe("api");
    });

    expect(result.current.hasAuthError).toBe(false);
  });

  it("clears auth errors", () => {
    const { result } = renderHook(() => useAuthErrorHandler());

    // First set an error
    act(() => {
      const authError = new Error("Authentication failed");
      result.current.handleAuthError(authError);
    });

    expect(result.current.hasAuthError).toBe(true);

    // Then clear it
    act(() => {
      result.current.clearAuthError();
    });

    expect(result.current.hasAuthError).toBe(false);
    expect(result.current.authErrorMessage).toBe(null);
  });

  it("handles loading states", () => {
    const { result } = renderHook(() => useAuthErrorHandler());

    act(() => {
      result.current.setAuthLoading(true);
    });

    expect(result.current.isAuthLoading).toBe(true);

    act(() => {
      result.current.setAuthLoading(false);
    });

    expect(result.current.isAuthLoading).toBe(false);
  });

  it("withAuthErrorHandling returns null for auth errors", async () => {
    const { result } = renderHook(() => useAuthErrorHandler());

    const operation = jest.fn().mockRejectedValue(new Error("Authentication failed"));

    let operationResult;
    await act(async () => {
      operationResult = await result.current.withAuthErrorHandling(operation, "test");
    });

    expect(operationResult).toBe(null);
    expect(result.current.hasAuthError).toBe(true);
  });

  it("withAuthErrorHandling re-throws non-auth errors", async () => {
    const { result } = renderHook(() => useAuthErrorHandler());

    const operation = jest.fn().mockRejectedValue(new Error("Server error"));

    await act(async () => {
      try {
        await result.current.withAuthErrorHandling(operation, "test");
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toBe("Server error");
      }
    });
  });

  it("withAuthErrorHandling returns result on success", async () => {
    const { result } = renderHook(() => useAuthErrorHandler());

    const expectedResult = { data: "success" };
    const operation = jest.fn().mockResolvedValue(expectedResult);

    let operationResult;
    await act(async () => {
      operationResult = await result.current.withAuthErrorHandling(operation, "test");
    });

    expect(operationResult).toEqual(expectedResult);
    expect(result.current.hasAuthError).toBe(false);
  });

  it("logs errors when logErrors is enabled", () => {
    const { result } = renderHook(() => useAuthErrorHandler({ logErrors: true }));

    act(() => {
      const error = new Error("Test error");
      result.current.handleAuthError(error, "test-context");
    });

    expect(console.error).toHaveBeenCalledWith(
      expect.stringContaining("Authentication error in test-context"),
      expect.objectContaining({
        error: "Test error",
        context: "test-context",
        page: "mixing-mastering",
      })
    );
  });

  it("calls custom onAuthError callback", () => {
    const onAuthError = jest.fn();
    const { result } = renderHook(() => useAuthErrorHandler({ onAuthError }));

    const error = new Error("Auth error");
    act(() => {
      result.current.handleAuthError(error);
    });

    expect(onAuthError).toHaveBeenCalledWith(error);
  });
});
