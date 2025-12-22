import { Response, Router } from "express";
import Stripe from "stripe";
import { centsToDollars } from "../../shared/utils/currency";
import { urls } from "../config/urls";
import { handleRouteError } from "../types/routes";
import { generateSecureRequestId } from "../utils/requestId";

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

// Type definitions for helper functions
interface CheckoutMetadata {
  userId: string;
  userEmail: string;
  description?: string;
  [key: string]: string | undefined;
}

interface ServiceItem {
  service_type: string;
  duration_minutes: number;
  price: number;
  reservation_id?: string;
}

interface CartItem {
  beat_id: number | string;
  title?: string;
  license_type: string;
  price: number;
  quantity?: number;
}

// Validation helper functions
const validateAmount = (amount: number, requestId: string, res: Response): boolean => {
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
    return false;
  }
  return true;
};

const validateUserMetadata = (
  metadata: CheckoutMetadata,
  requestId: string,
  res: Response
): boolean => {
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
    return false;
  }
  return true;
};

const validateCurrency = (currency: string, requestId: string, res: Response): boolean => {
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
    return false;
  }
  return true;
};

// Line items builder functions
const buildServiceLineItems = (
  services: ServiceItem[],
  currency: string
): Stripe.Checkout.SessionCreateParams.LineItem[] => {
  return services.map(service => ({
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
      unit_amount: Math.round(service.price * 100),
    },
    quantity: 1,
  }));
};

const buildCartLineItems = (
  cartItems: CartItem[],
  currency: string
): Stripe.Checkout.SessionCreateParams.LineItem[] => {
  return cartItems.map(item => ({
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
      unit_amount: Math.round(item.price * 100),
    },
    quantity: item.quantity || 1,
  }));
};

const buildFallbackLineItem = (
  amount: number,
  currency: string,
  metadata: CheckoutMetadata
): Stripe.Checkout.SessionCreateParams.LineItem => {
  return {
    price_data: {
      currency: currency.toLowerCase(),
      product_data: {
        name: metadata.description || "BroLab Purchase",
        description: `Purchase: ${metadata.description || "Beats and Services"}`,
      },
      unit_amount: amount,
    },
    quantity: 1,
  };
};

const buildLineItems = (
  services: ServiceItem[],
  cartItems: CartItem[],
  amount: number,
  currency: string,
  metadata: CheckoutMetadata
): Stripe.Checkout.SessionCreateParams.LineItem[] => {
  const lineItems = [];

  if (services?.length > 0) {
    lineItems.push(...buildServiceLineItems(services, currency));
  }

  if (cartItems?.length > 0) {
    lineItems.push(...buildCartLineItems(cartItems, currency));
  }

  if (lineItems.length === 0) {
    lineItems.push(buildFallbackLineItem(amount, currency, metadata));
  }

  return lineItems;
};

// Payment type determination
const determinePaymentType = (
  reservationIds: string[],
  cartItems: CartItem[],
  services: ServiceItem[]
): string => {
  if (reservationIds.length > 0 && cartItems.length > 0) {
    return "mixed_cart";
  }
  if (reservationIds.length > 0 || services.length > 0) {
    return "reservation_payment";
  }
  return "beats_only";
};

// Enhanced metadata builder
const buildEnhancedMetadata = (
  metadata: CheckoutMetadata,
  paymentType: string,
  reservationIds: string[],
  services: ServiceItem[],
  cartItems: CartItem[],
  amount: number
): Record<string, string> => {
  const { userId, userEmail, description, ...additionalMetadata } = metadata;

  return {
    ...additionalMetadata,
    userId,
    userEmail,
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
    orderTotal: centsToDollars(amount).toString(),
    description: description || `${paymentType.replace("_", " ")} payment`,
  };
};

// Stripe error handler
const handleStripeError = (stripeError: unknown, requestId: string, res: Response): void => {
  logPaymentEvent("error", "stripe_session_creation_failed", {
    requestId,
    errorType: stripeError instanceof Stripe.errors.StripeError ? stripeError.type : "unknown",
    errorCode: stripeError instanceof Stripe.errors.StripeError ? stripeError.code : "unknown",
    errorMessage: stripeError instanceof Error ? stripeError.message : String(stripeError),
  });

  if (stripeError instanceof Stripe.errors.StripeError) {
    const errorResponse = createErrorResponse(
      "Payment Error",
      stripeError.message || "Failed to create checkout session",
      undefined,
      stripeError.type,
      {
        stripeCode: stripeError.code,
        requestId,
        canRetry: ["rate_limit_error", "api_connection_error"].includes(stripeError.type),
      }
    );

    res.status(400).json(errorResponse);
    return;
  }

  const errorResponse = createErrorResponse(
    "Internal Error",
    "An unexpected error occurred while processing your payment",
    undefined,
    "internal_error",
    { requestId }
  );

  res.status(500).json(errorResponse);
};

// Create checkout session for one-time purchases
router.post("/create-checkout-session", async (req, res): Promise<void> => {
  const requestId = generateSecureRequestId();

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
      userEmail: metadata.userEmail ? "***@***.***" : undefined,
      reservationCount: reservationIds?.length || 0,
      cartItemCount: cartItems?.length || 0,
      serviceCount: services?.length || 0,
    });

    // Validate all inputs
    if (!validateAmount(amount, requestId, res)) return;
    if (!validateUserMetadata(metadata, requestId, res)) return;
    if (!validateCurrency(currency, requestId, res)) return;

    // Build checkout data
    const paymentType = determinePaymentType(reservationIds, cartItems, services);
    const lineItems = buildLineItems(services, cartItems, amount, currency, metadata);
    const enhancedMetadata = buildEnhancedMetadata(
      metadata,
      paymentType,
      reservationIds,
      services,
      cartItems,
      amount
    );

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
      handleStripeError(stripeError, requestId, res);
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
// Note: Stripe payment webhooks are handled in server/routes/webhooks.ts
// This route only retrieves session status for client-side polling
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

export default router;
