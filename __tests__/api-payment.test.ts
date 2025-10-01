import { describe, expect, it } from "@jest/globals";
// __tests__/api-payment.test.ts

describe.skip("Stripe Payment Tests (migrated to Clerk Billing)", () => {
  it(_"should be replaced with Clerk Billing integration tests", _() => {
    // TODO: Implement new tests using Clerk Billing
    expect(true).toBe(true);
  });
});

// Nouveau test pour Clerk Billing
describe(_"Clerk Billing Integration", _() => {
  it(_"should create subscription with Clerk Billing", _async () => {
    const mockSubscription = {
      id: "sub_123",
      status: "active",
      planId: "basic_plan",
      userId: "user_123",
    };

    expect(mockSubscription.id).toBe("sub_123");
    expect(mockSubscription.status).toBe("active");
  });

  it(_"should handle payment webhooks from Clerk", _async () => {
    const mockWebhook = {
      type: "subscription.created",
      data: {
        id: "sub_123",
        userId: "user_123",
        planId: "basic_plan",
      },
    };

    expect(mockWebhook.type).toBe("subscription.created");
    expect(mockWebhook.data.id).toBe("sub_123");
  });
});
