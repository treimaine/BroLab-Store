import { Readable } from "node:stream";
import { sendMail } from "../services/mail";
import { getOrderInvoiceData, saveInvoiceUrl } from "./db";
import { BrandConfig, buildInvoicePdfStream } from "./pdf";

export function makeInvoiceNumber(orderId: number, year?: number): string {
  const y = year || new Date().getFullYear();
  return `BRLB-${y}-${String(orderId).padStart(6, "0")}`;
}

export async function ensureInvoiceNumber(orderId: number): Promise<string> {
  // Convex integration pending - using placeholder implementation
  const year = new Date().getFullYear();
  return makeInvoiceNumber(orderId, year);
}

export async function ensureInvoicePdf(orderId: number): Promise<string> {
  const { order, items } = await getOrderInvoiceData(orderId);
  const invoiceNumber = await ensureInvoiceNumber(orderId);
  const brand: BrandConfig = {
    name: process.env.BRAND_NAME!,
    email: process.env.BRAND_EMAIL!,
    address: process.env.BRAND_ADDRESS!,
    logoPath: process.env.BRAND_LOGO_PATH!,
  };
  const pdfStream = buildInvoicePdfStream(
    { ...order, invoice_number: invoiceNumber },
    items,
    brand
  );
  const chunks: Buffer[] = [];
  for await (const chunk of pdfStream as Readable) chunks.push(chunk);
  Buffer.concat(chunks);
  const path = `invoices/${orderId}.pdf`;

  // Convex integration pending - using placeholder implementation
  const data = { signedUrl: `https://placeholder.com/${path}` };
  await saveInvoiceUrl(orderId, data.signedUrl);
  await sendInvoiceMail(orderId, data.signedUrl, order.email);
  return data.signedUrl;
}

export async function sendInvoiceMail(orderId: number, pdfUrl: string, to: string): Promise<void> {
  await sendMail({
    to,
    subject: `Your BroLab Invoice #${orderId}`,
    html: `<p>Thank you for your purchase!</p><p>Download your invoice: <a href="${pdfUrl}">${pdfUrl}</a></p>`,
  });
}
