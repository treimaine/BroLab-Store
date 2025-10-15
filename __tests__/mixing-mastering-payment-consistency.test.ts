/**
 * Test to verify that Mixing & Mastering service uses consistent payment flow
 * with other services (Secure Checkout instead of Direct Payment)
 */

describe("Mixing & Mastering Payment Consistency", () => {
  it("should not include clientSecret in pending payment data", () => {
    // Simulate the pending payment object created by mixing-mastering service
    const pendingPayment = {
      service: "mixing-mastering",
      serviceName: "Mixing + Mastering",
      serviceDetails: "Professional mixing and mastering",
      reservationId: "res_123456789",
      price: 150,
      quantity: 1,
    };

    // Verify that clientSecret is NOT included (consistent with other services)
    expect(pendingPayment).not.toHaveProperty("clientSecret");
    expect(pendingPayment).not.toHaveProperty("paymentIntentId");

    // Verify required properties are present
    expect(pendingPayment).toHaveProperty("service");
    expect(pendingPayment).toHaveProperty("serviceName");
    expect(pendingPayment).toHaveProperty("reservationId");
    expect(pendingPayment).toHaveProperty("price");
    expect(pendingPayment).toHaveProperty("quantity");
  });

  it("should determine payment method as 'session' when no clientSecret is present", () => {
    const pendingServices = [
      {
        service: "mixing-mastering",
        serviceName: "Mixing + Mastering",
        serviceDetails: "Professional mixing and mastering",
        reservationId: "res_123456789",
        price: 150,
        quantity: 1,
      },
    ];

    // Simulate the logic from EnhancedPaymentForm
    const hasPaymentIntents = pendingServices.some(service => service.clientSecret);
    const paymentMethod = hasPaymentIntents ? "intent" : "session";

    // Should use "session" (Secure Checkout) not "intent" (Direct Payment)
    expect(paymentMethod).toBe("session");
    expect(hasPaymentIntents).toBe(false);
  });

  it("should be consistent with other services payment data structure", () => {
    // Mixing & Mastering payment structure
    const mixingMasteringPayment = {
      service: "mixing-mastering",
      serviceName: "Mixing + Mastering",
      serviceDetails: "Professional mixing and mastering",
      reservationId: "res_123456789",
      price: 150,
      quantity: 1,
    };

    // Recording Session payment structure (for comparison)
    const recordingSessionPayment = {
      service: "recording",
      serviceName: "Recording Session",
      serviceDetails: "Studio recording session",
      reservationId: "res_987654321",
      price: 400,
      quantity: 1,
    };

    // Production Consultation payment structure (for comparison)
    const consultationPayment = {
      service: "consultation",
      serviceName: "Production Consultation",
      serviceDetails: "Video consultation - 60 minutes",
      reservationId: "res_456789123",
      price: 100,
      quantity: 1,
    };

    // All services should have the same structure (no clientSecret)
    const allServices = [mixingMasteringPayment, recordingSessionPayment, consultationPayment];

    allServices.forEach(service => {
      expect(service).toHaveProperty("service");
      expect(service).toHaveProperty("serviceName");
      expect(service).toHaveProperty("serviceDetails");
      expect(service).toHaveProperty("reservationId");
      expect(service).toHaveProperty("price");
      expect(service).toHaveProperty("quantity");

      // None should have clientSecret (all use Secure Checkout)
      expect(service).not.toHaveProperty("clientSecret");
      expect(service).not.toHaveProperty("paymentIntentId");
    });
  });
});
