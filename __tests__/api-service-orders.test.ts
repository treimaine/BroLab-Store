import request from "supertest";
import { app } from "../server/app";
import * as db from "../server/lib/db";
import { makeTestUser } from "./factories";
import { MockNext, MockRequest, MockResponse } from "./types/mocks";

jest.mock("../server/lib/db");

// Mock the auth module's isAuthenticated middleware
jest.mock("../server/auth", () => ({
  ...jest.requireActual("../server/auth"),
  isAuthenticated: (req: MockRequest, res: MockResponse, next: MockNext) => {
    // Add user to request for authenticated tests
    req.user = {
      id: "123",
      clerkId: "user_123",
      username: "testuser",
      email: "test@example.com",
      role: "user",
    };

    // Create a proper session mock with all required methods
    req.session = {
      userId: 123,
      touch: jest.fn(),
      save: jest.fn(callback => callback && callback()),
      regenerate: jest.fn(callback => callback && callback()),
      destroy: jest.fn(callback => callback && callback()),
      reload: jest.fn(callback => callback && callback()),
      resetMaxAge: jest.fn(),
      cookie: {
        maxAge: 24 * 60 * 60 * 1000,
        secure: false,
        httpOnly: true,
        sameSite: "lax" as const,
      },
      id: "test-session-id",
    };
    next();
  },
}));

describe("/api/service-orders", () => {
  let agent: request.SuperAgentTest;
  let testUser: ReturnType<typeof makeTestUser>;

  beforeEach(async () => {
    jest.clearAllMocks();
    testUser = makeTestUser();

    // Mock database functions
    (db.upsertUser as jest.Mock).mockImplementation(async user => ({
      id: 123,
      username: user.username,
      email: user.email,
      password: user.password,
      created_at: new Date().toISOString(),
    }));

    const bcrypt = await import("bcrypt");
    const hashedPassword = await bcrypt.hash(testUser.password, 10);
    (db.getUserByEmail as jest.Mock).mockImplementation(async email => ({
      id: 123,
      username: testUser.username,
      email,
      password: hashedPassword,
      created_at: new Date().toISOString(),
    }));

    (db.getUserById as jest.Mock).mockImplementation(async _id => ({
      id: 123,
      username: testUser.username,
      email: testUser.email,
      password: hashedPassword,
      created_at: new Date().toISOString(),
    }));

    // Setup agent with authentication
    agent = request.agent(app);

    // Since we're using auth middleware mock, we don't need to register/login
    // The middleware will automatically add auth to requests
  });

  it("create service order ok (login → POST → GET)", async () => {
    // Arrange
    const fakeOrder = {
      id: "order-uuid",
      user_id: 123,
      service_type: "mixing",
      details: {
        notes: "Mix my track",
      },
      estimated_price: 0,
      status: "pending",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    (db.createServiceOrder as jest.Mock).mockResolvedValue(fakeOrder);
    (db.listServiceOrders as jest.Mock).mockResolvedValue([fakeOrder]);

    // Act: POST
    const postRes = await agent.post("/api/service-orders").send({
      service_type: "mixing",
      details: "Mix my track with professional quality and attention to detail",
      budget: 100,
      deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days from now
      contact_email: "test@example.com",
      contact_phone: "+1234567890",
    });

    // Assert POST
    expect(postRes.status).toBe(201);
    expect(postRes.body).toMatchObject({
      id: "order-uuid",
      user_id: 123,
      service_type: "mixing",
      details: {
        notes: "Mix my track",
      },
      estimated_price: 0,
    });

    // Act: GET
    const getRes = await agent.get("/api/service-orders");

    // Assert GET
    expect(getRes.status).toBe(200);
    expect(Array.isArray(getRes.body)).toBe(true);
    expect(getRes.body[0]).toMatchObject({
      id: "order-uuid",
      user_id: 123,
      service_type: "mixing",
      details: {
        notes: "Mix my track",
      },
    });
  });

  it("validation errors (POST → 400)", async () => {
    // Test with invalid data to ensure validation works
    const postRes = await request(app).post("/api/service-orders").send({
      service_type: "invalid_service", // Invalid enum value
      details: "short", // Too short
      budget: 10, // Below minimum
      deadline: "invalid-date", // Invalid date format
      contact_email: "invalid-email", // Invalid email
    });

    expect(postRes.status).toBe(400);
    expect(postRes.body).toHaveProperty("error");
    expect(postRes.body.error.type).toBe("validation_error");
  });

  it("invalid body (POST → 400)", async () => {
    // Act: POST without service_type
    const res1 = await agent.post("/api/service-orders").send({
      details: "Missing service_type but with enough characters to pass validation",
      budget: 100,
      deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      contact_email: "test@example.com",
    });
    expect(res1.status).toBe(400);
    expect(res1.body).toHaveProperty("error");

    // Act: POST without details
    const res2 = await agent.post("/api/service-orders").send({
      service_type: "mixing",
      budget: 100,
      deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      contact_email: "test@example.com",
    });
    expect(res2.status).toBe(400);
    expect(res2.body).toHaveProperty("error");
  });
});
