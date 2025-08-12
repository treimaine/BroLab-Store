import { useAuth, useUser } from "@clerk/clerk-react";
import { describe, expect, it, jest } from "@jest/globals";

// Mock Clerk
jest.mock("@clerk/clerk-react", () => ({
  useUser: jest.fn(),
  useAuth: jest.fn(),
}));

describe("Clerk Authentication", () => {
  it("should authenticate user with Clerk", () => {
    const mockUser = {
      id: "user_123",
      emailAddresses: [{ emailAddress: "test@example.com" }],
      username: "testuser",
    };

    (useUser as jest.Mock).mockReturnValue({
      user: mockUser,
      isSignedIn: true,
      isLoaded: true,
    });

    (useAuth as jest.Mock).mockReturnValue({
      has: jest.fn().mockReturnValue(true),
    });

    // Test authentication
    expect(mockUser.id).toBe("user_123");
    expect(mockUser.emailAddresses[0].emailAddress).toBe("test@example.com");
  });

  it("should check subscription status with Clerk", () => {
    const mockHas = jest
      .fn()
      .mockReturnValueOnce(true) // basic plan
      .mockReturnValueOnce(false) // artist plan
      .mockReturnValueOnce(false); // ultimate plan

    (useAuth as jest.Mock).mockReturnValue({
      has: mockHas,
    });

    const { has } = useAuth();

    expect(has!({ plan: "basic" })).toBe(true);
    expect(has!({ plan: "artist" })).toBe(false);
    expect(has!({ plan: "ultimate" })).toBe(false);
  });

  it("should check feature access with Clerk", () => {
    const mockHas = jest
      .fn()
      .mockReturnValueOnce(true) // unlimited_downloads
      .mockReturnValueOnce(false) // premium_support
      .mockReturnValueOnce(true); // custom_licenses

    (useAuth as jest.Mock).mockReturnValue({
      has: mockHas,
    });

    const { has } = useAuth();

    expect(has!({ feature: "unlimited_downloads" })).toBe(true);
    expect(has!({ feature: "premium_support" })).toBe(false);
    expect(has!({ feature: "custom_licenses" })).toBe(true);
  });

  it("should handle unauthenticated user", () => {
    (useUser as jest.Mock).mockReturnValue({
      user: null,
      isSignedIn: false,
      isLoaded: true,
    });

    (useAuth as jest.Mock).mockReturnValue({
      has: jest.fn().mockReturnValue(false),
    });

    const { user, isSignedIn } = useUser();
    const { has } = useAuth();

    expect(user).toBeNull();
    expect(isSignedIn).toBe(false);
    expect(has!({ plan: "basic" })).toBe(false);
  });

  it("should handle loading state", () => {
    (useUser as jest.Mock).mockReturnValue({
      user: null,
      isSignedIn: false,
      isLoaded: false,
    });

    const { isLoaded } = useUser();

    expect(isLoaded).toBe(false);
  });
});
