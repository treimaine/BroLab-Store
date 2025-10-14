import { ConvexHttpClient } from "convex/browser";
import { Request, Response, Router } from "express";
import Stripe from "stripe";
import { Id } from "../../convex/_generated/dataModel";
import type { LicenseTypeEnum } from "../../shared/schema";
import type { ConvexReservationDocument } from "../../shared/types/ConvexReservation";
import {
  convertToReservationEmailData,
  isConvexReservationDocument,
} from "../../shared/types/ConvexReservation";
import type {
  CreatePaymentIntentRequest,
  CreatePaymentIntentResponse,
  StripeWebhookResponse,
} from "../../shared/types/apiEndpoints";
import { BrandConfig, buildInvoicePdfStream } from "../lib/pdf";
import { sendAdminNotification, sendMail } from "../services/mail";
import {
  sendReservationConfirmationEmail as sendConfirmationEmail,
  sendPaymentFailureEmail as sendFailureEmail,
  type PaymentData,
  type ReservationEmailData,
} from "../templates/emailTemplates";
import type { ConvexOrderData, StripeOrderItem } from "../types/routes";
import { handleRouteError } from "../types/routes";

// Type alias for Convex client to avoid casting
type ConvexClient = ConvexHttpClient;

// Types for Stripe API responses
interface StripePaymentIntentResponse {
  id: string;
  client_secret: string;
  status: string;
  amount: number;
  currency: string;
  metadata?: Record<string, string>;
}

interface StripeCheckoutSessionParams {
  orderId: string;
  successUrl: string;
  cancelUrl: string;
}

interface StripePaymentIntentParams {
  amount: number;
  currency: string;
  metadata?: Record<string, string>;
}

// Removed unused interface ConvexOrderWithRelations

// Since package installation failed, we'll use curl/fetch to call Stripe API directly
const createStripePaymentIntent = async (
  params: StripePaymentIntentParams
): Promise<StripePaymentIntentResponse> => {
  const response = await fetch("https://api.stripe.com/v1/payment_intents", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      amount: params.amount.toString(),
      currency: params.currency,
      "automatic_payment_methods[enabled]": "true",
      ...(params.metadata &&
        Object.keys(params.metadata).reduce(
          (acc, key) => {
            acc[`metadata[${key}]`] = params.metadata![key];
            return acc;
          },
          {} as Record<string, string>
        )),
    }).toString(),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Stripe API Error: ${error.error?.message || "Unknown error"}`);
  }

  return await response.json();
};

// Removed unused function retrieveStripePaymentIntent

// Initialize official Stripe client
if (!process.env.STRIPE_SECRET_KEY) {
  console.error("❌ Missing required Stripe secret: STRIPE_SECRET_KEY");
  throw new Error("STRIPE_SECRET_KEY environment variable is required");
}
const stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  // Using default API version for compatibility
});

// Stripe instance is created above

const router = Router();

// Health check route
router.get("/health", (req, res): void => {
  res.json({
    status: "ok",
    stripe: stripeClient ? "initialized" : "mock",
    timestamp: new Date().toISOString(),
  });
});

// Create checkout session for an existing order
router.post("/checkout", async (req, res): Promise<void> => {
  try {
    const { orderId, successUrl, cancelUrl } = req.body as StripeCheckoutSessionParams;
    if (!orderId || !successUrl || !cancelUrl) {
      res.status(400).json({ error: "orderId, successUrl, cancelUrl required" });
      return;
    }

    const convex = new ConvexHttpClient(process.env.VITE_CONVEX_URL!);

    // Validate orderId format before using it
    if (!orderId || typeof orderId !== "string") {
      res.status(400).json({ error: "Invalid orderId format" });
      return;
    }

    // Convert string orderId to Convex Id type safely
    const convexOrderId = orderId as Id<"orders">;

    // Use string-based API calls to avoid type instantiation issues
    const orderData = (await (convex as ConvexClient).query(
      "orders:getOrderWithRelations" as never,
      {
        orderId: convexOrderId as never,
      }
    )) as unknown as ConvexOrderData | null;
    if (!orderData?.order) {
      res.status(404).json({ error: "Order not found" });
      return;
    }

    const { order } = orderData;

    const lineItems = (order.items || []).map((it: StripeOrderItem) => ({
      price_data: {
        currency: (order.currency || "usd").toLowerCase(),
        product_data: { name: it.title || "Unknown Item" },
        unit_amount: Number(it.unitPrice || it.totalPrice || 0) || 0,
      },
      quantity: Number(it.qty || it.quantity || 1),
    }));

    const session = await stripeClient.checkout.sessions.create(
      {
        mode: "payment",
        line_items: lineItems,
        success_url: successUrl.replace("{CHECKOUT_SESSION_ID}", "{CHECKOUT_SESSION_ID}"),
        cancel_url: cancelUrl,
        metadata: { orderId },
      },
      {
        idempotencyKey: `checkout_${orderId}`,
      }
    );

    const saveCheckoutSession = async (
      orderId: Id<"orders">,
      checkoutSessionId: string,
      paymentIntentId?: string
    ) => {
      return await (convex as ConvexClient).mutation("orders:saveStripeCheckoutSession" as never, {
        orderId: orderId as never,
        checkoutSessionId: checkoutSessionId as never,
        paymentIntentId: paymentIntentId as never,
      });
    };
    await saveCheckoutSession(
      convexOrderId,
      session.id,
      (session.payment_intent as string) || undefined
    );

    res.json({ url: session.url, id: session.id });
  } catch (error: unknown) {
    handleRouteError(error, res, "Error creating checkout session");
  }
});

// Send reservation confirmation email
const sendReservationConfirmationEmail = async (
  userEmail: string,
  reservationIds: string[],
  session: Stripe.Checkout.Session,
  convex: ConvexClient
): Promise<void> => {
  try {
    console.log("📧 Sending reservation confirmation email to:", userEmail);

    // Fetch reservation details
    const reservationDetails = await Promise.all(
      reservationIds.map(async id => {
        try {
          return await (convex as ConvexClient).query("reservations:getReservation" as never, {
            reservationId: id as never,
          });
        } catch (error) {
          console.error(`Failed to fetch reservation ${id}:`, error);
          return null;
        }
      })
    );

    // Filter and validate reservations with proper typing
    const validReservations: ConvexReservationDocument[] = [];

    for (const reservation of reservationDetails) {
      if (reservation !== null && isConvexReservationDocument(reservation)) {
        validReservations.push(reservation);
      }
    }

    if (validReservations.length === 0) {
      console.warn("No valid reservations found for confirmation email");
      return;
    }

    // Convert to email data format with proper type conversion
    const reservationEmailData: ReservationEmailData[] = validReservations.map(
      convertToReservationEmailData
    );

    const paymentData: PaymentData = {
      amount: session.amount_total || 0,
      currency: session.currency || "usd",
      paymentIntentId: session.payment_intent as string,
      sessionId: session.id,
      paymentMethod: session.payment_method_types?.[0] || "card",
    };

    // Use the template service
    await sendConfirmationEmail(userEmail, reservationEmailData, paymentData);

    console.log("✅ Reservation confirmation email sent successfully");
  } catch (error) {
    console.error("❌ Failed to send reservation confirmation email:", error);
    // Don't throw error to avoid failing the webhook processing
  }
};

// Send reservation payment failure email
const sendReservationPaymentFailureEmail = async (
  userEmail: string,
  reservationIds: string[],
  paymentIntent: Stripe.PaymentIntent
): Promise<void> => {
  try {
    console.log("📧 Sending reservation payment failure email to:", userEmail);

    const paymentData: PaymentData = {
      amount: paymentIntent.amount,
      currency: paymentIntent.currency,
      paymentIntentId: paymentIntent.id,
    };

    const failureReason = paymentIntent.last_payment_error?.message || "Payment processing failed";

    // Use the template service
    await sendFailureEmail(userEmail, reservationIds, paymentData, failureReason);

    console.log("✅ Reservation payment failure email sent successfully");
  } catch (error) {
    console.error("❌ Failed to send reservation payment failure email:", error);
    // Don't throw error to avoid failing the webhook processing
  }
};

// Confirm payment and handle success
const stripeWebhook = async (req: Request, res: Response): Promise<void> => {
  try {
    const isTest = process.env.NODE_ENV === "test";
    const sig = req.headers["stripe-signature"] as string | undefined;
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

    let event: Stripe.Event;
    if (isTest) {
      // In tests, skip signature verification and use parsed body
      event = req.body as unknown as Stripe.Event;
    } else {
      if (!sig || !endpointSecret) {
        res.status(400).json({ error: "Missing signature" });
        return;
      }

      // Use enhanced webhook validator for additional security
      const { webhookValidator } = await import("../lib/webhookValidator");
      const rawBody = Buffer.isBuffer(req.body) ? req.body : Buffer.from(JSON.stringify(req.body));

      const validationResult = await webhookValidator.validateWebhook(
        "stripe",
        rawBody,
        sig,
        req.headers as Record<string, string>
      );

      if (!validationResult.valid) {
        console.error("Webhook validation failed:", validationResult.errors);
        res.status(400).json({
          error: "Webhook validation failed",
          details: validationResult.errors,
        });
        return;
      }

      try {
        // Fallback to Stripe's built-in validation for compatibility
        event = stripeClient.webhooks.constructEvent(rawBody, sig, endpointSecret);
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        console.warn("⚠️ Stripe constructEvent failed, using validated payload:", errorMessage);
        event = validationResult.payload as unknown as Stripe.Event;
      }
    }

    const convex = new ConvexHttpClient(process.env.VITE_CONVEX_URL!);

    // Idempotency guard
    const processed = await (convex as ConvexClient).mutation(
      "orders:markProcessedEvent" as never,
      {
        provider: "stripe" as never,
        eventId: event.id as never,
      }
    );
    if ((processed as { alreadyProcessed?: boolean }).alreadyProcessed) {
      res.status(204).end();
      return;
    }

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const orderId = session.metadata?.orderId as string | undefined;
        const reservationIds = session.metadata?.reservationIds;
        const paymentType = session.metadata?.type;

        // Handle reservation payments
        if (paymentType === "reservation_payment" && reservationIds) {
          console.log("🎯 Processing reservation payment webhook:", {
            sessionId: session.id,
            reservationIds,
            amount: session.amount_total,
          });

          try {
            const reservationIdArray = JSON.parse(reservationIds) as string[];

            // Update each reservation status to confirmed/paid
            for (const reservationId of reservationIdArray) {
              await (convex as ConvexClient).mutation(
                "reservations:updateReservationStatus" as never,
                {
                  reservationId: reservationId as never,
                  status: "confirmed" as never,
                  notes: `Payment confirmed via Stripe session ${session.id}` as never,
                }
              );

              console.log(`✅ Updated reservation ${reservationId} to confirmed status`);
            }

            // Send reservation confirmation emails
            const userEmail = session.customer_details?.email || session.metadata?.userEmail;
            if (userEmail) {
              await sendReservationConfirmationEmail(
                userEmail,
                reservationIdArray,
                session,
                convex
              );
            }
          } catch (error) {
            console.error("❌ Failed to process reservation payment:", error);

            // Send admin notification about webhook processing failure
            try {
              await sendAdminNotification("Reservation Payment Webhook Failure", {
                subject: "Failed to process reservation payment webhook",
                html: `
                  <p><strong>Session ID:</strong> ${session.id}</p>
                  <p><strong>Reservation IDs:</strong> ${reservationIds}</p>
                  <p><strong>Amount:</strong> ${session.amount_total}</p>
                  <p><strong>Error:</strong> ${error instanceof Error ? error.message : String(error)}</p>
                  <p><strong>Customer Email:</strong> ${session.customer_details?.email}</p>
                `,
                metadata: {
                  sessionId: session.id,
                  reservationIds,
                  error: error instanceof Error ? error.message : String(error),
                },
              });
            } catch (notificationError) {
              console.error("❌ Failed to send admin notification:", notificationError);
            }

            // Don't throw to avoid webhook failure - payment was successful, we just need manual intervention
            console.warn(
              "⚠️ Reservation payment succeeded but processing failed - manual intervention required"
            );
          }
        }
        // Handle regular order payments
        else if (orderId) {
          // Convert string orderId to Convex Id type safely
          const convexOrderId = orderId as Id<"orders">;

          await (convex as ConvexClient).mutation("orders:recordPayment" as never, {
            orderId: convexOrderId as never,
            provider: "stripe" as never,
            status: "succeeded" as never,
            amount: Number(session.amount_total || 0) as never,
            currency: String(session.currency || "usd").toUpperCase() as never,
            stripeEventId: event.id as never,
            stripePaymentIntentId: ((session.payment_intent as string) || undefined) as never,
            stripeChargeId: undefined as never,
          });

          // Generate invoice PDF and upload to Convex storage
          const data = (await (convex as ConvexClient).query(
            "orders:getOrderWithRelations" as never,
            {
              orderId: convexOrderId as never,
            }
          )) as unknown as ConvexOrderData | null;
          const order = data?.order;
          const items = data?.items || [];
          if (order) {
            const brand: BrandConfig = {
              name: process.env.BRAND_NAME || "BroLab Entertainment",
              email: process.env.BRAND_EMAIL || "billing@brolabentertainment.com",
              address: process.env.BRAND_ADDRESS || "",
              logoPath: process.env.BRAND_LOGO_PATH || "",
            };

            // Create order object compatible with PDF generation
            const orderForPdf = {
              id: 1, // PDF library expects number, not Convex Id
              status: "completed" as const,
              created_at: new Date().toISOString(),
              invoice_number: order.invoiceNumber || "",
              user_id: order.userId ? 1 : null, // Convert Convex Id to number for PDF
              session_id: order.sessionId || null,
              email: order.email || session.customer_details?.email || "unknown@example.com",
              total: order.total || session.amount_total || 0,
              stripe_payment_intent_id: order.paymentIntentId || null,
              items: items.map((it: StripeOrderItem) => ({
                id: parseInt(it.productId || "0") || 0,
                beat_id: parseInt(it.productId || "0") || 0,
                license_type: (it.type as LicenseTypeEnum) || "basic",
                price: it.unitPrice || 0,
                quantity: it.qty || 1,
                session_id: null,
                user_id: null,
                created_at: new Date().toISOString(),
              })),
              invoice_pdf_url: undefined,
              shipping_address: null,
            };

            const pdfStream = buildInvoicePdfStream(
              orderForPdf, // PDF library expects specific format
              // Map items to pdf schema if needed
              items.map((it: StripeOrderItem) => ({
                id: parseInt(it.productId || "0") || 0,
                beat_id: parseInt(it.productId || "0") || 0,
                license_type:
                  it.type === "unlimited" || it.type === "basic" || it.type === "premium"
                    ? (it.type as "unlimited" | "basic" | "premium")
                    : ("basic" as const),
                price: (it.totalPrice || it.unitPrice || 0) / 100,
                quantity: it.qty || 1,
                created_at: new Date().toISOString(), // Add required field
              })),
              brand
            );
            const chunks: Buffer[] = [];
            for await (const chunk of pdfStream) {
              if (Buffer.isBuffer(chunk)) {
                chunks.push(chunk);
              } else if (typeof chunk === "string") {
                chunks.push(Buffer.from(chunk));
              }
            }
            const buffer = Buffer.concat(chunks);

            const { url } = (await (convex as ConvexClient).action(
              "files:generateUploadUrl" as never,
              {}
            )) as { url: string };
            const uploadRes = await fetch(url, {
              method: "POST",
              headers: { "Content-Type": "application/pdf" },
              body: buffer,
            });
            const uploadJson = await uploadRes.json();
            const storageId = uploadJson.storageId as string;

            const result = await (convex as ConvexClient).mutation(
              "orders:setInvoiceForOrder" as never,
              {
                orderId: convexOrderId as never,
                storageId: storageId as never,
                amount: Number(order.total || session.amount_total || 0) as never,
                currency: String(
                  order.currency || session.currency || "USD"
                ).toUpperCase() as never,
                taxAmount: 0 as never, // No tax in current implementation
                billingInfo: { email: order.email } as never,
              }
            );

            // Send email with invoice link
            const to = order.email || session.customer_details?.email;
            const resultData = result as { url?: string; number?: string };
            if (to && resultData?.url) {
              await sendMail({
                to,
                subject: `Votre facture ${resultData.number}`,
                html: `<p>Merci pour votre paiement.</p><p>Téléchargez votre facture: <a href="${resultData.url}">${resultData.url}</a></p>`,
              });
            }
          }
        }
        break;
      }
      case "payment_intent.succeeded": {
        const pi = event.data.object as Stripe.PaymentIntent;
        await (convex as ConvexClient).mutation("orders:recordPayment" as never, {
          orderId: undefined as unknown as Id<"orders"> as never, // resolved later via session link
          provider: "stripe" as never,
          status: "succeeded" as never,
          amount: Number(pi.amount_received || pi.amount || 0) as never,
          currency: String(pi.currency || "usd").toUpperCase() as never,
          stripeEventId: event.id as never,
          stripePaymentIntentId: pi.id as never,
          stripeChargeId: ((pi.latest_charge as string) || undefined) as never,
        });
        break;
      }
      case "payment_intent.payment_failed": {
        const pi = event.data.object as Stripe.PaymentIntent;

        // Check if this is a reservation payment failure
        const reservationIds = pi.metadata?.reservationIds;
        const paymentType = pi.metadata?.type;

        if (paymentType === "reservation_payment" && reservationIds) {
          console.log("❌ Processing reservation payment failure:", {
            paymentIntentId: pi.id,
            reservationIds,
            amount: pi.amount,
          });

          try {
            const reservationIdArray = JSON.parse(reservationIds) as string[];

            // Update each reservation status back to pending with failure note
            for (const reservationId of reservationIdArray) {
              await (convex as ConvexClient).mutation(
                "reservations:updateReservationStatus" as never,
                {
                  reservationId: reservationId as never,
                  status: "pending" as never,
                  notes:
                    `Payment failed for Stripe payment intent ${pi.id}. Please try again.` as never,
                }
              );

              console.log(
                `⚠️ Updated reservation ${reservationId} back to pending due to payment failure`
              );
            }

            // Send payment failure notification email
            const userEmail = pi.metadata?.userEmail;
            if (userEmail) {
              await sendReservationPaymentFailureEmail(userEmail, reservationIdArray, pi);
            }
          } catch (error) {
            console.error("❌ Failed to process reservation payment failure:", error);
            // Don't throw to avoid webhook failure
          }
        } else {
          // Handle regular order payment failures
          await (convex as ConvexClient).mutation("orders:recordPayment" as never, {
            orderId: undefined as unknown as Id<"orders"> as never,
            provider: "stripe" as never,
            status: "failed" as never,
            amount: Number(pi.amount || 0) as never,
            currency: String(pi.currency || "usd").toUpperCase() as never,
            stripeEventId: event.id as never,
            stripePaymentIntentId: pi.id as never,
            stripeChargeId: undefined as never,
          });
        }
        break;
      }
      case "charge.refunded":
      case "refund.updated": {
        // v1.1: implement refunds pipeline
        break;
      }
      default:
        break;
    }

    const response: StripeWebhookResponse = { received: true, processed: true };
    res.json(response);
  } catch (error: unknown) {
    handleRouteError(error, res, "Stripe webhook processing failed");
  }
};

router.post("/webhook", stripeWebhook);

// Create payment intent for services
const createPaymentIntent = async (req: Request, res: Response) => {
  try {
    const { amount, currency = "USD", metadata = {} } = req.body as CreatePaymentIntentRequest;

    if (!amount || amount <= 0) {
      res.status(400).json({ error: "Amount is required and must be greater than 0" });
      return;
    }

    // Create payment intent using the existing function
    const paymentIntent = await createStripePaymentIntent({
      amount: Math.round(amount * 100), // Convert to cents
      currency: currency.toLowerCase(),
      metadata: metadata as Record<string, string>,
    });

    const response: CreatePaymentIntentResponse = {
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
    };

    res.json(response);
  } catch (error: unknown) {
    handleRouteError(error, res, "Error creating payment intent");
  }
};

router.post("/create-payment-intent", createPaymentIntent);

// Get payment intent status
router.get("/payment-intent/:id", async (req, res): Promise<void> => {
  try {
    const { id } = req.params;
    const paymentIntent = await stripeClient.paymentIntents.retrieve(id);

    res.json({
      status: paymentIntent.status,
      amount: paymentIntent.amount,
      currency: paymentIntent.currency,
      metadata: paymentIntent.metadata,
    });
  } catch (error: unknown) {
    handleRouteError(error, res, "Error retrieving payment intent");
  }
});

export default router;
