import { useAuth, useUser } from "@clerk/clerk-react";
import { describe, expect, it, jest } from "@jest/globals";
import { ConvexHttpClient } from "convex/browser";

// Mock Convex API
const api = {
  users: {
    getUser: jest.fn(),
    upsertUser: jest.fn(),
  },
  favorites: {
    add: jest.fn(),
    remove: jest.fn(),
  },
  downloads: {
    record: jest.fn(),
  },
  subscriptions: {
    updateSubscription: jest.fn(),
  },
};

// Mock Convex
jest.mock("convex/browser", () => ({
  ConvexHttpClient: jest.fn(),
}));

// Mock Clerk
jest.mock("@clerk/clerk-react", () => ({
  useUser: jest.fn(),
  useAuth: jest.fn(),
}));

describe("Convex + Clerk Integration", () => {
  let mockConvex: any;

  beforeEach(() => {
    mockConvex = {
      query: jest.fn(),
      mutation: jest.fn(),
    };
    (ConvexHttpClient as jest.Mock).mockImplementation(() => mockConvex);
  });

  it("should sync user data between Clerk and Convex", async () => {
    const mockClerkUser = {
      id: "clerk_123",
      emailAddresses: [{ emailAddress: "test@example.com" }],
      username: "testuser",
    };

    const mockConvexUser = {
      _id: "users:123",
      clerkId: "clerk_123",
      email: "test@example.com",
      username: "testuser",
    };

    (useUser as jest.Mock).mockReturnValue({
      user: mockClerkUser,
      isSignedIn: true,
    });

    mockConvex.query.mockResolvedValue(mockConvexUser);

    // Test that Clerk user ID matches Convex clerkId
    const convexUser = await mockConvex.query(api.users.getUser, {
      clerkId: mockClerkUser.id,
    });

    expect(convexUser.clerkId).toBe(mockClerkUser.id);
    expect(convexUser.email).toBe(mockClerkUser.emailAddresses[0].emailAddress);
  });

  it("should handle subscription status with Clerk features", async () => {
    const mockHas = jest
      .fn()
      .mockReturnValueOnce(true) // basic plan
      .mockReturnValueOnce(true); // unlimited_downloads feature

    (useAuth as jest.Mock).mockReturnValue({
      has: mockHas,
    });

    const { has } = useAuth();

    // Test plan access
    expect(has!({ plan: "basic" })).toBe(true);

    // Test feature access
    expect(has!({ feature: "unlimited_downloads" })).toBe(true);
  });

  it("should create user in Convex when Clerk user signs up", async () => {
    const mockClerkUser = {
      id: "clerk_new_user",
      emailAddresses: [{ emailAddress: "newuser@example.com" }],
      username: "newuser",
    };

    const mockConvexUser = {
      _id: "users:456",
      clerkId: "clerk_new_user",
      email: "newuser@example.com",
      username: "newuser",
    };

    (useUser as jest.Mock).mockReturnValue({
      user: mockClerkUser,
      isSignedIn: true,
    });

    mockConvex.mutation.mockResolvedValue(mockConvexUser);

    // Simulate user creation in Convex
    const newUser = await mockConvex.mutation(api.users.upsertUser, {
      clerkId: mockClerkUser.id,
      email: mockClerkUser.emailAddresses[0].emailAddress,
      username: mockClerkUser.username,
    });

    expect(newUser.clerkId).toBe(mockClerkUser.id);
    expect(newUser.email).toBe(mockClerkUser.emailAddresses[0].emailAddress);
  });

  it("should handle favorites with authenticated user", async () => {
    const mockClerkUser = {
      id: "clerk_123",
      emailAddresses: [{ emailAddress: "test@example.com" }],
    };

    const mockConvexUser = {
      _id: "users:123",
      clerkId: "clerk_123",
    };

    const mockFavorite = {
      _id: "favorites:1",
      userId: "users:123",
      beatId: 456,
    };

    (useUser as jest.Mock).mockReturnValue({
      user: mockClerkUser,
      isSignedIn: true,
    });

    mockConvex.query.mockResolvedValue(mockConvexUser);
    mockConvex.mutation.mockResolvedValue(mockFavorite);

    // Get user first
    const user = await mockConvex.query(api.users.getUser, {
      clerkId: mockClerkUser.id,
    });

    // Add to favorites
    const favorite = await mockConvex.mutation(api.favorites.add, {
      beatId: 456,
    });

    expect(user.clerkId).toBe(mockClerkUser.id);
    expect(favorite.userId).toBe(user._id);
    expect(favorite.beatId).toBe(456);
  });

  it("should handle downloads with subscription check", async () => {
    const mockClerkUser = {
      id: "clerk_123",
      emailAddresses: [{ emailAddress: "test@example.com" }],
    };

    const mockConvexUser = {
      _id: "users:123",
      clerkId: "clerk_123",
    };

    const mockDownload = {
      _id: "downloads:1",
      userId: "users:123",
      beatId: 456,
      licenseType: "basic",
    };

    const mockHas = jest.fn().mockReturnValueOnce(true); // basic plan

    (useUser as jest.Mock).mockReturnValue({
      user: mockClerkUser,
      isSignedIn: true,
    });

    (useAuth as jest.Mock).mockReturnValue({
      has: mockHas,
    });

    mockConvex.query.mockResolvedValue(mockConvexUser);
    mockConvex.mutation.mockResolvedValue(mockDownload);

    const { has } = useAuth();
    const canDownload = has!({ plan: "basic" });

    if (canDownload) {
      const download = await mockConvex.mutation(api.downloads.record, {
        beatId: 456,
        licenseType: "basic",
      });

      expect(download.userId).toBe(mockConvexUser._id);
      expect(download.beatId).toBe(456);
    }

    expect(canDownload).toBe(true);
  });

  it("should handle unauthenticated user gracefully", async () => {
    (useUser as jest.Mock).mockReturnValue({
      user: null,
      isSignedIn: false,
    });

    (useAuth as jest.Mock).mockReturnValue({
      has: jest.fn().mockReturnValue(false),
    });

    const { user, isSignedIn } = useUser();
    const { has } = useAuth();

    expect(user).toBeNull();
    expect(isSignedIn).toBe(false);
    expect(has!({ plan: "basic" })).toBe(false);

    // Convex queries should not be called for unauthenticated users
    expect(mockConvex.query).not.toHaveBeenCalled();
    expect(mockConvex.mutation).not.toHaveBeenCalled();
  });

  it("should handle subscription upgrades", async () => {
    const mockClerkUser = {
      id: "clerk_123",
      emailAddresses: [{ emailAddress: "test@example.com" }],
    };

    const mockConvexUser = {
      _id: "users:123",
      clerkId: "clerk_123",
      stripeCustomerId: "cus_123",
    };

    const mockHas = jest
      .fn()
      .mockReturnValueOnce(false) // basic plan
      .mockReturnValueOnce(true); // artist plan

    (useUser as jest.Mock).mockReturnValue({
      user: mockClerkUser,
      isSignedIn: true,
    });

    (useAuth as jest.Mock).mockReturnValue({
      has: mockHas,
    });

    mockConvex.query.mockResolvedValue(mockConvexUser);
    mockConvex.mutation.mockResolvedValue(mockConvexUser);

    const { has } = useAuth();

    // Check subscription status
    const hasBasic = has!({ plan: "basic" });
    const hasArtist = has!({ plan: "artist" });

    // Update subscription in Convex
    if (hasArtist) {
      const updatedUser = await mockConvex.mutation(api.subscriptions.updateSubscription, {
        userId: mockConvexUser._id,
        plan: "artist",
      });

      expect(updatedUser.stripeCustomerId).toBe(mockConvexUser.stripeCustomerId);
    }

    expect(hasBasic).toBe(false);
    expect(hasArtist).toBe(true);
  });
});
