import { Readable } from 'stream';
import { sendMail } from '../services/mail';
import { getOrderInvoiceData, saveInvoiceUrl } from './db';
import { BrandConfig, buildInvoicePdfStream } from './pdf';
import { supabaseAdmin } from './supabaseAdmin';

export function makeInvoiceNumber(orderId: number, year?: number): string {
  const y = year || new Date().getFullYear();
  return `BRLB-${y}-${String(orderId).padStart(6, '0')}`;
}

export async function ensureInvoiceNumber(orderId: number): Promise<string> {
  // Récupère le numéro existant
  const { data, error } = await supabaseAdmin
    .from('orders')
    .select('invoice_number, created_at')
    .eq('id', orderId)
    .single();
  if (error) throw error;
  if (data && data.invoice_number) return data.invoice_number;
  // Génère et sauvegarde si absent
  const createdAt = data?.created_at ? new Date(data.created_at) : new Date();
  const year = createdAt.getFullYear();
  const invoiceNumber = makeInvoiceNumber(orderId, year);
  const { error: updateError } = await supabaseAdmin
    .from('orders')
    .update({ invoice_number: invoiceNumber })
    .eq('id', orderId);
  if (updateError) throw updateError;
  return invoiceNumber;
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
  const pdfStream = buildInvoicePdfStream({ ...order, invoice_number: invoiceNumber }, items, brand);
  const chunks: Buffer[] = [];
  for await (const chunk of pdfStream as Readable) chunks.push(chunk);
  const buffer = Buffer.concat(chunks);
  const path = `invoices/${orderId}.pdf`;
  const bucket = process.env.SUPABASE_INVOICES_BUCKET || 'invoices';
  await supabaseAdmin.storage.from(bucket).upload(path, buffer, { contentType: 'application/pdf', upsert: true });
  const { data, error } = await supabaseAdmin.storage.from(bucket).createSignedUrl(path, 3600);
  if (error || !data?.signedUrl) throw error || new Error('No signed URL');
  await saveInvoiceUrl(orderId, data.signedUrl);
  await sendInvoiceMail(orderId, data.signedUrl, order.email);
  return data.signedUrl;
}

export async function sendInvoiceMail(orderId: number, pdfUrl: string, to: string) {
  await sendMail({
    to,
    subject: `Votre facture BroLab #${orderId}`,
    html: `<p>Merci pour votre achat !</p><p>Téléchargez votre facture : <a href="${pdfUrl}">${pdfUrl}</a></p>`,
  });
}
