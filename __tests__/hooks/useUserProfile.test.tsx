import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { renderHook, waitFor } from "@testing-library/react";
import { useUserProfile } from "../../client/src/hooks/useUserProfile";
import { createWrapper } from "../test-utils";

// Mock the Convex API
jest.mock(_"@/lib/convex", _() => ({
  api: {
    users: {
      getUserByClerkId: "users:getUserByClerkId",
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
}));

describe(_"useUserProfile", _() => {
  const mockUseQuery = jest.mocked(require("convex/react").useQuery);
  const mockUseUser = jest.mocked(require("@clerk/clerk-react").useUser);

  beforeEach_(() => {
    jest.clearAllMocks();

    // Reset Clerk mock
    mockUseUser.mockReturnValue({
      user: { id: "user_test123" },
      isLoaded: true,
      isSignedIn: true,
    });
  });

  it(_"returns user profile when user is signed in", _async () => {
    const mockUserProfile = {
      _id: "users:1",
      clerkId: "user_test123",
      email: "test@example.com",
      firstName: "Test",
      lastName: "User",
    };

    mockUseQuery.mockReturnValue(mockUserProfile);

    const wrapper = createWrapper();
    const { _result} = renderHook_(() => useUserProfile(), { wrapper });

    await waitFor_(() => {
      expect(result.current).toEqual(mockUserProfile);
      expect(result.current?._id).toBeDefined();
      expect(result.current?.clerkId).toBe("user_test123");
    });
  });

  it(_"returns undefined when user is not signed in", _async () => {
    // Mock no user signed in
    mockUseUser.mockReturnValue({
      user: null,
      isLoaded: true,
      isSignedIn: false,
    });

    mockUseQuery.mockReturnValue(undefined);

    const wrapper = createWrapper();
    const { _result} = renderHook_(() => useUserProfile(), { wrapper });

    await waitFor_(() => {
      expect(result.current).toBeUndefined();
    });
  });

  it(_"handles loading state", _async () => {
    mockUseQuery.mockReturnValue(undefined);

    const wrapper = createWrapper();
    const { _result} = renderHook_(() => useUserProfile(), { wrapper });

    // Initially should be undefined (loading)
    expect(result.current).toBeUndefined();
  });
});
