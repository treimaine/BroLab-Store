import { Router } from "express";
import { z } from "zod";
import { v4 as uuidv4 } from "uuid";
import bcrypt from "bcrypt";
import { sendMail } from "../services/mail";
import { emailTemplates } from "../templates/emails";
import { storage } from "../storage";

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

// Validation schemas
const verifyEmailSchema = z.object({
  token: z.string().uuid(),
});

const resendVerificationSchema = z.object({
  email: z.string().email(),
});

const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

const resetPasswordSchema = z.object({
  token: z.string().uuid(),
  password: z.string().min(6),
});

// POST /api/email/verify-email - Verify email with token
router.get("/verify-email", async (req, res) => {
  try {
    const { token } = verifyEmailSchema.parse(req.query);
    
    // Find verification token in database
    // TODO: Implement database lookup for email_verifications table
    // For now, return success for valid UUID format
    
    // Mock implementation - replace with real database lookup
    if (token.length === 36) { // Valid UUID length
      console.log("✅ Email verification successful for token:", token);
      
      // TODO: Update user verified_at field
      // TODO: Delete verification token
      
      res.json({ 
        success: true, 
        message: "Email verified successfully" 
      });
    } else {
      res.status(400).json({ 
        success: false, 
        message: "Invalid or expired verification token" 
      });
    }
    
  } catch (error: any) {
    console.error("Email verification error:", error);
    res.status(400).json({ 
      success: false, 
      message: "Invalid verification request" 
    });
  }
});

// POST /api/email/resend-verification - Resend verification email
router.post("/resend-verification", async (req, res) => {
  try {
    const { email } = resendVerificationSchema.parse(req.body);
    
    // Check rate limit
    if (!checkRateLimit(email)) {
      return res.status(429).json({
        success: false,
        message: "Too many verification requests. Try again tomorrow."
      });
    }
    
    // Find user by email
    const user = await storage.getUserByEmail(email);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }
    
    // Generate verification token
    const token = uuidv4();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
    
    // TODO: Save token to email_verifications table
    console.log("📧 Generated verification token:", token, "for user:", user.id);
    
    // Send verification email
    const verificationLink = `${process.env.FRONTEND_URL || 'http://localhost:5000'}/verify-email?token=${token}`;
    const template = emailTemplates.verifyEmail(verificationLink, user.username);
    
    await sendMail({
      to: email,
      subject: template.subject,
      html: template.html,
    });
    
    res.json({
      success: true,
      message: "Verification email sent successfully"
    });
    
  } catch (error: any) {
    console.error("Resend verification error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to send verification email"
    });
  }
});

// POST /api/email/forgot-password - Send password reset email
router.post("/forgot-password", async (req, res) => {
  try {
    const { email } = forgotPasswordSchema.parse(req.body);
    
    // Find user by email
    const user = await storage.getUserByEmail(email);
    if (!user) {
      // Don't reveal if user exists for security
      return res.json({
        success: true,
        message: "If this email exists, a reset link has been sent"
      });
    }
    
    // Generate reset token
    const token = uuidv4();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
    
    // TODO: Save token to password_resets table
    console.log("🔐 Generated reset token:", token, "for user:", user.id);
    
    // Send reset email
    const resetLink = `${process.env.FRONTEND_URL || 'http://localhost:5000'}/reset-password?token=${token}`;
    const template = emailTemplates.resetPassword(resetLink, user.username);
    
    await sendMail({
      to: email,
      subject: template.subject,
      html: template.html,
    });
    
    res.json({
      success: true,
      message: "If this email exists, a reset link has been sent"
    });
    
  } catch (error: any) {
    console.error("Forgot password error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to process password reset request"
    });
  }
});

// POST /api/email/reset-password - Reset password with token
router.post("/reset-password", async (req, res) => {
  try {
    const { token, password } = resetPasswordSchema.parse(req.body);
    
    // TODO: Find and validate reset token in database
    // Mock implementation for now
    if (token.length !== 36) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired reset token"
      });
    }
    
    // Hash new password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    
    // TODO: Update user password in database
    // TODO: Delete reset token
    console.log("🔐 Password reset successful for token:", token);
    
    res.json({
      success: true,
      message: "Password reset successfully"
    });
    
  } catch (error: any) {
    console.error("Reset password error:", error);
    res.status(400).json({
      success: false,
      message: "Failed to reset password"
    });
  }
});

export default router;