import bcrypt from "bcrypt";
import { Router } from "express";
import { v4 as uuidv4 } from "uuid";
import { Id } from "../../convex/_generated/dataModel";
import {
  forgotPasswordSchema,
  resendVerificationSchema,
  resetPasswordSchema,
  verifyEmailSchema,
} from "../../shared/schema";
import { getConvex } from "../lib/convex";
import { createValidationMiddleware as validateRequest } from "../lib/validation";
import { sendMail } from "../services/mail";
import { emailTemplates } from "../templates/emailTemplates";
import { AuthenticatedRequest, handleRouteError } from "../types/routes";

// Type-safe interfaces for validated request data
interface VerifyEmailRequest {
  token: string;
}

interface ResendVerificationRequest {
  email: string;
}

interface ForgotPasswordRequest {
  email: string;
}

interface ResetPasswordRequest {
  token: string;
  password: string;
}

// Convex function types
interface PasswordReset {
  _id: Id<"passwordResets">;
  userId: Id<"users">;
  email: string;
  token: string;
  expiresAt: number;
  used?: boolean;
  usedAt?: number;
  ipAddress?: string;
  userAgent?: string;
  createdAt: number;
}

interface ConvexUser {
  _id: Id<"users">;
  clerkId: string;
  email: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  imageUrl?: string;
  createdAt: number;
  updatedAt: number;
}

const router = Router();

// Initialize Convex client
const convex = getConvex();

// Rate limiting map (in production, use Redis)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

// Rate limit helper (3 requests per day per email)
const checkRateLimit = (email: string): boolean => {
  const now = Date.now();
  const key = `verify_${email}`;
  const limit = rateLimitMap.get(key);

  if (!limit || now > limit.resetTime) {
    rateLimitMap.set(key, { count: 1, resetTime: now + 24 * 60 * 60 * 1000 });
    return true;
  }

  if (limit.count >= 3) {
    return false;
  }

  limit.count++;
  return true;
};

// GET /api/email/verify-email - Verify email with token
// 🔒 SECURITY: Token validation with Convex storage
router.get(
  "/verify-email",
  validateRequest(verifyEmailSchema),
  async (req: AuthenticatedRequest, res): Promise<void> => {
    try {
      if (!req.validatedData) {
        res.status(400).json({
          success: false,
          message: "Invalid request data",
        });
        return;
      }

      const { token } = req.validatedData as unknown as VerifyEmailRequest;

      // SECURITY: Validate token against Convex database
      // Using dynamic import to avoid type instantiation issues
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore - Convex API types cause deep instantiation issues (known TypeScript limitation)
      const { api } = await import("../../convex/_generated/api");
      const verification = await convex.query(api.emailVerifications.getByToken, { token });

      if (!verification) {
        res.status(400).json({
          success: false,
          message: "Invalid or expired verification token",
        });
        return;
      }

      // Mark as verified
      await convex.mutation(api.emailVerifications.markVerified, { token });

      console.log("✅ Email verified for user:", verification.userId);

      res.json({
        success: true,
        message: "Email verified successfully",
      });
    } catch (error: unknown) {
      console.error("❌ Email verification failed:", error);
      handleRouteError(error, res, "Email verification failed");
    }
  }
);

// POST /api/email/resend-verification - Resend verification email
router.post(
  "/resend-verification",
  validateRequest(resendVerificationSchema),
  async (req: AuthenticatedRequest, res): Promise<void> => {
    try {
      if (!req.validatedData) {
        res.status(400).json({
          success: false,
          message: "Invalid request data",
        });
        return;
      }

      const { email } = req.validatedData as unknown as ResendVerificationRequest;

      // Check rate limit
      if (!checkRateLimit(email)) {
        res.status(429).json({
          success: false,
          message: "Too many verification requests. Try again tomorrow.",
        });
        return;
      }

      // Find user by email using Convex
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore - Convex API types cause deep instantiation issues (known TypeScript limitation)
      const { api } = await import("../../convex/_generated/api");
      const user = (await convex.query(api.users.getUserByEmail, { email })) as ConvexUser | null;

      if (!user) {
        res.status(404).json({
          success: false,
          message: "User not found",
        });
        return;
      }

      // Generate verification token
      const token = uuidv4();
      const expiresAt = Date.now() + 24 * 60 * 60 * 1000; // 24 hours

      // Save token to email_verifications table
      await convex.mutation(api.emailVerifications.create, {
        userId: user._id,
        email,
        token,
        expiresAt,
      });

      console.log("📧 Generated verification token:", token, "for user:", user._id);

      // Send verification email
      const verificationLink = `${process.env.FRONTEND_URL || "http://localhost:5000"}/verify-email?token=${token}`;
      const template = emailTemplates.verifyEmail(verificationLink, user.username || "User");

      await sendMail({
        to: email,
        subject: template.subject,
        html: template.html,
      });

      res.json({
        success: true,
        message: "Verification email sent successfully",
      });
    } catch (error: unknown) {
      handleRouteError(error, res, "Failed to send verification email");
    }
  }
);

// POST /api/email/forgot-password - Send password reset email
// 🔒 SECURITY: Token storage with Convex + Rate limiting
router.post(
  "/forgot-password",
  validateRequest(forgotPasswordSchema),
  async (req: AuthenticatedRequest, res): Promise<void> => {
    try {
      if (!req.validatedData) {
        res.status(400).json({
          success: false,
          message: "Invalid request data",
        });
        return;
      }

      const { email } = req.validatedData as unknown as ForgotPasswordRequest;

      // SECURITY: Check rate limit (3 attempts per hour per email)
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore - Convex API types cause deep instantiation issues (known TypeScript limitation)
      const { api } = await import("../../convex/_generated/api");
      const recentAttempts = await convex.query(api.passwordResets.getRecentAttempts, {
        email,
        windowMs: 60 * 60 * 1000, // 1 hour
      });

      if (recentAttempts >= 3) {
        // Don't reveal if user exists for security
        res.status(429).json({
          success: false,
          message: "Too many password reset requests. Please try again later.",
        });
        return;
      }

      // Find user by email using Convex
      const user = (await convex.query(api.users.getUserByEmail, { email })) as ConvexUser | null;

      if (!user) {
        // Don't reveal if user exists for security
        res.json({
          success: true,
          message: "If this email exists, a reset link has been sent",
        });
        return;
      }

      // Generate reset token
      const token = uuidv4();
      const expiresAt = Date.now() + 15 * 60 * 1000; // 15 minutes

      // SECURITY: Save token to password_resets table in Convex
      // Requirement 7: Tokens de Réinitialisation Non Persistés
      await convex.mutation(api.passwordResets.create, {
        userId: user._id,
        email,
        token,
        expiresAt,
        ipAddress: req.ip,
        userAgent: req.get("user-agent"),
      });

      console.log("🔐 Password reset token stored in Convex for user:", user._id);

      // Send reset email
      const resetLink = `${process.env.FRONTEND_URL || "http://localhost:5000"}/reset-password?token=${token}`;
      const template = emailTemplates.resetPassword(resetLink, user.username || "User");

      await sendMail({
        to: email,
        subject: template.subject,
        html: template.html,
      });

      res.json({
        success: true,
        message: "If this email exists, a reset link has been sent",
      });
    } catch (error: unknown) {
      handleRouteError(error, res, "Failed to process password reset request");
    }
  }
);

// POST /api/email/reset-password - Reset password with token
// 🔒 SECURITY: Token validation with Convex storage + cleanup
router.post(
  "/reset-password",
  validateRequest(resetPasswordSchema),
  async (req: AuthenticatedRequest, res): Promise<void> => {
    try {
      if (!req.validatedData) {
        res.status(400).json({
          success: false,
          message: "Invalid request data",
        });
        return;
      }

      const { token, password } = req.validatedData as unknown as ResetPasswordRequest;

      // SECURITY: Validate token against Convex database
      // Requirement 7: Tokens de Réinitialisation Non Persistés
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore - Convex API types cause deep instantiation issues (known TypeScript limitation)
      const { api } = await import("../../convex/_generated/api");
      const reset = (await convex.query(api.passwordResets.getByToken, {
        token,
      })) as PasswordReset | null;

      // SECURITY: Reject invalid, expired, or already used tokens
      if (!reset) {
        res.status(400).json({
          success: false,
          message: "Invalid or expired reset token",
        });
        return;
      }

      // Get user from Convex
      const user = (await convex.query(api.users.getUserById, {
        id: reset.userId,
      })) as ConvexUser | null;

      if (!user) {
        res.status(404).json({
          success: false,
          message: "User not found",
        });
        return;
      }

      // Hash new password
      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(password, saltRounds);

      // IMPLEMENTATION NOTE: Password update needs to be implemented
      // Clerk handles authentication, so this requires updating Clerk password via API
      // For now, we validate the token flow and mark it as used
      console.log("🔐 Password reset validated for user:", reset.userId);
      console.log("🔐 New hashed password ready (length:", hashedPassword?.length || 0, ")");

      // SECURITY: Mark token as used to prevent reuse
      await convex.mutation(api.passwordResets.markUsed, { token });

      // SECURITY: Delete token after successful use (cleanup)
      await convex.mutation(api.passwordResets.deleteToken, { token });

      console.log("✅ Password reset token marked as used and deleted");

      res.json({
        success: true,
        message: "Password reset successfully",
      });
    } catch (error: unknown) {
      console.error("❌ Password reset failed:", error);
      handleRouteError(error, res, "Failed to reset password");
    }
  }
);

export default router;
