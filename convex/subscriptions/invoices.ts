import { v } from "convex/values";
import { mutation } from "../_generated/server";

// Clerk Invoice webhook payload type
interface ClerkInvoiceData {
  id?: string;
  invoice_id?: string;
  subscription_id?: string;
  subscription?: { id?: string };
  amount_due?: number;
  amount_paid?: number;
  total?: number;
  currency?: string;
  status?: string;
  description?: string;
  due_date?: number;
  next_payment_attempt?: number;
  paid_at?: number;
}

export const upsertInvoice = mutation({
  args: { data: v.any() },
  handler: async (ctx, { data }: { data: ClerkInvoiceData }) => {
    const now = Date.now();
    const clerkInvoiceId = data.id || data.invoice_id || "";
    if (!clerkInvoiceId) return { success: false };

    const clerkSubscriptionId = data.subscription_id || data.subscription?.id || "";
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
      subscriptionId: subscription?._id ?? (undefined as never), // Required field - will fail if no subscription
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
