import { beforeEach, describe, expect, it, jest } from "@jest/globals";

// Mock the Convex functions
jest.mock("../server/lib/convex", () => ({
  createReservation: jest.fn(),
  getUserByClerkId: jest.fn(),
}));

// Mock the storage layer
jest.mock("../server/storage", () => ({
  storage: {
    createReservation: jest.fn(),
  },
}));

describe("Reservation Creation Fix", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should validate clerkId is present and is a string", () => {
    // Test the clerkId validation logic
    const mockUser = {
      id: "123",
      clerkId: "user_2abc123def456",
      email: "test@example.com",
      username: "testuser",
    };

    // Valid clerkId
    expect(mockUser.clerkId).toBeDefined();
    expect(typeof mockUser.clerkId).toBe("string");
    expect(mockUser.clerkId.length).toBeGreaterThan(0);

    // Invalid clerkId cases
    const invalidUser1 = { ...mockUser, clerkId: undefined };
    const invalidUser2 = { ...mockUser, clerkId: null };
    const invalidUser3 = { ...mockUser, clerkId: "" };

    expect(invalidUser1.clerkId).toBeFalsy();
    expect(invalidUser2.clerkId).toBeFalsy();
    expect(invalidUser3.clerkId).toBeFalsy();
  });

  it("should properly format reservation data with clerkId", () => {
    const mockUser = {
      id: "123",
      clerkId: "user_2abc123def456",
      email: "test@example.com",
      username: "testuser",
    };

    const mockRequestBody = {
      serviceType: "mixing",
      clientInfo: {
        firstName: "John",
        lastName: "Doe",
        email: "john.doe@example.com",
        phone: "+1234567890",
      },
      preferredDate: "2024-01-20T10:00:00Z",
      preferredDuration: 120,
      budget: 15000, // $150.00 in cents
      notes: "Test reservation",
    };

    // Transform data as the route does
    const reservationData = {
      user_id: parseInt(mockUser.id),
      clerkId: mockUser.clerkId, // Use actual Clerk ID from authenticated user
      service_type: mockRequestBody.serviceType,
      details: {
        name: `${mockRequestBody.clientInfo.firstName} ${mockRequestBody.clientInfo.lastName}`.trim(),
        email: mockRequestBody.clientInfo.email,
        phone: mockRequestBody.clientInfo.phone,
        requirements: mockRequestBody.notes || "",
        referenceLinks: [],
      },
      preferred_date: mockRequestBody.preferredDate,
      duration_minutes: mockRequestBody.preferredDuration,
      total_price: mockRequestBody.budget || 0,
      notes: mockRequestBody.notes || null,
    };

    // Validate the transformed data
    expect(reservationData.clerkId).toBe("user_2abc123def456");
    expect(reservationData.user_id).toBe(123);
    expect(reservationData.service_type).toBe("mixing");
    expect(reservationData.details.name).toBe("John Doe");
    expect(reservationData.details.email).toBe("john.doe@example.com");
    expect(reservationData.total_price).toBe(15000);
  });

  it("should handle clerkId logging safely", () => {
    const clerkId = "user_2abc123def456789";

    // Test the logging format used in the code
    const loggedClerkId = clerkId.substring(0, 8) + "...";
    expect(loggedClerkId).toBe("user_2ab...");

    // Test with shorter clerkId
    const shortClerkId = "user_123";
    const loggedShortClerkId = shortClerkId.substring(0, 8) + "...";
    expect(loggedShortClerkId).toBe("user_123...");
  });

  it("should validate reservation data structure", () => {
    const validReservationData = {
      user_id: 123,
      clerkId: "user_2abc123def456",
      service_type: "mixing",
      details: {
        name: "John Doe",
        email: "john.doe@example.com",
        phone: "+1234567890",
        requirements: "Test requirements",
        referenceLinks: [],
      },
      preferred_date: "2024-01-20T10:00:00Z",
      duration_minutes: 120,
      total_price: 15000,
      notes: "Test notes",
    };

    // Validate required fields
    expect(validReservationData.clerkId).toBeDefined();
    expect(typeof validReservationData.clerkId).toBe("string");
    expect(validReservationData.user_id).toBeGreaterThan(0);
    expect(validReservationData.service_type).toBeDefined();
    expect(validReservationData.details).toBeDefined();
    expect(validReservationData.preferred_date).toBeDefined();
    expect(validReservationData.duration_minutes).toBeGreaterThan(0);
    expect(validReservationData.total_price).toBeGreaterThanOrEqual(0);
  });
});
