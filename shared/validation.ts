import { z } from "zod";

// ================================
// CLIENT-SIDE VALIDATION SCHEMAS
// ================================

// User registration validation (client-side with confirmPassword)
export const registerSchema = z
  .object({
    username: z
      .string()
      .min(3, "Username must be at least 3 characters")
      .max(30, "Username must be less than 30 characters")
      .regex(
        /^[a-zA-Z0-9_-]+$/,
        "Username can only contain letters, numbers, underscores, and hyphens"
      ),
    email: z.string().email("Please enter a valid email address").max(255, "Email is too long"),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .max(128, "Password is too long")
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
        "Password must contain at least one lowercase letter, one uppercase letter, and one number"
      ),
    confirmPassword: z.string(),
  })
  .refine(data => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

// Server-side registration validation (without confirmPassword)
export const serverRegisterSchema = z.object({
  username: z
    .string()
    .min(3, "Username must be at least 3 characters")
    .max(30, "Username must be less than 30 characters")
    .regex(
      /^[a-zA-Z0-9_-]+$/,
      "Username can only contain letters, numbers, underscores, and hyphens"
    ),
  email: z.string().email("Please enter a valid email address").max(255, "Email is too long"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(128, "Password is too long")
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      "Password must contain at least one lowercase letter, one uppercase letter, and one number"
    ),
});

// User login validation
export const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

// Subscription creation validation
export const createSubscriptionSchema = z.object({
  priceId: z.enum(["basic", "pro", "unlimited"], {
    errorMap: () => ({ message: "Invalid subscription plan" }),
  }),
  billingInterval: z.enum(["monthly", "annual"], {
    errorMap: () => ({ message: "Invalid billing interval" }),
  }),
});

// Payment intent validation
export const paymentIntentSchema = z.object({
  amount: z.number().min(100, "Amount must be at least $1.00").max(999999, "Amount is too high"),
  currency: z.enum(["usd", "eur"], {
    errorMap: () => ({ message: "Invalid currency" }),
  }),
  metadata: z.record(z.string()).optional(),
});

// User profile update validation
export const updateProfileSchema = z.object({
  username: z
    .string()
    .min(3, "Username must be at least 3 characters")
    .max(30, "Username must be less than 30 characters")
    .regex(
      /^[a-zA-Z0-9_-]+$/,
      "Username can only contain letters, numbers, underscores, and hyphens"
    )
    .optional(),
  email: z
    .string()
    .email("Please enter a valid email address")
    .max(255, "Email is too long")
    .optional(),
  avatar: z.string().url("Invalid avatar URL").optional(),
});

// ================================
// SERVER-SIDE VALIDATION SCHEMAS
// ================================

// Enhanced subscription creation with additional security checks
export const serverCreateSubscriptionSchema = createSubscriptionSchema.extend({
  // Additional server-side validations
  userAgent: z.string().optional(),
  ipAddress: z.string().ip().optional(),
  timestamp: z.number().optional(),
});

// Webhook validation
export const stripeWebhookSchema = z.object({
  id: z.string(),
  type: z.string(),
  data: z.object({
    object: z.record(z.unknown()),
  }),
  created: z.number(),
});

// Rate limiting validation
export const rateLimitSchema = z.object({
  ip: z.string(),
  endpoint: z.string(),
  timestamp: z.number(),
  count: z.number().min(0),
});

// Audit log validation
export const auditLogSchema = z.object({
  userId: z.number(),
  action: z.string(),
  resource: z.string(),
  details: z.record(z.unknown()).optional(),
  ipAddress: z.string().optional(),
  userAgent: z.string().optional(),
  timestamp: z.date(),
});

// ================================
// VALIDATION UTILITIES
// ================================

export const validateEmail = (email: string): boolean => {
  if (!email || email.length > 254) return false;
  return z.string().email().safeParse(email).success;
};

export const validateFilePath = (path: string): boolean => {
  if (!path) return false;

  // Reject absolute paths
  if (path.startsWith("/") || path.includes(":\\")) return false;

  // Reject directory traversal attempts
  if (path.includes("../") || path.includes("..\\")) return false;

  // Reject double slashes
  if (path.includes("//") || path.includes("\\\\")) return false;

  // Reject dangerous characters
  const dangerousChars = /[<>|?*"]/;
  if (dangerousChars.test(path)) return false;

  return true;
};

export const validateMimeType = (mimeType: string, allowedTypes?: string[]): boolean => {
  const defaultAllowed = [
    "application/pdf",
    "audio/mpeg",
    "audio/wav",
    "audio/mp3",
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/gif",
    "application/zip",
    "application/x-zip-compressed",
  ];

  const allowed = allowedTypes || defaultAllowed;
  return allowed.includes(mimeType);
};

export const validateUUID = (uuid: string): boolean => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
};

export const validatePhoneNumber = (phone: string): boolean => {
  if (!phone || phone.length < 10 || phone.length > 17) return false;

  // Remove common formatting characters
  const cleaned = phone.replace(/[\s\-()+ ]/g, "");

  // Check if it's all digits (after removing formatting)
  const digitRegex = /^\d{10,15}$/;
  return digitRegex.test(cleaned);
};

export const sanitizeUserInput = (input: string, maxLength: number = 1000): string => {
  if (!input) return "";

  return input
    .trim()
    .replace(/[<>]/g, "") // Remove HTML brackets
    .replace(/['"]/g, "") // Remove quotes
    .replace(/[&]/g, "") // Remove ampersands
    .slice(0, maxLength); // Limit length
};

export const validateFileUpload = (file: {
  name?: string;
  originalname?: string;
  size: number;
  type?: string;
  mimetype?: string;
}) => {
  const errors: string[] = [];
  const maxSize = 50 * 1024 * 1024; // 50MB

  // Get the filename and mimetype from either format
  const fileName = file.name || file.originalname;
  const mimeType = file.type || file.mimetype;

  // Check file size
  if (file.size > maxSize) {
    errors.push("File size exceeds 50MB limit");
  }

  // Check MIME type
  if (mimeType && !validateMimeType(mimeType)) {
    errors.push("File type not allowed");
  }

  // Check for executable extensions (only if name is provided)
  if (fileName) {
    const executableExtensions = [".exe", ".bat", ".cmd", ".scr", ".com", ".pif"];
    const hasExecutableExt = executableExtensions.some(ext => fileName.toLowerCase().endsWith(ext));

    if (hasExecutableExt) {
      errors.push("Executable files are not allowed");
    }

    // Check filename
    if (!validateFilePath(fileName)) {
      errors.push("Invalid filename");
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
};

export const validatePassword = (password: string): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];

  if (password.length < 8) {
    errors.push("Password must be at least 8 characters");
  }

  if (!/(?=.*[a-z])/.test(password)) {
    errors.push("Password must contain at least one lowercase letter");
  }

  if (!/(?=.*[A-Z])/.test(password)) {
    errors.push("Password must contain at least one uppercase letter");
  }

  if (!/(?=.*\d)/.test(password)) {
    errors.push("Password must contain at least one number");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

export const sanitizeInput = (input: string): string => {
  return input
    .trim()
    .replace(/[<>]/g, "") // Remove potential HTML tags
    .replace(/javascript:/gi, "") // Remove javascript: protocol
    .replace(/on\w+=/gi, ""); // Remove event handlers
};

// ================================
// ENHANCED VALIDATION SCHEMAS
// ================================

/**
 * Enhanced validation with business rules
 */
export const enhancedRegisterSchema = registerSchema.refine(data => validateEmail(data.email), {
  message: "Email domain is not valid",
  path: ["email"],
});

/**
 * Enhanced payment validation with currency checks
 */
export const enhancedPaymentIntentSchema = paymentIntentSchema.refine(
  data => {
    // Validate currency-specific minimum amounts
    const minimums = { usd: 50, eur: 50 }; // $0.50, €0.50
    return data.amount >= minimums[data.currency];
  },
  {
    message: "Amount below minimum for currency",
    path: ["amount"],
  }
);

// ================================
// VALIDATION UTILITIES FOR BUSINESS OBJECTS
// ================================

/**
 * Validate BPM range for genre
 */
export const validateBpmForGenre = (bpm: number, genre: string): boolean => {
  const ranges: Record<string, { min: number; max: number }> = {
    "hip-hop": { min: 70, max: 140 },
    trap: { min: 130, max: 170 },
    "r&b": { min: 60, max: 120 },
    pop: { min: 100, max: 130 },
  };

  const range = ranges[genre.toLowerCase()];
  if (!range) return true; // Allow unknown genres

  return bpm >= range.min && bpm <= range.max;
};

/**
 * Validate order total calculation
 */
export const validateOrderTotal = (
  subtotal: number,
  tax: number,
  fees: number,
  total: number
): boolean => {
  const calculatedTotal = subtotal + tax + fees;
  return Math.abs(calculatedTotal - total) < 0.01; // Allow for rounding
};

/**
 * Validate reservation time slot
 */
export const validateReservationSlot = (startTime: string, durationMinutes: number): boolean => {
  const start = new Date(startTime);
  const end = new Date(start.getTime() + durationMinutes * 60000);

  // Must be in the future
  if (start <= new Date()) return false;

  // Must be during business hours (9 AM - 6 PM)
  const startHour = start.getHours();
  const endHour = end.getHours();

  return startHour >= 9 && endHour <= 18;
};

// ================================
// TYPE EXPORTS
// ================================

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type CreateSubscriptionInput = z.infer<typeof createSubscriptionSchema>;
export type PaymentIntentInput = z.infer<typeof paymentIntentSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

export type ServerCreateSubscriptionInput = z.infer<typeof serverCreateSubscriptionSchema>;
export type StripeWebhookInput = z.infer<typeof stripeWebhookSchema>;
export type RateLimitInput = z.infer<typeof rateLimitSchema>;
export type AuditLogInput = z.infer<typeof auditLogSchema>;

// ================================
// ADDITIONAL VALIDATION SCHEMAS
// ================================

export const fileUploadValidation = z.object({
  name: z.string().min(1, "Filename is required"),
  size: z.number().max(50 * 1024 * 1024, "File size exceeds 50MB limit"),
  type: z.string().min(1, "File type is required"),
  lastModified: z.number().optional(),
});

export const fileFilterValidation = z.object({
  genre: z.string().optional(),
  bpm: z
    .object({
      min: z.number().min(60).max(200),
      max: z.number().min(60).max(200),
    })
    .optional(),
  key: z.string().optional(),
  mood: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

export const serviceOrderValidation = z.object({
  service_type: z.enum(["mixing", "mastering", "recording", "consultation"]),
  details: z.string().min(10, "Details must be at least 10 characters"),
  budget: z.number().min(50, "Minimum budget is $50"),
  deadline: z.string().datetime("Invalid deadline format"),
  contact_email: z.string().email("Invalid email address"),
  contact_phone: z.string().optional(),
});

// Enhanced validation types
export type EnhancedRegisterInput = z.infer<typeof enhancedRegisterSchema>;
export type EnhancedPaymentIntentInput = z.infer<typeof enhancedPaymentIntentSchema>;
export type FileUploadInput = z.infer<typeof fileUploadValidation>;
export type FileFilterInput = z.infer<typeof fileFilterValidation>;
export type ServiceOrderInput = z.infer<typeof serviceOrderValidation>;
