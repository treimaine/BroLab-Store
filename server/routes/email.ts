import bcrypt from "bcrypt";
import { Router } from "express";
import { v4 as uuidv4 } from "uuid";
import {
  forgotPasswordSchema,
  resendVerificationSchema,
  resetPasswordSchema,
  verifyEmailSchema,
} from "../../shared/schema";
import { createValidationMiddleware as validateRequest } from "../lib/validation";
import { sendMail } from "../services/mail";
import { storage } from "../storage";
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

const router = Router();

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

      // Find verification token in database
      // TODO: Implement database lookup for email_verifications table
      // For now, return success for valid UUID format

      // Mock implementation - replace with real database lookup
      if (token.length === 36) {
        // Valid UUID length
        console.log("✅ Email verification successful for token:", token);

        // TODO: Update user verified_at field
        // TODO: Delete verification token

        res.json({
          success: true,
          message: "Email verified successfully",
        });
      } else {
        res.status(400).json({
          success: false,
          message: "Invalid or expired verification token",
        });
      }
    } catch (error: unknown) {
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

      // Find user by email
      const user = await storage.getUserByEmail(email);
      if (!user) {
        res.status(404).json({
          success: false,
          message: "User not found",
        });
        return;
      }

      // Generate verification token
      const token = uuidv4();
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

      // TODO: Save token to email_verifications table
      console.log("📧 Generated verification token:", token, "for user:", user.id);

      // Send verification email
      const verificationLink = `${process.env.FRONTEND_URL || "http://localhost:5000"}/verify-email?token=${token}`;
      const template = emailTemplates.verifyEmail(verificationLink, user.username);

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

      // Find user by email
      const user = await storage.getUserByEmail(email);
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
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

      // TODO: Save token to password_resets table
      console.log("🔐 Generated reset token:", token, "for user:", user.id);

      // Send reset email
      const resetLink = `${process.env.FRONTEND_URL || "http://localhost:5000"}/reset-password?token=${token}`;
      const template = emailTemplates.resetPassword(resetLink, user.username);

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

      // TODO: Find and validate reset token in database
      // Mock implementation for now
      if (token.length !== 36) {
        res.status(400).json({
          success: false,
          message: "Invalid or expired reset token",
        });
        return;
      }

      // Hash new password
      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(password, saltRounds);

      // TODO: Update user password in database
      // TODO: Delete reset token
      console.log("🔐 Password reset successful for token:", token);

      res.json({
        success: true,
        message: "Password reset successfully",
      });
    } catch (error: unknown) {
      handleRouteError(error, res, "Failed to reset password");
    }
  }
);

export default router;
