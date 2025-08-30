import { v } from "convex/values";
import { mutation } from "../_generated/server";

export const upsertInvoice = mutation({
  args: { data: v.any() },
  handler: async (ctx, { data }) => {
    const now = Date.now();
    const clerkInvoiceId: string = data.id || data.invoice_id;
    if (!clerkInvoiceId) return { success: false };

    const clerkSubscriptionId: string = data.subscription_id || data.subscription?.id;
    const amount: number = data.amount_due || data.amount_paid || data.total || 0;
    const currency: string = (data.currency || "eur").toString();
    const status: string = data.status || "open";
    const description: string | undefined = data.description;
    const dueDate: number = (data.due_date || data.next_payment_attempt || 0) * 1;
    const paidAt: number | undefined = data.paid_at ? Number(data.paid_at) : undefined;

    // Find subscription by clerkSubscriptionId
    const subscription = clerkSubscriptionId
      ? await ctx.db
          .query("subscriptions")
          .withIndex("by_clerk_id", q => q.eq("clerkSubscriptionId", clerkSubscriptionId))
          .first()
      : null;

    // Try find existing invoice
    const existing = await ctx.db
      .query("invoices")
      .withIndex("by_clerk_id", q => q.eq("clerkInvoiceId", clerkInvoiceId))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        amount,
        currency,
        status,
        description,
        dueDate,
        paidAt,
        updatedAt: now,
      });
      return { success: true };
    }

    await ctx.db.insert("invoices", {
      subscriptionId: subscription?._id as any, // optional link
      clerkInvoiceId,
      amount,
      currency,
      status,
      description,
      dueDate,
      paidAt,
      createdAt: now,
      updatedAt: now,
    });

    return { success: true };
  },
});
