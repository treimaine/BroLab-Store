import { NextFunction, Request, Response } from "express";
import { ParsedQs } from "qs";
import { z } from "zod";
import { User } from "../../shared/types/User";
import {
  createApiError,
  createValidationError,
  getUserMessageForErrorType,
} from "../../shared/validation/ErrorValidation";
import { AuthenticatedRequest } from "../types/express";

// ================================
// VALIDATION MIDDLEWARE
// ================================

/**
 * Enhanced validation middleware with comprehensive error handling
 */
export const createValidationMiddleware = <T extends z.ZodSchema>(
  schema: T,
  source: "body" | "query" | "params" = "body"
) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void | Response> => {
    try {
      const requestId =
        (req.headers["x-request-id"] as string) ||
        (req.headers["x-correlation-id"] as string) ||
        `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Get data from the specified source
      const data = source === "body" ? req.body : source === "query" ? req.query : req.params;

      // Validate the data
      const result = await schema.safeParseAsync(data);

      if (!result.success) {
        // Extract validation errors
        const validationErrors = result.error.errors.map(err => ({
          field: `${source}.${err.path.join(".")}`,
          value: "input" in err ? err.input : data,
          message: err.message,
          code: err.code,
        }));

        // Create standardized validation error response
        const errorResponse = createValidationError(validationErrors, requestId);

        // Log validation error for monitoring
        console.warn(`Validation failed for ${req.method} ${req.path}:`, {
          requestId,
          source,
          errors: validationErrors,
          userAgent: req.headers["user-agent"],
          ip: req.ip,
        });

        return res.status(400).json(errorResponse);
      }

      // Replace the source data with validated and transformed data
      if (source === "body") {
        req.body = result.data;
      } else if (source === "query") {
        req.query = result.data as ParsedQs;
      } else {
        req.params = result.data;
      }

      // Add request ID to request for tracking
      (req as AuthenticatedRequest).requestId = requestId;

      next();
    } catch (error) {
      console.error("Validation middleware error:", error);

      const errorResponse = createApiError(
        "internal_server_error",
        "Validation processing failed",
        {
          userMessage: "An error occurred while processing your request",
          requestId: (req as AuthenticatedRequest).requestId,
        }
      );

      res.status(500).json(errorResponse);
    }
  };
};

/**
 * Validate request body
 */
export const validateBody = <T extends z.ZodSchema>(schema: T) => {
  return createValidationMiddleware(schema, "body");
};

/**
 * Validate query parameters
 */
export const validateQuery = <T extends z.ZodSchema>(schema: T) => {
  return createValidationMiddleware(schema, "query");
};

/**
 * Validate route parameters
 */
export const validateParams = <T extends z.ZodSchema>(schema: T) => {
  return createValidationMiddleware(schema, "params");
};

// ================================
// BUSINESS VALIDATION MIDDLEWARE
// ================================

/**
 * Validate file uploads with business rules
 */
export const validateFileUpload = (
  options: {
    maxSize?: number;
    allowedTypes?: string[];
    required?: boolean;
  } = {}
) => {
  const {
    maxSize = 50 * 1024 * 1024, // 50MB default
    allowedTypes = [
      "audio/mpeg",
      "audio/wav",
      "audio/mp3",
      "audio/aiff",
      "image/jpeg",
      "image/png",
      "image/gif",
      "application/pdf",
      "application/zip",
    ],
    required = true,
  } = options;

  return (req: Request, res: Response, next: NextFunction): void | Response => {
    try {
      const file = req.file;
      const requestId = (req as AuthenticatedRequest).requestId || `req_${Date.now()}`;

      // Check if file is required
      if (required && !file) {
        const errorResponse = createValidationError(
          [
            {
              field: "file",
              value: null,
              message: "File is required",
            },
          ],
          requestId
        );

        return res.status(400).json(errorResponse);
      }

      // If file is not required and not provided, continue
      if (!required && !file) {
        return next();
      }

      if (file) {
        const errors: Array<{ field: string; value: unknown; message: string }> = [];

        // Validate file size
        if (file.size > maxSize) {
          errors.push({
            field: "file.size",
            value: file.size,
            message: `File size ${(file.size / 1024 / 1024).toFixed(2)}MB exceeds maximum ${(maxSize / 1024 / 1024).toFixed(2)}MB`,
          });
        }

        // Validate file type
        if (!allowedTypes.includes(file.mimetype)) {
          errors.push({
            field: "file.type",
            value: file.mimetype,
            message: `File type ${file.mimetype} is not allowed. Allowed types: ${allowedTypes.join(", ")}`,
          });
        }

        // Validate filename
        if (!file.originalname || file.originalname.length === 0) {
          errors.push({
            field: "file.name",
            value: file.originalname,
            message: "File must have a valid name",
          });
        }

        // Check for dangerous file extensions
        const dangerousExtensions = [".exe", ".bat", ".cmd", ".scr", ".com", ".pif", ".js", ".vbs"];
        const fileExtension = file.originalname.toLowerCase().split(".").pop();
        if (fileExtension && dangerousExtensions.includes(`.${fileExtension}`)) {
          errors.push({
            field: "file.extension",
            value: fileExtension,
            message: "File type not allowed for security reasons",
          });
        }

        if (errors.length > 0) {
          const errorResponse = createValidationError(errors, requestId);
          return res.status(400).json(errorResponse);
        }
      }

      next();
    } catch (error) {
      console.error("File validation error:", error);

      const errorResponse = createApiError("internal_server_error", "File validation failed", {
        userMessage: "An error occurred while validating your file",
        requestId: (req as AuthenticatedRequest).requestId,
      });

      res.status(500).json(errorResponse);
    }
  };
};

/**
 * Validate user permissions for resource access
 */
export const validatePermissions = (
  requiredRole: string,
  resourceCheck?: (req: Request) => Promise<boolean>
) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void | Response> => {
    try {
      const user = (req as AuthenticatedRequest).user as unknown as User;
      const requestId = (req as AuthenticatedRequest).requestId || `req_${Date.now()}`;

      if (!user) {
        const errorResponse = createApiError("invalid_credentials", "Authentication required", {
          userMessage: getUserMessageForErrorType("invalid_credentials"),
          requestId,
        });

        return res.status(401).json(errorResponse);
      }

      // Check role permissions
      const roleHierarchy: Record<string, number> = {
        user: 0,
        producer: 1,
        moderator: 2,
        admin: 3,
        service_role: 4,
      };

      const userLevel = roleHierarchy[user.role || "user"] ?? -1;
      const requiredLevel = roleHierarchy[requiredRole] ?? 999;

      if (userLevel < requiredLevel) {
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

      // Additional resource-specific check
      if (resourceCheck) {
        const hasAccess = await resourceCheck(req);
        if (!hasAccess) {
          const errorResponse = createApiError(
            "resource_forbidden",
            "Access to this resource is forbidden",
            {
              userMessage: "You do not have permission to access this resource",
              requestId,
            }
          );

          return res.status(403).json(errorResponse);
        }
      }

      next();
    } catch (error) {
      console.error("Permission validation error:", error);

      const errorResponse = createApiError(
        "internal_server_error",
        "Permission validation failed",
        {
          userMessage: "An error occurred while checking permissions",
          requestId: (req as AuthenticatedRequest).requestId,
        }
      );

      res.status(500).json(errorResponse);
    }
  };
};

/**
 * Validate subscription quota
 */
export const validateSubscriptionQuota = (
  quotaType: "downloads" | "uploads" | "api_calls",
  requiredAmount: number = 1
) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void | Response> => {
    try {
      const user = (req as AuthenticatedRequest).user as unknown as User;
      const requestId = (req as AuthenticatedRequest).requestId || `req_${Date.now()}`;

      if (!user || !user.subscription) {
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

      const subscription = user.subscription;

      // Check if subscription is active
      if (subscription.status !== "active") {
        const errorResponse = createApiError("subscription_expired", "Subscription is not active", {
          userMessage: "Your subscription has expired. Please renew to continue.",
          requestId,
        });

        return res.status(402).json(errorResponse);
      }

      // Check quota based on type
      let hasQuota = true;
      let quotaMessage = "";

      switch (quotaType) {
        case "downloads":
          if (!user.quota.unlimited) {
            const remaining = user.quota.downloadsRemaining;
            hasQuota = remaining >= requiredAmount;
            quotaMessage = `Download quota exceeded. ${remaining} downloads remaining.`;
          }
          break;
        // Add other quota types as needed
      }

      if (!hasQuota) {
        const errorResponse = createApiError("quota_exceeded", "Quota exceeded", {
          userMessage: quotaMessage || getUserMessageForErrorType("quota_exceeded"),
          requestId,
        });

        return res.status(429).json(errorResponse);
      }

      next();
    } catch (error) {
      console.error("Quota validation error:", error);

      const requestId = (req as AuthenticatedRequest).requestId || `req_${Date.now()}`;
      const errorResponse = createApiError("internal_server_error", "Quota validation failed", {
        userMessage: "An error occurred while checking your quota",
        requestId,
      });

      res.status(500).json(errorResponse);
    }
  };
};

// ================================
// VALIDATION UTILITIES
// ================================

/**
 * Sanitize and validate user input
 */
export const sanitizeInput = (input: string, maxLength: number = 1000): string => {
  if (!input || typeof input !== "string") return "";

  return input
    .trim()
    .replace(/[<>]/g, "") // Remove HTML brackets
    .replace(/javascript:/gi, "") // Remove javascript: protocol
    .replace(/on\w+=/gi, "") // Remove event handlers
    .slice(0, maxLength); // Limit length
};

/**
 * Validate and normalize email
 */
export const normalizeEmail = (email: string): string => {
  return email.toLowerCase().trim();
};

/**
 * Generate request ID for tracking
 */
export const generateRequestId = (): string => {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

// ================================
// TYPE EXPORTS
// ================================

export interface ValidationMiddleware {
  (req: Request, res: Response, next: NextFunction): void | Promise<void>;
}

export interface ValidationOptions {
  maxSize?: number;
  allowedTypes?: string[];
  required?: boolean;
}
