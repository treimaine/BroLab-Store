import { v } from "convex/values";
import { mutation } from "../_generated/server";

/**
 * Handle subscription.created event from Clerk Billing
 * Ensures idempotent creation - won't duplicate if called multiple times
 */
export const handleSubscriptionCreated = mutation({
  args: { data: v.any() },
  handler: async (ctx, { data }) => {
    const now = Date.now();

    const clerkSubscriptionId: string = data.id || data.subscription_id;
    const clerkUserId: string = data.user_id;
    const planId: string = (data.plan_id || data.plan?.name || "basic").toLowerCase();
    const status: string = data.status || "active";

    // Idempotency check - prevent duplicate subscriptions
    const existingSubscription = await ctx.db
      .query("subscriptions")
      .withIndex("by_clerk_id", q => q.eq("clerkSubscriptionId", clerkSubscriptionId))
      .first();

    if (existingSubscription) {
      // Already processed, return success without creating duplicate
      console.log(`Subscription ${clerkSubscriptionId} already exists, skipping creation`);
      return { success: true, subscriptionId: existingSubscription._id, alreadyExists: true };
    }

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

    // Determine quota based on plan - Synced with Clerk Billing Dashboard
    let downloadQuota = 5; // Default: basic plan
    if (planId === "ultimate_pass") {
      downloadQuota = -1; // Unlimited
    } else if (planId === "artist") {
      downloadQuota = 20;
    } else if (planId === "free_user") {
      downloadQuota = 1;
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

    // Log audit trail for compliance
    await ctx.db.insert("auditLogs", {
      userId: user._id,
      clerkId: clerkUserId,
      action: "subscription_created",
      resource: "subscriptions",
      details: {
        clerkSubscriptionId,
        planId,
        status,
        downloadQuota,
        currentPeriodStart,
        currentPeriodEnd,
      },
      timestamp: now,
    });

    return { success: true, subscriptionId };
  },
});

/**
 * Handle subscription.updated event from Clerk Billing
 * Updates subscription state and quotas when plan changes
 */
export const handleSubscriptionUpdated = mutation({
  args: { data: v.any() },
  handler: async (ctx, { data }) => {
    const now = Date.now();

    const clerkSubscriptionId: string = data.id || data.subscription_id;
    const planId: string = (data.plan_id || data.plan?.name || "basic").toLowerCase();
    const status: string = data.status || "active";
    const cancelAtPeriodEnd: boolean = data.cancel_at_period_end || false;

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
      // Log missing subscription for debugging
      await ctx.db.insert("auditLogs", {
        clerkId: data.user_id,
        action: "subscription_updated_not_found",
        resource: "subscriptions",
        details: {
          clerkSubscriptionId,
          error: "Subscription not found for update",
        },
        timestamp: now,
      });
      throw new Error(`Subscription not found: ${clerkSubscriptionId}`);
    }

    // Track changes for audit
    const previousPlanId = subscription.planId;
    const previousStatus = subscription.status;
    const planChanged = previousPlanId !== planId;
    const statusChanged = previousStatus !== status;

    // Determine new quota based on plan - Synced with Clerk Billing Dashboard
    let newDownloadQuota = 5; // Default: basic plan
    if (planId === "ultimate_pass") {
      newDownloadQuota = -1; // Unlimited
    } else if (planId === "artist") {
      newDownloadQuota = 20;
    } else if (planId === "free_user") {
      newDownloadQuota = 1;
    }

    // Update subscription with all relevant fields
    await ctx.db.patch(subscription._id, {
      planId,
      status,
      currentPeriodStart,
      currentPeriodEnd,
      cancelAtPeriodEnd,
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
        statusChanged,
        newDownloadQuota,
        cancelAtPeriodEnd,
      },
      timestamp: now,
    });

    // Log audit trail for compliance
    await ctx.db.insert("auditLogs", {
      userId: subscription.userId,
      action: "subscription_updated",
      resource: "subscriptions",
      details: {
        clerkSubscriptionId,
        previousPlanId,
        newPlanId: planId,
        previousStatus,
        newStatus: status,
        planChanged,
        statusChanged,
        newDownloadQuota,
        cancelAtPeriodEnd,
      },
      timestamp: now,
    });

    return { success: true, planChanged, statusChanged };
  },
});

/**
 * Handle subscription.deleted event from Clerk Billing
 * Cancels subscription and resets user to free tier
 */
export const handleSubscriptionDeleted = mutation({
  args: { data: v.any() },
  handler: async (ctx, { data }) => {
    const now = Date.now();

    const clerkSubscriptionId: string = data.id || data.subscription_id;
    const cancellationReason: string | undefined = data.cancellation_reason;

    // Find existing subscription
    const subscription = await ctx.db
      .query("subscriptions")
      .withIndex("by_clerk_id", q => q.eq("clerkSubscriptionId", clerkSubscriptionId))
      .first();

    if (!subscription) {
      // Log for debugging but don't throw - subscription may have been deleted already
      await ctx.db.insert("auditLogs", {
        clerkId: data.user_id,
        action: "subscription_deleted_not_found",
        resource: "subscriptions",
        details: {
          clerkSubscriptionId,
          error: "Subscription not found for deletion",
        },
        timestamp: now,
      });
      // Return success to acknowledge webhook (idempotent)
      return { success: true, alreadyDeleted: true };
    }

    const previousPlanId = subscription.planId;
    const previousStatus = subscription.status;

    // Mark subscription as cancelled
    await ctx.db.patch(subscription._id, {
      status: "cancelled",
      cancelAtPeriodEnd: true,
      downloadQuota: 1, // Reset to free tier
      updatedAt: now,
    });

    // Reset quota to free tier (1 download)
    const quota = await ctx.db
      .query("quotas")
      .withIndex("by_subscription", q => q.eq("subscriptionId", subscription._id))
      .filter(q => q.eq(q.field("quotaType"), "downloads"))
      .first();

    if (quota) {
      await ctx.db.patch(quota._id, {
        limit: 1, // Free tier quota (1 download/month)
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
        previousPlanId,
        resetToFreeTier: true,
        cancellationReason,
      },
      timestamp: now,
    });

    // Log audit trail for compliance
    await ctx.db.insert("auditLogs", {
      userId: subscription.userId,
      action: "subscription_deleted",
      resource: "subscriptions",
      details: {
        clerkSubscriptionId,
        previousPlanId,
        previousStatus,
        cancellationReason,
        resetToFreeTier: true,
      },
      timestamp: now,
    });

    return { success: true };
  },
});

/**
 * Handle invoice.created event from Clerk Billing
 * Creates invoice record with idempotency check
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

    // Idempotency check - prevent duplicate invoices
    const existingInvoice = await ctx.db
      .query("invoices")
      .withIndex("by_clerk_id", q => q.eq("clerkInvoiceId", clerkInvoiceId))
      .first();

    if (existingInvoice) {
      console.log(`Invoice ${clerkInvoiceId} already exists, skipping creation`);
      return { success: true, invoiceId: existingInvoice._id, alreadyExists: true };
    }

    // Find subscription
    const subscription = await ctx.db
      .query("subscriptions")
      .withIndex("by_clerk_id", q => q.eq("clerkSubscriptionId", clerkSubscriptionId))
      .first();

    if (!subscription) {
      await ctx.db.insert("auditLogs", {
        clerkId: data.user_id,
        action: "invoice_created_subscription_missing",
        resource: "invoices",
        details: {
          clerkInvoiceId,
          clerkSubscriptionId,
          error: "Subscription not found for invoice",
        },
        timestamp: now,
      });
      throw new Error(`Subscription not found: ${clerkSubscriptionId}`);
    }

    // Create invoice
    const invoiceId = await ctx.db.insert("invoices", {
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
        dueDate,
      },
      timestamp: now,
    });

    return { success: true, invoiceId };
  },
});

/**
 * Handle invoice.paid event from Clerk Billing
 * Updates invoice status and ensures subscription is active
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
      // Log for debugging - invoice may not exist yet if events arrive out of order
      await ctx.db.insert("auditLogs", {
        clerkId: data.user_id,
        action: "invoice_paid_not_found",
        resource: "invoices",
        details: {
          clerkInvoiceId,
          error: "Invoice not found for payment",
        },
        timestamp: now,
      });
      throw new Error(`Invoice not found: ${clerkInvoiceId}`);
    }

    // Idempotency check - skip if already paid
    if (invoice.status === "paid") {
      console.log(`Invoice ${clerkInvoiceId} already marked as paid, skipping`);
      return { success: true, alreadyPaid: true };
    }

    const previousStatus = invoice.status;

    // Update invoice status
    await ctx.db.patch(invoice._id, {
      status: "paid",
      paidAt,
      updatedAt: now,
    });

    // Get subscription to log activity and reactivate if needed
    const subscription = await ctx.db.get(invoice.subscriptionId);
    if (subscription) {
      const subscriptionWasInactive = subscription.status !== "active";

      // Reactivate subscription if it was past_due or unpaid
      if (subscriptionWasInactive) {
        await ctx.db.patch(subscription._id, {
          status: "active",
          updatedAt: now,
        });

        // Reactivate quota
        const quota = await ctx.db
          .query("quotas")
          .withIndex("by_subscription", q => q.eq("subscriptionId", subscription._id))
          .filter(q => q.eq(q.field("quotaType"), "downloads"))
          .first();

        if (quota && !quota.isActive) {
          await ctx.db.patch(quota._id, {
            isActive: true,
            updatedAt: now,
          });
        }
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
          subscriptionReactivated: subscriptionWasInactive,
        },
        timestamp: now,
      });

      // Log audit trail
      await ctx.db.insert("auditLogs", {
        userId: subscription.userId,
        action: "invoice_paid",
        resource: "invoices",
        details: {
          clerkInvoiceId,
          amount: invoice.amount,
          currency: invoice.currency,
          previousStatus,
          subscriptionReactivated: subscriptionWasInactive,
        },
        timestamp: now,
      });
    }

    return { success: true };
  },
});

/**
 * Handle invoice.payment_failed event from Clerk Billing
 * Updates invoice status and suspends subscription after multiple failures
 */
export const handleInvoicePaymentFailed = mutation({
  args: { data: v.any() },
  handler: async (ctx, { data }) => {
    const now = Date.now();

    const clerkInvoiceId: string = data.id || data.invoice_id;
    const attemptCount: number = data.attempt_count || 1;
    const failureReason: string | undefined =
      data.failure_reason || data.last_payment_error?.message;
    const nextPaymentAttempt: number | undefined = data.next_payment_attempt
      ? Number(data.next_payment_attempt) * 1000
      : undefined;

    // Find invoice
    const invoice = await ctx.db
      .query("invoices")
      .withIndex("by_clerk_id", q => q.eq("clerkInvoiceId", clerkInvoiceId))
      .first();

    if (!invoice) {
      // Log for debugging
      await ctx.db.insert("auditLogs", {
        clerkId: data.user_id,
        action: "invoice_payment_failed_not_found",
        resource: "invoices",
        details: {
          clerkInvoiceId,
          error: "Invoice not found for payment failure",
        },
        timestamp: now,
      });
      throw new Error(`Invoice not found: ${clerkInvoiceId}`);
    }

    const previousStatus = invoice.status;

    // Update invoice status based on attempt count
    const newStatus = attemptCount >= 3 ? "uncollectible" : "open";
    await ctx.db.patch(invoice._id, {
      status: newStatus,
      attemptCount,
      nextPaymentAttempt,
      updatedAt: now,
    });

    // Get subscription to log activity and potentially suspend
    const subscription = await ctx.db.get(invoice.subscriptionId);
    if (subscription) {
      let subscriptionSuspended = false;
      let quotaDeactivated = false;

      // Mark subscription as past_due after multiple failures
      if (attemptCount >= 3 && subscription.status === "active") {
        await ctx.db.patch(subscription._id, {
          status: "past_due",
          updatedAt: now,
        });
        subscriptionSuspended = true;

        // Deactivate quota when subscription is suspended
        const quota = await ctx.db
          .query("quotas")
          .withIndex("by_subscription", q => q.eq("subscriptionId", subscription._id))
          .filter(q => q.eq(q.field("quotaType"), "downloads"))
          .first();

        if (quota?.isActive) {
          await ctx.db.patch(quota._id, {
            isActive: false,
            updatedAt: now,
          });
          quotaDeactivated = true;
        }
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
          subscriptionSuspended,
          failureReason,
        },
        timestamp: now,
      });

      // Log audit trail for compliance
      await ctx.db.insert("auditLogs", {
        userId: subscription.userId,
        action: "invoice_payment_failed",
        resource: "invoices",
        details: {
          clerkInvoiceId,
          amount: invoice.amount,
          currency: invoice.currency,
          previousStatus,
          newStatus,
          attemptCount,
          subscriptionSuspended,
          quotaDeactivated,
          failureReason,
        },
        timestamp: now,
      });

      // NOTE: Email notification should be implemented with Resend service
      // when email infrastructure is ready
    }

    return { success: true };
  },
});
