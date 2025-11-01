import type { OrderRequest } from "@paypal/paypal-server-sdk";
import {
  CheckoutPaymentIntent,
  OrderApplicationContextUserAction,
  OrdersController,
} from "@paypal/paypal-server-sdk";
import { ConvexHttpClient } from "convex/browser";
import { createVerify } from "node:crypto";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { PAYPAL_CANCEL_URL, PAYPAL_RETURN_URL, paypalClient } from "../config/paypal";

// Initialize Convex client for database operations
const convex = new ConvexHttpClient(process.env.VITE_CONVEX_URL!);

export interface PaymentRequest {
  serviceType: string;
  amount: number;
  currency: string;
  description: string;
  reservationId: string;
  userId: string;
  customerEmail: string;
}

export interface PaymentResponse {
  success: boolean;
  paymentUrl?: string;
  orderId?: string;
  error?: string;
}

export interface WebhookEvent {
  id: string;
  event_type: string;
  resource: {
    id: string;
    status: string;
    custom_id?: string;
    [key: string]: unknown;
  };
  create_time: string;
}

export class PayPalService {
  /**
   * Creates a real PayPal order for payment
   * Handles return URLs correctly
   */
  static async createPaymentOrder(paymentRequest: PaymentRequest): Promise<PaymentResponse> {
    try {
      const { amount, currency, description, reservationId } = paymentRequest;

      console.log("🚀 Creating REAL PayPal order for reservation:", reservationId);
      console.log("💰 Payment details:", { amount, currency, description });

      // Validate currency
      if (!["EUR", "USD"].includes(currency)) {
        throw new Error(`Currency '${currency}' not supported`);
      }

      // Create PayPal order with official SDK
      const ordersController = new OrdersController(paypalClient);

      const requestBody: OrderRequest = {
        intent: CheckoutPaymentIntent.Capture,
        purchaseUnits: [
          {
            amount: {
              currencyCode: currency,
              value: amount.toString(),
            },
            customId: reservationId,
          },
        ],
        applicationContext: {
          returnUrl: `${PAYPAL_RETURN_URL}/${reservationId}`,
          cancelUrl: PAYPAL_CANCEL_URL,
          brandName: "BroLab Entertainment",
          userAction: OrderApplicationContextUserAction.PayNow,
        },
      };

      console.log("📤 Sending PayPal order creation request...");
      console.log("📋 Request body:", JSON.stringify(requestBody, null, 2));

      // Call PayPal API via controller
      const order = await ordersController.createOrder({
        body: requestBody,
        prefer: "return=representation",
      });

      if (order.result?.id) {
        const orderId = order.result.id;
        const approvalUrl = order.result.links?.find(
          (link: { rel: string; href: string }) => link.rel === "approve"
        )?.href;

        if (!approvalUrl) {
          throw new Error("PayPal approval URL not found");
        }

        console.log("✅ REAL PayPal order created successfully:", orderId);
        console.log("🔗 Approval URL:", approvalUrl);
        console.log("📝 Reservation ID stored in customId:", reservationId);

        return {
          success: true,
          paymentUrl: approvalUrl,
          orderId: orderId,
        };
      } else {
        throw new Error("Invalid PayPal order response");
      }
    } catch (error) {
      console.error("❌ Error creating REAL PayPal order:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Captures a real PayPal payment after approval
   * Uses PayPal orderId (token) for capture
   */
  static async capturePayment(
    orderId: string
  ): Promise<{ success: boolean; transactionId?: string; error?: string }> {
    try {
      console.log("🎯 Capturing REAL PayPal payment for order:", orderId);

      // Verify this is a valid PayPal orderId
      if (!orderId || orderId.length < 10) {
        throw new Error("Invalid PayPal order ID");
      }

      // Create capture request via controller
      const ordersController = new OrdersController(paypalClient);

      console.log("📤 Sending PayPal capture request...");

      // Call PayPal API to capture payment
      const capture = await ordersController.captureOrder({
        id: orderId,
      });

      if (capture.result?.id) {
        const transactionId = capture.result.id;
        const status = capture.result.status;

        console.log("✅ REAL PayPal payment captured successfully:", { transactionId, status });

        return {
          success: true,
          transactionId: transactionId,
        };
      } else {
        throw new Error("Invalid PayPal capture response");
      }
    } catch (error) {
      console.error("❌ Error capturing REAL PayPal payment:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Verifies PayPal webhook signature using proper certificate validation
   * Implements PayPal's webhook signature verification algorithm
   * @see https://developer.paypal.com/docs/api-basics/notifications/webhooks/notification-messages/#link-verifysignature
   */
  static async verifyWebhookSignature(
    webhookId: string,
    transmissionId: string,
    timestamp: string,
    certUrl: string,
    authAlgo: string,
    transmissionSig: string,
    body: string
  ): Promise<boolean> {
    try {
      console.log("🔐 Verifying PayPal webhook signature", {
        webhookId: webhookId?.substring(0, 10) + "...",
        transmissionId: transmissionId?.substring(0, 10) + "...",
        timestamp,
        authAlgo,
      });

      // Validate required parameters
      if (
        !webhookId ||
        !transmissionId ||
        !timestamp ||
        !certUrl ||
        !authAlgo ||
        !transmissionSig ||
        !body
      ) {
        console.error("❌ Missing required webhook verification parameters");
        return false;
      }

      // Validate webhook ID matches configured webhook
      const configuredWebhookId = process.env.PAYPAL_WEBHOOK_ID;
      if (!configuredWebhookId) {
        console.error("❌ PAYPAL_WEBHOOK_ID not configured in environment");
        return false;
      }

      if (webhookId !== configuredWebhookId) {
        console.error("❌ Webhook ID mismatch", {
          received: webhookId,
          expected: configuredWebhookId?.substring(0, 10) + "...",
        });
        return false;
      }

      // Validate certificate URL is from PayPal
      const validCertDomains = [
        "https://api.paypal.com",
        "https://api.sandbox.paypal.com",
        "https://api-m.paypal.com",
        "https://api-m.sandbox.paypal.com",
      ];

      const isValidCertUrl = validCertDomains.some(domain => certUrl.startsWith(domain));
      if (!isValidCertUrl) {
        console.error("❌ Invalid certificate URL domain", { certUrl });
        return false;
      }

      // Fetch PayPal certificate
      let certificate: string;
      try {
        const certResponse = await fetch(certUrl);
        if (!certResponse.ok) {
          throw new Error(`Failed to fetch certificate: ${certResponse.status}`);
        }
        certificate = await certResponse.text();
        console.log("✅ PayPal certificate fetched successfully");
      } catch (error) {
        console.error("❌ Failed to fetch PayPal certificate:", error);
        return false;
      }

      // Construct expected signature string according to PayPal spec
      // Format: transmission_id|timestamp|webhook_id|crc32(body)
      const crc32 = this.calculateCRC32(body);
      const expectedSignatureString = `${transmissionId}|${timestamp}|${webhookId}|${crc32}`;

      console.log("🔐 Verifying signature with expected string", {
        expectedSignatureString: expectedSignatureString.substring(0, 50) + "...",
        algorithm: authAlgo,
      });

      // Verify signature using the certificate
      try {
        const verifier = createVerify(authAlgo.toUpperCase());
        verifier.update(expectedSignatureString);
        verifier.end();

        const isValid = verifier.verify(certificate, transmissionSig, "base64");

        if (isValid) {
          console.log("✅ PayPal webhook signature verified successfully");
          return true;
        } else {
          console.error("❌ PayPal webhook signature verification failed - signature mismatch");
          return false;
        }
      } catch (error) {
        console.error("❌ Error during signature verification:", error);
        return false;
      }
    } catch (error) {
      console.error("❌ Unexpected error verifying webhook signature:", error);
      // Log security event for failed verification
      console.error("🚨 SECURITY: PayPal webhook signature verification failed", {
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString(),
      });
      return false;
    }
  }

  /**
   * Calculate CRC32 checksum for webhook body
   * Required for PayPal webhook signature verification
   */
  private static calculateCRC32(str: string): number {
    const table: number[] = [];
    let crc = 0;

    // Generate CRC32 lookup table
    for (let i = 0; i < 256; i++) {
      let c = i;
      for (let j = 0; j < 8; j++) {
        c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      }
      table[i] = c;
    }

    // Calculate CRC32
    crc = 0 ^ -1;
    for (let i = 0; i < str.length; i++) {
      const charCode = str.codePointAt(i) ?? 0;
      crc = (crc >>> 8) ^ table[(crc ^ charCode) & 0xff];
    }

    return (crc ^ -1) >>> 0;
  }

  /**
   * Processes a PayPal webhook event
   * Handles PayPal IDs correctly
   */
  static async processWebhookEvent(
    event: WebhookEvent
  ): Promise<{ success: boolean; message: string }> {
    try {
      console.log("📡 Processing REAL PayPal webhook event:", event.event_type);

      switch (event.event_type) {
        case "PAYMENT.CAPTURE.COMPLETED":
          return await this.handlePaymentCompleted(event);

        case "PAYMENT.CAPTURE.DENIED":
          return await this.handlePaymentDenied(event);

        case "PAYMENT.CAPTURE.REFUNDED":
          return await this.handlePaymentRefunded(event);

        default:
          console.log("ℹ️ Unhandled webhook event type:", event.event_type);
          return {
            success: true,
            message: `Unhandled event type: ${event.event_type}`,
          };
      }
    } catch (error) {
      console.error("❌ Error processing webhook event:", error);
      return {
        success: false,
        message: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Handles PAYMENT.CAPTURE.COMPLETED webhook event
   */
  private static async handlePaymentCompleted(
    event: WebhookEvent
  ): Promise<{ success: boolean; message: string }> {
    const transactionId = event.resource.id;
    const customId = event.resource.custom_id;

    console.log("💰 Payment completed:", { transactionId, reservationId: customId });

    if (!customId) {
      return {
        success: true,
        message: "Payment completed but no reservation ID found",
      };
    }

    await this.updateReservationStatus(
      customId,
      "confirmed",
      `PayPal payment completed. Transaction ID: ${transactionId}`
    );

    console.log("✅ Reservation status updated to confirmed:", customId);

    return {
      success: true,
      message: `Payment completed for reservation ${customId}`,
    };
  }

  /**
   * Handles PAYMENT.CAPTURE.DENIED webhook event
   */
  private static async handlePaymentDenied(
    event: WebhookEvent
  ): Promise<{ success: boolean; message: string }> {
    const deniedCustomId = event.resource.custom_id;

    console.log("❌ Payment denied for reservation:", deniedCustomId);

    if (!deniedCustomId) {
      return {
        success: true,
        message: "Payment denied but no reservation ID found",
      };
    }

    await this.updateReservationStatus(
      deniedCustomId,
      "pending",
      `PayPal payment denied. Event ID: ${event.id}`
    );

    console.log("✅ Reservation status updated to pending (payment denied):", deniedCustomId);

    return {
      success: true,
      message: `Payment denied for reservation ${deniedCustomId}`,
    };
  }

  /**
   * Handles PAYMENT.CAPTURE.REFUNDED webhook event
   */
  private static async handlePaymentRefunded(
    event: WebhookEvent
  ): Promise<{ success: boolean; message: string }> {
    const refundedCustomId = event.resource.custom_id;
    const refundId = event.resource.id;

    console.log("↩️ Payment refunded for reservation:", refundedCustomId);

    if (!refundedCustomId) {
      return {
        success: true,
        message: "Payment refunded but no reservation ID found",
      };
    }

    await this.updateReservationStatus(
      refundedCustomId,
      "cancelled",
      `PayPal payment refunded. Refund ID: ${refundId}`
    );

    console.log("✅ Reservation status updated to cancelled (refunded):", refundedCustomId);

    return {
      success: true,
      message: `Payment refunded for reservation ${refundedCustomId}`,
    };
  }

  /**
   * Updates reservation status in Convex
   * Centralized error handling for reservation updates
   */
  private static async updateReservationStatus(
    reservationId: string,
    status: "confirmed" | "pending" | "cancelled",
    notes: string
  ): Promise<void> {
    try {
      // @ts-expect-error - Convex API type depth issue
      await (convex.mutation as unknown)(api.reservations.updateReservationStatus, {
        reservationId: reservationId as Id<"reservations">,
        status,
        notes,
        skipEmailNotification: false,
      });
    } catch (error) {
      console.error("❌ Failed to update reservation status:", error);
      throw new Error(
        `Failed to update reservation status: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  /**
   * Gets details of a real PayPal order
   * Uses PayPal orderId
   */
  static async getOrderDetails(orderId: string): Promise<unknown> {
    try {
      console.log("📋 Getting REAL PayPal order details:", orderId);

      // orderId is the PayPal token
      if (!orderId || orderId.length < 10) {
        throw new Error("Invalid PayPal order ID");
      }

      // Create retrieval request via controller
      const ordersController = new OrdersController(paypalClient);

      console.log("📤 Sending PayPal order details request...");

      // Call PayPal API
      const order = await ordersController.getOrder({
        id: orderId,
      });

      if (order.result) {
        console.log("✅ REAL PayPal order details retrieved successfully");
        return order.result;
      } else {
        throw new Error("Invalid PayPal order response");
      }
    } catch (error) {
      console.error("❌ Error getting REAL PayPal order details:", error);
      throw error;
    }
  }
}

export default PayPalService;
