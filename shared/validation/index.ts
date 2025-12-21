/**
 * Centralized Validation Module
 *
 * This is the SINGLE SOURCE OF TRUTH for all validation schemas, functions,
 * and utilities used across the application (client, server, and Convex layers).
 *
 * Import from this module for all validation needs:
 * ```typescript
 * import { validateEmail, sanitizeInput, registerSchema } from '@shared/validation';
 * ```
 *
 * @module shared/validation
 */

// ================================
// VALIDATION FUNCTIONS (Single Source of Truth)
// ================================

export {
  BPM_RANGES,
  DEFAULT_ALLOWED_MIME_TYPES,
  VALID_ORDER_STATUSES,
  VALID_RESERVATION_STATUSES,
  VALID_SERVICE_TYPES,
  VALID_USER_ROLES,
  // Business logic validation
  validateBpmForGenre,
  // Clerk ID validation
  validateClerkId,
  validateClerkIdSafe,
  validateDuration,
  // Email validation
  validateEmail,
  // File validation
  validateFilePath,
  validateFileUpload,
  validateMimeType,
  // Status validation
  validateOrderStatus,
  validateOrderTotal,
  validatePassword,
  // Phone validation
  validatePhoneNumber,
  // Numeric validation
  validatePrice,
  validateReservationSlot,
  validateReservationStatus,
  validateServiceType,
  // UUID validation
  validateUUID,
  validateUserRole,
  type FileUploadInput,
  type FileUploadValidationResult,
  type OrderStatus,
  // Types
  type PasswordValidationResult,
  type ReservationStatus,
  type ServiceType,
  type UserRole,
} from "./validators";

// ================================
// SANITIZATION FUNCTIONS
// ================================

export {
  escapeHtml,
  sanitizeEmail,
  sanitizeFilename,
  sanitizeInput,
  sanitizeString,
  sanitizeUrl,
  sanitizeUserInput,
  sanitizeUsername,
  stripHtml,
} from "./sanitizers";

// ================================
// DOMAIN-SPECIFIC VALIDATION SCHEMAS
// ================================

export * from "./BeatValidation";
export * from "./ErrorValidation";
export * from "./OrderValidation";
export * from "./ReservationValidation";
export * from "./UserValidation";
export * from "./sync";

// ================================
// ZOD SCHEMAS (from main validation file)
// ================================

export {
  PAYPAL_SUPPORTED_CURRENCIES,
  // Audit
  auditLogSchema,
  // Subscription schemas
  createSubscriptionSchema,
  customBeatFileValidation,
  customBeatRequestSchema,
  enhancedPaymentIntentSchema,
  enhancedRegisterSchema,
  fileFilterValidation,
  // File schemas
  fileUploadValidation,
  loginSchema,
  mixingMasteringFormSchema,
  mixingMasteringSubmissionSchema,
  // Payment schemas
  paymentIntentSchema,
  // PayPal schemas
  paypalCreateOrderSchema,
  // Rate limiting
  rateLimitSchema,
  // User schemas
  registerSchema,
  serverCreateSubscriptionSchema,
  serverRegisterSchema,
  // Service schemas
  serviceOrderValidation,
  serviceSelectionSchema,
  // Webhook schemas
  stripeWebhookSchema,
  updateProfileSchema,
  type AuditLogInput,
  type CreateSubscriptionInput,
  type CustomBeatFileInput,
  type CustomBeatRequestInput,
  type EnhancedPaymentIntentInput,
  type EnhancedRegisterInput,
  type FileFilterInput,
  type LoginInput,
  type MixingMasteringFormInput,
  type MixingMasteringSubmissionInput,
  type PayPalCreateOrderInput,
  type PayPalCurrency,
  type PaymentIntentInput,
  type RateLimitInput,
  // Types
  type RegisterInput,
  type ServerCreateSubscriptionInput,
  type ServiceOrderInput,
  type ServiceSelectionInput,
  type StripeWebhookInput,
  type UpdateProfileInput,
  type FileUploadInput as ZodFileUploadInput,
} from "../validation";

// ================================
// ERROR UTILITIES
// ================================

export {
  createApiError,
  createBusinessLogicError,
  createValidationError,
  getHttpStatusForErrorType,
  getUserMessageForErrorType,
} from "./ErrorValidation";

// ================================
// COMMON VALIDATION SCHEMAS
// ================================

import { z } from "zod";

/**
 * Common parameter validation schemas
 */
export const CommonParams = {
  id: z.object({
    id: z.string().min(1, "ID is required"),
  }),

  numericId: z.object({
    id: z.string().regex(/^\d+$/, "ID must be numeric").transform(Number),
  }),

  slug: z.object({
    slug: z
      .string()
      .min(1, "Slug is required")
      .regex(/^[a-z0-9-]+$/, "Invalid slug format"),
  }),
};

/**
 * Common query validation schemas
 */
export const CommonQueries = {
  pagination: z.object({
    page: z
      .string()
      .optional()
      .transform(val => (val ? Number.parseInt(val, 10) : 1)),
    limit: z
      .string()
      .optional()
      .transform(val => (val ? Math.min(Number.parseInt(val, 10), 100) : 20)),
    offset: z
      .string()
      .optional()
      .transform(val => (val ? Number.parseInt(val, 10) : 0)),
  }),

  sorting: z.object({
    sortBy: z.string().optional(),
    sortOrder: z.enum(["asc", "desc"]).optional().default("desc"),
  }),

  search: z.object({
    q: z.string().max(100).optional(),
    search: z.string().max(100).optional(),
  }),

  dateRange: z.object({
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
  }),
};

// ================================
// VALIDATION MIDDLEWARE FACTORY
// ================================

import { NextFunction, Request, Response } from "express";
import { createValidationError as createValidationErrorFn } from "./ErrorValidation";

/**
 * Create validation middleware for request body
 */
export const validateBody = <T extends z.ZodSchema>(schema: T) => {
  return (req: Request, res: Response, next: NextFunction): void | Response => {
    try {
      const result = schema.safeParse(req.body);

      if (!result.success) {
        const validationErrors = result.error.errors.map(err => ({
          field: err.path.join("."),
          value: req.body,
          message: err.message,
          code: err.code,
        }));

        const errorResponse = createValidationErrorFn(
          validationErrors,
          req.headers["x-request-id"] as string
        );

        return res.status(400).json(errorResponse);
      }

      // Replace req.body with validated data
      req.body = result.data;
      next();
    } catch (error) {
      console.error("Validation middleware error:", error);
      res.status(500).json({
        error: {
          type: "internal_server_error",
          message: "Validation processing failed",
          timestamp: new Date().toISOString(),
        },
      });
    }
  };
};

/**
 * Create validation middleware for query parameters
 */
export const validateQuery = <T extends z.ZodSchema>(schema: T) => {
  return (req: Request, res: Response, next: NextFunction): void | Response => {
    try {
      const result = schema.safeParse(req.query);

      if (!result.success) {
        const validationErrors = result.error.errors.map(err => ({
          field: `query.${err.path.join(".")}`,
          value: req.query,
          message: err.message,
          code: err.code,
        }));

        const errorResponse = createValidationErrorFn(
          validationErrors,
          req.headers["x-request-id"] as string
        );

        return res.status(400).json(errorResponse);
      }

      // Replace req.query with validated data
      req.query = result.data as Record<string, string>;
      next();
    } catch (error) {
      console.error("Query validation middleware error:", error);
      res.status(500).json({
        error: {
          type: "internal_server_error",
          message: "Query validation processing failed",
          timestamp: new Date().toISOString(),
        },
      });
    }
  };
};

/**
 * Create validation middleware for route parameters
 */
export const validateParams = <T extends z.ZodSchema>(schema: T) => {
  return (req: Request, res: Response, next: NextFunction): void | Response => {
    try {
      const result = schema.safeParse(req.params);

      if (!result.success) {
        const validationErrors = result.error.errors.map(err => ({
          field: `params.${err.path.join(".")}`,
          value: req.params,
          message: err.message,
          code: err.code,
        }));

        const errorResponse = createValidationErrorFn(
          validationErrors,
          req.headers["x-request-id"] as string
        );

        return res.status(400).json(errorResponse);
      }

      // Replace req.params with validated data
      req.params = result.data;
      next();
    } catch (error) {
      console.error("Params validation middleware error:", error);
      res.status(500).json({
        error: {
          type: "internal_server_error",
          message: "Parameter validation processing failed",
          timestamp: new Date().toISOString(),
        },
      });
    }
  };
};

// ================================
// VALIDATION UTILITIES
// ================================

/**
 * Combine multiple validation schemas
 */
export const combineSchemas = <T extends z.ZodSchema, U extends z.ZodSchema>(
  schema1: T,
  schema2: U
): z.ZodIntersection<T, U> => {
  return schema1.and(schema2);
};

/**
 * Make all fields in a schema optional
 */
export const makeOptional = <T extends z.ZodSchema>(schema: T): z.ZodOptional<T> => {
  return schema.optional();
};

/**
 * Create a partial version of a schema (all fields optional)
 */
export const makePartial = <T extends z.ZodRawShape>(schema: z.ZodObject<T>) => {
  return schema.partial();
};

/**
 * Validate and transform file upload (Express.Multer.File)
 */
export const validateMulterFileUpload = (file: Express.Multer.File) => {
  const FileUploadSchema = z.object({
    fieldname: z.string(),
    originalname: z.string().min(1, "Filename is required"),
    encoding: z.string(),
    mimetype: z.string().min(1, "MIME type is required"),
    size: z.number().max(50 * 1024 * 1024, "File size exceeds 50MB limit"),
    buffer: z.instanceof(Buffer),
  });

  return FileUploadSchema.parse(file);
};

/**
 * Runtime type guard for validation results
 */
export const isValidationError = (error: unknown): error is z.ZodError => {
  return error instanceof z.ZodError;
};

/**
 * Extract validation errors in a standardized format
 */
export const extractValidationErrors = (error: z.ZodError) => {
  return error.errors.map(err => ({
    field: err.path.join("."),
    message: err.message,
    code: err.code,
    value: undefined, // Simplified to avoid type issues
  }));
};

// Re-export specific schemas that are commonly used
export { CreateOrderSchema, CreatePaymentIntentSchema } from "./OrderValidation";
export { CreateReservationSchema, ServiceDetailsSchema } from "./ReservationValidation";

// Re-export payment session schema from apiEndpoints
export { createPaymentSessionRequestSchema } from "../types/apiEndpoints";
