import { Request, Response, Router } from "express";
import { randomUUID } from "node:crypto";
import {
  getWebhookAuditLogger,
  type WebhookAuditEntry,
  type WebhookOutcome,
} from "../services/WebhookAuditLogger";
import { getWebhookSecurityService } from "../services/WebhookSecurityService";
import {
  PaymentError,
  PaymentErrorCode,
  createErrorResponse,
  sanitizeErrorMessage,
} from "../utils/errorHandling";

const router = Router();

// Initialize security services
const securityService = getWebhookSecurityService();
const auditLogger = getWebhookAuditLogger();

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
 *
 * Security features:
 * - Timestamp validation for replay attack protection (Requirements 2.1, 2.2, 2.3)
 * - Idempotency checking to prevent duplicate processing (Requirements 3.1, 3.2)
 * - IP failure tracking for suspicious activity detection (Requirement 4.4)
 * - Structured audit logging (Requirements 4.1, 4.2, 4.3)
 */
router.post("/", async (req: Request, res: Response): Promise<void> => {
  const requestId = randomUUID();
  const startTime = Date.now();

  // Extract source IP for tracking and logging
  const sourceIp = extractSourceIP(req);

  // Extract Svix headers early for logging
  const svixHeaders = extractSvixHeaders(req);
  const svixId = svixHeaders?.["svix-id"] || "unknown";
  const svixTimestamp = svixHeaders?.["svix-timestamp"] || "";

  // Initialize audit entry builder
  let eventType = "unknown";
  let signatureValid = false;
  let outcome: WebhookOutcome = "error";
  let rejectionReason: string | undefined;
  let mutationCalled: string | undefined;
  let syncStatus: boolean | undefined;

  try {
    console.log(`📨 [${requestId}] Processing Clerk Billing webhook...`);

    // Verify environment configuration
    const config = validateEnvironmentConfig(requestId);
    if (!config.isValid) {
      outcome = "rejected";
      rejectionReason = "Environment configuration invalid";
      logAuditEntry({
        requestId,
        startTime,
        eventType,
        sourceIp,
        svixId,
        signatureValid,
        outcome,
        rejectionReason,
      });
      res.status(config.statusCode!).json(config.errorResponse!);
      return;
    }

    // Check for required Svix headers
    if (!svixHeaders) {
      outcome = "rejected";
      rejectionReason = "Missing required Svix headers";
      console.warn(`⚠️ [${requestId}] ${rejectionReason}`);
      logAuditEntry({
        requestId,
        startTime,
        eventType,
        sourceIp,
        svixId,
        signatureValid,
        outcome,
        rejectionReason,
      });
      const errorResponse = createErrorResponse(
        "Missing headers",
        PaymentErrorCode.WEBHOOK_MISSING_HEADERS,
        rejectionReason,
        requestId
      );
      res.status(400).json(errorResponse);
      return;
    }

    // Requirement 2.1, 2.2, 2.3: Validate timestamp for replay attack protection
    const timestampValidation = securityService.validateTimestamp(svixTimestamp);
    if (!timestampValidation.valid) {
      outcome = "rejected";
      rejectionReason = timestampValidation.reason;
      console.warn(`⚠️ [${requestId}] Timestamp validation failed: ${rejectionReason}`);
      logAuditEntry({
        requestId,
        startTime,
        eventType,
        sourceIp,
        svixId,
        signatureValid,
        outcome,
        rejectionReason,
      });
      const errorResponse = createErrorResponse(
        "Invalid timestamp",
        timestampValidation.code,
        rejectionReason,
        requestId
      );
      res.status(400).json(errorResponse);
      return;
    }

    // Requirement 3.1, 3.2: Check idempotency before processing
    const idempotencyResult = securityService.checkIdempotency(svixId);
    if (idempotencyResult.isDuplicate) {
      outcome = "duplicate";
      console.log(
        `ℹ️ [${requestId}] Duplicate webhook detected: ${svixId} (originally processed at ${new Date(idempotencyResult.originalProcessedAt).toISOString()})`
      );
      logAuditEntry({
        requestId,
        startTime,
        eventType,
        sourceIp,
        svixId,
        signatureValid: true, // Signature was valid when originally processed
        outcome,
      });
      // Return 200 for duplicates without re-processing (idempotent behavior)
      res.status(200).json({
        received: true,
        synced: false,
        message: "Duplicate webhook - already processed",
        requestId,
        duplicate: true,
      });
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
      outcome = "rejected";
      rejectionReason = "Webhook signature verification failed";

      // Requirement 4.4: Track signature failures by IP
      securityService.trackSignatureFailure(sourceIp);

      // Check if IP should trigger security warning
      if (securityService.shouldWarnAboutIP(sourceIp)) {
        const failureCount = securityService.getFailureCount(sourceIp);
        auditLogger.logSecurityWarning(sourceIp, failureCount);
        console.warn(
          `🚨 [${requestId}] Security warning: ${failureCount} signature failures from IP ${sourceIp}`
        );
      }

      logAuditEntry({
        requestId,
        startTime,
        eventType,
        sourceIp,
        svixId,
        signatureValid,
        outcome,
        rejectionReason,
      });
      const errorResponse = createErrorResponse(
        "Invalid signature",
        PaymentErrorCode.STRIPE_INVALID_SIGNATURE,
        rejectionReason,
        requestId
      );
      res.status(400).json(errorResponse);
      return;
    }

    // Signature verified successfully
    signatureValid = true;
    eventType = payload.type || "unknown";

    // Process webhook event
    const response = await processWebhookEvent(payload, config.convexUrl, requestId);

    // Requirement 3.2: Record processed webhook for idempotency
    securityService.recordProcessed(svixId, eventType);

    // Set audit fields from response
    outcome = "success";
    syncStatus = response.synced;
    mutationCalled = response.handled ? `${response.handled}:${eventType}` : undefined;

    logAuditEntry({
      requestId,
      startTime,
      eventType,
      sourceIp,
      svixId,
      signatureValid,
      outcome,
      mutationCalled,
      syncStatus,
    });

    res.status(200).json(response);
  } catch (error) {
    outcome = "error";
    rejectionReason = error instanceof Error ? error.message : String(error);
    logAuditEntry({
      requestId,
      startTime,
      eventType,
      sourceIp,
      svixId,
      signatureValid,
      outcome,
      rejectionReason,
    });
    handleWebhookError(error, requestId, res);
  }
});

/**
 * Extract source IP from request
 * Handles proxied requests (X-Forwarded-For) and direct connections
 */
function extractSourceIP(req: Request): string {
  // Check for forwarded IP (when behind proxy/load balancer)
  const forwardedFor = req.headers["x-forwarded-for"];
  if (forwardedFor) {
    // X-Forwarded-For can contain multiple IPs, take the first (client IP)
    const ips = Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor;
    return ips.split(",")[0].trim();
  }

  // Check for real IP header (nginx)
  const realIp = req.headers["x-real-ip"];
  if (realIp) {
    return Array.isArray(realIp) ? realIp[0] : realIp;
  }

  // Fall back to socket remote address
  return req.socket.remoteAddress || "unknown";
}

/**
 * Options for logging audit entries
 */
interface AuditLogOptions {
  requestId: string;
  startTime: number;
  eventType: string;
  sourceIp: string;
  svixId: string;
  signatureValid: boolean;
  outcome: WebhookOutcome;
  rejectionReason?: string;
  mutationCalled?: string;
  syncStatus?: boolean;
}

/**
 * Log audit entry with all required fields
 * Requirements: 4.1, 4.2, 4.3
 */
function logAuditEntry(options: AuditLogOptions): void {
  const processingTimeMs = Date.now() - options.startTime;

  const auditEntry: WebhookAuditEntry = {
    requestId: options.requestId,
    timestamp: new Date().toISOString(),
    eventType: options.eventType,
    sourceIp: options.sourceIp,
    svixId: options.svixId,
    signatureValid: options.signatureValid,
    processingTimeMs,
    outcome: options.outcome,
  };

  // Include optional fields only when present
  if (options.rejectionReason !== undefined) {
    auditEntry.rejectionReason = options.rejectionReason;
  }
  if (options.mutationCalled !== undefined) {
    auditEntry.mutationCalled = options.mutationCalled;
  }
  if (options.syncStatus !== undefined) {
    auditEntry.syncStatus = options.syncStatus;
  }

  auditLogger.log(auditEntry);
}

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

  // Handle session.created events for activity logging
  if (
    eventType === "session.created" ||
    eventType === "user.created" ||
    eventType === "user.updated"
  ) {
    await handleUserEvent(eventType, eventData, convexUrl, requestId);
    return {
      received: true,
      synced: true,
      handled: "user_session",
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
 * Handle user events (session.created, user.created, user.updated)
 */
async function handleUserEvent(
  eventType: string,
  data: Record<string, unknown>,
  convexUrl: string,
  requestId: string
): Promise<void> {
  console.log(`👤 [${requestId}] Handling user event: ${eventType}`);

  try {
    // Extract user data from event
    const userId = (data.user_id as string) || (data.id as string);
    const emailAddresses = data.email_addresses as Array<{ email_address: string }> | undefined;
    const email = emailAddresses?.[0]?.email_address || "unknown@temp.com";

    // Call syncClerkUser mutation
    const response = await fetch(`${convexUrl}/api/mutation`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        path: "users/clerkSync:syncClerkUser",
        args: {
          clerkId: userId,
          email: email,
          username: data.username as string | undefined,
          firstName: data.first_name as string | undefined,
          lastName: data.last_name as string | undefined,
          imageUrl: data.image_url as string | undefined,
        },
        format: "json",
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Convex mutation failed: ${errorText}`);
    }

    console.log(`✅ [${requestId}] User synced successfully: ${userId}`);
  } catch (error) {
    console.error(`❌ [${requestId}] Error syncing user:`, error);
    throw error;
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
