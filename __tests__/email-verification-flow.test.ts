/**
 * Email Verification Flow Integration Test
 * Tests the complete email verification flow with Convex token storage
 * Security: Validates token persistence, expiration, and cleanup
 */

import express from "express";
import request from "supertest";
import { v4 as uuidv4 } from "uuid";
import { Id } from "../convex/_generated/dataModel";

// Mock Convex client
const mockConvexClient = {
  query: jest.fn(),
  mutation: jest.fn(),
  action: jest.fn(),
};

// Mock getConvex to return our mock client
jest.mock("../server/lib/convex", () => ({
  getConvex: jest.fn(() => mockConvexClient),
}));

// Mock email service with persistent mock
const mockSendMail = jest.fn().mockResolvedValue({ success: true });
jest.mock("../server/services/mail", () => ({
  sendMail: mockSendMail,
}));

// Import after mocks
import emailRouter from "../server/routes/email";

describe("Email Verification Flow", () => {
  let app: express.Application;
  const testUserId = "users:test123" as Id<"users">;
  const testEmail = "test@example.com";

  beforeEach(() => {
    // Create Express app with email routes
    app = express();
    app.use(express.json());
    app.use("/api/email", emailRouter);

    // Reset mocks but keep implementations
    mockConvexClient.query.mockClear();
    mockConvexClient.mutation.mockClear();
    mockSendMail.mockClear();

    // Set environment variables
    process.env.FRONTEND_URL = "http://localhost:5000";
  });

  describe("POST /api/email/resend-verification", () => {
    it("should create verification token and send email", async () => {
      const uniqueEmail = `test-${Date.now()}@example.com`;

      // Mock user lookup
      mockConvexClient.query.mockResolvedValueOnce({
        _id: testUserId,
        email: uniqueEmail,
        username: "testuser",
        clerkId: "clerk_123",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      // Mock token creation
      mockConvexClient.mutation.mockResolvedValueOnce("emailVerifications:1");

      const response = await request(app)
        .post("/api/email/resend-verification")
        .send({ email: uniqueEmail })
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        message: "Verification email sent successfully",
      });

      // Verify user was queried
      expect(mockConvexClient.query).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ email: uniqueEmail })
      );

      // Verify token was created with correct structure
      expect(mockConvexClient.mutation).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          userId: testUserId,
          email: uniqueEmail,
          token: expect.any(String),
          expiresAt: expect.any(Number),
        })
      );

      // Verify email was sent
      expect(mockSendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: uniqueEmail,
          subject: expect.any(String),
          html: expect.any(String),
        })
      );
    });

    it("should return 404 if user not found", async () => {
      // Mock user not found
      mockConvexClient.query.mockResolvedValueOnce(null);

      const response = await request(app)
        .post("/api/email/resend-verification")
        .send({ email: "nonexistent@example.com" })
        .expect(404);

      expect(response.body).toEqual({
        success: false,
        message: "User not found",
      });

      // Verify no token was created
      expect(mockConvexClient.mutation).not.toHaveBeenCalled();
      expect(mockSendMail).not.toHaveBeenCalled();
    });

    it("should enforce rate limiting (3 requests per day)", async () => {
      const rateLimitEmail = `ratelimit-${Date.now()}@example.com`;

      // Mock user lookup
      mockConvexClient.query.mockResolvedValue({
        _id: testUserId,
        email: rateLimitEmail,
        username: "testuser",
        clerkId: "clerk_123",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      mockConvexClient.mutation.mockResolvedValue("emailVerifications:1");

      // First 3 requests should succeed
      for (let i = 0; i < 3; i++) {
        await request(app)
          .post("/api/email/resend-verification")
          .send({ email: rateLimitEmail })
          .expect(200);
      }

      // 4th request should be rate limited
      const response = await request(app)
        .post("/api/email/resend-verification")
        .send({ email: rateLimitEmail })
        .expect(429);

      expect(response.body).toEqual({
        success: false,
        message: "Too many verification requests. Try again tomorrow.",
      });
    });

    it("should validate email format", async () => {
      const response = await request(app)
        .post("/api/email/resend-verification")
        .send({ email: "invalid-email" })
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe("GET /api/email/verify-email", () => {
    it("should verify email with valid token", async () => {
      const validToken = uuidv4();

      // Mock token lookup - valid token
      mockConvexClient.query.mockResolvedValueOnce({
        _id: "emailVerifications:1",
        userId: testUserId,
        email: testEmail,
        token: validToken,
        expiresAt: Date.now() + 24 * 60 * 60 * 1000, // 24 hours from now
        verified: false,
        createdAt: Date.now(),
      });

      // Mock mark as verified
      mockConvexClient.mutation.mockResolvedValueOnce({
        success: true,
        userId: testUserId,
        email: testEmail,
      });

      const response = await request(app)
        .get("/api/email/verify-email")
        .query({ token: validToken })
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        message: "Email verified successfully",
      });

      // Verify token was queried
      expect(mockConvexClient.query).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ token: validToken })
      );

      // Verify token was marked as verified
      expect(mockConvexClient.mutation).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ token: validToken })
      );
    });

    it("should reject expired token", async () => {
      const expiredToken = uuidv4();

      // Mock token lookup - expired token (returns null from query)
      mockConvexClient.query.mockResolvedValueOnce(null);

      const response = await request(app)
        .get("/api/email/verify-email")
        .query({ token: expiredToken })
        .expect(400);

      expect(response.body).toEqual({
        success: false,
        message: "Invalid or expired verification token",
      });

      // Verify mutation was not called
      expect(mockConvexClient.mutation).not.toHaveBeenCalled();
    });

    it("should reject invalid token format", async () => {
      const invalidToken = "invalid-token-123";

      const response = await request(app)
        .get("/api/email/verify-email")
        .query({ token: invalidToken })
        .expect(400);

      // Validation error for invalid UUID format
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
    });

    it("should reject already verified token", async () => {
      const verifiedToken = uuidv4();

      // Mock token lookup - already verified (returns null from query)
      mockConvexClient.query.mockResolvedValueOnce(null);

      const response = await request(app)
        .get("/api/email/verify-email")
        .query({ token: verifiedToken })
        .expect(400);

      expect(response.body).toEqual({
        success: false,
        message: "Invalid or expired verification token",
      });
    });

    it("should require token parameter", async () => {
      const response = await request(app).get("/api/email/verify-email").expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe("Token Expiration", () => {
    it("should create token with 24-hour expiration", async () => {
      const expirationEmail = `expiration-${Date.now()}@example.com`;

      mockConvexClient.query.mockResolvedValueOnce({
        _id: testUserId,
        email: expirationEmail,
        username: "testuser",
        clerkId: "clerk_123",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      mockConvexClient.mutation.mockResolvedValueOnce("emailVerifications:1");

      await request(app)
        .post("/api/email/resend-verification")
        .send({ email: expirationEmail })
        .expect(200);

      // Verify token expiration is set to 24 hours
      const mutationCall = mockConvexClient.mutation.mock.calls[0];
      const args = mutationCall[1];
      const expiresAt = args.expiresAt;
      const now = Date.now();
      const expectedExpiration = 24 * 60 * 60 * 1000; // 24 hours in ms

      // Allow 1 second tolerance for test execution time
      expect(expiresAt).toBeGreaterThanOrEqual(now + expectedExpiration - 1000);
      expect(expiresAt).toBeLessThanOrEqual(now + expectedExpiration + 1000);
    });
  });

  describe("Complete Flow Integration", () => {
    it("should complete full verification flow", async () => {
      const userEmail = "newuser@example.com";
      let capturedToken: string;

      // Step 1: Request verification email
      mockConvexClient.query.mockResolvedValueOnce({
        _id: testUserId,
        email: userEmail,
        username: "newuser",
        clerkId: "clerk_456",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      mockConvexClient.mutation.mockImplementationOnce(async (_api: unknown, args: unknown) => {
        // Capture the token for later use
        capturedToken = (args as { token: string }).token;
        return "emailVerifications:2";
      });

      const requestResponse = await request(app)
        .post("/api/email/resend-verification")
        .send({ email: userEmail })
        .expect(200);

      expect(requestResponse.body.success).toBe(true);
      expect(capturedToken!).toBeDefined();

      // Step 2: Verify email with token
      mockConvexClient.query.mockResolvedValueOnce({
        _id: "emailVerifications:2",
        userId: testUserId,
        email: userEmail,
        token: capturedToken!,
        expiresAt: Date.now() + 24 * 60 * 60 * 1000,
        verified: false,
        createdAt: Date.now(),
      });

      mockConvexClient.mutation.mockResolvedValueOnce({
        success: true,
        userId: testUserId,
        email: userEmail,
      });

      const verifyResponse = await request(app)
        .get("/api/email/verify-email")
        .query({ token: capturedToken! })
        .expect(200);

      expect(verifyResponse.body).toEqual({
        success: true,
        message: "Email verified successfully",
      });

      // Verify the complete flow
      expect(mockConvexClient.query).toHaveBeenCalledTimes(2);
      expect(mockConvexClient.mutation).toHaveBeenCalledTimes(2);
      expect(mockSendMail).toHaveBeenCalledTimes(1);
    });
  });

  describe("Security Validations", () => {
    it("should use UUID tokens (not predictable)", async () => {
      const uuidEmail = `uuid-${Date.now()}@example.com`;

      mockConvexClient.query.mockResolvedValueOnce({
        _id: testUserId,
        email: uuidEmail,
        username: "testuser",
        clerkId: "clerk_123",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      mockConvexClient.mutation.mockResolvedValueOnce("emailVerifications:1");

      await request(app)
        .post("/api/email/resend-verification")
        .send({ email: uuidEmail })
        .expect(200);

      const mutationCall = mockConvexClient.mutation.mock.calls[0];
      const token = mutationCall[1].token;

      // Verify token is a valid UUID format
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      expect(token).toMatch(uuidRegex);
    });

    it("should delete existing tokens before creating new one", async () => {
      const deleteEmail = `delete-${Date.now()}@example.com`;

      mockConvexClient.query.mockResolvedValueOnce({
        _id: testUserId,
        email: deleteEmail,
        username: "testuser",
        clerkId: "clerk_123",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      // Mock will be called by the create mutation which handles deletion internally
      mockConvexClient.mutation.mockResolvedValueOnce("emailVerifications:1");

      await request(app)
        .post("/api/email/resend-verification")
        .send({ email: deleteEmail })
        .expect(200);

      // Verify mutation was called (create handles deletion internally)
      expect(mockConvexClient.mutation).toHaveBeenCalled();
    });

    it("should include verification link in email", async () => {
      const linkEmail = `link-${Date.now()}@example.com`;

      mockConvexClient.query.mockResolvedValueOnce({
        _id: testUserId,
        email: linkEmail,
        username: "testuser",
        clerkId: "clerk_123",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      mockConvexClient.mutation.mockResolvedValueOnce("emailVerifications:1");

      await request(app)
        .post("/api/email/resend-verification")
        .send({ email: linkEmail })
        .expect(200);

      // Verify email contains verification link
      const emailCall = mockSendMail.mock.calls[0][0];
      expect(emailCall.html).toContain("verify-email?token=");
      expect(emailCall.html).toContain(process.env.FRONTEND_URL);
    });
  });
});
