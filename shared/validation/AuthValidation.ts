/**
 * Authentication Validation Schemas
 *
 * Centralized validation for user registration, login, and profile updates.
 *
 * @module shared/validation/AuthValidation
 */

import { z } from "zod";
import { validateEmail } from "./validators";

// ================================
// REGISTRATION SCHEMAS
// ================================

/**
 * User registration validation (client-side with confirmPassword)
 */
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

/**
 * Server-side registration validation (without confirmPassword)
 */
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

/**
 * Enhanced registration with business rules
 */
export const enhancedRegisterSchema = registerSchema.refine(data => validateEmail(data.email), {
  message: "Email domain is not valid",
  path: ["email"],
});

// ================================
// LOGIN SCHEMAS
// ================================

/**
 * User login validation
 */
export const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

// ================================
// PROFILE SCHEMAS
// ================================

/**
 * User profile update validation
 */
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
// TYPE EXPORTS
// ================================

export type RegisterInput = z.infer<typeof registerSchema>;
export type ServerRegisterInput = z.infer<typeof serverRegisterSchema>;
export type EnhancedRegisterInput = z.infer<typeof enhancedRegisterSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
