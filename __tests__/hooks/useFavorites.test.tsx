import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { renderHook, waitFor } from "@testing-library/react";
import { useFavorites } from "../../client/src/hooks/useFavorites";
import { createWrapper } from "../test-utils";

// Mock the Convex API
jest.mock("@convex/_generated/api", () => ({
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
  useUser: jest.fn(() => ({
    user: { id: "user_test123" },
    isLoaded: true,
    isSignedIn: true,
  })),
}));

// Mock Convex React hooks
jest.mock("convex/react", () => ({
  useQuery: jest.fn(),
  useMutation: jest.fn(),
}));

// Mock TanStack Query
jest.mock("@tanstack/react-query", () => ({
  ...jest.requireActual("@tanstack/react-query"),
  useMutation: jest.fn(),
  useQueryClient: jest.fn(() => ({
    invalidateQueries: jest.fn(),
  })),
}));

describe("useFavorites", () => {
  const mockUseQuery = jest.mocked(require("convex/react").useQuery);
  const mockUseMutation = jest.mocked(require("convex/react").useMutation);
  const mockUseUser = jest.mocked(require("@clerk/clerk-react").useUser);
  const mockTanStackMutation = jest.mocked(require("@tanstack/react-query").useMutation);

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
    } as unknown);
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
