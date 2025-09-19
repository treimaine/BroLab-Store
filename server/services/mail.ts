import nodemailer, { Transporter } from "nodemailer";

export interface MailPayload {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  from?: string;
  replyTo?: string;
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

// Main send mail function
export async function sendMail(payload: MailPayload): Promise<string> {
  try {
    // Handle DRY_RUN mode
    if (process.env.MAIL_DRY_RUN === "true") {
      console.log("📧 MAIL DRY RUN:", {
        to: payload.to,
        subject: payload.subject,
        from: payload.from || process.env.DEFAULT_FROM,
      });
      return "dry-run-message-id";
    }

    const transporter = getTransporter();

    const mailOptions = {
      from: payload.from || process.env.DEFAULT_FROM || "BroLab <contact@brolabentertainment.com>",
      to: payload.to,
      subject: payload.subject,
      html: payload.html,
      text: payload.text || stripHTML(payload.html),
      replyTo: payload.replyTo,
    };

    const result = await transporter.sendMail(mailOptions);
    console.log("✅ Email sent successfully:", result.messageId);
    return result.messageId;
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("❌ Failed to send email:", errorMessage);
    throw new Error(`Email sending failed: ${errorMessage}`);
  }
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
