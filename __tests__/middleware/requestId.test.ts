/**
 * Unit Tests for Request ID Middleware
 *
 * Tests the requestIdMiddleware behavior for:
 * - Valid header passthrough
 * - Invalid header replacement
 * - Missing header generation
 * - Response header setting
 *
 * @requirements 4.1, 4.3
 */

import type { NextFunction, Request, Response } from "express";

// Mock the requestId utility module
jest.mock("../../server/utils/requestId", () => ({
  generateSecureRequestId: jest.fn(() => "req_mock-uuid-1234-5678-abcdefghijkl"),
  isValidRequestId: jest.fn((id: string) => {
    // Simple mock validation: must start with req_ and have content after
    return typeof id === "string" && /^req_[a-zA-Z0-9_-]+$/.test(id);
  }),
}));

import { requestIdMiddleware } from "../../server/middleware/requestId";
import { generateSecureRequestId, isValidRequestId } from "../../server/utils/requestId";

const mockGenerateSecureRequestId = generateSecureRequestId as jest.MockedFunction<
  typeof generateSecureRequestId
>;
const mockIsValidRequestId = isValidRequestId as jest.MockedFunction<typeof isValidRequestId>;

interface RequestWithId extends Request {
  requestId?: string;
}

describe("requestIdMiddleware", () => {
  let mockRequest: Partial<RequestWithId>;
  let mockResponse: Partial<Response>;
  let nextFunction: NextFunction;
  let consoleWarnSpy: jest.SpyInstance;

  beforeEach(() => {
    mockRequest = {
      headers: {},
    };
    mockResponse = {
      setHeader: jest.fn().mockReturnThis(),
    };
    nextFunction = jest.fn();

    // Reset mocks
    jest.clearAllMocks();

    // Spy on console.warn to verify warning logs
    consoleWarnSpy = jest.spyOn(console, "warn").mockImplementation();
  });

  afterEach(() => {
    consoleWarnSpy.mockRestore();
  });

  describe("Valid header passthrough", () => {
    it("should use valid x-request-id header when provided", () => {
      const validRequestId = "req_valid-uuid-1234-5678-abcdefghijkl";
      mockRequest.headers = { "x-request-id": validRequestId };
      mockIsValidRequestId.mockReturnValue(true);

      requestIdMiddleware(mockRequest as RequestWithId, mockResponse as Response, nextFunction);

      expect(mockIsValidRequestId).toHaveBeenCalledWith(validRequestId);
      expect(mockRequest.requestId).toBe(validRequestId);
      expect(mockGenerateSecureRequestId).not.toHaveBeenCalled();
      expect(nextFunction).toHaveBeenCalled();
    });

    it("should use valid legacy timestamp-based request ID", () => {
      const legacyRequestId = "req_1702345678901";
      mockRequest.headers = { "x-request-id": legacyRequestId };
      mockIsValidRequestId.mockReturnValue(true);

      requestIdMiddleware(mockRequest as RequestWithId, mockResponse as Response, nextFunction);

      expect(mockIsValidRequestId).toHaveBeenCalledWith(legacyRequestId);
      expect(mockRequest.requestId).toBe(legacyRequestId);
      expect(mockGenerateSecureRequestId).not.toHaveBeenCalled();
      expect(nextFunction).toHaveBeenCalled();
    });

    it("should use valid legacy timestamp with random suffix", () => {
      const legacyRequestId = "req_1702345678901_abc123def";
      mockRequest.headers = { "x-request-id": legacyRequestId };
      mockIsValidRequestId.mockReturnValue(true);

      requestIdMiddleware(mockRequest as RequestWithId, mockResponse as Response, nextFunction);

      expect(mockIsValidRequestId).toHaveBeenCalledWith(legacyRequestId);
      expect(mockRequest.requestId).toBe(legacyRequestId);
      expect(mockGenerateSecureRequestId).not.toHaveBeenCalled();
      expect(nextFunction).toHaveBeenCalled();
    });

    it("should not log warning when valid header is provided", () => {
      const validRequestId = "req_valid-uuid-1234-5678-abcdefghijkl";
      mockRequest.headers = { "x-request-id": validRequestId };
      mockIsValidRequestId.mockReturnValue(true);

      requestIdMiddleware(mockRequest as RequestWithId, mockResponse as Response, nextFunction);

      expect(consoleWarnSpy).not.toHaveBeenCalled();
    });
  });

  describe("Invalid header replacement", () => {
    it("should generate new ID when x-request-id header is invalid", () => {
      const invalidRequestId = "invalid-no-prefix";
      const generatedId = "req_generated-uuid-1234-5678-abcdefghijkl";
      mockRequest.headers = { "x-request-id": invalidRequestId };
      mockIsValidRequestId.mockReturnValue(false);
      mockGenerateSecureRequestId.mockReturnValue(generatedId);

      requestIdMiddleware(mockRequest as RequestWithId, mockResponse as Response, nextFunction);

      expect(mockIsValidRequestId).toHaveBeenCalledWith(invalidRequestId);
      expect(mockGenerateSecureRequestId).toHaveBeenCalled();
      expect(mockRequest.requestId).toBe(generatedId);
      expect(nextFunction).toHaveBeenCalled();
    });

    it("should log warning when invalid header is replaced", () => {
      const invalidRequestId = "invalid-request-id";
      const generatedId = "req_generated-uuid-1234-5678-abcdefghijkl";
      mockRequest.headers = { "x-request-id": invalidRequestId };
      mockIsValidRequestId.mockReturnValue(false);
      mockGenerateSecureRequestId.mockReturnValue(generatedId);

      requestIdMiddleware(mockRequest as RequestWithId, mockResponse as Response, nextFunction);

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        "Invalid x-request-id header received, generating new ID",
        expect.objectContaining({
          invalidId: invalidRequestId,
          newId: generatedId,
        })
      );
    });

    it("should truncate long invalid IDs in warning log", () => {
      const longInvalidId = "a".repeat(100);
      const generatedId = "req_generated-uuid-1234-5678-abcdefghijkl";
      mockRequest.headers = { "x-request-id": longInvalidId };
      mockIsValidRequestId.mockReturnValue(false);
      mockGenerateSecureRequestId.mockReturnValue(generatedId);

      requestIdMiddleware(mockRequest as RequestWithId, mockResponse as Response, nextFunction);

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        "Invalid x-request-id header received, generating new ID",
        expect.objectContaining({
          invalidId: longInvalidId.slice(0, 50),
          newId: generatedId,
        })
      );
    });

    it("should handle non-string header values", () => {
      const generatedId = "req_generated-uuid-1234-5678-abcdefghijkl";
      // Express can receive array headers
      mockRequest.headers = { "x-request-id": ["id1", "id2"] as unknown as string };
      mockGenerateSecureRequestId.mockReturnValue(generatedId);

      requestIdMiddleware(mockRequest as RequestWithId, mockResponse as Response, nextFunction);

      // isValidRequestId should not be called for non-string values
      expect(mockGenerateSecureRequestId).toHaveBeenCalled();
      expect(mockRequest.requestId).toBe(generatedId);
      expect(nextFunction).toHaveBeenCalled();
    });

    it("should log 'non-string value' for array headers", () => {
      const generatedId = "req_generated-uuid-1234-5678-abcdefghijkl";
      mockRequest.headers = { "x-request-id": ["id1", "id2"] as unknown as string };
      mockGenerateSecureRequestId.mockReturnValue(generatedId);

      requestIdMiddleware(mockRequest as RequestWithId, mockResponse as Response, nextFunction);

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        "Invalid x-request-id header received, generating new ID",
        expect.objectContaining({
          invalidId: "non-string value",
          newId: generatedId,
        })
      );
    });
  });

  describe("Missing header generation", () => {
    it("should generate new ID when x-request-id header is missing", () => {
      const generatedId = "req_generated-uuid-1234-5678-abcdefghijkl";
      mockRequest.headers = {};
      mockGenerateSecureRequestId.mockReturnValue(generatedId);

      requestIdMiddleware(mockRequest as RequestWithId, mockResponse as Response, nextFunction);

      expect(mockGenerateSecureRequestId).toHaveBeenCalled();
      expect(mockRequest.requestId).toBe(generatedId);
      expect(nextFunction).toHaveBeenCalled();
    });

    it("should not log warning when header is simply missing", () => {
      const generatedId = "req_generated-uuid-1234-5678-abcdefghijkl";
      mockRequest.headers = {};
      mockGenerateSecureRequestId.mockReturnValue(generatedId);

      requestIdMiddleware(mockRequest as RequestWithId, mockResponse as Response, nextFunction);

      expect(consoleWarnSpy).not.toHaveBeenCalled();
    });

    it("should generate new ID when x-request-id header is explicitly undefined", () => {
      const generatedId = "req_generated-uuid-1234-5678-abcdefghijkl";
      mockRequest.headers = { "x-request-id": undefined as unknown as string };
      mockGenerateSecureRequestId.mockReturnValue(generatedId);

      requestIdMiddleware(mockRequest as RequestWithId, mockResponse as Response, nextFunction);

      expect(mockGenerateSecureRequestId).toHaveBeenCalled();
      expect(mockRequest.requestId).toBe(generatedId);
      expect(nextFunction).toHaveBeenCalled();
    });
  });

  describe("Response header setting", () => {
    it("should set X-Request-ID response header with valid incoming ID", () => {
      const validRequestId = "req_valid-uuid-1234-5678-abcdefghijkl";
      mockRequest.headers = { "x-request-id": validRequestId };
      mockIsValidRequestId.mockReturnValue(true);

      requestIdMiddleware(mockRequest as RequestWithId, mockResponse as Response, nextFunction);

      expect(mockResponse.setHeader).toHaveBeenCalledWith("X-Request-ID", validRequestId);
    });

    it("should set X-Request-ID response header with generated ID", () => {
      const generatedId = "req_generated-uuid-1234-5678-abcdefghijkl";
      mockRequest.headers = {};
      mockGenerateSecureRequestId.mockReturnValue(generatedId);

      requestIdMiddleware(mockRequest as RequestWithId, mockResponse as Response, nextFunction);

      expect(mockResponse.setHeader).toHaveBeenCalledWith("X-Request-ID", generatedId);
    });

    it("should set X-Request-ID response header when invalid header is replaced", () => {
      const invalidRequestId = "invalid-request-id";
      const generatedId = "req_generated-uuid-1234-5678-abcdefghijkl";
      mockRequest.headers = { "x-request-id": invalidRequestId };
      mockIsValidRequestId.mockReturnValue(false);
      mockGenerateSecureRequestId.mockReturnValue(generatedId);

      requestIdMiddleware(mockRequest as RequestWithId, mockResponse as Response, nextFunction);

      expect(mockResponse.setHeader).toHaveBeenCalledWith("X-Request-ID", generatedId);
    });

    it("should set response header before calling next()", () => {
      const generatedId = "req_generated-uuid-1234-5678-abcdefghijkl";
      mockRequest.headers = {};
      mockGenerateSecureRequestId.mockReturnValue(generatedId);

      const callOrder: string[] = [];
      (mockResponse.setHeader as jest.Mock).mockImplementation(() => {
        callOrder.push("setHeader");
        return mockResponse;
      });
      (nextFunction as jest.Mock).mockImplementation(() => {
        callOrder.push("next");
      });

      requestIdMiddleware(mockRequest as RequestWithId, mockResponse as Response, nextFunction);

      expect(callOrder).toEqual(["setHeader", "next"]);
    });
  });

  describe("Request object attachment", () => {
    it("should attach requestId to request object with valid header", () => {
      const validRequestId = "req_valid-uuid-1234-5678-abcdefghijkl";
      mockRequest.headers = { "x-request-id": validRequestId };
      mockIsValidRequestId.mockReturnValue(true);

      requestIdMiddleware(mockRequest as RequestWithId, mockResponse as Response, nextFunction);

      expect(mockRequest.requestId).toBe(validRequestId);
    });

    it("should attach requestId to request object with generated ID", () => {
      const generatedId = "req_generated-uuid-1234-5678-abcdefghijkl";
      mockRequest.headers = {};
      mockGenerateSecureRequestId.mockReturnValue(generatedId);

      requestIdMiddleware(mockRequest as RequestWithId, mockResponse as Response, nextFunction);

      expect(mockRequest.requestId).toBe(generatedId);
    });

    it("should overwrite existing requestId on request object", () => {
      const existingId = "req_existing-id";
      const generatedId = "req_generated-uuid-1234-5678-abcdefghijkl";
      mockRequest.requestId = existingId;
      mockRequest.headers = {};
      mockGenerateSecureRequestId.mockReturnValue(generatedId);

      requestIdMiddleware(mockRequest as RequestWithId, mockResponse as Response, nextFunction);

      expect(mockRequest.requestId).toBe(generatedId);
    });
  });

  describe("next() function behavior", () => {
    it("should always call next() after processing", () => {
      mockRequest.headers = {};
      mockGenerateSecureRequestId.mockReturnValue("req_test-id");

      requestIdMiddleware(mockRequest as RequestWithId, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalledTimes(1);
    });

    it("should call next() with no arguments", () => {
      mockRequest.headers = {};
      mockGenerateSecureRequestId.mockReturnValue("req_test-id");

      requestIdMiddleware(mockRequest as RequestWithId, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalledWith();
    });
  });
});
