import * as crypto from "crypto";
import { z } from "zod";

// Webhook validation configuration
export interface WebhookConfig {
  secret: string;
  timestampTolerance: number; // in seconds
  algorithm: "sha256" | "sha1";
  headerName: string;
}

// Webhook validation result
export interface WebhookValidationResult {
  valid: boolean;
  errors: string[];
  timestamp?: number;
  payload?: any;
}

// Webhook payload sanitization options
export interface SanitizationOptions {
  maxDepth: number;
  maxStringLength: number;
  allowedKeys?: string[];
  blockedKeys?: string[];
}

// Default configurations for different webhook providers
export const WEBHOOK_CONFIGS = {
  stripe: {
    algorithm: "sha256" as const,
    headerName: "stripe-signature",
    timestampTolerance: 300, // 5 minutes
  },
  clerk: {
    algorithm: "sha256" as const,
    headerName: "svix-signature",
    timestampTolerance: 300, // 5 minutes
  },
  paypal: {
    algorithm: "sha256" as const,
    headerName: "paypal-transmission-sig",
    timestampTolerance: 300, // 5 minutes
  },
  github: {
    algorithm: "sha256" as const,
    headerName: "x-hub-signature-256",
    timestampTolerance: 300, // 5 minutes
  },
} as const;

// Webhook payload schemas for validation
export const webhookPayloadSchemas = {
  stripe: z.object({
    id: z.string(),
    object: z.literal("event"),
    type: z.string(),
    data: z.object({
      object: z.any(),
    }),
    created: z.number(),
    livemode: z.boolean(),
    pending_webhooks: z.number(),
    request: z
      .object({
        id: z.string().nullable(),
        idempotency_key: z.string().nullable(),
      })
      .nullable(),
  }),

  clerk: z.object({
    type: z.string(),
    object: z.literal("event"),
    data: z.any(),
  }),

  paypal: z.object({
    id: z.string(),
    event_type: z.string(),
    resource_type: z.string(),
    summary: z.string(),
    resource: z.any(),
    create_time: z.string(),
    event_version: z.string(),
  }),
};

export class WebhookValidator {
  private configs: Map<string, WebhookConfig> = new Map();
  private sanitizationOptions: SanitizationOptions;

  constructor(sanitizationOptions?: Partial<SanitizationOptions>) {
    this.sanitizationOptions = {
      maxDepth: 10,
      maxStringLength: 10000,
      blockedKeys: ["__proto__", "constructor", "prototype"],
      ...sanitizationOptions,
    };
  }

  /**
   * Register a webhook configuration for a specific provider
   */
  registerProvider(provider: string, secret: string, options?: Partial<WebhookConfig>): void {
    const defaultConfig = WEBHOOK_CONFIGS[provider as keyof typeof WEBHOOK_CONFIGS];

    this.configs.set(provider, {
      secret,
      ...defaultConfig,
      timestampTolerance: 300,
      algorithm: "sha256",
      headerName: `${provider}-signature`,
      ...options,
    });
  }

  /**
   * Validate webhook signature using HMAC with enhanced security
   */
  validateSignature(
    payload: string | Buffer,
    signature: string,
    secret: string,
    algorithm: "sha256" | "sha1" = "sha256"
  ): boolean {
    try {
      // Input validation
      if (!payload || !signature || !secret) {
        console.error("Signature validation failed: Missing required parameters");
        return false;
      }

      if (typeof signature !== "string" || signature.length === 0) {
        console.error("Signature validation failed: Invalid signature format");
        return false;
      }

      if (typeof secret !== "string" || secret.length < 16) {
        console.error("Signature validation failed: Secret too short (minimum 16 characters)");
        return false;
      }

      const payloadBuffer = Buffer.isBuffer(payload) ? payload : Buffer.from(payload, "utf8");

      // Validate payload size (prevent DoS attacks)
      if (payloadBuffer.length > 1024 * 1024) {
        // 1MB limit
        console.error("Signature validation failed: Payload too large");
        return false;
      }

      const expectedSignature = crypto
        .createHmac(algorithm, secret)
        .update(payloadBuffer)
        .digest("hex");

      // Handle different signature formats with enhanced validation
      let providedSignature = signature.trim();

      // Stripe format: "t=timestamp,v1=signature"
      if (signature.includes("v1=")) {
        const parts = signature.split(",");
        const v1Part = parts.find(part => part.startsWith("v1="));
        if (v1Part && v1Part.length > 3) {
          providedSignature = v1Part.substring(3);
        } else {
          console.error("Signature validation failed: Invalid Stripe signature format");
          return false;
        }
      }

      // GitHub format: "sha256=signature" or "sha1=signature"
      if (signature.startsWith(`${algorithm}=`)) {
        const prefixLength = algorithm.length + 1;
        if (signature.length > prefixLength) {
          providedSignature = signature.substring(prefixLength);
        } else {
          console.error("Signature validation failed: Invalid GitHub signature format");
          return false;
        }
      }

      // Clerk/Svix format: multiple signatures separated by spaces
      if (signature.includes(" ")) {
        const signatures = signature.split(" ").filter(sig => sig.length > 0);
        if (signatures.length === 0) {
          console.error("Signature validation failed: No valid signatures found");
          return false;
        }

        return signatures.some(sig => {
          let cleanSig = sig.trim();
          if (cleanSig.startsWith("v1,")) {
            cleanSig = cleanSig.substring(3);
          }
          return cleanSig.length > 0 && this.constantTimeCompare(cleanSig, expectedSignature);
        });
      }

      // Validate signature format (hex string)
      if (!/^[a-fA-F0-9]+$/.test(providedSignature)) {
        console.error("Signature validation failed: Invalid hex format");
        return false;
      }

      // Validate signature length based on algorithm
      const expectedLength = algorithm === "sha256" ? 64 : 40;
      if (providedSignature.length !== expectedLength) {
        console.error(`Signature validation failed: Invalid signature length for ${algorithm}`);
        return false;
      }

      return this.constantTimeCompare(providedSignature, expectedSignature);
    } catch (error) {
      console.error("Signature validation error:", error);
      return false;
    }
  }

  /**
   * Validate timestamp to prevent replay attacks with enhanced security
   */
  validateTimestamp(timestamp: number, tolerance: number = 300): boolean {
    try {
      // Input validation
      if (typeof timestamp !== "number" || !Number.isInteger(timestamp)) {
        console.error("Timestamp validation failed: Invalid timestamp format");
        return false;
      }

      if (timestamp <= 0) {
        console.error("Timestamp validation failed: Timestamp must be positive");
        return false;
      }

      // Check if timestamp is reasonable (not too far in the past or future)
      const now = Math.floor(Date.now() / 1000);
      const minValidTimestamp = now - 365 * 24 * 60 * 60; // 1 year ago
      const maxValidTimestamp = now + 24 * 60 * 60; // 1 day in future

      if (timestamp < minValidTimestamp) {
        console.error("Timestamp validation failed: Timestamp too old (more than 1 year)");
        return false;
      }

      if (timestamp > maxValidTimestamp) {
        console.error("Timestamp validation failed: Timestamp too far in future (more than 1 day)");
        return false;
      }

      // Validate tolerance parameter
      if (typeof tolerance !== "number" || tolerance < 0 || tolerance > 3600) {
        console.error("Timestamp validation failed: Invalid tolerance value");
        return false;
      }

      const diff = Math.abs(now - timestamp);
      const isValid = diff <= tolerance;

      if (!isValid) {
        console.warn(
          `Timestamp validation failed: Difference ${diff}s exceeds tolerance ${tolerance}s`
        );
      }

      return isValid;
    } catch (error) {
      console.error("Timestamp validation error:", error);
      return false;
    }
  }

  /**
   * Extract timestamp from signature header (Stripe format)
   */
  extractTimestamp(signature: string): number | null {
    try {
      if (signature.includes("t=")) {
        const parts = signature.split(",");
        const timestampPart = parts.find(part => part.startsWith("t="));
        if (timestampPart) {
          return parseInt(timestampPart.substring(2), 10);
        }
      }
      return null;
    } catch {
      return null;
    }
  }

  /**
   * Sanitize webhook payload to prevent injection attacks with enhanced security
   */
  sanitizePayload(payload: any, depth: number = 0): any {
    try {
      // Prevent infinite recursion and DoS attacks
      if (depth > this.sanitizationOptions.maxDepth) {
        console.warn(
          `Payload sanitization: Max depth ${this.sanitizationOptions.maxDepth} exceeded`
        );
        return "[Max depth exceeded]";
      }

      // Handle null and undefined
      if (payload === null || payload === undefined) {
        return payload;
      }

      // Handle strings with enhanced sanitization
      if (typeof payload === "string") {
        if (payload.length > this.sanitizationOptions.maxStringLength) {
          console.warn(
            `Payload sanitization: String truncated from ${payload.length} to ${this.sanitizationOptions.maxStringLength} characters`
          );
          return payload.substring(0, this.sanitizationOptions.maxStringLength) + "[Truncated]";
        }

        // Enhanced character filtering for security
        let sanitized = payload
          // Remove control characters and potentially dangerous characters
          .replace(/[\x00-\x1f\x7f-\x9f]/g, "")
          // Remove HTML/XML tags
          .replace(/<[^>]*>/g, "")
          // Remove JavaScript protocol
          .replace(/javascript:/gi, "")
          // Remove data URLs that could contain scripts
          .replace(/data:[^;]*;base64,/gi, "")
          // Remove potentially dangerous quotes and characters
          .replace(/[<>"'&]/g, "");

        // Additional validation for common injection patterns
        const dangerousPatterns = [
          /script/gi,
          /onload/gi,
          /onerror/gi,
          /onclick/gi,
          /eval\s*\(/gi,
          /function\s*\(/gi,
          /setTimeout/gi,
          /setInterval/gi,
        ];

        for (const pattern of dangerousPatterns) {
          if (pattern.test(sanitized)) {
            console.warn("Payload sanitization: Dangerous pattern detected and removed");
            sanitized = sanitized.replace(pattern, "[FILTERED]");
          }
        }

        return sanitized;
      }

      // Handle numbers with validation
      if (typeof payload === "number") {
        // Check for NaN and Infinity
        if (!Number.isFinite(payload)) {
          console.warn("Payload sanitization: Invalid number detected");
          return 0;
        }
        return payload;
      }

      // Handle booleans
      if (typeof payload === "boolean") {
        return payload;
      }

      // Handle arrays with size limits
      if (Array.isArray(payload)) {
        const maxArrayLength = 1000; // Prevent DoS attacks
        if (payload.length > maxArrayLength) {
          console.warn(
            `Payload sanitization: Array truncated from ${payload.length} to ${maxArrayLength} items`
          );
          return payload
            .slice(0, maxArrayLength)
            .map(item => this.sanitizePayload(item, depth + 1));
        }
        return payload.map(item => this.sanitizePayload(item, depth + 1));
      }

      // Handle objects with enhanced security
      if (typeof payload === "object") {
        const sanitized: any = {};
        const maxObjectKeys = 100; // Prevent DoS attacks
        let keyCount = 0;

        for (const [key, value] of Object.entries(payload)) {
          // Limit number of keys to prevent DoS
          if (keyCount >= maxObjectKeys) {
            console.warn(`Payload sanitization: Object truncated at ${maxObjectKeys} keys`);
            break;
          }

          // Enhanced key validation
          if (typeof key !== "string") {
            console.warn("Payload sanitization: Non-string key detected and skipped");
            continue;
          }

          // Block dangerous keys with enhanced patterns
          const dangerousKeys = [
            "__proto__",
            "constructor",
            "prototype",
            "eval",
            ...(this.sanitizationOptions.blockedKeys || []),
          ];

          if (dangerousKeys.includes(key.toLowerCase())) {
            console.warn(`Payload sanitization: Dangerous key "${key}" blocked`);
            continue;
          }

          // Check for dangerous patterns in key names (but be more specific)
          if (key.toLowerCase() === "script" || key.toLowerCase() === "function") {
            console.warn(`Payload sanitization: Dangerous key "${key}" blocked`);
            continue;
          }

          // Check allowed keys if specified
          if (
            this.sanitizationOptions.allowedKeys &&
            !this.sanitizationOptions.allowedKeys.includes(key)
          ) {
            continue;
          }

          // Sanitize key name with enhanced filtering
          const sanitizedKey = key
            .replace(/[<>"'&\x00-\x1f\x7f-\x9f]/g, "")
            .replace(/\s+/g, "_") // Replace spaces with underscores
            .substring(0, 100); // Limit key length

          if (sanitizedKey.length > 0 && sanitizedKey !== "__proto__") {
            sanitized[sanitizedKey] = this.sanitizePayload(value, depth + 1);
            keyCount++;
          }
        }

        return sanitized;
      }

      // Handle functions and other types
      if (typeof payload === "function") {
        console.warn("Payload sanitization: Function detected and removed");
        return "[Function removed]";
      }

      // Handle symbols and other exotic types
      console.warn(`Payload sanitization: Unsupported type ${typeof payload} converted to string`);
      return String(payload);
    } catch (error) {
      console.error("Payload sanitization error:", error);
      return "[Sanitization error]";
    }
  }

  /**
   * Validate webhook payload against schema
   */
  validatePayloadSchema(
    payload: any,
    provider: keyof typeof webhookPayloadSchemas
  ): { valid: boolean; errors: string[] } {
    try {
      const schema = webhookPayloadSchemas[provider];
      if (!schema) {
        return { valid: false, errors: [`No schema defined for provider: ${provider}`] };
      }

      schema.parse(payload);
      return { valid: true, errors: [] };
    } catch (error) {
      if (error instanceof z.ZodError) {
        return {
          valid: false,
          errors: error.errors.map(err => `${err.path.join(".")}: ${err.message}`),
        };
      }
      return { valid: false, errors: [String(error)] };
    }
  }

  /**
   * Comprehensive webhook validation with enhanced security
   */
  async validateWebhook(
    provider: string,
    payload: string | Buffer,
    signature: string,
    headers: Record<string, string> = {}
  ): Promise<WebhookValidationResult> {
    const errors: string[] = [];
    const startTime = Date.now();

    try {
      // Input validation
      if (!provider || typeof provider !== "string") {
        return {
          valid: false,
          errors: ["Invalid provider specified"],
        };
      }

      if (!signature || typeof signature !== "string") {
        return {
          valid: false,
          errors: ["Invalid signature provided"],
        };
      }

      const config = this.configs.get(provider);
      if (!config) {
        return {
          valid: false,
          errors: [`No configuration found for provider: ${provider}`],
        };
      }

      // Validate payload size early to prevent DoS
      const payloadSize = Buffer.isBuffer(payload)
        ? payload.length
        : Buffer.byteLength(payload, "utf8");
      if (payloadSize > 1024 * 1024) {
        // 1MB limit
        return {
          valid: false,
          errors: ["Payload too large (maximum 1MB allowed)"],
        };
      }

      // Parse and validate JSON payload
      let parsedPayload: any;
      try {
        const payloadString = Buffer.isBuffer(payload) ? payload.toString("utf8") : payload;

        // Basic JSON validation
        if (!payloadString || payloadString.trim().length === 0) {
          errors.push("Empty payload provided");
          return { valid: false, errors };
        }

        parsedPayload = JSON.parse(payloadString);

        // Validate parsed payload structure
        if (
          parsedPayload === null ||
          (typeof parsedPayload !== "object" && !Array.isArray(parsedPayload))
        ) {
          errors.push("Payload must be a valid JSON object or array");
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown JSON parsing error";
        errors.push(`Invalid JSON payload: ${errorMessage}`);
        return { valid: false, errors };
      }

      // Validate signature with enhanced checks
      const signatureValid = this.validateSignature(
        payload,
        signature,
        config.secret,
        config.algorithm
      );
      if (!signatureValid) {
        errors.push("Invalid signature");
      }

      // Enhanced timestamp validation
      const timestamp = this.extractTimestamp(signature);
      if (timestamp !== null) {
        if (!this.validateTimestamp(timestamp, config.timestampTolerance)) {
          errors.push("Timestamp outside tolerance window");
        }
      } else if (provider === "stripe") {
        // Stripe webhooks should always have timestamps
        console.warn("Stripe webhook missing timestamp in signature");
      }

      // Sanitize payload with enhanced security
      const sanitizedPayload = this.sanitizePayload(parsedPayload);

      // Validate payload schema if available
      if (provider in webhookPayloadSchemas) {
        try {
          const schemaValidation = this.validatePayloadSchema(
            sanitizedPayload,
            provider as keyof typeof webhookPayloadSchemas
          );
          if (!schemaValidation.valid) {
            errors.push(...schemaValidation.errors.map(err => `Schema validation: ${err}`));
          }
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : "Unknown schema validation error";
          errors.push(`Schema validation error: ${errorMessage}`);
        }
      }

      // Enhanced security checks
      this.performSecurityChecks(headers, errors);

      // Additional provider-specific validations
      this.performProviderSpecificValidation(provider, sanitizedPayload, errors);

      // Log validation performance for monitoring
      const validationTime = Date.now() - startTime;
      if (validationTime > 1000) {
        // Log if validation takes more than 1 second
        console.warn(`Webhook validation for ${provider} took ${validationTime}ms`);
      }

      const isValid = errors.length === 0;

      // Log validation result for security monitoring
      if (!isValid) {
        console.error(`Webhook validation failed for ${provider}:`, {
          errors: errors.slice(0, 5), // Limit logged errors to prevent log spam
          timestamp,
          payloadSize,
          validationTime,
        });
      }

      return {
        valid: isValid,
        errors,
        timestamp: timestamp ?? undefined,
        payload: sanitizedPayload,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown validation error";
      console.error(`Webhook validation exception for ${provider}:`, error);

      return {
        valid: false,
        errors: [`Validation error: ${errorMessage}`],
      };
    }
  }

  /**
   * Perform additional security checks on headers with enhanced validation
   */
  private performSecurityChecks(headers: Record<string, string>, errors: string[]): void {
    try {
      // Normalize header names to lowercase for consistent checking
      const normalizedHeaders: Record<string, string> = {};
      for (const [key, value] of Object.entries(headers)) {
        if (typeof key === "string" && typeof value === "string") {
          normalizedHeaders[key.toLowerCase()] = value;
        }
      }

      // Check for suspicious proxy headers that might indicate spoofing
      const suspiciousHeaders = [
        "x-forwarded-for",
        "x-real-ip",
        "x-forwarded-proto",
        "x-forwarded-host",
        "x-original-forwarded-for",
      ];

      for (const header of suspiciousHeaders) {
        const value = normalizedHeaders[header];
        if (value) {
          // Log for monitoring but don't fail validation
          console.warn(`Webhook received with potentially spoofed header ${header}: ${value}`);

          // Check for obviously malicious values
          if (
            value.includes("127.0.0.1") ||
            value.includes("localhost") ||
            value.includes("0.0.0.0")
          ) {
            console.warn(`Suspicious IP in ${header}: ${value}`);
          }
        }
      }

      // Enhanced content type validation
      const contentType = normalizedHeaders["content-type"];
      if (contentType) {
        if (!contentType.includes("application/json")) {
          errors.push("Invalid content type, expected application/json");
        }

        // Check for suspicious content type parameters
        if (contentType.includes("charset") && !contentType.includes("utf-8")) {
          console.warn(`Non-UTF-8 charset in content type: ${contentType}`);
        }
      } else {
        // Missing content type might be suspicious
        console.warn("Webhook received without Content-Type header");
      }

      // Enhanced user agent validation
      const userAgent = normalizedHeaders["user-agent"];
      if (userAgent) {
        const knownAgents = [
          "Stripe/",
          "Clerk/",
          "PayPal/",
          "GitHub-Hookshot/",
          "Svix-Webhooks/",
          "Shopify/",
          "Twilio/",
          "SendGrid/",
        ];

        const isKnownAgent = knownAgents.some(agent => userAgent.includes(agent));
        if (!isKnownAgent) {
          console.warn(`Unknown user agent for webhook: ${userAgent}`);
        }

        // Check for suspicious user agent patterns
        const suspiciousPatterns = [
          /curl/i,
          /wget/i,
          /python/i,
          /postman/i,
          /insomnia/i,
          /bot/i,
          /crawler/i,
          /spider/i,
        ];

        if (suspiciousPatterns.some(pattern => pattern.test(userAgent))) {
          console.warn(`Potentially suspicious user agent: ${userAgent}`);
        }
      } else {
        console.warn("Webhook received without User-Agent header");
      }

      // Check for rate limiting headers that might indicate abuse
      const rateLimitHeaders = ["x-ratelimit-remaining", "x-rate-limit-remaining"];
      for (const header of rateLimitHeaders) {
        const value = normalizedHeaders[header];
        if (value && parseInt(value, 10) < 10) {
          console.warn(`Low rate limit remaining: ${header}=${value}`);
        }
      }

      // Check for security headers that should not be present in webhooks
      const unexpectedHeaders = [
        "authorization",
        "cookie",
        "set-cookie",
        "x-api-key",
        "x-auth-token",
      ];

      for (const header of unexpectedHeaders) {
        if (normalizedHeaders[header]) {
          console.warn(`Unexpected security header in webhook: ${header}`);
        }
      }

      // Validate content length if present
      const contentLength = normalizedHeaders["content-length"];
      if (contentLength) {
        const length = parseInt(contentLength, 10);
        if (isNaN(length) || length < 0) {
          errors.push("Invalid Content-Length header");
        } else if (length > 1024 * 1024) {
          // 1MB
          errors.push("Content-Length exceeds maximum allowed size");
        }
      }
    } catch (error) {
      console.error("Error during security checks:", error);
      // Don't add to errors array as this shouldn't fail the webhook
    }
  }

  /**
   * Perform provider-specific validation
   */
  private performProviderSpecificValidation(
    provider: string,
    payload: any,
    errors: string[]
  ): void {
    try {
      switch (provider.toLowerCase()) {
        case "stripe":
          this.validateStripeSpecific(payload, errors);
          break;
        case "clerk":
          this.validateClerkSpecific(payload, errors);
          break;
        case "paypal":
          this.validatePayPalSpecific(payload, errors);
          break;
        case "github":
          this.validateGitHubSpecific(payload, errors);
          break;
        default:
          // No specific validation for unknown providers
          break;
      }
    } catch (error) {
      console.error(`Provider-specific validation error for ${provider}:`, error);
      // Don't add to errors as this is additional validation
    }
  }

  /**
   * Stripe-specific validation
   */
  private validateStripeSpecific(payload: any, errors: string[]): void {
    if (!payload || typeof payload !== "object") return;

    // Validate required Stripe fields
    if (!payload.id || typeof payload.id !== "string") {
      errors.push("Stripe webhook missing or invalid 'id' field");
    }

    if (payload.object !== "event") {
      errors.push("Stripe webhook 'object' field must be 'event'");
    }

    if (!payload.type || typeof payload.type !== "string") {
      errors.push("Stripe webhook missing or invalid 'type' field");
    }

    // Validate Stripe event type format
    if (payload.type && !payload.type.includes(".")) {
      errors.push("Stripe webhook 'type' field has invalid format");
    }

    // Check for required data object
    if (!payload.data || typeof payload.data !== "object") {
      errors.push("Stripe webhook missing or invalid 'data' field");
    }
  }

  /**
   * Clerk-specific validation
   */
  private validateClerkSpecific(payload: any, errors: string[]): void {
    if (!payload || typeof payload !== "object") return;

    if (payload.object !== "event") {
      errors.push("Clerk webhook 'object' field must be 'event'");
    }

    if (!payload.type || typeof payload.type !== "string") {
      errors.push("Clerk webhook missing or invalid 'type' field");
    }

    // Validate Clerk event type format
    const validClerkTypes = [
      "user.created",
      "user.updated",
      "user.deleted",
      "session.created",
      "session.ended",
      "organization.created",
      "organization.updated",
      "organization.deleted",
    ];

    if (
      payload.type &&
      !validClerkTypes.some(type => payload.type.startsWith(type.split(".")[0]))
    ) {
      console.warn(`Unknown Clerk event type: ${payload.type}`);
    }
  }

  /**
   * PayPal-specific validation
   */
  private validatePayPalSpecific(payload: any, errors: string[]): void {
    if (!payload || typeof payload !== "object") return;

    if (!payload.id || typeof payload.id !== "string") {
      errors.push("PayPal webhook missing or invalid 'id' field");
    }

    if (!payload.event_type || typeof payload.event_type !== "string") {
      errors.push("PayPal webhook missing or invalid 'event_type' field");
    }

    if (!payload.resource || typeof payload.resource !== "object") {
      errors.push("PayPal webhook missing or invalid 'resource' field");
    }
  }

  /**
   * GitHub-specific validation
   */
  private validateGitHubSpecific(payload: any, errors: string[]): void {
    if (!payload || typeof payload !== "object") return;

    // GitHub webhooks can have various structures, so we do minimal validation
    if (payload.zen && typeof payload.zen === "string") {
      // This is a ping event, which is valid
      return;
    }

    // Most GitHub webhooks should have an action field
    if (payload.action && typeof payload.action !== "string") {
      errors.push("GitHub webhook 'action' field must be a string");
    }
  }

  /**
   * Constant time string comparison to prevent timing attacks
   */
  private constantTimeCompare(a: string, b: string): boolean {
    if (a.length !== b.length) {
      return false;
    }

    let result = 0;
    for (let i = 0; i < a.length; i++) {
      result |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }

    return result === 0;
  }

  /**
   * Generate webhook signature for testing
   */
  generateSignature(
    payload: string | Buffer,
    secret: string,
    algorithm: "sha256" | "sha1" = "sha256",
    timestamp?: number
  ): string {
    const payloadBuffer = Buffer.isBuffer(payload) ? payload : Buffer.from(payload, "utf8");
    const signature = crypto.createHmac(algorithm, secret).update(payloadBuffer).digest("hex");

    if (timestamp) {
      return `t=${timestamp},v1=${signature}`;
    }

    return signature;
  }

  /**
   * Get configuration for a provider
   */
  getConfig(provider: string): WebhookConfig | undefined {
    return this.configs.get(provider);
  }

  /**
   * Remove configuration for a provider
   */
  removeProvider(provider: string): boolean {
    return this.configs.delete(provider);
  }

  /**
   * List all registered providers
   */
  getProviders(): string[] {
    return Array.from(this.configs.keys());
  }
}

// Create singleton instance
export const webhookValidator = new WebhookValidator();

// Initialize with environment variables
if (process.env.STRIPE_WEBHOOK_SECRET) {
  webhookValidator.registerProvider("stripe", process.env.STRIPE_WEBHOOK_SECRET);
}

if (process.env.CLERK_WEBHOOK_SECRET || process.env.CLERK_WEBHOOK_SIGNING_SECRET) {
  const secret = process.env.CLERK_WEBHOOK_SECRET || process.env.CLERK_WEBHOOK_SIGNING_SECRET!;
  webhookValidator.registerProvider("clerk", secret);
}

if (process.env.PAYPAL_WEBHOOK_SECRET) {
  webhookValidator.registerProvider("paypal", process.env.PAYPAL_WEBHOOK_SECRET);
}

export default webhookValidator;
