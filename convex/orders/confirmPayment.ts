import { v } from "convex/values";
import type { Doc } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";
import { mutation } from "../_generated/server";

/**
 * Confirm payment and grant download access
 * Called after successful payment verification from webhook
 * Supports both Stripe and PayPal payments
 */
export const confirmPayment = mutation({
  args: {
    orderId: v.id("orders"),
    paymentIntentId: v.optional(v.string()), // Stripe payment intent ID
    transactionId: v.optional(v.string()), // PayPal transaction ID
    status: v.string(),
    provider: v.optional(v.string()), // 'stripe' | 'paypal'
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    try {
      console.log(`💳 Confirming payment for order: ${args.orderId}`);

      // Get the order
      const order = await ctx.db.get(args.orderId);
      if (!order) {
        throw new Error("Order not found");
      }

      // Check idempotency - if already paid, skip
      if (order.status === "paid") {
        console.log(`ℹ️ Order ${args.orderId} already marked as paid`);
        return {
          success: true,
          message: "Order already paid",
          orderId: args.orderId,
        };
      }

      // Update order status to 'paid'
      const updateData: {
        status: string;
        paymentStatus: string;
        updatedAt: number;
        paymentIntentId?: string;
        paymentId?: string;
      } = {
        status: "paid",
        paymentStatus: args.status,
        updatedAt: now,
      };

      // Add provider-specific payment ID
      if (args.provider === "stripe" && args.paymentIntentId) {
        updateData.paymentIntentId = args.paymentIntentId;
      } else if (args.provider === "paypal" && args.transactionId) {
        updateData.paymentId = args.transactionId;
      } else if (args.paymentIntentId) {
        // Backward compatibility: if no provider specified but paymentIntentId exists, assume Stripe
        updateData.paymentIntentId = args.paymentIntentId;
      }

      await ctx.db.patch(args.orderId, updateData);

      console.log(`✅ Order ${args.orderId} marked as paid`);

      // Grant download access by creating download records
      if (order.userId) {
        await grantDownloadAccess(ctx, order);
      } else {
        console.warn(`⚠️ Order ${args.orderId} has no userId, skipping download access`);
      }

      // Trigger confirmation email (async, don't wait)
      // Email sending will be handled by the webhook handler or separate service
      console.log(`📧 Confirmation email should be sent for order: ${args.orderId}`);

      // Log activity
      if (order.userId) {
        await ctx.db.insert("activityLog", {
          userId: order.userId,
          action: "payment_confirmed",
          details: {
            orderId: args.orderId,
            provider: args.provider || "stripe",
            paymentIntentId: args.paymentIntentId,
            transactionId: args.transactionId,
            total: order.total,
            currency: order.currency,
          },
          timestamp: now,
        });
      }

      // Audit log
      await ctx.db.insert("auditLogs", {
        userId: order.userId,
        action: "payment_confirmed",
        resource: "orders",
        details: {
          operation: "update",
          resource: "orders",
          resourceId: args.orderId,
          orderId: args.orderId,
          provider: args.provider || "stripe",
          paymentIntentId: args.paymentIntentId,
          transactionId: args.transactionId,
          status: "paid",
        },
        timestamp: now,
      });

      return {
        success: true,
        message: "Payment confirmed and download access granted",
        orderId: args.orderId,
      };
    } catch (error) {
      console.error(`❌ Error confirming payment for order ${args.orderId}:`, error);

      // Log error to audit
      await ctx.db.insert("auditLogs", {
        action: "payment_confirmation_error",
        resource: "orders",
        details: {
          operation: "update",
          resource: "orders",
          resourceId: args.orderId,
          orderId: args.orderId,
          error: error instanceof Error ? error.message : String(error),
        },
        timestamp: now,
      });

      throw new Error(
        `Failed to confirm payment: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  },
});

/**
 * Helper function to grant download access for all items in an order
 * Creates download records within 5 seconds after payment_intent.succeeded
 */
async function grantDownloadAccess(ctx: MutationCtx, order: Doc<"orders">): Promise<void> {
  const startTime = Date.now();

  try {
    console.log(`🎵 Granting download access for order: ${order._id}`);

    if (!order.userId) {
      console.warn(`⚠️ Order ${order._id} has no userId, skipping download access`);
      return;
    }

    let downloadsCreated = 0;
    let downloadsSkipped = 0;

    // Process each item in the order
    for (const item of order.items || []) {
      if (item.productId && item.license && order.userId) {
        // Check if download already exists to avoid duplicates
        const beatId = item.productId;
        const licenseType = item.license;
        const userId = order.userId;

        const existingDownload = await ctx.db
          .query("downloads")
          .withIndex("by_user_beat", q => q.eq("userId", userId).eq("beatId", beatId))
          .filter(q => q.eq(q.field("licenseType"), licenseType))
          .first();

        if (existingDownload) {
          console.log(`ℹ️ Download already exists for beat ${item.productId} (${item.license})`);
          downloadsSkipped++;
          continue;
        }

        // Create new download record
        const downloadId = await ctx.db.insert("downloads", {
          userId: order.userId,
          beatId: item.productId,
          licenseType: item.license,
          downloadCount: 0, // Initialize to 0, will increment on actual download
          timestamp: Date.now(),
        });

        downloadsCreated++;

        console.log(
          `✅ Created download record: ${downloadId} for beat ${item.productId} (${item.license})`
        );

        // Log activity
        const beatTitle = item.title || item.name || `Beat ${item.productId}`;
        await ctx.db.insert("activityLog", {
          userId: order.userId,
          action: "download_granted",
          details: {
            description: `Download access granted for "${beatTitle}"`,
            beatId: item.productId,
            beatTitle: item.title || item.name,
            licenseType: item.license,
            orderId: order._id,
            severity: "info",
          },
          timestamp: Date.now(),
        });
      }
    }

    const duration = Date.now() - startTime;
    console.log(
      `✅ Download access granted in ${duration}ms: ${downloadsCreated} created, ${downloadsSkipped} skipped`
    );

    // Ensure we completed within 5 seconds
    if (duration > 5000) {
      console.warn(`⚠️ Download access took ${duration}ms (target: <5000ms)`);
    }
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`❌ Error granting download access after ${duration}ms:`, error);
    // Don't throw error to avoid breaking payment confirmation
    // Log the error but continue
    await ctx.db.insert("auditLogs", {
      userId: order.userId,
      action: "download_grant_error",
      resource: "downloads",
      details: {
        operation: "create",
        resource: "downloads",
        orderId: order._id,
        error: error instanceof Error ? error.message : String(error),
      },
      timestamp: Date.now(),
    });
  }
}
