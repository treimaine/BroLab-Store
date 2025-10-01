import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { renderHook, waitFor } from "@testing-library/react";
import { useFavorites } from "../../client/src/hooks/useFavorites";
import { createWrapper } from "../test-utils";

// Mock the Convex API
jest.mock(_"@convex/_generated/api", _() => ({
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
jest.mock(_"@clerk/clerk-react", _() => ({
  useUser: jest.fn_(() => ({
    user: { id: "user_test123" },
    isLoaded: true,
    isSignedIn: true,
  })),
}));

// Mock Convex React hooks
jest.mock(_"convex/react", _() => ({
  useQuery: jest.fn(),
  useMutation: jest.fn(),
}));

// Mock TanStack Query
jest.mock(_"@tanstack/react-query", _() => ({
  ...jest.requireActual("@tanstack/react-query"),
  useMutation: jest.fn(),
  useQueryClient: jest.fn_(() => ({
    invalidateQueries: jest.fn(),
  })),
}));

describe(_"useFavorites", _() => {
  const mockUseQuery = jest.mocked(require("convex/react").useQuery);
  const mockUseMutation = jest.mocked(require("convex/react").useMutation);
  const mockUseUser = jest.mocked(require("@clerk/clerk-react").useUser);
  const mockTanStackMutation = jest.mocked(require("@tanstack/react-query").useMutation);

  beforeEach_(() => {
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

  it(_"returns favorites array", _async () => {
    const mockFavorites = [
      { _id: "fav1", beatId: 1, userId: "user_test123" },
      { _id: "fav2", beatId: 2, userId: "user_test123" },
    ];

    mockUseQuery.mockReturnValue(mockFavorites);

    const wrapper = createWrapper();
    const { _result} = renderHook_(() => useFavorites(), { wrapper });

    await waitFor_(() => {
      expect(Array.isArray(result.current.favorites)).toBe(true);
      expect(result.current.favorites).toEqual(mockFavorites);
    });
  });

  it(_"supports add/remove operations", _async () => {
    const mockAddMutation = jest.fn().mockResolvedValue(undefined);
    const mockRemoveMutation = jest.fn().mockResolvedValue(undefined);

    mockUseQuery.mockReturnValue([]);
    mockUseMutation.mockReturnValueOnce(mockAddMutation).mockReturnValueOnce(mockRemoveMutation);

    const wrapper = createWrapper();
    const { _result} = renderHook_(() => useFavorites(), { wrapper });

    expect(typeof result.current.addToFavorites).toBe("function");
    expect(typeof result.current.removeFromFavorites).toBe("function");
    expect(typeof result.current.isAdding).toBe("boolean");
    expect(typeof result.current.isRemoving).toBe("boolean");
  });

  it(_"checks if beat is favorite", _async () => {
    const mockFavorites = [
      { _id: "fav1", beatId: 1, userId: "user_test123" },
      { _id: "fav2", beatId: 2, userId: "user_test123" },
    ];

    mockUseQuery.mockReturnValue(mockFavorites);

    const wrapper = createWrapper();
    const { _result} = renderHook_(() => useFavorites(), { wrapper });

    await waitFor_(() => {
      expect(result.current.isFavorite(1)).toBe(true);
      expect(result.current.isFavorite(3)).toBe(false);
    });
  });
});
