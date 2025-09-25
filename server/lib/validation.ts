/**
 * Request Validation Middleware for BroLab Entertainment API
 *
 * This module provides type-safe request validation middleware using Zod schemas
 * to ensure all API endpoints have proper request/response validation.
 */

import { NextFunction, Request, Response } from "express";
import { ZodError, ZodSchema, z } from "zod";
import { BroLabErrorType } from "../../shared/types/Error";
import { getRequestId, sendInternalError, sendValidationError } from "./errorResponses";

// Import business object validation schemas

/**
 * Validation error details
 */
interface ValidationErrorDetail {
  field: string;
  message: string;
  code: string;
}

/**
 * Create validation middleware for request body
 */
export function validateRequestBody<T>(schema: ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const validatedData = schema.parse(req.body);
      req.body = validatedData;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const validationErrors: ValidationErrorDetail[] = error.errors.map(err => ({
          field: err.path.join("."),
          message: err.message,
          code: err.code,
        }));

        return sendValidationError(res, validationErrors, getRequestId(req));
      }

      // Handle unexpected validation errors
      return sendInternalError(res, "Internal validation error", error as Error, getRequestId(req));
    }
  };
}

/**
 * Create validation middleware for query parameters
 */
export function validateRequestQuery<T>(schema: ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const validatedData = schema.parse(req.query);
      // Store validated data in a separate property to avoid type conflicts
      (req as any).validatedQuery = validatedData;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const validationErrors: ValidationErrorDetail[] = error.errors.map(err => ({
          field: err.path.join("."),
          message: err.message,
          code: err.code,
        }));

        return sendValidationError(res, validationErrors, getRequestId(req));
      }

      return sendInternalError(
        res,
        "Internal query validation error",
        error as Error,
        getRequestId(req)
      );
    }
  };
}

/**
 * Create validation middleware for URL parameters
 */
export function validateRequestParams<T>(schema: ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const validatedData = schema.parse(req.params);
      req.params = validatedData as Record<string, string>;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const validationErrors: ValidationErrorDetail[] = error.errors.map(err => ({
          field: err.path.join("."),
          message: err.message,
          code: err.code,
        }));

        return sendValidationError(res, validationErrors, getRequestId(req));
      }

      return sendInternalError(
        res,
        "Internal parameter validation error",
        error as Error,
        getRequestId(req)
      );
    }
  };
}

/**
 * Generic validation middleware factory
 */
export function createValidationMiddleware<T>(schema: ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const validatedData = schema.parse(req.method === "GET" ? req.query : req.body);
      // Store validated data in both places for compatibility
      if (req.method === "GET") {
        (req as any).validatedQuery = validatedData;
      } else {
        req.body = validatedData;
      }
      (req as any).validatedData = validatedData;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const validationErrors: ValidationErrorDetail[] = error.errors.map(err => ({
          field: err.path.join("."),
          message: err.message,
          code: err.code,
        }));

        return sendValidationError(res, validationErrors, getRequestId(req));
      }

      return sendInternalError(res, "Internal validation error", error as Error, getRequestId(req));
    }
  };
}

/**
 * Validate response data before sending (development/testing only)
 */
export function validateResponse<T>(schema: ZodSchema<T>, data: unknown): T {
  try {
    return schema.parse(data);
  } catch (error) {
    if (error instanceof ZodError) {
      console.error("Response validation failed:", error.errors);
      throw new Error(`Response validation failed: ${error.errors.map(e => e.message).join(", ")}`);
    }
    throw error;
  }
}

/**
 * Middleware to validate and format API responses
 */
export function formatApiResponse() {
  return (req: Request, res: Response, next: NextFunction) => {
    const originalJson = res.json;

    res.json = function (data: unknown) {
      // Ensure all responses follow the standard API response format
      const formattedResponse = {
        success: res.statusCode >= 200 && res.statusCode < 300,
        data: (data as { data?: unknown })?.data || data,
        error:
          (data as { error?: unknown })?.error ||
          (res.statusCode >= 400
            ? {
                type: BroLabErrorType.API_ERROR,
                message: (data as { message?: string })?.message || "An error occurred",
                code: `HTTP_${res.statusCode}`,
              }
            : undefined),
        message: (data as { message?: string })?.message,
        timestamp: Date.now(),
        requestId: getRequestId(req),
      };

      return originalJson.call(this, formattedResponse);
    };

    next();
  };
}

/**
 * Validation schemas for common parameters
 */
export const commonSchemas = {
  id: z.object({
    id: z.string().or(z.number().positive()),
  }),

  pagination: z.object({
    page: z.number().min(1).optional().default(1),
    limit: z.number().min(1).max(100).optional().default(20),
    offset: z.number().min(0).optional(),
  }),

  sorting: z.object({
    sortBy: z.string().optional(),
    sortOrder: z.enum(["asc", "desc"]).optional().default("desc"),
  }),

  dateRange: z.object({
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
  }),

  search: z.object({
    query: z.string().min(1).optional(),
    filters: z.record(z.unknown()).optional(),
  }),
};

/**
 * Combine multiple schemas
 */
export function combineSchemas<T extends Record<string, ZodSchema>>(schemas: T) {
  return z.object(schemas);
}

/**
 * Create a schema for optional fields
 */
export function makeOptional<T extends ZodSchema>(schema: T) {
  return schema.optional();
}

/**
 * Create a schema for partial objects (all fields optional)
 */
export function makePartial<T extends z.ZodRawShape>(schema: z.ZodObject<T>) {
  return schema.partial();
}

/**
 * Type-safe request handler wrapper
 */
export function createTypedHandler<TBody = unknown, TQuery = unknown, TParams = unknown>(
  bodySchema?: ZodSchema<TBody>,
  querySchema?: ZodSchema<TQuery>,
  paramsSchema?: ZodSchema<TParams>
) {
  return function (
    handler: (
      req: Request & {
        body: TBody;
        query: TQuery;
        params: TParams;
      },
      res: Response,
      next: NextFunction
    ) => Promise<void> | void
  ) {
    const middlewares: Array<(req: Request, res: Response, next: NextFunction) => void> = [];

    if (bodySchema) {
      middlewares.push(validateRequestBody(bodySchema));
    }
    if (querySchema) {
      middlewares.push(validateRequestQuery(querySchema));
    }
    if (paramsSchema) {
      middlewares.push(validateRequestParams(paramsSchema));
    }

    middlewares.push(handler as (req: Request, res: Response, next: NextFunction) => void);

    return middlewares;
  };
}

/**
 * Error handling middleware for validation errors
 */
export function handleValidationErrors() {
  return (error: Error, req: Request, res: Response, next: NextFunction) => {
    if (error instanceof ZodError) {
      const validationErrors: ValidationErrorDetail[] = error.errors.map(err => ({
        field: err.path.join("."),
        message: err.message,
        code: err.code,
      }));

      return sendValidationError(res, validationErrors, getRequestId(req));
    }

    next(error);
  };
}

// ================================
// BUSINESS OBJECT VALIDATION MIDDLEWARE
// ================================

/**
 * Business object validation middleware
 * Note: These are now handled by the shared validation middleware
 * Use validateBody, validateQuery, validateParams from shared/validation/index
 */

/**
 * File upload validation middleware
 */
export const validateFileUpload = (allowedTypes: string[], maxSize: number) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const files = req.files as Express.Multer.File[] | undefined;

    if (!files || files.length === 0) {
      return sendValidationError(
        res,
        [{ field: "files", message: "At least one file is required", code: "required" }],
        getRequestId(req)
      );
    }

    for (const file of files) {
      // Validate file type
      if (!allowedTypes.includes(file.mimetype)) {
        return sendValidationError(
          res,
          [
            {
              field: "files",
              message: `File type ${file.mimetype} is not allowed. Allowed types: ${allowedTypes.join(", ")}`,
              code: "invalid_type",
            },
          ],
          getRequestId(req)
        );
      }

      // Validate file size
      if (file.size > maxSize) {
        return sendValidationError(
          res,
          [
            {
              field: "files",
              message: `File size ${file.size} exceeds maximum allowed size of ${maxSize} bytes`,
              code: "file_too_large",
            },
          ],
          getRequestId(req)
        );
      }
    }

    next();
  };
};

/**
 * Audio file validation middleware
 */
export const validateAudioUpload = validateFileUpload(
  ["audio/mpeg", "audio/wav", "audio/flac", "audio/aiff"],
  100 * 1024 * 1024 // 100MB
);

/**
 * Image file validation middleware
 */
export const validateImageUpload = validateFileUpload(
  ["image/jpeg", "image/png", "image/gif", "image/webp"],
  10 * 1024 * 1024 // 10MB
);
