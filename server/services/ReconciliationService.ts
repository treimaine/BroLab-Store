/**
 * ReconciliationService - Webhook reconciliation and data sync
 *
 * Provides tools for:
 * - Syncing Clerk Billing subscriptions with Convex
 * - Resyncing orders by sessionId or paymentIntentId
 * - Detecting and fixing data inconsistencies
 *
 * @module server/services/ReconciliationService
 */

import { ConvexHttpClient } from "convex/browser";
import Stripe from "stripe";

/**
 * Typed Convex client interface for string-based function calls
 */
interface TypedConvexClient {
  query: <T = unknown>(name: string, args: Record<string, unknown>) => Promise<T>;
  mutation: <T = unknown>(name: string, args: Record<string, unknown>) => Promise<T>;
}

/**
 * Order from Convex
 */
interface ConvexOrder {
  _id: string;
  status: string;
  paymentStatus?: string;
  checkoutSessionId?: string;
  paymentIntentId?: string;
}

/**
 * Subscription from Convex
 */
interface ConvexSubscription {
  _id: string;
  status: string;
  planId?: string;
}

/**
 * Reconciliation result for a single item
 */
export interface ReconciliationResult {
  success: boolean;
  action: "created" | "updated" | "skipped" | "failed";
  message: string;
  details?: Record<string, unknown>;
}

/**
 * Batch reconciliation summary
 */
export interface ReconciliationSummary {
  totalProcessed: number;
  created: number;
  updated: number;
  skipped: number;
  failed: number;
  errors: Array<{ id: string; error: string }>;
  duration: number;
}

/**
 * Order resync result
 */
export interface OrderResyncResult {
  success: boolean;
  orderId?: string;
  action: "found_and_updated" | "created" | "already_synced" | "not_found" | "error" | "skipped";
  message: string;
  details?: {
    stripeSessionId?: string;
    paymentIntentId?: string;
    orderStatus?: string;
    paymentStatus?: string;
  };
}

/**
 * ReconciliationService class
 */
export class ReconciliationService {
  private static instance: ReconciliationService;
  private readonly convex: TypedConvexClient;
  private readonly stripe: Stripe;

  private constructor() {
    const convexUrl = process.env.VITE_CONVEX_URL;
    if (!convexUrl) {
      throw new Error("VITE_CONVEX_URL environment variable is required");
    }

    const stripeKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeKey) {
      throw new Error("STRIPE_SECRET_KEY environment variable is required");
    }

    this.convex = new ConvexHttpClient(convexUrl) as unknown as TypedConvexClient;
    this.stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): ReconciliationService {
    if (!ReconciliationService.instance) {
      ReconciliationService.instance = new ReconciliationService();
    }
    return ReconciliationService.instance;
  }

  /**
   * Resync an order by Stripe checkout session ID
   */
  async resyncOrderBySessionId(sessionId: string): Promise<OrderResyncResult> {
    console.log(`🔄 Resyncing order by session ID: ${sessionId}`);

    try {
      // 1. Check if order already exists in Convex
      const existingOrder = await this.convex.query<ConvexOrder | null>(
        "orders/reconciliation:getOrderByCheckoutSession",
        { checkoutSessionId: sessionId }
      );

      if (existingOrder?.status === "paid") {
        return {
          success: true,
          orderId: existingOrder._id,
          action: "already_synced",
          message: "Order already exists and is paid",
          details: {
            stripeSessionId: sessionId,
            orderStatus: existingOrder.status,
            paymentStatus: existingOrder.paymentStatus,
          },
        };
      }

      // 2. Fetch session from Stripe
      const session = await this.stripe.checkout.sessions.retrieve(sessionId, {
        expand: ["line_items", "payment_intent"],
      });

      if (!session) {
        return {
          success: false,
          action: "not_found",
          message: `Stripe session not found: ${sessionId}`,
        };
      }

      // 3. Check payment status
      if (session.payment_status !== "paid") {
        return {
          success: false,
          action: "skipped",
          message: `Session payment status is ${session.payment_status}, not paid`,
          details: {
            stripeSessionId: sessionId,
            paymentStatus: session.payment_status,
          },
        };
      }

      // 4. Update or create order
      if (existingOrder) {
        const paymentIntentId =
          typeof session.payment_intent === "string"
            ? session.payment_intent
            : session.payment_intent?.id;

        await this.convex.mutation("orders/reconciliation:updateOrderStatusAdmin", {
          orderId: existingOrder._id,
          status: "paid",
          paymentStatus: "succeeded",
          paymentIntentId,
        });

        return {
          success: true,
          orderId: existingOrder._id,
          action: "found_and_updated",
          message: "Order updated to paid status",
          details: {
            stripeSessionId: sessionId,
            paymentIntentId,
            orderStatus: "paid",
            paymentStatus: "succeeded",
          },
        };
      }

      // 5. Create new order from session data
      const orderId = await this.createOrderFromSession(session);

      return {
        success: true,
        orderId,
        action: "created",
        message: "Order created from Stripe session",
        details: {
          stripeSessionId: sessionId,
          paymentIntentId:
            typeof session.payment_intent === "string"
              ? session.payment_intent
              : session.payment_intent?.id,
          orderStatus: "paid",
          paymentStatus: "succeeded",
        },
      };
    } catch (error) {
      console.error(`❌ Error resyncing order by session ID:`, error);
      return {
        success: false,
        action: "error",
        message: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Resync an order by Stripe payment intent ID
   */
  async resyncOrderByPaymentIntentId(paymentIntentId: string): Promise<OrderResyncResult> {
    console.log(`🔄 Resyncing order by payment intent ID: ${paymentIntentId}`);

    try {
      // 1. Check if order already exists in Convex
      const existingOrder = await this.convex.query<ConvexOrder | null>(
        "orders/reconciliation:getOrderByPaymentIntent",
        { paymentIntentId }
      );

      if (existingOrder?.status === "paid") {
        return {
          success: true,
          orderId: existingOrder._id,
          action: "already_synced",
          message: "Order already exists and is paid",
          details: {
            paymentIntentId,
            orderStatus: existingOrder.status,
            paymentStatus: existingOrder.paymentStatus,
          },
        };
      }

      // 2. Fetch payment intent from Stripe
      const paymentIntent = await this.stripe.paymentIntents.retrieve(paymentIntentId);

      if (!paymentIntent) {
        return {
          success: false,
          action: "not_found",
          message: `Stripe payment intent not found: ${paymentIntentId}`,
        };
      }

      // 3. Check payment status
      if (paymentIntent.status !== "succeeded") {
        return {
          success: false,
          action: "skipped",
          message: `Payment intent status is ${paymentIntent.status}, not succeeded`,
          details: {
            paymentIntentId,
            paymentStatus: paymentIntent.status,
          },
        };
      }

      // 4. Update existing order if found
      if (existingOrder) {
        await this.convex.mutation("orders/reconciliation:updateOrderStatusAdmin", {
          orderId: existingOrder._id,
          status: "paid",
          paymentStatus: "succeeded",
          paymentIntentId,
        });

        return {
          success: true,
          orderId: existingOrder._id,
          action: "found_and_updated",
          message: "Order updated to paid status",
          details: {
            paymentIntentId,
            orderStatus: "paid",
            paymentStatus: "succeeded",
          },
        };
      }

      // 5. Try to find associated checkout session
      const sessions = await this.stripe.checkout.sessions.list({
        payment_intent: paymentIntentId,
        limit: 1,
      });

      if (sessions.data.length > 0) {
        const session = await this.stripe.checkout.sessions.retrieve(sessions.data[0].id, {
          expand: ["line_items"],
        });
        const orderId = await this.createOrderFromSession(session);

        return {
          success: true,
          orderId,
          action: "created",
          message: "Order created from associated Stripe session",
          details: {
            stripeSessionId: session.id,
            paymentIntentId,
            orderStatus: "paid",
            paymentStatus: "succeeded",
          },
        };
      }

      return {
        success: false,
        action: "not_found",
        message: "No checkout session found for this payment intent",
        details: { paymentIntentId },
      };
    } catch (error) {
      console.error(`❌ Error resyncing order by payment intent ID:`, error);
      return {
        success: false,
        action: "error",
        message: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Create order from Stripe checkout session
   */
  private async createOrderFromSession(session: Stripe.Checkout.Session): Promise<string> {
    const email = session.customer_details?.email || session.customer_email || "";
    const lineItems = session.line_items?.data || [];

    const items = lineItems.map((item, index) => ({
      productId: index,
      name: item.description || `Item ${index + 1}`,
      price: (item.amount_total || 0) / 100,
      quantity: item.quantity || 1,
      license: (session.metadata?.licenseType as string) || "basic",
    }));

    const result = await this.convex.mutation<{ orderId: string } | string>("orders:createOrder", {
      email,
      total: (session.amount_total || 0) / 100,
      items,
      status: "paid",
      sessionId: session.id,
      paymentId:
        typeof session.payment_intent === "string"
          ? session.payment_intent
          : session.payment_intent?.id,
    });

    const orderId =
      typeof result === "object" && result !== null && "orderId" in result
        ? String(result.orderId)
        : String(result);

    console.log(`✅ Order created: ${orderId}`);
    return orderId;
  }

  /**
   * Reconcile all pending orders (orders with pending status but paid in Stripe)
   */
  async reconcilePendingOrders(): Promise<ReconciliationSummary> {
    const startTime = Date.now();
    const summary: ReconciliationSummary = {
      totalProcessed: 0,
      created: 0,
      updated: 0,
      skipped: 0,
      failed: 0,
      errors: [],
      duration: 0,
    };

    try {
      console.log("🔄 Starting pending orders reconciliation...");

      const pendingOrders = await this.convex.query<ConvexOrder[]>(
        "orders/reconciliation:getOrdersByStatus",
        { status: "pending" }
      );

      console.log(`📊 Found ${pendingOrders.length} pending orders to check`);

      for (const order of pendingOrders) {
        summary.totalProcessed++;

        try {
          if (order.checkoutSessionId) {
            const result = await this.resyncOrderBySessionId(order.checkoutSessionId);
            this.updateSummaryFromResult(summary, result, order._id);
          } else if (order.paymentIntentId) {
            const result = await this.resyncOrderByPaymentIntentId(order.paymentIntentId);
            this.updateSummaryFromResult(summary, result, order._id);
          } else {
            summary.skipped++;
          }
        } catch (error) {
          summary.failed++;
          summary.errors.push({
            id: order._id,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }

      summary.duration = Date.now() - startTime;
      console.log(`✅ Reconciliation complete:`, summary);

      return summary;
    } catch (error) {
      console.error("❌ Error during reconciliation:", error);
      summary.duration = Date.now() - startTime;
      summary.failed++;
      summary.errors.push({
        id: "global",
        error: error instanceof Error ? error.message : String(error),
      });
      return summary;
    }
  }

  /**
   * Helper to update summary from resync result
   */
  private updateSummaryFromResult(
    summary: ReconciliationSummary,
    result: OrderResyncResult,
    orderId: string
  ): void {
    if (result.success) {
      if (result.action === "found_and_updated" || result.action === "created") {
        summary.updated++;
      } else {
        summary.skipped++;
      }
    } else {
      summary.failed++;
      summary.errors.push({ id: orderId, error: result.message });
    }
  }

  /**
   * Check subscription sync status between Clerk and Convex
   */
  async checkSubscriptionSyncStatus(
    clerkSubscriptionId: string
  ): Promise<{ inSync: boolean; details: Record<string, unknown> }> {
    try {
      const convexSub = await this.convex.query<ConvexSubscription | null>(
        "subscriptions:getByClerkId",
        { clerkSubscriptionId }
      );

      if (!convexSub) {
        return {
          inSync: false,
          details: {
            reason: "Subscription not found in Convex",
            clerkSubscriptionId,
          },
        };
      }

      return {
        inSync: true,
        details: {
          clerkSubscriptionId,
          convexId: convexSub._id,
          status: convexSub.status,
          planId: convexSub.planId,
        },
      };
    } catch (error) {
      return {
        inSync: false,
        details: {
          reason: "Error checking sync status",
          error: error instanceof Error ? error.message : String(error),
        },
      };
    }
  }
}

// Export singleton getter
export const getReconciliationService = (): ReconciliationService => {
  return ReconciliationService.getInstance();
};

export default ReconciliationService;
