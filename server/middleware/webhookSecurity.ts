import { NextFunction, Request, Response } from "express";
import { webhookValidator } from "../lib/webhookValidator";

// Extend Express Request to include webhook validation results
declare global {
  namespace Express {
    interface Request {
      webhookValidation?: {
        provider: string;
        payload: any;
        timestamp?: number;
        isValid: boolean;
        errors: string[];
      };
    }
  }
}

export interface WebhookSecurityOptions {
  provider: string;
  required?: boolean;
  skipInTest?: boolean;
  customValidation?: (payload: any) => Promise<{ valid: boolean; errors: string[] }>;
}

/**
 * Middleware for validating webhook signatures and payloads
 */
export function webhookSecurity(options: WebhookSecurityOptions) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const { provider, required = true, skipInTest = true, customValidation } = options;

    // Skip validation in test environment if configured
    if (skipInTest && process.env.NODE_ENV === "test") {
      req.webhookValidation = {
        provider,
        payload: req.body,
        isValid: true,
        errors: [],
      };
      return next();
    }

    try {
      // Get configuration for the provider
      const config = webhookValidator.getConfig(provider);
      if (!config) {
        if (required) {
          console.error(`Webhook configuration not found for provider: ${provider}`);
          res.status(500).json({
            error: "Webhook configuration not found",
            provider,
          });
          return;
        } else {
          // If not required and no config, skip validation
          req.webhookValidation = {
            provider,
            payload: req.body,
            isValid: true,
            errors: [],
          };
          return next();
        }
      }

      // Get signature from headers based on provider configuration
      const signature = req.headers[config.headerName] as string;
      if (!signature) {
        if (required) {
          console.error(
            `Missing webhook signature for provider ${provider}, expected header: ${config.headerName}`
          );
          res.status(400).json({
            error: "Missing webhook signature",
            expectedHeader: config.headerName,
            provider,
          });
          return;
        } else {
          // If not required and no signature, skip validation
          req.webhookValidation = {
            provider,
            payload: req.body,
            isValid: true,
            errors: [],
          };
          return next();
        }
      }

      // Get raw body for signature validation
      const rawBody = Buffer.isBuffer(req.body) ? req.body : Buffer.from(JSON.stringify(req.body));

      // Validate webhook
      const validationResult = await webhookValidator.validateWebhook(
        provider,
        rawBody,
        signature,
        req.headers as Record<string, string>
      );

      // Run custom validation if provided
      if (customValidation && validationResult.valid) {
        const customResult = await customValidation(validationResult.payload);
        if (!customResult.valid) {
          validationResult.valid = false;
          validationResult.errors.push(...customResult.errors);
        }
      }

      // Store validation results in request
      req.webhookValidation = {
        provider,
        payload: validationResult.payload,
        timestamp: validationResult.timestamp,
        isValid: validationResult.valid,
        errors: validationResult.errors,
      };

      // If validation failed and webhook is required, return error
      if (!validationResult.valid && required) {
        console.error(`Webhook validation failed for ${provider}:`, validationResult.errors);
        res.status(400).json({
          error: "Webhook validation failed",
          provider,
          details: validationResult.errors,
        });
        return;
      }

      next();
    } catch (error) {
      console.error(`Webhook security middleware error for ${provider}:`, error);

      if (required) {
        res.status(500).json({
          error: "Webhook validation error",
          provider,
          message: error instanceof Error ? error.message : "Unknown error",
        });
        return;
      }

      // If not required, continue with unvalidated payload
      req.webhookValidation = {
        provider,
        payload: req.body,
        isValid: false,
        errors: [error instanceof Error ? error.message : "Unknown error"],
      };
      next();
    }
  };
}

/**
 * Middleware to ensure webhook validation was performed
 */
export function requireWebhookValidation(req: Request, res: Response, next: NextFunction): void {
  if (!req.webhookValidation) {
    res.status(500).json({
      error: "Webhook validation middleware not configured",
    });
    return;
  }

  if (!req.webhookValidation.isValid) {
    res.status(400).json({
      error: "Webhook validation failed",
      details: req.webhookValidation.errors,
    });
    return;
  }

  next();
}

/**
 * Rate limiting for webhook endpoints
 */
export function webhookRateLimit(
  options: {
    windowMs?: number;
    maxRequests?: number;
    keyGenerator?: (req: Request) => string;
  } = {}
) {
  const {
    windowMs = 60 * 1000, // 1 minute
    maxRequests = 100,
    keyGenerator = req => req.ip || "unknown",
  } = options;

  const requests = new Map<string, { count: number; resetTime: number }>();

  return (req: Request, res: Response, next: NextFunction): void => {
    const key = keyGenerator(req);
    const now = Date.now();
    const windowStart = now - windowMs;

    // Clean up old entries
    const entriesToDelete: string[] = [];
    requests.forEach((v, k) => {
      if (v.resetTime < windowStart) {
        entriesToDelete.push(k);
      }
    });
    entriesToDelete.forEach(k => requests.delete(k));

    // Get or create request tracking
    let requestData = requests.get(key);
    if (!requestData || requestData.resetTime < windowStart) {
      requestData = { count: 0, resetTime: now + windowMs };
      requests.set(key, requestData);
    }

    // Check rate limit
    if (requestData.count >= maxRequests) {
      res.status(429).json({
        error: "Rate limit exceeded",
        retryAfter: Math.ceil((requestData.resetTime - now) / 1000),
      });
      return;
    }

    // Increment counter
    requestData.count++;

    // Set rate limit headers
    res.set({
      "X-RateLimit-Limit": maxRequests.toString(),
      "X-RateLimit-Remaining": (maxRequests - requestData.count).toString(),
      "X-RateLimit-Reset": Math.ceil(requestData.resetTime / 1000).toString(),
    });

    next();
  };
}

/**
 * Idempotency middleware for webhooks
 */
export function webhookIdempotency(
  options: {
    keyExtractor: (req: Request) => string | null;
    storage?: Map<string, { timestamp: number; response: any }>;
    ttl?: number;
  } = {
    keyExtractor: () => null,
    ttl: 24 * 60 * 60 * 1000, // 24 hours
  }
) {
  const { keyExtractor, ttl = 24 * 60 * 60 * 1000 } = options;
  const storage = options.storage || new Map<string, { timestamp: number; response: any }>();

  return (req: Request, res: Response, next: NextFunction): void => {
    const idempotencyKey = keyExtractor(req);

    if (!idempotencyKey) {
      return next();
    }

    // Check if we've seen this request before
    const existing = storage.get(idempotencyKey);
    const now = Date.now();

    if (existing && now - existing.timestamp < ttl) {
      console.log(`Duplicate webhook request detected: ${idempotencyKey}`);
      res.status(200).json(existing.response);
      return;
    }

    // Store original res.json to capture response
    const originalJson = res.json.bind(res);
    res.json = function (body: any) {
      // Store the response for future duplicate requests
      storage.set(idempotencyKey, {
        timestamp: now,
        response: body,
      });

      // Clean up old entries periodically
      if (Math.random() < 0.01) {
        // 1% chance
        const keysToDelete: string[] = [];
        storage.forEach((value, key) => {
          if (now - value.timestamp > ttl) {
            keysToDelete.push(key);
          }
        });
        keysToDelete.forEach(key => storage.delete(key));
      }

      return originalJson(body);
    };

    next();
  };
}

/**
 * Security headers for webhook endpoints
 */
export function webhookSecurityHeaders(_req: Request, res: Response, next: NextFunction): void {
  // Set security headers
  res.set({
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "X-XSS-Protection": "1; mode=block",
    "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
    "Cache-Control": "no-cache, no-store, must-revalidate",
    Pragma: "no-cache",
    Expires: "0",
  });

  next();
}

/**
 * Comprehensive webhook security middleware stack
 */
export function createWebhookSecurityStack(
  provider: string,
  options: {
    required?: boolean;
    skipInTest?: boolean;
    rateLimit?: { windowMs?: number; maxRequests?: number };
    idempotencyKeyExtractor?: (req: Request) => string | null;
    customValidation?: (payload: any) => Promise<{ valid: boolean; errors: string[] }>;
  } = {}
) {
  const middlewares = [webhookSecurityHeaders, webhookRateLimit(options.rateLimit)];

  if (options.idempotencyKeyExtractor) {
    middlewares.push(
      webhookIdempotency({
        keyExtractor: options.idempotencyKeyExtractor,
      })
    );
  }

  middlewares.push(
    webhookSecurity({
      provider,
      required: options.required,
      skipInTest: options.skipInTest,
      customValidation: options.customValidation,
    })
  );

  return middlewares;
}

export default {
  webhookSecurity,
  requireWebhookValidation,
  webhookRateLimit,
  webhookIdempotency,
  webhookSecurityHeaders,
  createWebhookSecurityStack,
};
