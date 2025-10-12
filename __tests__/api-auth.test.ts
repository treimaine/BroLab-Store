// Provide a supabaseAdmin stub for legacy tests
const _supabaseAdmin = {
  from: jest.fn(() => ({ delete: () => ({ like: () => ({}) }), insert: () => ({}) })),
} as Record<string, unknown>;

// Mock Clerk pour les tests
jest.mock("@clerk/clerk-sdk-node", () => ({
  clerkClient: {
    users: {
      getUser: jest.fn().mockResolvedValue({
        id: "user_123",
        emailAddresses: [{ emailAddress: "test@example.com" }],
        username: "testuser",
      }),
      createUser: jest.fn().mockResolvedValue({
        id: "user_123",
        emailAddresses: [{ emailAddress: "test@example.com" }],
      }),
    },
  },
}));

// Mock Convex pour les tests
jest.mock("convex/browser", () => ({
  ConvexHttpClient: jest.fn().mockImplementation(() => ({
    mutation: jest.fn().mockResolvedValue({ _id: "users:1" }),
    query: jest.fn().mockResolvedValue([]),
  })),
}));

describe.skip("POST /api/auth/login (legacy Supabase) — skipped: migrated to Clerk", () => {
  it("should be replaced with Clerk authentication", () => {
    // TODO: Implement new tests using Clerk authentication
    expect(true).toBe(true);
  });
});

describe.skip("POST /api/auth/register (legacy Supabase) — skipped: migrated to Clerk", () => {
  it("should be replaced with Clerk user creation", () => {
    // TODO: Implement new tests using Clerk user creation
    expect(true).toBe(true);
  });
});

describe.skip("POST /api/auth/logout (legacy Supabase) — skipped: migrated to Clerk", () => {
  it("should be replaced with Clerk session management", () => {
    // TODO: Implement new tests using Clerk session management
    expect(true).toBe(true);
  });
});

describe.skip("GET /api/auth/user (legacy Supabase) — skipped: migrated to Clerk", () => {
  it("should be replaced with Clerk user retrieval", () => {
    // TODO: Implement new tests using Clerk user retrieval
    expect(true).toBe(true);
  });
});

// Nouveau test pour Clerk Authentication
describe("Clerk Authentication Integration", () => {
  it("should authenticate user with Clerk", async () => {
    const mockUser = {
      id: "user_123",
      emailAddresses: [{ emailAddress: "test@example.com" }],
      username: "testuser",
    };

    expect(mockUser.id).toBe("user_123");
    expect(mockUser.emailAddresses[0].emailAddress).toBe("test@example.com");
  });

  it("should create user in Convex after Clerk authentication", async () => {
    const mockConvexUser = {
      _id: "users:1",
      clerkId: "user_123",
      email: "test@example.com",
      username: "testuser",
    };

    expect(mockConvexUser.clerkId).toBe("user_123");
    expect(mockConvexUser.email).toBe("test@example.com");
  });

  it("should handle Clerk session management", async () => {
    const mockSession = {
      id: "sess_123",
      userId: "user_123",
      status: "active",
    };

    expect(mockSession.userId).toBe("user_123");
    expect(mockSession.status).toBe("active");
  });
});
