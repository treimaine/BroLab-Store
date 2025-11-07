import { Request, Response, Router } from "express";
import { randomUUID } from "node:crypto";
import {
  PaymentError,
  PaymentErrorCode,
  createErrorResponse,
  sanitizeErrorMessage,
} from "../utils/errorHandling";

const router = Router();

// Types for webhook events
interface WebhookPayload {
  type: string;
  data: Record<string, unknown>;
}

interface WebhookResponse {
  received: boolean;
  synced: boolean;
  handled?: string;
  eventType?: string;
  message?: string;
  requestId: string;
  timestamp?: string;
}

interface SvixHeaders {
  "svix-id": string;
  "svix-timestamp": string;
  "svix-signature": string;
}

// Event type mappings
const SUBSCRIPTION_EVENT_MUTATIONS: Record<string, string> = {
  "subscription.created": "clerk/billing:handleSubscriptionCreated",
  "subscription.updated": "clerk/billing:handleSubscriptionUpdated",
  "subscription.deleted": "clerk/billing:handleSubscriptionDeleted",
};

const INVOICE_EVENT_MUTATIONS: Record<string, string> = {
  "invoice.created": "clerk/billing:handleInvoiceCreated",
  "invoice.paid": "clerk/billing:handleInvoicePaid",
  "invoice.payment_failed": "clerk/billing:handleInvoicePaymentFailed",
};

/**
 * Clerk Billing webhook endpoint
 * Handles subscription and invoice events from Clerk with signature verification
 */
router.post("/", async (req: Request, res: Response): Promise<void> => {
  const requestId = randomUUID();

  try {
    console.log(`📨 [${requestId}] Processing Clerk Billing webhook...`);

    // Verify environment configuration
    const config = validateEnvironmentConfig(requestId);
    if (!config.isValid) {
      res.status(config.statusCode!).json(config.errorResponse!);
      return;
    }

    // Verify webhook signature
    const payload = await verifyWebhookSignature(
      req,
      config.webhookSecret,
      config.isProd,
      requestId
    );
    if (!payload) {
      const errorResponse = createErrorResponse(
        "Invalid signature",
        PaymentErrorCode.STRIPE_INVALID_SIGNATURE,
        "Webhook signature verification failed",
        requestId
      );
      res.status(400).json(errorResponse);
      return;
    }

    // Process webhook event
    const response = await processWebhookEvent(payload, config.convexUrl, requestId);
    res.status(200).json(response);
  } catch (error) {
    handleWebhookError(error, requestId, res);
  }
});

/**
 * Validate environment configuration
 */
function validateEnvironmentConfig(requestId: string): {
  isValid: boolean;
  webhookSecret?: string;
  convexUrl?: string;
  isProd: boolean;
  statusCode?: number;
  errorResponse?: unknown;
} {
  const webhookSecret = process.env.CLERK_WEBHOOK_SECRET;
  const convexUrl = process.env.VITE_CONVEX_URL;
  const isProd = process.env.NODE_ENV === "production";

  // Check webhook secret in production
  if (!webhookSecret && isProd) {
    console.error(`❌ [${requestId}] CLERK_WEBHOOK_SECRET not configured in production`);
    return {
      isValid: false,
      isProd,
      statusCode: 500,
      errorResponse: createErrorResponse(
        "Webhook secret not configured",
        PaymentErrorCode.WEBHOOK_PROCESSING_ERROR,
        "CLERK_WEBHOOK_SECRET environment variable is required",
        requestId
      ),
    };
  }

  if (!webhookSecret) {
    console.warn(`⚠️ [${requestId}] CLERK_WEBHOOK_SECRET not set; using raw body in dev`);
  }

  // Check Convex URL
  if (!convexUrl) {
    console.warn(
      `⚠️ [${requestId}] VITE_CONVEX_URL not set; webhook will be acknowledged but not synced`
    );
  }

  return {
    isValid: true,
    webhookSecret,
    convexUrl,
    isProd,
  };
}

/**
 * Verify webhook signature using Svix
 */
async function verifyWebhookSignature(
  req: Request,
  webhookSecret: string | undefined,
  isProd: boolean,
  requestId: string
): Promise<WebhookPayload | null> {
  // Skip verification if no secret configured (dev only)
  if (!webhookSecret) {
    return req.body;
  }

  try {
    const { Webhook } = await import("svix");
    const svix = new Webhook(webhookSecret);

    // Extract Svix headers
    const svixHeaders = extractSvixHeaders(req);
    if (!svixHeaders) {
      throw new Error("Missing required Svix headers");
    }

    // Verify signature
    const payload = svix.verify(JSON.stringify(req.body), svixHeaders) as WebhookPayload;
    console.log(`✅ [${requestId}] Webhook signature verified`);
    return payload;
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    console.error(`❌ [${requestId}] Webhook signature verification failed:`, errorMessage);

    // In production, reject invalid signatures
    if (isProd) {
      return null;
    }

    // In development, allow fallback to raw body
    console.warn(`⚠️ [${requestId}] Svix verification failed; using raw body in dev`);
    return req.body;
  }
}

/**
 * Extract Svix headers from request
 */
function extractSvixHeaders(req: Request): SvixHeaders | null {
  const svixId = req.headers["svix-id"] as string;
  const svixTimestamp = req.headers["svix-timestamp"] as string;
  const svixSignature = req.headers["svix-signature"] as string;

  if (!svixId || !svixTimestamp || !svixSignature) {
    return null;
  }

  return {
    "svix-id": svixId,
    "svix-timestamp": svixTimestamp,
    "svix-signature": svixSignature,
  };
}

/**
 * Process webhook event and route to appropriate handler
 */
async function processWebhookEvent(
  payload: WebhookPayload,
  convexUrl: string | undefined,
  requestId: string
): Promise<WebhookResponse> {
  const { type: eventType, data: eventData } = payload;
  console.log(`📋 [${requestId}] Event type: ${eventType}`);

  // If Convex URL not configured, acknowledge but don't sync
  if (!convexUrl) {
    return {
      received: true,
      synced: false,
      message: "Convex URL not configured",
      requestId,
    };
  }

  // Route to appropriate handler
  if (eventType.startsWith("subscription.")) {
    await handleEventWithMutation(
      eventType,
      eventData,
      SUBSCRIPTION_EVENT_MUTATIONS,
      convexUrl,
      requestId
    );
    return {
      received: true,
      synced: true,
      handled: "subscription",
      eventType,
      requestId,
      timestamp: new Date().toISOString(),
    };
  }

  if (eventType.startsWith("invoice.")) {
    await handleEventWithMutation(
      eventType,
      eventData,
      INVOICE_EVENT_MUTATIONS,
      convexUrl,
      requestId
    );
    return {
      received: true,
      synced: true,
      handled: "invoice",
      eventType,
      requestId,
      timestamp: new Date().toISOString(),
    };
  }

  // Unknown event type
  console.log(`ℹ️ [${requestId}] Unhandled event type: ${eventType}`);
  return {
    received: true,
    synced: false,
    message: `Event type ${eventType} not handled`,
    requestId,
  };
}

/**
 * Handle event by calling appropriate Convex mutation
 */
async function handleEventWithMutation(
  eventType: string,
  data: Record<string, unknown>,
  mutationMap: Record<string, string>,
  convexUrl: string,
  requestId: string
): Promise<void> {
  const mutationName = mutationMap[eventType];

  if (!mutationName) {
    console.log(`ℹ️ [${requestId}] No mutation defined for event: ${eventType}`);
    return;
  }

  console.log(`🔔 [${requestId}] Handling event: ${eventType}`);
  logEventDetails(eventType, data, requestId);

  await callConvexMutation(mutationName, data, convexUrl, requestId);
}

/**
 * Log event details for debugging
 */
function logEventDetails(
  eventType: string,
  data: Record<string, unknown>,
  requestId: string
): void {
  if (eventType.startsWith("subscription.")) {
    console.log(`📊 [${requestId}] Subscription details:`, {
      subscriptionId: data.id,
      userId: data.user_id,
      planId: data.plan_id,
      status: data.status,
    });
  } else if (eventType.startsWith("invoice.")) {
    console.log(`📊 [${requestId}] Invoice details:`, {
      invoiceId: data.id,
      userId: data.user_id,
      amount: data.amount,
      status: data.status,
    });
  }
}

/**
 * Call Convex mutation via HTTP API
 */
async function callConvexMutation(
  mutationName: string,
  data: Record<string, unknown>,
  convexUrl: string,
  requestId: string
): Promise<void> {
  try {
    const response = await fetch(`${convexUrl}/api/mutation`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        path: mutationName,
        args: { data },
        format: "json",
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Convex mutation failed: ${errorText}`);
    }

    console.log(`✅ [${requestId}] Convex mutation completed: ${mutationName}`);
  } catch (error) {
    console.error(`❌ [${requestId}] Error calling Convex mutation:`, error);
    throw error;
  }
}

/**
 * Handle webhook processing errors
 */
function handleWebhookError(error: unknown, requestId: string, res: Response): void {
  console.error(`❌ [${requestId}] Error processing Clerk Billing webhook:`, error);

  if (error instanceof PaymentError) {
    const errorResponse = error.toErrorResponse(requestId);
    res.status(500).json(errorResponse);
    return;
  }

  const errorObj = error instanceof Error ? error : new Error(String(error));
  const errorResponse = createErrorResponse(
    "Webhook processing failed",
    PaymentErrorCode.WEBHOOK_PROCESSING_ERROR,
    sanitizeErrorMessage(errorObj),
    requestId,
    { stack: errorObj.stack }
  );
  res.status(500).json(errorResponse);
}

export default router;
