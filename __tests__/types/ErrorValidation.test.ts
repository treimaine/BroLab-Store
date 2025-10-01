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

describe(_"Error Validation Tests", _() => {
  describe(_"ErrorSeverity Validation", _() => {
    test(_"should accept valid error severities", _() => {
      const validSeverities = ["low", "medium", "high", "critical"];

      validSeverities.forEach(severity => {
        expect_(() => ErrorSeverity.parse(severity)).not.toThrow();
      });
    });

    test(_"should reject invalid error severities", _() => {
      const invalidSeverities = ["info", "warning", "error", "", "invalid-severity"];

      invalidSeverities.forEach(severity => {
        expect_(() => ErrorSeverity.parse(severity)).toThrow();
      });
    });
  });

  describe(_"ErrorCategory Validation", _() => {
    test(_"should accept valid error categories", _() => {
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

      validCategories.forEach(category => {
        expect_(() => ErrorCategory.parse(category)).not.toThrow();
      });
    });

    test(_"should reject invalid error categories", _() => {
      const invalidCategories = ["ui", "frontend", "backend", "", "invalid-category"];

      invalidCategories.forEach(category => {
        expect_(() => ErrorCategory.parse(category)).toThrow();
      });
    });
  });

  describe(_"ErrorType Validation", _() => {
    test(_"should accept valid authentication error types", _() => {
      const authErrors = [
        "invalid_credentials",
        "account_locked",
        "session_expired",
        "two_factor_required",
      ];

      authErrors.forEach(errorType => {
        expect_(() => ErrorType.parse(errorType)).not.toThrow();
      });
    });

    test(_"should accept valid authorization error types", _() => {
      const authzErrors = [
        "insufficient_permissions",
        "resource_forbidden",
        "subscription_required",
        "quota_exceeded",
      ];

      authzErrors.forEach(errorType => {
        expect_(() => ErrorType.parse(errorType)).not.toThrow();
      });
    });

    test(_"should accept valid payment error types", _() => {
      const paymentErrors = [
        "payment_failed",
        "insufficient_funds",
        "card_declined",
        "payment_method_invalid",
        "subscription_expired",
      ];

      paymentErrors.forEach(errorType => {
        expect_(() => ErrorType.parse(errorType)).not.toThrow();
      });
    });

    test(_"should accept valid audio processing error types", _() => {
      const audioErrors = [
        "audio_format_unsupported",
        "audio_file_corrupted",
        "processing_timeout",
        "waveform_generation_failed",
      ];

      audioErrors.forEach(errorType => {
        expect_(() => ErrorType.parse(errorType)).not.toThrow();
      });
    });

    test(_"should accept valid business logic error types", _() => {
      const businessErrors = [
        "beat_not_available",
        "license_conflict",
        "reservation_conflict",
        "order_processing_failed",
      ];

      businessErrors.forEach(errorType => {
        expect_(() => ErrorType.parse(errorType)).not.toThrow();
      });
    });

    test(_"should reject invalid error types", _() => {
      const invalidTypes = ["unknown_error", "custom_error", "", "invalid-type"];

      invalidTypes.forEach(errorType => {
        expect_(() => ErrorType.parse(errorType)).toThrow();
      });
    });
  });

  describe(_"ErrorContext Schema Validation", _() => {
    test(_"should accept valid error context", _() => {
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

      expect_(() => ErrorContextSchema.parse(validContext)).not.toThrow();
    });

    test(_"should accept empty error context", _() => {
      const emptyContext = {};
      expect_(() => ErrorContextSchema.parse(emptyContext)).not.toThrow();
    });

    test(_"should reject invalid IP address", _() => {
      const invalidContext = {
        ipAddress: "invalid-ip-address",
      };

      expect_(() => ErrorContextSchema.parse(invalidContext)).toThrow();
    });

    test(_"should reject invalid HTTP method", _() => {
      const invalidContext = {
        method: "INVALID",
      };

      expect_(() => ErrorContextSchema.parse(invalidContext)).toThrow();
    });

    test(_"should reject invalid status code", _() => {
      const invalidContext = {
        statusCode: 999, // Invalid HTTP status code
      };

      expect_(() => ErrorContextSchema.parse(invalidContext)).toThrow();
    });
  });

  describe(_"ErrorResolution Schema Validation", _() => {
    test(_"should accept valid error resolution", _() => {
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

      expect_(() => ErrorResolutionSchema.parse(validResolution)).not.toThrow();
    });

    test(_"should require user message", _() => {
      const invalidResolution = {
        userMessage: "", // Empty message
      };

      expect_(() => ErrorResolutionSchema.parse(invalidResolution)).toThrow(
        "User message is required"
      );
    });

    test(_"should apply default values", _() => {
      const minimalResolution = {
        userMessage: "An error occurred",
      };

      const result = ErrorResolutionSchema.parse(minimalResolution);
      expect(result.retryable).toBe(false);
      expect(result.requiresSupport).toBe(false);
      expect(result.escalationLevel).toBe("none");
    });

    test(_"should reject invalid documentation URL", _() => {
      const invalidResolution = {
        userMessage: "An error occurred",
        documentationUrl: "not-a-valid-url",
      };

      expect_(() => ErrorResolutionSchema.parse(invalidResolution)).toThrow();
    });

    test(_"should reject negative retry after", _() => {
      const invalidResolution = {
        userMessage: "An error occurred",
        retryAfter: -100, // Negative value
      };

      expect_(() => ErrorResolutionSchema.parse(invalidResolution)).toThrow();
    });
  });

  describe(_"Complete Error Schema Validation", _() => {
    test(_"should accept valid complete error", _() => {
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

      expect_(() => ErrorSchema.parse(validError)).not.toThrow();
    });

    test(_"should apply default values", _() => {
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

    test(_"should reject error without required fields", _() => {
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

      expect_(() => ErrorSchema.parse(invalidError)).toThrow("Error message is required");
    });
  });

  describe(_"ApiErrorResponse Schema Validation", _() => {
    test(_"should accept valid API error response", _() => {
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

      expect_(() => ApiErrorResponseSchema.parse(validApiError)).not.toThrow();
    });

    test(_"should accept API error without debug information", _() => {
      const apiErrorWithoutDebug = {
        error: {
          type: "beat_not_available" as const,
          message: "Beat is no longer available",
          requestId: "req_1234567890",
          timestamp: new Date().toISOString(),
        },
      };

      expect_(() => ApiErrorResponseSchema.parse(apiErrorWithoutDebug)).not.toThrow();
    });
  });

  describe(_"ValidationError Schema Validation", _() => {
    test(_"should accept valid validation error", _() => {
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

      expect_(() => ValidationErrorSchema.parse(validValidationError)).not.toThrow();
    });

    test(_"should reject validation error without field name", _() => {
      const invalidValidationError = {
        field: "", // Empty field name
        value: "test",
        message: "Field is required",
      };

      expect_(() => ValidationErrorSchema.parse(invalidValidationError)).toThrow(
        "Field name is required"
      );
    });

    test(_"should reject validation error without message", _() => {
      const invalidValidationError = {
        field: "username",
        value: "test",
        message: "", // Empty message
      };

      expect_(() => ValidationErrorSchema.parse(invalidValidationError)).toThrow(
        "Validation message is required"
      );
    });
  });

  describe(_"ValidationErrorResponse Schema Validation", _() => {
    test(_"should accept valid validation error response", _() => {
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

      expect_(() => ValidationErrorResponseSchema.parse(validValidationResponse)).not.toThrow();
    });

    test(_"should reject validation response without errors", _() => {
      const invalidValidationResponse = {
        error: {
          type: "validation_error" as const,
          message: "Validation failed",
          errors: [], // Empty errors array
          errorCount: 0,
          timestamp: new Date().toISOString(),
        },
      };

      expect_(() => ValidationErrorResponseSchema.parse(invalidValidationResponse)).toThrow(
        "At least one validation error required"
      );
    });
  });

  describe(_"RateLimitError Schema Validation", _() => {
    test(_"should accept valid rate limit error", _() => {
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

      expect_(() => RateLimitErrorSchema.parse(validRateLimitError)).not.toThrow();
    });

    test(_"should apply default message", _() => {
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

  describe(_"BusinessLogicError Schema Validation", _() => {
    test(_"should accept valid business logic error", _() => {
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

      expect_(() => BusinessLogicErrorSchema.parse(validBusinessError)).not.toThrow();
    });

    test(_"should accept business error with minimal fields", _() => {
      const minimalBusinessError = {
        error: {
          type: "reservation_conflict" as const,
          message: "Time slot is no longer available",
          userMessage: "The selected time slot is no longer available. Please choose another time.",
          timestamp: new Date().toISOString(),
        },
      };

      expect_(() => BusinessLogicErrorSchema.parse(minimalBusinessError)).not.toThrow();
    });
  });

  describe(_"Error Creation Utilities", _() => {
    describe(_"createApiError", _() => {
      test(_"should create valid API error", _() => {
        const apiError = createApiError("beat_not_available", "Beat with ID 123 not found", {
          code: "BEAT_NOT_FOUND",
          userMessage: "This beat is no longer available.",
          userAction: "Browse other beats",
          supportCode: "BEAT_001",
          requestId: "req_123",
        });

        expect_(() => ApiErrorResponseSchema.parse(apiError)).not.toThrow();
        expect(apiError.error.type).toBe("beat_not_available");
        expect(apiError.error.message).toBe("Beat with ID 123 not found");
        expect(apiError.error.code).toBe("BEAT_NOT_FOUND");
        expect(apiError.error.userMessage).toBe("This beat is no longer available.");
        expect(apiError.error.requestId).toBe("req_123");
      });

      test(_"should use message as userMessage when not provided", _() => {
        const apiError = createApiError("internal_server_error", "Database connection failed");

        expect(apiError.error.userMessage).toBe("Database connection failed");
      });

      test(_"should include timestamp", _() => {
        const apiError = createApiError("timeout", "Request timed out");

        expect(apiError.error.timestamp).toBeDefined();
        expect(new Date(apiError.error.timestamp)).toBeInstanceOf(Date);
      });
    });

    describe(_"createValidationError", _() => {
      test(_"should create valid validation error", _() => {
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

        expect_(() => ValidationErrorResponseSchema.parse(validationError)).not.toThrow();
        expect(validationError.error.errors).toHaveLength(2);
        expect(validationError.error.errorCount).toBe(2);
        expect(validationError.error.requestId).toBe("req_123");
      });

      test(_"should include timestamp", _() => {
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

    describe(_"createBusinessLogicError", _() => {
      test(_"should create valid business logic error", _() => {
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

        expect_(() => BusinessLogicErrorSchema.parse(businessError)).not.toThrow();
        expect(businessError.error.type).toBe("reservation_conflict");
        expect(businessError.error.businessRule).toBe("time_slot_uniqueness");
        expect(businessError.error.resourceType).toBe("reservation");
        expect(businessError.error.requestId).toBe("req_123");
      });

      test(_"should include timestamp", _() => {
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

  describe(_"Error Mapping Utilities", _() => {
    describe(_"getHttpStatusForErrorType", _() => {
      test(_"should return correct status codes for authentication errors", _() => {
        expect(getHttpStatusForErrorType("invalid_credentials")).toBe(401);
        expect(getHttpStatusForErrorType("session_expired")).toBe(401);
        expect(getHttpStatusForErrorType("two_factor_required")).toBe(401);
      });

      test(_"should return correct status codes for authorization errors", _() => {
        expect(getHttpStatusForErrorType("insufficient_permissions")).toBe(403);
        expect(getHttpStatusForErrorType("resource_forbidden")).toBe(403);
        expect(getHttpStatusForErrorType("account_locked")).toBe(403);
      });

      test(_"should return correct status codes for validation errors", _() => {
        expect(getHttpStatusForErrorType("invalid_input")).toBe(400);
        expect(getHttpStatusForErrorType("missing_required_field")).toBe(400);
        expect(getHttpStatusForErrorType("format_error")).toBe(400);
      });

      test(_"should return correct status codes for payment errors", _() => {
        expect(getHttpStatusForErrorType("subscription_required")).toBe(402);
        expect(getHttpStatusForErrorType("payment_failed")).toBe(422);
        expect(getHttpStatusForErrorType("card_declined")).toBe(422);
      });

      test(_"should return correct status codes for business logic errors", _() => {
        expect(getHttpStatusForErrorType("beat_not_available")).toBe(404);
        expect(getHttpStatusForErrorType("license_conflict")).toBe(409);
        expect(getHttpStatusForErrorType("reservation_conflict")).toBe(409);
      });

      test(_"should return 500 for unknown error types", _() => {
        expect(getHttpStatusForErrorType("unknown_error" as any)).toBe(500);
      });

      test(_"should return correct status codes for system errors", _() => {
        expect(getHttpStatusForErrorType("internal_server_error")).toBe(500);
        expect(getHttpStatusForErrorType("service_unavailable")).toBe(503);
        expect(getHttpStatusForErrorType("timeout")).toBe(504);
      });
    });

    describe(_"getUserMessageForErrorType", _() => {
      test(_"should return user-friendly messages for authentication errors", _() => {
        expect(getUserMessageForErrorType("invalid_credentials")).toBe(
          "Invalid email or password. Please try again."
        );
        expect(getUserMessageForErrorType("session_expired")).toBe(
          "Your session has expired. Please log in again."
        );
      });

      test(_"should return user-friendly messages for payment errors", _() => {
        expect(getUserMessageForErrorType("payment_failed")).toBe(
          "Payment could not be processed. Please check your payment method."
        );
        expect(getUserMessageForErrorType("subscription_required")).toBe(
          "This feature requires an active subscription."
        );
      });

      test(_"should return user-friendly messages for business logic errors", _() => {
        expect(getUserMessageForErrorType("beat_not_available")).toBe(
          "This beat is no longer available for purchase."
        );
        expect(getUserMessageForErrorType("reservation_conflict")).toBe(
          "This time slot is no longer available. Please choose another time."
        );
      });

      test(_"should return generic message for unknown error types", _() => {
        expect(getUserMessageForErrorType("unknown_error" as any)).toBe(
          "An unexpected error occurred. Please try again."
        );
      });

      test(_"should return user-friendly messages for file upload errors", _() => {
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
