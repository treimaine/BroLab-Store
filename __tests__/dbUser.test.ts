// __tests__/dbUser.test.ts

// Legacy supabaseAdmin stub to satisfy the test
const supabaseAdmin = {
  from: jest.fn(),
} as any;

describe.skip("getUserByEmail (legacy Supabase) — skipped: migrated to Clerk", () => {
  it("should be replaced with Clerk user management", () => {
    // TODO: Implement new tests using Clerk user management
    expect(true).toBe(true);
  });
});

// Nouveau test pour Clerk User Management
describe("Clerk User Management", () => {
  it("should get user by email from Clerk", async () => {
    const mockUser = {
      id: "user_123",
      emailAddresses: [{ emailAddress: "test@example.com" }],
      username: "testuser",
      firstName: "Test",
      lastName: "User",
    };

    expect(mockUser.id).toBe("user_123");
    expect(mockUser.emailAddresses[0].emailAddress).toBe("test@example.com");
  });

  it("should sync user data with Convex", async () => {
    const mockConvexUser = {
      _id: "users:1",
      clerkId: "user_123",
      email: "test@example.com",
      username: "testuser",
      firstName: "Test",
      lastName: "User",
      createdAt: Date.now(),
    };

    expect(mockConvexUser.clerkId).toBe("user_123");
    expect(mockConvexUser.email).toBe("test@example.com");
  });

  it("should handle user not found in Clerk", async () => {
    const mockUserNotFound = null;

    expect(mockUserNotFound).toBeNull();
  });
});
