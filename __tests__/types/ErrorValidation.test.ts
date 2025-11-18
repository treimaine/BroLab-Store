import { describe, expect, test } from "@jest/globals";
import {
  ApiErrorResponseSchema,
  BusinessLogicErrorSchema,
  ErrorCategory,
  ErrorContextSchema,
  ErrorResolutionSchema,
  ErrorSchema,
  ErrorSeverity,
  ErrorType,
  RateLimitErrorSchema,
  ValidationErrorResponseSchema,
  ValidationErrorSchema,
  createApiError,
  createBusinessLogicError,
  createValidationError,
  getHttpStatusForErrorType,
  getUserMessageForErrorType,
} from "../../shared/validation/ErrorValidation";

describe("Error Validation Tests", () => {
  describe("ErrorSeverity Validation", () => {
    test("should accept valid error severities", () => {
      const validSeverities = ["low", "medium", "high", "critical"];

      for (const severity of validSeverities) {
        expect(() => ErrorSeverity.parse(severity)).not.toThrow();
      }
    });

    test("should reject invalid error severities", () => {
      const invalidSeverities = ["info", "warning", "error", "", "invalid-severity"];

      for (const severity of invalidSeverities) {
        expect(() => ErrorSeverity.parse(severity)).toThrow();
      }
    });
  });

  describe("ErrorCategory Validation", () => {
    test("should accept valid error categories", () => {
      const validCategories = [
        "authentication",
        "authorization",
        "validation",
        "payment",
        "audio_processing",
        "file_upload",
        "database",
        "external_api",
        "rate_limiting",
        "system",
        "user_input",
        "business_logic",
        "network",
        "security",
      ];

      for (const category of validCategories) {
        expect(() => ErrorCategory.parse(category)).not.toThrow();
      }
    });

    test("should reject invalid error categories", () => {
      const invalidCategories = ["ui", "frontend", "backend", "", "invalid-category"];

      for (const category of invalidCategories) {
        expect(() => ErrorCategory.parse(category)).toThrow();
      }
    });
  });

  describe("ErrorType Validation", () => {
    test("should accept valid authentication error types", () => {
      const authErrors = [
        "invalid_credentials",
        "account_locked",
        "session_expired",
        "two_factor_required",
      ];

      for (const errorType of authErrors) {
        expect(() => ErrorType.parse(errorType)).not.toThrow();
      }
    });

    test("should accept valid authorization error types", () => {
      const authzErrors = [
        "insufficient_permissions",
        "resource_forbidden",
        "subscription_required",
        "quota_exceeded",
      ];

      for (const errorType of authzErrors) {
        expect(() => ErrorType.parse(errorType)).not.toThrow();
      }
    });

    test("should accept valid payment error types", () => {
      const paymentErrors = [
        "payment_failed",
        "insufficient_funds",
        "card_declined",
        "payment_method_invalid",
        "subscription_expired",
      ];

      for (const errorType of paymentErrors) {
        expect(() => ErrorType.parse(errorType)).not.toThrow();
      }
    });

    test("should accept valid audio processing error types", () => {
      const audioErrors = [
        "audio_format_unsupported",
        "audio_file_corrupted",
        "processing_timeout",
        "waveform_generation_failed",
      ];

      for (const errorType of audioErrors) {
        expect(() => ErrorType.parse(errorType)).not.toThrow();
      }
    });

    test("should accept valid business logic error types", () => {
      const businessErrors = [
        "beat_not_available",
        "license_conflict",
        "reservation_conflict",
        "order_processing_failed",
      ];

      for (const errorType of businessErrors) {
        expect(() => ErrorType.parse(errorType)).not.toThrow();
      }
    });

    test("should reject invalid error types", () => {
      const invalidTypes = ["unknown_error", "custom_error", "", "invalid-type"];

      for (const errorType of invalidTypes) {
        expect(() => ErrorType.parse(errorType)).toThrow();
      }
    });
  });

  describe("ErrorContext Schema Validation", () => {
    test("should accept valid error context", () => {
      const validContext = {
        requestId: "req_1234567890",
        userId: "user_1234567890",
        userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        ipAddress: "192.168.1.1",
        endpoint: "/api/beats/123",
        method: "GET" as const,
        statusCode: 404,
        beatId: 123,
        orderId: "order_1234567890",
        reservationId: "res_1234567890",
        stackTrace: "Error: Beat not found\n    at getBeat (/app/src/beats.js:45:11)",
        errorCode: "BEAT_NOT_FOUND",
        metadata: { source: "api", version: "1.0" },
      };

      expect(() => ErrorContextSchema.parse(validContext)).not.toThrow();
    });

    test("should accept empty error context", () => {
      const emptyContext = {};
      expect(() => ErrorContextSchema.parse(emptyContext)).not.toThrow();
    });

    test("should reject invalid IP address", () => {
      const invalidContext = {
        ipAddress: "invalid-ip-address",
      };

      expect(() => ErrorContextSchema.parse(invalidContext)).toThrow();
    });

    test("should reject invalid HTTP method", () => {
      const invalidContext = {
        method: "INVALID",
      };

      expect(() => ErrorContextSchema.parse(invalidContext)).toThrow();
    });

    test("should reject invalid status code", () => {
      const invalidContext = {
        statusCode: 999, // Invalid HTTP status code
      };

      expect(() => ErrorContextSchema.parse(invalidContext)).toThrow();
    });
  });

  describe("ErrorResolution Schema Validation", () => {
    test("should accept valid error resolution", () => {
      const validResolution = {
        userMessage: "The beat you're looking for is no longer available.",
        userAction: "Browse other beats in this genre",
        supportCode: "BEAT_404_001",
        documentationUrl: "https://docs.brolabentertainment.com/errors/beat-not-found",
        retryable: false,
        retryAfter: 300, // 5 minutes
        requiresSupport: false,
        escalationLevel: "tier1" as const,
      };

      expect(() => ErrorResolutionSchema.parse(validResolution)).not.toThrow();
    });

    test("should require user message", () => {
      const invalidResolution = {
        userMessage: "", // Empty message
      };

      expect(() => ErrorResolutionSchema.parse(invalidResolution)).toThrow(
        "User message is required"
      );
    });

    test("should apply default values", () => {
      const minimalResolution = {
        userMessage: "An error occurred",
      };

      const result = ErrorResolutionSchema.parse(minimalResolution);
      expect(result.retryable).toBe(false);
      expect(result.requiresSupport).toBe(false);
      expect(result.escalationLevel).toBe("none");
    });

    test("should reject invalid documentation URL", () => {
      const invalidResolution = {
        userMessage: "An error occurred",
        documentationUrl: "not-a-valid-url",
      };

      expect(() => ErrorResolutionSchema.parse(invalidResolution)).toThrow();
    });

    test("should reject negative retry after", () => {
      const invalidResolution = {
        userMessage: "An error occurred",
        retryAfter: -100, // Negative value
      };

      expect(() => ErrorResolutionSchema.parse(invalidResolution)).toThrow();
    });
  });

  describe("Complete Error Schema Validation", () => {
    test("should accept valid complete error", () => {
      const validError = {
        id: "err_1234567890",
        type: "beat_not_available" as const,
        category: "business_logic" as const,
        severity: "medium" as const,
        message: "Beat with ID 123 is no longer available for purchase",
        code: "BEAT_NOT_AVAILABLE",
        context: {
          requestId: "req_1234567890",
          userId: "user_1234567890",
          beatId: 123,
          endpoint: "/api/beats/123/purchase",
          method: "POST" as const,
          statusCode: 404,
        },
        resolution: {
          userMessage: "This beat is no longer available for purchase.",
          userAction: "Browse other beats in this genre",
          retryable: false,
          requiresSupport: false,
        },
        occurredAt: new Date().toISOString(),
        resolvedAt: new Date(Date.now() + 60000).toISOString(),
        count: 1,
        firstOccurrence: new Date().toISOString(),
        lastOccurrence: new Date().toISOString(),
      };

      expect(() => ErrorSchema.parse(validError)).not.toThrow();
    });

    test("should apply default values", () => {
      const minimalError = {
        type: "internal_server_error" as const,
        category: "system" as const,
        severity: "high" as const,
        message: "An internal server error occurred",
        resolution: {
          userMessage: "Something went wrong. Please try again later.",
        },
        occurredAt: new Date().toISOString(),
      };

      const result = ErrorSchema.parse(minimalError);
      expect(result.count).toBe(1);
    });

    test("should reject error without required fields", () => {
      const invalidError = {
        type: "invalid_input" as const,
        category: "validation" as const,
        severity: "low" as const,
        message: "", // Empty message
        resolution: {
          userMessage: "Invalid input provided",
        },
        occurredAt: new Date().toISOString(),
      };

      expect(() => ErrorSchema.parse(invalidError)).toThrow("Error message is required");
    });
  });

  describe("ApiErrorResponse Schema Validation", () => {
    test("should accept valid API error response", () => {
      const validApiError = {
        error: {
          type: "payment_failed" as const,
          message: "Payment processing failed due to insufficient funds",
          code: "INSUFFICIENT_FUNDS",
          details: { cardLast4: "4242", attemptId: "att_123" },
          userMessage: "Your card was declined due to insufficient funds.",
          userAction: "Please use a different payment method or add funds to your account",
          supportCode: "PAY_001",
          documentationUrl: "https://docs.brolabentertainment.com/payments/troubleshooting",
          requestId: "req_1234567890",
          timestamp: new Date().toISOString(),
        },
        debug: {
          stackTrace: "Error: Payment failed\n    at processPayment (/app/src/payments.js:123:45)",
          context: { stripeError: "card_declined", amount: 2999 },
        },
      };

      expect(() => ApiErrorResponseSchema.parse(validApiError)).not.toThrow();
    });

    test("should accept API error without debug information", () => {
      const apiErrorWithoutDebug = {
        error: {
          type: "beat_not_available" as const,
          message: "Beat is no longer available",
          requestId: "req_1234567890",
          timestamp: new Date().toISOString(),
        },
      };

      expect(() => ApiErrorResponseSchema.parse(apiErrorWithoutDebug)).not.toThrow();
    });
  });

  describe("ValidationError Schema Validation", () => {
    test("should accept valid validation error", () => {
      const validValidationError = {
        field: "email",
        value: "invalid-email",
        message: "Please enter a valid email address",
        code: "INVALID_EMAIL_FORMAT",
        nested: [
          {
            field: "email.domain",
            value: "invalid-domain",
            message: "Domain format is invalid",
            code: "INVALID_DOMAIN",
          },
        ],
      };

      expect(() => ValidationErrorSchema.parse(validValidationError)).not.toThrow();
    });

    test("should reject validation error without field name", () => {
      const invalidValidationError = {
        field: "", // Empty field name
        value: "test",
        message: "Field is required",
      };

      expect(() => ValidationErrorSchema.parse(invalidValidationError)).toThrow(
        "Field name is required"
      );
    });

    test("should reject validation error without message", () => {
      const invalidValidationError = {
        field: "username",
        value: "test",
        message: "", // Empty message
      };

      expect(() => ValidationErrorSchema.parse(invalidValidationError)).toThrow(
        "Validation message is required"
      );
    });
  });

  describe("ValidationErrorResponse Schema Validation", () => {
    test("should accept valid validation error response", () => {
      const validValidationResponse = {
        error: {
          type: "validation_error" as const,
          message: "Validation failed",
          errors: [
            {
              field: "email",
              value: "invalid-email",
              message: "Please enter a valid email address",
            },
            {
              field: "password",
              value: "weak",
              message: "Password must be at least 8 characters",
            },
          ],
          errorCount: 2,
          requestId: "req_1234567890",
          timestamp: new Date().toISOString(),
        },
      };

      expect(() => ValidationErrorResponseSchema.parse(validValidationResponse)).not.toThrow();
    });

    test("should reject validation response without errors", () => {
      const invalidValidationResponse = {
        error: {
          type: "validation_error" as const,
          message: "Validation failed",
          errors: [], // Empty errors array
          errorCount: 0,
          timestamp: new Date().toISOString(),
        },
      };

      expect(() => ValidationErrorResponseSchema.parse(invalidValidationResponse)).toThrow(
        "At least one validation error required"
      );
    });
  });

  describe("RateLimitError Schema Validation", () => {
    test("should accept valid rate limit error", () => {
      const validRateLimitError = {
        error: {
          type: "rate_limit_exceeded" as const,
          message: "Rate limit exceeded",
          limit: 100,
          remaining: 0,
          resetTime: new Date(Date.now() + 3600000).toISOString(), // 1 hour from now
          retryAfter: 3600, // 1 hour
          requestId: "req_1234567890",
          timestamp: new Date().toISOString(),
        },
      };

      expect(() => RateLimitErrorSchema.parse(validRateLimitError)).not.toThrow();
    });

    test("should apply default message", () => {
      const rateLimitErrorWithoutMessage = {
        error: {
          type: "rate_limit_exceeded" as const,
          limit: 100,
          remaining: 0,
          resetTime: new Date(Date.now() + 3600000).toISOString(),
          retryAfter: 3600,
          timestamp: new Date().toISOString(),
        },
      };

      const result = RateLimitErrorSchema.parse(rateLimitErrorWithoutMessage);
      expect(result.error.message).toBe("Rate limit exceeded");
    });
  });

  describe("BusinessLogicError Schema Validation", () => {
    test("should accept valid business logic error", () => {
      const validBusinessError = {
        error: {
          type: "license_conflict" as const,
          message: "Cannot purchase exclusive license - beat already has active exclusive license",
          businessRule: "exclusive_license_uniqueness",
          resourceId: "beat_123",
          resourceType: "beat" as const,
          userMessage:
            "This beat already has an exclusive license and cannot be purchased exclusively.",
          suggestedAction: "Consider purchasing a different license type or browse other beats",
          requestId: "req_1234567890",
          timestamp: new Date().toISOString(),
        },
      };

      expect(() => BusinessLogicErrorSchema.parse(validBusinessError)).not.toThrow();
    });

    test("should accept business error with minimal fields", () => {
      const minimalBusinessError = {
        error: {
          type: "reservation_conflict" as const,
          message: "Time slot is no longer available",
          userMessage: "The selected time slot is no longer available. Please choose another time.",
          timestamp: new Date().toISOString(),
        },
      };

      expect(() => BusinessLogicErrorSchema.parse(minimalBusinessError)).not.toThrow();
    });
  });

  describe("Error Creation Utilities", () => {
    describe("createApiError", () => {
      test("should create valid API error", () => {
        const apiError = createApiError("beat_not_available", "Beat with ID 123 not found", {
          code: "BEAT_NOT_FOUND",
          userMessage: "This beat is no longer available.",
          userAction: "Browse other beats",
          supportCode: "BEAT_001",
          requestId: "req_123",
        });

        expect(() => ApiErrorResponseSchema.parse(apiError)).not.toThrow();
        expect(apiError.error.type).toBe("beat_not_available");
        expect(apiError.error.message).toBe("Beat with ID 123 not found");
        expect(apiError.error.code).toBe("BEAT_NOT_FOUND");
        expect(apiError.error.userMessage).toBe("This beat is no longer available.");
        expect(apiError.error.requestId).toBe("req_123");
      });

      test("should use message as userMessage when not provided", () => {
        const apiError = createApiError("internal_server_error", "Database connection failed");

        expect(apiError.error.userMessage).toBe("Database connection failed");
      });

      test("should include timestamp", () => {
        const apiError = createApiError("timeout", "Request timed out");

        expect(apiError.error.timestamp).toBeDefined();
        expect(new Date(apiError.error.timestamp)).toBeInstanceOf(Date);
      });
    });

    describe("createValidationError", () => {
      test("should create valid validation error", () => {
        const validationError = createValidationError(
          [
            {
              field: "email",
              value: "invalid-email",
              message: "Invalid email format",
              code: "INVALID_EMAIL",
            },
            {
              field: "password",
              value: "weak",
              message: "Password too weak",
            },
          ],
          "req_123"
        );

        expect(() => ValidationErrorResponseSchema.parse(validationError)).not.toThrow();
        expect(validationError.error.errors).toHaveLength(2);
        expect(validationError.error.errorCount).toBe(2);
        expect(validationError.error.requestId).toBe("req_123");
      });

      test("should include timestamp", () => {
        const validationError = createValidationError([
          {
            field: "username",
            value: "",
            message: "Username is required",
          },
        ]);

        expect(validationError.error.timestamp).toBeDefined();
        expect(new Date(validationError.error.timestamp)).toBeInstanceOf(Date);
      });
    });

    describe("createBusinessLogicError", () => {
      test("should create valid business logic error", () => {
        const businessError = createBusinessLogicError(
          "reservation_conflict",
          "Time slot already booked",
          "The selected time slot is no longer available.",
          {
            businessRule: "time_slot_uniqueness",
            resourceId: "slot_123",
            resourceType: "reservation",
            suggestedAction: "Choose a different time slot",
            requestId: "req_123",
          }
        );

        expect(() => BusinessLogicErrorSchema.parse(businessError)).not.toThrow();
        expect(businessError.error.type).toBe("reservation_conflict");
        expect(businessError.error.businessRule).toBe("time_slot_uniqueness");
        expect(businessError.error.resourceType).toBe("reservation");
        expect(businessError.error.requestId).toBe("req_123");
      });

      test("should include timestamp", () => {
        const businessError = createBusinessLogicError(
          "quota_exceeded",
          "Download quota exceeded",
          "You've reached your download limit."
        );

        expect(businessError.error.timestamp).toBeDefined();
        expect(new Date(businessError.error.timestamp)).toBeInstanceOf(Date);
      });
    });
  });

  describe("Error Mapping Utilities", () => {
    describe("getHttpStatusForErrorType", () => {
      test("should return correct status codes for authentication errors", () => {
        expect(getHttpStatusForErrorType("invalid_credentials")).toBe(401);
        expect(getHttpStatusForErrorType("session_expired")).toBe(401);
        expect(getHttpStatusForErrorType("two_factor_required")).toBe(401);
      });

      test("should return correct status codes for authorization errors", () => {
        expect(getHttpStatusForErrorType("insufficient_permissions")).toBe(403);
        expect(getHttpStatusForErrorType("resource_forbidden")).toBe(403);
        expect(getHttpStatusForErrorType("account_locked")).toBe(403);
      });

      test("should return correct status codes for validation errors", () => {
        expect(getHttpStatusForErrorType("invalid_input")).toBe(400);
        expect(getHttpStatusForErrorType("missing_required_field")).toBe(400);
        expect(getHttpStatusForErrorType("format_error")).toBe(400);
      });

      test("should return correct status codes for payment errors", () => {
        expect(getHttpStatusForErrorType("subscription_required")).toBe(402);
        expect(getHttpStatusForErrorType("payment_failed")).toBe(422);
        expect(getHttpStatusForErrorType("card_declined")).toBe(422);
      });

      test("should return correct status codes for business logic errors", () => {
        expect(getHttpStatusForErrorType("beat_not_available")).toBe(404);
        expect(getHttpStatusForErrorType("license_conflict")).toBe(409);
        expect(getHttpStatusForErrorType("reservation_conflict")).toBe(409);
      });

      test("should return 500 for unknown error types", () => {
        expect(getHttpStatusForErrorType("unknown_error" as never)).toBe(500);
      });

      test("should return correct status codes for system errors", () => {
        expect(getHttpStatusForErrorType("internal_server_error")).toBe(500);
        expect(getHttpStatusForErrorType("service_unavailable")).toBe(503);
        expect(getHttpStatusForErrorType("timeout")).toBe(504);
      });
    });

    describe("getUserMessageForErrorType", () => {
      test("should return user-friendly messages for authentication errors", () => {
        expect(getUserMessageForErrorType("invalid_credentials")).toBe(
          "Invalid email or password. Please try again."
        );
        expect(getUserMessageForErrorType("session_expired")).toBe(
          "Your session has expired. Please log in again."
        );
      });

      test("should return user-friendly messages for payment errors", () => {
        expect(getUserMessageForErrorType("payment_failed")).toBe(
          "Payment could not be processed. Please check your payment method."
        );
        expect(getUserMessageForErrorType("subscription_required")).toBe(
          "This feature requires an active subscription."
        );
      });

      test("should return user-friendly messages for business logic errors", () => {
        expect(getUserMessageForErrorType("beat_not_available")).toBe(
          "This beat is no longer available for purchase."
        );
        expect(getUserMessageForErrorType("reservation_conflict")).toBe(
          "This time slot is no longer available. Please choose another time."
        );
      });

      test("should return generic message for unknown error types", () => {
        expect(getUserMessageForErrorType("unknown_error" as never)).toBe(
          "An unexpected error occurred. Please try again."
        );
      });

      test("should return user-friendly messages for file upload errors", () => {
        expect(getUserMessageForErrorType("file_too_large")).toBe(
          "File size exceeds the maximum limit of 50MB."
        );
        expect(getUserMessageForErrorType("audio_format_unsupported")).toBe(
          "Audio format not supported. Please use MP3, WAV, or AIFF."
        );
        expect(getUserMessageForErrorType("virus_detected")).toBe(
          "File failed security scan. Please ensure your file is safe."
        );
      });
    });
  });
});
