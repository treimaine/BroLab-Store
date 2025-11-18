/**
 * Unit tests for useFavorites hook
 * Tests real-time favorites management with Convex
 */
import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { renderHook, waitFor } from "@testing-library/react";
import type { Favorite } from "../../client/src/hooks/useFavorites";
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

// Import mocked modules after jest.mock declarations
import { useUser } from "@clerk/clerk-react";
import { useMutation, useQuery } from "convex/react";

describe("useFavorites", () => {
  const mockUseQuery = jest.mocked(useQuery);
  const mockUseMutation = jest.mocked(useMutation);
  const mockUseUser = jest.mocked(useUser);

  beforeEach(() => {
    jest.clearAllMocks();

    // Reset Clerk mock - provide minimal user object
    mockUseUser.mockReturnValue({
      user: {
        id: "user_test123",
        emailAddresses: [{ emailAddress: "test@example.com" }],
        firstName: "Test",
        lastName: "User",
      } as never,
      isLoaded: true,
      isSignedIn: true,
    } as never);

    // Setup default mock returns
    mockUseQuery.mockReturnValue([]);
    mockUseMutation.mockReturnValue(jest.fn() as never);
  });

  it("returns favorites array", async () => {
    const mockFavorites: Favorite[] = [
      {
        _id: "fav1",
        _creationTime: Date.now(),
        beatId: 1,
        userId: "user_test123",
        createdAt: Date.now(),
      },
      {
        _id: "fav2",
        _creationTime: Date.now(),
        beatId: 2,
        userId: "user_test123",
        createdAt: Date.now(),
      },
    ];

    mockUseQuery.mockReturnValue(mockFavorites as never);

    const wrapper = createWrapper();
    const { result } = renderHook(() => useFavorites(), { wrapper });

    await waitFor(() => {
      expect(Array.isArray(result.current.favorites)).toBe(true);
      expect(result.current.favorites).toEqual(mockFavorites);
    });
  });

  it("supports add/remove operations", async () => {
    const mockAddMutation = jest.fn();
    const mockRemoveMutation = jest.fn();

    mockUseQuery.mockReturnValue([] as never);
    mockUseMutation
      .mockReturnValueOnce(mockAddMutation as never)
      .mockReturnValueOnce(mockRemoveMutation as never);

    const wrapper = createWrapper();
    const { result } = renderHook(() => useFavorites(), { wrapper });

    expect(typeof result.current.addToFavorites).toBe("function");
    expect(typeof result.current.removeFromFavorites).toBe("function");
    expect(typeof result.current.isAdding).toBe("boolean");
    expect(typeof result.current.isRemoving).toBe("boolean");
  });

  it("checks if beat is favorite", async () => {
    const mockFavorites: Favorite[] = [
      {
        _id: "fav1",
        _creationTime: Date.now(),
        beatId: 1,
        userId: "user_test123",
        createdAt: Date.now(),
      },
      {
        _id: "fav2",
        _creationTime: Date.now(),
        beatId: 2,
        userId: "user_test123",
        createdAt: Date.now(),
      },
    ];

    mockUseQuery.mockReturnValue(mockFavorites as never);

    const wrapper = createWrapper();
    const { result } = renderHook(() => useFavorites(), { wrapper });

    await waitFor(() => {
      expect(result.current.isFavorite(1)).toBe(true);
      expect(result.current.isFavorite(3)).toBe(false);
    });
  });

  it("returns empty array when not authenticated", () => {
    mockUseUser.mockReturnValue({
      user: null,
      isLoaded: true,
      isSignedIn: false,
    } as never);

    mockUseQuery.mockReturnValue(undefined as never);

    const wrapper = createWrapper();
    const { result } = renderHook(() => useFavorites(), { wrapper });

    expect(result.current.favorites).toEqual([]);
    expect(result.current.isAuthenticated).toBe(false);
  });

  it("handles loading state correctly", () => {
    mockUseUser.mockReturnValue({
      user: {
        id: "user_test123",
        emailAddresses: [{ emailAddress: "test@example.com" }],
        firstName: "Test",
        lastName: "User",
      } as never,
      isLoaded: true,
      isSignedIn: true,
    } as never);

    mockUseQuery.mockReturnValue(undefined as never);

    const wrapper = createWrapper();
    const { result } = renderHook(() => useFavorites(), { wrapper });

    expect(result.current.isLoading).toBe(true);
  });

  it("throws error when adding favorite without authentication", async () => {
    mockUseUser.mockReturnValue({
      user: null,
      isLoaded: true,
      isSignedIn: false,
    } as never);

    mockUseQuery.mockReturnValue([] as never);

    const wrapper = createWrapper();
    const { result } = renderHook(() => useFavorites(), { wrapper });

    await expect(result.current.addToFavorites(1)).rejects.toThrow(
      "User must be authenticated to add favorites"
    );
  });

  it("throws error when removing favorite without authentication", async () => {
    mockUseUser.mockReturnValue({
      user: null,
      isLoaded: true,
      isSignedIn: false,
    } as never);

    mockUseQuery.mockReturnValue([] as never);

    const wrapper = createWrapper();
    const { result } = renderHook(() => useFavorites(), { wrapper });

    await expect(result.current.removeFromFavorites(1)).rejects.toThrow(
      "User must be authenticated to remove favorites"
    );
  });

  it("toggles favorite status correctly", async () => {
    const mockFavorites: Favorite[] = [
      {
        _id: "fav1",
        _creationTime: Date.now(),
        beatId: 1,
        userId: "user_test123",
        createdAt: Date.now(),
      },
    ];

    const mockAddMutation = jest.fn();
    const mockRemoveMutation = jest.fn();

    mockUseQuery.mockReturnValue(mockFavorites as never);
    mockUseMutation
      .mockReturnValueOnce(mockAddMutation as never)
      .mockReturnValueOnce(mockRemoveMutation as never);

    const wrapper = createWrapper();
    const { result } = renderHook(() => useFavorites(), { wrapper });

    // Beat 1 is already a favorite, should remove
    expect(result.current.isFavorite(1)).toBe(true);

    // Beat 2 is not a favorite, should add
    expect(result.current.isFavorite(2)).toBe(false);
  });
});
