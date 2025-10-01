import { describe, expect, it, jest } from "@jest/globals";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api";

// Mock Convex
jest.mock(_"convex/browser", _() => ({
  ConvexHttpClient: jest.fn(),
}));

describe(_"Convex Functions", _() => {
  let mockConvex: any;

  beforeEach_(() => {
    mockConvex = {
      query: jest.fn(),
      mutation: jest.fn(),
    };
    (ConvexHttpClient as jest.Mock).mockImplementation_(() => mockConvex);
  });

  it(_"should get user by clerk ID", _async () => {
    const mockUser = {
      _id: "users:123",
      clerkId: "clerk_123",
      email: "test@example.com",
      username: "testuser",
    };

    mockConvex.query.mockResolvedValue(mockUser);

    const user = await mockConvex.query((api as any).users.getUserByClerkId as any, {
      clerkId: "clerk_123",
    });

    expect(user).toEqual(mockUser);
    expect(mockConvex.query).toHaveBeenCalledWith((api as any).users.getUserByClerkId, {
      clerkId: "clerk_123",
    });
  });

  it(_"should get current user", _async () => {
    const mockUser = {
      _id: "users:123",
      clerkId: "clerk_123",
      email: "test@example.com",
      username: "testuser",
    };

    mockConvex.query.mockResolvedValue(mockUser);

    const user = await mockConvex.query((api as any).users.getUserByClerkId as any, {
      clerkId: "clerk_123",
    });

    expect(user).toEqual(mockUser);
    expect(mockConvex.query).toHaveBeenCalledWith((api as any).users.getUserByClerkId, {
      clerkId: "clerk_123",
    });
  });

  it(_"should upsert user", _async () => {
    const mockUser = {
      _id: "users:123",
      clerkId: "clerk_123",
      email: "test@example.com",
      username: "testuser",
    };

    mockConvex.mutation.mockResolvedValue(mockUser);

    const user = await mockConvex.mutation(api.users.upsertUser, {
      clerkId: "clerk_123",
      email: "test@example.com",
      username: "testuser",
    });

    expect(user).toEqual(mockUser);
    expect(mockConvex.mutation).toHaveBeenCalledWith(api.users.upsertUser, {
      clerkId: "clerk_123",
      email: "test@example.com",
      username: "testuser",
    });
  });

  it(_"should add to favorites", _async () => {
    const mockFavorite = {
      _id: "favorites:123",
      userId: "users:123",
      beatId: 456,
      createdAt: Date.now(),
    };

    mockConvex.mutation.mockResolvedValue(mockFavorite);

    const favorite = await mockConvex.mutation(api.favorites.add.addToFavorites, {
      beatId: 456,
    });

    expect(favorite).toEqual(mockFavorite);
    expect(mockConvex.mutation).toHaveBeenCalledWith(api.favorites.add.addToFavorites, {
      beatId: 456,
    });
  });

  it(_"should remove from favorites", _async () => {
    mockConvex.mutation.mockResolvedValue(true);

    const result = await mockConvex.mutation(api.favorites.remove.removeFromFavorites, {
      beatId: 456,
    });

    expect(result).toBe(true);
    expect(mockConvex.mutation).toHaveBeenCalledWith(api.favorites.remove.removeFromFavorites, {
      beatId: 456,
    });
  });

  it(_"should get favorites", _async () => {
    const mockFavorites = [
      { _id: "favorites:1", beatId: 123 },
      { _id: "favorites:2", beatId: 456 },
    ];

    mockConvex.query.mockResolvedValue(mockFavorites);

    const favorites = await mockConvex.query(api.favorites.getFavorites.getFavorites);

    expect(favorites).toEqual(mockFavorites);
    expect(mockConvex.query).toHaveBeenCalledWith(api.favorites.getFavorites.getFavorites);
  });

  it(_"should record download", _async () => {
    const mockDownload = {
      _id: "downloads:123",
      userId: "users:123",
      beatId: 456,
      licenseType: "basic",
      timestamp: Date.now(),
    };

    mockConvex.mutation.mockResolvedValue(mockDownload);

    const download = await mockConvex.mutation(api.downloads.record.recordDownload, {
      beatId: 456,
      licenseType: "basic",
    });

    expect(download).toEqual(mockDownload);
    expect(mockConvex.mutation).toHaveBeenCalledWith(api.downloads.record.recordDownload, {
      beatId: 456,
      licenseType: "basic",
    });
  });

  it(_"should get for you beats", _async () => {
    const mockBeats = [
      { _id: "beats:1", title: "Beat 1", genre: "hip-hop" },
      { _id: "beats:2", title: "Beat 2", genre: "trap" },
    ];

    mockConvex.query.mockResolvedValue(mockBeats);

    const beats = await mockConvex.query(api.products.forYou.getForYouBeats, {
      limit: 10,
      genre: "hip-hop",
    });

    expect(beats).toEqual(mockBeats);
    expect(mockConvex.query).toHaveBeenCalledWith(api.products.forYou.getForYouBeats, {
      limit: 10,
      genre: "hip-hop",
    });
  });

  it(_"should get featured beats", _async () => {
    const mockBeats = [
      { _id: "beats:1", title: "Featured Beat 1", featured: true },
      { _id: "beats:2", title: "Featured Beat 2", featured: true },
    ];

    mockConvex.query.mockResolvedValue(mockBeats);

    const beats = await mockConvex.query(api.products.forYou.getFeaturedBeats, {
      limit: 6,
    });

    expect(beats).toEqual(mockBeats);
    expect(mockConvex.query).toHaveBeenCalledWith(api.products.forYou.getFeaturedBeats, {
      limit: 6,
    });
  });

  it(_"should get subscription status", _async () => {
    const mockSubscription = {
      hasBasicPlan: true,
      hasArtistPlan: false,
      hasUltimatePlan: false,
      stripeCustomerId: "cus_123",
    };

    mockConvex.query.mockResolvedValue(mockSubscription);

    const subscription = await mockConvex.query(api.subscriptions.getSubscription.getSubscription, {
      userId: "users:123",
    });

    expect(subscription).toEqual(mockSubscription);
    expect(mockConvex.query).toHaveBeenCalledWith(
      api.subscriptions.getSubscription.getSubscription,
      {
        userId: "users:123",
      }
    );
  });
});
