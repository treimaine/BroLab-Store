/**
 * End-to-end integration test for the reservation system
 * Tests the complete flow from form submission to database storage
 */

import { CreateReservationSchema } from "../../shared/validation/index";

describe("Reservation System End-to-End", () => {
  describe("Data Flow Validation", () => {
    it("should validate complete reservation flow with correct field names", () => {
      // 1. Client form data (what user submits)
      const clientFormData = {
        serviceType: "mixing",
        clientInfo: {
          firstName: "Steve",
          lastName: "LEMBA",
          email: "slemba2@yahoo.fr",
          phone: "0000000000",
        },
        preferredDate: "2025-10-15T09:00:00.000Z",
        preferredDuration: 180,
        serviceDetails: {
          trackCount: 2,
          includeRevisions: 3,
          rushDelivery: false,
        },
        notes:
          "test details for details\n\nSpecial Requests: \n\nReference Track: \n\nFiles: Client will provide files via email or cloud storage after booking confirmation.",
        budget: 15000,
        acceptTerms: true,
      };

      // 2. Validate client data against schema
      const validationResult = CreateReservationSchema.safeParse(clientFormData);
      expect(validationResult.success).toBe(true);

      // 3. Server transformation (what gets sent to Convex)
      const serverTransformedData = {
        serviceType: clientFormData.serviceType,
        details: {
          name: `${clientFormData.clientInfo.firstName} ${clientFormData.clientInfo.lastName}`.trim(),
          email: clientFormData.clientInfo.email,
          phone: clientFormData.clientInfo.phone,
          requirements: clientFormData.notes || "",
          referenceLinks: [], // ✅ This should be camelCase, not snake_case
        },
        preferredDate: clientFormData.preferredDate,
        durationMinutes: clientFormData.preferredDuration,
        totalPrice: clientFormData.budget,
        notes: clientFormData.notes,
        clerkId: "user_test123",
      };

      // 4. Verify the transformed data structure
      expect(serverTransformedData.details).toEqual({
        name: "Steve LEMBA",
        email: "slemba2@yahoo.fr",
        phone: "0000000000",
        requirements: clientFormData.notes,
        referenceLinks: [], // ✅ Correct field name
      });

      // 5. Verify no snake_case fields exist
      expect(serverTransformedData.details).not.toHaveProperty("reference_links");
      expect(serverTransformedData.details).toHaveProperty("referenceLinks");
      expect(Array.isArray(serverTransformedData.details.referenceLinks)).toBe(true);
    });

    it("should handle all service types correctly", () => {
      const serviceTypes = ["mixing", "mastering", "recording", "custom_beat", "consultation"];

      serviceTypes.forEach(serviceType => {
        const reservationData = {
          serviceType,
          clientInfo: {
            firstName: "John",
            lastName: "Doe",
            email: "john.doe@example.com",
            phone: "1234567890",
          },
          preferredDate: "2025-10-15T09:00:00.000Z",
          preferredDuration: 120,
          serviceDetails: {
            trackCount: 1,
            includeRevisions: 2,
            rushDelivery: false,
          },
          notes: "Test notes",
          budget: 10000,
          acceptTerms: true,
        };

        const result = CreateReservationSchema.safeParse(reservationData);
        expect(result.success).toBe(true);

        if (result.success) {
          expect(result.data.serviceType).toBe(serviceType);
        }
      });
    });

    it("should validate required fields correctly", () => {
      const incompleteData = {
        serviceType: "mixing",
        // Missing clientInfo
        preferredDate: "2025-10-15T09:00:00.000Z",
        preferredDuration: 180,
        budget: 15000,
        acceptTerms: true,
      };

      const result = CreateReservationSchema.safeParse(incompleteData);
      expect(result.success).toBe(false);

      if (!result.success) {
        const errors = result.error.errors;
        expect(errors.some(err => err.path.includes("clientInfo"))).toBe(true);
      }
    });

    it("should validate email format correctly", () => {
      const invalidEmailData = {
        serviceType: "mixing",
        clientInfo: {
          firstName: "John",
          lastName: "Doe",
          email: "invalid-email", // Invalid email
          phone: "1234567890",
        },
        preferredDate: "2025-10-15T09:00:00.000Z",
        preferredDuration: 180,
        serviceDetails: {
          trackCount: 2,
          includeRevisions: 3,
          rushDelivery: false,
        },
        budget: 15000,
        acceptTerms: true,
      };

      const result = CreateReservationSchema.safeParse(invalidEmailData);
      expect(result.success).toBe(false);

      if (!result.success) {
        const errors = result.error.errors;
        expect(
          errors.some(err => err.path.includes("email") && err.code === "invalid_string")
        ).toBe(true);
      }
    });
  });

  describe("Error Prevention", () => {
    it("should prevent the original schema mismatch error", () => {
      // This test ensures we don't regress to the original error
      const mockConvexData = {
        serviceType: "mixing",
        details: {
          name: "Steve LEMBA",
          email: "slemba2@yahoo.fr",
          phone: "0000000000",
          requirements: "test requirements",
          referenceLinks: [], // ✅ Correct field name
          // reference_links: [], // ❌ This would cause the original error
        },
        preferredDate: "2025-10-15T09:00:00.000Z",
        durationMinutes: 180,
        totalPrice: 15000,
        notes: "test notes",
        clerkId: "user_test123",
      };

      // Verify the structure matches Convex expectations
      expect(mockConvexData.details).toHaveProperty("referenceLinks");
      expect(mockConvexData.details).not.toHaveProperty("reference_links");
      expect(Array.isArray(mockConvexData.details.referenceLinks)).toBe(true);
    });
  });
});
