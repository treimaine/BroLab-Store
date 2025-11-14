import type { NextFunction, Response } from "express";
import type { Id } from "../../convex/_generated/dataModel";
import type { AuthenticatedRequest } from "../../server/types/routes";
import type { ConvexUser } from "../../shared/types/ConvexUser";

// Mock Convex and audit logger before importing
jest.mock("../../server/lib/convex");
jest.mock("../../server/lib/audit");

// Import after mocking
import { auditLogger } from "../../server/lib/audit";
import { getUserByClerkId } from "../../server/lib/convex";
import { requireAdmin } from "../../server/middleware/requireAdmin";

const mockGetUserByClerkId = getUserByClerkId as jest.MockedFunction<typeof getUserByClerkId>;
const mockAuditLogger = auditLogger as jest.Mocked<typeof auditLogger>;

describe("requireAdmin middleware", () => {
  let mockRequest: Partial<AuthenticatedRequest>;
  let mockResponse: Partial<Response>;
  let nextFunction: NextFunction;

  beforeEach(() => {
    mockRequest = {
      user: undefined,
      headers: {},
      path: "/admin/test",
      method: "POST",
    };
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    nextFunction = jest.fn();

    // Reset mocks
    jest.clearAllMocks();
  });

  it("should return 401 if user is not authenticated", async () => {
    await requireAdmin(mockRequest as AuthenticatedRequest, mockResponse as Response, nextFunction);

    expect(mockResponse.status).toHaveBeenCalledWith(401);
    expect(mockResponse.json).toHaveBeenCalledWith({
      error: "Authentication required",
      code: "UNAUTHORIZED",
    });
    expect(nextFunction).not.toHaveBeenCalled();
  });

  it("should return 401 if user has no clerkId", async () => {
    mockRequest.user = {
      id: "1",
      email: "user@example.com",
      username: "testuser",
      role: "user",
      // No clerkId
    };

    await requireAdmin(mockRequest as AuthenticatedRequest, mockResponse as Response, nextFunction);

    expect(mockResponse.status).toHaveBeenCalledWith(401);
    expect(mockResponse.json).toHaveBeenCalledWith({
      error: "Invalid authentication data",
      code: "INVALID_AUTH",
    });
    expect(nextFunction).not.toHaveBeenCalled();
  });

  it("should return 401 if user not found in Convex", async () => {
    mockRequest.user = {
      id: "1",
      clerkId: "clerk_123",
      email: "user@example.com",
      username: "testuser",
      role: "user",
    };

    mockGetUserByClerkId.mockResolvedValue(null);

    await requireAdmin(mockRequest as AuthenticatedRequest, mockResponse as Response, nextFunction);

    expect(mockGetUserByClerkId).toHaveBeenCalledWith("clerk_123");
    expect(mockResponse.status).toHaveBeenCalledWith(401);
    expect(mockResponse.json).toHaveBeenCalledWith({
      error: "User not found",
      code: "USER_NOT_FOUND",
    });
    expect(nextFunction).not.toHaveBeenCalled();
  });

  it("should return 403 if user is not admin", async () => {
    mockRequest.user = {
      id: "1",
      clerkId: "clerk_123",
      email: "user@example.com",
      username: "testuser",
      role: "user",
    };

    mockGetUserByClerkId.mockResolvedValue({
      _id: "convex_user_1" as Id<"users">,
      clerkId: "clerk_123",
      email: "user@example.com",
      username: "testuser",
      role: "user",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    } as ConvexUser);

    await requireAdmin(mockRequest as AuthenticatedRequest, mockResponse as Response, nextFunction);

    expect(mockGetUserByClerkId).toHaveBeenCalledWith("clerk_123");
    expect(mockAuditLogger.logSecurityEvent).toHaveBeenCalledWith(
      "clerk_123",
      "unauthorized_admin_access",
      expect.objectContaining({
        attemptedPath: "/admin/test",
        method: "POST",
        userRole: "user",
      }),
      expect.any(String),
      expect.any(String)
    );
    expect(mockResponse.status).toHaveBeenCalledWith(403);
    expect(mockResponse.json).toHaveBeenCalledWith({
      error: "Admin access required",
      code: "FORBIDDEN",
    });
    expect(nextFunction).not.toHaveBeenCalled();
  });

  it("should call next() if user has admin role", async () => {
    mockRequest.user = {
      id: "1",
      clerkId: "clerk_admin",
      email: "admin@example.com",
      username: "admin",
      role: "admin",
    };

    mockGetUserByClerkId.mockResolvedValue({
      _id: "convex_admin_1" as Id<"users">,
      clerkId: "clerk_admin",
      email: "admin@example.com",
      username: "admin",
      role: "admin",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    } as ConvexUser);

    await requireAdmin(mockRequest as AuthenticatedRequest, mockResponse as Response, nextFunction);

    expect(mockGetUserByClerkId).toHaveBeenCalledWith("clerk_admin");
    expect(mockAuditLogger.logSecurityEvent).toHaveBeenCalledWith(
      "clerk_admin",
      "admin_access_granted",
      expect.objectContaining({
        path: "/admin/test",
        method: "POST",
        userRole: "admin",
      }),
      expect.any(String),
      expect.any(String)
    );
    expect(nextFunction).toHaveBeenCalled();
    expect(mockResponse.status).not.toHaveBeenCalled();
    expect(mockResponse.json).not.toHaveBeenCalled();
  });

  it("should call next() if user has service_role", async () => {
    mockRequest.user = {
      id: "1",
      clerkId: "clerk_service",
      email: "service@example.com",
      username: "service",
      role: "service_role",
    };

    mockGetUserByClerkId.mockResolvedValue({
      _id: "convex_service_1" as Id<"users">,
      clerkId: "clerk_service",
      email: "service@example.com",
      username: "service",
      role: "service_role",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    } as ConvexUser);

    await requireAdmin(mockRequest as AuthenticatedRequest, mockResponse as Response, nextFunction);

    expect(mockGetUserByClerkId).toHaveBeenCalledWith("clerk_service");
    expect(mockAuditLogger.logSecurityEvent).toHaveBeenCalledWith(
      "clerk_service",
      "admin_access_granted",
      expect.objectContaining({
        path: "/admin/test",
        method: "POST",
        userRole: "service_role",
      }),
      expect.any(String),
      expect.any(String)
    );
    expect(nextFunction).toHaveBeenCalled();
    expect(mockResponse.status).not.toHaveBeenCalled();
    expect(mockResponse.json).not.toHaveBeenCalled();
  });

  it("should return 403 if user role is undefined in Convex", async () => {
    mockRequest.user = {
      id: "1",
      clerkId: "clerk_123",
      email: "user@example.com",
      username: "testuser",
      // role is undefined
    };

    mockGetUserByClerkId.mockResolvedValue({
      _id: "convex_user_1" as Id<"users">,
      clerkId: "clerk_123",
      email: "user@example.com",
      username: "testuser",
      // role is undefined - defaults to "user"
      createdAt: Date.now(),
      updatedAt: Date.now(),
    } as ConvexUser);

    await requireAdmin(mockRequest as AuthenticatedRequest, mockResponse as Response, nextFunction);

    expect(mockGetUserByClerkId).toHaveBeenCalledWith("clerk_123");
    expect(mockAuditLogger.logSecurityEvent).toHaveBeenCalledWith(
      "clerk_123",
      "unauthorized_admin_access",
      expect.objectContaining({
        attemptedPath: "/admin/test",
        method: "POST",
        userRole: "user",
      }),
      expect.any(String),
      expect.any(String)
    );
    expect(mockResponse.status).toHaveBeenCalledWith(403);
    expect(mockResponse.json).toHaveBeenCalledWith({
      error: "Admin access required",
      code: "FORBIDDEN",
    });
    expect(nextFunction).not.toHaveBeenCalled();
  });

  it("should handle errors gracefully", async () => {
    mockRequest.user = {
      id: "1",
      clerkId: "clerk_admin",
      email: "admin@example.com",
      username: "admin",
      role: "admin",
    };

    // Mock getUserByClerkId to throw an error
    mockGetUserByClerkId.mockRejectedValue(new Error("Database error"));

    // Mock console.error to avoid noise in test output
    const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation();

    await requireAdmin(mockRequest as AuthenticatedRequest, mockResponse as Response, nextFunction);

    // The middleware should catch the error and return 500
    expect(mockResponse.status).toHaveBeenCalledWith(500);
    expect(mockResponse.json).toHaveBeenCalledWith({
      error: "Authorization check failed",
      code: "INTERNAL_ERROR",
    });
    expect(nextFunction).not.toHaveBeenCalled();

    consoleErrorSpy.mockRestore();
  });
});
