import { z } from 'zod';
import { Request, Response, NextFunction } from 'express';
import { insertFileSchema, insertServiceOrderSchema } from '../../shared/schema';

// Extend Express Request type to include validatedData
declare global {
  namespace Express {
    interface Request {
      validatedData: z.infer<z.ZodSchema>;
    }
  }
}

// Type-safe validation middleware
export type ValidationMiddleware<T extends z.ZodSchema> = (
  req: Request & { validatedData: z.infer<T> },
  res: Response,
  next: NextFunction
) => Promise<void | Response>;

// File validation schemas
export const fileUploadValidation = insertFileSchema.extend({
  // Additional server-side validation
  storage_path: z.string().min(1, 'Storage path is required'),
  mime_type: z.string().regex(/^[a-z]+\/[a-z0-9\-\+\.]+$/, 'Invalid MIME type format'),
  size: z.number().min(1, 'File size must be greater than 0').max(50 * 1024 * 1024, 'File size cannot exceed 50MB'),
  role: z.enum(['upload', 'deliverable', 'invoice'], {
    errorMap: () => ({ message: 'Role must be upload, deliverable, or invoice' })
  })
});

export const fileFilterValidation = z.object({
  role: z.enum(['upload', 'deliverable', 'invoice']).optional(),
  reservation_id: z.string().uuid('Invalid reservation ID format').optional(),
  order_id: z.number().int().positive('Order ID must be a positive integer').optional(),
  owner_id: z.number().int().positive('Owner ID must be a positive integer').optional()
});

// Service order validation
export const serviceOrderValidation = insertServiceOrderSchema.extend({
  // Enhanced validation rules
  service_type: z.enum(['mixing', 'mastering', 'recording', 'consultation', 'custom_beat'], {
    errorMap: () => ({ message: 'Invalid service type' })
  }),
  details: z.object({
    duration: z.number().min(1, 'Duration must be at least 1 minute').optional(),
    tracks: z.number().min(1, 'At least 1 track required').max(100, 'Maximum 100 tracks allowed').optional(),
    format: z.enum(['wav', 'mp3', 'aiff']).optional(),
    quality: z.enum(['standard', 'premium']).optional(),
    rush: z.boolean().optional(),
    notes: z.string().max(2000, 'Notes cannot exceed 2000 characters').optional()
  }).optional(),
  estimated_price: z.number().min(0, 'Price cannot be negative').max(10000, 'Price cannot exceed $10,000'),
  status: z.enum(['pending', 'in_progress', 'completed', 'cancelled']).optional()
});

// User input sanitization
export const sanitizeUserInput = (input: string): string => {
  return input
    .trim()
    .replace(/[<>\"'&]/g, '') // Remove potentially dangerous characters
    .slice(0, 1000); // Limit length
};

// File path validation
export const validateFilePath = (path: string): boolean => {
  // Check for directory traversal attempts
  if (path.includes('..') || path.includes('//') || path.startsWith('/')) {
    return false;
  }
  
  // Ensure valid file path format
  const validPathRegex = /^[a-zA-Z0-9_\-\/\.]+$/;
  return validPathRegex.test(path);
};

// MIME type validation
export const validateMimeType = (mimeType: string, allowedTypes: string[] = []): boolean => {
  const standardAllowed = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'audio/mpeg',
    'audio/wav',
    'audio/x-wav',
    'application/zip',
    'image/jpeg',
    'image/png',
    'image/gif'
  ];
  
  const allowed = allowedTypes.length > 0 ? allowedTypes : standardAllowed;
  return allowed.includes(mimeType);
};

// Rate limiting validation
export const rateLimitValidation = z.object({
  userId: z.number().int().positive(),
  action: z.enum(['upload', 'download', 'api_call', 'email_send']),
  timestamp: z.number().int().positive(),
  limit: z.number().int().positive().default(10), // per hour
});

// Security validation helpers
export const validateUUID = (uuid: string): boolean => {
  // More permissive regex that accepts all valid UUID versions (1-5)
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
};

export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length <= 254;
};

export const validatePhoneNumber = (phone: string): boolean => {
  // Support international formats with more flexibility
  const phoneRegex = /^\+?[\d\s\-\(\)\.]{7,20}$/;
  // Remove all non-digit characters to count actual digits
  const digitsOnly = phone.replace(/[^\d]/g, '');
  return phoneRegex.test(phone) && digitsOnly.length >= 7 && digitsOnly.length <= 15;
};

// Validation error formatter
export const formatValidationError = (error: z.ZodError): { field: string; message: string }[] => {
  return error.errors.map(err => ({
    field: err.path.join('.'),
    message: err.message
  }));
};

// Comprehensive validation middleware factory
export const createValidationMiddleware = <T extends z.ZodSchema>(schema: T): ValidationMiddleware<T> => {
  return async (req: Request & { validatedData: z.infer<T> }, res: Response, next: NextFunction) => {
    try {
      let dataToValidate: any;
      if (req.method === 'GET') {
        dataToValidate = req.query;
      } else {
        dataToValidate = req.body;
      }
      const validatedData = schema.parse(dataToValidate);
      req.validatedData = validatedData;
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        const formattedErrors = formatValidationError(error);
        return res.status(400).json({
          error: 'Validation failed',
          details: formattedErrors
        });
      }
      next(error);
    }
  };
};

// File upload security validation
export const validateFileUpload = (file: Express.Multer.File): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  // Check file size
  if (file.size > 50 * 1024 * 1024) {
    errors.push('File size exceeds 50MB limit');
  }
  
  // Check MIME type
  if (!validateMimeType(file.mimetype)) {
    errors.push('File type not allowed');
  }
  
  // Check filename for security
  if (!validateFilePath(file.originalname)) {
    errors.push('Invalid filename');
  }
  
  // Check for executable files
  const dangerousExtensions = ['.exe', '.bat', '.cmd', '.scr', '.pif', '.com'];
  const extension = file.originalname.toLowerCase().slice(file.originalname.lastIndexOf('.'));
  if (dangerousExtensions.includes(extension)) {
    errors.push('Executable files are not allowed');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
};

export default {
  fileUploadValidation,
  fileFilterValidation,
  serviceOrderValidation,
  sanitizeUserInput,
  validateFilePath,
  validateMimeType,
  validateUUID,
  validateEmail,
  validatePhoneNumber,
  formatValidationError,
  createValidationMiddleware,
  validateFileUpload
};