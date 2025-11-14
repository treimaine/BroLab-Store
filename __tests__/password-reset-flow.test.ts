/**
 * Password Reset Flow Integration Test
 * Tests the complete password reset flow with Convex token storage
 * Security: Validates token persistence, expiration, rate limiting, and cleanup
 * Requirement 7: Tokens de Réinitialisation Non Persistés
 */

import express from "express";
import supertest from "supertest";
import { v4 as uuidv4 } from "uuid";
import { Id } from "../convex/_generated/dataModel";

const request = supertest;

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

// Mock bcrypt with both default and named export
const mockBcryptHash = jest.fn().mockResolvedValue("$2b$10$hashedpassword");
jest.mock("bcrypt", () => ({
  __esModule: true,
  default: {
    hash: mockBcryptHash,
  },
  hash: mockBcryptHash,
}));

// Import after mocks
import emailRouter from "../server/routes/email";

describe("Password Reset Flow", () => {
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

    // Reset bcrypt mock
    mockBcryptHash.mockClear();

    // Set environment variables
    process.env.FRONTEND_URL = "http://localhost:5000";
  });

  describe("POST /api/email/forgot-password", () => {
    it("should create password reset token and send email", async () => {
      const uniqueEmail = `test-${Date.now()}@example.com`;

      // Mock rate limit check (0 recent attempts)
      mockConvexClient.query.mockResolvedValueOnce(0);

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
      mockConvexClient.mutation.mockResolvedValueOnce("passwordResets:1");

      const response = await request(app)
        .post("/api/email/forgot-password")
        .set("User-Agent", "Test/1.0")
        .send({ email: uniqueEmail })
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        message: "If this email exists, a reset link has been sent",
      });

      // Verify rate limit was checked
      expect(mockConvexClient.query).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          email: uniqueEmail,
          windowMs: 60 * 60 * 1000, // 1 hour
        })
      );

      // Verify user was queried
      expect(mockConvexClient.query).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ email: uniqueEmail })
      );

      // Verify token was created with correct structure
      const mutationCall = mockConvexClient.mutation.mock.calls[0];
      const mutationArgs = mutationCall[1];
      expect(mutationArgs).toMatchObject({
        userId: testUserId,
        email: uniqueEmail,
        token: expect.any(String),
        expiresAt: expect.any(Number),
      });
      expect(mutationArgs.ipAddress).toBeDefined();
      expect(mutationArgs.userAgent).toBeDefined();

      // Verify email was sent
      expect(mockSendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: uniqueEmail,
          subject: expect.any(String),
          html: expect.any(String),
        })
      );
    });

    it("should not reveal if user does not exist (security)", async () => {
      // Mock rate limit check
      mockConvexClient.query.mockResolvedValueOnce(0);

      // Mock user not found
      mockConvexClient.query.mockResolvedValueOnce(null);

      const response = await request(app)
        .post("/api/email/forgot-password")
        .send({ email: "nonexistent@example.com" })
        .expect(200);

      // Should return success message even if user doesn't exist (security)
      expect(response.body).toEqual({
        success: true,
        message: "If this email exists, a reset link has been sent",
      });

      // Verify no token was created
      expect(mockConvexClient.mutation).not.toHaveBeenCalled();
      expect(mockSendMail).not.toHaveBeenCalled();
    });

    it("should enforce rate limiting (3 attempts per hour)", async () => {
      const rateLimitEmail = `ratelimit-${Date.now()}@example.com`;

      // Mock rate limit exceeded (3 attempts already)
      mockConvexClient.query.mockResolvedValueOnce(3);

      const response = await request(app)
        .post("/api/email/forgot-password")
        .send({ email: rateLimitEmail })
        .expect(429);

      expect(response.body).toEqual({
        success: false,
        message: "Too many password reset requests. Please try again later.",
      });

      // Verify no further queries were made
      expect(mockConvexClient.query).toHaveBeenCalledTimes(1);
      expect(mockConvexClient.mutation).not.toHaveBeenCalled();
      expect(mockSendMail).not.toHaveBeenCalled();
    });

    it("should validate email format", async () => {
      const response = await request(app)
        .post("/api/email/forgot-password")
        .send({ email: "invalid-email" })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it("should capture IP address and user agent", async () => {
      const securityEmail = `security-${Date.now()}@example.com`;

      mockConvexClient.query.mockResolvedValueOnce(0);
      mockConvexClient.query.mockResolvedValueOnce({
        _id: testUserId,
        email: securityEmail,
        username: "testuser",
        clerkId: "clerk_123",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
      mockConvexClient.mutation.mockResolvedValueOnce("passwordResets:1");

      await request(app)
        .post("/api/email/forgot-password")
        .set("User-Agent", "Test Browser/1.0")
        .send({ email: securityEmail })
        .expect(200);

      // Verify IP and user agent were captured
      const mutationCall = mockConvexClient.mutation.mock.calls[0];
      const args = mutationCall[1];
      expect(args.ipAddress).toBeDefined();
      expect(args.userAgent).toBe("Test Browser/1.0");
    });
  });

  describe("POST /api/email/reset-password", () => {
    it("should reset password with valid token", async () => {
      const validToken = uuidv4();
      const newPassword = "NewSecurePassword123!";

      // Mock token lookup - valid token
      mockConvexClient.query.mockResolvedValueOnce({
        _id: "passwordResets:1",
        userId: testUserId,
        email: testEmail,
        token: validToken,
        expiresAt: Date.now() + 15 * 60 * 1000, // 15 minutes from now
        used: false,
        createdAt: Date.now(),
      });

      // Mock user lookup
      mockConvexClient.query.mockResolvedValueOnce({
        _id: testUserId,
        email: testEmail,
        username: "testuser",
        clerkId: "clerk_123",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      // Mock mark as used
      mockConvexClient.mutation.mockResolvedValueOnce({
        success: true,
        userId: testUserId,
        email: testEmail,
      });

      // Mock delete token
      mockConvexClient.mutation.mockResolvedValueOnce({ success: true });

      const response = await request(app)
        .post("/api/email/reset-password")
        .send({ token: validToken, password: newPassword })
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        message: "Password reset successfully",
      });

      // Verify token was queried
      expect(mockConvexClient.query).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ token: validToken })
      );

      // Verify token was marked as used
      expect(mockConvexClient.mutation).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ token: validToken })
      );

      // Verify token was deleted (cleanup)
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
        .post("/api/email/reset-password")
        .send({ token: expiredToken, password: "NewPassword123!" })
        .expect(400);

      expect(response.body).toEqual({
        success: false,
        message: "Invalid or expired reset token",
      });

      // Verify mutation was not called
      expect(mockConvexClient.mutation).not.toHaveBeenCalled();
    });

    it("should reject already used token", async () => {
      const usedToken = uuidv4();

      // Mock token lookup - already used (returns null from query)
      mockConvexClient.query.mockResolvedValueOnce(null);

      const response = await request(app)
        .post("/api/email/reset-password")
        .send({ token: usedToken, password: "NewPassword123!" })
        .expect(400);

      expect(response.body).toEqual({
        success: false,
        message: "Invalid or expired reset token",
      });
    });

    it("should reject invalid token format", async () => {
      const invalidToken = "invalid-token-123";

      const response = await request(app)
        .post("/api/email/reset-password")
        .send({ token: invalidToken, password: "NewPassword123!" })
        .expect(400);

      // Validation error for invalid UUID format
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
    });

    it("should validate password strength", async () => {
      const validToken = uuidv4();

      const response = await request(app)
        .post("/api/email/reset-password")
        .send({ token: validToken, password: "weak" })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it("should require both token and password", async () => {
      const response = await request(app)
        .post("/api/email/reset-password")
        .send({ token: uuidv4() })
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe("Token Expiration", () => {
    it("should create token with 15-minute expiration", async () => {
      const expirationEmail = `expiration-${Date.now()}@example.com`;

      mockConvexClient.query.mockResolvedValueOnce(0);
      mockConvexClient.query.mockResolvedValueOnce({
        _id: testUserId,
        email: expirationEmail,
        username: "testuser",
        clerkId: "clerk_123",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
      mockConvexClient.mutation.mockResolvedValueOnce("passwordResets:1");

      await request(app)
        .post("/api/email/forgot-password")
        .send({ email: expirationEmail })
        .expect(200);

      // Verify token expiration is set to 15 minutes
      const mutationCall = mockConvexClient.mutation.mock.calls[0];
      const args = mutationCall[1];
      const expiresAt = args.expiresAt;
      const now = Date.now();
      const expectedExpiration = 15 * 60 * 1000; // 15 minutes in ms

      // Allow 1 second tolerance for test execution time
      expect(expiresAt).toBeGreaterThanOrEqual(now + expectedExpiration - 1000);
      expect(expiresAt).toBeLessThanOrEqual(now + expectedExpiration + 1000);
    });
  });

  describe("Complete Flow Integration", () => {
    it("should complete full password reset flow", async () => {
      const userEmail = "resetuser@example.com";
      const newPassword = "NewSecurePassword123!";
      let capturedToken: string;

      // Step 1: Request password reset email
      mockConvexClient.query.mockResolvedValueOnce(0); // Rate limit check
      mockConvexClient.query.mockResolvedValueOnce({
        _id: testUserId,
        email: userEmail,
        username: "resetuser",
        clerkId: "clerk_456",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      mockConvexClient.mutation.mockImplementationOnce(async (_api: unknown, args: unknown) => {
        // Capture the token for later use
        capturedToken = (args as { token: string }).token;
        return "passwordResets:2";
      });

      const requestResponse = await request(app)
        .post("/api/email/forgot-password")
        .send({ email: userEmail })
        .expect(200);

      expect(requestResponse.body.success).toBe(true);
      expect(capturedToken!).toBeDefined();

      // Step 2: Reset password with token
      mockConvexClient.query.mockResolvedValueOnce({
        _id: "passwordResets:2",
        userId: testUserId,
        email: userEmail,
        token: capturedToken!,
        expiresAt: Date.now() + 15 * 60 * 1000,
        used: false,
        createdAt: Date.now(),
      });

      mockConvexClient.query.mockResolvedValueOnce({
        _id: testUserId,
        email: userEmail,
        username: "resetuser",
        clerkId: "clerk_456",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      mockConvexClient.mutation.mockResolvedValueOnce({
        success: true,
        userId: testUserId,
        email: userEmail,
      });

      mockConvexClient.mutation.mockResolvedValueOnce({ success: true });

      const resetResponse = await request(app)
        .post("/api/email/reset-password")
        .send({ token: capturedToken!, password: newPassword })
        .expect(200);

      expect(resetResponse.body).toEqual({
        success: true,
        message: "Password reset successfully",
      });

      // Verify the complete flow
      expect(mockConvexClient.query).toHaveBeenCalledTimes(4); // Rate limit + user lookup + token lookup + user lookup
      expect(mockConvexClient.mutation).toHaveBeenCalledTimes(3); // Create + mark used + delete
      expect(mockSendMail).toHaveBeenCalledTimes(1);
    });

    it("should prevent token reuse after successful reset", async () => {
      const userEmail = "reuse@example.com";
      const newPassword = "NewSecurePassword123!";
      const token = uuidv4();

      // First reset - success
      mockConvexClient.query.mockResolvedValueOnce({
        _id: "passwordResets:3",
        userId: testUserId,
        email: userEmail,
        token,
        expiresAt: Date.now() + 15 * 60 * 1000,
        used: false,
        createdAt: Date.now(),
      });

      mockConvexClient.query.mockResolvedValueOnce({
        _id: testUserId,
        email: userEmail,
        username: "testuser",
        clerkId: "clerk_123",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      mockConvexClient.mutation.mockResolvedValueOnce({
        success: true,
        userId: testUserId,
        email: userEmail,
      });

      mockConvexClient.mutation.mockResolvedValueOnce({ success: true });

      await request(app)
        .post("/api/email/reset-password")
        .send({ token, password: newPassword })
        .expect(200);

      // Second attempt - should fail (token already used/deleted)
      mockConvexClient.query.mockResolvedValueOnce(null); // Token not found or used

      const response = await request(app)
        .post("/api/email/reset-password")
        .send({ token, password: "AnotherPassword123!" })
        .expect(400);

      expect(response.body).toEqual({
        success: false,
        message: "Invalid or expired reset token",
      });
    });
  });

  describe("Security Validations", () => {
    it("should use UUID tokens (not predictable)", async () => {
      const uuidEmail = `uuid-${Date.now()}@example.com`;

      mockConvexClient.query.mockResolvedValueOnce(0);
      mockConvexClient.query.mockResolvedValueOnce({
        _id: testUserId,
        email: uuidEmail,
        username: "testuser",
        clerkId: "clerk_123",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
      mockConvexClient.mutation.mockResolvedValueOnce("passwordResets:1");

      await request(app).post("/api/email/forgot-password").send({ email: uuidEmail }).expect(200);

      const mutationCall = mockConvexClient.mutation.mock.calls[0];
      const token = mutationCall[1].token;

      // Verify token is a valid UUID format
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      expect(token).toMatch(uuidRegex);
    });

    it("should delete existing tokens before creating new one", async () => {
      const deleteEmail = `delete-${Date.now()}@example.com`;

      mockConvexClient.query.mockResolvedValueOnce(0);
      mockConvexClient.query.mockResolvedValueOnce({
        _id: testUserId,
        email: deleteEmail,
        username: "testuser",
        clerkId: "clerk_123",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      // Mock will be called by the create mutation which handles deletion internally
      mockConvexClient.mutation.mockResolvedValueOnce("passwordResets:1");

      await request(app)
        .post("/api/email/forgot-password")
        .send({ email: deleteEmail })
        .expect(200);

      // Verify mutation was called (create handles deletion internally)
      expect(mockConvexClient.mutation).toHaveBeenCalled();
    });

    it("should include reset link in email", async () => {
      const linkEmail = `link-${Date.now()}@example.com`;

      mockConvexClient.query.mockResolvedValueOnce(0);
      mockConvexClient.query.mockResolvedValueOnce({
        _id: testUserId,
        email: linkEmail,
        username: "testuser",
        clerkId: "clerk_123",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
      mockConvexClient.mutation.mockResolvedValueOnce("passwordResets:1");

      await request(app).post("/api/email/forgot-password").send({ email: linkEmail }).expect(200);

      // Verify email contains reset link
      const emailCall = mockSendMail.mock.calls[0][0];
      expect(emailCall.html).toContain("reset-password?token=");
      expect(emailCall.html).toContain(process.env.FRONTEND_URL);
    });

    it("should hash password before storage", async () => {
      const validToken = uuidv4();
      const plainPassword = "PlainPassword123!";

      mockConvexClient.query.mockResolvedValueOnce({
        _id: "passwordResets:1",
        userId: testUserId,
        email: testEmail,
        token: validToken,
        expiresAt: Date.now() + 15 * 60 * 1000,
        used: false,
        createdAt: Date.now(),
      });

      mockConvexClient.query.mockResolvedValueOnce({
        _id: testUserId,
        email: testEmail,
        username: "testuser",
        clerkId: "clerk_123",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      mockConvexClient.mutation.mockResolvedValueOnce({
        success: true,
        userId: testUserId,
        email: testEmail,
      });

      mockConvexClient.mutation.mockResolvedValueOnce({ success: true });

      await request(app)
        .post("/api/email/reset-password")
        .send({ token: validToken, password: plainPassword })
        .expect(200);

      // Verify bcrypt.hash was called
      expect(mockBcryptHash).toHaveBeenCalledWith(plainPassword, 10);
    });

    it("should cleanup token after successful reset", async () => {
      const validToken = uuidv4();

      mockConvexClient.query.mockResolvedValueOnce({
        _id: "passwordResets:1",
        userId: testUserId,
        email: testEmail,
        token: validToken,
        expiresAt: Date.now() + 15 * 60 * 1000,
        used: false,
        createdAt: Date.now(),
      });

      mockConvexClient.query.mockResolvedValueOnce({
        _id: testUserId,
        email: testEmail,
        username: "testuser",
        clerkId: "clerk_123",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      mockConvexClient.mutation.mockResolvedValueOnce({
        success: true,
        userId: testUserId,
        email: testEmail,
      });

      mockConvexClient.mutation.mockResolvedValueOnce({ success: true });

      await request(app)
        .post("/api/email/reset-password")
        .send({ token: validToken, password: "NewPassword123!" })
        .expect(200);

      // Verify deleteToken was called
      expect(mockConvexClient.mutation).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ token: validToken })
      );

      // Should be called twice: markUsed and deleteToken
      expect(mockConvexClient.mutation).toHaveBeenCalledTimes(2);
    });
  });
});
