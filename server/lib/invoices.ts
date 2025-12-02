import { Readable } from "node:stream";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { sendMail } from "../services/mail";
import { getConvex } from "./convex";
import { getOrderInvoiceData, saveInvoiceUrl } from "./db";
import { BrandConfig, buildInvoicePdfStream } from "./pdf";

export function makeInvoiceNumber(orderId: number, year?: number): string {
  const y = year || new Date().getFullYear();
  return `BRLB-${y}-${String(orderId).padStart(6, "0")}`;
}

/**
 * Ensure an invoice number exists for an order.
 * Uses Convex atomic counter for unique sequential numbers.
 * Idempotent: returns existing number if already generated.
 *
 * Requirements: 4.1, 4.2, 4.4
 *
 * @param orderId - Convex order ID (string) for Convex integration
 * @returns Invoice number in format BRLB-{YEAR}-{6-DIGIT-SEQUENCE}
 * @throws Error if Convex operation fails (strict error handling for invoices)
 */
export async function ensureInvoiceNumber(orderId: string): Promise<string> {
  try {
    const convex = getConvex();
    const invoiceNumber = await convex.mutation(
      // @ts-expect-error - Convex API type depth issue (known limitation)
      api.invoices.generateInvoiceNumber.generateInvoiceNumber,
      {
        orderId: orderId as Id<"orders">,
      }
    );
    return invoiceNumber;
  } catch (error) {
    // Strict error propagation for invoice generation (Requirements: 5.3)
    console.error("Failed to generate invoice number via Convex:", error);
    throw new Error(
      `Invoice number generation failed: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Ensure an invoice PDF exists for an order.
 * Generates PDF, uploads to Convex Storage, and creates invoice record.
 *
 * Requirements: 4.3
 *
 * @param orderId - Convex order ID (string) for Convex integration
 * @returns Signed URL for the invoice PDF
 * @throws Error if any step fails (strict error handling for invoices)
 */
export async function ensureInvoicePdf(orderId: string): Promise<string> {
  // For backward compatibility, we need to get order data
  // The getOrderInvoiceData function expects a number, but we're transitioning to string IDs
  // We'll extract the numeric part if needed, or use the full ID
  const numericOrderId = Number.parseInt(orderId.slice(-8), 10) || 0;
  const { order, items } = await getOrderInvoiceData(numericOrderId);

  const invoiceNumber = await ensureInvoiceNumber(orderId);
  const brand: BrandConfig = {
    name: process.env.BRAND_NAME || "BroLab Entertainment",
    email: process.env.BRAND_EMAIL || "billing@brolabentertainment.com",
    address: process.env.BRAND_ADDRESS || "",
    logoPath: process.env.BRAND_LOGO_PATH || "",
  };

  const pdfStream = buildInvoicePdfStream(
    { ...order, invoice_number: invoiceNumber },
    items,
    brand
  );

  // Collect PDF chunks into buffer
  const chunks: Buffer[] = [];
  for await (const chunk of pdfStream as Readable) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  const pdfBuffer = Buffer.concat(chunks);

  try {
    const convex = getConvex();

    // Upload PDF to Convex Storage
    const base64Data = pdfBuffer.toString("base64");

    const uploadResult = (await convex.action(api.files.storage.uploadToStorage, {
      fileData: base64Data,
      filename: `invoice-${invoiceNumber}.pdf`,
      mimeType: "application/pdf",
      bucket: "invoices",
    })) as { storageId: string; url: string };

    if (!uploadResult.storageId || !uploadResult.url) {
      throw new Error("Failed to upload PDF to Convex Storage");
    }

    // Create or update invoice record in Convex

    const invoiceResult = (await convex.mutation(
      api.invoices.createInvoiceRecord.createInvoiceRecord,
      {
        orderId: orderId as Id<"orders">,
        number: invoiceNumber,
        pdfStorageId: uploadResult.storageId,
        amount: order.total || 0,
        currency: "EUR",
      }
    )) as { invoiceId: Id<"invoicesOrders">; pdfUrl: string };

    const pdfUrl = invoiceResult.pdfUrl || uploadResult.url;

    // Also save to legacy system for backward compatibility
    await saveInvoiceUrl(numericOrderId, pdfUrl);

    // Send invoice email
    await sendInvoiceMail(orderId, pdfUrl, order.email);

    return pdfUrl;
  } catch (error) {
    // Strict error propagation for invoice generation (Requirements: 5.3)
    console.error("Failed to generate invoice PDF via Convex:", error);
    throw new Error(
      `Invoice PDF generation failed: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Send invoice email to customer
 *
 * @param orderId - Order ID (string or number for backward compatibility)
 * @param pdfUrl - URL to download the invoice PDF
 * @param to - Customer email address
 */
export async function sendInvoiceMail(
  orderId: string | number,
  pdfUrl: string,
  to: string
): Promise<void> {
  await sendMail({
    to,
    subject: `Your BroLab Invoice #${orderId}`,
    html: `<p>Thank you for your purchase!</p><p>Download your invoice: <a href="${pdfUrl}">${pdfUrl}</a></p>`,
  });
}
