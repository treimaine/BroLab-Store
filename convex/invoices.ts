import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

/**
 * Get invoice by Clerk invoice ID
 */
export const getByClerkId = query({
  args: { clerkInvoiceId: v.string() },
  handler: async (ctx, { clerkInvoiceId }) => {
    const invoice = await ctx.db
      .query("invoices")
      .withIndex("by_clerk_id", q => q.eq("clerkInvoiceId", clerkInvoiceId))
      .first();
    return invoice;
  },
});

/**
 * Get invoices for a subscription
 */
export const getBySubscription = query({
  args: { subscriptionId: v.id("subscriptions") },
  handler: async (ctx, { subscriptionId }) => {
    const invoices = await ctx.db
      .query("invoices")
      .withIndex("by_subscription", q => q.eq("subscriptionId", subscriptionId))
      .order("desc")
      .collect();
    return invoices;
  },
});

/**
 * Create new invoice
 */
export const create = mutation({
  args: {
    subscriptionId: v.id("subscriptions"),
    clerkInvoiceId: v.string(),
    amount: v.number(),
    currency: v.string(),
    status: v.string(),
    dueDate: v.number(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const invoiceId = await ctx.db.insert("invoices", {
      ...args,
      attemptCount: 0,
      createdAt: now,
      updatedAt: now,
    });

    console.log(`✅ Invoice created: ${invoiceId}`);
    return invoiceId;
  },
});

/**
 * Mark invoice as paid
 */
export const markPaid = mutation({
  args: {
    clerkInvoiceId: v.string(),
    paidAt: v.number(),
  },
  handler: async (ctx, args) => {
    const invoice = await ctx.db
      .query("invoices")
      .withIndex("by_clerk_id", q => q.eq("clerkInvoiceId", args.clerkInvoiceId))
      .first();

    if (!invoice) {
      throw new Error(`Invoice not found: ${args.clerkInvoiceId}`);
    }

    await ctx.db.patch(invoice._id, {
      status: "paid",
      paidAt: args.paidAt,
      updatedAt: Date.now(),
    });

    console.log(`✅ Invoice marked as paid: ${invoice._id}`);
    return invoice._id;
  },
});

/**
 * Mark invoice as failed
 */
export const markFailed = mutation({
  args: {
    clerkInvoiceId: v.string(),
  },
  handler: async (ctx, { clerkInvoiceId }) => {
    const invoice = await ctx.db
      .query("invoices")
      .withIndex("by_clerk_id", q => q.eq("clerkInvoiceId", clerkInvoiceId))
      .first();

    if (!invoice) {
      throw new Error(`Invoice not found: ${clerkInvoiceId}`);
    }

    const attemptCount = (invoice.attemptCount || 0) + 1;
    const nextPaymentAttempt = Date.now() + 24 * 60 * 60 * 1000; // Retry in 24 hours

    await ctx.db.patch(invoice._id, {
      status: "open",
      attemptCount,
      nextPaymentAttempt,
      updatedAt: Date.now(),
    });

    console.log(`⚠️ Invoice payment failed (attempt ${attemptCount}): ${invoice._id}`);
    return invoice._id;
  },
});
