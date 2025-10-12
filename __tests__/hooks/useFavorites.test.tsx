import * as clerkReact from "@clerk/clerk-react";
import { describe, expect, it, jest } from "@jest/globals";
import * as tanstackQuery from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import * as convexReact from "convex/react";
import { useFavorites } from "../../client/src/hooks/useFavorites";
import { createWrapper } from "../test-utils";

// Mock the Convex API
jest.mock("../../client/src/lib/convex-api", () => ({
  api: {
    favorites: {
      getFavorites: {
        getFavorites: "favorites:getFavorites",
        getFavoritesWithBeats: "favorites:getFavoritesWithBeats",
      },
      add: {
        addToFavorites: "favorites:addToFavorites",
      },
      remove: {
        removeFromFavorites: "favorites:removeFromFavorites",
      },
    },
  },
}));

// Mock Clerk
jest.mock("@clerk/clerk-react", () => ({
  useUser: jest.fn(),
}));

// Mock Convex React hooks
jest.mock("convex/react", () => ({
  useQuery: jest.fn(),
  useMutation: jest.fn(),
}));

// Mock TanStack Query
jest.mock("@tanstack/react-query", () => ({
  useMutation: jest.fn(),
  useQueryClient: jest.fn(),
}));

describe("useFavorites", () => {
  const mockUseQuery = jest.mocked(convexReact.useQuery);
  const mockUseMutation = jest.mocked(convexReact.useMutation);
  const mockUseUser = jest.mocked(clerkReact.useUser);
  const mockTanStackMutation = jest.mocked(tanstackQuery.useMutation);
  const mockUseQueryClient = jest.mocked(tanstackQuery.useQueryClient);

  beforeAll(() => {
    // Setup default mock implementations
    mockUseQueryClient.mockReturnValue({
      invalidateQueries: jest.fn(),
    } as unknown);
  });

  beforeEach(() => {
    jest.clearAllMocks();

    // Reset Clerk mock
    mockUseUser.mockReturnValue({
      user: { id: "user_test123" },
      isLoaded: true,
      isSignedIn: true,
    });

    // Setup default mock returns
    mockUseQuery.mockReturnValue([]);
    mockUseMutation.mockReturnValue(jest.fn().mockResolvedValue(undefined));
    mockTanStackMutation.mockReturnValue({
      mutate: jest.fn(),
      isPending: false,
      mutateAsync: jest.fn(),
      reset: jest.fn(),
      isError: false,
      isIdle: true,
      isSuccess: false,
      data: undefined,
      error: null,
      failureCount: 0,
      failureReason: null,
      isLoading: false,
      isPaused: false,
      status: "idle" as const,
      variables: undefined,
      submittedAt: 0,
    });
  });

  it("returns favorites array", async () => {
    const mockFavorites = [
      { _id: "fav1", beatId: 1, userId: "user_test123" },
      { _id: "fav2", beatId: 2, userId: "user_test123" },
    ];

    mockUseQuery.mockReturnValue(mockFavorites);

    const wrapper = createWrapper();
    const { result } = renderHook(() => useFavorites(), { wrapper });

    await waitFor(() => {
      expect(Array.isArray(result.current.favorites)).toBe(true);
      expect(result.current.favorites).toEqual(mockFavorites);
    });
  });

  it("supports add/remove operations", async () => {
    const mockAddMutation = jest.fn().mockResolvedValue(undefined);
    const mockRemoveMutation = jest.fn().mockResolvedValue(undefined);

    mockUseQuery.mockReturnValue([]);
    mockUseMutation.mockReturnValueOnce(mockAddMutation).mockReturnValueOnce(mockRemoveMutation);

    const wrapper = createWrapper();
    const { result } = renderHook(() => useFavorites(), { wrapper });

    expect(typeof result.current.addToFavorites).toBe("function");
    expect(typeof result.current.removeFromFavorites).toBe("function");
    expect(typeof result.current.isAdding).toBe("boolean");
    expect(typeof result.current.isRemoving).toBe("boolean");
  });

  it("checks if beat is favorite", async () => {
    const mockFavorites = [
      { _id: "fav1", beatId: 1, userId: "user_test123" },
      { _id: "fav2", beatId: 2, userId: "user_test123" },
    ];

    mockUseQuery.mockReturnValue(mockFavorites);

    const wrapper = createWrapper();
    const { result } = renderHook(() => useFavorites(), { wrapper });

    await waitFor(() => {
      expect(result.current.isFavorite(1)).toBe(true);
      expect(result.current.isFavorite(3)).toBe(false);
    });
  });
});
