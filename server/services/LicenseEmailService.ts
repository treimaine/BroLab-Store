/**
 * LicenseEmailService - Sends license PDF emails after beat purchases
 *
 * @module server/services/LicenseEmailService
 */

import { LicenseType } from "../../shared/types/Beat";
import { sendMailWithResult, type EmailDeliveryResult } from "./mail";

/**
 * License email data
 */
export interface LicenseEmailData {
  /** Buyer email */
  buyerEmail: string;
  /** Buyer name */
  buyerName: string;
  /** Beat title */
  beatTitle: string;
  /** License type */
  licenseType: LicenseType;
  /** License reference number */
  licenseNumber: string;
  /** URL to download license PDF */
  licenseUrl: string;
  /** Order ID */
  orderId: string;
  /** Purchase date */
  purchaseDate: Date;
  /** Price paid */
  price: number;
  /** Currency */
  currency: string;
}

/**
 * Generate license email HTML
 */
function generateLicenseEmailHtml(data: LicenseEmailData): string {
  const formattedDate = data.purchaseDate.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const licenseTypeDisplay = data.licenseType.charAt(0).toUpperCase() + data.licenseType.slice(1);

  return `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"></head>
    <body style="margin: 0; padding: 0; background: #f4f4f4; font-family: Arial, sans-serif;">
      <div style="max-width: 600px; margin: 0 auto;">
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%); padding: 30px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 28px;">🎵 Your License Certificate</h1>
          <p style="color: #E5E7EB; margin: 10px 0 0 0; font-size: 16px;">BroLab Entertainment</p>
        </div>
        
        <!-- Content -->
        <div style="padding: 30px; background: white;">
          <h2 style="color: #333; margin: 0 0 20px 0;">Hey ${data.buyerName}! 🎉</h2>
          <p style="color: #666; line-height: 1.6; margin-bottom: 30px;">
            Thank you for your purchase! Your license certificate for <strong>"${data.beatTitle}"</strong> is ready.
          </p>
          
          <!-- License Info Box -->
          <div style="background: #EEF2FF; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #7C3AED; margin: 0 0 15px 0;">License Details</h3>
            <p style="margin: 5px 0;"><strong>Beat:</strong> ${data.beatTitle}</p>
            <p style="margin: 5px 0;"><strong>License Type:</strong> ${licenseTypeDisplay}</p>
            <p style="margin: 5px 0;"><strong>Reference:</strong> ${data.licenseNumber}</p>
            <p style="margin: 5px 0;"><strong>Date:</strong> ${formattedDate}</p>
            <p style="margin: 5px 0;"><strong>Amount:</strong> ${data.currency} ${data.price.toFixed(2)}</p>
          </div>
          
          <!-- Download Button -->
          <div style="text-align: center; margin: 30px 0;">
            <a href="${data.licenseUrl}" 
               style="background: #8B5CF6; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
              📄 Download License PDF
            </a>
          </div>
          
          <!-- Important Notice -->
          <div style="background: #FEF3C7; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #F59E0B;">
            <h4 style="color: #92400E; margin: 0 0 10px 0;">Important</h4>
            <p style="color: #78350F; margin: 0; font-size: 14px;">
              Keep this license certificate safe. It serves as proof of your purchase and outlines your usage rights.
              Credit must be given as: "Produced by BroLab Entertainment"
            </p>
          </div>
          
          <!-- What's Included -->
          <div style="margin: 20px 0;">
            <h3 style="color: #333; margin: 0 0 15px 0;">What's Included in Your ${licenseTypeDisplay} License:</h3>
            <ul style="color: #666; line-height: 1.8; padding-left: 20px;">
              ${getLicenseFeaturesList(data.licenseType)}
            </ul>
          </div>
          
          <p style="color: #999; font-size: 14px; margin-top: 30px;">
            Your files are also available in your dashboard. If you have any questions, don't hesitate to reach out!
          </p>
        </div>
        
        <!-- Footer -->
        <div style="background: #F9FAFB; padding: 20px; text-align: center; color: #6B7280; font-size: 14px;">
          <p style="margin: 0;">BroLab Entertainment - Professional Music Production</p>
          <p style="margin: 5px 0 0 0;">📧 licensing@brolabentertainment.com</p>
          <p style="margin: 10px 0 0 0; font-size: 12px; color: #9CA3AF;">
            Order #${data.orderId.substring(0, 12)}
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
}

/**
 * Get license features list HTML based on license type
 */
function getLicenseFeaturesList(licenseType: LicenseType): string {
  const features: Record<LicenseType, string[]> = {
    [LicenseType.BASIC]: [
      "Up to 2,000 copies/sales",
      "Streaming on all platforms",
      "Music video rights",
      "Non-exclusive license",
    ],
    [LicenseType.PREMIUM]: [
      "Up to 10,000 copies/sales",
      "Streaming on all platforms",
      "Music video rights",
      "Radio play rights",
      "Non-exclusive license",
    ],
    [LicenseType.UNLIMITED]: [
      "Unlimited copies/sales",
      "Streaming on all platforms",
      "Music video rights",
      "Radio play rights",
      "Exclusive rights to the beat",
    ],
  };

  return features[licenseType].map(f => `<li>${f}</li>`).join("");
}

/**
 * Send license email to buyer
 */
export async function sendLicenseEmail(data: LicenseEmailData): Promise<EmailDeliveryResult> {
  const html = generateLicenseEmailHtml(data);

  const result = await sendMailWithResult({
    to: data.buyerEmail,
    subject: `🎵 Your License Certificate - ${data.beatTitle} | BroLab Entertainment`,
    html,
  });

  if (result.success) {
    console.log(`✅ License email sent to ${data.buyerEmail} for ${data.beatTitle}`);
  } else {
    console.error(`❌ Failed to send license email to ${data.buyerEmail}:`, result.error);
  }

  return result;
}

/**
 * Send multiple license emails for an order
 */
export async function sendLicenseEmailsForOrder(
  licenses: LicenseEmailData[]
): Promise<EmailDeliveryResult[]> {
  const results: EmailDeliveryResult[] = [];

  for (const license of licenses) {
    const result = await sendLicenseEmail(license);
    results.push(result);
  }

  return results;
}

export default { sendLicenseEmail, sendLicenseEmailsForOrder };
