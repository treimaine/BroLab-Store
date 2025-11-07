import { v } from "convex/values";
import { mutation } from "../_generated/server";

/**
 * Handle subscription.created event from Clerk Billing
 */
export const handleSubscriptionCreated = mutation({
  args: { data: v.any() },
  handler: async (ctx, { data }) => {
    const now = Date.now();

    const clerkSubscriptionId: string = data.id || data.subscription_id;
    const clerkUserId: string = data.user_id;
    const planId: string = (data.plan_id || data.plan?.name || "basic").toLowerCase();
    const status: string = data.status || "active";

    // Calculate period timestamps
    let currentPeriodStart: number = now;
    if (data.current_period_start) {
      currentPeriodStart = Number(data.current_period_start) * 1000;
    }

    let currentPeriodEnd: number = now + 30 * 24 * 3600 * 1000;
    if (data.current_period_end) {
      currentPeriodEnd = Number(data.current_period_end) * 1000;
    }

    // Find user by Clerk ID
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", q => q.eq("clerkId", clerkUserId))
      .first();

    if (!user) {
      await ctx.db.insert("auditLogs", {
        clerkId: clerkUserId,
        action: "subscription_created_user_missing",
        resource: "subscriptions",
        details: {
          operation: "create",
          resource: "subscriptions",
          clerkSubscriptionId,
          error: "User not found for Clerk ID",
        },
        timestamp: now,
      });
      throw new Error(`User not found for Clerk ID: ${clerkUserId}`);
    }

    // Determine quota based on plan
    let downloadQuota = 10; // Default: basic plan
    if (planId === "ultimate") {
      downloadQuota = -1; // Unlimited
    } else if (planId === "artist") {
      downloadQuota = 50;
    }

    // Create subscription
    const subscriptionId = await ctx.db.insert("subscriptions", {
      userId: user._id,
      clerkSubscriptionId,
      planId,
      status,
      currentPeriodStart,
      currentPeriodEnd,
      cancelAtPeriodEnd: false,
      features: [],
      downloadQuota,
      downloadUsed: 0,
      createdAt: now,
      updatedAt: now,
    });

    // Create quota for downloads
    await ctx.db.insert("quotas", {
      userId: user._id,
      subscriptionId: subscriptionId,
      quotaType: "downloads",
      limit: downloadQuota,
      used: 0,
      resetAt: currentPeriodEnd,
      resetPeriod: "monthly",
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });

    // Log activity
    await ctx.db.insert("activityLog", {
      userId: user._id,
      action: "subscription_created",
      details: {
        clerkSubscriptionId,
        planId,
        status,
        downloadQuota,
      },
      timestamp: now,
    });

    return { success: true, subscriptionId };
  },
});

/**
 * Handle subscription.updated event from Clerk Billing
 */
export const handleSubscriptionUpdated = mutation({
  args: { data: v.any() },
  handler: async (ctx, { data }) => {
    const now = Date.now();

    const clerkSubscriptionId: string = data.id || data.subscription_id;
    const planId: string = (data.plan_id || data.plan?.name || "basic").toLowerCase();
    const status: string = data.status || "active";

    // Calculate period timestamps
    let currentPeriodStart: number = now;
    if (data.current_period_start) {
      currentPeriodStart = Number(data.current_period_start) * 1000;
    }

    let currentPeriodEnd: number = now + 30 * 24 * 3600 * 1000;
    if (data.current_period_end) {
      currentPeriodEnd = Number(data.current_period_end) * 1000;
    }

    // Find existing subscription
    const subscription = await ctx.db
      .query("subscriptions")
      .withIndex("by_clerk_id", q => q.eq("clerkSubscriptionId", clerkSubscriptionId))
      .first();

    if (!subscription) {
      throw new Error(`Subscription not found: ${clerkSubscriptionId}`);
    }

    // Check if plan changed
    const planChanged = subscription.planId !== planId;

    // Determine new quota based on plan
    let newDownloadQuota = 10; // Default: basic plan
    if (planId === "ultimate") {
      newDownloadQuota = -1; // Unlimited
    } else if (planId === "artist") {
      newDownloadQuota = 50;
    }

    // Update subscription
    await ctx.db.patch(subscription._id, {
      planId,
      status,
      currentPeriodStart,
      currentPeriodEnd,
      downloadQuota: newDownloadQuota,
      updatedAt: now,
    });

    // Update quota if plan changed
    if (planChanged) {
      const quota = await ctx.db
        .query("quotas")
        .withIndex("by_subscription", q => q.eq("subscriptionId", subscription._id))
        .filter(q => q.eq(q.field("quotaType"), "downloads"))
        .first();

      if (quota) {
        await ctx.db.patch(quota._id, {
          limit: newDownloadQuota,
          resetAt: currentPeriodEnd,
          updatedAt: now,
        });
      }
    }

    // Log activity
    await ctx.db.insert("activityLog", {
      userId: subscription.userId,
      action: "subscription_updated",
      details: {
        clerkSubscriptionId,
        planId,
        status,
        planChanged,
        newDownloadQuota,
      },
      timestamp: now,
    });

    return { success: true, planChanged };
  },
});

/**
 * Handle subscription.deleted event from Clerk Billing
 */
export const handleSubscriptionDeleted = mutation({
  args: { data: v.any() },
  handler: async (ctx, { data }) => {
    const now = Date.now();

    const clerkSubscriptionId: string = data.id || data.subscription_id;

    // Find existing subscription
    const subscription = await ctx.db
      .query("subscriptions")
      .withIndex("by_clerk_id", q => q.eq("clerkSubscriptionId", clerkSubscriptionId))
      .first();

    if (!subscription) {
      throw new Error(`Subscription not found: ${clerkSubscriptionId}`);
    }

    // Mark subscription as cancelled
    await ctx.db.patch(subscription._id, {
      status: "cancelled",
      cancelAtPeriodEnd: true,
      updatedAt: now,
    });

    // Reset quota to free tier (10 downloads)
    const quota = await ctx.db
      .query("quotas")
      .withIndex("by_subscription", q => q.eq("subscriptionId", subscription._id))
      .filter(q => q.eq(q.field("quotaType"), "downloads"))
      .first();

    if (quota) {
      await ctx.db.patch(quota._id, {
        limit: 10, // Free tier quota
        isActive: false,
        updatedAt: now,
      });
    }

    // Log activity
    await ctx.db.insert("activityLog", {
      userId: subscription.userId,
      action: "subscription_deleted",
      details: {
        clerkSubscriptionId,
        resetToFreeTier: true,
      },
      timestamp: now,
    });

    return { success: true };
  },
});

/**
 * Handle invoice.created event from Clerk Billing
 */
export const handleInvoiceCreated = mutation({
  args: { data: v.any() },
  handler: async (ctx, { data }) => {
    const now = Date.now();

    const clerkInvoiceId: string = data.id || data.invoice_id;
    const clerkSubscriptionId: string = data.subscription_id;
    const amount: number = data.amount || data.amount_due || 0;
    const currency: string = (data.currency || "eur").toLowerCase();
    const status: string = data.status || "open";
    const description: string | undefined = data.description;
    const dueDate: number = data.due_date ? Number(data.due_date) * 1000 : now;

    // Find subscription
    const subscription = await ctx.db
      .query("subscriptions")
      .withIndex("by_clerk_id", q => q.eq("clerkSubscriptionId", clerkSubscriptionId))
      .first();

    if (!subscription) {
      throw new Error(`Subscription not found: ${clerkSubscriptionId}`);
    }

    // Create invoice
    await ctx.db.insert("invoices", {
      subscriptionId: subscription._id,
      clerkInvoiceId,
      amount,
      currency,
      status,
      description,
      dueDate,
      createdAt: now,
      updatedAt: now,
    });

    // Log activity
    await ctx.db.insert("activityLog", {
      userId: subscription.userId,
      action: "invoice_created",
      details: {
        clerkInvoiceId,
        amount,
        currency,
        status,
      },
      timestamp: now,
    });

    return { success: true };
  },
});

/**
 * Handle invoice.paid event from Clerk Billing
 */
export const handleInvoicePaid = mutation({
  args: { data: v.any() },
  handler: async (ctx, { data }) => {
    const now = Date.now();

    const clerkInvoiceId: string = data.id || data.invoice_id;
    const paidAt: number = data.paid_at ? Number(data.paid_at) * 1000 : now;

    // Find invoice
    const invoice = await ctx.db
      .query("invoices")
      .withIndex("by_clerk_id", q => q.eq("clerkInvoiceId", clerkInvoiceId))
      .first();

    if (!invoice) {
      throw new Error(`Invoice not found: ${clerkInvoiceId}`);
    }

    // Update invoice status
    await ctx.db.patch(invoice._id, {
      status: "paid",
      paidAt,
      updatedAt: now,
    });

    // Get subscription to log activity
    const subscription = await ctx.db.get(invoice.subscriptionId);
    if (subscription) {
      // Ensure subscription is active
      if (subscription.status !== "active") {
        await ctx.db.patch(subscription._id, {
          status: "active",
          updatedAt: now,
        });
      }

      // Log activity
      await ctx.db.insert("activityLog", {
        userId: subscription.userId,
        action: "invoice_paid",
        details: {
          clerkInvoiceId,
          amount: invoice.amount,
          currency: invoice.currency,
          paidAt,
        },
        timestamp: now,
      });
    }

    return { success: true };
  },
});

/**
 * Handle invoice.payment_failed event from Clerk Billing
 */
export const handleInvoicePaymentFailed = mutation({
  args: { data: v.any() },
  handler: async (ctx, { data }) => {
    const now = Date.now();

    const clerkInvoiceId: string = data.id || data.invoice_id;
    const attemptCount: number = data.attempt_count || 1;
    const nextPaymentAttempt: number | undefined = data.next_payment_attempt
      ? Number(data.next_payment_attempt) * 1000
      : undefined;

    // Find invoice
    const invoice = await ctx.db
      .query("invoices")
      .withIndex("by_clerk_id", q => q.eq("clerkInvoiceId", clerkInvoiceId))
      .first();

    if (!invoice) {
      throw new Error(`Invoice not found: ${clerkInvoiceId}`);
    }

    // Update invoice status
    await ctx.db.patch(invoice._id, {
      status: "uncollectible",
      attemptCount,
      nextPaymentAttempt,
      updatedAt: now,
    });

    // Get subscription to log activity and potentially suspend
    const subscription = await ctx.db.get(invoice.subscriptionId);
    if (subscription) {
      // Mark subscription as past_due after multiple failures
      if (attemptCount >= 3) {
        await ctx.db.patch(subscription._id, {
          status: "past_due",
          updatedAt: now,
        });
      }

      // Log activity
      await ctx.db.insert("activityLog", {
        userId: subscription.userId,
        action: "invoice_payment_failed",
        details: {
          clerkInvoiceId,
          amount: invoice.amount,
          currency: invoice.currency,
          attemptCount,
          nextPaymentAttempt,
        },
        timestamp: now,
      });

      // NOTE: Email notification should be implemented with Resend service
      // when email infrastructure is ready
    }

    return { success: true };
  },
});
