import { z } from "zod";

// ================================
// CLIENT-SIDE VALIDATION SCHEMAS
// ================================

// User registration validation
export const registerSchema = z.object({
  username: z.string()
    .min(3, "Username must be at least 3 characters")
    .max(30, "Username must be less than 30 characters")
    .regex(/^[a-zA-Z0-9_-]+$/, "Username can only contain letters, numbers, underscores, and hyphens"),
  email: z.string()
    .email("Please enter a valid email address")
    .max(255, "Email is too long"),
  password: z.string()
    .min(8, "Password must be at least 8 characters")
    .max(128, "Password is too long")
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, "Password must contain at least one lowercase letter, one uppercase letter, and one number"),
  confirmPassword: z.string()
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

// User login validation
export const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

// Subscription creation validation
export const createSubscriptionSchema = z.object({
  priceId: z.enum(["basic", "pro", "unlimited"], {
    errorMap: () => ({ message: "Invalid subscription plan" })
  }),
  billingInterval: z.enum(["monthly", "annual"], {
    errorMap: () => ({ message: "Invalid billing interval" })
  }),
});

// Payment intent validation
export const paymentIntentSchema = z.object({
  amount: z.number()
    .min(100, "Amount must be at least $1.00")
    .max(999999, "Amount is too high"),
  currency: z.enum(["usd", "eur"], {
    errorMap: () => ({ message: "Invalid currency" })
  }),
  metadata: z.record(z.string()).optional(),
});

// User profile update validation
export const updateProfileSchema = z.object({
  username: z.string()
    .min(3, "Username must be at least 3 characters")
    .max(30, "Username must be less than 30 characters")
    .regex(/^[a-zA-Z0-9_-]+$/, "Username can only contain letters, numbers, underscores, and hyphens")
    .optional(),
  email: z.string()
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
    object: z.any(),
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
  details: z.record(z.any()).optional(),
  ipAddress: z.string().optional(),
  userAgent: z.string().optional(),
  timestamp: z.date(),
});

// ================================
// VALIDATION UTILITIES
// ================================

export const validateEmail = (email: string): boolean => {
  return z.string().email().safeParse(email).success;
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
    errors
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