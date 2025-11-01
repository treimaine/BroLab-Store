import { v } from "convex/values";
import { mutation } from "../_generated/server";

/**
 * Record payment information for an order
 * Supports both Stripe and PayPal payment providers
 * Called from webhook handlers after signature verification
 */
export const recordPayment = mutation({
  args: {
    orderId: v.id("orders"),
    provider: v.string(), // 'stripe' | 'paypal'
    status: v.string(), // 'succeeded' | 'failed' | 'refunded' | 'processing'
    amount: v.number(),
    currency: v.string(),
    stripeEventId: v.optional(v.string()),
    stripePaymentIntentId: v.optional(v.string()),
    stripeChargeId: v.optional(v.string()),
    paypalTransactionId: v.optional(v.string()),
    paypalOrderId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    try {
      console.log(`💳 Recording payment for order: ${args.orderId}`);
      console.log(`   Provider: ${args.provider}, Status: ${args.status}`);

      // Verify order exists
      const order = await ctx.db.get(args.orderId);
      if (!order) {
        throw new Error(`Order ${args.orderId} not found`);
      }

      // Create payment record
      const paymentId = await ctx.db.insert("payments", {
        orderId: args.orderId,
        provider: args.provider,
        status: args.status,
        amount: args.amount,
        currency: args.currency,
        stripeEventId: args.stripeEventId,
        stripePaymentIntentId: args.stripePaymentIntentId,
        stripeChargeId: args.stripeChargeId,
        createdAt: now,
      });

      console.log(`✅ Payment record created: ${paymentId}`);

      // Update order with payment information
      const updateData: {
        paymentProvider: string;
        paymentStatus: string;
        updatedAt: number;
        paymentIntentId?: string;
        paymentId?: string;
      } = {
        paymentProvider: args.provider,
        paymentStatus: args.status,
        updatedAt: now,
      };

      // Add provider-specific fields
      if (args.provider === "stripe" && args.stripePaymentIntentId) {
        updateData.paymentIntentId = args.stripePaymentIntentId;
      } else if (args.provider === "paypal" && args.paypalTransactionId) {
        updateData.paymentId = args.paypalTransactionId;
      }

      await ctx.db.patch(args.orderId, updateData);

      console.log(`✅ Order ${args.orderId} updated with payment info`);

      // Log activity if user exists
      if (order.userId) {
        await ctx.db.insert("activityLog", {
          userId: order.userId,
          action: "payment_recorded",
          details: {
            orderId: args.orderId,
            provider: args.provider,
            status: args.status,
            amount: args.amount,
            currency: args.currency,
            paymentIntentId: args.stripePaymentIntentId,
            transactionId: args.paypalTransactionId,
          },
          timestamp: now,
        });
      }

      // Audit log
      await ctx.db.insert("auditLogs", {
        userId: order.userId,
        action: "payment_recorded",
        resource: "payments",
        details: {
          operation: "create",
          resource: "payments",
          resourceId: paymentId,
          orderId: args.orderId,
          provider: args.provider,
          status: args.status,
          amount: args.amount,
          currency: args.currency,
        },
        timestamp: now,
      });

      return {
        success: true,
        paymentId,
        message: "Payment recorded successfully",
      };
    } catch (error) {
      console.error(`❌ Error recording payment for order ${args.orderId}:`, error);

      // Log error to audit
      await ctx.db.insert("auditLogs", {
        action: "payment_record_error",
        resource: "payments",
        details: {
          operation: "create",
          resource: "payments",
          orderId: args.orderId,
          provider: args.provider,
          error: error instanceof Error ? error.message : String(error),
        },
        timestamp: now,
      });

      throw new Error(
        `Failed to record payment: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  },
});
