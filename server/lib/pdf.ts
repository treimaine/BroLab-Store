import fs from "node:fs";
import PDFDocument from "pdfkit";
import type { CartItem, Order } from "../../shared/schema";

export interface BrandConfig {
  name: string;
  email: string;
  address: string;
  logoPath: string;
}

export function buildInvoicePdfStream(
  order: Order & { invoice_number: string },
  items: CartItem[],
  brand: BrandConfig
): NodeJS.ReadableStream {
  const doc = new PDFDocument({ size: "A4", margin: 40 });
  // Header sombre + logo
  doc.rect(0, 0, doc.page.width, 80).fill("#22223b");
  if (brand.logoPath && fs.existsSync(brand.logoPath)) {
    doc.image(brand.logoPath, 40, 20, { width: 60 });
  }
  doc.fillColor("#fff").fontSize(20).text(brand.name, 110, 30, { continued: true });
  doc
    .fontSize(10)
    .text(`Facture n° ${order.invoice_number || ""}`, {
      align: "right",
      width: doc.page.width - 200,
    });
  doc.moveDown();
  doc.fillColor("#000");
  // Infos client/commande
  doc.fontSize(12).text(`Client : ${order.email}`);
  doc.text(`Date : ${order.created_at ? order.created_at.slice(0, 10) : ""}`);
  doc.text(`Adresse : ${brand.address}`);
  doc.moveDown();
  // Tableau items
  doc.fontSize(12).text("Items:", { underline: true });
  doc.moveDown(0.5);
  const tableTop = doc.y;
  doc
    .fontSize(10)
    .text("ID", 40, tableTop)
    .text("Licence", 120, tableTop)
    .text("Prix", 200, tableTop)
    .text("Qté", 270, tableTop)
    .text("Total", 320, tableTop);
  let y = tableTop + 15;
  items.forEach(item => {
    doc
      .text(String(item.beat_id ?? item.id ?? ""), 40, y)
      .text(item.license_type || "", 120, y)
      .text(`${String(item.price?.toFixed(2) || "")}€`, 200, y)
      .text(String(item.quantity || 1), 270, y)
      .text(`${String((item.price || 0) * (item.quantity || 1))}€`, 320, y);
    y += 15;
  });
  doc.moveTo(40, y).lineTo(500, y).stroke();
  y += 10;
  // Total
  doc.fontSize(12).text(`Total : ${order.total?.toFixed(2) || ""}€`, 320, y);
  doc.end();
  return doc;
}
