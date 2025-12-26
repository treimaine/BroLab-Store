/**
 * CSP Nonce Middleware
 *
 * Express middleware that generates a unique CSP nonce for each request.
 * The nonce is attached to res.locals for use in templates and CSP headers.
 *
 * @module server/middleware/cspNonce
 */

import { NextFunction, Request, Response } from "express";
import { generateCspNonce } from "../utils/cspNonce";

/**
 * Extended response locals interface with CSP nonce
 */
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Locals {
      cspNonce?: string;
    }
  }
}

/**
 * Express middleware that generates a unique CSP nonce for each request.
 *
 * Behavior:
 * - Generates a cryptographically secure nonce
 * - Attaches nonce to res.locals.cspNonce for template use
 * - Nonce should be used in CSP headers and inline script/style tags
 *
 * @param _req - Express request object
 * @param res - Express response object
 * @param next - Express next function
 */
export function cspNonceMiddleware(_req: Request, res: Response, next: NextFunction): void {
  // Generate unique nonce for this request
  const nonce = generateCspNonce();

  // Attach to res.locals for downstream use
  res.locals.cspNonce = nonce;

  next();
}

export default cspNonceMiddleware;
