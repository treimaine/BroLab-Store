import { ConvexHttpClient } from "convex/browser";
import type { Id } from "../../convex/_generated/dataModel";
import type { LicenseTypeEnum } from "../../shared/schema";
import { BrandConfig, buildInvoicePdfStreamAsync } from "../lib/pdf";
import { sendMail } from "./mail";

/**
 * Invoice generation result
 */
export interface InvoiceResult {
  invoiceUrl: string;
  invoiceNumber: string;
  storageId: string;
}

/**
 * Order item for invoice generation
 */
export interface InvoiceOrderItem {
  productId: string | number;
  title: string;
  unitPrice: number;
  totalPrice: number;
  qty: number;
  type?: string;
}

/**
 * Order data for invoice generation
 */
export interface InvoiceOrderData {
  id: string;
  userId?: string;
  email: string;
  total: number;
  currency: string;
  invoiceNumber?: string;
  sessionId?: string;
  paymentIntentId?: string;
  createdAt?: string;
}

/**
 * InvoiceService - Handles PDF invoice generation and email delivery
 *
 * Responsibilities:
 * - Generate invoice PDFs for orders and reservations
 * - Upload PDFs to Convex storage
 * - Send invoice emails to customers
 * - Track invoice generation in audit log
 */
export class InvoiceService {
  private readonly convex: ConvexHttpClient;
  private readonly brandConfig: BrandConfig;

  constructor(convexUrl: string) {
    this.convex = new ConvexHttpClient(convexUrl);
    this.brandConfig = {
      name: process.env.BRAND_NAME || "BroLab Entertainment",
      email: process.env.BRAND_EMAIL || "billing@brolabentertainment.com",
      address: process.env.BRAND_ADDRESS || "",
      logoPath: process.env.BRAND_LOGO_PATH || "",
    };
  }

  /**
   * Generate invoice PDF and upload to Convex storage
   *
   * @param order - Order data
   * @param items - Order items
   * @returns Invoice result with URL, number, and storage ID
   */
  async generateInvoice(
    order: InvoiceOrderData,
    items: InvoiceOrderItem[]
  ): Promise<InvoiceResult> {
    try {
      console.log("📄 Generating invoice PDF for order:", order.id);

      // Convert order data to format compatible with PDF generation
      const orderForPdf = {
        id: 1, // PDF library expects number
        status: "completed" as const,
        created_at: order.createdAt || new Date().toISOString(),
        invoice_number: order.invoiceNumber || this.generateInvoiceNumber(),
        user_id: order.userId ? 1 : null,
        session_id: order.sessionId || null,
        email: order.email,
        total: order.total,
        stripe_payment_intent_id: order.paymentIntentId || null,
        items: [],
        invoice_pdf_url: undefined,
        shipping_address: null,
      };

      // Convert items to format compatible with PDF generation
      const pdfItems = items.map(item => {
        const validLicenseTypes = ["unlimited", "basic", "premium"] as const;
        const licenseType =
          item.type &&
          typeof item.type === "string" &&
          validLicenseTypes.includes(item.type as LicenseTypeEnum)
            ? (item.type as LicenseTypeEnum)
            : ("basic" as const);

        return {
          id:
            typeof item.productId === "number"
              ? item.productId
              : Number.parseInt(String(item.productId || "0")) || 0,
          beat_id:
            typeof item.productId === "number"
              ? item.productId
              : Number.parseInt(String(item.productId || "0")) || 0,
          license_type: licenseType,
          price: (item.totalPrice || item.unitPrice || 0) / 100,
          quantity: item.qty || 1,
          created_at: new Date().toISOString(),
          session_id: null,
          user_id: null,
        };
      });

      // Generate PDF stream
      const pdfStream = await buildInvoicePdfStreamAsync(orderForPdf, pdfItems, this.brandConfig);

      // Collect PDF chunks
      const chunks: Buffer[] = [];
      for await (const chunk of pdfStream) {
        if (Buffer.isBuffer(chunk)) {
          chunks.push(chunk);
        } else if (typeof chunk === "string") {
          chunks.push(Buffer.from(chunk));
        }
      }

      const buffer = Buffer.concat(chunks);

      // Upload to Convex storage
      const uploadUrlResult = await (
        this.convex.action as (
          name: string,
          args: Record<string, never>
        ) => Promise<{ url: string }>
      )("files:generateUploadUrl", {});
      const { url } = uploadUrlResult;

      const uploadRes = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/pdf" },
        body: buffer,
      });

      if (!uploadRes.ok) {
        throw new Error(`Failed to upload PDF: ${uploadRes.statusText}`);
      }

      const uploadJson = await uploadRes.json();
      const storageId = uploadJson.storageId;

      if (typeof storageId !== "string") {
        throw new TypeError("Invalid storage ID returned from upload");
      }

      // Save invoice to order
      const orderId = order.id as Id<"orders">;
      const result = await (
        this.convex.mutation as (
          name: string,
          args: {
            orderId: Id<"orders">;
            storageId: string;
            amount: number;
            currency: string;
            taxAmount: number;
            billingInfo: { email: string };
          }
        ) => Promise<{ url?: string; number?: string }>
      )("orders:setInvoiceForOrder", {
        orderId,
        storageId,
        amount: Number(order.total || 0),
        currency: String(order.currency || "USD").toUpperCase(),
        taxAmount: 0, // No tax in current implementation
        billingInfo: { email: order.email },
      });

      const resultData =
        result && typeof result === "object" ? (result as { url?: string; number?: string }) : null;

      if (!resultData?.url || !resultData?.number) {
        throw new Error("Failed to get invoice URL or number from Convex");
      }

      // Log invoice generation to audit
      await this.logInvoiceGeneration(order.id, order.userId, storageId);

      console.log("✅ Invoice generated successfully:", resultData.number);

      return {
        invoiceUrl: resultData.url,
        invoiceNumber: resultData.number,
        storageId,
      };
    } catch (error) {
      console.error("❌ Failed to generate invoice:", error);

      // Log error to audit
      await this.logInvoiceGenerationError(
        order.id,
        order.userId,
        error instanceof Error ? error.message : String(error)
      );

      throw new Error(
        `Invoice generation failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Send invoice email to customer
   *
   * @param email - Customer email address
   * @param invoiceUrl - URL to download invoice
   * @param invoiceNumber - Invoice number
   */
  async sendInvoiceEmail(email: string, invoiceUrl: string, invoiceNumber: string): Promise<void> {
    try {
      console.log("📧 Sending invoice email to:", email);

      await sendMail({
        to: email,
        subject: `Votre facture ${invoiceNumber} - BroLab Entertainment`,
        html: this.generateInvoiceEmailHtml(invoiceUrl, invoiceNumber),
      });

      console.log("✅ Invoice email sent successfully");
    } catch (error) {
      console.error("❌ Failed to send invoice email:", error);
      throw new Error(
        `Invoice email sending failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Generate invoice number
   * Format: INV-YYYYMMDD-XXXXX
   */
  private generateInvoiceNumber(): string {
    const date = new Date();
    const dateStr = date.toISOString().slice(0, 10).replaceAll("-", "");
    const random = Math.floor(Math.random() * 100000)
      .toString()
      .padStart(5, "0");
    return `INV-${dateStr}-${random}`;
  }

  /**
   * Generate invoice email HTML
   */
  private generateInvoiceEmailHtml(invoiceUrl: string, invoiceNumber: string): string {
    return `
      <!DOCTYPE html>
      <html>
      <head><meta charset="utf-8"></head>
      <body style="margin: 0; padding: 0; background: #f4f4f4; font-family: Arial, sans-serif;">
        <div style="max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%); padding: 30px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 28px;">Votre Facture</h1>
            <p style="color: #E5E7EB; margin: 10px 0 0 0; font-size: 16px;">BroLab Entertainment</p>
          </div>
          
          <div style="padding: 30px; background: white;">
            <h2 style="color: #333; margin: 0 0 20px 0;">Merci pour votre paiement ! 🎉</h2>
            <p style="color: #666; line-height: 1.6; margin-bottom: 30px;">
              Votre paiement a été traité avec succès. Vous trouverez ci-dessous le lien pour télécharger votre facture.
            </p>
            
            <div style="background: #EEF2FF; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <p style="margin: 0;"><strong>Numéro de facture :</strong> ${invoiceNumber}</p>
              <p style="margin: 10px 0 0 0;"><strong>Date :</strong> ${new Date().toLocaleDateString("fr-FR")}</p>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${invoiceUrl}" 
                 style="background: #8B5CF6; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
                Télécharger la facture
              </a>
            </div>
            
            <p style="color: #999; font-size: 14px; margin-top: 30px;">
              Conservez cette facture pour vos dossiers. Si vous avez des questions, n'hésitez pas à nous contacter.
            </p>
          </div>
          
          <div style="background: #F9FAFB; padding: 20px; text-align: center; color: #6B7280; font-size: 14px;">
            <p style="margin: 0;">BroLab Entertainment - Professional Music Production Services</p>
            <p style="margin: 5px 0 0 0;">📧 ${this.brandConfig.email}</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Log invoice generation to audit
   */
  private async logInvoiceGeneration(
    orderId: string,
    userId: string | undefined,
    storageId: string
  ): Promise<void> {
    try {
      await (
        this.convex.mutation as (
          name: string,
          args: {
            userId?: Id<"users">;
            action: string;
            resource: string;
            resourceId: string;
            metadata: Record<string, unknown>;
          }
        ) => Promise<void>
      )("audit:logAction", {
        userId: userId as Id<"users"> | undefined,
        action: "invoice_generated",
        resource: "orders",
        resourceId: orderId,
        metadata: {
          storageId,
          timestamp: Date.now(),
        },
      });
    } catch (error) {
      console.error("❌ Failed to log invoice generation to audit:", error);
      // Don't throw - audit logging failure shouldn't break invoice generation
    }
  }

  /**
   * Log invoice generation error to audit
   */
  private async logInvoiceGenerationError(
    orderId: string,
    userId: string | undefined,
    errorMessage: string
  ): Promise<void> {
    try {
      await (
        this.convex.mutation as (
          name: string,
          args: {
            userId?: Id<"users">;
            action: string;
            resource: string;
            resourceId: string;
            metadata: Record<string, unknown>;
          }
        ) => Promise<void>
      )("audit:logAction", {
        userId: userId as Id<"users"> | undefined,
        action: "invoice_generation_error",
        resource: "orders",
        resourceId: orderId,
        metadata: {
          error: errorMessage,
          timestamp: Date.now(),
        },
      });
    } catch (error) {
      console.error("❌ Failed to log invoice generation error to audit:", error);
      // Don't throw - audit logging failure shouldn't break error handling
    }
  }
}

// Export singleton instance
let invoiceServiceInstance: InvoiceService | null = null;

export const getInvoiceService = (): InvoiceService => {
  if (!invoiceServiceInstance) {
    const convexUrl = process.env.VITE_CONVEX_URL;
    if (!convexUrl) {
      throw new Error("VITE_CONVEX_URL environment variable is required");
    }
    invoiceServiceInstance = new InvoiceService(convexUrl);
  }
  return invoiceServiceInstance;
};

export default InvoiceService;
