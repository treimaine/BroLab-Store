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
  type FileUploadValidationResult,
  type OrderStatus,
  // Types
  type PasswordValidationResult,
  type ReservationStatus,
  type ServiceType,
  type UserRole,
  type FileUploadInput as ValidatorFileUploadInput,
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
// AUTHENTICATION VALIDATION SCHEMAS
// ================================

export {
  enhancedRegisterSchema,
  loginSchema,
  registerSchema,
  serverRegisterSchema,
  updateProfileSchema,
  type EnhancedRegisterInput,
  type LoginInput,
  type RegisterInput,
  type ServerRegisterInput,
  type UpdateProfileInput,
} from "./AuthValidation";

// ================================
// PAYMENT VALIDATION SCHEMAS
// ================================

export {
  PAYPAL_SUPPORTED_CURRENCIES,
  auditLogSchema,
  createSubscriptionSchema,
  enhancedPaymentIntentSchema,
  paymentIntentSchema,
  paypalCreateOrderSchema,
  rateLimitSchema,
  serverCreateSubscriptionSchema,
  stripeWebhookSchema,
  type AuditLogInput,
  type CreateSubscriptionInput,
  type EnhancedPaymentIntentInput,
  type PayPalCreateOrderInput,
  type PayPalCurrency,
  type PaymentIntentInput,
  type RateLimitInput,
  type ServerCreateSubscriptionInput,
  type StripeWebhookInput,
} from "./PaymentValidation";

// ================================
// FILE VALIDATION SCHEMAS
// ================================

export {
  customBeatFileValidation,
  customBeatRequestSchema,
  fileFilterValidation,
  fileUploadValidation,
  mixingMasteringFormSchema,
  mixingMasteringSubmissionSchema,
  serviceOrderValidation,
  serviceSelectionSchema,
  type CustomBeatFileInput,
  type CustomBeatRequestInput,
  type FileFilterInput,
  type FileUploadInput,
  type MixingMasteringFormInput,
  type MixingMasteringSubmissionInput,
  type ServiceOrderInput,
  type ServiceSelectionInput,
} from "./FileValidation";

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
  /** Generic string ID - use when ID format is flexible */
  id: z.object({
    id: z.string().min(1, "ID is required"),
  }),

  /** Numeric ID - for WooCommerce products, beats, etc. */
  numericId: z.object({
    id: z.string().regex(/^\d+$/, "ID must be numeric").transform(Number),
  }),

  /** Stripe Payment Intent ID - format: pi_xxx */
  stripePaymentIntentId: z.object({
    id: z.string().regex(/^pi_[a-zA-Z0-9]+$/, "Invalid Stripe payment intent ID"),
  }),

  /** Stripe Checkout Session ID - format: cs_xxx or cs_test_xxx */
  stripeSessionId: z.object({
    id: z.string().regex(/^cs_(test_)?[a-zA-Z0-9]+$/, "Invalid Stripe checkout session ID"),
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
    value: undefined,
  }));
};

// Re-export specific schemas that are commonly used
export { CreateOrderSchema, CreatePaymentIntentSchema } from "./OrderValidation";
export { CreateReservationSchema, ServiceDetailsSchema } from "./ReservationValidation";

// Re-export payment session schema from apiEndpoints
export { createPaymentSessionRequestSchema } from "../types/apiEndpoints";
