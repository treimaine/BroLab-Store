import { ConvexHttpClient } from "convex/browser";
import { Request, Response, Router } from "express";
import Stripe from "stripe";
import { Id } from "../../convex/_generated/dataModel";
import { LicenseType } from "../../shared/types/Beat";
import type {
  CreatePaymentIntentRequest,
  CreatePaymentIntentResponse,
  StripeWebhookResponse,
} from "../../shared/types/apiEndpoints";
import { BrandConfig, buildInvoicePdfStream } from "../lib/pdf";
import { sendMail } from "../services/mail";
import type { ConvexOrderData } from "../types/stripe";

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

    const lineItems = (order.items || []).map((it: any) => ({
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
    console.error("❌ Error creating checkout session:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    res.status(500).json({ error: "Error creating checkout session", message: errorMessage });
  }
});

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
        event = validationResult.payload as Stripe.Event;
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
        if (orderId) {
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
              email: order.email,
              total: order.total,
              stripe_payment_intent_id: order.paymentIntentId || null,
              items: items.map(it => ({
                id: it.productId,
                beat_id: it.productId,
                license_type: it.type as LicenseType,
                price: it.unitPrice,
                quantity: it.qty,
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
              items.map(it => ({
                id: it.productId,
                beat_id: it.productId,
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
    console.error("Stripe webhook error:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    res.status(400).json({ error: `Webhook Error: ${errorMessage}` });
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
    console.error("Error creating payment intent:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    res.status(500).json({
      error: "Error creating payment intent",
      message: errorMessage,
    });
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
    console.error("Error retrieving payment intent:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    res.status(500).json({
      error: "Error retrieving payment intent",
      message: errorMessage,
    });
  }
});

export default router;
