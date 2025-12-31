import Stripe from "stripe";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { LicenseType } from "../../shared/types/Beat";
import { centsToDollars } from "../../shared/utils/currency";
import { getConvex } from "../lib/convex";
import { PaymentError, PaymentErrorCode } from "../utils/errorHandling";
import { adminNotificationService } from "./AdminNotificationService";
import { getInvoiceService } from "./InvoiceService";
import { sendLicenseEmail } from "./LicenseEmailService";
import { getLicensePdfService } from "./LicensePdfService";
import { ReservationPaymentService } from "./ReservationPaymentService";
import PayPalService from "./paypal";

// PaymentData type for payment information
export interface PaymentData {
  provider: "stripe" | "paypal";
  status: "succeeded" | "failed" | "refunded" | "processing";
  amount: number;
  currency: string;
  paymentIntentId?: string;
  transactionId?: string;
  sessionId?: string;
  eventId: string;
}

/**
 * PaymentService - Handles payment processing with Stripe and PayPal
 *
 * Features:
 * - Create payment intents with order metadata
 * - Handle Stripe webhooks with signature verification
 * - Handle PayPal webhooks with signature verification
 * - Route events to appropriate handlers (orders, reservations)
 * - Idempotency key management
 * - Retry logic for failed webhook processing
 * - Error handling with user-friendly messages
 * - Integration with ReservationPaymentService and InvoiceService
 *
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 2.1, 2.2, 2.5, 5.1, 5.2, 5.3, 5.4, 5.5, 7.1, 7.2, 7.3, 7.4, 7.5
 */

// Lazy initialization of Stripe client
// Aligned with server/lib/env.ts which makes STRIPE_SECRET_KEY optional outside production
let stripeClient: Stripe | null = null;

/**
 * Get Stripe client with lazy initialization
 * Only throws when Stripe is actually needed, not at module load time
 * This allows the app to start without STRIPE_SECRET_KEY in dev/test environments
 */
function getStripeClient(): Stripe {
  if (!stripeClient) {
    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (!secretKey) {
      throw new PaymentError(
        "STRIPE_SECRET_KEY is required for payment operations",
        PaymentErrorCode.MISSING_CONFIGURATION,
        { service: "stripe", missingConfig: "STRIPE_SECRET_KEY" }
      );
    }
    stripeClient = new Stripe(secretKey, {
      apiVersion: "2025-08-27.basil",
    });
  }
  return stripeClient;
}

// Initialize Convex client
// SECURITY: Use lazy initialization with proper validation
const convex = getConvex();

// Types
interface Order {
  _id: Id<"orders">;
  userId?: Id<"users">;
  email: string;
  total: number;
  currency?: string;
  items: Array<{
    productId?: number;
    title?: string;
    name?: string;
    price?: number;
    quantity?: number;
    license?: string;
  }>;
  idempotencyKey?: string;
}

interface PaymentIntent {
  id: string;
  client_secret: string | null;
  amount: number;
  currency: string;
  status: string;
}

interface WebhookResult {
  success: boolean;
  message: string;
  orderId?: Id<"orders">;
  reservationIds?: string[];
}

/**
 * PaymentService class
 */
export class PaymentService {
  private static instance: PaymentService;
  private readonly reservationPaymentService: ReservationPaymentService;
  private readonly invoiceService: ReturnType<typeof getInvoiceService>;

  private constructor() {
    this.reservationPaymentService = ReservationPaymentService.getInstance();
    this.invoiceService = getInvoiceService();
  }

  /**
   * Get singleton instance
   */
  static getInstance(): PaymentService {
    if (!PaymentService.instance) {
      PaymentService.instance = new PaymentService();
    }
    return PaymentService.instance;
  }

  /**
   * Create payment intent with order metadata
   * Completes within 3 seconds
   */
  async createPaymentIntent(order: Order): Promise<PaymentIntent> {
    const startTime = Date.now();

    try {
      // Generate idempotency key if not provided
      const idempotencyKey = order.idempotencyKey || `order_${order._id}_${Date.now()}`;

      // Create payment intent with Stripe
      const paymentIntent = await getStripeClient().paymentIntents.create(
        {
          amount: Math.round(order.total), // Amount in cents
          currency: (order.currency || "USD").toLowerCase(),
          metadata: {
            orderId: order._id,
            email: order.email,
            userId: order.userId || "",
            itemCount: order.items.length.toString(),
          },
          automatic_payment_methods: {
            enabled: true,
          },
        },
        {
          idempotencyKey,
        }
      );

      // Update order with payment intent ID
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore - Convex API deep type instantiation limitation
      await convex.mutation(api.orders.saveStripeCheckoutSession, {
        orderId: order._id,
        checkoutSessionId: paymentIntent.id,
        paymentIntentId: paymentIntent.id,
      });

      const duration = Date.now() - startTime;
      console.log(`✅ Payment intent created in ${duration}ms: ${paymentIntent.id}`);

      return {
        id: paymentIntent.id,
        client_secret: paymentIntent.client_secret,
        amount: paymentIntent.amount,
        currency: paymentIntent.currency,
        status: paymentIntent.status,
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`❌ Failed to create payment intent after ${duration}ms:`, error);

      // Log error to audit
      await this.logToAudit({
        action: "payment_intent_creation_failed",
        resource: "payments",
        details: {
          orderId: order._id,
          error: error instanceof Error ? error.message : String(error),
          duration,
        },
      });

      throw new Error(
        `Failed to create payment intent: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  /**
   * Handle Stripe webhook with signature verification
   * Routes events to appropriate handlers based on metadata
   * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 5.1, 5.2, 5.3, 5.4, 5.5
   */
  async handleStripeWebhook(payload: Buffer, signature: string): Promise<WebhookResult> {
    const startTime = Date.now();

    try {
      // Verify webhook signature
      const event = await this.verifyStripeSignature(payload, signature);

      console.log(`📨 Stripe webhook received: ${event.type} (${event.id})`);

      // Check if event already processed (idempotency)
      const idempotencyResult = await convex.mutation(api.orders.markProcessedEvent, {
        provider: "stripe",
        eventId: event.id,
      });

      if (
        idempotencyResult &&
        typeof idempotencyResult === "object" &&
        "alreadyProcessed" in idempotencyResult &&
        idempotencyResult.alreadyProcessed
      ) {
        console.log(`ℹ️ Event ${event.id} already processed, skipping`);
        return {
          success: true,
          message: "Event already processed",
        };
      }

      // Route event to appropriate handler
      const result = await this.routeStripeEvent(event);

      const duration = Date.now() - startTime;
      console.log(`✅ Stripe webhook processed in ${duration}ms: ${event.type}`);

      // Log successful processing
      await this.logToAudit({
        action: "webhook_processed",
        resource: "payments",
        details: {
          provider: "stripe",
          eventType: event.type,
          eventId: event.id,
          duration,
        },
      });

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`❌ Error handling Stripe webhook after ${duration}ms:`, errorMessage);

      // Log error to audit with full context
      await this.logToAudit({
        action: "webhook_processing_error",
        resource: "payments",
        details: {
          provider: "stripe",
          error: errorMessage,
          stack: error instanceof Error ? error.stack : undefined,
          duration,
        },
      });

      // Send admin notification for webhook processing error
      // Extract event type and ID if available
      let eventType = "unknown";
      let eventId = "unknown";
      try {
        const event = await this.verifyStripeSignature(payload, signature);
        eventType = event.type;
        eventId = event.id;
      } catch {
        // Ignore verification errors here, already logged above
      }

      await adminNotificationService.notifyWebhookProcessingError(
        "stripe",
        eventType,
        eventId,
        errorMessage
      );

      // Retry logic will be handled by Stripe's automatic retry mechanism
      throw error;
    }
  }

  /**
   * Route Stripe event to appropriate handler
   * Checks metadata.type for reservation payments
   * Requirements: 1.2, 5.1, 5.2
   */
  private async routeStripeEvent(event: Stripe.Event): Promise<WebhookResult> {
    try {
      switch (event.type) {
        case "checkout.session.completed":
          return await this.handleCheckoutSessionCompleted(event.data.object);

        case "payment_intent.succeeded":
          return await this.handlePaymentSuccess(event.data.object);

        case "payment_intent.payment_failed":
          return await this.handlePaymentFailure(event.data.object);

        case "charge.refunded":
          return await this.handleRefund(event.data.object);

        default:
          console.log(`ℹ️ Unhandled Stripe event type: ${event.type}`);
          return {
            success: true,
            message: `Unhandled event type: ${event.type}`,
          };
      }
    } catch (error) {
      console.error(`❌ Error routing Stripe event ${event.type}:`, error);
      throw error;
    }
  }

  /**
   * Handle reservation payment from checkout session
   */
  private async handleReservationCheckout(
    session: Stripe.Checkout.Session,
    reservationIds: string
  ): Promise<WebhookResult> {
    const ids = JSON.parse(reservationIds);

    const paymentData: PaymentData = {
      provider: "stripe",
      status: "succeeded",
      amount: session.amount_total || 0,
      currency: session.currency || "usd",
      sessionId: session.id,
      paymentIntentId:
        typeof session.payment_intent === "string" ? session.payment_intent : undefined,
      eventId: session.id,
    };

    await this.reservationPaymentService.handleReservationPaymentSuccess(ids, paymentData, session);

    return {
      success: true,
      message: "Reservation payment processed successfully",
      reservationIds: ids,
    };
  }

  /**
   * Process order payment and confirmation
   */
  private async processOrderPayment(
    session: Stripe.Checkout.Session,
    orderId: Id<"orders">
  ): Promise<void> {
    await convex.mutation(api.orders.recordPayment, {
      orderId,
      provider: "stripe",
      status: "succeeded",
      amount: session.amount_total || 0,
      currency: session.currency || "usd",
      stripeEventId: session.id,
      stripePaymentIntentId:
        typeof session.payment_intent === "string" ? session.payment_intent : undefined,
    });

    await convex.mutation(api.orders.confirmPayment.confirmPayment, {
      orderId,
      paymentIntentId:
        typeof session.payment_intent === "string" ? session.payment_intent : session.id,
      status: "succeeded",
    });
  }

  /**
   * Generate and send invoice for order
   */
  private async generateOrderInvoice(
    session: Stripe.Checkout.Session,
    orderId: Id<"orders">
  ): Promise<void> {
    try {
      const order = await convex.query(api.orders.getOrder, { orderId });
      if (
        !order ||
        typeof order !== "object" ||
        !("items" in order) ||
        !Array.isArray(order.items)
      ) {
        return;
      }

      const invoiceItems = order.items.map(
        (item: {
          productId?: number | string;
          title?: string;
          name?: string;
          price?: number;
          quantity?: number;
          qty?: number;
          license?: string;
          type?: string;
        }) => ({
          productId: item.productId || 0,
          title: item.title || item.name || "Unknown Item",
          unitPrice: item.price || 0,
          totalPrice: (item.price || 0) * (item.quantity || item.qty || 1),
          qty: item.quantity || item.qty || 1,
          type: item.license || item.type,
        })
      );

      const orderData = {
        id: orderId,
        userId: "userId" in order && typeof order.userId === "string" ? order.userId : undefined,
        email: "email" in order && typeof order.email === "string" ? order.email : "",
        total: session.amount_total || 0,
        currency: session.currency || "usd",
        sessionId: session.id,
        paymentIntentId:
          typeof session.payment_intent === "string" ? session.payment_intent : undefined,
      };

      const invoice = await this.invoiceService.generateInvoice(orderData, invoiceItems);
      await this.invoiceService.sendInvoiceEmail(
        orderData.email,
        invoice.invoiceUrl,
        invoice.invoiceNumber
      );
    } catch (invoiceError) {
      console.error("⚠️ Failed to generate/send invoice:", invoiceError);
      // Don't fail the webhook if invoice generation fails
    }
  }

  /**
   * Generate and send license PDFs for order items (beat purchases)
   */
  private async generateOrderLicenses(
    session: Stripe.Checkout.Session,
    orderId: Id<"orders">
  ): Promise<void> {
    try {
      const order = await convex.query(api.orders.getOrder, { orderId });
      if (
        !order ||
        typeof order !== "object" ||
        !("items" in order) ||
        !Array.isArray(order.items)
      ) {
        return;
      }

      const buyerEmail = "email" in order && typeof order.email === "string" ? order.email : "";
      const buyerName = session.customer_details?.name || buyerEmail.split("@")[0] || "Customer";
      const buyerUserId =
        "userId" in order && typeof order.userId === "string" ? order.userId : undefined;

      if (!buyerEmail) {
        console.warn("⚠️ No buyer email found, skipping license generation");
        return;
      }

      const licensePdfService = getLicensePdfService();
      const currency = (session.currency || "usd").toUpperCase();

      // Process each beat item in the order
      for (let i = 0; i < order.items.length; i++) {
        const item = order.items[i] as {
          productId?: number;
          title?: string;
          name?: string;
          license?: string;
          price?: number;
          type?: string;
        };

        // Skip non-beat items (subscriptions, services)
        if (item.type && item.type !== "beat") {
          continue;
        }

        // Validate license type
        const licenseType = this.validateLicenseType(item.license);
        if (!licenseType) {
          console.warn(`⚠️ Invalid license type for item ${i}: ${item.license}`);
          continue;
        }

        try {
          // Generate license PDF
          const licenseResult = await licensePdfService.generateLicense({
            orderId: String(orderId),
            itemId: String(i),
            beat: {
              id: item.productId || 0,
              title: item.title || item.name || `Beat ${item.productId}`,
              producer: "BroLab Entertainment",
            },
            licenseType,
            buyer: {
              name: buyerName,
              email: buyerEmail,
              userId: buyerUserId,
            },
            purchaseDate: new Date(),
            price: centsToDollars(item.price || 0),
            currency,
          });

          console.log(`✅ License generated: ${licenseResult.licenseNumber}`);

          // Send license email
          await sendLicenseEmail({
            buyerEmail,
            buyerName,
            beatTitle: item.title || item.name || `Beat ${item.productId}`,
            licenseType,
            licenseNumber: licenseResult.licenseNumber,
            licenseUrl: licenseResult.licenseUrl,
            orderId: String(orderId),
            purchaseDate: new Date(),
            price: centsToDollars(item.price || 0),
            currency,
          });

          console.log(`✅ License email sent for: ${item.title || item.name}`);
        } catch (itemError) {
          console.error(`⚠️ Failed to generate license for item ${i}:`, itemError);
          // Continue with other items
        }
      }
    } catch (licenseError) {
      console.error("⚠️ Failed to generate/send licenses:", licenseError);
      // Don't fail the webhook if license generation fails
    }
  }

  /**
   * Validate and convert license type string to LicenseType enum
   */
  private validateLicenseType(license?: string): LicenseType | null {
    if (!license) return null;

    const normalized = license.toLowerCase();
    if (normalized === "basic") return LicenseType.BASIC;
    if (normalized === "premium") return LicenseType.PREMIUM;
    if (normalized === "unlimited") return LicenseType.UNLIMITED;

    return null;
  }

  /**
   * Handle checkout.session.completed event
   * Routes to reservation handler if metadata.type === "reservation_payment"
   * Requirements: 4.2, 5.1, 5.2
   */
  private async handleCheckoutSessionCompleted(
    session: Stripe.Checkout.Session
  ): Promise<WebhookResult> {
    try {
      const paymentType = session.metadata?.type;
      const reservationIds = session.metadata?.reservationIds;

      console.log(`💳 Checkout session completed: ${session.id}`, {
        paymentType,
        hasReservationIds: !!reservationIds,
      });

      // Route to reservation handler if this is a reservation payment
      if (paymentType === "reservation_payment" && reservationIds) {
        return await this.handleReservationCheckout(session, reservationIds);
      }

      // Handle regular order payment
      const orderId = session.metadata?.orderId as Id<"orders"> | undefined;
      if (!orderId) {
        console.error("❌ No orderId in checkout session metadata");
        return {
          success: false,
          message: "No orderId in checkout session metadata",
        };
      }

      await this.processOrderPayment(session, orderId);
      await this.generateOrderInvoice(session, orderId);
      await this.generateOrderLicenses(session, orderId);

      console.log(`✅ Order payment processed successfully: ${orderId}`);

      return {
        success: true,
        message: "Order payment processed successfully",
        orderId,
      };
    } catch (error) {
      console.error("❌ Error handling checkout session completed:", error);
      throw error;
    }
  }

  /**
   * Handle PayPal webhook with signature verification
   * Routes events to appropriate handlers based on event type
   * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 5.1, 5.2, 5.3, 5.4, 5.5
   */
  async handlePayPalWebhook(
    payload: Buffer,
    headers: Record<string, string>
  ): Promise<WebhookResult> {
    const startTime = Date.now();

    try {
      // Verify webhook signature using PayPal service
      const isValid = await this.verifyPayPalSignature(payload, headers);
      if (!isValid) {
        await this.logToAudit({
          action: "webhook_signature_verification_failed",
          resource: "payments",
          details: {
            provider: "paypal",
            statusCode: 400,
          },
        });

        return {
          success: false,
          message: "Webhook signature verification failed",
        };
      }

      const event = JSON.parse(payload.toString());

      console.log(`📨 PayPal webhook received: ${event.event_type} (${event.id})`);

      // Check if event already processed (idempotency)
      const idempotencyResult = await convex.mutation(api.orders.markProcessedEvent, {
        provider: "paypal",
        eventId: event.id,
      });

      if (
        idempotencyResult &&
        typeof idempotencyResult === "object" &&
        "alreadyProcessed" in idempotencyResult &&
        idempotencyResult.alreadyProcessed
      ) {
        console.log(`ℹ️ Event ${event.id} already processed, skipping`);
        return {
          success: true,
          message: "Event already processed",
        };
      }

      // Route event to appropriate handler
      const result = await this.routePayPalEvent(event);

      const duration = Date.now() - startTime;
      console.log(`✅ PayPal webhook processed in ${duration}ms: ${event.event_type}`);

      // Log successful processing
      await this.logToAudit({
        action: "webhook_processed",
        resource: "payments",
        details: {
          provider: "paypal",
          eventType: event.event_type,
          eventId: event.id,
          duration,
        },
      });

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`❌ Error handling PayPal webhook after ${duration}ms:`, errorMessage);

      // Log error to audit with full context
      await this.logToAudit({
        action: "webhook_processing_error",
        resource: "payments",
        details: {
          provider: "paypal",
          error: errorMessage,
          stack: error instanceof Error ? error.stack : undefined,
          duration,
        },
      });

      // Send admin notification for webhook processing error
      // Extract event type and ID if available
      let eventType = "unknown";
      let eventId = "unknown";
      try {
        const event = JSON.parse(payload.toString());
        eventType = event.event_type || "unknown";
        eventId = event.id || "unknown";
      } catch {
        // Ignore parsing errors
      }

      await adminNotificationService.notifyWebhookProcessingError(
        "paypal",
        eventType,
        eventId,
        errorMessage
      );

      throw error;
    }
  }

  /**
   * Route PayPal event to appropriate handler
   * Checks custom_id to determine if it's a reservation payment
   * Requirements: 2.2, 5.1, 5.2
   */
  private async routePayPalEvent(event: {
    id: string;
    event_type: string;
    resource?: {
      id?: string;
      status?: string;
      custom_id?: string;
      amount?: { value?: string; currency_code?: string };
      [key: string]: unknown;
    };
  }): Promise<WebhookResult> {
    try {
      switch (event.event_type) {
        case "PAYMENT.CAPTURE.COMPLETED":
          return await this.handlePayPalPaymentSuccess(event);

        case "PAYMENT.CAPTURE.DENIED":
        case "PAYMENT.CAPTURE.DECLINED":
          return await this.handlePayPalPaymentFailure(event);

        case "PAYMENT.CAPTURE.REFUNDED":
          return await this.handlePayPalRefund(event);

        default:
          console.log(`ℹ️ Unhandled PayPal event type: ${event.event_type}`);
          return {
            success: true,
            message: `Unhandled event type: ${event.event_type}`,
          };
      }
    } catch (error) {
      console.error(`❌ Error routing PayPal event ${event.event_type}:`, error);
      throw error;
    }
  }

  /**
   * Verify Stripe webhook signature
   * Requirements: 3.1, 3.2, 3.3, 8.3, 8.4
   */
  private async verifyStripeSignature(payload: Buffer, signature: string): Promise<Stripe.Event> {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!webhookSecret) {
      console.error("❌ STRIPE_WEBHOOK_SECRET not configured");

      // Notify admins of configuration error
      await adminNotificationService.notifyConfigurationError("Stripe Webhooks", [
        "STRIPE_WEBHOOK_SECRET",
      ]);

      throw new PaymentError(
        "STRIPE_WEBHOOK_SECRET not configured",
        PaymentErrorCode.MISSING_CONFIGURATION,
        { service: "stripe", missingConfig: "STRIPE_WEBHOOK_SECRET" }
      );
    }

    try {
      const event = getStripeClient().webhooks.constructEvent(payload, signature, webhookSecret);
      console.log(`✅ Stripe signature verified: ${event.id}`);
      return event;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error("❌ Stripe signature verification failed:", errorMessage);

      // Log security event
      await this.logToAudit({
        action: "signature_verification_failed",
        resource: "security",
        details: {
          provider: "stripe",
          error: errorMessage,
          timestamp: Date.now(),
        },
      });

      // Send critical security alert to admins
      await adminNotificationService.notifySignatureVerificationFailure("stripe", errorMessage);

      throw new PaymentError(
        "Invalid Stripe signature",
        PaymentErrorCode.STRIPE_INVALID_SIGNATURE,
        { provider: "stripe", error: errorMessage }
      );
    }
  }

  /**
   * Verify PayPal webhook signature using PayPal SDK
   * Requirements: 2.3, 2.4, 3.2, 3.3, 3.5, 8.3, 8.4
   */
  private async verifyPayPalSignature(
    payload: Buffer,
    headers: Record<string, string>
  ): Promise<boolean> {
    const webhookId = process.env.PAYPAL_WEBHOOK_ID;

    if (!webhookId) {
      console.error("❌ PAYPAL_WEBHOOK_ID not configured");

      // Notify admins of configuration error
      await adminNotificationService.notifyConfigurationError("PayPal Webhooks", [
        "PAYPAL_WEBHOOK_ID",
      ]);

      return false;
    }

    const {
      "paypal-transmission-id": transmissionId,
      "paypal-transmission-time": timestamp,
      "paypal-transmission-sig": signature,
      "paypal-cert-url": certUrl,
      "paypal-auth-algo": authAlgo,
    } = headers;

    if (!transmissionId || !timestamp || !signature || !certUrl || !authAlgo) {
      console.error("❌ Missing PayPal webhook headers");
      return false;
    }

    try {
      const body = payload.toString();

      // Use PayPal SDK to verify signature
      const isValid = await PayPalService.verifyWebhookSignature(
        webhookId,
        transmissionId,
        timestamp,
        certUrl,
        authAlgo,
        signature,
        body
      );

      if (!isValid) {
        // Log security event
        await this.logToAudit({
          action: "signature_verification_failed",
          resource: "security",
          details: {
            provider: "paypal",
            webhookId: webhookId.substring(0, 10) + "...",
            timestamp: Date.now(),
          },
        });

        // Send critical security alert to admins
        await adminNotificationService.notifySignatureVerificationFailure(
          "paypal",
          "PayPal webhook signature verification failed"
        );
      }

      return isValid;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error("❌ PayPal signature verification failed:", errorMessage);

      // Log security event
      await this.logToAudit({
        action: "signature_verification_failed",
        resource: "security",
        details: {
          provider: "paypal",
          error: errorMessage,
          timestamp: Date.now(),
        },
      });

      // Send critical security alert to admins
      await adminNotificationService.notifySignatureVerificationFailure("paypal", errorMessage);

      return false;
    }
  }

  /**
   * Handle successful payment intent
   * Requirements: 5.2, 5.3, 7.2
   */
  private async handlePaymentSuccess(paymentIntent: Stripe.PaymentIntent): Promise<WebhookResult> {
    const orderId = paymentIntent.metadata.orderId as Id<"orders"> | undefined;

    if (!orderId) {
      console.error("❌ No orderId in payment intent metadata");
      return {
        success: false,
        message: "No orderId in payment intent metadata",
      };
    }

    try {
      // Record payment
      await convex.mutation(api.orders.recordPayment, {
        orderId,
        provider: "stripe",
        status: "succeeded",
        amount: paymentIntent.amount,
        currency: paymentIntent.currency,
        stripeEventId: paymentIntent.id,
        stripePaymentIntentId: paymentIntent.id,
        stripeChargeId:
          typeof paymentIntent.latest_charge === "string" ? paymentIntent.latest_charge : undefined,
      });

      // Confirm payment and grant downloads
      await convex.mutation(api.orders.confirmPayment.confirmPayment, {
        orderId,
        paymentIntentId: paymentIntent.id,
        status: "succeeded",
      });

      console.log(`✅ Payment succeeded for order: ${orderId}`);

      return {
        success: true,
        message: "Payment processed successfully",
        orderId,
      };
    } catch (error) {
      console.error("❌ Error processing payment success:", error);
      throw error;
    }
  }

  /**
   * Handle failed payment intent
   * Requirements: 5.2, 5.3, 7.2, 8.1, 8.2, 8.4
   */
  private async handlePaymentFailure(paymentIntent: Stripe.PaymentIntent): Promise<WebhookResult> {
    const orderId = paymentIntent.metadata.orderId as Id<"orders"> | undefined;

    if (!orderId) {
      console.error("❌ No orderId in payment intent metadata");
      return {
        success: false,
        message: "No orderId in payment intent metadata",
      };
    }

    try {
      const failureReason = paymentIntent.last_payment_error?.message || "Unknown reason";
      const failureCode = paymentIntent.last_payment_error?.code;
      const declineCode = paymentIntent.last_payment_error?.decline_code;

      // Record failed payment
      await convex.mutation(api.orders.recordPayment, {
        orderId,
        provider: "stripe",
        status: "failed",
        amount: paymentIntent.amount,
        currency: paymentIntent.currency,
        stripeEventId: paymentIntent.id,
        stripePaymentIntentId: paymentIntent.id,
      });

      // Log to audit with comprehensive details
      await this.logToAudit({
        action: "payment_failed",
        resource: "payments",
        details: {
          orderId,
          paymentIntentId: paymentIntent.id,
          amount: paymentIntent.amount,
          currency: paymentIntent.currency,
          failureMessage: failureReason,
          failureCode,
          declineCode,
        },
      });

      // Send admin notification for critical payment failure
      const failureCodePart = failureCode ? ` (${failureCode})` : "";
      const declineCodePart = declineCode ? ` [${declineCode}]` : "";
      const fullFailureMessage = `${failureReason}${failureCodePart}${declineCodePart}`;

      await adminNotificationService.notifyPaymentFailure(
        orderId,
        paymentIntent.id,
        paymentIntent.amount,
        paymentIntent.currency,
        fullFailureMessage
      );

      console.log(`⚠️ Payment failed for order: ${orderId}`);

      return {
        success: true,
        message: "Payment failure recorded",
        orderId,
      };
    } catch (error) {
      console.error("❌ Error processing payment failure:", error);
      throw error;
    }
  }

  /**
   * Handle refund
   * Requirements: 5.3, 7.2, 8.1, 8.2
   */
  private async handleRefund(charge: Stripe.Charge): Promise<WebhookResult> {
    const paymentIntentId = charge.payment_intent as string | undefined;

    if (!paymentIntentId) {
      console.error("❌ No payment intent ID in charge");
      return {
        success: false,
        message: "No payment intent ID in charge",
      };
    }

    try {
      // Find order by payment intent ID
      // Note: This is a simplified approach. In production, you'd want a more efficient query
      const orders = await convex.query(api.orders.listOrdersAdmin, {
        limit: 100,
      });

      const ordersList = Array.isArray(orders) ? orders : [];
      const order = ordersList.find(
        (o: { paymentIntentId?: string; _id: Id<"orders"> }) =>
          o.paymentIntentId === paymentIntentId
      );

      if (!order || !("_id" in order)) {
        console.error("❌ No order found for payment intent:", paymentIntentId);
        return {
          success: false,
          message: "Order not found",
        };
      }

      // Record refund
      await convex.mutation(api.orders.recordPayment, {
        orderId: order._id,
        provider: "stripe",
        status: "refunded",
        amount: charge.amount_refunded,
        currency: charge.currency,
        stripeEventId: charge.id,
        stripeChargeId: charge.id,
      });

      const refundReason = charge.refunds?.data[0]?.reason || undefined;

      // Log to audit
      await this.logToAudit({
        action: "payment_refunded",
        resource: "payments",
        details: {
          orderId: order._id,
          chargeId: charge.id,
          amountRefunded: charge.amount_refunded,
          currency: charge.currency,
          refundReason,
        },
      });

      // Send admin notification for refund
      await adminNotificationService.notifyRefundProcessed(
        order._id,
        charge.id,
        charge.amount_refunded,
        charge.currency,
        refundReason
      );

      console.log(`✅ Refund processed for order: ${order._id}`);

      return {
        success: true,
        message: "Refund processed successfully",
        orderId: order._id,
      };
    } catch (error) {
      console.error("❌ Error processing refund:", error);
      throw error;
    }
  }

  /**
   * Handle PayPal payment success
   * Checks custom_id to determine if it's a reservation or order payment
   * Requirements: 2.5, 5.2, 5.3, 7.2
   */
  private async handlePayPalPaymentSuccess(event: {
    id: string;
    resource?: {
      id?: string;
      custom_id?: string;
      amount?: { value?: string; currency_code?: string };
      [key: string]: unknown;
    };
  }): Promise<WebhookResult> {
    const customId = event.resource?.custom_id;

    if (!customId) {
      console.error("❌ No custom_id in PayPal event");
      return {
        success: false,
        message: "No custom_id in PayPal event",
      };
    }

    try {
      const amount = Number.parseFloat(event.resource?.amount?.value || "0") * 100; // Convert to cents
      const currency = event.resource?.amount?.currency_code || "USD";
      const transactionId = event.resource?.id || event.id;

      // Check if this is a reservation payment (custom_id starts with "reservation_")
      if (customId.startsWith("reservation_")) {
        const reservationIds = [customId];

        const paymentData: PaymentData = {
          provider: "paypal",
          status: "succeeded",
          amount: Math.round(amount),
          currency: currency.toLowerCase(),
          transactionId,
          eventId: event.id,
        };

        // Note: PayPal doesn't provide a full session object like Stripe
        // We'll need to fetch reservation details from Convex
        const mockSession = {
          id: transactionId,
          customer_email: null,
        } as unknown as Stripe.Checkout.Session;

        await this.reservationPaymentService.handleReservationPaymentSuccess(
          reservationIds,
          paymentData,
          mockSession
        );

        return {
          success: true,
          message: "PayPal reservation payment processed successfully",
          reservationIds,
        };
      }

      // Handle regular order payment
      const orderId = customId as Id<"orders">;

      // Record payment
      await convex.mutation(api.orders.recordPayment, {
        orderId,
        provider: "paypal",
        status: "succeeded",
        amount: Math.round(amount),
        currency,
        paypalTransactionId: transactionId,
      });

      // Confirm payment and grant downloads
      await convex.mutation(api.orders.confirmPayment.confirmPayment, {
        orderId,
        paymentIntentId: transactionId,
        status: "succeeded",
      });

      console.log(`✅ PayPal payment succeeded for order: ${orderId}`);

      return {
        success: true,
        message: "PayPal payment processed successfully",
        orderId,
      };
    } catch (error) {
      console.error("❌ Error processing PayPal payment success:", error);
      throw error;
    }
  }

  /**
   * Handle PayPal payment failure
   * Checks custom_id to determine if it's a reservation or order payment
   * Requirements: 2.5, 5.2, 5.3, 7.2
   */
  private async handlePayPalPaymentFailure(event: {
    id: string;
    event_type: string;
    resource?: {
      id?: string;
      custom_id?: string;
      amount?: { value?: string; currency_code?: string };
      [key: string]: unknown;
    };
  }): Promise<WebhookResult> {
    const customId = event.resource?.custom_id;

    if (!customId) {
      console.error("❌ No custom_id in PayPal event");
      return {
        success: false,
        message: "No custom_id in PayPal event",
      };
    }

    try {
      const amount = Number.parseFloat(event.resource?.amount?.value || "0") * 100; // Convert to cents
      const currency = event.resource?.amount?.currency_code || "USD";
      const transactionId = event.resource?.id || event.id;

      // Check if this is a reservation payment
      if (customId.startsWith("reservation_")) {
        const reservationIds = [customId];

        const paymentData: PaymentData = {
          provider: "paypal",
          status: "failed",
          amount: Math.round(amount),
          currency: currency.toLowerCase(),
          transactionId,
          eventId: event.id,
        };

        // Create a mock payment intent for the failure handler
        const mockPaymentIntent = {
          id: transactionId,
          last_payment_error: {
            message: `PayPal payment ${event.event_type}`,
          },
        } as unknown as Stripe.PaymentIntent;

        await this.reservationPaymentService.handleReservationPaymentFailure(
          reservationIds,
          paymentData,
          mockPaymentIntent
        );

        return {
          success: true,
          message: "PayPal reservation payment failure recorded",
          reservationIds,
        };
      }

      // Handle regular order payment failure
      const orderId = customId as Id<"orders">;

      // Record failed payment
      await convex.mutation(api.orders.recordPayment, {
        orderId,
        provider: "paypal",
        status: "failed",
        amount: Math.round(amount),
        currency,
        paypalTransactionId: transactionId,
      });

      // Log to audit
      await this.logToAudit({
        action: "payment_failed",
        resource: "payments",
        details: {
          orderId,
          provider: "paypal",
          eventId: event.id,
          eventType: event.event_type,
        },
      });

      console.log(`⚠️ PayPal payment failed for order: ${orderId}`);

      return {
        success: true,
        message: "PayPal payment failure recorded",
        orderId,
      };
    } catch (error) {
      console.error("❌ Error processing PayPal payment failure:", error);
      throw error;
    }
  }

  /**
   * Handle PayPal refund
   * Requirements: 2.5, 5.3, 7.2
   */
  private async handlePayPalRefund(event: {
    id: string;
    resource?: {
      id?: string;
      custom_id?: string;
      amount?: { value?: string; currency_code?: string };
      [key: string]: unknown;
    };
  }): Promise<WebhookResult> {
    const customId = event.resource?.custom_id;

    if (!customId) {
      console.error("❌ No custom_id in PayPal refund event");
      return {
        success: false,
        message: "No custom_id in PayPal refund event",
      };
    }

    try {
      const amount = Number.parseFloat(event.resource?.amount?.value || "0") * 100; // Convert to cents
      const currency = event.resource?.amount?.currency_code || "USD";
      const transactionId = event.resource?.id || event.id;

      // For now, only handle order refunds (not reservation refunds)
      const orderId = customId as Id<"orders">;

      // Record refund
      await convex.mutation(api.orders.recordPayment, {
        orderId,
        provider: "paypal",
        status: "refunded",
        amount: Math.round(amount),
        currency,
        paypalTransactionId: transactionId,
      });

      console.log(`✅ PayPal refund processed for order: ${orderId}`);

      return {
        success: true,
        message: "PayPal refund processed successfully",
        orderId,
      };
    } catch (error) {
      console.error("❌ Error processing PayPal refund:", error);
      throw error;
    }
  }

  /**
   * Log to audit trail
   * Requirements: 8.1, 8.2, 8.3
   */
  private async logToAudit(entry: {
    action: string;
    resource: string;
    details?: Record<string, unknown>;
  }): Promise<void> {
    try {
      await convex.mutation(api.audit.log, {
        action: entry.action,
        resource: entry.resource,
        details: entry.details,
      });
    } catch (error) {
      console.error("❌ Failed to log to audit:", error);
      // Don't throw - logging failure shouldn't break payment processing
    }
  }

  /**
   * Retry webhook processing with exponential backoff
   * 3 attempts: 1s, 2s, 4s delays
   */
  async retryWebhookProcessing<T>(fn: () => Promise<T>, maxRetries: number = 3): Promise<T> {
    let lastError: Error | undefined;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        if (attempt < maxRetries - 1) {
          const delay = Math.pow(2, attempt) * 1000; // 1s, 2s, 4s
          console.log(`⏳ Retry attempt ${attempt + 1}/${maxRetries} after ${delay}ms`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError || new Error("Webhook processing failed after retries");
  }
}

// Export singleton instance
export const paymentService = PaymentService.getInstance();
