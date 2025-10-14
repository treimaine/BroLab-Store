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

// Configuration du transporteur SMTP
const createTransporter = (): Transporter => {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: Number(process.env.SMTP_PORT || 465),
    secure: process.env.SMTP_SECURE === "true",
    auth: {
      user: process.env.SMTP_USER!,
      pass: process.env.SMTP_PASS!,
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
    transporter = createTransporter();
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
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
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
