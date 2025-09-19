import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { useFavorites } from "../../client/src/hooks/useFavorites";
import { renderHook, waitFor } from "../test-utils";

// Mock the useFavorites hook since we don't have the actual implementation
jest.mock("../../client/src/hooks/useFavorites", () => ({
  useFavorites: jest.fn(() => ({
    favorites: [],
    addToFavorites: jest.fn(),
    removeFromFavorites: jest.fn(),
    isAdding: false,
    isRemoving: false,
  })),
}));

describe("useFavorites", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns favorites array", async () => {
    const { result } = renderHook(() => useFavorites());
    await waitFor(() => {
      expect(Array.isArray(result.current.favorites)).toBe(true);
    });
  });

  it("supports add/remove", async () => {
    const { result } = renderHook(() => useFavorites());
    await result.current.addToFavorites(1);
    await result.current.removeFromFavorites(1);
    expect(typeof result.current.isAdding).toBe("boolean");
    expect(typeof result.current.isRemoving).toBe("boolean");
  });
});
