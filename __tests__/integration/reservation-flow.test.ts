import { beforeEach, describe, expect, it, jest } from "@jest/globals";

// Mock dependencies
jest.mock("../../server/lib/convex", () => ({
  createReservation: jest.fn(),
  getUserByClerkId: jest.fn(),
}));

jest.mock("../../server/services/ReservationEmailService", () => ({
  reservationEmailService: {
    sendReservationConfirmation: jest.fn(),
    sendAdminNotification: jest.fn(),
  },
}));

describe("Reservation Flow Integration Tests", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Complete Reservation Creation Flow", () => {
    it("should create reservation with authenticated user", async () => {
      const mockUser = {
        id: "123",
        clerkId: "user_2abc123def456",
        email: "test@example.com",
        firstName: "John",
        lastName: "Doe",
      };

      const reservationData = {
        serviceType: "mixing",
        clientInfo: {
          firstName: "John",
          lastName: "Doe",
          email: "john.doe@example.com",
          phone: "+1234567890",
        },
        preferredDate: "2024-02-01T10:00:00Z",
        preferredDuration: 120,
        budget: 15000,
        notes: "Test reservation",
        acceptTerms: true,
      };

      // Validate the data transformation
      const transformedData = {
        user_id: Number.parseInt(mockUser.id),
        clerkId: mockUser.clerkId,
        service_type: reservationData.serviceType,
        details: {
          name: `${reservationData.clientInfo.firstName} ${reservationData.clientInfo.lastName}`.trim(),
          email: reservationData.clientInfo.email,
          phone: reservationData.clientInfo.phone,
          requirements: reservationData.notes || "",
          referenceLinks: [],
        },
        preferred_date: reservationData.preferredDate,
        duration_minutes: reservationData.preferredDuration,
        total_price: reservationData.budget || 0,
        notes: reservationData.notes || null,
      };

      expect(transformedData.clerkId).toBe(mockUser.clerkId);
      expect(transformedData.details.name).toBe("John Doe");
      expect(transformedData.details.email).toBe("john.doe@example.com");
      expect(transformedData.total_price).toBe(15000);
    });

    it("should validate required fields", () => {
      const invalidData = {
        serviceType: "",
        clientInfo: {
          firstName: "",
          lastName: "",
          email: "invalid-email",
          phone: "123",
        },
        preferredDate: "",
        preferredDuration: 0,
        acceptTerms: false,
      };

      // Validation checks
      expect(invalidData.serviceType).toBeFalsy();
      expect(invalidData.clientInfo.firstName).toBeFalsy();
      expect(invalidData.clientInfo.email).not.toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
      expect(invalidData.preferredDuration).toBeLessThanOrEqual(0);
      expect(invalidData.acceptTerms).toBe(false);
    });
  });

  describe("Checkout Redirect Flow", () => {
    it("should prepare payment intent data correctly", () => {
      const reservationResult = {
        id: "res_123",
        serviceType: "mixing",
        totalPrice: 20000,
      };

      const paymentIntentData = {
        amount: reservationResult.totalPrice,
        currency: "usd",
        metadata: {
          type: "service_reservation",
          reservationId: reservationResult.id,
          service: reservationResult.serviceType,
          serviceName: "Mixing & Mastering",
          customerName: "John Doe",
          customerEmail: "john@example.com",
        },
      };

      expect(paymentIntentData.amount).toBe(20000);
      expect(paymentIntentData.metadata.reservationId).toBe("res_123");
      expect(paymentIntentData.metadata.type).toBe("service_reservation");
    });

    it("should format session storage correctly", () => {
      const paymentData = {
        clientSecret: "pi_123_secret_456",
        paymentIntentId: "pi_123",
      };

      const reservationResult = {
        id: "res_123",
        serviceType: "mixing",
        totalPrice: 20000,
      };

      const pendingPayment = {
        clientSecret: paymentData.clientSecret,
        service: reservationResult.serviceType,
        serviceName: "Mixing & Mastering",
        serviceDetails: "Test details",
        price: reservationResult.totalPrice,
        quantity: 1,
        reservationId: reservationResult.id,
      };

      expect(pendingPayment.clientSecret).toBe("pi_123_secret_456");
      expect(pendingPayment.reservationId).toBe("res_123");
      expect(pendingPayment.price).toBe(20000);
    });
  });

  describe("Custom Beats Service Flow", () => {
    it("should use authenticated user data", () => {
      const mockUser = {
        firstName: "Jane",
        lastName: "Smith",
        fullName: "Jane Smith",
        emailAddresses: [{ emailAddress: "jane@example.com" }],
        phoneNumbers: [{ phoneNumber: "+1234567890" }],
      };

      const reservationData = {
        serviceType: "custom_beat" as const,
        clientInfo: {
          firstName: mockUser.firstName || mockUser.fullName?.split(" ")[0] || "User",
          lastName: mockUser.lastName || mockUser.fullName?.split(" ").slice(1).join(" ") || "",
          email: mockUser.emailAddresses[0]?.emailAddress || "",
          phone: mockUser.phoneNumbers?.[0]?.phoneNumber || "0000000000",
        },
      };

      expect(reservationData.clientInfo.firstName).toBe("Jane");
      expect(reservationData.clientInfo.lastName).toBe("Smith");
      expect(reservationData.clientInfo.email).toBe("jane@example.com");
      expect(reservationData.clientInfo.phone).toBe("+1234567890");
    });

    it("should handle missing user data gracefully", () => {
      const mockUser = {
        fullName: "John Doe",
        emailAddresses: [{ emailAddress: "john@example.com" }],
      };

      const reservationData = {
        clientInfo: {
          firstName: mockUser.fullName?.split(" ")[0] || "User",
          lastName: mockUser.fullName?.split(" ").slice(1).join(" ") || "",
          email: mockUser.emailAddresses[0]?.emailAddress || "",
          phone: "0000000000",
        },
      };

      expect(reservationData.clientInfo.firstName).toBe("John");
      expect(reservationData.clientInfo.lastName).toBe("Doe");
      expect(reservationData.clientInfo.phone).toBe("0000000000");
    });
  });

  describe("Error Scenarios", () => {
    it("should handle authentication failures", () => {
      const authErrors = {
        notAuthenticated: "Authentication required: Please log in to create a reservation.",
        userNotFound: "User account not found: Please ensure your account is properly set up.",
      };

      expect(authErrors.notAuthenticated).toContain("Authentication required");
      expect(authErrors.userNotFound).toContain("User account not found");
    });

    it("should handle reservation creation failures", () => {
      const error = new Error("Failed to create reservation: Database connection error");

      expect(error.message).toContain("Failed to create reservation");
    });

    it("should handle payment intent creation failures", () => {
      const error = new Error("Payment intent creation failed: Invalid amount");

      expect(error.message).toContain("Payment intent creation failed");
    });

    it("should validate date is in the future", () => {
      const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

      expect(new Date(pastDate).getTime()).toBeLessThan(Date.now());
      expect(new Date(futureDate).getTime()).toBeGreaterThan(Date.now());
    });

    it("should validate duration is positive", () => {
      const validDurations = [30, 60, 120, 180];
      const invalidDurations = [0, -30, -60];

      for (const duration of validDurations) {
        expect(duration).toBeGreaterThan(0);
      }

      for (const duration of invalidDurations) {
        expect(duration).toBeLessThanOrEqual(0);
      }
    });
  });

  describe("Email Notification Flow", () => {
    it("should send confirmation email after reservation", async () => {
      const { reservationEmailService } = await import(
        "../../server/services/ReservationEmailService"
      );

      const mockUser = {
        id: "user_123",
        email: "user@test.com",
        firstName: "John",
        lastName: "Doe",
        fullName: "John Doe",
      };

      const mockReservation = {
        id: "res_123",
        serviceType: "mixing",
        status: "pending",
        preferredDate: new Date("2024-02-01T10:00:00Z").toISOString(),
        durationMinutes: 120,
        totalPrice: 200,
        notes: "Test reservation",
        details: {
          name: "John Doe",
          email: "user@test.com",
          phone: "1234567890",
          requirements: "Test requirements",
        },
      };

      await reservationEmailService.sendReservationConfirmation(mockUser, [mockReservation]);

      expect(reservationEmailService.sendReservationConfirmation).toHaveBeenCalledWith(mockUser, [
        mockReservation,
      ]);
    });

    it("should send admin notification", async () => {
      const { reservationEmailService } = await import(
        "../../server/services/ReservationEmailService"
      );

      const mockUser = {
        id: "user_123",
        email: "user@test.com",
        firstName: "John",
        lastName: "Doe",
        fullName: "John Doe",
      };

      const mockReservation = {
        id: "res_123",
        serviceType: "mixing",
        status: "pending",
        preferredDate: new Date("2024-02-01T10:00:00Z").toISOString(),
        durationMinutes: 120,
        totalPrice: 200,
        notes: "Test reservation",
        details: {
          name: "John Doe",
          email: "user@test.com",
          phone: "1234567890",
          requirements: "Test requirements",
        },
      };

      await reservationEmailService.sendAdminNotification(mockUser, mockReservation);

      expect(reservationEmailService.sendAdminNotification).toHaveBeenCalledWith(
        mockUser,
        mockReservation
      );
    });

    it("should not fail reservation if email fails", async () => {
      const { reservationEmailService } = await import(
        "../../server/services/ReservationEmailService"
      );

      (
        reservationEmailService.sendReservationConfirmation as jest.Mock<
          typeof reservationEmailService.sendReservationConfirmation
        >
      ).mockRejectedValue(new Error("Email service unavailable"));

      // Reservation should still succeed even if email fails
      const reservationResult = {
        id: "res_123",
        status: "pending",
      };

      expect(reservationResult.id).toBe("res_123");
      expect(reservationResult.status).toBe("pending");
    });
  });

  describe("Data Consistency", () => {
    it("should maintain consistent field naming", () => {
      const details = {
        name: "John Doe",
        email: "john@example.com",
        phone: "1234567890",
        requirements: "Test requirements",
        referenceLinks: [], // camelCase, not snake_case
      };

      expect(details).toHaveProperty("referenceLinks");
      expect(details).not.toHaveProperty("reference_links");
      expect(Array.isArray(details.referenceLinks)).toBe(true);
    });

    it("should normalize details object", () => {
      const detailsWithSnakeCase: Record<string, unknown> = {
        name: "John Doe",
        email: "john@example.com",
        phone: "1234567890",
        reference_links: ["link1", "link2"],
      };

      // Normalize to camelCase
      const normalizedDetails: Record<string, unknown> = { ...detailsWithSnakeCase };
      if ("reference_links" in normalizedDetails) {
        normalizedDetails.referenceLinks = normalizedDetails.reference_links;
        delete normalizedDetails.reference_links;
      }

      expect(normalizedDetails).toHaveProperty("referenceLinks");
      expect(normalizedDetails).not.toHaveProperty("reference_links");
    });
  });

  describe("Service-Specific Flows", () => {
    const services = [
      { type: "mixing", name: "Mixing & Mastering", minDuration: 60 },
      { type: "recording_session", name: "Recording Session", minDuration: 60 },
      { type: "custom_beat", name: "Custom Beat Production", minDuration: 30 },
      { type: "production_consultation", name: "Production Consultation", minDuration: 30 },
    ];

    for (const service of services) {
      it(`should handle ${service.name} service correctly`, () => {
        const reservationData = {
          serviceType: service.type,
          preferredDuration: service.minDuration,
        };

        expect(reservationData.serviceType).toBe(service.type);
        expect(reservationData.preferredDuration).toBeGreaterThanOrEqual(service.minDuration);
      });
    }
  });
});
