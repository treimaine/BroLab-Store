/**
 * Script de test pour vérifier la configuration email
 *
 * Usage:
 *   npm run test:email
 *
 * Ou directement:
 *   npx tsx scripts/test-email.ts
 */

import dotenv from "dotenv";
import path from "path";

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, "../.env") });

import { sendMail } from "../server/services/mail";

async function testEmailConfiguration(): Promise<void> {
  console.log("🧪 Testing email configuration...\n");

  // Check configuration (without exposing sensitive values)
  console.log("📋 Configuration:");
  console.log(
    `  RESEND_API_KEY: ${process.env.RESEND_API_KEY ? "✅ Configured" : "❌ Not configured"}`
  );
  console.log(`  SMTP_HOST: ${process.env.SMTP_HOST ? "✅ Configured" : "❌ Not configured"}`);
  console.log(`  SMTP_PORT: ${process.env.SMTP_PORT ? "✅ Configured" : "❌ Not configured"}`);
  console.log(`  SMTP_USER: ${process.env.SMTP_USER ? "✅ Configured" : "❌ Not configured"}`);
  console.log(`  SMTP_PASS: ${process.env.SMTP_PASS ? "✅ Configured" : "❌ Not configured"}`);
  console.log();

  // Validate configuration
  const hasResend = !!process.env.RESEND_API_KEY;
  const hasGmail =
    process.env.SMTP_USER &&
    process.env.SMTP_PASS &&
    process.env.SMTP_USER !== "your_email@gmail.com" &&
    process.env.SMTP_PASS !== "your_app_password_here";

  if (!hasResend && !hasGmail) {
    console.error("❌ Email not configured!");
    console.error("\nPlease configure one of the following:");
    console.error("  1. Set RESEND_API_KEY in .env (recommended)");
    console.error("  2. Set SMTP_USER and SMTP_PASS in .env (Gmail)");
    console.error("\nSee docs/EMAIL_CONFIGURATION.md for instructions.");
    process.exit(1);
  }

  console.log(`✅ Email service configured\n`);

  // Get test email address
  const testEmail =
    process.env.TEST_EMAIL || process.env.SMTP_USER || "treigua@brolabentertainment.com";

  console.log(`📧 Sending test email to: ${testEmail}\n`);

  try {
    const _messageId = await sendMail({
      to: testEmail,
      subject: "BroLab Email Test",
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px;">
          <h1 style="color: #8B5CF6;">✅ Email Configuration Test</h1>
          <p>This is a test email from BroLab Entertainment.</p>
          <p>If you received this email, your email configuration is working correctly!</p>
          <hr style="margin: 20px 0; border: none; border-top: 1px solid #e5e7eb;">
          <p style="color: #6b7280; font-size: 14px;">
            <strong>Configuration:</strong><br>
            Service: ${hasResend ? "Resend" : "Gmail SMTP"}<br>
            Timestamp: ${new Date().toISOString()}
          </p>
        </div>
      `,
    });

    console.log("✅ Test email sent successfully!");
    console.log(`\n📬 Check your inbox for the test email.`);
  } catch (error) {
    console.error("❌ Failed to send test email:");
    console.error(error);
    console.error("\nTroubleshooting:");
    if (!hasResend) {
      console.error("  - Verify your Gmail App Password is correct");
      console.error("  - Ensure 2FA is enabled on your Google account");
      console.error("  - Check that SMTP_USER and SMTP_PASS are set correctly");
    } else {
      console.error("  - Verify your Resend API key is correct");
      console.error("  - Check that your domain is verified in Resend");
    }
    console.error("\nSee docs/EMAIL_CONFIGURATION.md for more help.");
    process.exit(1);
  }
}

// Run test
testEmailConfiguration().catch(error => {
  console.error("❌ Unexpected error:", error);
  process.exit(1);
});
