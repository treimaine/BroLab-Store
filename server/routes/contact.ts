import { Router } from "express";
import { ContactFormData, contactFormSchema } from "../../shared/schema";
import { logger } from "../lib/logger";
import { createValidationMiddleware as validateRequest } from "../lib/validation";
import { sendAdminNotification, sendMail } from "../services/mail";
import { AuthenticatedRequest, handleRouteError } from "../types/routes";

const router = Router();

// Rate limiting map for contact form (in production, use Redis)
const contactRateLimitMap = new Map<string, { count: number; resetTime: number }>();

// Rate limit helper (5 messages per hour per IP/email)
const checkContactRateLimit = (identifier: string): boolean => {
  const now = Date.now();
  const key = `contact_${identifier}`;
  const limit = contactRateLimitMap.get(key);

  if (!limit || now > limit.resetTime) {
    contactRateLimitMap.set(key, { count: 1, resetTime: now + 60 * 60 * 1000 }); // 1 hour
    return true;
  }

  if (limit.count >= 5) {
    return false;
  }

  limit.count++;
  return true;
};

// Generate contact confirmation email HTML
const generateContactConfirmationEmail = (name: string, message: string): string => {
  const frontendUrl = process.env.FRONTEND_URL || "https://www.brolabentertainment.com";

  return `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"></head>
    <body style="margin: 0; padding: 0; background: #f4f4f4;">
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%); padding: 30px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 28px;">Message Received! 📬</h1>
          <p style="color: #E5E7EB; margin: 10px 0 0 0; font-size: 16px;">Thank you for contacting us</p>
        </div>
        
        <div style="padding: 30px; background: white;">
          <h2 style="color: #333; margin: 0 0 20px 0;">Hello ${name}! 👋</h2>
          <p style="color: #666; line-height: 1.6; margin-bottom: 20px;">
            We have received your message and will get back to you as soon as possible, 
            typically within 24 to 48 business hours.
          </p>
          
          <div style="background: #EEF2FF; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #8B5CF6; margin: 0 0 10px 0;">Your message summary:</h3>
            <p style="color: #374151; white-space: pre-wrap; margin: 0;">${message.substring(0, 500)}${message.length > 500 ? "..." : ""}</p>
          </div>
          
          <p style="color: #666; line-height: 1.6;">
            In the meantime, feel free to explore our beats catalog or check out our FAQ.
          </p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${frontendUrl}/shop" 
               style="background: #8B5CF6; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
              Explore Our Beats
            </a>
          </div>
        </div>
        
        <div style="background: #F9FAFB; padding: 20px; text-align: center; color: #6B7280; font-size: 14px;">
          <p style="margin: 0;">BroLab Entertainment - Professional Music Production Services</p>
          <p style="margin: 5px 0 0 0;">Your destination for quality beats</p>
        </div>
      </div>
    </body>
    </html>
  `;
};

// POST /api/contact - Submit contact form
router.post(
  "/",
  validateRequest(contactFormSchema),
  async (req: AuthenticatedRequest, res): Promise<void> => {
    try {
      if (!req.validatedData) {
        res.status(400).json({
          success: false,
          message: "Invalid request data",
        });
        return;
      }

      const { name, email, subject, message } = req.validatedData as unknown as ContactFormData;

      // Get client IP for rate limiting
      const clientIp = req.ip || req.socket.remoteAddress || "unknown";

      // Check rate limit by IP and email
      if (!checkContactRateLimit(clientIp) || !checkContactRateLimit(email)) {
        logger.warn("Contact form rate limit exceeded", { email, ip: clientIp });
        res.status(429).json({
          success: false,
          message: "Too many messages sent. Please try again in an hour.",
        });
        return;
      }

      logger.info("Processing contact form submission", {
        name,
        email,
        subject: subject || "(no subject)",
        messageLength: message.length,
      });

      // Send confirmation email to user
      try {
        await sendMail({
          to: email,
          subject: "Your message has been received - BroLab Entertainment",
          html: generateContactConfirmationEmail(name, message),
        });
        logger.info("Contact confirmation email sent", { email });
      } catch (emailError) {
        logger.error("Failed to send contact confirmation email", {
          error: emailError instanceof Error ? emailError.message : String(emailError),
          email,
        });
        // Continue even if confirmation email fails
      }

      // Send notification to admin
      try {
        const subjectLine = subject
          ? `New message from ${name} - ${subject}`
          : `New message from ${name}`;

        await sendAdminNotification("Contact Form", {
          subject: subjectLine,
          html: `
            <div style="background: #FFF7ED; padding: 20px; border-radius: 8px; border-left: 4px solid #F59E0B;">
              <h3 style="color: #D97706; margin: 0 0 15px 0;">📬 New Contact Message</h3>
              <p><strong>Name:</strong> ${name}</p>
              <p><strong>Email:</strong> <a href="mailto:${email}">${email}</a></p>
              ${subject ? `<p><strong>Subject:</strong> ${subject}</p>` : ""}
              <p><strong>Message:</strong></p>
              <div style="background: white; padding: 15px; border-radius: 5px; margin-top: 10px;">
                <p style="white-space: pre-wrap; margin: 0;">${message}</p>
              </div>
            </div>
          `,
          metadata: {
            senderName: name,
            senderEmail: email,
            subject: subject || "(no subject)",
            messageLength: message.length,
            timestamp: new Date().toISOString(),
            clientIp,
          },
        });
        logger.info("Admin notification sent for contact form");
      } catch (adminError) {
        logger.error("Failed to send admin notification", {
          error: adminError instanceof Error ? adminError.message : String(adminError),
        });
        // Continue even if admin notification fails
      }

      res.json({
        success: true,
        message: "Your message has been sent successfully. We'll get back to you soon!",
      });
    } catch (error: unknown) {
      logger.error("Contact form submission failed", {
        error: error instanceof Error ? error.message : String(error),
      });
      handleRouteError(error, res, "Failed to send message");
    }
  }
);

export default router;
