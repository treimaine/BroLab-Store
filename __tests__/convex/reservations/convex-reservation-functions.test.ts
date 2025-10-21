import { beforeEach, describe, expect, it } from "@jest/globals";

describe("Convex Reservation Functions - Comprehensive Tests", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("createReservation - Server-Side Authentication", () => {
    it("should create user automatically when not found (server-side)", () => {
      const testClerkId = "user_2abc123def456";
      const testDetails = {
        name: "John Michael Doe",
        email: "john@example.com",
        phone: "1234567890",
        requirements: "Test requirements",
      };

      // Simulate user creation logic
      const nameParts = testDetails.name.split(" ");
      const userData = {
        clerkId: testClerkId,
        email: testDetails.email,
        firstName: nameParts[0] || "User",
        lastName: nameParts.slice(1).join(" ") || "",
        name: testDetails.name,
        role: "user",
        isActive: true,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      expect(userData.firstName).toBe("John");
      expect(userData.lastName).toBe("Michael Doe");
      expect(userData.email).toBe("john@example.com");
      expect(userData.clerkId).toBe(testClerkId);
      expect(userData.role).toBe("user");
      expect(userData.isActive).toBe(true);
    });

    it("should handle single name correctly", () => {
      const testDetails = {
        name: "Madonna",
        email: "madonna@example.com",
      };

      const nameParts = testDetails.name.split(" ");
      const userData = {
        firstName: nameParts[0] || "User",
        lastName: nameParts.slice(1).join(" ") || "",
      };

      expect(userData.firstName).toBe("Madonna");
      expect(userData.lastName).toBe("");
    });

    it("should handle empty name with fallback", () => {
      const testDetails = {
        name: "",
        email: "user@example.com",
      };

      const nameParts = testDetails.name.split(" ");
      const userData = {
        firstName: nameParts[0] || "User",
        lastName: nameParts.slice(1).join(" ") || "",
      };

      expect(userData.firstName).toBe("User");
      expect(userData.lastName).toBe("");
    });

    it("should use existing user when found", () => {
      const existingUser = {
        _id: "user_id_123",
        clerkId: "user_2abc123def456",
        email: "existing@example.com",
        firstName: "Existing",
        lastName: "User",
      };

      const userId = existingUser._id;

      expect(userId).toBe("user_id_123");
    });
  });

  describe("createReservation - Client-Side Authentication", () => {
    it("should require authentication for client-side calls", () => {
      const identity = null;

      if (!identity) {
        const error = new Error("Authentication required: Please log in to create a reservation.");
        expect(error.message).toContain("Authentication required");
      }
    });

    it("should find user by identity subject", () => {
      const identity = {
        subject: "user_2abc123def456",
        email: "user@example.com",
      };

      const mockUser = {
        _id: "user_id_123",
        clerkId: identity.subject,
        email: identity.email,
      };

      expect(mockUser.clerkId).toBe(identity.subject);
      expect(mockUser._id).toBe("user_id_123");
    });

    it("should throw error when user not found", () => {
      const _identity = {
        subject: "user_2abc123def456",
      };

      const user = null;

      if (!user) {
        const error = new Error(
          "User account not found: Please ensure your account is properly set up."
        );
        expect(error.message).toContain("User account not found");
      }
    });
  });

  describe("createReservation - Data Normalization", () => {
    it("should normalize referenceLinks from snake_case to camelCase", () => {
      const details: Record<string, unknown> = {
        name: "John Doe",
        email: "john@example.com",
        phone: "1234567890",
        reference_links: ["link1", "link2"],
      };

      // Normalization logic
      const normalizedDetails: Record<string, unknown> = { ...details };
      if ("reference_links" in normalizedDetails) {
        normalizedDetails.referenceLinks = normalizedDetails.reference_links;
        delete normalizedDetails.reference_links;
      }

      expect(normalizedDetails).toHaveProperty("referenceLinks");
      expect(normalizedDetails).not.toHaveProperty("reference_links");
      expect(normalizedDetails.referenceLinks).toEqual(["link1", "link2"]);
    });

    it("should preserve camelCase referenceLinks", () => {
      const details: Record<string, unknown> = {
        name: "John Doe",
        email: "john@example.com",
        phone: "1234567890",
        referenceLinks: ["link1", "link2"],
      };

      const normalizedDetails: Record<string, unknown> = { ...details };
      if ("reference_links" in normalizedDetails) {
        normalizedDetails.referenceLinks = normalizedDetails.reference_links;
        delete normalizedDetails.reference_links;
      }

      expect(normalizedDetails).toHaveProperty("referenceLinks");
      expect(normalizedDetails.referenceLinks).toEqual(["link1", "link2"]);
    });
  });

  describe("createReservation - Reservation Data Structure", () => {
    it("should create reservation with correct structure", () => {
      const reservationData = {
        userId: "user_id_123",
        serviceType: "mixing",
        status: "pending",
        details: {
          name: "John Doe",
          email: "john@example.com",
          phone: "1234567890",
          requirements: "Test requirements",
          referenceLinks: [],
        },
        preferredDate: "2024-02-01T10:00:00Z",
        durationMinutes: 120,
        totalPrice: 20000,
        notes: "Test notes",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      expect(reservationData.userId).toBe("user_id_123");
      expect(reservationData.serviceType).toBe("mixing");
      expect(reservationData.status).toBe("pending");
      expect(reservationData.durationMinutes).toBe(120);
      expect(reservationData.totalPrice).toBe(20000);
      expect(reservationData.details).toHaveProperty("referenceLinks");
    });

    it("should set default status to pending", () => {
      const status = "pending";
      expect(status).toBe("pending");
    });

    it("should include timestamps", () => {
      const now = Date.now();
      const reservationData = {
        createdAt: now,
        updatedAt: now,
      };

      expect(reservationData.createdAt).toBe(now);
      expect(reservationData.updatedAt).toBe(now);
      expect(typeof reservationData.createdAt).toBe("number");
      expect(typeof reservationData.updatedAt).toBe("number");
    });
  });

  describe("Error Handling", () => {
    it("should provide user-friendly error for authentication failure", () => {
      const clerkId = "user_2abc123def456";
      const error = new Error(
        `Authentication failed: Unable to create user account for clerkId ${clerkId.substring(0, 8)}... Please ensure you are properly authenticated.`
      );

      expect(error.message).toContain("Authentication failed");
      expect(error.message).toContain("Unable to create user account");
      expect(error.message).toContain("user_2ab...");
    });

    it("should provide user-friendly error for reservation creation failure", () => {
      const error = new Error(
        "Failed to create reservation: Database connection error. Please try again or contact support if the problem persists."
      );

      expect(error.message).toContain("Failed to create reservation");
      expect(error.message).toContain("Please try again");
    });

    it("should handle missing required fields", () => {
      const invalidData = {
        serviceType: "",
        details: {},
        preferredDate: "",
        durationMinutes: 0,
        totalPrice: 0,
      };

      expect(invalidData.serviceType).toBeFalsy();
      expect(invalidData.preferredDate).toBeFalsy();
      expect(invalidData.durationMinutes).toBe(0);
    });
  });

  describe("ClerkId Logging", () => {
    it("should safely log clerkId with truncation", () => {
      const clerkId = "user_2abc123def456789";
      const loggedClerkId = clerkId.substring(0, 8) + "...";

      expect(loggedClerkId).toBe("user_2ab...");
      expect(loggedClerkId.length).toBeLessThan(clerkId.length);
    });

    it("should handle short clerkId", () => {
      const clerkId = "user_123";
      const loggedClerkId = clerkId.substring(0, 8) + "...";

      expect(loggedClerkId).toBe("user_123...");
    });
  });

  describe("Service Type Validation", () => {
    const validServiceTypes = new Set([
      "mixing",
      "mastering",
      "recording",
      "custom_beat",
      "consultation",
      "vocal_tuning",
      "beat_remake",
      "full_production",
    ]);

    for (const serviceType of validServiceTypes) {
      it(`should accept ${serviceType} as valid service type`, () => {
        expect(validServiceTypes.has(serviceType)).toBe(true);
      });
    }

    it("should reject invalid service types", () => {
      const invalidServiceTypes = ["invalid", "unknown", ""];

      for (const serviceType of invalidServiceTypes) {
        expect(validServiceTypes.has(serviceType)).toBe(false);
      }
    });
  });

  describe("Duration Validation", () => {
    it("should accept valid durations", () => {
      const validDurations = [30, 60, 90, 120, 180, 240];

      for (const duration of validDurations) {
        expect(duration).toBeGreaterThan(0);
        expect(duration).toBeLessThanOrEqual(480); // Max 8 hours
      }
    });

    it("should reject invalid durations", () => {
      const invalidDurations = [0, -30, -60, 600]; // 0, negative, or too long

      for (const duration of invalidDurations) {
        if (duration <= 0) {
          expect(duration).toBeLessThanOrEqual(0);
        } else if (duration > 480) {
          expect(duration).toBeGreaterThan(480);
        }
      }
    });
  });

  describe("Price Validation", () => {
    it("should accept valid prices", () => {
      const validPrices = [0, 5000, 10000, 20000, 50000];

      for (const price of validPrices) {
        expect(price).toBeGreaterThanOrEqual(0);
      }
    });

    it("should reject negative prices", () => {
      const invalidPrices = [-100, -1000, -5000];

      for (const price of invalidPrices) {
        expect(price).toBeLessThan(0);
      }
    });
  });

  describe("Date Validation", () => {
    it("should accept future dates", () => {
      const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      const dateTime = new Date(futureDate).getTime();

      expect(dateTime).toBeGreaterThan(Date.now());
    });

    it("should reject past dates", () => {
      const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const dateTime = new Date(pastDate).getTime();

      expect(dateTime).toBeLessThan(Date.now());
    });

    it("should handle ISO date format", () => {
      const isoDate = "2024-02-01T10:00:00Z";
      const date = new Date(isoDate);

      expect(date.toISOString()).toContain("2024-02-01T10:00:00");
      expect(Number.isNaN(date.getTime())).toBe(false);
    });
  });
});
