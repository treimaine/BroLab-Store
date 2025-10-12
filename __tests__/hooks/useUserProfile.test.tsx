import { describe, expect, it, jest } from "@jest/globals";
import { renderHook, waitFor } from "@testing-library/react";
import { useUserProfile } from "../../client/src/hooks/useUserProfile";
import { createWrapper } from "../test-utils";

// Mock the Convex API
jest.mock("@/lib/convex", () => ({
  api: {
    users: {
      getUserByClerkId: "users:getUserByClerkId",
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
}));

describe("useUserProfile", () => {
  const mockUseQuery = jest.mocked(require("convex/react").useQuery);
  const mockUseUser = jest.mocked(require("@clerk/clerk-react").useUser);

  beforeEach(() => {
    jest.clearAllMocks();

    // Reset Clerk mock
    mockUseUser.mockReturnValue({
      user: { id: "user_test123" },
      isLoaded: true,
      isSignedIn: true,
    });
  });

  it("returns user profile when user is signed in", async () => {
    const mockUserProfile = {
      _id: "users:1",
      clerkId: "user_test123",
      email: "test@example.com",
      firstName: "Test",
      lastName: "User",
    };

    mockUseQuery.mockReturnValue(mockUserProfile);

    const wrapper = createWrapper();
    const { result } = renderHook(() => useUserProfile(), { wrapper });

    await waitFor(() => {
      expect(result.current).toEqual(mockUserProfile);
      expect(result.current?._id).toBeDefined();
      expect(result.current?.clerkId).toBe("user_test123");
    });
  });

  it("returns undefined when user is not signed in", async () => {
    // Mock no user signed in
    mockUseUser.mockReturnValue({
      user: null,
      isLoaded: true,
      isSignedIn: false,
    });

    mockUseQuery.mockReturnValue(undefined);

    const wrapper = createWrapper();
    const { result } = renderHook(() => useUserProfile(), { wrapper });

    await waitFor(() => {
      expect(result.current).toBeUndefined();
    });
  });

  it("handles loading state", async () => {
    mockUseQuery.mockReturnValue(undefined);

    const wrapper = createWrapper();
    const { result } = renderHook(() => useUserProfile(), { wrapper });

    // Initially should be undefined (loading)
    expect(result.current).toBeUndefined();
  });
});
