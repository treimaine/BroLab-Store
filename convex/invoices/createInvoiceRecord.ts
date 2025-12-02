import { v } from "convex/values";
import type { Id } from "../_generated/dataModel";
import { mutation } from "../_generated/server";

/**
 * Create or update an invoice record for an order.
 * Stores the PDF URL and invoice metadata in the invoicesOrders table.
 *
 * Requirements: 4.3
 */
export const createInvoiceRecord = mutation({
  args: {
    orderId: v.id("orders"),
    number: v.string(),
    pdfStorageId: v.string(),
    amount: v.number(),
    currency: v.string(),
    taxAmount: v.optional(v.number()),
    billingInfo: v.optional(
      v.object({
        name: v.string(),
        email: v.string(),
        address: v.object({
          line1: v.string(),
          line2: v.optional(v.string()),
          city: v.string(),
          state: v.optional(v.string()),
          postalCode: v.string(),
          country: v.string(),
        }),
        taxId: v.optional(v.string()),
        companyName: v.optional(v.string()),
        phone: v.optional(v.string()),
      })
    ),
  },
  handler: async (ctx, args): Promise<{ invoiceId: Id<"invoicesOrders">; pdfUrl: string }> => {
    // Check if order exists
    const order = await ctx.db.get(args.orderId);
    if (!order) {
      throw new Error(`Order not found: ${args.orderId}`);
    }

    // Check if invoice already exists for this order
    const existingInvoice = await ctx.db
      .query("invoicesOrders")
      .withIndex("by_order", q => q.eq("orderId", args.orderId))
      .first();

    // Get the PDF URL from storage
    const pdfUrl = await ctx.storage.getUrl(args.pdfStorageId as Id<"_storage">);
    if (!pdfUrl) {
      throw new Error(`Failed to get URL for storage ID: ${args.pdfStorageId}`);
    }

    const now = Date.now();

    if (existingInvoice) {
      // Update existing invoice record
      await ctx.db.patch(existingInvoice._id, {
        pdfKey: args.pdfStorageId,
        pdfUrl,
      });

      // Update order with invoice URL
      await ctx.db.patch(args.orderId, {
        invoiceUrl: pdfUrl,
        updatedAt: now,
      });

      return { invoiceId: existingInvoice._id, pdfUrl };
    }

    // Create new invoice record
    const invoiceId = await ctx.db.insert("invoicesOrders", {
      orderId: args.orderId,
      number: args.number,
      pdfKey: args.pdfStorageId,
      pdfUrl,
      amount: args.amount,
      currency: args.currency,
      issuedAt: now,
      taxAmount: args.taxAmount,
      billingInfo: args.billingInfo,
      createdAt: now,
    });

    // Update order with invoice reference
    await ctx.db.patch(args.orderId, {
      invoiceId,
      invoiceUrl: pdfUrl,
      invoiceNumber: args.number,
      updatedAt: now,
    });

    return { invoiceId, pdfUrl };
  },
});
