import { Router } from "express";
import Stripe from "stripe";
import { getSubscriptionId } from "../../shared/types/StripeWebhook";
import { urls } from "../config/urls";
import { handleRouteError } from "../types/routes";

// Enhanced logging utility for payment flows
const logPaymentEvent = (
  level: "info" | "warn" | "error",
  event: string,
  data: Record<string, unknown>
) => {
  const timestamp = new Date().toISOString();
  const logData = {
    timestamp,
    event,
    level,
    ...data,
  };

  if (level === "error") {
    console.error(`🚨 [PAYMENT-ERROR] ${event}:`, logData);
  } else if (level === "warn") {
    console.warn(`⚠️ [PAYMENT-WARN] ${event}:`, logData);
  } else {
    console.log(`ℹ️ [PAYMENT-INFO] ${event}:`, logData);
  }
};

// Structured error response utility
const createErrorResponse = (
  error: string,
  message: string,
  field?: string,
  code?: string,
  details?: Record<string, unknown>
) => {
  return {
    error,
    message,
    ...(field && { field }),
    ...(code && { code }),
    ...(details && { details }),
    timestamp: new Date().toISOString(),
  };
};

const router = Router();

// Initialize Stripe with ES modules syntax
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  // Using default API version for compatibility
});

// Health check route
router.get("/health", (req, res): void => {
  logPaymentEvent("info", "health_check", {
    userAgent: req.headers["user-agent"],
    ip: req.ip,
  });

  res.json({
    status: "ok",
    clerk: "initialized",
    stripe: "connected",
    timestamp: new Date().toISOString(),
  });
});

// Create checkout session for one-time purchases
router.post("/create-checkout-session", async (req, res): Promise<void> => {
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;

  try {
    logPaymentEvent("info", "checkout_session_request", {
      requestId,
      userAgent: req.headers["user-agent"],
      ip: req.ip,
      bodyKeys: Object.keys(req.body),
    });

    const {
      amount,
      currency = "usd",
      metadata = {},
      reservationIds = [],
      cartItems = [],
      services = [],
    } = req.body;

    logPaymentEvent("info", "payment_data_received", {
      requestId,
      amount,
      currency,
      hasMetadata: !!metadata,
      userId: metadata.userId,
      userEmail: metadata.userEmail ? "***@***.***" : undefined, // Mask email for privacy
      reservationCount: reservationIds?.length || 0,
      cartItemCount: cartItems?.length || 0,
      serviceCount: services?.length || 0,
    });

    // Validate required parameters with detailed logging
    if (!amount || amount <= 0) {
      const errorResponse = createErrorResponse(
        "Validation Error",
        "Valid amount is required. Amount must be greater than 0.",
        "amount"
      );

      logPaymentEvent("warn", "validation_failed", {
        requestId,
        field: "amount",
        providedValue: amount,
        reason: "invalid_amount",
      });

      res.status(400).json(errorResponse);
      return;
    }

    if (!metadata.userId || !metadata.userEmail) {
      const errorResponse = createErrorResponse(
        "Validation Error",
        "User authentication is required. Please ensure you are logged in.",
        "metadata",
        "missing_user_data"
      );

      logPaymentEvent("warn", "validation_failed", {
        requestId,
        field: "metadata",
        hasUserId: !!metadata.userId,
        hasUserEmail: !!metadata.userEmail,
        reason: "missing_user_authentication",
      });

      res.status(400).json(errorResponse);
      return;
    }

    // Validate currency
    if (!["usd", "eur", "gbp"].includes(currency.toLowerCase())) {
      const errorResponse = createErrorResponse(
        "Validation Error",
        "Unsupported currency. Supported currencies: USD, EUR, GBP",
        "currency",
        "unsupported_currency",
        { supportedCurrencies: ["USD", "EUR", "GBP"] }
      );

      logPaymentEvent("warn", "validation_failed", {
        requestId,
        field: "currency",
        providedValue: currency,
        reason: "unsupported_currency",
      });

      res.status(400).json(errorResponse);
      return;
    }

    // Determine payment type based on content
    let paymentType = "beats_only";
    if (reservationIds.length > 0 && cartItems.length > 0) {
      paymentType = "mixed_cart";
    } else if (reservationIds.length > 0 || services.length > 0) {
      paymentType = "reservation_payment";
    }

    // Build line items for Stripe checkout
    const lineItems = [];

    // Add service/reservation items
    if (services && services.length > 0) {
      for (const service of services) {
        lineItems.push({
          price_data: {
            currency: currency.toLowerCase(),
            product_data: {
              name: `${service.service_type} Service`,
              description: `${service.service_type} - ${service.duration_minutes} minutes`,
              metadata: {
                service_type: service.service_type,
                reservation_id: service.reservation_id || "",
                duration_minutes: service.duration_minutes?.toString() || "",
              },
            },
            unit_amount: Math.round(service.price * 100), // Convert to cents
          },
          quantity: 1,
        });
      }
    }

    // Add cart items (beats)
    if (cartItems && cartItems.length > 0) {
      for (const item of cartItems) {
        lineItems.push({
          price_data: {
            currency: currency.toLowerCase(),
            product_data: {
              name: item.title || `Beat #${item.beat_id}`,
              description: `${item.license_type} License`,
              metadata: {
                beat_id: item.beat_id?.toString() || "",
                license_type: item.license_type || "",
              },
            },
            unit_amount: Math.round(item.price * 100), // Convert to cents
          },
          quantity: item.quantity || 1,
        });
      }
    }

    // Fallback single line item if no specific items provided
    if (lineItems.length === 0) {
      lineItems.push({
        price_data: {
          currency: currency.toLowerCase(),
          product_data: {
            name: metadata.description || "BroLab Purchase",
            description: `Purchase: ${metadata.description || "Beats and Services"}`,
          },
          unit_amount: amount, // Already in cents
        },
        quantity: 1,
      });
    }

    // Enhanced metadata for reservation payments
    const enhancedMetadata = {
      userId: metadata.userId,
      userEmail: metadata.userEmail,
      type: paymentType,
      reservationIds: reservationIds.join(","),
      servicesCount: services?.length?.toString() || "0",
      servicesTotal:
        services
          ?.reduce((sum: number, s: { price?: number }) => sum + (s.price || 0), 0)
          ?.toString() || "0",
      cartCount: cartItems?.length?.toString() || "0",
      cartTotal:
        cartItems
          ?.reduce(
            (sum: number, item: { price?: number; quantity?: number }) =>
              sum + (item.price || 0) * (item.quantity || 1),
            0
          )
          ?.toString() || "0",
      orderTotal: (amount / 100).toString(), // Convert cents to dollars for metadata
      description: metadata.description || `${paymentType.replace("_", " ")} payment`,
      ...metadata, // Include any additional metadata
    };

    logPaymentEvent("info", "stripe_session_creation_start", {
      requestId,
      paymentType,
      lineItemCount: lineItems.length,
      totalAmount: amount,
      currency: currency.toLowerCase(),
    });

    try {
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        line_items: lineItems,
        mode: "payment",
        success_url: urls.checkoutSuccess("{CHECKOUT_SESSION_ID}"),
        cancel_url: urls.cart,
        metadata: enhancedMetadata,
        customer_email: metadata.userEmail,
        // Add client reference ID for easier tracking
        client_reference_id: metadata.userId,
      });

      logPaymentEvent("info", "stripe_session_created", {
        requestId,
        sessionId: session.id,
        paymentType,
        reservationCount: reservationIds.length,
        cartItemCount: cartItems?.length || 0,
        serviceCount: services?.length || 0,
        totalAmount: amount,
        currency: currency.toLowerCase(),
        expiresAt: session.expires_at,
      });

      res.json({
        success: true,
        url: session.url,
        sessionId: session.id,
        paymentType,
        metadata: enhancedMetadata,
        expiresAt: session.expires_at,
      });
    } catch (stripeError: unknown) {
      logPaymentEvent("error", "stripe_session_creation_failed", {
        requestId,
        errorType: stripeError instanceof Stripe.errors.StripeError ? stripeError.type : "unknown",
        errorCode: stripeError instanceof Stripe.errors.StripeError ? stripeError.code : "unknown",
        errorMessage: stripeError instanceof Error ? stripeError.message : String(stripeError),
      });

      // Handle specific Stripe errors with detailed responses
      if (stripeError instanceof Stripe.errors.StripeError) {
        const errorResponse = createErrorResponse(
          "Payment Error",
          stripeError.message || "Failed to create checkout session",
          undefined,
          stripeError.type,
          {
            stripeCode: stripeError.code,
            requestId,
            retryable: ["rate_limit_error", "api_connection_error"].includes(stripeError.type),
          }
        );

        res.status(400).json(errorResponse);
        return;
      }

      // Handle unexpected errors
      const errorResponse = createErrorResponse(
        "Internal Error",
        "An unexpected error occurred while processing your payment",
        undefined,
        "internal_error",
        { requestId }
      );

      res.status(500).json(errorResponse);
      return;
    }
  } catch (error: unknown) {
    logPaymentEvent("error", "checkout_session_unexpected_error", {
      requestId,
      errorMessage: error instanceof Error ? error.message : String(error),
      errorStack: error instanceof Error ? error.stack : undefined,
    });

    handleRouteError(error, res, "Failed to create checkout session");
  }
});

// Get checkout session status
router.get("/checkout-session/:id", async (req, res): Promise<void> => {
  const requestId = `get_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;

  try {
    const { id } = req.params;

    if (!id || typeof id !== "string") {
      const errorResponse = createErrorResponse(
        "Validation Error",
        "Valid session ID is required",
        "id"
      );

      logPaymentEvent("warn", "session_retrieval_invalid_id", {
        requestId,
        providedId: id,
      });

      res.status(400).json(errorResponse);
      return;
    }

    logPaymentEvent("info", "session_retrieval_start", {
      requestId,
      sessionId: id,
    });

    const session = await stripe.checkout.sessions.retrieve(id);

    logPaymentEvent("info", "session_retrieved", {
      requestId,
      sessionId: session.id,
      status: session.status,
      amount: session.amount_total,
      currency: session.currency,
      paymentType: session.metadata?.type || "unknown",
    });

    res.json({
      success: true,
      id: session.id,
      status: session.status,
      amount: session.amount_total,
      currency: session.currency,
      metadata: session.metadata,
      customerEmail: session.customer_email,
      createdAt: session.created * 1000, // Convert to milliseconds
      expiresAt: session.expires_at * 1000, // Convert to milliseconds
    });
  } catch (error: unknown) {
    logPaymentEvent("error", "session_retrieval_failed", {
      requestId,
      sessionId: req.params.id,
      errorMessage: error instanceof Error ? error.message : String(error),
    });

    if (error instanceof Stripe.errors.StripeInvalidRequestError) {
      const errorResponse = createErrorResponse(
        "Not Found",
        "Checkout session not found",
        "id",
        "session_not_found"
      );

      res.status(404).json(errorResponse);
      return;
    }

    handleRouteError(error, res, "Failed to retrieve checkout session");
  }
});

// Handle Stripe webhooks for payment events
router.post("/webhooks", async (req, res): Promise<void> => {
  const webhookId = `webhook_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;

  try {
    const sig = req.headers["stripe-signature"];
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

    logPaymentEvent("info", "webhook_received", {
      webhookId,
      hasSignature: !!sig,
      hasSecret: !!endpointSecret,
      userAgent: req.headers["user-agent"],
      ip: req.ip,
    });

    if (!sig || !endpointSecret) {
      const errorResponse = createErrorResponse(
        "Webhook Error",
        "Missing webhook signature or secret",
        undefined,
        "missing_webhook_auth"
      );

      logPaymentEvent("error", "webhook_auth_missing", {
        webhookId,
        hasSignature: !!sig,
        hasSecret: !!endpointSecret,
      });

      res.status(400).json(errorResponse);
      return;
    }

    let event;

    try {
      event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);

      logPaymentEvent("error", "webhook_signature_verification_failed", {
        webhookId,
        errorMessage,
        signatureLength: typeof sig === "string" ? sig.length : 0,
      });

      const errorResponse = createErrorResponse(
        "Webhook Error",
        "Webhook signature verification failed",
        undefined,
        "invalid_signature",
        { webhookId }
      );

      res.status(400).json(errorResponse);
      return;
    }

    logPaymentEvent("info", "webhook_verified", {
      webhookId,
      eventType: event.type,
      eventId: event.id,
      created: event.created,
    });

    try {
      switch (event.type) {
        case "checkout.session.completed":
          await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session, webhookId);
          break;

        case "checkout.session.expired":
          await handleCheckoutExpired(event.data.object as Stripe.Checkout.Session, webhookId);
          break;

        case "invoice.payment_succeeded":
          await handleInvoicePaymentSucceeded(event.data.object as Stripe.Invoice, webhookId);
          break;

        case "invoice.payment_failed":
          await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice, webhookId);
          break;

        default:
          logPaymentEvent("info", "webhook_unhandled_event", {
            webhookId,
            eventType: event.type,
            eventId: event.id,
          });
      }

      logPaymentEvent("info", "webhook_processed", {
        webhookId,
        eventType: event.type,
        eventId: event.id,
      });

      res.json({
        received: true,
        webhookId,
        eventType: event.type,
        processed: true,
      });
    } catch (processingError: unknown) {
      logPaymentEvent("error", "webhook_processing_failed", {
        webhookId,
        eventType: event.type,
        eventId: event.id,
        errorMessage:
          processingError instanceof Error ? processingError.message : String(processingError),
      });

      // Still return 200 to prevent Stripe retries for processing errors
      res.json({
        received: true,
        webhookId,
        eventType: event.type,
        processed: false,
        error: "Processing failed",
      });
    }
  } catch (error: unknown) {
    logPaymentEvent("error", "webhook_unexpected_error", {
      webhookId,
      errorMessage: error instanceof Error ? error.message : String(error),
    });

    handleRouteError(error, res, "Webhook processing failed");
  }
});

// Webhook handlers with enhanced logging
async function handleCheckoutCompleted(data: Stripe.Checkout.Session, webhookId: string) {
  logPaymentEvent("info", "checkout_completed", {
    webhookId,
    sessionId: data.id,
    amount: data.amount_total,
    currency: data.currency,
    customerEmail: data.customer_email,
    paymentType: data.metadata?.type || "unknown",
    reservationIds: data.metadata?.reservationIds || "",
    userId: data.metadata?.userId,
  });

  // TODO: Implement reservation status updates
  // - Update reservation status to "confirmed" or "paid"
  // - Send confirmation emails
  // - Grant access to purchased content
  // - Update user download quotas if applicable
}

async function handleCheckoutExpired(data: Stripe.Checkout.Session, webhookId: string) {
  logPaymentEvent("warn", "checkout_expired", {
    webhookId,
    sessionId: data.id,
    amount: data.amount_total,
    currency: data.currency,
    paymentType: data.metadata?.type || "unknown",
    reservationIds: data.metadata?.reservationIds || "",
    userId: data.metadata?.userId,
  });

  // TODO: Handle expired checkout sessions
  // - Clean up pending reservations if needed
  // - Send expiration notifications
}

async function handleInvoicePaymentSucceeded(data: Stripe.Invoice, webhookId: string) {
  logPaymentEvent("info", "invoice_payment_succeeded", {
    webhookId,
    invoiceId: data.id,
    amount: data.amount_paid,
    currency: data.currency,
    customerEmail: data.customer_email,
    subscriptionId: (data as unknown).subscription || null,
  });

  // TODO: Handle successful subscription payments
  // - Update subscription status
  // - Renew download quotas
}

async function handleInvoicePaymentFailed(data: Stripe.Invoice, webhookId: string) {
  logPaymentEvent("error", "invoice_payment_failed", {
    webhookId,
    invoiceId: data.id,
    amount: data.amount_due,
    currency: data.currency,
    customerEmail: data.customer_email,
    subscriptionId: getSubscriptionId(data),
    attemptCount: data.attempt_count,
  });

  // TODO: Handle failed subscription payments
  // - Send payment failure notifications
  // - Suspend services if needed
}

export default router;
