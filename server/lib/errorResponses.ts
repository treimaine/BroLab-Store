/**
 * Error Response Utilities for BroLab Entertainment API
 *
 * This module provides utility functions for creating consistent, typed error responses
 * across all API endpoints, replacing inconsistent error handling patterns.
 */

import { Response } from "express";
import { HTTP_STATUS } from "../../shared/constants/HttpStatus";
import { BroLabErrorType } from "../../shared/types/Error";
import {
  AuthErrorResponse,
  BusinessErrorResponse,
  ErrorResponse,
  ExternalServiceErrorResponse,
  FileUploadErrorResponse,
  RateLimitErrorResponse,
  ValidationErrorResponse,
} from "../../shared/types/api";

/**
 * Base error response creator
 */
function createErrorResponse(
  type: BroLabErrorType,
  message: string,
  statusCode: number,
  code?: string,
  details?: Record<string, unknown>,
  requestId?: string
): ErrorResponse {
  return {
    error: {
      type,
      message,
      code: code || type.toUpperCase(),
      details,
    },
    timestamp: Date.now(),
    requestId,
  };
}

/**
 * Send a standardized error response
 */
export function sendErrorResponse(
  res: Response,
  type: BroLabErrorType,
  message: string,
  statusCode: number,
  code?: string,
  details?: Record<string, unknown>,
  requestId?: string
): void {
  const errorResponse = createErrorResponse(type, message, statusCode, code, details, requestId);
  res.status(statusCode).json(errorResponse);
}

/**
 * Validation error response
 */
export function sendValidationError(
  res: Response,
  errors: Array<{ field: string; message: string; code: string }>,
  requestId?: string
): void {
  const response: ValidationErrorResponse = {
    success: false,
    error: {
      type: BroLabErrorType.VALIDATION_ERROR,
      message: "Request validation failed",
      code: "VALIDATION_ERROR",
      details: {
        errors,
        invalidFields: errors.map(e => e.field),
      },
    },
    timestamp: Date.now(),
    requestId,
  };

  res.status(HTTP_STATUS.BAD_REQUEST).json(response);
}

/**
 * Authentication error responses
 */
export function sendAuthError(
  res: Response,
  type: BroLabErrorType.UNAUTHORIZED | BroLabErrorType.FORBIDDEN | BroLabErrorType.SESSION_EXPIRED,
  message?: string,
  details?: {
    requiredPermissions?: string[];
    userPermissions?: string[];
    sessionExpiresAt?: number;
  },
  requestId?: string
): void {
  const statusCode =
    type === BroLabErrorType.FORBIDDEN ? HTTP_STATUS.FORBIDDEN : HTTP_STATUS.UNAUTHORIZED;
  const defaultMessage =
    type === BroLabErrorType.FORBIDDEN
      ? "Access forbidden"
      : type === BroLabErrorType.SESSION_EXPIRED
        ? "Session expired"
        : "Authentication required";

  const response: AuthErrorResponse = {
    success: false,
    error: {
      type,
      message: message || defaultMessage,
      code: type.toUpperCase(),
      details,
    },
    timestamp: Date.now(),
    requestId,
  };

  res.status(statusCode).json(response);
}

/**
 * Business logic error responses
 */
export function sendBusinessError(
  res: Response,
  type:
    | BroLabErrorType.BEAT_NOT_FOUND
    | BroLabErrorType.DOWNLOAD_QUOTA_EXCEEDED
    | BroLabErrorType.PAYMENT_FAILED
    | BroLabErrorType.BOOKING_CONFLICT,
  message: string,
  details?: {
    resourceId?: string | number;
    quota?: { used: number; limit: number; resetDate?: string };
    paymentDetails?: {
      paymentIntentId?: string;
      failureReason?: string;
      suggestedActions?: string[];
    };
    conflictDetails?: {
      conflictingBookingId?: string;
      suggestedAlternatives?: Array<{ date: string; time: string; available: boolean }>;
    };
  },
  requestId?: string
): void {
  const statusCode =
    type === BroLabErrorType.BEAT_NOT_FOUND
      ? 404
      : type === BroLabErrorType.DOWNLOAD_QUOTA_EXCEEDED
        ? 429
        : type === BroLabErrorType.PAYMENT_FAILED
          ? 402
          : type === BroLabErrorType.BOOKING_CONFLICT
            ? 409
            : 400;

  const response: BusinessErrorResponse = {
    success: false,
    error: {
      type,
      message,
      code: type.toUpperCase(),
      details,
    },
    timestamp: Date.now(),
    requestId,
  };

  res.status(statusCode).json(response);
}

/**
 * Rate limiting error response
 */
export function sendRateLimitError(
  res: Response,
  limit: number,
  remaining: number,
  resetTime: number,
  retryAfter: number,
  requestId?: string
): void {
  const response: RateLimitErrorResponse = {
    success: false,
    error: {
      type: BroLabErrorType.RATE_LIMIT_EXCEEDED,
      message: "Rate limit exceeded",
      code: "RATE_LIMIT_EXCEEDED",
      details: {
        limit,
        remaining,
        resetTime,
        retryAfter,
      },
    },
    timestamp: Date.now(),
    requestId,
  };

  // Set rate limit headers
  res.set({
    "X-RateLimit-Limit": limit.toString(),
    "X-RateLimit-Remaining": remaining.toString(),
    "X-RateLimit-Reset": resetTime.toString(),
    "Retry-After": retryAfter.toString(),
  });

  res.status(429).json(response);
}

/**
 * File upload error responses
 */
export function sendFileUploadError(
  res: Response,
  type:
    | BroLabErrorType.FILE_TOO_LARGE
    | BroLabErrorType.FILE_TYPE_NOT_ALLOWED
    | BroLabErrorType.VIRUS_DETECTED
    | BroLabErrorType.UPLOAD_FAILED,
  message: string,
  details?: {
    fileSize?: number;
    maxFileSize?: number;
    uploadedFileType?: string;
    allowedFileTypes?: string[];
    scanResults?: {
      threatFound: boolean;
      threatName?: string;
      scanEngine?: string;
    };
  },
  requestId?: string
): void {
  const statusCode =
    type === BroLabErrorType.FILE_TOO_LARGE
      ? 413
      : type === BroLabErrorType.VIRUS_DETECTED
        ? 422
        : 400;

  const response: FileUploadErrorResponse = {
    success: false,
    error: {
      type,
      message,
      code: type.toUpperCase(),
      details,
    },
    timestamp: Date.now(),
    requestId,
  };

  res.status(statusCode).json(response);
}

/**
 * External service error response
 */
export function sendExternalServiceError(
  res: Response,
  serviceName: string,
  serviceStatusCode?: number,
  serviceErrorMessage?: string,
  isTemporary: boolean = true,
  estimatedRecoveryTime?: string,
  requestId?: string
): void {
  const response: ExternalServiceErrorResponse = {
    success: false,
    error: {
      type: BroLabErrorType.EXTERNAL_SERVICE_ERROR,
      message: `External service ${serviceName} is currently unavailable`,
      code: "EXTERNAL_SERVICE_ERROR",
      details: {
        serviceName,
        serviceStatusCode,
        serviceErrorMessage,
        isTemporary,
        estimatedRecoveryTime,
      },
    },
    timestamp: Date.now(),
    requestId,
  };

  res.status(503).json(response);
}

/**
 * Internal server error response
 */
export function sendInternalError(
  res: Response,
  message: string = "Internal server error",
  error?: Error,
  requestId?: string
): void {
  const response = createErrorResponse(
    BroLabErrorType.INTERNAL_ERROR,
    message,
    500,
    "INTERNAL_ERROR",
    {
      errorName: error?.name,
      // Only include stack trace in development
      ...(process.env.NODE_ENV === "development" && { stack: error?.stack }),
    },
    requestId
  );

  res.status(500).json(response);
}

/**
 * Not found error response
 */
export function sendNotFoundError(
  res: Response,
  resource: string = "Resource",
  resourceId?: string | number,
  requestId?: string
): void {
  const response = createErrorResponse(
    BroLabErrorType.NOT_FOUND,
    `${resource} not found`,
    404,
    "NOT_FOUND",
    { resourceId },
    requestId
  );

  res.status(404).json(response);
}

/**
 * Bad request error response
 */
export function sendBadRequestError(
  res: Response,
  message: string,
  details?: Record<string, unknown>,
  requestId?: string
): void {
  const response = createErrorResponse(
    BroLabErrorType.INVALID_INPUT,
    message,
    400,
    "BAD_REQUEST",
    details,
    requestId
  );

  res.status(400).json(response);
}

/**
 * Conflict error response
 */
export function sendConflictError(
  res: Response,
  message: string,
  details?: Record<string, unknown>,
  requestId?: string
): void {
  const response = createErrorResponse(
    BroLabErrorType.VALIDATION_ERROR,
    message,
    409,
    "CONFLICT",
    details,
    requestId
  );

  res.status(409).json(response);
}

/**
 * Maintenance mode error response
 */
export function sendMaintenanceError(
  res: Response,
  estimatedEndTime?: string,
  requestId?: string
): void {
  const response = createErrorResponse(
    BroLabErrorType.MAINTENANCE_MODE,
    "BroLab Entertainment is currently undergoing maintenance",
    503,
    "MAINTENANCE_MODE",
    { estimatedEndTime },
    requestId
  );

  res.status(503).json(response);
}

/**
 * Extract request ID from request object
 */
export function getRequestId(req: { requestId?: string } | any): string | undefined {
  return req?.requestId;
}

/**
 * Error response middleware for unhandled errors
 */
export function errorResponseMiddleware() {
  return (error: Error, req: any, res: Response, next: unknown) => {
    console.error("Unhandled error:", error);

    const requestId = getRequestId(req);

    // Handle specific error types
    if (error.name === "ValidationError") {
      return sendValidationError(
        res,
        [{ field: "unknown", message: error.message, code: "VALIDATION_ERROR" }],
        requestId
      );
    }

    if (error.name === "UnauthorizedError") {
      return sendAuthError(res, BroLabErrorType.UNAUTHORIZED, error.message, undefined, requestId);
    }

    // Default to internal server error
    sendInternalError(res, "An unexpected error occurred", error, requestId);
  };
}
