/**
 * Tests for ConvexUser to User type conversions
 */

import { Id } from "../../convex/_generated/dataModel";
import type { User } from "../../shared/schema";
import {
  ConvexUser,
  convexUserToUser,
  createConvexUserId,
  ensureSharedUser,
  isConvexUser,
  isSharedUser,
  userToConvexUserInput,
} from "../../shared/types/ConvexUser";

describe("ConvexUser Type Conversions", () => {
  const mockConvexUser: ConvexUser = {
    _id: "users:12345678" as Id<"users">,
    clerkId: "clerk_123456789",
    email: "test@example.com",
    username: "testuser",
    firstName: "Test",
    lastName: "User",
    imageUrl: "https://example.com/avatar.jpg",
    createdAt: 1640995200000, // 2022-01-01
    updatedAt: 1640995200000,
  };

  const mockSharedUser: User = {
    id: 12345678,
    username: "testuser",
    email: "test@example.com",
    password: "",
    created_at: "2022-01-01T00:00:00.000Z",
    avatar: "https://example.com/avatar.jpg",
    subscription: null,
    memberSince: "2022-01-01T00:00:00.000Z",
    stripeCustomerId: null,
    stripe_customer_id: null,
    downloads_used: 0,
    quota: 3,
  };

  describe("convexUserToUser", () => {
    it("should convert ConvexUser to User correctly", () => {
      const result = convexUserToUser(mockConvexUser);

      expect(result).toMatchObject({
        username: "testuser",
        email: "test@example.com",
        password: "",
        avatar: "https://example.com/avatar.jpg",
        subscription: null,
        stripeCustomerId: null,
        stripe_customer_id: null,
        downloads_used: 0,
        quota: 3,
      });

      expect(typeof result.id).toBe("number");
      expect(result.created_at).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
      expect(result.memberSince).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    });

    it("should handle missing optional fields", () => {
      const minimalConvexUser: ConvexUser = {
        _id: "users:87654321" as Id<"users">,
        clerkId: "clerk_987654321",
        email: "minimal@example.com",
        createdAt: 1640995200000,
        updatedAt: 1640995200000,
      };

      const result = convexUserToUser(minimalConvexUser);

      expect(result.username).toBe("minimal");
      expect(result.avatar).toBeNull();
    });
  });

  describe("userToConvexUserInput", () => {
    it("should convert User to ConvexUserInput correctly", () => {
      const userWithClerkId = { ...mockSharedUser, clerkId: "clerk_123456789" };
      const result = userToConvexUserInput(userWithClerkId);

      expect(result).toEqual({
        clerkId: "clerk_123456789",
        email: "test@example.com",
        username: "testuser",
        firstName: undefined,
        lastName: undefined,
        imageUrl: "https://example.com/avatar.jpg",
      });
    });

    it("should handle missing avatar", () => {
      const userWithoutAvatar = {
        ...mockSharedUser,
        clerkId: "clerk_123456789",
        avatar: null,
      };
      const result = userToConvexUserInput(userWithoutAvatar);

      expect(result.imageUrl).toBeUndefined();
    });
  });

  describe("createConvexUserId", () => {
    it("should create a valid Convex ID from numeric ID", () => {
      const result = createConvexUserId(12345678);
      expect(result).toBe("users:12345678");
    });

    it("should pad smaller numbers", () => {
      const result = createConvexUserId(123);
      expect(result).toBe("users:00000123");
    });
  });

  describe("Type Guards", () => {
    it("should correctly identify ConvexUser", () => {
      expect(isConvexUser(mockConvexUser)).toBe(true);
      expect(isConvexUser(mockSharedUser)).toBe(false);
      expect(isConvexUser(null)).toBe(false);
      expect(isConvexUser({})).toBe(false);
    });

    it("should correctly identify shared User", () => {
      expect(isSharedUser(mockSharedUser)).toBe(true);
      expect(isSharedUser(mockConvexUser)).toBe(false);
      expect(isSharedUser(null)).toBe(false);
      expect(isSharedUser({})).toBe(false);
    });
  });

  describe("ensureSharedUser", () => {
    it("should convert ConvexUser to User", () => {
      const result = ensureSharedUser(mockConvexUser);
      expect(result).not.toBeNull();
      expect(result?.username).toBe("testuser");
    });

    it("should return User as-is", () => {
      const result = ensureSharedUser(mockSharedUser);
      expect(result).toBe(mockSharedUser);
    });

    it("should return null for invalid input", () => {
      expect(ensureSharedUser(null)).toBeNull();
      expect(ensureSharedUser({})).toBeNull();
      expect(ensureSharedUser("invalid")).toBeNull();
    });
  });
});
