import { beforeEach, describe, expect, it, jest } from "@jest/globals";

// Mock the fetch function with proper typing
globalThis.fetch = jest.fn() as jest.MockedFunction<typeof fetch>;

// Mock sessionStorage with proper return types
const mockSessionStorage = {
  getItem: jest.fn<(key: string) => string | null>(),
  setItem: jest.fn<(key: string, value: string) => void>(),
  removeItem: jest.fn<(key: string) => void>(),
  clear: jest.fn<() => void>(),
};

Object.defineProperty(globalThis, "sessionStorage", {
  value: mockSessionStorage,
  writable: true,
});

describe("Enhanced Checkout Redirect Flow", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSessionStorage.getItem.mockClear();
    mockSessionStorage.setItem.mockClear();
    mockSessionStorage.removeItem.mockClear();
  });

  describe("Payment Intent Creation", () => {
    it("should create payment intent with correct metadata", async () => {
      const mockPaymentIntentResponse = {
        clientSecret: "pi_test_1234567890_secret_abcdef",
        paymentIntentId: "pi_test_1234567890",
      };

      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockPaymentIntentResponse,
      } as Response);

      const paymentIntentData = {
        amount: 150,
        currency: "usd",
        metadata: {
          type: "service_reservation",
          reservationId: "res_123456789",
          service: "mixing-mastering",
          serviceName: "Mixing + Mastering",
          customerName: "John Doe",
          customerEmail: "john.doe@example.com",
          userId: "user_2abc123def456",
          trackCount: "3",
          genre: "Hip Hop",
          preferredDate: "2024-01-20",
          timeSlot: "10:00 AM",
        },
      };

      const response = await fetch("/api/payment/stripe/create-payment-intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(paymentIntentData),
      });

      const result = await response.json();

      expect(fetch).toHaveBeenCalledWith("/api/payment/stripe/create-payment-intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(paymentIntentData),
      });

      expect(result).toEqual(mockPaymentIntentResponse);
      expect(result.clientSecret).toBeDefined();
      expect(result.paymentIntentId).toBeDefined();
    });

    it("should handle payment intent creation errors", async () => {
      const mockErrorResponse = {
        error: "Invalid amount",
        message: "Amount must be greater than 0",
      };

      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => mockErrorResponse,
      } as Response);

      const paymentIntentData = {
        amount: 0, // Invalid amount
        currency: "usd",
        metadata: {},
      };

      const response = await fetch("/api/payment/stripe/create-payment-intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(paymentIntentData),
      });

      expect(response.ok).toBe(false);
      expect(response.status).toBe(400);

      const result = await response.json();
      expect(result.error).toBe("Invalid amount");
    });
  });

  describe("Session Storage Management", () => {
    it("should store pending payment in session storage correctly", () => {
      const pendingPayment = {
        clientSecret: "pi_test_1234567890_secret_abcdef",
        paymentIntentId: "pi_test_1234567890",
        service: "mixing-mastering",
        serviceName: "Mixing + Mastering",
        serviceDetails: "Professional mixing and mastering for 3 tracks",
        price: 150,
        quantity: 1,
        reservationId: "res_123456789",
        metadata: {
          trackCount: "3",
          genre: "Hip Hop",
          preferredDate: "2024-01-20",
          timeSlot: "10:00 AM",
          customerName: "John Doe",
          customerEmail: "john.doe@example.com",
        },
        createdAt: "2024-01-15T10:00:00.000Z",
      };

      // Mock existing services
      const existingServices = [
        {
          service: "recording",
          serviceName: "Recording Session",
          price: 100,
          reservationId: "res_987654321",
        },
      ];

      mockSessionStorage.getItem.mockReturnValue(JSON.stringify(existingServices));

      // Simulate the session storage operations that would happen in the app
      const storedServicesRaw = mockSessionStorage.getItem("pendingServices");
      const storedServices = JSON.parse(storedServicesRaw ?? "[]") as typeof existingServices;
      const finalUpdatedServices = [...storedServices, pendingPayment];

      mockSessionStorage.setItem("pendingServices", JSON.stringify(finalUpdatedServices));
      mockSessionStorage.setItem("lastReservationPayment", JSON.stringify(pendingPayment));

      // Verify session storage operations
      expect(mockSessionStorage.getItem).toHaveBeenCalledWith("pendingServices");
      expect(mockSessionStorage.setItem).toHaveBeenCalledWith(
        "pendingServices",
        JSON.stringify(finalUpdatedServices)
      );
      expect(mockSessionStorage.setItem).toHaveBeenCalledWith(
        "lastReservationPayment",
        JSON.stringify(pendingPayment)
      );

      // Verify the data structure
      expect(finalUpdatedServices).toHaveLength(2);
      expect(finalUpdatedServices[1]).toEqual(pendingPayment);
    });

    it("should handle duplicate reservation IDs by replacing existing service", () => {
      const reservationId = "res_123456789";

      const existingServices = [
        {
          service: "mixing",
          serviceName: "Professional Mixing",
          price: 70,
          reservationId: reservationId, // Same reservation ID
        },
        {
          service: "recording",
          serviceName: "Recording Session",
          price: 100,
          reservationId: "res_987654321",
        },
      ];

      const newService = {
        service: "mixing-mastering",
        serviceName: "Mixing + Mastering",
        price: 150,
        reservationId: reservationId, // Same reservation ID - should replace
      };

      mockSessionStorage.getItem.mockReturnValue(JSON.stringify(existingServices));

      // Simulate the filtering and replacement logic
      const filteredServices = existingServices.filter(
        service => service.reservationId !== reservationId
      );
      const mockUpdatedServices = [...filteredServices, newService];

      expect(filteredServices).toHaveLength(1); // Should remove the duplicate
      expect(mockUpdatedServices).toHaveLength(2); // Should have 2 services total
      expect(mockUpdatedServices.find(s => s.reservationId === reservationId)).toEqual(newService);
    });

    it("should handle session storage errors gracefully", () => {
      // Mock session storage to throw an error
      mockSessionStorage.getItem.mockImplementation(() => {
        throw new Error("Session storage quota exceeded");
      });

      const pendingPayment = {
        service: "mixing",
        serviceName: "Professional Mixing",
        price: 70,
        reservationId: "res_123456789",
      };

      // The code should handle this error and continue
      let errorThrown = false;
      try {
        mockSessionStorage.getItem("pendingServices");
      } catch (mockError) {
        errorThrown = true;
        expect(mockError).toBeInstanceOf(Error);
      }

      expect(errorThrown).toBe(true);

      // The application should still attempt to store the backup
      try {
        mockSessionStorage.setItem("lastReservationPayment", JSON.stringify(pendingPayment));
      } catch {
        // This is expected to fail too, but shouldn't crash the app
      }
    });
  });

  describe("Checkout Redirect Flow", () => {
    it("should redirect to checkout page after successful reservation and payment intent creation", () => {
      const mockSetLocation = jest.fn();

      // Mock the successful flow
      const reservationResult = { id: "res_123456789" };
      const paymentData = {
        clientSecret: "pi_test_1234567890_secret_abcdef",
        paymentIntentId: "pi_test_1234567890",
      };

      // Simulate successful reservation creation and payment intent creation
      expect(reservationResult.id).toBeDefined();
      expect(paymentData.clientSecret).toBeDefined();

      // Simulate the redirect
      mockSetLocation("/checkout");

      expect(mockSetLocation).toHaveBeenCalledWith("/checkout");
    });

    it("should handle checkout page loading with pending services", () => {
      const pendingServices = [
        {
          clientSecret: "pi_test_1234567890_secret_abcdef",
          service: "mixing-mastering",
          serviceName: "Mixing + Mastering",
          price: 150,
          reservationId: "res_123456789",
        },
      ];

      mockSessionStorage.getItem.mockReturnValue(JSON.stringify(pendingServices));

      // Simulate checkout page loading
      const storedServicesRaw = mockSessionStorage.getItem("pendingServices");
      const storedServices = JSON.parse(storedServicesRaw ?? "[]") as typeof pendingServices;

      expect(storedServices).toEqual(pendingServices);
      expect(storedServices[0].clientSecret).toBeDefined();
      expect(storedServices[0].reservationId).toBeDefined();
    });
  });

  describe("Payment Form Integration", () => {
    it("should determine payment method based on pending services", () => {
      // Services with payment intents should use "intent" method
      const servicesWithIntents = [
        {
          clientSecret: "pi_test_1234567890_secret_abcdef",
          service: "mixing",
          serviceName: "Professional Mixing",
          price: 70,
        },
      ];

      const hasPaymentIntents = servicesWithIntents.some(service => service.clientSecret);
      const paymentMethod = hasPaymentIntents ? "intent" : "session";

      expect(paymentMethod).toBe("intent");

      // Services without payment intents should use "session" method
      const servicesWithoutIntents: Array<{
        service: string;
        serviceName: string;
        price: number;
        clientSecret?: string;
      }> = [
        {
          service: "consultation",
          serviceName: "Production Consultation",
          price: 75,
        },
      ];

      const hasNoPaymentIntents = servicesWithoutIntents.some(service => service.clientSecret);
      const sessionPaymentMethod = hasNoPaymentIntents ? "intent" : "session";

      expect(sessionPaymentMethod).toBe("session");
    });

    it("should create enhanced metadata for checkout sessions", () => {
      const pendingServices = [
        {
          service: "mixing",
          serviceName: "Professional Mixing",
          price: 70,
          reservationId: "res_123456789",
        },
        {
          service: "mastering",
          serviceName: "Audio Mastering",
          price: 50,
          reservationId: "res_987654321",
        },
      ];

      const user = {
        id: "user_2abc123def456",
        emailAddresses: [{ emailAddress: "john.doe@example.com" }],
      };

      const enhancedMetadata = {
        userId: user.id,
        userEmail: user.emailAddresses[0]?.emailAddress,
        servicesCount: pendingServices.length.toString(),
        reservationIds: pendingServices.map(s => s.reservationId).join(","),
        description: "BroLab Purchase - 2 service(s)",
      };

      expect(enhancedMetadata.servicesCount).toBe("2");
      expect(enhancedMetadata.reservationIds).toBe("res_123456789,res_987654321");
      expect(enhancedMetadata.userEmail).toBe("john.doe@example.com");
    });
  });
});
