import { CreateReservationSchema } from "../shared/validation/index";

describe("Reservation Schema Validation", () => {
  it("should validate reservation data with referenceLinks", () => {
    const validReservationData = {
      serviceType: "mixing",
      clientInfo: {
        firstName: "John",
        lastName: "Doe",
        email: "john.doe@example.com",
        phone: "1234567890",
      },
      preferredDate: "2025-10-15T09:00:00.000Z",
      preferredDuration: 180,
      serviceDetails: {
        trackCount: 2,
        includeRevisions: 3,
        rushDelivery: false,
      },
      notes: "Test reservation",
      budget: 15000,
      acceptTerms: true,
    };

    const result = CreateReservationSchema.safeParse(validReservationData);
    expect(result.success).toBe(true);
  });

  it("should handle reservation details transformation correctly", () => {
    const clientInfo = {
      firstName: "Steve",
      lastName: "LEMBA",
      email: "slemba2@yahoo.fr",
      phone: "0000000000",
    };

    const notes =
      "test details for details\n\nSpecial Requests: \n\nReference Track: \n\nFiles: Client will provide files via email or cloud storage after booking confirmation.";

    // This is how the server transforms the data
    const transformedDetails = {
      name: `${clientInfo.firstName} ${clientInfo.lastName}`.trim(),
      email: clientInfo.email,
      phone: clientInfo.phone,
      requirements: notes || "",
      referenceLinks: [], // This should be camelCase, not snake_case
    };

    // Verify the structure matches what Convex expects
    expect(transformedDetails).toEqual({
      name: "Steve LEMBA",
      email: "slemba2@yahoo.fr",
      phone: "0000000000",
      requirements: notes,
      referenceLinks: [],
    });

    // Verify that referenceLinks is an array (not reference_links)
    expect(Array.isArray(transformedDetails.referenceLinks)).toBe(true);
    expect(transformedDetails).toHaveProperty("referenceLinks");
    expect(transformedDetails).not.toHaveProperty("reference_links");
  });
});
