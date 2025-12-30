/**
 * LicensePdfService - Generates professional license PDF certificates
 *
 * Creates modern, branded license PDFs for beat purchases inspired by
 * BeatStars, Airbit, and Cymatics designs.
 *
 * @module server/services/LicensePdfService
 */

import { ConvexHttpClient } from "convex/browser";
import crypto from "node:crypto";
import PDFDocument from "pdfkit";
import { DEFAULT_LICENSE_TERMS, LICENSE_PRICING, LicenseType } from "../../shared/types/Beat";

/**
 * License PDF generation input
 */
export interface LicensePdfInput {
  /** Order ID */
  orderId: string;
  /** Order item index or ID */
  itemId: string;
  /** Beat/product information */
  beat: {
    id: number;
    title: string;
    producer?: string;
  };
  /** License type purchased */
  licenseType: LicenseType;
  /** Buyer information */
  buyer: {
    name: string;
    email: string;
    userId?: string;
  };
  /** Purchase date */
  purchaseDate: Date;
  /** Order total for this item */
  price: number;
  /** Currency */
  currency: string;
}

/**
 * License PDF generation result
 */
export interface LicensePdfResult {
  /** URL to download the license PDF */
  licenseUrl: string;
  /** Unique license reference number */
  licenseNumber: string;
  /** Convex storage ID */
  storageId: string;
}

/**
 * Brand configuration for PDF styling
 */
interface BrandConfig {
  name: string;
  email: string;
  website: string;
  logoUrl?: string;
}

/**
 * LicensePdfService
 *
 * Generates professional license certificates for beat purchases.
 * Features:
 * - Modern design with gradient header
 * - Unique license reference number
 * - License terms and conditions
 * - QR code placeholder for verification
 * - Idempotent generation (checks if already exists)
 */
export class LicensePdfService {
  private static instance: LicensePdfService;
  private readonly convex: ConvexHttpClient;
  private readonly brandConfig: BrandConfig;

  private constructor(convexUrl: string) {
    this.convex = new ConvexHttpClient(convexUrl);
    this.brandConfig = {
      name: process.env.BRAND_NAME || "BroLab Entertainment",
      email: process.env.BRAND_EMAIL || "licensing@brolabentertainment.com",
      website: process.env.BRAND_WEBSITE || "https://brolabentertainment.com",
      logoUrl: process.env.BRAND_LOGO_URL,
    };
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): LicensePdfService {
    if (!LicensePdfService.instance) {
      const convexUrl = process.env.VITE_CONVEX_URL;
      if (!convexUrl) {
        throw new Error("VITE_CONVEX_URL environment variable is required");
      }
      LicensePdfService.instance = new LicensePdfService(convexUrl);
    }
    return LicensePdfService.instance;
  }

  /**
   * Generate a unique license reference number
   * Format: LICENSE-<orderId>-<itemId>-<hash>
   */
  private generateLicenseNumber(orderId: string, itemId: string): string {
    const hash = crypto
      .createHash("sha256")
      .update(`${orderId}-${itemId}-${Date.now()}`)
      .digest("hex")
      .substring(0, 8)
      .toUpperCase();

    return `LICENSE-${orderId.substring(0, 8).toUpperCase()}-${itemId}-${hash}`;
  }

  /**
   * Get license terms description based on license type
   */
  private getLicenseTermsText(licenseType: LicenseType): string[] {
    const terms = DEFAULT_LICENSE_TERMS[licenseType];

    const copiesLine =
      terms.copiesSold === -1
        ? "• Unlimited copies/sales"
        : `• Up to ${terms.copiesSold.toLocaleString()} copies/sales`;

    return [
      `License Type: ${licenseType.toUpperCase()}`,
      `Price: ${LICENSE_PRICING[licenseType]}`,
      "",
      "RIGHTS GRANTED:",
      copiesLine,
      `• Streaming: ${terms.streaming ? "Yes" : "No"}`,
      `• Music Videos: ${terms.musicVideos ? "Yes" : "No"}`,
      `• Radio Play: ${terms.radioPlay ? "Yes" : "No"}`,
      `• Exclusive Rights: ${terms.exclusive ? "Yes" : "No"}`,
    ];
  }

  /**
   * Build the license PDF document
   */
  private async buildLicensePdf(input: LicensePdfInput, licenseNumber: string): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({
          size: "A4",
          margin: 40,
          info: {
            Title: `License Certificate - ${input.beat.title}`,
            Author: this.brandConfig.name,
            Subject: `Beat License - ${licenseNumber}`,
            Keywords: "license, beat, music, certificate",
          },
        });

        const chunks: Buffer[] = [];
        doc.on("data", (chunk: Buffer) => chunks.push(chunk));
        doc.on("end", () => resolve(Buffer.concat(chunks)));
        doc.on("error", reject);

        // Page dimensions
        const pageWidth = doc.page.width;
        const pageHeight = doc.page.height;
        const margin = 40;
        const contentWidth = pageWidth - margin * 2;

        // ========== HEADER WITH GRADIENT ==========
        // Purple gradient header (BroLab brand colors)
        doc.rect(0, 0, pageWidth, 120).fill("#7C3AED");
        doc.rect(0, 100, pageWidth, 20).fill("#8B5CF6");

        // Brand name
        doc.fillColor("#FFFFFF").fontSize(28).font("Helvetica-Bold");
        doc.text(this.brandConfig.name, margin, 35, { width: contentWidth });

        // Certificate title
        doc.fontSize(14).font("Helvetica");
        doc.text("OFFICIAL LICENSE CERTIFICATE", margin, 70, { width: contentWidth });

        // License number badge
        doc.fontSize(10);
        doc.text(licenseNumber, margin, 90, { width: contentWidth });

        // ========== MAIN CONTENT ==========
        let yPos = 140;

        // Beat title section
        doc.fillColor("#1F2937").fontSize(12).font("Helvetica-Bold");
        doc.text("LICENSED BEAT", margin, yPos);
        yPos += 20;

        doc.fontSize(22).fillColor("#7C3AED");
        doc.text(input.beat.title, margin, yPos, { width: contentWidth });
        yPos += 35;

        if (input.beat.producer) {
          doc.fontSize(12).fillColor("#6B7280").font("Helvetica");
          doc.text(`Produced by: ${input.beat.producer}`, margin, yPos);
          yPos += 25;
        }

        // Divider line
        doc
          .moveTo(margin, yPos)
          .lineTo(pageWidth - margin, yPos)
          .stroke("#E5E7EB");
        yPos += 20;

        // Two-column layout for details
        const col1X = margin;
        const col2X = pageWidth / 2 + 20;
        const colWidth = (contentWidth - 40) / 2;

        // Left column - Licensee Info
        doc.fillColor("#1F2937").fontSize(11).font("Helvetica-Bold");
        doc.text("LICENSEE INFORMATION", col1X, yPos);
        yPos += 18;

        doc.fontSize(10).font("Helvetica").fillColor("#374151");
        doc.text(`Name: ${input.buyer.name}`, col1X, yPos, { width: colWidth });
        yPos += 15;
        doc.text(`Email: ${input.buyer.email}`, col1X, yPos, { width: colWidth });
        yPos += 15;
        doc.text(
          `Date: ${input.purchaseDate.toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
          })}`,
          col1X,
          yPos,
          { width: colWidth }
        );

        // Right column - License Info
        let rightYPos = yPos - 48;
        doc.fillColor("#1F2937").fontSize(11).font("Helvetica-Bold");
        doc.text("LICENSE DETAILS", col2X, rightYPos);
        rightYPos += 18;

        doc.fontSize(10).font("Helvetica").fillColor("#374151");
        doc.text(`Type: ${input.licenseType.toUpperCase()}`, col2X, rightYPos, { width: colWidth });
        rightYPos += 15;
        doc.text(`Price: ${input.currency} ${input.price.toFixed(2)}`, col2X, rightYPos, {
          width: colWidth,
        });
        rightYPos += 15;
        doc.text(`Order: ${input.orderId.substring(0, 12)}...`, col2X, rightYPos, {
          width: colWidth,
        });

        yPos += 40;

        // Divider
        doc
          .moveTo(margin, yPos)
          .lineTo(pageWidth - margin, yPos)
          .stroke("#E5E7EB");
        yPos += 20;

        // ========== LICENSE TERMS BOX ==========
        const termsBoxHeight = 180;
        doc.rect(margin, yPos, contentWidth, termsBoxHeight).fill("#F3F4F6");

        doc.fillColor("#1F2937").fontSize(11).font("Helvetica-Bold");
        doc.text("LICENSE TERMS & CONDITIONS", margin + 15, yPos + 15);

        const termsLines = this.getLicenseTermsText(input.licenseType);
        let termsY = yPos + 35;
        doc.fontSize(9).font("Helvetica").fillColor("#374151");

        for (const line of termsLines) {
          doc.text(line, margin + 15, termsY, { width: contentWidth - 30 });
          termsY += 14;
        }

        yPos += termsBoxHeight + 20;

        // ========== IMPORTANT NOTICE ==========
        doc.rect(margin, yPos, contentWidth, 60).fill("#FEF3C7");
        doc.fillColor("#92400E").fontSize(9).font("Helvetica-Bold");
        doc.text("IMPORTANT NOTICE", margin + 15, yPos + 12);
        doc.font("Helvetica").fontSize(8);
        doc.text(
          "This license is non-transferable and grants the licensee the rights specified above. " +
            "The producer retains all ownership rights to the beat. Credit must be given as: " +
            `"Produced by ${input.beat.producer || this.brandConfig.name}"`,
          margin + 15,
          yPos + 28,
          { width: contentWidth - 30 }
        );

        // ========== FOOTER ==========
        // Footer background
        doc.rect(0, pageHeight - 80, pageWidth, 80).fill("#1F2937");

        // Footer content
        doc.fillColor("#9CA3AF").fontSize(8).font("Helvetica");
        doc.text(
          `This license certificate was generated on ${new Date().toISOString().split("T")[0]}`,
          margin,
          pageHeight - 65,
          { width: contentWidth, align: "center" }
        );

        doc.fillColor("#FFFFFF").fontSize(9);
        doc.text(this.brandConfig.website, margin, pageHeight - 50, {
          width: contentWidth,
          align: "center",
        });

        doc.fillColor("#9CA3AF").fontSize(7);
        doc.text(`License Reference: ${licenseNumber}`, margin, pageHeight - 35, {
          width: contentWidth,
          align: "center",
        });

        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Check if license PDF already exists for this order item
   */
  private async checkExistingLicense(
    orderId: string,
    itemId: string
  ): Promise<LicensePdfResult | null> {
    try {
      const convexClient = this.convex as {
        query: (name: string, args: Record<string, unknown>) => Promise<unknown>;
      };

      const existing = await convexClient.query("licenses:getLicenseByOrderItem", {
        orderId,
        itemId,
      });

      if (existing && typeof existing === "object") {
        const license = existing as {
          licenseNumber: string;
          pdfUrl: string;
          storageId: string;
        };
        return {
          licenseNumber: license.licenseNumber,
          licenseUrl: license.pdfUrl,
          storageId: license.storageId,
        };
      }

      return null;
    } catch {
      // Query doesn't exist yet or no license found
      return null;
    }
  }

  /**
   * Upload PDF to Convex storage
   */
  private async uploadPdfToStorage(pdfBuffer: Buffer): Promise<{ storageId: string; url: string }> {
    const convexClient = this.convex as {
      action: (name: string, args: Record<string, unknown>) => Promise<unknown>;
    };

    // Get upload URL
    const uploadUrlResult = await convexClient.action("files:generateUploadUrl", {});
    const { url } = uploadUrlResult as { url: string };

    // Upload PDF
    const uploadRes = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/pdf" },
      body: pdfBuffer,
    });

    if (!uploadRes.ok) {
      throw new Error(`Failed to upload PDF: ${uploadRes.statusText}`);
    }

    const uploadJson = await uploadRes.json();
    const storageId = uploadJson.storageId as string;

    // Get public URL
    const pdfUrl = await this.getStorageUrl(storageId);

    return { storageId, url: pdfUrl };
  }

  /**
   * Get storage URL for a file
   */
  private async getStorageUrl(storageId: string): Promise<string> {
    const convexClient = this.convex as {
      mutation: (name: string, args: Record<string, unknown>) => Promise<unknown>;
    };

    try {
      // Note: getStorageUrl is a mutation in convex/files.ts
      const url = await convexClient.mutation("files:getStorageUrl", { storageId });
      return (url as string) || "";
    } catch {
      // Fallback: construct URL manually if mutation fails
      return `${process.env.VITE_CONVEX_URL?.replace(".cloud", ".site")}/api/storage/${storageId}`;
    }
  }

  /**
   * Save license record to database
   */
  private async saveLicenseRecord(
    input: LicensePdfInput,
    licenseNumber: string,
    storageId: string,
    pdfUrl: string
  ): Promise<void> {
    try {
      const convexClient = this.convex as {
        mutation: (name: string, args: Record<string, unknown>) => Promise<unknown>;
      };

      await convexClient.mutation("licenses:createLicense", {
        orderId: input.orderId,
        itemId: input.itemId,
        beatId: input.beat.id,
        beatTitle: input.beat.title,
        licenseType: input.licenseType,
        licenseNumber,
        buyerEmail: input.buyer.email,
        buyerName: input.buyer.name,
        buyerUserId: input.buyer.userId,
        price: input.price,
        currency: input.currency,
        pdfStorageId: storageId,
        pdfUrl,
        purchaseDate: input.purchaseDate.getTime(),
      });
    } catch (error) {
      // Log but don't fail - PDF was generated successfully
      console.warn("Failed to save license record to database:", error);
    }
  }

  /**
   * Generate license PDF for a beat purchase
   *
   * @param input - License generation input
   * @returns License PDF result with URL and reference number
   */
  async generateLicense(input: LicensePdfInput): Promise<LicensePdfResult> {
    console.log(`📄 Generating license PDF for order ${input.orderId}, item ${input.itemId}`);

    // Check for existing license (idempotency)
    const existing = await this.checkExistingLicense(input.orderId, input.itemId);
    if (existing) {
      console.log(`ℹ️ License already exists: ${existing.licenseNumber}`);
      return existing;
    }

    // Generate unique license number
    const licenseNumber = this.generateLicenseNumber(input.orderId, input.itemId);

    // Build PDF
    const pdfBuffer = await this.buildLicensePdf(input, licenseNumber);
    console.log(`✅ PDF generated: ${pdfBuffer.length} bytes`);

    // Upload to storage
    const { storageId, url: pdfUrl } = await this.uploadPdfToStorage(pdfBuffer);
    console.log(`✅ PDF uploaded: ${storageId}`);

    // Save license record
    await this.saveLicenseRecord(input, licenseNumber, storageId, pdfUrl);

    return {
      licenseUrl: pdfUrl,
      licenseNumber,
      storageId,
    };
  }

  /**
   * Generate licenses for all items in an order
   */
  async generateLicensesForOrder(
    orderId: string,
    items: Array<{
      itemId: string;
      beat: { id: number; title: string; producer?: string };
      licenseType: LicenseType;
      price: number;
    }>,
    buyer: { name: string; email: string; userId?: string },
    currency: string = "USD"
  ): Promise<LicensePdfResult[]> {
    const results: LicensePdfResult[] = [];
    const purchaseDate = new Date();

    for (const item of items) {
      try {
        const result = await this.generateLicense({
          orderId,
          itemId: item.itemId,
          beat: item.beat,
          licenseType: item.licenseType,
          buyer,
          purchaseDate,
          price: item.price,
          currency,
        });
        results.push(result);
      } catch (error) {
        console.error(`Failed to generate license for item ${item.itemId}:`, error);
        // Continue with other items
      }
    }

    return results;
  }
}

// Export singleton getter
export const getLicensePdfService = (): LicensePdfService => {
  return LicensePdfService.getInstance();
};

export default LicensePdfService;
