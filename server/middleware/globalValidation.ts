import { NextFunction, Request, Response } from "express";
import { z } from "zod";
import {
  createApiError,
  createValidationError,
  getUserMessageForErrorType,
} from "../../shared/validation/ErrorValidation";

// ================================
// GLOBAL VALIDATION MIDDLEWARE
// ================================

/**
 * Global request validation middleware
 * Adds request ID and basic security headers
 */
export const globalValidationMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
): void | Response => {
  try {
    // Generate or extract request ID
    const requestId =
      (req.headers["x-request-id"] as string) ||
      (req.headers["x-correlation-id"] as string) ||
      `req_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;

    // Add request ID to request object
    (req as Request & { requestId: string }).requestId = requestId;

    // Add security headers
    res.setHeader("X-Request-ID", requestId);
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader("X-XSS-Protection", "1; mode=block");

    // Validate request size (prevent DoS)
    const contentLength = parseInt(req.headers["content-length"] || "0", 10);
    const maxSize = 100 * 1024 * 1024; // 100MB max request size

    if (contentLength > maxSize) {
      const errorResponse = createApiError("file_too_large", "Request too large", {
        userMessage: "Request size exceeds maximum allowed limit",
        requestId,
      });
      return res.status(413).json(errorResponse);
    }

    // Basic input sanitization for common fields
    if (req.body && typeof req.body === "object") {
      sanitizeRequestBody(req.body);
    }

    if (req.query && typeof req.query === "object") {
      sanitizeRequestQuery(req.query);
    }

    next();
  } catch (error) {
    console.error("Global validation middleware error:", error);

    const errorResponse = createApiError("internal_server_error", "Request processing failed", {
      userMessage: "An error occurred while processing your request",
      requestId: (req as Request & { requestId?: string }).requestId || `req_${Date.now()}`,
    });

    res.status(500).json(errorResponse);
  }
};

/**
 * Sanitize request body recursively
 */
const sanitizeRequestBody = (obj: Record<string, unknown>): void => {
  if (!obj || typeof obj !== "object") return;

  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const value = obj[key];

      if (typeof value === "string") {
        // Basic XSS prevention
        obj[key] = value
          .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
          .replace(/javascript:/gi, "")
          .replace(/on\w+\s*=/gi, "")
          .trim();
      } else if (typeof value === "object" && value !== null) {
        sanitizeRequestBody(value as Record<string, unknown>);
      }
    }
  }
};

/**
 * Sanitize query parameters
 */
const sanitizeRequestQuery = (query: Record<string, unknown>): void => {
  for (const key in query) {
    if (Object.prototype.hasOwnProperty.call(query, key)) {
      const value = query[key];

      if (typeof value === "string") {
        query[key] = value
          .replace(/[<>]/g, "")
          .replace(/javascript:/gi, "")
          .trim();
      }
    }
  }
};

// ================================
// ROUTE-SPECIFIC VALIDATION
// ================================

/**
 * Validate API endpoints with business rules
 */
export const validateApiEndpoint = (
  allowedMethods: string[] = ["GET", "POST", "PUT", "PATCH", "DELETE"]
) => {
  return (req: Request, res: Response, next: NextFunction): void | Response => {
    try {
      const method = req.method.toUpperCase();

      // Check if method is allowed
      if (!allowedMethods.includes(method)) {
        const errorResponse = createApiError("invalid_input", "Method not allowed", {
          userMessage: `${method} method is not allowed for this endpoint`,
          requestId: (req as Request & { requestId?: string }).requestId,
        });
        return res.status(405).json(errorResponse);
      }

      // Validate Content-Type for POST/PUT/PATCH requests
      if (["POST", "PUT", "PATCH"].includes(method)) {
        const contentType = req.headers["content-type"];

        if (!contentType) {
          const errorResponse = createApiError("invalid_input", "Content-Type header required", {
            userMessage: "Content-Type header is required for this request",
            requestId: (req as Request & { requestId?: string }).requestId,
          });
          return res.status(400).json(errorResponse);
        }

        // Allow JSON and multipart/form-data
        const allowedTypes = [
          "application/json",
          "multipart/form-data",
          "application/x-www-form-urlencoded",
        ];

        const isValidContentType = allowedTypes.some(type =>
          contentType.toLowerCase().includes(type)
        );

        if (!isValidContentType) {
          const errorResponse = createApiError("invalid_input", "Invalid Content-Type", {
            userMessage: "Content-Type must be application/json or multipart/form-data",
            requestId: (req as Request & { requestId?: string }).requestId,
          });
          return res.status(400).json(errorResponse);
        }
      }

      next();
    } catch (error) {
      console.error("API endpoint validation error:", error);

      const errorResponse = createApiError("internal_server_error", "Endpoint validation failed", {
        userMessage: "An error occurred while validating the request",
        requestId: (req as Request & { requestId?: string }).requestId,
      });

      res.status(500).json(errorResponse);
    }
  };
};

// ================================
// BUSINESS RULE VALIDATION
// ================================

/**
 * Validate BroLab-specific business rules
 */
export const validateBusinessRules = (rules: {
  requireAuth?: boolean;
  requireSubscription?: boolean;
  allowedRoles?: string[];
  rateLimit?: {
    windowMs: number;
    maxRequests: number;
  };
}) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void | Response> => {
    try {
      const requestId = (req as Request & { requestId?: string }).requestId;
      const user = (
        req as Request & { user?: { role?: string; subscription?: { status: string } } }
      ).user;

      // Check authentication requirement
      if (rules.requireAuth && !user) {
        const errorResponse = createApiError("invalid_credentials", "Authentication required", {
          userMessage: getUserMessageForErrorType("invalid_credentials"),
          requestId,
        });
        return res.status(401).json(errorResponse);
      }

      // Check role permissions
      if (rules.allowedRoles && user) {
        const userRole = user.role || "user";
        if (!rules.allowedRoles.includes(userRole)) {
          const errorResponse = createApiError(
            "insufficient_permissions",
            "Insufficient permissions",
            {
              userMessage: getUserMessageForErrorType("insufficient_permissions"),
              requestId,
            }
          );
          return res.status(403).json(errorResponse);
        }
      }

      // Check subscription requirement
      if (rules.requireSubscription && user) {
        const subscription = user.subscription;
        if (!subscription || subscription.status !== "active") {
          const errorResponse = createApiError(
            "subscription_required",
            "Active subscription required",
            {
              userMessage: getUserMessageForErrorType("subscription_required"),
              requestId,
            }
          );
          return res.status(402).json(errorResponse);
        }
      }

      next();
    } catch (error) {
      console.error("Business rules validation error:", error);

      const errorResponse = createApiError(
        "internal_server_error",
        "Business rules validation failed",
        {
          userMessage: "An error occurred while checking permissions",
          requestId: (req as Request & { requestId?: string }).requestId,
        }
      );

      res.status(500).json(errorResponse);
    }
  };
};

// ================================
// ERROR HANDLING MIDDLEWARE
// ================================

/**
 * Global error handler for validation errors
 */
export const globalErrorHandler = (
  error: unknown,
  req: Request,
  res: Response,
  _next: NextFunction
): void | Response => {
  const requestId = (req as { requestId?: string }).requestId || `req_${Date.now()}`;

  // Handle Zod validation errors
  if (error instanceof z.ZodError) {
    const validationErrors = error.errors.map(err => ({
      field: err.path.join("."),
      value: "input" in err ? err.input : undefined,
      message: err.message,
      code: err.code,
    }));

    const errorResponse = createValidationError(validationErrors, requestId);
    return res.status(400).json(errorResponse);
  }

  // Handle known API errors
  if (
    error &&
    typeof error === "object" &&
    "type" in error &&
    "message" in error &&
    typeof error.type === "string" &&
    typeof error.message === "string"
  ) {
    const statusCode =
      "statusCode" in error && typeof error.statusCode === "number" ? error.statusCode : 500;
    const userMessage =
      "userMessage" in error && typeof error.userMessage === "string"
        ? error.userMessage
        : getUserMessageForErrorType(error.type as any);
    const context =
      "context" in error && typeof error.context === "object"
        ? (error.context as Record<string, unknown>)
        : undefined;

    const errorResponse = createApiError(
      error.type as any, // TODO: Improve error type handling
      error.message,
      {
        userMessage,
        requestId,
        context,
      }
    );
    return res.status(statusCode).json(errorResponse);
  }

  // Handle unknown errors
  console.error("Unhandled error:", error);

  const errorResponse = createApiError("internal_server_error", "An unexpected error occurred", {
    userMessage: "Something went wrong. Please try again later.",
    requestId,
  });

  res.status(500).json(errorResponse);
};

// ================================
// VALIDATION UTILITIES
// ================================

/**
 * Create a comprehensive validation chain
 */
export const createValidationChain = (options: {
  methods?: string[];
  requireAuth?: boolean;
  requireSubscription?: boolean;
  allowedRoles?: string[];
  bodySchema?: z.ZodSchema;
  querySchema?: z.ZodSchema;
  paramsSchema?: z.ZodSchema;
}) => {
  const middlewares: Array<(req: Request, res: Response, next: NextFunction) => void> = [];

  // Add global validation
  middlewares.push(globalValidationMiddleware);

  // Add API endpoint validation
  if (options.methods) {
    middlewares.push(validateApiEndpoint(options.methods));
  }

  // Add business rules validation
  if (options.requireAuth || options.requireSubscription || options.allowedRoles) {
    middlewares.push(
      validateBusinessRules({
        requireAuth: options.requireAuth,
        requireSubscription: options.requireSubscription,
        allowedRoles: options.allowedRoles,
      })
    );
  }

  // Schema validations would need to be imported properly
  // TODO: Replace require() with proper ES6 imports when validation module is available

  return middlewares;
};

export default {
  globalValidationMiddleware,
  validateApiEndpoint,
  validateBusinessRules,
  globalErrorHandler,
  createValidationChain,
};
