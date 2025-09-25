/**
 * Server-Side Type Definitions for BroLab Entertainment
 *
 * This module contains server-specific type definitions that extend
 * the shared types with Express.js and Node.js specific interfaces.
 */

import { Response } from "express";
import { User } from "../../shared/types/User";
import { ApiResponse } from "../../shared/types/api";

// ================================
// EXPRESS REQUEST EXTENSIONS
// ================================

// Import AuthenticatedRequest from ApiTypes.ts
import type { AuthenticatedRequest } from "./ApiTypes";

/**
 * Typed Express Response for success responses
 */
export type TypedResponse<T = unknown> = Response<ApiResponse<T>>;

/**
 * Typed Express Response for error responses
 */
export type ErrorTypedResponse = Response<import("../../shared/types/api").ErrorResponse>;

/**
 * Request handler with proper typing
 */
export type TypedRequestHandler<
  TParams = Record<string, string>,
  TResponse = unknown,
  TBody = unknown,
  TQuery = Record<string, unknown>,
> = (
  req: AuthenticatedRequest<TParams, TResponse, TBody, TQuery>,
  res: TypedResponse<TResponse>,
  next: NextFunction
) => void | Promise<void>;

/**
 * Error request handler with proper typing
 */
export type ErrorRequestHandler = (
  error: ServerError,
  req: AuthenticatedRequest,
  res: ErrorTypedResponse,
  next: NextFunction
) => void | Promise<void>;

// ================================
// MIDDLEWARE TYPES
// ================================

/**
 * Authentication middleware result
 */
export interface AuthMiddlewareResult {
  success: boolean;
  user?: User;
  error?: string;
}

/**
 * Rate limiting information
 */
export interface RateLimitInfo {
  limit: number;
  remaining: number;
  resetTime: number;
  retryAfter?: number;
}

/**
 * Request context for logging and tracing
 */
export interface RequestContext {
  requestId: string;
  userId?: number;
  sessionId?: string;
  ipAddress?: string;
  userAgent?: string;
  startTime: number;
  method: string;
  url: string;
  headers: Record<string, string>;
}

// ================================
// SERVICE LAYER TYPES
// ================================

/**
 * Service operation result
 */
export interface ServiceResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    type: string;
    message: string;
    code?: string;
    details?: Record<string, unknown>;
  };
}

/**
 * Database operation result
 */
export interface DatabaseResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: Error;
  affectedRows?: number;
}

/**
 * External API call result
 */
export interface ExternalApiResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    status: number;
    message: string;
    response?: Record<string, unknown>;
  };
  responseTime?: number;
}

// ================================
// CONFIGURATION TYPES
// ================================

/**
 * Server configuration
 */
export interface ServerConfig {
  port: number;
  host: string;
  environment: "development" | "staging" | "production";
  cors: {
    origin: string | string[];
    credentials: boolean;
  };
  rateLimit: {
    windowMs: number;
    max: number;
  };
  session: {
    secret: string;
    maxAge: number;
  };
}

/**
 * Database configuration
 */
export interface DatabaseConfig {
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
  ssl?: boolean;
  pool?: {
    min: number;
    max: number;
  };
}

/**
 * External service configuration
 */
export interface ExternalServiceConfig {
  woocommerce?: {
    apiUrl: string;
    consumerKey: string;
    consumerSecret: string;
  };
  stripe?: {
    publicKey: string;
    secretKey: string;
    webhookSecret: string;
  };
  paypal?: {
    clientId: string;
    clientSecret: string;
    environment: "sandbox" | "production";
  };
  clerk?: {
    publishableKey: string;
    secretKey: string;
    webhookSecret: string;
  };
  convex?: {
    url: string;
    deploymentUrl: string;
  };
}

// ================================
// ERROR HANDLING TYPES
// ================================

/**
 * Server error with context
 */
export interface ServerError extends Error {
  statusCode?: number;
  code?: string;
  context?: RequestContext;
  originalError?: Error;
}

/**
 * Error handler function type
 */
export type ErrorHandler = (
  error: ServerError,
  req: AuthenticatedRequest,
  res: ErrorTypedResponse,
  next: NextFunction
) => void;

// ================================
// LOGGING TYPES
// ================================

/**
 * Log entry structure
 */
export interface LogEntry {
  level: "debug" | "info" | "warn" | "error";
  message: string;
  timestamp: string;
  requestId?: string;
  userId?: number;
  context?: Record<string, unknown>;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
}

/**
 * Logger interface
 */
export interface Logger {
  debug(message: string, context?: Record<string, unknown>): void;
  info(message: string, context?: Record<string, unknown>): void;
  warn(message: string, context?: Record<string, unknown>): void;
  error(message: string, error?: Error, context?: Record<string, unknown>): void;
}

// ================================
// WEBHOOK TYPES
// ================================

/**
 * Webhook verification result
 */
export interface WebhookVerificationResult<T = Record<string, unknown>> {
  isValid: boolean;
  payload?: T;
  error?: string;
}

/**
 * Webhook handler function type
 */
export type WebhookHandler<T = unknown> = (
  payload: T,
  headers: Record<string, string>,
  context: RequestContext
) => Promise<void>;

// ================================
// CACHE TYPES
// ================================

/**
 * Cache entry
 */
export interface CacheEntry<T = unknown> {
  key: string;
  value: T;
  expiresAt: number;
  createdAt: number;
}

/**
 * Cache operations
 */
export interface CacheOperations {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttl?: number): Promise<void>;
  delete(key: string): Promise<void>;
  clear(): Promise<void>;
  exists(key: string): Promise<boolean>;
}

// ================================
// VALIDATION TYPES
// ================================

/**
 * Validation result
 */
export interface ValidationResult<T = unknown> {
  isValid: boolean;
  data?: T;
  errors?: Array<{
    field: string;
    message: string;
    code: string;
  }>;
}

/**
 * Validator function type
 */
export type Validator<T = unknown> = (data: unknown) => ValidationResult<T>;

// ================================
// UTILITY TYPES
// ================================

/**
 * Async function type
 */
export type AsyncFunction<T = unknown> = (...args: unknown[]) => Promise<T>;

/**
 * Event emitter payload
 */
export interface EventPayload<T = unknown> {
  type: string;
  data: T;
  timestamp: number;
  source: string;
}

/**
 * Health check result
 */
export interface HealthCheckResult {
  status: "healthy" | "unhealthy" | "degraded";
  checks: Record<
    string,
    {
      status: "pass" | "fail" | "warn";
      message?: string;
      responseTime?: number;
    }
  >;
  timestamp: number;
  uptime: number;
}

/**
 * Metrics data
 */
export interface MetricsData {
  requests: {
    total: number;
    success: number;
    errors: number;
    averageResponseTime: number;
  };
  memory: {
    used: number;
    total: number;
    percentage: number;
  };
  cpu: {
    usage: number;
  };
  timestamp: number;
}

// ================================
// EXPORT COMMONLY USED TYPES
// ================================

// Import NextFunction for internal use
import type { NextFunction } from "express";

export type { NextFunction, Request, RequestHandler, Response } from "express";

export type { ZodError, ZodIssue, ZodSchema } from "zod";

// Export WooCommerce types
export * from "./woocommerce";

// Export request/response types
export * from "./requests";
