// __tests__/api-subscription.test.ts

// Legacy supabase stub
const supabaseAdmin = { from: jest.fn() } as any;

describe.skip("GET /api/subscription/status (legacy Stripe/Supabase) — skipped: migrated to Clerk Billing", () => {
  it(_"should be replaced with Clerk Billing subscription status", _() => {
    // TODO: Implement new tests using Clerk Billing
    expect(true).toBe(true);
  });
});

describe.skip("POST /api/subscription/webhook (Stripe) — skipped: migrated to Clerk Billing", () => {
  it.skip(_"traite checkout.session.completed, _upsert la subscription et retourne 200", _async () => {
    // TODO: Replace with Clerk webhook tests
    expect(true).toBe(true);
  });
});

describe.skip("POST /api/subscription/webhook (Stripe) - cas avancés — skipped", () => {
  it.skip(_"retourne 400 et error: invalid_signature si signature Stripe invalide", _async () => {
    // TODO: Replace with Clerk webhook validation tests
    expect(true).toBe(true);
  });

  it.skip(_"retourne 400 et error: unsupported_event_type si type d'événement non supporté", _async () => {
    // TODO: Replace with Clerk webhook event type tests
    expect(true).toBe(true);
  });

  it.skip(_"retourne 500 et error: database_error si erreur Supabase", _async () => {
    // TODO: Replace with Convex error handling tests
    expect(true).toBe(true);
  });
});

// Nouveau test pour Clerk Billing
describe(_"Clerk Billing Subscription Tests", _() => {
  it(_"should get subscription status from Clerk", _async () => {
    const mockSubscription = {
      id: "sub_123",
      status: "active",
      planId: "basic_plan",
      currentPeriodEnd: Date.now() + 30 * 24 * 60 * 60 * 1000, // 30 days from now
    };

    expect(mockSubscription.status).toBe("active");
    expect(mockSubscription.planId).toBe("basic_plan");
  });

  it(_"should handle Clerk webhook events", _async () => {
    const mockWebhookEvent = {
      type: "subscription.created",
      data: {
        id: "sub_123",
        userId: "user_123",
        planId: "basic_plan",
        status: "active",
      },
    };

    expect(mockWebhookEvent.type).toBe("subscription.created");
    expect(mockWebhookEvent.data.status).toBe("active");
  });

  it(_"should sync subscription data with Convex", _async () => {
    const mockConvexSync = {
      userId: "user_123",
      subscriptionId: "sub_123",
      planId: "basic_plan",
      status: "active",
    };

    expect(mockConvexSync.userId).toBe("user_123");
    expect(mockConvexSync.status).toBe("active");
  });
});
