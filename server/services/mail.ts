import nodemailer, { Transporter } from "nodemailer";

export interface MailPayload {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  from?: string;
  replyTo?: string;
}

export interface EmailRetryOptions {
  maxRetries?: number;
  baseDelay?: number;
  maxDelay?: number;
  backoffFactor?: number;
}

export interface EmailDeliveryResult {
  success: boolean;
  messageId?: string;
  error?: string;
  attempts: number;
}

// Configuration du transporteur SMTP avec support Resend et Gmail
const createTransporter = (): Transporter => {
  // Use Resend if API key is provided (recommended for production)
  const resendKey = process.env.RESEND_API_KEY;
  console.log("📧 Email config check:", {
    hasResendKey: !!resendKey,
    keyPrefix: resendKey ? resendKey.substring(0, 6) + "..." : "none",
    nodeEnv: process.env.NODE_ENV,
  });

  if (resendKey) {
    console.log("📧 Email transporter: Using Resend SMTP");
    return nodemailer.createTransport({
      host: "smtp.resend.com",
      port: 465,
      secure: true,
      auth: {
        user: "resend",
        pass: resendKey,
      },
    });
  }
  console.log("📧 Email transporter: Resend API key not found, falling back to Gmail SMTP");

  // Fallback to Gmail SMTP
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;

  // Validate Gmail credentials
  if (
    !smtpUser ||
    !smtpPass ||
    smtpUser === "your_email@gmail.com" ||
    smtpPass === "your_app_password_here"
  ) {
    console.error(
      "❌ SMTP credentials not configured. Please set SMTP_USER and SMTP_PASS in .env or use RESEND_API_KEY"
    );
    throw new Error("Email service not configured. Please contact administrator.");
  }

  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_PORT === "465",
    auth: {
      user: smtpUser,
      pass: smtpPass,
    },
    pool: true,
    maxConnections: 3,
    rateDelta: 1000,
    rateLimit: 5,
  });
};

let transporter: Transporter | null = null;

// Initialize transporter (lazy loading)
const getTransporter = (): Transporter => {
  if (!transporter) {
    try {
      transporter = createTransporter();
    } catch (error) {
      console.error("❌ Failed to create email transporter:", error);
      throw error;
    }
  }
  return transporter;
};

// Sleep utility for retry delays
const sleep = (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms));

// Calculate exponential backoff delay
const calculateDelay = (attempt: number, options: EmailRetryOptions): number => {
  const baseDelay = options.baseDelay || 1000;
  const backoffFactor = options.backoffFactor || 2;
  const maxDelay = options.maxDelay || 30000;

  const delay = baseDelay * Math.pow(backoffFactor, attempt - 1);
  return Math.min(delay, maxDelay);
};

// Strip HTML to create text fallback
const stripHTML = (html: string): string => {
  return html
    .replaceAll(/<[^>]*>/g, "")
    .replaceAll("&nbsp;", " ")
    .replaceAll("&amp;", "&")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", '"')
    .trim();
};

// Enhanced send mail function with retry logic
export async function sendMail(
  payload: MailPayload,
  retryOptions?: EmailRetryOptions
): Promise<string> {
  const options: EmailRetryOptions = {
    maxRetries: 3,
    baseDelay: 1000,
    maxDelay: 30000,
    backoffFactor: 2,
    ...retryOptions,
  };

  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= (options.maxRetries || 3); attempt++) {
    try {
      // Handle DRY_RUN mode
      if (process.env.MAIL_DRY_RUN === "true") {
        console.log("📧 MAIL DRY RUN:", {
          to: payload.to,
          subject: payload.subject,
          from: payload.from || process.env.DEFAULT_FROM,
          attempt,
        });
        return "dry-run-message-id";
      }

      const transporter = getTransporter();

      const mailOptions = {
        from:
          payload.from || process.env.DEFAULT_FROM || "BroLab <contact@brolabentertainment.com>",
        to: payload.to,
        subject: payload.subject,
        html: payload.html,
        text: payload.text || stripHTML(payload.html),
        replyTo: payload.replyTo,
      };

      const result = await transporter.sendMail(mailOptions);
      console.log(`✅ Email sent successfully on attempt ${attempt}:`, result.messageId);
      return result.messageId;
    } catch (error: unknown) {
      lastError = error instanceof Error ? error : new Error(String(error));
      console.warn(
        `⚠️ Email sending failed on attempt ${attempt}/${options.maxRetries}:`,
        lastError.message
      );

      // Don't retry on the last attempt
      if (attempt === options.maxRetries) {
        break;
      }

      // Calculate delay and wait before retry
      const delay = calculateDelay(attempt, options);
      console.log(`⏳ Retrying in ${delay}ms...`);
      await sleep(delay);
    }
  }

  // All attempts failed
  const errorMessage = lastError?.message || "Unknown error";
  console.error("❌ All email sending attempts failed:", errorMessage);
  throw new Error(`Email sending failed after ${options.maxRetries} attempts: ${errorMessage}`);
}

// Send mail with detailed result tracking
export async function sendMailWithResult(
  payload: MailPayload,
  retryOptions?: EmailRetryOptions
): Promise<EmailDeliveryResult> {
  const options: EmailRetryOptions = {
    maxRetries: 3,
    baseDelay: 1000,
    maxDelay: 30000,
    backoffFactor: 2,
    ...retryOptions,
  };

  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= (options.maxRetries || 3); attempt++) {
    try {
      const messageId = await sendMail(payload, { maxRetries: 1 }); // Single attempt per call
      return {
        success: true,
        messageId,
        attempts: attempt,
      };
    } catch (error: unknown) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Don't retry on the last attempt
      if (attempt === options.maxRetries) {
        break;
      }

      // Calculate delay and wait before retry
      const delay = calculateDelay(attempt, options);
      await sleep(delay);
    }
  }

  // All attempts failed
  return {
    success: false,
    error: lastError?.message || "Unknown error",
    attempts: options.maxRetries || 3,
  };
}

// Send admin notification
export async function sendAdminNotification(
  type: string,
  payload: { subject: string; html: string; metadata?: Record<string, unknown> }
): Promise<string> {
  const adminEmails = process.env.ADMIN_EMAILS?.split(",") || ["contact@brolabentertainment.com"];

  return await sendMail({
    to: adminEmails,
    subject: `[BroLab Admin] ${payload.subject}`,
    html: `
      <div style="font-family: Arial, sans-serif; padding: 20px;">
        <h2 style="color: #8B5CF6;">Admin Notification - ${type}</h2>
        ${payload.html}
        ${payload.metadata ? `<pre style="background: #f5f5f5; padding: 10px; margin-top: 20px;">${JSON.stringify(payload.metadata, null, 2)}</pre>` : ""}
      </div>
    `,
  });
}

export default { sendMail, sendAdminNotification };
