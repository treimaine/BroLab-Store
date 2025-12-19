import { NextFunction, Request, Response } from "express";
import { env } from "../lib/env";

/**
 * CORS middleware for handling cross-origin requests
 * Configured for Vercel deployment with custom domain support
 */

// Allowed origins based on environment
const getAllowedOrigins = (): string[] => {
  const baseOrigins = [
    "https://brolabentertainment.com",
    "https://www.brolabentertainment.com",
    "https://brolab-store.vercel.app",
    "https://wp.brolabentertainment.com",
  ];

  if (env.NODE_ENV === "development") {
    return [
      ...baseOrigins,
      "http://localhost:5000",
      "http://localhost:4000",
      "http://localhost:3000",
      "http://127.0.0.1:5000",
    ];
  }

  return baseOrigins;
};

const allowedOrigins = getAllowedOrigins();

const isOriginAllowed = (origin: string): boolean => {
  // Check exact match
  if (allowedOrigins.includes(origin)) {
    return true;
  }
  // Check Vercel preview deployments (*.vercel.app) or Clerk domains
  if (origin.endsWith(".vercel.app") || origin.includes(".clerk.")) {
    return true;
  }
  return false;
};

export const corsMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const origin = req.headers.origin;

  if (origin && isOriginAllowed(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  }

  // Allow credentials (cookies, authorization headers)
  res.setHeader("Access-Control-Allow-Credentials", "true");

  // Allowed methods
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");

  // Allowed headers
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept, Authorization, X-Request-ID, Stripe-Signature, PayPal-Transmission-Sig, Svix-Id, Svix-Timestamp, Svix-Signature"
  );

  // Expose headers to client
  res.setHeader(
    "Access-Control-Expose-Headers",
    "X-Request-ID, X-RateLimit-Limit, X-RateLimit-Remaining"
  );

  // Cache preflight response for 24 hours
  res.setHeader("Access-Control-Max-Age", "86400");

  // Handle preflight requests
  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }

  next();
};
