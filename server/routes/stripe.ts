import { ConvexHttpClient } from "convex/browser";
import { Request, Response, Router } from "express";
import Stripe from "stripe";
import { api } from "../../convex/_generated/api.js";
import { Id } from "../../convex/_generated/dataModel";
import type { LicenseTypeEnum } from "../../shared/schema";
import type { ConvexReservationDocument } from "../../shared/types/ConvexReservation";
import {
  convertToReservationEmailData,
  isConvexReservationDocument,
} from "../../shared/types/ConvexReservation";
import { isStripeCheckoutSession, isStripePaymentIntent } from "../../shared/types/StripeWebhook";
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
import type { StripeOrderItem } from "../types/routes";
import { handleRouteError } from "../types/routes";

// Type alias for Convex client
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
const stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY, {
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

    // Validate and convert orderId to Convex Id type
    if (typeof orderId !== "string") {
      res.status(400).json({ error: "Invalid orderId format" });
      return;
    }
    const convexOrderId = orderId as Id<"orders">;

    // Use proper Convex API with type safety
    const orderData = await convex.query(api.orders.getOrderWithRelations, {
      orderId: convexOrderId,
    });
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
      return await convex.mutation(api.orders.saveStripeCheckoutSession, {
        orderId,
        checkoutSessionId,
        paymentIntentId,
      });
    };
    await saveCheckoutSession(
      convexOrderId,
      session.id,
      typeof session.payment_intent === "string" ? session.payment_intent : undefined
    );

    res.json({ url: session.url, id: session.id });
  } catch (error: unknown) {
    handleRouteError(error, res, "Error creating checkout session");
  }
});

// Handle payment intent failure for reservations and orders
const handlePaymentIntentFailed = async (
  pi: Stripe.PaymentIntent,
  convex: ConvexClient,
  eventId: string
): Promise<void> => {
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
      // Parse reservation IDs with proper error handling
      let reservationIdArray: string[];
      try {
        reservationIdArray = JSON.parse(reservationIds);
        if (!Array.isArray(reservationIdArray)) {
          throw new Error("Reservation IDs must be an array");
        }
      } catch (parseError) {
        console.error("❌ Failed to parse reservation IDs in payment failure:", parseError);
        return; // Skip processing if we can't parse the IDs
      }

      // Update each reservation status back to pending with failure note
      const updatePromises = reservationIdArray.map(async reservationId => {
        try {
          // Validate reservation exists before updating
          const reservationIdTyped: Id<"reservations"> = reservationId as Id<"reservations">;
          const reservation = await convex.query(api.reservations.listReservations.getReservation, {
            reservationId: reservationIdTyped,
          });

          if (!reservation) {
            console.error(
              `❌ Reservation ${reservationId} not found during payment failure processing`
            );
            return { reservationId, success: false, error: "Reservation not found" };
          }

          await convex.mutation(api.reservations.updateReservationStatus.updateReservationStatus, {
            reservationId: reservationIdTyped,
            status: "pending",
            notes: `Payment failed for Stripe payment intent ${pi.id}. Please try again.`,
            skipEmailNotification: true, // We'll send our own failure email
          });

          console.log(
            `⚠️ Updated reservation ${reservationId} back to pending due to payment failure`
          );
          return { reservationId, success: true };
        } catch (error) {
          console.error(
            `❌ Failed to update reservation ${reservationId} after payment failure:`,
            error
          );
          return {
            reservationId,
            success: false,
            error: error instanceof Error ? error.message : String(error),
          };
        }
      });

      const updateResults = await Promise.all(updatePromises);
      const failedUpdates = updateResults.filter(result => !result.success);

      if (failedUpdates.length > 0) {
        console.error("❌ Some reservation failure updates failed:", failedUpdates);
      }

      // Send payment failure notification email
      const userEmail = pi.metadata?.userEmail;
      if (userEmail) {
        const successfulReservationIds = updateResults
          .filter(result => result.success)
          .map(result => result.reservationId);

        if (successfulReservationIds.length > 0) {
          await sendReservationPaymentFailureEmail(userEmail, successfulReservationIds, pi);
        }
      }
    } catch (error) {
      console.error("❌ Failed to process reservation payment failure:", error);
      // Don't throw to avoid webhook failure
    }
  } else {
    // Handle regular order payment failures - orderId will be resolved later via session link
    // Use a placeholder ID for API compatibility - will be resolved later via session link
    const nullOrderId = "" as Id<"orders">;
    await convex.mutation(api.orders.recordPayment, {
      orderId: nullOrderId,
      provider: "stripe",
      status: "failed",
      amount: Number(pi.amount || 0),
      currency: String(pi.currency || "usd").toUpperCase(),
      stripeEventId: eventId,
      stripePaymentIntentId: pi.id,
      stripeChargeId: undefined,
    });
  }
};

// Handle checkout completion for reservations
const handleCheckoutCompleted = async (
  session: Stripe.Checkout.Session,
  convex: ConvexClient
): Promise<void> => {
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
      // Parse reservation IDs with proper error handling
      let reservationIdArray: string[];
      try {
        reservationIdArray = JSON.parse(reservationIds);
        if (!Array.isArray(reservationIdArray)) {
          throw new Error("Reservation IDs must be an array");
        }
      } catch (parseError) {
        console.error("❌ Failed to parse reservation IDs:", parseError);
        throw new Error(
          `Invalid reservation IDs format: ${parseError instanceof Error ? parseError.message : String(parseError)}`
        );
      }

      // Update each reservation status to confirmed/paid
      const updatePromises = reservationIdArray.map(async reservationId => {
        try {
          // Validate reservation exists before updating
          const reservationIdTyped: Id<"reservations"> = reservationId as Id<"reservations">;
          const reservation = await convex.query(api.reservations.listReservations.getReservation, {
            reservationId: reservationIdTyped,
          });

          if (!reservation) {
            console.error(`❌ Reservation ${reservationId} not found`);
            return { reservationId, success: false, error: "Reservation not found" };
          }

          await convex.mutation(api.reservations.updateReservationStatus.updateReservationStatus, {
            reservationId: reservationIdTyped,
            status: "confirmed",
            notes: `Payment confirmed via Stripe session ${session.id}`,
            skipEmailNotification: true, // We'll send our own confirmation email
          });

          console.log(`✅ Updated reservation ${reservationId} to confirmed status`);
          return { reservationId, success: true };
        } catch (error) {
          console.error(`❌ Failed to update reservation ${reservationId}:`, error);
          return {
            reservationId,
            success: false,
            error: error instanceof Error ? error.message : String(error),
          };
        }
      });

      const updateResults = await Promise.all(updatePromises);
      const failedUpdates = updateResults.filter(result => !result.success);

      if (failedUpdates.length > 0) {
        console.error("❌ Some reservation updates failed:", failedUpdates);
        // Continue with email sending for successful updates
      }

      // Send reservation confirmation emails
      const userEmail = session.customer_details?.email || session.metadata?.userEmail;
      if (userEmail) {
        const successfulReservationIds = updateResults
          .filter(result => result.success)
          .map(result => result.reservationId);

        if (successfulReservationIds.length > 0) {
          await sendReservationConfirmationEmail(
            userEmail,
            successfulReservationIds,
            session,
            convex
          );
        }
      }

      // If any updates failed, send admin notification
      if (failedUpdates.length > 0) {
        await sendAdminNotification("Partial Reservation Payment Processing Failure", {
          subject: "Some reservations failed to update after successful payment",
          html: `
            <p><strong>Session ID:</strong> ${session.id}</p>
            <p><strong>Failed Reservations:</strong> ${failedUpdates.map(f => `${f.reservationId} (${f.error})`).join(", ")}</p>
            <p><strong>Successful Reservations:</strong> ${updateResults.filter(r => r.success).length}</p>
            <p><strong>Amount:</strong> ${session.amount_total}</p>
            <p><strong>Customer Email:</strong> ${session.customer_details?.email}</p>
          `,
          metadata: {
            sessionId: session.id,
            failedReservations: failedUpdates,
            successfulCount: updateResults.filter(r => r.success).length,
          },
        });
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
};

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
          const reservationIdTyped: Id<"reservations"> = id as Id<"reservations">;
          return await convex.query(api.reservations.listReservations.getReservation, {
            reservationId: reservationIdTyped,
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
      paymentIntentId: typeof session.payment_intent === "string" ? session.payment_intent : "",
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

// Webhook validation utilities
const validateWebhookSignature = async (
  req: Request,
  isTest: boolean
): Promise<{ event: Stripe.Event; error?: string }> => {
  if (isTest) {
    if (req.body && typeof req.body === "object") {
      return { event: req.body as Stripe.Event };
    } else {
      return { event: {} as Stripe.Event, error: "Invalid test webhook body" };
    }
  }

  const sig = req.headers["stripe-signature"];
  const sigString = typeof sig === "string" ? sig : undefined;
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!sigString || !endpointSecret) {
    return { event: {} as Stripe.Event, error: "Missing signature" };
  }

  // Use enhanced webhook validator for additional security
  const { webhookValidator } = await import("../lib/webhookValidator");
  const rawBody = Buffer.isBuffer(req.body) ? req.body : Buffer.from(JSON.stringify(req.body));

  const validationResult = await webhookValidator.validateWebhook(
    "stripe",
    rawBody,
    sigString,
    req.headers as Record<string, string>
  );

  if (!validationResult.valid) {
    return {
      event: {} as Stripe.Event,
      error: `Webhook validation failed: ${validationResult.errors?.join(", ")}`,
    };
  }

  try {
    // Fallback to Stripe's built-in validation for compatibility
    const event = stripeClient.webhooks.constructEvent(rawBody, sigString, endpointSecret);
    return { event };
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    console.warn("⚠️ Stripe constructEvent failed, using validated payload:", errorMessage);

    if (validationResult.payload && typeof validationResult.payload === "object") {
      return { event: validationResult.payload as unknown as Stripe.Event };
    } else {
      return { event: {} as Stripe.Event, error: "Invalid webhook payload structure" };
    }
  }
};

// Invoice generation utilities
const generateInvoicePdf = async (
  order: any,
  items: StripeOrderItem[],
  session: Stripe.Checkout.Session,
  convex: ConvexClient,
  convexOrderId: Id<"orders">
): Promise<void> => {
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
      license_type: it.type && typeof it.type === "string" ? (it.type as LicenseTypeEnum) : "basic",
      price: it.unitPrice || 0,
      quantity: it.qty || 1,
      session_id: null,
      user_id: null,
      created_at: new Date().toISOString(),
    })),
    invoice_pdf_url: undefined,
    shipping_address: null,
  };

  const pdfItems = items.map((it: StripeOrderItem) => {
    const validLicenseTypes = ["unlimited", "basic", "premium"] as const;
    const licenseType =
      it.type && validLicenseTypes.includes(it.type as unknown)
        ? (it.type as "unlimited" | "basic" | "premium")
        : ("basic" as const);

    return {
      id: parseInt(it.productId || "0") || 0,
      beat_id: parseInt(it.productId || "0") || 0,
      license_type: licenseType,
      price: (it.totalPrice || it.unitPrice || 0) / 100,
      quantity: it.qty || 1,
      created_at: new Date().toISOString(),
    };
  });

  const pdfStream = buildInvoicePdfStream(orderForPdf, pdfItems, brand);
  const chunks: Buffer[] = [];

  for await (const chunk of pdfStream) {
    if (Buffer.isBuffer(chunk)) {
      chunks.push(chunk);
    } else if (typeof chunk === "string") {
      chunks.push(Buffer.from(chunk));
    }
  }

  const buffer = Buffer.concat(chunks);

  const { url } = (await convex.action(api.files.generateUploadUrl, {})) as { url: string };
  const uploadRes = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/pdf" },
    body: buffer,
  });

  const uploadJson = await uploadRes.json();
  const storageId = uploadJson.storageId;

  if (typeof storageId !== "string") {
    throw new Error("Invalid storage ID returned from upload");
  }

  const result = await convex.mutation(api.orders.setInvoiceForOrder, {
    orderId: convexOrderId,
    storageId: storageId,
    amount: Number(order.total || session.amount_total || 0),
    currency: String(order.currency || session.currency || "USD").toUpperCase(),
    taxAmount: 0, // No tax in current implementation
    billingInfo: { email: order.email },
  });

  // Send email with invoice link
  const to = order.email || session.customer_details?.email;
  const resultData =
    result && typeof result === "object" ? (result as { url?: string; number?: string }) : null;

  if (to && resultData?.url) {
    await sendMail({
      to,
      subject: `Votre facture ${resultData.number}`,
      html: `<p>Merci pour votre paiement.</p><p>Téléchargez votre facture: <a href="${resultData.url}">${resultData.url}</a></p>`,
    });
  }
};

// Handle checkout session completed event
const handleCheckoutSessionCompleted = async (
  session: Stripe.Checkout.Session,
  convex: ConvexClient,
  eventId: string
): Promise<void> => {
  const orderId = session.metadata?.orderId;

  // Handle checkout completion (reservations and orders)
  await handleCheckoutCompleted(session, convex);

  // Handle regular order payments
  if (orderId && typeof orderId === "string") {
    const convexOrderId = orderId as Id<"orders">;

    await convex.mutation(api.orders.recordPayment, {
      orderId: convexOrderId,
      provider: "stripe",
      status: "succeeded",
      amount: Number(session.amount_total || 0),
      currency: String(session.currency || "usd").toUpperCase(),
      stripeEventId: eventId,
      stripePaymentIntentId:
        typeof session.payment_intent === "string" ? session.payment_intent : undefined,
      stripeChargeId: undefined,
    });

    // Generate invoice PDF and upload to Convex storage
    const data = await convex.query(api.orders.getOrderWithRelations, {
      orderId: convexOrderId,
    });

    const order = data?.order;
    const items = data?.items || [];

    if (order) {
      await generateInvoicePdf(order, items, session, convex, convexOrderId);
    }
  }
};

// Handle payment intent succeeded event
const handlePaymentIntentSucceeded = async (
  pi: Stripe.PaymentIntent,
  convex: ConvexClient,
  eventId: string
): Promise<void> => {
  const nullOrderId = "" as Id<"orders">;

  await convex.mutation(api.orders.recordPayment, {
    orderId: nullOrderId,
    provider: "stripe",
    status: "succeeded",
    amount: Number(pi.amount_received || pi.amount || 0),
    currency: String(pi.currency || "usd").toUpperCase(),
    stripeEventId: eventId,
    stripePaymentIntentId: pi.id,
    stripeChargeId: typeof pi.latest_charge === "string" ? pi.latest_charge : undefined,
  });
};

// Main webhook handler with reduced complexity
const stripeWebhook = async (req: Request, res: Response): Promise<void> => {
  try {
    const isTest = process.env.NODE_ENV === "test";

    // Validate webhook signature and extract event
    const { event, error } = await validateWebhookSignature(req, isTest);
    if (error) {
      res.status(400).json({ error });
      return;
    }

    const convex = new ConvexHttpClient(process.env.VITE_CONVEX_URL!);

    // Idempotency guard
    const processed = await convex.mutation(api.orders.markProcessedEvent, {
      provider: "stripe",
      eventId: event.id,
    });

    if ((processed as { alreadyProcessed?: boolean }).alreadyProcessed) {
      res.status(204).end();
      return;
    }

    // Process different event types
    switch (event.type) {
      case "checkout.session.completed": {
        if (!isStripeCheckoutSession(event.data.object)) {
          console.error("Invalid checkout session data in webhook");
          res.status(400).json({ error: "Invalid checkout session data" });
          return;
        }
        await handleCheckoutSessionCompleted(event.data.object, convex, event.id);
        break;
      }

      case "payment_intent.succeeded": {
        if (!isStripePaymentIntent(event.data.object)) {
          console.error("Invalid payment intent data in webhook");
          res.status(400).json({ error: "Invalid payment intent data" });
          return;
        }
        await handlePaymentIntentSucceeded(event.data.object, convex, event.id);
        break;
      }

      case "payment_intent.payment_failed": {
        if (!isStripePaymentIntent(event.data.object)) {
          console.error("Invalid payment intent data in webhook");
          res.status(400).json({ error: "Invalid payment intent data" });
          return;
        }
        await handlePaymentIntentFailed(event.data.object, convex, event.id);
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
