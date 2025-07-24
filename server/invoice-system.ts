import { Request, Response } from "express";
import nodemailer from "nodemailer";
import { v4 as uuidv4 } from "uuid";

// Email transporter configuration
const createEmailTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
};

interface InvoiceData {
  invoiceNumber: string;
  customerEmail: string;
  customerName: string;
  items: Array<{
    name: string;
    quantity: number;
    price: number;
    total: number;
  }>;
  subtotal: number;
  tax: number;
  total: number;
  paymentMethod: string;
  transactionId: string;
  date: string;
  billingAddress?: {
    line1: string;
    city: string;
    state: string;
    postal_code: string;
    country: string;
  };
}

// Generate invoice HTML
const generateInvoiceHTML = (invoice: InvoiceData): string => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Invoice ${invoice.invoiceNumber}</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background: #f4f4f4; }
        .invoice { background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 30px; border-bottom: 2px solid #8B5CF6; padding-bottom: 20px; }
        .logo { font-size: 24px; font-weight: bold; color: #8B5CF6; }
        .invoice-info { text-align: right; }
        .invoice-number { font-size: 18px; font-weight: bold; }
        .customer-info { margin-bottom: 30px; }
        .items-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
        .items-table th, .items-table td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
        .items-table th { background: #f8f9fa; font-weight: bold; }
        .totals { text-align: right; margin-top: 20px; }
        .totals .line { margin: 5px 0; }
        .total-amount { font-size: 18px; font-weight: bold; color: #8B5CF6; }
        .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; text-align: center; color: #666; }
      </style>
    </head>
    <body>
      <div class="invoice">
        <div class="header">
          <div class="logo">BroLab Entertainment</div>
          <div class="invoice-info">
            <div class="invoice-number">Invoice #${invoice.invoiceNumber}</div>
            <div>Date: ${invoice.date}</div>
          </div>
        </div>

        <div class="customer-info">
          <h3>Bill To:</h3>
          <div>${invoice.customerName}</div>
          <div>${invoice.customerEmail}</div>
          ${invoice.billingAddress ? `
            <div>${invoice.billingAddress.line1}</div>
            <div>${invoice.billingAddress.city}, ${invoice.billingAddress.state} ${invoice.billingAddress.postal_code}</div>
            <div>${invoice.billingAddress.country}</div>
          ` : ''}
        </div>

        <table class="items-table">
          <thead>
            <tr>
              <th>Item</th>
              <th>Quantity</th>
              <th>Price</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            ${invoice.items.map(item => `
              <tr>
                <td>${item.name}</td>
                <td>${item.quantity}</td>
                <td>$${item.price.toFixed(2)}</td>
                <td>$${item.total.toFixed(2)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div class="totals">
          <div class="line">Subtotal: $${invoice.subtotal.toFixed(2)}</div>
          ${invoice.tax > 0 ? `<div class="line">Tax: $${invoice.tax.toFixed(2)}</div>` : ''}
          <div class="line total-amount">Total: $${invoice.total.toFixed(2)}</div>
        </div>

        <div style="margin-top: 30px;">
          <h4>Payment Information</h4>
          <div>Payment Method: ${invoice.paymentMethod}</div>
          <div>Transaction ID: ${invoice.transactionId}</div>
          <div>Status: Paid</div>
        </div>

        <div class="footer">
          <p>Thank you for your purchase!</p>
          <p>BroLab Entertainment | support@brolabentertainment.com</p>
        </div>
      </div>
    </body>
    </html>
  `;
};

// Generate and send invoice
export const generateInvoice = async (req: Request, res: Response) => {
  try {
    const {
      customerEmail,
      customerName,
      items,
      subtotal,
      tax = 0,
      total,
      paymentMethod,
      transactionId,
      billingAddress
    } = req.body;

    const invoiceData: InvoiceData = {
      invoiceNumber: `INV-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
      customerEmail,
      customerName,
      items,
      subtotal,
      tax,
      total,
      paymentMethod,
      transactionId,
      date: new Date().toLocaleDateString(),
      billingAddress
    };

    const invoiceHTML = generateInvoiceHTML(invoiceData);

    // Send invoice via email if SMTP is configured
    if (process.env.SMTP_USER && process.env.SMTP_PASS) {
      const transporter = createEmailTransporter();
      
      await transporter.sendMail({
        from: `"BroLab Entertainment" <${process.env.SMTP_USER}>`,
        to: customerEmail,
        subject: `Invoice ${invoiceData.invoiceNumber} - BroLab Entertainment`,
        html: invoiceHTML,
      });
    }

    res.json({
      success: true,
      invoiceNumber: invoiceData.invoiceNumber,
      invoiceHTML,
      message: "Invoice generated successfully"
    });

  } catch (error: any) {
    console.error("Invoice generation error:", error);
    res.status(500).json({ error: error.message });
  }
};

// Get invoice by number
export const getInvoice = async (req: Request, res: Response) => {
  try {
    const { invoiceNumber } = req.params;
    
    // In production, retrieve from database
    // For now, return a placeholder response
    res.json({
      invoiceNumber,
      status: "paid",
      downloadUrl: `/api/invoice/${invoiceNumber}/download`
    });

  } catch (error: any) {
    console.error("Get invoice error:", error);
    res.status(500).json({ error: error.message });
  }
};

// Send receipt email
export const sendReceipt = async (req: Request, res: Response) => {
  try {
    const { customerEmail, customerName, orderDetails, downloadLinks } = req.body;

    const receiptHTML = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #8B5CF6;">Payment Confirmation</h2>
        <p>Dear ${customerName},</p>
        <p>Thank you for your purchase! Your payment has been processed successfully.</p>
        
        <h3>Order Details:</h3>
        <ul>
          ${orderDetails.items.map((item: any) => `
            <li>${item.name} - ${item.license} License - $${item.price}</li>
          `).join('')}
        </ul>
        
        <p><strong>Total: $${orderDetails.total}</strong></p>
        
        <h3>Download Your Beats:</h3>
        ${downloadLinks.map((link: string) => `
          <p><a href="${link}" style="color: #8B5CF6;">Download Beat</a></p>
        `).join('')}
        
        <p>Download links are valid for 30 days.</p>
        
        <p>Best regards,<br>BroLab Entertainment Team</p>
      </div>
    `;

    if (process.env.SMTP_USER && process.env.SMTP_PASS) {
      const transporter = createEmailTransporter();
      
      await transporter.sendMail({
        from: `"BroLab Entertainment" <${process.env.SMTP_USER}>`,
        to: customerEmail,
        subject: 'Payment Confirmation - Your Beats Are Ready!',
        html: receiptHTML,
      });
    }

    res.json({ success: true, message: "Receipt sent successfully" });

  } catch (error: any) {
    console.error("Send receipt error:", error);
    res.status(500).json({ error: error.message });
  }
};