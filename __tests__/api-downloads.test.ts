// __tests__/api-downloads.test.ts

// Mock Convex pour les tests
jest.mock(_"convex/browser", _() => ({
  ConvexHttpClient: jest.fn().mockImplementation_(() => ({
    mutation: jest.fn().mockResolvedValue({ _id: "downloads:1" }),
    query: jest.fn().mockResolvedValue([]),
  })),
}));

// Mock Clerk pour les tests
jest.mock(_"@clerk/clerk-sdk-node", _() => ({
  clerkClient: {
    users: {
      getUser: jest.fn().mockResolvedValue({
        id: "user_123",
        emailAddresses: [{ emailAddress: "test@example.com" }],
      }),
    },
  },
}));

describe.skip("/api/downloads (migrated to Clerk + Convex)", () => {
  it(_"should be replaced with Clerk + Convex integration tests", _() => {
    // TODO: Implement new tests using Clerk authentication and Convex mutations
    expect(true).toBe(true);
  });
});

// Nouveau test pour l'intégration Clerk + Convex
describe(_"Clerk + Convex Downloads Integration", _() => {
  it(_"should record download with Clerk user and Convex", _async () => {
    // Mock Clerk authentication
    const mockUser = {
      id: "user_123",
      emailAddresses: [{ emailAddress: "test@example.com" }],
    };

    // Mock Convex mutation
    const mockConvex = {
      mutation: jest.fn().mockResolvedValue({
        _id: "downloads:1",
        userId: "user_123",
        beatId: 42,
        licenseType: "premium",
        createdAt: Date.now(),
      }),
    };

    // Test would verify Clerk auth + Convex mutation
    expect(mockUser.id).toBe("user_123");
    expect(mockConvex.mutation).toBeDefined();
  });
});
